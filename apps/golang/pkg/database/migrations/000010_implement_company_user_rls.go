package migrations

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// Migration000010ImplementCompanyUserRLS implements Row Level Security for Company and User modules
// These are the most sensitive tables requiring the highest security
type Migration000010ImplementCompanyUserRLS struct{}

func (m *Migration000010ImplementCompanyUserRLS) Version() string {
	return "000010"
}

func (m *Migration000010ImplementCompanyUserRLS) Name() string {
	return "implement_company_user_rls"
}

func (m *Migration000010ImplementCompanyUserRLS) Up(ctx context.Context, db *gorm.DB) error {
	// Step 1: Create company/user security functions
	if err := m.createCompanyUserSecurityFunctions(ctx, db); err != nil {
		return fmt.Errorf("failed to create company/user security functions: %w", err)
	}

	// Step 2: Enable RLS on company and user tables
	if err := m.enableCompanyUserTableRLS(ctx, db); err != nil {
		return fmt.Errorf("failed to enable company/user table RLS: %w", err)
	}

	// Step 3: Create RLS policies for companies
	if err := m.createCompanyRLSPolicies(ctx, db); err != nil {
		return fmt.Errorf("failed to create company RLS policies: %w", err)
	}

	// Step 4: Create RLS policies for users
	if err := m.createUserRLSPolicies(ctx, db); err != nil {
		return fmt.Errorf("failed to create user RLS policies: %w", err)
	}

	// Step 5: Create RLS policies for estates, divisions, blocks
	if err := m.createHierarchyRLSPolicies(ctx, db); err != nil {
		return fmt.Errorf("failed to create hierarchy RLS policies: %w", err)
	}

	// Step 6: Create RLS policies for user assignments
	if err := m.createAssignmentRLSPolicies(ctx, db); err != nil {
		return fmt.Errorf("failed to create assignment RLS policies: %w", err)
	}

	// Step 7: Create RLS policies for sensitive auth tables
	if err := m.createAuthTableRLSPolicies(ctx, db); err != nil {
		return fmt.Errorf("failed to create auth table RLS policies: %w", err)
	}

	// Step 8: Create audit and compliance monitoring
	if err := m.createComplianceMonitoring(ctx, db); err != nil {
		return fmt.Errorf("failed to create compliance monitoring: %w", err)
	}

	return nil
}

// createCompanyUserSecurityFunctions creates security functions for company/user access
func (m *Migration000010ImplementCompanyUserRLS) createCompanyUserSecurityFunctions(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Function to check if user has access to a company
CREATE OR REPLACE FUNCTION has_company_access(target_company_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	user_role VARCHAR(50);
	user_id UUID;
	company_ids UUID[];
BEGIN
	user_id := app_get_user_id();
	user_role := app_get_user_role();
	company_ids := app_get_company_ids();

	IF user_id IS NULL THEN
		RETURN false;
	END IF;

	-- SUPER_ADMIN has access to all companies
	IF user_role = 'SUPER_ADMIN' THEN
		RETURN true;
	END IF;

	-- Check if user is assigned to this company
	RETURN target_company_id = ANY(company_ids);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can modify a company
CREATE OR REPLACE FUNCTION can_modify_company(target_company_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	user_role VARCHAR(50);
BEGIN
	user_role := app_get_user_role();

	-- Only SUPER_ADMIN and COMPANY_ADMIN can modify companies
	IF user_role NOT IN ('SUPER_ADMIN', 'COMPANY_ADMIN') THEN
		RETURN false;
	END IF;

	-- SUPER_ADMIN can modify any company
	IF user_role = 'SUPER_ADMIN' THEN
		RETURN true;
	END IF;

	-- COMPANY_ADMIN can only modify their assigned companies
	RETURN has_company_access(target_company_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user has access to another user's data
CREATE OR REPLACE FUNCTION has_user_access(target_user_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	user_role VARCHAR(50);
	current_user_id UUID;
	company_ids UUID[];
	estate_ids UUID[];
	target_user_companies UUID[];
	target_user_estates UUID[];
BEGIN
	current_user_id := app_get_user_id();
	user_role := app_get_user_role();
	company_ids := app_get_company_ids();
	estate_ids := app_get_estate_ids();

	IF current_user_id IS NULL THEN
		RETURN false;
	END IF;

	-- Users can always access their own data
	IF current_user_id = target_user_id THEN
		RETURN true;
	END IF;

	-- SUPER_ADMIN can access all users
	IF user_role = 'SUPER_ADMIN' THEN
		RETURN true;
	END IF;

	-- Get target user's company assignments
	SELECT array_agg(company_id) INTO target_user_companies
	FROM user_company_assignments
	WHERE user_id = target_user_id
	AND deleted_at IS NULL;

	-- Check role-based access
	CASE user_role
		WHEN 'COMPANY_ADMIN', 'AREA_MANAGER' THEN
			-- Can access users in their companies
			RETURN EXISTS (
				SELECT 1
				FROM unnest(COALESCE(target_user_companies, ARRAY[]::UUID[])) AS tc
				WHERE tc = ANY(company_ids)
			);

		WHEN 'MANAGER' THEN
			-- Can access users in their estates
			SELECT array_agg(estate_id) INTO target_user_estates
			FROM user_estate_assignments
			WHERE user_id = target_user_id
			AND deleted_at IS NULL;

			RETURN EXISTS (
				SELECT 1
				FROM unnest(COALESCE(target_user_estates, ARRAY[]::UUID[])) AS te
				WHERE te = ANY(estate_ids)
			);

		ELSE
			-- Other roles cannot access other users
			RETURN false;
	END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can modify another user
CREATE OR REPLACE FUNCTION can_modify_user(target_user_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	user_role VARCHAR(50);
	target_user_role VARCHAR(50);
	current_user_id UUID;
BEGIN
	current_user_id := app_get_user_id();
	user_role := app_get_user_role();

	-- Cannot modify yourself through this function
	IF current_user_id = target_user_id THEN
		RETURN false;
	END IF;

	-- Get target user's role
	SELECT role INTO target_user_role
	FROM users
	WHERE id = target_user_id;

	-- SUPER_ADMIN can modify any user except other SUPER_ADMINs (safety measure)
	IF user_role = 'SUPER_ADMIN' THEN
		RETURN target_user_role != 'SUPER_ADMIN';
	END IF;

	-- COMPANY_ADMIN can modify users in their companies (except admins)
	IF user_role = 'COMPANY_ADMIN' THEN
		RETURN target_user_role NOT IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
			AND has_user_access(target_user_id);
	END IF;

	-- AREA_MANAGER can modify users in their companies (except admins)
	IF user_role = 'AREA_MANAGER' THEN
		RETURN target_user_role NOT IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER')
			AND has_user_access(target_user_id);
	END IF;

	-- Other roles cannot modify users
	RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check estate access
CREATE OR REPLACE FUNCTION has_estate_access(target_estate_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	user_role VARCHAR(50);
	company_ids UUID[];
	estate_ids UUID[];
	estate_company_id UUID;
BEGIN
	user_role := app_get_user_role();
	company_ids := app_get_company_ids();
	estate_ids := app_get_estate_ids();

	IF user_role = 'SUPER_ADMIN' THEN
		RETURN true;
	END IF;

	-- Get estate's company
	SELECT company_id INTO estate_company_id
	FROM estates
	WHERE id = target_estate_id;

	-- Check access based on role
	CASE user_role
		WHEN 'COMPANY_ADMIN', 'AREA_MANAGER' THEN
			RETURN estate_company_id = ANY(company_ids);
		WHEN 'MANAGER', 'ASISTEN' THEN
			RETURN target_estate_id = ANY(estate_ids);
		ELSE
			RETURN false;
	END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check division access
CREATE OR REPLACE FUNCTION has_division_access(target_division_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	user_role VARCHAR(50);
	company_ids UUID[];
	estate_ids UUID[];
	division_ids UUID[];
	division_estate_id UUID;
	estate_company_id UUID;
BEGIN
	user_role := app_get_user_role();
	company_ids := app_get_company_ids();
	estate_ids := app_get_estate_ids();
	division_ids := app_get_division_ids();

	IF user_role = 'SUPER_ADMIN' THEN
		RETURN true;
	END IF;

	-- Get division's hierarchy
	SELECT d.estate_id, e.company_id
	INTO division_estate_id, estate_company_id
	FROM divisions d
	JOIN estates e ON d.estate_id = e.id
	WHERE d.id = target_division_id;

	-- Check access based on role
	CASE user_role
		WHEN 'COMPANY_ADMIN', 'AREA_MANAGER' THEN
			RETURN estate_company_id = ANY(company_ids);
		WHEN 'MANAGER' THEN
			RETURN division_estate_id = ANY(estate_ids);
		WHEN 'ASISTEN' THEN
			RETURN target_division_id = ANY(division_ids);
		ELSE
			RETURN false;
	END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check block access
CREATE OR REPLACE FUNCTION has_block_access(target_block_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	user_role VARCHAR(50);
	division_id UUID;
BEGIN
	user_role := app_get_user_role();

	IF user_role = 'SUPER_ADMIN' THEN
		RETURN true;
	END IF;

	-- Get block's division
	SELECT b.division_id INTO division_id
	FROM blocks b
	WHERE b.id = target_block_id;

	-- Check division access
	RETURN has_division_access(division_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to validate password change security
CREATE OR REPLACE FUNCTION can_change_password(target_user_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	current_user_id UUID;
	user_role VARCHAR(50);
BEGIN
	current_user_id := app_get_user_id();
	user_role := app_get_user_role();

	-- Users can change their own password
	IF current_user_id = target_user_id THEN
		RETURN true;
	END IF;

	-- SUPER_ADMIN can reset passwords
	IF user_role = 'SUPER_ADMIN' THEN
		RETURN true;
	END IF;

	-- COMPANY_ADMIN can reset passwords for users they manage
	IF user_role = 'COMPANY_ADMIN' THEN
		RETURN can_modify_user(target_user_id);
	END IF;

	RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
`

	return db.WithContext(ctx).Exec(sql).Error
}

// enableCompanyUserTableRLS enables RLS on company and user tables
func (m *Migration000010ImplementCompanyUserRLS) enableCompanyUserTableRLS(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Enable RLS on core tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

ALTER TABLE estates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estates FORCE ROW LEVEL SECURITY;

ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions FORCE ROW LEVEL SECURITY;

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks FORCE ROW LEVEL SECURITY;

-- Assignment tables
ALTER TABLE user_company_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_assignments FORCE ROW LEVEL SECURITY;

ALTER TABLE user_estate_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_estate_assignments FORCE ROW LEVEL SECURITY;

ALTER TABLE user_division_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_division_assignments FORCE ROW LEVEL SECURITY;

-- Auth tables (most sensitive)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE jwt_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE jwt_tokens FORCE ROW LEVEL SECURITY;

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events FORCE ROW LEVEL SECURITY;
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createCompanyRLSPolicies creates RLS policies for companies table
func (m *Migration000010ImplementCompanyUserRLS) createCompanyRLSPolicies(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Policy 1: SELECT - Users can view companies they have access to
DROP POLICY IF EXISTS company_select_policy ON companies;
CREATE POLICY company_select_policy ON companies
	FOR SELECT
	USING (
		app_get_user_id() IS NOT NULL
		AND has_company_access(id)
	);

-- Policy 2: INSERT - Only SUPER_ADMIN can create companies
DROP POLICY IF EXISTS company_insert_policy ON companies;
CREATE POLICY company_insert_policy ON companies
	FOR INSERT
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() = 'SUPER_ADMIN'
	);

-- Policy 3: UPDATE - SUPER_ADMIN and COMPANY_ADMIN can modify
DROP POLICY IF EXISTS company_update_policy ON companies;
CREATE POLICY company_update_policy ON companies
	FOR UPDATE
	USING (
		app_get_user_id() IS NOT NULL
		AND can_modify_company(id)
	)
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND can_modify_company(id)
	);

-- Policy 4: DELETE - Only SUPER_ADMIN can delete companies
DROP POLICY IF EXISTS company_delete_policy ON companies;
CREATE POLICY company_delete_policy ON companies
	FOR DELETE
	USING (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() = 'SUPER_ADMIN'
	);
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createUserRLSPolicies creates RLS policies for users table
func (m *Migration000010ImplementCompanyUserRLS) createUserRLSPolicies(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Policy 1: SELECT - Users can view users they have access to
DROP POLICY IF EXISTS user_select_policy ON users;
CREATE POLICY user_select_policy ON users
	FOR SELECT
	USING (
		app_get_user_id() IS NOT NULL
		AND has_user_access(id)
	);

-- Policy 2: INSERT - Only admins can create users
DROP POLICY IF EXISTS user_insert_policy ON users;
CREATE POLICY user_insert_policy ON users
	FOR INSERT
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
	);

-- Policy 3: UPDATE - Users can update their own profile, admins can update managed users
DROP POLICY IF EXISTS user_update_policy ON users;
CREATE POLICY user_update_policy ON users
	FOR UPDATE
	USING (
		app_get_user_id() IS NOT NULL
		AND (
			-- Users can update their own profile
			id = app_get_user_id()
			OR
			-- Admins can update managed users
			can_modify_user(id)
		)
	)
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND (
			id = app_get_user_id()
			OR can_modify_user(id)
		)
		-- Prevent role escalation
		AND (
			-- If changing role, must be admin
			(OLD.role = NEW.role)
			OR
			(app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN'))
		)
	);

-- Policy 4: DELETE - Only SUPER_ADMIN can delete users (soft delete)
DROP POLICY IF EXISTS user_delete_policy ON users;
CREATE POLICY user_delete_policy ON users
	FOR DELETE
	USING (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() = 'SUPER_ADMIN'
		AND id != app_get_user_id() -- Cannot delete yourself
	);
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createHierarchyRLSPolicies creates RLS policies for estates, divisions, blocks
func (m *Migration000010ImplementCompanyUserRLS) createHierarchyRLSPolicies(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Estates policies
DROP POLICY IF EXISTS estate_select_policy ON estates;
CREATE POLICY estate_select_policy ON estates
	FOR SELECT
	USING (
		app_get_user_id() IS NOT NULL
		AND has_estate_access(id)
	);

DROP POLICY IF EXISTS estate_insert_policy ON estates;
CREATE POLICY estate_insert_policy ON estates
	FOR INSERT
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
		AND has_company_access(company_id)
	);

DROP POLICY IF EXISTS estate_update_policy ON estates;
CREATE POLICY estate_update_policy ON estates
	FOR UPDATE
	USING (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER')
		AND has_estate_access(id)
	)
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND has_estate_access(id)
	);

DROP POLICY IF EXISTS estate_delete_policy ON estates;
CREATE POLICY estate_delete_policy ON estates
	FOR DELETE
	USING (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
		AND has_estate_access(id)
	);

-- Divisions policies
DROP POLICY IF EXISTS division_select_policy ON divisions;
CREATE POLICY division_select_policy ON divisions
	FOR SELECT
	USING (
		app_get_user_id() IS NOT NULL
		AND has_division_access(id)
	);

DROP POLICY IF EXISTS division_insert_policy ON divisions;
CREATE POLICY division_insert_policy ON divisions
	FOR INSERT
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')
		AND has_estate_access(estate_id)
	);

DROP POLICY IF EXISTS division_update_policy ON divisions;
CREATE POLICY division_update_policy ON divisions
	FOR UPDATE
	USING (
		app_get_user_id() IS NOT NULL
		AND has_division_access(id)
	)
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND has_division_access(id)
	);

DROP POLICY IF EXISTS division_delete_policy ON divisions;
CREATE POLICY division_delete_policy ON divisions
	FOR DELETE
	USING (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')
		AND has_division_access(id)
	);

-- Blocks policies
DROP POLICY IF EXISTS block_select_policy ON blocks;
CREATE POLICY block_select_policy ON blocks
	FOR SELECT
	USING (
		app_get_user_id() IS NOT NULL
		AND has_block_access(id)
	);

DROP POLICY IF EXISTS block_insert_policy ON blocks;
CREATE POLICY block_insert_policy ON blocks
	FOR INSERT
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'ASISTEN')
		AND has_division_access(division_id)
	);

DROP POLICY IF EXISTS block_update_policy ON blocks;
CREATE POLICY block_update_policy ON blocks
	FOR UPDATE
	USING (
		app_get_user_id() IS NOT NULL
		AND has_block_access(id)
	)
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND has_block_access(id)
	);

DROP POLICY IF EXISTS block_delete_policy ON blocks;
CREATE POLICY block_delete_policy ON blocks
	FOR DELETE
	USING (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')
		AND has_block_access(id)
	);
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createAssignmentRLSPolicies creates RLS policies for assignment tables
func (m *Migration000010ImplementCompanyUserRLS) createAssignmentRLSPolicies(ctx context.Context, db *gorm.DB) error {
	sql := `
-- User Company Assignments
DROP POLICY IF EXISTS user_company_assignment_select_policy ON user_company_assignments;
CREATE POLICY user_company_assignment_select_policy ON user_company_assignments
	FOR SELECT
	USING (
		app_get_user_id() IS NOT NULL
		AND (
			-- Users can see their own assignments
			user_id = app_get_user_id()
			OR
			-- Admins can see assignments in their scope
			(
				app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER')
				AND company_id = ANY(app_get_company_ids())
			)
		)
	);

DROP POLICY IF EXISTS user_company_assignment_insert_policy ON user_company_assignments;
CREATE POLICY user_company_assignment_insert_policy ON user_company_assignments
	FOR INSERT
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
		AND has_company_access(company_id)
		AND has_user_access(user_id)
	);

DROP POLICY IF EXISTS user_company_assignment_delete_policy ON user_company_assignments;
CREATE POLICY user_company_assignment_delete_policy ON user_company_assignments
	FOR DELETE
	USING (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
		AND has_company_access(company_id)
	);

-- Similar policies for estate and division assignments
DROP POLICY IF EXISTS user_estate_assignment_select_policy ON user_estate_assignments;
CREATE POLICY user_estate_assignment_select_policy ON user_estate_assignments
	FOR SELECT
	USING (
		app_get_user_id() IS NOT NULL
		AND (
			user_id = app_get_user_id()
			OR has_estate_access(estate_id)
		)
	);

DROP POLICY IF EXISTS user_division_assignment_select_policy ON user_division_assignments;
CREATE POLICY user_division_assignment_select_policy ON user_division_assignments
	FOR SELECT
	USING (
		app_get_user_id() IS NOT NULL
		AND (
			user_id = app_get_user_id()
			OR has_division_access(division_id)
		)
	);
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createAuthTableRLSPolicies creates RLS policies for sensitive auth tables
func (m *Migration000010ImplementCompanyUserRLS) createAuthTableRLSPolicies(ctx context.Context, db *gorm.DB) error {
	sql := `
-- User Sessions - users can only see their own sessions
DROP POLICY IF EXISTS user_session_select_policy ON user_sessions;
CREATE POLICY user_session_select_policy ON user_sessions
	FOR SELECT
	USING (
		app_get_user_id() IS NOT NULL
		AND (
			user_id = app_get_user_id()
			OR app_get_user_role() = 'SUPER_ADMIN'
		)
	);

DROP POLICY IF EXISTS user_session_insert_policy ON user_sessions;
CREATE POLICY user_session_insert_policy ON user_sessions
	FOR INSERT
	WITH CHECK (
		user_id = app_get_user_id()
	);

DROP POLICY IF EXISTS user_session_update_policy ON user_sessions;
CREATE POLICY user_session_update_policy ON user_sessions
	FOR UPDATE
	USING (
		user_id = app_get_user_id()
		OR app_get_user_role() = 'SUPER_ADMIN'
	)
	WITH CHECK (
		user_id = app_get_user_id()
		OR app_get_user_role() = 'SUPER_ADMIN'
	);

-- JWT Tokens - similar to sessions
DROP POLICY IF EXISTS jwt_token_select_policy ON jwt_tokens;
CREATE POLICY jwt_token_select_policy ON jwt_tokens
	FOR SELECT
	USING (
		user_id = app_get_user_id()
		OR app_get_user_role() = 'SUPER_ADMIN'
	);

-- Security Events - users can see their own events, admins see all in scope
DROP POLICY IF EXISTS security_event_select_policy ON security_events;
CREATE POLICY security_event_select_policy ON security_events
	FOR SELECT
	USING (
		app_get_user_id() IS NOT NULL
		AND (
			user_id = app_get_user_id()
			OR app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
		)
	);

DROP POLICY IF EXISTS security_event_insert_policy ON security_events;
CREATE POLICY security_event_insert_policy ON security_events
	FOR INSERT
	WITH CHECK (true); -- Allow system to insert security events
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createComplianceMonitoring creates compliance and audit monitoring
func (m *Migration000010ImplementCompanyUserRLS) createComplianceMonitoring(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Create compliance monitoring view
CREATE OR REPLACE VIEW security_compliance_dashboard AS
SELECT
	'companies' as table_name,
	COUNT(*) as total_records,
	COUNT(DISTINCT id) as unique_records,
	NOW() as last_check
FROM companies WHERE deleted_at IS NULL
UNION ALL
SELECT
	'users' as table_name,
	COUNT(*) as total_records,
	COUNT(DISTINCT id) as unique_records,
	NOW() as last_check
FROM users WHERE deleted_at IS NULL
UNION ALL
SELECT
	'user_sessions' as table_name,
	COUNT(*) as total_records,
	COUNT(DISTINCT user_id) as unique_users,
	MAX(last_activity) as last_check
FROM user_sessions WHERE is_active = true;

-- Function to audit RLS bypass attempts
CREATE OR REPLACE FUNCTION audit_rls_bypass_attempts()
RETURNS TABLE (
	timestamp TIMESTAMP,
	user_id UUID,
	user_role VARCHAR(50),
	table_name VARCHAR(100),
	action VARCHAR(20),
	denied_reason TEXT
) AS $$
BEGIN
	RETURN QUERY
	SELECT
		attempted_at,
		hra.user_id,
		user_role,
		'harvest_records' as table_name,
		action,
		violation_type as denied_reason
	FROM harvest_rls_audit_log hra
	WHERE violation_type LIKE '%BYPASS%'
	OR violation_type LIKE '%DENIED%'
	ORDER BY attempted_at DESC
	LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user access summary
CREATE OR REPLACE FUNCTION get_user_access_summary(target_user_id UUID)
RETURNS TABLE (
	access_type VARCHAR(50),
	resource_count BIGINT,
	details JSONB
) AS $$
BEGIN
	-- Company access
	RETURN QUERY
	SELECT
		'companies'::VARCHAR(50),
		COUNT(*)::BIGINT,
		jsonb_agg(jsonb_build_object('id', company_id, 'assigned_at', created_at))
	FROM user_company_assignments
	WHERE user_id = target_user_id AND deleted_at IS NULL;

	-- Estate access
	RETURN QUERY
	SELECT
		'estates'::VARCHAR(50),
		COUNT(*)::BIGINT,
		jsonb_agg(jsonb_build_object('id', estate_id, 'assigned_at', created_at))
	FROM user_estate_assignments
	WHERE user_id = target_user_id AND deleted_at IS NULL;

	-- Division access
	RETURN QUERY
	SELECT
		'divisions'::VARCHAR(50),
		COUNT(*)::BIGINT,
		jsonb_agg(jsonb_build_object('id', division_id, 'assigned_at', created_at))
	FROM user_division_assignments
	WHERE user_id = target_user_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`

	return db.WithContext(ctx).Exec(sql).Error
}

func (m *Migration000010ImplementCompanyUserRLS) Down(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Drop all policies
DROP POLICY IF EXISTS company_select_policy ON companies;
DROP POLICY IF EXISTS company_insert_policy ON companies;
DROP POLICY IF EXISTS company_update_policy ON companies;
DROP POLICY IF EXISTS company_delete_policy ON companies;

DROP POLICY IF EXISTS user_select_policy ON users;
DROP POLICY IF EXISTS user_insert_policy ON users;
DROP POLICY IF EXISTS user_update_policy ON users;
DROP POLICY IF EXISTS user_delete_policy ON users;

DROP POLICY IF EXISTS estate_select_policy ON estates;
DROP POLICY IF EXISTS division_select_policy ON divisions;
DROP POLICY IF EXISTS block_select_policy ON blocks;

DROP POLICY IF EXISTS user_session_select_policy ON user_sessions;
DROP POLICY IF EXISTS jwt_token_select_policy ON jwt_tokens;
DROP POLICY IF EXISTS security_event_select_policy ON security_events;

-- Disable RLS
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE estates DISABLE ROW LEVEL SECURITY;
ALTER TABLE divisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_estate_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_division_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE jwt_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE security_events DISABLE ROW LEVEL SECURITY;

-- Drop views and functions
DROP VIEW IF EXISTS security_compliance_dashboard;
DROP FUNCTION IF EXISTS has_company_access(UUID);
DROP FUNCTION IF EXISTS can_modify_company(UUID);
DROP FUNCTION IF EXISTS has_user_access(UUID);
DROP FUNCTION IF EXISTS can_modify_user(UUID);
DROP FUNCTION IF EXISTS has_estate_access(UUID);
DROP FUNCTION IF EXISTS has_division_access(UUID);
DROP FUNCTION IF EXISTS has_block_access(UUID);
DROP FUNCTION IF EXISTS can_change_password(UUID);
DROP FUNCTION IF EXISTS audit_rls_bypass_attempts();
DROP FUNCTION IF EXISTS get_user_access_summary(UUID);
`

	return db.WithContext(ctx).Exec(sql).Error
}

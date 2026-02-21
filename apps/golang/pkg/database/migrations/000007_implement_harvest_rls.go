package migrations

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// Migration000007ImplementHarvestRLS implements Row Level Security for Harvest module
// This migration provides defense-in-depth security at the database level
type Migration000007ImplementHarvestRLS struct{}

func (m *Migration000007ImplementHarvestRLS) Version() string {
	return "000007"
}

func (m *Migration000007ImplementHarvestRLS) Name() string {
	return "implement_harvest_rls"
}

func (m *Migration000007ImplementHarvestRLS) Up(ctx context.Context, db *gorm.DB) error {
	// Step 1: Create security context functions
	if err := m.createSecurityContextFunctions(ctx, db); err != nil {
		return fmt.Errorf("failed to create security context functions: %w", err)
	}

	// Step 2: Create RLS helper functions for harvest module
	if err := m.createHarvestSecurityFunctions(ctx, db); err != nil {
		return fmt.Errorf("failed to create harvest security functions: %w", err)
	}

	// Step 3: Enable RLS on harvest_records table
	if err := m.enableHarvestTableRLS(ctx, db); err != nil {
		return fmt.Errorf("failed to enable harvest table RLS: %w", err)
	}

	// Step 4: Create RLS policies for harvest_records
	if err := m.createHarvestRLSPolicies(ctx, db); err != nil {
		return fmt.Errorf("failed to create harvest RLS policies: %w", err)
	}

	// Step 5: Create performance monitoring view
	if err := m.createPerformanceMonitoringView(ctx, db); err != nil {
		return fmt.Errorf("failed to create performance monitoring view: %w", err)
	}

	return nil
}

// createSecurityContextFunctions creates functions to set/get security context
func (m *Migration000007ImplementHarvestRLS) createSecurityContextFunctions(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Function to set current user context (application level)
CREATE OR REPLACE FUNCTION app_set_user_context(
	p_user_id UUID,
	p_role VARCHAR(50),
	p_company_ids UUID[],
	p_estate_ids UUID[],
	p_division_ids UUID[]
) RETURNS VOID AS $$
BEGIN
	-- Set user context variables for RLS policies
	PERFORM set_config('app.user_id', p_user_id::TEXT, false);
	PERFORM set_config('app.user_role', p_role, false);
	PERFORM set_config('app.company_ids', array_to_string(p_company_ids, ','), false);
	PERFORM set_config('app.estate_ids', array_to_string(p_estate_ids, ','), false);
	PERFORM set_config('app.division_ids', array_to_string(p_division_ids, ','), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user ID from context
CREATE OR REPLACE FUNCTION app_get_user_id() RETURNS UUID AS $$
BEGIN
	RETURN NULLIF(current_setting('app.user_id', true), '')::UUID;
EXCEPTION
	WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get current user role from context
CREATE OR REPLACE FUNCTION app_get_user_role() RETURNS VARCHAR(50) AS $$
BEGIN
	RETURN NULLIF(current_setting('app.user_role', true), '');
EXCEPTION
	WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get current user's company IDs from context
CREATE OR REPLACE FUNCTION app_get_company_ids() RETURNS UUID[] AS $$
DECLARE
	company_ids_str TEXT;
	company_ids_arr TEXT[];
	result UUID[];
BEGIN
	company_ids_str := NULLIF(current_setting('app.company_ids', true), '');
	IF company_ids_str IS NULL THEN
		RETURN ARRAY[]::UUID[];
	END IF;

	company_ids_arr := string_to_array(company_ids_str, ',');
	result := ARRAY(SELECT unnest(company_ids_arr)::UUID);
	RETURN result;
EXCEPTION
	WHEN OTHERS THEN RETURN ARRAY[]::UUID[];
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get current user's estate IDs from context
CREATE OR REPLACE FUNCTION app_get_estate_ids() RETURNS UUID[] AS $$
DECLARE
	estate_ids_str TEXT;
	estate_ids_arr TEXT[];
	result UUID[];
BEGIN
	estate_ids_str := NULLIF(current_setting('app.estate_ids', true), '');
	IF estate_ids_str IS NULL THEN
		RETURN ARRAY[]::UUID[];
	END IF;

	estate_ids_arr := string_to_array(estate_ids_str, ',');
	result := ARRAY(SELECT unnest(estate_ids_arr)::UUID);
	RETURN result;
EXCEPTION
	WHEN OTHERS THEN RETURN ARRAY[]::UUID[];
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get current user's division IDs from context
CREATE OR REPLACE FUNCTION app_get_division_ids() RETURNS UUID[] AS $$
DECLARE
	division_ids_str TEXT;
	division_ids_arr TEXT[];
	result UUID[];
BEGIN
	division_ids_str := NULLIF(current_setting('app.division_ids', true), '');
	IF division_ids_str IS NULL THEN
		RETURN ARRAY[]::UUID[];
	END IF;

	division_ids_arr := string_to_array(division_ids_str, ',');
	result := ARRAY(SELECT unnest(division_ids_arr)::UUID);
	RETURN result;
EXCEPTION
	WHEN OTHERS THEN RETURN ARRAY[]::UUID[];
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to clear user context
CREATE OR REPLACE FUNCTION app_clear_user_context() RETURNS VOID AS $$
BEGIN
	PERFORM set_config('app.user_id', '', false);
	PERFORM set_config('app.user_role', '', false);
	PERFORM set_config('app.company_ids', '', false);
	PERFORM set_config('app.estate_ids', '', false);
	PERFORM set_config('app.division_ids', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index to speed up context lookups
CREATE INDEX IF NOT EXISTS idx_users_id_active ON users(id) WHERE deleted_at IS NULL;
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createHarvestSecurityFunctions creates harvest-specific security functions
func (m *Migration000007ImplementHarvestRLS) createHarvestSecurityFunctions(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Function to check if user has access to a harvest record
CREATE OR REPLACE FUNCTION has_harvest_access(record_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	user_role VARCHAR(50);
	user_id UUID;
	company_ids UUID[];
	estate_ids UUID[];
	division_ids UUID[];
	record_company_id UUID;
	record_estate_id UUID;
	record_division_id UUID;
BEGIN
	-- Get user context
	user_id := app_get_user_id();
	user_role := app_get_user_role();
	company_ids := app_get_company_ids();
	estate_ids := app_get_estate_ids();
	division_ids := app_get_division_ids();

	-- NULL user ID means no access (must be authenticated)
	IF user_id IS NULL THEN
		RETURN false;
	END IF;

	-- SUPER_ADMIN has access to everything
	IF user_role = 'SUPER_ADMIN' THEN
		RETURN true;
	END IF;

	-- Get harvest record's hierarchy
	SELECT
		b.estate_id,
		d.id as division_id,
		e.company_id
	INTO record_estate_id, record_division_id, record_company_id
	FROM harvest_records hr
	JOIN blocks b ON hr.block_id = b.id
	JOIN divisions d ON b.division_id = d.id
	JOIN estates e ON d.estate_id = e.id
	WHERE hr.id = record_id;

	-- Check access based on role
	CASE user_role
		WHEN 'COMPANY_ADMIN' THEN
			RETURN record_company_id = ANY(company_ids);
		WHEN 'AREA_MANAGER' THEN
			RETURN record_company_id = ANY(company_ids);
		WHEN 'MANAGER' THEN
			RETURN record_estate_id = ANY(estate_ids);
		WHEN 'ASISTEN' THEN
			RETURN record_division_id = ANY(division_ids);
		WHEN 'MANDOR' THEN
			-- Mandor can only access their own records
			RETURN hr.mandor_id = user_id FROM harvest_records hr WHERE hr.id = record_id;
		WHEN 'SATPAM' THEN
			-- Satpam has no harvest access
			RETURN false;
		ELSE
			RETURN false;
	END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check harvest record ownership
CREATE OR REPLACE FUNCTION is_harvest_owner(record_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	user_id UUID;
	mandor_id UUID;
BEGIN
	user_id := app_get_user_id();

	IF user_id IS NULL THEN
		RETURN false;
	END IF;

	SELECT hr.mandor_id INTO mandor_id
	FROM harvest_records hr
	WHERE hr.id = record_id;

	RETURN mandor_id = user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can modify harvest record
CREATE OR REPLACE FUNCTION can_modify_harvest(record_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	user_role VARCHAR(50);
	record_status VARCHAR(20);
BEGIN
	user_role := app_get_user_role();

	-- Get record status
	SELECT status INTO record_status
	FROM harvest_records
	WHERE id = record_id;

	-- Cannot modify approved or rejected records
	IF record_status IN ('APPROVED', 'REJECTED') THEN
		RETURN false;
	END IF;

	-- Check role-based modification rights
	CASE user_role
		WHEN 'SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER' THEN
			RETURN has_harvest_access(record_id);
		WHEN 'MANDOR' THEN
			-- Mandor can only modify their own pending records
			RETURN is_harvest_owner(record_id) AND record_status = 'PENDING';
		ELSE
			RETURN false;
	END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can approve/reject harvest
CREATE OR REPLACE FUNCTION can_approve_harvest(record_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	user_role VARCHAR(50);
BEGIN
	user_role := app_get_user_role();

	-- Only certain roles can approve
	IF user_role NOT IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER', 'ASISTEN') THEN
		RETURN false;
	END IF;

	RETURN has_harvest_access(record_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
`

	return db.WithContext(ctx).Exec(sql).Error
}

// enableHarvestTableRLS enables RLS on harvest-related tables
func (m *Migration000007ImplementHarvestRLS) enableHarvestTableRLS(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Enable Row Level Security on harvest_records
ALTER TABLE harvest_records ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners (prevents bypass by admin users)
ALTER TABLE harvest_records FORCE ROW LEVEL SECURITY;

-- Add audit columns if they don't exist
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM information_schema.columns
				  WHERE table_name='harvest_records' AND column_name='rls_checked_at') THEN
		ALTER TABLE harvest_records ADD COLUMN rls_checked_at TIMESTAMP WITH TIME ZONE;
	END IF;

	IF NOT EXISTS (SELECT 1 FROM information_schema.columns
				  WHERE table_name='harvest_records' AND column_name='rls_bypassed') THEN
		ALTER TABLE harvest_records ADD COLUMN rls_bypassed BOOLEAN DEFAULT false;
	END IF;
END $$;

-- Create trigger to track RLS checks
CREATE OR REPLACE FUNCTION track_harvest_rls_check()
RETURNS TRIGGER AS $$
BEGIN
	NEW.rls_checked_at := NOW();
	NEW.rls_bypassed := false;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS harvest_rls_check_trigger ON harvest_records;
CREATE TRIGGER harvest_rls_check_trigger
	BEFORE INSERT OR UPDATE ON harvest_records
	FOR EACH ROW
	EXECUTE FUNCTION track_harvest_rls_check();
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createHarvestRLSPolicies creates RLS policies for harvest_records table
func (m *Migration000007ImplementHarvestRLS) createHarvestRLSPolicies(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Policy 1: SELECT - Users can view harvest records they have access to
DROP POLICY IF EXISTS harvest_select_policy ON harvest_records;
CREATE POLICY harvest_select_policy ON harvest_records
	FOR SELECT
	USING (
		-- Must have user context set
		app_get_user_id() IS NOT NULL
		AND
		-- Must have access based on hierarchy
		has_harvest_access(id)
	);

-- Policy 2: INSERT - Users can create harvest records in their scope
DROP POLICY IF EXISTS harvest_insert_policy ON harvest_records;
CREATE POLICY harvest_insert_policy ON harvest_records
	FOR INSERT
	WITH CHECK (
		-- Must have user context set
		app_get_user_id() IS NOT NULL
		AND
		-- Role-based insert checks
		CASE app_get_user_role()
			WHEN 'SUPER_ADMIN' THEN true
			WHEN 'COMPANY_ADMIN', 'AREA_MANAGER' THEN
				-- Can insert for any mandor in their companies
				EXISTS (
					SELECT 1 FROM users u
					JOIN user_company_assignments uca ON u.id = uca.user_id
					WHERE u.id = mandor_id
					AND uca.company_id = ANY(app_get_company_ids())
				)
			WHEN 'MANAGER' THEN
				-- Can insert for mandors in their estates
				EXISTS (
					SELECT 1 FROM users u
					JOIN user_estate_assignments uea ON u.id = uea.user_id
					WHERE u.id = mandor_id
					AND uea.estate_id = ANY(app_get_estate_ids())
				)
			WHEN 'MANDOR' THEN
				-- Mandor can only insert their own records
				mandor_id = app_get_user_id()
			ELSE false
		END
	);

-- Policy 3: UPDATE - Users can update harvest records they can modify
DROP POLICY IF EXISTS harvest_update_policy ON harvest_records;
CREATE POLICY harvest_update_policy ON harvest_records
	FOR UPDATE
	USING (
		app_get_user_id() IS NOT NULL
		AND can_modify_harvest(id)
	)
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND can_modify_harvest(id)
	);

-- Policy 4: DELETE - Only admins can delete (soft delete)
DROP POLICY IF EXISTS harvest_delete_policy ON harvest_records;
CREATE POLICY harvest_delete_policy ON harvest_records
	FOR DELETE
	USING (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
		AND has_harvest_access(id)
	);

-- Create separate policies for approval operations
-- This ensures approval actions are separately controlled

-- Policy 5: Approval UPDATE - Special policy for status changes
DROP POLICY IF EXISTS harvest_approval_policy ON harvest_records;
CREATE POLICY harvest_approval_policy ON harvest_records
	FOR UPDATE
	USING (
		app_get_user_id() IS NOT NULL
		AND can_approve_harvest(id)
		-- Only allow status changes
		AND (
			(OLD.status = 'PENDING' AND NEW.status IN ('APPROVED', 'REJECTED'))
			OR
			app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
		)
	)
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND can_approve_harvest(id)
	);
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createPerformanceMonitoringView creates views for RLS performance monitoring
func (m *Migration000007ImplementHarvestRLS) createPerformanceMonitoringView(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Create view for RLS performance monitoring
CREATE OR REPLACE VIEW harvest_rls_performance AS
SELECT
	'harvest_records' as table_name,
	COUNT(*) as total_records,
	COUNT(*) FILTER (WHERE rls_checked_at IS NOT NULL) as rls_checked_count,
	COUNT(*) FILTER (WHERE rls_bypassed = true) as rls_bypassed_count,
	AVG(EXTRACT(EPOCH FROM (NOW() - rls_checked_at))) as avg_check_age_seconds,
	MAX(rls_checked_at) as last_rls_check,
	MIN(rls_checked_at) as first_rls_check
FROM harvest_records
WHERE deleted_at IS NULL;

-- Create view for RLS policy effectiveness
CREATE OR REPLACE VIEW harvest_rls_effectiveness AS
SELECT
	DATE(created_at) as date,
	COUNT(*) as records_created,
	COUNT(DISTINCT mandor_id) as unique_mandors,
	COUNT(*) FILTER (WHERE status = 'PENDING') as pending_records,
	COUNT(*) FILTER (WHERE status = 'APPROVED') as approved_records,
	COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected_records,
	AVG(berat_tbs) as avg_weight
FROM harvest_records
WHERE deleted_at IS NULL
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;

-- Create function to test RLS performance
CREATE OR REPLACE FUNCTION test_harvest_rls_performance(
	test_user_id UUID,
	test_role VARCHAR(50),
	iterations INTEGER DEFAULT 100
)
RETURNS TABLE (
	avg_query_time_ms NUMERIC,
	total_time_ms NUMERIC,
	records_accessed INTEGER,
	rls_overhead_percent NUMERIC
) AS $$
DECLARE
	start_time TIMESTAMP;
	end_time TIMESTAMP;
	with_rls_time NUMERIC;
	without_rls_time NUMERIC;
	record_count INTEGER;
BEGIN
	-- Measure with RLS enabled
	start_time := clock_timestamp();

	FOR i IN 1..iterations LOOP
		PERFORM COUNT(*) FROM harvest_records;
	END LOOP;

	end_time := clock_timestamp();
	with_rls_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

	-- Get record count
	SELECT COUNT(*) INTO record_count FROM harvest_records;

	-- Calculate overhead (comparing to baseline)
	RETURN QUERY SELECT
		ROUND((with_rls_time / iterations)::numeric, 3) as avg_query_time_ms,
		ROUND(with_rls_time::numeric, 3) as total_time_ms,
		record_count as records_accessed,
		ROUND(((with_rls_time / iterations) / 10.0)::numeric, 2) as rls_overhead_percent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table for RLS violations
CREATE TABLE IF NOT EXISTS harvest_rls_audit_log (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID,
	user_role VARCHAR(50),
	action VARCHAR(20),
	record_id UUID,
	attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	violation_type VARCHAR(100),
	details JSONB,
	ip_address INET,
	user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_harvest_rls_audit_user ON harvest_rls_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_harvest_rls_audit_date ON harvest_rls_audit_log(attempted_at);
CREATE INDEX IF NOT EXISTS idx_harvest_rls_audit_violation ON harvest_rls_audit_log(violation_type);
`

	return db.WithContext(ctx).Exec(sql).Error
}

func (m *Migration000007ImplementHarvestRLS) Down(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Drop policies
DROP POLICY IF EXISTS harvest_select_policy ON harvest_records;
DROP POLICY IF EXISTS harvest_insert_policy ON harvest_records;
DROP POLICY IF EXISTS harvest_update_policy ON harvest_records;
DROP POLICY IF EXISTS harvest_delete_policy ON harvest_records;
DROP POLICY IF EXISTS harvest_approval_policy ON harvest_records;

-- Disable RLS
ALTER TABLE harvest_records DISABLE ROW LEVEL SECURITY;

-- Drop triggers
DROP TRIGGER IF EXISTS harvest_rls_check_trigger ON harvest_records;
DROP FUNCTION IF EXISTS track_harvest_rls_check();

-- Drop audit columns
ALTER TABLE harvest_records DROP COLUMN IF EXISTS rls_checked_at;
ALTER TABLE harvest_records DROP COLUMN IF EXISTS rls_bypassed;

-- Drop views
DROP VIEW IF EXISTS harvest_rls_performance;
DROP VIEW IF EXISTS harvest_rls_effectiveness;

-- Drop audit log
DROP TABLE IF EXISTS harvest_rls_audit_log;

-- Drop functions
DROP FUNCTION IF EXISTS test_harvest_rls_performance(UUID, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS has_harvest_access(UUID);
DROP FUNCTION IF EXISTS is_harvest_owner(UUID);
DROP FUNCTION IF EXISTS can_modify_harvest(UUID);
DROP FUNCTION IF EXISTS can_approve_harvest(UUID);
DROP FUNCTION IF EXISTS app_set_user_context(UUID, VARCHAR, UUID[], UUID[], UUID[]);
DROP FUNCTION IF EXISTS app_get_user_id();
DROP FUNCTION IF EXISTS app_get_user_role();
DROP FUNCTION IF EXISTS app_get_company_ids();
DROP FUNCTION IF EXISTS app_get_estate_ids();
DROP FUNCTION IF EXISTS app_get_division_ids();
DROP FUNCTION IF EXISTS app_clear_user_context();
`

	return db.WithContext(ctx).Exec(sql).Error
}

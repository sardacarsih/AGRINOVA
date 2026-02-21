package migrations

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// Migration000009ImplementGateCheckRLS implements Row Level Security for Gate Check module
// Gate check has different security requirements due to Satpam role and QR tokens
type Migration000009ImplementGateCheckRLS struct{}

func (m *Migration000009ImplementGateCheckRLS) Version() string {
	return "000009"
}

func (m *Migration000009ImplementGateCheckRLS) Name() string {
	return "implement_gatecheck_rls"
}

func (m *Migration000009ImplementGateCheckRLS) Up(ctx context.Context, db *gorm.DB) error {
	// Step 1: Create gate check security functions
	if err := m.createGateCheckSecurityFunctions(ctx, db); err != nil {
		return fmt.Errorf("failed to create gate check security functions: %w", err)
	}

	// Step 2: Enable RLS on gate check tables
	if err := m.enableGateCheckTableRLS(ctx, db); err != nil {
		return fmt.Errorf("failed to enable gate check table RLS: %w", err)
	}

	// Step 3: Create RLS policies for gate_check_records
	if err := m.createGateCheckRLSPolicies(ctx, db); err != nil {
		return fmt.Errorf("failed to create gate check RLS policies: %w", err)
	}

	// Step 4: Create RLS policies for QR tokens
	if err := m.createQRTokenRLSPolicies(ctx, db); err != nil {
		return fmt.Errorf("failed to create QR token RLS policies: %w", err)
	}

	// Step 5: Create RLS policies for guest logs
	if err := m.createGuestLogRLSPolicies(ctx, db); err != nil {
		return fmt.Errorf("failed to create guest log RLS policies: %w", err)
	}

	// Step 6: Create RLS policies for gate check photos
	if err := m.createGateCheckPhotoRLSPolicies(ctx, db); err != nil {
		return fmt.Errorf("failed to create gate check photo RLS policies: %w", err)
	}

	// Step 7: Create audit and monitoring
	if err := m.createGateCheckAuditMonitoring(ctx, db); err != nil {
		return fmt.Errorf("failed to create gate check audit monitoring: %w", err)
	}

	return nil
}

// createGateCheckSecurityFunctions creates gate check specific security functions
func (m *Migration000009ImplementGateCheckRLS) createGateCheckSecurityFunctions(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Function to check if user has access to a gate check record
CREATE OR REPLACE FUNCTION has_gatecheck_access(record_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	user_role VARCHAR(50);
	user_id UUID;
	company_ids UUID[];
	estate_ids UUID[];
	record_company_id UUID;
	satpam_id UUID;
BEGIN
	-- Get user context
	user_id := app_get_user_id();
	user_role := app_get_user_role();
	company_ids := app_get_company_ids();
	estate_ids := app_get_estate_ids();

	-- NULL user ID means no access
	IF user_id IS NULL THEN
		RETURN false;
	END IF;

	-- SUPER_ADMIN has access to everything
	IF user_role = 'SUPER_ADMIN' THEN
		RETURN true;
	END IF;

	-- Get gate check record details
	SELECT gc.satpam_id INTO satpam_id
	FROM gate_check_records gc
	WHERE gc.id = record_id;

	-- SATPAM can only access their own records
	IF user_role = 'SATPAM' THEN
		RETURN satpam_id = user_id;
	END IF;

	-- For other roles, check company hierarchy through satpam's company assignment
	SELECT DISTINCT uca.company_id INTO record_company_id
	FROM gate_check_records gc
	JOIN users u ON gc.satpam_id = u.id
	LEFT JOIN user_company_assignments uca ON u.id = uca.user_id
	WHERE gc.id = record_id
	LIMIT 1;

	-- Check access based on role
	CASE user_role
		WHEN 'COMPANY_ADMIN' THEN
			RETURN record_company_id = ANY(company_ids);
		WHEN 'AREA_MANAGER' THEN
			RETURN record_company_id = ANY(company_ids);
		WHEN 'MANAGER' THEN
			-- Managers can view gate checks in their estates
			RETURN EXISTS (
				SELECT 1
				FROM user_estate_assignments uea
				WHERE uea.user_id = user_id
				AND uea.estate_id = ANY(estate_ids)
			);
		ELSE
			-- Asisten and Mandor typically don't have gate check access
			RETURN false;
	END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can modify gate check record
CREATE OR REPLACE FUNCTION can_modify_gatecheck(record_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	user_role VARCHAR(50);
	user_id UUID;
	record_status VARCHAR(20);
BEGIN
	user_role := app_get_user_role();
	user_id := app_get_user_id();

	-- Get record status
	SELECT status INTO record_status
	FROM gate_check_records
	WHERE id = record_id;

	-- Cannot modify completed records
	IF record_status = 'COMPLETED' THEN
		RETURN false;
	END IF;

	-- Check role-based modification rights
	CASE user_role
		WHEN 'SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER' THEN
			RETURN has_gatecheck_access(record_id);
		WHEN 'SATPAM' THEN
			-- Satpam can only modify their own pending/approved records
			RETURN EXISTS (
				SELECT 1
				FROM gate_check_records
				WHERE id = record_id
				AND satpam_id = user_id
			);
		ELSE
			RETURN false;
	END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check QR token access
CREATE OR REPLACE FUNCTION has_qr_token_access(token_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	user_role VARCHAR(50);
	user_id UUID;
	company_ids UUID[];
	token_company_id UUID;
	token_generated_by UUID;
BEGIN
	user_id := app_get_user_id();
	user_role := app_get_user_role();
	company_ids := app_get_company_ids();

	IF user_id IS NULL THEN
		RETURN false;
	END IF;

	IF user_role = 'SUPER_ADMIN' THEN
		RETURN true;
	END IF;

	-- Get token details
	SELECT company_id, generated_user_id INTO token_company_id, token_generated_by
	FROM qr_tokens
	WHERE id = token_id;

	-- User can access tokens they generated
	IF token_generated_by = user_id THEN
		RETURN true;
	END IF;

	-- Check company-based access
	CASE user_role
		WHEN 'COMPANY_ADMIN', 'AREA_MANAGER' THEN
			RETURN token_company_id = ANY(company_ids);
		WHEN 'SATPAM' THEN
			-- Satpam can only access tokens in their company
			RETURN token_company_id = ANY(company_ids);
		ELSE
			RETURN false;
	END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to validate QR token security (prevent replay attacks)
CREATE OR REPLACE FUNCTION validate_qr_token_security(
	token_id UUID,
	device_id VARCHAR(255),
	ip_address INET
) RETURNS BOOLEAN AS $$
DECLARE
	token_status VARCHAR(20);
	token_expires_at TIMESTAMP;
	token_max_usage INT;
	token_usage_count INT;
	token_device_fingerprint TEXT;
	is_suspicious BOOLEAN;
BEGIN
	-- Get token details
	SELECT status, expires_at, max_usage, usage_count, device_fingerprint
	INTO token_status, token_expires_at, token_max_usage, token_usage_count, token_device_fingerprint
	FROM qr_tokens
	WHERE id = token_id;

	-- Check token status
	IF token_status != 'ACTIVE' THEN
		RETURN false;
	END IF;

	-- Check expiration
	IF NOW() > token_expires_at THEN
		RETURN false;
	END IF;

	-- Check usage limits
	IF token_usage_count >= token_max_usage THEN
		RETURN false;
	END IF;

	-- Device fingerprint validation (if set)
	-- Note: Actual device fingerprint validation would be more complex
	-- This is a simplified version

	-- Log suspicious activity
	is_suspicious := false;

	-- Check for rapid successive scans (potential replay attack)
	IF EXISTS (
		SELECT 1 FROM qr_tokens
		WHERE id = token_id
		AND last_used_at IS NOT NULL
		AND NOW() - last_used_at < INTERVAL '5 seconds'
	) THEN
		is_suspicious := true;
	END IF;

	-- Log if suspicious
	IF is_suspicious THEN
		INSERT INTO harvest_rls_audit_log (
			user_id, action, violation_type, details, ip_address
		) VALUES (
			app_get_user_id(),
			'QR_SCAN',
			'SUSPICIOUS_QR_TOKEN_USAGE',
			json_build_object('token_id', token_id, 'device_id', device_id)::jsonb,
			ip_address
		);
	END IF;

	RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check guest log access
CREATE OR REPLACE FUNCTION has_guest_log_access(log_id UUID) RETURNS BOOLEAN AS $$
DECLARE
	user_role VARCHAR(50);
	user_id UUID;
	company_ids UUID[];
	log_company_id UUID;
	log_created_by UUID;
BEGIN
	user_id := app_get_user_id();
	user_role := app_get_user_role();
	company_ids := app_get_company_ids();

	IF user_id IS NULL THEN
		RETURN false;
	END IF;

	IF user_role = 'SUPER_ADMIN' THEN
		RETURN true;
	END IF;

	-- Get guest log details
	SELECT company_id, created_user_id INTO log_company_id, log_created_by
	FROM guest_logs
	WHERE id = log_id;

	-- Check company-based access
	CASE user_role
		WHEN 'COMPANY_ADMIN', 'AREA_MANAGER' THEN
			RETURN log_company_id = ANY(company_ids);
		WHEN 'MANAGER' THEN
			RETURN log_company_id = ANY(company_ids);
		WHEN 'SATPAM' THEN
			-- Satpam can access logs they created or in their company
			RETURN log_created_by = user_id OR log_company_id = ANY(company_ids);
		ELSE
			RETURN false;
	END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
`

	return db.WithContext(ctx).Exec(sql).Error
}

// enableGateCheckTableRLS enables RLS on gate check tables
func (m *Migration000009ImplementGateCheckRLS) enableGateCheckTableRLS(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Enable RLS on gate check tables
ALTER TABLE gate_check_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_check_records FORCE ROW LEVEL SECURITY;

ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tokens FORCE ROW LEVEL SECURITY;

ALTER TABLE gate_guest_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_guest_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE gate_check_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_check_photos FORCE ROW LEVEL SECURITY;

-- Add audit columns
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM information_schema.columns
				  WHERE table_name='gate_check_records' AND column_name='rls_checked_at') THEN
		ALTER TABLE gate_check_records ADD COLUMN rls_checked_at TIMESTAMP WITH TIME ZONE;
		ALTER TABLE gate_check_records ADD COLUMN rls_bypassed BOOLEAN DEFAULT false;
	END IF;

	IF NOT EXISTS (SELECT 1 FROM information_schema.columns
				  WHERE table_name='qr_tokens' AND column_name='rls_checked_at') THEN
		ALTER TABLE qr_tokens ADD COLUMN rls_checked_at TIMESTAMP WITH TIME ZONE;
		ALTER TABLE qr_tokens ADD COLUMN rls_bypassed BOOLEAN DEFAULT false;
	END IF;
END $$;
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createGateCheckRLSPolicies creates RLS policies for gate_check_records
func (m *Migration000009ImplementGateCheckRLS) createGateCheckRLSPolicies(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Policy 1: SELECT - Users can view gate check records they have access to
DROP POLICY IF EXISTS gatecheck_select_policy ON gate_check_records;
CREATE POLICY gatecheck_select_policy ON gate_check_records
	FOR SELECT
	USING (
		app_get_user_id() IS NOT NULL
		AND has_gatecheck_access(id)
	);

-- Policy 2: INSERT - Satpam can create gate check records
DROP POLICY IF EXISTS gatecheck_insert_policy ON gate_check_records;
CREATE POLICY gatecheck_insert_policy ON gate_check_records
	FOR INSERT
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND (
			-- Satpam can insert their own records
			(app_get_user_role() = 'SATPAM' AND satpam_id = app_get_user_id())
			OR
			-- Admins and managers can insert for any satpam in their scope
			(app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER'))
		)
	);

-- Policy 3: UPDATE - Can update records they can modify
DROP POLICY IF EXISTS gatecheck_update_policy ON gate_check_records;
CREATE POLICY gatecheck_update_policy ON gate_check_records
	FOR UPDATE
	USING (
		app_get_user_id() IS NOT NULL
		AND can_modify_gatecheck(id)
	)
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND can_modify_gatecheck(id)
	);

-- Policy 4: DELETE - Only admins can delete
DROP POLICY IF EXISTS gatecheck_delete_policy ON gate_check_records;
CREATE POLICY gatecheck_delete_policy ON gate_check_records
	FOR DELETE
	USING (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
		AND has_gatecheck_access(id)
	);
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createQRTokenRLSPolicies creates RLS policies for qr_tokens
func (m *Migration000009ImplementGateCheckRLS) createQRTokenRLSPolicies(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Policy 1: SELECT - Users can view QR tokens they have access to
DROP POLICY IF EXISTS qr_token_select_policy ON qr_tokens;
CREATE POLICY qr_token_select_policy ON qr_tokens
	FOR SELECT
	USING (
		app_get_user_id() IS NOT NULL
		AND has_qr_token_access(id)
	);

-- Policy 2: INSERT - Users can generate QR tokens for their scope
DROP POLICY IF EXISTS qr_token_insert_policy ON qr_tokens;
CREATE POLICY qr_token_insert_policy ON qr_tokens
	FOR INSERT
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND (
			-- User must be the generator
			generated_user_id = app_get_user_id()
			AND
			-- Company must be in user's scope (or SUPER_ADMIN)
			(
				app_get_user_role() = 'SUPER_ADMIN'
				OR company_id = ANY(app_get_company_ids())
			)
		)
	);

-- Policy 3: UPDATE - Limited updates (usage tracking only)
DROP POLICY IF EXISTS qr_token_update_policy ON qr_tokens;
CREATE POLICY qr_token_update_policy ON qr_tokens
	FOR UPDATE
	USING (
		app_get_user_id() IS NOT NULL
		AND has_qr_token_access(id)
		AND (
			-- Only allow status and usage updates
			(OLD.status != NEW.status AND NEW.status IN ('USED', 'CANCELLED', 'EXPIRED'))
			OR (OLD.usage_count != NEW.usage_count)
			OR (OLD.current_usage != NEW.current_usage)
			OR app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
		)
	)
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND has_qr_token_access(id)
	);

-- Policy 4: DELETE - Only creator or admin can delete
DROP POLICY IF EXISTS qr_token_delete_policy ON qr_tokens;
CREATE POLICY qr_token_delete_policy ON qr_tokens
	FOR DELETE
	USING (
		app_get_user_id() IS NOT NULL
		AND (
			generated_user_id = app_get_user_id()
			OR app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
		)
		AND has_qr_token_access(id)
	);
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createGuestLogRLSPolicies creates RLS policies for gate_guest_logs
func (m *Migration000009ImplementGateCheckRLS) createGuestLogRLSPolicies(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Policy 1: SELECT - Users can view guest logs they have access to
DROP POLICY IF EXISTS guest_log_select_policy ON gate_guest_logs;
CREATE POLICY guest_log_select_policy ON gate_guest_logs
	FOR SELECT
	USING (
		app_get_user_id() IS NOT NULL
		AND has_guest_log_access(id)
	);

-- Policy 2: INSERT - Authorized users can create guest logs
DROP POLICY IF EXISTS guest_log_insert_policy ON gate_guest_logs;
CREATE POLICY guest_log_insert_policy ON gate_guest_logs
	FOR INSERT
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND (
			-- User must be authorized
			authorized_user_id = app_get_user_id()
			AND created_user_id = app_get_user_id()
			AND
			-- Company must be in scope
			(
				app_get_user_role() = 'SUPER_ADMIN'
				OR company_id = ANY(app_get_company_ids())
			)
		)
	);

-- Policy 3: UPDATE - Can update logs they have access to
DROP POLICY IF EXISTS guest_log_update_policy ON gate_guest_logs;
CREATE POLICY guest_log_update_policy ON gate_guest_logs
	FOR UPDATE
	USING (
		app_get_user_id() IS NOT NULL
		AND has_guest_log_access(id)
		AND (
			-- Creator can update their logs
			created_user_id = app_get_user_id()
			OR
			-- Admins can update any log in their scope
			app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER')
		)
	)
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND has_guest_log_access(id)
	);

-- Policy 4: DELETE - Only admins can delete guest logs
DROP POLICY IF EXISTS guest_log_delete_policy ON gate_guest_logs;
CREATE POLICY guest_log_delete_policy ON gate_guest_logs
	FOR DELETE
	USING (
		app_get_user_id() IS NOT NULL
		AND app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
		AND has_guest_log_access(id)
	);
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createGateCheckPhotoRLSPolicies creates RLS policies for gate_check_photos
func (m *Migration000009ImplementGateCheckRLS) createGateCheckPhotoRLSPolicies(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Policy 1: SELECT - Users can view photos for records they can access
DROP POLICY IF EXISTS gatecheck_photo_select_policy ON gate_check_photos;
CREATE POLICY gatecheck_photo_select_policy ON gate_check_photos
	FOR SELECT
	USING (
		app_get_user_id() IS NOT NULL
		AND (
			-- Check access based on related record type
			CASE related_record_type
				WHEN 'GATE_CHECK_RECORD' THEN has_gatecheck_access(related_record_id)
				WHEN 'GUEST_LOG' THEN has_guest_log_access(related_record_id)
				ELSE false
			END
		)
	);

-- Policy 2: INSERT - Users can upload photos for records they can access
DROP POLICY IF EXISTS gatecheck_photo_insert_policy ON gate_check_photos;
CREATE POLICY gatecheck_photo_insert_policy ON gate_check_photos
	FOR INSERT
	WITH CHECK (
		app_get_user_id() IS NOT NULL
		AND created_user_id = app_get_user_id()
		AND (
			CASE related_record_type
				WHEN 'GATE_CHECK_RECORD' THEN has_gatecheck_access(related_record_id)
				WHEN 'GUEST_LOG' THEN has_guest_log_access(related_record_id)
				ELSE false
			END
		)
	);

-- Policy 3: UPDATE - Limited updates (sync status only)
DROP POLICY IF EXISTS gatecheck_photo_update_policy ON gate_check_photos;
CREATE POLICY gatecheck_photo_update_policy ON gate_check_photos
	FOR UPDATE
	USING (
		app_get_user_id() IS NOT NULL
		AND (
			created_user_id = app_get_user_id()
			OR app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
		)
	)
	WITH CHECK (
		app_get_user_id() IS NOT NULL
	);

-- Policy 4: DELETE - Only creator or admin can delete photos
DROP POLICY IF EXISTS gatecheck_photo_delete_policy ON gate_check_photos;
CREATE POLICY gatecheck_photo_delete_policy ON gate_check_photos
	FOR DELETE
	USING (
		app_get_user_id() IS NOT NULL
		AND (
			created_user_id = app_get_user_id()
			OR app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
		)
	);
`

	return db.WithContext(ctx).Exec(sql).Error
}

// createGateCheckAuditMonitoring creates audit and monitoring for gate check RLS
func (m *Migration000009ImplementGateCheckRLS) createGateCheckAuditMonitoring(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Create view for gate check RLS performance monitoring
CREATE OR REPLACE VIEW gatecheck_rls_performance AS
SELECT
	'gate_check_records' as table_name,
	COUNT(*) as total_records,
	COUNT(*) FILTER (WHERE rls_checked_at IS NOT NULL) as rls_checked_count,
	COUNT(*) FILTER (WHERE rls_bypassed = true) as rls_bypassed_count,
	COUNT(DISTINCT satpam_id) as unique_satpam,
	MAX(rls_checked_at) as last_rls_check
FROM gate_check_records
WHERE deleted_at IS NULL
UNION ALL
SELECT
	'qr_tokens' as table_name,
	COUNT(*) as total_records,
	COUNT(*) FILTER (WHERE rls_checked_at IS NOT NULL) as rls_checked_count,
	COUNT(*) FILTER (WHERE rls_bypassed = true) as rls_bypassed_count,
	COUNT(DISTINCT generated_user_id) as unique_generators,
	MAX(rls_checked_at) as last_rls_check
FROM qr_tokens;

-- Create view for QR token security monitoring
CREATE OR REPLACE VIEW qr_token_security_monitor AS
SELECT
	DATE(generated_at) as date,
	COUNT(*) as tokens_generated,
	COUNT(*) FILTER (WHERE status = 'USED') as tokens_used,
	COUNT(*) FILTER (WHERE status = 'EXPIRED') as tokens_expired,
	COUNT(*) FILTER (WHERE status = 'CANCELLED') as tokens_cancelled,
	COUNT(*) FILTER (WHERE usage_count > max_usage) as tokens_overused,
	AVG(EXTRACT(EPOCH FROM (first_used_at - generated_at))) as avg_time_to_first_use_seconds,
	COUNT(DISTINCT generated_user_id) as unique_generators
FROM qr_tokens
GROUP BY DATE(generated_at)
ORDER BY DATE(generated_at) DESC;

-- Create function to detect suspicious QR token activity
CREATE OR REPLACE FUNCTION detect_suspicious_qr_activity()
RETURNS TABLE (
	token_id UUID,
	generated_by UUID,
	suspicious_reason TEXT,
	severity VARCHAR(20),
	detected_at TIMESTAMP
) AS $$
BEGIN
	RETURN QUERY
	-- Detect tokens used multiple times rapidly
	SELECT
		id,
		generated_user_id,
		'Rapid successive usage detected' as suspicious_reason,
		'HIGH' as severity,
		NOW() as detected_at
	FROM qr_tokens
	WHERE usage_count > max_usage
	AND last_used_at > NOW() - INTERVAL '1 minute'

	UNION ALL

	-- Detect expired tokens still being scanned
	SELECT
		id,
		generated_user_id,
		'Expired token scan attempt' as suspicious_reason,
		'MEDIUM' as severity,
		NOW() as detected_at
	FROM qr_tokens
	WHERE status = 'EXPIRED'
	AND last_used_at > expires_at

	UNION ALL

	-- Detect tokens from unusual devices
	SELECT
		id,
		generated_user_id,
		'Device fingerprint mismatch' as suspicious_reason,
		'MEDIUM' as severity,
		NOW() as detected_at
	FROM qr_tokens
	WHERE scanned_device IS NOT NULL
	AND generated_device IS NOT NULL
	AND scanned_device != generated_device;
END;
$$ LANGUAGE plpgsql;
`

	return db.WithContext(ctx).Exec(sql).Error
}

func (m *Migration000009ImplementGateCheckRLS) Down(ctx context.Context, db *gorm.DB) error {
	sql := `
-- Drop policies for gate_check_records
DROP POLICY IF EXISTS gatecheck_select_policy ON gate_check_records;
DROP POLICY IF EXISTS gatecheck_insert_policy ON gate_check_records;
DROP POLICY IF EXISTS gatecheck_update_policy ON gate_check_records;
DROP POLICY IF EXISTS gatecheck_delete_policy ON gate_check_records;

-- Drop policies for qr_tokens
DROP POLICY IF EXISTS qr_token_select_policy ON qr_tokens;
DROP POLICY IF EXISTS qr_token_insert_policy ON qr_tokens;
DROP POLICY IF EXISTS qr_token_update_policy ON qr_tokens;
DROP POLICY IF EXISTS qr_token_delete_policy ON qr_tokens;

-- Drop policies for gate_guest_logs
DROP POLICY IF EXISTS guest_log_select_policy ON gate_guest_logs;
DROP POLICY IF EXISTS guest_log_insert_policy ON gate_guest_logs;
DROP POLICY IF EXISTS guest_log_update_policy ON gate_guest_logs;
DROP POLICY IF EXISTS guest_log_delete_policy ON gate_guest_logs;

-- Drop policies for gate_check_photos
DROP POLICY IF EXISTS gatecheck_photo_select_policy ON gate_check_photos;
DROP POLICY IF EXISTS gatecheck_photo_insert_policy ON gate_check_photos;
DROP POLICY IF EXISTS gatecheck_photo_update_policy ON gate_check_photos;
DROP POLICY IF EXISTS gatecheck_photo_delete_policy ON gate_check_photos;

-- Disable RLS
ALTER TABLE gate_check_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE gate_guest_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE gate_check_photos DISABLE ROW LEVEL SECURITY;

-- Drop audit columns
ALTER TABLE gate_check_records DROP COLUMN IF EXISTS rls_checked_at;
ALTER TABLE gate_check_records DROP COLUMN IF EXISTS rls_bypassed;
ALTER TABLE qr_tokens DROP COLUMN IF EXISTS rls_checked_at;
ALTER TABLE qr_tokens DROP COLUMN IF EXISTS rls_bypassed;

-- Drop views
DROP VIEW IF EXISTS gatecheck_rls_performance;
DROP VIEW IF EXISTS qr_token_security_monitor;

-- Drop functions
DROP FUNCTION IF EXISTS has_gatecheck_access(UUID);
DROP FUNCTION IF EXISTS can_modify_gatecheck(UUID);
DROP FUNCTION IF EXISTS has_qr_token_access(UUID);
DROP FUNCTION IF EXISTS validate_qr_token_security(UUID, VARCHAR, INET);
DROP FUNCTION IF EXISTS has_guest_log_access(UUID);
DROP FUNCTION IF EXISTS detect_suspicious_qr_activity();
`

	return db.WithContext(ctx).Exec(sql).Error
}

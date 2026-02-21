-- =============================================================================
-- AGRINOVA RLS POLICY APPLICATION
-- This script enables Row-Level Security on critical tables
-- Execute this manually to enable database-level security
-- =============================================================================

-- ===================================================
-- STEP 1: Create Security Context Functions
-- ===================================================

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

-- Function to get current user's estate IDs from context
CREATE OR REPLACE FUNCTION app_get_estate_ids() RETURNS UUID[] AS $$
DECLARE
	estate_ids_str TEXT;
BEGIN
	estate_ids_str := NULLIF(current_setting('app.estate_ids', true), '');
	IF estate_ids_str IS NULL OR estate_ids_str = '' THEN
		RETURN ARRAY[]::UUID[];
	END IF;
	RETURN string_to_array(estate_ids_str, ',')::UUID[];
EXCEPTION
	WHEN OTHERS THEN RETURN ARRAY[]::UUID[];
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get current user's division IDs from context
CREATE OR REPLACE FUNCTION app_get_division_ids() RETURNS UUID[] AS $$
DECLARE
	division_ids_str TEXT;
BEGIN
	division_ids_str := NULLIF(current_setting('app.division_ids', true), '');
	IF division_ids_str IS NULL OR division_ids_str = '' THEN
		RETURN ARRAY[]::UUID[];
	END IF;
	RETURN string_to_array(division_ids_str, ',')::UUID[];
EXCEPTION
	WHEN OTHERS THEN RETURN ARRAY[]::UUID[];
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get current user's company IDs from context
CREATE OR REPLACE FUNCTION app_get_company_ids() RETURNS UUID[] AS $$
DECLARE
	company_ids_str TEXT;
BEGIN
	company_ids_str := NULLIF(current_setting('app.company_ids', true), '');
	IF company_ids_str IS NULL OR company_ids_str = '' THEN
		RETURN ARRAY[]::UUID[];
	END IF;
	RETURN string_to_array(company_ids_str, ',')::UUID[];
EXCEPTION
	WHEN OTHERS THEN RETURN ARRAY[]::UUID[];
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ===================================================
-- STEP 2: Enable RLS on Tables
-- ===================================================

-- Enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Enable RLS on estates table
ALTER TABLE estates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estates FORCE ROW LEVEL SECURITY;

-- Enable RLS on divisions table
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions FORCE ROW LEVEL SECURITY;

-- Enable RLS on blocks table
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks FORCE ROW LEVEL SECURITY;

-- Enable RLS on harvest_records table
ALTER TABLE harvest_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvest_records FORCE ROW LEVEL SECURITY;

-- Enable RLS on gate_check_records table
ALTER TABLE gate_check_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_check_records FORCE ROW LEVEL SECURITY;

-- ===================================================
-- STEP 3: Create RLS Policies for Companies
-- ===================================================

-- DROP existing policies if any
DROP POLICY IF EXISTS company_select_policy ON companies;
DROP POLICY IF EXISTS company_insert_policy ON companies;
DROP POLICY IF EXISTS company_update_policy ON companies;
DROP POLICY IF EXISTS company_delete_policy ON companies;

-- SELECT policy for companies
CREATE POLICY company_select_policy ON companies
FOR SELECT
USING (
	app_get_user_role() = 'SUPER_ADMIN'
	OR id = ANY(app_get_company_ids())
);

-- INSERT policy for companies (SUPER_ADMIN only)
CREATE POLICY company_insert_policy ON companies
FOR INSERT
WITH CHECK (
	app_get_user_role() = 'SUPER_ADMIN'
);

-- UPDATE policy for companies
CREATE POLICY company_update_policy ON companies
FOR UPDATE
USING (
	app_get_user_role() = 'SUPER_ADMIN'
	OR (app_get_user_role() = 'COMPANY_ADMIN' AND id = ANY(app_get_company_ids()))
);

-- DELETE policy for companies (SUPER_ADMIN only)
CREATE POLICY company_delete_policy ON companies
FOR DELETE
USING (
	app_get_user_role() = 'SUPER_ADMIN'
);

-- ===================================================
-- STEP 4: Create RLS Policies for Users
-- ===================================================

DROP POLICY IF EXISTS user_select_policy ON users;
DROP POLICY IF EXISTS user_insert_policy ON users;
DROP POLICY IF EXISTS user_update_policy ON users;
DROP POLICY IF EXISTS user_delete_policy ON users;

-- SELECT policy for users
CREATE POLICY user_select_policy ON users
FOR SELECT
USING (
	app_get_user_role() = 'SUPER_ADMIN'
	OR company_id = ANY(app_get_company_ids())
	OR id = app_get_user_id()
);

-- INSERT policy for users
CREATE POLICY user_insert_policy ON users
FOR INSERT
WITH CHECK (
	app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
	AND (app_get_user_role() = 'SUPER_ADMIN' OR company_id = ANY(app_get_company_ids()))
);

-- UPDATE policy for users
CREATE POLICY user_update_policy ON users
FOR UPDATE
USING (
	app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
	OR id = app_get_user_id()
);

-- DELETE policy for users
CREATE POLICY user_delete_policy ON users
FOR DELETE
USING (
	app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
);

-- ===================================================
-- STEP 5: Create RLS Policies for Estates
-- ===================================================

DROP POLICY IF EXISTS estate_select_policy ON estates;
DROP POLICY IF EXISTS estate_insert_policy ON estates;
DROP POLICY IF EXISTS estate_update_policy ON estates;
DROP POLICY IF EXISTS estate_delete_policy ON estates;

-- SELECT policy for estates
CREATE POLICY estate_select_policy ON estates
FOR SELECT
USING (
	app_get_user_role() = 'SUPER_ADMIN'
	OR company_id = ANY(app_get_company_ids())
	OR id = ANY(app_get_estate_ids())
);

-- INSERT policy for estates
CREATE POLICY estate_insert_policy ON estates
FOR INSERT
WITH CHECK (
	app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
	AND (app_get_user_role() = 'SUPER_ADMIN' OR company_id = ANY(app_get_company_ids()))
);

-- UPDATE policy for estates
CREATE POLICY estate_update_policy ON estates
FOR UPDATE
USING (
	app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')
	AND (app_get_user_role() = 'SUPER_ADMIN' OR company_id = ANY(app_get_company_ids()) OR id = ANY(app_get_estate_ids()))
);

-- DELETE policy for estates
CREATE POLICY estate_delete_policy ON estates
FOR DELETE
USING (
	app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
);

-- ===================================================
-- STEP 6: Create RLS Policies for Divisions
-- ===================================================

DROP POLICY IF EXISTS division_select_policy ON divisions;
DROP POLICY IF EXISTS division_insert_policy ON divisions;
DROP POLICY IF EXISTS division_update_policy ON divisions;
DROP POLICY IF EXISTS division_delete_policy ON divisions;

-- SELECT policy for divisions
CREATE POLICY division_select_policy ON divisions
FOR SELECT
USING (
	app_get_user_role() = 'SUPER_ADMIN'
	OR estate_id = ANY(app_get_estate_ids())
	OR id = ANY(app_get_division_ids())
);

-- INSERT policy for divisions
CREATE POLICY division_insert_policy ON divisions
FOR INSERT
WITH CHECK (
	app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')
	AND (app_get_user_role() = 'SUPER_ADMIN' OR estate_id = ANY(app_get_estate_ids()))
);

-- UPDATE policy for divisions
CREATE POLICY division_update_policy ON divisions
FOR UPDATE
USING (
	app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'ASISTEN')
	AND (app_get_user_role() = 'SUPER_ADMIN' OR estate_id = ANY(app_get_estate_ids()) OR id = ANY(app_get_division_ids()))
);

-- DELETE policy for divisions
CREATE POLICY division_delete_policy ON divisions
FOR DELETE
USING (
	app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')
);

-- ===================================================
-- STEP 7: Create RLS Policies for Blocks
-- ===================================================

DROP POLICY IF EXISTS block_select_policy ON blocks;
DROP POLICY IF EXISTS block_insert_policy ON blocks;
DROP POLICY IF EXISTS block_update_policy ON blocks;
DROP POLICY IF EXISTS block_delete_policy ON blocks;

-- SELECT policy for blocks
CREATE POLICY block_select_policy ON blocks
FOR SELECT
USING (
	app_get_user_role() = 'SUPER_ADMIN'
	OR division_id = ANY(app_get_division_ids())
	OR division_id IN (SELECT id FROM divisions WHERE estate_id = ANY(app_get_estate_ids()))
);

-- INSERT policy for blocks
CREATE POLICY block_insert_policy ON blocks
FOR INSERT
WITH CHECK (
	app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')
);

-- UPDATE policy for blocks
CREATE POLICY block_update_policy ON blocks
FOR UPDATE
USING (
	app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'ASISTEN')
);

-- DELETE policy for blocks
CREATE POLICY block_delete_policy ON blocks
FOR DELETE
USING (
	app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')
);

-- ===================================================
-- STEP 8: Create RLS Policies for Harvest Records
-- ===================================================

DROP POLICY IF EXISTS harvest_select_policy ON harvest_records;
DROP POLICY IF EXISTS harvest_insert_policy ON harvest_records;
DROP POLICY IF EXISTS harvest_update_policy ON harvest_records;
DROP POLICY IF EXISTS harvest_delete_policy ON harvest_records;

-- SELECT policy for harvest_records
CREATE POLICY harvest_select_policy ON harvest_records
FOR SELECT
USING (
	app_get_user_role() = 'SUPER_ADMIN'
	OR mandor_id = app_get_user_id()
	OR block_id IN (
		SELECT b.id FROM blocks b
		JOIN divisions d ON b.division_id = d.id
		WHERE d.id = ANY(app_get_division_ids())
		   OR d.estate_id = ANY(app_get_estate_ids())
	)
);

-- INSERT policy for harvest_records
CREATE POLICY harvest_insert_policy ON harvest_records
FOR INSERT
WITH CHECK (
	app_get_user_role() IN ('SUPER_ADMIN', 'MANDOR', 'ASISTEN')
	AND (app_get_user_role() = 'SUPER_ADMIN' OR mandor_id = app_get_user_id())
);

-- UPDATE policy for harvest_records
CREATE POLICY harvest_update_policy ON harvest_records
FOR UPDATE
USING (
	app_get_user_role() = 'SUPER_ADMIN'
	OR mandor_id = app_get_user_id()
	OR app_get_user_role() IN ('ASISTEN', 'MANAGER', 'COMPANY_ADMIN')
);

-- DELETE policy for harvest_records
CREATE POLICY harvest_delete_policy ON harvest_records
FOR DELETE
USING (
	app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
);

-- ===================================================
-- STEP 9: Create RLS Policies for Gate Check Records
-- ===================================================

DROP POLICY IF EXISTS gatecheck_select_policy ON gate_check_records;
DROP POLICY IF EXISTS gatecheck_insert_policy ON gate_check_records;
DROP POLICY IF EXISTS gatecheck_update_policy ON gate_check_records;
DROP POLICY IF EXISTS gatecheck_delete_policy ON gate_check_records;

-- SELECT policy for gate_check_records
CREATE POLICY gatecheck_select_policy ON gate_check_records
FOR SELECT
USING (
	app_get_user_role() = 'SUPER_ADMIN'
	OR satpam_id = app_get_user_id()
	OR app_get_user_role() IN ('COMPANY_ADMIN', 'MANAGER', 'ASISTEN')
);

-- INSERT policy for gate_check_records
CREATE POLICY gatecheck_insert_policy ON gate_check_records
FOR INSERT
WITH CHECK (
	app_get_user_role() IN ('SUPER_ADMIN', 'SATPAM')
	AND (app_get_user_role() = 'SUPER_ADMIN' OR satpam_id = app_get_user_id())
);

-- UPDATE policy for gate_check_records
CREATE POLICY gatecheck_update_policy ON gate_check_records
FOR UPDATE
USING (
	app_get_user_role() = 'SUPER_ADMIN'
	OR satpam_id = app_get_user_id()
	OR app_get_user_role() IN ('MANAGER', 'COMPANY_ADMIN')
);

-- DELETE policy for gate_check_records
CREATE POLICY gatecheck_delete_policy ON gate_check_records
FOR DELETE
USING (
	app_get_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
);

-- ===================================================
-- VERIFICATION
-- ===================================================

-- Show enabled RLS tables
SELECT
	schemaname,
	tablename,
	rowsecurity as rls_enabled,
	(SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN (
	'companies',
	'users',
	'estates',
	'divisions',
	'blocks',
	'harvest_records',
	'gate_check_records'
  )
ORDER BY tablename;

-- Show created policies
SELECT
	tablename,
	policyname,
	cmd,
	qual IS NOT NULL as has_using_clause,
	with_check IS NOT NULL as has_check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

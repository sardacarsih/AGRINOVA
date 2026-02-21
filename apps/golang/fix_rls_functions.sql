-- ================================================================
-- Fix RLS Context Functions
-- ================================================================
-- This script creates the missing app_set_user_context function
-- and related helper functions for Row-Level Security (RLS)
--
-- Run this script against your PostgreSQL database to fix the error:
-- "ERROR: fungsi app_set_user_context(unknown, unknown, uuid[], uuid[], uuid[]) tidak ada"
--
-- Usage:
--   psql -U your_username -d your_database -f fix_rls_functions.sql
-- ================================================================

-- Drop existing functions if they exist (to ensure clean creation)
DROP FUNCTION IF EXISTS app_set_user_context(UUID, VARCHAR, UUID[], UUID[], UUID[]);
DROP FUNCTION IF EXISTS app_get_user_id();
DROP FUNCTION IF EXISTS app_get_user_role();
DROP FUNCTION IF EXISTS app_get_company_ids();
DROP FUNCTION IF EXISTS app_get_estate_ids();
DROP FUNCTION IF EXISTS app_get_division_ids();
DROP FUNCTION IF EXISTS app_clear_user_context();

-- ================================================================
-- Function to set current user context (application level)
-- ================================================================
-- This function sets PostgreSQL session variables that are used
-- by RLS policies to determine data access permissions
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

-- ================================================================
-- Function to get current user ID from context
-- ================================================================
CREATE OR REPLACE FUNCTION app_get_user_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.user_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ================================================================
-- Function to get current user role from context
-- ================================================================
CREATE OR REPLACE FUNCTION app_get_user_role() RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN NULLIF(current_setting('app.user_role', true), '');
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ================================================================
-- Function to get current user's company IDs from context
-- ================================================================
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

-- ================================================================
-- Function to get current user's estate IDs from context
-- ================================================================
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

-- ================================================================
-- Function to get current user's division IDs from context
-- ================================================================
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

-- ================================================================
-- Function to clear user context
-- ================================================================
CREATE OR REPLACE FUNCTION app_clear_user_context() RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.user_id', '', false);
    PERFORM set_config('app.user_role', '', false);
    PERFORM set_config('app.company_ids', '', false);
    PERFORM set_config('app.estate_ids', '', false);
    PERFORM set_config('app.division_ids', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- Create index to speed up context lookups
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_users_id_active ON users(id) WHERE deleted_at IS NULL;

-- ================================================================
-- Verification Queries
-- ================================================================
-- Uncomment these to verify the functions were created successfully

-- List all RLS context functions
-- SELECT
--     routine_name,
--     routine_type,
--     data_type
-- FROM information_schema.routines
-- WHERE routine_name LIKE 'app_%'
-- ORDER BY routine_name;

-- Test the context setting function
-- SELECT app_set_user_context(
--     'a0000000-0000-0000-0000-000000000001'::UUID,
--     'SUPER_ADMIN',
--     '{}'::uuid[],
--     '{}'::uuid[],
--     '{}'::uuid[]
-- );

-- Verify context was set
-- SELECT
--     current_setting('app.user_id', true) as user_id,
--     current_setting('app.user_role', true) as role;

-- Test getter functions
-- SELECT
--     app_get_user_id() as user_id,
--     app_get_user_role() as role,
--     app_get_company_ids() as companies,
--     app_get_estate_ids() as estates,
--     app_get_division_ids() as divisions;

-- ================================================================
-- Success Message
-- ================================================================
DO $$
BEGIN
    RAISE NOTICE 'RLS context functions created successfully!';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '  - app_set_user_context(UUID, VARCHAR, UUID[], UUID[], UUID[])';
    RAISE NOTICE '  - app_get_user_id()';
    RAISE NOTICE '  - app_get_user_role()';
    RAISE NOTICE '  - app_get_company_ids()';
    RAISE NOTICE '  - app_get_estate_ids()';
    RAISE NOTICE '  - app_get_division_ids()';
    RAISE NOTICE '  - app_clear_user_context()';
END $$;

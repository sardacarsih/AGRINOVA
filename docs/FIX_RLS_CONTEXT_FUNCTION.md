# Fix: PostgreSQL app_set_user_context Function Missing

## Problem

The error occurs because the RLS migration files are not being automatically executed:

```
ERROR: fungsi app_set_user_context(unknown, unknown, uuid[], uuid[], uuid[]) tidak ada (SQLSTATE 42883)
```

Translation: "function app_set_user_context(unknown, unknown, uuid[], uuid[], uuid[]) does not exist"

## Root Cause

The system has **two migration systems**:

1. **E:\agrinova\apps\golang\pkg\database\migrations.go** - Creates basic RLS functions (lines 473-521)
2. **E:\agrinova\apps\golang\pkg\database\migrations\000007_implement_harvest_rls.go** - Creates full RLS infrastructure

The numbered migrations in `pkg/database/migrations/` folder are **NOT being executed automatically**. Only `AutoMigrate()` from `migrations.go` runs, which creates incomplete RLS functions.

## Solution

### Option 1: Manual SQL Execution (Quick Fix)

Run this SQL directly against your PostgreSQL database:

```sql
-- Drop existing incomplete function if exists
DROP FUNCTION IF EXISTS app_set_user_context(UUID, VARCHAR, UUID[], UUID[], UUID[]);

-- Create complete RLS context function
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

-- Create helper functions
CREATE OR REPLACE FUNCTION app_get_user_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.user_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app_get_user_role() RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN NULLIF(current_setting('app.user_role', true), '');
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION app_clear_user_context() RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.user_id', '', false);
    PERFORM set_config('app.user_role', '', false);
    PERFORM set_config('app.company_ids', '', false);
    PERFORM set_config('app.estate_ids', '', false);
    PERFORM set_config('app.division_ids', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Option 2: Run Migration Programmatically

Create a migration runner command:

```bash
cd apps/golang
go run cmd/migrate/main.go
```

This would execute the numbered migrations in order. (Note: The migrate command may need to be created if it doesn't exist)

### Option 3: Verify Function Exists

Check if the function exists:

```sql
SELECT
    routine_name,
    routine_type,
    data_type,
    type_udt_name
FROM information_schema.routines
WHERE routine_name LIKE 'app_%context%'
ORDER BY routine_name;
```

## Verification

After applying the fix, verify the function works:

```sql
-- Test the function
SELECT app_set_user_context(
    'a0000000-0000-0000-0000-000000000001'::UUID,
    'SUPER_ADMIN',
    '{}'::uuid[],
    '{}'::uuid[],
    '{}'::uuid[]
);

-- Verify context was set
SELECT
    current_setting('app.user_id', true) as user_id,
    current_setting('app.user_role', true) as role;

-- Test getter functions
SELECT
    app_get_user_id() as user_id,
    app_get_user_role() as role,
    app_get_company_ids() as companies,
    app_get_estate_ids() as estates,
    app_get_division_ids() as divisions;
```

## Files Involved

- **E:\agrinova\apps\golang\internal\middleware\rls_context.go** (line 293) - Where the function is called
- **E:\agrinova\apps\golang\pkg\database\migrations.go** (lines 473-521) - Basic function definition
- **E:\agrinova\apps\golang\pkg\database\migrations\000007_implement_harvest_rls.go** (lines 52-166) - Complete RLS function definitions

## Next Steps

1. Apply **Option 1** (SQL script) immediately to fix the error
2. Investigate why numbered migrations in `migrations/` folder aren't being executed
3. Consider implementing a proper migration runner that executes all numbered migrations in order

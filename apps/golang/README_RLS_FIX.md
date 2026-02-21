# RLS Context Functions Fix

## Problem

Your Go backend is failing with this error:

```
ERROR: fungsi app_set_user_context(unknown, unknown, uuid[], uuid[], uuid[]) tidak ada (SQLSTATE 42883)
```

**Translation**: "function app_set_user_context(unknown, unknown, uuid[], uuid[], uuid[]) does not exist"

This error occurs because the PostgreSQL Row-Level Security (RLS) functions are missing from your database.

## Solution

This directory contains scripts to automatically create the missing PostgreSQL functions.

### Quick Fix - Choose Your Method

#### Option 1: Automated Script (Recommended)

**For Windows (PowerShell):**
```powershell
cd apps/golang
.\apply-rls-fix.ps1
```

**For Linux/Mac (Bash):**
```bash
cd apps/golang
chmod +x apply-rls-fix.sh
./apply-rls-fix.sh
```

The script will:
1. Read your database configuration from `.env` file
2. Connect to PostgreSQL
3. Create all necessary RLS context functions
4. Verify the installation

#### Option 2: Manual SQL Execution

If you prefer to run the SQL manually:

1. Open your PostgreSQL client (psql, pgAdmin, DBeaver, etc.)
2. Connect to your Agrinova database
3. Execute the SQL file:

```bash
psql -U your_username -d your_database -f fix_rls_functions.sql
```

Or copy the contents of `fix_rls_functions.sql` and paste into your SQL client.

## What Gets Created

The fix creates 7 PostgreSQL functions:

### 1. `app_set_user_context(user_id, role, company_ids, estate_ids, division_ids)`
Sets the security context for the current database session. Called by the Go middleware for each request.

### 2. `app_get_user_id()`
Returns the current user's UUID from the session context.

### 3. `app_get_user_role()`
Returns the current user's role (SUPER_ADMIN, MANAGER, MANDOR, etc.).

### 4. `app_get_company_ids()`
Returns array of company UUIDs the current user has access to.

### 5. `app_get_estate_ids()`
Returns array of estate UUIDs the current user has access to.

### 6. `app_get_division_ids()`
Returns array of division UUIDs the current user has access to.

### 7. `app_clear_user_context()`
Clears the security context at the end of a request.

## Verification

After applying the fix, verify it worked:

```sql
-- List all RLS functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE 'app_%'
ORDER BY routine_name;

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
    app_get_user_id() as user_id,
    app_get_user_role() as role;
```

## Then Restart Your Server

After applying the fix:

```bash
cd apps/golang
go run cmd/server/main.go
```

The error should be gone!

## Root Cause Analysis

The issue occurred because:

1. **Two Migration Systems Exist**:
   - `pkg/database/migrations.go` - Creates basic schema (runs automatically)
   - `pkg/database/migrations/000007_implement_harvest_rls.go` - Creates full RLS infrastructure (NOT executed)

2. **Numbered Migrations Not Running**:
   - The migration files in `pkg/database/migrations/` folder are **not being executed automatically**
   - Only `AutoMigrate()` runs, which creates incomplete RLS functions
   - The numbered migrations contain the full RLS implementation

3. **The Fix**:
   - This script manually creates the complete RLS functions
   - Ensures your database has all necessary security infrastructure

## Files in This Fix

- `fix_rls_functions.sql` - SQL script that creates all RLS functions
- `apply-rls-fix.ps1` - PowerShell script for Windows
- `apply-rls-fix.sh` - Bash script for Linux/Mac
- `README_RLS_FIX.md` - This file

## Troubleshooting

### "psql command not found"

Install PostgreSQL client tools:

- **Windows**: Download from https://www.postgresql.org/download/windows/
- **Ubuntu/Debian**: `sudo apt-get install postgresql-client`
- **macOS**: `brew install postgresql`
- **RHEL/CentOS**: `sudo yum install postgresql`

### "Connection refused"

Check your database configuration in `.env`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=agrinova
```

### "Permission denied"

Ensure your database user has permission to create functions:

```sql
GRANT CREATE ON DATABASE your_database TO your_user;
```

### "Function already exists"

The script drops existing functions before creating them. If you see warnings about this, it's normal and safe to ignore.

## Support

If you encounter any issues:

1. Check the error message carefully
2. Verify your database credentials in `.env`
3. Ensure PostgreSQL is running and accessible
4. Check PostgreSQL logs for detailed error information

## Related Files

- **Middleware**: `internal/middleware/rls_context.go` (line 293) - Calls these functions
- **Migrations**: `pkg/database/migrations/000007_implement_harvest_rls.go` - Full RLS implementation
- **Schema**: `pkg/database/migrations.go` - Basic schema creation

## Next Steps

After fixing the RLS functions, consider:

1. Implementing a proper migration runner to execute numbered migrations
2. Adding migration tracking table to prevent re-running migrations
3. Documenting the migration process for the team
4. Setting up CI/CD to run migrations automatically

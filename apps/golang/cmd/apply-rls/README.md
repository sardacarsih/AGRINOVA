# Apply RLS Functions Command

This Go command creates all required PostgreSQL Row-Level Security (RLS) context functions needed by the Agrinova backend.

## Problem It Solves

If you're seeing this error when starting your Go server:

```
ERROR: fungsi app_set_user_context(unknown, unknown, uuid[], uuid[], uuid[]) tidak ada (SQLSTATE 42883)
```

This command will fix it by creating all necessary RLS functions in your PostgreSQL database.

## Usage

### Quick Start (Recommended)

From the `apps/golang` directory:

```bash
go run ./cmd/apply-rls/main.go
```

That's it! The command will:
1. Connect to your database using settings from `.env`
2. Clean up any old/incomplete RLS functions
3. Create all 7 required RLS functions
4. Verify they were created correctly
5. Test that they work

### Expected Output

```
🔒 Agrinova RLS Functions Application Tool
============================================

📋 Database: postgres@localhost:5432/agrinova

🔌 Connecting to database...
✅ Database connection established

🧹 Cleaning up old RLS functions (if any)...
✅ Old functions cleaned up

📦 Creating RLS context functions...
✅ RLS context functions created

🔍 Verifying RLS functions...

   Functions found:
   ✅ app_clear_user_context
   ✅ app_get_company_ids
   ✅ app_get_division_ids
   ✅ app_get_estate_ids
   ✅ app_get_user_id
   ✅ app_get_user_role
   ✅ app_set_user_context
✅ All RLS functions verified

🧪 Testing RLS functions...

   ✅ app_set_user_context() - working
   ✅ app_get_user_id() - working
   ✅ app_get_user_role() - working
   ✅ app_clear_user_context() - working
✅ RLS functions tested successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 RLS Functions Applied Successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ The following functions are now available:
   • app_set_user_context()
   • app_get_user_id()
   • app_get_user_role()
   • app_get_company_ids()
   • app_get_estate_ids()
   • app_get_division_ids()
   • app_clear_user_context()

🚀 Next steps:
   1. Start your server: go run ./cmd/server/main.go
   2. The RLS context error should be fixed!
```

## What Gets Created

The command creates 7 PostgreSQL functions:

### 1. `app_set_user_context(user_id, role, company_ids, estate_ids, division_ids)`
**Purpose:** Sets the security context for the current database session
**Called by:** Go middleware on each HTTP request
**Example:**
```sql
SELECT app_set_user_context(
    'uuid-here'::UUID,
    'MANAGER',
    ARRAY['company-uuid']::UUID[],
    ARRAY['estate-uuid']::UUID[],
    ARRAY[]::UUID[]
);
```

### 2. `app_get_user_id()`
**Purpose:** Returns the current user's UUID from session context
**Returns:** UUID or NULL

### 3. `app_get_user_role()`
**Purpose:** Returns the current user's role
**Returns:** VARCHAR(50) (e.g., 'SUPER_ADMIN', 'MANAGER', 'MANDOR')

### 4. `app_get_company_ids()`
**Purpose:** Returns array of company UUIDs the user has access to
**Returns:** UUID[]

### 5. `app_get_estate_ids()`
**Purpose:** Returns array of estate UUIDs the user has access to
**Returns:** UUID[]

### 6. `app_get_division_ids()`
**Purpose:** Returns array of division UUIDs the user has access to
**Returns:** UUID[]

### 7. `app_clear_user_context()`
**Purpose:** Clears the security context at the end of a request
**Called by:** Go middleware after processing each request

## Prerequisites

1. **PostgreSQL database** must be running and accessible
2. **Environment variables** must be configured in `.env`:
   ```env
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USER=postgres
   DATABASE_PASSWORD=your_password
   DATABASE_NAME=agrinova
   ```
3. **Go environment** must be set up (Go 1.21+ recommended)

## Configuration

The command reads database configuration from your `.env` file automatically. No additional configuration is needed.

If you need to use different credentials, update your `.env` file before running the command.

## Troubleshooting

### "Failed to load configuration"

**Cause:** Missing or invalid `.env` file
**Solution:** Ensure `.env` exists in `apps/golang/` with all required database variables

### "Failed to connect to database"

**Cause:** PostgreSQL not running or wrong credentials
**Solution:**
1. Check PostgreSQL is running: `pg_isready` or check services
2. Verify credentials in `.env` match your PostgreSQL setup
3. Test connection: `psql -U postgres -d agrinova`

### "Failed to create RLS functions"

**Cause:** Insufficient database permissions
**Solution:** Ensure your database user has CREATE FUNCTION privileges:
```sql
GRANT CREATE ON DATABASE agrinova TO your_user;
```

### Functions created but tests fail

**Cause:** Session configuration issues
**Solution:** This is usually non-critical. The functions were created successfully. Try restarting PostgreSQL and running the command again.

## Manual Verification

After running the command, you can manually verify the functions in PostgreSQL:

```sql
-- List all RLS functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE 'app_%'
AND routine_schema = 'public'
ORDER BY routine_name;

-- Test the functions
SELECT app_set_user_context(
    'a0000000-0000-0000-0000-000000000001'::UUID,
    'SUPER_ADMIN',
    '{}'::uuid[],
    '{}'::uuid[],
    '{}'::uuid[]
);

SELECT
    app_get_user_id() as user_id,
    app_get_user_role() as role;

SELECT app_clear_user_context();
```

## How It Works

1. **Connects to PostgreSQL** using your `.env` configuration
2. **Drops old functions** (if they exist) to ensure clean installation
3. **Creates new functions** with proper signatures and security settings
4. **Verifies** all 7 functions were created successfully
5. **Tests** basic functionality by setting/getting/clearing context

## Why This Exists

The Agrinova backend uses Row-Level Security (RLS) to ensure users can only access data they're authorized to see. The RLS system relies on PostgreSQL session variables set by these functions.

When a user makes a request:
1. The Go middleware calls `app_set_user_context()` with the user's credentials
2. PostgreSQL stores this in session variables
3. RLS policies use getter functions (`app_get_user_id()`, etc.) to check access
4. After the request, `app_clear_user_context()` cleans up

## Alternative: SQL Scripts

If you prefer SQL scripts instead of Go, check the parent directory for:
- `fix_rls_functions.sql` - Pure SQL script
- `apply-rls-fix.ps1` - PowerShell wrapper
- `apply-rls-fix.sh` - Bash wrapper

## Related Files

- **Middleware:** `internal/middleware/rls_context.go` - Calls these functions
- **Migrations:** `pkg/database/migrations/000007_implement_harvest_rls.go` - Full RLS implementation
- **Config:** `pkg/config/config.go` - Database configuration loader

## Support

If you encounter issues:
1. Check the error message carefully
2. Verify database is running and accessible
3. Ensure `.env` has correct database credentials
4. Try running with verbose logging: `go run -v ./cmd/apply-rls/main.go`
5. Check PostgreSQL logs for detailed error information

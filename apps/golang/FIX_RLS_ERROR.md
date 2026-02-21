# Fix RLS Context Error - Quick Guide

## The Error

```
ERROR: fungsi app_set_user_context(unknown, unknown, uuid[], uuid[], uuid[]) tidak ada (SQLSTATE 42883)
```

## The Fix (Go Command - Recommended)

```bash
cd apps/golang
go run ./cmd/apply-rls/main.go
```

**That's it!** The command will:
- Connect to your database
- Create all required RLS functions
- Verify they work
- Show you a success message

## Expected Output

```
✅ Database connection established
✅ Old functions cleaned up
✅ RLS context functions created
✅ All RLS functions verified
✅ RLS functions tested successfully

🎉 RLS Functions Applied Successfully!
```

## Then Start Your Server

```bash
go run ./cmd/server/main.go
```

The error should be gone!

## Alternative Methods

### Method 2: SQL Script
```bash
# Windows (PowerShell)
.\apply-rls-fix.ps1

# Linux/Mac
./apply-rls-fix.sh

# Manual SQL
psql -U postgres -d agrinova -f fix_rls_functions.sql
```

## Troubleshooting

**"Failed to load configuration"**
→ Check your `.env` file exists and has DATABASE_* variables

**"Failed to connect to database"**
→ Make sure PostgreSQL is running
→ Verify credentials in `.env`

**Still getting the error?**
→ Check `cmd/apply-rls/README.md` for detailed troubleshooting

## What This Does

Creates 7 PostgreSQL functions that the Go backend needs for Row-Level Security:
- `app_set_user_context()` - Sets user security context
- `app_get_user_id()` - Gets current user
- `app_get_user_role()` - Gets user role
- `app_get_company_ids()` - Gets accessible companies
- `app_get_estate_ids()` - Gets accessible estates
- `app_get_division_ids()` - Gets accessible divisions
- `app_clear_user_context()` - Clears context

## Documentation

- Full guide: `cmd/apply-rls/README.md`
- SQL script: `fix_rls_functions.sql`
- Technical details: `../../docs/README_FIX_RLS.md`

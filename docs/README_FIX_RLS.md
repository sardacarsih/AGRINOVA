# Fix RLS Context Error - Quick Start

## The Error

Your Go backend shows this error:

```
ERROR: fungsi app_set_user_context(unknown, unknown, uuid[], uuid[], uuid[]) tidak ada
```

## The Fix (30 seconds)

```bash
cd apps/golang
go run ./cmd/apply-rls/main.go
```

**That's it!** Wait for the success message, then start your server.

## After the Fix

```bash
go run ./cmd/server/main.go
```

The error will be gone!

## Full Documentation

- **Main Guide:** `apps/golang/cmd/apply-rls/README.md`
- **Quick Reference:** `apps/golang/FIX_RLS_ERROR.md`
- **Command Docs:** `apps/golang/cmd/apply-rls/README.md`
- **Technical Details:** `apps/golang/FIX_RLS_ERROR.md`

## Alternative Methods

If you prefer SQL scripts:

```bash
# PowerShell (Windows)
cd apps/golang
.\apply-rls-fix.ps1

# Bash (Linux/Mac)
cd apps/golang
./apply-rls-fix.sh
```

## What Gets Fixed

Creates 7 PostgreSQL functions for Row-Level Security:
- `app_set_user_context()` - Sets user security context
- `app_get_user_id()` - Gets current user
- `app_get_user_role()` - Gets user role
- `app_get_company_ids()` - Gets accessible companies
- `app_get_estate_ids()` - Gets accessible estates
- `app_get_division_ids()` - Gets accessible divisions
- `app_clear_user_context()` - Clears context

## Troubleshooting

**Database connection failed?**
→ Check `.env` file in `apps/golang/` has correct credentials

**Permission denied?**
→ Ensure your PostgreSQL user can create functions

**Still errors?**
-> Check `apps/golang/cmd/apply-rls/README.md` for detailed troubleshooting

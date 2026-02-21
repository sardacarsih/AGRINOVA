# Database Migration Guide

This guide explains how to manage database migrations in the Agrinova GraphQL API project.

## Overview

As of the latest update, **database migrations are no longer run automatically on server startup**. This separation provides several benefits:

- ✅ **Faster server restarts** during development
- ✅ **Better control** over when migrations run in production
- ✅ **Ability to review** migration changes before applying
- ✅ **Clearer separation** of concerns between deployment and schema changes

## Quick Start

### Running Migrations

```bash
# Using Make (recommended)
make migrate

# Or directly with Go
go run cmd/migrate/main.go

# Or build and run the binary
make migrate-build
./bin/migrate
```

### Dry Run (Preview Changes)

```bash
# See what would be migrated without making changes
make migrate-dry-run

# Or directly
go run cmd/migrate/main.go --dry-run
```

### Development Workflow

```bash
# Run migrations and start server in one command
make dev

# This is equivalent to:
# 1. make migrate
# 2. go run cmd/server/main.go (or air if installed)
```

## Migration Structure

Migrations are located in `pkg/database/` and follow this naming convention:

```
pkg/database/
├── migrations.go                          # Migration orchestrator
├── migration_0001_init_schema.go          # Initial schema creation
├── migration_0002_add_indexes.go          # Performance indexes
├── migration_0003_add_constraints.go      # Data validation constraints
└── migration_0004_api_keys.go             # API key management
```

### Migration Order

Migrations are executed in the order defined in `pkg/database/migrations.go`:

```go
var migrations = []Migrator{
    &InitSchemaMigration{},      // 0001
    &AddIndexesMigration{},      // 0002
    &AddConstraintsMigration{},  // 0003
    &APIKeysMigration{},         // 0004
}
```

## Migration Features

### Idempotent Constraint Creation

All constraint migrations use PostgreSQL DO blocks to ensure they can be run multiple times safely:

```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'constraint_name'
        AND conrelid = 'table_name'::regclass
    ) THEN
        ALTER TABLE table_name 
        ADD CONSTRAINT constraint_name 
        CHECK (condition);
    END IF;
END $$;
```

### Data Validation and Cleanup

Before applying constraints, migrations automatically clean up invalid data:

```sql
DO $$
BEGIN
    -- Fix invalid data first
    UPDATE harvest_records SET berat_tbs = 1 WHERE berat_tbs <= 0;
    
    -- Then add constraint
    IF NOT EXISTS (...) THEN
        ALTER TABLE harvest_records 
        ADD CONSTRAINT check_berat_tbs_positive 
        CHECK (berat_tbs > 0);
    END IF;
END $$;
```

### Error Categorization

The migration system categorizes errors for better troubleshooting:

- ✅ **Success**: Constraint created successfully
- ℹ️ **Skipped**: Constraint already exists (safe to ignore)
- ⚠️ **Data Validation Error**: Existing data violates constraint
- ❌ **Error**: Other database errors

## Production Deployment

### Step-by-Step Production Deployment

1. **Build the migration binary**:
   ```bash
   make migrate-build
   ```

2. **Transfer binaries to production server**:
   ```bash
   scp bin/migrate user@production-server:/path/to/app/
   scp bin/agrinova-graphql user@production-server:/path/to/app/
   ```

3. **Run migrations on production**:
   ```bash
   ssh user@production-server
   cd /path/to/app
   ./migrate
   ```

4. **Start or restart the server**:
   ```bash
   ./agrinova-graphql
   # Or with systemd:
   sudo systemctl restart agrinova-graphql
   ```

### Production Best Practices

1. **Always backup the database** before running migrations:
   ```bash
   pg_dump -U postgres agrinova > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test migrations on staging** environment first:
   ```bash
   # On staging
   ./migrate
   # Verify application works correctly
   # Then deploy to production
   ```

3. **Run migrations during maintenance window** if they involve:
   - Large data transformations
   - Adding constraints to tables with many rows
   - Schema changes that might lock tables

4. **Monitor migration output** for any warnings or errors:
   ```bash
   ./migrate 2>&1 | tee migration_$(date +%Y%m%d_%H%M%S).log
   ```

## Creating New Migrations

### 1. Create Migration File

Create a new file in `pkg/database/`:

```go
// pkg/database/migration_0005_add_new_feature.go
package database

import (
    "log"
    "gorm.io/gorm"
)

type AddNewFeatureMigration struct{}

func (m *AddNewFeatureMigration) Migrate(db *gorm.DB) error {
    log.Println("Running migration: 0005_add_new_feature")
    
    // Your migration logic here
    
    return nil
}
```

### 2. Register Migration

Add it to `pkg/database/migrations.go`:

```go
var migrations = []Migrator{
    &InitSchemaMigration{},
    &AddIndexesMigration{},
    &AddConstraintsMigration{},
    &APIKeysMigration{},
    &AddNewFeatureMigration{},  // Add your new migration
}
```

### 3. Test Migration

```bash
# Test on development database
make migrate

# Verify changes
psql -U postgres -d agrinova -c "\d+ table_name"
```

## Troubleshooting

### Migration Fails with "constraint already exists"

This is normal if you've run migrations before. The migration system will skip existing constraints.

### Migration Fails with "data violates constraint"

Some existing data doesn't meet the new constraint requirements. Options:

1. **Review the data**:
   ```sql
   -- Find violating rows
   SELECT * FROM table_name WHERE condition_that_violates_constraint;
   ```

2. **Fix the data manually**:
   ```sql
   UPDATE table_name SET column = valid_value WHERE condition;
   ```

3. **Re-run migration**:
   ```bash
   make migrate
   ```

### Server Won't Start After Migration

1. **Check migration logs** for errors
2. **Verify database connectivity**:
   ```bash
   psql -U postgres -d agrinova -c "SELECT 1;"
   ```
3. **Check server logs** for specific errors

### Need to Rollback a Migration

Currently, migrations don't have automatic rollback. To rollback:

1. **Restore from backup**:
   ```bash
   psql -U postgres -d agrinova < backup_file.sql
   ```

2. **Or manually reverse changes**:
   ```sql
   -- Drop constraint
   ALTER TABLE table_name DROP CONSTRAINT constraint_name;
   
   -- Drop index
   DROP INDEX index_name;
   ```

## Testing Migrations

### Test on Fresh Database

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS agrinova_test;"
psql -U postgres -c "CREATE DATABASE agrinova_test;"

# Run migrations
DB_NAME=agrinova_test make migrate

# Verify all tables and constraints exist
psql -U postgres -d agrinova_test -c "\dt"
psql -U postgres -d agrinova_test -c "\d+ blocks"
```

### Test on Existing Database

```bash
# Run migrations (should be idempotent)
make migrate

# Verify no errors
# Verify all constraints still exist
```

### Test Server Startup

```bash
# Start server without running migrations
go run cmd/server/main.go

# Server should start successfully
# GraphQL endpoint should be accessible
```

## Migration Command Reference

### Command-Line Flags

```bash
# Dry run (show what would be migrated)
go run cmd/migrate/main.go --dry-run

# Verbose output
go run cmd/migrate/main.go --verbose

# Both flags
go run cmd/migrate/main.go --dry-run --verbose
```

### Make Targets

```bash
# Run migrations
make migrate

# Build migration binary
make migrate-build

# Dry run
make migrate-dry-run

# Development (migrate + start server)
make dev
```

## FAQ

### Q: Do I need to run migrations every time I start the server?

**A:** No, only when the database schema changes. Once migrations are applied, they don't need to be run again unless there are new migrations.

### Q: Can I run migrations while the server is running?

**A:** Yes, but it's not recommended for production. Some migrations might lock tables or cause temporary inconsistencies. It's better to:
1. Stop the server
2. Run migrations
3. Start the server

### Q: What if I forget to run migrations?

**A:** The server will start, but you might encounter errors if the code expects schema changes that haven't been applied. The server logs will remind you to run migrations.

### Q: How do I know if migrations have been run?

**A:** Check the database schema:
```bash
# List all constraints
psql -U postgres -d agrinova -c "\d+ table_name"

# Check for specific constraint
psql -U postgres -d agrinova -c "SELECT conname FROM pg_constraint WHERE conname = 'constraint_name';"
```

### Q: Can I run migrations automatically in CI/CD?

**A:** Yes, add this to your deployment script:
```bash
#!/bin/bash
set -e

# Run migrations
./migrate

# Start server
./agrinova-graphql
```

## Additional Resources

- [PostgreSQL Constraints Documentation](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [GORM Migration Guide](https://gorm.io/docs/migration.html)
- [Production Deployment Guide](./PRODUCTION_README.md)

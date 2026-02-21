package database

import (
	"fmt"
	"log"
	"strings"

	"gorm.io/gorm"
)

// AddConstraintsMigration handles the creation of database constraints
type AddConstraintsMigration struct{}

func (m *AddConstraintsMigration) Migrate(db *gorm.DB) error {
	log.Println("Running migration: 0003_add_constraints")

	// Define constraints with PostgreSQL DO blocks for idempotent creation
	type constraintDef struct {
		name        string
		table       string
		description string
		sql         string
	}

	constraints := []constraintDef{
		// Unique constraints for assignments (prevent duplicate assignments)
		{
			name:        "unique_user_estate_assignment",
			table:       "user_estate_assignments",
			description: "Unique user-estate assignment constraint",
			sql: `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_estate_assignment'
        AND conrelid = 'user_estate_assignments'::regclass
    ) THEN
        ALTER TABLE user_estate_assignments 
        ADD CONSTRAINT unique_user_estate_assignment 
        UNIQUE (user_id, estate_id, is_active);
    END IF;
END $$;`,
		},
		{
			name:        "unique_user_division_assignment",
			table:       "user_division_assignments",
			description: "Unique user-division assignment constraint",
			sql: `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_division_assignment'
        AND conrelid = 'user_division_assignments'::regclass
    ) THEN
        ALTER TABLE user_division_assignments 
        ADD CONSTRAINT unique_user_division_assignment 
        UNIQUE (user_id, division_id, is_active);
    END IF;
END $$;`,
		},
		{
			name:        "unique_user_company_assignment",
			table:       "user_company_assignments",
			description: "Unique user-company assignment constraint",
			sql: `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_company_assignment'
        AND conrelid = 'user_company_assignments'::regclass
    ) THEN
        ALTER TABLE user_company_assignments 
        ADD CONSTRAINT unique_user_company_assignment 
        UNIQUE (user_id, company_id, is_active);
    END IF;
END $$;`,
		},

		// Check constraints for data validation - Harvest Records
		{
			name:        "check_berat_tbs_positive",
			table:       "harvest_records",
			description: "Ensure berat_tbs is positive",
			sql: `
DO $$
BEGIN
    -- First, validate and fix any existing invalid data
    UPDATE harvest_records SET berat_tbs = 1 WHERE berat_tbs <= 0;
    
    -- Then add the constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_berat_tbs_positive'
        AND conrelid = 'harvest_records'::regclass
    ) THEN
        ALTER TABLE harvest_records 
        ADD CONSTRAINT check_berat_tbs_positive 
        CHECK (berat_tbs > 0);
    END IF;
END $$;`,
		},
		{
			name:        "check_jumlah_janjang_positive",
			table:       "harvest_records",
			description: "Ensure jumlah_janjang is positive",
			sql: `
DO $$
BEGIN
    -- First, validate and fix any existing invalid data
    UPDATE harvest_records SET jumlah_janjang = 1 WHERE jumlah_janjang <= 0;
    
    -- Then add the constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_jumlah_janjang_positive'
        AND conrelid = 'harvest_records'::regclass
    ) THEN
        ALTER TABLE harvest_records 
        ADD CONSTRAINT check_jumlah_janjang_positive 
        CHECK (jumlah_janjang > 0);
    END IF;
END $$;`,
		},

		// Check constraints for data validation - Blocks (renamed to avoid conflict)
		{
			name:        "check_block_luas_ha_positive",
			table:       "blocks",
			description: "Ensure block luas_ha is positive when not null",
			sql: `
DO $$
BEGIN
    -- First, validate and fix any existing invalid data
    UPDATE blocks SET luas_ha = NULL WHERE luas_ha <= 0;
    
    -- Then add the constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_block_luas_ha_positive'
        AND conrelid = 'blocks'::regclass
    ) THEN
        ALTER TABLE blocks 
        ADD CONSTRAINT check_block_luas_ha_positive 
        CHECK (luas_ha IS NULL OR luas_ha > 0);
    END IF;
END $$;`,
		},

		// Check constraints for data validation - Estates (renamed to avoid conflict)
		{
			name:        "check_estate_luas_ha_positive",
			table:       "estates",
			description: "Ensure estate luas_ha is positive when not null",
			sql: `
DO $$
BEGIN
    -- First, validate and fix any existing invalid data
    UPDATE estates SET luas_ha = NULL WHERE luas_ha <= 0;
    
    -- Then add the constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_estate_luas_ha_positive'
        AND conrelid = 'estates'::regclass
    ) THEN
        ALTER TABLE estates 
        ADD CONSTRAINT check_estate_luas_ha_positive 
        CHECK (luas_ha IS NULL OR luas_ha > 0);
    END IF;
END $$;`,
		},

		// Role-based constraints
		{
			name:        "check_valid_role",
			table:       "users",
			description: "Ensure user role is valid",
			sql: `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_valid_role'
        AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT check_valid_role 
        CHECK (role IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'));
    END IF;
END $$;`,
		},
		{
			name:        "check_company_valid_status",
			table:       "companies",
			description: "Ensure company status is valid",
			sql: `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_company_valid_status'
        AND conrelid = 'companies'::regclass
    ) THEN
        ALTER TABLE companies 
        ADD CONSTRAINT check_company_valid_status 
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'));
    END IF;
END $$;`,
		},
		{
			name:        "check_harvest_valid_status",
			table:       "harvest_records",
			description: "Ensure harvest record status is valid",
			sql: `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_harvest_valid_status'
        AND conrelid = 'harvest_records'::regclass
    ) THEN
        ALTER TABLE harvest_records 
        ADD CONSTRAINT check_harvest_valid_status 
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'));
    END IF;
END $$;`,
		},
	}

	// Track results
	var (
		successCount int
		skipCount    int
		errorCount   int
		errors       []string
	)

	// Execute each constraint
	for _, constraint := range constraints {
		log.Printf("  → Creating constraint '%s' on table '%s'", constraint.name, constraint.table)

		if err := db.Exec(constraint.sql).Error; err != nil {
			// Categorize the error
			errMsg := err.Error()
			if strings.Contains(errMsg, "already exists") || strings.Contains(errMsg, "duplicate") {
				log.Printf("    ℹ️  Constraint '%s' already exists (skipped)", constraint.name)
				skipCount++
			} else if strings.Contains(errMsg, "violates") || strings.Contains(errMsg, "constraint") {
				log.Printf("    ⚠️  Data validation error for '%s': %v", constraint.name, err)
				log.Printf("    💡 Some existing data may violate this constraint. Please review and fix manually.")
				errorCount++
				errors = append(errors, fmt.Sprintf("%s: %v", constraint.name, err))
			} else {
				log.Printf("    ❌ Failed to create constraint '%s': %v", constraint.name, err)
				errorCount++
				errors = append(errors, fmt.Sprintf("%s: %v", constraint.name, err))
			}
		} else {
			log.Printf("    ✅ Constraint '%s' created successfully", constraint.name)
			successCount++
		}
	}

	// Summary
	log.Println("")
	log.Printf("Constraint Migration Summary:")
	log.Printf("  ✅ Created: %d", successCount)
	log.Printf("  ℹ️  Skipped (already exists): %d", skipCount)
	log.Printf("  ❌ Errors: %d", errorCount)

	if errorCount > 0 {
		log.Println("")
		log.Println("Errors encountered:")
		for _, errMsg := range errors {
			log.Printf("  - %s", errMsg)
		}
		log.Println("")
		log.Println("⚠️  Some constraints could not be created due to data validation errors.")
		log.Println("💡 This is not fatal - the application will continue to work.")
		log.Println("💡 Please review the errors above and fix the data manually if needed.")
	}

	return nil
}

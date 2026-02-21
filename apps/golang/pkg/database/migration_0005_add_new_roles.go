package database

import (
	"fmt"
	"log"

	"gorm.io/gorm"
)

// Migration0005_AddNewRoles adds TIMBANGAN and GRADING roles to the system
// This migration handles:
// 1. Updates existing user role constraints
// 2. Validates role data consistency
// 3. Adds role-specific indexes
// 4. Seeds sample users with new roles
func Migration0005_AddNewRoles(db *gorm.DB) error {
	log.Println("Running Migration 0005: Add TIMBANGAN and GRADING roles...")

	// Step 1: Update user role check constraint if it exists
	if err := updateUserRoleConstraint(db); err != nil {
		return fmt.Errorf("failed to update user role constraint: %w", err)
	}

	// Step 2: Validate and clean up existing role data
	if err := validateExistingRoles(db); err != nil {
		return fmt.Errorf("failed to validate existing roles: %w", err)
	}

	// Step 3: Add role-specific indexes for new roles
	if err := addNewRoleIndexes(db); err != nil {
		return fmt.Errorf("failed to add new role indexes: %w", err)
	}

	// Step 4: Create sample users with new roles (for development/testing)
	if err := seedNewRoleUsers(db); err != nil {
		log.Printf("Warning: Failed to seed new role users: %v", err)
		// Don't fail migration for seeding issues
	}

	log.Println("Migration 0005 completed successfully")
	return nil
}

// updateUserRoleConstraint updates or creates role check constraint
func updateUserRoleConstraint(db *gorm.DB) error {
	log.Println("Updating user role constraints...")

	// Drop existing role check constraint if it exists
	db.Exec("ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_role")

	// Add updated role check constraint including new roles
	if err := db.Exec(`
		ALTER TABLE users
		ADD CONSTRAINT check_user_role
		CHECK (role IN (
			'SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER',
			'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'
		))
	`).Error; err != nil {
		return fmt.Errorf("failed to add role check constraint: %w", err)
	}

	// Also update the users table in the legacy schema if it exists
	db.Exec("ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_role_legacy")

	if err := db.Exec(`
		ALTER TABLE users
		ADD CONSTRAINT check_user_role_legacy
		CHECK (role IN (
			'SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER',
			'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'
		))
	`).Error; err != nil {
		log.Printf("Note: Legacy role constraint update failed (may not exist): %v", err)
	}

	return nil
}

// validateExistingRoles validates and cleans up existing role data
func validateExistingRoles(db *gorm.DB) error {
	log.Println("Validating existing role data...")

	// Check for any invalid roles in the database
	var invalidRoles []struct {
		Role  string
		Count int
	}

	if err := db.Raw(`
		SELECT role, COUNT(*) as count
		FROM users
		WHERE role NOT IN (
			'SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER',
			'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING', NULL, ''
		)
		GROUP BY role
	`).Scan(&invalidRoles).Error; err != nil {
		return fmt.Errorf("failed to check for invalid roles: %w", err)
	}

	if len(invalidRoles) > 0 {
		log.Printf("Found invalid roles in database: %+v", invalidRoles)

		// Option 1: Convert legacy roles to standard roles
		if err := convertLegacyRoles(db); err != nil {
			return fmt.Errorf("failed to convert legacy roles: %w", err)
		}
	}

	// Ensure all users have valid roles
	if err := db.Exec(`
		UPDATE users
		SET role = 'MANDOR'
		WHERE role IS NULL OR role = '' OR role NOT IN (
			'SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER',
			'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to update invalid roles: %w", err)
	}

	return nil
}

// convertLegacyRoles converts any legacy roles to standard roles
func convertLegacyRoles(db *gorm.DB) error {
	log.Println("Converting legacy roles to standard roles...")

	// Legacy role mappings
	legacyMappings := map[string]string{
		"TIMBANGAN_LEGACY": "TIMBANGAN",
		"GRADING_LEGACY":   "GRADING",
		"WEIGHING":         "TIMBANGAN",
		"QUALITY":          "GRADING",
	}

	for legacyRole, newRole := range legacyMappings {
		result := db.Exec(`
			UPDATE users
			SET role = ?
			WHERE role = ?
		`, newRole, legacyRole)

		if result.Error != nil {
			log.Printf("Warning: Failed to convert %s to %s: %v", legacyRole, newRole, result.Error)
		} else if result.RowsAffected > 0 {
			log.Printf("Converted %d users from %s to %s", result.RowsAffected, legacyRole, newRole)
		}
	}

	return nil
}

// addNewRoleIndexes creates indexes optimized for new roles
func addNewRoleIndexes(db *gorm.DB) error {
	log.Println("Adding indexes for new roles...")

	// Add composite index for TIMBANGAN role queries
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_users_role_timbangan
		ON users(role)
		WHERE role = 'TIMBANGAN'
	`).Error; err != nil {
		return fmt.Errorf("failed to create TIMBANGAN role index: %w", err)
	}

	// Add composite index for GRADING role queries
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_users_role_grading
		ON users(role)
		WHERE role = 'GRADING'
	`).Error; err != nil {
		return fmt.Errorf("failed to create GRADING role index: %w", err)
	}

	// Add general role index for mobile-only roles
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_users_mobile_roles
		ON users(role, is_active)
		WHERE role IN ('TIMBANGAN', 'GRADING', 'MANDOR')
	`).Error; err != nil {
		return fmt.Errorf("failed to create mobile roles index: %w", err)
	}

	return nil
}

// seedNewRoleUsers creates sample users with new roles for development
func seedNewRoleUsers(db *gorm.DB) error {
	log.Println("Seeding sample users with new roles...")

	// Check if we already have users with these roles
	var timbanganCount, gradingCount int64

	db.Raw("SELECT COUNT(*) FROM users WHERE role = 'TIMBANGAN'").Scan(&timbanganCount)
	db.Raw("SELECT COUNT(*) FROM users WHERE role = 'GRADING'").Scan(&gradingCount)

	if timbanganCount > 0 && gradingCount > 0 {
		log.Println("Sample users with new roles already exist")
		return nil
	}

	// Get a default company for creating sample users
	var companyID string
	if err := db.Raw("SELECT id FROM companies LIMIT 1").Scan(&companyID).Error; err != nil {
		log.Println("No companies found, skipping sample user creation")
		return nil
	}

	// Create sample TIMBANGAN user
	if timbanganCount == 0 {
		if err := db.Exec(`
			INSERT INTO users (id, username, name, email, password, role, is_active, created_at, updated_at)
			VALUES (
				gen_random_uuid(),
				'timbangan',
				'Timbangan Operator',
				'timbangan@agrinova.com',
				'$2a$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ',
				'TIMBANGAN',
				true,
				NOW(),
				NOW()
			)
		`).Error; err != nil {
			log.Printf("Warning: Failed to create sample TIMBANGAN user: %v", err)
		} else {
			log.Println("Created sample TIMBANGAN user")
		}
	}

	// Create sample GRADING user
	if gradingCount == 0 {
		if err := db.Exec(`
			INSERT INTO users (id, username, name, email, password, role, is_active, created_at, updated_at)
			VALUES (
				gen_random_uuid(),
				'grading',
				'Grading Staff',
				'grading@agrinova.com',
				'$2a$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ',
				'GRADING',
				true,
				NOW(),
				NOW()
			)
		`).Error; err != nil {
			log.Printf("Warning: Failed to create sample GRADING user: %v", err)
		} else {
			log.Println("Created sample GRADING user")
		}
	}

	return nil
}

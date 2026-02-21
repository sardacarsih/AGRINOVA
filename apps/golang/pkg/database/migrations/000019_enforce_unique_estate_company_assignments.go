package migrations

import (
	"fmt"
	"log"

	"gorm.io/gorm"
)

// Migration000019EnforceUniqueEstateCompanyAssignments enforces strict uniqueness
// for estate and company assignments:
// - user_estate_assignments: (user_id, estate_id)
// - user_company_assignments: (user_id, company_id)
func Migration000019EnforceUniqueEstateCompanyAssignments(db *gorm.DB) error {
	log.Println("Running migration: 000019_enforce_unique_estate_company_assignments")

	// Cleanup duplicate user-estate assignments.
	if err := db.Exec(`
		WITH ranked AS (
			SELECT
				id,
				ROW_NUMBER() OVER (
					PARTITION BY user_id, estate_id
					ORDER BY
						is_active DESC,
						updated_at DESC NULLS LAST,
						created_at DESC NULLS LAST,
						id DESC
				) AS rn
			FROM user_estate_assignments
		)
		DELETE FROM user_estate_assignments uea
		USING ranked r
		WHERE uea.id = r.id
		  AND r.rn > 1;
	`).Error; err != nil {
		return fmt.Errorf("failed to clean duplicate user_estate_assignments: %w", err)
	}

	// Cleanup duplicate user-company assignments.
	if err := db.Exec(`
		WITH ranked AS (
			SELECT
				id,
				ROW_NUMBER() OVER (
					PARTITION BY user_id, company_id
					ORDER BY
						is_active DESC,
						updated_at DESC NULLS LAST,
						created_at DESC NULLS LAST,
						id DESC
				) AS rn
			FROM user_company_assignments
		)
		DELETE FROM user_company_assignments uca
		USING ranked r
		WHERE uca.id = r.id
		  AND r.rn > 1;
	`).Error; err != nil {
		return fmt.Errorf("failed to clean duplicate user_company_assignments: %w", err)
	}

	// Drop legacy looser constraints if present.
	if err := db.Exec(`
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1
				FROM pg_constraint
				WHERE conname = 'unique_user_estate_assignment'
				  AND conrelid = 'user_estate_assignments'::regclass
			) THEN
				ALTER TABLE user_estate_assignments
				DROP CONSTRAINT unique_user_estate_assignment;
			END IF;
		END $$;
	`).Error; err != nil {
		return fmt.Errorf("failed to drop legacy unique_user_estate_assignment constraint: %w", err)
	}

	if err := db.Exec(`
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1
				FROM pg_constraint
				WHERE conname = 'unique_user_company_assignment'
				  AND conrelid = 'user_company_assignments'::regclass
			) THEN
				ALTER TABLE user_company_assignments
				DROP CONSTRAINT unique_user_company_assignment;
			END IF;
		END $$;
	`).Error; err != nil {
		return fmt.Errorf("failed to drop legacy unique_user_company_assignment constraint: %w", err)
	}

	// Enforce strict uniqueness at database level.
	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_user_estate_assignments_user_estate
		ON user_estate_assignments (user_id, estate_id);
	`).Error; err != nil {
		return fmt.Errorf("failed to create uq_user_estate_assignments_user_estate index: %w", err)
	}

	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_user_company_assignments_user_company
		ON user_company_assignments (user_id, company_id);
	`).Error; err != nil {
		return fmt.Errorf("failed to create uq_user_company_assignments_user_company index: %w", err)
	}

	log.Println("Migration 000019 completed: estate/company assignments are now unique by user+scope")
	return nil
}

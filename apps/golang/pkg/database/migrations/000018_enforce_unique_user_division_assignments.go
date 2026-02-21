package migrations

import (
	"fmt"
	"log"

	"gorm.io/gorm"
)

// Migration000018EnforceUniqueUserDivisionAssignments enforces unique user-division assignments.
// This migration cleans historical duplicates first, then adds a strict unique index on
// (user_id, division_id) to prevent any duplicate rows in the table.
func Migration000018EnforceUniqueUserDivisionAssignments(db *gorm.DB) error {
	log.Println("Running migration: 000018_enforce_unique_user_division_assignments")

	// Keep only one row per (user_id, division_id), preferring active and most recently updated row.
	if err := db.Exec(`
		WITH ranked AS (
			SELECT
				id,
				ROW_NUMBER() OVER (
					PARTITION BY user_id, division_id
					ORDER BY
						is_active DESC,
						updated_at DESC NULLS LAST,
						created_at DESC NULLS LAST,
						id DESC
				) AS rn
			FROM user_division_assignments
		)
		DELETE FROM user_division_assignments uda
		USING ranked r
		WHERE uda.id = r.id
		  AND r.rn > 1;
	`).Error; err != nil {
		return fmt.Errorf("failed to clean duplicate user_division_assignments: %w", err)
	}

	// Drop legacy looser constraint if present.
	if err := db.Exec(`
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1
				FROM pg_constraint
				WHERE conname = 'unique_user_division_assignment'
				  AND conrelid = 'user_division_assignments'::regclass
			) THEN
				ALTER TABLE user_division_assignments
				DROP CONSTRAINT unique_user_division_assignment;
			END IF;
		END $$;
	`).Error; err != nil {
		return fmt.Errorf("failed to drop legacy unique_user_division_assignment constraint: %w", err)
	}

	// Enforce strict uniqueness at database level.
	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_user_division_assignments_user_division
		ON user_division_assignments (user_id, division_id);
	`).Error; err != nil {
		return fmt.Errorf("failed to create uq_user_division_assignments_user_division index: %w", err)
	}

	log.Println("Migration 000018 completed: user_division_assignments is now unique by (user_id, division_id)")
	return nil
}

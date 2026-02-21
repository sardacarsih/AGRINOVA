package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000022RollbackUserSchema keeps users profile columns on users table.
// It is idempotent and safe for repeated startup execution.
func Migration000022RollbackUserSchema(db *gorm.DB) error {
	log.Println("Running migration: 000022_rollback_user_schema")

	// 1. Ensure canonical columns exist.
	if err := db.Exec(`
		ALTER TABLE users
		ADD COLUMN IF NOT EXISTS name VARCHAR(255),
		ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
	`).Error; err != nil {
		return err
	}

	// 2. Backfill canonical columns from legacy aliases if they still exist.
	if err := db.Exec(`
		DO $$
		DECLARE
			has_nama BOOLEAN;
			has_no_telpon BOOLEAN;
			has_uca_name BOOLEAN;
			has_uca_phone BOOLEAN;
		BEGIN
			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'users' AND column_name = 'nama'
			) INTO has_nama;

			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'users' AND column_name = 'no_telpon'
			) INTO has_no_telpon;

			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'user_company_assignments' AND column_name = 'name'
			) INTO has_uca_name;

			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'user_company_assignments' AND column_name = 'phone'
			) INTO has_uca_phone;

			IF has_nama THEN
				UPDATE users
				SET name = COALESCE(NULLIF(name, ''), NULLIF(nama, ''), name);
			END IF;

			IF has_no_telpon THEN
				UPDATE users
				SET phone = COALESCE(NULLIF(phone, ''), NULLIF(no_telpon, ''), phone);
			END IF;

			IF has_uca_name AND has_uca_phone THEN
				EXECUTE '
					UPDATE users u
					SET
						name = COALESCE(NULLIF(u.name, ''''), NULLIF(uca.name, ''''), u.name),
						phone = COALESCE(NULLIF(u.phone, ''''), NULLIF(uca.phone, ''''), u.phone)
					FROM user_company_assignments uca
					WHERE uca.user_id = u.id
					  AND uca.is_active = true
					  AND ((uca.name IS NOT NULL AND uca.name <> '''') OR (uca.phone IS NOT NULL AND uca.phone <> ''''));
				';
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Warning: Could not normalize users profile columns: %v", err)
	}

	// 3. Drop deprecated assignment-level profile columns if present.
	if err := db.Exec(`
		ALTER TABLE user_company_assignments
		DROP COLUMN IF EXISTS name,
		DROP COLUMN IF EXISTS phone;
	`).Error; err != nil {
		log.Printf("Warning: Could not drop name/phone from user_company_assignments: %v", err)
	}

	log.Println("Migration 000022 completed: users.name/phone canonicalized")
	return nil
}

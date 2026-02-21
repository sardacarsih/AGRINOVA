package migrations

import (
	"fmt"
	"log"

	"gorm.io/gorm"
)

// Migration000027FinalizeDropLegacyUserSchema removes legacy users profile
// columns (nama/no_telpon) after canonical columns (name/phone) are ready.
func Migration000027FinalizeDropLegacyUserSchema(db *gorm.DB) error {
	log.Println("Running migration: 000027_finalize_drop_legacy_user_schema")

	finalized, err := isLegacyUserSchemaFinalized(db)
	if err != nil {
		return err
	}
	if finalized {
		log.Println("Migration 000027 skipped: legacy user schema already finalized")
		return nil
	}

	if err := db.Exec(`
		ALTER TABLE users
		ADD COLUMN IF NOT EXISTS name VARCHAR(255),
		ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'users' AND column_name = 'nama'
			) THEN
				UPDATE users
				SET name = COALESCE(NULLIF(name, ''), NULLIF(nama, ''), name);
			END IF;

			IF EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'users' AND column_name = 'no_telpon'
			) THEN
				UPDATE users
				SET phone = COALESCE(NULLIF(phone, ''), NULLIF(no_telpon, ''), phone);
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	// Parity check before destructive drop.
	var hasNama bool
	if err := db.Raw(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'nama'
		);
	`).Scan(&hasNama).Error; err != nil {
		return err
	}
	if hasNama {
		var mismatchName int64
		if err := db.Raw(`
			SELECT COUNT(*)
			FROM users
			WHERE COALESCE(NULLIF(name, ''), '') <> COALESCE(NULLIF(nama, ''), '');
		`).Scan(&mismatchName).Error; err != nil {
			return fmt.Errorf("migration 000027 name parity check failed: %w", err)
		}
		if mismatchName > 0 {
			log.Printf("Migration 000027: %d users rows mismatch between name and nama; canonical name will be kept", mismatchName)
		}
	}

	var hasNoTelpon bool
	if err := db.Raw(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'users' AND column_name = 'no_telpon'
		);
	`).Scan(&hasNoTelpon).Error; err != nil {
		return err
	}
	if hasNoTelpon {
		var mismatchPhone int64
		if err := db.Raw(`
			SELECT COUNT(*)
			FROM users
			WHERE COALESCE(NULLIF(phone, ''), '') <> COALESCE(NULLIF(no_telpon, ''), '');
		`).Scan(&mismatchPhone).Error; err != nil {
			return fmt.Errorf("migration 000027 phone parity check failed: %w", err)
		}
		if mismatchPhone > 0 {
			log.Printf("Migration 000027: %d users rows mismatch between phone and no_telpon; canonical phone will be kept", mismatchPhone)
		}
	}

	if err := db.Exec(`
		ALTER TABLE users
		DROP COLUMN IF EXISTS nama,
		DROP COLUMN IF EXISTS no_telpon;
	`).Error; err != nil {
		return err
	}

	if err := markLegacyUserSchemaFinalized(db); err != nil {
		return err
	}

	log.Println("Migration 000027 completed: legacy users schema dropped and finalized")
	return nil
}

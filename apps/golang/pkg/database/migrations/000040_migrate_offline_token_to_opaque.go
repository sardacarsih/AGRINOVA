package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000040MigrateOfflineTokenToOpaque performs a hard cutover:
// all existing OFFLINE tokens in JWT format are revoked so users get
// new opaque tokens on next login. This is a one-time migration.
func Migration000040MigrateOfflineTokenToOpaque(db *gorm.DB) error {
	log.Println("Running migration: 000040_migrate_offline_token_to_opaque")

	// Add revoked_reason column if it doesn't exist yet (must be before UPDATE)
	if err := db.Exec(`
		ALTER TABLE jwt_tokens
			ADD COLUMN IF NOT EXISTS revoked_reason TEXT;
	`).Error; err != nil {
		log.Printf("Note: Adding revoked_reason column may have issues: %v", err)
	}

	if err := db.Exec(`
		UPDATE jwt_tokens
		SET
			is_revoked     = true,
			revoked_at     = NOW(),
			revoked_reason = 'system_upgrade_opaque_token_migration',
			updated_at     = NOW()
		WHERE token_type = 'OFFLINE'
		  AND is_revoked  = false;
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000040 completed: existing OFFLINE tokens revoked (hard cutover to opaque format)")
	return nil
}

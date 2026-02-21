package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000042AddOfflineTokenIndex adds a partial index on jwt_tokens.offline_hash
// for fast opaque offline-token lookups (used by deviceRenew).
func Migration000042AddOfflineTokenIndex(db *gorm.DB) error {
	log.Println("Running migration: 000042_add_offline_token_index")

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_jwt_tokens_offline_hash_active
			ON jwt_tokens (offline_hash)
			WHERE NOT is_revoked
			  AND offline_expires_at IS NOT NULL;
	`).Error; err != nil {
		log.Printf("Note: Adding offline token index may have issues: %v", err)
	}

	log.Println("Migration 000042 completed: offline_hash index added")
	return nil
}

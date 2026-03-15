package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000072OptimizeThemeRuntimeCampaignLookup adds a targeted partial
// index for runtime campaign lookup:
// WHERE enabled = true
// ORDER BY priority DESC, updated_at DESC
func Migration000072OptimizeThemeRuntimeCampaignLookup(db *gorm.DB) error {
	log.Println("Running migration: 000072_optimize_theme_runtime_campaign_lookup")

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_theme_campaigns_runtime_lookup
		ON theme_campaigns(priority DESC, updated_at DESC)
		WHERE enabled = true;
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000072 completed: runtime theme campaign lookup index added")
	return nil
}

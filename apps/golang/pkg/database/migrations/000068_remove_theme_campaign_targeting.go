package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000068RemoveThemeCampaignTargeting removes audience targeting columns
// so all runtime campaign resolution becomes global-only.
func Migration000068RemoveThemeCampaignTargeting(db *gorm.DB) error {
	log.Println("Running migration: 000068_remove_theme_campaign_targeting")

	return db.Exec(`
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1
				FROM information_schema.tables
				WHERE table_schema = current_schema()
				  AND table_name = 'theme_campaigns'
			) THEN
				ALTER TABLE theme_campaigns DROP COLUMN IF EXISTS target_region;
				ALTER TABLE theme_campaigns DROP COLUMN IF EXISTS target_tenant;
				ALTER TABLE theme_campaigns DROP COLUMN IF EXISTS target_role;
			END IF;
		END
		$$;
	`).Error
}

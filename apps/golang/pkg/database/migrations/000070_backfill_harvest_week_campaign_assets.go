package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000070BackfillHarvestWeekCampaignAssets ensures seeded Harvest Week campaign
// has complete web/mobile visual asset URLs for runtime rendering.
func Migration000070BackfillHarvestWeekCampaignAssets(db *gorm.DB) error {
	log.Println("Running migration: 000070_backfill_harvest_week_campaign_assets")

	return db.Exec(`
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1
				FROM information_schema.tables
				WHERE table_schema = current_schema()
				  AND table_name = 'theme_campaigns'
			) THEN
				UPDATE theme_campaigns
				SET assets_json = jsonb_build_object(
					'web',
					jsonb_build_object(
						'backgroundImageUrl', '/theme-dummy/harvest-week/web-background.svg',
						'illustrationUrl', '/theme-dummy/harvest-week/web-illustration.svg',
						'iconPack',
							COALESCE(
								NULLIF(assets_json->'web'->>'iconPack', ''),
								NULLIF(assets_json->>'iconPack', ''),
								'rounded-enterprise'
							),
						'accentAsset',
							COALESCE(
								NULLIF(assets_json->'web'->>'accentAsset', ''),
								NULLIF(assets_json->>'accentAsset', ''),
								'wave-bars'
							)
					),
					'mobile',
					jsonb_build_object(
						'backgroundImageUrl', '/theme-dummy/harvest-week/mobile-background.svg',
						'illustrationUrl', '/theme-dummy/harvest-week/mobile-illustration.svg',
						'iconPack',
							COALESCE(
								NULLIF(assets_json->'mobile'->>'iconPack', ''),
								NULLIF(assets_json->'web'->>'iconPack', ''),
								NULLIF(assets_json->>'iconPack', ''),
								'rounded-enterprise'
							),
						'accentAsset',
							COALESCE(
								NULLIF(assets_json->'mobile'->>'accentAsset', ''),
								NULLIF(assets_json->'web'->>'accentAsset', ''),
								NULLIF(assets_json->>'accentAsset', ''),
								'wave-bars'
							)
					)
				)
				WHERE
					(
						campaign_group_key = 'harvest-week'
						OR id = '00000000-0000-0000-0000-000000000202'
						OR campaign_name = 'Harvest Week'
					)
					AND updated_by = 'system-seed'
					AND (
						COALESCE(assets_json->'web'->>'backgroundImageUrl', '') = ''
						OR COALESCE(assets_json->'web'->>'illustrationUrl', '') = ''
						OR COALESCE(assets_json->'mobile'->>'backgroundImageUrl', '') = ''
						OR COALESCE(assets_json->'mobile'->>'illustrationUrl', '') = ''
						OR COALESCE(assets_json->'mobile'->>'iconPack', '') = ''
						OR COALESCE(assets_json->'mobile'->>'accentAsset', '') = ''
					);
			END IF;
		END
		$$;
	`).Error
}

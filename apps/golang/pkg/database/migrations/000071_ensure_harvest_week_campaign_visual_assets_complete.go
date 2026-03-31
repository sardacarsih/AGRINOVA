package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000071EnsureHarvestWeekCampaignVisualAssetsComplete ensures seeded
// Harvest Week campaign has complete visual assets for web/mobile without
// overriding non-empty values.
func Migration000071EnsureHarvestWeekCampaignVisualAssetsComplete(db *gorm.DB) error {
	log.Println("Running migration: 000071_ensure_harvest_week_campaign_visual_assets_complete")

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
						'backgroundImageUrl',
							COALESCE(
								NULLIF(assets_json->'web'->>'backgroundImageUrl', ''),
								NULLIF(assets_json->>'backgroundImageUrl', ''),
								'/theme-dummy/harvest-week/web-background.svg'
							),
						'illustrationUrl',
							COALESCE(
								NULLIF(assets_json->'web'->>'illustrationUrl', ''),
								NULLIF(assets_json->>'illustrationUrl', ''),
								'/theme-dummy/harvest-week/web-illustration.svg'
							),
						'iconPack',
							COALESCE(
								NULLIF(assets_json->'web'->>'iconPack', ''),
								NULLIF(assets_json->'mobile'->>'iconPack', ''),
								NULLIF(assets_json->>'iconPack', ''),
								'rounded-enterprise'
							),
						'accentAsset',
							COALESCE(
								NULLIF(assets_json->'web'->>'accentAsset', ''),
								NULLIF(assets_json->'mobile'->>'accentAsset', ''),
								NULLIF(assets_json->>'accentAsset', ''),
								'wave-bars'
							)
					),
					'mobile',
					jsonb_build_object(
						'backgroundImageUrl',
							COALESCE(
								NULLIF(assets_json->'mobile'->>'backgroundImageUrl', ''),
								NULLIF(assets_json->>'backgroundImageUrl', ''),
								'/theme-dummy/harvest-week/mobile-background.svg'
							),
						'illustrationUrl',
							COALESCE(
								NULLIF(assets_json->'mobile'->>'illustrationUrl', ''),
								NULLIF(assets_json->>'illustrationUrl', ''),
								'/theme-dummy/harvest-week/mobile-illustration.svg'
							),
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
						OR COALESCE(assets_json->'web'->>'iconPack', '') = ''
						OR COALESCE(assets_json->'web'->>'accentAsset', '') = ''
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

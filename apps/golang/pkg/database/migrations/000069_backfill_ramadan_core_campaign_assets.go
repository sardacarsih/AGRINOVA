package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000069BackfillRamadanCoreCampaignAssets ensures seeded Ramadan Core campaign
// has complete web/mobile visual asset URLs for login runtime rendering.
func Migration000069BackfillRamadanCoreCampaignAssets(db *gorm.DB) error {
	log.Println("Running migration: 000069_backfill_ramadan_core_campaign_assets")

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
						'backgroundImageUrl', '/theme-dummy/ramadan-core/web-background.svg',
						'illustrationUrl', '/theme-dummy/ramadan-core/web-illustration.svg',
						'iconPack',
							COALESCE(
								NULLIF(assets_json->'web'->>'iconPack', ''),
								NULLIF(assets_json->>'iconPack', ''),
								'outline-enterprise'
							),
						'accentAsset',
							COALESCE(
								NULLIF(assets_json->'web'->>'accentAsset', ''),
								NULLIF(assets_json->>'accentAsset', ''),
								'leaf-ribbon'
							)
					),
					'mobile',
					jsonb_build_object(
						'backgroundImageUrl', '/theme-dummy/ramadan-core/mobile-background.svg',
						'illustrationUrl', '/theme-dummy/ramadan-core/mobile-illustration.svg',
						'iconPack',
							COALESCE(
								NULLIF(assets_json->'mobile'->>'iconPack', ''),
								NULLIF(assets_json->>'iconPack', ''),
								'outline-enterprise'
							),
						'accentAsset',
							COALESCE(
								NULLIF(assets_json->'mobile'->>'accentAsset', ''),
								NULLIF(assets_json->>'accentAsset', ''),
								'leaf-ribbon'
							)
					)
				)
				WHERE
					(
						campaign_group_key = 'ramadan-core'
						OR id = '00000000-0000-0000-0000-000000000201'
						OR campaign_name = 'Ramadan Core'
					)
					AND updated_by = 'system-seed'
					AND (
						COALESCE(assets_json->'web'->>'backgroundImageUrl', '') = ''
						OR COALESCE(assets_json->'web'->>'illustrationUrl', '') = ''
						OR COALESCE(assets_json->'mobile'->>'backgroundImageUrl', '') = ''
						OR COALESCE(assets_json->'mobile'->>'illustrationUrl', '') = ''
					);
			END IF;
		END
		$$;
	`).Error
}

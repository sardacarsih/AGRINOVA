package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000073RenameThemeAssetKeys renames theme asset keys from
// backgroundImageUrl/illustrationUrl to backgroundImage/illustration.
func Migration000073RenameThemeAssetKeys(db *gorm.DB) error {
	log.Println("Running migration: 000073_rename_theme_asset_keys")

	return db.Exec(`
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1
				FROM information_schema.tables
				WHERE table_schema = current_schema()
				  AND table_name = 'themes'
			) THEN
				UPDATE themes
				SET asset_manifest_json = (
					(COALESCE(asset_manifest_json, '{}'::jsonb) - 'backgroundImageUrl' - 'illustrationUrl')
					|| jsonb_build_object(
						'backgroundImage',
							COALESCE(
								NULLIF(COALESCE(asset_manifest_json, '{}'::jsonb)->>'backgroundImage', ''),
								NULLIF(COALESCE(asset_manifest_json, '{}'::jsonb)->>'backgroundImageUrl', ''),
								''
							),
						'illustration',
							COALESCE(
								NULLIF(COALESCE(asset_manifest_json, '{}'::jsonb)->>'illustration', ''),
								NULLIF(COALESCE(asset_manifest_json, '{}'::jsonb)->>'illustrationUrl', ''),
								''
							)
					)
				)
				WHERE
					COALESCE(asset_manifest_json, '{}'::jsonb) ? 'backgroundImageUrl'
					OR COALESCE(asset_manifest_json, '{}'::jsonb) ? 'illustrationUrl'
					OR NOT (COALESCE(asset_manifest_json, '{}'::jsonb) ? 'backgroundImage')
					OR NOT (COALESCE(asset_manifest_json, '{}'::jsonb) ? 'illustration');
			END IF;

			IF EXISTS (
				SELECT 1
				FROM information_schema.tables
				WHERE table_schema = current_schema()
				  AND table_name = 'theme_campaigns'
			) THEN
				UPDATE theme_campaigns
				SET assets_json = (
					(COALESCE(assets_json, '{}'::jsonb) - 'backgroundImageUrl' - 'illustrationUrl')
					|| jsonb_build_object(
						'web',
						(
							(COALESCE(COALESCE(assets_json, '{}'::jsonb)->'web', '{}'::jsonb) - 'backgroundImageUrl' - 'illustrationUrl')
							|| jsonb_build_object(
								'backgroundImage',
									COALESCE(
										NULLIF(COALESCE(assets_json->'web', '{}'::jsonb)->>'backgroundImage', ''),
										NULLIF(COALESCE(assets_json->'web', '{}'::jsonb)->>'backgroundImageUrl', ''),
										NULLIF(COALESCE(assets_json, '{}'::jsonb)->>'backgroundImage', ''),
										NULLIF(COALESCE(assets_json, '{}'::jsonb)->>'backgroundImageUrl', ''),
										''
									),
								'illustration',
									COALESCE(
										NULLIF(COALESCE(assets_json->'web', '{}'::jsonb)->>'illustration', ''),
										NULLIF(COALESCE(assets_json->'web', '{}'::jsonb)->>'illustrationUrl', ''),
										NULLIF(COALESCE(assets_json, '{}'::jsonb)->>'illustration', ''),
										NULLIF(COALESCE(assets_json, '{}'::jsonb)->>'illustrationUrl', ''),
										''
									),
								'iconPack',
									COALESCE(
										NULLIF(COALESCE(assets_json->'web', '{}'::jsonb)->>'iconPack', ''),
										NULLIF(COALESCE(assets_json, '{}'::jsonb)->>'iconPack', ''),
										''
									),
								'accentAsset',
									COALESCE(
										NULLIF(COALESCE(assets_json->'web', '{}'::jsonb)->>'accentAsset', ''),
										NULLIF(COALESCE(assets_json, '{}'::jsonb)->>'accentAsset', ''),
										''
									)
							)
						),
						'mobile',
						(
							(COALESCE(COALESCE(assets_json, '{}'::jsonb)->'mobile', '{}'::jsonb) - 'backgroundImageUrl' - 'illustrationUrl')
							|| jsonb_build_object(
								'backgroundImage',
									COALESCE(
										NULLIF(COALESCE(assets_json->'mobile', '{}'::jsonb)->>'backgroundImage', ''),
										NULLIF(COALESCE(assets_json->'mobile', '{}'::jsonb)->>'backgroundImageUrl', ''),
										NULLIF(COALESCE(assets_json, '{}'::jsonb)->>'backgroundImage', ''),
										NULLIF(COALESCE(assets_json, '{}'::jsonb)->>'backgroundImageUrl', ''),
										''
									),
								'illustration',
									COALESCE(
										NULLIF(COALESCE(assets_json->'mobile', '{}'::jsonb)->>'illustration', ''),
										NULLIF(COALESCE(assets_json->'mobile', '{}'::jsonb)->>'illustrationUrl', ''),
										NULLIF(COALESCE(assets_json, '{}'::jsonb)->>'illustration', ''),
										NULLIF(COALESCE(assets_json, '{}'::jsonb)->>'illustrationUrl', ''),
										''
									),
								'iconPack',
									COALESCE(
										NULLIF(COALESCE(assets_json->'mobile', '{}'::jsonb)->>'iconPack', ''),
										NULLIF(COALESCE(assets_json, '{}'::jsonb)->>'iconPack', ''),
										''
									),
								'accentAsset',
									COALESCE(
										NULLIF(COALESCE(assets_json->'mobile', '{}'::jsonb)->>'accentAsset', ''),
										NULLIF(COALESCE(assets_json, '{}'::jsonb)->>'accentAsset', ''),
										''
									)
							)
						)
					)
				)
				WHERE
					COALESCE(assets_json, '{}'::jsonb) ? 'backgroundImageUrl'
					OR COALESCE(assets_json, '{}'::jsonb) ? 'illustrationUrl'
					OR COALESCE(assets_json->'web', '{}'::jsonb) ? 'backgroundImageUrl'
					OR COALESCE(assets_json->'web', '{}'::jsonb) ? 'illustrationUrl'
					OR COALESCE(assets_json->'mobile', '{}'::jsonb) ? 'backgroundImageUrl'
					OR COALESCE(assets_json->'mobile', '{}'::jsonb) ? 'illustrationUrl'
					OR NOT (COALESCE(assets_json->'web', '{}'::jsonb) ? 'backgroundImage')
					OR NOT (COALESCE(assets_json->'web', '{}'::jsonb) ? 'illustration')
					OR NOT (COALESCE(assets_json->'mobile', '{}'::jsonb) ? 'backgroundImage')
					OR NOT (COALESCE(assets_json->'mobile', '{}'::jsonb) ? 'illustration');
			END IF;
		END
		$$;
	`).Error
}

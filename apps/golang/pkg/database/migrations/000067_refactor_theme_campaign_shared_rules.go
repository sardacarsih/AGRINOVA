package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000067RefactorThemeCampaignSharedRules migrates campaign rules to shared mode
// and stores visual assets by platform (web/mobile) in assets_json.
func Migration000067RefactorThemeCampaignSharedRules(db *gorm.DB) error {
	log.Println("Running migration: 000067_refactor_theme_campaign_shared_rules")

	if err := db.Exec(`
		ALTER TABLE theme_campaigns
		ADD COLUMN IF NOT EXISTS campaign_group_key VARCHAR(180);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		UPDATE theme_campaigns
		SET campaign_group_key = COALESCE(NULLIF(TRIM(campaign_group_key), ''), 'cg-' || REPLACE(id::text, '-', ''))
		WHERE campaign_group_key IS NULL OR TRIM(campaign_group_key) = '';
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		ALTER TABLE theme_campaigns
		ALTER COLUMN campaign_group_key SET NOT NULL;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_theme_campaigns_group_key ON theme_campaigns(campaign_group_key);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1
				FROM information_schema.columns
				WHERE table_name = 'theme_campaigns' AND column_name = 'target_platform'
			) THEN
				UPDATE theme_campaigns
				SET assets_json = CASE
					WHEN jsonb_typeof(assets_json->'web') = 'object' AND jsonb_typeof(assets_json->'mobile') = 'object' THEN assets_json
					ELSE jsonb_build_object(
						'web',
						CASE
							WHEN target_platform IN ('web', 'both') THEN jsonb_build_object(
								'backgroundImageUrl', COALESCE(assets_json->>'backgroundImageUrl', ''),
								'illustrationUrl', COALESCE(assets_json->>'illustrationUrl', ''),
								'iconPack', COALESCE(assets_json->>'iconPack', ''),
								'accentAsset', COALESCE(assets_json->>'accentAsset', '')
							)
							ELSE jsonb_build_object(
								'backgroundImageUrl', '',
								'illustrationUrl', '',
								'iconPack', '',
								'accentAsset', ''
							)
						END,
						'mobile',
						CASE
							WHEN target_platform IN ('mobile', 'both') THEN jsonb_build_object(
								'backgroundImageUrl', COALESCE(assets_json->>'backgroundImageUrl', ''),
								'illustrationUrl', COALESCE(assets_json->>'illustrationUrl', ''),
								'iconPack', COALESCE(assets_json->>'iconPack', ''),
								'accentAsset', COALESCE(assets_json->>'accentAsset', '')
							)
							ELSE jsonb_build_object(
								'backgroundImageUrl', '',
								'illustrationUrl', '',
								'iconPack', '',
								'accentAsset', ''
							)
						END
					)
				END;

				ALTER TABLE theme_campaigns DROP CONSTRAINT IF EXISTS chk_theme_campaign_platform;
				ALTER TABLE theme_campaigns DROP COLUMN IF EXISTS target_platform;
			END IF;
		END
		$$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		UPDATE theme_campaigns
		SET assets_json = jsonb_build_object(
			'web',
			CASE
				WHEN jsonb_typeof(assets_json->'web') = 'object' THEN jsonb_build_object(
					'backgroundImageUrl', COALESCE(assets_json->'web'->>'backgroundImageUrl', ''),
					'illustrationUrl', COALESCE(assets_json->'web'->>'illustrationUrl', ''),
					'iconPack', COALESCE(assets_json->'web'->>'iconPack', ''),
					'accentAsset', COALESCE(assets_json->'web'->>'accentAsset', '')
				)
				ELSE jsonb_build_object(
					'backgroundImageUrl', '',
					'illustrationUrl', '',
					'iconPack', '',
					'accentAsset', ''
				)
			END,
			'mobile',
			CASE
				WHEN jsonb_typeof(assets_json->'mobile') = 'object' THEN jsonb_build_object(
					'backgroundImageUrl', COALESCE(assets_json->'mobile'->>'backgroundImageUrl', ''),
					'illustrationUrl', COALESCE(assets_json->'mobile'->>'illustrationUrl', ''),
					'iconPack', COALESCE(assets_json->'mobile'->>'iconPack', ''),
					'accentAsset', COALESCE(assets_json->'mobile'->>'accentAsset', '')
				)
				ELSE jsonb_build_object(
					'backgroundImageUrl', '',
					'illustrationUrl', '',
					'iconPack', '',
					'accentAsset', ''
				)
			END
		)
		WHERE assets_json IS NULL
			OR jsonb_typeof(assets_json->'web') <> 'object'
			OR jsonb_typeof(assets_json->'mobile') <> 'object';
	`).Error; err != nil {
		return err
	}

	return nil
}

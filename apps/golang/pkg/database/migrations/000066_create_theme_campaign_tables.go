package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000066CreateThemeCampaignTables creates theme runtime campaign tables.
func Migration000066CreateThemeCampaignTables(db *gorm.DB) error {
	log.Println("Running migration: 000066_create_theme_campaign_tables")

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS themes (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			code VARCHAR(120) NOT NULL UNIQUE,
			name VARCHAR(160) NOT NULL,
			type VARCHAR(20) NOT NULL,
			token_json JSONB NOT NULL DEFAULT '{}'::jsonb,
			asset_manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
			is_active BOOLEAN NOT NULL DEFAULT true,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT chk_themes_type CHECK (type IN ('base', 'seasonal'))
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS theme_campaigns (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
			campaign_name VARCHAR(180) NOT NULL,
			description TEXT,
			enabled BOOLEAN NOT NULL DEFAULT true,
			start_at TIMESTAMPTZ,
			end_at TIMESTAMPTZ,
			priority INTEGER NOT NULL,
			target_region JSONB NOT NULL DEFAULT '[]'::jsonb,
			target_tenant JSONB NOT NULL DEFAULT '[]'::jsonb,
			target_role JSONB NOT NULL DEFAULT '[]'::jsonb,
			target_platform VARCHAR(10) NOT NULL DEFAULT 'both',
			light_mode_enabled BOOLEAN NOT NULL DEFAULT true,
			dark_mode_enabled BOOLEAN NOT NULL DEFAULT true,
			assets_json JSONB NOT NULL DEFAULT '{}'::jsonb,
			updated_by VARCHAR(180) NOT NULL DEFAULT 'system',
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT chk_theme_campaign_platform CHECK (target_platform IN ('web', 'mobile', 'both'))
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS theme_settings (
			id SMALLINT PRIMARY KEY,
			default_theme_id UUID NOT NULL REFERENCES themes(id),
			global_kill_switch BOOLEAN NOT NULL DEFAULT false,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS theme_audit_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			actor_user_id VARCHAR(180) NOT NULL,
			action VARCHAR(80) NOT NULL,
			entity_type VARCHAR(80) NOT NULL,
			entity_id VARCHAR(180) NOT NULL,
			before_json JSONB NOT NULL DEFAULT '{}'::jsonb,
			after_json JSONB NOT NULL DEFAULT '{}'::jsonb,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`).Error; err != nil {
		return err
	}

	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_theme_campaigns_updated_at ON theme_campaigns(updated_at DESC);",
		"CREATE INDEX IF NOT EXISTS idx_theme_campaigns_enabled ON theme_campaigns(enabled);",
		"CREATE INDEX IF NOT EXISTS idx_theme_campaigns_schedule ON theme_campaigns(start_at, end_at);",
		"CREATE INDEX IF NOT EXISTS idx_theme_campaigns_priority ON theme_campaigns(priority DESC);",
		"CREATE INDEX IF NOT EXISTS idx_theme_audit_logs_created_at ON theme_audit_logs(created_at DESC);",
	}
	for _, sql := range indexes {
		if err := db.Exec(sql).Error; err != nil {
			return err
		}
	}

	if err := db.Exec(`
		INSERT INTO themes (id, code, name, type, token_json, asset_manifest_json, is_active)
		VALUES
			(
				'00000000-0000-0000-0000-000000000101',
				'base-default',
				'Base Default',
				'base',
				'{"accentColor":"#059669","accentSoftColor":"#d1fae5","loginCardBorder":"#34d399"}'::jsonb,
				'{"backgroundImageUrl":"", "illustrationUrl":"", "iconPack":"outline-enterprise", "accentAsset":"none"}'::jsonb,
				true
			),
			(
				'00000000-0000-0000-0000-000000000102',
				'seasonal-ramadan',
				'Ramadan Harmony',
				'seasonal',
				'{"accentColor":"#0f766e","accentSoftColor":"#ccfbf1","loginCardBorder":"#2dd4bf"}'::jsonb,
				'{"backgroundImageUrl":"https://images.unsplash.com/photo-1519817650390-64a93db511aa?auto=format&fit=crop&w=1600&q=80","illustrationUrl":"https://images.unsplash.com/photo-1507914372368-b2b085b925a1?auto=format&fit=crop&w=1000&q=80","iconPack":"outline-enterprise","accentAsset":"leaf-ribbon"}'::jsonb,
				true
			),
			(
				'00000000-0000-0000-0000-000000000103',
				'seasonal-harvest',
				'Harvest Festival',
				'seasonal',
				'{"accentColor":"#c2410c","accentSoftColor":"#ffedd5","loginCardBorder":"#fb923c"}'::jsonb,
				'{"backgroundImageUrl":"https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80","illustrationUrl":"https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1000&q=80","iconPack":"rounded-enterprise","accentAsset":"wave-bars"}'::jsonb,
				true
			)
		ON CONFLICT (id) DO NOTHING;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		INSERT INTO theme_settings (id, default_theme_id, global_kill_switch, updated_at)
		VALUES (1, '00000000-0000-0000-0000-000000000101', false, NOW())
		ON CONFLICT (id) DO NOTHING;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DO $$
		DECLARE
			has_target_platform BOOLEAN;
			has_target_region BOOLEAN;
			has_target_tenant BOOLEAN;
			has_target_role BOOLEAN;
			has_campaign_group_key BOOLEAN;
		BEGIN
			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'theme_campaigns' AND column_name = 'target_platform'
			) INTO has_target_platform;
			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'theme_campaigns' AND column_name = 'target_region'
			) INTO has_target_region;
			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'theme_campaigns' AND column_name = 'target_tenant'
			) INTO has_target_tenant;
			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'theme_campaigns' AND column_name = 'target_role'
			) INTO has_target_role;
			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'theme_campaigns' AND column_name = 'campaign_group_key'
			) INTO has_campaign_group_key;

			IF has_target_platform AND has_target_region AND has_target_tenant AND has_target_role THEN
				INSERT INTO theme_campaigns (
					id,
					theme_id,
					campaign_name,
					description,
					enabled,
					start_at,
					end_at,
					priority,
					target_region,
					target_tenant,
					target_role,
					target_platform,
					light_mode_enabled,
					dark_mode_enabled,
					assets_json,
					updated_by
				) VALUES
				(
					'00000000-0000-0000-0000-000000000201',
					'00000000-0000-0000-0000-000000000102',
					'Ramadan Core',
					'Runtime Ramadan visual campaign',
					true,
					NOW() - INTERVAL '2 day',
					NOW() + INTERVAL '30 day',
					90,
					'["ID-WEST","ID-CENTRAL"]'::jsonb,
					'["agrinova-global"]'::jsonb,
					'["SUPER_ADMIN","COMPANY_ADMIN","AREA_MANAGER"]'::jsonb,
					'both',
					true,
					true,
					'{"iconPack":"outline-enterprise","accentAsset":"leaf-ribbon"}'::jsonb,
					'system-seed'
				),
				(
					'00000000-0000-0000-0000-000000000202',
					'00000000-0000-0000-0000-000000000103',
					'Harvest Week',
					'Scheduled harvest visual update',
					true,
					NOW() + INTERVAL '3 day',
					NOW() + INTERVAL '25 day',
					70,
					'["ID-EAST"]'::jsonb,
					'["bkm-group"]'::jsonb,
					'["AREA_MANAGER","MANAGER"]'::jsonb,
					'web',
					true,
					false,
					'{"iconPack":"rounded-enterprise","accentAsset":"wave-bars"}'::jsonb,
					'system-seed'
				)
				ON CONFLICT (id) DO NOTHING;
			ELSIF has_campaign_group_key AND has_target_region AND has_target_tenant AND has_target_role THEN
				INSERT INTO theme_campaigns (
					id,
					theme_id,
					campaign_group_key,
					campaign_name,
					description,
					enabled,
					start_at,
					end_at,
					priority,
					target_region,
					target_tenant,
					target_role,
					light_mode_enabled,
					dark_mode_enabled,
					assets_json,
					updated_by
				) VALUES
				(
					'00000000-0000-0000-0000-000000000201',
					'00000000-0000-0000-0000-000000000102',
					'ramadan-core',
					'Ramadan Core',
					'Runtime Ramadan visual campaign',
					true,
					NOW() - INTERVAL '2 day',
					NOW() + INTERVAL '30 day',
					90,
					'["ID-WEST","ID-CENTRAL"]'::jsonb,
					'["agrinova-global"]'::jsonb,
					'["SUPER_ADMIN","COMPANY_ADMIN","AREA_MANAGER"]'::jsonb,
					true,
					true,
					'{
						"web":{"backgroundImageUrl":"","illustrationUrl":"","iconPack":"outline-enterprise","accentAsset":"leaf-ribbon"},
						"mobile":{"backgroundImageUrl":"","illustrationUrl":"","iconPack":"outline-enterprise","accentAsset":"leaf-ribbon"}
					}'::jsonb,
					'system-seed'
				),
				(
					'00000000-0000-0000-0000-000000000202',
					'00000000-0000-0000-0000-000000000103',
					'harvest-week',
					'Harvest Week',
					'Scheduled harvest visual update',
					true,
					NOW() + INTERVAL '3 day',
					NOW() + INTERVAL '25 day',
					70,
					'["ID-EAST"]'::jsonb,
					'["bkm-group"]'::jsonb,
					'["AREA_MANAGER","MANAGER"]'::jsonb,
					true,
					false,
					'{
						"web":{"backgroundImageUrl":"","illustrationUrl":"","iconPack":"rounded-enterprise","accentAsset":"wave-bars"},
						"mobile":{"backgroundImageUrl":"","illustrationUrl":"","iconPack":"","accentAsset":""}
					}'::jsonb,
					'system-seed'
				)
				ON CONFLICT (id) DO NOTHING;
			ELSIF has_campaign_group_key THEN
				INSERT INTO theme_campaigns (
					id,
					theme_id,
					campaign_group_key,
					campaign_name,
					description,
					enabled,
					start_at,
					end_at,
					priority,
					light_mode_enabled,
					dark_mode_enabled,
					assets_json,
					updated_by
				) VALUES
				(
					'00000000-0000-0000-0000-000000000201',
					'00000000-0000-0000-0000-000000000102',
					'ramadan-core',
					'Ramadan Core',
					'Runtime Ramadan visual campaign',
					true,
					NOW() - INTERVAL '2 day',
					NOW() + INTERVAL '30 day',
					90,
					true,
					true,
					'{
						"web":{"backgroundImageUrl":"","illustrationUrl":"","iconPack":"outline-enterprise","accentAsset":"leaf-ribbon"},
						"mobile":{"backgroundImageUrl":"","illustrationUrl":"","iconPack":"outline-enterprise","accentAsset":"leaf-ribbon"}
					}'::jsonb,
					'system-seed'
				),
				(
					'00000000-0000-0000-0000-000000000202',
					'00000000-0000-0000-0000-000000000103',
					'harvest-week',
					'Harvest Week',
					'Scheduled harvest visual update',
					true,
					NOW() + INTERVAL '3 day',
					NOW() + INTERVAL '25 day',
					70,
					true,
					false,
					'{
						"web":{"backgroundImageUrl":"","illustrationUrl":"","iconPack":"rounded-enterprise","accentAsset":"wave-bars"},
						"mobile":{"backgroundImageUrl":"","illustrationUrl":"","iconPack":"","accentAsset":""}
					}'::jsonb,
					'system-seed'
				)
				ON CONFLICT (id) DO NOTHING;
			ELSE
				INSERT INTO theme_campaigns (
					id,
					theme_id,
					campaign_name,
					description,
					enabled,
					start_at,
					end_at,
					priority,
					light_mode_enabled,
					dark_mode_enabled,
					assets_json,
					updated_by
				) VALUES
				(
					'00000000-0000-0000-0000-000000000201',
					'00000000-0000-0000-0000-000000000102',
					'Ramadan Core',
					'Runtime Ramadan visual campaign',
					true,
					NOW() - INTERVAL '2 day',
					NOW() + INTERVAL '30 day',
					90,
					true,
					true,
					'{
						"web":{"backgroundImageUrl":"","illustrationUrl":"","iconPack":"outline-enterprise","accentAsset":"leaf-ribbon"},
						"mobile":{"backgroundImageUrl":"","illustrationUrl":"","iconPack":"outline-enterprise","accentAsset":"leaf-ribbon"}
					}'::jsonb,
					'system-seed'
				),
				(
					'00000000-0000-0000-0000-000000000202',
					'00000000-0000-0000-0000-000000000103',
					'Harvest Week',
					'Scheduled harvest visual update',
					true,
					NOW() + INTERVAL '3 day',
					NOW() + INTERVAL '25 day',
					70,
					true,
					false,
					'{
						"web":{"backgroundImageUrl":"","illustrationUrl":"","iconPack":"rounded-enterprise","accentAsset":"wave-bars"},
						"mobile":{"backgroundImageUrl":"","illustrationUrl":"","iconPack":"","accentAsset":""}
					}'::jsonb,
					'system-seed'
				)
				ON CONFLICT (id) DO NOTHING;
			END IF;
		END
		$$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		INSERT INTO theme_audit_logs (
			id,
			actor_user_id,
			action,
			entity_type,
			entity_id,
			before_json,
			after_json
		) VALUES
		(
			'00000000-0000-0000-0000-000000000301',
			'system-seed',
			'CREATE_CAMPAIGN',
			'theme_campaigns',
			'00000000-0000-0000-0000-000000000201',
			'{}'::jsonb,
			'{"campaign_name":"Ramadan Core","enabled":true}'::jsonb
		),
		(
			'00000000-0000-0000-0000-000000000302',
			'system-seed',
			'CREATE_CAMPAIGN',
			'theme_campaigns',
			'00000000-0000-0000-0000-000000000202',
			'{}'::jsonb,
			'{"campaign_name":"Harvest Week","enabled":true}'::jsonb
		)
		ON CONFLICT (id) DO NOTHING;
	`).Error; err != nil {
		return err
	}

	return nil
}

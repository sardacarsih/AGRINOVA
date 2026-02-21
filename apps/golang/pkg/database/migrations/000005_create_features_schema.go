package migrations

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// Migration000005CreateFeaturesSchema creates the features, role_features, and user_features tables
type Migration000005CreateFeaturesSchema struct{}

func (m *Migration000005CreateFeaturesSchema) Version() string {
	return "000005"
}

func (m *Migration000005CreateFeaturesSchema) Name() string {
	return "create_features_schema"
}

func (m *Migration000005CreateFeaturesSchema) Up(ctx context.Context, db *gorm.DB) error {
	// Create features table
	if err := db.WithContext(ctx).Exec(`
		CREATE TABLE IF NOT EXISTS features (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(255) NOT NULL,
			display_name VARCHAR(255) NOT NULL,
			description TEXT,
			module VARCHAR(50) NOT NULL,
			parent_id UUID REFERENCES features(id) ON DELETE CASCADE,
			is_active BOOLEAN DEFAULT true NOT NULL,
			is_system BOOLEAN DEFAULT false NOT NULL,
			metadata JSONB DEFAULT '{}'::jsonb,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			deleted_at TIMESTAMP WITH TIME ZONE,

			CONSTRAINT features_name_unique UNIQUE(name)
		);
	`).Error; err != nil {
		return fmt.Errorf("failed to create features table: %w", err)
	}

	// Create indexes for features table
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_features_name ON features(name) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_features_module ON features(module) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_features_parent ON features(parent_id) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_features_active ON features(is_active) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_features_deleted ON features(deleted_at);",
	}

	for _, indexSQL := range indexes {
		if err := db.WithContext(ctx).Exec(indexSQL).Error; err != nil {
			return fmt.Errorf("failed to create feature index: %w", err)
		}
	}

	// Create role_features table using user roles (VARCHAR)
	if err := db.WithContext(ctx).Exec(`
		CREATE TABLE IF NOT EXISTS role_features (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			role VARCHAR(50) NOT NULL,
			feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
			inherited_from_role VARCHAR(50),
			is_denied BOOLEAN DEFAULT false NOT NULL,
			granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			granted_by UUID NOT NULL,
			expires_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			deleted_at TIMESTAMP WITH TIME ZONE,

			CONSTRAINT role_features_unique UNIQUE(role, feature_id),
			CONSTRAINT valid_role CHECK (role IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM'))
		);
	`).Error; err != nil {
		return fmt.Errorf("failed to create role_features table: %w", err)
	}

	// Create indexes for role_features table
	roleFeatureIndexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_role_features_role ON role_features(role) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_role_features_feature ON role_features(feature_id) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_role_features_inherited ON role_features(inherited_from_role) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_role_features_expires ON role_features(expires_at) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_role_features_deleted ON role_features(deleted_at);",
	}

	for _, indexSQL := range roleFeatureIndexes {
		if err := db.WithContext(ctx).Exec(indexSQL).Error; err != nil {
			return fmt.Errorf("failed to create role_features index: %w", err)
		}
	}

	// Create user_features table
	if err := db.WithContext(ctx).Exec(`
		CREATE TABLE IF NOT EXISTS user_features (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL,
			feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
			is_granted BOOLEAN NOT NULL,
			scope_type VARCHAR(20),
			scope_id UUID,
			effective_from TIMESTAMP WITH TIME ZONE,
			expires_at TIMESTAMP WITH TIME ZONE,
			granted_by UUID NOT NULL,
			reason TEXT,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			deleted_at TIMESTAMP WITH TIME ZONE,

			CONSTRAINT user_features_unique UNIQUE(user_id, feature_id, scope_type, scope_id)
		);
	`).Error; err != nil {
		return fmt.Errorf("failed to create user_features table: %w", err)
	}

	// Create indexes for user_features table
	userFeatureIndexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_user_features_user ON user_features(user_id) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_user_features_feature ON user_features(feature_id) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_user_features_scope_type ON user_features(scope_type) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_user_features_scope_id ON user_features(scope_id) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_user_features_effective ON user_features(effective_from) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_user_features_expires ON user_features(expires_at) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_user_features_deleted ON user_features(deleted_at);",
		// Composite index for common query pattern
		"CREATE INDEX IF NOT EXISTS idx_user_features_lookup ON user_features(user_id, feature_id, scope_type, scope_id) WHERE deleted_at IS NULL AND is_granted = true;",
	}

	for _, indexSQL := range userFeatureIndexes {
		if err := db.WithContext(ctx).Exec(indexSQL).Error; err != nil {
			return fmt.Errorf("failed to create user_features index: %w", err)
		}
	}

	// Create trigger for updated_at timestamp
	// Create the trigger function
	if err := db.WithContext(ctx).Exec(`
		CREATE OR REPLACE FUNCTION update_features_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = NOW();
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`).Error; err != nil {
		return fmt.Errorf("failed to create trigger function: %w", err)
	}

	// Create triggers for each table
	triggers := []string{
		"CREATE TRIGGER features_updated_at_trigger BEFORE UPDATE ON features FOR EACH ROW EXECUTE FUNCTION update_features_updated_at();",
		"CREATE TRIGGER user_features_updated_at_trigger BEFORE UPDATE ON user_features FOR EACH ROW EXECUTE FUNCTION update_features_updated_at();",
	}

	for _, triggerSQL := range triggers {
		if err := db.WithContext(ctx).Exec(triggerSQL).Error; err != nil {
			return fmt.Errorf("failed to create trigger: %w", err)
		}
	}

	return nil
}

func (m *Migration000005CreateFeaturesSchema) Down(ctx context.Context, db *gorm.DB) error {
	// Drop triggers
	if err := db.WithContext(ctx).Exec(`
		DROP TRIGGER IF EXISTS features_updated_at_trigger ON features;
		DROP TRIGGER IF EXISTS user_features_updated_at_trigger ON user_features;
		DROP FUNCTION IF EXISTS update_features_updated_at();
	`).Error; err != nil {
		return fmt.Errorf("failed to drop triggers: %w", err)
	}

	// Drop tables in reverse order of creation
	tables := []string{"user_features", "role_features", "features"}
	for _, table := range tables {
		if err := db.WithContext(ctx).Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s CASCADE;", table)).Error; err != nil {
			return fmt.Errorf("failed to drop table %s: %w", table, err)
		}
	}

	return nil
}

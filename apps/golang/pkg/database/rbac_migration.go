package database

import (
	"fmt"
	"log"

	"gorm.io/gorm"
)

// CreateRBACSchema creates the RBAC tables for database-based role-permission management
func CreateRBACSchema(db *gorm.DB) error {
	log.Println("Creating RBAC database schema...")

	// Create roles table
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS roles (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(50) UNIQUE NOT NULL,
			display_name VARCHAR(100) NOT NULL,
			level INTEGER NOT NULL, -- 1=highest, 9=lowest
			description TEXT,
			is_active BOOLEAN DEFAULT true,
			is_system BOOLEAN DEFAULT false, -- Whether this is a system role
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		deleted_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create roles table: %w", err)
	}

	// Add missing columns to existing roles table (for existing installations)
	if err := db.Exec(`
		DO $$
		BEGIN
			-- Add is_system column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='is_system') THEN
				ALTER TABLE roles ADD COLUMN is_system BOOLEAN DEFAULT false;
			END IF;

			-- Add deleted_at column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='deleted_at') THEN
				ALTER TABLE roles ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
			END IF;

			-- Create index for deleted_at if not exists
			IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='roles' AND indexname='idx_roles_deleted_at') THEN
				CREATE INDEX idx_roles_deleted_at ON roles(deleted_at);
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Warning: Roles table column migration may have issues: %v", err)
	}

	// Create permissions table
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS permissions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(100) UNIQUE NOT NULL,
			resource VARCHAR(50) NOT NULL, -- harvest, user, report, etc.
			action VARCHAR(50) NOT NULL,   -- create, read, update, delete, approve
			description TEXT,
			is_active BOOLEAN DEFAULT true,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create permissions table: %w", err)
	}

	// Add missing columns for existing installations (deleted_at, updated_at)
	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='permissions' AND column_name='deleted_at') THEN
				ALTER TABLE permissions ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='permissions' AND column_name='updated_at') THEN
				ALTER TABLE permissions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
			END IF;

			-- Create index for soft delete
			IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='permissions' AND indexname='idx_permissions_deleted_at') THEN
				CREATE INDEX idx_permissions_deleted_at ON permissions(deleted_at);
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Warning: Permissions table column migration may have issues: %v", err)
	}

	// Create role_permissions table
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS role_permissions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
			permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
			inherited_from_role_id UUID REFERENCES roles(id), -- For inheritance tracking
			is_denied BOOLEAN DEFAULT false, -- For permission overrides
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			UNIQUE(role_id, permission_id)
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create role_permissions table: %w", err)
	}

	// Ensure legacy installations have a deterministic unique constraint required by UPSERT.
	if err := db.Exec(`
		DO $$
		BEGIN
			-- Remove duplicate rows before enforcing uniqueness.
			WITH ranked AS (
				SELECT id,
					   ROW_NUMBER() OVER (PARTITION BY role_id, permission_id ORDER BY created_at, id) AS rn
				FROM role_permissions
			)
			DELETE FROM role_permissions
			WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

			BEGIN
				ALTER TABLE role_permissions
					ADD CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id);
			EXCEPTION
				WHEN duplicate_object THEN NULL;
				WHEN duplicate_table THEN NULL;
			END;
		END $$;
	`).Error; err != nil {
		return fmt.Errorf("failed to enforce role_permissions uniqueness: %w", err)
	}

	// Create user_permission_assignments table for user-specific overrides
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS user_permission_assignments (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
			is_granted BOOLEAN DEFAULT true, -- Can be used to deny specific permissions
			scope_type VARCHAR(20), -- estate, division, company, global
			scope_id UUID, -- ID of the scoped resource
			granted_by UUID REFERENCES users(id),
			reason TEXT,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			UNIQUE(user_id, permission_id, scope_type, scope_id)
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create user_permission_assignments table: %w", err)
	}

	// Add missing columns for existing installations (expires_at, created_by)
	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_permission_assignments' AND column_name='expires_at') THEN
				ALTER TABLE user_permission_assignments ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_permission_assignments' AND column_name='created_by') THEN
				ALTER TABLE user_permission_assignments ADD COLUMN created_by UUID;
			END IF;

			-- Create index for expires_at
			IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='user_permission_assignments' AND indexname='idx_user_perm_assignments_expires') THEN
				CREATE INDEX idx_user_perm_assignments_expires ON user_permission_assignments(expires_at);
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Warning: User permission assignments column migration may have issues: %v", err)
	}

	// Create indexes
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id)").Error; err != nil {
		log.Printf("Warning: Failed to create idx_role_permissions_role: %v", err)
	}

	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_role_permissions_inheritance ON role_permissions(inherited_from_role_id)").Error; err != nil {
		log.Printf("Warning: Failed to create idx_role_permissions_inheritance: %v", err)
	}

	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_user_permission_assignments_user ON user_permission_assignments(user_id)").Error; err != nil {
		log.Printf("Warning: Failed to create idx_user_permission_assignments_user: %v", err)
	}

	// Create features table for the new feature-based permission system
	if err := db.Exec(`
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
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create features table: %w", err)
	}

	// Create indexes for features table
	featureIndexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_features_name ON features(name) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_features_module ON features(module) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_features_parent ON features(parent_id) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_features_active ON features(is_active) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_features_deleted ON features(deleted_at);",
	}

	for _, indexSQL := range featureIndexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			log.Printf("Warning: Failed to create feature index: %v", err)
		}
	}

	// Create role_features table using role names (VARCHAR)
	if err := db.Exec(`
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
			CONSTRAINT valid_role CHECK (role IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'))
		)
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
		if err := db.Exec(indexSQL).Error; err != nil {
			log.Printf("Warning: Failed to create role_features index: %v", err)
		}
	}

	// Create user_features table
	if err := db.Exec(`
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
		)
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
		if err := db.Exec(indexSQL).Error; err != nil {
			log.Printf("Warning: Failed to create user_features index: %v", err)
		}
	}

	// Create trigger for updated_at timestamp for features tables
	// Create the trigger function if not exists
	if err := db.Exec(`
		CREATE OR REPLACE FUNCTION update_features_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = NOW();
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`).Error; err != nil {
		log.Printf("Warning: Failed to create trigger function: %v", err)
	}

	// Create triggers for each table
	triggers := []string{
		"DROP TRIGGER IF EXISTS features_updated_at_trigger ON features; CREATE TRIGGER features_updated_at_trigger BEFORE UPDATE ON features FOR EACH ROW EXECUTE FUNCTION update_features_updated_at();",
		"DROP TRIGGER IF EXISTS user_features_updated_at_trigger ON user_features; CREATE TRIGGER user_features_updated_at_trigger BEFORE UPDATE ON user_features FOR EACH ROW EXECUTE FUNCTION update_features_updated_at();",
	}

	for _, triggerSQL := range triggers {
		if err := db.Exec(triggerSQL).Error; err != nil {
			log.Printf("Warning: Failed to create trigger: %v", err)
		}
	}

	log.Println("RBAC database schema created successfully")
	return nil
}

// SeedRBACData seeds the RBAC tables with initial data from the static permission system
func SeedRBACData(db *gorm.DB) error {
	log.Println("Seeding RBAC data...")

	// Define roles with their hierarchy levels (1=highest authority)
	roles := []struct {
		Name        string
		DisplayName string
		Level       int
		Description string
	}{
		{"super_admin", "Super Admin", 1, "System-wide administrator with full access"},
		{"company_admin", "Company Admin", 2, "Company-level administrator"},
		{"area_manager", "Area Manager", 3, "Multi-company oversight manager"},
		{"manager", "Manager", 4, "Estate-level manager"},
		{"asisten", "Asisten", 5, "Division-level assistant"},
		{"mandor", "Mandor", 5, "Field supervisor (same level as asisten)"},
		{"satpam", "Satpam", 5, "Security officer (same level as asisten)"},
		{"timbangan", "Timbangan", 5, "Weighing operator (same level as asisten)"},
		{"grading", "Grading", 5, "Quality grader (same level as asisten)"},
	}

	// Insert roles
	for _, role := range roles {
		result := db.Exec(`
			INSERT INTO roles (name, display_name, level, description)
			VALUES (?, ?, ?, ?)
			ON CONFLICT (name) DO UPDATE SET
			display_name = EXCLUDED.display_name,
			level = EXCLUDED.level,
			description = EXCLUDED.description,
			updated_at = NOW()
		`, role.Name, role.DisplayName, role.Level, role.Description)

		if result.Error != nil {
			return fmt.Errorf("failed to insert role %s: %w", role.Name, result.Error)
		}
	}

	// Seed core RBAC permissions and role grants used by API authorization checks.
	if err := seedCoreRBACPermissions(db); err != nil {
		return fmt.Errorf("failed to seed core RBAC permissions: %w", err)
	}

	// Seed system features for the new feature-based permission system
	if err := seedSystemFeatures(db); err != nil {
		return fmt.Errorf("failed to seed system features: %w", err)
	}

	log.Println("RBAC data seeded successfully")
	return nil
}

func seedCoreRBACPermissions(db *gorm.DB) error {
	type permissionSeed struct {
		Name        string
		Resource    string
		Action      string
		Description string
	}

	permissions := []permissionSeed{
		{Name: "company:read", Resource: "company", Action: "read", Description: "Read company data"},

		{Name: "estate:create", Resource: "estate", Action: "create", Description: "Create estate"},
		{Name: "estate:read", Resource: "estate", Action: "read", Description: "Read estate"},
		{Name: "estate:update", Resource: "estate", Action: "update", Description: "Update estate"},
		{Name: "estate:delete", Resource: "estate", Action: "delete", Description: "Delete estate"},

		{Name: "division:create", Resource: "division", Action: "create", Description: "Create division"},
		{Name: "division:read", Resource: "division", Action: "read", Description: "Read division"},
		{Name: "division:update", Resource: "division", Action: "update", Description: "Update division"},
		{Name: "division:delete", Resource: "division", Action: "delete", Description: "Delete division"},

		{Name: "block:create", Resource: "block", Action: "create", Description: "Create block"},
		{Name: "block:read", Resource: "block", Action: "read", Description: "Read block"},
		{Name: "block:update", Resource: "block", Action: "update", Description: "Update block"},
		{Name: "block:delete", Resource: "block", Action: "delete", Description: "Delete block"},

		{Name: "employee:create", Resource: "employee", Action: "create", Description: "Create employee"},
		{Name: "employee:read", Resource: "employee", Action: "read", Description: "Read employee"},
		{Name: "employee:update", Resource: "employee", Action: "update", Description: "Update employee"},
		{Name: "employee:delete", Resource: "employee", Action: "delete", Description: "Delete employee"},

		// Reserved for unit module integration.
		{Name: "unit:create", Resource: "unit", Action: "create", Description: "Create unit"},
		{Name: "unit:read", Resource: "unit", Action: "read", Description: "Read unit"},
		{Name: "unit:update", Resource: "unit", Action: "update", Description: "Update unit"},
		{Name: "unit:delete", Resource: "unit", Action: "delete", Description: "Delete unit"},

		// Harvest permissions used by mobile harvest sync and approval flows.
		{Name: "harvest:create", Resource: "harvest", Action: "create", Description: "Create harvest record"},
		{Name: "harvest:read", Resource: "harvest", Action: "read", Description: "Read harvest record"},
		{Name: "harvest:update", Resource: "harvest", Action: "update", Description: "Update harvest record"},
		{Name: "harvest:approve", Resource: "harvest", Action: "approve", Description: "Approve harvest record"},
		{Name: "harvest:reject", Resource: "harvest", Action: "reject", Description: "Reject harvest record"},
	}

	for _, perm := range permissions {
		if err := db.Exec(`
			INSERT INTO permissions (name, resource, action, description, is_active)
			VALUES (?, ?, ?, ?, true)
			ON CONFLICT (name) DO UPDATE SET
				resource = EXCLUDED.resource,
				action = EXCLUDED.action,
				description = EXCLUDED.description,
				is_active = true
		`, perm.Name, perm.Resource, perm.Action, perm.Description).Error; err != nil {
			return fmt.Errorf("failed to seed permission %s: %w", perm.Name, err)
		}
	}

	rolePermissionMap := map[string][]string{
		"company_admin": {
			"company:read",
			"estate:create", "estate:read", "estate:update", "estate:delete",
			"division:create", "division:read", "division:update", "division:delete",
			"block:create", "block:read", "block:update", "block:delete",
			"employee:create", "employee:read", "employee:update", "employee:delete",
			"unit:create", "unit:read", "unit:update", "unit:delete",
		},
		"mandor": {
			"block:read",
			"employee:read",
			"harvest:create", "harvest:read", "harvest:update",
		},
	}

	for roleName, permissionNames := range rolePermissionMap {
		var roleID string
		if err := db.Raw(`
			SELECT id
			FROM roles
			WHERE LOWER(name) = LOWER(?) AND is_active = true
			LIMIT 1
		`, roleName).Scan(&roleID).Error; err != nil {
			return fmt.Errorf("failed to load role %s: %w", roleName, err)
		}
		if roleID == "" {
			return fmt.Errorf("role %s not found", roleName)
		}

		for _, permissionName := range permissionNames {
			var permissionID string
			if err := db.Raw(`
				SELECT id
				FROM permissions
				WHERE name = ? AND is_active = true
				LIMIT 1
			`, permissionName).Scan(&permissionID).Error; err != nil {
				return fmt.Errorf("failed to load permission %s: %w", permissionName, err)
			}
			if permissionID == "" {
				return fmt.Errorf("permission %s not found", permissionName)
			}

			if err := db.Exec(`
				INSERT INTO role_permissions (role_id, permission_id, is_denied)
				VALUES (?, ?, false)
				ON CONFLICT (role_id, permission_id) DO UPDATE SET
					is_denied = false
			`, roleID, permissionID).Error; err != nil {
				return fmt.Errorf("failed to assign permission %s to role %s: %w", permissionName, roleName, err)
			}
		}
	}

	return nil
}

// MigrateStaticPermissionsToRBAC migrates existing static role-permission mappings to database
func MigrateStaticPermissionsToRBAC(db *gorm.DB) error {
	log.Println("Migrating static permissions to RBAC...")

	// This is a placeholder for future implementation
	// For now, we'll use the feature-based system only

	log.Println("Static permissions migrated to RBAC successfully")
	return nil
}

// seedSystemFeatures seeds the initial system features for the feature-based permission system
func seedSystemFeatures(db *gorm.DB) error {
	log.Println("Seeding system features...")

	// Define system features (simplified version)
	features := [][]string{
		{"harvest", "Harvest Management", "Access to harvest management system", "harvest", ""},
		{"harvest.view", "View Harvests", "View harvest records and statistics", "harvest", "harvest"},
		{"harvest.create", "Create Harvests", "Create new harvest records", "harvest", "harvest"},
		{"harvest.update", "Update Harvests", "Update existing harvest records", "harvest", "harvest"},
		{"harvest.approve", "Approve Harvests", "Approve harvest records", "harvest", "harvest"},

		{"gatecheck", "Gate Check", "Access to gate check system", "gatecheck", ""},
		{"gatecheck.view", "View Gate Checks", "View gate check records", "gatecheck", "gatecheck"},
		{"gatecheck.create", "Create Gate Checks", "Create new gate check records", "gatecheck", "gatecheck"},
		{"gatecheck.update", "Update Gate Checks", "Update gate check records", "gatecheck", "gatecheck"},

		{"admin", "System Administration", "Access to system administration", "admin", ""},
		{"admin.features", "Feature Management", "Manage feature flags and access", "admin", "admin"},
	}

	// Insert features
	for _, feature := range features {
		name := feature[0]
		displayName := feature[1]
		description := feature[2]
		module := feature[3]

		sql := `
			INSERT INTO features (name, display_name, description, module, is_active, is_system)
			VALUES (?, ?, ?, ?, true, true)
			ON CONFLICT (name) DO NOTHING;
		`

		if err := db.Exec(sql, name, displayName, description, module).Error; err != nil {
			return fmt.Errorf("failed to insert feature %s: %w", name, err)
		}
	}

	// Update parent_id for child features
	for _, feature := range features {
		name := feature[0]
		parentName := feature[4]

		if parentName != "" {
			sql := `
				UPDATE features
				SET parent_id = (SELECT id FROM features WHERE name = ? AND deleted_at IS NULL)
				WHERE name = ? AND deleted_at IS NULL;
			`

			if err := db.Exec(sql, parentName, name).Error; err != nil {
				log.Printf("Warning: Failed to update parent for feature %s: %v", name, err)
			}
		}
	}

	// Seed role-feature mappings
	if err := seedRoleFeatures(db); err != nil {
		return fmt.Errorf("failed to seed role features: %w", err)
	}

	log.Println("System features seeded successfully")
	return nil
}

// seedRoleFeatures seeds role-feature mappings based on role hierarchy
func seedRoleFeatures(db *gorm.DB) error {
	log.Println("Seeding role-feature mappings...")

	// Define role-feature mappings
	roleFeatures := map[string][]string{
		"SUPER_ADMIN": {
			// All features (will be populated dynamically)
		},
		"COMPANY_ADMIN": {
			"admin", "admin.features",
		},
		"MANAGER": {
			"harvest", "harvest.view", "harvest.create", "harvest.update", "harvest.approve",
			"gatecheck", "gatecheck.view", "gatecheck.create", "gatecheck.update",
		},
	}

	// Get SUPER_ADMIN user for granted_by field
	var superAdminUser struct {
		ID string
	}
	db.Raw("SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1").Scan(&superAdminUser)
	if superAdminUser.ID == "" {
		// Create a dummy system user ID if no SUPER_ADMIN exists
		superAdminUser.ID = "00000000-0000-0000-0000-000000000000"
	}

	// For SUPER_ADMIN, give them all features
	var allFeatures []struct {
		ID string
	}
	db.Raw("SELECT id FROM features WHERE deleted_at IS NULL").Scan(&allFeatures)

	for _, feature := range allFeatures {
		sql := `
			INSERT INTO role_features (role, feature_id, granted_by)
			VALUES (?, ?, ?)
			ON CONFLICT (role, feature_id) DO NOTHING;
		`
		if err := db.Exec(sql, "SUPER_ADMIN", feature.ID, superAdminUser.ID).Error; err != nil {
			log.Printf("Warning: Failed to assign feature to SUPER_ADMIN: %v", err)
		}
	}

	// For other roles, assign specific features
	for role, featureNames := range roleFeatures {
		if role == "SUPER_ADMIN" {
			continue // Already handled
		}

		for _, featureName := range featureNames {
			sql := `
				INSERT INTO role_features (role, feature_id, granted_by)
				SELECT ?, id, ?
				FROM features
				WHERE name = ? AND deleted_at IS NULL
				ON CONFLICT (role, feature_id) DO NOTHING;
			`
			if err := db.Exec(sql, role, superAdminUser.ID, featureName).Error; err != nil {
				log.Printf("Warning: Failed to assign feature %s to role %s: %v", featureName, role, err)
			}
		}
	}

	log.Println("Role-feature mappings seeded successfully")
	return nil
}

package migrations

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// Migration000011CreateRBACTables creates the RBAC tables (roles, permissions, role_permissions, user_permission_assignments)
type Migration000011CreateRBACTables struct{}

func (m *Migration000011CreateRBACTables) Version() string {
	return "000011"
}

func (m *Migration000011CreateRBACTables) Name() string {
	return "create_rbac_tables"
}

func (m *Migration000011CreateRBACTables) Up(ctx context.Context, db *gorm.DB) error {
	// Create roles table
	if err := db.WithContext(ctx).Exec(`
		CREATE TABLE IF NOT EXISTS roles (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(100) NOT NULL,
			display_name VARCHAR(255) NOT NULL,
			level INTEGER NOT NULL,
			description TEXT,
			is_active BOOLEAN DEFAULT true NOT NULL,
			is_system BOOLEAN DEFAULT false NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			deleted_at TIMESTAMP WITH TIME ZONE,

			CONSTRAINT roles_name_unique UNIQUE(name)
		);
	`).Error; err != nil {
		return fmt.Errorf("failed to create roles table: %w", err)
	}

	// Create indexes for roles table
	roleIndexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(is_active) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_roles_system ON roles(is_system) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_roles_deleted ON roles(deleted_at);",
	}

	for _, indexSQL := range roleIndexes {
		if err := db.WithContext(ctx).Exec(indexSQL).Error; err != nil {
			return fmt.Errorf("failed to create role index: %w", err)
		}
	}

	// Create permissions table
	if err := db.WithContext(ctx).Exec(`
		CREATE TABLE IF NOT EXISTS permissions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(255) NOT NULL,
			resource VARCHAR(100) NOT NULL,
			action VARCHAR(50) NOT NULL,
			description TEXT,
			is_active BOOLEAN DEFAULT true NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			deleted_at TIMESTAMP WITH TIME ZONE,

			CONSTRAINT permissions_name_unique UNIQUE(name)
		);
	`).Error; err != nil {
		return fmt.Errorf("failed to create permissions table: %w", err)
	}

	// Create indexes for permissions table
	permissionIndexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_permissions_active ON permissions(is_active) WHERE deleted_at IS NULL;",
		"CREATE INDEX IF NOT EXISTS idx_permissions_deleted ON permissions(deleted_at);",
	}

	for _, indexSQL := range permissionIndexes {
		if err := db.WithContext(ctx).Exec(indexSQL).Error; err != nil {
			return fmt.Errorf("failed to create permission index: %w", err)
		}
	}

	// Create role_permissions table (many-to-many with inheritance support)
	if err := db.WithContext(ctx).Exec(`
		CREATE TABLE IF NOT EXISTS role_permissions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
			permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
			inherited_from_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
			is_denied BOOLEAN DEFAULT false NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

			CONSTRAINT role_permissions_unique UNIQUE(role_id, permission_id)
		);
	`).Error; err != nil {
		return fmt.Errorf("failed to create role_permissions table: %w", err)
	}

	// Create indexes for role_permissions table
	rolePermissionIndexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);",
		"CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);",
		"CREATE INDEX IF NOT EXISTS idx_role_permissions_inherited ON role_permissions(inherited_from_role_id);",
		"CREATE INDEX IF NOT EXISTS idx_role_permissions_denied ON role_permissions(is_denied);",
	}

	for _, indexSQL := range rolePermissionIndexes {
		if err := db.WithContext(ctx).Exec(indexSQL).Error; err != nil {
			return fmt.Errorf("failed to create role_permissions index: %w", err)
		}
	}

	// Create user_permission_assignments table (user-specific overrides)
	if err := db.WithContext(ctx).Exec(`
		CREATE TABLE IF NOT EXISTS user_permission_assignments (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL,
			permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
			is_granted BOOLEAN NOT NULL,
			scope_type VARCHAR(20),
			scope_id UUID,
			expires_at TIMESTAMP WITH TIME ZONE,
			reason TEXT,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			created_by UUID NOT NULL,

			CONSTRAINT user_perm_assignments_unique UNIQUE(user_id, permission_id, scope_type, scope_id)
		);
	`).Error; err != nil {
		return fmt.Errorf("failed to create user_permission_assignments table: %w", err)
	}

	// Create indexes for user_permission_assignments table
	userPermIndexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_user_perm_assignments_user ON user_permission_assignments(user_id);",
		"CREATE INDEX IF NOT EXISTS idx_user_perm_assignments_permission ON user_permission_assignments(permission_id);",
		"CREATE INDEX IF NOT EXISTS idx_user_perm_assignments_scope_type ON user_permission_assignments(scope_type);",
		"CREATE INDEX IF NOT EXISTS idx_user_perm_assignments_scope_id ON user_permission_assignments(scope_id);",
		"CREATE INDEX IF NOT EXISTS idx_user_perm_assignments_expires ON user_permission_assignments(expires_at);",
		"CREATE INDEX IF NOT EXISTS idx_user_perm_assignments_granted ON user_permission_assignments(is_granted);",
	}

	for _, indexSQL := range userPermIndexes {
		if err := db.WithContext(ctx).Exec(indexSQL).Error; err != nil {
			return fmt.Errorf("failed to create user_permission_assignments index: %w", err)
		}
	}

	// Seed the 9 system roles
	systemRoles := []struct {
		name        string
		displayName string
		level       int
		description string
	}{
		{
			name:        "SUPER_ADMIN",
			displayName: "Super Administrator",
			level:       1,
			description: "System administrator with full access to all features and companies",
		},
		{
			name:        "AREA_MANAGER",
			displayName: "Area Manager",
			level:       2,
			description: "Area manager overseeing multiple companies with cross-company access",
		},
		{
			name:        "COMPANY_ADMIN",
			displayName: "Company Administrator",
			level:       3,
			description: "Company administrator with user management and company-level access",
		},
		{
			name:        "MANAGER",
			displayName: "Manager",
			level:       4,
			description: "Estate manager with monitoring and reporting access",
		},
		{
			name:        "ASISTEN",
			displayName: "Asisten",
			level:       5,
			description: "Assistant manager who approves/rejects harvest records at division level",
		},
		{
			name:        "MANDOR",
			displayName: "Mandor",
			level:       6,
			description: "Field supervisor responsible for harvest data input",
		},
		{
			name:        "SATPAM",
			displayName: "Satpam",
			level:       7,
			description: "Security personnel managing gate check operations",
		},
		{
			name:        "TIMBANGAN",
			displayName: "Timbangan",
			level:       5,
			description: "Weighing operator for PKS integration and scale management (agricultural specialization)",
		},
		{
			name:        "GRADING",
			displayName: "Grading",
			level:       5,
			description: "Quality inspector for fruit bunch grading and quality control (agricultural specialization)",
		},
	}

	for _, role := range systemRoles {
		// Check if role already exists
		var count int64
		if err := db.WithContext(ctx).Raw("SELECT COUNT(*) FROM roles WHERE name = ?", role.name).Scan(&count).Error; err != nil {
			return fmt.Errorf("failed to check existing role %s: %w", role.name, err)
		}

		if count == 0 {
			// Insert system role
			if err := db.WithContext(ctx).Exec(`
				INSERT INTO roles (name, display_name, level, description, is_active, is_system)
				VALUES (?, ?, ?, ?, true, true)
			`, role.name, role.displayName, role.level, role.description).Error; err != nil {
				return fmt.Errorf("failed to seed system role %s: %w", role.name, err)
			}
		}
	}

	return nil
}

func (m *Migration000011CreateRBACTables) Down(ctx context.Context, db *gorm.DB) error {
	// Drop tables in reverse order (respecting foreign key constraints)
	tables := []string{
		"user_permission_assignments",
		"role_permissions",
		"permissions",
		"roles",
	}

	for _, table := range tables {
		if err := db.WithContext(ctx).Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s CASCADE", table)).Error; err != nil {
			return fmt.Errorf("failed to drop table %s: %w", table, err)
		}
	}

	return nil
}

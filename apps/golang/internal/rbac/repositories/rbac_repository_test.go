package repositories

import (
	"testing"
	"time"

	"agrinovagraphql/server/internal/rbac/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB creates an in-memory SQLite database for testing
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// Auto-migrate test tables
	err = db.AutoMigrate(
		&models.Role{},
		&models.Permission{},
		&models.RolePermission{},
		&models.UserPermissionAssignment{},
	)
	require.NoError(t, err)

	return db
}

// seedTestData creates sample data for testing
func seedTestData(t *testing.T, db *gorm.DB) (role1, role2 *models.Role, perm1, perm2 *models.Permission) {
	role1 = &models.Role{
		ID:          uuid.New(),
		Name:        "TEST_ADMIN",
		DisplayName: "Test Admin",
		Level:       1,
		Description: "Test admin role",
		IsActive:    true,
		IsSystem:    true,
	}
	require.NoError(t, db.Create(role1).Error)

	role2 = &models.Role{
		ID:          uuid.New(),
		Name:        "TEST_USER",
		DisplayName: "Test User",
		Level:       2,
		Description: "Test user role",
		IsActive:    true,
		IsSystem:    false,
	}
	require.NoError(t, db.Create(role2).Error)

	perm1 = &models.Permission{
		ID:          uuid.New(),
		Name:        "test:read",
		Resource:    "test",
		Action:      "read",
		Description: "Test read permission",
		IsActive:    true,
	}
	require.NoError(t, db.Create(perm1).Error)

	perm2 = &models.Permission{
		ID:          uuid.New(),
		Name:        "test:write",
		Resource:    "test",
		Action:      "write",
		Description: "Test write permission",
		IsActive:    true,
	}
	require.NoError(t, db.Create(perm2).Error)

	return
}

func TestCreateRole(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	t.Run("Success - Create new role", func(t *testing.T) {
		role := &models.Role{
			ID:          uuid.New(),
			Name:        "NEW_ROLE",
			DisplayName: "New Role",
			Level:       3,
			Description: "A new test role",
			IsActive:    true,
			IsSystem:    false,
		}

		err := repo.CreateRole(role)
		assert.NoError(t, err)

		// Verify role was created
		var found models.Role
		err = db.First(&found, "name = ?", "NEW_ROLE").Error
		assert.NoError(t, err)
		assert.Equal(t, "NEW_ROLE", found.Name)
		assert.Equal(t, "New Role", found.DisplayName)
		assert.Equal(t, 3, found.Level)
	})

	t.Run("Error - Duplicate role name", func(t *testing.T) {
		role1 := &models.Role{
			ID:          uuid.New(),
			Name:        "DUPLICATE_ROLE",
			DisplayName: "Duplicate Role",
			Level:       4,
			IsActive:    true,
		}
		err := repo.CreateRole(role1)
		require.NoError(t, err)

		// Try to create another role with same name
		role2 := &models.Role{
			ID:          uuid.New(),
			Name:        "DUPLICATE_ROLE",
			DisplayName: "Another Duplicate",
			Level:       5,
			IsActive:    true,
		}
		err = repo.CreateRole(role2)
		assert.ErrorIs(t, err, ErrRoleAlreadyExists)
	})
}

func TestUpdateRole(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	role1, _, _, _ := seedTestData(t, db)

	t.Run("Success - Update existing role", func(t *testing.T) {
		role1.DisplayName = "Updated Admin"
		role1.Description = "Updated description"
		role1.IsActive = false

		err := repo.UpdateRole(role1)
		assert.NoError(t, err)

		// Verify changes
		var found models.Role
		err = db.First(&found, role1.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, "Updated Admin", found.DisplayName)
		assert.Equal(t, "Updated description", found.Description)
		assert.False(t, found.IsActive)
	})

	t.Run("Error - Update non-existent role", func(t *testing.T) {
		nonExistent := &models.Role{
			ID:          uuid.New(),
			Name:        "NON_EXISTENT",
			DisplayName: "Non Existent",
			Level:       10,
		}

		err := repo.UpdateRole(nonExistent)
		assert.ErrorIs(t, err, ErrRoleNotFound)
	})
}

func TestDeleteRole(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	role1, role2, _, _ := seedTestData(t, db)

	t.Run("Error - Cannot delete system role", func(t *testing.T) {
		err := repo.DeleteRole(role1.ID) // role1 is system role
		assert.ErrorIs(t, err, ErrSystemRoleDeletion)

		// Verify role still exists
		var found models.Role
		err = db.First(&found, role1.ID).Error
		assert.NoError(t, err)
	})

	t.Run("Success - Delete custom role", func(t *testing.T) {
		err := repo.DeleteRole(role2.ID) // role2 is not system role
		assert.NoError(t, err)

		// Verify role is soft-deleted
		var found models.Role
		err = db.Unscoped().First(&found, role2.ID).Error
		assert.NoError(t, err)
		assert.NotNil(t, found.DeletedAt)
	})

	t.Run("Error - Delete non-existent role", func(t *testing.T) {
		err := repo.DeleteRole(uuid.New())
		assert.ErrorIs(t, err, ErrRoleNotFound)
	})
}

func TestGetRoleByID(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	role1, _, _, _ := seedTestData(t, db)

	t.Run("Success - Get existing role", func(t *testing.T) {
		found, err := repo.GetRoleByID(role1.ID)
		assert.NoError(t, err)
		assert.Equal(t, role1.Name, found.Name)
		assert.Equal(t, role1.DisplayName, found.DisplayName)
	})

	t.Run("Error - Get non-existent role", func(t *testing.T) {
		_, err := repo.GetRoleByID(uuid.New())
		assert.ErrorIs(t, err, ErrRoleNotFound)
	})
}

func TestGetRoleByName(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	role1, _, _, _ := seedTestData(t, db)

	t.Run("Success - Get existing role by name", func(t *testing.T) {
		found, err := repo.GetRoleByName("TEST_ADMIN")
		assert.NoError(t, err)
		assert.Equal(t, role1.ID, found.ID)
		assert.Equal(t, "Test Admin", found.DisplayName)
	})

	t.Run("Error - Get non-existent role", func(t *testing.T) {
		_, err := repo.GetRoleByName("NON_EXISTENT")
		assert.ErrorIs(t, err, ErrRoleNotFound)
	})
}

func TestGetAllRoles(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	role1, role2, _, _ := seedTestData(t, db)

	t.Run("Success - Get all roles", func(t *testing.T) {
		roles, err := repo.GetAllRoles(false)
		assert.NoError(t, err)
		assert.Len(t, roles, 2)
	})

	t.Run("Success - Get active roles only", func(t *testing.T) {
		// Deactivate role2
		role2.IsActive = false
		require.NoError(t, db.Save(role2).Error)

		roles, err := repo.GetAllRoles(true)
		assert.NoError(t, err)
		assert.Len(t, roles, 1)
		assert.Equal(t, role1.Name, roles[0].Name)
	})
}

func TestGetRolesByLevel(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	seedTestData(t, db)

	t.Run("Success - Get roles at level 1", func(t *testing.T) {
		roles, err := repo.GetRolesByLevel(1)
		assert.NoError(t, err)
		assert.Len(t, roles, 1)
		assert.Equal(t, "TEST_ADMIN", roles[0].Name)
	})

	t.Run("Success - Get roles at level 2", func(t *testing.T) {
		roles, err := repo.GetRolesByLevel(2)
		assert.NoError(t, err)
		assert.Len(t, roles, 1)
		assert.Equal(t, "TEST_USER", roles[0].Name)
	})

	t.Run("Success - No roles at level 99", func(t *testing.T) {
		roles, err := repo.GetRolesByLevel(99)
		assert.NoError(t, err)
		assert.Len(t, roles, 0)
	})
}

func TestCreatePermission(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	t.Run("Success - Create new permission", func(t *testing.T) {
		perm := &models.Permission{
			ID:          uuid.New(),
			Name:        "user:create",
			Resource:    "user",
			Action:      "create",
			Description: "Create users",
			IsActive:    true,
		}

		err := repo.CreatePermission(perm)
		assert.NoError(t, err)

		// Verify permission was created
		var found models.Permission
		err = db.First(&found, "name = ?", "user:create").Error
		assert.NoError(t, err)
		assert.Equal(t, "user", found.Resource)
		assert.Equal(t, "create", found.Action)
	})

	t.Run("Error - Duplicate permission name", func(t *testing.T) {
		perm1 := &models.Permission{
			ID:       uuid.New(),
			Name:     "duplicate:perm",
			Resource: "test",
			Action:   "read",
			IsActive: true,
		}
		err := repo.CreatePermission(perm1)
		require.NoError(t, err)

		// Try to create another permission with same name
		perm2 := &models.Permission{
			ID:       uuid.New(),
			Name:     "duplicate:perm",
			Resource: "test",
			Action:   "write",
			IsActive: true,
		}
		err = repo.CreatePermission(perm2)
		assert.ErrorIs(t, err, ErrPermissionAlreadyExists)
	})
}

func TestAssignRolePermissions(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	role1, _, perm1, perm2 := seedTestData(t, db)

	t.Run("Success - Assign multiple permissions to role", func(t *testing.T) {
		err := repo.AssignRolePermissions(role1.ID, []uuid.UUID{perm1.ID, perm2.ID})
		assert.NoError(t, err)

		// Verify assignments
		perms, err := repo.GetRolePermissions(role1.ID)
		assert.NoError(t, err)
		assert.Len(t, perms, 2)
	})

	t.Run("Success - Idempotent assignment", func(t *testing.T) {
		// Assign again - should not error
		err := repo.AssignRolePermissions(role1.ID, []uuid.UUID{perm1.ID})
		assert.NoError(t, err)

		// Verify still only 2 permissions
		perms, err := repo.GetRolePermissions(role1.ID)
		assert.NoError(t, err)
		assert.Len(t, perms, 2)
	})

	t.Run("Error - Assign to non-existent role", func(t *testing.T) {
		err := repo.AssignRolePermissions(uuid.New(), []uuid.UUID{perm1.ID})
		assert.ErrorIs(t, err, ErrRoleNotFound)
	})
}

func TestRemoveRolePermissions(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	role1, _, perm1, perm2 := seedTestData(t, db)

	// Assign permissions first
	require.NoError(t, repo.AssignRolePermissions(role1.ID, []uuid.UUID{perm1.ID, perm2.ID}))

	t.Run("Success - Remove single permission", func(t *testing.T) {
		err := repo.RemoveRolePermissions(role1.ID, []uuid.UUID{perm1.ID})
		assert.NoError(t, err)

		// Verify only perm2 remains
		perms, err := repo.GetRolePermissions(role1.ID)
		assert.NoError(t, err)
		assert.Len(t, perms, 1)
		assert.Equal(t, perm2.ID, perms[0].ID)
	})
}

func TestGetRolePermissionNames(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	role1, _, perm1, perm2 := seedTestData(t, db)

	// Assign permissions
	require.NoError(t, repo.AssignRolePermissions(role1.ID, []uuid.UUID{perm1.ID, perm2.ID}))

	t.Run("Success - Get permission names", func(t *testing.T) {
		names, err := repo.GetRolePermissionNames(role1.ID)
		assert.NoError(t, err)
		assert.Len(t, names, 2)
		assert.Contains(t, names, "test:read")
		assert.Contains(t, names, "test:write")
	})
}

func TestCreateUserPermissionOverride(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	_, _, perm1, _ := seedTestData(t, db)
	userID := uuid.New()
	creatorID := uuid.New()

	t.Run("Success - Create user override", func(t *testing.T) {
		expiresAt := time.Now().Add(24 * time.Hour)
		reason := "Testing override"
		scopeType := "estate"
		scopeID := uuid.New()

		override := &models.UserPermissionAssignment{
			ID:           uuid.New(),
			UserID:       userID,
			PermissionID: perm1.ID,
			IsGranted:    true,
			ScopeType:    scopeType,
			ScopeID:      &scopeID,
			ExpiresAt:    &expiresAt,
			Reason:       &reason,
			CreatedBy:    creatorID,
		}

		err := repo.CreateUserPermissionOverride(override)
		assert.NoError(t, err)

		// Verify override was created
		overrides, err := repo.GetUserPermissionOverrides(userID)
		assert.NoError(t, err)
		assert.Len(t, overrides, 1)
		assert.Equal(t, perm1.ID, overrides[0].PermissionID)
		assert.True(t, overrides[0].IsGranted)
	})
}

func TestGetActiveUserPermissionOverrides(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	_, _, perm1, perm2 := seedTestData(t, db)
	userID := uuid.New()
	creatorID := uuid.New()

	t.Run("Success - Get only active overrides", func(t *testing.T) {
		// Create active override (expires in future)
		futureExpiry := time.Now().Add(24 * time.Hour)
		activeOverride := &models.UserPermissionAssignment{
			ID:           uuid.New(),
			UserID:       userID,
			PermissionID: perm1.ID,
			IsGranted:    true,
			ExpiresAt:    &futureExpiry,
			CreatedBy:    creatorID,
		}
		require.NoError(t, repo.CreateUserPermissionOverride(activeOverride))

		// Create expired override
		pastExpiry := time.Now().Add(-24 * time.Hour)
		expiredOverride := &models.UserPermissionAssignment{
			ID:           uuid.New(),
			UserID:       userID,
			PermissionID: perm2.ID,
			IsGranted:    true,
			ExpiresAt:    &pastExpiry,
			CreatedBy:    creatorID,
		}
		require.NoError(t, repo.CreateUserPermissionOverride(expiredOverride))

		// Get active overrides
		overrides, err := repo.GetActiveUserPermissionOverrides(userID)
		assert.NoError(t, err)
		assert.Len(t, overrides, 1)
		assert.Equal(t, perm1.ID, overrides[0].PermissionID)
	})
}

func TestClearUserPermissionOverrides(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	_, _, perm1, perm2 := seedTestData(t, db)
	userID := uuid.New()
	creatorID := uuid.New()

	// Create multiple overrides
	for _, permID := range []uuid.UUID{perm1.ID, perm2.ID} {
		override := &models.UserPermissionAssignment{
			ID:           uuid.New(),
			UserID:       userID,
			PermissionID: permID,
			IsGranted:    true,
			CreatedBy:    creatorID,
		}
		require.NoError(t, repo.CreateUserPermissionOverride(override))
	}

	t.Run("Success - Clear all user overrides", func(t *testing.T) {
		err := repo.ClearUserPermissionOverrides(userID)
		assert.NoError(t, err)

		// Verify all overrides are gone
		overrides, err := repo.GetUserPermissionOverrides(userID)
		assert.NoError(t, err)
		assert.Len(t, overrides, 0)
	})
}

func TestGetRBACStats(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	role1, role2, perm1, perm2 := seedTestData(t, db)
	userID := uuid.New()
	creatorID := uuid.New()

	// Assign permissions to role1
	require.NoError(t, repo.AssignRolePermissions(role1.ID, []uuid.UUID{perm1.ID, perm2.ID}))

	// Create user overrides
	futureExpiry := time.Now().Add(24 * time.Hour)
	pastExpiry := time.Now().Add(-24 * time.Hour)

	activeOverride := &models.UserPermissionAssignment{
		ID:           uuid.New(),
		UserID:       userID,
		PermissionID: perm1.ID,
		IsGranted:    true,
		ExpiresAt:    &futureExpiry,
		CreatedBy:    creatorID,
	}
	require.NoError(t, repo.CreateUserPermissionOverride(activeOverride))

	expiredOverride := &models.UserPermissionAssignment{
		ID:           uuid.New(),
		UserID:       userID,
		PermissionID: perm2.ID,
		IsGranted:    false,
		ExpiresAt:    &pastExpiry,
		CreatedBy:    creatorID,
	}
	require.NoError(t, repo.CreateUserPermissionOverride(expiredOverride))

	t.Run("Success - Get comprehensive stats", func(t *testing.T) {
		stats, err := repo.GetRBACStats()
		assert.NoError(t, err)
		assert.NotNil(t, stats)

		// Verify role stats
		assert.Equal(t, int64(2), stats.TotalRoles)
		assert.Equal(t, int64(2), stats.ActiveRoles)
		assert.Equal(t, int64(1), stats.SystemRoles) // role1 is system
		assert.Equal(t, int64(1), stats.CustomRoles) // role2 is custom

		// Verify permission stats
		assert.Equal(t, int64(2), stats.TotalPermissions)
		assert.Equal(t, int64(2), stats.ActivePermissions)

		// Verify role-permission assignments
		assert.Equal(t, int64(2), stats.TotalRolePermissions)

		// Verify user overrides
		assert.Equal(t, int64(2), stats.TotalUserOverrides)
		assert.Equal(t, int64(1), stats.ActiveUserOverrides)
		assert.Equal(t, int64(1), stats.ExpiredUserOverrides)
	})
}

func TestCleanupExpiredOverrides(t *testing.T) {
	db := setupTestDB(t)
	repo := NewRBACRepository(db)

	_, _, perm1, perm2 := seedTestData(t, db)
	userID := uuid.New()
	creatorID := uuid.New()

	// Create active and expired overrides
	futureExpiry := time.Now().Add(24 * time.Hour)
	pastExpiry := time.Now().Add(-24 * time.Hour)

	activeOverride := &models.UserPermissionAssignment{
		ID:           uuid.New(),
		UserID:       userID,
		PermissionID: perm1.ID,
		IsGranted:    true,
		ExpiresAt:    &futureExpiry,
		CreatedBy:    creatorID,
	}
	require.NoError(t, repo.CreateUserPermissionOverride(activeOverride))

	expiredOverride := &models.UserPermissionAssignment{
		ID:           uuid.New(),
		UserID:       userID,
		PermissionID: perm2.ID,
		IsGranted:    true,
		ExpiresAt:    &pastExpiry,
		CreatedBy:    creatorID,
	}
	require.NoError(t, repo.CreateUserPermissionOverride(expiredOverride))

	t.Run("Success - Cleanup expired overrides", func(t *testing.T) {
		deleted, err := repo.CleanupExpiredOverrides()
		assert.NoError(t, err)
		assert.Equal(t, int64(1), deleted)

		// Verify only active override remains
		overrides, err := repo.GetUserPermissionOverrides(userID)
		assert.NoError(t, err)
		assert.Len(t, overrides, 1)
		assert.Equal(t, perm1.ID, overrides[0].PermissionID)
	})
}

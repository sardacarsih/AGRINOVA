package services

import (
	"context"
	"testing"

	"agrinovagraphql/server/internal/rbac/models"
	"agrinovagraphql/server/internal/rbac/repositories"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// RBACHierarchyTestSuite tests role hierarchy functionality
type RBACHierarchyTestSuite struct {
	suite.Suite
	db          *gorm.DB
	service     *RBACService
	repository  *repositories.RBACRepository

	// Test roles at different levels
	superAdminRole  *models.Role
	companyAdminRole *models.Role
	areaManagerRole *models.Role
	managerRole     *models.Role
	asistenRole     *models.Role
	mandorRole      *models.Role
	satpamRole      *models.Role

	// Test permissions
	perm1 *models.Permission
	perm2 *models.Permission
	perm3 *models.Permission
	perm4 *models.Permission
}

// SetupSuite runs once before all tests
func (suite *RBACHierarchyTestSuite) SetupSuite() {
	// Create in-memory SQLite database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	suite.Require().NoError(err)

	suite.db = db

	// Auto-migrate schemas
	err = db.AutoMigrate(
		&models.Role{},
		&models.Permission{},
		&models.RolePermission{},
	)
	suite.Require().NoError(err)

	suite.repository = repositories.NewRBACRepository(db)
	suite.service = NewRBACService(db)
}

// SetupTest runs before each test
func (suite *RBACHierarchyTestSuite) SetupTest() {
	// Create test roles with proper hierarchy levels
	suite.superAdminRole = &models.Role{
		ID:          uuid.New(),
		Name:        "SUPER_ADMIN",
		DisplayName: "Super Administrator",
		Level:       1,
		IsActive:    true,
		IsSystem:    true,
	}
	suite.Require().NoError(suite.db.Create(suite.superAdminRole).Error)

	suite.companyAdminRole = &models.Role{
		ID:          uuid.New(),
		Name:        "COMPANY_ADMIN",
		DisplayName: "Company Administrator",
		Level:       2,
		IsActive:    true,
		IsSystem:    true,
	}
	suite.Require().NoError(suite.db.Create(suite.companyAdminRole).Error)

	suite.areaManagerRole = &models.Role{
		ID:          uuid.New(),
		Name:        "AREA_MANAGER",
		DisplayName: "Area Manager",
		Level:       3,
		IsActive:    true,
		IsSystem:    true,
	}
	suite.Require().NoError(suite.db.Create(suite.areaManagerRole).Error)

	suite.managerRole = &models.Role{
		ID:          uuid.New(),
		Name:        "MANAGER",
		DisplayName: "Estate Manager",
		Level:       4,
		IsActive:    true,
		IsSystem:    false,
	}
	suite.Require().NoError(suite.db.Create(suite.managerRole).Error)

	suite.asistenRole = &models.Role{
		ID:          uuid.New(),
		Name:        "ASISTEN",
		DisplayName: "Assistant Manager",
		Level:       5,
		IsActive:    true,
		IsSystem:    false,
	}
	suite.Require().NoError(suite.db.Create(suite.asistenRole).Error)

	suite.mandorRole = &models.Role{
		ID:          uuid.New(),
		Name:        "MANDOR",
		DisplayName: "Field Supervisor",
		Level:       6,
		IsActive:    true,
		IsSystem:    false,
	}
	suite.Require().NoError(suite.db.Create(suite.mandorRole).Error)

	suite.satpamRole = &models.Role{
		ID:          uuid.New(),
		Name:        "SATPAM",
		DisplayName: "Security Guard",
		Level:       7,
		IsActive:    true,
		IsSystem:    false,
	}
	suite.Require().NoError(suite.db.Create(suite.satpamRole).Error)

	// Create test permissions
	suite.perm1 = &models.Permission{
		ID:       uuid.New(),
		Name:     "harvest.create",
		Resource: "harvest",
		Action:   "create",
		IsActive: true,
	}
	suite.Require().NoError(suite.db.Create(suite.perm1).Error)

	suite.perm2 = &models.Permission{
		ID:       uuid.New(),
		Name:     "harvest.approve",
		Resource: "harvest",
		Action:   "approve",
		IsActive: true,
	}
	suite.Require().NoError(suite.db.Create(suite.perm2).Error)

	suite.perm3 = &models.Permission{
		ID:       uuid.New(),
		Name:     "user.manage",
		Resource: "user",
		Action:   "manage",
		IsActive: true,
	}
	suite.Require().NoError(suite.db.Create(suite.perm3).Error)

	suite.perm4 = &models.Permission{
		ID:       uuid.New(),
		Name:     "report.view",
		Resource: "report",
		Action:   "view",
		IsActive: true,
	}
	suite.Require().NoError(suite.db.Create(suite.perm4).Error)

	// Assign permissions to roles
	// SUPER_ADMIN gets all permissions
	suite.assignPermission(suite.superAdminRole.ID, suite.perm1.ID)
	suite.assignPermission(suite.superAdminRole.ID, suite.perm2.ID)
	suite.assignPermission(suite.superAdminRole.ID, suite.perm3.ID)
	suite.assignPermission(suite.superAdminRole.ID, suite.perm4.ID)

	// MANAGER gets harvest permissions
	suite.assignPermission(suite.managerRole.ID, suite.perm1.ID)
	suite.assignPermission(suite.managerRole.ID, suite.perm2.ID)

	// MANDOR gets only create permission
	suite.assignPermission(suite.mandorRole.ID, suite.perm1.ID)
}

// TearDownTest runs after each test
func (suite *RBACHierarchyTestSuite) TearDownTest() {
	// Clean up database
	suite.db.Exec("DELETE FROM role_permissions")
	suite.db.Exec("DELETE FROM permissions")
	suite.db.Exec("DELETE FROM roles")
}

// TearDownSuite runs once after all tests
func (suite *RBACHierarchyTestSuite) TearDownSuite() {
	sqlDB, _ := suite.db.DB()
	sqlDB.Close()
}

// Helper function to assign permission to role
func (suite *RBACHierarchyTestSuite) assignPermission(roleID, permID uuid.UUID) {
	rp := &models.RolePermission{
		ID:           uuid.New(),
		RoleID:       roleID,
		PermissionID: permID,
		IsDenied:     false,
	}
	suite.Require().NoError(suite.db.Create(rp).Error)
}

// ============================================================================
// TEST: GetRolesAbove
// ============================================================================

func (suite *RBACHierarchyTestSuite) TestGetRolesAbove_MANDOR() {
	ctx := context.Background()

	roles, err := suite.service.GetRolesAbove(ctx, "MANDOR")
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	// MANDOR is level 6, so roles above should be levels 1-5
	suite.Require().Len(roles, 5)

	// Verify roles are returned in order (level ASC)
	suite.Equal("SUPER_ADMIN", roles[0].Name)
	suite.Equal("COMPANY_ADMIN", roles[1].Name)
	suite.Equal("AREA_MANAGER", roles[2].Name)
	suite.Equal("MANAGER", roles[3].Name)
	suite.Equal("ASISTEN", roles[4].Name)
}

func (suite *RBACHierarchyTestSuite) TestGetRolesAbove_MANAGER() {
	ctx := context.Background()

	roles, err := suite.service.GetRolesAbove(ctx, "MANAGER")
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	// MANAGER is level 4, so roles above should be levels 1-3
	suite.Require().Len(roles, 3)

	suite.Equal("SUPER_ADMIN", roles[0].Name)
	suite.Equal("COMPANY_ADMIN", roles[1].Name)
	suite.Equal("AREA_MANAGER", roles[2].Name)
}

func (suite *RBACHierarchyTestSuite) TestGetRolesAbove_SUPER_ADMIN() {
	ctx := context.Background()

	roles, err := suite.service.GetRolesAbove(ctx, "SUPER_ADMIN")
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	// SUPER_ADMIN is level 1, no roles above
	suite.Require().Len(roles, 0)
}

func (suite *RBACHierarchyTestSuite) TestGetRolesAbove_NonExistentRole() {
	ctx := context.Background()

	roles, err := suite.service.GetRolesAbove(ctx, "NON_EXISTENT")
	suite.Require().Error(err)
	suite.Require().Nil(roles)
	suite.Contains(err.Error(), "role not found")
}

// ============================================================================
// TEST: GetRolesBelow
// ============================================================================

func (suite *RBACHierarchyTestSuite) TestGetRolesBelow_SUPER_ADMIN() {
	ctx := context.Background()

	roles, err := suite.service.GetRolesBelow(ctx, "SUPER_ADMIN")
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	// SUPER_ADMIN is level 1, all other roles are below
	suite.Require().Len(roles, 6)

	suite.Equal("COMPANY_ADMIN", roles[0].Name)
	suite.Equal("SATPAM", roles[5].Name)
}

func (suite *RBACHierarchyTestSuite) TestGetRolesBelow_MANAGER() {
	ctx := context.Background()

	roles, err := suite.service.GetRolesBelow(ctx, "MANAGER")
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	// MANAGER is level 4, roles below are levels 5-7
	suite.Require().Len(roles, 3)

	suite.Equal("ASISTEN", roles[0].Name)
	suite.Equal("MANDOR", roles[1].Name)
	suite.Equal("SATPAM", roles[2].Name)
}

func (suite *RBACHierarchyTestSuite) TestGetRolesBelow_SATPAM() {
	ctx := context.Background()

	roles, err := suite.service.GetRolesBelow(ctx, "SATPAM")
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	// SATPAM is level 7, no roles below
	suite.Require().Len(roles, 0)
}

// ============================================================================
// TEST: GetSubordinateRoles
// ============================================================================

func (suite *RBACHierarchyTestSuite) TestGetSubordinateRoles_SUPER_ADMIN() {
	ctx := context.Background()

	roles, err := suite.service.GetSubordinateRoles(ctx, "SUPER_ADMIN")
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	// Direct subordinates of SUPER_ADMIN (level 1) are at level 2
	suite.Require().Len(roles, 1)
	suite.Equal("COMPANY_ADMIN", roles[0].Name)
}

func (suite *RBACHierarchyTestSuite) TestGetSubordinateRoles_MANAGER() {
	ctx := context.Background()

	roles, err := suite.service.GetSubordinateRoles(ctx, "MANAGER")
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	// Direct subordinates of MANAGER (level 4) are at level 5
	suite.Require().Len(roles, 1)
	suite.Equal("ASISTEN", roles[0].Name)
}

func (suite *RBACHierarchyTestSuite) TestGetSubordinateRoles_SATPAM() {
	ctx := context.Background()

	roles, err := suite.service.GetSubordinateRoles(ctx, "SATPAM")
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	// SATPAM is lowest level, no subordinates
	suite.Require().Len(roles, 0)
}

// ============================================================================
// TEST: GetSuperiorRoles
// ============================================================================

func (suite *RBACHierarchyTestSuite) TestGetSuperiorRoles_SATPAM() {
	ctx := context.Background()

	roles, err := suite.service.GetSuperiorRoles(ctx, "SATPAM")
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	// Direct superior of SATPAM (level 7) is at level 6
	suite.Require().Len(roles, 1)
	suite.Equal("MANDOR", roles[0].Name)
}

func (suite *RBACHierarchyTestSuite) TestGetSuperiorRoles_MANDOR() {
	ctx := context.Background()

	roles, err := suite.service.GetSuperiorRoles(ctx, "MANDOR")
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	// Direct superior of MANDOR (level 6) is at level 5
	suite.Require().Len(roles, 1)
	suite.Equal("ASISTEN", roles[0].Name)
}

func (suite *RBACHierarchyTestSuite) TestGetSuperiorRoles_SUPER_ADMIN() {
	ctx := context.Background()

	roles, err := suite.service.GetSuperiorRoles(ctx, "SUPER_ADMIN")
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	// SUPER_ADMIN is highest level, no superiors
	suite.Require().Len(roles, 0)
}

// ============================================================================
// TEST: GetRolesAtLevel
// ============================================================================

func (suite *RBACHierarchyTestSuite) TestGetRolesAtLevel_1() {
	ctx := context.Background()

	roles, err := suite.service.GetRolesAtLevel(ctx, 1)
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	suite.Require().Len(roles, 1)
	suite.Equal("SUPER_ADMIN", roles[0].Name)
}

func (suite *RBACHierarchyTestSuite) TestGetRolesAtLevel_4() {
	ctx := context.Background()

	roles, err := suite.service.GetRolesAtLevel(ctx, 4)
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	suite.Require().Len(roles, 1)
	suite.Equal("MANAGER", roles[0].Name)
}

func (suite *RBACHierarchyTestSuite) TestGetRolesAtLevel_NonExistent() {
	ctx := context.Background()

	roles, err := suite.service.GetRolesAtLevel(ctx, 99)
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	// No roles at level 99
	suite.Require().Len(roles, 0)
}

// ============================================================================
// TEST: GetRolesByLevelRange
// ============================================================================

func (suite *RBACHierarchyTestSuite) TestGetRolesByLevelRange_1_to_3() {
	ctx := context.Background()

	roles, err := suite.service.GetRolesByLevelRange(ctx, 1, 3)
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	// Levels 1-3 include SUPER_ADMIN, COMPANY_ADMIN, AREA_MANAGER
	suite.Require().Len(roles, 3)

	suite.Equal("SUPER_ADMIN", roles[0].Name)
	suite.Equal("COMPANY_ADMIN", roles[1].Name)
	suite.Equal("AREA_MANAGER", roles[2].Name)
}

func (suite *RBACHierarchyTestSuite) TestGetRolesByLevelRange_5_to_7() {
	ctx := context.Background()

	roles, err := suite.service.GetRolesByLevelRange(ctx, 5, 7)
	suite.Require().NoError(err)
	suite.Require().NotNil(roles)

	// Levels 5-7 include ASISTEN, MANDOR, SATPAM
	suite.Require().Len(roles, 3)

	suite.Equal("ASISTEN", roles[0].Name)
	suite.Equal("MANDOR", roles[1].Name)
	suite.Equal("SATPAM", roles[2].Name)
}

func (suite *RBACHierarchyTestSuite) TestGetRolesByLevelRange_InvalidRange() {
	ctx := context.Background()

	roles, err := suite.service.GetRolesByLevelRange(ctx, 5, 3)
	suite.Require().Error(err)
	suite.Require().Nil(roles)
	suite.Contains(err.Error(), "invalid level range")
}

// ============================================================================
// TEST: CanRoleManageRole
// ============================================================================

func (suite *RBACHierarchyTestSuite) TestCanRoleManageRole_MANAGER_Can_Manage_MANDOR() {
	ctx := context.Background()

	canManage, err := suite.service.CanRoleManageRole(ctx, "MANAGER", "MANDOR")
	suite.Require().NoError(err)
	suite.True(canManage, "MANAGER (level 4) should be able to manage MANDOR (level 6)")
}

func (suite *RBACHierarchyTestSuite) TestCanRoleManageRole_MANDOR_Cannot_Manage_MANAGER() {
	ctx := context.Background()

	canManage, err := suite.service.CanRoleManageRole(ctx, "MANDOR", "MANAGER")
	suite.Require().NoError(err)
	suite.False(canManage, "MANDOR (level 6) should NOT be able to manage MANAGER (level 4)")
}

func (suite *RBACHierarchyTestSuite) TestCanRoleManageRole_SUPER_ADMIN_Can_Manage_All() {
	ctx := context.Background()

	// Test against all other roles
	testRoles := []string{"COMPANY_ADMIN", "AREA_MANAGER", "MANAGER", "ASISTEN", "MANDOR", "SATPAM"}

	for _, targetRole := range testRoles {
		canManage, err := suite.service.CanRoleManageRole(ctx, "SUPER_ADMIN", targetRole)
		suite.Require().NoError(err)
		suite.True(canManage, "SUPER_ADMIN should be able to manage %s", targetRole)
	}
}

func (suite *RBACHierarchyTestSuite) TestCanRoleManageRole_Equal_Levels() {
	ctx := context.Background()

	canManage, err := suite.service.CanRoleManageRole(ctx, "MANAGER", "MANAGER")
	suite.Require().NoError(err)
	suite.False(canManage, "MANAGER should NOT be able to manage another MANAGER (same level)")
}

// ============================================================================
// TEST: GetRoleRelationship
// ============================================================================

func (suite *RBACHierarchyTestSuite) TestGetRoleRelationship_Superior() {
	ctx := context.Background()

	relationship, err := suite.service.GetRoleRelationship(ctx, "MANAGER", "MANDOR")
	suite.Require().NoError(err)
	suite.Require().NotNil(relationship)

	suite.Equal("MANAGER", relationship.SourceRole)
	suite.Equal("MANDOR", relationship.TargetRole)
	suite.True(relationship.CanManage)
	suite.Equal(-2, relationship.LevelDifference) // 4 - 6 = -2
	suite.Equal("superior", relationship.Relationship)
}

func (suite *RBACHierarchyTestSuite) TestGetRoleRelationship_Subordinate() {
	ctx := context.Background()

	relationship, err := suite.service.GetRoleRelationship(ctx, "MANDOR", "MANAGER")
	suite.Require().NoError(err)
	suite.Require().NotNil(relationship)

	suite.Equal("MANDOR", relationship.SourceRole)
	suite.Equal("MANAGER", relationship.TargetRole)
	suite.False(relationship.CanManage)
	suite.Equal(2, relationship.LevelDifference) // 6 - 4 = 2
	suite.Equal("subordinate", relationship.Relationship)
}

func (suite *RBACHierarchyTestSuite) TestGetRoleRelationship_Equal() {
	ctx := context.Background()

	relationship, err := suite.service.GetRoleRelationship(ctx, "MANAGER", "MANAGER")
	suite.Require().NoError(err)
	suite.Require().NotNil(relationship)

	suite.Equal("MANAGER", relationship.SourceRole)
	suite.Equal("MANAGER", relationship.TargetRole)
	suite.False(relationship.CanManage)
	suite.Equal(0, relationship.LevelDifference)
	suite.Equal("equal", relationship.Relationship)
}

func (suite *RBACHierarchyTestSuite) TestGetRoleRelationship_NonExistent() {
	ctx := context.Background()

	relationship, err := suite.service.GetRoleRelationship(ctx, "MANAGER", "NON_EXISTENT")
	suite.Require().Error(err)
	suite.Require().Nil(relationship)
}

// ============================================================================
// TEST: GetEffectiveRolePermissions
// ============================================================================

func (suite *RBACHierarchyTestSuite) TestGetEffectiveRolePermissions_MANDOR() {
	ctx := context.Background()

	permissions, err := suite.service.GetEffectiveRolePermissions(ctx, "MANDOR")
	suite.Require().NoError(err)
	suite.Require().NotNil(permissions)

	// MANDOR has direct permission: harvest.create
	// Inherited from superior roles (ASISTEN, MANAGER, AREA_MANAGER, COMPANY_ADMIN, SUPER_ADMIN)
	// MANAGER has: harvest.create, harvest.approve
	// SUPER_ADMIN has: all 4 permissions
	// Should get unique permissions from all superior roles

	suite.Contains(permissions, "harvest.create")
	// Note: In this test setup, only SUPER_ADMIN and MANAGER have additional permissions
	// The effective permissions should include inherited ones
}

func (suite *RBACHierarchyTestSuite) TestGetEffectiveRolePermissions_SUPER_ADMIN() {
	ctx := context.Background()

	permissions, err := suite.service.GetEffectiveRolePermissions(ctx, "SUPER_ADMIN")
	suite.Require().NoError(err)
	suite.Require().NotNil(permissions)

	// SUPER_ADMIN has all 4 direct permissions, no inheritance
	suite.Require().Len(permissions, 4)

	suite.Contains(permissions, "harvest.create")
	suite.Contains(permissions, "harvest.approve")
	suite.Contains(permissions, "user.manage")
	suite.Contains(permissions, "report.view")
}

func (suite *RBACHierarchyTestSuite) TestGetEffectiveRolePermissions_NonExistent() {
	ctx := context.Background()

	permissions, err := suite.service.GetEffectiveRolePermissions(ctx, "NON_EXISTENT")
	suite.Require().Error(err)
	suite.Require().Nil(permissions)
	suite.Contains(err.Error(), "role not found")
}

// ============================================================================
// TEST: GetRoleHierarchyTree
// ============================================================================

func (suite *RBACHierarchyTestSuite) TestGetRoleHierarchyTree_Structure() {
	ctx := context.Background()

	tree, err := suite.service.GetRoleHierarchyTree(ctx)
	suite.Require().NoError(err)
	suite.Require().NotNil(tree)

	// Top level should have only SUPER_ADMIN
	suite.Require().Len(tree, 1)
	suite.Equal("SUPER_ADMIN", tree[0].Role.Name)
	suite.Equal(1, tree[0].Level)

	// SUPER_ADMIN should have COMPANY_ADMIN as child
	suite.Require().Len(tree[0].Children, 1)
	suite.Equal("COMPANY_ADMIN", tree[0].Children[0].Role.Name)

	// COMPANY_ADMIN should have AREA_MANAGER as child
	suite.Require().Len(tree[0].Children[0].Children, 1)
	suite.Equal("AREA_MANAGER", tree[0].Children[0].Children[0].Role.Name)

	// AREA_MANAGER should have MANAGER as child
	suite.Require().Len(tree[0].Children[0].Children[0].Children, 1)
	suite.Equal("MANAGER", tree[0].Children[0].Children[0].Children[0].Role.Name)
}

func (suite *RBACHierarchyTestSuite) TestGetRoleHierarchyTree_Permissions() {
	ctx := context.Background()

	tree, err := suite.service.GetRoleHierarchyTree(ctx)
	suite.Require().NoError(err)
	suite.Require().NotNil(tree)

	// SUPER_ADMIN should have all 4 permissions
	suite.Require().NotNil(tree[0].Permissions)
	suite.Require().Len(tree[0].Permissions, 4)
	suite.Contains(tree[0].Permissions, "harvest.create")
	suite.Contains(tree[0].Permissions, "harvest.approve")
	suite.Contains(tree[0].Permissions, "user.manage")
	suite.Contains(tree[0].Permissions, "report.view")
}

func (suite *RBACHierarchyTestSuite) TestGetRoleHierarchyTree_Depth() {
	ctx := context.Background()

	tree, err := suite.service.GetRoleHierarchyTree(ctx)
	suite.Require().NoError(err)
	suite.Require().NotNil(tree)

	// Verify tree depth - should be 7 levels deep
	// Level 1: SUPER_ADMIN
	// Level 2: COMPANY_ADMIN
	// Level 3: AREA_MANAGER
	// Level 4: MANAGER
	// Level 5: ASISTEN
	// Level 6: MANDOR
	// Level 7: SATPAM

	level1 := tree[0]
	suite.Equal(1, level1.Level)

	level2 := level1.Children[0]
	suite.Equal(2, level2.Level)

	level3 := level2.Children[0]
	suite.Equal(3, level3.Level)

	level4 := level3.Children[0]
	suite.Equal(4, level4.Level)

	level5 := level4.Children[0]
	suite.Equal(5, level5.Level)

	level6 := level5.Children[0]
	suite.Equal(6, level6.Level)

	level7 := level6.Children[0]
	suite.Equal(7, level7.Level)
	suite.Equal("SATPAM", level7.Role.Name)

	// SATPAM should have no children (bottom level)
	suite.Require().Len(level7.Children, 0)
}

// ============================================================================
// RUN TEST SUITE
// ============================================================================

func TestRBACHierarchyTestSuite(t *testing.T) {
	suite.Run(t, new(RBACHierarchyTestSuite))
}

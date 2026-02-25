package resolvers

import (
	"context"
	"fmt"
	"testing"

	authServices "agrinovagraphql/server/internal/auth/services"
	"agrinovagraphql/server/internal/graphql/domain/auth"
	masterDomain "agrinovagraphql/server/internal/graphql/domain/master"
	masterModels "agrinovagraphql/server/internal/master/models"
	masterResolvers "agrinovagraphql/server/internal/master/resolvers"
	masterServiceMocks "agrinovagraphql/server/internal/master/services/mocks"
	panenModels "agrinovagraphql/server/internal/panen/models"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestBuildScopedHarvestFilters_AssignmentPriorityByRole(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name              string
		userID            string
		role              auth.UserRole
		assignments       *masterModels.UserAssignmentsResponse
		expectHasScope    bool
		expectCompanyIDs  []string
		expectEstateIDs   []string
		expectDivisionIDs []string
	}{
		{
			name:   "MANAGER uses estate priority",
			userID: "manager-1",
			role:   auth.UserRoleManager,
			assignments: &masterModels.UserAssignmentsResponse{
				Companies: []masterDomain.Company{{ID: "company-a"}},
				Estates:   []masterDomain.Estate{{ID: "estate-a"}},
				Divisions: []masterDomain.Division{{ID: "division-a"}},
			},
			expectHasScope:    true,
			expectEstateIDs:   []string{"estate-a"},
			expectCompanyIDs:  []string{},
			expectDivisionIDs: []string{},
		},
		{
			name:   "ASISTEN uses division priority",
			userID: "asisten-1",
			role:   auth.UserRoleAsisten,
			assignments: &masterModels.UserAssignmentsResponse{
				Companies: []masterDomain.Company{{ID: "company-b"}},
				Estates:   []masterDomain.Estate{{ID: "estate-b"}},
				Divisions: []masterDomain.Division{{ID: "division-b"}},
			},
			expectHasScope:    true,
			expectDivisionIDs: []string{"division-b"},
			expectCompanyIDs:  []string{},
			expectEstateIDs:   []string{},
		},
		{
			name:   "AREA_MANAGER uses company priority",
			userID: "area-1",
			role:   auth.UserRoleAreaManager,
			assignments: &masterModels.UserAssignmentsResponse{
				Companies: []masterDomain.Company{{ID: "company-c"}},
				Estates:   []masterDomain.Estate{{ID: "estate-c"}},
				Divisions: []masterDomain.Division{{ID: "division-c"}},
			},
			expectHasScope:    true,
			expectCompanyIDs:  []string{"company-c"},
			expectEstateIDs:   []string{},
			expectDivisionIDs: []string{},
		},
		{
			name:   "COMPANY_ADMIN uses company priority",
			userID: "company-admin-1",
			role:   auth.UserRoleCompanyAdmin,
			assignments: &masterModels.UserAssignmentsResponse{
				Companies: []masterDomain.Company{{ID: "company-d"}},
				Estates:   []masterDomain.Estate{{ID: "estate-d"}},
				Divisions: []masterDomain.Division{{ID: "division-d"}},
			},
			expectHasScope:    true,
			expectCompanyIDs:  []string{"company-d"},
			expectEstateIDs:   []string{},
			expectDivisionIDs: []string{},
		},
		{
			name:           "No active assignments returns no scope",
			userID:         "no-assignment-user",
			role:           auth.UserRoleAsisten,
			assignments:    &masterModels.UserAssignmentsResponse{},
			expectHasScope: false,
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			mockMaster := masterServiceMocks.NewMockMasterService(t)
			mockMaster.EXPECT().
				GetUserAssignments(mock.Anything, tc.userID).
				Return(tc.assignments, nil).
				Once()

			resolver := newHarvestScopeTestQueryResolver(mockMaster, nil)

			filters, hasScope, err := resolver.buildScopedHarvestFilters(
				context.Background(),
				tc.userID,
				tc.role,
				nil,
			)

			require.NoError(t, err)
			require.Equal(t, tc.expectHasScope, hasScope)
			if !tc.expectHasScope {
				require.Nil(t, filters)
				return
			}

			require.NotNil(t, filters)
			require.ElementsMatch(t, tc.expectCompanyIDs, filters.CompanyIDs)
			require.ElementsMatch(t, tc.expectEstateIDs, filters.EstateIDs)
			require.ElementsMatch(t, tc.expectDivisionIDs, filters.DivisionIDs)
		})
	}
}

func TestBuildScopedHarvestFilters_AssignmentEmptyHierarchyExists(t *testing.T) {
	t.Parallel()

	db := setupHarvestScopeHierarchyDB(t)
	seedHierarchyUsers(t, db)

	mockMaster := masterServiceMocks.NewMockMasterService(t)
	mockMaster.EXPECT().
		GetUserAssignments(mock.Anything, "area-root").
		Return(&masterModels.UserAssignmentsResponse{}, nil).
		Once()

	resolver := newHarvestScopeTestQueryResolver(mockMaster, db)
	ctx := context.Background()

	assignmentFilters, hasAssignmentScope, err := resolver.buildScopedHarvestFilters(
		ctx,
		"area-root",
		auth.UserRoleAreaManager,
		nil,
	)
	require.NoError(t, err)
	require.False(t, hasAssignmentScope)
	require.Nil(t, assignmentFilters)

	hierarchyFilters, hasHierarchyScope, err := resolver.buildHierarchyMandorScopedHarvestFilters(
		ctx,
		"area-root",
		&panenModels.HarvestFilters{},
	)
	require.NoError(t, err)
	require.True(t, hasHierarchyScope)
	require.NotNil(t, hierarchyFilters)
	require.ElementsMatch(t, []string{"mandor-1", "mandor-2"}, hierarchyFilters.MandorIDs)
	require.Empty(t, hierarchyFilters.CompanyIDs)
	require.Empty(t, hierarchyFilters.EstateIDs)
	require.Empty(t, hierarchyFilters.DivisionIDs)
}

func TestBuildScopedHarvestFilters_AssignmentAndHierarchyEmpty(t *testing.T) {
	t.Parallel()

	db := setupHarvestScopeHierarchyDB(t)
	require.NoError(t, db.Exec(`
		INSERT INTO users (id, role, manager_id, is_active)
		VALUES ('asisten-alone', 'ASISTEN', NULL, 1)
	`).Error)

	mockMaster := masterServiceMocks.NewMockMasterService(t)
	mockMaster.EXPECT().
		GetUserAssignments(mock.Anything, "asisten-alone").
		Return(&masterModels.UserAssignmentsResponse{}, nil).
		Once()

	resolver := newHarvestScopeTestQueryResolver(mockMaster, db)
	ctx := context.Background()

	assignmentFilters, hasAssignmentScope, err := resolver.buildScopedHarvestFilters(
		ctx,
		"asisten-alone",
		auth.UserRoleAsisten,
		nil,
	)
	require.NoError(t, err)
	require.False(t, hasAssignmentScope)
	require.Nil(t, assignmentFilters)

	hierarchyFilters, hasHierarchyScope, err := resolver.buildHierarchyMandorScopedHarvestFilters(
		ctx,
		"asisten-alone",
		nil,
	)
	require.NoError(t, err)
	require.False(t, hasHierarchyScope)
	require.Nil(t, hierarchyFilters)
}

func newHarvestScopeTestQueryResolver(
	mockMaster *masterServiceMocks.MockMasterService,
	db *gorm.DB,
) *queryResolver {
	resolver := &Resolver{}
	if mockMaster != nil {
		resolver.MasterResolver = masterResolvers.NewMasterResolver(mockMaster, nil)
	}
	if db != nil {
		resolver.HierarchyService = authServices.NewHierarchyService(db)
	}
	return &queryResolver{Resolver: resolver}
}

func setupHarvestScopeHierarchyDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:harvest_scope_strategy_%s?mode=memory&cache=shared", uuid.NewString())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	require.NoError(t, db.Exec(`
		CREATE TABLE users (
			id TEXT PRIMARY KEY,
			role TEXT,
			manager_id TEXT,
			is_active BOOLEAN,
			deleted_at DATETIME
		)
	`).Error)

	return db
}

func seedHierarchyUsers(t *testing.T, db *gorm.DB) {
	t.Helper()

	require.NoError(t, db.Exec(`
		INSERT INTO users (id, role, manager_id, is_active) VALUES
		('area-root', 'AREA_MANAGER', NULL, 1),
		('manager-1', 'MANAGER', 'area-root', 1),
		('asisten-1', 'ASISTEN', 'manager-1', 1),
		('mandor-1', 'MANDOR', 'asisten-1', 1),
		('mandor-2', 'MANDOR', 'area-root', 1),
		('mandor-inactive', 'MANDOR', 'asisten-1', 0)
	`).Error)
}

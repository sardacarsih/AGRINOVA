package resolvers

import (
	"context"
	"fmt"
	"testing"
	"time"

	authServices "agrinovagraphql/server/internal/auth/services"
	"agrinovagraphql/server/internal/graphql/domain/auth"
	mandorDomain "agrinovagraphql/server/internal/graphql/domain/mandor"
	masterDomain "agrinovagraphql/server/internal/graphql/domain/master"
	masterModels "agrinovagraphql/server/internal/master/models"
	masterResolvers "agrinovagraphql/server/internal/master/resolvers"
	masterServiceMocks "agrinovagraphql/server/internal/master/services/mocks"
	panenResolvers "agrinovagraphql/server/internal/panen/resolvers"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type harvestScopeFixture struct {
	company1ID  string
	company2ID  string
	estate1ID   string
	estate2ID   string
	division1ID string
	division2ID string
	division3ID string

	areaManagerID  string
	companyAdminID string
	managerID      string
	managerCAID    string
	asistenID      string
	asistenCAID    string
	mandor1ID      string
	mandor2ID      string
	mandor3ID      string
	mandor4ID      string
	asistenAloneID string

	harvest1ID string
	harvest2ID string
	harvest3ID string
	harvest4ID string
}

func TestHarvestQueries_AssignmentPriorityAcrossRoles(t *testing.T) {
	t.Parallel()

	db := setupHarvestQueryScopeTestDB(t)
	fixture := seedHarvestQueryScopeFixture(t, db)

	assignments := map[string]*masterModels.UserAssignmentsResponse{
		fixture.managerID: {
			Estates: []masterDomain.Estate{{ID: fixture.estate1ID}},
		},
		fixture.asistenID: {
			Divisions: []masterDomain.Division{{ID: fixture.division1ID}},
		},
		fixture.areaManagerID: {
			Companies: []masterDomain.Company{{ID: fixture.company1ID}},
		},
		fixture.companyAdminID: {
			Companies: []masterDomain.Company{{ID: fixture.company2ID}},
		},
	}
	query := newHarvestQueryScopeTestResolver(t, db, assignments)

	cases := []struct {
		name             string
		userID           string
		role             auth.UserRole
		expectedAll      []string
		expectedApproved []string
		deniedRecordID   string
	}{
		{
			name:             "MANAGER assignment estate priority",
			userID:           fixture.managerID,
			role:             auth.UserRoleManager,
			expectedAll:      []string{fixture.harvest1ID, fixture.harvest4ID},
			expectedApproved: []string{fixture.harvest4ID},
			deniedRecordID:   fixture.harvest2ID,
		},
		{
			name:             "ASISTEN assignment division priority",
			userID:           fixture.asistenID,
			role:             auth.UserRoleAsisten,
			expectedAll:      []string{fixture.harvest1ID},
			expectedApproved: []string{},
			deniedRecordID:   fixture.harvest3ID,
		},
		{
			name:             "AREA_MANAGER assignment company priority",
			userID:           fixture.areaManagerID,
			role:             auth.UserRoleAreaManager,
			expectedAll:      []string{fixture.harvest1ID, fixture.harvest4ID},
			expectedApproved: []string{fixture.harvest4ID},
			deniedRecordID:   fixture.harvest2ID,
		},
		{
			name:             "COMPANY_ADMIN assignment company priority",
			userID:           fixture.companyAdminID,
			role:             auth.UserRoleCompanyAdmin,
			expectedAll:      []string{fixture.harvest2ID, fixture.harvest3ID},
			expectedApproved: []string{fixture.harvest2ID},
			deniedRecordID:   fixture.harvest1ID,
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			ctx := harvestAuthContext(tc.userID, tc.role)

			records, err := query.HarvestRecords(ctx, nil, nil)
			require.NoError(t, err)
			require.ElementsMatch(t, tc.expectedAll, harvestIDs(records))

			approved, err := query.HarvestRecordsByStatus(ctx, mandorDomain.HarvestStatusApproved)
			require.NoError(t, err)
			require.ElementsMatch(t, tc.expectedApproved, harvestIDs(approved))

			allowedID := tc.expectedAll[0]
			record, err := query.HarvestRecord(ctx, allowedID)
			require.NoError(t, err)
			require.NotNil(t, record)
			require.Equal(t, allowedID, record.ID)

			deniedRecord, deniedErr := query.HarvestRecord(ctx, tc.deniedRecordID)
			require.Error(t, deniedErr)
			require.Contains(t, deniedErr.Error(), "harvest record not found")
			require.Nil(t, deniedRecord)
		})
	}
}

func TestHarvestQueries_HierarchyFallbackAcrossRoles(t *testing.T) {
	t.Parallel()

	db := setupHarvestQueryScopeTestDB(t)
	fixture := seedHarvestQueryScopeFixture(t, db)

	query := newHarvestQueryScopeTestResolver(t, db, map[string]*masterModels.UserAssignmentsResponse{})

	cases := []struct {
		name             string
		userID           string
		role             auth.UserRole
		expectedAll      []string
		expectedApproved []string
		deniedRecordID   string
	}{
		{
			name:             "MANAGER fallback hierarchy",
			userID:           fixture.managerID,
			role:             auth.UserRoleManager,
			expectedAll:      []string{fixture.harvest1ID, fixture.harvest2ID, fixture.harvest3ID},
			expectedApproved: []string{fixture.harvest2ID},
			deniedRecordID:   fixture.harvest4ID,
		},
		{
			name:             "ASISTEN fallback hierarchy",
			userID:           fixture.asistenID,
			role:             auth.UserRoleAsisten,
			expectedAll:      []string{fixture.harvest1ID, fixture.harvest3ID},
			expectedApproved: []string{},
			deniedRecordID:   fixture.harvest2ID,
		},
		{
			name:             "AREA_MANAGER fallback hierarchy",
			userID:           fixture.areaManagerID,
			role:             auth.UserRoleAreaManager,
			expectedAll:      []string{fixture.harvest1ID, fixture.harvest2ID, fixture.harvest3ID},
			expectedApproved: []string{fixture.harvest2ID},
			deniedRecordID:   fixture.harvest4ID,
		},
		{
			name:             "COMPANY_ADMIN fallback hierarchy",
			userID:           fixture.companyAdminID,
			role:             auth.UserRoleCompanyAdmin,
			expectedAll:      []string{fixture.harvest4ID},
			expectedApproved: []string{fixture.harvest4ID},
			deniedRecordID:   fixture.harvest1ID,
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			ctx := harvestAuthContext(tc.userID, tc.role)

			records, err := query.HarvestRecords(ctx, nil, nil)
			require.NoError(t, err)
			require.ElementsMatch(t, tc.expectedAll, harvestIDs(records))

			approved, err := query.HarvestRecordsByStatus(ctx, mandorDomain.HarvestStatusApproved)
			require.NoError(t, err)
			require.ElementsMatch(t, tc.expectedApproved, harvestIDs(approved))

			allowedID := tc.expectedAll[0]
			record, err := query.HarvestRecord(ctx, allowedID)
			require.NoError(t, err)
			require.NotNil(t, record)
			require.Equal(t, allowedID, record.ID)

			deniedRecord, deniedErr := query.HarvestRecord(ctx, tc.deniedRecordID)
			require.Error(t, deniedErr)
			require.Contains(t, deniedErr.Error(), "harvest record not found")
			require.Nil(t, deniedRecord)
		})
	}
}

func TestHarvestQueries_NoAssignmentAndNoHierarchy_ReturnsEmpty(t *testing.T) {
	t.Parallel()

	db := setupHarvestQueryScopeTestDB(t)
	fixture := seedHarvestQueryScopeFixture(t, db)
	query := newHarvestQueryScopeTestResolver(t, db, map[string]*masterModels.UserAssignmentsResponse{})

	ctx := harvestAuthContext(fixture.asistenAloneID, auth.UserRoleAsisten)

	records, err := query.HarvestRecords(ctx, nil, nil)
	require.NoError(t, err)
	require.Empty(t, records)

	approved, err := query.HarvestRecordsByStatus(ctx, mandorDomain.HarvestStatusApproved)
	require.NoError(t, err)
	require.Empty(t, approved)

	record, fetchErr := query.HarvestRecord(ctx, fixture.harvest1ID)
	require.Error(t, fetchErr)
	require.Contains(t, fetchErr.Error(), "harvest record not found")
	require.Nil(t, record)
}

func setupHarvestQueryScopeTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:harvest_query_scope_%s?mode=memory&cache=shared", uuid.NewString())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	schema := []string{
		`CREATE TABLE users (
			id TEXT PRIMARY KEY,
			username TEXT,
			name TEXT,
			role TEXT,
			is_active BOOLEAN,
			manager_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);`,
		`CREATE TABLE companies (
			id TEXT PRIMARY KEY,
			name TEXT,
			company_code TEXT,
			status TEXT,
			is_active BOOLEAN,
			created_at DATETIME,
			updated_at DATETIME
		);`,
		`CREATE TABLE estates (
			id TEXT PRIMARY KEY,
			name TEXT,
			code TEXT,
			company_id TEXT,
			created_at DATETIME,
			updated_at DATETIME
		);`,
		`CREATE TABLE divisions (
			id TEXT PRIMARY KEY,
			name TEXT,
			code TEXT,
			estate_id TEXT,
			created_at DATETIME,
			updated_at DATETIME
		);`,
		`CREATE TABLE blocks (
			id TEXT PRIMARY KEY,
			block_code TEXT,
			name TEXT,
			division_id TEXT,
			status TEXT,
			istm TEXT,
			is_active BOOLEAN,
			created_at DATETIME,
			updated_at DATETIME
		);`,
		`CREATE TABLE employees (
			id TEXT PRIMARY KEY,
			nik TEXT,
			name TEXT,
			company_id TEXT,
			division_id TEXT
		);`,
		`CREATE TABLE harvest_records (
			id TEXT PRIMARY KEY,
			tanggal DATETIME,
			mandor_id TEXT,
			company_id TEXT,
			estate_id TEXT,
			division_id TEXT,
			block_id TEXT,
			karyawan_id TEXT,
			nik TEXT,
			karyawan TEXT,
			berat_tbs REAL,
			jumlah_janjang INTEGER,
			status TEXT,
			created_at DATETIME,
			updated_at DATETIME
		);`,
	}
	for _, stmt := range schema {
		require.NoError(t, db.Exec(stmt).Error)
	}

	return db
}

func seedHarvestQueryScopeFixture(t *testing.T, db *gorm.DB) *harvestScopeFixture {
	t.Helper()

	now := time.Now()
	fx := &harvestScopeFixture{
		company1ID:  "20000000-0000-0000-0000-000000000001",
		company2ID:  "20000000-0000-0000-0000-000000000002",
		estate1ID:   "30000000-0000-0000-0000-000000000001",
		estate2ID:   "30000000-0000-0000-0000-000000000002",
		division1ID: "40000000-0000-0000-0000-000000000001",
		division2ID: "40000000-0000-0000-0000-000000000002",
		division3ID: "40000000-0000-0000-0000-000000000003",

		areaManagerID:  "10000000-0000-0000-0000-000000000001",
		companyAdminID: "10000000-0000-0000-0000-000000000002",
		managerID:      "10000000-0000-0000-0000-000000000003",
		managerCAID:    "10000000-0000-0000-0000-000000000004",
		asistenID:      "10000000-0000-0000-0000-000000000005",
		asistenCAID:    "10000000-0000-0000-0000-000000000006",
		mandor1ID:      "10000000-0000-0000-0000-000000000007",
		mandor2ID:      "10000000-0000-0000-0000-000000000008",
		mandor3ID:      "10000000-0000-0000-0000-000000000009",
		mandor4ID:      "10000000-0000-0000-0000-000000000010",
		asistenAloneID: "10000000-0000-0000-0000-000000000011",

		harvest1ID: "70000000-0000-0000-0000-000000000001",
		harvest2ID: "70000000-0000-0000-0000-000000000002",
		harvest3ID: "70000000-0000-0000-0000-000000000003",
		harvest4ID: "70000000-0000-0000-0000-000000000004",
	}

	require.NoError(t, db.Exec(`
		INSERT INTO users (id, username, name, role, is_active, manager_id, created_at, updated_at) VALUES
		(?, 'area', 'Area Manager', ?, 1, NULL, ?, ?),
		(?, 'ca', 'Company Admin', ?, 1, NULL, ?, ?),
		(?, 'mgr', 'Manager', ?, 1, ?, ?, ?),
		(?, 'mgr-ca', 'Manager CA', ?, 1, ?, ?, ?),
		(?, 'ast', 'Asisten', ?, 1, ?, ?, ?),
		(?, 'ast-ca', 'Asisten CA', ?, 1, ?, ?, ?),
		(?, 'm1', 'Mandor 1', ?, 1, ?, ?, ?),
		(?, 'm2', 'Mandor 2', ?, 1, ?, ?, ?),
		(?, 'm3', 'Mandor 3', ?, 1, ?, ?, ?),
		(?, 'm4', 'Mandor 4', ?, 1, ?, ?, ?),
		(?, 'ast-alone', 'Asisten Alone', ?, 1, NULL, ?, ?)
	`,
		fx.areaManagerID, string(auth.UserRoleAreaManager), now, now,
		fx.companyAdminID, string(auth.UserRoleCompanyAdmin), now, now,
		fx.managerID, string(auth.UserRoleManager), fx.areaManagerID, now, now,
		fx.managerCAID, string(auth.UserRoleManager), fx.companyAdminID, now, now,
		fx.asistenID, string(auth.UserRoleAsisten), fx.managerID, now, now,
		fx.asistenCAID, string(auth.UserRoleAsisten), fx.managerCAID, now, now,
		fx.mandor1ID, string(auth.UserRoleMandor), fx.asistenID, now, now,
		fx.mandor2ID, string(auth.UserRoleMandor), fx.managerID, now, now,
		fx.mandor3ID, string(auth.UserRoleMandor), fx.asistenID, now, now,
		fx.mandor4ID, string(auth.UserRoleMandor), fx.asistenCAID, now, now,
		fx.asistenAloneID, string(auth.UserRoleAsisten), now, now,
	).Error)

	require.NoError(t, db.Exec(`
		INSERT INTO companies (id, name, company_code, status, is_active, created_at, updated_at) VALUES
		(?, 'Company 1', 'C1', 'ACTIVE', 1, ?, ?),
		(?, 'Company 2', 'C2', 'ACTIVE', 1, ?, ?)
	`, fx.company1ID, now, now, fx.company2ID, now, now).Error)

	require.NoError(t, db.Exec(`
		INSERT INTO estates (id, name, code, company_id, created_at, updated_at) VALUES
		(?, 'Estate 1', 'E1', ?, ?, ?),
		(?, 'Estate 2', 'E2', ?, ?, ?)
	`, fx.estate1ID, fx.company1ID, now, now, fx.estate2ID, fx.company2ID, now, now).Error)

	require.NoError(t, db.Exec(`
		INSERT INTO divisions (id, name, code, estate_id, created_at, updated_at) VALUES
		(?, 'Division 1', 'D1', ?, ?, ?),
		(?, 'Division 2', 'D2', ?, ?, ?),
		(?, 'Division 3', 'D3', ?, ?, ?)
	`, fx.division1ID, fx.estate1ID, now, now, fx.division2ID, fx.estate2ID, now, now, fx.division3ID, fx.estate1ID, now, now).Error)

	require.NoError(t, db.Exec(`
		INSERT INTO blocks (id, block_code, name, division_id, status, istm, is_active, created_at, updated_at) VALUES
		('50000000-0000-0000-0000-000000000001', 'B1', 'Block 1', ?, 'INTI', 'N', 1, ?, ?),
		('50000000-0000-0000-0000-000000000002', 'B2', 'Block 2', ?, 'INTI', 'N', 1, ?, ?),
		('50000000-0000-0000-0000-000000000003', 'B3', 'Block 3', ?, 'INTI', 'N', 1, ?, ?)
	`, fx.division1ID, now, now, fx.division2ID, now, now, fx.division3ID, now, now).Error)

	require.NoError(t, db.Exec(`
		INSERT INTO employees (id, nik, name, company_id, division_id) VALUES
		('60000000-0000-0000-0000-000000000001', 'EMP-1', 'Employee 1', ?, ?)
	`, fx.company1ID, fx.division1ID).Error)

	require.NoError(t, db.Exec(`
		INSERT INTO harvest_records (
			id, tanggal, mandor_id, company_id, estate_id, division_id, block_id, karyawan_id, nik, karyawan,
			berat_tbs, jumlah_janjang, status, created_at, updated_at
		) VALUES
		(?, ?, ?, ?, ?, ?, '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'NIK-1', 'NIK-1', 100, 10, ?, ?, ?),
		(?, ?, ?, ?, ?, ?, '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'NIK-2', 'NIK-2', 120, 12, ?, ?, ?),
		(?, ?, ?, ?, ?, ?, '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'NIK-3', 'NIK-3', 130, 13, ?, ?, ?),
		(?, ?, ?, ?, ?, ?, '50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', 'NIK-4', 'NIK-4', 140, 14, ?, ?, ?)
	`,
		fx.harvest1ID, now.Add(-4*time.Hour), fx.mandor1ID, fx.company1ID, fx.estate1ID, fx.division1ID, string(mandorDomain.HarvestStatusPending), now, now,
		fx.harvest2ID, now.Add(-3*time.Hour), fx.mandor2ID, fx.company2ID, fx.estate2ID, fx.division2ID, string(mandorDomain.HarvestStatusApproved), now, now,
		fx.harvest3ID, now.Add(-2*time.Hour), fx.mandor3ID, fx.company2ID, fx.estate2ID, fx.division2ID, string(mandorDomain.HarvestStatusRejected), now, now,
		fx.harvest4ID, now.Add(-1*time.Hour), fx.mandor4ID, fx.company1ID, fx.estate1ID, fx.division3ID, string(mandorDomain.HarvestStatusApproved), now, now,
	).Error)

	return fx
}

func newHarvestQueryScopeTestResolver(
	t *testing.T,
	db *gorm.DB,
	assignments map[string]*masterModels.UserAssignmentsResponse,
) *queryResolver {
	t.Helper()

	mockMaster := masterServiceMocks.NewMockMasterService(t)
	mockMaster.On("GetUserAssignments", mock.Anything, mock.AnythingOfType("string")).
		Return(func(_ context.Context, userID string) *masterModels.UserAssignmentsResponse {
			if assignments != nil {
				if scoped, ok := assignments[userID]; ok && scoped != nil {
					return scoped
				}
			}
			return &masterModels.UserAssignmentsResponse{}
		}, nil)

	resolver := &Resolver{
		db:               db,
		PanenResolver:    panenResolvers.NewPanenResolver(db, nil),
		HierarchyService: authServices.NewHierarchyService(db),
		MasterResolver:   masterResolvers.NewMasterResolver(mockMaster, nil),
	}
	return &queryResolver{Resolver: resolver}
}

func harvestAuthContext(userID string, role auth.UserRole) context.Context {
	ctx := context.WithValue(context.Background(), "user_id", userID)
	ctx = context.WithValue(ctx, "user_role", role)
	return ctx
}

func harvestIDs(records []*mandorDomain.HarvestRecord) []string {
	ids := make([]string, 0, len(records))
	for _, record := range records {
		if record == nil {
			continue
		}
		ids = append(ids, record.ID)
	}
	return ids
}

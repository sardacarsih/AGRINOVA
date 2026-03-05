package resolvers

import (
	"context"
	"fmt"
	"testing"
	"time"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/generated"
	masterResolvers "agrinovagraphql/server/internal/master/resolvers"
	masterServiceMocks "agrinovagraphql/server/internal/master/services/mocks"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type blockTreatmentWorkflowFixture struct {
	companyID   string
	estateID    string
	divisionID  string
	blockID     string
	oldTarifID  string
	newTarifID  string
	managerID   string
	areaMgrID   string
	companyAdm  string
	semester    string
	impactNotes string
}

func TestBlockTreatmentWorkflow_EndToEndSuccess(t *testing.T) {
	t.Parallel()

	db := setupBlockTreatmentWorkflowDB(t)
	fixture := seedBlockTreatmentWorkflowFixture(t, db)
	mutation := newBlockTreatmentWorkflowMutationResolver(t, db)

	managerCtx := withWorkflowAuth(context.Background(), fixture.managerID, auth.UserRoleManager)
	areaManagerCtx := withWorkflowAuth(context.Background(), fixture.areaMgrID, auth.UserRoleAreaManager)
	companyAdminCtx := withWorkflowAuth(context.Background(), fixture.companyAdm, auth.UserRoleCompanyAdmin)

	createInput := generated.CreateBlockTreatmentSemesterRequestInput{
		CompanyID: fixture.companyID,
		Semester:  fixture.semester,
		Items: []*generated.BlockTreatmentSemesterRequestItemInput{
			{
				BlockID:             fixture.blockID,
				ProposedTarifBlokID: fixture.newTarifID,
				ImpactSummary:       &fixture.impactNotes,
			},
		},
	}

	created, err := mutation.CreateBlockTreatmentSemesterRequest(managerCtx, createInput)
	require.NoError(t, err)
	require.NotNil(t, created)
	require.Equal(t, generated.BlockTreatmentRequestStatusDraft, created.Status)
	require.Len(t, created.Items, 1)

	submitted, err := mutation.SubmitBlockTreatmentSemesterRequest(managerCtx, created.ID)
	require.NoError(t, err)
	require.Equal(t, generated.BlockTreatmentRequestStatusSubmitted, submitted.Status)

	reviewed, err := mutation.ReviewBlockTreatmentSemesterRequest(areaManagerCtx, created.ID, nil)
	require.NoError(t, err)
	require.Equal(t, generated.BlockTreatmentRequestStatusUnderReview, reviewed.Status)

	approved, err := mutation.ApproveBlockTreatmentSemesterRequest(areaManagerCtx, created.ID, nil)
	require.NoError(t, err)
	require.Equal(t, generated.BlockTreatmentRequestStatusApproved, approved.Status)

	applied, err := mutation.ApplyBlockTreatmentSemesterRequest(companyAdminCtx, created.ID)
	require.NoError(t, err)
	require.Equal(t, generated.BlockTreatmentRequestStatusApplied, applied.Status)

	var blockRow struct {
		TarifBlokID string    `gorm:"column:tarif_blok_id"`
		Perlakuan   string    `gorm:"column:perlakuan"`
		UpdatedAt   time.Time `gorm:"column:updated_at"`
	}
	require.NoError(t, db.Table("blocks").Select("tarif_blok_id, perlakuan, updated_at").Where("id = ?", fixture.blockID).Take(&blockRow).Error)
	require.Equal(t, fixture.newTarifID, blockRow.TarifBlokID)
	require.Equal(t, "Perlakuan Baru", blockRow.Perlakuan)
	require.False(t, blockRow.UpdatedAt.IsZero())

	var statusLogCount int64
	require.NoError(t, db.Table("block_treatment_request_status_logs").Where("request_id = ?", created.ID).Count(&statusLogCount).Error)
	require.Equal(t, int64(5), statusLogCount)
}

func TestBlockTreatmentWorkflow_ApproveMustBeFromUnderReview(t *testing.T) {
	t.Parallel()

	db := setupBlockTreatmentWorkflowDB(t)
	fixture := seedBlockTreatmentWorkflowFixture(t, db)
	mutation := newBlockTreatmentWorkflowMutationResolver(t, db)

	managerCtx := withWorkflowAuth(context.Background(), fixture.managerID, auth.UserRoleManager)
	areaManagerCtx := withWorkflowAuth(context.Background(), fixture.areaMgrID, auth.UserRoleAreaManager)

	createInput := generated.CreateBlockTreatmentSemesterRequestInput{
		CompanyID: fixture.companyID,
		Semester:  fixture.semester,
		Items: []*generated.BlockTreatmentSemesterRequestItemInput{
			{
				BlockID:             fixture.blockID,
				ProposedTarifBlokID: fixture.newTarifID,
			},
		},
	}

	created, err := mutation.CreateBlockTreatmentSemesterRequest(managerCtx, createInput)
	require.NoError(t, err)
	_, err = mutation.SubmitBlockTreatmentSemesterRequest(managerCtx, created.ID)
	require.NoError(t, err)

	_, err = mutation.ApproveBlockTreatmentSemesterRequest(areaManagerCtx, created.ID, nil)
	require.Error(t, err)
	require.Contains(t, err.Error(), "tidak dapat diproses")
}

func newBlockTreatmentWorkflowMutationResolver(t *testing.T, db *gorm.DB) *mutationResolver {
	t.Helper()

	mockMaster := masterServiceMocks.NewMockMasterService(t)
	mockMaster.On("ValidateCompanyAccess", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	return &mutationResolver{
		Resolver: &Resolver{
			db:             db,
			MasterResolver: masterResolvers.NewMasterResolver(mockMaster, nil),
		},
	}
}

func withWorkflowAuth(ctx context.Context, userID string, role auth.UserRole) context.Context {
	ctx = context.WithValue(ctx, "user_id", userID)
	ctx = context.WithValue(ctx, "user_role", role)
	return ctx
}

func setupBlockTreatmentWorkflowDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:block_treatment_workflow_%s?mode=memory&cache=shared", uuid.NewString())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	schemaStatements := []string{
		`CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, username TEXT, role TEXT, is_active BOOLEAN);`,
		`CREATE TABLE companies (id TEXT PRIMARY KEY, name TEXT);`,
		`CREATE TABLE user_company_assignments (user_id TEXT, company_id TEXT, is_active BOOLEAN);`,
		`CREATE TABLE estates (id TEXT PRIMARY KEY, name TEXT, company_id TEXT);`,
		`CREATE TABLE divisions (id TEXT PRIMARY KEY, name TEXT, estate_id TEXT);`,
		`CREATE TABLE tarif_blok (id TEXT PRIMARY KEY, company_id TEXT, perlakuan TEXT);`,
		`CREATE TABLE blocks (id TEXT PRIMARY KEY, block_code TEXT, name TEXT, division_id TEXT, tarif_blok_id TEXT, perlakuan TEXT, updated_at DATETIME);`,
		`CREATE TABLE block_treatment_change_requests (
			id TEXT PRIMARY KEY,
			company_id TEXT NOT NULL,
			semester TEXT NOT NULL,
			status TEXT NOT NULL,
			notes TEXT,
			revision_no INTEGER NOT NULL,
			submitted_at DATETIME,
			reviewed_by TEXT,
			reviewed_at DATETIME,
			approved_by TEXT,
			approved_at DATETIME,
			rejected_reason TEXT,
			applied_by TEXT,
			applied_at DATETIME,
			created_by TEXT NOT NULL,
			updated_by TEXT,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		);`,
		`CREATE TABLE block_treatment_change_request_items (
			id TEXT PRIMARY KEY,
			request_id TEXT NOT NULL,
			block_id TEXT NOT NULL,
			current_tarif_blok_id TEXT,
			current_perlakuan TEXT,
			proposed_tarif_blok_id TEXT NOT NULL,
			proposed_perlakuan TEXT,
			impact_summary TEXT,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		);`,
		`CREATE TABLE block_treatment_request_status_logs (
			id TEXT PRIMARY KEY,
			request_id TEXT NOT NULL,
			from_status TEXT,
			to_status TEXT NOT NULL,
			action TEXT NOT NULL,
			notes TEXT,
			acted_by TEXT,
			acted_at DATETIME NOT NULL
		);`,
	}

	for _, statement := range schemaStatements {
		require.NoError(t, db.Exec(statement).Error)
	}

	return db
}

func seedBlockTreatmentWorkflowFixture(t *testing.T, db *gorm.DB) *blockTreatmentWorkflowFixture {
	t.Helper()

	fixture := &blockTreatmentWorkflowFixture{
		companyID:   "company-1",
		estateID:    "estate-1",
		divisionID:  "division-1",
		blockID:     "block-1",
		oldTarifID:  "tarif-old",
		newTarifID:  "tarif-new",
		managerID:   "manager-1",
		areaMgrID:   "area-1",
		companyAdm:  "company-admin-1",
		semester:    "2026-S1",
		impactNotes: "Uji integrasi perubahan perlakuan",
	}

	require.NoError(t, db.Exec(`
		INSERT INTO users (id, name, username, role, is_active) VALUES
		(?, 'Manager One', 'manager.one', 'MANAGER', 1),
		(?, 'Area Manager One', 'area.one', 'AREA_MANAGER', 1),
		(?, 'Company Admin One', 'company.admin.one', 'COMPANY_ADMIN', 1)
	`, fixture.managerID, fixture.areaMgrID, fixture.companyAdm).Error)

	require.NoError(t, db.Exec(`INSERT INTO companies (id, name) VALUES (?, 'Company One')`, fixture.companyID).Error)
	require.NoError(t, db.Exec(`
		INSERT INTO user_company_assignments (user_id, company_id, is_active) VALUES
		(?, ?, 1),
		(?, ?, 1),
		(?, ?, 1)
	`, fixture.managerID, fixture.companyID, fixture.areaMgrID, fixture.companyID, fixture.companyAdm, fixture.companyID).Error)

	require.NoError(t, db.Exec(`INSERT INTO estates (id, name, company_id) VALUES (?, 'Estate One', ?)`, fixture.estateID, fixture.companyID).Error)
	require.NoError(t, db.Exec(`INSERT INTO divisions (id, name, estate_id) VALUES (?, 'Division One', ?)`, fixture.divisionID, fixture.estateID).Error)
	require.NoError(t, db.Exec(`
		INSERT INTO tarif_blok (id, company_id, perlakuan) VALUES
		(?, ?, 'Perlakuan Lama'),
		(?, ?, 'Perlakuan Baru')
	`, fixture.oldTarifID, fixture.companyID, fixture.newTarifID, fixture.companyID).Error)
	require.NoError(t, db.Exec(`
		INSERT INTO blocks (id, block_code, name, division_id, tarif_blok_id, perlakuan, updated_at)
		VALUES (?, 'A01', 'Blok A01', ?, ?, 'Perlakuan Lama', ?)
	`, fixture.blockID, fixture.divisionID, fixture.oldTarifID, time.Now().Add(-time.Hour)).Error)

	return fixture
}

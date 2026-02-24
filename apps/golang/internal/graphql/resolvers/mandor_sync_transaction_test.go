package resolvers

import (
	"context"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	graphqlAuth "agrinovagraphql/server/internal/graphql/domain/auth"
	graphqlMandor "agrinovagraphql/server/internal/graphql/domain/mandor"
	panenResolvers "agrinovagraphql/server/internal/panen/resolvers"
)

type syncTestFixture struct {
	mandorID   string
	companyID  string
	estateID   string
	divisionID string
	blockID    string
	employeeID string
}

func TestSyncHarvestRecords_UpdateRollbackWhenPhotoPayloadInvalid(t *testing.T) {
	db := setupMandorSyncTestDB(t)
	fixture := seedMandorSyncFixture(t, db)
	mutation := newMandorSyncMutationResolver(t, db)
	ctx := context.WithValue(context.Background(), "user_id", fixture.mandorID)

	existingID := "70000000-0000-0000-0000-000000000001"
	existingLocalID := "local-update-rollback"
	require.NoError(t, db.Exec(`
		INSERT INTO harvest_records (
			id, local_id, tanggal, mandor_id, company_id, estate_id, division_id, block_id,
			karyawan_id, employee_division_id, employee_division_name, nik, karyawan,
			berat_tbs, jumlah_janjang, status, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		existingID,
		existingLocalID,
		time.Now().Add(-2*time.Hour),
		fixture.mandorID,
		fixture.companyID,
		fixture.estateID,
		fixture.divisionID,
		fixture.blockID,
		fixture.employeeID,
		fixture.divisionID,
		"Divisi Test",
		"NIK-OLD",
		"NIK-OLD",
		50.0,
		10,
		string(graphqlMandor.HarvestStatusPending),
		time.Now().Add(-2*time.Hour),
		time.Now().Add(-2*time.Hour),
	).Error)

	invalidPhoto := "data:image/jpeg;base64,@@@invalid@@@"
	employeeDivisionName := "Divisi Test"
	serverID := existingID
	updateInput := graphqlMandor.HarvestSyncInput{
		DeviceID:        "device-sync-test",
		ClientTimestamp: time.Now(),
		Records: []*graphqlMandor.HarvestRecordSyncInput{
			{
				LocalID:              existingLocalID,
				ServerID:             &serverID,
				Tanggal:              time.Now(),
				MandorID:             fixture.mandorID,
				CompanyID:            &fixture.companyID,
				EstateID:             &fixture.estateID,
				DivisionID:           &fixture.divisionID,
				BlockID:              fixture.blockID,
				KaryawanID:           fixture.employeeID,
				Nik:                  "NIK-NEW",
				EmployeeDivisionID:   &fixture.divisionID,
				EmployeeDivisionName: &employeeDivisionName,
				JumlahJanjang:        99,
				BeratTbs:             999.5,
				PhotoURL:             &invalidPhoto,
			},
		},
	}

	result, err := mutation.SyncHarvestRecords(ctx, updateInput)
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Equal(t, int32(1), result.RecordsProcessed)
	require.Equal(t, int32(0), result.RecordsSuccessful)
	require.Equal(t, int32(1), result.RecordsFailed)
	require.Len(t, result.Results, 1)
	require.False(t, result.Results[0].Success)
	require.NotNil(t, result.Results[0].Error)
	require.Contains(t, *result.Results[0].Error, "failed to process harvest photo")

	var persisted struct {
		BeratTbs      float64 `gorm:"column:berat_tbs"`
		JumlahJanjang int32   `gorm:"column:jumlah_janjang"`
		Karyawan      string  `gorm:"column:karyawan"`
	}
	require.NoError(t, db.Table("harvest_records").
		Select("berat_tbs, jumlah_janjang, karyawan").
		Where("id = ?", existingID).
		Take(&persisted).Error)

	require.InDelta(t, 50.0, persisted.BeratTbs, 0.0001)
	require.Equal(t, int32(10), persisted.JumlahJanjang)
	require.Equal(t, "NIK-OLD", persisted.Karyawan)
}

func TestSyncHarvestRecords_CreateRollbackWhenIdentitySaveFails(t *testing.T) {
	db := setupMandorSyncTestDB(t)
	fixture := seedMandorSyncFixture(t, db)
	mutation := newMandorSyncMutationResolver(t, db)
	ctx := context.WithValue(context.Background(), "user_id", fixture.mandorID)

	// Force enforceSyncIdentity->SaveHarvestRecord update to fail after insert.
	require.NoError(t, db.Exec(`
		CREATE TRIGGER harvest_records_fail_identity_update
		BEFORE UPDATE ON harvest_records
		BEGIN
			SELECT RAISE(ABORT, 'identity update blocked');
		END;
	`).Error)

	localID := "local-create-rollback"
	employeeDivisionName := "Divisi Test"
	createInput := graphqlMandor.HarvestSyncInput{
		DeviceID:        "device-sync-test",
		ClientTimestamp: time.Now(),
		Records: []*graphqlMandor.HarvestRecordSyncInput{
			{
				LocalID:              localID,
				Tanggal:              time.Now(),
				MandorID:             fixture.mandorID,
				CompanyID:            &fixture.companyID,
				EstateID:             &fixture.estateID,
				DivisionID:           &fixture.divisionID,
				BlockID:              fixture.blockID,
				KaryawanID:           fixture.employeeID,
				Nik:                  "NIK-CREATE",
				EmployeeDivisionID:   &fixture.divisionID,
				EmployeeDivisionName: &employeeDivisionName,
				JumlahJanjang:        15,
				BeratTbs:             120.25,
			},
		},
	}

	result, err := mutation.SyncHarvestRecords(ctx, createInput)
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Equal(t, int32(1), result.RecordsProcessed)
	require.Equal(t, int32(0), result.RecordsSuccessful)
	require.Equal(t, int32(1), result.RecordsFailed)
	require.Len(t, result.Results, 1)
	require.False(t, result.Results[0].Success)
	require.NotNil(t, result.Results[0].Error)
	require.Contains(t, *result.Results[0].Error, "identity update blocked")

	var count int64
	require.NoError(t, db.Table("harvest_records").
		Where("local_id = ? AND mandor_id = ?", localID, fixture.mandorID).
		Count(&count).Error)
	require.Equal(t, int64(0), count, "create write must be rolled back on identity-save failure")
}

func TestSyncHarvestRecords_ConflictServerWins_NoLocalWrite(t *testing.T) {
	db := setupMandorSyncTestDB(t)
	fixture := seedMandorSyncFixture(t, db)
	mutation := newMandorSyncMutationResolver(t, db)
	ctx := context.WithValue(context.Background(), "user_id", fixture.mandorID)

	existingID := "70000000-0000-0000-0000-000000000002"
	existingLocalID := "local-conflict-server-wins"
	serverUpdatedAt := time.Now()
	require.NoError(t, db.Exec(`
		INSERT INTO harvest_records (
			id, local_id, tanggal, mandor_id, company_id, estate_id, division_id, block_id,
			karyawan_id, employee_division_id, employee_division_name, nik, karyawan,
			berat_tbs, jumlah_janjang, status, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		existingID,
		existingLocalID,
		serverUpdatedAt.Add(-2*time.Hour),
		fixture.mandorID,
		fixture.companyID,
		fixture.estateID,
		fixture.divisionID,
		fixture.blockID,
		fixture.employeeID,
		fixture.divisionID,
		"Divisi Test",
		"NIK-SERVER",
		"NIK-SERVER",
		60.0,
		12,
		string(graphqlMandor.HarvestStatusPending),
		serverUpdatedAt.Add(-2*time.Hour),
		serverUpdatedAt,
	).Error)

	serverID := existingID
	lastUpdatedFromClient := serverUpdatedAt.Add(-30 * time.Minute)
	employeeDivisionName := "Divisi Test"
	conflictInput := graphqlMandor.HarvestSyncInput{
		DeviceID:        "device-sync-test",
		ClientTimestamp: time.Now(),
		Records: []*graphqlMandor.HarvestRecordSyncInput{
			{
				LocalID:              existingLocalID,
				ServerID:             &serverID,
				Tanggal:              time.Now(),
				MandorID:             fixture.mandorID,
				CompanyID:            &fixture.companyID,
				EstateID:             &fixture.estateID,
				DivisionID:           &fixture.divisionID,
				BlockID:              fixture.blockID,
				KaryawanID:           fixture.employeeID,
				Nik:                  "NIK-CLIENT",
				EmployeeDivisionID:   &fixture.divisionID,
				EmployeeDivisionName: &employeeDivisionName,
				JumlahJanjang:        999,
				BeratTbs:             999.9,
				LastUpdated:          &lastUpdatedFromClient,
			},
		},
	}

	result, err := mutation.SyncHarvestRecords(ctx, conflictInput)
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Equal(t, int32(1), result.RecordsProcessed)
	require.Equal(t, int32(1), result.RecordsSuccessful)
	require.Equal(t, int32(0), result.RecordsFailed)
	require.Equal(t, int32(1), result.ConflictsDetected)
	require.Len(t, result.Results, 1)
	require.True(t, result.Results[0].Success)
	require.NotNil(t, result.Results[0].ServerID)
	require.Equal(t, existingID, *result.Results[0].ServerID)

	var persisted struct {
		BeratTbs      float64   `gorm:"column:berat_tbs"`
		JumlahJanjang int32     `gorm:"column:jumlah_janjang"`
		Karyawan      string    `gorm:"column:karyawan"`
		UpdatedAt     time.Time `gorm:"column:updated_at"`
	}
	require.NoError(t, db.Table("harvest_records").
		Select("berat_tbs, jumlah_janjang, karyawan, updated_at").
		Where("id = ?", existingID).
		Take(&persisted).Error)

	require.InDelta(t, 60.0, persisted.BeratTbs, 0.0001)
	require.Equal(t, int32(12), persisted.JumlahJanjang)
	require.Equal(t, "NIK-SERVER", persisted.Karyawan)
	require.WithinDuration(t, serverUpdatedAt, persisted.UpdatedAt, time.Second)
}

func newMandorSyncMutationResolver(t *testing.T, db *gorm.DB) *mutationResolver {
	t.Helper()
	return &mutationResolver{
		Resolver: &Resolver{
			db:            db,
			uploadsDir:    t.TempDir(),
			PanenResolver: panenResolvers.NewPanenResolver(db, nil),
		},
	}
}

func setupMandorSyncTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := "file:" + t.Name() + "?mode=memory&cache=shared"
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
			division_id TEXT
		);`,
		`CREATE TABLE user_company_assignments (
			id TEXT PRIMARY KEY,
			user_id TEXT,
			company_id TEXT,
			is_active BOOLEAN,
			updated_at DATETIME
		);`,
		`CREATE TABLE user_estate_assignments (
			id TEXT PRIMARY KEY,
			user_id TEXT,
			estate_id TEXT,
			is_active BOOLEAN,
			updated_at DATETIME
		);`,
		`CREATE TABLE harvest_records (
			id TEXT PRIMARY KEY,
			local_id TEXT,
			device_id TEXT,
			tanggal DATETIME,
			mandor_id TEXT,
			asisten_id TEXT,
			company_id TEXT,
			estate_id TEXT,
			division_id TEXT,
			block_id TEXT,
			karyawan_id TEXT,
			employee_division_id TEXT,
			employee_division_name TEXT,
			nik TEXT,
			karyawan TEXT,
			berat_tbs REAL,
			jumlah_janjang INTEGER,
			jjg_matang INTEGER,
			jjg_mentah INTEGER,
			jjg_lewat_matang INTEGER,
			jjg_busuk_abnormal INTEGER,
			jjg_tangkai_panjang INTEGER,
			total_brondolan REAL,
			status TEXT,
			approved_by TEXT,
			approved_at DATETIME,
			rejected_reason TEXT,
			notes TEXT,
			latitude REAL,
			longitude REAL,
			photo_url TEXT,
			created_at DATETIME,
			updated_at DATETIME
		);`,
	}
	for _, stmt := range schema {
		require.NoError(t, db.Exec(stmt).Error)
	}

	return db
}

func seedMandorSyncFixture(t *testing.T, db *gorm.DB) *syncTestFixture {
	t.Helper()
	fixture := &syncTestFixture{
		mandorID:   "10000000-0000-0000-0000-000000000001",
		companyID:  "20000000-0000-0000-0000-000000000001",
		estateID:   "30000000-0000-0000-0000-000000000001",
		divisionID: "40000000-0000-0000-0000-000000000001",
		blockID:    "50000000-0000-0000-0000-000000000001",
		employeeID: "60000000-0000-0000-0000-000000000001",
	}

	now := time.Now()
	require.NoError(t, db.Exec(`
		INSERT INTO users (id, username, name, role, is_active, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, fixture.mandorID, "mandor-sync", "Mandor Sync", string(graphqlAuth.UserRoleMandor), true, now, now).Error)
	require.NoError(t, db.Exec(`
		INSERT INTO companies (id, name, company_code, status, is_active, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, fixture.companyID, "Company Sync", "CMP", "ACTIVE", true, now, now).Error)
	require.NoError(t, db.Exec(`
		INSERT INTO estates (id, name, code, company_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, fixture.estateID, "Estate Sync", "EST", fixture.companyID, now, now).Error)
	require.NoError(t, db.Exec(`
		INSERT INTO divisions (id, name, code, estate_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, fixture.divisionID, "Divisi Test", "DIV", fixture.estateID, now, now).Error)
	require.NoError(t, db.Exec(`
		INSERT INTO blocks (id, block_code, name, division_id, status, istm, is_active, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, fixture.blockID, "B1", "Block 1", fixture.divisionID, "INTI", "N", true, now, now).Error)

	return fixture
}

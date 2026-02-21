package services

import (
	"context"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"agrinovagraphql/server/internal/master/models"
)

func setupMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	mockDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create mock: %v", err)
	}

	dialector := postgres.New(postgres.Config{
		Conn:       mockDB,
		DriverName: "postgres",
	})

	db, err := gorm.Open(dialector, &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open gorm connection: %v", err)
	}

	return db, mock
}

func TestMasterService_CreateBlock(t *testing.T) {
	db, mock := setupMockDB(t)
	service := &masterService{db: db}
	ctx := context.Background()

	blockID := uuid.New().String()
	divisionID := uuid.New().String()
	creatorID := uuid.New().String()

	req := &models.CreateBlockRequest{
		BlockCode:    "BLK001",
		Name:         "Block Test 1",
		DivisionID:   divisionID,
		LuasHa:       float64Ptr(10.5),
		CropType:     "Kelapa Sawit",
		PlantingYear: intPtr(2020),
	}

	// Mock Begin Transaction
	mock.ExpectBegin()

	// Mock INSERT query for block
	mock.ExpectQuery(regexp.QuoteMeta(
		`INSERT INTO "blocks" ("id","block_code","name","area_ha","crop_type","planting_year","division_id","is_active","created_at","updated_at") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING "id"`)).
		WithArgs(sqlmock.AnyArg(), req.BlockCode, req.Name, *req.LuasHa, req.CropType, *req.PlantingYear, req.DivisionID, true, sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(blockID))

	// Mock Commit
	mock.ExpectCommit()

	// Execute
	block, err := service.CreateBlock(ctx, req, creatorID)

	// Assertions
	assert.NoError(t, err)
	assert.NotNil(t, block)
	assert.Equal(t, req.BlockCode, block.BlockCode)
	assert.Equal(t, req.Name, block.Name)
	assert.Equal(t, req.DivisionID, block.DivisionID)
	assert.Equal(t, *req.LuasHa, *block.LuasHa)
	assert.True(t, block.IsActive)

	// Verify expectations
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestMasterService_GetBlockByID(t *testing.T) {
	db, mock := setupMockDB(t)
	service := &masterService{db: db}
	ctx := context.Background()

	blockID := uuid.New().String()
	divisionID := uuid.New().String()
	userID := uuid.New().String()

	// Mock SELECT query
	rows := sqlmock.NewRows([]string{"id", "block_code", "name", "division_id", "area_ha", "is_active"}).
		AddRow(blockID, "BLK001", "Block Test 1", divisionID, 10.5, true)

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "blocks" WHERE id = $1 AND "blocks"."deleted_at" IS NULL ORDER BY "blocks"."id" LIMIT $2`)).
		WithArgs(blockID, 1).
		WillReturnRows(rows)

	// Execute
	block, err := service.GetBlockByID(ctx, blockID, userID)

	// Assertions
	assert.NoError(t, err)
	assert.NotNil(t, block)
	assert.Equal(t, blockID, block.ID)
	assert.Equal(t, "BLK001", block.BlockCode)
	assert.Equal(t, "Block Test 1", block.Name)

	// Verify expectations
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestMasterService_UpdateBlock(t *testing.T) {
	db, mock := setupMockDB(t)
	service := &masterService{db: db}
	ctx := context.Background()

	blockID := uuid.New().String()
	updaterID := uuid.New().String()

	req := &models.UpdateBlockRequest{
		ID:     blockID,
		Name:   stringPtr("Updated Block Name"),
		LuasHa: float64Ptr(12.0),
	}

	// Mock Begin Transaction
	mock.ExpectBegin()

	// Mock SELECT to find existing block
	selectRows := sqlmock.NewRows([]string{"id", "block_code", "name", "area_ha"}).
		AddRow(blockID, "BLK001", "Old Name", 10.5)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "blocks"`)).
		WillReturnRows(selectRows)

	// Mock UPDATE query
	mock.ExpectExec(regexp.QuoteMeta(
		`UPDATE "blocks" SET "name"=$1,"area_ha"=$2,"updated_at"=$3 WHERE "id" = $4`)).
		WithArgs(*req.Name, *req.LuasHa, sqlmock.AnyArg(), blockID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Mock Commit
	mock.ExpectCommit()

	// Execute
	block, err := service.UpdateBlock(ctx, req, updaterID)

	// Assertions
	assert.NoError(t, err)
	assert.NotNil(t, block)
	assert.Equal(t, *req.Name, block.Name)
	assert.Equal(t, *req.LuasHa, *block.LuasHa)

	// Verify expectations
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestMasterService_DeleteBlock(t *testing.T) {
	db, mock := setupMockDB(t)
	service := &masterService{db: db}
	ctx := context.Background()

	blockID := uuid.New().String()
	deleterID := uuid.New().String()

	// Mock Begin Transaction
	mock.ExpectBegin()

	// Mock UPDATE query for soft delete
	mock.ExpectExec(regexp.QuoteMeta(
		`UPDATE "blocks" SET "deleted_at"=$1 WHERE "blocks"."id" = $2 AND "blocks"."deleted_at" IS NULL`)).
		WithArgs(sqlmock.AnyArg(), blockID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Mock Commit
	mock.ExpectCommit()

	// Execute
	err := service.DeleteBlock(ctx, blockID, deleterID)

	// Assertions
	assert.NoError(t, err)

	// Verify expectations
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestMasterService_GetBlocks_WithFilters(t *testing.T) {
	db, mock := setupMockDB(t)
	service := &masterService{db: db}
	ctx := context.Background()

	userID := uuid.New().String()
	divisionID := uuid.New().String()

	filters := &models.MasterFilters{
		DivisionID: stringPtr(divisionID),
		Search:     stringPtr("Test"),
		IsActive:   boolPtr(true),
	}

	// Mock SELECT query with filters
	rows := sqlmock.NewRows([]string{"id", "block_code", "name", "division_id", "is_active"}).
		AddRow(uuid.New().String(), "BLK001", "Test Block 1", divisionID, true).
		AddRow(uuid.New().String(), "BLK002", "Test Block 2", divisionID, true)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "blocks"`)).
		WillReturnRows(rows)

	// Execute
	blocks, err := service.GetBlocks(ctx, filters, userID)

	// Assertions
	assert.NoError(t, err)
	assert.NotNil(t, blocks)
	assert.Len(t, blocks, 2)
	assert.Equal(t, "BLK001", blocks[0].BlockCode)
	assert.Equal(t, "BLK002", blocks[1].BlockCode)

	// Verify expectations
	assert.NoError(t, mock.ExpectationsWereMet())
}

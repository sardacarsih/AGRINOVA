package services

import (
	"context"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"agrinovagraphql/server/internal/master/models"
)

func TestMasterService_CreateDivision(t *testing.T) {
	db, mock := setupMockDB(t)
	service := &masterService{db: db}
	ctx := context.Background()

	divisionID := uuid.New().String()
	estateID := uuid.New().String()
	creatorID := uuid.New().String()

	req := &models.CreateDivisionRequest{
		Code:     "DIV001",
		Name:     "Division Test 1",
		EstateID: estateID,
	}

	// Mock Begin Transaction
	mock.ExpectBegin()

	// Mock INSERT query
	mock.ExpectQuery(regexp.QuoteMeta(
		`INSERT INTO "divisions" ("id","name","code","estate_id","created_at","updated_at") VALUES ($1,$2,$3,$4,$5,$6) RETURNING "id"`)).
		WithArgs(sqlmock.AnyArg(), req.Name, req.Code, req.EstateID, sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(divisionID))

	// Mock Commit
	mock.ExpectCommit()

	// Execute
	division, err := service.CreateDivision(ctx, req, creatorID)

	// Assertions
	assert.NoError(t, err)
	assert.NotNil(t, division)
	assert.Equal(t, req.Code, division.Code)
	assert.Equal(t, req.Name, division.Name)
	assert.Equal(t, req.EstateID, division.EstateID)

	// Verify expectations
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestMasterService_GetDivisionByID(t *testing.T) {
	db, mock := setupMockDB(t)
	service := &masterService{db: db}
	ctx := context.Background()

	divisionID := uuid.New().String()
	estateID := uuid.New().String()
	userID := uuid.New().String()

	// Mock SELECT query
	rows := sqlmock.NewRows([]string{"id", "code", "name", "estate_id"}).
		AddRow(divisionID, "DIV001", "Division Test 1", estateID)

	mock.ExpectQuery(regexp.QuoteMeta(
		`SELECT * FROM "divisions" WHERE id = $1 AND "divisions"."deleted_at" IS NULL ORDER BY "divisions"."id" LIMIT $2`)).
		WithArgs(divisionID, 1).
		WillReturnRows(rows)

	// Execute
	division, err := service.GetDivisionByID(ctx, divisionID, userID)

	// Assertions
	assert.NoError(t, err)
	assert.NotNil(t, division)
	assert.Equal(t, divisionID, division.ID)
	assert.Equal(t, "DIV001", division.Code)
	assert.Equal(t, "Division Test 1", division.Name)

	// Verify expectations
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestMasterService_UpdateDivision(t *testing.T) {
	db, mock := setupMockDB(t)
	service := &masterService{db: db}
	ctx := context.Background()

	divisionID := uuid.New().String()
	updaterID := uuid.New().String()

	req := &models.UpdateDivisionRequest{
		ID:   divisionID,
		Name: stringPtr("Updated Division Name"),
	}

	// Mock Begin Transaction
	mock.ExpectBegin()

	// Mock SELECT to find existing division
	selectRows := sqlmock.NewRows([]string{"id", "code", "name"}).
		AddRow(divisionID, "DIV001", "Old Name")

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "divisions"`)).
		WillReturnRows(selectRows)

	// Mock UPDATE query
	mock.ExpectExec(regexp.QuoteMeta(
		`UPDATE "divisions" SET "name"=$1,"updated_at"=$2 WHERE "id" = $3`)).
		WithArgs(*req.Name, sqlmock.AnyArg(), divisionID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Mock Commit
	mock.ExpectCommit()

	// Execute
	division, err := service.UpdateDivision(ctx, req, updaterID)

	// Assertions
	assert.NoError(t, err)
	assert.NotNil(t, division)
	assert.Equal(t, *req.Name, division.Name)

	// Verify expectations
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestMasterService_DeleteDivision(t *testing.T) {
	db, mock := setupMockDB(t)
	service := &masterService{db: db}
	ctx := context.Background()

	divisionID := uuid.New().String()
	deleterID := uuid.New().String()

	// Mock Begin Transaction
	mock.ExpectBegin()

	// Mock UPDATE query for soft delete
	mock.ExpectExec(regexp.QuoteMeta(
		`UPDATE "divisions" SET "deleted_at"=$1 WHERE "divisions"."id" = $2 AND "divisions"."deleted_at" IS NULL`)).
		WithArgs(sqlmock.AnyArg(), divisionID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Mock Commit
	mock.ExpectCommit()

	// Execute
	err := service.DeleteDivision(ctx, divisionID, deleterID)

	// Assertions
	assert.NoError(t, err)

	// Verify expectations
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestMasterService_GetDivisions_WithFilters(t *testing.T) {
	db, mock := setupMockDB(t)
	service := &masterService{db: db}
	ctx := context.Background()

	userID := uuid.New().String()
	estateID := uuid.New().String()

	filters := &models.MasterFilters{
		EstateID: stringPtr(estateID),
		Search:   stringPtr("Test"),
		IsActive: boolPtr(true),
	}

	// Mock SELECT query with filters
	rows := sqlmock.NewRows([]string{"id", "code", "name", "estate_id"}).
		AddRow(uuid.New().String(), "DIV001", "Test Division 1", estateID).
		AddRow(uuid.New().String(), "DIV002", "Test Division 2", estateID)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "divisions"`)).
		WillReturnRows(rows)

	// Execute
	divisions, err := service.GetDivisions(ctx, filters, userID)

	// Assertions
	assert.NoError(t, err)
	assert.NotNil(t, divisions)
	assert.Len(t, divisions, 2)
	assert.Equal(t, "DIV001", divisions[0].Code)
	assert.Equal(t, "DIV002", divisions[1].Code)

	// Verify expectations
	assert.NoError(t, mock.ExpectationsWereMet())
}

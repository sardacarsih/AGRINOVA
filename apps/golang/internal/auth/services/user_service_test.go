package services

import (
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)

	dialector := postgres.New(postgres.Config{
		Conn:       db,
		DriverName: "postgres",
	})

	gormDB, err := gorm.Open(dialector, &gorm.Config{})
	assert.NoError(t, err)

	return gormDB, mock
}

func TestUserService_GetUserByID_Mock(t *testing.T) {
	db, mock := setupMockDB(t)
	service := &UserService{db: db}

	userID := "user-123"
	query := regexp.QuoteMeta(`SELECT * FROM "users" WHERE id = $1`)

	rows := sqlmock.NewRows([]string{"id", "username", "nama", "created_at", "updated_at"}).
		AddRow(userID, "testuser", "Test User", time.Now(), time.Now())

	mock.ExpectQuery(query).
		WithArgs(userID, 1).
		WillReturnRows(rows)

	user, err := service.GetUserByID(userID)
	assert.NoError(t, err)
	assert.NotNil(t, user)
	assert.Equal(t, userID, user.ID)
	assert.Equal(t, "testuser", user.Username)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserService_DeleteUserSafe(t *testing.T) {
	db, mock := setupMockDB(t)
	service := &UserService{db: db}

	userID := "user-123"

	// Expect to fetch user first
	selectQuery := regexp.QuoteMeta(`SELECT * FROM "users" WHERE id = $1`)
	mock.ExpectQuery(selectQuery).
		WithArgs(userID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "username", "nama", "created_at", "updated_at"}).
			AddRow(userID, "testuser", "Test User", time.Now(), time.Now()))

	mock.ExpectBegin()

	// Expect soft delete (UPDATE with deleted_at)
	deleteQuery := regexp.QuoteMeta(`UPDATE "users" SET "deleted_at"`)
	mock.ExpectExec(deleteQuery).
		WillReturnResult(sqlmock.NewResult(1, 1))

	mock.ExpectCommit()

	resp, err := service.DeleteUserSafe(userID)
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.True(t, resp.Success)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserService_ToggleUserStatus(t *testing.T) {
	db, mock := setupMockDB(t)
	service := &UserService{db: db}

	userID := "user-123"

	// Expect to fetch user
	selectQuery := regexp.QuoteMeta(`SELECT * FROM "users" WHERE id = $1`)
	mock.ExpectQuery(selectQuery).
		WithArgs(userID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "username", "is_active", "created_at", "updated_at"}).
			AddRow(userID, "testuser", true, time.Now(), time.Now()))

	mock.ExpectBegin()

	// Expect update to toggle status
	updateQuery := regexp.QuoteMeta(`UPDATE "users" SET`)
	mock.ExpectExec(updateQuery).
		WillReturnResult(sqlmock.NewResult(1, 1))

	mock.ExpectCommit()

	resp, err := service.ToggleUserStatus(userID)
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.True(t, resp.Success)

	assert.NoError(t, mock.ExpectationsWereMet())
}

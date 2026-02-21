package services

import (
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupCookieMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
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

func TestCookieService_ValidateSession(t *testing.T) {
	db, mock := setupCookieMockDB(t)
	config := CookieConfig{
		Domain:        "localhost",
		SecureCookies: false,
	}
	service := NewCookieService(db, nil, config)

	// Create request with cookie
	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{
		Name:  "auth-session",
		Value: "valid-token",
	})

	// Mock DB response
	// We expect a query that selects from user_sessions with Preload("User")
	// GORM's Preload usually executes a separate query or a JOIN depending on configuration.
	// For "User" (belongs to), it often does a separate query if not using Joins, but let's see.
	// Actually, Preload usually does a second query.
	// Wait, I changed it to `c.db.Preload("User").Where(...)`.
	// GORM might run:
	// 1. SELECT * FROM user_sessions WHERE ...
	// 2. SELECT * FROM users WHERE id IN (...)

	// 1. Session Query
	sessionQuery := regexp.QuoteMeta(`SELECT * FROM "user_sessions" WHERE`) + ".*" + regexp.QuoteMeta(`session_token = $1`) + ".*" + regexp.QuoteMeta(`is_active = $2`) + ".*"
	sessionRows := sqlmock.NewRows([]string{"id", "user_id", "session_token", "is_active", "expires_at", "last_activity"}).
		AddRow("session-1", "user-1", "valid-token", true, time.Now().Add(1*time.Hour), time.Now())

	mock.ExpectQuery(sessionQuery).
		WithArgs("valid-token", true, 1).
		WillReturnRows(sessionRows)

	// 2. User Query (triggered by Preload)
	userQuery := regexp.QuoteMeta(`SELECT * FROM "users"`) + ".*"
	userRows := sqlmock.NewRows([]string{"id", "username", "nama"}).
		AddRow("user-1", "testuser", "Test User")

	mock.ExpectQuery(userQuery).
		WithArgs("user-1").
		WillReturnRows(userRows)

	// 3. Update LastActivity (async)
	// Since it's async (go func), it might not happen immediately or deterministically in test.
	// However, sqlmock might complain if we don't expect it if it happens fast enough,
	// or we might miss it.
	// For unit testing async code, it's tricky. We might skip expecting it or use a wait.
	// But `sqlmock` is strict. If the goroutine runs, it will try to execute.
	// Let's try to expect it, but if it fails due to timing, we might need to sleep or make it synchronous for test.
	// For now, let's NOT expect it and see if it fails with "call to Exec ... was not expected".
	// If it does, we add the expectation.

	user, session, err := service.ValidateSession(req)
	assert.NoError(t, err)
	assert.NotNil(t, user)
	assert.NotNil(t, session)
	assert.Equal(t, "user-1", user.ID)
	assert.Equal(t, "session-1", session.ID)

	// Allow some time for async goroutine
	time.Sleep(10 * time.Millisecond)
}

func TestCookieService_RevokeSession(t *testing.T) {
	db, mock := setupCookieMockDB(t)
	config := CookieConfig{
		Domain:        "localhost",
		SecureCookies: false,
	}
	service := NewCookieService(db, nil, config)

	w := httptest.NewRecorder()
	sessionID := "session-1"

	mock.ExpectBegin()

	// Expect update to deactivate session
	updateQuery := regexp.QuoteMeta(`UPDATE "user_sessions" SET "is_active"=$1,"updated_at"=$2 WHERE id = $3`)
	mock.ExpectExec(updateQuery).
		WithArgs(false, sqlmock.AnyArg(), sessionID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	mock.ExpectCommit()

	err := service.RevokeSession(w, sessionID)
	assert.NoError(t, err)

	// Check cookies are cleared
	cookies := w.Result().Cookies()
	foundSession := false
	for _, c := range cookies {
		if c.Name == "auth-session" {
			foundSession = true
			assert.Equal(t, "", c.Value)
			assert.True(t, c.MaxAge < 0)
		}
	}
	assert.True(t, foundSession)
}

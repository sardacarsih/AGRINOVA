package services

import (
	"net/http/httptest"
	"testing"
	"time"

	"agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/internal/graphql/generated"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB creates an in-memory SQLite database for testing
func setupLogoutTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// Auto-migrate the schema
	err = db.AutoMigrate(&models.UserSession{}, &generated.User{})
	require.NoError(t, err)

	return db
}

// setupLogoutTestServices creates test instances of required services
func setupLogoutTestServices(t *testing.T, db *gorm.DB) (*CookieService, *JWTService) {
	// Create JWT service
	jwtConfig := JWTConfig{
		SecretKey:            []byte("test-secret-key-for-testing-only-minimum-32-chars"),
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 7 * 24 * time.Hour,
	}
	jwtService := NewJWTService(jwtConfig)

	// Create cookie service
	cookieConfig := CookieConfig{
		Domain:            "localhost",
		SecureCookies:     false, // false for testing
		SameSiteStrict:    false,
		CSRFSecret:        []byte("test-csrf-secret-minimum-32-chars-long"),
		SessionDuration:   15 * time.Minute,
		CSRFTokenDuration: 1 * time.Hour,
	}
	cookieService := NewCookieService(db, jwtService, cookieConfig)

	return cookieService, jwtService
}

// createLogoutTestUser creates a test user in the database
func createLogoutTestUser(t *testing.T, db *gorm.DB) *generated.User {
	user := &generated.User{
		ID:       "test-user-id-123",
		Username: "testuser",
		Nama:     "Test User",
		Role:     generated.UserRoleSuperAdmin,
		IsActive: true,
	}

	err := db.Create(user).Error
	require.NoError(t, err)

	return user
}

// TestLogoutFlow_SuccessfulLogout tests the complete logout flow with a valid session
func TestLogoutFlow_SuccessfulLogout(t *testing.T) {
	// Setup
	db := setupLogoutTestDB(t)
	cookieService, _ := setupLogoutTestServices(t, db)
	user := createLogoutTestUser(t, db)

	// Create a session
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/graphql", nil)
	deviceID := "test-device-123"

	sessionResult, err := cookieService.CreateSession(w, user, deviceID, r)
	require.NoError(t, err)
	require.NotNil(t, sessionResult)
	require.True(t, sessionResult.Session.IsActive)

	// Verify session was created in database
	var dbSession models.UserSession
	err = db.First(&dbSession, "id = ?", sessionResult.SessionID).Error
	require.NoError(t, err)
	assert.True(t, dbSession.IsActive)

	// Verify cookies were set
	cookies := w.Result().Cookies()
	assert.NotEmpty(t, cookies, "Cookies should be set after session creation")

	// Perform logout by revoking session
	logoutW := httptest.NewRecorder()
	err = cookieService.RevokeSession(logoutW, sessionResult.SessionID)

	// Assertions
	assert.NoError(t, err)

	// Verify cookies were cleared
	logoutCookies := logoutW.Result().Cookies()
	assert.NotEmpty(t, logoutCookies, "Logout should set cookies to clear them")

	for _, cookie := range logoutCookies {
		if cookie.Name == "auth-session" || cookie.Name == "csrf-token" {
			assert.Equal(t, "", cookie.Value, "Cookie value should be empty")
			assert.Equal(t, -1, cookie.MaxAge, "Cookie MaxAge should be -1 to delete")
		}
	}

	// Verify session was deactivated in database
	err = db.First(&dbSession, "id = ?", sessionResult.SessionID).Error
	require.NoError(t, err)
	assert.False(t, dbSession.IsActive, "Session should be deactivated after logout")
}

// TestLogoutFlow_InvalidSession tests logout with an invalid/non-existent session
func TestLogoutFlow_InvalidSession(t *testing.T) {
	// Setup
	db := setupLogoutTestDB(t)
	cookieService, _ := setupLogoutTestServices(t, db)

	// Perform logout with invalid session
	w := httptest.NewRecorder()
	err := cookieService.RevokeSession(w, "invalid-session-id-does-not-exist")

	// Assertions - should still succeed and clear cookies
	// Note: RevokeSession will fail on DeactivateSession but still clear cookies
	// In a real scenario, WebLogout handles this gracefully

	// Verify cookies were cleared regardless
	cookies := w.Result().Cookies()
	assert.NotEmpty(t, cookies, "Cookies should be cleared even for invalid session")
}

// TestLogoutFlow_ConcurrentLogout tests multiple concurrent logout requests
func TestLogoutFlow_ConcurrentLogout(t *testing.T) {
	// Setup
	db := setupLogoutTestDB(t)
	cookieService, _ := setupLogoutTestServices(t, db)
	user := createLogoutTestUser(t, db)

	// Create a session
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/graphql", nil)
	deviceID := "test-device-concurrent"

	sessionResult, err := cookieService.CreateSession(w, user, deviceID, r)
	require.NoError(t, err)

	// Perform concurrent logouts
	const numConcurrent = 5
	results := make(chan error, numConcurrent)

	for i := 0; i < numConcurrent; i++ {
		go func() {
			logoutW := httptest.NewRecorder()
			err := cookieService.RevokeSession(logoutW, sessionResult.SessionID)
			results <- err
		}()
	}

	// Collect results
	successCount := 0
	for i := 0; i < numConcurrent; i++ {
		err := <-results
		if err == nil {
			successCount++
		}
	}

	// At least one should succeed
	assert.Greater(t, successCount, 0, "At least one concurrent logout should succeed")

	// Verify session was deactivated
	var dbSession models.UserSession
	err = db.First(&dbSession, "id = ?", sessionResult.SessionID).Error
	require.NoError(t, err)
	assert.False(t, dbSession.IsActive)
}

// TestCookieService_RevokeAllUserSessions tests revoking all sessions for a user
func TestCookieService_RevokeAllUserSessions(t *testing.T) {
	// Setup
	db := setupLogoutTestDB(t)
	cookieService, _ := setupLogoutTestServices(t, db)
	user := createLogoutTestUser(t, db)

	// Create multiple sessions for the same user
	const numSessions = 3
	sessionIDs := make([]string, numSessions)

	for i := 0; i < numSessions; i++ {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/graphql", nil)
		deviceID := "test-device-" + string(rune('A'+i))

		sessionResult, err := cookieService.CreateSession(w, user, deviceID, r)
		require.NoError(t, err)
		sessionIDs[i] = sessionResult.SessionID
	}

	// Verify all sessions are active
	var activeSessions []models.UserSession
	err := db.Where("user_id = ? AND is_active = ?", user.ID, true).Find(&activeSessions).Error
	require.NoError(t, err)
	assert.Equal(t, numSessions, len(activeSessions))

	// Revoke all user sessions
	w := httptest.NewRecorder()
	err = cookieService.RevokeAllUserSessions(w, user.ID)
	assert.NoError(t, err)

	// Verify all sessions were deactivated
	var remainingActiveSessions []models.UserSession
	err = db.Where("user_id = ? AND is_active = ?", user.ID, true).Find(&remainingActiveSessions).Error
	require.NoError(t, err)
	assert.Equal(t, 0, len(remainingActiveSessions), "All sessions should be deactivated")

	// Verify cookies were cleared
	cookies := w.Result().Cookies()
	assert.NotEmpty(t, cookies)
}

// TestCookieService_DeactivateSession tests the DeactivateSession method
func TestCookieService_DeactivateSession(t *testing.T) {
	// Setup
	db := setupLogoutTestDB(t)
	cookieService, _ := setupLogoutTestServices(t, db)
	user := createLogoutTestUser(t, db)

	// Create a session
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/graphql", nil)
	deviceID := "test-device-deactivate"

	sessionResult, err := cookieService.CreateSession(w, user, deviceID, r)
	require.NoError(t, err)

	// Verify session is active
	var dbSession models.UserSession
	err = db.First(&dbSession, "id = ?", sessionResult.SessionID).Error
	require.NoError(t, err)
	assert.True(t, dbSession.IsActive)

	// Deactivate session
	err = cookieService.DeactivateSession(sessionResult.SessionID)
	assert.NoError(t, err)

	// Verify session was deactivated
	err = db.First(&dbSession, "id = ?", sessionResult.SessionID).Error
	require.NoError(t, err)
	assert.False(t, dbSession.IsActive)
	assert.NotNil(t, dbSession.UpdatedAt)
}

// TestCookieService_ClearAuthCookies tests cookie clearing
func TestCookieService_ClearAuthCookies(t *testing.T) {
	// Setup
	db := setupLogoutTestDB(t)
	cookieService, _ := setupLogoutTestServices(t, db)

	// Clear cookies
	w := httptest.NewRecorder()
	cookieService.ClearAuthCookies(w)

	// Verify cookies were set to clear
	cookies := w.Result().Cookies()
	assert.NotEmpty(t, cookies)

	// Check that both auth-session and csrf-token cookies are cleared
	var authSessionCleared, csrfTokenCleared bool
	for _, cookie := range cookies {
		if cookie.Name == "auth-session" {
			assert.Equal(t, "", cookie.Value)
			assert.Equal(t, -1, cookie.MaxAge)
			authSessionCleared = true
		}
		if cookie.Name == "csrf-token" {
			assert.Equal(t, "", cookie.Value)
			assert.Equal(t, -1, cookie.MaxAge)
			csrfTokenCleared = true
		}
	}

	assert.True(t, authSessionCleared, "auth-session cookie should be cleared")
	assert.True(t, csrfTokenCleared, "csrf-token cookie should be cleared")
}

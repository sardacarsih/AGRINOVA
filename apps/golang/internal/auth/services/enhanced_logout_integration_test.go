package services

import (
	"context"
	"testing"
	"time"

	"agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/internal/graphql/generated"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// MockSessionCache is a mock implementation of SessionCache interface
type MockSessionCache struct {
	mock.Mock
}

func (m *MockSessionCache) InvalidateUserTokens(userID string) error {
	args := m.Called(userID)
	return args.Error(0)
}

// MockSecurityLoggingService is a mock implementation of SecurityLoggingService
type MockSecurityLoggingService struct {
	mock.Mock
}

func (m *MockSecurityLoggingService) LogSecurityEvent(ctx context.Context, entry SecurityLogEntry) {
	m.Called(ctx, entry)
}

// MockJWTService is a mock implementation of JWTService
type MockJWTService struct {
	mock.Mock
}

// Test database setup
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// Migrate tables
	err = db.AutoMigrate(
		&models.UserSession{},
		&models.JWTToken{},
		&models.DeviceBinding{},
		&models.SecurityEvent{},
	)
	require.NoError(t, err)

	return db
}

// Create test user session
func createTestSession(t *testing.T, db *gorm.DB, userID string) *models.UserSession {
	session := &models.UserSession{
		UserID:       userID,
		SessionToken: uuid.New().String(),
		Platform:     models.PlatformWeb,
		IPAddress:    "127.0.0.1",
		UserAgent:    "test-agent",
		LastActivity: time.Now(),
		ExpiresAt:    time.Now().Add(24 * time.Hour),
		IsActive:     true,
		LoginMethod:  models.LoginPassword,
	}

	err := db.Create(session).Error
	require.NoError(t, err)

	return session
}

// Create test JWT token
func createTestJWTToken(t *testing.T, db *gorm.DB, userID, deviceID string) *models.JWTToken {
	token := &models.JWTToken{
		UserID:       userID,
		DeviceID:     deviceID,
		TokenType:    models.TokenTypeJWT,
		TokenHash:    uuid.New().String(),
		ExpiresAt:    time.Now().Add(15 * time.Minute),
		IsRevoked:    false,
	}

	err := db.Create(token).Error
	require.NoError(t, err)

	return token
}

func TestLogoutService_Logout_Success(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	mockCache := &MockSessionCache{}
	mockSecurity := &MockSecurityLoggingService{}
	mockJWT := &MockJWTService{}

	logoutService := NewLogoutService(db, mockCache, mockSecurity, mockJWT)

	userID := uuid.New().String()
	deviceID := uuid.New().String()

	// Create test data
	session := createTestSession(t, db, userID)
	token := createTestJWTToken(t, db, userID, deviceID)

	// Configure mocks
	mockCache.On("InvalidateUserTokens", userID).Return(nil)
	mockSecurity.On("LogSecurityEvent", mock.Anything, mock.Anything).Return()

	// Test input
	input := LogoutInput{
		UserID:     userID,
		LogoutType: generated.LogoutTypeUserInitiated,
		DeviceContext: &generated.DeviceContextInput{
			DeviceID:   deviceID,
			Platform:   generated.PlatformTypeWeb,
			AppVersion: "1.0.0",
		},
		Reason:    "Test logout",
		SessionID: &session.ID,
		IPAddress: "127.0.0.1",
		UserAgent: "test-agent",
	}

	// Execute
	result, err := logoutService.Logout(context.Background(), input)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, result.Success)
	assert.True(t, result.SessionTerminated)
	assert.True(t, result.TokensInvalidated)
	assert.Equal(t, "You have been successfully logged out", result.Message)
	assert.False(t, result.RequiresSync)
	assert.NotEmpty(t, result.AuditLogID)
	assert.Equal(t, 0, result.RemainingSessions)

	// Verify database state
	var dbSession models.UserSession
	err = db.First(&dbSession, "id = ?", session.ID).Error
	require.NoError(t, err)
	assert.False(t, dbSession.IsActive)
	assert.True(t, dbSession.Revoked)
	assert.Equal(t, "User logout", *dbSession.RevokedReason)

	var dbToken models.JWTToken
	err = db.First(&dbToken, "id = ?", token.ID).Error
	require.NoError(t, err)
	assert.True(t, dbToken.IsRevoked)
	assert.NotNil(t, dbToken.RevokedAt)

	// Verify mocks were called
	mockCache.AssertExpectations(t)
	mockSecurity.AssertExpectations(t)
}

func TestLogoutService_LogoutAllDevices_Success(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	mockCache := &MockSessionCache{}
	mockSecurity := &MockSecurityLoggingService{}
	mockJWT := &MockJWTService{}

	logoutService := NewLogoutService(db, mockCache, mockSecurity, mockJWT)

	userID := uuid.New().String()
	deviceID1 := uuid.New().String()
	deviceID2 := uuid.New().String()

	// Create multiple sessions and tokens
	session1 := createTestSession(t, db, userID)
	session2 := createTestSession(t, db, userID)

	token1 := createTestJWTToken(t, db, userID, deviceID1)
	token2 := createTestJWTToken(t, db, userID, deviceID2)

	// Configure mocks
	mockCache.On("InvalidateUserTokens", userID).Return(nil)
	mockSecurity.On("LogSecurityEvent", mock.Anything, mock.Anything).Return()

	// Test input
	deviceContext := &generated.DeviceContextInput{
		DeviceID:   deviceID1,
		Platform:   generated.PlatformTypeWeb,
		AppVersion: "1.0.0",
	}

	// Execute
	result, err := logoutService.LogoutAllDevices(context.Background(), userID, deviceContext)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, result.Success)
	assert.Equal(t, 2, result.SessionsTerminated)
	assert.Contains(t, result.Message, "Successfully logged out from 2 device(s)")
	assert.NotNil(t, result.AuditLogId)

	// Verify all sessions are revoked
	var sessions []models.UserSession
	err = db.Find(&sessions, "user_id = ?", userID).Error
	require.NoError(t, err)
	assert.Len(t, sessions, 2)
	for _, session := range sessions {
		assert.False(t, session.IsActive)
		assert.True(t, session.Revoked)
	}

	// Verify all tokens are revoked
	var tokens []models.JWTToken
	err = db.Find(&tokens, "user_id = ?", userID).Error
	require.NoError(t, err)
	assert.Len(t, tokens, 2)
	for _, token := range tokens {
		assert.True(t, token.IsRevoked)
	}

	// Verify mocks were called
	mockCache.AssertExpectations(t)
	mockSecurity.AssertExpectations(t)
}

func TestLogoutService_EmergencyLogout_Success(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	mockCache := &MockSessionCache{}
	mockSecurity := &MockSecurityLoggingService{}
	mockJWT := &MockJWTService{}

	logoutService := NewLogoutService(db, mockCache, mockSecurity, mockJWT)

	userID := uuid.New().String()
	deviceID := uuid.New().String()

	// Create test data
	_ = createTestSession(t, db, userID)
	_ = createTestJWTToken(t, db, userID, deviceID)

	// Configure mocks
	mockCache.On("InvalidateUserTokens", userID).Return(nil)
	mockSecurity.On("LogSecurityEvent", mock.Anything, mock.Anything).Return()

	// Test input
	deviceContext := &generated.DeviceContextInput{
		DeviceID:   deviceID,
		Platform:   generated.PlatformTypeWeb,
		AppVersion: "1.0.0",
	}

	// Execute (emergency logout is fire-and-forget)
	logoutService.EmergencyLogout(context.Background(), userID, deviceContext)

	// Wait a bit for background goroutine
	time.Sleep(100 * time.Millisecond)

	// Verify all sessions are revoked
	var sessions []models.UserSession
	err := db.Find(&sessions, "user_id = ?", userID).Error
	require.NoError(t, err)
	assert.Len(t, sessions, 1)
	assert.False(t, sessions[0].IsActive)
	assert.True(t, sessions[0].Revoked)
	assert.Equal(t, "Emergency logout", *sessions[0].RevokedReason)

	// Verify all tokens are revoked
	var tokens []models.JWTToken
	err = db.Find(&tokens, "user_id = ?", userID).Error
	require.NoError(t, err)
	assert.Len(t, tokens, 1)
	assert.True(t, tokens[0].IsRevoked)
}

func TestLogoutService_Logout_SessionNotFound(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	mockCache := &MockSessionCache{}
	mockSecurity := &MockSecurityLoggingService{}
	mockJWT := &MockJWTService{}

	logoutService := NewLogoutService(db, mockCache, mockSecurity, mockJWT)

	userID := uuid.New().String()
	sessionID := uuid.New().String()

	// Configure mocks
	mockSecurity.On("LogSecurityEvent", mock.Anything, mock.Anything).Return()

	// Test input with non-existent session
	input := LogoutInput{
		UserID:     userID,
		LogoutType: generated.LogoutTypeUserInitiated,
		SessionID:  &sessionID,
		IPAddress:  "127.0.0.1",
		UserAgent:  "test-agent",
	}

	// Execute
	result, err := logoutService.Logout(context.Background(), input)

	// Assert
	require.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "no active session found")

	// Verify mock was called for logging
	mockSecurity.AssertExpectations(t)
}

func TestLogoutService_GetLogoutMessage(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	mockCache := &MockSessionCache{}
	mockSecurity := &MockSecurityLoggingService{}
	mockJWT := &MockJWTService{}

	logoutService := NewLogoutService(db, mockCache, mockSecurity, mockJWT)

	// Test cases
	testCases := []struct {
		name       string
		logoutType generated.LogoutType
		expected   string
	}{
		{
			name:       "User initiated",
			logoutType: generated.LogoutTypeUserInitiated,
			expected:   "You have been successfully logged out",
		},
		{
			name:       "Session timeout",
			logoutType: generated.LogoutTypeSessionTimeout,
			expected:   "Your session has expired. Please log in again",
		},
		{
			name:       "Token expired",
			logoutType: generated.LogoutTypeTokenExpired,
			expected:   "Your access token has expired. Please log in again",
		},
		{
			name:       "Security violation",
			logoutType: generated.LogoutTypeSecurityViolation,
			expected:   "You have been logged out due to a security violation",
		},
		{
			name:       "Admin forced",
			logoutType: generated.LogoutTypeAdminForced,
			expected:   "You have been logged out by an administrator",
		},
		{
			name:       "Device compromised",
			logoutType: generated.LogoutTypeDeviceCompromised,
			expected:   "You have been logged out due to device security concerns",
		},
		{
			name:       "Emergency",
			logoutType: generated.LogoutTypeEmergency,
			expected:   "Emergency logout completed",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			message := logoutService.getLogoutMessage(tc.logoutType)
			assert.Equal(t, tc.expected, message)
		})
	}
}
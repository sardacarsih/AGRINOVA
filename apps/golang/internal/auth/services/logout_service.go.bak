package services

import (
	"context"
	"fmt"
	"time"

	"agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/internal/graphql/generated"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// LogoutService handles comprehensive logout operations across all platforms
type LogoutService struct {
	db                     *gorm.DB
	sessionCache           *SessionCache
	securityLoggingService *SecurityLoggingService
	jwtService             *JWTService
}

// NewLogoutService creates a new logout service instance
func NewLogoutService(
	db *gorm.DB,
	sessionCache *SessionCache,
	securityLoggingService *SecurityLoggingService,
	jwtService *JWTService,
) *LogoutService {
	return &LogoutService{
		db:                     db,
		sessionCache:           sessionCache,
		securityLoggingService: securityLoggingService,
		jwtService:             jwtService,
	}
}

// LogoutInput represents the input for logout operations
type LogoutInput struct {
	UserID        string
	LogoutType    generated.LogoutType
	DeviceContext *generated.DeviceContextInput
	Reason        *string
	SessionID     *string
	IPAddress     string
	UserAgent     string
}

// LogoutResult represents the result of a logout operation
type LogoutResult struct {
	Success            bool
	SessionTerminated  bool
	TokensInvalidated  bool
	Message            string
	ServerTimestamp    time.Time
	RequiresSync       bool
	AuditLogID         string
	RemainingSessions  int
}

// Logout performs a comprehensive logout operation with full cleanup
func (s *LogoutService) Logout(ctx context.Context, input LogoutInput) (*LogoutResult, error) {
	startTime := time.Now()

	// 1. Create audit log entry for logout attempt
	auditLogID := s.logLogoutAttempt(ctx, input)

	// 2. Determine which session(s) to terminate
	sessionToTerminate := input.SessionID
	if sessionToTerminate == nil || *sessionToTerminate == "" {
		// Terminate current session - find it by userID and deviceID
		currentSessionID, err := s.findCurrentSession(ctx, input.UserID, input.DeviceContext)
		if err != nil {
			return s.handleLogoutError(ctx, input, auditLogID, "Failed to find current session", err)
		}
		sessionToTerminate = &currentSessionID
	}

	// 3. Invalidate session in database
	sessionTerminated, err := s.invalidateSession(ctx, *sessionToTerminate, input.UserID)
	if err != nil {
		return s.handleLogoutError(ctx, input, auditLogID, "Failed to invalidate session", err)
	}

	// 4. Blacklist JWT tokens associated with this session
	tokensInvalidated := s.blacklistTokens(ctx, input.UserID, input.DeviceContext)

	// 5. Clear session cache for this user
	if err := s.sessionCache.InvalidateUserTokens(input.UserID); err != nil {
		// Log but don't fail - cache clearing is non-critical
		fmt.Printf("Warning: Failed to clear session cache for user %s: %v\n", input.UserID, err)
	}

	// 6. Count remaining active sessions
	remainingSessions, err := s.countActiveSessions(ctx, input.UserID)
	if err != nil {
		remainingSessions = 0 // Default to 0 if count fails
	}

	// 7. Log successful logout
	duration := time.Since(startTime).Milliseconds()
	s.logLogoutSuccess(ctx, input, auditLogID, duration)

	// 8. Build success response
	result := &LogoutResult{
		Success:            true,
		SessionTerminated:  sessionTerminated,
		TokensInvalidated:  tokensInvalidated,
		Message:            s.getLogoutMessage(input.LogoutType),
		ServerTimestamp:    time.Now(),
		RequiresSync:       false, // User is online, no sync needed
		AuditLogID:         auditLogID,
		RemainingSessions:  remainingSessions,
	}

	return result, nil
}

// LogoutAllDevices terminates all active sessions for a user across all devices
func (s *LogoutService) LogoutAllDevices(ctx context.Context, userID string, deviceContext *generated.DeviceContextInput) (*generated.LogoutAllDevicesResponse, error) {
	startTime := time.Now()

	// 1. Log logout attempt
	auditLogID := uuid.New().String()
	s.logLogoutAllDevicesAttempt(ctx, userID, deviceContext, auditLogID)

	// 2. Get all active sessions for user
	var sessions []models.UserSession
	if err := s.db.Where("user_id = ? AND is_active = ? AND revoked = ?", userID, true, false).
		Find(&sessions).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch user sessions: %w", err)
	}

	sessionsCount := len(sessions)

	// 3. Invalidate all sessions
	if err := s.db.Model(&models.UserSession{}).
		Where("user_id = ? AND is_active = ?", userID, true).
		Updates(map[string]interface{}{
			"is_active":      false,
			"revoked":        true,
			"revoked_reason": "Logout from all devices",
			"updated_at":     time.Now(),
		}).Error; err != nil {
		return nil, fmt.Errorf("failed to invalidate sessions: %w", err)
	}

	// 4. Blacklist all JWT tokens for this user
	if err := s.db.Model(&models.JWTToken{}).
		Where("user_id = ? AND is_revoked = ?", userID, false).
		Updates(map[string]interface{}{
			"is_revoked": true,
			"revoked_at": time.Now(),
		}).Error; err != nil {
		return nil, fmt.Errorf("failed to blacklist tokens: %w", err)
	}

	// 5. Clear all session cache entries for this user
	if err := s.sessionCache.InvalidateUserTokens(userID); err != nil {
		fmt.Printf("Warning: Failed to clear session cache for user %s: %v\n", userID, err)
	}

	// 6. Log success
	duration := time.Since(startTime).Milliseconds()
	s.logLogoutAllDevicesSuccess(ctx, userID, sessionsCount, auditLogID, duration)

	// 7. Return response
	return &generated.LogoutAllDevicesResponse{
		Success:           true,
		SessionsTerminated: int32(sessionsCount),
		Message:           fmt.Sprintf("Successfully logged out from %d device(s)", sessionsCount),
		ServerTimestamp:   time.Now(),
		AuditLogID:        &auditLogID,
	}, nil
}

// EmergencyLogout performs instant logout without waiting for cleanup (fire-and-forget)
func (s *LogoutService) EmergencyLogout(ctx context.Context, userID string, deviceContext *generated.DeviceContextInput) {
	// Fire-and-forget goroutine for emergency cleanup
	go func() {
		bgCtx := context.Background()

		// 1. Invalidate all sessions immediately
		_ = s.db.Model(&models.UserSession{}).
			Where("user_id = ?", userID).
			Updates(map[string]interface{}{
				"is_active":      false,
				"revoked":        true,
				"revoked_reason": "Emergency logout",
				"updated_at":     time.Now(),
			}).Error

		// 2. Blacklist all tokens
		_ = s.db.Model(&models.JWTToken{}).
			Where("user_id = ?", userID).
			Updates(map[string]interface{}{
				"is_revoked": true,
				"revoked_at": time.Now(),
			}).Error

		// 3. Clear cache
		_ = s.sessionCache.InvalidateUserTokens(userID)

		// 4. Log emergency logout
		s.logEmergencyLogout(bgCtx, userID, deviceContext)
	}()
}

// Helper methods

// findCurrentSession finds the current active session for a user
func (s *LogoutService) findCurrentSession(ctx context.Context, userID string, deviceContext *generated.DeviceContextInput) (string, error) {
	var session models.UserSession

	query := s.db.Where("user_id = ? AND is_active = ? AND revoked = ?", userID, true, false)

	if deviceContext != nil && deviceContext.DeviceID != "" {
		query = query.Where("device_id = ?", deviceContext.DeviceID)
	}

	if err := query.Order("last_activity DESC").First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", fmt.Errorf("no active session found")
		}
		return "", fmt.Errorf("database error: %w", err)
	}

	return session.ID, nil
}

// invalidateSession terminates a specific session
func (s *LogoutService) invalidateSession(ctx context.Context, sessionID, userID string) (bool, error) {
	result := s.db.Model(&models.UserSession{}).
		Where("id = ? AND user_id = ?", sessionID, userID).
		Updates(map[string]interface{}{
			"is_active":      false,
			"revoked":        true,
			"revoked_reason": "User logout",
			"updated_at":     time.Now(),
		})

	if result.Error != nil {
		return false, fmt.Errorf("failed to invalidate session: %w", result.Error)
	}

	return result.RowsAffected > 0, nil
}

// blacklistTokens revokes all JWT tokens for a user/device
func (s *LogoutService) blacklistTokens(ctx context.Context, userID string, deviceContext *generated.DeviceContextInput) bool {
	query := s.db.Model(&models.JWTToken{}).Where("user_id = ? AND is_revoked = ?", userID, false)

	if deviceContext != nil && deviceContext.DeviceID != "" {
		query = query.Where("device_id = ?", deviceContext.DeviceID)
	}

	result := query.Updates(map[string]interface{}{
		"is_revoked": true,
		"revoked_at": time.Now(),
	})

	return result.RowsAffected > 0
}

// countActiveSessions counts remaining active sessions for a user
func (s *LogoutService) countActiveSessions(ctx context.Context, userID string) (int, error) {
	var count int64
	if err := s.db.Model(&models.UserSession{}).
		Where("user_id = ? AND is_active = ? AND revoked = ?", userID, true, false).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return int(count), nil
}

// getLogoutMessage returns user-friendly logout message based on type
func (s *LogoutService) getLogoutMessage(logoutType generated.LogoutType) string {
	messages := map[generated.LogoutType]string{
		generated.LogoutTypeUserInitiated:     "You have been successfully logged out",
		generated.LogoutTypeSessionTimeout:    "Your session has expired. Please log in again",
		generated.LogoutTypeTokenExpired:      "Your access token has expired. Please log in again",
		generated.LogoutTypeSecurityViolation: "You have been logged out due to a security violation",
		generated.LogoutTypeAdminForced:       "You have been logged out by an administrator",
		generated.LogoutTypeDeviceCompromised: "You have been logged out due to device security concerns",
		generated.LogoutTypeEmergency:         "Emergency logout completed",
	}

	if msg, ok := messages[logoutType]; ok {
		return msg
	}
	return "Logout successful"
}

// handleLogoutError handles logout errors and logs them
func (s *LogoutService) handleLogoutError(ctx context.Context, input LogoutInput, auditLogID, message string, err error) (*LogoutResult, error) {
	// Log failure
	s.logLogoutFailure(ctx, input, auditLogID, message, err)

	return &LogoutResult{
		Success:           false,
		SessionTerminated: false,
		TokensInvalidated: false,
		Message:           message,
		ServerTimestamp:   time.Now(),
		RequiresSync:      false,
		AuditLogID:        auditLogID,
	}, fmt.Errorf("%s: %w", message, err)
}

// Security logging methods

func (s *LogoutService) logLogoutAttempt(ctx context.Context, input LogoutInput) string {
	auditLogID := uuid.New().String()

	logEntry := SecurityLogEntry{
		ID:        auditLogID,
		EventType: EventLogout,
		Severity:  SeverityInfo,
		UserID:    &input.UserID,
		IPAddress: input.IPAddress,
		UserAgent: input.UserAgent,
		Details: map[string]interface{}{
			"logout_type": input.LogoutType,
			"reason":      input.Reason,
			"session_id":  input.SessionID,
		},
		Timestamp: time.Now(),
	}

	if input.DeviceContext != nil {
		logEntry.DeviceID = &input.DeviceContext.DeviceID
		logEntry.Details["platform"] = input.DeviceContext.Platform
		logEntry.Details["app_version"] = input.DeviceContext.AppVersion
	}

	// Log asynchronously (non-blocking)
	details := map[string]interface{}{
		"user_id":    logEntry.UserID,
		"username":   logEntry.Username,
		"ip_address": logEntry.IPAddress,
		"user_agent": logEntry.UserAgent,
		"details":    logEntry.Details,
	}
	go s.securityLoggingService.LogSecurityEvent(ctx, EventLogout, SeverityInfo, details)

	return auditLogID
}

func (s *LogoutService) logLogoutSuccess(ctx context.Context, input LogoutInput, auditLogID string, durationMs int64) {
	logEntry := SecurityLogEntry{
		ID:        auditLogID,
		EventType: EventLogout,
		Severity:  SeverityInfo,
		UserID:    &input.UserID,
		IPAddress: input.IPAddress,
		UserAgent: input.UserAgent,
		Details: map[string]interface{}{
			"logout_type":  input.LogoutType,
			"success":      true,
			"duration_ms":  durationMs,
		},
		Timestamp: time.Now(),
	}

	details := map[string]interface{}{
		"user_id":    logEntry.UserID,
		"username":   logEntry.Username,
		"ip_address": logEntry.IPAddress,
		"user_agent": logEntry.UserAgent,
		"details":    logEntry.Details,
	}
	go s.securityLoggingService.LogSecurityEvent(ctx, EventLogout, SeverityInfo, details)
}

func (s *LogoutService) logLogoutFailure(ctx context.Context, input LogoutInput, auditLogID, message string, err error) {
	logEntry := SecurityLogEntry{
		ID:        auditLogID,
		EventType: EventLogout,
		Severity:  SeverityError,
		UserID:    &input.UserID,
		IPAddress: input.IPAddress,
		UserAgent: input.UserAgent,
		Details: map[string]interface{}{
			"logout_type": input.LogoutType,
			"success":     false,
			"error":       err.Error(),
			"message":     message,
		},
		Timestamp: time.Now(),
	}

	details := map[string]interface{}{
		"user_id":    logEntry.UserID,
		"username":   logEntry.Username,
		"ip_address": logEntry.IPAddress,
		"user_agent": logEntry.UserAgent,
		"details":    logEntry.Details,
	}
	go s.securityLoggingService.LogSecurityEvent(ctx, EventLogout, SeverityInfo, details)
}

func (s *LogoutService) logLogoutAllDevicesAttempt(ctx context.Context, userID string, deviceContext *generated.DeviceContextInput, auditLogID string) {
	logEntry := SecurityLogEntry{
		ID:        auditLogID,
		EventType: EventLogout,
		Severity:  SeverityWarning, // Higher severity for multi-device logout
		UserID:    &userID,
		Details: map[string]interface{}{
			"logout_type": "all_devices",
			"action":      "attempt",
		},
		Timestamp: time.Now(),
	}

	if deviceContext != nil {
		logEntry.DeviceID = &deviceContext.DeviceID
	}

	details := map[string]interface{}{
		"user_id":    logEntry.UserID,
		"username":   logEntry.Username,
		"ip_address": logEntry.IPAddress,
		"user_agent": logEntry.UserAgent,
		"details":    logEntry.Details,
	}
	go s.securityLoggingService.LogSecurityEvent(ctx, EventLogout, SeverityInfo, details)
}

func (s *LogoutService) logLogoutAllDevicesSuccess(ctx context.Context, userID string, sessionsTerminated int, auditLogID string, durationMs int64) {
	logEntry := SecurityLogEntry{
		ID:        auditLogID,
		EventType: EventLogout,
		Severity:  SeverityWarning,
		UserID:    &userID,
		Details: map[string]interface{}{
			"logout_type":         "all_devices",
			"success":             true,
			"sessions_terminated": sessionsTerminated,
			"duration_ms":         durationMs,
		},
		Timestamp: time.Now(),
	}

	details := map[string]interface{}{
		"user_id":    logEntry.UserID,
		"username":   logEntry.Username,
		"ip_address": logEntry.IPAddress,
		"user_agent": logEntry.UserAgent,
		"details":    logEntry.Details,
	}
	go s.securityLoggingService.LogSecurityEvent(ctx, EventLogout, SeverityInfo, details)
}

func (s *LogoutService) logEmergencyLogout(ctx context.Context, userID string, deviceContext *generated.DeviceContextInput) {
	auditLogID := uuid.New().String()

	logEntry := SecurityLogEntry{
		ID:        auditLogID,
		EventType: EventLogout,
		Severity:  SeverityCritical,
		UserID:    &userID,
		Details: map[string]interface{}{
			"logout_type": generated.LogoutTypeEmergency,
			"action":      "emergency",
		},
		Timestamp: time.Now(),
	}

	if deviceContext != nil {
		logEntry.DeviceID = &deviceContext.DeviceID
	}

	details := map[string]interface{}{
		"user_id":    logEntry.UserID,
		"username":   logEntry.Username,
		"ip_address": logEntry.IPAddress,
		"user_agent": logEntry.UserAgent,
		"details":    logEntry.Details,
	}
	s.securityLoggingService.LogSecurityEvent(ctx, EventLogout, SeverityInfo, details)
}

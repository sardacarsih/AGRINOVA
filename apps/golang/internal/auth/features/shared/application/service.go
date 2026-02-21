package application

import (
	"context"
	"errors"
	"time"

	"agrinovagraphql/server/internal/auth/features/shared/domain"
)

// SharedAuthService implements domain.SharedAuthService
type SharedAuthService struct {
	userRepo       domain.UserRepository
	passwordSvc    domain.PasswordService
	deviceRepo     domain.DeviceRepository
	sessionRepo    domain.SessionRepository
	tokenService   TokenRevocationService
	securityLogger domain.SecurityEventLogger
}

// TokenRevocationService interface to decouple from specific token implementations
// This allows revocation of both JWT (Mobile) and Session (Web) tokens
type TokenRevocationService interface {
	RevokeAllUserTokens(ctx context.Context, userID string) error
}

// NewSharedAuthService creates a new shared auth service
func NewSharedAuthService(
	userRepo domain.UserRepository,
	passwordSvc domain.PasswordService,
	deviceRepo domain.DeviceRepository,
	sessionRepo domain.SessionRepository,
	tokenService TokenRevocationService,
	securityLogger domain.SecurityEventLogger,
) *SharedAuthService {
	return &SharedAuthService{
		userRepo:       userRepo,
		passwordSvc:    passwordSvc,
		deviceRepo:     deviceRepo,
		sessionRepo:    sessionRepo,
		tokenService:   tokenService,
		securityLogger: securityLogger,
	}
}

// ChangePassword handles user password change
func (s *SharedAuthService) ChangePassword(ctx context.Context, userID string, currentPassword, newPassword string) error {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	// Verify current password
	if err := s.passwordSvc.VerifyPassword(user.Password, currentPassword); err != nil {
		s.securityLogger.LogSecurityEvent(ctx, &domain.SecurityEvent{
			UserID:   &userID,
			Event:    domain.EventSuspiciousActivity,
			Details:  map[string]interface{}{"action": "change_password", "error": "invalid_current_password"},
			Severity: domain.SeverityWarning,
		})
		return errors.New("invalid current password")
	}

	// Hash new password
	hashedPassword, err := s.passwordSvc.HashPassword(newPassword)
	if err != nil {
		return err
	}

	// Update user
	user.Password = hashedPassword
	user.UpdatedAt = time.Now()
	if err := s.userRepo.Update(ctx, user); err != nil {
		return err
	}

	// Log event
	s.securityLogger.LogSecurityEvent(ctx, &domain.SecurityEvent{
		UserID:   &userID,
		Event:    domain.EventPasswordChange,
		Severity: domain.SeverityInfo,
	})

	// Optional: Revoke all sessions/tokens on password change?
	// For now, we follow standard practice of keeping sessions active unless requested otherwise

	return nil
}

// LogoutAllDevices logs out from all devices and sessions
func (s *SharedAuthService) LogoutAllDevices(ctx context.Context, userID string) error {
	// Revoke all web sessions
	if err := s.sessionRepo.RevokeAllUserSessions(ctx, userID); err != nil {
		return err
	}

	// Revoke all devices (which implicitly revokes tokens if implemented in device repo/token service)
	// But explicitly calling token service revocation is safer
	if s.tokenService != nil {
		if err := s.tokenService.RevokeAllUserTokens(ctx, userID); err != nil {
			return err
		}
	}

	// Optionally revoke device bindings themselves if "Logout All" implies "Unbind All"
	// Usually "Logout" just means invalidate tokens. "Unbind" is strict.
	// We will follow legacy behavior: just invalidate tokens/sessions.

	s.securityLogger.LogSecurityEvent(ctx, &domain.SecurityEvent{
		UserID:   &userID,
		Event:    domain.EventLogout,
		Details:  map[string]interface{}{"type": "all_devices"},
		Severity: domain.SeverityInfo,
	})

	return nil
}

// GetMyDevices returns list of user's devices
func (s *SharedAuthService) GetMyDevices(ctx context.Context, userID string) ([]*domain.DeviceBinding, error) {
	return s.deviceRepo.FindDevicesByUser(ctx, userID)
}

// RevokeSession revokes a specific session (admin)
func (s *SharedAuthService) RevokeSession(ctx context.Context, sessionID, revokedBy, reason string) error {
	session, err := s.sessionRepo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return err
	}
	if session == nil {
		return errors.New("session not found")
	}

	if err := s.sessionRepo.RevokeSession(ctx, sessionID); err != nil {
		return err
	}

	s.securityLogger.LogSecurityEvent(ctx, &domain.SecurityEvent{
		UserID:  &session.UserID,
		Event:   domain.EventLogout,
		Details: map[string]interface{}{"revoked_by": revokedBy, "reason": reason, "action": "admin_revoke"},
	})
	return nil
}

// RevokeAllUserSessions revokes all sessions for a user (admin)
func (s *SharedAuthService) RevokeAllUserSessions(ctx context.Context, targetUserID, revokedBy, reason string) (int64, error) {
	// Simple implementation: find active sessions and revoke
	// Ideally repo supports bulk update
	sessions, err := s.sessionRepo.FindActiveSessionsByUser(ctx, targetUserID)
	if err != nil {
		return 0, err
	}

	for _, session := range sessions {
		_ = s.sessionRepo.RevokeSession(ctx, session.ID)
	}

	err = s.sessionRepo.RevokeAllUserSessions(ctx, targetUserID)
	if err != nil {
		return 0, err
	}

	s.securityLogger.LogSecurityEvent(ctx, &domain.SecurityEvent{
		UserID:  &targetUserID,
		Event:   domain.EventLogout,
		Details: map[string]interface{}{"revoked_by": revokedBy, "reason": reason, "action": "admin_revoke_all"},
	})

	return int64(len(sessions)), nil
}

// GetSessions returns sessions based on minimal filter (UserID)
func (s *SharedAuthService) GetSessions(ctx context.Context, userID string) ([]*domain.UserSession, error) {
	// Current repository only supports FindActiveSessionsByUser
	// Use that for now. Full filtering would require repo update.
	return s.sessionRepo.FindActiveSessionsByUser(ctx, userID)
}

// BindDevice binds a device (can be reused from mobile service logic if moved here)
// For now, we assume MobileService handles its own binding because it involves JWT issue.
// If Global Resolver needs BindDevice, we can delegate to MobileService or implement here.
// Legacy AuthService.BindDevice delegated to DeviceService.
// We will implement simple binding logic here if needed for general use.

package mobile

import (
	"context"
	"errors"
	"time"

	mobileDomain "agrinovagraphql/server/internal/auth/features/mobile/domain"
	sharedDomain "agrinovagraphql/server/internal/auth/features/shared/domain"
)

// Service implements MobileAuthService
type Service struct {
	userRepo       sharedDomain.UserRepository
	deviceRepo     sharedDomain.DeviceRepository
	assignmentRepo sharedDomain.AssignmentRepository
	tokenService   mobileDomain.TokenService
	passwordSvc    sharedDomain.PasswordService
	securityLogger sharedDomain.SecurityEventLogger
	config         MobileConfig
}

// NewService creates new mobile authentication service
func NewService(
	userRepo sharedDomain.UserRepository,
	deviceRepo sharedDomain.DeviceRepository,
	assignmentRepo sharedDomain.AssignmentRepository,
	tokenService mobileDomain.TokenService,
	passwordSvc sharedDomain.PasswordService,
	securityLogger sharedDomain.SecurityEventLogger,
	config MobileConfig,
) *Service {
	return &Service{
		userRepo:       userRepo,
		deviceRepo:     deviceRepo,
		assignmentRepo: assignmentRepo,
		tokenService:   tokenService,
		passwordSvc:    passwordSvc,
		securityLogger: securityLogger,
		config:         config,
	}
}

// Login handles mobile authentication with JWT tokens
func (s *Service) Login(ctx context.Context, input mobileDomain.MobileLoginInput) (*mobileDomain.MobileLoginResult, error) {
	// 1. Find user
	user, err := s.userRepo.FindByIdentifier(ctx, input.Identifier)
	if err != nil {
		s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
			Event:     sharedDomain.EventLoginFailure,
			Severity:  sharedDomain.SeverityWarning,
			IPAddress: "0.0.0.0", // Use generic IP for mobile where client IP is not applicable
			Details:   map[string]interface{}{"identifier": input.Identifier, "platform": string(input.Platform)},
		})
		return nil, ErrInvalidCredentials
	}

	if user == nil || !user.IsActive {
		return nil, ErrInvalidCredentials
	}

	// 1b. Check if role is allowed for mobile login
	if !user.Role.HasMobileAccess() {
		s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
			Event:    sharedDomain.EventLoginFailure,
			Severity: sharedDomain.SeverityWarning,
			Details:  map[string]interface{}{"identifier": input.Identifier, "role": string(user.Role), "reason": "mobile_access_denied"},
		})
		return nil, ErrMobileAccessDenied
	}

	// 2. Verify password (or biometric if provided)
	if err := s.verifyAuthentication(ctx, user, input); err != nil {
		return nil, err
	}

	// 3. Check or create device binding
	device, err := s.ensureDeviceBinding(ctx, user.ID, input)
	if err != nil {
		return nil, err
	}

	// 4. Get user assignments
	assignments, err := s.assignmentRepo.FindWithDetails(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	if len(assignments) == 0 {
		s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
			Event:     sharedDomain.EventLoginFailure,
			Severity:  sharedDomain.SeverityWarning,
			IPAddress: "0.0.0.0",
			Details:   map[string]interface{}{"reason": "no_active_assignments", "user_id": user.ID},
		})
		return nil, ErrNoAssignments
	}

	// Use the first active assignment's company ID
	var companyID string
	for _, assignment := range assignments {
		if assignment.IsActive {
			companyID = assignment.CompanyID
			break
		}
	}

	if companyID == "" {
		return nil, ErrNoCompany // Or specific error "No active company assignment"
	}

	// 5. Revoke any prior tokens for this user+device so each login invalidates older tokens.
	if err := s.tokenService.RevokeDeviceTokens(ctx, user.ID, device.DeviceID); err != nil {
		return nil, err
	}

	// 6. Generate fresh tokens for the current device binding.
	tokenPair, err := s.tokenService.GenerateTokenPair(ctx, user.ID, device.DeviceID, user.Role, companyID)
	if err != nil {
		return nil, err
	}

	offlineToken, err := s.tokenService.GenerateOfflineToken(ctx, user.ID, device.DeviceID)
	if err != nil {
		return nil, err
	}

	// 7. Update device last seen
	device.LastSeenAt = time.Now()
	if err := s.deviceRepo.UpdateDevice(ctx, device); err != nil {
		// Log error but don't fail login
	}

	// 8. Log successful login
	s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
		UserID:    &user.ID,
		Event:     sharedDomain.EventLoginSuccess,
		Severity:  sharedDomain.SeverityInfo,
		IPAddress: "0.0.0.0",
		Details:   map[string]interface{}{"device_id": device.DeviceID, "platform": string(input.Platform)},
	})

	// 9. Return result
	return &mobileDomain.MobileLoginResult{
		AccessToken:      tokenPair.AccessToken,
		RefreshToken:     tokenPair.RefreshToken,
		OfflineToken:     offlineToken,
		ExpiresAt:        tokenPair.AccessExpiresAt,
		RefreshExpiresAt: tokenPair.RefreshExpiresAt,
		OfflineExpiresAt: time.Now().Add(s.config.OfflineTokenDuration),
		User:             sharedDomain.ToUserDTO(user),
		Assignments:      s.convertAssignments(assignments),
		Device:           *device,
	}, nil
}

// Logout handles mobile logout by revoking tokens
func (s *Service) Logout(ctx context.Context, deviceID string) error {
	// Find device binding
	device, err := s.deviceRepo.FindDeviceByID(ctx, deviceID)
	if err != nil {
		return err
	}

	if device == nil {
		return ErrDeviceNotFound
	}

	// Revoke only tokens that belong to this device
	if err := s.tokenService.RevokeDeviceTokens(ctx, device.UserID, device.DeviceID); err != nil {
		return err
	}

	// Log logout
	s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
		UserID: &device.UserID,
		Event:  sharedDomain.EventLogout,
		Details: map[string]interface{}{
			"device_id": deviceID,
			"platform":  "mobile",
		},
	})

	return nil
}

// RefreshToken handles JWT token refresh
func (s *Service) RefreshToken(ctx context.Context, input mobileDomain.RefreshTokenInput) (*mobileDomain.MobileLoginResult, error) {
	if input.RefreshToken == "" {
		return nil, ErrInvalidToken
	}

	// Validate refresh token
	claims, err := s.tokenService.ValidateRefreshToken(ctx, input.RefreshToken)
	if err != nil {
		return nil, ErrInvalidToken
	}

	// Optional hard check against client-provided device ID.
	if input.DeviceID != nil && *input.DeviceID != "" && claims.DeviceID != *input.DeviceID {
		return nil, ErrDeviceNotAuthorized
	}

	// Get user
	user, err := s.userRepo.FindByID(ctx, claims.UserID)
	if err != nil {
		return nil, err
	}

	if user == nil || !user.IsActive {
		return nil, ErrUserNotFound
	}

	// Get device
	device, err := s.deviceRepo.FindDeviceByID(ctx, claims.DeviceID)
	if err != nil {
		return nil, err
	}

	if device == nil || !device.IsAuthorized {
		return nil, ErrDeviceNotAuthorized
	}

	// Optional hard check against client-provided fingerprint.
	if input.DeviceFingerprint != nil && *input.DeviceFingerprint != "" && device.DeviceFingerprint != *input.DeviceFingerprint {
		return nil, ErrDeviceFingerprintMismatch
	}

	// Get assignments
	assignments, err := s.assignmentRepo.FindWithDetails(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	var companyID string
	for _, assignment := range assignments {
		if assignment.IsActive {
			companyID = assignment.CompanyID
			break
		}
	}

	// Generate new token pair
	// Revoke old token ID first so refresh tokens are one-time use (rotation).
	if err := s.tokenService.RevokeToken(ctx, claims.TokenID); err != nil {
		return nil, err
	}

	// Generate new token pair
	tokenPair, err := s.tokenService.GenerateTokenPair(ctx, user.ID, device.DeviceID, user.Role, companyID)
	if err != nil {
		return nil, err
	}

	return &mobileDomain.MobileLoginResult{
		AccessToken:      tokenPair.AccessToken,
		RefreshToken:     tokenPair.RefreshToken,
		ExpiresAt:        tokenPair.AccessExpiresAt,
		RefreshExpiresAt: tokenPair.RefreshExpiresAt,
		User:             sharedDomain.ToUserDTO(user),
		Assignments:      s.convertAssignments(assignments),
		Device:           *device,
	}, nil
}

// DeviceRenew exchanges a valid offline/session token for a new access+refresh token pair.
// The offline token is validated by DB hash lookup (not JWT). A new token pair is issued
// and the old token record is revoked (rotating offline-based renewal).
func (s *Service) DeviceRenew(ctx context.Context, input mobileDomain.DeviceRenewInput) (*mobileDomain.MobileLoginResult, error) {
	if input.OfflineToken == "" {
		return nil, ErrInvalidToken
	}

	// 1. Validate offline token via DB hash lookup
	claims, err := s.tokenService.ValidateOfflineToken(ctx, input.OfflineToken)
	if err != nil {
		return nil, ErrInvalidToken
	}

	// 2. Validate client-provided device ID matches token's device
	if input.DeviceID != "" && claims.DeviceID != input.DeviceID {
		return nil, ErrDeviceNotAuthorized
	}

	// 3. Get user
	user, err := s.userRepo.FindByID(ctx, claims.UserID)
	if err != nil {
		return nil, err
	}
	if user == nil || !user.IsActive {
		return nil, ErrUserNotFound
	}

	// 4. Get device binding
	device, err := s.deviceRepo.FindDeviceByID(ctx, claims.DeviceID)
	if err != nil {
		return nil, err
	}
	if device == nil || !device.IsAuthorized || device.RevokedAt != nil {
		return nil, ErrDeviceNotAuthorized
	}

	// 5. Optional fingerprint check
	if input.DeviceFingerprint != nil && *input.DeviceFingerprint != "" && device.DeviceFingerprint != *input.DeviceFingerprint {
		s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
			UserID:   &user.ID,
			Event:    sharedDomain.EventSuspiciousActivity,
			Severity: sharedDomain.SeverityWarning,
			Details:  map[string]interface{}{"reason": "fingerprint_mismatch_on_device_renew", "device_id": device.DeviceID},
		})
		return nil, ErrDeviceFingerprintMismatch
	}

	// 6. Get assignments for companyID
	assignments, err := s.assignmentRepo.FindWithDetails(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	var companyID string
	for _, a := range assignments {
		if a.IsActive {
			companyID = a.CompanyID
			break
		}
	}

	// 7. Revoke old token (the offline token's record, identified by claims.TokenID)
	if err := s.tokenService.RevokeToken(ctx, claims.TokenID); err != nil {
		return nil, err
	}

	// 8. Issue new access+refresh pair (no new offline token — client keeps existing one)
	tokenPair, err := s.tokenService.GenerateTokenPair(ctx, user.ID, device.DeviceID, user.Role, companyID)
	if err != nil {
		return nil, err
	}

	s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
		UserID:   &user.ID,
		Event:    sharedDomain.EventLoginSuccess,
		Severity: sharedDomain.SeverityInfo,
		Details:  map[string]interface{}{"method": "device_renew", "device_id": device.DeviceID},
	})

	return &mobileDomain.MobileLoginResult{
		AccessToken:      tokenPair.AccessToken,
		RefreshToken:     tokenPair.RefreshToken,
		ExpiresAt:        tokenPair.AccessExpiresAt,
		RefreshExpiresAt: tokenPair.RefreshExpiresAt,
		User:             sharedDomain.ToUserDTO(user),
		Assignments:      s.convertAssignments(assignments),
		Device:           *device,
	}, nil
}

// ValidateOfflineAccess validates offline token for air-gapped operations
func (s *Service) ValidateOfflineAccess(ctx context.Context, offlineToken string) (*sharedDomain.User, error) {
	if offlineToken == "" {
		return nil, ErrInvalidToken
	}

	claims, err := s.tokenService.ValidateOfflineToken(ctx, offlineToken)
	if err != nil {
		return nil, ErrInvalidToken
	}

	user, err := s.userRepo.FindByID(ctx, claims.UserID)
	if err != nil {
		return nil, err
	}
	if user == nil || !user.IsActive {
		return nil, ErrUserNotFound
	}

	device, err := s.deviceRepo.FindDeviceByID(ctx, claims.DeviceID)
	if err != nil {
		return nil, err
	}
	if device == nil || !device.IsAuthorized || device.RevokedAt != nil {
		return nil, ErrDeviceNotAuthorized
	}

	return user, nil
}

// BindDevice binds a new device to user account
func (s *Service) BindDevice(ctx context.Context, input mobileDomain.DeviceBindingInput) error {
	// Check if device already exists
	existingDevice, err := s.deviceRepo.FindDeviceByUser(ctx, input.UserID, input.DeviceID)
	if err != nil {
		return err
	}

	if existingDevice != nil {
		return ErrDeviceAlreadyBound
	}

	// Create device binding
	device := &sharedDomain.DeviceBinding{
		ID:                generateID(),
		UserID:            input.UserID,
		DeviceID:          input.DeviceID,
		DeviceFingerprint: input.DeviceFingerprint,
		Platform:          input.Platform,
		DeviceInfo:        input.DeviceInfo,
		BiometricHash:     input.BiometricHash,
		IsTrusted:         input.IsTrusted,
		IsAuthorized:      true,
		LastSeenAt:        time.Now(),
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if err := s.deviceRepo.CreateDevice(ctx, device); err != nil {
		return err
	}

	// Log device binding
	s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
		UserID: &input.UserID,
		Event:  sharedDomain.EventDeviceBind,
		Details: map[string]interface{}{
			"device_id":  input.DeviceID,
			"platform":   string(input.Platform),
			"is_trusted": input.IsTrusted,
		},
	})

	return nil
}

// UnbindDevice removes device binding
func (s *Service) UnbindDevice(ctx context.Context, deviceID string) error {
	device, err := s.deviceRepo.FindDeviceByID(ctx, deviceID)
	if err != nil {
		return err
	}

	if device == nil {
		return ErrDeviceNotFound
	}

	// Revoke device
	device.IsAuthorized = false
	device.RevokedAt = &[]time.Time{time.Now()}[0]
	if err := s.deviceRepo.UpdateDevice(ctx, device); err != nil {
		return err
	}

	// Revoke tokens only for this device
	if err := s.tokenService.RevokeDeviceTokens(ctx, device.UserID, device.DeviceID); err != nil {
		return err
	}

	// Log device unbinding
	s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
		UserID: &device.UserID,
		Event:  sharedDomain.EventDeviceUnbind,
		Details: map[string]interface{}{
			"device_id": deviceID,
		},
	})

	return nil
}

// Helper methods

func (s *Service) verifyAuthentication(ctx context.Context, user *sharedDomain.User, input mobileDomain.MobileLoginInput) error {
	if input.BiometricToken != nil && *input.BiometricToken != "" {
		// Verify biometric token against stored hash
		return s.verifyBiometricToken(ctx, user.ID, *input.BiometricToken)
	}

	// Fall back to password verification
	return s.passwordSvc.VerifyPassword(user.Password, input.Password)
}

func (s *Service) verifyBiometricToken(ctx context.Context, userID, token string) error {
	// Implementation for biometric verification
	// This would validate the biometric token against stored device binding
	return errors.New("biometric verification not implemented yet")
}

func (s *Service) ensureDeviceBinding(ctx context.Context, userID string, input mobileDomain.MobileLoginInput) (*sharedDomain.DeviceBinding, error) {
	device, err := s.deviceRepo.FindDeviceByUser(ctx, userID, input.DeviceID)
	if err != nil {
		return nil, err
	}

	if device == nil {
		// Auto-bind device for new login
		var deviceInfo sharedDomain.DeviceInfo
		if input.DeviceInfo != nil {
			deviceInfo = *input.DeviceInfo
		} else {
			// Default device info if not provided
			deviceInfo = sharedDomain.DeviceInfo{
				Model:      "Unknown",
				OSVersion:  "Unknown",
				AppVersion: "Unknown",
			}
		}

		binding := mobileDomain.DeviceBindingInput{
			UserID:            userID,
			DeviceID:          input.DeviceID,
			DeviceFingerprint: input.DeviceFingerprint,
			Platform:          input.Platform,
			DeviceInfo:        deviceInfo,
			IsTrusted:         false,
		}

		if err := s.BindDevice(ctx, binding); err != nil {
			return nil, err
		}

		// Return newly created device
		return s.deviceRepo.FindDeviceByUser(ctx, userID, input.DeviceID)
	}

	// Validate fingerprint for existing device
	if device.DeviceFingerprint != input.DeviceFingerprint {
		s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
			UserID: &userID,
			Event:  sharedDomain.EventSuspiciousActivity,
			Details: map[string]interface{}{
				"reason":      "fingerprint_mismatch",
				"device_id":   input.DeviceID,
				"expected_fp": device.DeviceFingerprint,
				"actual_fp":   input.DeviceFingerprint,
			},
		})
		return nil, ErrDeviceFingerprintMismatch
	}

	return device, nil
}

func (s *Service) convertAssignments(assignments []*sharedDomain.Assignment) []sharedDomain.AssignmentDTO {
	dtos := make([]sharedDomain.AssignmentDTO, len(assignments))
	for i, assignment := range assignments {
		dtos[i] = sharedDomain.ToAssignmentDTO(assignment)
	}
	return dtos
}

// PasswordService defines interface for password operations
type PasswordService interface {
	VerifyPassword(hashedPassword, password string) error
	HashPassword(password string) (string, error)
}

// SecurityEventLogger defines interface for security logging
type SecurityEventLogger interface {
	LogSecurityEvent(ctx context.Context, event *sharedDomain.SecurityEvent) error
}

// MobileConfig holds mobile authentication configuration
type MobileConfig struct {
	AccessTokenDuration  time.Duration
	RefreshTokenDuration time.Duration
	OfflineTokenDuration time.Duration
	MaxDevicesPerUser    int
	DeviceSecret         string
}

// Errors
var (
	ErrInvalidCredentials        = errors.New("invalid credentials")
	ErrInvalidToken              = errors.New("invalid token")
	ErrUserNotFound              = errors.New("user not found")
	ErrDeviceNotFound            = errors.New("device not found")
	ErrDeviceNotAuthorized       = errors.New("device not authorized")
	ErrDeviceAlreadyBound        = errors.New("device already bound")
	ErrDeviceFingerprintMismatch = errors.New("device fingerprint mismatch")
	ErrNoCompany                 = errors.New("akun tidak terafiliasi dengan perusahaan")
	ErrNoAssignments             = errors.New("akun anda tidak memiliki penugasan aktif, silahkan hubungi administrator")
	ErrMobileAccessDenied        = errors.New("role ini tidak diizinkan login via mobile, silahkan gunakan web")
)

// Helper functions
func generateID() string {
	// Implementation for generating unique IDs
	return ""
}

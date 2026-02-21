package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/pkg/database"

	"gorm.io/gorm"
)

var (
	ErrDeviceAlreadyExists = errors.New("device already exists")
	ErrDeviceNotAuthorized = errors.New("device not authorized")
	ErrDeviceRevoked       = errors.New("device access revoked")
	ErrInvalidFingerprint  = errors.New("invalid device fingerprint")
	ErrMaxDevicesExceeded  = errors.New("maximum devices exceeded")
)

// DeviceRegistrationRequest represents device registration data
type DeviceRegistrationRequest struct {
	DeviceID          string              `json:"device_id" validate:"required,min=8,max=255"`
	DeviceFingerprint string              `json:"device_fingerprint" validate:"required,min=16,max=1024"`
	Platform          models.PlatformType `json:"platform" validate:"required"`
	DeviceInfo        models.DeviceInfo   `json:"device_info"`
	BiometricHash     *string             `json:"biometric_hash,omitempty"`
	RememberDevice    bool                `json:"remember_device,omitempty"`
	UserAgent         string              `json:"user_agent,omitempty"`
	IPAddress         string              `json:"ip_address,omitempty"`
}

// DeviceBindingResult represents the result of device binding
type DeviceBindingResult struct {
	DeviceBinding *models.DeviceBinding `json:"device_binding"`
	IsNewDevice   bool                  `json:"is_new_device"`
	RequiresAuth  bool                  `json:"requires_auth"`
	TrustLevel    string                `json:"trust_level"`
	SecurityFlags models.SecurityFlags  `json:"security_flags"`
}

// DeviceService handles device binding and management
type DeviceService struct {
	db                *gorm.DB
	maxDevicesPerUser int
	deviceSecret      []byte
	autoTrustDuration time.Duration // Duration after which known devices become trusted
	requireManualAuth bool          // Whether new devices require manual authorization
}

// DeviceConfig holds configuration for device service
type DeviceConfig struct {
	MaxDevicesPerUser int
	DeviceSecret      string
	AutoTrustDuration time.Duration
	RequireManualAuth bool
}

// NewDeviceService creates a new device service
func NewDeviceService(config DeviceConfig) *DeviceService {
	return &DeviceService{
		db:                database.GetDB(),
		maxDevicesPerUser: config.MaxDevicesPerUser,
		deviceSecret:      []byte(config.DeviceSecret),
		autoTrustDuration: config.AutoTrustDuration,
		requireManualAuth: config.RequireManualAuth,
	}
}

// RegisterOrUpdateDevice registers a new device or updates an existing one
func (d *DeviceService) RegisterOrUpdateDevice(userID string, req *DeviceRegistrationRequest) (*DeviceBindingResult, error) {
	// Validate fingerprint
	if !d.validateFingerprint(req.DeviceFingerprint, req.DeviceID, req.Platform) {
		return nil, ErrInvalidFingerprint
	}

	// Check if device already exists
	var existing models.DeviceBinding
	err := d.db.Where("user_id = ? AND device_id = ?", userID, req.DeviceID).First(&existing).Error

	if err == nil {
		// Device exists, update it
		return d.updateExistingDevice(&existing, req)
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Check device limit
	if err := d.checkDeviceLimit(userID); err != nil {
		return nil, err
	}

	// Register new device
	return d.registerNewDevice(userID, req)
}

// GetDeviceBinding retrieves device binding for authentication
func (d *DeviceService) GetDeviceBinding(userID, deviceID, fingerprint string) (*models.DeviceBinding, error) {
	var deviceBinding models.DeviceBinding

	err := d.db.Where("user_id = ? AND device_id = ? AND device_fingerprint = ?",
		userID, deviceID, fingerprint).First(&deviceBinding).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDeviceNotAuthorized
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Check if device is revoked
	if deviceBinding.RevokedAt != nil {
		return nil, ErrDeviceRevoked
	}

	// Update last seen
	go func() {
		d.db.Model(&deviceBinding).Update("last_seen_at", time.Now())
	}()

	return &deviceBinding, nil
}

// ValidateDeviceForLogin validates device for login attempt
func (d *DeviceService) ValidateDeviceForLogin(userID, deviceID, fingerprint string) (*DeviceBindingResult, error) {
	deviceBinding, err := d.GetDeviceBinding(userID, deviceID, fingerprint)
	if err != nil {
		// Device not found or error - might be new device
		if errors.Is(err, ErrDeviceNotAuthorized) {
			return &DeviceBindingResult{
				DeviceBinding: nil,
				IsNewDevice:   true,
				RequiresAuth:  d.requireManualAuth,
				TrustLevel:    "unknown",
				SecurityFlags: models.SecurityFlags{
					NewDevice: true,
				},
			}, nil
		}
		return nil, err
	}

	// Check authorization status
	if !deviceBinding.IsAuthorized {
		return &DeviceBindingResult{
			DeviceBinding: deviceBinding,
			IsNewDevice:   false,
			RequiresAuth:  true,
			TrustLevel:    "unauthorized",
			SecurityFlags: models.SecurityFlags{
				RequireReauth: true,
			},
		}, nil
	}

	// Determine trust level
	trustLevel := d.calculateTrustLevel(deviceBinding)

	return &DeviceBindingResult{
		DeviceBinding: deviceBinding,
		IsNewDevice:   false,
		RequiresAuth:  false,
		TrustLevel:    trustLevel,
		SecurityFlags: models.SecurityFlags{
			SuspiciousActivity: d.detectSuspiciousActivity(deviceBinding),
		},
	}, nil
}

// AuthorizeDevice authorizes a device (admin action)
func (d *DeviceService) AuthorizeDevice(deviceID, authorizedBy string) error {
	now := time.Now()

	err := d.db.Model(&models.DeviceBinding{}).
		Where("device_id = ? AND revoked_at IS NULL", deviceID).
		Updates(map[string]interface{}{
			"is_authorized": true,
			"authorized_by": authorizedBy,
			"authorized_at": &now,
			"updated_at":    now,
		}).Error

	if err != nil {
		return fmt.Errorf("failed to authorize device: %w", err)
	}

	return nil
}

// TrustDevice marks a device as trusted (reduces security checks)
func (d *DeviceService) TrustDevice(userID, deviceID string) error {
	now := time.Now()

	err := d.db.Model(&models.DeviceBinding{}).
		Where("user_id = ? AND device_id = ? AND is_authorized = ? AND revoked_at IS NULL",
			userID, deviceID, true).
		Updates(map[string]interface{}{
			"is_trusted": true,
			"updated_at": now,
		}).Error

	if err != nil {
		return fmt.Errorf("failed to trust device: %w", err)
	}

	return nil
}

// RevokeDevice revokes device access
func (d *DeviceService) RevokeDevice(userID, deviceID string) error {
	now := time.Now()

	err := d.db.Model(&models.DeviceBinding{}).
		Where("user_id = ? AND device_id = ?", userID, deviceID).
		Updates(map[string]interface{}{
			"revoked_at": &now,
			"updated_at": now,
		}).Error

	if err != nil {
		return fmt.Errorf("failed to revoke device: %w", err)
	}

	return nil
}

// UnbindDevice removes device binding completely (hard delete)
func (d *DeviceService) UnbindDevice(userID, deviceID string) error {
	// First revoke the device to ensure any tokens are marked as revoked
	if err := d.RevokeDevice(userID, deviceID); err != nil {
		return fmt.Errorf("failed to revoke device before unbinding: %w", err)
	}

	// Then permanently delete the device binding record
	err := d.db.Where("user_id = ? AND device_id = ?", userID, deviceID).
		Delete(&models.DeviceBinding{}).Error

	if err != nil {
		return fmt.Errorf("failed to unbind device: %w", err)
	}

	return nil
}

// GetUserDevices gets all devices for a user
func (d *DeviceService) GetUserDevices(userID string) ([]models.DeviceBinding, error) {
	var devices []models.DeviceBinding

	err := d.db.Where("user_id = ? AND revoked_at IS NULL", userID).
		Order("last_seen_at DESC").Find(&devices).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get user devices: %w", err)
	}

	return devices, nil
}

// CleanupExpiredDevices removes old/unused device bindings
func (d *DeviceService) CleanupExpiredDevices() error {
	// Remove devices not seen in 90 days and never authorized
	cutoff := time.Now().AddDate(0, 0, -90)

	err := d.db.Where("last_seen_at < ? AND is_authorized = ?", cutoff, false).
		Delete(&models.DeviceBinding{}).Error

	if err != nil {
		return fmt.Errorf("failed to cleanup expired devices: %w", err)
	}

	return nil
}

// Private methods

func (d *DeviceService) registerNewDevice(userID string, req *DeviceRegistrationRequest) (*DeviceBindingResult, error) {
	now := time.Now()

	deviceBinding := &models.DeviceBinding{
		UserID:            userID,
		DeviceID:          req.DeviceID,
		DeviceFingerprint: req.DeviceFingerprint,
		Platform:          req.Platform,
		DeviceInfo:        req.DeviceInfo,
		BiometricHash:     req.BiometricHash,
		IsTrusted:         false,
		IsAuthorized:      !d.requireManualAuth, // Auto-authorize if manual auth not required
		LastSeenAt:        now,
	}

	if !d.requireManualAuth {
		deviceBinding.AuthorizedAt = &now
	}

	if err := d.db.Create(deviceBinding).Error; err != nil {
		return nil, fmt.Errorf("failed to register device: %w", err)
	}

	return &DeviceBindingResult{
		DeviceBinding: deviceBinding,
		IsNewDevice:   true,
		RequiresAuth:  d.requireManualAuth,
		TrustLevel:    "new",
		SecurityFlags: models.SecurityFlags{
			NewDevice: true,
		},
	}, nil
}

func (d *DeviceService) updateExistingDevice(existing *models.DeviceBinding, req *DeviceRegistrationRequest) (*DeviceBindingResult, error) {
	// Check if fingerprint changed (potential security issue)
	fingerprintChanged := existing.DeviceFingerprint != req.DeviceFingerprint

	// Update device info
	existing.DeviceFingerprint = req.DeviceFingerprint
	existing.DeviceInfo = req.DeviceInfo
	existing.LastSeenAt = time.Now()

	if req.BiometricHash != nil {
		existing.BiometricHash = req.BiometricHash
	}

	// If fingerprint changed and device was trusted, remove trust
	if fingerprintChanged && existing.IsTrusted {
		existing.IsTrusted = false
	}

	if err := d.db.Save(existing).Error; err != nil {
		return nil, fmt.Errorf("failed to update device: %w", err)
	}

	trustLevel := d.calculateTrustLevel(existing)

	securityFlags := models.SecurityFlags{}
	if fingerprintChanged {
		securityFlags.SuspiciousActivity = true
		securityFlags.RequireReauth = true
	}

	return &DeviceBindingResult{
		DeviceBinding: existing,
		IsNewDevice:   false,
		RequiresAuth:  !existing.IsAuthorized,
		TrustLevel:    trustLevel,
		SecurityFlags: securityFlags,
	}, nil
}

func (d *DeviceService) checkDeviceLimit(userID string) error {
	var count int64
	err := d.db.Model(&models.DeviceBinding{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).Count(&count).Error

	if err != nil {
		return fmt.Errorf("failed to check device count: %w", err)
	}

	if int(count) >= d.maxDevicesPerUser {
		return ErrMaxDevicesExceeded
	}

	return nil
}

func (d *DeviceService) validateFingerprint(fingerprint, deviceID string, platform models.PlatformType) bool {
	// Basic validation
	if len(fingerprint) < 32 || len(fingerprint) > 1024 {
		return false
	}

	// Validate structure - fingerprint should be colon-separated components
	parts := strings.Split(fingerprint, ":")
	if len(parts) < 3 {
		return false
	}

	// Verify fingerprint format and content
	return d.verifyFingerprintIntegrity(fingerprint, deviceID, platform)
}

func (d *DeviceService) generateExpectedFingerprint(deviceID string, platform models.PlatformType) string {
	// Generate expected fingerprint pattern
	data := fmt.Sprintf("%s:%s", deviceID, platform)
	h := hmac.New(sha256.New, d.deviceSecret)
	h.Write([]byte(data))
	return hex.EncodeToString(h.Sum(nil))
}

func (d *DeviceService) verifyFingerprintIntegrity(fingerprint, deviceID string, platform models.PlatformType) bool {
	// Split fingerprint into components
	parts := strings.Split(fingerprint, ":")
	if len(parts) < 3 {
		return false
	}

	// Validate component structure based on platform
	if !d.validateFingerprintComponents(parts, platform) {
		return false
	}

	// Verify device ID consistency within fingerprint
	if !d.verifyDeviceIDConsistency(parts, deviceID) {
		return false
	}

	// Check for suspicious patterns
	if d.detectFingerprintAnomalies(fingerprint) {
		return false
	}

	return true
}

// validateFingerprintComponents validates fingerprint structure by platform
func (d *DeviceService) validateFingerprintComponents(parts []string, platform models.PlatformType) bool {
	// First component should be platform identifier (e.g., "android", "ios", "flutter")
	if len(parts[0]) < 3 || len(parts[0]) > 20 {
		return false
	}

	// Second component should be brand/manufacturer (e.g., "OPPO", "Samsung", "Apple")
	// Allow shorter names since real brands can be short (e.g., LG, HP, OPPO)
	if len(parts[1]) < 2 || len(parts[1]) > 128 {
		return false
	}

	// Third component should be model identifier (e.g., "CPH2343", "Galaxy_S21")
	// Allow shorter model names since they vary by manufacturer
	if len(parts[2]) < 3 || len(parts[2]) > 64 {
		return false
	}

	// Platform-specific validation
	switch platform {
	case models.PlatformAndroid:
		// Android fingerprints should contain specific patterns
		return d.validateAndroidFingerprint(parts)
	case models.PlatformIOS:
		// iOS fingerprints should contain specific patterns
		return d.validateIOSFingerprint(parts)
	case models.PlatformWeb:
		// Web fingerprints have different validation
		return d.validateWebFingerprint(parts)
	}

	return false
}

// validateAndroidFingerprint validates Android-specific fingerprint patterns
func (d *DeviceService) validateAndroidFingerprint(parts []string) bool {
	// Android should have alphanumeric patterns for platform/brand/model
	androidPattern := regexp.MustCompile(`^[a-zA-Z0-9_\-]+$`)

	// Validate first 3 parts are alphanumeric
	for i := 0; i < 3 && i < len(parts); i++ {
		if !androidPattern.MatchString(parts[i]) {
			return false
		}
	}

	// If there's a 4th part (hash), validate it's alphanumeric hex-like
	if len(parts) >= 4 {
		hashPattern := regexp.MustCompile(`^[a-fA-F0-9]+$`)
		if !hashPattern.MatchString(parts[3]) {
			return false
		}
	}

	return true
}

// validateIOSFingerprint validates iOS-specific fingerprint patterns
func (d *DeviceService) validateIOSFingerprint(parts []string) bool {
	// iOS should have UUID patterns
	uuidPattern := regexp.MustCompile(`^[a-fA-F0-9\-]+$`)
	return uuidPattern.MatchString(parts[0]) && len(parts[1]) >= 32
}

// validateWebFingerprint validates web-specific fingerprint patterns
func (d *DeviceService) validateWebFingerprint(parts []string) bool {
	// Web fingerprints are more flexible but should have basic validation
	return len(parts[0]) >= 8 && len(parts[1]) >= 16
}

// verifyDeviceIDConsistency validates fingerprint-deviceID relationship
// Note: Flutter generates deviceID and fingerprint independently using different hashing,
// so we don't require the deviceID to be literally present in the fingerprint.
// Instead, we validate that both have valid formats.
func (d *DeviceService) verifyDeviceIDConsistency(parts []string, deviceID string) bool {
	// Validate that deviceID is not empty and has minimum length
	if len(deviceID) < 8 {
		return false
	}

	// Validate that fingerprint has at least 3 meaningful parts
	if len(parts) < 3 {
		return false
	}

	// The fingerprint parts should all be non-empty
	for i := 0; i < 3; i++ {
		if len(parts[i]) == 0 {
			return false
		}
	}

	return true
}

// detectFingerprintAnomalies detects suspicious fingerprint patterns
func (d *DeviceService) detectFingerprintAnomalies(fingerprint string) bool {
	// Detect repeated patterns (potential spoofing)
	if d.hasRepeatedPatterns(fingerprint) {
		return true
	}

	// Detect common test/dummy patterns
	suspiciousPatterns := []string{
		"test", "dummy", "fake", "mock", "simulator",
		"000000", "111111", "123456", "abcdef",
	}

	fingerprintLower := strings.ToLower(fingerprint)
	for _, pattern := range suspiciousPatterns {
		if strings.Contains(fingerprintLower, pattern) {
			return true
		}
	}

	return false
}

// hasRepeatedPatterns detects repeated patterns in fingerprint
func (d *DeviceService) hasRepeatedPatterns(fingerprint string) bool {
	// Check for repeated 4-character patterns
	for i := 0; i < len(fingerprint)-7; i++ {
		pattern := fingerprint[i : i+4]
		if strings.Count(fingerprint, pattern) > 3 {
			return true
		}
	}
	return false
}

func (d *DeviceService) calculateTrustLevel(device *models.DeviceBinding) string {
	if !device.IsAuthorized {
		return "unauthorized"
	}

	if device.IsTrusted {
		return "trusted"
	}

	// Check if device has been used long enough to be auto-trusted
	if device.AuthorizedAt != nil {
		timeSinceAuth := time.Since(*device.AuthorizedAt)
		if timeSinceAuth > d.autoTrustDuration {
			// Auto-trust the device
			go func() {
				d.TrustDevice(device.UserID, device.DeviceID)
			}()
			return "auto-trusted"
		}
	}

	return "authorized"
}

func (d *DeviceService) detectSuspiciousActivity(device *models.DeviceBinding) bool {
	// Simple suspicious activity detection
	now := time.Now()

	// Check if device was seen recently but fingerprint is different
	// (This would be caught in the update logic, but adding as example)

	// Check if device hasn't been seen in a long time
	daysSinceLastSeen := now.Sub(device.LastSeenAt).Hours() / 24
	if daysSinceLastSeen > 30 {
		return true
	}

	// Add more sophisticated detection logic here
	return false
}

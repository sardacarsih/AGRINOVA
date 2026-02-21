package postgres

import (
	"context"
	"time"

	"agrinovagraphql/server/internal/auth/features/shared/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DeviceRepository implements domain.DeviceRepository for PostgreSQL
type DeviceRepository struct {
	db *gorm.DB
}

// NewDeviceRepository creates new PostgreSQL device repository
func NewDeviceRepository(db *gorm.DB) *DeviceRepository {
	return &DeviceRepository{db: db}
}

// FindDeviceByID finds device by ID
func (r *DeviceRepository) FindDeviceByID(ctx context.Context, deviceID string) (*domain.DeviceBinding, error) {
	var device DeviceModel
	err := r.db.WithContext(ctx).
		Where("device_id = ?", deviceID).
		First(&device).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.toDomainDevice(&device), nil
}

// FindDeviceByUser finds device by user and device ID
func (r *DeviceRepository) FindDeviceByUser(ctx context.Context, userID, deviceID string) (*domain.DeviceBinding, error) {
	var device DeviceModel
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND device_id = ?", userID, deviceID).
		First(&device).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.toDomainDevice(&device), nil
}

// FindDevicesByUser finds all devices for a user
func (r *DeviceRepository) FindDevicesByUser(ctx context.Context, userID string) ([]*domain.DeviceBinding, error) {
	var devices []DeviceModel
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("last_seen_at DESC").
		Find(&devices).Error

	if err != nil {
		return nil, err
	}

	domainDevices := make([]*domain.DeviceBinding, len(devices))
	for i, device := range devices {
		domainDevices[i] = r.toDomainDevice(&device)
	}

	return domainDevices, nil
}

// CreateDevice creates a new device binding
func (r *DeviceRepository) CreateDevice(ctx context.Context, device *domain.DeviceBinding) error {
	deviceModel := r.fromDomainDevice(device)
	deviceModel.ID = uuid.New().String()

	return r.db.WithContext(ctx).Create(deviceModel).Error
}

// UpdateDevice updates an existing device binding
func (r *DeviceRepository) UpdateDevice(ctx context.Context, device *domain.DeviceBinding) error {
	deviceModel := r.fromDomainDevice(device)
	return r.db.WithContext(ctx).
		Where("id = ?", device.ID).
		Updates(deviceModel).Error
}

// RevokeDevice deactivates a device
func (r *DeviceRepository) RevokeDevice(ctx context.Context, deviceID string) error {
	return r.db.WithContext(ctx).
		Model(&DeviceModel{}).
		Where("device_id = ?", deviceID).
		Updates(map[string]interface{}{
			"is_authorized": false,
			"revoked_at":    time.Now(),
			"updated_at":    time.Now(),
		}).Error
}

// RevokeAllUserDevices deactivates all devices for a user
func (r *DeviceRepository) RevokeAllUserDevices(ctx context.Context, userID string) error {
	return r.db.WithContext(ctx).
		Model(&DeviceModel{}).
		Where("user_id = ?", userID).
		Updates(map[string]interface{}{
			"is_authorized": false,
			"revoked_at":    time.Now(),
			"updated_at":    time.Now(),
		}).Error
}

// ValidateDeviceFingerprint validates device fingerprint for a user
func (r *DeviceRepository) ValidateDeviceFingerprint(ctx context.Context, userID, fingerprint string) (*domain.DeviceBinding, error) {
	var device DeviceModel
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND device_fingerprint = ? AND is_authorized = true", userID, fingerprint).
		First(&device).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.toDomainDevice(&device), nil
}

// DeviceModel represents the GORM model for device bindings table
type DeviceModel struct {
	ID                string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID            string    `gorm:"not null;index"`
	DeviceID          string    `gorm:"not null;uniqueIndex:user_device"`
	DeviceFingerprint string    `gorm:"not null"`
	Platform          string    `gorm:"not null"`
	DeviceInfoJSON    string    `gorm:"column:device_info;type:jsonb"`
	BiometricHash     *string   `gorm:"index"`
	IsTrusted         bool      `gorm:"default:false"`
	IsAuthorized      bool      `gorm:"default:true;index"`
	LastSeenAt        time.Time `gorm:"index"`
	AuthorizedBy      *string
	AuthorizedAt      *time.Time
	RevokedAt         *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// TableName overrides the table name used by GORM to device_bindings
func (DeviceModel) TableName() string {
	return "device_bindings"
}

// Helper methods to convert between domain and GORM models

func (r *DeviceRepository) toDomainDevice(device *DeviceModel) *domain.DeviceBinding {
	domainDevice := &domain.DeviceBinding{
		ID:                device.ID,
		UserID:            device.UserID,
		DeviceID:          device.DeviceID,
		DeviceFingerprint: device.DeviceFingerprint,
		Platform:          domain.PlatformType(device.Platform),
		BiometricHash:     device.BiometricHash,
		IsTrusted:         device.IsTrusted,
		IsAuthorized:      device.IsAuthorized,
		LastSeenAt:        device.LastSeenAt,
		AuthorizedBy:      device.AuthorizedBy,
		AuthorizedAt:      device.AuthorizedAt,
		RevokedAt:         device.RevokedAt,
		CreatedAt:         device.CreatedAt,
		UpdatedAt:         device.UpdatedAt,
	}

	// Parse device info JSON
	if device.DeviceInfoJSON != "" {
		deviceInfo := r.parseDeviceInfoJSON(device.DeviceInfoJSON)
		domainDevice.DeviceInfo = deviceInfo
	}

	return domainDevice
}

func (r *DeviceRepository) fromDomainDevice(device *domain.DeviceBinding) *DeviceModel {
	return &DeviceModel{
		ID:                device.ID,
		UserID:            device.UserID,
		DeviceID:          device.DeviceID,
		DeviceFingerprint: device.DeviceFingerprint,
		Platform:          string(device.Platform),
		DeviceInfoJSON:    r.marshalDeviceInfoJSON(device.DeviceInfo),
		BiometricHash:     device.BiometricHash,
		IsTrusted:         device.IsTrusted,
		IsAuthorized:      device.IsAuthorized,
		LastSeenAt:        device.LastSeenAt,
		AuthorizedBy:      device.AuthorizedBy,
		AuthorizedAt:      device.AuthorizedAt,
		RevokedAt:         device.RevokedAt,
		CreatedAt:         device.CreatedAt,
		UpdatedAt:         device.UpdatedAt,
	}
}

// JSON serialization helpers
func (r *DeviceRepository) parseDeviceInfoJSON(jsonStr string) domain.DeviceInfo {
	// Implementation for parsing device info from JSON
	// In a real implementation, use json.Unmarshal
	return domain.DeviceInfo{}
}

func (r *DeviceRepository) marshalDeviceInfoJSON(info domain.DeviceInfo) string {
	// Implementation for marshaling device info to JSON
	// In a real implementation, use json.Marshal
	return "{}"
}

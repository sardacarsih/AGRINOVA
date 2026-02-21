package models

import (
	"time"

	"gorm.io/gorm"
)

// UserDeviceToken stores FCM tokens for push notifications
type UserDeviceToken struct {
	ID        string         `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID    string         `json:"user_id" gorm:"type:uuid;not null;index:idx_device_token_user"`
	Token     string         `json:"token" gorm:"type:text;not null;uniqueIndex:idx_device_token_unique"`
	Platform  string         `json:"platform" gorm:"type:varchar(20)"` // ANDROID, IOS
	DeviceID  string         `json:"device_id" gorm:"type:varchar(255)"`
	IsActive  bool           `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

// TableName returns the table name for GORM
func (UserDeviceToken) TableName() string {
	return "user_device_tokens"
}

// FCM Platform constants (distinct from PlatformType in auth_models.go)
const (
	FCMPlatformAndroid = "ANDROID"
	FCMPlatformIOS     = "IOS"
)

// IsValidFCMPlatform checks if platform is valid for FCM
func IsValidFCMPlatform(platform string) bool {
	return platform == FCMPlatformAndroid || platform == FCMPlatformIOS
}

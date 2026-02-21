package repository

import (
	"time"

	"agrinovagraphql/server/internal/auth/domain"

	"gorm.io/gorm"
)

// UserGorm represents the user table
type UserGorm struct {
	ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	Name      string    `gorm:"type:varchar(255);column:name;not null"`
	Username  string    `gorm:"type:varchar(255);unique;not null"`
	Password  string    `gorm:"type:varchar(255);not null"`
	Role      string    `gorm:"type:varchar(50);not null"`
	CompanyID string    `gorm:"type:uuid;index"`
	ManagerID *string   `gorm:"type:uuid;index"`
	Manager   *UserGorm `gorm:"foreignKey:ManagerID"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

func (UserGorm) TableName() string {
	return "users"
}

// ToDomain converts GORM model to domain entity
func (u *UserGorm) ToDomain() *domain.User {
	return &domain.User{
		ID:        u.ID,
		Name:      u.Name,
		Username:  u.Username,
		Password:  u.Password,
		Role:      u.Role,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}

// UserSessionGorm represents the user_sessions table
type UserSessionGorm struct {
	ID            string               `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID        string               `gorm:"type:uuid;not null;index"`
	DeviceID      *string              `gorm:"type:varchar(255);index"`
	SessionToken  string               `gorm:"type:text;unique;not null"`
	RefreshToken  *string              `gorm:"type:text"`
	Platform      string               `gorm:"type:varchar(20);not null"`
	DeviceInfo    domain.DeviceInfo    `gorm:"type:json"`
	IPAddress     string               `gorm:"type:inet"`
	UserAgent     string               `gorm:"type:text"`
	LastActivity  time.Time            `gorm:"not null"`
	ExpiresAt     time.Time            `gorm:"not null;index"`
	IsActive      bool                 `gorm:"default:true;index"`
	LoginMethod   string               `gorm:"type:varchar(20);not null"`
	SecurityFlags domain.SecurityFlags `gorm:"type:json"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
	DeletedAt     gorm.DeletedAt `gorm:"index"`
}

func (UserSessionGorm) TableName() string {
	return "user_sessions"
}

func (s *UserSessionGorm) ToDomain() *domain.UserSession {
	return &domain.UserSession{
		ID:            s.ID,
		UserID:        s.UserID,
		DeviceID:      s.DeviceID,
		SessionToken:  s.SessionToken,
		RefreshToken:  s.RefreshToken,
		Platform:      domain.PlatformType(s.Platform),
		DeviceInfo:    &s.DeviceInfo,
		IPAddress:     s.IPAddress,
		UserAgent:     s.UserAgent,
		LastActivity:  s.LastActivity,
		ExpiresAt:     s.ExpiresAt,
		IsActive:      s.IsActive,
		LoginMethod:   domain.LoginMethod(s.LoginMethod),
		SecurityFlags: s.SecurityFlags,
		CreatedAt:     s.CreatedAt,
		UpdatedAt:     s.UpdatedAt,
	}
}

// DeviceBindingGorm represents the device_bindings table
type DeviceBindingGorm struct {
	ID                string            `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID            string            `gorm:"type:uuid;not null;index"`
	DeviceID          string            `gorm:"type:varchar(255);not null;index"`
	DeviceFingerprint string            `gorm:"type:text;not null"`
	Platform          string            `gorm:"type:varchar(20);not null"`
	DeviceInfo        domain.DeviceInfo `gorm:"type:json"`
	BiometricHash     *string           `gorm:"type:text"`
	IsTrusted         bool              `gorm:"default:false"`
	IsAuthorized      bool              `gorm:"default:false"`
	LastSeenAt        time.Time         `gorm:"not null"`
	AuthorizedBy      *string           `gorm:"type:uuid"`
	AuthorizedAt      *time.Time
	RevokedAt         *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
	DeletedAt         gorm.DeletedAt `gorm:"index"`
}

func (DeviceBindingGorm) TableName() string {
	return "device_bindings"
}

func (d *DeviceBindingGorm) ToDomain() *domain.DeviceBinding {
	return &domain.DeviceBinding{
		ID:                d.ID,
		UserID:            d.UserID,
		DeviceID:          d.DeviceID,
		DeviceFingerprint: d.DeviceFingerprint,
		Platform:          domain.PlatformType(d.Platform),
		DeviceInfo:        d.DeviceInfo,
		BiometricHash:     d.BiometricHash,
		IsTrusted:         d.IsTrusted,
		IsAuthorized:      d.IsAuthorized,
		LastSeenAt:        d.LastSeenAt,
		AuthorizedBy:      d.AuthorizedBy,
		AuthorizedAt:      d.AuthorizedAt,
		RevokedAt:         d.RevokedAt,
		CreatedAt:         d.CreatedAt,
		UpdatedAt:         d.UpdatedAt,
	}
}

// JWTTokenGorm represents the jwt_tokens table
type JWTTokenGorm struct {
	ID               string     `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID           string     `gorm:"type:uuid;not null;index"`
	DeviceID         string     `gorm:"type:varchar(255);not null;index"`
	TokenType        string     `gorm:"type:varchar(20);not null"`
	TokenHash        string     `gorm:"type:text;unique;not null"`
	RefreshHash      *string    `gorm:"type:text;unique"`
	OfflineHash      *string    `gorm:"type:text;unique"`
	ExpiresAt        time.Time  `gorm:"not null;index"`
	RefreshExpiresAt *time.Time `gorm:"index"`
	OfflineExpiresAt *time.Time `gorm:"index"`
	IsRevoked        bool       `gorm:"default:false;index"`
	RevokedAt        *time.Time
	LastUsedAt       *time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
	DeletedAt        gorm.DeletedAt `gorm:"index"`
}

func (JWTTokenGorm) TableName() string {
	return "jwt_tokens"
}

func (j *JWTTokenGorm) ToDomain() *domain.JWTToken {
	return &domain.JWTToken{
		ID:               j.ID,
		UserID:           j.UserID,
		DeviceID:         j.DeviceID,
		TokenType:        domain.TokenType(j.TokenType),
		TokenHash:        j.TokenHash,
		RefreshHash:      j.RefreshHash,
		OfflineHash:      j.OfflineHash,
		ExpiresAt:        j.ExpiresAt,
		RefreshExpiresAt: j.RefreshExpiresAt,
		OfflineExpiresAt: j.OfflineExpiresAt,
		IsRevoked:        j.IsRevoked,
		RevokedAt:        j.RevokedAt,
		LastUsedAt:       j.LastUsedAt,
		CreatedAt:        j.CreatedAt,
		UpdatedAt:        j.UpdatedAt,
	}
}

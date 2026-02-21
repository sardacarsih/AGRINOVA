package mobile

import (
	"context"
	"time"

	"agrinovagraphql/server/internal/auth/features/shared/domain"
)

// MobileAuthService defines the interface for mobile-specific authentication operations
type MobileAuthService interface {
	// Login handles mobile authentication with JWT tokens
	Login(ctx context.Context, input MobileLoginInput) (*MobileLoginResult, error)

	// Logout handles mobile logout by revoking tokens
	Logout(ctx context.Context, deviceID string) error

	// RefreshToken handles JWT token refresh
	RefreshToken(ctx context.Context, input RefreshTokenInput) (*MobileLoginResult, error)

	// DeviceRenew exchanges a valid offline/session token for a new access+refresh token pair.
	// Used when the refresh token is expired or revoked but the offline token is still valid.
	DeviceRenew(ctx context.Context, input DeviceRenewInput) (*MobileLoginResult, error)

	// ValidateOfflineAccess validates offline token for air-gapped operations
	ValidateOfflineAccess(ctx context.Context, offlineToken string) (*domain.User, error)

	// BindDevice binds a new device to user account
	BindDevice(ctx context.Context, input DeviceBindingInput) error

	// UnbindDevice removes device binding
	UnbindDevice(ctx context.Context, deviceID string) error
}

// MobileLoginInput represents mobile login request
type MobileLoginInput struct {
	Identifier        string // username or email
	Password          string
	Platform          domain.PlatformType // ANDROID or IOS
	DeviceID          string
	DeviceFingerprint string
	DeviceInfo        *domain.DeviceInfo
	BiometricToken    *string // optional biometric auth
}

// MobileLoginResult represents successful mobile login response
type MobileLoginResult struct {
	AccessToken      string                 `json:"accessToken"`
	RefreshToken     string                 `json:"refreshToken"`
	OfflineToken     string                 `json:"offlineToken"`
	ExpiresAt        time.Time              `json:"expiresAt"`
	RefreshExpiresAt time.Time              `json:"refreshExpiresAt"`
	OfflineExpiresAt time.Time              `json:"offlineExpiresAt"`
	User             domain.UserDTO         `json:"user"`
	Assignments      []domain.AssignmentDTO `json:"assignments"`
	Device           domain.DeviceBinding   `json:"device"`
}

// DeviceBindingInput represents device binding request
type DeviceBindingInput struct {
	UserID            string
	DeviceID          string
	DeviceFingerprint string
	Platform          domain.PlatformType
	DeviceInfo        domain.DeviceInfo
	BiometricHash     *string
	IsTrusted         bool
}

// RefreshTokenInput represents refresh token request data
type RefreshTokenInput struct {
	RefreshToken      string
	DeviceID          *string
	DeviceFingerprint *string
}

// DeviceRenewInput represents the request to exchange an offline/session token
// for a new access+refresh token pair (used when refresh token is expired/revoked).
type DeviceRenewInput struct {
	OfflineToken      string
	DeviceID          string
	DeviceFingerprint *string
}

// TokenService defines interface for JWT token management
type TokenService interface {
	// GenerateTokenPair generates access and refresh tokens
	GenerateTokenPair(ctx context.Context, userID, deviceID string, role domain.Role, companyID string) (*TokenPair, error)

	// GenerateOfflineToken generates offline-capable token
	GenerateOfflineToken(ctx context.Context, userID, deviceID string) (string, error)

	// ValidateAccessToken validates JWT access token
	ValidateAccessToken(ctx context.Context, token string) (*TokenClaims, error)

	// ValidateRefreshToken validates refresh token
	ValidateRefreshToken(ctx context.Context, token string) (*TokenClaims, error)

	// ValidateOfflineToken validates offline token
	ValidateOfflineToken(ctx context.Context, token string) (*TokenClaims, error)

	// RevokeToken revokes a specific token
	RevokeToken(ctx context.Context, tokenID string) error

	// RevokeAllUserTokens revokes all tokens for a user
	RevokeAllUserTokens(ctx context.Context, userID string) error

	// RevokeDeviceTokens revokes all tokens for a specific user device
	RevokeDeviceTokens(ctx context.Context, userID, deviceID string) error
}

// TokenPair represents access and refresh token pair
type TokenPair struct {
	AccessToken      string    `json:"accessToken"`
	RefreshToken     string    `json:"refreshToken"`
	AccessExpiresAt  time.Time `json:"accessExpiresAt"`
	RefreshExpiresAt time.Time `json:"refreshExpiresAt"`
	TokenID          string    `json:"tokenId"`
}

// TokenClaims represents JWT token claims
type TokenClaims struct {
	UserID    string            `json:"userId"`
	DeviceID  string            `json:"deviceId"`
	TokenID   string            `json:"tokenId"`
	Role      domain.Role       `json:"role"`
	CompanyID string            `json:"companyId"`
	IssuedAt  time.Time         `json:"iat"`
	ExpiresAt time.Time         `json:"exp"`
	Scope     []string          `json:"scope"`
	Metadata  map[string]string `json:"metadata,omitempty"`
}

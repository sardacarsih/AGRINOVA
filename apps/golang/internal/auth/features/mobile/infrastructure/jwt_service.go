package infrastructure

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	mobileDomain "agrinovagraphql/server/internal/auth/features/mobile/domain"
	sharedDomain "agrinovagraphql/server/internal/auth/features/shared/domain"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// JWTService implements domain.TokenService for JWT token management
type JWTService struct {
	db     *gorm.DB
	config JWTConfig
}

// NewJWTService creates new JWT service
func NewJWTService(db *gorm.DB, config JWTConfig) *JWTService {
	return &JWTService{db: db, config: config}
}

// GenerateTokenPair generates access and refresh tokens
func (s *JWTService) GenerateTokenPair(ctx context.Context, userID, deviceID string, role sharedDomain.Role, companyID string) (*mobileDomain.TokenPair, error) {
	now := time.Now()
	tokenID := s.generateTokenID()

	// Access token claims
	accessClaims := jwt.MapClaims{
		"token_id":   tokenID,
		"user_id":    userID,
		"device_id":  deviceID,
		"role":       role,
		"company_id": companyID,
		"iss":        s.config.Issuer,
		"type":       "access",
		"iat":        now.Unix(),
		"exp":        now.Add(s.config.AccessTokenDuration).Unix(),
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(s.config.AccessTokenSecret))
	if err != nil {
		return nil, err
	}

	// Refresh token claims
	refreshClaims := jwt.MapClaims{
		"token_id":  tokenID,
		"user_id":   userID,
		"device_id": deviceID,
		"iss":       s.config.Issuer,
		"type":      "refresh",
		"iat":       now.Unix(),
		"exp":       now.Add(s.config.RefreshTokenDuration).Unix(),
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString([]byte(s.config.RefreshTokenSecret))
	if err != nil {
		return nil, err
	}

	// Store token in database
	tokenRecord := &JWTTokenModel{
		ID:               tokenID,
		UserID:           userID,
		DeviceID:         deviceID,
		TokenType:        "JWT",
		TokenHash:        s.hashToken(accessTokenString),
		RefreshHash:      &[]string{s.hashToken(refreshTokenString)}[0],
		ExpiresAt:        now.Add(s.config.AccessTokenDuration),
		RefreshExpiresAt: &[]time.Time{now.Add(s.config.RefreshTokenDuration)}[0],
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if err := s.db.WithContext(ctx).Create(tokenRecord).Error; err != nil {
		return nil, err
	}

	return &mobileDomain.TokenPair{
		AccessToken:      accessTokenString,
		RefreshToken:     refreshTokenString,
		AccessExpiresAt:  tokenRecord.ExpiresAt,
		RefreshExpiresAt: *tokenRecord.RefreshExpiresAt,
		TokenID:          tokenID,
	}, nil
}

// GenerateOfflineToken generates an opaque offline/session token (32 random bytes, base64url-encoded).
// The raw token is returned to the client; only its SHA256 hash is stored server-side.
func (s *JWTService) GenerateOfflineToken(ctx context.Context, userID, deviceID string) (string, error) {
	now := time.Now()
	tokenID := s.generateTokenID()

	// Generate 32 cryptographically-random bytes → base64url (no padding)
	rawBytes := make([]byte, 32)
	if _, err := rand.Read(rawBytes); err != nil {
		return "", fmt.Errorf("failed to generate offline token bytes: %w", err)
	}
	tokenString := base64.RawURLEncoding.EncodeToString(rawBytes)

	hash := s.hashToken(tokenString)

	tokenRecord := &JWTTokenModel{
		ID:               tokenID,
		UserID:           userID,
		DeviceID:         deviceID,
		TokenType:        "OFFLINE",
		TokenHash:        hash, // reuse token_hash column as primary lookup key
		OfflineHash:      &hash,
		ExpiresAt:        now.Add(s.config.OfflineTokenDuration),
		OfflineExpiresAt: &[]time.Time{now.Add(s.config.OfflineTokenDuration)}[0],
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if err := s.db.WithContext(ctx).Create(tokenRecord).Error; err != nil {
		return "", err
	}

	return tokenString, nil
}

// ValidateAccessToken validates JWT access token
func (s *JWTService) ValidateAccessToken(ctx context.Context, tokenString string) (*mobileDomain.TokenClaims, error) {
	// Parse and validate token
	token, err := jwt.Parse(tokenString, func(_ *jwt.Token) (interface{}, error) {
		return []byte(s.config.AccessTokenSecret), nil
	}, jwt.WithIssuer(s.config.Issuer), jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	// Check token type
	if tokenType, ok := claims["type"].(string); !ok || tokenType != "access" {
		return nil, errors.New("invalid token type")
	}

	// Check if token is revoked
	tokenID, err := getStringClaim(claims, "token_id")
	if err != nil {
		return nil, err
	}

	var tokenRecord JWTTokenModel
	now := time.Now()
	currentHash := s.hashToken(tokenString)
	legacyHash := s.legacyHashToken(tokenString)
	if err := s.db.WithContext(ctx).
		Where("id = ? AND token_hash IN ? AND is_revoked = false AND expires_at > ?", tokenID, []string{currentHash, legacyHash}, now).
		First(&tokenRecord).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("token not found, expired, or revoked")
		}
		return nil, err
	}

	_ = s.db.WithContext(ctx).
		Model(&JWTTokenModel{}).
		Where("id = ?", tokenID).
		Updates(map[string]interface{}{
			"last_used_at": now,
			"updated_at":   now,
		}).Error

	// Parse role and companyID (with safe type assertion)
	roleStr, _ := claims["role"].(string)
	companyID, _ := claims["company_id"].(string)
	userID, err := getStringClaim(claims, "user_id")
	if err != nil {
		return nil, err
	}
	deviceID, err := getStringClaim(claims, "device_id")
	if err != nil {
		return nil, err
	}
	issuedAt, err := getUnixClaim(claims, "iat")
	if err != nil {
		return nil, err
	}
	expiresAt, err := getUnixClaim(claims, "exp")
	if err != nil {
		return nil, err
	}

	// Return token claims
	return &mobileDomain.TokenClaims{
		UserID:    userID,
		DeviceID:  deviceID,
		TokenID:   tokenID,
		Role:      sharedDomain.Role(roleStr),
		CompanyID: companyID,
		IssuedAt:  issuedAt,
		ExpiresAt: expiresAt,
	}, nil
}

// ValidateRefreshToken validates refresh token
func (s *JWTService) ValidateRefreshToken(ctx context.Context, tokenString string) (*mobileDomain.TokenClaims, error) {
	// Similar to ValidateAccessToken but with refresh token secret
	token, err := jwt.Parse(tokenString, func(_ *jwt.Token) (interface{}, error) {
		return []byte(s.config.RefreshTokenSecret), nil
	}, jwt.WithIssuer(s.config.Issuer), jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	if tokenType, ok := claims["type"].(string); !ok || tokenType != "refresh" {
		return nil, errors.New("invalid token type")
	}

	tokenID, err := getStringClaim(claims, "token_id")
	if err != nil {
		return nil, err
	}
	userID, err := getStringClaim(claims, "user_id")
	if err != nil {
		return nil, err
	}
	deviceID, err := getStringClaim(claims, "device_id")
	if err != nil {
		return nil, err
	}
	issuedAt, err := getUnixClaim(claims, "iat")
	if err != nil {
		return nil, err
	}
	expiresAt, err := getUnixClaim(claims, "exp")
	if err != nil {
		return nil, err
	}

	var tokenRecord JWTTokenModel
	now := time.Now()
	currentHash := s.hashToken(tokenString)
	legacyHash := s.legacyHashToken(tokenString)
	if err := s.db.WithContext(ctx).
		Where("id = ? AND refresh_hash IN ? AND is_revoked = false AND refresh_expires_at > ?", tokenID, []string{currentHash, legacyHash}, now).
		First(&tokenRecord).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("refresh token not found, expired, or revoked")
		}
		return nil, err
	}

	_ = s.db.WithContext(ctx).
		Model(&JWTTokenModel{}).
		Where("id = ?", tokenID).
		Updates(map[string]interface{}{
			"last_used_at": now,
			"updated_at":   now,
		}).Error

	return &mobileDomain.TokenClaims{
		UserID:    userID,
		DeviceID:  deviceID,
		TokenID:   tokenID,
		IssuedAt:  issuedAt,
		ExpiresAt: expiresAt,
	}, nil
}

// ValidateOfflineToken validates an opaque offline/session token by SHA256 hash lookup.
// The token is NOT a JWT — it is a 32-byte random value (base64url). Claims are read from DB.
func (s *JWTService) ValidateOfflineToken(ctx context.Context, tokenString string) (*mobileDomain.TokenClaims, error) {
	if strings.TrimSpace(tokenString) == "" {
		return nil, errors.New("offline token is empty")
	}

	now := time.Now()
	hash := s.hashToken(tokenString)

	var tokenRecord JWTTokenModel
	if err := s.db.WithContext(ctx).
		Where(
			"token_type = ? AND is_revoked = false AND (offline_hash = ? OR token_hash = ?) AND ((offline_expires_at IS NOT NULL AND offline_expires_at > ?) OR expires_at > ?)",
			"OFFLINE", hash, hash, now, now,
		).
		First(&tokenRecord).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("offline token not found, expired, or revoked")
		}
		return nil, err
	}

	_ = s.db.WithContext(ctx).
		Model(&JWTTokenModel{}).
		Where("id = ?", tokenRecord.ID).
		Updates(map[string]interface{}{
			"last_used_at": now,
			"updated_at":   now,
		}).Error

	expiresAt := tokenRecord.ExpiresAt
	if tokenRecord.OfflineExpiresAt != nil {
		expiresAt = *tokenRecord.OfflineExpiresAt
	}

	return &mobileDomain.TokenClaims{
		UserID:    tokenRecord.UserID,
		DeviceID:  tokenRecord.DeviceID,
		TokenID:   tokenRecord.ID,
		IssuedAt:  tokenRecord.CreatedAt,
		ExpiresAt: expiresAt,
		Scope:     []string{"offline_access"},
	}, nil
}

// RevokeToken revokes a specific token
func (s *JWTService) RevokeToken(ctx context.Context, tokenID string) error {
	return s.db.WithContext(ctx).
		Model(&JWTTokenModel{}).
		Where("id = ?", tokenID).
		Updates(map[string]interface{}{
			"is_revoked": true,
			"revoked_at": time.Now(),
			"updated_at": time.Now(),
		}).Error
}

// RevokeAllUserTokens revokes all tokens for a user
func (s *JWTService) RevokeAllUserTokens(ctx context.Context, userID string) error {
	return s.db.WithContext(ctx).
		Model(&JWTTokenModel{}).
		Where("user_id = ?", userID).
		Updates(map[string]interface{}{
			"is_revoked": true,
			"revoked_at": time.Now(),
			"updated_at": time.Now(),
		}).Error
}

// RevokeDeviceTokens revokes all tokens for a specific user device
func (s *JWTService) RevokeDeviceTokens(ctx context.Context, userID, deviceID string) error {
	return s.db.WithContext(ctx).
		Model(&JWTTokenModel{}).
		Where("user_id = ? AND device_id = ?", userID, deviceID).
		Updates(map[string]interface{}{
			"is_revoked": true,
			"revoked_at": time.Now(),
			"updated_at": time.Now(),
		}).Error
}

// Helper methods

func (s *JWTService) generateTokenID() string {
	return uuid.New().String()
}

func (s *JWTService) hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// legacyHashToken keeps temporary compatibility with older stored rows.
func (s *JWTService) legacyHashToken(token string) string {
	return base64.URLEncoding.EncodeToString([]byte(token))
}

func getStringClaim(claims jwt.MapClaims, key string) (string, error) {
	value, ok := claims[key]
	if !ok || value == nil {
		return "", fmt.Errorf("%s claim not found", key)
	}

	strValue, ok := value.(string)
	if !ok || strings.TrimSpace(strValue) == "" {
		return "", fmt.Errorf("%s claim invalid", key)
	}

	return strValue, nil
}

func getUnixClaim(claims jwt.MapClaims, key string) (time.Time, error) {
	value, ok := claims[key]
	if !ok || value == nil {
		return time.Time{}, fmt.Errorf("%s claim not found", key)
	}

	floatValue, ok := value.(float64)
	if !ok {
		return time.Time{}, fmt.Errorf("%s claim invalid", key)
	}

	return time.Unix(int64(floatValue), 0), nil
}

func getStringSliceClaim(claims jwt.MapClaims, key string) []string {
	value, ok := claims[key]
	if !ok || value == nil {
		return nil
	}

	rawList, ok := value.([]interface{})
	if !ok {
		return nil
	}

	result := make([]string, 0, len(rawList))
	for _, raw := range rawList {
		strValue, ok := raw.(string)
		if ok && strings.TrimSpace(strValue) != "" {
			result = append(result, strValue)
		}
	}

	return result
}

// JWTTokenModel represents JWT tokens in database
type JWTTokenModel struct {
	ID               string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID           string    `gorm:"not null;index"`
	DeviceID         string    `gorm:"not null;index"`
	TokenType        string    `gorm:"not null"`
	TokenHash        string    `gorm:"not null;uniqueIndex"`
	RefreshHash      *string   `gorm:"index"`
	OfflineHash      *string   `gorm:"index"`
	ExpiresAt        time.Time `gorm:"not null;index"`
	RefreshExpiresAt *time.Time
	OfflineExpiresAt *time.Time
	IsRevoked        bool       `gorm:"default:false;index"`
	RevokedAt        *time.Time
	RevokedReason    *string
	LastUsedAt       *time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

// TableName overrides the table name used by GORM to jwt_tokens
func (JWTTokenModel) TableName() string {
	return "jwt_tokens"
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	AccessTokenSecret    string
	RefreshTokenSecret   string
	OfflineTokenSecret   string
	AccessTokenDuration  time.Duration
	RefreshTokenDuration time.Duration
	OfflineTokenDuration time.Duration
	Issuer               string
}

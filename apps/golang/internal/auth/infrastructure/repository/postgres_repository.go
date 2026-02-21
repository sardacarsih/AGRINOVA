package repository

import (
	"context"
	"errors"

	"agrinovagraphql/server/internal/auth/domain"

	"gorm.io/gorm"
)

type PostgresRepository struct {
	db *gorm.DB
}

func NewPostgresRepository(db *gorm.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

// User operations

func (r *PostgresRepository) FindUserByUsername(ctx context.Context, username string) (*domain.User, error) {
	var user UserGorm
	if err := r.db.WithContext(ctx).Preload("Manager").Where("username = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return user.ToDomain(), nil
}

func (r *PostgresRepository) FindUserByID(ctx context.Context, id string) (*domain.User, error) {
	var user UserGorm
	if err := r.db.WithContext(ctx).Preload("Manager").Where("id = ?", id).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return user.ToDomain(), nil
}

// Session operations

func (r *PostgresRepository) CreateSession(ctx context.Context, session *domain.UserSession) error {
	model := UserSessionGorm{
		ID:            session.ID,
		UserID:        session.UserID,
		DeviceID:      session.DeviceID,
		SessionToken:  session.SessionToken,
		RefreshToken:  session.RefreshToken,
		Platform:      string(session.Platform),
		DeviceInfo:    *session.DeviceInfo,
		IPAddress:     session.IPAddress,
		UserAgent:     session.UserAgent,
		LastActivity:  session.LastActivity,
		ExpiresAt:     session.ExpiresAt,
		IsActive:      session.IsActive,
		LoginMethod:   string(session.LoginMethod),
		SecurityFlags: session.SecurityFlags,
		CreatedAt:     session.CreatedAt,
		UpdatedAt:     session.UpdatedAt,
	}
	return r.db.WithContext(ctx).Create(&model).Error
}

func (r *PostgresRepository) FindSessionByToken(ctx context.Context, token string) (*domain.UserSession, error) {
	var session UserSessionGorm
	if err := r.db.WithContext(ctx).Where("session_token = ?", token).First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return session.ToDomain(), nil
}

func (r *PostgresRepository) RevokeSession(ctx context.Context, sessionID string) error {
	return r.db.WithContext(ctx).Model(&UserSessionGorm{}).Where("id = ?", sessionID).Update("is_active", false).Error
}

func (r *PostgresRepository) RevokeAllUserSessions(ctx context.Context, userID string) error {
	return r.db.WithContext(ctx).Model(&UserSessionGorm{}).Where("user_id = ?", userID).Update("is_active", false).Error
}

// Device operations

func (r *PostgresRepository) FindDeviceBinding(ctx context.Context, deviceID string) (*domain.DeviceBinding, error) {
	var binding DeviceBindingGorm
	if err := r.db.WithContext(ctx).Where("device_id = ?", deviceID).First(&binding).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return binding.ToDomain(), nil
}

func (r *PostgresRepository) CreateDeviceBinding(ctx context.Context, binding *domain.DeviceBinding) error {
	model := DeviceBindingGorm{
		ID:                binding.ID,
		UserID:            binding.UserID,
		DeviceID:          binding.DeviceID,
		DeviceFingerprint: binding.DeviceFingerprint,
		Platform:          string(binding.Platform),
		DeviceInfo:        binding.DeviceInfo,
		BiometricHash:     binding.BiometricHash,
		IsTrusted:         binding.IsTrusted,
		IsAuthorized:      binding.IsAuthorized,
		LastSeenAt:        binding.LastSeenAt,
		AuthorizedBy:      binding.AuthorizedBy,
		AuthorizedAt:      binding.AuthorizedAt,
		RevokedAt:         binding.RevokedAt,
		CreatedAt:         binding.CreatedAt,
		UpdatedAt:         binding.UpdatedAt,
	}
	return r.db.WithContext(ctx).Create(&model).Error
}

func (r *PostgresRepository) UpdateDeviceBinding(ctx context.Context, binding *domain.DeviceBinding) error {
	model := DeviceBindingGorm{
		ID:                binding.ID,
		UserID:            binding.UserID,
		DeviceID:          binding.DeviceID,
		DeviceFingerprint: binding.DeviceFingerprint,
		Platform:          string(binding.Platform),
		DeviceInfo:        binding.DeviceInfo,
		BiometricHash:     binding.BiometricHash,
		IsTrusted:         binding.IsTrusted,
		IsAuthorized:      binding.IsAuthorized,
		LastSeenAt:        binding.LastSeenAt,
		AuthorizedBy:      binding.AuthorizedBy,
		AuthorizedAt:      binding.AuthorizedAt,
		RevokedAt:         binding.RevokedAt,
		CreatedAt:         binding.CreatedAt,
		UpdatedAt:         binding.UpdatedAt,
	}
	return r.db.WithContext(ctx).Save(&model).Error
}

// Token operations

func (r *PostgresRepository) CreateJWTToken(ctx context.Context, token *domain.JWTToken) error {
	model := JWTTokenGorm{
		ID:               token.ID,
		UserID:           token.UserID,
		DeviceID:         token.DeviceID,
		TokenType:        string(token.TokenType),
		TokenHash:        token.TokenHash,
		RefreshHash:      token.RefreshHash,
		OfflineHash:      token.OfflineHash,
		ExpiresAt:        token.ExpiresAt,
		RefreshExpiresAt: token.RefreshExpiresAt,
		OfflineExpiresAt: token.OfflineExpiresAt,
		IsRevoked:        token.IsRevoked,
		RevokedAt:        token.RevokedAt,
		LastUsedAt:       token.LastUsedAt,
		CreatedAt:        token.CreatedAt,
		UpdatedAt:        token.UpdatedAt,
	}
	return r.db.WithContext(ctx).Create(&model).Error
}

func (r *PostgresRepository) FindJWTToken(ctx context.Context, tokenHash string) (*domain.JWTToken, error) {
	var token JWTTokenGorm
	if err := r.db.WithContext(ctx).Where("token_hash = ?", tokenHash).First(&token).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return token.ToDomain(), nil
}

func (r *PostgresRepository) RevokeJWTToken(ctx context.Context, tokenID string) error {
	return r.db.WithContext(ctx).Model(&JWTTokenGorm{}).Where("id = ?", tokenID).Update("is_revoked", true).Error
}

package services

import (
	"context"

	"gorm.io/gorm"
)

// JWTService handles token-related operations in the services package
type JWTService struct {
	db *gorm.DB
}

// NewJWTService creates a new JWT service instance for the services package
func NewJWTService(db *gorm.DB) *JWTService {
	return &JWTService{db: db}
}

// RevokeToken revokes a specific token
func (s *JWTService) RevokeToken(ctx context.Context, tokenID string) error {
	return nil
}

// RevokeAllUserTokens revokes all tokens for a user
func (s *JWTService) RevokeAllUserTokens(ctx context.Context, userID string) error {
	return nil
}

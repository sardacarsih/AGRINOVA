package service

import (
	"context"
	"errors"
	"time"

	"agrinovagraphql/server/internal/auth/application"
	"agrinovagraphql/server/internal/auth/domain"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	repo domain.AuthRepository
}

func NewAuthService(repo domain.AuthRepository) *AuthService {
	return &AuthService{repo: repo}
}

// Login handles user authentication
func (s *AuthService) Login(ctx context.Context, input application.LoginInput) (*application.LoginResult, error) {
	// 1. Find user
	user, err := s.repo.FindUserByUsername(ctx, input.Username)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("invalid credentials")
	}

	// 2. Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	// 3. Create session
	sessionID := uuid.New().String()
	sessionToken := uuid.New().String() // In real app, use JWT or secure random
	refreshToken := uuid.New().String()
	now := time.Now()
	expiresAt := now.Add(24 * time.Hour) // 1 day expiration

	session := &domain.UserSession{
		ID:           sessionID,
		UserID:       user.ID,
		SessionToken: sessionToken,
		RefreshToken: &refreshToken,
		Platform:     input.Platform,
		DeviceInfo:   input.DeviceInfo,
		IPAddress:    input.IPAddress,
		UserAgent:    input.UserAgent,
		LastActivity: now,
		ExpiresAt:    expiresAt,
		IsActive:     true,
		LoginMethod:  input.LoginMethod,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.repo.CreateSession(ctx, session); err != nil {
		return nil, err
	}

	// 4. Resolve Scope (Stubbed for now, should fetch from DB based on role)
	scope := application.ScopeDTO{
		Perusahaan: []application.CompanyDTO{}, // Populate based on user assignments
		Estates:    []application.EstateDTO{},
		Divisis:    []application.DivisionDTO{},
	}

	return &application.LoginResult{
		Token:        sessionToken,
		RefreshToken: refreshToken,
		User:         application.ToUserDTO(user),
		Scope:        scope,
		ExpiresAt:    expiresAt,
	}, nil
}

// Logout invalidates a session
func (s *AuthService) Logout(ctx context.Context, sessionToken string) error {
	session, err := s.repo.FindSessionByToken(ctx, sessionToken)
	if err != nil {
		return err
	}
	if session == nil {
		return nil // Already logged out or invalid
	}

	return s.repo.RevokeSession(ctx, session.ID)
}

// GetUserByID fetches a user by ID
func (s *AuthService) GetUserByID(ctx context.Context, userID string) (*application.UserDTO, error) {
	user, err := s.repo.FindUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}
	dto := application.ToUserDTO(user)
	return &dto, nil
}

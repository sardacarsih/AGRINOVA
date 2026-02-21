package web

import (
	"context"
	"time"

	"agrinovagraphql/server/internal/auth/features/shared/domain"
)

// WebAuthService defines the interface for web-specific authentication operations
type WebAuthService interface {
	// Login handles web authentication with cookies
	Login(ctx context.Context, input WebLoginInput) (*WebLoginResult, error)

	// Logout handles web logout by clearing cookies
	Logout(ctx context.Context, sessionID string) error

	// ValidateSession validates active web session
	ValidateSession(ctx context.Context, sessionToken string) (*domain.UserSession, error)

	// RefreshSession refreshes an existing web session
	RefreshSession(ctx context.Context, refreshToken string) (*WebLoginResult, error)

	// GetMe validates session and returns current user context
	GetMe(ctx context.Context, sessionID string) (*WebLoginResult, error)
}

// WebLoginInput represents web login request
type WebLoginInput struct {
	Identifier string // username or email
	Password   string
	IPAddress  string
	UserAgent  string
	RememberMe bool
}

// WebLoginResult represents successful web login response
type WebLoginResult struct {
	SessionID   string                 `json:"sessionId"`
	User        domain.UserDTO         `json:"user"`
	Companies   []domain.CompanyDTO    `json:"companies"`
	Assignments []domain.AssignmentDTO `json:"assignments"`
	ExpiresAt   time.Time              `json:"expiresAt"`
}

// CookieService defines interface for web cookie management
type CookieService interface {
	// SetAuthCookies sets authentication cookies
	SetAuthCookies(ctx context.Context, sessionID, csrfToken string) error

	// ClearAuthCookies removes all auth cookies
	ClearAuthCookies(ctx context.Context) error

	// ValidateCSRF validates CSRF token
	ValidateCSRF(ctx context.Context, token string) error

	// GenerateCSRFToken generates new CSRF token
	GenerateCSRFToken() (string, error)
}

// RateLimiter defines interface for rate limiting
type RateLimiter interface {
	Allow(key string) (bool, time.Duration)
}

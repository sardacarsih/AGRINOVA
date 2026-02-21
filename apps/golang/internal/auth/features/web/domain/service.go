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

	// CreateQRLoginSession creates a short-lived QR session for web login.
	CreateQRLoginSession(ctx context.Context, input CreateQRLoginSessionInput) (*QRLoginSession, error)

	// GetQRLoginStatus returns current QR login status for polling.
	GetQRLoginStatus(ctx context.Context, input GetQRLoginStatusInput) (*QRLoginSession, error)

	// ApproveQRLogin approves a pending QR login session from an authenticated device.
	ApproveQRLogin(ctx context.Context, input ApproveQRLoginInput) (*QRLoginSession, error)

	// ConsumeQRLogin consumes an approved QR session and creates a cookie-based web session.
	ConsumeQRLogin(ctx context.Context, input ConsumeQRLoginInput) (*WebLoginResult, error)
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

type QRLoginStatus string

const (
	QRLoginStatusPending  QRLoginStatus = "PENDING"
	QRLoginStatusApproved QRLoginStatus = "APPROVED"
	QRLoginStatusExpired  QRLoginStatus = "EXPIRED"
	QRLoginStatusConsumed QRLoginStatus = "CONSUMED"
)

type CreateQRLoginSessionInput struct {
	IPAddress string
	UserAgent string
}

type GetQRLoginStatusInput struct {
	SessionID string
	Challenge string
}

type ApproveQRLoginInput struct {
	SessionID string
	Challenge string
	UserID    string
}

type ConsumeQRLoginInput struct {
	SessionID string
	Challenge string
	IPAddress string
	UserAgent string
}

type QRLoginSession struct {
	SessionID  string        `json:"sessionId"`
	Challenge  string        `json:"challenge"`
	QRData     string        `json:"qrData"`
	Status     QRLoginStatus `json:"status"`
	ExpiresAt  time.Time     `json:"expiresAt"`
	Message    string        `json:"message"`
	ApprovedBy *domain.UserDTO
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

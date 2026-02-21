package infrastructure

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"net/http"
	"time"
)

// CookieService implements domain.CookieService for web cookie management
type CookieService struct {
	config CookieConfig
}

// NewCookieService creates new cookie service
func NewCookieService(config CookieConfig) *CookieService {
	return &CookieService{config: config}
}

// SetAuthCookies sets authentication cookies
func (s *CookieService) SetAuthCookies(ctx context.Context, sessionID, csrfToken string) error {
	// Get HTTP response writer from context
	httpCtx := ctx.Value("http")
	if httpCtx == nil {
		return errors.New("HTTP context not found")
	}

	httpContext, ok := httpCtx.(map[string]interface{})
	if !ok {
		return errors.New("invalid HTTP context")
	}

	responseWriter, ok := httpContext["response_writer"].(http.ResponseWriter)
	if !ok {
		return errors.New("response writer not found in context")
	}

	// Set session cookie
	sessionCookie := &http.Cookie{
		Name:     s.config.SessionCookieName,
		Value:    sessionID,
		Path:     "/",
		MaxAge:   int(s.config.SessionDuration.Seconds()),
		Secure:   s.config.SecureCookies,
		HttpOnly: true,
		SameSite: s.getSameSitePolicy(),
		Domain:   s.config.Domain,
	}

	http.SetCookie(responseWriter, sessionCookie)

	// Set CSRF cookie
	csrfCookie := &http.Cookie{
		Name:     s.config.CSRFCookieName,
		Value:    csrfToken,
		Path:     "/",
		MaxAge:   int(s.config.CSRFTokenDuration.Seconds()),
		Secure:   s.config.SecureCookies,
		HttpOnly: false, // JavaScript needs to read this
		SameSite: s.getSameSitePolicy(),
		Domain:   s.config.Domain,
	}

	http.SetCookie(responseWriter, csrfCookie)

	return nil
}

// ClearAuthCookies removes all auth cookies
func (s *CookieService) ClearAuthCookies(ctx context.Context) error {
	httpCtx := ctx.Value("http")
	if httpCtx == nil {
		return errors.New("HTTP context not found")
	}

	httpContext, ok := httpCtx.(map[string]interface{})
	if !ok {
		return errors.New("invalid HTTP context")
	}

	responseWriter, ok := httpContext["response_writer"].(http.ResponseWriter)
	if !ok {
		return errors.New("response writer not found in context")
	}

	// Clear session cookie
	sessionCookie := &http.Cookie{
		Name:     s.config.SessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Secure:   s.config.SecureCookies,
		HttpOnly: true,
		SameSite: s.getSameSitePolicy(),
		Domain:   s.config.Domain,
	}

	http.SetCookie(responseWriter, sessionCookie)

	// Clear CSRF cookie
	csrfCookie := &http.Cookie{
		Name:     s.config.CSRFCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Secure:   s.config.SecureCookies,
		HttpOnly: false,
		SameSite: s.getSameSitePolicy(),
		Domain:   s.config.Domain,
	}

	http.SetCookie(responseWriter, csrfCookie)

	return nil
}

// ValidateCSRF validates CSRF token
func (s *CookieService) ValidateCSRF(ctx context.Context, token string) error {
	if token == "" {
		return errors.New("CSRF token is required")
	}

	// Get CSRF token from cookies
	httpCtx := ctx.Value("http")
	if httpCtx == nil {
		return errors.New("HTTP context not found")
	}

	httpContext, ok := httpCtx.(map[string]interface{})
	if !ok {
		return errors.New("invalid HTTP context")
	}

	request, ok := httpContext["request"].(*http.Request)
	if !ok {
		return errors.New("HTTP request not found in context")
	}

	cookie, err := request.Cookie(s.config.CSRFCookieName)
	if err != nil {
		return errors.New("CSRF cookie not found")
	}

	if cookie.Value != token {
		return errors.New("CSRF token mismatch")
	}

	return nil
}

// GenerateCSRFToken generates new CSRF token
func (s *CookieService) GenerateCSRFToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	return base64.URLEncoding.EncodeToString(bytes), nil
}

// Helper methods

func (s *CookieService) getSameSitePolicy() http.SameSite {
	switch s.config.SameSitePolicy {
	case "strict":
		return http.SameSiteStrictMode
	case "lax":
		return http.SameSiteLaxMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}

// CookieConfig holds cookie configuration
type CookieConfig struct {
	SessionCookieName   string
	CSRFCookieName      string
	Domain              string
	SecureCookies       bool
	SameSitePolicy      string
	SessionDuration     time.Duration
	CSRFTokenDuration   time.Duration
	CSRFSecret          []byte
}
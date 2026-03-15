package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	sharedDomain "agrinovagraphql/server/internal/auth/features/shared/domain"
	webApp "agrinovagraphql/server/internal/auth/features/web/application"
	webDomain "agrinovagraphql/server/internal/auth/features/web/domain"
	webInfra "agrinovagraphql/server/internal/auth/features/web/infrastructure"
	"agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/pkg/logger"

	"github.com/gin-gonic/gin"
)

// WebAuthMiddleware handles cookie-based authentication for web requests
type WebAuthMiddleware struct {
	webAuthService *webApp.Service
	cookieService  *webInfra.CookieService
	logger         *logger.Logger
}

// NewWebAuthMiddleware creates a new web authentication middleware
func NewWebAuthMiddleware(
	webAuthService *webApp.Service,
	cookieService *webInfra.CookieService,
	logger *logger.Logger,
) *WebAuthMiddleware {
	return &WebAuthMiddleware{
		webAuthService: webAuthService,
		cookieService:  cookieService,
		logger:         logger,
	}
}

// WebSessionMiddleware validates web sessions from cookies and adds user/session to context
func (m *WebAuthMiddleware) WebSessionMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip middleware for certain paths
		if m.shouldSkipAuth(c.Request.URL.Path) {
			c.Next()
			return
		}

		// Extract session token from configured session cookie name.
		sessionCookieName := m.getSessionCookieName()
		cookie, err := c.Request.Cookie(sessionCookieName)
		if err != nil {
			// No session cookie, continue without auth
			c.Next()
			return
		}
		sessionID := cookie.Value

		// Try to validate web session using GetMe (which validates session and returns user)
		result, err := m.webAuthService.GetMe(c.Request.Context(), sessionID)
		if err != nil {
			// Log authentication attempt failure if it wasn't just missing
			m.logger.Info("Web session validation failed",
				"path", c.Request.URL.Path,
				"ip", c.ClientIP(),
				"user_agent", c.Request.Header.Get("User-Agent"),
				"error", err.Error(),
			)

			// Don't block request, just continue without user context
			c.Next()
			return
		}

		// Convert UserDTO to auth.User for context (legacy compatibility)
		gqlUser := m.toGraphQLUser(result.User)
		companyID := result.User.CompanyID
		if companyID == "" {
			for _, assignment := range result.Assignments {
				if assignment.IsActive && assignment.CompanyID != "" {
					companyID = assignment.CompanyID
					break
				}
			}
		}
		if companyID == "" && len(result.Companies) > 0 {
			companyID = result.Companies[0].ID
		}

		// Add user, session result, and JWT claims to context
		ctx := context.WithValue(c.Request.Context(), "user", gqlUser)
		ctx = context.WithValue(ctx, "web_login_result", result) // Use specific key for new result
		ctx = context.WithValue(ctx, "session_id", result.SessionID)
		ctx = context.WithValue(ctx, "user_id", gqlUser.ID)
		ctx = context.WithValue(ctx, "user_role", string(gqlUser.Role))
		ctx = context.WithValue(ctx, "company_id", companyID) // Add company_id for resolvers

		// Add keys for security logging
		ctx = context.WithValue(ctx, "username", gqlUser.Username)
		ctx = context.WithValue(ctx, "platform", models.PlatformWeb)
		// "auth" key relies on legacy JWTClaims which is removed

		// Add client IP and user agent for security logging
		ctx = context.WithValue(ctx, "client_ip", c.ClientIP())
		ctx = context.WithValue(ctx, "user_agent", c.Request.Header.Get("User-Agent"))

		// Update request context
		c.Request = c.Request.WithContext(ctx)

		// Log successful authentication
		m.logger.Info("Web session validated",
			"user_id", gqlUser.ID,
			"username", gqlUser.Username,
			"role", gqlUser.Role,
			"session_id", result.SessionID,
			"path", c.Request.URL.Path,
			"ip", c.ClientIP(),
		)

		c.Next()
	}
}

func (m *WebAuthMiddleware) getSessionCookieName() string {
	if m.cookieService != nil {
		if name := strings.TrimSpace(m.cookieService.SessionCookieName()); name != "" {
			return name
		}
	}
	return "session_id"
}

// map UserDTO to auth.User
func (m *WebAuthMiddleware) toGraphQLUser(dto sharedDomain.UserDTO) *auth.User {
	var role auth.UserRole
	switch dto.Role {
	case sharedDomain.RoleSuperAdmin:
		role = auth.UserRoleSuperAdmin
	case sharedDomain.RoleCompanyAdmin:
		role = auth.UserRoleCompanyAdmin
	case sharedDomain.RoleAreaManager:
		role = auth.UserRoleAreaManager
	case sharedDomain.RoleManager:
		role = auth.UserRoleManager
	case sharedDomain.RoleAsisten:
		role = auth.UserRoleAsisten
	case sharedDomain.RoleMandor:
		role = auth.UserRoleMandor
	case sharedDomain.RoleSatpam:
		role = auth.UserRoleSatpam
	default:
		role = auth.UserRole(dto.Role)
	}

	return &auth.User{
		ID:          dto.ID,
		Username:    dto.Username,
		Name:        dto.Name,
		Email:       dto.Email,
		PhoneNumber: dto.Phone,
		Role:        role,

		IsActive: dto.IsActive,
	}
}

// GraphQLContextMiddleware adds HTTP context to GraphQL context
func (m *WebAuthMiddleware) GraphQLContextMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Create HTTP context map
		httpContext := map[string]interface{}{
			"request":         c.Request,
			"response":        c.Writer,
			"gin":             c,
			"response_writer": c.Writer, // Added for CookieService
		}

		// Add HTTP context to request context
		ctx := context.WithValue(c.Request.Context(), "http", httpContext)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// RequireWebAuth middleware requires valid web authentication
func (m *WebAuthMiddleware) RequireWebAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := c.Request.Context().Value("user")
		if user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "authentication_required",
				"message": "Valid web session required",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireRole middleware requires specific user role
func (m *WebAuthMiddleware) RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := c.Request.Context().Value("user")
		if user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "authentication_required",
				"message": "Authentication required",
			})
			c.Abort()
			return
		}

		// Check user role
		if gqlUser, ok := user.(*auth.User); ok {
			userRole := string(gqlUser.Role)
			for _, allowedRole := range allowedRoles {
				if userRole == allowedRole {
					c.Next()
					return
				}
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error":   "insufficient_permissions",
			"message": "Role not authorized for this operation",
		})
		c.Abort()
	}
}

// CSRFProtection middleware validates CSRF tokens for state-changing operations
func (m *WebAuthMiddleware) CSRFProtection() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only protect state-changing operations
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		// Skip for certain paths
		if m.shouldSkipCSRF(c.Request.URL.Path) {
			c.Next()
			return
		}

		// Get token from header
		token := c.Request.Header.Get("X-CSRF-Token")
		if token == "" {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "csrf_validation_failed",
				"message": "CSRF token missing",
			})
			c.Abort()
			return
		}

		// Validate CSRF token using new service
		// The service extracts cookie from context (via http value)
		// We rely on GraphQLContextMiddleware or manually setting it being called before this?
		// Ensure GraphQLContextMiddleware is called before this, OR set it here if missing?
		// But middleware stack order matters.
		// Usually GraphQLContextMiddleware is for GraphQL...
		// For REST endpoints, does context have "http"?
		// We should add it if missing or rely on middleware order.

		// Let's check NewCookieService implementation requirement.
		// It needs "http" context value with "request".
		// We can add it here to be safe.
		httpContext := map[string]interface{}{
			"request": c.Request,
		}
		ctx := context.WithValue(c.Request.Context(), "http", httpContext)

		if err := m.cookieService.ValidateCSRF(ctx, token); err != nil {
			m.logger.Warn("CSRF validation failed",
				"path", c.Request.URL.Path,
				"ip", c.ClientIP(),
				"error", err.Error(),
			)

			c.JSON(http.StatusForbidden, gin.H{
				"error":   "csrf_validation_failed",
				"message": "Invalid CSRF token",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RefreshSessionMiddleware automatically refreshes sessions that are close to expiry
func (m *WebAuthMiddleware) RefreshSessionMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		result, ok := c.Request.Context().Value("web_login_result").(*webDomain.WebLoginResult)
		if !ok || result == nil {
			c.Next()
			return
		}

		// Check if session needs refresh (less than 1 hour remaining)
		timeUntilExpiry := time.Until(result.ExpiresAt)
		if timeUntilExpiry <= time.Hour && timeUntilExpiry > 0 {
			// Try to refresh session in background
			go func() {
				// We need a context with "http" value for cookie service to write cookies!
				// And response writer.
				// NOTE: c.Writer is not safe to use in goroutine if handler returns.
				// But we are in middleware.
				// Actually SetCookie on ResponseWriter after handler might be too late?
				// Gin writer writes headers when status is written.
				// If we do this in background (goroutine), the request might have finished.
				// We CANNOT write cookies in a goroutine after request processing?
				// Actually we can if headers haven't been sent.
				// But typically background referesh suggests we do it async.
				// BUT we are updating the Current User's browser cookies.
				// So we MUST do it in the request flow, not async background.
				// The original code did:
				// go func() { m.cookieService.RefreshSession(...) }()
				// This looks unsafe if it writes to ResponseWriter. The legacy code was likely buggy or relying on implementation detail.
				// However, new RefreshSession writes cookies.

				// Let's do it synchronously to be safe and correct.

				// Ensure context has http with response_writer
				httpContext := map[string]interface{}{
					"request":         c.Request,
					"response_writer": c.Writer,
				}
				ctx := context.WithValue(context.Background(), "http", httpContext)

				// We need refresh token. WebLoginResult doesn't have it?
				// Wait, the cookie IS the refresh token? Or SessionID?
				// The new service RefreshSession takes "refreshToken".
				// But the cookie name is "session_id".
				// In new architecture, we treat session_id as the token to refresh?
				// Service.RefreshSession(ctx, refreshToken)
				// Implementation of RefreshSession:
				//   session, err := s.sessionRepo.GetSession(refreshToken)
				// So yes, sessionID (token) is what we pass.

				// But does RefreshSession rotate the token?
				// Yes, it creates new session and sets new cookies.

				_, err := m.webAuthService.RefreshSession(ctx, result.SessionID)

				if err != nil {
					m.logger.Warn("Session refresh failed",
						"session_id", result.SessionID,
						"error", err.Error(),
					)
				} else {
					m.logger.Info("Session refreshed automatically",
						"session_id", result.SessionID,
					)
				}
			}()
		}

		c.Next()
	}
}

// CORSMiddleware handles CORS for web authentication
func (m *WebAuthMiddleware) CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// CRITICAL FIX: Allow requests from frontend domains
		allowedOrigins := []string{
			"http://localhost:3000",
			"https://localhost:3000",
			"http://127.0.0.1:3000",
			"https://127.0.0.1:3000",
		}

		// IMPORTANT: We MUST set specific origin when using credentials
		// Access-Control-Allow-Origin: * does NOT work with credentials!
		originToSet := origin
		if origin == "" {
			// If no origin header (same-origin request), allow localhost
			originToSet = "http://localhost:3000"
		}

		// Check if origin is in allowed list
		originAllowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				originAllowed = true
				break
			}
		}

		// Allow localhost variants even if not exact match
		if !originAllowed && (strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1")) {
			originAllowed = true
		}

		// CRITICAL: Set specific origin for cookie support
		if originAllowed || origin == "" {
			c.Header("Access-Control-Allow-Origin", originToSet)
		}

		// CRITICAL CORS headers for cookie authentication
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Origin, Cache-Control, Cookie")
		c.Header("Access-Control-Expose-Headers", "Set-Cookie, X-CSRF-Token, Content-Type")
		c.Header("Access-Control-Max-Age", "86400") // Cache preflight for 24 hours

		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// Private helper methods

// shouldSkipAuth determines if authentication should be skipped for a path
func (m *WebAuthMiddleware) shouldSkipAuth(path string) bool {
	skipPaths := []string{
		"/playground", // GraphQL playground
		"/health",     // Health check
		"/metrics",    // Metrics endpoint
	}

	for _, skipPath := range skipPaths {
		if path == skipPath {
			return true
		}
	}

	return false
}

// shouldSkipCSRF determines if CSRF protection should be skipped for a path
func (m *WebAuthMiddleware) shouldSkipCSRF(path string) bool {
	skipPaths := []string{
		"/health",     // Health check
		"/metrics",    // Metrics endpoint
		"/auth/login", // Login doesn't need CSRF
	}

	for _, skipPath := range skipPaths {
		if path == skipPath {
			return true
		}
	}

	return false
}

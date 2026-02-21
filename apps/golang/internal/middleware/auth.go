package middleware

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	mobileDomain "agrinovagraphql/server/internal/auth/features/mobile/domain"
	"agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/internal/auth/services"
	"agrinovagraphql/server/internal/graphql/domain/auth"
	rbacServices "agrinovagraphql/server/internal/rbac/services"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// AuthMiddleware provides JWT token validation and user context
type AuthMiddleware struct {
	tokenService         mobileDomain.TokenService
	roleHierarchyService *services.RoleHierarchyService
	rbacService          *rbacServices.RBACService
}

// NewAuthMiddleware creates a new auth middleware
func NewAuthMiddleware(tokenService mobileDomain.TokenService, roleHierarchyService *services.RoleHierarchyService, rbacService *rbacServices.RBACService) *AuthMiddleware {
	return &AuthMiddleware{
		tokenService:         tokenService,
		roleHierarchyService: roleHierarchyService,
		rbacService:          rbacService,
	}
}

// GraphQLAuth middleware for GraphQL endpoint authentication
func (m *AuthMiddleware) GraphQLAuth() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Extract JWT token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			token := strings.TrimPrefix(authHeader, "Bearer ")

			// Debug: Log token preview
			tokenPreview := token
			if len(token) > 30 {
				tokenPreview = token[:30] + "..."
			}
			fmt.Printf("🔐 [AuthMiddleware] Received token: %s\n", tokenPreview)

			// Validate token
			claims, err := m.tokenService.ValidateAccessToken(c.Request.Context(), token)
			if err != nil {
				// Token invalid, but continue for public queries
				// GraphQL resolvers will handle authorization
				fmt.Printf("❌ [AuthMiddleware] Token validation FAILED: %v\n", err)
				// Store expiry reason so the auth directive can emit ACCESS_EXPIRED
				reqCtx := c.Request.Context()
				if errors.Is(err, jwt.ErrTokenExpired) ||
					strings.Contains(err.Error(), "expired") {
					reqCtx = context.WithValue(reqCtx, "auth_error_code", "ACCESS_EXPIRED")
				}
				c.Request = c.Request.WithContext(reqCtx)
				c.Next()
				return
			}

			// Debug: Log successful validation
			fmt.Printf("✅ [AuthMiddleware] Token validated for user: %s (role: %s)\n", claims.UserID, claims.Role)

			// Add authenticated user context
			ctx := context.WithValue(c.Request.Context(), "auth_token", token)
			ctx = context.WithValue(ctx, "user_id", claims.UserID)
			// Convert sharedDomain.Role to auth.UserRole if they are compatible or string
			ctx = context.WithValue(ctx, "user_role", auth.UserRole(claims.Role))
			ctx = context.WithValue(ctx, "company_id", claims.CompanyID)
			ctx = context.WithValue(ctx, "device_id", claims.DeviceID)
			// Platform is not in claims directly anymore? Or is it part of device binding?
			// Claims has Scope but not Platform. Platform is usually inferred from Device or passed in Login.
			// Legacy used claims.Platform.
			// Let's assume for now we don't have platform in claims, or use a default/empty.
			// Or better, check if claims.Metadata has it.
			// For now, omit Platform or set to empty string if not critical.
			ctx = context.WithValue(ctx, "platform", models.PlatformType(""))
			ctx = context.WithValue(ctx, "permissions", claims.Scope)
			c.Request = c.Request.WithContext(ctx)
		}

		c.Next()
	})
}

// RequireAuth middleware that requires valid authentication
func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Extract JWT token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")

		// Validate token
		claims, err := m.tokenService.ValidateAccessToken(c.Request.Context(), token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Add authenticated user context
		ctx := context.WithValue(c.Request.Context(), "auth_token", token)
		ctx = context.WithValue(ctx, "user_id", claims.UserID)
		ctx = context.WithValue(ctx, "user_role", auth.UserRole(claims.Role))
		ctx = context.WithValue(ctx, "company_id", claims.CompanyID)
		ctx = context.WithValue(ctx, "device_id", claims.DeviceID)
		ctx = context.WithValue(ctx, "platform", models.PlatformType(""))
		ctx = context.WithValue(ctx, "permissions", claims.Scope)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	})
}

// RequireRole middleware that requires specific user role
func (m *AuthMiddleware) RequireRole(roles ...auth.UserRole) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// First ensure user is authenticated
		userRole := c.Request.Context().Value("user_role")
		if userRole == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		currentRole := userRole.(auth.UserRole)

		// Check if user has required role (exact match)
		for _, requiredRole := range roles {
			if currentRole == requiredRole {
				c.Next()
				return
			}
		}

		// Check hierarchical access - if user has higher level role, they can access lower level requirements
		for _, requiredRole := range roles {
			if m.roleHierarchyService.CanAccess(currentRole, requiredRole) {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient role permissions"})
		c.Abort()
	})
}

// RequirePermission middleware that checks for specific permissions
func (m *AuthMiddleware) RequirePermission(permission string) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// First ensure user is authenticated
		permissions := c.Request.Context().Value("permissions")
		if permissions == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		// Check if user has required permission
		userPermissions := permissions.([]string)

		// Check for wildcard permission (super admin)
		for _, perm := range userPermissions {
			if perm == "*" || perm == permission {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": fmt.Sprintf("Permission '%s' required", permission)})
		c.Abort()
	})
}

// CORS middleware
func CORS() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})
}

// RequestLogger middleware
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}

// Helper functions for GraphQL resolvers

// GetUserFromContext extracts user ID from context
func GetUserFromContext(ctx context.Context) string {
	if userID := ctx.Value("user_id"); userID != nil {
		return userID.(string)
	}
	return ""
}

// GetCurrentUserID extracts current user ID from context (RBAC naming convention)
// This function is an alias for GetUserFromContext for RBAC consistency
func GetCurrentUserID(ctx context.Context) string {
	return GetUserFromContext(ctx)
}

// GetUserRoleFromContext extracts user role from context
// Handles both auth.UserRole and string types (web auth uses string, mobile uses auth.UserRole)
func GetUserRoleFromContext(ctx context.Context) auth.UserRole {
	if role := ctx.Value("user_role"); role != nil {
		// Handle auth.UserRole type (from mobile auth)
		if r, ok := role.(auth.UserRole); ok {
			return r
		}
		// Handle string type (from web auth)
		if r, ok := role.(string); ok {
			return auth.UserRole(r)
		}
	}
	return ""
}

// GetCompanyFromContext extracts company ID from context
func GetCompanyFromContext(ctx context.Context) string {
	if companyID := ctx.Value("company_id"); companyID != nil {
		return companyID.(string)
	}
	return ""
}

// GetPermissionsFromContext extracts permissions from context
func GetPermissionsFromContext(ctx context.Context) []string {
	if permissions := ctx.Value("permissions"); permissions != nil {
		return permissions.([]string)
	}
	return []string{}
}

// HasPermission checks if user has specific permission
func HasPermission(ctx context.Context, permission string) bool {
	permissions := GetPermissionsFromContext(ctx)
	for _, perm := range permissions {
		if perm == "*" || perm == permission {
			return true
		}
	}
	return false
}

// IsAuthenticated checks if user is authenticated
func IsAuthenticated(ctx context.Context) bool {
	return GetUserFromContext(ctx) != ""
}

// RequireAuthentication throws error if user is not authenticated
func RequireAuthentication(ctx context.Context) error {
	if !IsAuthenticated(ctx) {
		return fmt.Errorf("authentication required")
	}
	return nil
}

// RequireRoleAccess throws error if user doesn't have required role (with hierarchy support)
func RequireRoleAccess(ctx context.Context, roles ...auth.UserRole) error {
	return RequireRoleAccessWithHierarchy(ctx, nil, roles...)
}

// RequireRoleAccessWithHierarchy throws error if user doesn't have required role using role hierarchy service
func RequireRoleAccessWithHierarchy(ctx context.Context, roleHierarchyService *services.RoleHierarchyService, roles ...auth.UserRole) error {
	if err := RequireAuthentication(ctx); err != nil {
		return err
	}

	currentRole := GetUserRoleFromContext(ctx)

	// Exact role match
	for _, role := range roles {
		if currentRole == role {
			return nil
		}
	}

	// If role hierarchy service is provided, check hierarchical access
	if roleHierarchyService != nil {
		for _, role := range roles {
			if roleHierarchyService.CanAccess(currentRole, role) {
				return nil
			}
		}
	} else {
		// Fallback: Super admin has access to everything
		if currentRole == auth.UserRoleSuperAdmin {
			return nil
		}
	}

	return fmt.Errorf("insufficient role permissions")
}

// RequirePermissionAccess throws error if user doesn't have required permission
func RequirePermissionAccess(ctx context.Context, permission string) error {
	if err := RequireAuthentication(ctx); err != nil {
		return err
	}

	if !HasPermission(ctx, permission) {
		return fmt.Errorf("permission '%s' required", permission)
	}

	return nil
}

// =============================================================================
// Enhanced Role-Based Access Control Helpers
// =============================================================================

// ValidateTokenWithDevice performs comprehensive JWT token validation with device binding
func (m *AuthMiddleware) ValidateTokenWithDevice(ctx context.Context, token, deviceID, fingerprint string) (*mobileDomain.TokenClaims, error) {
	// First validate the token itself
	claims, err := m.tokenService.ValidateAccessToken(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("token validation failed: %w", err)
	}

	// If device information is provided, validate device binding
	if deviceID != "" && fingerprint != "" {
		if claims.DeviceID != deviceID {
			// Note: Fingerprint check might need to be done via device repo if not in claims
			// Current TokenClaims doesn't have Fingerprint.
			// Legacy JWTClaims might have had it.
			// For now, checks deviceID only or rely on strict binding in token generation.
			return nil, fmt.Errorf("device binding validation failed")
		}
	}

	return claims, nil
}

// RequireSpecificRoleOnly middleware that requires exact role match (no hierarchy)
func (m *AuthMiddleware) RequireSpecificRoleOnly(roles ...auth.UserRole) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		userRole := c.Request.Context().Value("user_role")
		if userRole == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		currentRole := userRole.(auth.UserRole)

		// Check for exact role match only (no hierarchy)
		for _, requiredRole := range roles {
			if currentRole == requiredRole {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Specific role required"})
		c.Abort()
	})
}

// RequireCompanyAccess middleware that validates user belongs to specific company
func (m *AuthMiddleware) RequireCompanyAccess(companyID string) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		if err := RequireAuthentication(c.Request.Context()); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		userCompanyID := GetCompanyFromContext(c.Request.Context())
		userRole := GetUserRoleFromContext(c.Request.Context())

		// Super admin has access to all companies
		if userRole == auth.UserRoleSuperAdmin {
			c.Next()
			return
		}

		// Area managers have access to multiple companies based on assignments
		if userRole == auth.UserRoleAreaManager {
			// TODO: Check if company is in user's assignments
			c.Next()
			return
		}

		// Other roles must belong to the specific company
		if userCompanyID != companyID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Company access denied"})
			c.Abort()
			return
		}

		c.Next()
	})
}

// RoleBasedRateLimit applies different rate limits based on user role
func (m *AuthMiddleware) RoleBasedRateLimit() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		userRole := GetUserRoleFromContext(c.Request.Context())

		// Apply different rate limits based on role
		var rateLimit int
		switch userRole {
		case auth.UserRoleSuperAdmin:
			rateLimit = 1000 // High limit for admin
		case auth.UserRoleCompanyAdmin:
			rateLimit = 500
		case auth.UserRoleAreaManager:
			rateLimit = 300
		case auth.UserRoleManager:
			rateLimit = 200
		case auth.UserRoleAsisten, auth.UserRoleMandor:
			rateLimit = 100
		case auth.UserRoleSatpam:
			rateLimit = 150 // Higher for gate check operations
		default:
			rateLimit = 50 // Default conservative limit
		}

		// TODO: Implement actual rate limiting logic based on rateLimit
		// For now, just add to context for downstream use
		ctx := context.WithValue(c.Request.Context(), "rate_limit", rateLimit)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	})
}

// =============================================================================
// Enhanced Context Helper Functions
// =============================================================================

// GetTokenFromContext extracts JWT token from context
func GetTokenFromContext(ctx context.Context) string {
	if token := ctx.Value("auth_token"); token != nil {
		return token.(string)
	}
	return ""
}

// GetDeviceFromContext extracts device ID from context
func GetDeviceFromContext(ctx context.Context) string {
	if deviceID := ctx.Value("device_id"); deviceID != nil {
		return deviceID.(string)
	}
	return ""
}

// GetPlatformFromContext extracts platform type from context
func GetPlatformFromContext(ctx context.Context) string {
	if platform := ctx.Value("platform"); platform != nil {
		return string(platform.(models.PlatformType))
	}
	return ""
}

// IsRoleInList checks if user role is in the provided list
func IsRoleInList(ctx context.Context, roles []auth.UserRole) bool {
	currentRole := GetUserRoleFromContext(ctx)
	for _, role := range roles {
		if currentRole == role {
			return true
		}
	}
	return false
}

// HasHigherRoleThan checks if user has higher hierarchical role than target
func HasHigherRoleThan(ctx context.Context, targetRole auth.UserRole) bool {
	currentRole := GetUserRoleFromContext(ctx)

	// Define role hierarchy (lower number = higher authority)
	roleHierarchy := map[auth.UserRole]int{
		auth.UserRoleSuperAdmin:   1,
		auth.UserRoleAreaManager:  2,
		auth.UserRoleCompanyAdmin: 3,
		auth.UserRoleManager:      4,
		auth.UserRoleAsisten:      5,
		auth.UserRoleMandor:       6,
		auth.UserRoleSatpam:       6, // Same level as Mandor
	}

	currentLevel, currentExists := roleHierarchy[currentRole]
	targetLevel, targetExists := roleHierarchy[targetRole]

	if !currentExists || !targetExists {
		return false
	}

	return currentLevel < targetLevel
}

// CanManageRole checks if user can manage (create/update/delete) target role
func CanManageRole(ctx context.Context, targetRole auth.UserRole) bool {
	currentRole := GetUserRoleFromContext(ctx)

	// Super admin can manage all roles
	if currentRole == auth.UserRoleSuperAdmin {
		return true
	}

	// Company admin can manage roles within their company (except other admins)
	if currentRole == auth.UserRoleCompanyAdmin {
		manageable := []auth.UserRole{
			auth.UserRoleManager,
			auth.UserRoleAsisten,
			auth.UserRoleMandor,
			auth.UserRoleSatpam,
		}
		return IsRoleInList(ctx, manageable)
	}

	// Area managers can view but not manage roles
	// Managers and below cannot manage other roles
	return false
}

// ValidateCompanyAccess checks if user has access to specific company
func ValidateCompanyAccess(ctx context.Context, companyID string) error {
	userRole := GetUserRoleFromContext(ctx)
	userCompanyID := GetCompanyFromContext(ctx)

	// Super admin has access to all companies
	if userRole == auth.UserRoleSuperAdmin {
		return nil
	}

	// Area managers have access to assigned companies (TODO: check assignments)
	if userRole == auth.UserRoleAreaManager {
		// This should check against user's company assignments
		return nil
	}

	// Other roles must belong to the specific company
	if userCompanyID != companyID {
		return fmt.Errorf("access denied to company %s", companyID)
	}

	return nil
}

// RequireCompanyAccessContext validates company access using context
func RequireCompanyAccessContext(ctx context.Context, companyID string) error {
	if err := RequireAuthentication(ctx); err != nil {
		return err
	}

	return ValidateCompanyAccess(ctx, companyID)
}

// =============================================================================
// Security Enhancement Functions
// =============================================================================

// LogSecurityEvent logs authentication and authorization events
func LogSecurityEvent(ctx context.Context, eventType string, details map[string]interface{}) {
	userID := GetUserFromContext(ctx)
	userRole := GetUserRoleFromContext(ctx)
	deviceID := GetDeviceFromContext(ctx)

	// TODO: Implement actual security event logging
	// This is a placeholder for security audit logging
	_ = map[string]interface{}{
		"user_id":    userID,
		"user_role":  userRole,
		"device_id":  deviceID,
		"event_type": eventType,
		"details":    details,
		"timestamp":  time.Now(),
	}
}

// ValidateRequestSecurity performs comprehensive request security validation
func ValidateRequestSecurity(ctx context.Context, requiredPermissions []string) error {
	// Basic authentication check
	if err := RequireAuthentication(ctx); err != nil {
		LogSecurityEvent(ctx, "authentication_failed", map[string]interface{}{
			"reason": "no_authentication",
		})
		return err
	}

	// Permission validation
	for _, permission := range requiredPermissions {
		if !HasPermission(ctx, permission) {
			LogSecurityEvent(ctx, "authorization_failed", map[string]interface{}{
				"permission": permission,
				"reason":     "insufficient_permissions",
			})
			return fmt.Errorf("permission '%s' required", permission)
		}
	}

	LogSecurityEvent(ctx, "access_granted", map[string]interface{}{
		"permissions": requiredPermissions,
	})

	return nil
}

// =============================================================================
// RBAC Enhancement Functions
// =============================================================================

// CheckRBACPermission performs comprehensive RBAC permission check
func (m *AuthMiddleware) CheckRBACPermission(ctx context.Context, permission string) error {
	if err := RequireAuthentication(ctx); err != nil {
		return err
	}

	userID := GetUserFromContext(ctx)
	userRole := GetUserRoleFromContext(ctx)

	// Use RBAC service for dynamic permission checking
	hasAccess := false
	if m.rbacService != nil {
		rbacAccess, err := m.rbacService.HasPermission(ctx, userID, permission)
		if err != nil {
			LogSecurityEvent(ctx, "rbac_check_error", map[string]interface{}{
				"permission": permission,
				"error":      err.Error(),
			})
			return fmt.Errorf("failed to check permission: %w", err)
		}
		hasAccess = rbacAccess
	}

	// Fallback 1: token scope permissions embedded in auth context.
	if !hasAccess && HasPermission(ctx, permission) {
		hasAccess = true
		LogSecurityEvent(ctx, "rbac_access_granted_fallback_scope", map[string]interface{}{
			"permission": permission,
			"user_id":    userID,
			"user_role":  userRole,
		})
	}

	// Fallback 2: static role hierarchy permissions.
	if !hasAccess && m.roleHierarchyService != nil && userRole != "" {
		if m.roleHierarchyService.HasPermission(userRole, permission) {
			hasAccess = true
			LogSecurityEvent(ctx, "rbac_access_granted_fallback_role", map[string]interface{}{
				"permission": permission,
				"user_id":    userID,
				"user_role":  userRole,
			})
		}
	}

	if !hasAccess {
		LogSecurityEvent(ctx, "rbac_access_denied", map[string]interface{}{
			"permission": permission,
			"user_id":    userID,
			"user_role":  userRole,
		})
		return fmt.Errorf("access denied: permission '%s' not granted", permission)
	}

	LogSecurityEvent(ctx, "rbac_access_granted", map[string]interface{}{
		"permission": permission,
	})

	return nil
}

// CheckRBACPermissionWithScope performs RBAC permission check with scope validation
func (m *AuthMiddleware) CheckRBACPermissionWithScope(ctx context.Context, permission string, scopeType string, scopeID *string) error {
	if err := RequireAuthentication(ctx); err != nil {
		return err
	}

	userID := GetUserFromContext(ctx)

	// Use RBAC service for scoped permission checking
	hasAccess := false
	if m.rbacService != nil {
		rbacAccess, err := m.rbacService.HasPermissionWithScope(ctx, userID, permission, scopeType, scopeID)
		if err != nil {
			LogSecurityEvent(ctx, "rbac_scope_check_error", map[string]interface{}{
				"permission": permission,
				"scope_type": scopeType,
				"scope_id":   scopeID,
				"error":      err.Error(),
			})
			return fmt.Errorf("failed to check scoped permission: %w", err)
		}
		hasAccess = rbacAccess
	}

	if !hasAccess {
		LogSecurityEvent(ctx, "rbac_scope_access_denied", map[string]interface{}{
			"permission": permission,
			"scope_type": scopeType,
			"scope_id":   scopeID,
		})
		return fmt.Errorf("access denied: permission '%s' not granted for scope %s:%s", permission, scopeType, func() string {
			if scopeID != nil {
				return *scopeID
			}
			return "nil"
		}())
	}

	LogSecurityEvent(ctx, "rbac_scope_access_granted", map[string]interface{}{
		"permission": permission,
		"scope_type": scopeType,
		"scope_id":   scopeID,
	})

	return nil
}

// ValidateCompanyAccess validates user access to a specific company using RBAC
func (m *AuthMiddleware) ValidateCompanyAccess(ctx context.Context, companyID string) error {
	return m.CheckRBACPermissionWithScope(ctx, "company:read", "company", &companyID)
}

// ValidateEstateAccess validates user access to a specific estate using RBAC
func (m *AuthMiddleware) ValidateEstateAccess(ctx context.Context, estateID string) error {
	return m.CheckRBACPermissionWithScope(ctx, "estate:read", "estate", &estateID)
}

// ValidateDivisionAccess validates user access to a specific division using RBAC
func (m *AuthMiddleware) ValidateDivisionAccess(ctx context.Context, divisionID string) error {
	return m.CheckRBACPermissionWithScope(ctx, "division:read", "division", &divisionID)
}

// ValidateHarvestAccess validates user access to harvest operations using RBAC
func (m *AuthMiddleware) ValidateHarvestAccess(ctx context.Context, action string) error {
	permission := fmt.Sprintf("harvest:%s", action)
	return m.CheckRBACPermission(ctx, permission)
}

// ValidateGateCheckAccess validates user access to gate check operations using RBAC
func (m *AuthMiddleware) ValidateGateCheckAccess(ctx context.Context, action string) error {
	permission := fmt.Sprintf("gatecheck:%s", action)
	return m.CheckRBACPermission(ctx, permission)
}

// ValidateUserManagementAccess validates user access to user management operations using RBAC
func (m *AuthMiddleware) ValidateUserManagementAccess(ctx context.Context, action string) error {
	permission := fmt.Sprintf("users:%s", action)
	return m.CheckRBACPermission(ctx, permission)
}

// GetRBACUserPermissions returns all permissions for the current user using RBAC
func (m *AuthMiddleware) GetRBACUserPermissions(ctx context.Context) ([]string, error) {
	if err := RequireAuthentication(ctx); err != nil {
		return nil, err
	}

	userID := GetUserFromContext(ctx)
	permissions, err := m.rbacService.GetUserPermissions(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user permissions: %w", err)
	}

	return permissions, nil
}

// CanManageUserRole checks if current user can manage users with the specified role using RBAC
func (m *AuthMiddleware) CanManageUserRole(ctx context.Context, targetRole auth.UserRole) (bool, error) {
	if err := RequireAuthentication(ctx); err != nil {
		return false, err
	}

	userID := GetUserFromContext(ctx)
	return m.rbacService.CanManageRole(ctx, userID, string(targetRole))
}

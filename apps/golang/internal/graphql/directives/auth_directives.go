package directives

import (
	"context"
	"errors"
	"fmt"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/generated"

	"github.com/99designs/gqlgen/graphql"
	"github.com/vektah/gqlparser/v2/gqlerror"
)

// NewAuthDirectives creates a new authentication directive handler that matches generated.DirectiveRoot
func NewAuthDirectives() generated.DirectiveRoot {
	return generated.DirectiveRoot{
		RequireAuth: requireAuthDirective,
		HasRole:     hasRoleDirective,
	}
}

// roleHierarchyLevels allows higher roles to access lower-role scoped operations.
var roleHierarchyLevels = map[auth.UserRole]int{
	auth.UserRoleSuperAdmin:  1,
	auth.UserRoleAreaManager: 2,
	auth.UserRoleCompanyAdmin: 3,
	auth.UserRoleManager:     4,
	auth.UserRoleAsisten:     5,
	auth.UserRoleMandor:      6,
	auth.UserRoleSatpam:      7,
	auth.UserRoleTimbangan:   8,
	auth.UserRoleGrading:     9,
}

func hasHierarchicalRoleAccess(userRole, requiredRole auth.UserRole) bool {
	if userRole == requiredRole {
		return true
	}

	userLevel, userOK := roleHierarchyLevels[userRole]
	requiredLevel, requiredOK := roleHierarchyLevels[requiredRole]
	if !userOK || !requiredOK {
		return false
	}

	return userLevel <= requiredLevel
}

// requireAuthDirective implements the @requireAuth directive
func requireAuthDirective(ctx context.Context, obj interface{}, next graphql.Resolver) (interface{}, error) {
	// Extract user context from middleware (should be set by auth middleware)
	userID := ctx.Value("user_id")
	if userID == nil {
		code := "UNAUTHENTICATED"
		message := "authentication required"
		retryable := false
		// Check if middleware stored a more specific error code (e.g., ACCESS_EXPIRED)
		if errCode, ok := ctx.Value("auth_error_code").(string); ok && errCode != "" {
			code = errCode
			if code == "ACCESS_EXPIRED" {
				message = "access token expired"
				retryable = true
			}
		}
		return nil, &gqlerror.Error{
			Message: message,
			Extensions: map[string]interface{}{
				"code":      code,
				"retryable": retryable,
			},
		}
	}

	// User is authenticated, proceed to next resolver
	return next(ctx)
}

// hasRoleDirective implements the @hasRole directive
func hasRoleDirective(ctx context.Context, obj interface{}, next graphql.Resolver, roles []auth.UserRole) (interface{}, error) {
	// First ensure user is authenticated
	userID := ctx.Value("user_id")
	if userID == nil {
		code := "UNAUTHENTICATED"
		message := "authentication required"
		retryable := false
		if errCode, ok := ctx.Value("auth_error_code").(string); ok && errCode != "" {
			code = errCode
			if code == "ACCESS_EXPIRED" {
				message = "access token expired"
				retryable = true
			}
		}
		return nil, &gqlerror.Error{
			Message: message,
			Extensions: map[string]interface{}{
				"code":      code,
				"retryable": retryable,
			},
		}
	}

	// Get user role from context
	userRoleInterface := ctx.Value("user_role")
	if userRoleInterface == nil {
		return nil, errors.New("authorization error: user role not found in context")
	}

	var userRole auth.UserRole
	switch v := userRoleInterface.(type) {
	case string:
		userRole = auth.UserRole(v)
	case auth.UserRole:
		userRole = v
	default:
		return nil, errors.New("authorization error: invalid user role format in context")
	}

	// Allow exact role and hierarchical access (higher role can access lower role).
	for _, allowedRole := range roles {
		if hasHierarchicalRoleAccess(userRole, allowedRole) {
			return next(ctx)
		}
	}

	return nil, &gqlerror.Error{
		Message: fmt.Sprintf("access denied: user role %s is not authorized for this operation", userRole),
		Extensions: map[string]interface{}{
			"code": "FORBIDDEN",
		},
	}
}

package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"agrinovagraphql/server/internal/auth/constants"
	"agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/internal/auth/services"

	"github.com/gin-gonic/gin"
)

// APIKeyMiddleware handles API key authentication and authorization
type APIKeyMiddleware struct {
	apiKeyService *services.APIKeyService
}

// NewAPIKeyMiddleware creates a new API key middleware
func NewAPIKeyMiddleware(apiKeyService *services.APIKeyService) *APIKeyMiddleware {
	return &APIKeyMiddleware{
		apiKeyService: apiKeyService,
	}
}

// Authenticate verifies the API key from the Authorization header
func (m *APIKeyMiddleware) Authenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract API key from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "missing_authorization",
				"message": "Authorization header is required",
			})
			c.Abort()
			return
		}

		// Check for Bearer token format
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "invalid_authorization_format",
				"message": "Authorization header must be in format: Bearer <api_key>",
			})
			c.Abort()
			return
		}

		apiKeyString := parts[1]

		// Verify API key
		apiKey, err := m.apiKeyService.VerifyAPIKey(c.Request.Context(), apiKeyString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "invalid_api_key",
				"message": "Invalid or expired API key",
			})
			c.Abort()
			return
		}

		// Store API key in context for later use
		ctx := context.WithValue(c.Request.Context(), "api_key", apiKey)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// RequireScopes middleware checks if the API key has the required scopes
func (m *APIKeyMiddleware) RequireScopes(requiredScopes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get API key from context
		apiKeyInterface := c.Request.Context().Value("api_key")
		if apiKeyInterface == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "authentication_required",
				"message": "API key authentication required",
			})
			c.Abort()
			return
		}

		apiKey, ok := apiKeyInterface.(*models.APIKey)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "invalid_context",
				"message": "Invalid API key in context",
			})
			c.Abort()
			return
		}

		// Check if API key has required scopes
		if !hasRequiredScopes(apiKey.Scopes, requiredScopes) {
			c.JSON(http.StatusForbidden, gin.H{
				"error":           "insufficient_scope",
				"message":         "API key does not have required permissions",
				"required_scopes": requiredScopes,
				"provided_scopes": apiKey.Scopes,
				"missing_scopes":  getMissingScopes(apiKey.Scopes, requiredScopes),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAnyScope middleware checks if the API key has at least one of the required scopes
func (m *APIKeyMiddleware) RequireAnyScope(requiredScopes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKeyInterface := c.Request.Context().Value("api_key")
		if apiKeyInterface == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "authentication_required",
				"message": "API key authentication required",
			})
			c.Abort()
			return
		}

		apiKey, ok := apiKeyInterface.(*models.APIKey)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "invalid_context",
				"message": "Invalid API key in context",
			})
			c.Abort()
			return
		}

		// Check if API key has at least one of the required scopes
		if !hasAnyScope(apiKey.Scopes, requiredScopes) {
			c.JSON(http.StatusForbidden, gin.H{
				"error":           "insufficient_scope",
				"message":         "API key does not have any of the required permissions",
				"required_scopes": requiredScopes,
				"provided_scopes": apiKey.Scopes,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// hasRequiredScopes checks if the API key has all required scopes
func hasRequiredScopes(apiKeyScopes []string, requiredScopes []string) bool {
	for _, required := range requiredScopes {
		found := false
		for _, apiScope := range apiKeyScopes {
			if apiScope == required {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

// hasAnyScope checks if the API key has at least one of the required scopes
func hasAnyScope(apiKeyScopes []string, requiredScopes []string) bool {
	for _, required := range requiredScopes {
		for _, apiScope := range apiKeyScopes {
			if apiScope == required {
				return true
			}
		}
	}
	return false
}

// getMissingScopes returns the scopes that are required but not present in the API key
func getMissingScopes(apiKeyScopes []string, requiredScopes []string) []string {
	missing := []string{}
	for _, required := range requiredScopes {
		found := false
		for _, apiScope := range apiKeyScopes {
			if apiScope == required {
				found = true
				break
			}
		}
		if !found {
			missing = append(missing, required)
		}
	}
	return missing
}

// ValidateScopesMiddleware validates that all scopes in the API key are valid
func (m *APIKeyMiddleware) ValidateScopesMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKeyInterface := c.Request.Context().Value("api_key")
		if apiKeyInterface == nil {
			c.Next()
			return
		}

		apiKey, ok := apiKeyInterface.(*models.APIKey)
		if !ok {
			c.Next()
			return
		}

		// Validate all scopes
		valid, invalidScopes := constants.ValidateScopes(apiKey.Scopes)
		if !valid {
			c.JSON(http.StatusForbidden, gin.H{
				"error":          "invalid_scopes",
				"message":        fmt.Sprintf("API key contains invalid scopes: %v", invalidScopes),
				"invalid_scopes": invalidScopes,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

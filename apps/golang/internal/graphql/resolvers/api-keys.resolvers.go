package resolvers

import (
	"context"
	"fmt"

	authmodels "agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/internal/auth/services"
	"agrinovagraphql/server/internal/graphql/generated"

	"github.com/vektah/gqlparser/v2/gqlerror"
)

// CreateAPIKey resolves the createApiKey mutation
func (r *mutationResolver) CreateAPIKey(ctx context.Context, input generated.CreateAPIKeyInput) (*generated.APIKeyReveal, error) {
	// Get current user from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, &gqlerror.Error{
			Message: "Authentication required",
			Extensions: map[string]interface{}{
				"code": "AUTHENTICATION_REQUIRED",
			},
		}
	}

	// Create API key service input
	serviceInput := services.CreateAPIKeyInput{
		Name:          input.Name,
		Scopes:        input.Scopes,
		ExpiresInDays: input.ExpiresInDays,
	}

	// Create API key
	result, err := r.APIKeyService.CreateAPIKey(ctx, serviceInput, userID)
	if err != nil {
		return nil, &gqlerror.Error{
			Message: fmt.Sprintf("Failed to create API key: %s", err.Error()),
			Extensions: map[string]interface{}{
				"code": "CREATION_FAILED",
			},
		}
	}

	// Convert service result to GraphQL response
	// Convert the models.APIKey to generated.APIKey
	var apiKey *generated.APIKey
	if result.APIKey != nil {
		apiKey = &generated.APIKey{
			ID:         result.APIKey.ID,
			Name:       result.APIKey.Name,
			Prefix:     result.APIKey.Prefix,
			Scopes:     []string(result.APIKey.Scopes),
			Status:     generated.APIKeyStatus(result.APIKey.Status),
			ExpiresAt:  result.APIKey.ExpiresAt,
			LastUsedAt: result.APIKey.LastUsedAt,
			CreatedAt:  result.APIKey.CreatedAt,
		}
	}

	return &generated.APIKeyReveal{
		APIKey:       apiKey,
		PlaintextKey: result.PlaintextKey,
	}, nil
}

// RevokeAPIKey resolves the revokeAPIKey mutation
func (r *mutationResolver) RevokeAPIKey(ctx context.Context, id string) (bool, error) {
	// Get current user from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return false, &gqlerror.Error{
			Message: "Authentication required",
			Extensions: map[string]interface{}{
				"code": "AUTHENTICATION_REQUIRED",
			},
		}
	}

	// Revoke API key
	success, err := r.APIKeyService.RevokeAPIKey(ctx, id, userID)
	if err != nil {
		return false, &gqlerror.Error{
			Message: fmt.Sprintf("Failed to revoke API key: %s", err.Error()),
			Extensions: map[string]interface{}{
				"code": "REVOCATION_FAILED",
			},
		}
	}

	return success, nil
}

// RotateAPIKey resolves the rotateAPIKey mutation
func (r *mutationResolver) RotateAPIKey(ctx context.Context, id string, expiresInDays *int32) (*generated.APIKeyReveal, error) {
	// Get current user from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, &gqlerror.Error{
			Message: "Authentication required",
			Extensions: map[string]interface{}{
				"code": "AUTHENTICATION_REQUIRED",
			},
		}
	}

	// Convert int32 to int for service call
	var expiresInDaysInt *int
	if expiresInDays != nil {
		val := int(*expiresInDays)
		expiresInDaysInt = &val
	}

	// Rotate API key
	result, err := r.APIKeyService.RotateAPIKey(ctx, id, userID, expiresInDaysInt)
	if err != nil {
		return nil, &gqlerror.Error{
			Message: fmt.Sprintf("Failed to rotate API key: %s", err.Error()),
			Extensions: map[string]interface{}{
				"code": "ROTATION_FAILED",
			},
		}
	}

	// Convert service result to GraphQL response
	var apiKey *generated.APIKey
	if result.APIKey != nil {
		apiKey = &generated.APIKey{
			ID:         result.APIKey.ID,
			Name:       result.APIKey.Name,
			Prefix:     result.APIKey.Prefix,
			Scopes:     []string(result.APIKey.Scopes),
			Status:     generated.APIKeyStatus(result.APIKey.Status),
			ExpiresAt:  result.APIKey.ExpiresAt,
			LastUsedAt: result.APIKey.LastUsedAt,
			CreatedAt:  result.APIKey.CreatedAt,
		}
	}

	return &generated.APIKeyReveal{
		APIKey:       apiKey,
		PlaintextKey: result.PlaintextKey,
	}, nil
}

// APIKeys resolves the apiKeys query
func (r *queryResolver) APIKeys(ctx context.Context) ([]*generated.APIKey, error) {
	// Get current user from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, &gqlerror.Error{
			Message: "Authentication required",
			Extensions: map[string]interface{}{
				"code": "AUTHENTICATION_REQUIRED",
			},
		}
	}

	// TODO: Check if user is SUPER_ADMIN - for now just require authentication
	// In a production system, you'd check the user's role from the database
	_ = userID // Use userID to avoid unused variable warning

	// Get API keys from service
	keys, err := r.APIKeyService.ListAPIKeys(ctx)
	if err != nil {
		return nil, err
	}

	// Convert authmodels.APIKey to generated.APIKey
	result := make([]*generated.APIKey, len(keys))
	for i, key := range keys {
		result[i] = &generated.APIKey{
			ID:         key.ID,
			Name:       key.Name,
			Prefix:     key.Prefix,
			Scopes:     []string(key.Scopes),
			Status:     generated.APIKeyStatus(key.Status),
			ExpiresAt:  key.ExpiresAt,
			LastUsedAt: key.LastUsedAt,
			CreatedAt:  key.CreatedAt,
		}
	}

	return result, nil
}

// APIKeyStats resolves the apiKeyStats query
func (r *queryResolver) APIKeyStats(ctx context.Context) (*generated.APIKeyStats, error) {
	// Get current user from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, &gqlerror.Error{
			Message: "Authentication required",
			Extensions: map[string]interface{}{
				"code": "AUTHENTICATION_REQUIRED",
			},
		}
	}

	// TODO: Check if user is SUPER_ADMIN - for now just require authentication
	_ = userID // Use userID to avoid unused variable warning

	// Get API key statistics from service
	statsData, err := r.APIKeyService.GetAPIKeyStats(ctx)
	if err != nil {
		return nil, err
	}

	// Convert the service response to the generated type
	stats := &generated.APIKeyStats{
		TotalKeys:           int32(statsData["totalKeys"].(int64)),
		ActiveKeys:          int32(statsData["activeKeys"].(int64)),
		RevokedKeys:         int32(statsData["revokedKeys"].(int64)),
		CreatedLast30Days:   int32(statsData["createdLast30Days"].(int64)),
		ExpiringNext30Days:  int32(statsData["expiringNext30Days"].(int64)),
	}

	// Handle optional fields that might not be in the service response
	if expiredKeys, ok := statsData["expiredKeys"].(int64); ok {
		stats.ExpiredKeys = int32(expiredKeys)
	}

	// Convert most recent key if available
	if mostRecentKey, ok := statsData["mostRecentKey"].(*authmodels.APIKey); ok && mostRecentKey != nil {
		stats.MostRecentKey = &generated.APIKey{
			ID:         mostRecentKey.ID,
			Name:       mostRecentKey.Name,
			Prefix:     mostRecentKey.Prefix,
			Scopes:     []string(mostRecentKey.Scopes),
			Status:     generated.APIKeyStatus(mostRecentKey.Status),
			ExpiresAt:  mostRecentKey.ExpiresAt,
			LastUsedAt: mostRecentKey.LastUsedAt,
			CreatedAt:  mostRecentKey.CreatedAt,
		}
	}

	// Convert most used key if available
	if mostUsedKey, ok := statsData["mostUsedKey"].(*authmodels.APIKey); ok && mostUsedKey != nil {
		stats.MostUsedKey = &generated.APIKey{
			ID:         mostUsedKey.ID,
			Name:       mostUsedKey.Name,
			Prefix:     mostUsedKey.Prefix,
			Scopes:     []string(mostUsedKey.Scopes),
			Status:     generated.APIKeyStatus(mostUsedKey.Status),
			ExpiresAt:  mostUsedKey.ExpiresAt,
			LastUsedAt: mostUsedKey.LastUsedAt,
			CreatedAt:  mostUsedKey.CreatedAt,
		}
	}

	return stats, nil
}

// APIKeyLog resolves the apiKeyLog query
func (r *queryResolver) APIKeyLog(ctx context.Context, apiKeyID *string, action *string, limit *int32, offset *int32) ([]*generated.APIKeyLog, error) {
	// Set default values
	if limit == nil {
		limitVal := int32(50)
		limit = &limitVal
	}
	if offset == nil {
		offsetVal := int32(0)
		offset = &offsetVal
	}

	// Get current user from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, &gqlerror.Error{
			Message: "Authentication required",
			Extensions: map[string]interface{}{
				"code": "AUTHENTICATION_REQUIRED",
			},
		}
	}

	// TODO: Check if user is SUPER_ADMIN - for now just require authentication
	_ = userID // Use userID to avoid unused variable warning

	// Get API key logs from service
	logs, err := r.APIKeyService.GetAPIKeyLog(ctx, apiKeyID, action, int(*limit), int(*offset))
	if err != nil {
		return nil, err
	}

	// Convert authmodels.APIKeyLog to generated.APIKeyLog
	result := make([]*generated.APIKeyLog, len(logs))
	for i, log := range logs {
		// Convert json.RawMessage to string pointer
		var detailsStr *string
		if len(log.Details) > 0 {
			str := string(log.Details)
			detailsStr = &str
		}

		result[i] = &generated.APIKeyLog{
			ID:          log.ID,
			APIKeyID:    log.APIKeyID,
			Action:      log.Action,
			IPAddress:   &log.IPAddress, // Convert string to *string
			UserAgent:   &log.UserAgent, // Convert string to *string
			Details:     detailsStr,     // Convert json.RawMessage to *string
			CreatedAt:   log.CreatedAt,
		}
	}

	return result, nil
}


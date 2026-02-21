package resolvers

import (
	"context"
	"fmt"

	"agrinovagraphql/server/internal/auth/services"
	"agrinovagraphql/server/internal/middleware"
)

// RegisterFCMTokenInput represents input for FCM token registration
// This matches the GraphQL schema in fcm_token.graphqls
type RegisterFCMTokenInput struct {
	Token    string `json:"token"`
	Platform string `json:"platform"`
	DeviceID string `json:"deviceId"`
}

// FCMTokenResolver handles FCM token GraphQL mutations
type FCMTokenResolver struct {
	hierarchyService *services.HierarchyService
}

// NewFCMTokenResolver creates a new FCM token resolver
func NewFCMTokenResolver(hierarchyService *services.HierarchyService) *FCMTokenResolver {
	return &FCMTokenResolver{
		hierarchyService: hierarchyService,
	}
}

// RegisterFCMToken registers a new FCM token for the current user
func (r *FCMTokenResolver) RegisterFCMToken(ctx context.Context, input RegisterFCMTokenInput) (bool, error) {
	// Get current user ID from context
	userID := middleware.GetUserFromContext(ctx)
	if userID == "" {
		return false, fmt.Errorf("unauthorized: user not found in context")
	}

	// Validate platform
	platform := input.Platform
	if platform != "ANDROID" && platform != "IOS" {
		return false, fmt.Errorf("invalid platform: must be ANDROID or IOS")
	}

	// Register the token
	err := r.hierarchyService.RegisterDeviceToken(ctx, userID, input.Token, platform, input.DeviceID)
	if err != nil {
		return false, fmt.Errorf("failed to register FCM token: %w", err)
	}

	return true, nil
}

// UnregisterFCMToken removes an FCM token
func (r *FCMTokenResolver) UnregisterFCMToken(ctx context.Context, token string) (bool, error) {
	// Get current user ID from context
	userID := middleware.GetUserFromContext(ctx)
	if userID == "" {
		return false, fmt.Errorf("unauthorized: user not found in context")
	}

	// Unregister the token
	err := r.hierarchyService.UnregisterDeviceToken(ctx, token)
	if err != nil {
		return false, fmt.Errorf("failed to unregister FCM token: %w", err)
	}

	return true, nil
}

package resolvers

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"agrinovagraphql/server/internal/features/models"
	"agrinovagraphql/server/internal/features/services"
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/common"
	graphmodels "agrinovagraphql/server/internal/graphql/domain/features"
	"agrinovagraphql/server/internal/middleware"

	"github.com/google/uuid"
)

// FeatureResolver provides GraphQL resolvers for feature management
type FeatureResolver struct {
	featureService     *services.FeatureService
	compositionService *services.FeatureCompositionService
	authMiddleware     *middleware.AuthMiddleware
}

// NewFeatureResolver creates a new feature resolver
func NewFeatureResolver(
	featureService *services.FeatureService,
	compositionService *services.FeatureCompositionService,
	authMiddleware *middleware.AuthMiddleware,
) *FeatureResolver {
	return &FeatureResolver{
		featureService:     featureService,
		compositionService: compositionService,
		authMiddleware:     authMiddleware,
	}
}

// =============================================================================
// Query Resolvers
// =============================================================================

// ListFeatures retrieves all features with optional filtering and pagination
func (r *FeatureResolver) ListFeatures(
	ctx context.Context,
	filter *graphmodels.FeatureFilterInput,
	page *int32,
	limit *int32,
) (*graphmodels.FeaturesResponse, error) {
	// Authorization: Only SUPER_ADMIN and COMPANY_ADMIN can list features
	if err := r.requireAdminRole(ctx); err != nil {
		return nil, err
	}

	// Set defaults for pagination
	pageNum := 1
	if page != nil && *page > 0 {
		pageNum = int(*page)
	}

	limitNum := 50
	if limit != nil && *limit > 0 {
		limitNum = int(*limit)
	}

	// Build filter criteria
	var module, parentID *string
	var isActive, isSystem *bool
	var searchTerm *string

	if filter != nil {
		module = filter.Module
		parentID = filter.ParentID
		isActive = filter.IsActive
		isSystem = filter.IsSystem
		searchTerm = filter.Search
	}

	// Get features from service
	allFeatures, err := r.featureService.ListFeatures(ctx, module, parentID, isActive)
	if err != nil {
		return nil, fmt.Errorf("failed to list features: %w", err)
	}

	// Apply additional filters
	var filteredFeatures []*models.Feature
	for _, f := range allFeatures {
		// Filter by isSystem
		if isSystem != nil && f.IsSystem != *isSystem {
			continue
		}

		// Filter by search term
		if searchTerm != nil && *searchTerm != "" {
			searchLower := strings.ToLower(*searchTerm)
			if !strings.Contains(strings.ToLower(f.Name), searchLower) &&
				!strings.Contains(strings.ToLower(f.DisplayName), searchLower) {
				continue
			}
		}

		filteredFeatures = append(filteredFeatures, f)
	}

	// Apply pagination
	totalCount := len(filteredFeatures)
	start := (pageNum - 1) * limitNum
	end := start + limitNum

	if start >= totalCount {
		// Empty page
		return &graphmodels.FeaturesResponse{
			Features:    []*graphmodels.Feature{},
			TotalCount:  int32(totalCount),
			HasNextPage: false,
			PageInfo: &common.PageInfo{
				CurrentPage:     int32(pageNum),
				TotalPages:      int32((totalCount + limitNum - 1) / limitNum),
				HasNextPage:     false,
				HasPreviousPage: pageNum > 1,
			},
		}, nil
	}

	if end > totalCount {
		end = totalCount
	}

	paginatedFeatures := filteredFeatures[start:end]

	// Convert to GraphQL types
	gqlFeatures := make([]*graphmodels.Feature, len(paginatedFeatures))
	for i, f := range paginatedFeatures {
		gqlFeatures[i] = r.convertToGraphQLFeature(f)
	}

	return &graphmodels.FeaturesResponse{
		Features:    gqlFeatures,
		TotalCount:  int32(totalCount),
		HasNextPage: end < totalCount,
		PageInfo: &common.PageInfo{
			CurrentPage:     int32(pageNum),
			TotalPages:      int32((totalCount + limitNum - 1) / limitNum),
			HasNextPage:     end < totalCount,
			HasPreviousPage: pageNum > 1,
		},
	}, nil
}

// GetFeature retrieves a specific feature by ID
func (r *FeatureResolver) GetFeature(ctx context.Context, id string) (*graphmodels.Feature, error) {
	// Authorization: Only SUPER_ADMIN and COMPANY_ADMIN can get features
	if err := r.requireAdminRole(ctx); err != nil {
		return nil, err
	}

	feature, err := r.featureService.GetFeature(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get feature: %w", err)
	}

	return r.convertToGraphQLFeature(feature), nil
}

// GetFeatureByName retrieves a feature by its code/name
func (r *FeatureResolver) GetFeatureByName(ctx context.Context, name string) (*graphmodels.Feature, error) {
	// Authorization: Only SUPER_ADMIN and COMPANY_ADMIN can get features
	if err := r.requireAdminRole(ctx); err != nil {
		return nil, err
	}

	feature, err := r.featureService.GetFeatureByName(ctx, name)
	if err != nil {
		return nil, fmt.Errorf("failed to get feature: %w", err)
	}

	return r.convertToGraphQLFeature(feature), nil
}

// GetFeatureHierarchy retrieves the complete feature hierarchy tree
func (r *FeatureResolver) GetFeatureHierarchy(ctx context.Context, module *string) ([]*graphmodels.FeatureHierarchy, error) {
	// Authorization: Only SUPER_ADMIN and COMPANY_ADMIN can get feature hierarchy
	if err := r.requireAdminRole(ctx); err != nil {
		return nil, err
	}

	hierarchy, err := r.featureService.GetFeatureHierarchy(ctx, module)
	if err != nil {
		return nil, fmt.Errorf("failed to get feature hierarchy: %w", err)
	}

	// Convert to GraphQL types
	gqlHierarchy := make([]*graphmodels.FeatureHierarchy, len(hierarchy))
	for i, h := range hierarchy {
		gqlHierarchy[i] = r.convertToGraphQLHierarchy(h)
	}

	return gqlHierarchy, nil
}

// CheckUserFeature checks if a user has a specific feature
func (r *FeatureResolver) CheckUserFeature(ctx context.Context, input graphmodels.FeatureCheckInput) (*graphmodels.FeatureCheckResult, error) {
	// Authorization: Users can check their own features, admins can check any user
	currentUser, err := r.getCurrentUser(ctx)
	if err != nil {
		return nil, err
	}

	// Check if checking own features or is admin
	if currentUser.ID != input.UserID && !r.isAdmin(currentUser) {
		return nil, fmt.Errorf("insufficient permissions to check other users' features")
	}

	// Convert scope
	var scope *models.FeatureScope
	if input.Scope != nil {
		scope = &models.FeatureScope{
			Type: input.Scope.Type,
			ID:   input.Scope.ID,
		}
	}

	// Perform check
	request := &models.FeatureCheckRequest{
		UserID:  input.UserID,
		Feature: input.Feature,
		Scope:   scope,
	}

	result, err := r.featureService.CheckFeatureAccess(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("failed to check feature access: %w", err)
	}

	// Convert to GraphQL type
	return &graphmodels.FeatureCheckResult{
		UserID:       result.UserID,
		Feature:      result.Feature,
		HasAccess:    result.HasAccess,
		AccessReason: &result.AccessReason,
		DenialReason: &result.DenialReason,
		CheckedAt:    result.CheckedAt,
	}, nil
}

// CheckUserFeatures checks if a user has multiple features
func (r *FeatureResolver) CheckUserFeatures(ctx context.Context, input graphmodels.BatchFeatureCheckInput) (*graphmodels.BatchFeatureCheckResult, error) {
	// Authorization: Users can check their own features, admins can check any user
	currentUser, err := r.getCurrentUser(ctx)
	if err != nil {
		return nil, err
	}

	// Check if checking own features or is admin
	if currentUser.ID != input.UserID && !r.isAdmin(currentUser) {
		return nil, fmt.Errorf("insufficient permissions to check other users' features")
	}

	// Convert scope
	var scope *models.FeatureScope
	if input.Scope != nil {
		scope = &models.FeatureScope{
			Type: input.Scope.Type,
			ID:   input.Scope.ID,
		}
	}

	// Check each feature
	var grantedFeatures, deniedFeatures []string
	for _, feature := range input.Features {
		hasAccess, err := r.featureService.HasFeature(ctx, input.UserID, feature, scope)
		if err != nil {
			return nil, fmt.Errorf("failed to check feature %s: %w", feature, err)
		}

		if hasAccess {
			grantedFeatures = append(grantedFeatures, feature)
		} else {
			deniedFeatures = append(deniedFeatures, feature)
		}
	}

	// Determine overall access based on requireAll flag
	requireAll := false
	if input.RequireAll != nil {
		requireAll = *input.RequireAll
	}

	hasAccess := false
	if requireAll {
		hasAccess = len(deniedFeatures) == 0
	} else {
		hasAccess = len(grantedFeatures) > 0
	}

	return &graphmodels.BatchFeatureCheckResult{
		UserID:          input.UserID,
		Features:        input.Features,
		HasAccess:       hasAccess,
		GrantedFeatures: grantedFeatures,
		DeniedFeatures:  deniedFeatures,
	}, nil
}

// GetUserFeatures retrieves all features for a specific user
func (r *FeatureResolver) GetUserFeatures(ctx context.Context, userID string, scope *graphmodels.FeatureScopeInput) (*graphmodels.UserFeatureSet, error) {
	// Authorization: Users can get their own features, admins can get any user's features
	currentUser, err := r.getCurrentUser(ctx)
	if err != nil {
		return nil, err
	}

	// Check if getting own features or is admin
	if currentUser.ID != userID && !r.isAdmin(currentUser) {
		return nil, fmt.Errorf("insufficient permissions to get other users' features")
	}

	// Get user features
	featureSet, err := r.featureService.GetUserFeatures(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user features: %w", err)
	}

	// Convert scoped features
	var scopedFeatures []*graphmodels.ScopedFeature
	if featureSet.ScopedFeatures != nil {
		scopedFeatures = make([]*graphmodels.ScopedFeature, len(featureSet.ScopedFeatures))
		for i, sf := range featureSet.ScopedFeatures {
			var gqlScope *graphmodels.FeatureScope
			if sf.Scope != nil {
				gqlScope = &graphmodels.FeatureScope{
					Type: sf.Scope.Type,
					ID:   sf.Scope.ID,
				}
			}

			scopedFeatures[i] = &graphmodels.ScopedFeature{
				Feature:   sf.Feature,
				IsGranted: sf.IsGranted,
				Scope:     gqlScope,
				ExpiresAt: sf.ExpiresAt,
			}
		}
	}

	return &graphmodels.UserFeatureSet{
		UserID:         featureSet.UserID,
		Role:           featureSet.Role,
		Features:       featureSet.Features,
		ScopedFeatures: scopedFeatures,
		ComputedAt:     featureSet.ComputedAt,
		ExpiresAt:      featureSet.ExpiresAt,
	}, nil
}

// GetUserFeatureOverrides retrieves user-specific feature overrides
func (r *FeatureResolver) GetUserFeatureOverrides(ctx context.Context, userID string) ([]*graphmodels.UserFeature, error) {
	// Authorization: Only SUPER_ADMIN and COMPANY_ADMIN can get user overrides
	if err := r.requireAdminRole(ctx); err != nil {
		return nil, err
	}

	// Get user overrides from database
	var userFeatures []models.UserFeature
	if err := r.featureService.GetDB().WithContext(ctx).
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Preload("Feature").
		Find(&userFeatures).Error; err != nil {
		return nil, fmt.Errorf("failed to get user feature overrides: %w", err)
	}

	// Convert to GraphQL types
	gqlUserFeatures := make([]*graphmodels.UserFeature, len(userFeatures))
	for i, uf := range userFeatures {
		gqlUserFeatures[i] = r.convertToGraphQLUserFeature(&uf)
	}

	return gqlUserFeatures, nil
}

// GetRoleFeatures retrieves all features assigned to a role
func (r *FeatureResolver) GetRoleFeatures(ctx context.Context, roleName string) ([]*graphmodels.RoleFeature, error) {
	// Authorization: Only SUPER_ADMIN and COMPANY_ADMIN can get role features
	if err := r.requireAdminRole(ctx); err != nil {
		return nil, err
	}

	// Get role features from database
	var roleFeatures []models.RoleFeature
	if err := r.featureService.GetDB().WithContext(ctx).
		Joins("JOIN rbac_roles ON rbac_roles.id = role_features.role_id").
		Where("rbac_roles.name = ? AND role_features.deleted_at IS NULL", roleName).
		Preload("Feature").
		Find(&roleFeatures).Error; err != nil {
		return nil, fmt.Errorf("failed to get role features: %w", err)
	}

	// Convert to GraphQL types
	gqlRoleFeatures := make([]*graphmodels.RoleFeature, len(roleFeatures))
	for i, rf := range roleFeatures {
		gqlRoleFeatures[i] = r.convertToGraphQLRoleFeature(&rf)
	}

	return gqlRoleFeatures, nil
}

// GetFeatureStats retrieves feature system statistics
func (r *FeatureResolver) GetFeatureStats(ctx context.Context) (*graphmodels.FeatureStats, error) {
	// Authorization: Only SUPER_ADMIN can get stats
	currentUser, err := r.getCurrentUser(ctx)
	if err != nil {
		return nil, err
	}

	if currentUser.Role != auth.UserRoleSuperAdmin {
		return nil, fmt.Errorf("only SUPER_ADMIN can view feature statistics")
	}

	stats, err := r.featureService.GetFeatureStatistics(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get feature statistics: %w", err)
	}

	// Convert stats to JSON strings for complex types
	featuresByModuleJSON, _ := json.Marshal(stats.FeaturesByModule)
	cacheStatsJSON, _ := json.Marshal(stats.CacheStats)

	featuresByModuleStr := string(featuresByModuleJSON)
	cacheStatsStr := string(cacheStatsJSON)

	return &graphmodels.FeatureStats{
		TotalFeatures:         int32(stats.TotalFeatures),
		ActiveFeatures:        int32(stats.ActiveFeatures),
		SystemFeatures:        int32(stats.SystemFeatures),
		CustomFeatures:        int32(stats.CustomFeatures),
		TotalRoleFeatures:     int32(stats.TotalRoleFeatures),
		TotalUserOverrides:    int32(stats.TotalUserOverrides),
		FeaturesByModule:      featuresByModuleStr,
		CacheHitRate:          stats.CacheHitRate,
		AverageCheckLatencyMs: stats.AverageCheckLatency,
		CacheStats:            &cacheStatsStr,
	}, nil
}

// =============================================================================
// Mutation Resolvers
// =============================================================================

// CreateFeature creates a new custom feature
func (r *FeatureResolver) CreateFeature(ctx context.Context, input graphmodels.CreateFeatureInput) (*graphmodels.Feature, error) {
	// Authorization: Only SUPER_ADMIN can create features
	currentUser, err := r.getCurrentUser(ctx)
	if err != nil {
		return nil, err
	}

	if currentUser.Role != auth.UserRoleSuperAdmin {
		return nil, fmt.Errorf("only SUPER_ADMIN can create features")
	}

	// Validate feature name format (alphanumeric, dots, underscores only)
	if err := r.validateFeatureName(input.Name); err != nil {
		return nil, err
	}

	// Convert input to service model
	isActive := true
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	var parentID *string
	if input.ParentID != nil {
		parentID = input.ParentID
	}

	featureInput := &models.FeatureInput{
		Name:        input.Name,
		DisplayName: input.DisplayName,
		Description: getStringValue(input.Description),
		Module:      input.Module,
		ParentID:    parentID,
		IsActive:    isActive,
	}

	if input.Metadata != nil {
		featureInput.Metadata = r.convertMetadataInputToMap(input.Metadata)
	}

	// Create feature
	feature, err := r.featureService.CreateFeature(ctx, featureInput, currentUser.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to create feature: %w", err)
	}

	return r.convertToGraphQLFeature(feature), nil
}

// UpdateFeature updates an existing feature
func (r *FeatureResolver) UpdateFeature(ctx context.Context, input graphmodels.UpdateFeatureInput) (*graphmodels.Feature, error) {
	// Authorization: Only SUPER_ADMIN can update features
	currentUser, err := r.getCurrentUser(ctx)
	if err != nil {
		return nil, err
	}

	if currentUser.Role != auth.UserRoleSuperAdmin {
		return nil, fmt.Errorf("only SUPER_ADMIN can update features")
	}

	// Get existing feature to preserve required fields
	existingFeature, err := r.featureService.GetFeature(ctx, input.ID)
	if err != nil {
		return nil, fmt.Errorf("feature not found: %w", err)
	}

	// Build update input
	displayName := existingFeature.DisplayName
	if input.DisplayName != nil {
		displayName = *input.DisplayName
	}

	description := existingFeature.Description
	if input.Description != nil {
		description = *input.Description
	}

	isActive := existingFeature.IsActive
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	featureInput := &models.FeatureInput{
		Name:        existingFeature.Name,
		DisplayName: displayName,
		Description: description,
		Module:      existingFeature.Module,
		IsActive:    isActive,
	}

	if input.Metadata != nil {
		featureInput.Metadata = r.convertMetadataInputToMap(input.Metadata)
	}

	// Update feature
	feature, err := r.featureService.UpdateFeature(ctx, input.ID, featureInput)
	if err != nil {
		return nil, fmt.Errorf("failed to update feature: %w", err)
	}

	return r.convertToGraphQLFeature(feature), nil
}

// DeleteFeature deletes a feature
func (r *FeatureResolver) DeleteFeature(ctx context.Context, id string) (bool, error) {
	// Authorization: Only SUPER_ADMIN can delete features
	currentUser, err := r.getCurrentUser(ctx)
	if err != nil {
		return false, err
	}

	if currentUser.Role != auth.UserRoleSuperAdmin {
		return false, fmt.Errorf("only SUPER_ADMIN can delete features")
	}

	// Delete feature
	if err := r.featureService.DeleteFeature(ctx, id); err != nil {
		return false, fmt.Errorf("failed to delete feature: %w", err)
	}

	return true, nil
}

// GrantUserFeature grants a feature to a specific user
func (r *FeatureResolver) GrantUserFeature(ctx context.Context, input graphmodels.GrantUserFeatureInput) (*graphmodels.UserFeature, error) {
	// Authorization: SUPER_ADMIN or COMPANY_ADMIN (with scope validation)
	currentUser, err := r.getCurrentUser(ctx)
	if err != nil {
		return nil, err
	}

	if !r.isAdmin(currentUser) {
		return nil, fmt.Errorf("insufficient permissions to grant user features")
	}

	// Convert input
	var scope *models.FeatureScope
	if input.Scope != nil {
		scope = &models.FeatureScope{
			Type: input.Scope.Type,
			ID:   input.Scope.ID,
		}
	}

	userFeatureInput := &models.UserFeatureInput{
		UserID:        input.UserID,
		Feature:       input.Feature,
		IsGranted:     true,
		Scope:         scope,
		EffectiveFrom: input.EffectiveFrom,
		ExpiresAt:     input.ExpiresAt,
		Reason:        stringPtrValue(input.Reason),
	}

	// Grant feature
	if err := r.featureService.GrantUserFeature(ctx, userFeatureInput, currentUser.ID); err != nil {
		return nil, fmt.Errorf("failed to grant user feature: %w", err)
	}

	// Retrieve and return the created user feature
	var userFeature models.UserFeature
	query := r.featureService.GetDB().WithContext(ctx).
		Where("user_id = ? AND deleted_at IS NULL", input.UserID).
		Preload("Feature")

	if scope != nil {
		scopeUUID, _ := uuid.Parse(scope.ID)
		query = query.Where("feature_id = (SELECT id FROM features WHERE name = ? AND deleted_at IS NULL) AND scope_type = ? AND scope_id = ?",
			input.Feature, scope.Type, scopeUUID)
	} else {
		query = query.Where("feature_id = (SELECT id FROM features WHERE name = ? AND deleted_at IS NULL) AND scope_type IS NULL",
			input.Feature)
	}

	if err := query.Order("created_at DESC").First(&userFeature).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve created user feature: %w", err)
	}

	return r.convertToGraphQLUserFeature(&userFeature), nil
}

// DenyUserFeature denies a feature to a specific user
func (r *FeatureResolver) DenyUserFeature(ctx context.Context, input graphmodels.DenyUserFeatureInput) (*graphmodels.UserFeature, error) {
	// Authorization: SUPER_ADMIN or COMPANY_ADMIN (with scope validation)
	currentUser, err := r.getCurrentUser(ctx)
	if err != nil {
		return nil, err
	}

	if !r.isAdmin(currentUser) {
		return nil, fmt.Errorf("insufficient permissions to deny user features")
	}

	// Convert input
	var scope *models.FeatureScope
	if input.Scope != nil {
		scope = &models.FeatureScope{
			Type: input.Scope.Type,
			ID:   input.Scope.ID,
		}
	}

	userFeatureInput := &models.UserFeatureInput{
		UserID:        input.UserID,
		Feature:       input.Feature,
		IsGranted:     false,
		Scope:         scope,
		EffectiveFrom: input.EffectiveFrom,
		ExpiresAt:     input.ExpiresAt,
		Reason:        stringPtrValue(input.Reason),
	}

	// Deny feature
	if err := r.featureService.DenyUserFeature(ctx, userFeatureInput, currentUser.ID); err != nil {
		return nil, fmt.Errorf("failed to deny user feature: %w", err)
	}

	// Retrieve and return the created user feature
	var userFeature models.UserFeature
	query := r.featureService.GetDB().WithContext(ctx).
		Where("user_id = ? AND deleted_at IS NULL", input.UserID).
		Preload("Feature")

	if scope != nil {
		scopeUUID, _ := uuid.Parse(scope.ID)
		query = query.Where("feature_id = (SELECT id FROM features WHERE name = ? AND deleted_at IS NULL) AND scope_type = ? AND scope_id = ?",
			input.Feature, scope.Type, scopeUUID)
	} else {
		query = query.Where("feature_id = (SELECT id FROM features WHERE name = ? AND deleted_at IS NULL) AND scope_type IS NULL",
			input.Feature)
	}

	if err := query.Order("created_at DESC").First(&userFeature).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve created user feature: %w", err)
	}

	return r.convertToGraphQLUserFeature(&userFeature), nil
}

// RevokeUserFeature revokes a user-specific feature assignment
func (r *FeatureResolver) RevokeUserFeature(ctx context.Context, input graphmodels.RevokeUserFeatureInput) (bool, error) {
	// Authorization: SUPER_ADMIN or COMPANY_ADMIN (with scope validation)
	currentUser, err := r.getCurrentUser(ctx)
	if err != nil {
		return false, err
	}

	if !r.isAdmin(currentUser) {
		return false, fmt.Errorf("insufficient permissions to revoke user features")
	}

	// Convert scope
	var scope *models.FeatureScope
	if input.Scope != nil {
		scope = &models.FeatureScope{
			Type: input.Scope.Type,
			ID:   input.Scope.ID,
		}
	}

	// Revoke feature
	if err := r.featureService.RemoveUserFeature(ctx, input.UserID, input.Feature, scope); err != nil {
		return false, fmt.Errorf("failed to revoke user feature: %w", err)
	}

	return true, nil
}

// ClearUserFeatures clears all user-specific feature overrides for a user
func (r *FeatureResolver) ClearUserFeatures(ctx context.Context, userID string) (bool, error) {
	// Authorization: Only SUPER_ADMIN can clear all user features
	currentUser, err := r.getCurrentUser(ctx)
	if err != nil {
		return false, err
	}

	if currentUser.Role != auth.UserRoleSuperAdmin {
		return false, fmt.Errorf("only SUPER_ADMIN can clear all user features")
	}

	// Clear all user features
	if err := r.featureService.GetDB().WithContext(ctx).
		Where("user_id = ?", userID).
		Delete(&models.UserFeature{}).Error; err != nil {
		return false, fmt.Errorf("failed to clear user features: %w", err)
	}

	// Clear user cache
	r.compositionService.ClearUserCache(userID)

	return true, nil
}

// AssignRoleFeatures assigns features to a role
func (r *FeatureResolver) AssignRoleFeatures(ctx context.Context, input graphmodels.AssignRoleFeaturesInput) ([]*graphmodels.RoleFeature, error) {
	// Authorization: Only SUPER_ADMIN can assign role features
	currentUser, err := r.getCurrentUser(ctx)
	if err != nil {
		return nil, err
	}

	if currentUser.Role != auth.UserRoleSuperAdmin {
		return nil, fmt.Errorf("only SUPER_ADMIN can assign role features")
	}

	// Convert input
	roleFeatureInput := &models.RoleFeatureInput{
		RoleName: input.RoleName,
		Features: input.Features,
	}

	if input.InheritFrom != nil {
		roleFeatureInput.InheritFrom = input.InheritFrom
	}

	// Assign features
	if err := r.featureService.AssignFeaturesToRole(ctx, roleFeatureInput, currentUser.ID); err != nil {
		return nil, fmt.Errorf("failed to assign role features: %w", err)
	}

	// Retrieve and return the role features
	var roleFeatures []models.RoleFeature
	if err := r.featureService.GetDB().WithContext(ctx).
		Joins("JOIN rbac_roles ON rbac_roles.id = role_features.role_id").
		Where("rbac_roles.name = ? AND role_features.deleted_at IS NULL", input.RoleName).
		Preload("Feature").
		Find(&roleFeatures).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve role features: %w", err)
	}

	// Convert to GraphQL types
	gqlRoleFeatures := make([]*graphmodels.RoleFeature, len(roleFeatures))
	for i, rf := range roleFeatures {
		gqlRoleFeatures[i] = r.convertToGraphQLRoleFeature(&rf)
	}

	return gqlRoleFeatures, nil
}

// RemoveRoleFeatures removes features from a role
func (r *FeatureResolver) RemoveRoleFeatures(ctx context.Context, roleName string, features []string) (bool, error) {
	// Authorization: Only SUPER_ADMIN can remove role features
	currentUser, err := r.getCurrentUser(ctx)
	if err != nil {
		return false, err
	}

	if currentUser.Role != auth.UserRoleSuperAdmin {
		return false, fmt.Errorf("only SUPER_ADMIN can remove role features")
	}

	// Remove each feature
	for _, feature := range features {
		if err := r.featureService.RemoveFeatureFromRole(ctx, roleName, feature); err != nil {
			return false, fmt.Errorf("failed to remove feature %s: %w", feature, err)
		}
	}

	return true, nil
}

// BulkGrantUserFeatures grants features to multiple users
func (r *FeatureResolver) BulkGrantUserFeatures(
	ctx context.Context,
	userIDs []string,
	features []string,
	scope *graphmodels.FeatureScopeInput,
	reason *string,
) ([]*graphmodels.UserFeature, error) {
	// Authorization: Only SUPER_ADMIN can perform bulk operations
	currentUser, err := r.getCurrentUser(ctx)
	if err != nil {
		return nil, err
	}

	if currentUser.Role != auth.UserRoleSuperAdmin {
		return nil, fmt.Errorf("only SUPER_ADMIN can perform bulk feature grants")
	}

	// Convert scope
	var featureScope *models.FeatureScope
	if scope != nil {
		featureScope = &models.FeatureScope{
			Type: scope.Type,
			ID:   scope.ID,
		}
	}

	var grantedFeatures []*graphmodels.UserFeature

	// Grant each feature to each user
	for _, userID := range userIDs {
		for _, feature := range features {
			userFeatureInput := &models.UserFeatureInput{
				UserID:    userID,
				Feature:   feature,
				IsGranted: true,
				Scope:     featureScope,
				Reason:    stringPtrValue(reason),
			}

			if err := r.featureService.GrantUserFeature(ctx, userFeatureInput, currentUser.ID); err != nil {
				return nil, fmt.Errorf("failed to grant feature %s to user %s: %w", feature, userID, err)
			}

			// Retrieve the created user feature
			var userFeature models.UserFeature
			query := r.featureService.GetDB().WithContext(ctx).
				Where("user_id = ? AND deleted_at IS NULL", userID).
				Preload("Feature")

			if featureScope != nil {
				scopeUUID, _ := uuid.Parse(featureScope.ID)
				query = query.Where("feature_id = (SELECT id FROM features WHERE name = ? AND deleted_at IS NULL) AND scope_type = ? AND scope_id = ?",
					feature, featureScope.Type, scopeUUID)
			} else {
				query = query.Where("feature_id = (SELECT id FROM features WHERE name = ? AND deleted_at IS NULL) AND scope_type IS NULL",
					feature)
			}

			if err := query.Order("created_at DESC").First(&userFeature).Error; err == nil {
				grantedFeatures = append(grantedFeatures, r.convertToGraphQLUserFeature(&userFeature))
			}
		}
	}

	return grantedFeatures, nil
}

// =============================================================================
// Helper Functions
// =============================================================================

// requireAdminRole checks if the current user is an admin
func (r *FeatureResolver) requireAdminRole(ctx context.Context) error {
	user, err := r.getCurrentUser(ctx)
	if err != nil {
		return err
	}

	if !r.isAdmin(user) {
		return fmt.Errorf("insufficient permissions: admin role required")
	}

	return nil
}

// getCurrentUser retrieves the current user from context
func (r *FeatureResolver) getCurrentUser(ctx context.Context) (*auth.User, error) {
	// Try to get the user directly first
	user := ctx.Value("user")
	if user != nil {
		gqlUser, ok := user.(*auth.User)
		if !ok {
			return nil, fmt.Errorf("invalid user type in context")
		}
		return gqlUser, nil
	}

	// Fallback: Try to get user by ID and fetch from database
	userID := ctx.Value("user_id")
	if userID == nil {
		return nil, fmt.Errorf("unauthorized: user not found in context")
	}

	// Convert userID to string
	userIDStr, ok := userID.(string)
	if !ok {
		return nil, fmt.Errorf("invalid user_id type in context")
	}

	// For now, create a minimal user object with the available context data
	// In a real implementation, you would fetch the full user from the database
	userRole := ctx.Value("user_role")
	userRoleStr, _ := userRole.(string)

	return &auth.User{
		ID:   userIDStr,
		Role: auth.UserRole(userRoleStr),
	}, nil
}

// isAdmin checks if a user has admin privileges
func (r *FeatureResolver) isAdmin(user *auth.User) bool {
	return user.Role == auth.UserRoleSuperAdmin || user.Role == auth.UserRoleCompanyAdmin
}

// validateFeatureName validates the feature name format
func (r *FeatureResolver) validateFeatureName(name string) error {
	// Feature names must be alphanumeric with dots and underscores only
	validNameRegex := regexp.MustCompile(`^[a-zA-Z0-9._]+$`)
	if !validNameRegex.MatchString(name) {
		return fmt.Errorf("invalid feature name: must contain only alphanumeric characters, dots, and underscores")
	}

	// Feature names should not start or end with dots
	if strings.HasPrefix(name, ".") || strings.HasSuffix(name, ".") {
		return fmt.Errorf("invalid feature name: cannot start or end with a dot")
	}

	// Feature names should not have consecutive dots
	if strings.Contains(name, "..") {
		return fmt.Errorf("invalid feature name: cannot contain consecutive dots")
	}

	return nil
}

// convertToGraphQLFeature converts a feature model to GraphQL type
func (r *FeatureResolver) convertToGraphQLFeature(f *models.Feature) *graphmodels.Feature {
	if f == nil {
		return nil
	}

	feature := &graphmodels.Feature{
		ID:          f.ID.String(),
		Name:        f.Name,
		DisplayName: f.DisplayName,
		Description: &f.Description,
		Module:      f.Module,
		IsActive:    f.IsActive,
		IsSystem:    f.IsSystem,
		CreatedAt:   f.CreatedAt,
		UpdatedAt:   f.UpdatedAt,
	}

	if f.ParentID != nil {
		parentID := f.ParentID.String()
		feature.ParentID = &parentID
	}

	if f.Parent != nil {
		feature.Parent = r.convertToGraphQLFeature(f.Parent)
	}

	if len(f.Children) > 0 {
		feature.Children = make([]*graphmodels.Feature, len(f.Children))
		for i, child := range f.Children {
			childCopy := child
			feature.Children[i] = r.convertToGraphQLFeature(&childCopy)
		}
	}

	// Convert metadata
	if f.Metadata.ResourceType != "" || len(f.Metadata.Actions) > 0 {
		// Convert complex metadata fields to JSON strings
		conditionsJSON, _ := json.Marshal(f.Metadata.Conditions)
		uiMetadataJSON, _ := json.Marshal(f.Metadata.UIMetadata)

		conditionsStr := string(conditionsJSON)
		uiMetadataStr := string(uiMetadataJSON)

		feature.Metadata = &graphmodels.FeatureMetadata{
			ResourceType:  &f.Metadata.ResourceType,
			Actions:       f.Metadata.Actions,
			RequiredScope: &f.Metadata.RequiredScope,
			Conditions:    &conditionsStr,
			UIMetadata:    &uiMetadataStr,
		}
	}

	return feature
}

// convertToGraphQLHierarchy converts a feature hierarchy to GraphQL type
func (r *FeatureResolver) convertToGraphQLHierarchy(h *models.FeatureHierarchy) *graphmodels.FeatureHierarchy {
	if h == nil {
		return nil
	}

	hierarchy := &graphmodels.FeatureHierarchy{
		Feature: r.convertToGraphQLFeature(h.Feature),
		Depth:   int32(h.Depth),
	}

	if len(h.Children) > 0 {
		hierarchy.Children = make([]*graphmodels.FeatureHierarchy, len(h.Children))
		for i, child := range h.Children {
			hierarchy.Children[i] = r.convertToGraphQLHierarchy(child)
		}
	}

	return hierarchy
}

// convertToGraphQLUserFeature converts a user feature to GraphQL type
func (r *FeatureResolver) convertToGraphQLUserFeature(uf *models.UserFeature) *graphmodels.UserFeature {
	if uf == nil {
		return nil
	}

	userFeature := &graphmodels.UserFeature{
		ID:        uf.ID.String(),
		UserID:    uf.UserID.String(),
		FeatureID: uf.FeatureID.String(),
		IsGranted: uf.IsGranted,
		GrantedBy: uf.GrantedBy.String(),
		GrantedAt: uf.CreatedAt,
		CreatedAt: uf.CreatedAt,
	}

	if uf.Feature != nil {
		userFeature.Feature = r.convertToGraphQLFeature(uf.Feature)
	}

	if uf.ScopeType != "" && uf.ScopeID != nil {
		userFeature.Scope = &graphmodels.FeatureScope{
			Type: uf.ScopeType,
			ID:   uf.ScopeID.String(),
		}
	}

	if uf.EffectiveFrom != nil {
		userFeature.EffectiveFrom = uf.EffectiveFrom
	}

	if uf.ExpiresAt != nil {
		userFeature.ExpiresAt = uf.ExpiresAt
	}

	if uf.Reason != "" {
		userFeature.Reason = &uf.Reason
	}

	return userFeature
}

// convertToGraphQLRoleFeature converts a role feature to GraphQL type
func (r *FeatureResolver) convertToGraphQLRoleFeature(rf *models.RoleFeature) *graphmodels.RoleFeature {
	if rf == nil {
		return nil
	}

	roleFeature := &graphmodels.RoleFeature{
		ID:        rf.ID.String(),
		RoleID:    rf.Role, // Use Role string field directly
		FeatureID: rf.FeatureID.String(),
		IsDenied:  rf.IsDenied,
		GrantedAt: rf.GrantedAt,
		GrantedBy: rf.GrantedBy.String(),
		CreatedAt: rf.CreatedAt,
	}

	if rf.Feature != nil {
		roleFeature.Feature = r.convertToGraphQLFeature(rf.Feature)
	}

	if rf.InheritedFromRole != nil {
		// Use InheritedFromRole string field directly
		roleFeature.InheritedFromRoleID = rf.InheritedFromRole
	}

	if rf.ExpiresAt != nil {
		roleFeature.ExpiresAt = rf.ExpiresAt
	}

	return roleFeature
}

// convertMetadataInputToMap converts GraphQL metadata input to map
func (r *FeatureResolver) convertMetadataInputToMap(input *graphmodels.FeatureMetadataInput) map[string]interface{} {
	metadata := make(map[string]interface{})

	if input.ResourceType != nil {
		metadata["resource_type"] = *input.ResourceType
	}

	if input.Actions != nil {
		metadata["actions"] = input.Actions
	}

	if input.RequiredScope != nil {
		metadata["required_scope"] = *input.RequiredScope
	}

	if input.Conditions != nil {
		metadata["conditions"] = input.Conditions
	}

	if input.UIMetadata != nil {
		metadata["ui_metadata"] = input.UIMetadata
	}

	return metadata
}

// stringPtrValue returns the value of a string pointer or empty string
func stringPtrValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// getStringValue returns the value of a string pointer or empty string
func getStringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

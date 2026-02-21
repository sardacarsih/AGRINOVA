package services

import (
	"context"
	"fmt"
	"time"

	"agrinovagraphql/server/internal/features/models"
	rbacmodels "agrinovagraphql/server/internal/rbac/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FeatureService provides feature management operations
type FeatureService struct {
	db                  *gorm.DB
	compositionService  *FeatureCompositionService
}

// NewFeatureService creates a new feature service
func NewFeatureService(db *gorm.DB) *FeatureService {
	return &FeatureService{
		db:                 db,
		compositionService: NewFeatureCompositionService(db),
	}
}

// Feature Management Operations

// CreateFeature creates a new feature
func (s *FeatureService) CreateFeature(ctx context.Context, input *models.FeatureInput, createdBy string) (*models.Feature, error) {
	feature := &models.Feature{
		Name:        input.Name,
		DisplayName: input.DisplayName,
		Description: input.Description,
		Module:      input.Module,
		IsActive:    input.IsActive,
		IsSystem:    false, // User-created features are not system features
	}

	// Set parent if provided
	if input.ParentID != nil && *input.ParentID != "" {
		parentUUID, err := uuid.Parse(*input.ParentID)
		if err != nil {
			return nil, fmt.Errorf("invalid parent ID: %w", err)
		}

		// Verify parent exists
		var parent models.Feature
		if err := s.db.WithContext(ctx).Where("id = ? AND deleted_at IS NULL", parentUUID).First(&parent).Error; err != nil {
			return nil, fmt.Errorf("parent feature not found: %w", err)
		}

		feature.ParentID = &parentUUID
	}

	// Set metadata
	if input.Metadata != nil {
		feature.Metadata = models.FeatureMetadata{
			Conditions: input.Metadata,
		}
	}

	// Create feature
	if err := s.db.WithContext(ctx).Create(feature).Error; err != nil {
		return nil, fmt.Errorf("failed to create feature: %w", err)
	}

	// Refresh caches
	if err := s.compositionService.RefreshAllCaches(ctx); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Warning: Failed to refresh caches after feature creation: %v\n", err)
	}

	return feature, nil
}

// GetFeature retrieves a feature by ID
func (s *FeatureService) GetFeature(ctx context.Context, featureID string) (*models.Feature, error) {
	id, err := uuid.Parse(featureID)
	if err != nil {
		return nil, fmt.Errorf("invalid feature ID: %w", err)
	}

	var feature models.Feature
	if err := s.db.WithContext(ctx).
		Preload("Parent").
		Preload("Children").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&feature).Error; err != nil {
		return nil, fmt.Errorf("feature not found: %w", err)
	}

	return &feature, nil
}

// GetFeatureByName retrieves a feature by name
func (s *FeatureService) GetFeatureByName(ctx context.Context, name string) (*models.Feature, error) {
	var feature models.Feature
	if err := s.db.WithContext(ctx).
		Preload("Parent").
		Preload("Children").
		Where("name = ? AND deleted_at IS NULL", name).
		First(&feature).Error; err != nil {
		return nil, fmt.Errorf("feature not found: %w", err)
	}

	return &feature, nil
}

// ListFeatures lists all features with optional filtering
func (s *FeatureService) ListFeatures(ctx context.Context, module *string, parentID *string, isActive *bool) ([]*models.Feature, error) {
	query := s.db.WithContext(ctx).Where("deleted_at IS NULL")

	if module != nil {
		query = query.Where("module = ?", *module)
	}

	if parentID != nil {
		if *parentID == "root" {
			query = query.Where("parent_id IS NULL")
		} else {
			query = query.Where("parent_id = ?", *parentID)
		}
	}

	if isActive != nil {
		query = query.Where("is_active = ?", *isActive)
	}

	var features []*models.Feature
	if err := query.Preload("Parent").Preload("Children").Find(&features).Error; err != nil {
		return nil, fmt.Errorf("failed to list features: %w", err)
	}

	return features, nil
}

// UpdateFeature updates a feature
func (s *FeatureService) UpdateFeature(ctx context.Context, featureID string, input *models.FeatureInput) (*models.Feature, error) {
	id, err := uuid.Parse(featureID)
	if err != nil {
		return nil, fmt.Errorf("invalid feature ID: %w", err)
	}

	var feature models.Feature
	if err := s.db.WithContext(ctx).Where("id = ? AND deleted_at IS NULL", id).First(&feature).Error; err != nil {
		return nil, fmt.Errorf("feature not found: %w", err)
	}

	// Prevent updating system features
	if feature.IsSystem {
		return nil, fmt.Errorf("cannot update system feature")
	}

	// Update fields
	feature.DisplayName = input.DisplayName
	feature.Description = input.Description
	feature.IsActive = input.IsActive

	if input.Metadata != nil {
		feature.Metadata = models.FeatureMetadata{
			Conditions: input.Metadata,
		}
	}

	if err := s.db.WithContext(ctx).Save(&feature).Error; err != nil {
		return nil, fmt.Errorf("failed to update feature: %w", err)
	}

	// Refresh caches and clear user caches
	if err := s.compositionService.RefreshAllCaches(ctx); err != nil {
		fmt.Printf("Warning: Failed to refresh caches after feature update: %v\n", err)
	}
	s.compositionService.ClearAllUserCaches()

	return &feature, nil
}

// DeleteFeature soft deletes a feature
func (s *FeatureService) DeleteFeature(ctx context.Context, featureID string) error {
	id, err := uuid.Parse(featureID)
	if err != nil {
		return fmt.Errorf("invalid feature ID: %w", err)
	}

	var feature models.Feature
	if err := s.db.WithContext(ctx).Where("id = ? AND deleted_at IS NULL", id).First(&feature).Error; err != nil {
		return fmt.Errorf("feature not found: %w", err)
	}

	// Prevent deleting system features
	if feature.IsSystem {
		return fmt.Errorf("cannot delete system feature")
	}

	// Soft delete
	if err := s.db.WithContext(ctx).Delete(&feature).Error; err != nil {
		return fmt.Errorf("failed to delete feature: %w", err)
	}

	// Refresh caches and clear user caches
	if err := s.compositionService.RefreshAllCaches(ctx); err != nil {
		fmt.Printf("Warning: Failed to refresh caches after feature deletion: %v\n", err)
	}
	s.compositionService.ClearAllUserCaches()

	return nil
}

// GetFeatureHierarchy retrieves the feature hierarchy tree
func (s *FeatureService) GetFeatureHierarchy(ctx context.Context, module *string) ([]*models.FeatureHierarchy, error) {
	query := s.db.WithContext(ctx).Where("parent_id IS NULL AND deleted_at IS NULL")

	if module != nil {
		query = query.Where("module = ?", *module)
	}

	var rootFeatures []*models.Feature
	if err := query.Preload("Children").Find(&rootFeatures).Error; err != nil {
		return nil, fmt.Errorf("failed to get root features: %w", err)
	}

	hierarchy := make([]*models.FeatureHierarchy, len(rootFeatures))
	for i, feature := range rootFeatures {
		hierarchy[i] = s.buildFeatureHierarchy(ctx, feature, 0)
	}

	return hierarchy, nil
}

// buildFeatureHierarchy recursively builds feature hierarchy
func (s *FeatureService) buildFeatureHierarchy(ctx context.Context, feature *models.Feature, depth int) *models.FeatureHierarchy {
	node := &models.FeatureHierarchy{
		Feature: feature,
		Depth:   depth,
	}

	// Load children if not already loaded
	if len(feature.Children) == 0 {
		var children []*models.Feature
		s.db.WithContext(ctx).Where("parent_id = ? AND deleted_at IS NULL", feature.ID).Find(&children)
		feature.Children = make([]models.Feature, len(children))
		for i, child := range children {
			feature.Children[i] = *child
		}
	}

	// Recursively build children
	if len(feature.Children) > 0 {
		node.Children = make([]*models.FeatureHierarchy, len(feature.Children))
		for i, child := range feature.Children {
			childCopy := child
			node.Children[i] = s.buildFeatureHierarchy(ctx, &childCopy, depth+1)
		}
	}

	return node
}

// Role Feature Assignment Operations

// AssignFeaturesToRole assigns multiple features to a role
func (s *FeatureService) AssignFeaturesToRole(ctx context.Context, input *models.RoleFeatureInput, assignedBy string) error {
	// Get role
	var role rbacmodels.Role
	if err := s.db.WithContext(ctx).Where("name = ? AND is_active = true", input.RoleName).First(&role).Error; err != nil {
		return fmt.Errorf("role not found: %w", err)
	}

	assignerUUID, err := uuid.Parse(assignedBy)
	if err != nil {
		return fmt.Errorf("invalid assigner ID: %w", err)
	}

	// Process each feature
	for _, featureName := range input.Features {
		var feature models.Feature
		if err := s.db.WithContext(ctx).Where("name = ? AND deleted_at IS NULL", featureName).First(&feature).Error; err != nil {
			return fmt.Errorf("feature %s not found: %w", featureName, err)
		}

		// Check if already assigned
		var existing models.RoleFeature
		err := s.db.WithContext(ctx).Where("role_id = ? AND feature_id = ? AND deleted_at IS NULL", role.ID, feature.ID).First(&existing).Error
		if err == nil {
			// Already assigned, skip
			continue
		}

		// Create assignment
		roleFeature := &models.RoleFeature{
			Role:      role.Name, // Use role name instead of role.ID
			FeatureID: feature.ID,
			IsDenied:  false,
			GrantedAt: time.Now(),
			GrantedBy: assignerUUID,
		}

		if err := s.db.WithContext(ctx).Create(roleFeature).Error; err != nil {
			return fmt.Errorf("failed to assign feature %s to role: %w", featureName, err)
		}
	}

	// Refresh caches and clear user caches
	if err := s.compositionService.RefreshAllCaches(ctx); err != nil {
		fmt.Printf("Warning: Failed to refresh caches after role feature assignment: %v\n", err)
	}
	s.compositionService.ClearAllUserCaches()

	return nil
}

// RemoveFeatureFromRole removes a feature from a role
func (s *FeatureService) RemoveFeatureFromRole(ctx context.Context, roleName, featureName string) error {
	// Get role and feature
	var role rbacmodels.Role
	if err := s.db.WithContext(ctx).Where("name = ? AND is_active = true", roleName).First(&role).Error; err != nil {
		return fmt.Errorf("role not found: %w", err)
	}

	var feature models.Feature
	if err := s.db.WithContext(ctx).Where("name = ? AND deleted_at IS NULL", featureName).First(&feature).Error; err != nil {
		return fmt.Errorf("feature not found: %w", err)
	}

	// Delete assignment
	if err := s.db.WithContext(ctx).Where("role_id = ? AND feature_id = ?", role.ID, feature.ID).Delete(&models.RoleFeature{}).Error; err != nil {
		return fmt.Errorf("failed to remove feature from role: %w", err)
	}

	// Refresh caches and clear user caches
	if err := s.compositionService.RefreshAllCaches(ctx); err != nil {
		fmt.Printf("Warning: Failed to refresh caches after role feature removal: %v\n", err)
	}
	s.compositionService.ClearAllUserCaches()

	return nil
}

// GetRoleFeatures retrieves all features assigned to a role
func (s *FeatureService) GetRoleFeatures(ctx context.Context, roleName string) ([]string, error) {
	return s.compositionService.getRoleFeatures(ctx, roleName)
}

// User Feature Override Operations

// GrantUserFeature grants a specific feature to a user
func (s *FeatureService) GrantUserFeature(ctx context.Context, input *models.UserFeatureInput, grantedBy string) error {
	return s.assignUserFeature(ctx, input, true, grantedBy)
}

// DenyUserFeature denies a specific feature to a user
func (s *FeatureService) DenyUserFeature(ctx context.Context, input *models.UserFeatureInput, deniedBy string) error {
	return s.assignUserFeature(ctx, input, false, deniedBy)
}

// assignUserFeature handles both grant and deny operations
func (s *FeatureService) assignUserFeature(ctx context.Context, input *models.UserFeatureInput, isGranted bool, assignedBy string) error {
	userUUID, err := uuid.Parse(input.UserID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	assignerUUID, err := uuid.Parse(assignedBy)
	if err != nil {
		return fmt.Errorf("invalid assigner ID: %w", err)
	}

	// Get feature
	var feature models.Feature
	if err := s.db.WithContext(ctx).Where("name = ? AND deleted_at IS NULL", input.Feature).First(&feature).Error; err != nil {
		return fmt.Errorf("feature not found: %w", err)
	}

	// Parse scope ID if provided
	var scopeID *uuid.UUID
	if input.Scope != nil && input.Scope.ID != "" {
		scopeUUID, err := uuid.Parse(input.Scope.ID)
		if err != nil {
			return fmt.Errorf("invalid scope ID: %w", err)
		}
		scopeID = &scopeUUID
	}

	// Check if already exists
	var existing models.UserFeature
	query := s.db.WithContext(ctx).Where("user_id = ? AND feature_id = ? AND deleted_at IS NULL", userUUID, feature.ID)

	if input.Scope != nil {
		query = query.Where("scope_type = ? AND scope_id = ?", input.Scope.Type, scopeID)
	} else {
		query = query.Where("scope_type IS NULL")
	}

	err = query.First(&existing).Error
	if err == nil {
		// Update existing
		existing.IsGranted = isGranted
		existing.EffectiveFrom = input.EffectiveFrom
		existing.ExpiresAt = input.ExpiresAt
		existing.Reason = input.Reason
		existing.GrantedBy = assignerUUID

		if err := s.db.WithContext(ctx).Save(&existing).Error; err != nil {
			return fmt.Errorf("failed to update user feature: %w", err)
		}
	} else {
		// Create new
		userFeature := &models.UserFeature{
			UserID:        userUUID,
			FeatureID:     feature.ID,
			IsGranted:     isGranted,
			EffectiveFrom: input.EffectiveFrom,
			ExpiresAt:     input.ExpiresAt,
			GrantedBy:     assignerUUID,
			Reason:        input.Reason,
		}

		if input.Scope != nil {
			userFeature.ScopeType = input.Scope.Type
			userFeature.ScopeID = scopeID
		}

		if err := s.db.WithContext(ctx).Create(userFeature).Error; err != nil {
			return fmt.Errorf("failed to create user feature: %w", err)
		}
	}

	// Clear user cache
	s.compositionService.ClearUserCache(input.UserID)

	return nil
}

// RemoveUserFeature removes a user feature override
func (s *FeatureService) RemoveUserFeature(ctx context.Context, userID, featureName string, scope *models.FeatureScope) error {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	var feature models.Feature
	if err := s.db.WithContext(ctx).Where("name = ? AND deleted_at IS NULL", featureName).First(&feature).Error; err != nil {
		return fmt.Errorf("feature not found: %w", err)
	}

	query := s.db.WithContext(ctx).Where("user_id = ? AND feature_id = ?", userUUID, feature.ID)

	if scope != nil {
		var scopeID *uuid.UUID
		if scope.ID != "" {
			scopeUUID, err := uuid.Parse(scope.ID)
			if err != nil {
				return fmt.Errorf("invalid scope ID: %w", err)
			}
			scopeID = &scopeUUID
		}
		query = query.Where("scope_type = ? AND scope_id = ?", scope.Type, scopeID)
	}

	if err := query.Delete(&models.UserFeature{}).Error; err != nil {
		return fmt.Errorf("failed to remove user feature: %w", err)
	}

	// Clear user cache
	s.compositionService.ClearUserCache(userID)

	return nil
}

// Feature Access Check Operations

// HasFeature checks if a user has access to a feature
func (s *FeatureService) HasFeature(ctx context.Context, userID, featureName string, scope *models.FeatureScope) (bool, error) {
	return s.compositionService.HasFeature(ctx, userID, featureName, scope)
}

// CheckFeatureAccess performs a detailed feature access check
func (s *FeatureService) CheckFeatureAccess(ctx context.Context, request *models.FeatureCheckRequest) (*models.FeatureCheckResult, error) {
	hasAccess, err := s.compositionService.HasFeature(ctx, request.UserID, request.Feature, request.Scope)
	if err != nil {
		return nil, err
	}

	result := &models.FeatureCheckResult{
		UserID:    request.UserID,
		Feature:   request.Feature,
		HasAccess: hasAccess,
		CheckedAt: time.Now(),
	}

	if hasAccess {
		result.AccessReason = "User has required feature access"
	} else {
		result.DenialReason = "User does not have required feature access"
	}

	return result, nil
}

// GetUserFeatures retrieves all features for a user
func (s *FeatureService) GetUserFeatures(ctx context.Context, userID string) (*models.UserFeatureSet, error) {
	return s.compositionService.ComputeUserFeatures(ctx, userID)
}

// Statistics Operations

// GetFeatureStatistics retrieves feature system statistics
func (s *FeatureService) GetFeatureStatistics(ctx context.Context) (*models.FeatureStats, error) {
	stats := s.compositionService.GetCacheStatistics()

	// Get additional database statistics
	var totalFeatures, activeFeatures, systemFeatures int64
	s.db.WithContext(ctx).Model(&models.Feature{}).Where("deleted_at IS NULL").Count(&totalFeatures)
	s.db.WithContext(ctx).Model(&models.Feature{}).Where("is_active = true AND deleted_at IS NULL").Count(&activeFeatures)
	s.db.WithContext(ctx).Model(&models.Feature{}).Where("is_system = true AND deleted_at IS NULL").Count(&systemFeatures)

	var totalRoleFeatures, totalUserOverrides int64
	s.db.WithContext(ctx).Model(&models.RoleFeature{}).Where("deleted_at IS NULL").Count(&totalRoleFeatures)
	s.db.WithContext(ctx).Model(&models.UserFeature{}).Where("deleted_at IS NULL").Count(&totalUserOverrides)

	// Get features by module
	type ModuleCount struct {
		Module string
		Count  int64
	}
	var moduleCounts []ModuleCount
	s.db.WithContext(ctx).Model(&models.Feature{}).
		Select("module, count(*) as count").
		Where("deleted_at IS NULL").
		Group("module").
		Scan(&moduleCounts)

	featuresByModule := make(map[string]int)
	for _, mc := range moduleCounts {
		featuresByModule[mc.Module] = int(mc.Count)
	}

	stats.TotalFeatures = int(totalFeatures)
	stats.ActiveFeatures = int(activeFeatures)
	stats.SystemFeatures = int(systemFeatures)
	stats.CustomFeatures = int(totalFeatures - systemFeatures)
	stats.TotalRoleFeatures = int(totalRoleFeatures)
	stats.TotalUserOverrides = int(totalUserOverrides)
	stats.FeaturesByModule = featuresByModule

	return &stats, nil
}

// Cleanup

// GetDB returns the database instance for direct queries (used by resolvers)
func (s *FeatureService) GetDB() *gorm.DB {
	return s.db
}

// Stop stops the feature service and cleans up resources
func (s *FeatureService) Stop() {
	if s.compositionService != nil {
		s.compositionService.Stop()
	}
}

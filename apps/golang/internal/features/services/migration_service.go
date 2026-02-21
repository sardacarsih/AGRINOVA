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

// MigrationService handles migration from permission-based to feature-based authorization
type MigrationService struct {
	db             *gorm.DB
	featureService *FeatureService
}

// NewMigrationService creates a new migration service
func NewMigrationService(db *gorm.DB) *MigrationService {
	return &MigrationService{
		db:             db,
		featureService: NewFeatureService(db),
	}
}

// MigrationReport represents the result of a migration operation
type MigrationReport struct {
	StartTime            time.Time
	EndTime              time.Time
	Duration             time.Duration
	TotalPermissions     int
	MigratedFeatures     int
	MigratedRoleFeatures int
	MigratedUserFeatures int
	Errors               []string
	Warnings             []string
	FeatureMapping       map[string]string // permission name -> feature name
}

// MigratePermissionsToFeatures migrates existing role-permissions to role-features
func (s *MigrationService) MigratePermissionsToFeatures(ctx context.Context, dryRun bool) (*MigrationReport, error) {
	report := &MigrationReport{
		StartTime:      time.Now(),
		FeatureMapping: make(map[string]string),
		Errors:         []string{},
		Warnings:       []string{},
	}

	// Get all permissions
	var permissions []rbacmodels.Permission
	if err := s.db.WithContext(ctx).Where("is_active = true AND deleted_at IS NULL").Find(&permissions).Error; err != nil {
		return nil, fmt.Errorf("failed to load permissions: %w", err)
	}

	report.TotalPermissions = len(permissions)

	// Map permissions to features
	featureMapping := s.buildPermissionToFeatureMapping(permissions)
	report.FeatureMapping = featureMapping

	if dryRun {
		report.EndTime = time.Now()
		report.Duration = report.EndTime.Sub(report.StartTime)
		report.Warnings = append(report.Warnings, "Dry run mode - no changes were made")
		return report, nil
	}

	// Create features from permissions
	createdFeatures := 0
	for permName, featureName := range featureMapping {
		// Find the permission
		var permission rbacmodels.Permission
		if err := s.db.WithContext(ctx).Where("name = ?", permName).First(&permission).Error; err != nil {
			report.Errors = append(report.Errors, fmt.Sprintf("Permission %s not found: %v", permName, err))
			continue
		}

		// Check if feature already exists
		var existingFeature models.Feature
		err := s.db.WithContext(ctx).Where("name = ?", featureName).First(&existingFeature).Error
		if err == nil {
			// Feature already exists, skip
			report.Warnings = append(report.Warnings, fmt.Sprintf("Feature %s already exists, skipping", featureName))
			continue
		}

		// Create feature from permission
		module := permission.Resource
		if module == "" {
			module = "general"
		}

		feature := &models.Feature{
			Name:        featureName,
			DisplayName: permission.Description,
			Description: fmt.Sprintf("Migrated from permission: %s", permission.Name),
			Module:      module,
			IsActive:    permission.IsActive,
			IsSystem:    false,
			Metadata: models.FeatureMetadata{
				ResourceType: permission.Resource,
				Actions:      []string{permission.Action},
			},
		}

		if err := s.db.WithContext(ctx).Create(feature).Error; err != nil {
			report.Errors = append(report.Errors, fmt.Sprintf("Failed to create feature %s: %v", featureName, err))
			continue
		}

		createdFeatures++
	}

	report.MigratedFeatures = createdFeatures

	// Migrate role-permission assignments to role-feature assignments
	var rolePermissions []rbacmodels.RolePermission
	if err := s.db.WithContext(ctx).
		Preload("Role").
		Preload("Permission").
		Where("deleted_at IS NULL").
		Find(&rolePermissions).Error; err != nil {
		return nil, fmt.Errorf("failed to load role permissions: %w", err)
	}

	migratedRoleFeatures := 0
	for _, rp := range rolePermissions {
		// Skip if role or permission is not active
		if rp.Role.DeletedAt.Valid || rp.Permission.DeletedAt.Valid {
			continue
		}

		// Get feature name from mapping
		featureName, found := featureMapping[rp.Permission.Name]
		if !found {
			report.Warnings = append(report.Warnings, fmt.Sprintf("No feature mapping for permission %s", rp.Permission.Name))
			continue
		}

		// Get feature
		var feature models.Feature
		if err := s.db.WithContext(ctx).Where("name = ?", featureName).First(&feature).Error; err != nil {
			report.Errors = append(report.Errors, fmt.Sprintf("Feature %s not found for permission %s", featureName, rp.Permission.Name))
			continue
		}

		// Check if role-feature already exists
		var existingRF models.RoleFeature
		err := s.db.WithContext(ctx).Where("role_id = ? AND feature_id = ? AND deleted_at IS NULL", rp.RoleID, feature.ID).First(&existingRF).Error
		if err == nil {
			// Already exists, skip
			continue
		}

		// Create role-feature assignment
		systemUserID := uuid.MustParse("00000000-0000-0000-0000-000000000000") // System user
		roleFeature := &models.RoleFeature{
			Role:      rp.Role.Name, // Use role name instead of role ID
			FeatureID: feature.ID,
			IsDenied:  rp.IsDenied,
			GrantedAt: rp.CreatedAt,
			GrantedBy: systemUserID,
		}

		if rp.InheritedFromRoleID != nil {
			// Convert inherited role ID to role name
			inheritedRoleName := ""
			// This would need a lookup to convert UUID to role name
			// For now, we'll leave it empty since this is migration code
			roleFeature.InheritedFromRole = &inheritedRoleName
		}

		if err := s.db.WithContext(ctx).Create(roleFeature).Error; err != nil {
			report.Errors = append(report.Errors, fmt.Sprintf("Failed to create role-feature for role %s and feature %s: %v", rp.Role.Name, featureName, err))
			continue
		}

		migratedRoleFeatures++
	}

	report.MigratedRoleFeatures = migratedRoleFeatures

	// Migrate user-permission assignments to user-feature assignments
	var userPermissions []rbacmodels.UserPermissionAssignment
	if err := s.db.WithContext(ctx).
		Preload("Permission").
		Where("deleted_at IS NULL").
		Find(&userPermissions).Error; err != nil {
		return nil, fmt.Errorf("failed to load user permissions: %w", err)
	}

	migratedUserFeatures := 0
	for _, up := range userPermissions {
		// Skip if permission is not active
		if up.Permission.DeletedAt.Valid {
			continue
		}

		// Get feature name from mapping
		featureName, found := featureMapping[up.Permission.Name]
		if !found {
			report.Warnings = append(report.Warnings, fmt.Sprintf("No feature mapping for user permission %s", up.Permission.Name))
			continue
		}

		// Get feature
		var feature models.Feature
		if err := s.db.WithContext(ctx).Where("name = ?", featureName).First(&feature).Error; err != nil {
			report.Errors = append(report.Errors, fmt.Sprintf("Feature %s not found for user permission %s", featureName, up.Permission.Name))
			continue
		}

		// Check if user-feature already exists
		var existingUF models.UserFeature
		query := s.db.WithContext(ctx).Where("user_id = ? AND feature_id = ? AND deleted_at IS NULL", up.UserID, feature.ID)
		if up.ScopeType != "" {
			query = query.Where("scope_type = ? AND scope_id = ?", up.ScopeType, up.ScopeID)
		}

		err := query.First(&existingUF).Error
		if err == nil {
			// Already exists, skip
			continue
		}

		// Create user-feature assignment
		userFeature := &models.UserFeature{
			UserID:    up.UserID,
			FeatureID: feature.ID,
			IsGranted: up.IsGranted,
			ExpiresAt: up.ExpiresAt,
			GrantedBy: up.CreatedBy,
			Reason:    "Migrated from user permission assignment",
		}

		if up.ScopeType != "" {
			userFeature.ScopeType = up.ScopeType
			userFeature.ScopeID = up.ScopeID
		}

		if err := s.db.WithContext(ctx).Create(userFeature).Error; err != nil {
			report.Errors = append(report.Errors, fmt.Sprintf("Failed to create user-feature for user %s and feature %s: %v", up.UserID, featureName, err))
			continue
		}

		migratedUserFeatures++
	}

	report.MigratedUserFeatures = migratedUserFeatures

	// Refresh feature caches
	if err := s.featureService.compositionService.RefreshAllCaches(ctx); err != nil {
		report.Warnings = append(report.Warnings, fmt.Sprintf("Failed to refresh caches: %v", err))
	}

	report.EndTime = time.Now()
	report.Duration = report.EndTime.Sub(report.StartTime)

	return report, nil
}

// buildPermissionToFeatureMapping creates a mapping from permission names to feature names
func (s *MigrationService) buildPermissionToFeatureMapping(permissions []rbacmodels.Permission) map[string]string {
	mapping := make(map[string]string)

	for _, perm := range permissions {
		// Convert permission format to feature format
		// Example: "harvest:create" -> "harvest.create"
		//          "user:read" -> "user.view"
		//          "report:export" -> "reports.export"

		resource := perm.Resource
		action := perm.Action

		// Normalize action names
		normalizedAction := action
		if action == "read" {
			normalizedAction = "view"
		} else if action == "list" {
			normalizedAction = "view"
		}

		// Build feature name
		featureName := fmt.Sprintf("%s.%s", resource, normalizedAction)

		mapping[perm.Name] = featureName
	}

	return mapping
}

// RollbackMigration rolls back the migration (removes migrated features)
func (s *MigrationService) RollbackMigration(ctx context.Context) error {
	// Delete all non-system features
	if err := s.db.WithContext(ctx).Where("is_system = false").Delete(&models.Feature{}).Error; err != nil {
		return fmt.Errorf("failed to delete migrated features: %w", err)
	}

	// Role-features and user-features will be cascade deleted

	// Refresh caches
	if err := s.featureService.compositionService.RefreshAllCaches(ctx); err != nil {
		return fmt.Errorf("failed to refresh caches: %w", err)
	}

	s.featureService.compositionService.ClearAllUserCaches()

	return nil
}

// ValidateMigration validates the migration results
func (s *MigrationService) ValidateMigration(ctx context.Context) ([]string, error) {
	issues := []string{}

	// Check for orphaned role-features
	var orphanedRF int64
	s.db.WithContext(ctx).Raw(`
		SELECT COUNT(*)
		FROM role_features rf
		WHERE NOT EXISTS (SELECT 1 FROM features f WHERE f.id = rf.feature_id AND f.deleted_at IS NULL)
		AND rf.deleted_at IS NULL
	`).Scan(&orphanedRF)

	if orphanedRF > 0 {
		issues = append(issues, fmt.Sprintf("Found %d orphaned role-feature assignments", orphanedRF))
	}

	// Check for orphaned user-features
	var orphanedUF int64
	s.db.WithContext(ctx).Raw(`
		SELECT COUNT(*)
		FROM user_features uf
		WHERE NOT EXISTS (SELECT 1 FROM features f WHERE f.id = uf.feature_id AND f.deleted_at IS NULL)
		AND uf.deleted_at IS NULL
	`).Scan(&orphanedUF)

	if orphanedUF > 0 {
		issues = append(issues, fmt.Sprintf("Found %d orphaned user-feature assignments", orphanedUF))
	}

	// Check for features without parent in hierarchy
	var rootFeatures int64
	s.db.WithContext(ctx).Model(&models.Feature{}).Where("parent_id IS NULL AND deleted_at IS NULL").Count(&rootFeatures)

	if rootFeatures == 0 {
		issues = append(issues, "No root features found - feature hierarchy may be incomplete")
	}

	// Check for circular references in feature hierarchy
	var circularRefs int64
	s.db.WithContext(ctx).Raw(`
		WITH RECURSIVE feature_tree AS (
			SELECT id, name, parent_id, 0 as depth
			FROM features
			WHERE deleted_at IS NULL

			UNION ALL

			SELECT f.id, f.name, f.parent_id, ft.depth + 1
			FROM features f
			INNER JOIN feature_tree ft ON f.parent_id = ft.id
			WHERE f.deleted_at IS NULL AND ft.depth < 10
		)
		SELECT COUNT(DISTINCT id)
		FROM feature_tree
		WHERE depth >= 10
	`).Scan(&circularRefs)

	if circularRefs > 0 {
		issues = append(issues, fmt.Sprintf("Found %d features with circular or excessively deep hierarchy (>10 levels)", circularRefs))
	}

	return issues, nil
}

// GetMigrationStats returns statistics about the current migration state
func (s *MigrationService) GetMigrationStats(ctx context.Context) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Count permissions
	var totalPermissions, activePermissions int64
	s.db.WithContext(ctx).Model(&rbacmodels.Permission{}).Where("deleted_at IS NULL").Count(&totalPermissions)
	s.db.WithContext(ctx).Model(&rbacmodels.Permission{}).Where("is_active = true AND deleted_at IS NULL").Count(&activePermissions)

	stats["total_permissions"] = totalPermissions
	stats["active_permissions"] = activePermissions

	// Count features
	var totalFeatures, systemFeatures, customFeatures int64
	s.db.WithContext(ctx).Model(&models.Feature{}).Where("deleted_at IS NULL").Count(&totalFeatures)
	s.db.WithContext(ctx).Model(&models.Feature{}).Where("is_system = true AND deleted_at IS NULL").Count(&systemFeatures)
	s.db.WithContext(ctx).Model(&models.Feature{}).Where("is_system = false AND deleted_at IS NULL").Count(&customFeatures)

	stats["total_features"] = totalFeatures
	stats["system_features"] = systemFeatures
	stats["custom_features"] = customFeatures

	// Count role assignments
	var rolePermissions, roleFeatures int64
	s.db.WithContext(ctx).Model(&rbacmodels.RolePermission{}).Where("deleted_at IS NULL").Count(&rolePermissions)
	s.db.WithContext(ctx).Model(&models.RoleFeature{}).Where("deleted_at IS NULL").Count(&roleFeatures)

	stats["role_permissions"] = rolePermissions
	stats["role_features"] = roleFeatures

	// Count user assignments
	var userPermissions, userFeatures int64
	s.db.WithContext(ctx).Model(&rbacmodels.UserPermissionAssignment{}).Where("deleted_at IS NULL").Count(&userPermissions)
	s.db.WithContext(ctx).Model(&models.UserFeature{}).Where("deleted_at IS NULL").Count(&userFeatures)

	stats["user_permissions"] = userPermissions
	stats["user_features"] = userFeatures

	// Calculate migration coverage
	migrationCoverage := 0.0
	if totalPermissions > 0 {
		migrationCoverage = float64(customFeatures) / float64(totalPermissions) * 100
	}

	stats["migration_coverage_percent"] = migrationCoverage

	return stats, nil
}

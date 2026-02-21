package services

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"sync"
	"time"

	"agrinovagraphql/server/internal/rbac/models"
	"agrinovagraphql/server/internal/rbac/repositories"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PermissionCacheEntry represents a cached permission result
type PermissionCacheEntry struct {
	Permission string
	HasAccess  bool
	ExpiresAt  time.Time
}

// UserPermissionCache holds cached permissions for a user
type UserPermissionCache struct {
	Permissions map[string]PermissionCacheEntry
	UpdatedAt   time.Time
	mutex       sync.RWMutex
}

// RBACService provides role-based access control functionality
type RBACService struct {
	db         *gorm.DB
	repository *repositories.RBACRepository
	cache      map[string]*UserPermissionCache
	mutex      sync.RWMutex
}

// NewRBACService creates a new RBAC service instance
func NewRBACService(db *gorm.DB) *RBACService {
	return &RBACService{
		db:         db,
		repository: repositories.NewRBACRepository(db),
		cache:      make(map[string]*UserPermissionCache),
	}
}

// HasPermission checks if a user has a specific permission
func (s *RBACService) HasPermission(ctx context.Context, userID string, permission string) (bool, error) {
	return s.HasPermissionWithScope(ctx, userID, permission, "", nil)
}

// HasPermissionWithScope checks if a user has a permission within a specific scope
func (s *RBACService) HasPermissionWithScope(ctx context.Context, userID string, permission string, scopeType string, scopeID *string) (bool, error) {
	// Get user's role
	role, err := s.getUserRole(ctx, userID)
	if err != nil {
		return false, fmt.Errorf("failed to get user role: %w", err)
	}

	// Normalize role name (database roles are lowercase, but user roles might be uppercase)
	role = strings.ToLower(role)

	// SUPER ADMIN bypass - super admins always have permission for everything
	if role == "super_admin" {
		return true, nil
	}

	// Check cache first
	if cachedPermission, found := s.getCachedPermission(userID, permission); found {
		return cachedPermission, nil
	}

	// Check role-based permissions
	hasPermission, err := s.checkRolePermission(ctx, role, permission)
	if err != nil {
		return false, fmt.Errorf("failed to check role permission: %w", err)
	}

	// Check user-specific overrides
	if hasPermission {
		// Check if user has been explicitly denied this permission
		denied, err := s.checkUserOverride(ctx, userID, permission, false, scopeType, scopeID)
		if err != nil {
			return false, fmt.Errorf("failed to check user denial: %w", err)
		}
		if denied {
			hasPermission = false
		}
	} else {
		// Check if user has been explicitly granted this permission
		granted, err := s.checkUserOverride(ctx, userID, permission, true, scopeType, scopeID)
		if err != nil {
			return false, fmt.Errorf("failed to check user grant: %w", err)
		}
		if granted {
			hasPermission = true
		}
	}

	// Cache the result
	s.setCachedPermission(userID, permission, hasPermission)

	return hasPermission, nil
}

// HasAnyPermission checks if user has any of the specified permissions
func (s *RBACService) HasAnyPermission(ctx context.Context, userID string, permissions []string) (bool, error) {
	for _, permission := range permissions {
		hasAccess, err := s.HasPermission(ctx, userID, permission)
		if err != nil {
			return false, err
		}
		if hasAccess {
			return true, nil
		}
	}
	return false, nil
}

// HasAllPermissions checks if user has all of the specified permissions
func (s *RBACService) HasAllPermissions(ctx context.Context, userID string, permissions []string) (bool, error) {
	for _, permission := range permissions {
		hasAccess, err := s.HasPermission(ctx, userID, permission)
		if err != nil {
			return false, err
		}
		if !hasAccess {
			return false, nil
		}
	}
	return true, nil
}

// GetRolePermissions returns all permissions for a role including inherited permissions
func (s *RBACService) GetRolePermissions(ctx context.Context, roleName string) ([]string, error) {
	var permissions []string

	// Get role and its level
	var roleLevel int
	err := s.db.WithContext(ctx).Raw("SELECT level FROM roles WHERE LOWER(name) = LOWER(?) AND is_active = true", roleName).Scan(&roleLevel).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get role level: %w", err)
	}

	// Higher authority roles (smaller level value) inherit lower-level role permissions.
	err = s.db.WithContext(ctx).Raw(`
		SELECT DISTINCT p.name
		FROM permissions p
		INNER JOIN role_permissions rp ON p.id = rp.permission_id
		INNER JOIN roles r ON rp.role_id = r.id
		WHERE r.level >= ? AND r.is_active = true AND p.is_active = true AND rp.is_denied = false
		ORDER BY p.name
	`, roleLevel).Scan(&permissions).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get role permissions: %w", err)
	}

	return permissions, nil
}

// GetUserPermissions returns all permissions for a user including overrides
func (s *RBACService) GetUserPermissions(ctx context.Context, userID string) ([]string, error) {
	// Get user's role
	role, err := s.getUserRole(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user role: %w", err)
	}

	// Get role permissions
	rolePermissions, err := s.GetRolePermissions(ctx, role)
	if err != nil {
		return nil, fmt.Errorf("failed to get role permissions: %w", err)
	}

	// Get user-specific grants
	var userGrants []string
	err = s.db.WithContext(ctx).Raw(`
		SELECT DISTINCT p.name
		FROM permissions p
		INNER JOIN user_permission_assignments upa ON p.id = upa.permission_id
		WHERE upa.user_id = ? AND upa.is_granted = true
		AND (upa.expires_at IS NULL OR upa.expires_at > NOW())
	`, userID).Scan(&userGrants).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get user grants: %w", err)
	}

	// Get user-specific denials
	var userDenials []string
	err = s.db.WithContext(ctx).Raw(`
		SELECT DISTINCT p.name
		FROM permissions p
		INNER JOIN user_permission_assignments upa ON p.id = upa.permission_id
		WHERE upa.user_id = ? AND upa.is_granted = false
		AND (upa.expires_at IS NULL OR upa.expires_at > NOW())
	`, userID).Scan(&userDenials).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get user denials: %w", err)
	}

	// Combine permissions
	permissionMap := make(map[string]bool)

	// Add role permissions
	for _, perm := range rolePermissions {
		permissionMap[perm] = true
	}

	// Add user grants
	for _, perm := range userGrants {
		permissionMap[perm] = true
	}

	// Remove user denials
	for _, perm := range userDenials {
		delete(permissionMap, perm)
	}

	// Convert to slice
	result := make([]string, 0, len(permissionMap))
	for perm := range permissionMap {
		result = append(result, perm)
	}

	return result, nil
}

// CanManageRole checks if a user can manage users with the specified target role
func (s *RBACService) CanManageRole(ctx context.Context, userID string, targetRoleName string) (bool, error) {
	// Get user's role and level
	userRole, err := s.getUserRole(ctx, userID)
	if err != nil {
		return false, fmt.Errorf("failed to get user role: %w", err)
	}

	userLevel, err := s.getRoleLevel(ctx, userRole)
	if err != nil {
		return false, fmt.Errorf("failed to get user role level: %w", err)
	}

	// Get target role level
	targetLevel, err := s.getRoleLevel(ctx, targetRoleName)
	if err != nil {
		return false, fmt.Errorf("failed to get target role level: %w", err)
	}

	// User can manage target if their level is lower (higher authority)
	return userLevel < targetLevel, nil
}

// AssignUserPermission assigns a permission override to a user
func (s *RBACService) AssignUserPermission(ctx context.Context, userID string, permissionName string, isGranted bool, scopeType string, scopeID *string, expiresAt *time.Time, assignedBy string) error {
	// Get permission ID
	var permissionID string
	err := s.db.WithContext(ctx).Raw("SELECT id FROM permissions WHERE name = ?", permissionName).Scan(&permissionID).Error
	if err != nil {
		return fmt.Errorf("permission not found: %s", permissionName)
	}

	// Insert user permission assignment
	query := `
		INSERT INTO user_permission_assignments
		(user_id, permission_id, is_granted, scope_type, scope_id, expires_at, created_by)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (user_id, permission_id, scope_type, scope_id)
		DO UPDATE SET is_granted = EXCLUDED.is_granted, expires_at = EXCLUDED.expires_at, created_by = EXCLUDED.created_by
	`

	var expiresAtValue *time.Time
	if expiresAt != nil {
		expiresAtValue = expiresAt
	}

	err = s.db.WithContext(ctx).Exec(query, userID, permissionID, isGranted, scopeType, scopeID, expiresAtValue, assignedBy).Error
	if err != nil {
		return fmt.Errorf("failed to assign user permission: %w", err)
	}

	// Clear cache for this user
	s.clearUserCache(userID)

	return nil
}

// RemoveUserPermission removes a user permission override
func (s *RBACService) RemoveUserPermission(ctx context.Context, userID string, permissionName string, scopeType string, scopeID *string) error {
	// Get permission ID
	var permissionID string
	err := s.db.WithContext(ctx).Raw("SELECT id FROM permissions WHERE name = ?", permissionName).Scan(&permissionID).Error
	if err != nil {
		return fmt.Errorf("permission not found: %s", permissionName)
	}

	// Delete user permission assignment
	err = s.db.WithContext(ctx).Exec(`
		DELETE FROM user_permission_assignments
		WHERE user_id = ? AND permission_id = ? AND
		(COALESCE(scope_type, '') = COALESCE(?, '')) AND
		(scope_id = ?::uuid OR (scope_id IS NULL AND ?::uuid IS NULL))
	`, userID, permissionID, scopeType, scopeID, scopeID).Error

	if err != nil {
		return fmt.Errorf("failed to remove user permission: %w", err)
	}

	// Clear cache for this user
	s.clearUserCache(userID)

	return nil
}

// GetRoleHierarchy returns the role hierarchy from highest to lowest authority
func (s *RBACService) GetRoleHierarchy(ctx context.Context) ([]map[string]interface{}, error) {
	var roles []struct {
		Name        string `json:"name"`
		DisplayName string `json:"display_name"`
		Level       int    `json:"level"`
		Description string `json:"description"`
	}

	err := s.db.WithContext(ctx).Raw(`
		SELECT name, display_name, level, description
		FROM roles
		WHERE is_active = true
		ORDER BY level ASC
	`).Scan(&roles).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get role hierarchy: %w", err)
	}

	result := make([]map[string]interface{}, len(roles))
	for i, role := range roles {
		result[i] = map[string]interface{}{
			"name":         role.Name,
			"display_name": role.DisplayName,
			"level":        role.Level,
			"description":  role.Description,
		}
	}

	return result, nil
}

// Private helper methods

func (s *RBACService) getUserRole(ctx context.Context, userID string) (string, error) {
	var role string
	err := s.db.WithContext(ctx).Raw("SELECT role FROM users WHERE id = ?", userID).Scan(&role).Error
	if err != nil {
		return "", err
	}
	return role, nil
}

func (s *RBACService) getRoleLevel(ctx context.Context, roleName string) (int, error) {
	var level int
	err := s.db.WithContext(ctx).Raw("SELECT level FROM roles WHERE LOWER(name) = LOWER(?) AND is_active = true", roleName).Scan(&level).Error
	if err != nil {
		return 0, err
	}
	return level, nil
}

func (s *RBACService) checkRolePermission(ctx context.Context, roleName string, permission string) (bool, error) {
	var hasPermission bool
	err := s.db.WithContext(ctx).Raw(`
		SELECT EXISTS (
			SELECT 1
			FROM role_permissions rp
			INNER JOIN roles r ON rp.role_id = r.id
			INNER JOIN permissions p ON rp.permission_id = p.id
			WHERE LOWER(r.name) = LOWER(?) AND p.name = ?
			AND r.is_active = true AND p.is_active = true
			AND rp.is_denied = false
		)
	`, roleName, permission).Scan(&hasPermission).Error

	if err != nil {
		return false, err
	}

	// If no direct permission, check inherited permissions from higher-level roles
	if !hasPermission {
		var roleLevel int
		err := s.db.WithContext(ctx).Raw("SELECT level FROM roles WHERE LOWER(name) = LOWER(?) AND is_active = true", roleName).Scan(&roleLevel).Error
		if err != nil {
			return false, err
		}

		err = s.db.WithContext(ctx).Raw(`
			SELECT EXISTS (
				SELECT 1
				FROM role_permissions rp
				INNER JOIN roles r ON rp.role_id = r.id
				INNER JOIN permissions p ON rp.permission_id = p.id
				WHERE r.level >= ? AND p.name = ?
				AND r.is_active = true AND p.is_active = true
				AND rp.is_denied = false
			)
		`, roleLevel, permission).Scan(&hasPermission).Error

		if err != nil {
			return false, err
		}
	}

	return hasPermission, nil
}

func (s *RBACService) checkUserOverride(ctx context.Context, userID string, permission string, isGranted bool, scopeType string, scopeID *string) (bool, error) {
	var hasOverride bool
	var expiresAt sql.NullTime

	err := s.db.WithContext(ctx).Raw(`
		SELECT is_granted, expires_at
		FROM user_permission_assignments upa
		INNER JOIN permissions p ON upa.permission_id = p.id
		WHERE upa.user_id = ? AND p.name = ? AND upa.is_granted = ?
		AND (COALESCE(scope_type, '') = COALESCE(?, ''))
		AND (scope_id = ?::uuid OR (scope_id IS NULL AND ?::uuid IS NULL))
	`, userID, permission, isGranted, scopeType, scopeID, scopeID).Row().Scan(&hasOverride, &expiresAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}

	// Check if override has expired
	if expiresAt.Valid && time.Now().After(expiresAt.Time) {
		return false, nil
	}

	return hasOverride, nil
}

// Cache methods

func (s *RBACService) getCachedPermission(userID string, permission string) (bool, bool) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	userCache, exists := s.cache[userID]
	if !exists {
		return false, false
	}

	userCache.mutex.RLock()
	defer userCache.mutex.RUnlock()

	cacheEntry, exists := userCache.Permissions[permission]
	if !exists {
		return false, false
	}

	// Check if cache entry has expired
	if time.Now().After(cacheEntry.ExpiresAt) {
		return false, false
	}

	return cacheEntry.HasAccess, true
}

func (s *RBACService) setCachedPermission(userID string, permission string, hasAccess bool) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	userCache, exists := s.cache[userID]
	if !exists {
		userCache = &UserPermissionCache{
			Permissions: make(map[string]PermissionCacheEntry),
			UpdatedAt:   time.Now(),
		}
		s.cache[userID] = userCache
	}

	userCache.mutex.Lock()
	defer userCache.mutex.Unlock()

	userCache.Permissions[permission] = PermissionCacheEntry{
		Permission: permission,
		HasAccess:  hasAccess,
		ExpiresAt:  time.Now().Add(5 * time.Minute), // 5-minute cache
	}
	userCache.UpdatedAt = time.Now()
}

func (s *RBACService) clearUserCache(userID string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	userCache, exists := s.cache[userID]
	if exists {
		userCache.mutex.Lock()
		defer userCache.mutex.Unlock()
		userCache.Permissions = make(map[string]PermissionCacheEntry)
		userCache.UpdatedAt = time.Now()
	}
}

// CleanupExpiredCache removes expired cache entries
func (s *RBACService) CleanupExpiredCache() {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	now := time.Now()
	for userID, userCache := range s.cache {
		userCache.mutex.Lock()

		// Remove expired entries
		for permission, entry := range userCache.Permissions {
			if now.After(entry.ExpiresAt) {
				delete(userCache.Permissions, permission)
			}
		}

		// Remove user cache if empty
		if len(userCache.Permissions) == 0 {
			delete(s.cache, userID)
		}

		userCache.mutex.Unlock()
	}
}

// GetCacheStats returns cache statistics
func (s *RBACService) GetCacheStats() map[string]interface{} {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	totalUsers := len(s.cache)
	totalPermissions := 0

	for _, userCache := range s.cache {
		userCache.mutex.RLock()
		totalPermissions += len(userCache.Permissions)
		userCache.mutex.RUnlock()
	}

	return map[string]interface{}{
		"cached_users":       totalUsers,
		"cached_permissions": totalPermissions,
		"cache_last_updated": time.Now().Format(time.RFC3339),
	}
}

// ClearUserCache publicly clears the permission cache for a specific user
func (s *RBACService) ClearUserCache(userID string) {
	s.clearUserCache(userID)
}

// ==================== Role CRUD Operations ====================

// CreateRoleWithValidation creates a new role with validation
func (s *RBACService) CreateRoleWithValidation(ctx context.Context, name, displayName string, level int, description *string, isSystem bool) (map[string]interface{}, error) {
	// Validate role name is not empty
	if name == "" {
		return nil, fmt.Errorf("role name cannot be empty")
	}

	// Check if role with same name already exists
	var count int64
	if err := s.db.WithContext(ctx).Model(&struct {
		Name string
	}{}).Table("roles").Where("name = ?", name).Count(&count).Error; err != nil {
		return nil, fmt.Errorf("failed to check existing role: %w", err)
	}
	if count > 0 {
		return nil, fmt.Errorf("role with name '%s' already exists", name)
	}

	// Create role
	query := `
		INSERT INTO roles (name, display_name, level, description, is_system, is_active)
		VALUES (?, ?, ?, ?, ?, true)
		RETURNING id, name, display_name, level, description, is_system, is_active, created_at, updated_at
	`

	var role map[string]interface{}
	var id, createdAt, updatedAt string
	var desc *string

	err := s.db.WithContext(ctx).Raw(query, name, displayName, level, description, isSystem).Row().
		Scan(&id, &name, &displayName, &level, &desc, &isSystem, new(bool), &createdAt, &updatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create role: %w", err)
	}

	role = map[string]interface{}{
		"id":           id,
		"name":         name,
		"display_name": displayName,
		"level":        level,
		"description":  desc,
		"is_system":    isSystem,
		"is_active":    true,
		"created_at":   createdAt,
		"updated_at":   updatedAt,
	}

	return role, nil
}

// UpdateRoleWithValidation updates a role with validation
func (s *RBACService) UpdateRoleWithValidation(ctx context.Context, name string, displayName *string, description *string, isActive *bool) (map[string]interface{}, error) {
	// Check if role exists
	var roleID string
	var isSystem bool
	err := s.db.WithContext(ctx).Raw("SELECT id, is_system FROM roles WHERE LOWER(name) = LOWER(?)", name).
		Row().Scan(&roleID, &isSystem)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("role '%s' not found", name)
		}
		return nil, fmt.Errorf("failed to find role: %w", err)
	}

	// Build update query dynamically
	updates := make(map[string]interface{})
	if displayName != nil {
		updates["display_name"] = *displayName
	}
	if description != nil {
		updates["description"] = *description
	}
	if isActive != nil {
		updates["is_active"] = *isActive
	}
	updates["updated_at"] = time.Now()

	// Execute update
	if err := s.db.WithContext(ctx).Table("roles").Where("LOWER(name) = LOWER(?)", name).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update role: %w", err)
	}

	// Fetch updated role
	var role map[string]interface{}
	var level int
	var updatedAt time.Time
	var active bool
	var desc, dName string

	err = s.db.WithContext(ctx).Raw("SELECT id, name, display_name, level, description, is_system, is_active, updated_at FROM roles WHERE LOWER(name) = LOWER(?)", name).
		Row().Scan(&roleID, &name, &dName, &level, &desc, &isSystem, &active, &updatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to fetch updated role: %w", err)
	}

	role = map[string]interface{}{
		"id":           roleID,
		"name":         name,
		"display_name": dName,
		"level":        level,
		"description":  desc,
		"is_system":    isSystem,
		"is_active":    active,
		"updated_at":   updatedAt.Format(time.RFC3339),
	}

	return role, nil
}

// DeleteRoleWithValidation deletes a role with validation (prevents deletion of system roles)
func (s *RBACService) DeleteRoleWithValidation(ctx context.Context, name string) error {
	// Check if role exists and is system role
	var isSystem bool
	err := s.db.WithContext(ctx).Raw("SELECT is_system FROM roles WHERE LOWER(name) = LOWER(?)", name).
		Row().Scan(&isSystem)

	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("role '%s' not found", name)
		}
		return fmt.Errorf("failed to find role: %w", err)
	}

	// Prevent deletion of system roles
	if isSystem {
		return fmt.Errorf("cannot delete system role '%s'", name)
	}

	// Soft delete the role
	if err := s.db.WithContext(ctx).Exec("UPDATE roles SET deleted_at = NOW() WHERE LOWER(name) = LOWER(?)", name).Error; err != nil {
		return fmt.Errorf("failed to delete role: %w", err)
	}

	return nil
}

// ==================== Permission CRUD Operations ====================

// CreatePermission creates a new permission
func (s *RBACService) CreatePermission(ctx context.Context, name, resource, action string, description *string) (map[string]interface{}, error) {
	// Validate permission name
	if name == "" {
		return nil, fmt.Errorf("permission name cannot be empty")
	}

	// Check if permission with same name already exists
	var count int64
	if err := s.db.WithContext(ctx).Model(&struct {
		Name string
	}{}).Table("permissions").Where("name = ?", name).Count(&count).Error; err != nil {
		return nil, fmt.Errorf("failed to check existing permission: %w", err)
	}
	if count > 0 {
		return nil, fmt.Errorf("permission with name '%s' already exists", name)
	}

	// Create permission
	query := `
		INSERT INTO permissions (name, resource, action, description, is_active)
		VALUES (?, ?, ?, ?, true)
		RETURNING id, name, resource, action, description, is_active, created_at
	`

	var id, createdAt string
	var desc *string

	err := s.db.WithContext(ctx).Raw(query, name, resource, action, description).Row().
		Scan(&id, &name, &resource, &action, &desc, new(bool), &createdAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create permission: %w", err)
	}

	perm := map[string]interface{}{
		"id":          id,
		"name":        name,
		"resource":    resource,
		"action":      action,
		"description": desc,
		"is_active":   true,
		"created_at":  createdAt,
	}

	return perm, nil
}

// UpdatePermission updates a permission
func (s *RBACService) UpdatePermission(ctx context.Context, name string, description *string, isActive *bool) (map[string]interface{}, error) {
	// Check if permission exists
	var permID string
	err := s.db.WithContext(ctx).Raw("SELECT id FROM permissions WHERE name = ?", name).
		Row().Scan(&permID)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("permission '%s' not found", name)
		}
		return nil, fmt.Errorf("failed to find permission: %w", err)
	}

	// Build update query
	updates := make(map[string]interface{})
	if description != nil {
		updates["description"] = *description
	}
	if isActive != nil {
		updates["is_active"] = *isActive
	}
	updates["updated_at"] = time.Now()

	// Execute update
	if err := s.db.WithContext(ctx).Table("permissions").Where("name = ?", name).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update permission: %w", err)
	}

	// Fetch updated permission
	var resource, action string
	var active bool
	var desc *string

	err = s.db.WithContext(ctx).Raw("SELECT id, name, resource, action, description, is_active FROM permissions WHERE name = ?", name).
		Row().Scan(&permID, &name, &resource, &action, &desc, &active)

	if err != nil {
		return nil, fmt.Errorf("failed to fetch updated permission: %w", err)
	}

	perm := map[string]interface{}{
		"id":          permID,
		"name":        name,
		"resource":    resource,
		"action":      action,
		"description": desc,
		"is_active":   active,
	}

	return perm, nil
}

// DeletePermission soft deletes a permission
func (s *RBACService) DeletePermission(ctx context.Context, name string) error {
	// Check if permission exists
	var count int64
	if err := s.db.WithContext(ctx).Model(&struct {
		Name string
	}{}).Table("permissions").Where("name = ?", name).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to check permission: %w", err)
	}
	if count == 0 {
		return fmt.Errorf("permission '%s' not found", name)
	}

	// Soft delete
	if err := s.db.WithContext(ctx).Exec("UPDATE permissions SET deleted_at = NOW() WHERE name = ?", name).Error; err != nil {
		return fmt.Errorf("failed to delete permission: %w", err)
	}

	return nil
}

// ==================== Role-Permission Assignment Operations ====================

// AssignRolePermissions assigns multiple permissions to a role
func (s *RBACService) AssignRolePermissions(ctx context.Context, roleName string, permissionNames []string) error {
	// Get role ID
	var roleID string
	err := s.db.WithContext(ctx).Raw("SELECT id FROM roles WHERE LOWER(name) = LOWER(?)", roleName).
		Row().Scan(&roleID)

	if err != nil {
		return fmt.Errorf("role '%s' not found", roleName)
	}

	// Get permission IDs
	permIDs := []string{}
	for _, permName := range permissionNames {
		var permID string
		err := s.db.WithContext(ctx).Raw("SELECT id FROM permissions WHERE name = ?", permName).
			Row().Scan(&permID)

		if err != nil {
			return fmt.Errorf("permission '%s' not found", permName)
		}
		permIDs = append(permIDs, permID)
	}

	// Assign permissions
	for _, permID := range permIDs {
		// Check if already assigned
		var count int64
		if err := s.db.WithContext(ctx).Raw("SELECT COUNT(*) FROM role_permissions WHERE role_id = ? AND permission_id = ?", roleID, permID).
			Scan(&count).Error; err != nil {
			return fmt.Errorf("failed to check existing assignment: %w", err)
		}

		if count == 0 {
			// Insert new assignment
			if err := s.db.WithContext(ctx).Exec("INSERT INTO role_permissions (role_id, permission_id, is_denied) VALUES (?, ?, false)", roleID, permID).
				Error; err != nil {
				return fmt.Errorf("failed to assign permission: %w", err)
			}
		}
	}

	return nil
}

// RemoveRolePermissions removes permissions from a role
func (s *RBACService) RemoveRolePermissions(ctx context.Context, roleName string, permissionNames []string) error {
	// Get role ID
	var roleID string
	err := s.db.WithContext(ctx).Raw("SELECT id FROM roles WHERE LOWER(name) = LOWER(?)", roleName).
		Row().Scan(&roleID)

	if err != nil {
		return fmt.Errorf("role '%s' not found", roleName)
	}

	// Get permission IDs
	for _, permName := range permissionNames {
		var permID string
		err := s.db.WithContext(ctx).Raw("SELECT id FROM permissions WHERE name = ?", permName).
			Row().Scan(&permID)

		if err != nil {
			continue // Skip if permission not found
		}

		// Remove assignment (only direct assignments, not inherited)
		if err := s.db.WithContext(ctx).Exec("DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ? AND inherited_from_role_id IS NULL",
			roleID, permID).Error; err != nil {
			return fmt.Errorf("failed to remove permission: %w", err)
		}
	}

	return nil
}

// ==================== Statistics Operations ====================

// GetRBACStatistics retrieves comprehensive RBAC statistics
func (s *RBACService) GetRBACStatistics(ctx context.Context) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Count total roles
	var totalRoles int64
	if err := s.db.WithContext(ctx).Table("roles").Count(&totalRoles).Error; err != nil {
		return nil, fmt.Errorf("failed to count roles: %w", err)
	}
	stats["total_roles"] = totalRoles

	// Count active roles
	var activeRoles int64
	if err := s.db.WithContext(ctx).Table("roles").Where("is_active = ?", true).Count(&activeRoles).Error; err != nil {
		return nil, fmt.Errorf("failed to count active roles: %w", err)
	}
	stats["active_roles"] = activeRoles

	// Count system roles
	var systemRoles int64
	if err := s.db.WithContext(ctx).Table("roles").Where("is_system = ?", true).Count(&systemRoles).Error; err != nil {
		return nil, fmt.Errorf("failed to count system roles: %w", err)
	}
	stats["system_roles"] = systemRoles
	stats["custom_roles"] = totalRoles - systemRoles

	// Count total permissions
	var totalPermissions int64
	if err := s.db.WithContext(ctx).Table("permissions").Count(&totalPermissions).Error; err != nil {
		return nil, fmt.Errorf("failed to count permissions: %w", err)
	}
	stats["total_permissions"] = totalPermissions

	// Count active permissions
	var activePermissions int64
	if err := s.db.WithContext(ctx).Table("permissions").Where("is_active = ?", true).Count(&activePermissions).Error; err != nil {
		return nil, fmt.Errorf("failed to count active permissions: %w", err)
	}
	stats["active_permissions"] = activePermissions

	// Count role-permission assignments
	var rolePermissions int64
	if err := s.db.WithContext(ctx).Table("role_permissions").Count(&rolePermissions).Error; err != nil {
		return nil, fmt.Errorf("failed to count role permissions: %w", err)
	}
	stats["total_role_permissions"] = rolePermissions

	// Count total user overrides
	var totalOverrides int64
	if err := s.db.WithContext(ctx).Table("user_permission_assignments").Count(&totalOverrides).Error; err != nil {
		return nil, fmt.Errorf("failed to count user overrides: %w", err)
	}
	stats["total_user_overrides"] = totalOverrides

	// Count active user overrides (not expired)
	var activeOverrides int64
	now := time.Now()
	if err := s.db.WithContext(ctx).Table("user_permission_assignments").
		Where("expires_at IS NULL OR expires_at > ?", now).
		Count(&activeOverrides).Error; err != nil {
		return nil, fmt.Errorf("failed to count active overrides: %w", err)
	}
	stats["active_user_overrides"] = activeOverrides
	stats["expired_user_overrides"] = totalOverrides - activeOverrides

	// Add cache stats
	stats["cache_stats"] = s.GetCacheStats()

	return stats, nil
}

// CheckUserPermissionWithReason checks permission and returns detailed reason
func (s *RBACService) CheckUserPermissionWithReason(ctx context.Context, userID string, permission string) (bool, string, error) {
	// Get user's role
	role, err := s.getUserRole(ctx, userID)
	if err != nil {
		return false, "Failed to retrieve user role", err
	}

	// Check role-based permission
	hasRolePermission, err := s.checkRolePermission(ctx, role, permission)
	if err != nil {
		return false, "Failed to check role permission", err
	}

	// Check for user-specific overrides
	hasGrant, err := s.checkUserOverride(ctx, userID, permission, true, "", nil)
	if err != nil {
		return false, "Failed to check user grant", err
	}

	hasDenial, err := s.checkUserOverride(ctx, userID, permission, false, "", nil)
	if err != nil {
		return false, "Failed to check user denial", err
	}

	// Determine final access
	var hasAccess bool
	var reason string

	if hasDenial {
		hasAccess = false
		reason = fmt.Sprintf("Explicitly denied by user override")
	} else if hasGrant {
		hasAccess = true
		reason = fmt.Sprintf("Explicitly granted by user override")
	} else if hasRolePermission {
		hasAccess = true
		reason = fmt.Sprintf("Granted by role '%s'", role)
	} else {
		hasAccess = false
		reason = fmt.Sprintf("Not granted by role '%s' and no user override", role)
	}

	return hasAccess, reason, nil
}

// ============================================================================
// Repository Wrapper Methods
// These methods wrap repository calls for use by resolvers
// ============================================================================

// GetAllRoles retrieves all roles using the repository
func (s *RBACService) GetAllRoles(ctx context.Context, activeOnly bool) ([]map[string]interface{}, error) {
	roles, err := s.repository.GetAllRoles(activeOnly)
	if err != nil {
		return nil, fmt.Errorf("failed to get all roles: %w", err)
	}

	result := make([]map[string]interface{}, len(roles))
	for i, role := range roles {
		result[i] = map[string]interface{}{
			"id":           role.ID.String(),
			"name":         role.Name,
			"display_name": role.DisplayName,
			"level":        role.Level,
			"description":  role.Description,
			"is_active":    role.IsActive,
			"is_system":    role.IsSystem,
			"created_at":   role.CreatedAt,
			"updated_at":   role.UpdatedAt,
		}
	}

	return result, nil
}

// GetRoleByName retrieves a role by name using the repository
func (s *RBACService) GetRoleByName(ctx context.Context, name string) (map[string]interface{}, error) {
	role, err := s.repository.GetRoleByName(name)
	if err != nil {
		return nil, fmt.Errorf("failed to get role by name: %w", err)
	}

	return map[string]interface{}{
		"id":           role.ID.String(),
		"name":         role.Name,
		"display_name": role.DisplayName,
		"level":        role.Level,
		"description":  role.Description,
		"is_active":    role.IsActive,
		"is_system":    role.IsSystem,
		"created_at":   role.CreatedAt,
		"updated_at":   role.UpdatedAt,
	}, nil
}

// GetAllPermissions retrieves all permissions using the repository
func (s *RBACService) GetAllPermissions(ctx context.Context, activeOnly bool) ([]map[string]interface{}, error) {
	perms, err := s.repository.GetAllPermissions(activeOnly)
	if err != nil {
		return nil, fmt.Errorf("failed to get all permissions: %w", err)
	}

	result := make([]map[string]interface{}, len(perms))
	for i, perm := range perms {
		result[i] = map[string]interface{}{
			"id":          perm.ID.String(),
			"name":        perm.Name,
			"resource":    perm.Resource,
			"action":      perm.Action,
			"description": perm.Description,
			"is_active":   perm.IsActive,
			"created_at":  perm.CreatedAt,
		}
	}

	return result, nil
}

// GetPermissionByName retrieves a permission by name using the repository
func (s *RBACService) GetPermissionByName(ctx context.Context, name string) (map[string]interface{}, error) {
	perm, err := s.repository.GetPermissionByName(name)
	if err != nil {
		return nil, fmt.Errorf("failed to get permission by name: %w", err)
	}

	return map[string]interface{}{
		"id":          perm.ID.String(),
		"name":        perm.Name,
		"resource":    perm.Resource,
		"action":      perm.Action,
		"description": perm.Description,
		"is_active":   perm.IsActive,
		"created_at":  perm.CreatedAt,
	}, nil
}

// GetUserRole exports the getUserRole method for resolvers
func (s *RBACService) GetUserRole(ctx context.Context, userID string) (string, error) {
	return s.getUserRole(ctx, userID)
}

// GetUserPermissionOverrides retrieves all permission overrides for a user
func (s *RBACService) GetUserPermissionOverrides(ctx context.Context, userID string) ([]map[string]interface{}, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	overrides, err := s.repository.GetActiveUserPermissionOverrides(userUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user permission overrides: %w", err)
	}

	result := make([]map[string]interface{}, len(overrides))
	for i, override := range overrides {
		overrideMap := map[string]interface{}{
			"id":            override.ID.String(),
			"user_id":       override.UserID.String(),
			"permission_id": override.PermissionID.String(),
			"permission":    override.Permission.Name, // Assuming permission is loaded
			"is_granted":    override.IsGranted,
			"created_at":    override.CreatedAt,
			"created_by":    override.CreatedBy.String(),
		}

		if override.ScopeType != "" {
			overrideMap["scope_type"] = override.ScopeType
		}
		if override.ScopeID != nil {
			overrideMap["scope_id"] = override.ScopeID.String()
		}
		if override.ExpiresAt != nil {
			overrideMap["expires_at"] = *override.ExpiresAt
		}
		if override.Reason != nil {
			overrideMap["reason"] = *override.Reason
		}

		result[i] = overrideMap
	}

	return result, nil
}

// ClearUserPermissions clears all permission overrides for a user
func (s *RBACService) ClearUserPermissions(ctx context.Context, userID string) error {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	if err := s.repository.ClearUserPermissionOverrides(userUUID); err != nil {
		return fmt.Errorf("failed to clear user permissions: %w", err)
	}

	// Clear cache for this user (manual cache invalidation)
	s.mutex.Lock()
	delete(s.cache, userID)
	s.mutex.Unlock()

	return nil
}

// ============================================================================
// ROLE HIERARCHY SERVICE METHODS (10)
// ============================================================================

// GetRolesAbove returns all roles with higher authority (lower level number) than the specified role
func (s *RBACService) GetRolesAbove(ctx context.Context, roleName string) ([]*models.Role, error) {
	// Get the target role to find its level
	targetRole, err := s.repository.GetRoleByName(roleName)
	if err != nil {
		return nil, fmt.Errorf("role not found: %w", err)
	}

	// Get all roles with level < target role level (higher authority)
	var roles []*models.Role
	err = s.db.Where("level < ? AND is_active = ?", targetRole.Level, true).
		Order("level ASC").
		Find(&roles).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query roles above: %w", err)
	}

	return roles, nil
}

// GetRolesBelow returns all roles with lower authority (higher level number) than the specified role
func (s *RBACService) GetRolesBelow(ctx context.Context, roleName string) ([]*models.Role, error) {
	// Get the target role to find its level
	targetRole, err := s.repository.GetRoleByName(roleName)
	if err != nil {
		return nil, fmt.Errorf("role not found: %w", err)
	}

	// Get all roles with level > target role level (lower authority)
	var roles []*models.Role
	err = s.db.Where("level > ? AND is_active = ?", targetRole.Level, true).
		Order("level ASC").
		Find(&roles).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query roles below: %w", err)
	}

	return roles, nil
}

// GetSubordinateRoles returns direct subordinate roles (one level below)
func (s *RBACService) GetSubordinateRoles(ctx context.Context, roleName string) ([]*models.Role, error) {
	// Get the target role to find its level
	targetRole, err := s.repository.GetRoleByName(roleName)
	if err != nil {
		return nil, fmt.Errorf("role not found: %w", err)
	}

	// Get all roles at exactly level + 1
	var roles []*models.Role
	err = s.db.Where("level = ? AND is_active = ?", targetRole.Level+1, true).
		Order("name ASC").
		Find(&roles).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query subordinate roles: %w", err)
	}

	return roles, nil
}

// GetSuperiorRoles returns direct superior roles (one level above)
func (s *RBACService) GetSuperiorRoles(ctx context.Context, roleName string) ([]*models.Role, error) {
	// Get the target role to find its level
	targetRole, err := s.repository.GetRoleByName(roleName)
	if err != nil {
		return nil, fmt.Errorf("role not found: %w", err)
	}

	// Get all roles at exactly level - 1
	var roles []*models.Role
	err = s.db.Where("level = ? AND is_active = ?", targetRole.Level-1, true).
		Order("name ASC").
		Find(&roles).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query superior roles: %w", err)
	}

	return roles, nil
}

// GetRolesAtLevel returns all roles at a specific hierarchy level
func (s *RBACService) GetRolesAtLevel(ctx context.Context, level int) ([]*models.Role, error) {
	var roles []*models.Role
	err := s.db.Where("level = ? AND is_active = ?", level, true).
		Order("name ASC").
		Find(&roles).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query roles at level %d: %w", level, err)
	}

	return roles, nil
}

// GetRolesByLevelRange returns all roles within a level range (inclusive)
func (s *RBACService) GetRolesByLevelRange(ctx context.Context, minLevel, maxLevel int) ([]*models.Role, error) {
	var roles []*models.Role
	err := s.db.Where("level >= ? AND level <= ? AND is_active = ?", minLevel, maxLevel, true).
		Order("level ASC, name ASC").
		Find(&roles).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query roles in level range: %w", err)
	}

	return roles, nil
}

// CanRoleManageRole checks if source role can manage target role based on hierarchy
func (s *RBACService) CanRoleManageRole(ctx context.Context, sourceRoleName, targetRoleName string) (bool, error) {
	// Get both roles
	sourceRole, err := s.repository.GetRoleByName(sourceRoleName)
	if err != nil {
		return false, fmt.Errorf("source role not found: %w", err)
	}

	targetRole, err := s.repository.GetRoleByName(targetRoleName)
	if err != nil {
		return false, fmt.Errorf("target role not found: %w", err)
	}

	// A role can manage another role if it has higher authority (lower level number)
	// In Agrinova: SUPER_ADMIN (1) can manage MANAGER (4), but not vice versa
	canManage := sourceRole.Level < targetRole.Level

	return canManage, nil
}

// GetRoleRelationship returns detailed relationship between two roles
func (s *RBACService) GetRoleRelationship(ctx context.Context, sourceRoleName, targetRoleName string) (*models.RoleRelationship, error) {
	// Get both roles
	sourceRole, err := s.repository.GetRoleByName(sourceRoleName)
	if err != nil {
		return nil, fmt.Errorf("source role not found: %w", err)
	}

	targetRole, err := s.repository.GetRoleByName(targetRoleName)
	if err != nil {
		return nil, fmt.Errorf("target role not found: %w", err)
	}

	// Calculate relationship
	levelDifference := sourceRole.Level - targetRole.Level
	var relationship string
	var canManage bool

	if levelDifference < 0 {
		// Source has higher authority (lower level number)
		relationship = "superior"
		canManage = true
	} else if levelDifference > 0 {
		// Source has lower authority (higher level number)
		relationship = "subordinate"
		canManage = false
	} else {
		// Same level
		relationship = "equal"
		canManage = false
	}

	return &models.RoleRelationship{
		SourceRole:      sourceRoleName,
		TargetRole:      targetRoleName,
		CanManage:       canManage,
		LevelDifference: levelDifference,
		Relationship:    relationship,
	}, nil
}

// GetEffectiveRolePermissions returns role permissions including inherited permissions from hierarchy
func (s *RBACService) GetEffectiveRolePermissions(ctx context.Context, roleName string) ([]string, error) {
	// Get the role to find its level
	role, err := s.repository.GetRoleByName(roleName)
	if err != nil {
		return nil, fmt.Errorf("role not found: %w", err)
	}

	// Get direct permissions for this role
	directPermissions, err := s.repository.GetRolePermissions(role.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get role permissions: %w", err)
	}

	// Get all roles with higher authority (lower level) - these could be inherited
	var superiorRoles []*models.Role
	err = s.db.Where("level < ? AND is_active = ?", role.Level, true).
		Order("level ASC").
		Find(&superiorRoles).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query superior roles: %w", err)
	}

	// Collect all permissions (use map to avoid duplicates)
	permissionSet := make(map[string]bool)
	for _, perm := range directPermissions {
		permissionSet[perm.Name] = true
	}

	// Add inherited permissions from superior roles
	// Note: In a full implementation, you might want to make inheritance configurable
	for _, superiorRole := range superiorRoles {
		superiorPerms, err := s.repository.GetRolePermissions(superiorRole.ID)
		if err != nil {
			continue // Skip on error
		}
		for _, perm := range superiorPerms {
			permissionSet[perm.Name] = true
		}
	}

	// Convert map to slice
	effectivePermissions := make([]string, 0, len(permissionSet))
	for perm := range permissionSet {
		effectivePermissions = append(effectivePermissions, perm)
	}

	return effectivePermissions, nil
}

// GetRoleHierarchyTree returns complete role hierarchy as a tree structure
func (s *RBACService) GetRoleHierarchyTree(ctx context.Context) ([]*models.RoleHierarchyNode, error) {
	// Get all active roles ordered by level
	var allRoles []*models.Role
	err := s.db.Where("is_active = ?", true).
		Order("level ASC, name ASC").
		Find(&allRoles).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query roles: %w", err)
	}

	if len(allRoles) == 0 {
		return []*models.RoleHierarchyNode{}, nil
	}

	// Group roles by level
	rolesByLevel := make(map[int][]*models.Role)
	minLevel := allRoles[0].Level
	maxLevel := allRoles[0].Level

	for _, role := range allRoles {
		rolesByLevel[role.Level] = append(rolesByLevel[role.Level], role)
		if role.Level < minLevel {
			minLevel = role.Level
		}
		if role.Level > maxLevel {
			maxLevel = role.Level
		}
	}

	// Build tree starting from top level (lowest number)
	topLevelRoles := rolesByLevel[minLevel]
	tree := make([]*models.RoleHierarchyNode, len(topLevelRoles))

	for i, role := range topLevelRoles {
		node, err := s.buildHierarchyNode(role, rolesByLevel, maxLevel)
		if err != nil {
			return nil, err
		}
		tree[i] = node
	}

	return tree, nil
}

// buildHierarchyNode recursively builds a hierarchy node with children
func (s *RBACService) buildHierarchyNode(role *models.Role, rolesByLevel map[int][]*models.Role, maxLevel int) (*models.RoleHierarchyNode, error) {
	// Get permissions for this role
	permissionObjs, err := s.repository.GetRolePermissions(role.ID)
	permissionNames := []string{}
	if err == nil {
		// Convert Permission objects to permission name strings
		permissionNames = make([]string, len(permissionObjs))
		for i, perm := range permissionObjs {
			permissionNames[i] = perm.Name
		}
	}

	node := &models.RoleHierarchyNode{
		Role:        role,
		Level:       role.Level,
		Permissions: permissionNames,
		Children:    []*models.RoleHierarchyNode{},
	}

	// If this isn't the bottom level, add children
	if role.Level < maxLevel {
		childRoles := rolesByLevel[role.Level+1]
		if len(childRoles) > 0 {
			node.Children = make([]*models.RoleHierarchyNode, len(childRoles))
			for i, childRole := range childRoles {
				childNode, err := s.buildHierarchyNode(childRole, rolesByLevel, maxLevel)
				if err != nil {
					return nil, err
				}
				node.Children[i] = childNode
			}
		}
	}

	return node, nil
}

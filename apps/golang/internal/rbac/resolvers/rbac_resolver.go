package resolvers

import (
	"context"
	"fmt"
	"time"

	"agrinovagraphql/server/internal/middleware"
	"agrinovagraphql/server/internal/rbac/models"
	"agrinovagraphql/server/internal/rbac/services"
	"github.com/google/uuid"
)

// RBACResolver handles RBAC-related GraphQL operations
type RBACResolver struct {
	rbacService *services.RBACService
}

// NewRBACResolver creates a new RBAC resolver
func NewRBACResolver(rbacService *services.RBACService) *RBACResolver {
	return &RBACResolver{
		rbacService: rbacService,
	}
}

// ============================================================================
// QUERY RESOLVERS - Roles
// ============================================================================

// RoleHierarchy resolves the roleHierarchy query
func (r *RBACResolver) RoleHierarchy(ctx context.Context) ([]*models.Role, error) {
	result, err := r.rbacService.GetRoleHierarchy(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get role hierarchy: %w", err)
	}

	// Convert map results to Role models
	roles := make([]*models.Role, 0, len(result))
	for _, roleMap := range result {
		role := &models.Role{
			Name:        roleMap["name"].(string),
			DisplayName: roleMap["display_name"].(string),
			Level:       roleMap["level"].(int),
		}
		if desc, ok := roleMap["description"].(string); ok {
			role.Description = desc
		}
		if isActive, ok := roleMap["is_active"].(bool); ok {
			role.IsActive = isActive
		}
		roles = append(roles, role)
	}

	return roles, nil
}

// Roles resolves the roles query
func (r *RBACResolver) Roles(ctx context.Context, activeOnly bool) ([]*models.Role, error) {
	result, err := r.rbacService.GetAllRoles(ctx, activeOnly)
	if err != nil {
		return nil, fmt.Errorf("failed to get roles: %w", err)
	}

	// Convert map results to Role models
	roles := make([]*models.Role, 0, len(result))
	for _, roleMap := range result {
		id, _ := uuid.Parse(roleMap["id"].(string))
		role := &models.Role{
			ID:          id,
			Name:        roleMap["name"].(string),
			DisplayName: roleMap["display_name"].(string),
			Level:       roleMap["level"].(int),
			IsActive:    roleMap["is_active"].(bool),
			CreatedAt:   roleMap["created_at"].(time.Time),
			UpdatedAt:   roleMap["updated_at"].(time.Time),
		}
		if desc, ok := roleMap["description"].(string); ok && desc != "" {
			role.Description = desc
		}
		if isSystem, ok := roleMap["is_system"].(bool); ok {
			role.IsSystem = isSystem
		}
		roles = append(roles, role)
	}

	return roles, nil
}

// Role resolves the role query
func (r *RBACResolver) Role(ctx context.Context, name string) (*models.Role, error) {
	result, err := r.rbacService.GetRoleByName(ctx, name)
	if err != nil {
		return nil, fmt.Errorf("failed to get role: %w", err)
	}

	id, _ := uuid.Parse(result["id"].(string))
	role := &models.Role{
		ID:          id,
		Name:        result["name"].(string),
		DisplayName: result["display_name"].(string),
		Level:       result["level"].(int),
		IsActive:    result["is_active"].(bool),
		CreatedAt:   result["created_at"].(time.Time),
		UpdatedAt:   result["updated_at"].(time.Time),
	}
	if desc, ok := result["description"].(string); ok && desc != "" {
		role.Description = desc
	}
	if isSystem, ok := result["is_system"].(bool); ok {
		role.IsSystem = isSystem
	}

	return role, nil
}

// ============================================================================
// QUERY RESOLVERS - Permissions
// ============================================================================

// Permissions resolves the permissions query
func (r *RBACResolver) Permissions(ctx context.Context, activeOnly bool) ([]*models.Permission, error) {
	result, err := r.rbacService.GetAllPermissions(ctx, activeOnly)
	if err != nil {
		return nil, fmt.Errorf("failed to get permissions: %w", err)
	}

	permissions := make([]*models.Permission, 0, len(result))
	for _, permMap := range result {
		id, _ := uuid.Parse(permMap["id"].(string))
		perm := &models.Permission{
			ID:        id,
			Name:      permMap["name"].(string),
			Resource:  permMap["resource"].(string),
			Action:    permMap["action"].(string),
			IsActive:  permMap["is_active"].(bool),
			CreatedAt: permMap["created_at"].(time.Time),
		}
		if desc, ok := permMap["description"].(string); ok && desc != "" {
			perm.Description = desc
		}
		permissions = append(permissions, perm)
	}

	return permissions, nil
}

// Permission resolves the permission query
func (r *RBACResolver) Permission(ctx context.Context, name string) (*models.Permission, error) {
	result, err := r.rbacService.GetPermissionByName(ctx, name)
	if err != nil {
		return nil, fmt.Errorf("failed to get permission: %w", err)
	}

	id, _ := uuid.Parse(result["id"].(string))
	perm := &models.Permission{
		ID:        id,
		Name:      result["name"].(string),
		Resource:  result["resource"].(string),
		Action:    result["action"].(string),
		IsActive:  result["is_active"].(bool),
		CreatedAt: result["created_at"].(time.Time),
	}
	if desc, ok := result["description"].(string); ok && desc != "" {
		perm.Description = desc
	}

	return perm, nil
}

// ============================================================================
// QUERY RESOLVERS - Role-Permission Relationships
// ============================================================================

// RolePermissions resolves the rolePermissions query
func (r *RBACResolver) RolePermissions(ctx context.Context, roleName string) ([]string, error) {
	permissions, err := r.rbacService.GetRolePermissions(ctx, roleName)
	if err != nil {
		return nil, fmt.Errorf("failed to get role permissions: %w", err)
	}
	return permissions, nil
}

// ============================================================================
// QUERY RESOLVERS - User Permissions
// ============================================================================

// UserPermissions resolves the userPermissions query
func (r *RBACResolver) UserPermissions(ctx context.Context, userID string) (*models.UserPermissions, error) {
	// Validate UUID
	if _, err := uuid.Parse(userID); err != nil {
		return nil, fmt.Errorf("invalid user ID format")
	}

	// Get user permissions from service
	permissions, err := r.rbacService.GetUserPermissions(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user permissions: %w", err)
	}

	// Get user role
	role, err := r.rbacService.GetUserRole(ctx, userID)
	if err != nil {
		// If user not found, use "UNKNOWN" role
		role = "UNKNOWN"
	}

	// Get user overrides
	overridesResult, err := r.rbacService.GetUserPermissionOverrides(ctx, userID)
	var overrides []models.UserPermissionOverride
	if err == nil {
		overrides = make([]models.UserPermissionOverride, 0, len(overridesResult))
		for _, override := range overridesResult {
			overrideModel := models.UserPermissionOverride{
				Permission: override["permission"].(string),
				IsGranted:  override["is_granted"].(bool),
			}
			if scopeType, ok := override["scope_type"].(string); ok && scopeType != "" {
				if scopeID, ok := override["scope_id"].(string); ok && scopeID != "" {
					overrideModel.Scope = &models.PermissionScope{
						Type: scopeType,
						ID:   scopeID,
					}
				}
			}
			if expiresAt, ok := override["expires_at"].(time.Time); ok {
				overrideModel.ExpiresAt = &expiresAt
			}
			overrides = append(overrides, overrideModel)
		}
	}

	return &models.UserPermissions{
		UserID:      userID,
		Role:        role,
		Permissions: permissions,
		Overrides:   overrides,
	}, nil
}

// UserPermissionOverrides resolves the userPermissionOverrides query
func (r *RBACResolver) UserPermissionOverrides(ctx context.Context, userID string) ([]*models.UserPermissionAssignment, error) {
	// Validate UUID
	if _, err := uuid.Parse(userID); err != nil {
		return nil, fmt.Errorf("invalid user ID format")
	}

	overridesResult, err := r.rbacService.GetUserPermissionOverrides(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user permission overrides: %w", err)
	}

	assignments := make([]*models.UserPermissionAssignment, 0, len(overridesResult))
	for _, override := range overridesResult {
		assignmentID, _ := uuid.Parse(override["id"].(string))
		userUUID, _ := uuid.Parse(override["user_id"].(string))
		permID, _ := uuid.Parse(override["permission_id"].(string))
		createdBy, _ := uuid.Parse(override["created_by"].(string))

		assignment := &models.UserPermissionAssignment{
			ID:           assignmentID,
			UserID:       userUUID,
			PermissionID: permID,
			IsGranted:    override["is_granted"].(bool),
			CreatedAt:    override["created_at"].(time.Time),
			CreatedBy:    createdBy,
		}

		if scopeType, ok := override["scope_type"].(string); ok && scopeType != "" {
			assignment.ScopeType = scopeType
		}
		if scopeID, ok := override["scope_id"].(string); ok && scopeID != "" {
			scopeUUID, _ := uuid.Parse(scopeID)
			assignment.ScopeID = &scopeUUID
		}
		if expiresAt, ok := override["expires_at"].(time.Time); ok {
			assignment.ExpiresAt = &expiresAt
		}
		if reason, ok := override["reason"].(string); ok && reason != "" {
			assignment.Reason = &reason
		}

		assignments = append(assignments, assignment)
	}

	return assignments, nil
}

// CheckPermission resolves the checkPermission query
func (r *RBACResolver) CheckPermission(ctx context.Context, input models.PermissionCheck) (*models.PermissionCheckResult, error) {
	// Validate user ID
	if _, err := uuid.Parse(input.UserID); err != nil {
		return nil, fmt.Errorf("invalid user ID format")
	}

	// Use the enhanced check method with reason
	hasAccess, reason, err := r.rbacService.CheckUserPermissionWithReason(ctx, input.UserID, input.Permission)
	if err != nil {
		return nil, fmt.Errorf("failed to check permission: %w", err)
	}

	return &models.PermissionCheckResult{
		UserID:     input.UserID,
		Permission: input.Permission,
		HasAccess:  hasAccess,
		Reason:     reason,
	}, nil
}

// CheckPermissions resolves the checkPermissions query
func (r *RBACResolver) CheckPermissions(ctx context.Context, input models.BatchPermissionCheck) (*models.BatchPermissionCheckResult, error) {
	// Validate user ID
	if _, err := uuid.Parse(input.UserID); err != nil {
		return nil, fmt.Errorf("invalid user ID format")
	}

	var hasAccess bool
	var err error
	var failedPerms []string

	if input.RequireAll {
		hasAccess, err = r.rbacService.HasAllPermissions(ctx, input.UserID, input.Permissions)
		if err != nil {
			return nil, fmt.Errorf("failed to check permissions: %w", err)
		}

		// If access was denied, find which permissions failed
		if !hasAccess {
			for _, perm := range input.Permissions {
				hasPerm, _ := r.rbacService.HasPermission(ctx, input.UserID, perm)
				if !hasPerm {
					failedPerms = append(failedPerms, perm)
				}
			}
		}
	} else {
		hasAccess, err = r.rbacService.HasAnyPermission(ctx, input.UserID, input.Permissions)
		if err != nil {
			return nil, fmt.Errorf("failed to check permissions: %w", err)
		}
	}

	return &models.BatchPermissionCheckResult{
		UserID:      input.UserID,
		Permissions: input.Permissions,
		HasAccess:   hasAccess,
		FailedPerms: failedPerms,
	}, nil
}

// CanManageRole resolves the canManageRole query
func (r *RBACResolver) CanManageRole(ctx context.Context, targetRoleName string) (bool, error) {
	// Get current user ID from context
	userID := getCurrentUserID(ctx)
	if userID == "" {
		return false, fmt.Errorf("user not authenticated")
	}

	canManage, err := r.rbacService.CanManageRole(ctx, userID, targetRoleName)
	if err != nil {
		return false, fmt.Errorf("failed to check role management permission: %w", err)
	}

	return canManage, nil
}

// RBACStats resolves the rbacStats query
func (r *RBACResolver) RBACStats(ctx context.Context) (*models.RBACStats, error) {
	stats, err := r.rbacService.GetRBACStatistics(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get RBAC statistics: %w", err)
	}

	// Convert map to RBACStats model
	rbacStats := &models.RBACStats{
		TotalRoles:            stats["total_roles"].(int64),
		ActiveRoles:           stats["active_roles"].(int64),
		SystemRoles:           stats["system_roles"].(int64),
		CustomRoles:           stats["custom_roles"].(int64),
		TotalPermissions:      stats["total_permissions"].(int64),
		ActivePermissions:     stats["active_permissions"].(int64),
		TotalRolePermissions:  stats["total_role_permissions"].(int64),
		TotalUserOverrides:    stats["total_user_overrides"].(int64),
		ActiveUserOverrides:   stats["active_user_overrides"].(int64),
		ExpiredUserOverrides:  stats["expired_user_overrides"].(int64),
	}

	if cacheStats, ok := stats["cache_stats"].(map[string]interface{}); ok {
		rbacStats.CacheStats = cacheStats
	}

	return rbacStats, nil
}

// ============================================================================
// MUTATION RESOLVERS - Roles
// ============================================================================

// CreateRole resolves the createRole mutation
func (r *RBACResolver) CreateRole(ctx context.Context, name, displayName string, level int, description *string) (*models.Role, error) {
	// Check authorization - only SUPER_ADMIN can create roles
	if err := r.checkSuperAdminPermission(ctx); err != nil {
		return nil, err
	}

	result, err := r.rbacService.CreateRoleWithValidation(ctx, name, displayName, level, description, false)
	if err != nil {
		return nil, fmt.Errorf("failed to create role: %w", err)
	}

	id, _ := uuid.Parse(result["id"].(string))
	role := &models.Role{
		ID:          id,
		Name:        result["name"].(string),
		DisplayName: result["display_name"].(string),
		Level:       result["level"].(int),
		IsActive:    result["is_active"].(bool),
		IsSystem:    result["is_system"].(bool),
		CreatedAt:   result["created_at"].(time.Time),
		UpdatedAt:   result["updated_at"].(time.Time),
	}
	if desc, ok := result["description"].(string); ok && desc != "" {
		role.Description = desc
	}

	return role, nil
}

// UpdateRole resolves the updateRole mutation
func (r *RBACResolver) UpdateRole(ctx context.Context, name string, displayName *string, description *string, isActive *bool) (*models.Role, error) {
	// Check authorization
	if err := r.checkSuperAdminPermission(ctx); err != nil {
		return nil, err
	}

	result, err := r.rbacService.UpdateRoleWithValidation(ctx, name, displayName, description, isActive)
	if err != nil {
		return nil, fmt.Errorf("failed to update role: %w", err)
	}

	id, _ := uuid.Parse(result["id"].(string))
	role := &models.Role{
		ID:          id,
		Name:        result["name"].(string),
		DisplayName: result["display_name"].(string),
		Level:       result["level"].(int),
		IsActive:    result["is_active"].(bool),
		IsSystem:    result["is_system"].(bool),
		CreatedAt:   result["created_at"].(time.Time),
		UpdatedAt:   result["updated_at"].(time.Time),
	}
	if desc, ok := result["description"].(string); ok && desc != "" {
		role.Description = desc
	}

	return role, nil
}

// DeleteRole resolves the deleteRole mutation
func (r *RBACResolver) DeleteRole(ctx context.Context, name string) (bool, error) {
	// Check authorization
	if err := r.checkSuperAdminPermission(ctx); err != nil {
		return false, err
	}

	err := r.rbacService.DeleteRoleWithValidation(ctx, name)
	if err != nil {
		return false, fmt.Errorf("failed to delete role: %w", err)
	}

	return true, nil
}

// ============================================================================
// MUTATION RESOLVERS - Permissions
// ============================================================================

// CreatePermission resolves the createPermission mutation
func (r *RBACResolver) CreatePermission(ctx context.Context, name, resource, action string, description *string) (*models.Permission, error) {
	// Check authorization
	if err := r.checkSuperAdminPermission(ctx); err != nil {
		return nil, err
	}

	result, err := r.rbacService.CreatePermission(ctx, name, resource, action, description)
	if err != nil {
		return nil, fmt.Errorf("failed to create permission: %w", err)
	}

	id, _ := uuid.Parse(result["id"].(string))
	perm := &models.Permission{
		ID:        id,
		Name:      result["name"].(string),
		Resource:  result["resource"].(string),
		Action:    result["action"].(string),
		IsActive:  result["is_active"].(bool),
		CreatedAt: result["created_at"].(time.Time),
	}
	if desc, ok := result["description"].(string); ok && desc != "" {
		perm.Description = desc
	}

	return perm, nil
}

// UpdatePermission resolves the updatePermission mutation
func (r *RBACResolver) UpdatePermission(ctx context.Context, name string, description *string, isActive *bool) (*models.Permission, error) {
	// Check authorization
	if err := r.checkSuperAdminPermission(ctx); err != nil {
		return nil, err
	}

	result, err := r.rbacService.UpdatePermission(ctx, name, description, isActive)
	if err != nil {
		return nil, fmt.Errorf("failed to update permission: %w", err)
	}

	id, _ := uuid.Parse(result["id"].(string))
	perm := &models.Permission{
		ID:        id,
		Name:      result["name"].(string),
		Resource:  result["resource"].(string),
		Action:    result["action"].(string),
		IsActive:  result["is_active"].(bool),
		CreatedAt: result["created_at"].(time.Time),
	}
	if desc, ok := result["description"].(string); ok && desc != "" {
		perm.Description = desc
	}

	return perm, nil
}

// DeletePermission resolves the deletePermission mutation
func (r *RBACResolver) DeletePermission(ctx context.Context, name string) (bool, error) {
	// Check authorization
	if err := r.checkSuperAdminPermission(ctx); err != nil {
		return false, err
	}

	err := r.rbacService.DeletePermission(ctx, name)
	if err != nil {
		return false, fmt.Errorf("failed to delete permission: %w", err)
	}

	return true, nil
}

// ============================================================================
// MUTATION RESOLVERS - Role-Permission Assignments
// ============================================================================

// AssignRolePermissions resolves the assignRolePermissions mutation
func (r *RBACResolver) AssignRolePermissions(ctx context.Context, input models.RolePermissionInput) (*models.Role, error) {
	// Check authorization
	if err := r.checkSuperAdminPermission(ctx); err != nil {
		return nil, err
	}

	err := r.rbacService.AssignRolePermissions(ctx, input.RoleName, input.Permissions)
	if err != nil {
		return nil, fmt.Errorf("failed to assign role permissions: %w", err)
	}

	// Return the updated role
	return r.Role(ctx, input.RoleName)
}

// RemoveRolePermissions resolves the removeRolePermissions mutation
func (r *RBACResolver) RemoveRolePermissions(ctx context.Context, roleName string, permissions []string) (*models.Role, error) {
	// Check authorization
	if err := r.checkSuperAdminPermission(ctx); err != nil {
		return nil, err
	}

	err := r.rbacService.RemoveRolePermissions(ctx, roleName, permissions)
	if err != nil {
		return nil, fmt.Errorf("failed to remove role permissions: %w", err)
	}

	// Return the updated role
	return r.Role(ctx, roleName)
}

// ============================================================================
// MUTATION RESOLVERS - User Permission Overrides
// ============================================================================

// AssignUserPermission resolves the assignUserPermission mutation
func (r *RBACResolver) AssignUserPermission(ctx context.Context, input models.UserPermissionInput) (*models.UserPermissionAssignment, error) {
	// Validate inputs
	if _, err := uuid.Parse(input.UserID); err != nil {
		return nil, fmt.Errorf("invalid user ID format")
	}

	// Get current user ID
	currentUserID := getCurrentUserID(ctx)
	if currentUserID == "" {
		return nil, fmt.Errorf("user not authenticated")
	}

	// Check authorization - only SUPER_ADMIN can assign user permissions
	if err := r.checkSuperAdminPermission(ctx); err != nil {
		return nil, err
	}

	var scopeType string
	var scopeID *string
	if input.Scope != nil {
		scopeType = input.Scope.Type
		scopeID = &input.Scope.ID
	}

	err := r.rbacService.AssignUserPermission(ctx, input.UserID, input.Permission, input.IsGranted, scopeType, scopeID, input.ExpiresAt, currentUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to assign user permission: %w", err)
	}

	// Retrieve the created assignment
	overrides, err := r.UserPermissionOverrides(ctx, input.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve created assignment: %w", err)
	}

	// Return the most recently created assignment (last in list)
	if len(overrides) > 0 {
		return overrides[len(overrides)-1], nil
	}

	return nil, fmt.Errorf("failed to find created assignment")
}

// RemoveUserPermission resolves the removeUserPermission mutation
func (r *RBACResolver) RemoveUserPermission(ctx context.Context, userID, permission string, scope *models.PermissionScope) (bool, error) {
	// Validate inputs
	if _, err := uuid.Parse(userID); err != nil {
		return false, fmt.Errorf("invalid user ID format")
	}

	// Check authorization
	if err := r.checkSuperAdminPermission(ctx); err != nil {
		return false, err
	}

	var scopeType string
	var scopeID *string
	if scope != nil {
		scopeType = scope.Type
		scopeID = &scope.ID
	}

	err := r.rbacService.RemoveUserPermission(ctx, userID, permission, scopeType, scopeID)
	if err != nil {
		return false, fmt.Errorf("failed to remove user permission: %w", err)
	}

	return true, nil
}

// ClearUserPermissions resolves the clearUserPermissions mutation
func (r *RBACResolver) ClearUserPermissions(ctx context.Context, userID string) (bool, error) {
	// Validate UUID
	if _, err := uuid.Parse(userID); err != nil {
		return false, fmt.Errorf("invalid user ID format")
	}

	// Check authorization
	if err := r.checkSuperAdminPermission(ctx); err != nil {
		return false, err
	}

	err := r.rbacService.ClearUserPermissions(ctx, userID)
	if err != nil {
		return false, fmt.Errorf("failed to clear user permissions: %w", err)
	}

	return true, nil
}

// AssignUserPermissions resolves the assignUserPermissions mutation (batch operation)
func (r *RBACResolver) AssignUserPermissions(ctx context.Context, userID string, permissions []models.UserPermissionInput) ([]*models.UserPermissionAssignment, error) {
	// Validate UUID
	if _, err := uuid.Parse(userID); err != nil {
		return nil, fmt.Errorf("invalid user ID format")
	}

	// Get current user ID
	currentUserID := getCurrentUserID(ctx)
	if currentUserID == "" {
		return nil, fmt.Errorf("user not authenticated")
	}

	// Check authorization
	if err := r.checkSuperAdminPermission(ctx); err != nil {
		return nil, err
	}

	// Assign each permission
	for _, permInput := range permissions {
		var scopeType string
		var scopeID *string
		if permInput.Scope != nil {
			scopeType = permInput.Scope.Type
			scopeID = &permInput.Scope.ID
		}

		err := r.rbacService.AssignUserPermission(ctx, permInput.UserID, permInput.Permission, permInput.IsGranted, scopeType, scopeID, permInput.ExpiresAt, currentUserID)
		if err != nil {
			return nil, fmt.Errorf("failed to assign user permission %s: %w", permInput.Permission, err)
		}
	}

	// Return all user permission overrides
	return r.UserPermissionOverrides(ctx, userID)
}

// MigrateStaticPermissions resolves the migrateStaticPermissions mutation
func (r *RBACResolver) MigrateStaticPermissions(ctx context.Context) (bool, error) {
	// Check authorization
	if err := r.checkSuperAdminPermission(ctx); err != nil {
		return false, err
	}

	// This is a placeholder for future migration logic
	// Could be used to migrate from feature-based to RBAC permissions
	return true, nil
}

// ============================================================================
// ROLE HIERARCHY RESOLVER METHODS (10)
// ============================================================================

// RolesAbove resolves all roles with higher authority than the specified role
func (r *RBACResolver) RolesAbove(ctx context.Context, roleName string) ([]*models.Role, error) {
	roles, err := r.rbacService.GetRolesAbove(ctx, roleName)
	if err != nil {
		return nil, fmt.Errorf("failed to get roles above %s: %w", roleName, err)
	}
	return roles, nil
}

// RolesBelow resolves all roles with lower authority than the specified role
func (r *RBACResolver) RolesBelow(ctx context.Context, roleName string) ([]*models.Role, error) {
	roles, err := r.rbacService.GetRolesBelow(ctx, roleName)
	if err != nil {
		return nil, fmt.Errorf("failed to get roles below %s: %w", roleName, err)
	}
	return roles, nil
}

// SubordinateRoles resolves direct subordinate roles (one level below)
func (r *RBACResolver) SubordinateRoles(ctx context.Context, roleName string) ([]*models.Role, error) {
	roles, err := r.rbacService.GetSubordinateRoles(ctx, roleName)
	if err != nil {
		return nil, fmt.Errorf("failed to get subordinate roles for %s: %w", roleName, err)
	}
	return roles, nil
}

// SuperiorRoles resolves direct superior roles (one level above)
func (r *RBACResolver) SuperiorRoles(ctx context.Context, roleName string) ([]*models.Role, error) {
	roles, err := r.rbacService.GetSuperiorRoles(ctx, roleName)
	if err != nil {
		return nil, fmt.Errorf("failed to get superior roles for %s: %w", roleName, err)
	}
	return roles, nil
}

// RolesAtLevel resolves all roles at a specific hierarchy level
func (r *RBACResolver) RolesAtLevel(ctx context.Context, level int) ([]*models.Role, error) {
	roles, err := r.rbacService.GetRolesAtLevel(ctx, level)
	if err != nil {
		return nil, fmt.Errorf("failed to get roles at level %d: %w", level, err)
	}
	return roles, nil
}

// RolesByLevelRange resolves all roles within a level range (inclusive)
func (r *RBACResolver) RolesByLevelRange(ctx context.Context, minLevel, maxLevel int) ([]*models.Role, error) {
	if minLevel > maxLevel {
		return nil, fmt.Errorf("minLevel (%d) cannot be greater than maxLevel (%d)", minLevel, maxLevel)
	}

	roles, err := r.rbacService.GetRolesByLevelRange(ctx, minLevel, maxLevel)
	if err != nil {
		return nil, fmt.Errorf("failed to get roles in range %d-%d: %w", minLevel, maxLevel, err)
	}
	return roles, nil
}

// CanRoleManage checks if source role can manage target role based on hierarchy
func (r *RBACResolver) CanRoleManage(ctx context.Context, sourceRole, targetRole string) (bool, error) {
	canManage, err := r.rbacService.CanRoleManageRole(ctx, sourceRole, targetRole)
	if err != nil {
		return false, fmt.Errorf("failed to check if %s can manage %s: %w", sourceRole, targetRole, err)
	}
	return canManage, nil
}

// RoleRelationship resolves detailed relationship between two roles
func (r *RBACResolver) RoleRelationship(ctx context.Context, sourceRole, targetRole string) (*models.RoleRelationship, error) {
	relationship, err := r.rbacService.GetRoleRelationship(ctx, sourceRole, targetRole)
	if err != nil {
		return nil, fmt.Errorf("failed to get relationship between %s and %s: %w", sourceRole, targetRole, err)
	}
	return relationship, nil
}

// EffectivePermissions resolves role permissions including inherited permissions
func (r *RBACResolver) EffectivePermissions(ctx context.Context, roleName string) ([]string, error) {
	permissions, err := r.rbacService.GetEffectiveRolePermissions(ctx, roleName)
	if err != nil {
		return nil, fmt.Errorf("failed to get effective permissions for %s: %w", roleName, err)
	}
	return permissions, nil
}

// HierarchyTree resolves complete role hierarchy as a tree structure
func (r *RBACResolver) HierarchyTree(ctx context.Context) ([]*models.RoleHierarchyNode, error) {
	tree, err := r.rbacService.GetRoleHierarchyTree(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get role hierarchy tree: %w", err)
	}
	return tree, nil
}

// ============================================================================
// Helper Methods
// ============================================================================

// getCurrentUserID extracts the current user ID from the GraphQL context
func getCurrentUserID(ctx context.Context) string {
	return middleware.GetCurrentUserID(ctx)
}

// checkSuperAdminPermission verifies the current user has SUPER_ADMIN role
func (r *RBACResolver) checkSuperAdminPermission(ctx context.Context) error {
	userID := getCurrentUserID(ctx)
	if userID == "" {
		return fmt.Errorf("user not authenticated")
	}

	// Get user role
	role, err := r.rbacService.GetUserRole(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get user role: %w", err)
	}

	if role != "SUPER_ADMIN" {
		return fmt.Errorf("insufficient permissions: SUPER_ADMIN role required")
	}

	return nil
}

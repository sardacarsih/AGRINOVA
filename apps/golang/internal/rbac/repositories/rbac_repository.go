// Package repositories provides data access layer for RBAC entities.
// This package handles all database operations for roles, permissions, and user overrides.
package repositories

import (
	"errors"
	"fmt"
	"time"

	"agrinovagraphql/server/internal/rbac/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	// ErrRoleNotFound is returned when a role is not found
	ErrRoleNotFound = errors.New("role not found")
	// ErrPermissionNotFound is returned when a permission is not found
	ErrPermissionNotFound = errors.New("permission not found")
	// ErrRoleAlreadyExists is returned when trying to create a role that already exists
	ErrRoleAlreadyExists = errors.New("role already exists")
	// ErrPermissionAlreadyExists is returned when trying to create a permission that already exists
	ErrPermissionAlreadyExists = errors.New("permission already exists")
	// ErrSystemRoleDeletion is returned when trying to delete a system role
	ErrSystemRoleDeletion = errors.New("cannot delete system role")
)

// RBACRepository provides database operations for RBAC entities
type RBACRepository struct {
	db *gorm.DB
}

// NewRBACRepository creates a new RBAC repository
func NewRBACRepository(db *gorm.DB) *RBACRepository {
	return &RBACRepository{db: db}
}

// ==================== Role Operations ====================

// CreateRole creates a new role in the database
func (r *RBACRepository) CreateRole(role *models.Role) error {
	// Check if role with same name already exists
	var existing models.Role
	if err := r.db.Where("name = ?", role.Name).First(&existing).Error; err == nil {
		return ErrRoleAlreadyExists
	}

	return r.db.Create(role).Error
}

// UpdateRole updates an existing role
func (r *RBACRepository) UpdateRole(role *models.Role) error {
	result := r.db.Model(&models.Role{}).Where("id = ?", role.ID).Updates(role)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrRoleNotFound
	}
	return nil
}

// DeleteRole soft deletes a role
func (r *RBACRepository) DeleteRole(id uuid.UUID) error {
	// First check if it's a system role
	var role models.Role
	if err := r.db.First(&role, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrRoleNotFound
		}
		return err
	}

	if role.IsSystem {
		return ErrSystemRoleDeletion
	}

	// Soft delete the role
	return r.db.Delete(&models.Role{}, id).Error
}

// GetRoleByID retrieves a role by ID
func (r *RBACRepository) GetRoleByID(id uuid.UUID) (*models.Role, error) {
	var role models.Role
	if err := r.db.First(&role, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}
	return &role, nil
}

// GetRoleByName retrieves a role by name
func (r *RBACRepository) GetRoleByName(name string) (*models.Role, error) {
	var role models.Role
	if err := r.db.Where("name = ?", name).First(&role).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}
	return &role, nil
}

// GetAllRoles retrieves all roles, optionally filtering by active status
func (r *RBACRepository) GetAllRoles(activeOnly bool) ([]*models.Role, error) {
	var roles []*models.Role
	query := r.db.Order("level ASC, name ASC")

	if activeOnly {
		query = query.Where("is_active = ?", true)
	}

	if err := query.Find(&roles).Error; err != nil {
		return nil, err
	}

	return roles, nil
}

// GetRolesByLevel retrieves all roles at a specific hierarchy level
func (r *RBACRepository) GetRolesByLevel(level int) ([]*models.Role, error) {
	var roles []*models.Role
	if err := r.db.Where("level = ? AND is_active = ?", level, true).Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}

// ==================== Permission Operations ====================

// CreatePermission creates a new permission in the database
func (r *RBACRepository) CreatePermission(perm *models.Permission) error {
	// Check if permission with same name already exists
	var existing models.Permission
	if err := r.db.Where("name = ?", perm.Name).First(&existing).Error; err == nil {
		return ErrPermissionAlreadyExists
	}

	return r.db.Create(perm).Error
}

// UpdatePermission updates an existing permission
func (r *RBACRepository) UpdatePermission(perm *models.Permission) error {
	result := r.db.Model(&models.Permission{}).Where("id = ?", perm.ID).Updates(perm)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrPermissionNotFound
	}
	return nil
}

// DeletePermission soft deletes a permission
func (r *RBACRepository) DeletePermission(id uuid.UUID) error {
	result := r.db.Delete(&models.Permission{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrPermissionNotFound
	}
	return nil
}

// GetPermissionByID retrieves a permission by ID
func (r *RBACRepository) GetPermissionByID(id uuid.UUID) (*models.Permission, error) {
	var perm models.Permission
	if err := r.db.First(&perm, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPermissionNotFound
		}
		return nil, err
	}
	return &perm, nil
}

// GetPermissionByName retrieves a permission by name
func (r *RBACRepository) GetPermissionByName(name string) (*models.Permission, error) {
	var perm models.Permission
	if err := r.db.Where("name = ?", name).First(&perm).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPermissionNotFound
		}
		return nil, err
	}
	return &perm, nil
}

// GetAllPermissions retrieves all permissions, optionally filtering by active status
func (r *RBACRepository) GetAllPermissions(activeOnly bool) ([]*models.Permission, error) {
	var perms []*models.Permission
	query := r.db.Order("resource ASC, action ASC")

	if activeOnly {
		query = query.Where("is_active = ?", true)
	}

	if err := query.Find(&perms).Error; err != nil {
		return nil, err
	}

	return perms, nil
}

// GetPermissionsByResource retrieves all permissions for a specific resource
func (r *RBACRepository) GetPermissionsByResource(resource string) ([]*models.Permission, error) {
	var perms []*models.Permission
	if err := r.db.Where("resource = ? AND is_active = ?", resource, true).Find(&perms).Error; err != nil {
		return nil, err
	}
	return perms, nil
}

// ==================== Role-Permission Operations ====================

// AssignRolePermissions assigns multiple permissions to a role
func (r *RBACRepository) AssignRolePermissions(roleID uuid.UUID, permissionIDs []uuid.UUID) error {
	// Verify role exists
	if _, err := r.GetRoleByID(roleID); err != nil {
		return err
	}

	// Create role-permission associations
	for _, permID := range permissionIDs {
		// Check if association already exists
		var existing models.RolePermission
		if err := r.db.Where("role_id = ? AND permission_id = ?", roleID, permID).First(&existing).Error; err == nil {
			// Already exists, skip
			continue
		}

		rp := &models.RolePermission{
			RoleID:       roleID,
			PermissionID: permID,
			IsDenied:     false,
		}

		if err := r.db.Create(rp).Error; err != nil {
			return fmt.Errorf("failed to assign permission %s: %w", permID, err)
		}
	}

	return nil
}

// RemoveRolePermissions removes multiple permissions from a role
func (r *RBACRepository) RemoveRolePermissions(roleID uuid.UUID, permissionIDs []uuid.UUID) error {
	return r.db.Where("role_id = ? AND permission_id IN ? AND inherited_from_role_id IS NULL",
		roleID, permissionIDs).Delete(&models.RolePermission{}).Error
}

// GetRolePermissions retrieves all permissions for a role (direct assignments only)
func (r *RBACRepository) GetRolePermissions(roleID uuid.UUID) ([]*models.Permission, error) {
	var perms []*models.Permission

	err := r.db.Table("permissions").
		Joins("INNER JOIN role_permissions ON permissions.id = role_permissions.permission_id").
		Where("role_permissions.role_id = ? AND role_permissions.inherited_from_role_id IS NULL AND role_permissions.is_denied = ?",
			roleID, false).
		Find(&perms).Error

	if err != nil {
		return nil, err
	}

	return perms, nil
}

// GetRolePermissionsWithInheritance retrieves all permissions for a role including inherited ones
func (r *RBACRepository) GetRolePermissionsWithInheritance(roleID uuid.UUID) ([]*models.RolePermission, error) {
	var rolePerms []*models.RolePermission

	err := r.db.Where("role_id = ? AND is_denied = ?", roleID, false).
		Preload("Permission").
		Preload("InheritedFromRole").
		Find(&rolePerms).Error

	if err != nil {
		return nil, err
	}

	return rolePerms, nil
}

// GetRolePermissionNames retrieves permission names for a role
func (r *RBACRepository) GetRolePermissionNames(roleID uuid.UUID) ([]string, error) {
	var names []string

	err := r.db.Table("permissions").
		Select("permissions.name").
		Joins("INNER JOIN role_permissions ON permissions.id = role_permissions.permission_id").
		Where("role_permissions.role_id = ? AND role_permissions.is_denied = ?", roleID, false).
		Pluck("permissions.name", &names).Error

	if err != nil {
		return nil, err
	}

	return names, nil
}

// ==================== User Permission Override Operations ====================

// CreateUserPermissionOverride creates a user-specific permission override
func (r *RBACRepository) CreateUserPermissionOverride(override *models.UserPermissionAssignment) error {
	return r.db.Create(override).Error
}

// RemoveUserPermissionOverride removes a user permission override
func (r *RBACRepository) RemoveUserPermissionOverride(userID, permissionID uuid.UUID, scopeType *string, scopeID *uuid.UUID) error {
	query := r.db.Where("user_id = ? AND permission_id = ?", userID, permissionID)

	if scopeType != nil {
		query = query.Where("scope_type = ?", *scopeType)
	}
	if scopeID != nil {
		query = query.Where("scope_id = ?", *scopeID)
	}

	return query.Delete(&models.UserPermissionAssignment{}).Error
}

// GetUserPermissionOverrides retrieves all permission overrides for a user
func (r *RBACRepository) GetUserPermissionOverrides(userID uuid.UUID) ([]*models.UserPermissionAssignment, error) {
	var overrides []*models.UserPermissionAssignment

	if err := r.db.Where("user_id = ?", userID).Preload("Permission").Find(&overrides).Error; err != nil {
		return nil, err
	}

	return overrides, nil
}

// GetActiveUserPermissionOverrides retrieves active (not expired) permission overrides for a user
func (r *RBACRepository) GetActiveUserPermissionOverrides(userID uuid.UUID) ([]*models.UserPermissionAssignment, error) {
	var overrides []*models.UserPermissionAssignment

	now := time.Now()
	if err := r.db.Where("user_id = ? AND (expires_at IS NULL OR expires_at > ?)", userID, now).
		Preload("Permission").Find(&overrides).Error; err != nil {
		return nil, err
	}

	return overrides, nil
}

// ClearUserPermissionOverrides removes all permission overrides for a user
func (r *RBACRepository) ClearUserPermissionOverrides(userID uuid.UUID) error {
	return r.db.Where("user_id = ?", userID).Delete(&models.UserPermissionAssignment{}).Error
}

// ==================== Statistics Operations ====================

// GetRBACStats retrieves comprehensive RBAC statistics
func (r *RBACRepository) GetRBACStats() (*models.RBACStats, error) {
	stats := &models.RBACStats{}

	// Count total roles
	if err := r.db.Model(&models.Role{}).Count(&stats.TotalRoles).Error; err != nil {
		return nil, err
	}

	// Count active roles
	if err := r.db.Model(&models.Role{}).Where("is_active = ?", true).Count(&stats.ActiveRoles).Error; err != nil {
		return nil, err
	}

	// Count system roles
	if err := r.db.Model(&models.Role{}).Where("is_system = ?", true).Count(&stats.SystemRoles).Error; err != nil {
		return nil, err
	}

	// Calculate custom roles
	stats.CustomRoles = stats.TotalRoles - stats.SystemRoles

	// Count total permissions
	if err := r.db.Model(&models.Permission{}).Count(&stats.TotalPermissions).Error; err != nil {
		return nil, err
	}

	// Count active permissions
	if err := r.db.Model(&models.Permission{}).Where("is_active = ?", true).Count(&stats.ActivePermissions).Error; err != nil {
		return nil, err
	}

	// Count role-permission assignments
	if err := r.db.Model(&models.RolePermission{}).Count(&stats.TotalRolePermissions).Error; err != nil {
		return nil, err
	}

	// Count total user overrides
	if err := r.db.Model(&models.UserPermissionAssignment{}).Count(&stats.TotalUserOverrides).Error; err != nil {
		return nil, err
	}

	// Count active user overrides (not expired)
	now := time.Now()
	if err := r.db.Model(&models.UserPermissionAssignment{}).
		Where("expires_at IS NULL OR expires_at > ?", now).
		Count(&stats.ActiveUserOverrides).Error; err != nil {
		return nil, err
	}

	// Calculate expired overrides
	stats.ExpiredUserOverrides = stats.TotalUserOverrides - stats.ActiveUserOverrides

	return stats, nil
}

// CleanupExpiredOverrides removes expired user permission overrides
func (r *RBACRepository) CleanupExpiredOverrides() (int64, error) {
	now := time.Now()
	result := r.db.Where("expires_at IS NOT NULL AND expires_at < ?", now).
		Delete(&models.UserPermissionAssignment{})

	return result.RowsAffected, result.Error
}

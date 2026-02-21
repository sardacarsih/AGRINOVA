// Package rbac contains RBAC-related GraphQL types.
package rbac

import (
	"time"
)

// ============================================================================
// ROLE TYPES
// ============================================================================

// Role represents a system role.
type Role struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	DisplayName string     `json:"displayName"`
	Level       int32      `json:"level"`
	Description *string    `json:"description,omitempty"`
	IsActive    bool       `json:"isActive"`
	IsSystem    bool       `json:"isSystem"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	DeletedAt   *time.Time `json:"deletedAt,omitempty"`
}

// Permission represents a permission.
type Permission struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Resource    string     `json:"resource"`
	Action      string     `json:"action"`
	Description *string    `json:"description,omitempty"`
	IsActive    bool       `json:"isActive"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	DeletedAt   *time.Time `json:"deletedAt,omitempty"`
}

// RolePermission for role-permission assignment.
type RolePermission struct {
	ID                string      `json:"id"`
	Role              *Role       `json:"role"`
	Permission        *Permission `json:"permission"`
	InheritedFromRole *Role       `json:"inheritedFromRole,omitempty"`
	IsDenied          bool        `json:"isDenied"`
	CreatedAt         time.Time   `json:"createdAt"`
}

// RolePermissionInput for assigning permissions.
type RolePermissionInput struct {
	RoleName    string   `json:"roleName"`
	Permissions []string `json:"permissions"`
	InheritFrom *string  `json:"inheritFrom,omitempty"`
}

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

// PermissionScope for scoped checks.
type PermissionScope struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

// PermissionScopeInput for input.
type PermissionScopeInput struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

// PermissionCheckInput for checking.
type PermissionCheckInput struct {
	UserID     string                `json:"userId"`
	Permission string                `json:"permission"`
	Scope      *PermissionScopeInput `json:"scope,omitempty"`
}

// PermissionCheckResult for result.
type PermissionCheckResult struct {
	UserID     string  `json:"userId"`
	Permission string  `json:"permission"`
	HasAccess  bool    `json:"hasAccess"`
	Reason     *string `json:"reason,omitempty"`
}

// BatchPermissionCheckInput for batch.
type BatchPermissionCheckInput struct {
	UserID      string   `json:"userId"`
	Permissions []string `json:"permissions"`
	RequireAll  *bool    `json:"requireAll,omitempty"`
}

// BatchPermissionCheckResult for batch result.
type BatchPermissionCheckResult struct {
	UserID            string   `json:"userId"`
	Permissions       []string `json:"permissions"`
	HasAccess         bool     `json:"hasAccess"`
	FailedPermissions []string `json:"failedPermissions,omitempty"`
}

// ============================================================================
// HIERARCHY
// ============================================================================

// RoleHierarchyNode for hierarchy.
type RoleHierarchyNode struct {
	Role        *Role                `json:"role"`
	Level       int32                `json:"level"`
	Children    []*RoleHierarchyNode `json:"children,omitempty"`
	Permissions []string             `json:"permissions,omitempty"`
}

// RoleRelationship for relationships.
type RoleRelationship struct {
	SourceRole      string `json:"sourceRole"`
	TargetRole      string `json:"targetRole"`
	CanManage       bool   `json:"canManage"`
	LevelDifference int32  `json:"levelDifference"`
	Relationship    string `json:"relationship"`
}

// ============================================================================
// STATS
// ============================================================================

// RBACStats for statistics.
type RBACStats struct {
	TotalRoles           int32   `json:"totalRoles"`
	ActiveRoles          int32   `json:"activeRoles"`
	TotalPermissions     int32   `json:"totalPermissions"`
	ActivePermissions    int32   `json:"activePermissions"`
	TotalRolePermissions int32   `json:"totalRolePermissions"`
	TotalUserOverrides   int32   `json:"totalUserOverrides"`
	CacheStats           *string `json:"cacheStats,omitempty"`
}

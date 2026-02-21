package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Role represents a user role in the RBAC system
type Role struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string     `gorm:"uniqueIndex;not null" json:"name"`
	DisplayName string     `gorm:"not null" json:"display_name"`
	Level       int        `gorm:"not null" json:"level"` // 1=highest, 9=lowest
	Description string     `json:"description"`
	IsActive    bool       `gorm:"default:true" json:"is_active"`
	IsSystem    bool       `gorm:"default:false;not null" json:"is_system"` // System roles cannot be deleted
	CreatedAt   time.Time  `gorm:"default:now()" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// Permission represents a system permission
type Permission struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string     `gorm:"uniqueIndex;not null" json:"name"`
	Resource    string     `gorm:"not null;index" json:"resource"`    // harvest, user, report, etc.
	Action      string     `gorm:"not null;index" json:"action"`      // create, read, update, delete, approve
	Description string     `json:"description"`
	IsActive    bool       `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time  `gorm:"default:now()" json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at,omitempty"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// RolePermission represents the relationship between roles and permissions
type RolePermission struct {
	ID                 uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	RoleID             uuid.UUID  `gorm:"type:uuid;not null;index" json:"role_id"`
	PermissionID       uuid.UUID  `gorm:"type:uuid;not null;index" json:"permission_id"`
	InheritedFromRoleID *uuid.UUID `gorm:"type:uuid;index" json:"inherited_from_role_id,omitempty"` // For inheritance tracking
	IsDenied           bool       `gorm:"default:false" json:"is_denied"` // For permission overrides
	CreatedAt          time.Time  `gorm:"default:now()" json:"created_at"`

	// Relationships
	Role             Role       `gorm:"foreignKey:RoleID;references:ID;constraint:OnDelete:CASCADE" json:"role,omitempty"`
	Permission       Permission `gorm:"foreignKey:PermissionID;references:ID;constraint:OnDelete:CASCADE" json:"permission,omitempty"`
	InheritedFromRole *Role      `gorm:"foreignKey:InheritedFromRoleID;references:ID" json:"inherited_from_role,omitempty"`
}

// IsDirect returns true if this is a directly assigned permission (not inherited)
func (rp *RolePermission) IsDirect() bool {
	return rp.InheritedFromRoleID == nil
}

// UserPermissionAssignment represents user-specific permission overrides
type UserPermissionAssignment struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	PermissionID uuid.UUID `gorm:"type:uuid;not null;index" json:"permission_id"`
	IsGranted bool       `gorm:"not null" json:"is_granted"` // true=grant, false=deny
	ScopeType string     `gorm:"size:20" json:"scope_type"`  // company, estate, division, block
	ScopeID   *uuid.UUID `gorm:"type:uuid" json:"scope_id"`  // Specific resource ID
	ExpiresAt *time.Time `gorm:"index" json:"expires_at"`
	Reason    *string    `gorm:"type:text" json:"reason,omitempty"` // Optional reason for override
	CreatedAt time.Time  `gorm:"default:now()" json:"created_at"`
	CreatedBy uuid.UUID  `gorm:"type:uuid" json:"created_by"`

	// Relationships
	Permission Permission `gorm:"foreignKey:PermissionID;references:ID;constraint:OnDelete:CASCADE" json:"permission,omitempty"`
}

// IsExpired checks if this permission assignment has expired
func (upa *UserPermissionAssignment) IsExpired() bool {
	if upa.ExpiresAt == nil {
		return false
	}
	return upa.ExpiresAt.Before(time.Now())
}

// IsActive checks if this permission assignment is currently active (not expired)
func (upa *UserPermissionAssignment) IsActive() bool {
	return !upa.IsExpired()
}

// GetScope returns the permission scope if set, nil otherwise
func (upa *UserPermissionAssignment) GetScope() *PermissionScope {
	if upa.ScopeType == "" || upa.ScopeID == nil {
		return nil
	}
	return &PermissionScope{
		Type: upa.ScopeType,
		ID:   upa.ScopeID.String(),
	}
}

// PermissionScope represents scoped permission context
type PermissionScope struct {
	Type string `json:"type"` // company, estate, division, block
	ID   string `json:"id"`   // UUID string
}

// UserPermissions represents a user's permission set
type UserPermissions struct {
	UserID      string                   `json:"user_id"`
	Role        string                   `json:"role"`
	Permissions []string                 `json:"permissions"`
	Overrides   []UserPermissionOverride `json:"overrides,omitempty"`
}

// UserPermissionOverride represents a user-specific permission override
type UserPermissionOverride struct {
	Permission string          `json:"permission"`
	IsGranted  bool            `json:"is_granted"`
	Scope      *PermissionScope `json:"scope,omitempty"`
	ExpiresAt  *time.Time      `json:"expires_at,omitempty"`
}

// RolePermissionInput represents input for assigning permissions to roles
type RolePermissionInput struct {
	RoleName       string   `json:"role_name" binding:"required"`
	Permissions    []string `json:"permissions" binding:"required"`
	InheritFrom    *string  `json:"inherit_from,omitempty"`
}

// UserPermissionInput represents input for user permission overrides
type UserPermissionInput struct {
	UserID       string          `json:"user_id" binding:"required"`
	Permission   string          `json:"permission" binding:"required"`
	IsGranted    bool            `json:"is_granted" binding:"required"`
	Scope        *PermissionScope `json:"scope,omitempty"`
	ExpiresAt    *time.Time      `json:"expires_at,omitempty"`
}

// RoleHierarchyInfo represents information about role hierarchy
type RoleHierarchyInfo struct {
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	Level       int    `json:"level"`
	Description string `json:"description"`
}

// PermissionCheck represents a permission check request
type PermissionCheck struct {
	UserID     string          `json:"user_id" binding:"required"`
	Permission string          `json:"permission" binding:"required"`
	Scope      *PermissionScope `json:"scope,omitempty"`
}

// PermissionCheckResult represents the result of a permission check
type PermissionCheckResult struct {
	UserID     string `json:"user_id"`
	Permission string `json:"permission"`
	HasAccess  bool   `json:"has_access"`
	Reason     string `json:"reason,omitempty"`
}

// BatchPermissionCheck represents multiple permission checks
type BatchPermissionCheck struct {
	UserID      string   `json:"user_id" binding:"required"`
	Permissions []string `json:"permissions" binding:"required"`
	RequireAll  bool     `json:"require_all"` // true=all required, false=any required
}

// BatchPermissionCheckResult represents the result of batch permission checks
type BatchPermissionCheckResult struct {
	UserID      string   `json:"user_id"`
	Permissions []string `json:"permissions"`
	HasAccess   bool     `json:"has_access"`
	FailedPerms []string `json:"failed_permissions,omitempty"`
}

// RBACStats represents RBAC system statistics
type RBACStats struct {
	TotalRoles            int64                  `json:"total_roles"`
	ActiveRoles           int64                  `json:"active_roles"`
	SystemRoles           int64                  `json:"system_roles"`
	CustomRoles           int64                  `json:"custom_roles"`
	TotalPermissions      int64                  `json:"total_permissions"`
	ActivePermissions     int64                  `json:"active_permissions"`
	TotalRolePermissions  int64                  `json:"total_role_permissions"`
	TotalUserOverrides    int64                  `json:"total_user_overrides"`
	ActiveUserOverrides   int64                  `json:"active_user_overrides"`
	ExpiredUserOverrides  int64                  `json:"expired_user_overrides"`
	CacheStats            map[string]interface{} `json:"cache_stats,omitempty"`
}

// RoleHierarchyNode represents a node in the role hierarchy tree
type RoleHierarchyNode struct {
	Role        *Role                `json:"role"`
	Level       int                  `json:"level"`
	Permissions []string             `json:"permissions"`
	Children    []*RoleHierarchyNode `json:"children,omitempty"`
}

// RoleRelationship describes the relationship between two roles
type RoleRelationship struct {
	SourceRole      string `json:"source_role"`
	TargetRole      string `json:"target_role"`
	CanManage       bool   `json:"can_manage"`
	LevelDifference int    `json:"level_difference"`
	Relationship    string `json:"relationship"` // "superior", "subordinate", "equal", "unrelated"
}
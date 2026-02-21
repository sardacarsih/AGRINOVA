package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Feature represents a specific functionality or capability in the system.
// Features can be composed hierarchically with parent-child relationships.
// Examples: "harvest.view", "harvest.create", "harvest.approve"
type Feature struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string         `gorm:"uniqueIndex:idx_feature_name;not null;size:255" json:"name"`
	DisplayName string         `gorm:"not null;size:255" json:"display_name"`
	Description string         `gorm:"type:text" json:"description"`
	Module      string         `gorm:"not null;index;size:50" json:"module"` // harvest, gatecheck, user, company, etc.
	ParentID    *uuid.UUID     `gorm:"type:uuid;index:idx_feature_parent" json:"parent_id,omitempty"`
	Parent      *Feature       `gorm:"foreignKey:ParentID;references:ID;constraint:OnDelete:CASCADE" json:"parent,omitempty"`
	Children    []Feature      `gorm:"foreignKey:ParentID;references:ID" json:"children,omitempty"`
	IsActive    bool           `gorm:"default:true;index" json:"is_active"`
	IsSystem    bool           `gorm:"default:false" json:"is_system"` // System features cannot be deleted
	Metadata    FeatureMetadata `gorm:"type:jsonb" json:"metadata,omitempty"`
	CreatedAt   time.Time      `gorm:"default:now()" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// FeatureMetadata stores additional feature configuration
type FeatureMetadata struct {
	// Resource type this feature applies to (harvest_record, gate_check, user, etc.)
	ResourceType string `json:"resource_type,omitempty"`
	// Actions this feature enables (read, create, update, delete, approve, etc.)
	Actions []string `json:"actions,omitempty"`
	// Required scope for this feature (company, estate, division, block)
	RequiredScope string `json:"required_scope,omitempty"`
	// Whether this feature requires specific conditions to be enabled
	Conditions map[string]interface{} `json:"conditions,omitempty"`
	// UI metadata for frontend rendering
	UIMetadata map[string]interface{} `json:"ui_metadata,omitempty"`
}

// Scan implements the sql.Scanner interface for FeatureMetadata
func (fm *FeatureMetadata) Scan(value interface{}) error {
	if value == nil {
		*fm = FeatureMetadata{}
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return errors.New("cannot scan non-string value into FeatureMetadata")
	}

	// Handle empty JSON
	if len(bytes) == 0 {
		*fm = FeatureMetadata{}
		return nil
	}

	return json.Unmarshal(bytes, fm)
}

// Value implements the driver.Valuer interface for FeatureMetadata
func (fm FeatureMetadata) Value() (driver.Value, error) {
	// Return empty JSON object for empty metadata
	if fm.ResourceType == "" && len(fm.Actions) == 0 && fm.RequiredScope == "" &&
		len(fm.Conditions) == 0 && len(fm.UIMetadata) == 0 {
		return []byte("{}"), nil
	}

	return json.Marshal(fm)
}

// GORMDataType returns the GORM data type for FeatureMetadata
func (fm FeatureMetadata) GORMDataType() string {
	return "jsonb"
}

// RoleFeature represents the assignment of features to roles.
// This replaces the traditional role-permission model with a feature-based approach.
type RoleFeature struct {
	ID                  uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Role                string         `gorm:"type:varchar(50);not null;index:idx_role_feature" json:"role"`
	FeatureID           uuid.UUID      `gorm:"type:uuid;not null;index:idx_role_feature" json:"feature_id"`
	Feature             *Feature       `gorm:"foreignKey:FeatureID;references:ID;constraint:OnDelete:CASCADE" json:"feature,omitempty"`
	InheritedFromRole   *string        `gorm:"type:varchar(50);index" json:"inherited_from_role,omitempty"`
	IsDenied            bool           `gorm:"default:false" json:"is_denied"` // For feature overrides
	GrantedAt           time.Time      `gorm:"default:now()" json:"granted_at"`
	GrantedBy           uuid.UUID      `gorm:"type:uuid" json:"granted_by"`
	ExpiresAt           *time.Time     `gorm:"index" json:"expires_at,omitempty"`
	CreatedAt           time.Time      `gorm:"default:now()" json:"created_at"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// UserFeature represents user-specific feature grants or denials.
// This allows for fine-grained user-level feature control beyond role-based features.
type UserFeature struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null;index:idx_user_feature" json:"user_id"`
	FeatureID uuid.UUID      `gorm:"type:uuid;not null;index:idx_user_feature" json:"feature_id"`
	Feature   *Feature       `gorm:"foreignKey:FeatureID;references:ID;constraint:OnDelete:CASCADE" json:"feature,omitempty"`
	IsGranted bool           `gorm:"not null" json:"is_granted"` // true=grant, false=deny
	// Scope-based feature access
	ScopeType string     `gorm:"size:20;index" json:"scope_type"` // company, estate, division, block
	ScopeID   *uuid.UUID `gorm:"type:uuid;index" json:"scope_id,omitempty"`
	// Temporal access control
	EffectiveFrom *time.Time `gorm:"index" json:"effective_from,omitempty"`
	ExpiresAt     *time.Time `gorm:"index" json:"expires_at,omitempty"`
	// Audit trail
	GrantedBy uuid.UUID      `gorm:"type:uuid;not null" json:"granted_by"`
	Reason    string         `gorm:"type:text" json:"reason,omitempty"`
	CreatedAt time.Time      `gorm:"default:now()" json:"created_at"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// FeatureScope represents scoped feature access context
type FeatureScope struct {
	Type string `json:"type"` // company, estate, division, block, global
	ID   string `json:"id"`   // UUID string
}

// UserFeatureSet represents a user's complete feature set (cached)
type UserFeatureSet struct {
	UserID        string          `json:"user_id"`
	Role          string          `json:"role"`
	Features      []string        `json:"features"`
	FeatureMap    map[string]bool `json:"feature_map"` // For O(1) lookup
	ScopedFeatures []ScopedFeature `json:"scoped_features,omitempty"`
	ComputedAt    time.Time       `json:"computed_at"`
	ExpiresAt     time.Time       `json:"expires_at"`
}

// ScopedFeature represents a feature with scope information
type ScopedFeature struct {
	Feature   string        `json:"feature"`
	IsGranted bool          `json:"is_granted"`
	Scope     *FeatureScope `json:"scope,omitempty"`
	ExpiresAt *time.Time    `json:"expires_at,omitempty"`
}

// FeatureCheckRequest represents a request to check feature access
type FeatureCheckRequest struct {
	UserID  string        `json:"user_id" binding:"required"`
	Feature string        `json:"feature" binding:"required"`
	Scope   *FeatureScope `json:"scope,omitempty"`
}

// FeatureCheckResult represents the result of a feature access check
type FeatureCheckResult struct {
	UserID       string    `json:"user_id"`
	Feature      string    `json:"feature"`
	HasAccess    bool      `json:"has_access"`
	AccessReason string    `json:"access_reason,omitempty"`
	DenialReason string    `json:"denial_reason,omitempty"`
	CheckedAt    time.Time `json:"checked_at"`
}

// BatchFeatureCheck represents multiple feature checks
type BatchFeatureCheck struct {
	UserID     string   `json:"user_id" binding:"required"`
	Features   []string `json:"features" binding:"required"`
	RequireAll bool     `json:"require_all"` // true=all required, false=any required
}

// BatchFeatureCheckResult represents the result of batch feature checks
type BatchFeatureCheckResult struct {
	UserID         string   `json:"user_id"`
	Features       []string `json:"features"`
	HasAccess      bool     `json:"has_access"`
	GrantedFeatures []string `json:"granted_features,omitempty"`
	DeniedFeatures  []string `json:"denied_features,omitempty"`
}

// FeatureInput represents input for creating/updating features
type FeatureInput struct {
	Name        string                 `json:"name" binding:"required"`
	DisplayName string                 `json:"display_name" binding:"required"`
	Description string                 `json:"description"`
	Module      string                 `json:"module" binding:"required"`
	ParentID    *string                `json:"parent_id,omitempty"`
	IsActive    bool                   `json:"is_active"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// RoleFeatureInput represents input for assigning features to roles
type RoleFeatureInput struct {
	RoleName    string   `json:"role_name" binding:"required"`
	Features    []string `json:"features" binding:"required"`
	InheritFrom *string  `json:"inherit_from,omitempty"`
}

// UserFeatureInput represents input for user feature grants/denials
type UserFeatureInput struct {
	UserID        string        `json:"user_id" binding:"required"`
	Feature       string        `json:"feature" binding:"required"`
	IsGranted     bool          `json:"is_granted"`
	Scope         *FeatureScope `json:"scope,omitempty"`
	EffectiveFrom *time.Time    `json:"effective_from,omitempty"`
	ExpiresAt     *time.Time    `json:"expires_at,omitempty"`
	Reason        string        `json:"reason,omitempty"`
}

// FeatureStats represents feature system statistics
type FeatureStats struct {
	TotalFeatures       int                    `json:"total_features"`
	ActiveFeatures      int                    `json:"active_features"`
	SystemFeatures      int                    `json:"system_features"`
	CustomFeatures      int                    `json:"custom_features"`
	TotalRoleFeatures   int                    `json:"total_role_features"`
	TotalUserOverrides  int                    `json:"total_user_overrides"`
	FeaturesByModule    map[string]int         `json:"features_by_module"`
	CacheHitRate        float64                `json:"cache_hit_rate"`
	AverageCheckLatency float64                `json:"average_check_latency_ms"`
	CacheStats          map[string]interface{} `json:"cache_stats,omitempty"`
}

// FeatureHierarchy represents a feature and its children (for tree rendering)
type FeatureHierarchy struct {
	Feature  *Feature            `json:"feature"`
	Children []*FeatureHierarchy `json:"children,omitempty"`
	Depth    int                 `json:"depth"`
}

// TableName returns the table name for Feature
func (Feature) TableName() string {
	return "features"
}

// TableName returns the table name for RoleFeature
func (RoleFeature) TableName() string {
	return "role_features"
}

// TableName returns the table name for UserFeature
func (UserFeature) TableName() string {
	return "user_features"
}

// Helper methods

// IsExpired checks if a user feature has expired
func (uf *UserFeature) IsExpired() bool {
	return uf.ExpiresAt != nil && time.Now().After(*uf.ExpiresAt)
}

// IsEffective checks if a user feature is currently effective
func (uf *UserFeature) IsEffective() bool {
	now := time.Now()
	if uf.EffectiveFrom != nil && now.Before(*uf.EffectiveFrom) {
		return false
	}
	if uf.ExpiresAt != nil && now.After(*uf.ExpiresAt) {
		return false
	}
	return true
}

// GetFullPath returns the full hierarchical path of the feature (e.g., "harvest.records.approve")
func (f *Feature) GetFullPath(db interface{ Preload(query string, args ...interface{}) interface{} }) string {
	if f.ParentID == nil {
		return f.Name
	}

	// Load parent if not loaded
	if f.Parent == nil && f.ParentID != nil {
		// This would need a database query in real usage
		// For now, just return the feature name
		return f.Name
	}

	if f.Parent != nil {
		return f.Parent.GetFullPath(db) + "." + f.Name
	}

	return f.Name
}

// HasChild checks if the feature has a specific child
func (f *Feature) HasChild(childName string) bool {
	for _, child := range f.Children {
		if child.Name == childName {
			return true
		}
	}
	return false
}

// IsChildOf checks if this feature is a child of the given parent feature
func (f *Feature) IsChildOf(parentID uuid.UUID) bool {
	return f.ParentID != nil && *f.ParentID == parentID
}

// HasFeature checks if the user has a specific feature
func (ufs *UserFeatureSet) HasFeature(feature string) bool {
	if ufs.FeatureMap != nil {
		return ufs.FeatureMap[feature]
	}

	// Fallback to linear search
	for _, f := range ufs.Features {
		if f == feature {
			return true
		}
	}
	return false
}

// IsExpired checks if the user feature set has expired
func (ufs *UserFeatureSet) IsExpired() bool {
	return time.Now().After(ufs.ExpiresAt)
}

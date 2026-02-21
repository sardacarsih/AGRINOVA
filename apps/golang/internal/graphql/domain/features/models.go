// Package features contains Feature-based authorization GraphQL types.
package features

import (
	"agrinovagraphql/server/internal/graphql/domain/common"
	"time"
)

// ============================================================================
// FEATURE TYPES
// ============================================================================

// Feature represents a feature.
type Feature struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	DisplayName string           `json:"displayName"`
	Description *string          `json:"description,omitempty"`
	Module      string           `json:"module"`
	ParentID    *string          `json:"parentId,omitempty"`
	Parent      *Feature         `json:"parent,omitempty"`
	Children    []*Feature       `json:"children,omitempty"`
	IsActive    bool             `json:"isActive"`
	IsSystem    bool             `json:"isSystem"`
	Metadata    *FeatureMetadata `json:"metadata,omitempty"`
	CreatedAt   time.Time        `json:"createdAt"`
	UpdatedAt   time.Time        `json:"updatedAt"`
}

// FeatureMetadata for feature configuration.
type FeatureMetadata struct {
	ResourceType  *string  `json:"resourceType,omitempty"`
	Actions       []string `json:"actions,omitempty"`
	RequiredScope *string  `json:"requiredScope,omitempty"`
	Conditions    *string  `json:"conditions,omitempty"`
	UIMetadata    *string  `json:"uiMetadata,omitempty"`
}

// FeatureMetadataInput for input.
type FeatureMetadataInput struct {
	ResourceType  *string  `json:"resourceType,omitempty"`
	Actions       []string `json:"actions,omitempty"`
	RequiredScope *string  `json:"requiredScope,omitempty"`
	Conditions    *string  `json:"conditions,omitempty"`
	UIMetadata    *string  `json:"uiMetadata,omitempty"`
}

// ============================================================================
// ROLE FEATURES
// ============================================================================

// RoleFeature for role-feature assignment.
type RoleFeature struct {
	ID                  string     `json:"id"`
	RoleID              string     `json:"roleId"`
	FeatureID           string     `json:"featureId"`
	Feature             *Feature   `json:"feature"`
	InheritedFromRoleID *string    `json:"inheritedFromRoleId,omitempty"`
	IsDenied            bool       `json:"isDenied"`
	GrantedAt           time.Time  `json:"grantedAt"`
	GrantedBy           string     `json:"grantedBy"`
	ExpiresAt           *time.Time `json:"expiresAt,omitempty"`
	CreatedAt           time.Time  `json:"createdAt"`
}

// AssignRoleFeaturesInput for assigning.
type AssignRoleFeaturesInput struct {
	RoleName    string   `json:"roleName"`
	Features    []string `json:"features"`
	InheritFrom *string  `json:"inheritFrom,omitempty"`
}

// ============================================================================
// USER FEATURES
// ============================================================================

// UserFeature for user-specific overrides.
type UserFeature struct {
	ID            string        `json:"id"`
	UserID        string        `json:"userId"`
	FeatureID     string        `json:"featureId"`
	Feature       *Feature      `json:"feature"`
	Scope         *FeatureScope `json:"scope,omitempty"`
	IsGranted     bool          `json:"isGranted"`
	IsDenied      bool          `json:"isDenied"`
	Reason        *string       `json:"reason,omitempty"`
	EffectiveFrom *time.Time    `json:"effectiveFrom,omitempty"`
	ExpiresAt     *time.Time    `json:"expiresAt,omitempty"`
	GrantedBy     string        `json:"grantedBy"`
	GrantedAt     time.Time     `json:"grantedAt"`
	CreatedAt     time.Time     `json:"createdAt"`
}

// FeatureScope for scoped features.
type FeatureScope struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

// FeatureScopeInput for input.
type FeatureScopeInput struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

// ScopedFeature represents a feature with scope information.
type ScopedFeature struct {
	Feature   string        `json:"feature"`
	IsGranted bool          `json:"isGranted"`
	Scope     *FeatureScope `json:"scope,omitempty"`
	ExpiresAt *time.Time    `json:"expiresAt,omitempty"`
}

// UserFeatureSet represents a user's complete set of features.
type UserFeatureSet struct {
	UserID         string           `json:"userId"`
	Role           string           `json:"role"`
	Features       []string         `json:"features"`
	ScopedFeatures []*ScopedFeature `json:"scopedFeatures,omitempty"`
	ComputedAt     time.Time        `json:"computedAt"`
	ExpiresAt      time.Time        `json:"expiresAt"`
}

// GrantUserFeatureInput for granting.
type GrantUserFeatureInput struct {
	UserID        string             `json:"userId"`
	Feature       string             `json:"feature"`
	Scope         *FeatureScopeInput `json:"scope,omitempty"`
	EffectiveFrom *time.Time         `json:"effectiveFrom,omitempty"`
	ExpiresAt     *time.Time         `json:"expiresAt,omitempty"`
	Reason        *string            `json:"reason,omitempty"`
}

// DenyUserFeatureInput for denying.
type DenyUserFeatureInput struct {
	UserID        string             `json:"userId"`
	Feature       string             `json:"feature"`
	Scope         *FeatureScopeInput `json:"scope,omitempty"`
	EffectiveFrom *time.Time         `json:"effectiveFrom,omitempty"`
	ExpiresAt     *time.Time         `json:"expiresAt,omitempty"`
	Reason        *string            `json:"reason,omitempty"`
}

// RevokeUserFeatureInput for revoking.
type RevokeUserFeatureInput struct {
	UserID  string             `json:"userId"`
	Feature string             `json:"feature"`
	Scope   *FeatureScopeInput `json:"scope,omitempty"`
}

// ============================================================================
// FEATURE CHECKING
// ============================================================================

// FeatureCheckInput for checking.
type FeatureCheckInput struct {
	UserID  string             `json:"userId"`
	Feature string             `json:"feature"`
	Scope   *FeatureScopeInput `json:"scope,omitempty"`
}

// FeatureCheckResult for result.
type FeatureCheckResult struct {
	UserID       string    `json:"userId"`
	Feature      string    `json:"feature"`
	HasAccess    bool      `json:"hasAccess"`
	AccessReason *string   `json:"accessReason,omitempty"`
	DenialReason *string   `json:"denialReason,omitempty"`
	CheckedAt    time.Time `json:"checkedAt"`
}

// BatchFeatureCheckInput for batch.
type BatchFeatureCheckInput struct {
	UserID     string             `json:"userId"`
	Features   []string           `json:"features"`
	RequireAll *bool              `json:"requireAll,omitempty"`
	Scope      *FeatureScopeInput `json:"scope,omitempty"`
}

// BatchFeatureCheckResult for batch result.
type BatchFeatureCheckResult struct {
	UserID          string   `json:"userId"`
	Features        []string `json:"features"`
	HasAccess       bool     `json:"hasAccess"`
	GrantedFeatures []string `json:"grantedFeatures,omitempty"`
	DeniedFeatures  []string `json:"deniedFeatures,omitempty"`
}

// ============================================================================
// INPUTS
// ============================================================================

// CreateFeatureInput for creating.
type CreateFeatureInput struct {
	Name        string                `json:"name"`
	DisplayName string                `json:"displayName"`
	Description *string               `json:"description,omitempty"`
	Module      string                `json:"module"`
	ParentID    *string               `json:"parentId,omitempty"`
	IsActive    *bool                 `json:"isActive,omitempty"`
	Metadata    *FeatureMetadataInput `json:"metadata,omitempty"`
}

// UpdateFeatureInput represents input for updating an existing feature.
type UpdateFeatureInput struct {
	ID          string                `json:"id"`
	DisplayName *string               `json:"displayName,omitempty"`
	Description *string               `json:"description,omitempty"`
	IsActive    *bool                 `json:"isActive,omitempty"`
	Metadata    *FeatureMetadataInput `json:"metadata,omitempty"`
}

// FeatureFilterInput for filtering.
type FeatureFilterInput struct {
	Module   *string `json:"module,omitempty"`
	ParentID *string `json:"parentId,omitempty"`
	IsActive *bool   `json:"isActive,omitempty"`
	IsSystem *bool   `json:"isSystem,omitempty"`
	Search   *string `json:"search,omitempty"`
}

// ============================================================================
// RESPONSES
// ============================================================================

// FeaturesResponse for paginated list.
type FeaturesResponse struct {
	Features    []*Feature       `json:"features"`
	TotalCount  int32            `json:"totalCount"`
	HasNextPage bool             `json:"hasNextPage"`
	PageInfo    *common.PageInfo `json:"pageInfo"`
}

// FeatureHierarchy for tree display.
type FeatureHierarchy struct {
	Feature  *Feature            `json:"feature"`
	Children []*FeatureHierarchy `json:"children,omitempty"`
	Depth    int32               `json:"depth"`
}

// FeatureStats for statistics.
type FeatureStats struct {
	TotalFeatures         int32   `json:"totalFeatures"`
	ActiveFeatures        int32   `json:"activeFeatures"`
	SystemFeatures        int32   `json:"systemFeatures"`
	CustomFeatures        int32   `json:"customFeatures"`
	TotalRoleFeatures     int32   `json:"totalRoleFeatures"`
	TotalUserOverrides    int32   `json:"totalUserOverrides"`
	FeaturesByModule      string  `json:"featuresByModule"`
	CacheHitRate          float64 `json:"cacheHitRate"`
	AverageCheckLatencyMs float64 `json:"averageCheckLatencyMs"`
	CacheStats            *string `json:"cacheStats,omitempty"`
}

// FeatureUpdateEvent for subscriptions.
type FeatureUpdateEvent struct {
	EventType   string    `json:"eventType"`
	Feature     *Feature  `json:"feature"`
	Timestamp   time.Time `json:"timestamp"`
	PerformedBy string    `json:"performedBy"`
}

// UserFeatureUpdateEvent for user feature subscriptions.
type UserFeatureUpdateEvent struct {
	EventType   string    `json:"eventType"`
	UserID      string    `json:"userId"`
	Feature     string    `json:"feature"`
	IsGranted   *bool     `json:"isGranted,omitempty"`
	Timestamp   time.Time `json:"timestamp"`
	PerformedBy string    `json:"performedBy"`
}

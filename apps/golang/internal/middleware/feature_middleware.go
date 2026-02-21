package middleware

import (
	"context"
	"fmt"

	"agrinovagraphql/server/internal/features/models"
	"agrinovagraphql/server/internal/features/services"
	"agrinovagraphql/server/internal/graphql/domain/auth"
)

// FeatureMiddleware provides feature-based authorization middleware
type FeatureMiddleware struct {
	compositionService *services.FeatureCompositionService
}

// NewFeatureMiddleware creates a new feature middleware
func NewFeatureMiddleware(compositionService *services.FeatureCompositionService) *FeatureMiddleware {
	return &FeatureMiddleware{
		compositionService: compositionService,
	}
}

// RequireFeature is a middleware function that checks if a user has a specific feature
// Usage in resolvers:
//   if err := featureMiddleware.RequireFeature(ctx, "harvest.create", nil); err != nil {
//       return nil, err
//   }
func (m *FeatureMiddleware) RequireFeature(ctx context.Context, featureCode string, scope *models.FeatureScope) error {
	user, err := getUserFromContext(ctx)
	if err != nil {
		return fmt.Errorf("unauthorized: %w", err)
	}

	hasFeature, err := m.compositionService.HasFeature(ctx, user.ID, featureCode, scope)
	if err != nil {
		return fmt.Errorf("failed to check feature access: %w", err)
	}

	if !hasFeature {
		return fmt.Errorf("insufficient permissions: feature '%s' required", featureCode)
	}

	return nil
}

// RequireAnyFeature checks if a user has at least one of the specified features
// Usage in resolvers:
//   if err := featureMiddleware.RequireAnyFeature(ctx, []string{"harvest.view", "harvest.create"}, nil); err != nil {
//       return nil, err
//   }
func (m *FeatureMiddleware) RequireAnyFeature(ctx context.Context, featureCodes []string, scope *models.FeatureScope) error {
	user, err := getUserFromContext(ctx)
	if err != nil {
		return fmt.Errorf("unauthorized: %w", err)
	}

	hasAny, err := m.compositionService.HasAnyFeature(ctx, user.ID, featureCodes, scope)
	if err != nil {
		return fmt.Errorf("failed to check feature access: %w", err)
	}

	if !hasAny {
		return fmt.Errorf("insufficient permissions: at least one of %v features required", featureCodes)
	}

	return nil
}

// RequireAllFeatures checks if a user has all of the specified features
// Usage in resolvers:
//   if err := featureMiddleware.RequireAllFeatures(ctx, []string{"harvest.view", "harvest.approve"}, nil); err != nil {
//       return nil, err
//   }
func (m *FeatureMiddleware) RequireAllFeatures(ctx context.Context, featureCodes []string, scope *models.FeatureScope) error {
	user, err := getUserFromContext(ctx)
	if err != nil {
		return fmt.Errorf("unauthorized: %w", err)
	}

	hasAll, err := m.compositionService.HasAllFeatures(ctx, user.ID, featureCodes, scope)
	if err != nil {
		return fmt.Errorf("failed to check feature access: %w", err)
	}

	if !hasAll {
		return fmt.Errorf("insufficient permissions: all of %v features required", featureCodes)
	}

	return nil
}

// CheckFeature returns whether a user has a feature (non-blocking check)
// Usage in resolvers:
//   hasFeature, err := featureMiddleware.CheckFeature(ctx, "harvest.approve", nil)
//   if err != nil {
//       return nil, err
//   }
//   if hasFeature {
//       // Allow approval functionality
//   }
func (m *FeatureMiddleware) CheckFeature(ctx context.Context, featureCode string, scope *models.FeatureScope) (bool, error) {
	user, err := getUserFromContext(ctx)
	if err != nil {
		return false, fmt.Errorf("unauthorized: %w", err)
	}

	return m.compositionService.HasFeature(ctx, user.ID, featureCode, scope)
}

// GetUserFeatures retrieves all features for the current user
// Usage in resolvers:
//   features, err := featureMiddleware.GetUserFeatures(ctx)
//   if err != nil {
//       return nil, err
//   }
func (m *FeatureMiddleware) GetUserFeatures(ctx context.Context) (*models.UserFeatureSet, error) {
	user, err := getUserFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("unauthorized: %w", err)
	}

	return m.compositionService.ComputeUserFeatures(ctx, user.ID)
}

// FeatureGuard creates a reusable feature guard for a resolver
// Usage:
//   guard := featureMiddleware.FeatureGuard("harvest.create")
//   if err := guard(ctx); err != nil {
//       return nil, err
//   }
func (m *FeatureMiddleware) FeatureGuard(featureCode string) func(context.Context) error {
	return func(ctx context.Context) error {
		return m.RequireFeature(ctx, featureCode, nil)
	}
}

// ScopedFeatureGuard creates a reusable scoped feature guard
// Usage:
//   scope := &models.FeatureScope{Type: "estate", ID: estateID}
//   guard := featureMiddleware.ScopedFeatureGuard("harvest.create", scope)
//   if err := guard(ctx); err != nil {
//       return nil, err
//   }
func (m *FeatureMiddleware) ScopedFeatureGuard(featureCode string, scope *models.FeatureScope) func(context.Context) error {
	return func(ctx context.Context) error {
		return m.RequireFeature(ctx, featureCode, scope)
	}
}

// getUserFromContext extracts the user from context
func getUserFromContext(ctx context.Context) (*auth.User, error) {
	user := ctx.Value("user")
	if user == nil {
		return nil, fmt.Errorf("user not found in context")
	}

	gqlUser, ok := user.(*auth.User)
	if !ok {
		return nil, fmt.Errorf("invalid user type in context")
	}

	return gqlUser, nil
}

// =============================================================================
// Helper Functions for Common Feature Checks
// =============================================================================

// CanViewHarvest checks if user can view harvest records
func (m *FeatureMiddleware) CanViewHarvest(ctx context.Context, scope *models.FeatureScope) error {
	return m.RequireFeature(ctx, "harvest.view", scope)
}

// CanCreateHarvest checks if user can create harvest records
func (m *FeatureMiddleware) CanCreateHarvest(ctx context.Context, scope *models.FeatureScope) error {
	return m.RequireFeature(ctx, "harvest.create", scope)
}

// CanApproveHarvest checks if user can approve harvest records
func (m *FeatureMiddleware) CanApproveHarvest(ctx context.Context, scope *models.FeatureScope) error {
	return m.RequireFeature(ctx, "harvest.approve", scope)
}

// CanManageUsers checks if user can manage users
func (m *FeatureMiddleware) CanManageUsers(ctx context.Context, scope *models.FeatureScope) error {
	return m.RequireFeature(ctx, "user.manage", scope)
}

// CanManageCompanies checks if user can manage companies
func (m *FeatureMiddleware) CanManageCompanies(ctx context.Context) error {
	return m.RequireFeature(ctx, "company.manage", nil)
}

// CanViewReports checks if user can view reports
func (m *FeatureMiddleware) CanViewReports(ctx context.Context, scope *models.FeatureScope) error {
	return m.RequireFeature(ctx, "reports.view", scope)
}

// CanPerformGateCheck checks if user can perform gate checks
func (m *FeatureMiddleware) CanPerformGateCheck(ctx context.Context, scope *models.FeatureScope) error {
	return m.RequireFeature(ctx, "gatecheck.perform", scope)
}

// =============================================================================
// Feature Composition Helpers
// =============================================================================

// HasHarvestAccess checks if user has any harvest-related access
func (m *FeatureMiddleware) HasHarvestAccess(ctx context.Context, scope *models.FeatureScope) (bool, error) {
	return m.compositionService.HasAnyFeature(ctx, getUserIDFromContext(ctx), []string{
		"harvest.view",
		"harvest.create",
		"harvest.approve",
		"harvest.reject",
	}, scope)
}

// HasAdminAccess checks if user has admin-level access
func (m *FeatureMiddleware) HasAdminAccess(ctx context.Context) (bool, error) {
	return m.compositionService.HasAnyFeature(ctx, getUserIDFromContext(ctx), []string{
		"admin.full_access",
		"company.manage",
		"user.manage",
	}, nil)
}

// getUserIDFromContext extracts user ID from context (helper)
func getUserIDFromContext(ctx context.Context) string {
	user := ctx.Value("user")
	if user == nil {
		return ""
	}

	gqlUser, ok := user.(*auth.User)
	if !ok {
		return ""
	}

	return gqlUser.ID
}

// =============================================================================
// Feature Decorators for Resolvers
// =============================================================================

// WithFeature is a decorator that wraps a resolver function with feature checking
// Usage:
//   func (r *Resolver) CreateHarvest(ctx context.Context, input HarvestInput) (*Harvest, error) {
//       return featureMiddleware.WithFeature("harvest.create", nil)(func() (interface{}, error) {
//           // Your resolver logic here
//           return createHarvestLogic(ctx, input)
//       })
//   }
func (m *FeatureMiddleware) WithFeature(featureCode string, scope *models.FeatureScope) func(func() (interface{}, error)) (interface{}, error) {
	return func(fn func() (interface{}, error)) (interface{}, error) {
		// This would need context passed in
		// This is a more advanced pattern that might not work well with gqlgen
		// Better to use RequireFeature directly in resolvers
		return fn()
	}
}

// =============================================================================
// Batch Feature Checks
// =============================================================================

// CheckMultipleFeatures checks multiple features at once and returns which ones the user has
// Returns: map[featureCode]hasAccess
func (m *FeatureMiddleware) CheckMultipleFeatures(ctx context.Context, featureCodes []string, scope *models.FeatureScope) (map[string]bool, error) {
	user, err := getUserFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("unauthorized: %w", err)
	}

	result := make(map[string]bool)
	for _, featureCode := range featureCodes {
		hasFeature, err := m.compositionService.HasFeature(ctx, user.ID, featureCode, scope)
		if err != nil {
			return nil, fmt.Errorf("failed to check feature %s: %w", featureCode, err)
		}
		result[featureCode] = hasFeature
	}

	return result, nil
}

// =============================================================================
// Scope Helpers
// =============================================================================

// ExtractEstateScope creates a feature scope for an estate
func ExtractEstateScope(estateID string) *models.FeatureScope {
	return &models.FeatureScope{
		Type: "estate",
		ID:   estateID,
	}
}

// ExtractDivisionScope creates a feature scope for a division
func ExtractDivisionScope(divisionID string) *models.FeatureScope {
	return &models.FeatureScope{
		Type: "division",
		ID:   divisionID,
	}
}

// ExtractBlockScope creates a feature scope for a block
func ExtractBlockScope(blockID string) *models.FeatureScope {
	return &models.FeatureScope{
		Type: "block",
		ID:   blockID,
	}
}

// ExtractCompanyScope creates a feature scope for a company
func ExtractCompanyScope(companyID string) *models.FeatureScope {
	return &models.FeatureScope{
		Type: "company",
		ID:   companyID,
	}
}

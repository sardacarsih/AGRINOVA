package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"agrinovagraphql/server/internal/features/models"
	rbacmodels "agrinovagraphql/server/internal/rbac/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FeatureCompositionService provides fast feature resolution with caching
// Target: <5ms feature resolution for typical queries
type FeatureCompositionService struct {
	db *gorm.DB

	// In-memory caches for fast lookups
	featureCache      map[string]*models.Feature           // feature name -> Feature
	featureIDCache    map[uuid.UUID]*models.Feature        // feature ID -> Feature
	roleFeatureCache  map[string][]string                  // role name -> feature names
	userFeatureCache  map[string]*models.UserFeatureSet    // user ID -> UserFeatureSet
	featureTreeCache  map[string][]*models.Feature         // parent feature name -> children
	featurePathCache  map[string]string                    // feature name -> full hierarchical path

	// Cache metadata
	cacheStats        CacheStatistics
	cacheMutex        sync.RWMutex

	// Background refresh
	refreshTicker     *time.Ticker
	stopRefresh       chan bool
}

// CacheStatistics tracks cache performance metrics
type CacheStatistics struct {
	TotalRequests     int64
	CacheHits         int64
	CacheMisses       int64
	TotalLatencyMs    float64
	AverageLatencyMs  float64
	LastRefresh       time.Time
	CachedUsers       int
	CachedFeatures    int
	CachedRoles       int
	mutex             sync.RWMutex
}

// NewFeatureCompositionService creates a new feature composition service
func NewFeatureCompositionService(db *gorm.DB) *FeatureCompositionService {
	service := &FeatureCompositionService{
		db:               db,
		featureCache:     make(map[string]*models.Feature),
		featureIDCache:   make(map[uuid.UUID]*models.Feature),
		roleFeatureCache: make(map[string][]string),
		userFeatureCache: make(map[string]*models.UserFeatureSet),
		featureTreeCache: make(map[string][]*models.Feature),
		featurePathCache: make(map[string]string),
		stopRefresh:      make(chan bool),
	}

	// Initialize caches
	ctx := context.Background()
	if err := service.RefreshAllCaches(ctx); err != nil {
		// Log error but don't fail initialization
		fmt.Printf("Warning: Failed to initialize feature caches: %v\n", err)
	}

	// Start background refresh (every 5 minutes)
	service.startBackgroundRefresh(5 * time.Minute)

	return service
}

// HasFeature checks if a user has access to a specific feature
// This is the main entry point with <5ms target latency
func (s *FeatureCompositionService) HasFeature(ctx context.Context, userID, featureName string, scope *models.FeatureScope) (bool, error) {
	startTime := time.Now()
	defer func() {
		latency := time.Since(startTime).Milliseconds()
		s.recordRequestLatency(float64(latency))
	}()

	// Validate inputs
	if userID == "" || featureName == "" {
		return false, fmt.Errorf("userID and featureName are required")
	}

	// Try cache first
	userFeatureSet, found := s.getUserFeatureSetFromCache(userID)
	if found && !userFeatureSet.IsExpired() {
		s.recordCacheHit()
		hasAccess := s.checkFeatureInSet(userFeatureSet, featureName, scope)
		return hasAccess, nil
	}

	s.recordCacheMiss()

	// Cache miss - compute feature set
	userFeatureSet, err := s.ComputeUserFeatures(ctx, userID)
	if err != nil {
		return false, fmt.Errorf("failed to compute user features: %w", err)
	}

	// Cache the result
	s.cacheUserFeatureSet(userID, userFeatureSet)

	hasAccess := s.checkFeatureInSet(userFeatureSet, featureName, scope)
	return hasAccess, nil
}

// ComputeUserFeatures computes the complete feature set for a user
// Combines role-based features, user-specific grants/denials, and inheritance
func (s *FeatureCompositionService) ComputeUserFeatures(ctx context.Context, userID string) (*models.UserFeatureSet, error) {
	// Get user's role
	var user struct {
		ID   string
		Role string
	}

	if err := s.db.WithContext(ctx).Table("users").
		Select("id, role").
		Where("id = ?", userID).
		First(&user).Error; err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Get role-based features (from cache or DB)
	roleFeatures, err := s.getRoleFeatures(ctx, user.Role)
	if err != nil {
		return nil, fmt.Errorf("failed to get role features: %w", err)
	}

	// Get user-specific feature grants/denials
	userSpecificFeatures, err := s.getUserSpecificFeatures(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user specific features: %w", err)
	}

	// Compose final feature set
	featureSet := s.composeFeatureSet(user.Role, roleFeatures, userSpecificFeatures)
	featureSet.UserID = userID
	featureSet.Role = user.Role
	featureSet.ComputedAt = time.Now()
	featureSet.ExpiresAt = time.Now().Add(5 * time.Minute) // 5-minute cache TTL

	// Build feature map for O(1) lookup
	featureSet.FeatureMap = make(map[string]bool)
	for _, feature := range featureSet.Features {
		featureSet.FeatureMap[feature] = true

		// Also add parent features (inheritance)
		parentFeatures := s.getParentFeatures(feature)
		for _, parent := range parentFeatures {
			featureSet.FeatureMap[parent] = true
		}
	}

	return featureSet, nil
}

// getRoleFeatures retrieves all features for a role (with caching)
func (s *FeatureCompositionService) getRoleFeatures(ctx context.Context, roleName string) ([]string, error) {
	// Try cache first
	s.cacheMutex.RLock()
	cached, found := s.roleFeatureCache[roleName]
	s.cacheMutex.RUnlock()

	if found {
		return cached, nil
	}

	// Get role ID from RBAC models
	var role rbacmodels.Role
	if err := s.db.WithContext(ctx).Where("name = ? AND is_active = true", roleName).First(&role).Error; err != nil {
		return nil, fmt.Errorf("role not found: %w", err)
	}

	// Query role features with inheritance
	var features []string
	err := s.db.WithContext(ctx).Raw(`
		SELECT DISTINCT f.name
		FROM features f
		INNER JOIN role_features rf ON f.id = rf.feature_id
		WHERE rf.role_id = ?
		  AND rf.is_denied = false
		  AND (rf.expires_at IS NULL OR rf.expires_at > NOW())
		  AND f.is_active = true
		  AND rf.deleted_at IS NULL
		  AND f.deleted_at IS NULL
		ORDER BY f.name
	`, role.ID).Scan(&features).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query role features: %w", err)
	}

	// Expand with child features (feature inheritance)
	expandedFeatures := s.expandFeaturesWithChildren(features)

	// Cache the result
	s.cacheMutex.Lock()
	s.roleFeatureCache[roleName] = expandedFeatures
	s.cacheMutex.Unlock()

	return expandedFeatures, nil
}

// getUserSpecificFeatures retrieves user-specific feature overrides
func (s *FeatureCompositionService) getUserSpecificFeatures(ctx context.Context, userID string) ([]models.ScopedFeature, error) {
	var userFeatures []struct {
		FeatureName string
		IsGranted   bool
		ScopeType   *string
		ScopeID     *uuid.UUID
		ExpiresAt   *time.Time
	}

	err := s.db.WithContext(ctx).Raw(`
		SELECT f.name as feature_name, uf.is_granted, uf.scope_type, uf.scope_id, uf.expires_at
		FROM user_features uf
		INNER JOIN features f ON uf.feature_id = f.id
		WHERE uf.user_id = ?
		  AND (uf.effective_from IS NULL OR uf.effective_from <= NOW())
		  AND (uf.expires_at IS NULL OR uf.expires_at > NOW())
		  AND uf.deleted_at IS NULL
		  AND f.deleted_at IS NULL
	`, userID).Scan(&userFeatures).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query user features: %w", err)
	}

	// Convert to scoped features
	scopedFeatures := make([]models.ScopedFeature, len(userFeatures))
	for i, uf := range userFeatures {
		var scope *models.FeatureScope
		if uf.ScopeType != nil && uf.ScopeID != nil {
			scope = &models.FeatureScope{
				Type: *uf.ScopeType,
				ID:   uf.ScopeID.String(),
			}
		}

		scopedFeatures[i] = models.ScopedFeature{
			Feature:   uf.FeatureName,
			IsGranted: uf.IsGranted,
			Scope:     scope,
			ExpiresAt: uf.ExpiresAt,
		}
	}

	return scopedFeatures, nil
}

// composeFeatureSet combines role features and user-specific features
func (s *FeatureCompositionService) composeFeatureSet(role string, roleFeatures []string, userFeatures []models.ScopedFeature) *models.UserFeatureSet {
	// Start with role features
	featureMap := make(map[string]bool)
	for _, feature := range roleFeatures {
		featureMap[feature] = true
	}

	// Apply user-specific grants/denials
	scopedFeatures := []models.ScopedFeature{}
	for _, uf := range userFeatures {
		if uf.IsGranted {
			// User grant - add to feature set
			featureMap[uf.Feature] = true
			scopedFeatures = append(scopedFeatures, uf)
		} else {
			// User denial - remove from feature set
			delete(featureMap, uf.Feature)
			scopedFeatures = append(scopedFeatures, uf)
		}
	}

	// Convert map to slice
	features := make([]string, 0, len(featureMap))
	for feature := range featureMap {
		features = append(features, feature)
	}

	return &models.UserFeatureSet{
		Features:       features,
		FeatureMap:     featureMap,
		ScopedFeatures: scopedFeatures,
	}
}

// expandFeaturesWithChildren expands features to include all child features
// If a user has "harvest" feature, they automatically get "harvest.view", "harvest.create", etc.
func (s *FeatureCompositionService) expandFeaturesWithChildren(features []string) []string {
	expanded := make(map[string]bool)

	for _, feature := range features {
		expanded[feature] = true

		// Get all children recursively
		children := s.getChildrenRecursive(feature)
		for _, child := range children {
			expanded[child] = true
		}
	}

	// Convert to slice
	result := make([]string, 0, len(expanded))
	for feature := range expanded {
		result = append(result, feature)
	}

	return result
}

// getChildrenRecursive gets all child features recursively
func (s *FeatureCompositionService) getChildrenRecursive(featureName string) []string {
	s.cacheMutex.RLock()
	children, found := s.featureTreeCache[featureName]
	s.cacheMutex.RUnlock()

	if !found {
		return []string{}
	}

	result := []string{}
	for _, child := range children {
		result = append(result, child.Name)
		// Recursively get grandchildren
		grandchildren := s.getChildrenRecursive(child.Name)
		result = append(result, grandchildren...)
	}

	return result
}

// getParentFeatures gets all parent features for a feature (for inheritance)
func (s *FeatureCompositionService) getParentFeatures(featureName string) []string {
	s.cacheMutex.RLock()
	feature, found := s.featureCache[featureName]
	s.cacheMutex.RUnlock()

	if !found || feature.ParentID == nil {
		return []string{}
	}

	parents := []string{}
	current := feature
	for current.ParentID != nil {
		s.cacheMutex.RLock()
		parent, found := s.featureIDCache[*current.ParentID]
		s.cacheMutex.RUnlock()

		if !found {
			break
		}

		parents = append(parents, parent.Name)
		current = parent
	}

	return parents
}

// checkFeatureInSet checks if a feature exists in the user's feature set
func (s *FeatureCompositionService) checkFeatureInSet(featureSet *models.UserFeatureSet, featureName string, scope *models.FeatureScope) bool {
	// Basic feature check
	if !featureSet.HasFeature(featureName) {
		return false
	}

	// If no scope specified, basic access is sufficient
	if scope == nil {
		return true
	}

	// Check scoped features
	for _, sf := range featureSet.ScopedFeatures {
		if sf.Feature == featureName {
			// Check if scope matches
			if sf.Scope != nil && sf.Scope.Type == scope.Type && sf.Scope.ID == scope.ID {
				return sf.IsGranted
			}
		}
	}

	// Has feature but no specific scope match - allow access
	return true
}

// Cache management methods

func (s *FeatureCompositionService) getUserFeatureSetFromCache(userID string) (*models.UserFeatureSet, bool) {
	s.cacheMutex.RLock()
	defer s.cacheMutex.RUnlock()

	featureSet, found := s.userFeatureCache[userID]
	return featureSet, found
}

func (s *FeatureCompositionService) cacheUserFeatureSet(userID string, featureSet *models.UserFeatureSet) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	s.userFeatureCache[userID] = featureSet
}

// RefreshAllCaches refreshes all in-memory caches
func (s *FeatureCompositionService) RefreshAllCaches(ctx context.Context) error {
	// Refresh feature cache
	var features []models.Feature
	if err := s.db.WithContext(ctx).
		Where("is_active = true AND deleted_at IS NULL").
		Preload("Children").
		Find(&features).Error; err != nil {
		return fmt.Errorf("failed to load features: %w", err)
	}

	s.cacheMutex.Lock()
	// Clear existing caches
	s.featureCache = make(map[string]*models.Feature)
	s.featureIDCache = make(map[uuid.UUID]*models.Feature)
	s.featureTreeCache = make(map[string][]*models.Feature)
	s.featurePathCache = make(map[string]string)

	// Build caches
	for i := range features {
		feature := &features[i]
		s.featureCache[feature.Name] = feature
		s.featureIDCache[feature.ID] = feature

		// Build feature tree
		if feature.ParentID != nil {
			parent, found := s.featureIDCache[*feature.ParentID]
			if found {
				s.featureTreeCache[parent.Name] = append(s.featureTreeCache[parent.Name], feature)
			}
		}
	}

	s.cacheStats.CachedFeatures = len(features)
	s.cacheStats.LastRefresh = time.Now()
	s.cacheMutex.Unlock()

	return nil
}

// ClearUserCache clears the cache for a specific user
func (s *FeatureCompositionService) ClearUserCache(userID string) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	delete(s.userFeatureCache, userID)
}

// ClearAllUserCaches clears all user feature caches
func (s *FeatureCompositionService) ClearAllUserCaches() {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	s.userFeatureCache = make(map[string]*models.UserFeatureSet)
}

// Statistics methods

func (s *FeatureCompositionService) recordCacheHit() {
	s.cacheStats.mutex.Lock()
	defer s.cacheStats.mutex.Unlock()

	s.cacheStats.TotalRequests++
	s.cacheStats.CacheHits++
}

func (s *FeatureCompositionService) recordCacheMiss() {
	s.cacheStats.mutex.Lock()
	defer s.cacheStats.mutex.Unlock()

	s.cacheStats.TotalRequests++
	s.cacheStats.CacheMisses++
}

func (s *FeatureCompositionService) recordRequestLatency(latencyMs float64) {
	s.cacheStats.mutex.Lock()
	defer s.cacheStats.mutex.Unlock()

	s.cacheStats.TotalLatencyMs += latencyMs
	if s.cacheStats.TotalRequests > 0 {
		s.cacheStats.AverageLatencyMs = s.cacheStats.TotalLatencyMs / float64(s.cacheStats.TotalRequests)
	}
}

// GetCacheStatistics returns current cache statistics
func (s *FeatureCompositionService) GetCacheStatistics() models.FeatureStats {
	s.cacheStats.mutex.RLock()
	defer s.cacheStats.mutex.RUnlock()

	s.cacheMutex.RLock()
	cachedUsers := len(s.userFeatureCache)
	cachedFeatures := len(s.featureCache)
	cachedRoles := len(s.roleFeatureCache)
	s.cacheMutex.RUnlock()

	cacheHitRate := 0.0
	if s.cacheStats.TotalRequests > 0 {
		cacheHitRate = float64(s.cacheStats.CacheHits) / float64(s.cacheStats.TotalRequests) * 100
	}

	return models.FeatureStats{
		TotalFeatures:       cachedFeatures,
		ActiveFeatures:      cachedFeatures,
		CacheHitRate:        cacheHitRate,
		AverageCheckLatency: s.cacheStats.AverageLatencyMs,
		CacheStats: map[string]interface{}{
			"total_requests":   s.cacheStats.TotalRequests,
			"cache_hits":       s.cacheStats.CacheHits,
			"cache_misses":     s.cacheStats.CacheMisses,
			"cached_users":     cachedUsers,
			"cached_features":  cachedFeatures,
			"cached_roles":     cachedRoles,
			"last_refresh":     s.cacheStats.LastRefresh.Format(time.RFC3339),
		},
	}
}

// Background refresh

func (s *FeatureCompositionService) startBackgroundRefresh(interval time.Duration) {
	s.refreshTicker = time.NewTicker(interval)

	go func() {
		for {
			select {
			case <-s.refreshTicker.C:
				ctx := context.Background()
				if err := s.RefreshAllCaches(ctx); err != nil {
					fmt.Printf("Background cache refresh failed: %v\n", err)
				}
			case <-s.stopRefresh:
				s.refreshTicker.Stop()
				return
			}
		}
	}()
}

// HasAnyFeature checks if a user has any of the specified features
func (s *FeatureCompositionService) HasAnyFeature(ctx context.Context, userID string, featureCodes []string, scope *models.FeatureScope) (bool, error) {
	for _, featureCode := range featureCodes {
		hasFeature, err := s.HasFeature(ctx, userID, featureCode, scope)
		if err != nil {
			return false, err
		}
		if hasFeature {
			return true, nil
		}
	}
	return false, nil
}

// HasAllFeatures checks if a user has all of the specified features
func (s *FeatureCompositionService) HasAllFeatures(ctx context.Context, userID string, featureCodes []string, scope *models.FeatureScope) (bool, error) {
	for _, featureCode := range featureCodes {
		hasFeature, err := s.HasFeature(ctx, userID, featureCode, scope)
		if err != nil {
			return false, err
		}
		if !hasFeature {
			return false, nil
		}
	}
	return true, nil
}

// Stop stops the background refresh goroutine
func (s *FeatureCompositionService) Stop() {
	if s.stopRefresh != nil {
		close(s.stopRefresh)
	}
}

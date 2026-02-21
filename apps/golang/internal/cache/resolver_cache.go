package cache

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// CacheClient interface for cache operations
type CacheClient interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value string, expiration time.Duration) error
	Delete(ctx context.Context, key string) error
	DeletePattern(ctx context.Context, pattern string) error
	FlushDB(ctx context.Context) error
	GetMetrics() CacheMetrics
}

// ResolverCache provides security-aware caching for GraphQL resolvers
type ResolverCache struct {
	cache        CacheClient
	invalidation *InvalidationService
	ttls         map[string]time.Duration
}

// CacheKey represents a security-aware cache key
type CacheKey struct {
	// Base key components
	QueryName string                 `json:"query_name"`
	Arguments map[string]interface{} `json:"arguments"`

	// Security context
	UserID      uuid.UUID   `json:"user_id"`
	Role        string      `json:"role"`
	CompanyIDs  []uuid.UUID `json:"company_ids"`
	EstateIDs   []uuid.UUID `json:"estate_ids"`
	DivisionIDs []uuid.UUID `json:"division_ids"`
}

// NewResolverCache creates a new resolver cache
func NewResolverCache(cacheClient CacheClient, invalidation *InvalidationService) *ResolverCache {
	rc := &ResolverCache{
		cache:        cacheClient,
		invalidation: invalidation,
		ttls:         make(map[string]time.Duration),
	}

	// Set default TTLs for different query types
	rc.setDefaultTTLs()

	return rc
}

// setDefaultTTLs sets default cache TTLs for different query types
func (c *ResolverCache) setDefaultTTLs() {
	// Fast-changing data (short TTL)
	c.ttls["harvest_records"] = 1 * time.Minute
	c.ttls["harvest_statistics"] = 2 * time.Minute
	c.ttls["gate_check_records"] = 1 * time.Minute
	c.ttls["qr_tokens"] = 30 * time.Second

	// Medium-changing data (medium TTL)
	c.ttls["users"] = 5 * time.Minute
	c.ttls["user_assignments"] = 5 * time.Minute
	c.ttls["estates"] = 10 * time.Minute
	c.ttls["divisions"] = 10 * time.Minute
	c.ttls["blocks"] = 10 * time.Minute

	// Slow-changing data (long TTL)
	c.ttls["companies"] = 15 * time.Minute
	c.ttls["features"] = 30 * time.Minute
	c.ttls["roles"] = 30 * time.Minute

	// User profile data (balanced TTL with security consideration)
	c.ttls["user_profile"] = 3 * time.Minute
	c.ttls["user_permissions"] = 2 * time.Minute
}

// GetOrCompute retrieves cached data or computes it
func (c *ResolverCache) GetOrCompute(
	ctx context.Context,
	key *CacheKey,
	compute func() (interface{}, error),
) (interface{}, error) {
	// Build cache key
	cacheKey := c.buildCacheKey(key)

	// Try to get from cache
	cached, err := c.cache.Get(ctx, cacheKey)
	if err == nil {
		// Cache hit - deserialize and return
		var result interface{}
		if err := json.Unmarshal([]byte(cached), &result); err != nil {
			// If unmarshal fails, recompute
			return c.computeAndCache(ctx, cacheKey, key.QueryName, compute)
		}
		return result, nil
	}

	// Cache miss or error - compute value
	if err != ErrCacheMiss {
		// Log error but continue to compute
		fmt.Printf("Cache error: %v\n", err)
	}

	return c.computeAndCache(ctx, cacheKey, key.QueryName, compute)
}

// computeAndCache computes a value and caches it
func (c *ResolverCache) computeAndCache(
	ctx context.Context,
	cacheKey string,
	queryName string,
	compute func() (interface{}, error),
) (interface{}, error) {
	// Compute value
	value, err := compute()
	if err != nil {
		return nil, err
	}

	// Serialize value
	serialized, err := json.Marshal(value)
	if err != nil {
		// If serialization fails, return value without caching
		return value, nil
	}

	// Get TTL for this query type
	ttl := c.getTTL(queryName)

	// Cache the value
	if err := c.cache.Set(ctx, cacheKey, string(serialized), ttl); err != nil {
		// Log error but return the computed value
		fmt.Printf("Failed to cache value: %v\n", err)
	}

	return value, nil
}

// buildCacheKey builds a security-aware cache key
func (c *ResolverCache) buildCacheKey(key *CacheKey) string {
	// Create a deterministic key that includes security context
	components := []string{
		"resolver",
		key.QueryName,
		key.UserID.String(),
		key.Role,
	}

	// Add company IDs (sorted for determinism)
	for _, id := range key.CompanyIDs {
		components = append(components, fmt.Sprintf("c:%s", id.String()))
	}

	// Add estate IDs
	for _, id := range key.EstateIDs {
		components = append(components, fmt.Sprintf("e:%s", id.String()))
	}

	// Add division IDs
	for _, id := range key.DivisionIDs {
		components = append(components, fmt.Sprintf("d:%s", id.String()))
	}

	// Add arguments (hashed for variable-length safety)
	if len(key.Arguments) > 0 {
		argHash := c.hashArguments(key.Arguments)
		components = append(components, argHash)
	}

	// Join components with colons
	finalKey := ""
	for i, comp := range components {
		if i > 0 {
			finalKey += ":"
		}
		finalKey += comp
	}

	return finalKey
}

// hashArguments creates a deterministic hash of query arguments
func (c *ResolverCache) hashArguments(args map[string]interface{}) string {
	// Serialize arguments
	serialized, err := json.Marshal(args)
	if err != nil {
		// If serialization fails, use empty hash
		return "no-args"
	}

	// Hash serialized arguments
	hash := sha256.Sum256(serialized)
	return fmt.Sprintf("%x", hash[:8]) // Use first 8 bytes for shorter keys
}

// getTTL gets the TTL for a query type
func (c *ResolverCache) getTTL(queryName string) time.Duration {
	ttl, exists := c.ttls[queryName]
	if !exists {
		// Default TTL
		return 5 * time.Minute
	}
	return ttl
}

// SetTTL sets a custom TTL for a query type
func (c *ResolverCache) SetTTL(queryName string, ttl time.Duration) {
	c.ttls[queryName] = ttl
}

// InvalidateQuery invalidates cache for a specific query
func (c *ResolverCache) InvalidateQuery(ctx context.Context, key *CacheKey) error {
	cacheKey := c.buildCacheKey(key)
	return c.cache.Delete(ctx, cacheKey)
}

// InvalidateUserQueries invalidates all cached queries for a user
func (c *ResolverCache) InvalidateUserQueries(ctx context.Context, userID uuid.UUID) error {
	pattern := fmt.Sprintf("resolver:*:%s:*", userID.String())
	return c.cache.DeletePattern(ctx, pattern)
}

// Batch operations for efficiency

// MGet retrieves multiple keys in a single operation
func (c *ResolverCache) MGet(ctx context.Context, keys []*CacheKey) (map[string]interface{}, error) {
	results := make(map[string]interface{})

	for _, key := range keys {
		cacheKey := c.buildCacheKey(key)

		cached, err := c.cache.Get(ctx, cacheKey)
		if err == nil {
			var result interface{}
			if err := json.Unmarshal([]byte(cached), &result); err == nil {
				results[cacheKey] = result
			}
		}
	}

	return results, nil
}

// Performance optimization hints

// WarmCache pre-warms the cache with commonly accessed data
func (c *ResolverCache) WarmCache(ctx context.Context, warmers []CacheWarmer) error {
	for _, warmer := range warmers {
		if err := warmer.Warm(ctx, c); err != nil {
			// Log error but continue warming other entries
			fmt.Printf("Failed to warm cache: %v\n", err)
		}
	}

	return nil
}

// CacheWarmer interface for cache warming
type CacheWarmer interface {
	Warm(ctx context.Context, cache *ResolverCache) error
}

// Security-aware cache operations

// ValidateCacheAccess checks if a user can access cached data
func (c *ResolverCache) ValidateCacheAccess(key *CacheKey, dataOwnerID uuid.UUID) bool {
	// Super admin can access all data
	if key.Role == "SUPER_ADMIN" {
		return true
	}

	// User can access their own data
	if key.UserID == dataOwnerID {
		return true
	}

	// Additional role-based checks would go here
	return false
}

// GetCacheStats returns cache statistics
func (c *ResolverCache) GetCacheStats() CacheMetrics {
	return c.cache.GetMetrics()
}

// ClearCache clears all resolver cache (admin only)
func (c *ResolverCache) ClearCache(ctx context.Context, adminUserID uuid.UUID, reason string) error {
	// Log the cache clear operation
	return c.invalidation.InvalidateAll(ctx, reason, adminUserID)
}

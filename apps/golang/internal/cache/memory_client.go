package cache

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"
)

// Custom errors
var (
	ErrCacheMiss = fmt.Errorf("cache miss")
)

// MemoryConfig holds in-memory cache configuration
type MemoryConfig struct {
	// Cleanup settings
	CleanupInterval time.Duration // How often to clean expired entries
	MaxEntries      int           // Maximum number of entries (0 = unlimited)

	// Key prefix for multi-tenancy
	KeyPrefix string
}

// cacheEntry represents a single cache entry
type cacheEntry struct {
	value      string
	expiration time.Time
}

// isExpired checks if the entry has expired
func (e *cacheEntry) isExpired() bool {
	if e.expiration.IsZero() {
		return false // No expiration
	}
	return time.Now().After(e.expiration)
}

// MemoryClient is an in-memory cache client that replaces Redis
type MemoryClient struct {
	mu               sync.RWMutex
	data             map[string]*cacheEntry
	config           MemoryConfig
	metricsCollector *MetricsCollector
	stopCleanup      chan struct{}
}

// NewMemoryClient creates a new in-memory cache client
func NewMemoryClient(config MemoryConfig) (*MemoryClient, error) {
	// Set defaults
	if config.CleanupInterval == 0 {
		config.CleanupInterval = 1 * time.Minute
	}

	client := &MemoryClient{
		data:             make(map[string]*cacheEntry),
		config:           config,
		metricsCollector: NewMetricsCollector(),
		stopCleanup:      make(chan struct{}),
	}

	// Start cleanup goroutine
	go client.cleanupLoop()

	return client, nil
}

// cleanupLoop periodically removes expired entries
func (m *MemoryClient) cleanupLoop() {
	ticker := time.NewTicker(m.config.CleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.cleanup()
		case <-m.stopCleanup:
			return
		}
	}
}

// cleanup removes expired entries
func (m *MemoryClient) cleanup() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for key, entry := range m.data {
		if entry.isExpired() {
			delete(m.data, key)
		}
	}
}

// prefixKey adds the configured prefix to a key
func (m *MemoryClient) prefixKey(key string) string {
	if m.config.KeyPrefix == "" {
		return key
	}
	return m.config.KeyPrefix + ":" + key
}

// Get retrieves a value from cache
func (m *MemoryClient) Get(ctx context.Context, key string) (string, error) {
	startTime := time.Now()
	defer func() {
		m.metricsCollector.RecordOperation("GET", time.Since(startTime))
	}()

	fullKey := m.prefixKey(key)

	m.mu.RLock()
	entry, exists := m.data[fullKey]
	m.mu.RUnlock()

	if !exists || entry.isExpired() {
		m.metricsCollector.RecordCacheMiss()
		return "", ErrCacheMiss
	}

	m.metricsCollector.RecordCacheHit()
	return entry.value, nil
}

// Set stores a value in cache
func (m *MemoryClient) Set(ctx context.Context, key string, value string, expiration time.Duration) error {
	startTime := time.Now()
	defer func() {
		m.metricsCollector.RecordOperation("SET", time.Since(startTime))
	}()

	fullKey := m.prefixKey(key)

	var expirationTime time.Time
	if expiration > 0 {
		expirationTime = time.Now().Add(expiration)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// Check max entries limit
	if m.config.MaxEntries > 0 && len(m.data) >= m.config.MaxEntries {
		// Simple eviction: remove oldest expired entries first
		m.evictExpired()

		// If still at limit, remove a random entry
		if len(m.data) >= m.config.MaxEntries {
			for k := range m.data {
				delete(m.data, k)
				break
			}
		}
	}

	m.data[fullKey] = &cacheEntry{
		value:      value,
		expiration: expirationTime,
	}

	return nil
}

// evictExpired removes expired entries (must be called with lock held)
func (m *MemoryClient) evictExpired() {
	for key, entry := range m.data {
		if entry.isExpired() {
			delete(m.data, key)
		}
	}
}

// Delete removes a value from cache
func (m *MemoryClient) Delete(ctx context.Context, key string) error {
	startTime := time.Now()
	defer func() {
		m.metricsCollector.RecordOperation("DELETE", time.Since(startTime))
	}()

	fullKey := m.prefixKey(key)

	m.mu.Lock()
	delete(m.data, fullKey)
	m.mu.Unlock()

	return nil
}

// DeletePattern deletes all keys matching a pattern (supports * wildcard)
func (m *MemoryClient) DeletePattern(ctx context.Context, pattern string) error {
	startTime := time.Now()
	defer func() {
		m.metricsCollector.RecordOperation("DELETE_PATTERN", time.Since(startTime))
	}()

	fullPattern := m.prefixKey(pattern)

	m.mu.Lock()
	defer m.mu.Unlock()

	// Convert pattern to simple prefix/suffix matching
	// Support patterns like "prefix:*:suffix" or "prefix:*"
	for key := range m.data {
		if matchPattern(fullPattern, key) {
			delete(m.data, key)
		}
	}

	return nil
}

// matchPattern performs simple pattern matching with * wildcard
func matchPattern(pattern, key string) bool {
	// Replace * with a marker and split
	parts := strings.Split(pattern, "*")

	if len(parts) == 1 {
		// No wildcard, exact match
		return pattern == key
	}

	// Check if key starts and ends with the pattern parts
	pos := 0
	for i, part := range parts {
		if part == "" {
			continue
		}

		idx := strings.Index(key[pos:], part)
		if idx == -1 {
			return false
		}

		// First part must match at the beginning
		if i == 0 && idx != 0 {
			return false
		}

		pos += idx + len(part)
	}

	// Last part must match at the end
	lastPart := parts[len(parts)-1]
	if lastPart != "" && !strings.HasSuffix(key, lastPart) {
		return false
	}

	return true
}

// Exists checks if a key exists
func (m *MemoryClient) Exists(ctx context.Context, key string) (bool, error) {
	fullKey := m.prefixKey(key)

	m.mu.RLock()
	entry, exists := m.data[fullKey]
	m.mu.RUnlock()

	if !exists || entry.isExpired() {
		return false, nil
	}

	return true, nil
}

// SetNX sets a key only if it doesn't exist (for distributed locks)
func (m *MemoryClient) SetNX(ctx context.Context, key string, value string, expiration time.Duration) (bool, error) {
	fullKey := m.prefixKey(key)

	var expirationTime time.Time
	if expiration > 0 {
		expirationTime = time.Now().Add(expiration)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	entry, exists := m.data[fullKey]
	if exists && !entry.isExpired() {
		return false, nil // Key already exists
	}

	m.data[fullKey] = &cacheEntry{
		value:      value,
		expiration: expirationTime,
	}

	return true, nil
}

// Increment increments a counter
func (m *MemoryClient) Increment(ctx context.Context, key string) (int64, error) {
	return m.IncrementBy(ctx, key, 1)
}

// IncrementBy increments a counter by a specific amount
func (m *MemoryClient) IncrementBy(ctx context.Context, key string, amount int64) (int64, error) {
	fullKey := m.prefixKey(key)

	m.mu.Lock()
	defer m.mu.Unlock()

	entry, exists := m.data[fullKey]
	var currentVal int64 = 0

	if exists && !entry.isExpired() {
		// Parse current value
		_, err := fmt.Sscanf(entry.value, "%d", &currentVal)
		if err != nil {
			return 0, fmt.Errorf("value is not an integer: %w", err)
		}
	}

	newVal := currentVal + amount
	m.data[fullKey] = &cacheEntry{
		value:      fmt.Sprintf("%d", newVal),
		expiration: time.Time{}, // No expiration for counters
	}

	return newVal, nil
}

// Expire sets an expiration time for a key
func (m *MemoryClient) Expire(ctx context.Context, key string, expiration time.Duration) error {
	fullKey := m.prefixKey(key)

	m.mu.Lock()
	defer m.mu.Unlock()

	entry, exists := m.data[fullKey]
	if !exists {
		return fmt.Errorf("key does not exist")
	}

	entry.expiration = time.Now().Add(expiration)
	return nil
}

// TTL returns the remaining time to live for a key
func (m *MemoryClient) TTL(ctx context.Context, key string) (time.Duration, error) {
	fullKey := m.prefixKey(key)

	m.mu.RLock()
	entry, exists := m.data[fullKey]
	m.mu.RUnlock()

	if !exists {
		return -2 * time.Second, nil // Key doesn't exist (Redis convention)
	}

	if entry.expiration.IsZero() {
		return -1 * time.Second, nil // No expiration (Redis convention)
	}

	ttl := time.Until(entry.expiration)
	if ttl < 0 {
		return -2 * time.Second, nil // Expired
	}

	return ttl, nil
}

// Close stops the cleanup goroutine
func (m *MemoryClient) Close() error {
	close(m.stopCleanup)
	return nil
}

// GetMetrics returns cache metrics
func (m *MemoryClient) GetMetrics() CacheMetrics {
	return m.metricsCollector.GetMetrics()
}

// FlushDB clears all entries
func (m *MemoryClient) FlushDB(ctx context.Context) error {
	m.mu.Lock()
	m.data = make(map[string]*cacheEntry)
	m.mu.Unlock()

	return nil
}

// Ping checks if the cache is responsive (always returns nil for memory cache)
func (m *MemoryClient) Ping(ctx context.Context) error {
	return nil
}

// Size returns the number of entries in the cache
func (m *MemoryClient) Size() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.data)
}

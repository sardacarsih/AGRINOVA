package cache

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// InvalidationService handles intelligent cache invalidation with security awareness
type InvalidationService struct {
	cache            CacheClient
	mu               sync.RWMutex
	invalidationLog  []InvalidationEvent
	patterns         map[string][]string // resource type -> invalidation patterns
	securityPatterns map[string]bool     // patterns that require security validation
}

// InvalidationEvent records a cache invalidation event
type InvalidationEvent struct {
	Timestamp    time.Time `json:"timestamp"`
	ResourceType string    `json:"resource_type"`
	ResourceID   string    `json:"resource_id"`
	Pattern      string    `json:"pattern"`
	Reason       string    `json:"reason"`
	UserID       string    `json:"user_id"`
	CompanyID    string    `json:"company_id"`
	KeysInvalid  int       `json:"keys_invalid"`
}

// NewInvalidationService creates a new cache invalidation service
func NewInvalidationService(cacheClient CacheClient) *InvalidationService {
	service := &InvalidationService{
		cache:            cacheClient,
		invalidationLog:  make([]InvalidationEvent, 0, 1000),
		patterns:         make(map[string][]string),
		securityPatterns: make(map[string]bool),
	}

	// Register default invalidation patterns
	service.registerDefaultPatterns()

	return service
}

// registerDefaultPatterns registers default invalidation patterns for different resources
func (s *InvalidationService) registerDefaultPatterns() {
	// Harvest record patterns
	s.RegisterPattern("harvest_record", []string{
		"harvest:record:{id}",
		"harvest:list:mandor:{mandor_id}",
		"harvest:list:block:{block_id}",
		"harvest:list:division:{division_id}",
		"harvest:list:estate:{estate_id}",
		"harvest:list:company:{company_id}",
		"harvest:stats:*",
	})

	// User patterns (security-sensitive)
	s.RegisterPattern("user", []string{
		"user:{id}:profile",
		"user:{id}:permissions",
		"user:{id}:assignments",
		"user:{id}:sessions",
		"user:list:company:{company_id}",
		"user:list:estate:{estate_id}",
		"user:list:*",
	})
	s.MarkSecuritySensitive("user")

	// Company patterns (security-sensitive)
	s.RegisterPattern("company", []string{
		"company:{id}",
		"company:{id}:users",
		"company:{id}:estates",
		"company:{id}:stats",
		"company:list",
	})
	s.MarkSecuritySensitive("company")

	// Estate patterns
	s.RegisterPattern("estate", []string{
		"estate:{id}",
		"estate:{id}:divisions",
		"estate:{id}:users",
		"estate:list:company:{company_id}",
		"estate:list",
	})

	// Division patterns
	s.RegisterPattern("division", []string{
		"division:{id}",
		"division:{id}:blocks",
		"division:{id}:users",
		"division:list:estate:{estate_id}",
	})

	// Block patterns
	s.RegisterPattern("block", []string{
		"block:{id}",
		"block:list:division:{division_id}",
	})

	// Gate check patterns
	s.RegisterPattern("gate_check", []string{
		"gatecheck:record:{id}",
		"gatecheck:list:satpam:{satpam_id}",
		"gatecheck:list:company:{company_id}",
		"gatecheck:stats:*",
	})

	// QR token patterns (security-sensitive)
	s.RegisterPattern("qr_token", []string{
		"qr:token:{id}",
		"qr:tokens:user:{user_id}",
		"qr:tokens:guest_log:{guest_log_id}",
	})
	s.MarkSecuritySensitive("qr_token")

	// Feature patterns (security-sensitive)
	s.RegisterPattern("feature", []string{
		"feature:{name}",
		"feature:user:{user_id}:*",
		"feature:role:{role}:*",
		"feature:list",
	})
	s.MarkSecuritySensitive("feature")
}

// RegisterPattern registers invalidation patterns for a resource type
func (s *InvalidationService) RegisterPattern(resourceType string, patterns []string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.patterns[resourceType] = patterns
}

// MarkSecuritySensitive marks a resource type as security-sensitive
func (s *InvalidationService) MarkSecuritySensitive(resourceType string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.securityPatterns[resourceType] = true
}

// InvalidateResource invalidates cache for a specific resource
func (s *InvalidationService) InvalidateResource(ctx context.Context, resourceType string, resourceID uuid.UUID, metadata map[string]string) error {
	s.mu.RLock()
	patterns, exists := s.patterns[resourceType]
	isSecuritySensitive := s.securityPatterns[resourceType]
	s.mu.RUnlock()

	if !exists {
		return fmt.Errorf("unknown resource type: %s", resourceType)
	}

	// Build invalidation keys
	keys := s.buildInvalidationKeys(patterns, resourceID.String(), metadata)

	// Invalidate keys
	totalInvalidated := 0
	for _, key := range keys {
		// For pattern keys (with *), use DeletePattern
		if strings.Contains(key, "*") {
			if err := s.cache.DeletePattern(ctx, key); err != nil {
				return fmt.Errorf("failed to delete pattern %s: %w", key, err)
			}
			totalInvalidated += 10 // Estimate
		} else {
			// For exact keys, use Delete
			if err := s.cache.Delete(ctx, key); err != nil {
				return fmt.Errorf("failed to delete key %s: %w", key, err)
			}
			totalInvalidated++
		}
	}

	// Log invalidation event
	event := InvalidationEvent{
		Timestamp:    time.Now(),
		ResourceType: resourceType,
		ResourceID:   resourceID.String(),
		Pattern:      strings.Join(patterns, ", "),
		Reason:       s.buildReason(metadata),
		UserID:       metadata["user_id"],
		CompanyID:    metadata["company_id"],
		KeysInvalid:  totalInvalidated,
	}

	s.recordEvent(event)

	// If security-sensitive, log to audit
	if isSecuritySensitive {
		s.logSecurityInvalidation(ctx, event)
	}

	return nil
}

// InvalidateUserScope invalidates all cache for a user's scope
func (s *InvalidationService) InvalidateUserScope(ctx context.Context, userID uuid.UUID, companyIDs, estateIDs, divisionIDs []uuid.UUID) error {
	patterns := []string{
		fmt.Sprintf("user:%s:*", userID.String()),
		fmt.Sprintf("harvest:list:mandor:%s*", userID.String()),
	}

	// Add company-specific patterns
	for _, companyID := range companyIDs {
		patterns = append(patterns, fmt.Sprintf("*company:%s*", companyID.String()))
	}

	// Add estate-specific patterns
	for _, estateID := range estateIDs {
		patterns = append(patterns, fmt.Sprintf("*estate:%s*", estateID.String()))
	}

	// Add division-specific patterns
	for _, divisionID := range divisionIDs {
		patterns = append(patterns, fmt.Sprintf("*division:%s*", divisionID.String()))
	}

	// Invalidate all patterns
	for _, pattern := range patterns {
		if err := s.cache.DeletePattern(ctx, pattern); err != nil {
			return fmt.Errorf("failed to invalidate pattern %s: %w", pattern, err)
		}
	}

	// Log event
	event := InvalidationEvent{
		Timestamp:    time.Now(),
		ResourceType: "user_scope",
		ResourceID:   userID.String(),
		Pattern:      strings.Join(patterns, ", "),
		Reason:       "User scope invalidation",
		UserID:       userID.String(),
	}

	s.recordEvent(event)
	s.logSecurityInvalidation(ctx, event)

	return nil
}

// InvalidateCompanyScope invalidates all cache for a company
func (s *InvalidationService) InvalidateCompanyScope(ctx context.Context, companyID uuid.UUID) error {
	patterns := []string{
		fmt.Sprintf("company:%s:*", companyID.String()),
		fmt.Sprintf("*company:%s*", companyID.String()),
		fmt.Sprintf("user:list:company:%s*", companyID.String()),
		fmt.Sprintf("estate:list:company:%s*", companyID.String()),
		fmt.Sprintf("harvest:list:company:%s*", companyID.String()),
	}

	// Invalidate all patterns
	for _, pattern := range patterns {
		if err := s.cache.DeletePattern(ctx, pattern); err != nil {
			return fmt.Errorf("failed to invalidate pattern %s: %w", pattern, err)
		}
	}

	// Log event
	event := InvalidationEvent{
		Timestamp:    time.Now(),
		ResourceType: "company_scope",
		ResourceID:   companyID.String(),
		Pattern:      strings.Join(patterns, ", "),
		Reason:       "Company scope invalidation",
		CompanyID:    companyID.String(),
	}

	s.recordEvent(event)
	s.logSecurityInvalidation(ctx, event)

	return nil
}

// InvalidateAll invalidates entire cache (use with extreme caution!)
func (s *InvalidationService) InvalidateAll(ctx context.Context, reason string, userID uuid.UUID) error {
	// This should only be called by super admins
	if err := s.cache.FlushDB(ctx); err != nil {
		return fmt.Errorf("failed to flush cache: %w", err)
	}

	// Log event
	event := InvalidationEvent{
		Timestamp:    time.Now(),
		ResourceType: "all",
		ResourceID:   "all",
		Pattern:      "*",
		Reason:       reason,
		UserID:       userID.String(),
		KeysInvalid:  -1, // Unknown
	}

	s.recordEvent(event)
	s.logSecurityInvalidation(ctx, event)

	return nil
}

// InvalidateOnUpdate handles cache invalidation on resource updates
func (s *InvalidationService) InvalidateOnUpdate(ctx context.Context, resourceType string, resourceID uuid.UUID, changes map[string]interface{}, userID uuid.UUID) error {
	metadata := map[string]string{
		"user_id": userID.String(),
		"action":  "update",
	}

	// Extract metadata from changes
	for key, value := range changes {
		if key == "company_id" || key == "estate_id" || key == "division_id" || key == "block_id" {
			metadata[key] = fmt.Sprintf("%v", value)
		}
	}

	return s.InvalidateResource(ctx, resourceType, resourceID, metadata)
}

// InvalidateOnDelete handles cache invalidation on resource deletes
func (s *InvalidationService) InvalidateOnDelete(ctx context.Context, resourceType string, resourceID uuid.UUID, userID uuid.UUID) error {
	metadata := map[string]string{
		"user_id": userID.String(),
		"action":  "delete",
	}

	return s.InvalidateResource(ctx, resourceType, resourceID, metadata)
}

// InvalidateOnCreate handles cache invalidation on resource creation
func (s *InvalidationService) InvalidateOnCreate(ctx context.Context, resourceType string, resourceID uuid.UUID, parentResources map[string]uuid.UUID, userID uuid.UUID) error {
	metadata := map[string]string{
		"user_id": userID.String(),
		"action":  "create",
	}

	// Add parent resource IDs to metadata
	for key, id := range parentResources {
		metadata[key] = id.String()
	}

	return s.InvalidateResource(ctx, resourceType, resourceID, metadata)
}

// GetInvalidationLog returns recent invalidation events
func (s *InvalidationService) GetInvalidationLog(limit int) []InvalidationEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if limit == 0 || limit > len(s.invalidationLog) {
		limit = len(s.invalidationLog)
	}

	// Return last N events
	start := len(s.invalidationLog) - limit
	if start < 0 {
		start = 0
	}

	return s.invalidationLog[start:]
}

// Helper methods

func (s *InvalidationService) buildInvalidationKeys(patterns []string, resourceID string, metadata map[string]string) []string {
	keys := make([]string, 0, len(patterns))

	for _, pattern := range patterns {
		key := pattern

		// Replace {id} placeholder
		key = strings.ReplaceAll(key, "{id}", resourceID)

		// Replace metadata placeholders
		for metaKey, metaValue := range metadata {
			placeholder := fmt.Sprintf("{%s}", metaKey)
			key = strings.ReplaceAll(key, placeholder, metaValue)
		}

		// Only add if all placeholders were replaced
		if !strings.Contains(key, "{") {
			keys = append(keys, key)
		}
	}

	return keys
}

func (s *InvalidationService) buildReason(metadata map[string]string) string {
	action := metadata["action"]
	if action == "" {
		action = "modification"
	}

	return fmt.Sprintf("Resource %s", action)
}

func (s *InvalidationService) recordEvent(event InvalidationEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Keep only last 1000 events
	if len(s.invalidationLog) >= 1000 {
		s.invalidationLog = s.invalidationLog[1:]
	}

	s.invalidationLog = append(s.invalidationLog, event)
}

func (s *InvalidationService) logSecurityInvalidation(ctx context.Context, event InvalidationEvent) {
	// This would log to the security audit system
	// For now, we'll just store it in the invalidation log
	// In production, this should write to harvest_rls_audit_log or similar
}

package services

import (
	"fmt"
	"sync"
	"time"
)

// RateLimitService handles rate limiting for authentication operations
type RateLimitService struct {
	loginAttempts   map[string]*AttemptTracker
	refreshAttempts map[string]*AttemptTracker
	mu              sync.RWMutex

	// Configuration
	maxLoginAttempts      int
	maxRefreshAttempts    int
	loginWindowDuration   time.Duration
	refreshWindowDuration time.Duration
	lockoutDuration       time.Duration
}

// AttemptTracker tracks attempts for rate limiting
type AttemptTracker struct {
	Count       int
	WindowStart time.Time
	LockedUntil *time.Time
}

// RateLimitConfig holds configuration for rate limiting
type RateLimitConfig struct {
	MaxLoginAttempts      int           // Maximum login attempts per window
	MaxRefreshAttempts    int           // Maximum refresh attempts per window
	LoginWindowDuration   time.Duration // Login rate limit window duration
	RefreshWindowDuration time.Duration // Refresh rate limit window duration
	LockoutDuration       time.Duration // Account lockout duration after max attempts
}

// NewRateLimitService creates a new rate limit service with default configuration
func NewRateLimitService() *RateLimitService {
	service := &RateLimitService{
		loginAttempts:         make(map[string]*AttemptTracker),
		refreshAttempts:       make(map[string]*AttemptTracker),
		maxLoginAttempts:      5,                // 5 attempts per window
		maxRefreshAttempts:    10,               // 10 refresh attempts per window
		loginWindowDuration:   15 * time.Minute, // 15 minute window
		refreshWindowDuration: 5 * time.Minute,  // 5 minute window
		lockoutDuration:       30 * time.Minute, // 30 minute lockout
	}

	// Start cleanup goroutine
	go service.cleanupExpired()

	return service
}

// NewRateLimitServiceWithConfig creates a new rate limit service with custom configuration
func NewRateLimitServiceWithConfig(config RateLimitConfig) *RateLimitService {
	service := &RateLimitService{
		loginAttempts:         make(map[string]*AttemptTracker),
		refreshAttempts:       make(map[string]*AttemptTracker),
		maxLoginAttempts:      config.MaxLoginAttempts,
		maxRefreshAttempts:    config.MaxRefreshAttempts,
		loginWindowDuration:   config.LoginWindowDuration,
		refreshWindowDuration: config.RefreshWindowDuration,
		lockoutDuration:       config.LockoutDuration,
	}

	// Start cleanup goroutine
	go service.cleanupExpired()

	return service
}

// AllowLogin checks if a login attempt is allowed for the given client/user combination
func (r *RateLimitService) AllowLogin(clientIP, identifier string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	key := fmt.Sprintf("login:%s:%s", clientIP, identifier)

	tracker, exists := r.loginAttempts[key]
	if !exists {
		// First attempt - create new tracker
		r.loginAttempts[key] = &AttemptTracker{
			Count:       1,
			WindowStart: now,
		}
		return true
	}

	// Check if still locked out
	if tracker.LockedUntil != nil && now.Before(*tracker.LockedUntil) {
		return false
	}

	// Check if window has expired
	if now.Sub(tracker.WindowStart) > r.loginWindowDuration {
		// Reset window
		tracker.Count = 1
		tracker.WindowStart = now
		tracker.LockedUntil = nil
		return true
	}

	// Increment count
	tracker.Count++

	// Check if exceeded limit
	if tracker.Count > r.maxLoginAttempts {
		// Lock the account
		lockUntil := now.Add(r.lockoutDuration)
		tracker.LockedUntil = &lockUntil
		return false
	}

	return true
}

// AllowRefresh checks if a refresh token attempt is allowed for the given client
func (r *RateLimitService) AllowRefresh(clientIP string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	key := fmt.Sprintf("refresh:%s", clientIP)

	tracker, exists := r.refreshAttempts[key]
	if !exists {
		// First attempt - create new tracker
		r.refreshAttempts[key] = &AttemptTracker{
			Count:       1,
			WindowStart: now,
		}
		return true
	}

	// Check if still locked out
	if tracker.LockedUntil != nil && now.Before(*tracker.LockedUntil) {
		return false
	}

	// Check if window has expired
	if now.Sub(tracker.WindowStart) > r.refreshWindowDuration {
		// Reset window
		tracker.Count = 1
		tracker.WindowStart = now
		tracker.LockedUntil = nil
		return true
	}

	// Increment count
	tracker.Count++

	// Check if exceeded limit
	if tracker.Count > r.maxRefreshAttempts {
		// Lock for a shorter duration for refresh attempts
		lockUntil := now.Add(r.refreshWindowDuration)
		tracker.LockedUntil = &lockUntil
		return false
	}

	return true
}

// CheckLoginAttempt checks if login attempt is allowed and returns retry duration if blocked
func (r *RateLimitService) CheckLoginAttempt(clientIP, identifier string) (bool, time.Duration) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	key := fmt.Sprintf("login:%s:%s", clientIP, identifier)
	tracker, exists := r.loginAttempts[key]

	if !exists {
		return true, 0
	}

	now := time.Now()

	// Check if still locked out
	if tracker.LockedUntil != nil && now.Before(*tracker.LockedUntil) {
		remaining := tracker.LockedUntil.Sub(now)
		return false, remaining
	}

	// Check if window has expired
	if now.Sub(tracker.WindowStart) > r.loginWindowDuration {
		return true, 0
	}

	// Check if would exceed limit
	if tracker.Count >= r.maxLoginAttempts {
		remaining := r.loginWindowDuration - now.Sub(tracker.WindowStart)
		return false, remaining
	}

	return true, 0
}

// ResetLoginAttempts resets login attempts for successful authentication
func (r *RateLimitService) ResetLoginAttempts(clientIP, identifier string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	key := fmt.Sprintf("login:%s:%s", clientIP, identifier)

	// Reset the counter on successful login to prevent legitimate users
	// from being locked out due to previous failed attempts
	if tracker, exists := r.loginAttempts[key]; exists {
		tracker.Count = 0
		tracker.LockedUntil = nil
	}
}

// RecordSuccessfulLogin records a successful login and can reset counters (alias for ResetLoginAttempts)
func (r *RateLimitService) RecordSuccessfulLogin(clientIP, identifier string) {
	r.ResetLoginAttempts(clientIP, identifier)
}

// IsLocked checks if a client/identifier combination is currently locked
func (r *RateLimitService) IsLocked(clientIP, identifier string) (bool, time.Duration) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	key := fmt.Sprintf("login:%s:%s", clientIP, identifier)
	tracker, exists := r.loginAttempts[key]

	if !exists || tracker.LockedUntil == nil {
		return false, 0
	}

	now := time.Now()
	if now.Before(*tracker.LockedUntil) {
		remaining := tracker.LockedUntil.Sub(now)
		return true, remaining
	}

	return false, 0
}

// GetRemainingAttempts returns the number of remaining login attempts
func (r *RateLimitService) GetRemainingAttempts(clientIP, identifier string) int {
	r.mu.RLock()
	defer r.mu.RUnlock()

	key := fmt.Sprintf("login:%s:%s", clientIP, identifier)
	tracker, exists := r.loginAttempts[key]

	if !exists {
		return r.maxLoginAttempts
	}

	// Check if locked
	if tracker.LockedUntil != nil && time.Now().Before(*tracker.LockedUntil) {
		return 0
	}

	// Check if window expired
	if time.Now().Sub(tracker.WindowStart) > r.loginWindowDuration {
		return r.maxLoginAttempts
	}

	remaining := r.maxLoginAttempts - tracker.Count
	if remaining < 0 {
		remaining = 0
	}

	return remaining
}

// ClearAttempts manually clears attempts for a client/identifier (admin function)
func (r *RateLimitService) ClearAttempts(clientIP, identifier string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	loginKey := fmt.Sprintf("login:%s:%s", clientIP, identifier)
	refreshKey := fmt.Sprintf("refresh:%s", clientIP)

	delete(r.loginAttempts, loginKey)
	delete(r.refreshAttempts, refreshKey)
}

// GetStats returns rate limiting statistics
func (r *RateLimitService) GetStats() map[string]interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()

	lockedCount := 0
	totalAttempts := 0

	now := time.Now()
	for _, tracker := range r.loginAttempts {
		totalAttempts += tracker.Count
		if tracker.LockedUntil != nil && now.Before(*tracker.LockedUntil) {
			lockedCount++
		}
	}

	return map[string]interface{}{
		"total_tracked_ips":        len(r.loginAttempts),
		"currently_locked":         lockedCount,
		"total_attempts":           totalAttempts,
		"max_login_attempts":       r.maxLoginAttempts,
		"max_refresh_attempts":     r.maxRefreshAttempts,
		"login_window_minutes":     r.loginWindowDuration.Minutes(),
		"lockout_duration_minutes": r.lockoutDuration.Minutes(),
	}
}

// cleanupExpired removes expired entries from the tracking maps
func (r *RateLimitService) cleanupExpired() {
	ticker := time.NewTicker(10 * time.Minute) // Run cleanup every 10 minutes
	defer ticker.Stop()

	for range ticker.C {
		r.mu.Lock()
		now := time.Now()

		// Clean up login attempts
		for key, tracker := range r.loginAttempts {
			// Remove if window expired and not locked, or if lockout expired
			windowExpired := now.Sub(tracker.WindowStart) > r.loginWindowDuration
			lockoutExpired := tracker.LockedUntil == nil || now.After(*tracker.LockedUntil)

			if windowExpired && lockoutExpired {
				delete(r.loginAttempts, key)
			}
		}

		// Clean up refresh attempts
		for key, tracker := range r.refreshAttempts {
			windowExpired := now.Sub(tracker.WindowStart) > r.refreshWindowDuration
			lockoutExpired := tracker.LockedUntil == nil || now.After(*tracker.LockedUntil)

			if windowExpired && lockoutExpired {
				delete(r.refreshAttempts, key)
			}
		}

		r.mu.Unlock()
	}
}

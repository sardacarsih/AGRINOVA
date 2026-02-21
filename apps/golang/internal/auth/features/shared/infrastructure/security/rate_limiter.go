package security

import (
	"sync"
	"time"
)

// RateLimiter implements a simple token bucket rate limiter
type RateLimiter struct {
	mu            sync.Mutex
	limits        map[string]*limiter
	rate          int           // requests per interval
	interval      time.Duration // interval duration
	blockDuration time.Duration // how long to block after limit exceeded
}

type limiter struct {
	tokens       int
	lastRefill   time.Time
	blockedUntil time.Time
}

// NewRateLimiter creates a new rate limiter
// rate: number of allowed requests per interval
// interval: duration of the interval
// blockDuration: how long to block subsequent requests if limit exceeded
func NewRateLimiter(rate int, interval time.Duration, blockDuration time.Duration) *RateLimiter {
	return &RateLimiter{
		limits:        make(map[string]*limiter),
		rate:          rate,
		interval:      interval,
		blockDuration: blockDuration,
	}
}

// Allow checks if a request is allowed for the given key (e.g., IP address)
func (r *RateLimiter) Allow(key string) (allowed bool, waitDuration time.Duration) {
	r.mu.Lock()
	defer r.mu.Unlock()

	l, exists := r.limits[key]
	if !exists {
		l = &limiter{
			tokens:     r.rate,
			lastRefill: time.Now(),
		}
		r.limits[key] = l
	}

	now := time.Now()

	// Check if currently blocked
	if now.Before(l.blockedUntil) {
		return false, l.blockedUntil.Sub(now)
	}

	// Refill tokens based on time passed
	elapsed := now.Sub(l.lastRefill)
	if elapsed >= r.interval {
		l.tokens = r.rate
		l.lastRefill = now
	}

	if l.tokens > 0 {
		l.tokens--
		return true, 0
	}

	// Limit exceeded, block
	l.blockedUntil = now.Add(r.blockDuration)
	return false, r.blockDuration
}

// Cleanup removes stale entries to prevent memory leaks
func (r *RateLimiter) Cleanup(olderThan time.Duration) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	for key, l := range r.limits {
		if now.Sub(l.lastRefill) > olderThan && now.After(l.blockedUntil) {
			delete(r.limits, key)
		}
	}
}

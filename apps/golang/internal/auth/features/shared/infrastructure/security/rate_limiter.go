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

func (r *RateLimiter) ensureLimiter(key string) *limiter {
	l, exists := r.limits[key]
	if !exists {
		l = &limiter{
			tokens:     r.rate,
			lastRefill: time.Now(),
		}
		r.limits[key] = l
	}

	return l
}

func (r *RateLimiter) refillTokens(l *limiter, now time.Time) {
	elapsed := now.Sub(l.lastRefill)
	if elapsed >= r.interval {
		l.tokens = r.rate
		l.lastRefill = now
	}
}

// Blocked checks if a key is currently blocked without consuming a token.
func (r *RateLimiter) Blocked(key string) (blocked bool, waitDuration time.Duration) {
	r.mu.Lock()
	defer r.mu.Unlock()

	l := r.ensureLimiter(key)
	now := time.Now()
	r.refillTokens(l, now)

	if now.Before(l.blockedUntil) {
		return true, l.blockedUntil.Sub(now)
	}

	return false, 0
}

// Allow records a failed attempt and blocks the key after the configured limit.
func (r *RateLimiter) Allow(key string) (allowed bool, waitDuration time.Duration) {
	r.mu.Lock()
	defer r.mu.Unlock()

	l := r.ensureLimiter(key)
	now := time.Now()
	r.refillTokens(l, now)

	// Check if currently blocked
	if now.Before(l.blockedUntil) {
		return false, l.blockedUntil.Sub(now)
	}

	if l.tokens > 0 {
		l.tokens--
		return true, 0
	}

	// Limit exceeded, block
	l.blockedUntil = now.Add(r.blockDuration)
	return false, r.blockDuration
}

// Reset clears tracked failures for a key after a successful authentication.
func (r *RateLimiter) Reset(key string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.limits, key)
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

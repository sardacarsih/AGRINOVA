package security

import (
	"testing"
	"time"
)

func TestRateLimiterBlocksAfterConfiguredFailedAttempts(t *testing.T) {
	limiter := NewRateLimiter(2, time.Hour, time.Hour)

	if blocked, wait := limiter.Blocked("client-1"); blocked || wait != 0 {
		t.Fatalf("expected initial state to be unblocked, got blocked=%v wait=%v", blocked, wait)
	}

	if allowed, _ := limiter.Allow("client-1"); !allowed {
		t.Fatal("expected first failed attempt to be allowed")
	}
	if allowed, _ := limiter.Allow("client-1"); !allowed {
		t.Fatal("expected second failed attempt to be allowed")
	}
	if allowed, wait := limiter.Allow("client-1"); allowed || wait <= 0 {
		t.Fatalf("expected limiter to block on third failed attempt, got allowed=%v wait=%v", allowed, wait)
	}

	if blocked, wait := limiter.Blocked("client-1"); !blocked || wait <= 0 {
		t.Fatalf("expected limiter to report blocked state, got blocked=%v wait=%v", blocked, wait)
	}
}

func TestRateLimiterResetClearsBlockedState(t *testing.T) {
	limiter := NewRateLimiter(1, time.Hour, time.Hour)

	if allowed, _ := limiter.Allow("client-2"); !allowed {
		t.Fatal("expected first failed attempt to be allowed")
	}
	if allowed, _ := limiter.Allow("client-2"); allowed {
		t.Fatal("expected limiter to block on second failed attempt")
	}

	limiter.Reset("client-2")

	if blocked, wait := limiter.Blocked("client-2"); blocked || wait != 0 {
		t.Fatalf("expected reset limiter to be unblocked, got blocked=%v wait=%v", blocked, wait)
	}
	if allowed, _ := limiter.Allow("client-2"); !allowed {
		t.Fatal("expected limiter to allow attempts again after reset")
	}
}

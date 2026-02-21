package services

import (
	"fmt"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// WebSocketRateLimiter provides comprehensive WebSocket rate limiting
type WebSocketRateLimiter struct {
	// Connection rate limiting
	connLimiters map[string]*rate.Limiter
	connMutex    sync.RWMutex

	// Message rate limiting per connection
	msgLimiters map[string]*rate.Limiter
	msgMutex    sync.RWMutex

	// Authentication rate limiting per IP
	authLimiters map[string]*rate.Limiter
	authMutex    sync.RWMutex

	// Subscription rate limiting per connection
	subLimiters map[string]*rate.Limiter
	subMutex    sync.RWMutex

	// Global WebSocket rate limiting
	globalConnLimiter *rate.Limiter
	globalMsgLimiter  *rate.Limiter

	// Configuration
	config WebSocketRateLimitConfig

	// Statistics
	stats *WebSocketRateLimitStats
	mutex sync.RWMutex
}

// WebSocketRateLimitConfig defines WebSocket rate limiting configuration
type WebSocketRateLimitConfig struct {
	// Connection limits
	MaxConnectionsPerSecond   float64
	ConnectionBurst           int
	MaxConnectionsPerMinuteIP int

	// Message limits
	MessagesPerSecondPerConn float64
	MessageBurstPerConn      int
	MaxMessageSize           int64 // bytes

	// Authentication limits
	AuthAttemptsPerMinuteIP int
	AuthTimeoutSeconds      int

	// Subscription limits
	MaxSubscriptionsPerConn int
	SubscriptionsPerSecond  float64
	SubscriptionBurst       int

	// Global limits
	GlobalMaxConnections    int
	GlobalMessagesPerSecond float64
	GlobalMessageBurst      int

	// Cleanup settings
	CleanupIntervalMinutes   int
	InactivityTimeoutMinutes int
}

// WebSocketRateLimitStats tracks rate limiting statistics (internal use with mutex)
type WebSocketRateLimitStats struct {
	TotalConnections      int64
	RejectedConnections   int64
	TotalMessages         int64
	RejectedMessages      int64
	TotalAuthAttempts     int64
	RejectedAuthAttempts  int64
	TotalSubscriptions    int64
	RejectedSubscriptions int64
	LastCleanup           time.Time
	ActiveConnections     int
	LastUpdated           time.Time
	mutex                 sync.RWMutex
}

// WebSocketRateLimitStatsSnapshot is a copy-safe version of stats for external use
type WebSocketRateLimitStatsSnapshot struct {
	TotalConnections      int64
	RejectedConnections   int64
	TotalMessages         int64
	RejectedMessages      int64
	TotalAuthAttempts     int64
	RejectedAuthAttempts  int64
	TotalSubscriptions    int64
	RejectedSubscriptions int64
	LastCleanup           time.Time
	ActiveConnections     int
	LastUpdated           time.Time
}

// DefaultWebSocketRateLimitConfig provides sensible defaults
func DefaultWebSocketRateLimitConfig() WebSocketRateLimitConfig {
	return WebSocketRateLimitConfig{
		MaxConnectionsPerSecond:   10,
		ConnectionBurst:           50,
		MaxConnectionsPerMinuteIP: 5,
		MessagesPerSecondPerConn:  10,
		MessageBurstPerConn:       50,
		MaxMessageSize:            1024 * 1024, // 1MB
		AuthAttemptsPerMinuteIP:   3,
		AuthTimeoutSeconds:        30,
		MaxSubscriptionsPerConn:   10,
		SubscriptionsPerSecond:    5,
		SubscriptionBurst:         10,
		GlobalMaxConnections:      2000,
		GlobalMessagesPerSecond:   10000,
		GlobalMessageBurst:        1000,
		CleanupIntervalMinutes:    5,
		InactivityTimeoutMinutes:  10,
	}
}

// NewWebSocketRateLimiter creates a new WebSocket rate limiter
func NewWebSocketRateLimiter(config WebSocketRateLimitConfig) *WebSocketRateLimiter {
	wrl := &WebSocketRateLimiter{
		connLimiters: make(map[string]*rate.Limiter),
		msgLimiters:  make(map[string]*rate.Limiter),
		authLimiters: make(map[string]*rate.Limiter),
		subLimiters:  make(map[string]*rate.Limiter),
		config:       config,
		stats: &WebSocketRateLimitStats{
			LastUpdated: time.Now(),
		},
	}

	// Initialize global limiters
	wrl.globalConnLimiter = rate.NewLimiter(
		rate.Limit(config.MaxConnectionsPerSecond),
		config.ConnectionBurst,
	)

	wrl.globalMsgLimiter = rate.NewLimiter(
		rate.Limit(config.GlobalMessagesPerSecond),
		config.GlobalMessageBurst,
	)

	// Start background cleanup
	go wrl.startCleanup()

	return wrl
}

// AllowConnection checks if a new WebSocket connection is allowed
func (wrl *WebSocketRateLimiter) AllowConnection(clientIP, userAgent string) bool {
	wrl.mutex.Lock()
	defer wrl.mutex.Unlock()

	// Update statistics
	wrl.stats.TotalConnections++
	wrl.stats.ActiveConnections++
	wrl.stats.LastUpdated = time.Now()

	// Check global connection limit
	if !wrl.globalConnLimiter.Allow() {
		wrl.stats.RejectedConnections++
		return false
	}

	// Check active connection limit
	if wrl.stats.ActiveConnections > wrl.config.GlobalMaxConnections {
		wrl.stats.RejectedConnections++
		return false
	}

	// Check IP-specific connection limit
	wrl.connMutex.Lock()
	defer wrl.connMutex.Unlock()

	ipKey := fmt.Sprintf("conn:%s", clientIP)
	limiter, exists := wrl.connLimiters[ipKey]

	if !exists {
		// Create new IP connection limiter
		limiter = rate.NewLimiter(
			rate.Every(time.Minute/time.Duration(wrl.config.MaxConnectionsPerMinuteIP)),
			1, // Allow 1 connection per minute from same IP
		)
		wrl.connLimiters[ipKey] = limiter
	}

	if !limiter.Allow() {
		wrl.stats.RejectedConnections++
		return false
	}

	return true
}

// AllowMessage checks if a message is allowed for a specific connection
func (wrl *WebSocketRateLimiter) AllowMessage(clientID string, messageSize int64) bool {
	wrl.mutex.Lock()
	defer wrl.mutex.Unlock()

	// Update statistics
	wrl.stats.TotalMessages++
	wrl.stats.LastUpdated = time.Now()

	// Check global message limit
	if !wrl.globalMsgLimiter.Allow() {
		wrl.stats.RejectedMessages++
		return false
	}

	// Check message size limit
	if messageSize > wrl.config.MaxMessageSize {
		wrl.stats.RejectedMessages++
		return false
	}

	// Check per-connection message limit
	wrl.msgMutex.Lock()
	defer wrl.msgMutex.Unlock()

	limiter, exists := wrl.msgLimiters[clientID]
	if !exists {
		// Create new connection message limiter
		limiter = rate.NewLimiter(
			rate.Limit(wrl.config.MessagesPerSecondPerConn),
			wrl.config.MessageBurstPerConn,
		)
		wrl.msgLimiters[clientID] = limiter
	}

	if !limiter.Allow() {
		wrl.stats.RejectedMessages++
		return false
	}

	return true
}

// AllowAuth checks if a WebSocket authentication attempt is allowed
func (wrl *WebSocketRateLimiter) AllowAuth(clientIP string) bool {
	wrl.mutex.Lock()
	defer wrl.mutex.Unlock()

	// Update statistics
	wrl.stats.TotalAuthAttempts++
	wrl.stats.LastUpdated = time.Now()

	// Check IP-specific auth limit
	wrl.authMutex.Lock()
	defer wrl.authMutex.Unlock()

	ipKey := fmt.Sprintf("auth:%s", clientIP)
	limiter, exists := wrl.authLimiters[ipKey]

	if !exists {
		// Create new IP auth limiter
		limiter = rate.NewLimiter(
			rate.Every(time.Minute/time.Duration(wrl.config.AuthAttemptsPerMinuteIP)),
			1, // Allow 1 auth attempt per minute from same IP
		)
		wrl.authLimiters[ipKey] = limiter
	}

	if !limiter.Allow() {
		wrl.stats.RejectedAuthAttempts++
		return false
	}

	return true
}

// AllowSubscription checks if a subscription is allowed for a connection
func (wrl *WebSocketRateLimiter) AllowSubscription(clientID string, currentSubCount int) bool {
	wrl.mutex.Lock()
	defer wrl.mutex.Unlock()

	// Update statistics
	wrl.stats.TotalSubscriptions++
	wrl.stats.LastUpdated = time.Now()

	// Check subscription count limit
	if currentSubCount >= wrl.config.MaxSubscriptionsPerConn {
		wrl.stats.RejectedSubscriptions++
		return false
	}

	// Check subscription rate limit
	wrl.subMutex.Lock()
	defer wrl.subMutex.Unlock()

	limiter, exists := wrl.subLimiters[clientID]
	if !exists {
		// Create new subscription limiter
		limiter = rate.NewLimiter(
			rate.Limit(wrl.config.SubscriptionsPerSecond),
			wrl.config.SubscriptionBurst,
		)
		wrl.subLimiters[clientID] = limiter
	}

	if !limiter.Allow() {
		wrl.stats.RejectedSubscriptions++
		return false
	}

	return true
}

// RemoveConnection cleans up rate limiters for a disconnected connection
func (wrl *WebSocketRateLimiter) RemoveConnection(clientID string) {
	wrl.mutex.Lock()
	defer wrl.mutex.Unlock()

	// Update statistics
	wrl.stats.ActiveConnections--
	if wrl.stats.ActiveConnections < 0 {
		wrl.stats.ActiveConnections = 0
	}
	wrl.stats.LastUpdated = time.Now()

	// Remove connection-specific limiters
	wrl.msgMutex.Lock()
	delete(wrl.msgLimiters, clientID)
	wrl.msgMutex.Unlock()

	wrl.subMutex.Lock()
	delete(wrl.subLimiters, clientID)
	wrl.subMutex.Unlock()
}

// GetStats returns current rate limiting statistics as a copy-safe snapshot
func (wrl *WebSocketRateLimiter) GetStats() WebSocketRateLimitStatsSnapshot {
	wrl.mutex.RLock()
	defer wrl.mutex.RUnlock()

	// Copy stats fields into snapshot struct (without mutex)
	wrl.stats.mutex.RLock()
	stats := WebSocketRateLimitStatsSnapshot{
		TotalConnections:      wrl.stats.TotalConnections,
		RejectedConnections:   wrl.stats.RejectedConnections,
		TotalMessages:         wrl.stats.TotalMessages,
		RejectedMessages:      wrl.stats.RejectedMessages,
		TotalAuthAttempts:     wrl.stats.TotalAuthAttempts,
		RejectedAuthAttempts:  wrl.stats.RejectedAuthAttempts,
		TotalSubscriptions:    wrl.stats.TotalSubscriptions,
		RejectedSubscriptions: wrl.stats.RejectedSubscriptions,
		LastCleanup:           wrl.stats.LastCleanup,
		ActiveConnections:     wrl.stats.ActiveConnections,
		LastUpdated:           wrl.stats.LastUpdated,
	}
	wrl.stats.mutex.RUnlock()

	stats.ActiveConnections = wrl.getActiveConnectionCount()

	return stats
}

// getActiveConnectionCount counts active connections
func (wrl *WebSocketRateLimiter) getActiveConnectionCount() int {
	wrl.msgMutex.RLock()
	defer wrl.msgMutex.RUnlock()

	// Count active message limiters as proxy for active connections
	return len(wrl.msgLimiters)
}

// ResetClient resets rate limiting for a specific client
func (wrl *WebSocketRateLimiter) ResetClient(clientID string) {
	wrl.msgMutex.Lock()
	delete(wrl.msgLimiters, clientID)
	wrl.msgMutex.Unlock()

	wrl.subMutex.Lock()
	delete(wrl.subLimiters, clientID)
	wrl.subMutex.Unlock()
}

// ResetIP resets rate limiting for a specific IP
func (wrl *WebSocketRateLimiter) ResetIP(clientIP string) {
	wrl.connMutex.Lock()
	delete(wrl.connLimiters, fmt.Sprintf("conn:%s", clientIP))
	wrl.connMutex.Unlock()

	wrl.authMutex.Lock()
	delete(wrl.authLimiters, fmt.Sprintf("auth:%s", clientIP))
	wrl.authMutex.Unlock()
}

// startCleanup runs periodic cleanup of stale limiters
func (wrl *WebSocketRateLimiter) startCleanup() {
	ticker := time.NewTicker(time.Duration(wrl.config.CleanupIntervalMinutes) * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		wrl.cleanup()
	}
}

// cleanup removes stale rate limiters
func (wrl *WebSocketRateLimiter) cleanup() {
	wrl.mutex.Lock()
	defer wrl.mutex.Unlock()

	// cutoff := time.Now().Add(-time.Duration(wrl.config.InactivityTimeoutMinutes) * time.Minute)

	// Cleanup connection limiters
	wrl.connMutex.Lock()
	for key, limiter := range wrl.connLimiters {
		if limiter.Tokens() >= 1 { // Limiter hasn't been used recently
			delete(wrl.connLimiters, key)
		}
	}
	wrl.connMutex.Unlock()

	// Cleanup message limiters
	wrl.msgMutex.Lock()
	for key, limiter := range wrl.msgLimiters {
		if limiter.Tokens() >= float64(wrl.config.MessageBurstPerConn) {
			delete(wrl.msgLimiters, key)
		}
	}
	wrl.msgMutex.Unlock()

	// Cleanup auth limiters
	wrl.authMutex.Lock()
	for key, limiter := range wrl.authLimiters {
		if limiter.Tokens() >= 1 {
			delete(wrl.authLimiters, key)
		}
	}
	wrl.authMutex.Unlock()

	// Cleanup subscription limiters
	wrl.subMutex.Lock()
	for key, limiter := range wrl.subLimiters {
		if limiter.Tokens() >= float64(wrl.config.SubscriptionBurst) {
			delete(wrl.subLimiters, key)
		}
	}
	wrl.subMutex.Unlock()

	// Update cleanup timestamp
	wrl.stats.LastCleanup = time.Now()
}

// HealthCheck returns the health status of the rate limiter
func (wrl *WebSocketRateLimiter) HealthCheck() gin.H {
	stats := wrl.GetStats()

	// Calculate health metrics
	rejectionRate := float64(0)
	if stats.TotalConnections > 0 {
		rejectionRate = float64(stats.RejectedConnections) / float64(stats.TotalConnections) * 100
	}

	messageRejectionRate := float64(0)
	if stats.TotalMessages > 0 {
		messageRejectionRate = float64(stats.RejectedMessages) / float64(stats.TotalMessages) * 100
	}

	authRejectionRate := float64(0)
	if stats.TotalAuthAttempts > 0 {
		authRejectionRate = float64(stats.RejectedAuthAttempts) / float64(stats.TotalAuthAttempts) * 100
	}

	status := "healthy"
	if rejectionRate > 10 || messageRejectionRate > 20 || authRejectionRate > 30 {
		status = "degraded"
	}
	if rejectionRate > 25 || messageRejectionRate > 40 || authRejectionRate > 50 {
		status = "unhealthy"
	}

	return gin.H{
		"status":        status,
		"timestamp":     time.Now().Unix(),
		"configuration": wrl.config,
		"statistics": gin.H{
			"total_connections":         stats.TotalConnections,
			"rejected_connections":      stats.RejectedConnections,
			"connection_rejection_rate": fmt.Sprintf("%.2f%%", rejectionRate),
			"total_messages":            stats.TotalMessages,
			"rejected_messages":         stats.RejectedMessages,
			"message_rejection_rate":    fmt.Sprintf("%.2f%%", messageRejectionRate),
			"total_auth_attempts":       stats.TotalAuthAttempts,
			"rejected_auth_attempts":    stats.RejectedAuthAttempts,
			"auth_rejection_rate":       fmt.Sprintf("%.2f%%", authRejectionRate),
			"total_subscriptions":       stats.TotalSubscriptions,
			"rejected_subscriptions":    stats.RejectedSubscriptions,
			"active_connections":        stats.ActiveConnections,
		},
		"limits": gin.H{
			"active_connection_limiters":   len(wrl.msgLimiters),
			"active_auth_limiters":         len(wrl.authLimiters),
			"active_subscription_limiters": len(wrl.subLimiters),
		},
		"last_cleanup": stats.LastCleanup.Unix(),
	}
}

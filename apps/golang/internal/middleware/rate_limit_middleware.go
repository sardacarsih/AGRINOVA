package middleware

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/vektah/gqlparser/v2"
	"github.com/vektah/gqlparser/v2/ast"
	"golang.org/x/time/rate"
)

// RateLimitConfig defines rate limiting configuration
type RateLimitConfig struct {
	// Global rate limits
	GlobalRequestsPerSecond float64
	GlobalBurst             int

	// IP-based rate limits
	IPRequestsPerMinute int
	IPBurst             int

	// Authenticated user rate limits by role
	UserLimits map[string]RoleLimit

	// WebSocket rate limits
	WSConnectionsPerMinute int
	WSMessagesPerMinute    int
	WSAuthAttemptsPerMinute int

	// GraphQL specific limits
	GraphQLQueriesPerMinute int
	GraphQLMutationsPerMinute int
	GraphQLComplexityLimit int

	// API key limits
	APIKeyRequestsPerMinute int
}

// RoleLimit defines rate limits for specific user roles
type RoleLimit struct {
	RequestsPerMinute int
	Burst             int
	Multiplier        float64 // For complex queries
}

// DefaultRateLimitConfig provides sensible defaults
func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		GlobalRequestsPerSecond: 1000,
		GlobalBurst:             200,
		IPRequestsPerMinute:     100,
		IPBurst:                 50,
		WSConnectionsPerMinute:  10,
		WSMessagesPerMinute:     60,
		WSAuthAttemptsPerMinute: 5,
		GraphQLQueriesPerMinute: 200,
		GraphQLMutationsPerMinute: 100,
		GraphQLComplexityLimit: 1000,
		APIKeyRequestsPerMinute: 500,
		UserLimits: map[string]RoleLimit{
			"super_admin":   {RequestsPerMinute: 1000, Burst: 200, Multiplier: 2.0},
			"company_admin": {RequestsPerMinute: 500, Burst: 100, Multiplier: 1.5},
			"area_manager":  {RequestsPerMinute: 300, Burst: 75, Multiplier: 1.2},
			"manager":       {RequestsPerMinute: 200, Burst: 50, Multiplier: 1.0},
			"asisten":       {RequestsPerMinute: 150, Burst: 40, Multiplier: 1.0},
			"mandor":        {RequestsPerMinute: 150, Burst: 40, Multiplier: 1.0},
			"satpam":        {RequestsPerMinute: 200, Burst: 50, Multiplier: 1.0},
		},
	}
}

// RateLimitConfigFromEnv creates configuration from environment variables
func RateLimitConfigFromEnv() RateLimitConfig {
	config := DefaultRateLimitConfig()

	// Override with environment variables if present
	if val := os.Getenv("RATE_LIMIT_GLOBAL_RPS"); val != "" {
		if rps, err := strconv.ParseFloat(val, 64); err == nil {
			config.GlobalRequestsPerSecond = rps
		}
	}

	if val := os.Getenv("RATE_LIMIT_GLOBAL_BURST"); val != "" {
		if burst, err := strconv.Atoi(val); err == nil {
			config.GlobalBurst = burst
		}
	}

	if val := os.Getenv("RATE_LIMIT_IP_REQUESTS_PER_MINUTE"); val != "" {
		if req, err := strconv.Atoi(val); err == nil {
			config.IPRequestsPerMinute = req
		}
	}

	if val := os.Getenv("RATE_LIMIT_IP_BURST"); val != "" {
		if burst, err := strconv.Atoi(val); err == nil {
			config.IPBurst = burst
		}
	}

	if val := os.Getenv("RATE_LIMIT_GQL_QUERIES_PER_MINUTE"); val != "" {
		if req, err := strconv.Atoi(val); err == nil {
			config.GraphQLQueriesPerMinute = req
		}
	}

	if val := os.Getenv("RATE_LIMIT_GQL_MUTATIONS_PER_MINUTE"); val != "" {
		if req, err := strconv.Atoi(val); err == nil {
			config.GraphQLMutationsPerMinute = req
		}
	}

	if val := os.Getenv("RATE_LIMIT_GQL_COMPLEXITY_LIMIT"); val != "" {
		if complexity, err := strconv.Atoi(val); err == nil {
			config.GraphQLComplexityLimit = complexity
		}
	}

	if val := os.Getenv("RATE_LIMIT_WS_CONNECTIONS_PER_MINUTE"); val != "" {
		if conn, err := strconv.Atoi(val); err == nil {
			config.WSConnectionsPerMinute = conn
		}
	}

	if val := os.Getenv("RATE_LIMIT_API_KEY_REQUESTS_PER_MINUTE"); val != "" {
		if req, err := strconv.Atoi(val); err == nil {
			config.APIKeyRequestsPerMinute = req
		}
	}

	return config
}

// RateLimitStore interface for rate limiting storage
type RateLimitStore interface {
	Allow(key string, tokens int) bool
	GetRemainingTokens(key string) int
	Reset(key string)
}

// SlidingWindowCounter implements sliding window rate limiting
type SlidingWindowCounter struct {
	requests []time.Time
	mutex    sync.RWMutex
	window   time.Duration
	maxCount int
}

// NewSlidingWindowCounter creates a new sliding window counter
func NewSlidingWindowCounter(window time.Duration, maxCount int) *SlidingWindowCounter {
	return &SlidingWindowCounter{
		requests: make([]time.Time, 0),
		window:   window,
		maxCount: maxCount,
	}
}

// Allow checks if a request is allowed within the sliding window
func (sw *SlidingWindowCounter) Allow() bool {
	now := time.Now()
	sw.mutex.Lock()
	defer sw.mutex.Unlock()

	// Remove expired requests
	validStart := 0
	for i, reqTime := range sw.requests {
		if now.Sub(reqTime) < sw.window {
			validStart = i
			break
		}
	}

	// Keep only valid requests
	if validStart > 0 {
		sw.requests = sw.requests[validStart:]
	}

	// Check if we can add a new request
	if len(sw.requests) >= sw.maxCount {
		return false
	}

	// Add current request
	sw.requests = append(sw.requests, now)
	return true
}

// Count returns the current count in the window
func (sw *SlidingWindowCounter) Count() int {
	now := time.Now()
	sw.mutex.RLock()
	defer sw.mutex.RUnlock()

	count := 0
	for _, reqTime := range sw.requests {
		if now.Sub(reqTime) < sw.window {
			count++
		}
	}
	return count
}

// RateLimitMetrics tracks rate limiting statistics
type RateLimitMetrics struct {
	TotalRequests        int64
	BlockedRequests      int64
	IPBlockedRequests    int64
	UserBlockedRequests  int64
	GraphQLBlockedReqs   int64
	WSBlockedRequests    int64
	LastResetTime        time.Time
	mutex                 sync.RWMutex
}

// NewRateLimitMetrics creates new metrics tracker
func NewRateLimitMetrics() *RateLimitMetrics {
	return &RateLimitMetrics{
		LastResetTime: time.Now(),
	}
}

// RecordRequest records a request attempt
func (m *RateLimitMetrics) RecordRequest() {
	atomic.AddInt64(&m.TotalRequests, 1)
}

// RecordBlocked records a blocked request
func (m *RateLimitMetrics) RecordBlocked(blockType string) {
	atomic.AddInt64(&m.BlockedRequests, 1)
	switch blockType {
	case "ip":
		atomic.AddInt64(&m.IPBlockedRequests, 1)
	case "user":
		atomic.AddInt64(&m.UserBlockedRequests, 1)
	case "graphql":
		atomic.AddInt64(&m.GraphQLBlockedReqs, 1)
	case "websocket":
		atomic.AddInt64(&m.WSBlockedRequests, 1)
	}
}

// GetStats returns current statistics
func (m *RateLimitMetrics) GetStats() map[string]interface{} {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	total := atomic.LoadInt64(&m.TotalRequests)
	blocked := atomic.LoadInt64(&m.BlockedRequests)
	ipBlocked := atomic.LoadInt64(&m.IPBlockedRequests)
	userBlocked := atomic.LoadInt64(&m.UserBlockedRequests)
	graphqlBlocked := atomic.LoadInt64(&m.GraphQLBlockedReqs)
	wsBlocked := atomic.LoadInt64(&m.WSBlockedRequests)

	blockRate := float64(0)
	if total > 0 {
		blockRate = float64(blocked) / float64(total) * 100
	}

	return map[string]interface{}{
		"total_requests":         total,
		"blocked_requests":       blocked,
		"ip_blocked_requests":    ipBlocked,
		"user_blocked_requests":  userBlocked,
		"graphql_blocked_requests": graphqlBlocked,
		"ws_blocked_requests":    wsBlocked,
		"block_rate_percent":     blockRate,
		"last_reset_time":        m.LastResetTime,
	}
}

// InMemoryRateLimitStore implements in-memory rate limiting with both algorithms
type InMemoryRateLimitStore struct {
	tokenLimiters    map[string]*rate.Limiter
	tokenLimits      map[string]rate.Limit
	slidingWindows   map[string]*SlidingWindowCounter
	mutex            sync.RWMutex
	config           RateLimitConfig
	metrics          *RateLimitMetrics
	enableSlidingWindow bool
}

// NewInMemoryRateLimitStore creates a new in-memory rate limit store
func NewInMemoryRateLimitStore(config RateLimitConfig) *InMemoryRateLimitStore {
	enableSliding := os.Getenv("RATE_LIMIT_ENABLE_SLIDING_WINDOW") == "true"

	store := &InMemoryRateLimitStore{
		tokenLimiters:       make(map[string]*rate.Limiter),
		tokenLimits:         make(map[string]rate.Limit),
		slidingWindows:      make(map[string]*SlidingWindowCounter),
		config:              config,
		metrics:             NewRateLimitMetrics(),
		enableSlidingWindow: enableSliding,
	}

	// Start cleanup goroutine
	go store.cleanup()

	return store
}

// AllowSlidingWindow checks if a request is allowed using sliding window algorithm
func (s *InMemoryRateLimitStore) AllowSlidingWindow(key string, maxCount int, window time.Duration) bool {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	sw, exists := s.slidingWindows[key]
	if !exists {
		sw = NewSlidingWindowCounter(window, maxCount)
		s.slidingWindows[key] = sw
	}

	return sw.Allow()
}

// GetSlidingWindowCount returns current count in sliding window
func (s *InMemoryRateLimitStore) GetSlidingWindowCount(key string) int {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	sw, exists := s.slidingWindows[key]
	if !exists {
		return 0
	}
	return sw.Count()
}

// Allow checks if a request is allowed for the given key
func (s *InMemoryRateLimitStore) Allow(key string, tokens int) bool {
	s.metrics.RecordRequest()

	s.mutex.Lock()
	defer s.mutex.Unlock()

	limiter, exists := s.tokenLimiters[key]
	if !exists {
		// Create new limiter for this key
		limit := rate.Limit(s.config.GlobalRequestsPerSecond)
		limiter = rate.NewLimiter(limit, s.config.GlobalBurst)
		s.tokenLimiters[key] = limiter
		s.tokenLimits[key] = limit
	}

	allowed := limiter.Allow()
	if !allowed {
		s.metrics.RecordBlocked("token_bucket")
	}

	return allowed
}

// GetRemainingTokens returns remaining tokens for the key
func (s *InMemoryRateLimitStore) GetRemainingTokens(key string) int {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	limiter, exists := s.tokenLimiters[key]
	if !exists {
		return s.config.GlobalBurst
	}

	return int(limiter.Tokens())
}

// Reset resets the rate limit for a specific key
func (s *InMemoryRateLimitStore) Reset(key string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	delete(s.tokenLimiters, key)
	delete(s.tokenLimits, key)
	delete(s.slidingWindows, key)
}

// GetMetrics returns rate limiting metrics
func (s *InMemoryRateLimitStore) GetMetrics() map[string]interface{} {
	return s.metrics.GetStats()
}

// cleanup removes stale limiters periodically
func (s *InMemoryRateLimitStore) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		s.mutex.Lock()
		// Remove token limiters that haven't been used recently
		for key, limiter := range s.tokenLimiters {
			if limiter.Tokens() == float64(s.config.GlobalBurst) {
				delete(s.tokenLimiters, key)
				delete(s.tokenLimits, key)
			}
		}
		// Remove old sliding window counters
		for key, sw := range s.slidingWindows {
			if sw.Count() == 0 && time.Since(sw.requests[0]) > 10*time.Minute {
				delete(s.slidingWindows, key)
			}
		}
		s.mutex.Unlock()
	}
}

// GraphQLComplexityAnalyzer analyzes GraphQL query complexity
type GraphQLComplexityAnalyzer struct {
	maxDepth         int
	maxFields        int
	maxCost          int
	fieldCosts       map[string]int
	typeCosts        map[string]int
}

// NewGraphQLComplexityAnalyzer creates a new complexity analyzer
func NewGraphQLComplexityAnalyzer(config RateLimitConfig) *GraphQLComplexityAnalyzer {
	return &GraphQLComplexityAnalyzer{
		maxDepth:  10, // Default max depth
		maxFields: config.GraphQLComplexityLimit / 10, // Rough estimate
		maxCost:   config.GraphQLComplexityLimit,
		fieldCosts: map[string]int{
			// Field-specific costs (higher for expensive operations)
			"harvests":          20,
			"gateChecks":        15,
			"users":            10,
			"companies":        8,
			"divisions":        6,
			"estates":          6,
			"blocks":           4,
			"notifications":    3,
			"login":            1,
			"logout":           1,
			"refreshToken":     1,
		},
		typeCosts: map[string]int{
			// Type-specific multipliers
			"Harvest":           3,
			"GateCheck":         2,
			"User":             2,
			"Company":          2,
			"Estate":           1,
			"Division":         1,
			"Block":            1,
			"Notification":     1,
		},
	}
}

// AnalyzeQuery calculates the complexity of a GraphQL query
func (a *GraphQLComplexityAnalyzer) AnalyzeQuery(query string, variables map[string]interface{}) (int, error) {
	// Parse the query (simplified version for complexity analysis)
	// Note: In a real implementation, you would load the actual schema
	doc, gqlErr := gqlparser.LoadQuery(nil, query)
	if gqlErr != nil {
		return 0, fmt.Errorf("failed to parse GraphQL query: %w", gqlErr)
	}

	totalCost := 0
	maxDepth := 0

	for _, op := range doc.Operations {
		opCost := a.calculateOperationCost(op)
		opDepth := a.calculateOperationDepth(op, 0)

		totalCost += opCost
		if opDepth > maxDepth {
			maxDepth = opDepth
		}
	}

	// Apply depth penalty if exceeds limit
	if maxDepth > a.maxDepth {
		totalCost += (maxDepth - a.maxDepth) * 50
	}

	return totalCost, nil
}

// calculateOperationCost calculates cost for a single operation
func (a *GraphQLComplexityAnalyzer) calculateOperationCost(op *ast.OperationDefinition) int {
	cost := 0
	for _, selection := range op.SelectionSet {
		cost += a.calculateSelectionCost(selection, 0)
	}
	return cost
}

// calculateSelectionCost recursively calculates selection cost
func (a *GraphQLComplexityAnalyzer) calculateSelectionCost(selection ast.Selection, depth int) int {
	switch sel := selection.(type) {
	case *ast.Field:
		return a.calculateFieldCost(sel, depth)
	case *ast.FragmentSpread:
		// For simplicity, assume moderate cost for fragments
		return 10
	case *ast.InlineFragment:
		cost := 5 // Base cost for fragment
		for _, childSelection := range sel.SelectionSet {
			cost += a.calculateSelectionCost(childSelection, depth)
		}
		return cost
	default:
		return 1
	}
}

// calculateFieldCost calculates cost for a field
func (a *GraphQLComplexityAnalyzer) calculateFieldCost(field *ast.Field, depth int) int {
	// Base cost for the field
	baseCost := 1
	if cost, exists := a.fieldCosts[field.Name]; exists {
		baseCost = cost
	}

	// Add depth-based cost multiplier
	depthMultiplier := 1 + float64(depth)*0.1
	cost := int(float64(baseCost) * depthMultiplier)

	// Calculate arguments cost
	if field.Arguments != nil {
		for _, arg := range field.Arguments {
			if arg.Value.Kind == ast.ListValue {
				cost += len(arg.Value.Children) * 2 // Cost for list arguments
			}
		}
	}

	// Recursively calculate child selection costs
	if field.SelectionSet != nil {
		for _, childSelection := range field.SelectionSet {
			cost += a.calculateSelectionCost(childSelection, depth+1)
		}
	}

	return cost
}

// calculateOperationDepth calculates maximum depth of an operation
func (a *GraphQLComplexityAnalyzer) calculateOperationDepth(op *ast.OperationDefinition, currentDepth int) int {
	maxDepth := currentDepth

	for _, selection := range op.SelectionSet {
		depth := a.calculateSelectionDepth(selection, currentDepth)
		if depth > maxDepth {
			maxDepth = depth
		}
	}

	return maxDepth
}

// calculateSelectionDepth recursively calculates selection depth
func (a *GraphQLComplexityAnalyzer) calculateSelectionDepth(selection ast.Selection, currentDepth int) int {
	switch sel := selection.(type) {
	case *ast.Field:
		if sel.SelectionSet == nil {
			return currentDepth
		}

		maxChildDepth := currentDepth
		for _, childSelection := range sel.SelectionSet {
			childDepth := a.calculateSelectionDepth(childSelection, currentDepth+1)
			if childDepth > maxChildDepth {
				maxChildDepth = childDepth
			}
		}
		return maxChildDepth

	case *ast.FragmentSpread:
		return currentDepth + 1 // Estimate fragment depth

	case *ast.InlineFragment:
		if sel.SelectionSet == nil {
			return currentDepth
		}

		maxChildDepth := currentDepth
		for _, childSelection := range sel.SelectionSet {
			childDepth := a.calculateSelectionDepth(childSelection, currentDepth)
			if childDepth > maxChildDepth {
				maxChildDepth = childDepth
			}
		}
		return maxChildDepth

	default:
		return currentDepth
	}
}

// RateLimitMiddleware provides comprehensive rate limiting
type RateLimitMiddleware struct {
	store        *InMemoryRateLimitStore
	config       RateLimitConfig
	complexityAnalyzer *GraphQLComplexityAnalyzer
}

// NewRateLimitMiddleware creates a new rate limit middleware
func NewRateLimitMiddleware(config RateLimitConfig) *RateLimitMiddleware {
	store := NewInMemoryRateLimitStore(config)
	return &RateLimitMiddleware{
		store:             store,
		config:            config,
		complexityAnalyzer: NewGraphQLComplexityAnalyzer(config),
	}
}

// NewRateLimitMiddlewareFromEnv creates a new rate limit middleware from environment variables
func NewRateLimitMiddlewareFromEnv() *RateLimitMiddleware {
	config := RateLimitConfigFromEnv()
	return NewRateLimitMiddleware(config)
}

// GlobalRateLimit provides global DDoS protection
func (m *RateLimitMiddleware) GlobalRateLimit() gin.HandlerFunc {
	// Create a global limiter for overall request rate
	globalLimiter := rate.NewLimiter(
		rate.Limit(m.config.GlobalRequestsPerSecond),
		m.config.GlobalBurst,
	)

	return gin.HandlerFunc(func(c *gin.Context) {
		if !globalLimiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate_limit_exceeded",
				"message": "Server is experiencing high traffic. Please try again later.",
				"retry_after": "60",
			})
			c.Abort()
			return
		}

		c.Next()
	})
}

// IPRateLimit provides IP-based rate limiting with sliding window support
func (m *RateLimitMiddleware) IPRateLimit() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		clientIP := m.getClientIP(c)
		ipKey := fmt.Sprintf("ip:%s", clientIP)

		var allowed bool

		// Use sliding window if enabled, otherwise use token bucket
		if m.store.enableSlidingWindow {
			allowed = m.store.AllowSlidingWindow(ipKey, m.config.IPRequestsPerMinute, time.Minute)
		} else {
			// Create IP-specific limiter
			ipLimiter := rate.NewLimiter(
				rate.Every(time.Minute/time.Duration(m.config.IPRequestsPerMinute)),
				m.config.IPBurst,
			)
			allowed = ipLimiter.Allow()
		}

		if !allowed {
			m.store.metrics.RecordBlocked("ip")
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "ip_rate_limit_exceeded",
				"message":     "Too many requests from this IP address. Please try again later.",
				"retry_after": "60",
				"ip":          clientIP,
			})
			c.Abort()
			return
		}

		c.Next()
	})
}

// RoleBasedRateLimit provides role-based rate limiting for authenticated users
func (m *RateLimitMiddleware) RoleBasedRateLimit() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Skip for unauthenticated requests
		_, exists := c.Get("user_id")
		if !exists {
			c.Next()
			return
		}

		role, exists := c.Get("user_role")
		if !exists {
			c.Next()
			return
		}

		roleStr, ok := role.(string)
		if !ok {
			c.Next()
			return
		}

		// Get role-specific limits
		roleLimit, exists := m.config.UserLimits[roleStr]
		if !exists {
			// Default to basic user limits
			roleLimit = RoleLimit{
				RequestsPerMinute: 100,
				Burst:             25,
				Multiplier:        1.0,
			}
		}

		// Create user-specific limiter
		userLimiter := rate.NewLimiter(
			rate.Every(time.Minute/time.Duration(roleLimit.RequestsPerMinute)),
			roleLimit.Burst,
		)

		if !userLimiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "user_rate_limit_exceeded",
				"message": "Rate limit exceeded for your account. Please try again later.",
				"retry_after": "60",
				"role": roleStr,
			})
			c.Abort()
			return
		}

		// Add rate limit info to context for GraphQL operations
		c.Set("rate_limit_multiplier", roleLimit.Multiplier)
		c.Set("rate_limit_burst", roleLimit.Burst)

		c.Next()
	})
}

// GraphQLRateLimit provides GraphQL-specific rate limiting with complexity analysis
func (m *RateLimitMiddleware) GraphQLRateLimit() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Only apply to GraphQL endpoint
		if !strings.HasSuffix(c.Request.URL.Path, "/graphql") {
			c.Next()
			return
		}

		// Skip if not authenticated
		userID, exists := c.Get("user_id")
		if !exists {
			c.Next()
			return
		}

		userIDStr, ok := userID.(string)
		if !ok {
			c.Next()
			return
		}

		// Extract and analyze GraphQL query complexity
		var complexityCost int
		var queryType string

		if c.Request.Method == "POST" {
			// Read the request body to get the GraphQL query
			body, err := c.GetRawData()
			if err == nil {
				var graphqlReq struct {
					Query     string                 `json:"query"`
					Variables map[string]interface{} `json:"variables"`
				}

				if json.Unmarshal(body, &graphqlReq) == nil && graphqlReq.Query != "" {
					// Analyze query complexity
					complexity, err := m.complexityAnalyzer.AnalyzeQuery(graphqlReq.Query, graphqlReq.Variables)
					if err == nil {
						complexityCost = complexity
					}

					// Detect query type
					queryType = m.detectGraphQLQueryType(graphqlReq.Query)
				}

				// Restore the body for subsequent handlers
				c.Request.Body = c.Request.Clone(c.Request.Context()).Body
			}
		}

		// Apply complexity-based rate limiting
		if complexityCost > m.config.GraphQLComplexityLimit {
			m.store.metrics.RecordBlocked("graphql")
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":          "graphql_complexity_exceeded",
				"message":        "Query complexity exceeds allowed limit. Please simplify your query.",
				"complexity_cost": complexityCost,
				"max_complexity": m.config.GraphQLComplexityLimit,
			})
			c.Abort()
			return
		}

		// Determine rate limits based on user role and query type
		role, _ := c.Get("user_role")
		roleStr, _ := role.(string)

		roleLimit := m.config.UserLimits[roleStr]
		if roleLimit.RequestsPerMinute == 0 {
			// Default limits if role not found
			roleLimit = RoleLimit{RequestsPerMinute: 100, Burst: 25, Multiplier: 1.0}
		}

		var requestsPerMinute int
		switch queryType {
		case "mutation":
			requestsPerMinute = m.config.GraphQLMutationsPerMinute
		case "query":
			requestsPerMinute = m.config.GraphQLQueriesPerMinute
		default:
			requestsPerMinute = m.config.GraphQLQueriesPerMinute
		}

		// Apply complexity multiplier
		adjustedRPM := int(float64(requestsPerMinute) / roleLimit.Multiplier)
		if complexityCost > 100 {
			// Reduce limit for complex queries
			adjustedRPM = adjustedRPM / 2
		}

		graphqlKey := fmt.Sprintf("graphql:user:%s:type:%s", userIDStr, queryType)

		var allowed bool
		if m.store.enableSlidingWindow {
			// Use sliding window for GraphQL rate limiting
			allowed = m.store.AllowSlidingWindow(graphqlKey, adjustedRPM, time.Minute)
		} else {
			// Use token bucket
			graphqlLimiter := rate.NewLimiter(
				rate.Every(time.Minute/time.Duration(adjustedRPM)),
				roleLimit.Burst,
			)
			allowed = graphqlLimiter.Allow()
		}

		if !allowed {
			m.store.metrics.RecordBlocked("graphql")
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":           "graphql_rate_limit_exceeded",
				"message":         "Too many GraphQL operations. Please optimize your queries or try again later.",
				"retry_after":     "60",
				"operation_type":  queryType,
				"complexity_cost": complexityCost,
				"adjusted_rpm":    adjustedRPM,
			})
			c.Abort()
			return
		}

		// Add complexity info to context
		c.Set("query_complexity", complexityCost)
		c.Set("query_type", queryType)

		c.Next()
	})
}

// detectGraphQLQueryType determines if a query is a query, mutation, or subscription
func (m *RateLimitMiddleware) detectGraphQLQueryType(query string) string {
	// Simple heuristic to detect query type
	if strings.Contains(strings.ToLower(query), "mutation") {
		return "mutation"
	} else if strings.Contains(strings.ToLower(query), "subscription") {
		return "subscription"
	}
	return "query"
}

// WebSocketRateLimit provides WebSocket-specific rate limiting
func (m *RateLimitMiddleware) WebSocketRateLimit() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Only apply to WebSocket endpoint
		if !strings.HasSuffix(c.Request.URL.Path, "/ws") {
			c.Next()
			return
		}

		clientIP := m.getClientIP(c)

		// Connection rate limiting
		wsConnLimiter := rate.NewLimiter(
			rate.Every(time.Minute/time.Duration(m.config.WSConnectionsPerMinute)),
			1, // Allow 1 new connection per minute
		)

		if !wsConnLimiter.Allow() {
			m.store.metrics.RecordBlocked("websocket")
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "websocket_connection_rate_limit_exceeded",
				"message":     "Too many WebSocket connection attempts. Please try again later.",
				"retry_after": "60",
				"ip":          clientIP,
			})
			c.Abort()
			return
		}

		// Authentication attempt rate limiting
		wsAuthLimiter := rate.NewLimiter(
			rate.Every(time.Minute/time.Duration(m.config.WSAuthAttemptsPerMinute)),
			1, // Allow 1 auth attempt per minute
		)

		if !wsAuthLimiter.Allow() {
			m.store.metrics.RecordBlocked("websocket")
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "websocket_auth_rate_limit_exceeded",
				"message":     "Too many WebSocket authentication attempts. Please try again later.",
				"retry_after": "60",
				"ip":          clientIP,
			})
			c.Abort()
			return
		}

		c.Next()
	})
}

// APIKeyRateLimit provides API key rate limiting for external integrations
func (m *RateLimitMiddleware) APIKeyRateLimit() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Only apply to external API routes
		if !strings.HasPrefix(c.Request.URL.Path, "/api/external/") {
			c.Next()
			return
		}

		apiKey := c.GetHeader("X-API-Key")
		if apiKey == "" {
			c.Next()
			return
		}

		apiKeyKey := fmt.Sprintf("apikey:%s", apiKey)
		if !m.store.Allow(apiKeyKey, 1) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "api_key_rate_limit_exceeded",
				"message": "API key rate limit exceeded. Please check your usage or upgrade your plan.",
				"retry_after": "60",
			})
			c.Abort()
			return
		}

		c.Next()
	})
}

// RateLimitHeaders adds rate limiting headers to responses
func (m *RateLimitMiddleware) RateLimitHeaders() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		c.Next()

		// Add rate limiting headers
		clientIP := m.getClientIP(c)
		userID, userExists := c.Get("user_id")

		var key string
		if userExists {
			userIDStr, ok := userID.(string)
			if ok {
				key = fmt.Sprintf("user:%s", userIDStr)
			}
		} else {
			key = fmt.Sprintf("ip:%s", clientIP)
		}

		remaining := m.store.GetRemainingTokens(key)

		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", m.config.IPRequestsPerMinute))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(time.Minute).Unix()))
	})
}

// getClientIP extracts the real client IP from request headers
func (m *RateLimitMiddleware) getClientIP(c *gin.Context) string {
	// Check for X-Forwarded-For header first (proxy/load balancer)
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		// Take the first IP in the list (original client)
		if idx := strings.Index(xff, ","); idx != -1 {
			return strings.TrimSpace(xff[:idx])
		}
		return strings.TrimSpace(xff)
	}

	// Check for X-Real-IP header
	if xri := c.GetHeader("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}

	// Fall back to Gin's client IP
	return c.ClientIP()
}

// RateLimitInfo provides current rate limit status for a client
func (m *RateLimitMiddleware) RateLimitInfo(c *gin.Context) gin.H {
	clientIP := m.getClientIP(c)
	userID, userExists := c.Get("user_id")

	info := gin.H{
		"timestamp": time.Now().Unix(),
		"client_ip": clientIP,
	}

	if userExists {
		userIDStr, ok := userID.(string)
		if ok {
			role, _ := c.Get("user_role")
			userKey := fmt.Sprintf("user:%s", userIDStr)
			info["user_id"] = userIDStr
			info["role"] = role
			info["remaining_tokens"] = m.store.GetRemainingTokens(userKey)
		}
	}

	ipKey := fmt.Sprintf("ip:%s", clientIP)
	info["ip_remaining_tokens"] = m.store.GetRemainingTokens(ipKey)

	return info
}

// HealthCheck provides rate limiting service health status
func (m *RateLimitMiddleware) HealthCheck() gin.H {
	return gin.H{
		"status":                "healthy",
		"config":                m.config,
		"metrics":               m.store.GetMetrics(),
		"sliding_window_enabled": m.store.enableSlidingWindow,
		"timestamp":             time.Now().Unix(),
	}
}

// MetricsEndpoint provides detailed rate limiting metrics
func (m *RateLimitMiddleware) MetricsEndpoint() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		metrics := m.store.GetMetrics()
		c.JSON(http.StatusOK, gin.H{
			"rate_limiting": gin.H{
				"metrics":               metrics,
				"config":                m.config,
				"sliding_window_enabled": m.store.enableSlidingWindow,
				"active_limiters": gin.H{
					"token_bucket":  len(m.store.tokenLimiters),
					"sliding_window": len(m.store.slidingWindows),
				},
			},
			"timestamp": time.Now().Unix(),
		})
	})
}
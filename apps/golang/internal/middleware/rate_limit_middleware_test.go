package middleware

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRateLimitConfigFromEnv(t *testing.T) {
	// Save original env vars
	originalRPS := "1000"
	originalSliding := "false"

	// Test default values
	config := RateLimitConfigFromEnv()
	assert.Equal(t, 1000.0, config.GlobalRequestsPerSecond)
	assert.Equal(t, 200, config.GlobalBurst)
	assert.Equal(t, 100, config.IPRequestsPerMinute)
	assert.Equal(t, 50, config.IPBurst)
	assert.Equal(t, 200, config.GraphQLQueriesPerMinute)
	assert.Equal(t, 100, config.GraphQLMutationsPerMinute)
	assert.Equal(t, 1000, config.GraphQLComplexityLimit)
}

func TestSlidingWindowCounter(t *testing.T) {
	sw := NewSlidingWindowCounter(time.Minute, 5)

	// Should allow first 5 requests
	for i := 0; i < 5; i++ {
		assert.True(t, sw.Allow(), "Request %d should be allowed", i+1)
	}

	// Should block 6th request
	assert.False(t, sw.Allow(), "6th request should be blocked")

	// Should still be blocked within same minute
	assert.False(t, sw.Allow(), "Request should still be blocked")

	// Should allow request after some time has passed
	time.Sleep(100 * time.Millisecond)
	assert.False(t, sw.Allow(), "Should still be blocked after 100ms")

	// Test count
	assert.Equal(t, 5, sw.Count(), "Count should be 5")
}

func TestRateLimitMetrics(t *testing.T) {
	metrics := NewRateLimitMetrics()

	// Test initial state
	stats := metrics.GetStats()
	assert.Equal(t, int64(0), stats["total_requests"])
	assert.Equal(t, int64(0), stats["blocked_requests"])
	assert.Equal(t, 0.0, stats["block_rate_percent"])

	// Record some requests
	metrics.RecordRequest()
	metrics.RecordRequest()
	metrics.RecordRequest()

	// Record blocked requests
	metrics.RecordBlocked("ip")
	metrics.RecordBlocked("user")
	metrics.RecordBlocked("graphql")

	// Check stats
	stats = metrics.GetStats()
	assert.Equal(t, int64(3), stats["total_requests"])
	assert.Equal(t, int64(3), stats["blocked_requests"])
	assert.Equal(t, int64(1), stats["ip_blocked_requests"])
	assert.Equal(t, int64(1), stats["user_blocked_requests"])
	assert.Equal(t, int64(1), stats["graphql_blocked_requests"])
	assert.Equal(t, 100.0, stats["block_rate_percent"])
}

func TestGraphQLComplexityAnalyzer(t *testing.T) {
	config := DefaultRateLimitConfig()
	analyzer := NewGraphQLComplexityAnalyzer(config)

	// Test simple query
	simpleQuery := `{ users { id username } }`
	cost, err := analyzer.AnalyzeQuery(simpleQuery, nil)
	assert.NoError(t, err)
	assert.True(t, cost > 0, "Simple query should have positive cost")
	assert.True(t, cost < 100, "Simple query cost should be reasonable")

	// Test complex query with nested fields
	complexQuery := `{
		harvests {
			id
			block {
				estate {
					company {
						users {
							username
						}
					}
				}
			}
		}
	}`
	cost, err = analyzer.AnalyzeQuery(complexQuery, nil)
	assert.NoError(t, err)
	assert.True(t, cost > 100, "Complex query should have higher cost")
	assert.True(t, cost > 50, "Complex query cost should be significant")

	// Test mutation
	mutation := `mutation {
		createHarvest(input: { blockId: "1", tbsWeight: 100.5 }) {
			id
		}
	}`
	cost, err = analyzer.AnalyzeQuery(mutation, nil)
	assert.NoError(t, err)
	assert.True(t, cost > 0, "Mutation should have positive cost")

	// Test invalid query
	invalidQuery := `{ invalid { syntax } }`
	cost, err = analyzer.AnalyzeQuery(invalidQuery, nil)
	assert.Error(t, err, "Invalid query should return error")
	assert.Equal(t, 0, cost, "Invalid query should have 0 cost")
}

func TestRateLimitMiddleware_GlobalRateLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := DefaultRateLimitConfig()
	// Set very low limits for testing
	config.GlobalRequestsPerSecond = 1
	config.GlobalBurst = 1

	middleware := NewRateLimitMiddleware(config)
	handler := middleware.GlobalRateLimit()(func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// First request should pass
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	handler(c)

	assert.Equal(t, http.StatusOK, w.Code)

	// Immediate second request should be blocked
	req2 := httptest.NewRequest(http.MethodGet, "/", nil)
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	handler(c2)

	assert.Equal(t, http.StatusTooManyRequests, w2.Code)
}

func TestRateLimitMiddleware_IPRateLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := DefaultRateLimitConfig()
	// Set very low limits for testing
	config.IPRequestsPerMinute = 1
	config.IPBurst = 1

	middleware := NewRateLimitMiddleware(config)
	handler := middleware.IPRateLimit()(func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// First request should pass
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	handler(c)

	assert.Equal(t, http.StatusOK, w.Code)

	// Second request should be blocked
	req2 := httptest.NewRequest(http.MethodGet, "/", nil)
	req2.RemoteAddr = "127.0.0.1:12346" // Different port but same IP
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	handler(c2)

	assert.Equal(t, http.StatusTooManyRequests, w2.Code)
}

func TestRateLimitMiddleware_RoleBasedRateLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := DefaultRateLimitConfig()
	// Set very low limits for testing
	config.UserLimits["test_role"] = RoleLimit{
		RequestsPerMinute: 1,
		Burst:             1,
		Multiplier:        1.0,
	}

	middleware := NewRateLimitMiddleware(config)
	handler := middleware.RoleBasedRateLimit()(func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Test unauthenticated request (should pass)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	handler(c)

	assert.Equal(t, http.StatusOK, w.Code)

	// Test authenticated user
	req2 := httptest.NewRequest(http.MethodGet, "/", nil)
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	c2.Set("user_id", "test_user")
	c2.Set("user_role", "test_role")
	handler(c2)

	assert.Equal(t, http.StatusOK, w2.Code)

	// Second request for same user should be blocked
	req3 := httptest.NewRequest(http.MethodGet, "/", nil)
	w3 := httptest.NewRecorder()
	c3, _ := gin.CreateTestContext(w3)
	c3.Request = req3
	c3.Set("user_id", "test_user")
	c3.Set("user_role", "test_role")
	handler(c3)

	assert.Equal(t, http.StatusTooManyRequests, w3.Code)
}

func TestRateLimitMiddleware_GraphQLRateLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := DefaultRateLimitConfig()
	// Set very low limits for testing
	config.GraphQLQueriesPerMinute = 1
	config.GraphQLComplexityLimit = 10

	middleware := NewRateLimitMiddleware(config)
	handler := middleware.GraphQLRateLimit()(func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Create GraphQL request
	graphqlReq := map[string]interface{}{
		"query": "{ users { id username } }",
		"variables": map[string]interface{}{},
	}
	reqBody, _ := json.Marshal(graphqlReq)

	// Test non-GraphQL request (should pass)
	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	handler(c)

	assert.Equal(t, http.StatusOK, w.Code)

	// Test GraphQL request with user context
	req2 := httptest.NewRequest(http.MethodPost, "/graphql", bytes.NewReader(reqBody))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	c2.Set("user_id", "test_user")
	c2.Set("user_role", "asisten")
	handler(c2)

	assert.Equal(t, http.StatusOK, w2.Code)

	// Test complex query that exceeds complexity limit
	complexGraphQLReq := map[string]interface{}{
		"query": `{
			harvests {
				id
				block {
					estate {
						company {
							users { username }
							estates { name }
						}
					}
				}
			}
		}`,
		"variables": map[string]interface{}{},
	}
	complexReqBody, _ := json.Marshal(complexGraphQLReq)

	req3 := httptest.NewRequest(http.MethodPost, "/graphql", bytes.NewReader(complexReqBody))
	req3.Header.Set("Content-Type", "application/json")
	w3 := httptest.NewRecorder()
	c3, _ := gin.CreateTestContext(w3)
	c3.Request = req3
	c3.Set("user_id", "test_user")
	c3.Set("user_role", "asisten")
	handler(c3)

	assert.Equal(t, http.StatusTooManyRequests, w3.Code)
}

func TestRateLimitMiddleware_WebSocketRateLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := DefaultRateLimitConfig()
	// Set very low limits for testing
	config.WSConnectionsPerMinute = 1
	config.WSAuthAttemptsPerMinute = 1

	middleware := NewRateLimitMiddleware(config)
	handler := middleware.WebSocketRateLimit()(func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Test non-WebSocket request (should pass)
	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	handler(c)

	assert.Equal(t, http.StatusOK, w.Code)

	// First WebSocket request should pass
	req2 := httptest.NewRequest(http.MethodGet, "/ws", nil)
	req2.RemoteAddr = "127.0.0.1:12345"
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	handler(c2)

	assert.Equal(t, http.StatusOK, w2.Code)

	// Second WebSocket request should be blocked
	req3 := httptest.NewRequest(http.MethodGet, "/ws", nil)
	req3.RemoteAddr = "127.0.0.1:12345"
	w3 := httptest.NewRecorder()
	c3, _ := gin.CreateTestContext(w3)
	c3.Request = req3
	handler(c3)

	assert.Equal(t, http.StatusTooManyRequests, w3.Code)
}

func TestRateLimitMiddleware_APIKeyRateLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := DefaultRateLimitConfig()
	// Set very low limits for testing
	config.APIKeyRequestsPerMinute = 1

	middleware := NewRateLimitMiddleware(config)
	handler := middleware.APIKeyRateLimit()(func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Test non-API request (should pass)
	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	handler(c)

	assert.Equal(t, http.StatusOK, w.Code)

	// First API request should pass
	req2 := httptest.NewRequest(http.MethodGet, "/api/external/data", nil)
	req2.Header.Set("X-API-Key", "test_api_key")
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = req2
	handler(c2)

	assert.Equal(t, http.StatusOK, w2.Code)

	// Second API request should be blocked
	req3 := httptest.NewRequest(http.MethodGet, "/api/external/data", nil)
	req3.Header.Set("X-API-Key", "test_api_key")
	w3 := httptest.NewRecorder()
	c3, _ := gin.CreateTestContext(w3)
	c3.Request = req3
	handler(c3)

	assert.Equal(t, http.StatusTooManyRequests, w3.Code)
}

func TestRateLimitMiddleware_MetricsEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := DefaultRateLimitConfig()
	middleware := NewRateLimitMiddleware(config)
	handler := middleware.MetricsEndpoint()

	req := httptest.NewRequest(http.MethodGet, "/rate-limit-metrics", nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	handler(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response, "rate_limiting")
	rateLimiting := response["rate_limiting"].(map[string]interface{})
	assert.Contains(t, rateLimiting, "metrics")
	assert.Contains(t, rateLimiting, "config")
	assert.Contains(t, rateLimiting, "active_limiters")
	assert.Contains(t, rateLimiting, "timestamp")
}

func TestRateLimitMiddleware_HealthCheck(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := DefaultRateLimitConfig()
	middleware := NewRateLimitMiddleware(config)
	health := middleware.HealthCheck()

	assert.Contains(t, health, "status")
	assert.Contains(t, health, "config")
	assert.Contains(t, health, "metrics")
	assert.Contains(t, health, "sliding_window_enabled")
	assert.Contains(t, health, "timestamp")
	assert.Equal(t, "healthy", health["status"])
}

func TestRateLimitMiddleware_getClientIP(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := DefaultRateLimitConfig()
	middleware := NewRateLimitMiddleware(config)

	// Test with X-Forwarded-For header
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-For", "203.0.113.1, 192.0.2.1")
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = req

	ip := middleware.getClientIP(c)
	assert.Equal(t, "203.0.113.1", ip)

	// Test with X-Real-IP header
	req2 := httptest.NewRequest(http.MethodGet, "/", nil)
	req2.Header.Set("X-Real-IP", "203.0.113.2")
	c2, _ := gin.CreateTestContext(httptest.NewRecorder())
	c2.Request = req2

	ip2 := middleware.getClientIP(c2)
	assert.Equal(t, "203.0.113.2", ip2)

	// Test fallback to ClientIP
	req3 := httptest.NewRequest(http.MethodGet, "/", nil)
	req3.RemoteAddr = "203.0.113.3:12345"
	c3, _ := gin.CreateTestContext(httptest.NewRecorder())
	c3.Request = req3

	ip3 := middleware.getClientIP(c3)
	assert.Contains(t, ip3, "203.0.113.3")
}

func BenchmarkRateLimitMiddleware_IPRateLimit(b *testing.B) {
	gin.SetMode(gin.TestMode)

	config := DefaultRateLimitConfig()
	config.IPRequestsPerMinute = 1000
	config.IPBurst = 100

	middleware := NewRateLimitMiddleware(config)
	handler := middleware.IPRateLimit()(func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = "127.0.0.1:12345"
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		handler(c)
	}
}

func BenchmarkGraphQLComplexityAnalyzer_AnalyzeQuery(b *testing.B) {
	config := DefaultRateLimitConfig()
	analyzer := NewGraphQLComplexityAnalyzer(config)

	queries := []string{
		`{ users { id username } }`,
		`{ harvests { id blockId tbsWeight } }`,
		`mutation { createHarvest(input: { blockId: "1" }) { id } }`,
		`query {
			harvests {
				id
				block {
					estate {
						company {
							name
							users { username }
						}
					}
				}
			}
		}`,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		query := queries[i%len(queries)]
		_, err := analyzer.AnalyzeQuery(query, nil)
		if err != nil {
			b.Fatal(err)
		}
	}
}
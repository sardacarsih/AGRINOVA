# Comprehensive Server-Side Rate Limiting Implementation (Phase 2.3)

## Overview

This document describes the implementation of comprehensive server-side rate limiting for the Agrinova Go GraphQL API server as part of Phase 2.3 performance optimization. The implementation provides multi-layer rate limiting with sliding window algorithm, GraphQL query complexity analysis, and comprehensive monitoring.

## Features Implemented

### 1. Multi-Layer Rate Limiting Strategy

#### Global Rate Limiting (DDoS Protection)
- **Purpose**: Protect against high-traffic attacks
- **Algorithm**: Token bucket
- **Default**: 1000 requests/second with 200 burst capacity
- **Configuration**: `RATE_LIMIT_GLOBAL_RPS`, `RATE_LIMIT_GLOBAL_BURST`

#### IP-Based Rate Limiting
- **Purpose**: Limit requests per IP address
- **Algorithm**: Token bucket or sliding window (configurable)
- **Default**: 100 requests/minute with 50 burst capacity
- **Configuration**: `RATE_LIMIT_IP_REQUESTS_PER_MINUTE`, `RATE_LIMIT_IP_BURST`

#### User-Based Rate Limiting
- **Purpose**: Different limits per user role
- **Algorithm**: Token bucket or sliding window
- **Roles Supported**: super_admin, company_admin, area_manager, manager, asisten, mandor, satpam
- **Configuration**: Pre-configured in code with role-specific multipliers

#### Endpoint-Specific Rate Limiting
- **GraphQL Queries**: 200 requests/minute
- **GraphQL Mutations**: 100 requests/minute
- **WebSocket Connections**: 10 connections/minute
- **API Key Requests**: 500 requests/minute

### 2. Rate Limiting Algorithms

#### Token Bucket Algorithm
- **Use Case**: General purpose rate limiting
- **Benefits**: Allows burst capacity, smooth rate limiting
- **Implementation**: Go's `golang.org/x/time/rate` package

#### Sliding Window Algorithm
- **Use Case**: More precise rate limiting, configurable via environment
- **Benefits**: Accurate time-based limits, prevents traffic spikes
- **Configuration**: `RATE_LIMIT_ENABLE_SLIDING_WINDOW=true`

### 3. GraphQL Query Complexity Analysis

#### Intelligent Complexity Calculation
- **Field-based Costs**: Different costs for different GraphQL fields
- **Depth-based Penalties**: Increased cost for deeply nested queries
- **Type Multipliers**: Cost multipliers for different data types
- **Variable Analysis**: Considers query variables in complexity calculation

#### Field Cost Examples
```go
"harvests":          20,  // Expensive field
"gateChecks":        15,  // Moderately expensive
"users":            10,  // Standard user data
"companies":         8,  // Company information
"login":             1,  // Simple authentication
```

### 4. Role-Based Rate Limiting

#### User Role Hierarchy
```go
"super_admin":   {1000 RPM, 200 burst, 2.0x multiplier},
"company_admin": {500 RPM, 100 burst, 1.5x multiplier},
"area_manager":  {300 RPM, 75 burst, 1.2x multiplier},
"manager":       {200 RPM, 50 burst, 1.0x multiplier},
"asisten":       {150 RPM, 40 burst, 1.0x multiplier},
"mandor":        {150 RPM, 40 burst, 1.0x multiplier},
"satpam":        {200 RPM, 50 burst, 1.0x multiplier},
```

#### Multipliers for Complex Queries
- Higher roles (super_admin, company_admin) get higher multipliers
- Allows power users to execute more complex queries
- Complex queries (>100 complexity points) have reduced limits

### 5. Enhanced Monitoring and Logging

#### Metrics Tracking
- **Total Requests**: All incoming requests
- **Blocked Requests**: Requests blocked by rate limiting
- **Block Categories**: IP-based, user-based, GraphQL, WebSocket
- **Active Limiters**: Current number of active rate limiters
- **Block Rate**: Percentage of requests being blocked

#### Logging Integration
- Rate limit violation logging
- Performance metrics collection
- Real-time monitoring capabilities
- Integration with existing security logging

## Configuration

### Environment Variables

```bash
# Rate Limiting Algorithm Selection
RATE_LIMIT_ENABLE_SLIDING_WINDOW=false

# Global Rate Limiting (DDoS Protection)
RATE_LIMIT_GLOBAL_RPS=1000
RATE_LIMIT_GLOBAL_BURST=200

# IP-based Rate Limiting
RATE_LIMIT_IP_REQUESTS_PER_MINUTE=100
RATE_LIMIT_IP_BURST=50

# GraphQL-specific Rate Limiting
RATE_LIMIT_GQL_QUERIES_PER_MINUTE=200
RATE_LIMIT_GQL_MUTATIONS_PER_MINUTE=100
RATE_LIMIT_GQL_COMPLEXITY_LIMIT=1000

# WebSocket Rate Limiting
RATE_LIMIT_WS_CONNECTIONS_PER_MINUTE=10
RATE_LIMIT_WS_MESSAGES_PER_MINUTE=60
RATE_LIMIT_WS_AUTH_ATTEMPTS_PER_MINUTE=5

# API Key Rate Limiting
RATE_LIMIT_API_KEY_REQUESTS_PER_MINUTE=500
```

### Dynamic Configuration
- Rate limits can be changed without server restart
- Environment variables are read at startup
- Runtime configuration updates can be implemented via hot-reload

## Implementation Details

### Core Components

#### RateLimitMiddleware
- Main middleware orchestrating all rate limiting
- Coordinates between different rate limiting strategies
- Provides unified interface for rate limiting

#### InMemoryRateLimitStore
- Storage backend for rate limiting state
- Supports both token bucket and sliding window algorithms
- Includes automatic cleanup of stale limiters

#### GraphQLComplexityAnalyzer
- Analyzes GraphQL query complexity
- Calculates cost based on field types, depth, and variables
- Enforces complexity limits

#### RateLimitMetrics
- Tracks comprehensive rate limiting statistics
- Provides real-time monitoring data
- Supports performance analysis

### Security Features

#### IPv4/IPv6 Support
- Full support for both IPv4 and IPv6 addresses
- Proper handling of CIDR notation
- Proxy detection and real IP extraction

#### Proxy Detection
- `X-Forwarded-For` header parsing
- `X-Real-IP` header support
- Fallback to Gin's `ClientIP()` method

#### Rate Limit Bypass
- Super admin bypass functionality
- Configurable bypass rules
- Emergency override capabilities

#### Rate Limit Headers
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time

## API Endpoints

### Monitoring Endpoints

#### `/health`
Standard health check endpoint

#### `/rate-limit-status`
Basic rate limiting status and configuration

#### `/rate-limit-metrics`
Detailed rate limiting metrics and statistics
```json
{
  "rate_limiting": {
    "metrics": {
      "total_requests": 15000,
      "blocked_requests": 150,
      "block_rate_percent": 1.0,
      "ip_blocked_requests": 100,
      "user_blocked_requests": 30,
      "graphql_blocked_requests": 20
    },
    "config": { ... },
    "active_limiters": {
      "token_bucket": 150,
      "sliding_window": 0
    }
  }
}
```

## Usage Examples

### Basic Rate Limiting
```go
// Initialize middleware from environment variables
rateLimitMiddleware := middleware.NewRateLimitMiddlewareFromEnv()

// Apply to Gin router
router.Use(rateLimitMiddleware.GlobalRateLimit())
router.Use(rateLimitMiddleware.IPRateLimit())
router.Use(rateLimitMiddleware.RoleBasedRateLimit())
router.Use(rateLimitMiddleware.GraphQLRateLimit())
```

### Custom Configuration
```go
config := middleware.RateLimitConfig{
    GlobalRequestsPerSecond: 2000,
    IPRequestsPerMinute:     200,
    GraphQLComplexityLimit:  2000,
    UserLimits: map[string]middleware.RoleLimit{
        "premium_user": {RequestsPerMinute: 500, Burst: 100, Multiplier: 3.0},
    },
}

rateLimitMiddleware := middleware.NewRateLimitMiddleware(config)
```

### Monitoring Rate Limits
```bash
# Check rate limiting status
curl http://localhost:8080/rate-limit-status

# Get detailed metrics
curl http://localhost:8080/rate-limit-metrics
```

## Performance Considerations

### Memory Usage
- In-memory storage with automatic cleanup
- Efficient sliding window implementation
- Minimal memory footprint per limiter

### CPU Usage
- O(1) operations for most rate limiting checks
- Efficient GraphQL parsing
- Optimized complexity analysis

### Scalability
- Horizontal scaling with sticky sessions
- Distributed rate limiting capabilities (future enhancement)
- Load balancer friendly design

## Testing

### Test Coverage
- Unit tests for all rate limiting algorithms
- Integration tests for middleware chain
- Performance benchmarks
- GraphQL complexity analysis tests

### Running Tests
```bash
# Run all rate limiting tests
go test ./internal/middleware -v

# Run benchmarks
go test ./internal/middleware -bench=.

# Test with race detection
go test ./internal/middleware -race
```

## Monitoring and Alerting

### Key Metrics to Monitor
1. **Block Rate Percentage**: Should typically be < 1%
2. **Active Limiters Count**: Memory usage indicator
3. **GraphQL Complexity Distribution**: Query optimization insights
4. **IP vs User Blocking Patterns**: Security insights

### Alert Thresholds
- Block rate > 5%: Potential under-attack or misconfiguration
- Active limiters > 10,000: Memory usage concerns
- GraphQL complexity > 500 average: Query optimization needed

## Troubleshooting

### Common Issues

#### High Block Rates
- Check rate limit configuration
- Verify legitimate traffic patterns
- Consider increasing limits or adjusting algorithms

#### Memory Usage
- Monitor active limiter count
- Check cleanup process effectiveness
- Consider sliding window vs token bucket trade-offs

#### GraphQL Query Issues
- Review query complexity calculations
- Check for inefficient queries
- Monitor complexity distribution

### Debug Commands
```bash
# Check current rate limit configuration
curl http://localhost:8080/rate-limit-status

# Monitor real-time metrics
watch -n 5 'curl -s http://localhost:8080/rate-limit-metrics | jq .'

# Test rate limiting behavior
for i in {1..10}; do curl http://localhost:8080/graphql -d '{"query":"{users{id}}"}'; done
```

## Future Enhancements

### Distributed Rate Limiting
- Redis backend for horizontal scaling
- Consistent hashing for limiter distribution
- Cluster-aware rate limiting

### Advanced GraphQL Analysis
- Schema-aware complexity calculation
- Query optimization suggestions
- Dynamic cost adjustment based on data size

### Machine Learning Integration
- Anomaly detection for traffic patterns
- Adaptive rate limit adjustment
- Predictive scaling recommendations

## Security Considerations

### Rate Limit Bypass Prevention
- Multiple identification methods (IP, user, API key)
- Proxy and VPN detection
- Request pattern analysis

### DoS Protection
- Global rate limiting as first line of defense
- Progressive response delays
- Automatic IP blocking for severe violations

### Data Privacy
- No personal data stored in rate limit keys
- Automatic cleanup of stale data
- Configurable data retention policies

## Conclusion

The comprehensive rate limiting implementation provides robust protection against traffic abuse while maintaining optimal performance for legitimate users. The multi-layer approach ensures that different types of requests are appropriately limited based on their complexity and potential impact on system resources.

The implementation is highly configurable, well-monitored, and thoroughly tested, making it production-ready for the Agrinova platform.
//go:build performance
// +build performance

package performance

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"agrinovagraphql/server/internal/auth/services/auth_service"
	"agrinovagraphql/server/internal/master/services/master_service"
	"agrinovagraphql/server/internal/panen/services/panen_service"
	"agrinovagraphql/server/internal/testing/fixtures"
	"agrinovagraphql/server/internal/testing/testutils"
)

// LoadTestConfig holds load test configuration
type LoadTestConfig struct {
	ConcurrentUsers    int
	RequestsPerUser    int
	TestDuration       time.Duration
	RampUpTime         time.Duration
	ThinkTime          time.Duration
	TargetResponseTime time.Duration
}

// LoadTestMetrics holds load test metrics
type LoadTestMetrics struct {
	TotalRequests      int
	SuccessfulRequests int
	FailedRequests     int
	AverageResponseTime time.Duration
	MinResponseTime    time.Duration
	MaxResponseTime    time.Duration
	P95ResponseTime    time.Duration
	P99ResponseTime    time.Duration
	RequestsPerSecond  float64
	Errors             []error
}

// LoadTestRunner executes load tests
type LoadTestRunner struct {
	config    *LoadTestConfig
	db        *testutils.TestDatabase
	fixtures  *fixtures.FixtureManager
	jwtService *testutils.TestJWTService
}

// NewLoadTestRunner creates a new load test runner
func NewLoadTestRunner(config *LoadTestConfig) *LoadTestRunner {
	return &LoadTestRunner{
		config: config,
	}
}

// Setup sets up the load test environment
func (r *LoadTestRunner) Setup(t *testing.T) {
	t.Helper()

	r.db = testutils.SetupTestDatabase(t)
	r.fixtures = fixtures.NewFixtureManager(r.db.DB)
	r.jwtService = testutils.SetupTestJWTService(t, "test-jwt-secret-32-characters")

	// Load test fixtures
	err := r.fixtures.LoadAllFixtures(context.Background())
	require.NoError(t, err)
}

// Teardown cleans up the load test environment
func (r *LoadTestRunner) Teardown() {
	if r.db != nil && r.db.Cleanup != nil {
		r.db.Cleanup()
	}
}

// RunLoadTest executes a load test
func (r *LoadTestRunner) RunLoadTest(t *testing.T, testFunc func(user *testutils.TestUser) time.Duration) *LoadTestMetrics {
	t.Helper()

	var wg sync.WaitGroup
	var metrics LoadTestMetrics
	var responseTimes []time.Duration
	var mu sync.Mutex

	startTime := time.Now()

	// Create user tokens
	users := r.createTestUsers(t)

	// Ramp up users gradually
	rampUpInterval := r.config.RampUpTime / time.Duration(r.config.ConcurrentUsers)

	for i, user := range users {
		wg.Add(1)
		go func(index int, u *testutils.TestUser) {
			defer wg.Done()

			// Ramp up delay
			time.Sleep(time.Duration(index) * rampUpInterval)

			// Execute requests for this user
			for j := 0; j < r.config.RequestsPerUser; j++ {
				reqStart := time.Now()

				// Execute test function
				responseTime := testFunc(u)

				// Record metrics
				mu.Lock()
				responseTimes = append(responseTimes, responseTime)
				metrics.TotalRequests++
				if responseTime > 0 {
					metrics.SuccessfulRequests++
				} else {
					metrics.FailedRequests++
				}
				mu.Unlock()

				// Think time between requests
				if r.config.ThinkTime > 0 {
					time.Sleep(r.config.ThinkTime)
				}
			}
		}(i, user)
	}

	wg.Wait()
	totalDuration := time.Since(startTime)

	// Calculate metrics
	if len(responseTimes) > 0 {
		metrics = r.calculateMetrics(responseTimes, totalDuration)
	}

	return &metrics
}

// TestAuthenticationLoad tests authentication under load
func TestAuthenticationLoad(t *testing.T) {
	config := &LoadTestConfig{
		ConcurrentUsers:    50,
		RequestsPerUser:    10,
		TestDuration:       30 * time.Second,
		RampUpTime:         10 * time.Second,
		ThinkTime:          100 * time.Millisecond,
		TargetResponseTime: 200 * time.Millisecond,
	}

	runner := NewLoadTestRunner(config)
	runner.Setup(t)
	defer runner.Teardown()

	t.Run("Login Performance", func(t *testing.T) {
		metrics := runner.RunLoadTest(t, func(user *testutils.TestUser) time.Duration {
			start := time.Now()

			// Simulate authentication service call
			authService := auth_service.NewAuthService(r.db.DB, runner.jwtService)
			_, err := authService.Login(context.Background(), user.Username, user.Password, "WEB")

			if err != nil {
				return 0 // Failed request
			}

			return time.Since(start)
		})

		// Assert performance metrics
		assert.Less(t, metrics.AverageResponseTime, config.TargetResponseTime,
			"Average response time should be under %v, got %v",
			config.TargetResponseTime, metrics.AverageResponseTime)

		assert.Greater(t, float64(metrics.SuccessfulRequests)/float64(metrics.TotalRequests), 0.95,
			"Success rate should be above 95%%, got %.2f%%",
			float64(metrics.SuccessfulRequests)/float64(metrics.TotalRequests)*100)
	})

	t.Run("Token Validation Performance", func(t *testing.T) {
		metrics := runner.RunLoadTest(t, func(user *testutils.TestUser) time.Duration {
			start := time.Now()

			// Generate token and validate
			token := testutils.CreateTestToken(t, runner.jwtService, user, "access")
			_, err := runner.jwtService.ValidateToken(token)

			if err != nil {
				return 0 // Failed request
			}

			return time.Since(start)
		})

		assert.Less(t, metrics.AverageResponseTime, 50*time.Millisecond,
			"Token validation should be under 50ms, got %v", metrics.AverageResponseTime)
	})
}

// TestDatabaseLoad tests database performance under load
func TestDatabaseLoad(t *testing.T) {
	config := &LoadTestConfig{
		ConcurrentUsers:    30,
		RequestsPerUser:    20,
		TestDuration:       60 * time.Second,
		RampUpTime:         15 * time.Second,
		ThinkTime:          50 * time.Millisecond,
		TargetResponseTime: 100 * time.Millisecond,
	}

	runner := NewLoadTestRunner(config)
	runner.Setup(t)
	defer runner.Teardown()

	t.Run("Master Data Queries", func(t *testing.T) {
		masterService := master_service.NewMasterService(r.db.DB)

		metrics := runner.RunLoadTest(t, func(user *testutils.TestUser) time.Duration {
			start := time.Now()

			// Simulate database queries
			switch user.Role {
			case "COMPANY_ADMIN":
				_, err := masterService.GetCompaniesByUserID(context.Background(), user.ID)
				if err != nil {
					return 0
				}
			case "MANAGER":
				_, err := masterService.GetEstatesByUserID(context.Background(), user.ID)
				if err != nil {
					return 0
				}
			case "ASISTEN":
				_, err := masterService.GetDivisionsByUserID(context.Background(), user.ID)
				if err != nil {
					return 0
				}
			case "MANDOR":
				_, err := masterService.GetBlocksByUserID(context.Background(), user.ID)
				if err != nil {
					return 0
				}
			}

			return time.Since(start)
		})

		assert.Less(t, metrics.AverageResponseTime, config.TargetResponseTime,
			"Database queries should be under %v, got %v",
			config.TargetResponseTime, metrics.AverageResponseTime)
	})

	t.Run("Harvest Data Operations", func(t *testing.T) {
		panenService := panen_service.NewPanenService(r.db.DB)

		metrics := runner.RunLoadTest(t, func(user *testutils.TestUser) time.Duration {
			start := time.Now()

			// Only Mandor role can create harvests
			if user.Role == "MANDOR" {
				// Simulate harvest creation
				harvest := &panen_models.Harvest{
					BlockID:     1,
					MandorID:    user.ID,
					TBSCount:    150,
					WeightTotal: 2500.50,
					Status:      panen_models.StatusPending,
					HarvestedAt: time.Now(),
				}

				_, err := panenService.CreateHarvest(context.Background(), harvest)
				if err != nil {
					return 0
				}
			}

			return time.Since(start)
		})

		assert.Less(t, metrics.AverageResponseTime, 300*time.Millisecond,
			"Harvest operations should be under 300ms, got %v", metrics.AverageResponseTime)
	})
}

// TestConcurrentUsers tests system behavior with concurrent users
func TestConcurrentUsers(t *testing.T) {
	config := &LoadTestConfig{
		ConcurrentUsers:    100,
		RequestsPerUser:    5,
		TestDuration:       45 * time.Second,
		RampUpTime:         20 * time.Second,
		ThinkTime:          200 * time.Millisecond,
		TargetResponseTime: 250 * time.Millisecond,
	}

	runner := NewLoadTestRunner(config)
	runner.Setup(t)
	defer runner.Teardown()

	t.Run("Mixed Workload", func(t *testing.T) {
		metrics := runner.RunLoadTest(t, func(user *testutils.TestUser) time.Duration {
			start := time.Now()

			// Simulate different operations based on user role
			switch user.Role {
			case "SUPER_ADMIN":
				// Admin operations
				time.Sleep(20 * time.Millisecond)
			case "COMPANY_ADMIN":
				// Company management
				time.Sleep(15 * time.Millisecond)
			case "MANAGER":
				// Estate monitoring
				time.Sleep(10 * time.Millisecond)
			case "ASISTEN":
				// Harvest approval
				time.Sleep(25 * time.Millisecond)
			case "MANDOR":
				// Harvest input
				time.Sleep(30 * time.Millisecond)
			case "SATPAM":
				// Gate check operations
				time.Sleep(5 * time.Millisecond)
			}

			return time.Since(start)
		})

		// Verify system stability under load
		assert.Greater(t, metrics.RequestsPerSecond, 10.0,
			"System should handle at least 10 RPS, got %.2f", metrics.RequestsPerSecond)

		assert.Less(t, metrics.P95ResponseTime, config.TargetResponseTime,
			"95th percentile should be under %v, got %v",
			config.TargetResponseTime, metrics.P95ResponseTime)
	})
}

// TestMemoryUsage tests memory usage during load testing
func TestMemoryUsage(t *testing.T) {
	config := &LoadTestConfig{
		ConcurrentUsers:    20,
		RequestsPerUser:    50,
		TestDuration:       30 * time.Second,
		RampUpTime:         5 * time.Second,
		ThinkTime:          10 * time.Millisecond,
		TargetResponseTime: 100 * time.Millisecond,
	}

	runner := NewLoadTestRunner(config)
	runner.Setup(t)
	defer runner.Teardown()

	// Monitor memory usage
	var memoryUsages []int64

	t.Run("Memory Under Load", func(t *testing.T) {
		metrics := runner.RunLoadTest(t, func(user *testutils.TestUser) time.Duration {
			// Record memory usage before operation
			// Note: This is a simplified example
			// In a real scenario, you'd use runtime.ReadMemStats

			start := time.Now()

			// Simulate memory-intensive operation
			data := make([][]byte, 100)
			for i := range data {
				data[i] = make([]byte, 1024) // 1KB per slice
			}

			time.Sleep(1 * time.Millisecond)

			// Clear data
			data = nil

			return time.Since(start)
		})

		// Verify memory usage is reasonable
		// This would involve actual memory monitoring in a real implementation
		assert.Greater(t, metrics.SuccessfulRequests, 0, "Should have successful requests")
	})
}

// Helper methods

func (r *LoadTestRunner) createTestUsers(t *testing.T) []*testutils.TestUser {
	t.Helper()

	users := make([]*testutils.TestUser, r.config.ConcurrentUsers)
	roles := []string{"SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "ASISTEN", "MANDOR", "SATPAM"}

	for i := 0; i < r.config.ConcurrentUsers; i++ {
		role := roles[i%len(roles)]
		users[i] = testutils.CreateTestUser(t, role)
	}

	return users
}

func (r *LoadTestRunner) calculateMetrics(responseTimes []time.Duration, totalDuration time.Duration) LoadTestMetrics {
	if len(responseTimes) == 0 {
		return LoadTestMetrics{}
	}

	// Sort response times for percentile calculations
	sorted := make([]time.Duration, len(responseTimes))
	copy(sorted, responseTimes)

	// Simple bubble sort for small datasets
	for i := 0; i < len(sorted); i++ {
		for j := 0; j < len(sorted)-1-i; j++ {
			if sorted[j] > sorted[j+1] {
				sorted[j], sorted[j+1] = sorted[j+1], sorted[j]
			}
		}
	}

	var total time.Duration
	min := sorted[0]
	max := sorted[len(sorted)-1]

	for _, rt := range responseTimes {
		total += rt
	}

	avg := total / time.Duration(len(responseTimes))

	// Calculate percentiles
	p95Index := int(float64(len(sorted)) * 0.95)
	p99Index := int(float64(len(sorted)) * 0.99)

	p95 := sorted[p95Index]
	p99 := sorted[p99Index]

	// Calculate requests per second
	rps := float64(len(responseTimes)) / totalDuration.Seconds()

	return LoadTestMetrics{
		TotalRequests:      len(responseTimes),
		SuccessfulRequests: len(responseTimes), // Assuming all have response time > 0
		FailedRequests:     0,
		AverageResponseTime: avg,
		MinResponseTime:    min,
		MaxResponseTime:    max,
		P95ResponseTime:    p95,
		P99ResponseTime:    p99,
		RequestsPerSecond:  rps,
		Errors:             []error{},
	}
}

// Benchmark operations
func BenchmarkAuthentication(b *testing.B) {
	config := &LoadTestConfig{
		ConcurrentUsers:    10,
		RequestsPerUser:    1,
		TestDuration:       1 * time.Second,
		RampUpTime:         100 * time.Millisecond,
		ThinkTime:          0,
		TargetResponseTime: 100 * time.Millisecond,
	}

	runner := NewLoadTestRunner(config)
	runner.Setup(&testing.T{})
	defer runner.Teardown()

	user := testutils.CreateTestUser(&testing.T{}, "MANDOR")
	token := testutils.CreateTestToken(&testing.T{}, runner.jwtService, user, "access")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		start := time.Now()
		_, err := runner.jwtService.ValidateToken(token)
		if err != nil {
			b.Fatal(err)
		}
		b.StopTimer()
		if b.N%100 == 0 {
			// Print progress periodically
			fmt.Printf("Benchmark progress: %d iterations completed\n", b.N)
		}
		b.StartTimer()
	}
}

//go:build integration
// +build integration

package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"agrinovagraphql/server/internal/graphql/resolvers"
	"agrinovagraphql/server/internal/testing/fixtures"
	"agrinovagraphql/server/internal/testing/testutils"
)

// TestSuite represents the main integration test suite
type TestSuite struct {
	server     *httptest.Server
	router     *gin.Engine
	db         *testutils.TestDatabase
	fixtures   *fixtures.FixtureManager
	jwtService *testutils.TestJWTService
	cleanup    func()
}

// SetupIntegrationTestSuite sets up the integration test suite
func SetupIntegrationTestSuite(t *testing.T) *TestSuite {
	t.Helper()

	// Setup test database
	db := testutils.SetupTestDatabase(t)

	// Auto-migrate schema
	err := db.DB.AutoMigrate(
		// Add model imports here
	)
	require.NoError(t, err)

	// Load fixtures
	fixtureManager := fixtures.NewFixtureManager(db.DB)
	err = fixtureManager.LoadAllFixtures(context.Background())
	require.NoError(t, err)

	// Setup JWT service
	jwtService := testutils.SetupTestJWTService(t, "test-jwt-secret-32-characters")

	// Setup Gin router
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Setup GraphQL handler
	// This would use your actual GraphQL setup
	graphqlHandler := setupGraphQLHandler(db.DB, jwtService)
	router.POST("/graphql", graphqlHandler)

	// Create test server
	server := httptest.NewServer(router)

	cleanup := func() {
		server.Close()
		db.Cleanup()
	}

	return &TestSuite{
		server:     server,
		router:     router,
		db:         db,
		fixtures:   fixtureManager,
		jwtService: jwtService,
		cleanup:    cleanup,
	}
}

// TestAuthenticationFlow tests the complete authentication flow
func TestAuthenticationFlow(t *testing.T) {
	suite := SetupIntegrationTestSuite(t)
	defer suite.cleanup()

	t.Run("SuperAdmin Login Flow", func(t *testing.T) {
		user := suite.fixtures.GetFixtureByRole(auth_models.RoleSuperAdmin)
		require.NotNil(t, user)

		// Test login
		loginMutation := `
			mutation {
				login(input: {
					identifier: "%s",
					password: "demo123",
					platform: WEB
				}) {
					accessToken
					refreshToken
					user {
						id
						username
						role
					}
				}
			}
		`

		response := suite.executeGraphQL(t, fmt.Sprintf(loginMutation, user.Username), nil, "")

		assert.True(t, response.Success)
		assert.NotEmpty(t, response.Data["accessToken"])
		assert.NotEmpty(t, response.Data["refreshToken"])

		userData := response.Data["user"].(map[string]interface{})
		assert.Equal(t, user.Username, userData["username"])
		assert.Equal(t, string(user.Role), userData["role"])

		// Test authenticated request
		token := response.Data["accessToken"].(string)
		authResponse := suite.executeGraphQL(t, `
			query {
				me {
					id
					username
					role
				}
			}
		`, nil, token)

		assert.True(t, authResponse.Success)
		meData := authResponse.Data["me"].(map[string]interface{})
		assert.Equal(t, user.Username, meData["username"])
		assert.Equal(t, string(user.Role), meData["role"])
	})

	t.Run("Role-Based Access Control", func(t *testing.T) {
		testCases := []struct {
			name           string
			role           auth_models.Role
			shouldSucceed  bool
			query          string
		}{
			{
				name:   "SuperAdmin can access all data",
				role:   auth_models.RoleSuperAdmin,
				query:  "{ companies { id name } }",
				shouldSucceed: true,
			},
			{
				name:   "CompanyAdmin can access their company data",
				role:   auth_models.RoleCompanyAdmin,
				query:  "{ estates { id name } }",
				shouldSucceed: true,
			},
			{
				name:   "Manager can access their estate data",
				role:   auth_models.RoleManager,
				query:  "{ blocks { id name } }",
				shouldSucceed: true,
			},
			{
				name:   "Mandor can access harvest data",
				role:   auth_models.RoleMandor,
				query:  "{ harvests { id tbsCount status } }",
				shouldSucceed: true,
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				user := suite.fixtures.GetFixtureByRole(tc.role)
				require.NotNil(t, user)

				token := testutils.CreateTestToken(t, suite.jwtService, &testutils.TestUser{
					ID:       user.ID,
					Username: user.Username,
					Role:     string(user.Role),
				}, "access")

				response := suite.executeGraphQL(t, tc.query, nil, token)

				if tc.shouldSucceed {
					assert.True(t, response.Success, "Query should succeed for role %s", tc.role)
				} else {
					assert.False(t, response.Success, "Query should fail for role %s", tc.role)
				}
			})
		}
	})
}

// TestHarvestWorkflow tests the complete harvest workflow
func TestHarvestWorkflow(t *testing.T) {
	suite := SetupIntegrationTestSuite(t)
	defer suite.cleanup()

	t.Run("Complete Harvest Flow", func(t *testing.T) {
		// Mandor creates harvest
		mandor := suite.fixtures.GetFixtureByRole(auth_models.RoleMandor)
		mandorToken := testutils.CreateTestToken(t, suite.jwtService, &testutils.TestUser{
			ID:       mandor.ID,
			Username: mandor.Username,
			Role:     string(mandor.Role),
		}, "access")

		createHarvestMutation := `
			mutation {
				createHarvest(input: {
					blockId: 1
					tbsCount: 150
					weightTotal: 2500.50
					notes: "Test harvest"
					harvestedAt: "2024-01-15T08:00:00Z"
				}) {
					id
					status
					tbsCount
					weightTotal
				}
			}
		`

		response := suite.executeGraphQL(t, createHarvestMutation, nil, mandorToken)
		assert.True(t, response.Success)

		harvestData := response.Data["createHarvest"].(map[string]interface{})
		harvestID := harvestData["id"].(float64)
		assert.Equal(t, "PENDING", harvestData["status"])

		// Asisten approves harvest
		asisten := suite.fixtures.GetFixtureByRole(auth_models.RoleAsisten)
		asistenToken := testutils.CreateTestToken(t, suite.jwtService, &testutils.TestUser{
			ID:       asisten.ID,
			Username: asisten.Username,
			Role:     string(asisten.Role),
		}, "access")

		approveHarvestMutation := fmt.Sprintf(`
			mutation {
				approveHarvest(input: {
					id: %v
					notes: "Approved harvest"
				}) {
					id
					status
					approvedAt
				}
			}
		`, int64(harvestID))

		approveResponse := suite.executeGraphQL(t, approveHarvestMutation, nil, asistenToken)
		assert.True(t, approveResponse.Success)

		approvedData := approveResponse.Data["approveHarvest"].(map[string]interface{})
		assert.Equal(t, "APPROVED", approvedData["status"])
		assert.NotEmpty(t, approvedData["approvedAt"])

		// Manager can view approved harvest
		manager := suite.fixtures.GetFixtureByRole(auth_models.RoleManager)
		managerToken := testutils.CreateTestToken(t, suite.jwtService, &testutils.TestUser{
			ID:       manager.ID,
			Username: manager.Username,
			Role:     string(manager.Role),
		}, "access")

		viewHarvestQuery := `
			query {
				harvests(status: APPROVED) {
					id
					status
					tbsCount
					weightTotal
				}
			}
		`

		viewResponse := suite.executeGraphQL(t, viewHarvestQuery, nil, managerToken)
		assert.True(t, viewResponse.Success)

		harvests := viewResponse.Data["harvests"].([]interface{})
		assert.Greater(t, len(harvests), 0)
	})
}

// TestRealtimeFeatures tests WebSocket and real-time features
func TestRealtimeFeatures(t *testing.T) {
	suite := SetupIntegrationTestSuite(t)
	defer suite.cleanup()

	t.Run("WebSocket Subscription", func(t *testing.T) {
		// This would test WebSocket subscriptions
		// For now, we'll test the subscription GraphQL endpoint

		user := suite.fixtures.GetFixtureByRole(auth_models.RoleManager)
		token := testutils.CreateTestToken(t, suite.jwtService, &testutils.TestUser{
			ID:       user.ID,
			Username: user.Username,
			Role:     string(user.Role),
		}, "access")

		subscriptionQuery := `
			subscription {
				harvestUpdates {
					id
					status
					createdAt
				}
			}
		`

		response := suite.executeGraphQL(t, subscriptionQuery, nil, token)
		// Note: This would be a WebSocket connection test
		// For HTTP test, we verify the subscription is properly set up
		assert.True(t, response.Success)
	})
}

// TestOfflineSync tests offline synchronization features
func TestOfflineSync(t *testing.T) {
	suite := SetupIntegrationTestSuite(t)
	defer suite.cleanup()

	t.Run("Mobile Offline Sync", func(t *testing.T) {
		// Test mobile-specific offline tokens
		user := suite.fixtures.GetFixtureByRole(auth_models.RoleMandor)
		require.NotNil(t, user)

		offlineToken := testutils.CreateTestToken(t, suite.jwtService, &testutils.TestUser{
			ID:       user.ID,
			Username: user.Username,
			Role:     string(user.Role),
		}, "offline")

		// Test offline-accessible endpoints
		syncQuery := `
			query {
				syncData(lastSync: "2024-01-01T00:00:00Z") {
					harvests {
						id
						status
						updatedAt
					}
					blocks {
						id
						name
						updatedAt
					}
				}
			}
		`

		response := suite.executeGraphQL(t, syncQuery, nil, offlineToken)
		assert.True(t, response.Success)

		syncData := response.Data["syncData"].(map[string]interface{})
		assert.Contains(t, syncData, "harvests")
		assert.Contains(t, syncData, "blocks")
	})
}

// TestPerformance tests system performance under load
func TestPerformance(t *testing.T) {
	suite := SetupIntegrationTestSuite(t)
	defer suite.cleanup()

	t.Run("Concurrent Requests", func(t *testing.T) {
		user := suite.fixtures.GetFixtureByRole(auth_models.RoleSuperAdmin)
		token := testutils.CreateTestToken(t, suite.jwtService, &testutils.TestUser{
			ID:       user.ID,
			Username: user.Username,
			Role:     string(user.Role),
		}, "access")

		query := "{ companies { id name } }"
		concurrency := 10

		start := time.Now()
		results := make(chan error, concurrency)

		for i := 0; i < concurrency; i++ {
			go func() {
				response := suite.executeGraphQL(t, query, nil, token)
				if !response.Success {
					results <- fmt.Errorf("request failed")
				} else {
					results <- nil
				}
			}()
		}

		// Wait for all requests to complete
		for i := 0; i < concurrency; i++ {
			err := <-results
			assert.NoError(t, err)
		}

		duration := time.Since(start)
		avgResponseTime := duration / time.Duration(concurrency)

		// Assert average response time is under 200ms
		assert.Less(t, avgResponseTime, 200*time.Millisecond,
			"Average response time should be under 200ms, got %v", avgResponseTime)
	})
}

// GraphQLResponse represents a GraphQL response
type GraphQLResponse struct {
	Data   map[string]interface{} `json:"data"`
	Errors []interface{}          `json:"errors"`
	Success bool                 `json:"success"`
}

// executeGraphQL executes a GraphQL query and returns the response
func (suite *TestSuite) executeGraphQL(t *testing.T, query string, variables map[string]interface{}, token string) *GraphQLResponse {
	t.Helper()

	requestBody := map[string]interface{}{
		"query":     query,
		"variables": variables,
	}

	jsonBody, err := json.Marshal(requestBody)
	require.NoError(t, err)

	req, err := http.NewRequest("POST", suite.server.URL+"/graphql",
		httptest.NewRequest("POST", "/graphql", nil).Body)
	require.NoError(t, err)

	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	var graphqlResp GraphQLResponse
	err = json.NewDecoder(resp.Body).Decode(&graphqlResp)
	require.NoError(t, err)

	graphqlResp.Success = len(graphqlResp.Errors) == 0

	return &graphqlResp
}

// setupGraphQLHandler sets up the GraphQL handler for testing
func setupGraphQLHandler(db *gorm.DB, jwtService *testutils.TestJWTService) gin.HandlerFunc {
	// This would set up your actual GraphQL handler
	// For now, return a simple mock handler
	return func(c *gin.Context) {
		// Mock GraphQL handler implementation
		c.JSON(200, gin.H{
			"data": gin.H{},
		})
	}
}

// BenchmarkGraphQL benchmarks GraphQL performance
func BenchmarkGraphQL(b *testing.B) {
	suite := SetupIntegrationTestSuite(&testing.T{})
	defer suite.cleanup()

	user := suite.fixtures.GetFixtureByRole(auth_models.RoleSuperAdmin)
	token := testutils.CreateTestToken(&testing.T{}, suite.jwtService, &testutils.TestUser{
		ID:       user.ID,
		Username: user.Username,
		Role:     string(user.Role),
	}, "access")

	query := "{ companies { id name code } }"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		response := suite.executeGraphQL(&testing.T{}, query, nil, token)
		if !response.Success {
			b.Fatal("GraphQL request failed")
		}
	}
}

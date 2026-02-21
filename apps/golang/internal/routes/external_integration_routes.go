package routes

import (
	"agrinovagraphql/server/internal/auth/constants"
	"agrinovagraphql/server/internal/auth/middleware"
	"agrinovagraphql/server/internal/graphql/domain/bkm"
	syncServices "agrinovagraphql/server/internal/sync/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

// SetupExternalIntegrationRoutes sets up routes for external integrations (HRIS, Finance, Smart Mill Scale, BKM Sync)
// These routes require API key authentication with specific scopes
func SetupExternalIntegrationRoutes(r *gin.RouterGroup, apiKeyMiddleware *middleware.APIKeyMiddleware, bkmSyncService *syncServices.BkmSyncService) {
	// All routes under /api/external require API key authentication
	external := r.Group("/external")
	external.Use(apiKeyMiddleware.Authenticate())
	external.Use(apiKeyMiddleware.ValidateScopesMiddleware())

	// HRIS Integration Routes
	hris := external.Group("/hris")
	{
		// GET /api/external/hris/employees - Read employees
		// Requires: employees:read
		hris.GET("/employees",
			apiKeyMiddleware.RequireScopes(constants.ScopeEmployeesRead),
			listEmployees,
		)

		// POST /api/external/hris/employees - Create employee
		// Requires: employees:create
		hris.POST("/employees",
			apiKeyMiddleware.RequireScopes(constants.ScopeEmployeesCreate),
			createEmployee,
		)

		// PUT /api/external/hris/employees/:id - Update employee
		// Requires: employees:update
		hris.PUT("/employees/:id",
			apiKeyMiddleware.RequireScopes(constants.ScopeEmployeesUpdate),
			updateEmployee,
		)

		// POST /api/external/hris/sync - Trigger full sync
		// Requires: employees:sync
		hris.POST("/sync",
			apiKeyMiddleware.RequireScopes(constants.ScopeEmployeesSync),
			syncEmployees,
		)
	}

	// Smart Mill Scale Integration Routes
	weighing := external.Group("/weighing")
	{
		// GET /api/external/weighing/records - Read weighing records
		// Requires: weighing:read
		weighing.GET("/records",
			apiKeyMiddleware.RequireScopes(constants.ScopeWeighingRead),
			listWeighingRecords,
		)

		// POST /api/external/weighing/records - Create weighing record
		// Requires: weighing:create
		weighing.POST("/records",
			apiKeyMiddleware.RequireScopes(constants.ScopeWeighingCreate),
			createWeighingRecord,
		)

		// PUT /api/external/weighing/records/:id - Update weighing record
		// Requires: weighing:update
		weighing.PUT("/records/:id",
			apiKeyMiddleware.RequireScopes(constants.ScopeWeighingUpdate),
			updateWeighingRecord,
		)

		// POST /api/external/weighing/sync - Trigger sync
		// Requires: weighing:sync
		weighing.POST("/sync",
			apiKeyMiddleware.RequireScopes(constants.ScopeWeighingSync),
			syncWeighingData,
		)
	}

	// Finance Integration Routes
	finance := external.Group("/finance")
	{
		// GET /api/external/finance/transactions - Read finance transactions
		// Requires: finance:read
		finance.GET("/transactions",
			apiKeyMiddleware.RequireScopes(constants.ScopeFinanceRead),
			listFinanceTransactions,
		)

		// POST /api/external/finance/transactions - Create finance transaction
		// Requires: finance:create
		finance.POST("/transactions",
			apiKeyMiddleware.RequireScopes(constants.ScopeFinanceCreate),
			createFinanceTransaction,
		)

		// PUT /api/external/finance/transactions/:id - Update finance transaction
		// Requires: finance:update
		finance.PUT("/transactions/:id",
			apiKeyMiddleware.RequireScopes(constants.ScopeFinanceUpdate),
			updateFinanceTransaction,
		)

		// POST /api/external/finance/sync - Trigger finance sync
		// Requires: finance:sync
		finance.POST("/sync",
			apiKeyMiddleware.RequireScopes(constants.ScopeFinanceSync),
			syncFinanceData,
		)
	}

	// BKM Sync Routes (Oracle → PostgreSQL)
	// Uses Finance Integration scopes (finance:sync)
	bkmGroup := external.Group("/bkm")
	{
		// POST /api/external/bkm/masters - Upsert BKM master records
		// Requires: finance:sync
		bkmGroup.POST("/masters",
			apiKeyMiddleware.RequireScopes(constants.ScopeFinanceSync),
			handleUpsertBkmMasters(bkmSyncService),
		)

		// POST /api/external/bkm/details - Upsert BKM detail records
		// Requires: finance:sync
		bkmGroup.POST("/details",
			apiKeyMiddleware.RequireScopes(constants.ScopeFinanceSync),
			handleUpsertBkmDetails(bkmSyncService),
		)
	}

	// Sync Monitoring Routes (shared by both integrations)
	sync := external.Group("/sync")
	{
		// GET /api/external/sync/status - Check sync status
		// Requires: sync:status
		sync.GET("/status",
			apiKeyMiddleware.RequireScopes(constants.ScopeSyncStatus),
			getSyncStatus,
		)

		// GET /api/external/sync/logs - Get sync logs
		// Requires: sync:logs
		sync.GET("/logs",
			apiKeyMiddleware.RequireScopes(constants.ScopeSyncLogs),
			getSyncLogs,
		)

		// POST /api/external/sync/retry - Retry failed sync
		// Requires: sync:retry
		sync.POST("/retry",
			apiKeyMiddleware.RequireScopes(constants.ScopeSyncRetry),
			retrySyncOperation,
		)
	}
}

// ============================================================================
// BKM Sync Handlers
// ============================================================================

func handleUpsertBkmMasters(svc *syncServices.BkmSyncService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var inputs []*bkm.BkmMasterUpsertInput
		if err := c.ShouldBindJSON(&inputs); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "invalid_request",
				"message": "Invalid JSON body: " + err.Error(),
			})
			return
		}

		if len(inputs) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "empty_input",
				"message": "At least one master record is required",
			})
			return
		}

		result, err := svc.UpsertMasters(c.Request.Context(), inputs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "upsert_failed",
				"message": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success":  true,
			"received": result.Received,
			"upserted": result.Upserted,
		})
	}
}

func handleUpsertBkmDetails(svc *syncServices.BkmSyncService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var inputs []*bkm.BkmDetailUpsertInput
		if err := c.ShouldBindJSON(&inputs); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "invalid_request",
				"message": "Invalid JSON body: " + err.Error(),
			})
			return
		}

		if len(inputs) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "empty_input",
				"message": "At least one detail record is required",
			})
			return
		}

		result, err := svc.UpsertDetails(c.Request.Context(), inputs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "upsert_failed",
				"message": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success":  true,
			"received": result.Received,
			"upserted": result.Upserted,
		})
	}
}

// ============================================================================
// Placeholder handlers (existing integrations)
// ============================================================================

func listEmployees(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "List employees endpoint",
		"data":    []interface{}{},
	})
}

func createEmployee(c *gin.Context) {
	c.JSON(http.StatusCreated, gin.H{
		"message": "Employee created successfully",
	})
}

func updateEmployee(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{
		"message": "Employee updated successfully",
		"id":      id,
	})
}

func syncEmployees(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "Employee sync triggered",
		"status":  "in_progress",
	})
}

func listWeighingRecords(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "List weighing records endpoint",
		"data":    []interface{}{},
	})
}

func createWeighingRecord(c *gin.Context) {
	c.JSON(http.StatusCreated, gin.H{
		"message": "Weighing record created successfully",
	})
}

func updateWeighingRecord(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{
		"message": "Weighing record updated successfully",
		"id":      id,
	})
}

func syncWeighingData(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "Weighing data sync triggered",
		"status":  "in_progress",
	})
}

func listFinanceTransactions(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "List finance transactions endpoint",
		"data":    []interface{}{},
	})
}

func createFinanceTransaction(c *gin.Context) {
	c.JSON(http.StatusCreated, gin.H{
		"message": "Finance transaction created successfully",
	})
}

func updateFinanceTransaction(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{
		"message": "Finance transaction updated successfully",
		"id":      id,
	})
}

func syncFinanceData(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "Finance data sync triggered",
		"status":  "in_progress",
	})
}

func getSyncStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message":  "Sync status",
		"status":   "idle",
		"lastSync": nil,
	})
}

func getSyncLogs(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "Sync logs",
		"logs":    []interface{}{},
	})
}

func retrySyncOperation(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "Retry sync operation triggered",
	})
}

package constants

// API Key Scopes for External Integrations
// These scopes are used to control access for external systems integrating with Agrinova

const (
	// HRIS Integration Scopes
	// Used by Human Resource Information System to sync employee data
	ScopeEmployeesRead   = "employees:read"   // Read employee data for verification/reconciliation
	ScopeEmployeesCreate = "employees:create" // Create new employees from HRIS
	ScopeEmployeesUpdate = "employees:update" // Update existing employee data
	ScopeEmployeesSync   = "employees:sync"   // Trigger full employee synchronization

	// Smart Mill Scale Integration Scopes
	// Used by PKS (Pabrik Kelapa Sawit) weighing systems to sync weighing data
	ScopeWeighingRead   = "weighing:read"   // Read weighing data for verification
	ScopeWeighingCreate = "weighing:create" // Create new weighing records
	ScopeWeighingUpdate = "weighing:update" // Update weighing data (corrections)
	ScopeWeighingSync   = "weighing:sync"   // Trigger weighing data synchronization

	// Finance Integration Scopes
	// Used by finance systems to sync transaction data
	ScopeFinanceRead   = "finance:read"   // Read finance transaction data
	ScopeFinanceCreate = "finance:create" // Create finance transactions
	ScopeFinanceUpdate = "finance:update" // Update finance transactions
	ScopeFinanceSync   = "finance:sync"   // Trigger finance data synchronization

	// BKM Sync Scopes
	// Used by Oracle sync client (C#) to push BKM data to PostgreSQL
	ScopeBkmRead = "bkm:read" // Read BKM data
	ScopeBkmSync = "bkm:sync" // Sync (upsert) BKM master and detail records

	// Sync Monitoring Scopes (optional, for troubleshooting)
	// Used by both integrations to monitor sync status and access logs
	ScopeSyncStatus = "sync:status" // Check synchronization status
	ScopeSyncLogs   = "sync:logs"   // Access synchronization logs
	ScopeSyncRetry  = "sync:retry"  // Retry failed sync operations
)

// IntegrationType represents the type of external integration
type IntegrationType string

const (
	IntegrationTypeHRIS           IntegrationType = "HRIS"
	IntegrationTypeFinance        IntegrationType = "FINANCE"
	IntegrationTypeSmartMillScale IntegrationType = "SMART_MILL_SCALE"
	IntegrationTypeBkmSync        IntegrationType = "BKM_SYNC"
)

// GetScopesForIntegration returns recommended scopes for a specific integration type
func GetScopesForIntegration(integrationType IntegrationType) []string {
	switch integrationType {
	case IntegrationTypeHRIS:
		return []string{
			ScopeEmployeesRead,
			ScopeEmployeesCreate,
			ScopeEmployeesUpdate,
			ScopeEmployeesSync,
			ScopeSyncStatus,
			ScopeSyncLogs,
		}
	case IntegrationTypeSmartMillScale:
		return []string{
			ScopeWeighingRead,
			ScopeWeighingCreate,
			ScopeWeighingUpdate,
			ScopeWeighingSync,
			ScopeSyncStatus,
			ScopeSyncLogs,
		}
	case IntegrationTypeFinance:
		return []string{
			ScopeFinanceRead,
			ScopeFinanceCreate,
			ScopeFinanceUpdate,
			ScopeFinanceSync,
			ScopeSyncStatus,
			ScopeSyncLogs,
		}
	case IntegrationTypeBkmSync:
		return []string{
			ScopeBkmRead,
			ScopeBkmSync,
			ScopeSyncStatus,
			ScopeSyncLogs,
		}
	default:
		return []string{}
	}
}

// GetRequiredScopesForIntegration returns only the required (non-optional) scopes
func GetRequiredScopesForIntegration(integrationType IntegrationType) []string {
	switch integrationType {
	case IntegrationTypeHRIS:
		return []string{
			ScopeEmployeesRead,
			ScopeEmployeesCreate,
			ScopeEmployeesUpdate,
			ScopeEmployeesSync,
		}
	case IntegrationTypeSmartMillScale:
		return []string{
			ScopeWeighingRead,
			ScopeWeighingCreate,
			ScopeWeighingUpdate,
			ScopeWeighingSync,
		}
	case IntegrationTypeFinance:
		return []string{
			ScopeFinanceRead,
			ScopeFinanceCreate,
			ScopeFinanceUpdate,
			ScopeFinanceSync,
		}
	case IntegrationTypeBkmSync:
		return []string{
			ScopeBkmRead,
			ScopeBkmSync,
		}
	default:
		return []string{}
	}
}

// ValidScopes contains all valid scopes for validation
var ValidScopes = map[string]bool{
	// HRIS scopes
	ScopeEmployeesRead:   true,
	ScopeEmployeesCreate: true,
	ScopeEmployeesUpdate: true,
	ScopeEmployeesSync:   true,

	// Smart Mill Scale scopes
	ScopeWeighingRead:   true,
	ScopeWeighingCreate: true,
	ScopeWeighingUpdate: true,
	ScopeWeighingSync:   true,

	// Finance scopes
	ScopeFinanceRead:   true,
	ScopeFinanceCreate: true,
	ScopeFinanceUpdate: true,
	ScopeFinanceSync:   true,

	// BKM sync scopes
	ScopeBkmRead: true,
	ScopeBkmSync: true,

	// Sync monitoring scopes
	ScopeSyncStatus: true,
	ScopeSyncLogs:   true,
	ScopeSyncRetry:  true,
}

// IsValidScope checks if a scope is valid
func IsValidScope(scope string) bool {
	return ValidScopes[scope]
}

// ValidateScopes validates a list of scopes
func ValidateScopes(scopes []string) (bool, []string) {
	invalidScopes := []string{}
	for _, scope := range scopes {
		if !IsValidScope(scope) {
			invalidScopes = append(invalidScopes, scope)
		}
	}
	return len(invalidScopes) == 0, invalidScopes
}

// GetScopeDescription returns a human-readable description for a scope
func GetScopeDescription(scope string) string {
	descriptions := map[string]string{
		// HRIS scopes
		ScopeEmployeesRead:   "Read employee data for verification and reconciliation",
		ScopeEmployeesCreate: "Create new employees from HRIS system",
		ScopeEmployeesUpdate: "Update existing employee data",
		ScopeEmployeesSync:   "Trigger full employee synchronization",

		// Smart Mill Scale scopes
		ScopeWeighingRead:   "Read weighing data for verification",
		ScopeWeighingCreate: "Create new weighing records from mill scale",
		ScopeWeighingUpdate: "Update weighing data (for corrections)",
		ScopeWeighingSync:   "Trigger weighing data synchronization",

		// Finance scopes
		ScopeFinanceRead:   "Read finance transaction data",
		ScopeFinanceCreate: "Create finance transactions from finance system",
		ScopeFinanceUpdate: "Update existing finance transactions",
		ScopeFinanceSync:   "Trigger finance data synchronization",

		// BKM sync scopes
		ScopeBkmRead: "Read BKM (Bukti Kerja Mandor) data",
		ScopeBkmSync: "Sync BKM master and detail records from Oracle",

		// Sync monitoring scopes
		ScopeSyncStatus: "Check synchronization status",
		ScopeSyncLogs:   "Access synchronization logs for troubleshooting",
		ScopeSyncRetry:  "Retry failed synchronization operations",
	}
	return descriptions[scope]
}

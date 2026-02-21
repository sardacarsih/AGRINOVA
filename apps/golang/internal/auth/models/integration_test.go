package models

import (
	"testing"
	"time"
)

// TestCrossSystemRoleConversion tests role conversion across system boundaries
func TestCrossSystemRoleConversion(t *testing.T) {
	// Test conversion between different role representations
	testCases := []struct {
		name     string
		role     Role
		expected string
	}{
		{"Admin conversion", RoleAdmin, RoleStringAdmin},
		{"Company Admin conversion", RoleCompanyAdmin, RoleStringCompanyAdmin},
		{"Manager conversion", RoleManager, RoleStringManager},
		{"Mandor conversion", RoleMandor, RoleStringMandor},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Test enum to string
			result := tc.role.ToStandardString()
			if result != tc.expected {
				t.Errorf("ToStandardString() = %v, want %v", result, tc.expected)
			}

			// Test string to enum
			convertedRole, err := StringToRole(result)
			if err != nil {
				t.Errorf("StringToRole() error = %v", err)
			}
			if convertedRole != tc.role {
				t.Errorf("StringToRole() = %v, want %v", convertedRole, tc.role)
			}

			// Test validation
			if !IsValidRoleString(result) {
				t.Errorf("IsValidRoleString() = false, want true for %v", result)
			}
		})
	}
}

// TestSystemBoundaryRoleValidation tests role validation at system boundaries
func TestSystemBoundaryRoleValidation(t *testing.T) {
	// Simulate data coming from external systems
	externalRoleData := []string{
		"SUPER_ADMIN",
		"COMPANY_ADMIN",
		"MANAGER",
		"ASISTEN",
		"MANDOR",
		"SATPAM",
		"INVALID_ROLE", // This should be filtered out
		"admin",        // This should be filtered out (wrong case)
		"",            // This should be filtered out
	}

	validRoles := []Role{}
	invalidInputs := []string{}

	for _, roleStr := range externalRoleData {
		if IsValidRoleString(roleStr) {
			role, err := StringToRole(roleStr)
			if err == nil {
				validRoles = append(validRoles, role)
			} else {
				invalidInputs = append(invalidInputs, roleStr)
			}
		} else {
			invalidInputs = append(invalidInputs, roleStr)
		}
	}

	// Validate results
	if len(validRoles) != 6 {
		t.Errorf("Expected 6 valid roles, got %d", len(validRoles))
	}

	if len(invalidInputs) != 3 {
		t.Errorf("Expected 3 invalid inputs, got %d", len(invalidInputs))
	}

	// Verify all valid roles are properly converted
	expectedValidRoles := []Role{
		RoleAdmin, RoleCompanyAdmin, RoleManager, RoleAsisten, RoleMandor, RoleSatpam,
	}

	for i, expectedRole := range expectedValidRoles {
		if i >= len(validRoles) || validRoles[i] != expectedRole {
			t.Errorf("Expected role %v at position %d, got %v", expectedRole, i, getRole(validRoles, i))
		}
	}
}

// Helper function to safely get role by index
func getRole(roles []Role, index int) Role {
	if index >= 0 && index < len(roles) {
		return roles[index]
	}
	return ""
}

// TestRoleMigrationCompatibility tests compatibility during system migration
func TestRoleMigrationCompatibility(t *testing.T) {
	// Simulate old role data format that might exist in database
	oldFormatRoles := []struct {
		ID       int    `json:"id"`
		Username string `json:"username"`
		RoleStr  string `json:"role"`
	}{
		{1, "admin", "admin"},
		{2, "manager", "MANAGER"},
		{3, "mandor", "MANDOR"},
		{4, "invalid", "INVALID_ROLE"},
		{5, "empty", ""},
	}

	migratedRoles := []struct {
		ID       int    `json:"id"`
		Username string `json:"username"`
		Role     Role   `json:"role"`
		Valid    bool   `json:"valid"`
	}{}

	// Migration process
	for _, oldRole := range oldFormatRoles {
		migratedRole := struct {
			ID       int    `json:"id"`
			Username string `json:"username"`
			Role     Role   `json:"role"`
			Valid    bool   `json:"valid"`
		}{
			ID:       oldRole.ID,
			Username: oldRole.Username,
			Valid:    IsValidRoleString(oldRole.RoleStr),
		}

		if migratedRole.Valid {
			role, err := StringToRole(oldRole.RoleStr)
			if err == nil {
				migratedRole.Role = role
			} else {
				migratedRole.Valid = false
			}
		}

		migratedRoles = append(migratedRoles, migratedRole)
	}

	// Validate migration results
	if len(migratedRoles) != 5 {
		t.Errorf("Expected 5 migrated roles, got %d", len(migratedRoles))
	}

	// Check specific cases
	validMigratedRoles := 0
	for _, migrated := range migratedRoles {
		if migrated.Valid {
			validMigratedRoles++
			if migrated.Role == "" {
				t.Errorf("Valid migration should have non-empty role for user %d", migrated.ID)
			}
		}
	}

	if validMigratedRoles != 2 { // Only MANAGER and MANDOR should be valid
		t.Errorf("Expected 2 valid migrated roles, got %d", validMigratedRoles)
	}
}

// TestPerformanceUnderLoad tests performance with realistic load
func TestPerformanceUnderLoad(t *testing.T) {
	iterations := 10000 // Reduced for test environment
	roles := []Role{RoleAdmin, RoleCompanyAdmin, RoleManager, RoleAsisten, RoleMandor, RoleSatpam}

	t.Run("BulkRoleValidation", func(t *testing.T) {
		start := time.Now()
		for i := 0; i < iterations; i++ {
			for _, role := range roles {
				_ = role.ToStandardString()
				_ = IsValidRoleString(role.ToStandardString())
			}
		}
		duration := time.Since(start)
		t.Logf("BulkRoleValidation completed %d iterations in %v", iterations*len(roles), duration)
	})

	t.Run("BulkRoleConversion", func(t *testing.T) {
		start := time.Now()
		for i := 0; i < iterations; i++ {
			for _, role := range roles {
				str := role.ToStandardString()
				_, _ = StringToRole(str)
			}
		}
		duration := time.Since(start)
		t.Logf("BulkRoleConversion completed %d iterations in %v", iterations*len(roles), duration)
	})
}
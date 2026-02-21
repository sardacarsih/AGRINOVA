package services

import (
	"encoding/json"
	"testing"

	"agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/internal/graphql/domain/auth"
)

// TestRoleConversionIntegration tests end-to-end role conversion between backend systems
func TestRoleConversionIntegration(t *testing.T) {
	service := NewRoleAuthorizationService()

	// Test data: Enum -> String -> Enum conversion
	testCases := []struct {
		name           string
		enumRole       auth.UserRole
		expectedString string
	}{
		{"Super Admin conversion", auth.UserRoleSuperAdmin, models.RoleStringAdmin},
		{"Company Admin conversion", auth.UserRoleCompanyAdmin, models.RoleStringCompanyAdmin},
		{"Area Manager conversion", auth.UserRoleAreaManager, models.RoleStringAreaManager},
		{"Manager conversion", auth.UserRoleManager, models.RoleStringManager},
		{"Asisten conversion", auth.UserRoleAsisten, models.RoleStringAsisten},
		{"Mandor conversion", auth.UserRoleMandor, models.RoleStringMandor},
		{"Satpam conversion", auth.UserRoleSatpam, models.RoleStringSatpam},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Test enum to string conversion
			resultString := service.ConvertEnumToString(tc.enumRole)
			if resultString != tc.expectedString {
				t.Errorf("ConvertEnumToString() = %v, want %v", resultString, tc.expectedString)
			}

			// Test string to enum conversion
			resultEnum, err := service.ConvertStringToEnum(resultString)
			if err != nil {
				t.Errorf("ConvertStringToEnum() error = %v", err)
			}
			if resultEnum != tc.enumRole {
				t.Errorf("ConvertStringToEnum() = %v, want %v", resultEnum, tc.enumRole)
			}

			// Test round-trip conversion
			standardString, err := service.GetStandardizedRoleString(tc.enumRole)
			if err != nil {
				t.Errorf("GetStandardizedRoleString() error = %v", err)
			}
			if standardString != tc.expectedString {
				t.Errorf("GetStandardizedRoleString() = %v, want %v", standardString, tc.expectedString)
			}
		})
	}
}

// TestRoleValidationIntegration tests role validation across different input types
func TestRoleValidationIntegration(t *testing.T) {
	service := NewRoleAuthorizationService()

	// Test validation with different input types
	testCases := []struct {
		name        string
		roleInput   interface{}
		expectError bool
		expectedStr string
	}{
		{"Valid enum role", auth.UserRoleManager, false, models.RoleStringManager},
		{"Valid string role", "SUPER_ADMIN", false, models.RoleStringAdmin},
		{"Valid models.Role", models.RoleAdmin, false, models.RoleStringAdmin},
		{"Invalid string", "INVALID_ROLE", true, ""},
		{"Invalid type", 123, true, ""},
		{"Nil input", nil, true, ""},
		{"Empty string", "", true, ""},
		{"Lowercase role", "manager", true, ""},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := service.GetStandardizedRoleString(tc.roleInput)

			if tc.expectError {
				if err == nil {
					t.Errorf("Expected error for input %v, but got none", tc.roleInput)
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error for input %v: %v", tc.roleInput, err)
				}
				if result != tc.expectedStr {
					t.Errorf("Expected %v, got %v", tc.expectedStr, result)
				}
			}
		})
	}
}

// TestRoleHierarchyIntegration tests role hierarchy consistency
func TestRoleHierarchyIntegration(t *testing.T) {
	service := NewRoleAuthorizationService()

	// Test that role hierarchy is maintained in conversion
	testCases := []struct {
		name             string
		higherRole       auth.UserRole
		lowerRole        auth.UserRole
		shouldHaveAccess bool
	}{
		{"Super Admin to Company Admin", auth.UserRoleSuperAdmin, auth.UserRoleCompanyAdmin, true},
		{"Company Admin to Manager", auth.UserRoleCompanyAdmin, auth.UserRoleManager, true},
		{"Manager to Asisten", auth.UserRoleManager, auth.UserRoleAsisten, true},
		{"Asisten to Mandor", auth.UserRoleAsisten, auth.UserRoleMandor, true},
		{"Mandor to Satpam", auth.UserRoleMandor, auth.UserRoleSatpam, true},
		{"Lower to Higher (should fail)", auth.UserRoleMandor, auth.UserRoleManager, false},
		{"Same level access", auth.UserRoleManager, auth.UserRoleManager, true},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Test role access using existing service methods
			accessCheck := service.CheckRoleAccess(tc.higherRole, tc.lowerRole)

			if accessCheck.CanAccess != tc.shouldHaveAccess {
				t.Errorf("CheckRoleAccess() = %v, want %v", accessCheck.CanAccess, tc.shouldHaveAccess)
			}

			// Test that conversion doesn't affect hierarchy
			higherRoleStr := service.ConvertEnumToString(tc.higherRole)
			lowerRoleStr := service.ConvertEnumToString(tc.lowerRole)

			// Validate that string representations are valid
			if !service.ValidateRoleString(higherRoleStr) {
				t.Errorf("Higher role string %v is invalid", higherRoleStr)
			}
			if !service.ValidateRoleString(lowerRoleStr) {
				t.Errorf("Lower role string %v is invalid", lowerRoleStr)
			}
		})
	}
}

// TestJSONSerializationIntegration tests role serialization/deserialization
func TestJSONSerializationIntegration(t *testing.T) {
	service := NewRoleAuthorizationService()

	// Test data structure with role
	type UserResponse struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Role  string `json:"role"` // Using string format for JSON
		Email string `json:"email"`
	}

	testUsers := []UserResponse{
		{
			ID:    "1",
			Name:  "Super Admin",
			Role:  service.ConvertEnumToString(auth.UserRoleSuperAdmin),
			Email: "super@admin.com",
		},
		{
			ID:    "2",
			Name:  "Manager",
			Role:  service.ConvertEnumToString(auth.UserRoleManager),
			Email: "manager@company.com",
		},
		{
			ID:    "3",
			Name:  "Mandor",
			Role:  service.ConvertEnumToString(auth.UserRoleMandor),
			Email: "mandor@estate.com",
		},
	}

	// Test JSON marshaling and unmarshaling
	for _, user := range testUsers {
		t.Run("JSON serialization for "+user.Name, func(t *testing.T) {
			// Marshal to JSON
			jsonData, err := json.Marshal(user)
			if err != nil {
				t.Fatalf("Failed to marshal user: %v", err)
			}

			// Unmarshal from JSON
			var unmarshaledUser UserResponse
			err = json.Unmarshal(jsonData, &unmarshaledUser)
			if err != nil {
				t.Fatalf("Failed to unmarshal user: %v", err)
			}

			// Validate role preservation
			if unmarshaledUser.Role != user.Role {
				t.Errorf("Role mismatch after JSON round-trip: got %v, want %v", unmarshaledUser.Role, user.Role)
			}

			// Validate that role is still valid after JSON round-trip
			if !service.ValidateRoleString(unmarshaledUser.Role) {
				t.Errorf("Role %v is invalid after JSON round-trip", unmarshaledUser.Role)
			}

			// Convert back to enum to ensure full compatibility
			_, err = service.ConvertStringToEnum(unmarshaledUser.Role)
			if err != nil {
				t.Errorf("Cannot convert JSON role back to enum: %v", err)
			}
		})
	}
}

// TestPermissionConsistencyIntegration tests that permissions are consistent across role formats
func TestPermissionConsistencyIntegration(t *testing.T) {
	service := NewRoleAuthorizationService()

	// Test that roles have consistent permissions regardless of format
	testCases := []struct {
		name       string
		enumRole   auth.UserRole
		stringRole string
	}{
		{"Super Admin permissions", auth.UserRoleSuperAdmin, models.RoleStringAdmin},
		{"Manager permissions", auth.UserRoleManager, models.RoleStringManager},
		{"Mandor permissions", auth.UserRoleMandor, models.RoleStringMandor},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Get role info for enum format
			enumInfo := service.GetRoleInfo(tc.enumRole)

			// Get role info for string format (convert to enum first)
			stringEnum, err := service.ConvertStringToEnum(tc.stringRole)
			if err != nil {
				t.Fatalf("Failed to convert string role to enum: %v", err)
			}
			stringInfo := service.GetRoleInfo(stringEnum)

			// Compare role metadata
			if enumInfo.Role != stringInfo.Role {
				t.Errorf("Role mismatch: enum=%v, string=%v", enumInfo.Role, stringInfo.Role)
			}
			if enumInfo.Level != stringInfo.Level {
				t.Errorf("Level mismatch: enum=%v, string=%v", enumInfo.Level, stringInfo.Level)
			}
			if enumInfo.Name != stringInfo.Name {
				t.Errorf("Name mismatch: enum=%v, string=%v", enumInfo.Name, stringInfo.Name)
			}
			if enumInfo.WebAccess != stringInfo.WebAccess {
				t.Errorf("WebAccess mismatch: enum=%v, string=%v", enumInfo.WebAccess, stringInfo.WebAccess)
			}
			if enumInfo.MobileAccess != stringInfo.MobileAccess {
				t.Errorf("MobileAccess mismatch: enum=%v, string=%v", enumInfo.MobileAccess, stringInfo.MobileAccess)
			}

			// Test permission list consistency
			if len(enumInfo.Permissions) != len(stringInfo.Permissions) {
				t.Errorf("Permission count mismatch: enum=%d, string=%d", len(enumInfo.Permissions), len(stringInfo.Permissions))
			}

			// Create permission sets for comparison
			enumPerms := make(map[string]bool)
			stringPerms := make(map[string]bool)
			for _, perm := range enumInfo.Permissions {
				enumPerms[perm] = true
			}
			for _, perm := range stringInfo.Permissions {
				stringPerms[perm] = true
			}

			// Compare permission sets
			for perm := range enumPerms {
				if !stringPerms[perm] {
					t.Errorf("Permission %v missing in string format", perm)
				}
			}
			for perm := range stringPerms {
				if !enumPerms[perm] {
					t.Errorf("Permission %v missing in enum format", perm)
				}
			}
		})
	}
}

// TestErrorHandlingIntegration tests error handling and edge cases
func TestErrorHandlingIntegration(t *testing.T) {
	service := NewRoleAuthorizationService()

	// Test error cases
	t.Run("Invalid string conversion", func(t *testing.T) {
		_, err := service.ConvertStringToEnum("INVALID_ROLE")
		if err == nil {
			t.Error("Expected error for invalid role string, but got none")
		}
	})

	t.Run("Empty string conversion", func(t *testing.T) {
		_, err := service.ConvertStringToEnum("")
		if err == nil {
			t.Error("Expected error for empty role string, but got none")
		}
	})

	t.Run("Case sensitivity test", func(t *testing.T) {
		_, err := service.ConvertStringToEnum("super_admin") // lowercase
		if err == nil {
			t.Error("Expected error for lowercase role, but got none")
		}
	})

	t.Run("Validation of valid roles", func(t *testing.T) {
		validRoles := []string{
			models.RoleStringAdmin,
			models.RoleStringCompanyAdmin,
			models.RoleStringAreaManager,
			models.RoleStringManager,
			models.RoleStringAsisten,
			models.RoleStringMandor,
			models.RoleStringSatpam,
		}

		for _, role := range validRoles {
			if !service.ValidateRoleString(role) {
				t.Errorf("Valid role %v failed validation", role)
			}
		}
	})

	t.Run("Validation of invalid roles", func(t *testing.T) {
		invalidRoles := []string{
			"INVALID_ROLE",
			"admin",
			"ADMIN",
			"super_admin",
			"USER",
			"",
			"123",
		}

		for _, role := range invalidRoles {
			if service.ValidateRoleString(role) {
				t.Errorf("Invalid role %v passed validation", role)
			}
		}
	})
}

// BenchmarkIntegrationRoleOperations benchmarks role operations in realistic scenarios
func BenchmarkIntegrationRoleOperations(b *testing.B) {
	service := NewRoleAuthorizationService()

	// Simulate real-world usage patterns
	b.Run("CompleteRoleConversionCycle", func(b *testing.B) {
		roles := []auth.UserRole{
			auth.UserRoleSuperAdmin,
			auth.UserRoleCompanyAdmin,
			auth.UserRoleManager,
			auth.UserRoleAsisten,
			auth.UserRoleMandor,
			auth.UserRoleSatpam,
		}

		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			for _, role := range roles {
				// Convert enum to string
				str := service.ConvertEnumToString(role)
				// Validate string
				service.ValidateRoleString(str)
				// Convert back to enum
				service.ConvertStringToEnum(str)
				// Get standardized string
				service.GetStandardizedRoleString(role)
			}
		}
	})

	b.Run("RoleValidation", func(b *testing.B) {
		roleStrings := []string{
			models.RoleStringAdmin,
			models.RoleStringCompanyAdmin,
			models.RoleStringManager,
			models.RoleStringMandor,
		}

		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			for _, roleStr := range roleStrings {
				service.ValidateRoleString(roleStr)
			}
		}
	})

	b.Run("RoleHierarchyChecks", func(b *testing.B) {
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			service.CheckRoleAccess(auth.UserRoleSuperAdmin, auth.UserRoleMandor)
			service.CheckRoleAccess(auth.UserRoleManager, auth.UserRoleAsisten)
			service.CheckRoleAccess(auth.UserRoleCompanyAdmin, auth.UserRoleManager)
		}
	})
}

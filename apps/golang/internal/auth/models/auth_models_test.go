package models

import (
	"testing"
)

func TestRoleStringConstants(t *testing.T) {
	// Test that role string constants match expected values
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"Super Admin constant", RoleStringAdmin, "SUPER_ADMIN"},
		{"Company Admin constant", RoleStringCompanyAdmin, "COMPANY_ADMIN"},
		{"Area Manager constant", RoleStringAreaManager, "AREA_MANAGER"},
		{"Manager constant", RoleStringManager, "MANAGER"},
		{"Asisten constant", RoleStringAsisten, "ASISTEN"},
		{"Mandor constant", RoleStringMandor, "MANDOR"},
		{"Satpam constant", RoleStringSatpam, "SATPAM"},
		{"Timbangan constant", RoleStringTimbangan, "TIMBANGAN"},
		{"Grading constant", RoleStringGrading, "GRADING"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, tt.constant)
			}
		})
	}
}

func TestRoleStringMap(t *testing.T) {
	// Test that RoleStringMap is properly populated
	tests := []struct {
		name     string
		role     Role
		expected string
	}{
		{"Admin string", RoleAdmin, "SUPER_ADMIN"},
		{"Company Admin string", RoleCompanyAdmin, "COMPANY_ADMIN"},
		{"Area Manager string", RoleAreaManager, "AREA_MANAGER"},
		{"Manager string", RoleManager, "MANAGER"},
		{"Asisten string", RoleAsisten, "ASISTEN"},
		{"Mandor string", RoleMandor, "MANDOR"},
		{"Satpam string", RoleSatpam, "SATPAM"},
		{"Timbangan string", RoleTimbangan, "TIMBANGAN"},
		{"Grading string", RoleGrading, "GRADING"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if str, exists := RoleStringMap[tt.role]; !exists {
				t.Errorf("Role %s not found in RoleStringMap", tt.role)
			} else if str != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, str)
			}
		})
	}
}

func TestStringToRoleMap(t *testing.T) {
	// Test that StringToRoleMap is properly populated
	tests := []struct {
		name     string
		roleStr  string
		expected Role
	}{
		{"Admin role", "SUPER_ADMIN", RoleAdmin},
		{"Company Admin role", "COMPANY_ADMIN", RoleCompanyAdmin},
		{"Area Manager role", "AREA_MANAGER", RoleAreaManager},
		{"Manager role", "MANAGER", RoleManager},
		{"Asisten role", "ASISTEN", RoleAsisten},
		{"Mandor role", "MANDOR", RoleMandor},
		{"Satpam role", "SATPAM", RoleSatpam},
		{"Timbangan role", "TIMBANGAN", RoleTimbangan},
		{"Grading role", "GRADING", RoleGrading},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if role, exists := StringToRoleMap[tt.roleStr]; !exists {
				t.Errorf("Role string %s not found in StringToRoleMap", tt.roleStr)
			} else if role != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, role)
			}
		})
	}
}

func TestToStandardString(t *testing.T) {
	// Test ToStandardString method
	tests := []struct {
		name     string
		role     Role
		expected string
	}{
		{"Admin to string", RoleAdmin, "SUPER_ADMIN"},
		{"Company Admin to string", RoleCompanyAdmin, "COMPANY_ADMIN"},
		{"Area Manager to string", RoleAreaManager, "AREA_MANAGER"},
		{"Manager to string", RoleManager, "MANAGER"},
		{"Asisten to string", RoleAsisten, "ASISTEN"},
		{"Mandor to string", RoleMandor, "MANDOR"},
		{"Satpam to string", RoleSatpam, "SATPAM"},
		{"Timbangan to string", RoleTimbangan, "TIMBANGAN"},
		{"Grading to string", RoleGrading, "GRADING"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.role.ToStandardString()
			if result != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, result)
			}
		})
	}
}

func TestIsValidRoleString(t *testing.T) {
	// Test IsValidRoleString function
	validRoles := []string{
		"SUPER_ADMIN", "COMPANY_ADMIN", "AREA_MANAGER",
		"MANAGER", "ASISTEN", "MANDOR", "SATPAM",
		"TIMBANGAN", "GRADING",
	}

	invalidRoles := []string{
		"INVALID_ROLE", "", "admin", "super_admin",
		"USER", "GUEST",
	}

	for _, role := range validRoles {
		t.Run("Valid role: "+role, func(t *testing.T) {
			if !IsValidRoleString(role) {
				t.Errorf("Expected %s to be valid", role)
			}
		})
	}

	for _, role := range invalidRoles {
		t.Run("Invalid role: "+role, func(t *testing.T) {
			if IsValidRoleString(role) {
				t.Errorf("Expected %s to be invalid", role)
			}
		})
	}
}

func TestStringToRole(t *testing.T) {
	// Test StringToRole function
	tests := []struct {
		name     string
		roleStr  string
		expected Role
		hasError bool
	}{
		{"Valid admin", "SUPER_ADMIN", RoleAdmin, false},
		{"Valid company admin", "COMPANY_ADMIN", RoleCompanyAdmin, false},
		{"Valid area manager", "AREA_MANAGER", RoleAreaManager, false},
		{"Valid manager", "MANAGER", RoleManager, false},
		{"Valid asisten", "ASISTEN", RoleAsisten, false},
		{"Valid mandor", "MANDOR", RoleMandor, false},
		{"Valid satpam", "SATPAM", RoleSatpam, false},
		{"Valid timbangan", "TIMBANGAN", RoleTimbangan, false},
		{"Valid grading", "GRADING", RoleGrading, false},
		{"Invalid role", "INVALID_ROLE", "", true},
		{"Empty role", "", "", true},
		{"Lowercase role", "admin", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			role, err := StringToRole(tt.roleStr)
			if tt.hasError {
				if err == nil {
					t.Errorf("Expected error for role %s", tt.roleStr)
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error for role %s: %v", tt.roleStr, err)
				}
				if role != tt.expected {
					t.Errorf("Expected %s, got %s", tt.expected, role)
				}
			}
		})
	}
}

func TestGetAllValidRoleStrings(t *testing.T) {
	// Test GetAllValidRoleStrings function
	roles := GetAllValidRoleStrings()
	expectedRoles := []string{
		"SUPER_ADMIN", "COMPANY_ADMIN", "AREA_MANAGER",
		"MANAGER", "ASISTEN", "MANDOR", "SATPAM",
		"TIMBANGAN", "GRADING",
	}

	if len(roles) != len(expectedRoles) {
		t.Errorf("Expected %d roles, got %d", len(expectedRoles), len(roles))
	}

	roleMap := make(map[string]bool)
	for _, role := range roles {
		roleMap[role] = true
	}

	for _, expectedRole := range expectedRoles {
		if !roleMap[expectedRole] {
			t.Errorf("Expected role %s not found in result", expectedRole)
		}
	}
}

func TestValidateRoleFormat(t *testing.T) {
	// Test ValidateRoleFormat function
	tests := []struct {
		name     string
		role     interface{}
		expected Role
		hasError bool
	}{
		{"Valid Role enum", RoleAdmin, RoleAdmin, false},
		{"Valid string", "MANAGER", RoleManager, false},
		{"Valid Company Admin string", "COMPANY_ADMIN", RoleCompanyAdmin, false},
		{"Invalid string", "INVALID_ROLE", "", true},
		{"Empty string", "", "", true},
		{"Invalid type", 123, "", true},
		{"Nil value", nil, "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			role, err := ValidateRoleFormat(tt.role)
			if tt.hasError {
				if err == nil {
					t.Errorf("Expected error for role %v", tt.role)
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error for role %v: %v", tt.role, err)
				}
				if role != tt.expected {
					t.Errorf("Expected %s, got %s", tt.expected, role)
				}
			}
		})
	}
}

func TestRoleMethods(t *testing.T) {
	// Test existing Role methods
	tests := []struct {
		name           string
		role           Role
		expectedValid  bool
		expectedWeb    bool
		expectedMobile bool
	}{
		{"Admin properties", RoleAdmin, true, true, false},
		{"Company Admin properties", RoleCompanyAdmin, true, true, false},
		{"Area Manager properties", RoleAreaManager, true, true, true},
		{"Manager properties", RoleManager, true, true, true},
		{"Asisten properties", RoleAsisten, true, true, true},
		{"Mandor properties", RoleMandor, true, false, true},
		{"Satpam properties", RoleSatpam, true, true, true},
		{"Timbangan properties", RoleTimbangan, true, false, true},
		{"Grading properties", RoleGrading, true, false, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.role.IsValid() != tt.expectedValid {
				t.Errorf("Expected IsValid() = %v, got %v", tt.expectedValid, tt.role.IsValid())
			}
			if tt.role.HasWebAccess() != tt.expectedWeb {
				t.Errorf("Expected HasWebAccess() = %v, got %v", tt.expectedWeb, tt.role.HasWebAccess())
			}
			if tt.role.HasMobileAccess() != tt.expectedMobile {
				t.Errorf("Expected HasMobileAccess() = %v, got %v", tt.expectedMobile, tt.role.HasMobileAccess())
			}
		})
	}
}

// Benchmark tests for performance validation
func BenchmarkToStandardString(b *testing.B) {
	role := RoleAdmin
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = role.ToStandardString()
	}
}

func BenchmarkIsValidRoleString(b *testing.B) {
	roleStr := "SUPER_ADMIN"
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = IsValidRoleString(roleStr)
	}
}

func BenchmarkStringToRole(b *testing.B) {
	roleStr := "SUPER_ADMIN"
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = StringToRole(roleStr)
	}
}

func BenchmarkValidateRoleFormat(b *testing.B) {
	role := "SUPER_ADMIN"
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = ValidateRoleFormat(role)
	}
}

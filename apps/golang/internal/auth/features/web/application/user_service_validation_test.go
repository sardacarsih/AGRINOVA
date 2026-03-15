package web

import (
	"testing"

	"agrinovagraphql/server/internal/auth/features/shared/domain"
)

func TestValidateRoleAssignmentRequirements_ManagerRules(t *testing.T) {
	t.Run("valid manager with one company and one estate", func(t *testing.T) {
		err := validateRoleAssignmentRequirements(
			domain.RoleManager,
			[]string{"company-1"},
			[]string{"estate-1"},
			nil,
		)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
	})

	t.Run("valid manager with one company and multiple estates", func(t *testing.T) {
		err := validateRoleAssignmentRequirements(
			domain.RoleManager,
			[]string{"company-1"},
			[]string{"estate-1", "estate-2"},
			nil,
		)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
	})

	t.Run("manager with zero company should fail", func(t *testing.T) {
		err := validateRoleAssignmentRequirements(
			domain.RoleManager,
			nil,
			[]string{"estate-1"},
			nil,
		)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("manager with multiple companies should fail", func(t *testing.T) {
		err := validateRoleAssignmentRequirements(
			domain.RoleManager,
			[]string{"company-1", "company-2"},
			[]string{"estate-1"},
			nil,
		)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("manager without estate should fail", func(t *testing.T) {
		err := validateRoleAssignmentRequirements(
			domain.RoleManager,
			[]string{"company-1"},
			nil,
			nil,
		)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

func TestValidateRoleAssignmentRequirements_AreaManagerCompanyRules(t *testing.T) {
	t.Run("area manager with one company should pass", func(t *testing.T) {
		err := validateRoleAssignmentRequirements(
			domain.RoleAreaManager,
			[]string{"company-1"},
			nil,
			nil,
		)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
	})

	t.Run("area manager with multiple companies should pass", func(t *testing.T) {
		err := validateRoleAssignmentRequirements(
			domain.RoleAreaManager,
			[]string{"company-1", "company-2"},
			nil,
			nil,
		)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
	})

	t.Run("area manager without company should fail", func(t *testing.T) {
		err := validateRoleAssignmentRequirements(
			domain.RoleAreaManager,
			nil,
			nil,
			nil,
		)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

func TestFindActiveAssignmentConflict(t *testing.T) {
	estate1 := "estate-1"
	estate2 := "estate-2"
	division1 := "division-1"

	users := []*domain.User{
		{
			ID:       "manager-1",
			Username: "manager.one",
			Role:     domain.RoleManager,
			IsActive: true,
			Assignments: []domain.Assignment{
				{CompanyID: "company-1", IsActive: true},
				{CompanyID: "company-1", EstateID: &estate1, IsActive: true},
			},
		},
		{
			ID:       "manager-inactive",
			Username: "manager.inactive",
			Role:     domain.RoleManager,
			IsActive: false,
			Assignments: []domain.Assignment{
				{CompanyID: "company-1", EstateID: &estate2, IsActive: true},
			},
		},
		{
			ID:       "asisten-1",
			Username: "asisten.one",
			Role:     domain.RoleAsisten,
			IsActive: true,
			Assignments: []domain.Assignment{
				{CompanyID: "company-1", DivisionID: &division1, IsActive: true},
			},
		},
	}

	t.Run("manager estate conflict should be detected", func(t *testing.T) {
		conflict := findActiveAssignmentConflict(
			assignmentScopeEstate,
			[]string{"estate-1"},
			users,
			"",
		)

		if conflict == nil {
			t.Fatal("expected conflict, got nil")
		}
		if conflict.assignmentID != "estate-1" {
			t.Fatalf("expected estate-1 conflict, got %s", conflict.assignmentID)
		}
		if conflict.username != "manager.one" {
			t.Fatalf("expected conflicting username manager.one, got %s", conflict.username)
		}
	})

	t.Run("excluded user should not conflict with itself", func(t *testing.T) {
		conflict := findActiveAssignmentConflict(
			assignmentScopeEstate,
			[]string{"estate-1"},
			users,
			"manager-1",
		)

		if conflict != nil {
			t.Fatalf("expected no conflict, got %+v", conflict)
		}
	})

	t.Run("inactive user should be ignored", func(t *testing.T) {
		conflict := findActiveAssignmentConflict(
			assignmentScopeEstate,
			[]string{"estate-2"},
			users,
			"",
		)

		if conflict != nil {
			t.Fatalf("expected no conflict, got %+v", conflict)
		}
	})

	t.Run("division conflict should be detected", func(t *testing.T) {
		conflict := findActiveAssignmentConflict(
			assignmentScopeDivision,
			[]string{"division-1"},
			users,
			"",
		)

		if conflict == nil {
			t.Fatal("expected division conflict, got nil")
		}
		if conflict.assignmentID != "division-1" {
			t.Fatalf("expected division-1 conflict, got %s", conflict.assignmentID)
		}
	})
}

func TestValidateManagerRoleForUserRole(t *testing.T) {
	t.Run("asisten manager role must be manager", func(t *testing.T) {
		if err := validateManagerRoleForUserRole(domain.RoleAsisten, domain.RoleManager); err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if err := validateManagerRoleForUserRole(domain.RoleAsisten, domain.RoleAreaManager); err == nil {
			t.Fatal("expected validation error for ASISTEN manager role")
		}
	})

	t.Run("mandor manager role must be asisten", func(t *testing.T) {
		if err := validateManagerRoleForUserRole(domain.RoleMandor, domain.RoleAsisten); err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if err := validateManagerRoleForUserRole(domain.RoleMandor, domain.RoleManager); err == nil {
			t.Fatal("expected validation error for MANDOR manager role")
		}
	})

	t.Run("manager manager role must be area manager", func(t *testing.T) {
		if err := validateManagerRoleForUserRole(domain.RoleManager, domain.RoleAreaManager); err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if err := validateManagerRoleForUserRole(domain.RoleManager, domain.RoleCompanyAdmin); err == nil {
			t.Fatal("expected validation error for MANAGER manager role")
		}
	})
}

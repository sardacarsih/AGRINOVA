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

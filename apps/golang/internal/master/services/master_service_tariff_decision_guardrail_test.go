package services

import (
	"strings"
	"testing"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/master/models"
)

func TestValidateTariffManagementDecisionInputForRole_AllowedRole(t *testing.T) {
	t.Parallel()

	decisionNo := "  SK-MGMT-2026-01  "
	reason := "  Koreksi basis tarif semester 1  "
	effectiveNote := "  Berlaku per 1 April 2026  "

	gotDecisionNo, gotReason, gotEffectiveNote, err := validateTariffManagementDecisionInputForRole(
		auth.UserRoleCompanyAdmin,
		&decisionNo,
		&reason,
		&effectiveNote,
	)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if gotDecisionNo != "SK-MGMT-2026-01" {
		t.Fatalf("unexpected decision no: %q", gotDecisionNo)
	}
	if gotReason != "Koreksi basis tarif semester 1" {
		t.Fatalf("unexpected decision reason: %q", gotReason)
	}
	if gotEffectiveNote != "Berlaku per 1 April 2026" {
		t.Fatalf("unexpected effective note: %q", gotEffectiveNote)
	}
}

func TestValidateTariffManagementDecisionInputForRole_RejectsNonManagementRole(t *testing.T) {
	t.Parallel()

	decisionNo := "SK-001"
	reason := "reason"
	effectiveNote := "effective"

	_, _, _, err := validateTariffManagementDecisionInputForRole(
		auth.UserRoleManager,
		&decisionNo,
		&reason,
		&effectiveNote,
	)
	if err == nil {
		t.Fatal("expected error for non-management role")
	}

	masterErr, ok := err.(*models.MasterDataError)
	if !ok {
		t.Fatalf("expected MasterDataError, got %T", err)
	}
	if masterErr.Code != models.ErrCodePermissionDenied {
		t.Fatalf("unexpected error code: %s", masterErr.Code)
	}
}

func TestValidateTariffManagementDecisionInputForRole_RequiresAllFields(t *testing.T) {
	t.Parallel()

	valid := "filled"
	testCases := []struct {
		name      string
		decision  *string
		reason    *string
		effective *string
		contains  string
	}{
		{
			name:      "missing decision no",
			decision:  nil,
			reason:    &valid,
			effective: &valid,
			contains:  "management_decision_no wajib diisi",
		},
		{
			name:      "missing reason",
			decision:  &valid,
			reason:    stringPtr(" "),
			effective: &valid,
			contains:  "management_decision_reason wajib diisi",
		},
		{
			name:      "missing effective note",
			decision:  &valid,
			reason:    &valid,
			effective: stringPtr(" "),
			contains:  "management_effective_note wajib diisi",
		},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			_, _, _, err := validateTariffManagementDecisionInputForRole(
				auth.UserRoleSuperAdmin,
				tc.decision,
				tc.reason,
				tc.effective,
			)
			if err == nil {
				t.Fatal("expected validation error")
			}
			if !strings.Contains(err.Error(), tc.contains) {
				t.Fatalf("expected error containing %q, got %q", tc.contains, err.Error())
			}
		})
	}
}

package resolvers

import (
	"testing"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/generated"
)

func TestBlockTreatmentRoleGuards(t *testing.T) {
	t.Parallel()

	roleCases := []struct {
		name                          string
		role                          auth.UserRole
		canSubmitOrCancel             bool
		canReviewOrDecision           bool
		canApply                      bool
		canActOnOwnWhenCreatedByMatch bool
	}{
		{
			name:                          "manager",
			role:                          auth.UserRoleManager,
			canSubmitOrCancel:             true,
			canReviewOrDecision:           false,
			canApply:                      false,
			canActOnOwnWhenCreatedByMatch: true,
		},
		{
			name:                          "area manager",
			role:                          auth.UserRoleAreaManager,
			canSubmitOrCancel:             false,
			canReviewOrDecision:           true,
			canApply:                      true,
			canActOnOwnWhenCreatedByMatch: false,
		},
		{
			name:                          "company admin",
			role:                          auth.UserRoleCompanyAdmin,
			canSubmitOrCancel:             false,
			canReviewOrDecision:           false,
			canApply:                      true,
			canActOnOwnWhenCreatedByMatch: false,
		},
		{
			name:                          "super admin",
			role:                          auth.UserRoleSuperAdmin,
			canSubmitOrCancel:             false,
			canReviewOrDecision:           false,
			canApply:                      true,
			canActOnOwnWhenCreatedByMatch: false,
		},
	}

	for _, tc := range roleCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			if got := canSubmitOrCancelBlockTreatmentRequest(tc.role); got != tc.canSubmitOrCancel {
				t.Fatalf("canSubmitOrCancelBlockTreatmentRequest mismatch: got=%t want=%t", got, tc.canSubmitOrCancel)
			}
			if got := canReviewOrDecisionBlockTreatmentRequest(tc.role); got != tc.canReviewOrDecision {
				t.Fatalf("canReviewOrDecisionBlockTreatmentRequest mismatch: got=%t want=%t", got, tc.canReviewOrDecision)
			}
			if got := canApplyBlockTreatmentRequest(tc.role); got != tc.canApply {
				t.Fatalf("canApplyBlockTreatmentRequest mismatch: got=%t want=%t", got, tc.canApply)
			}
			if got := canManagerActOnOwnBlockTreatmentRequest(tc.role, "u-1", "u-1"); got != tc.canActOnOwnWhenCreatedByMatch {
				t.Fatalf("canManagerActOnOwnBlockTreatmentRequest mismatch: got=%t want=%t", got, tc.canActOnOwnWhenCreatedByMatch)
			}
		})
	}
}

func TestBlockTreatmentStatusGuards(t *testing.T) {
	t.Parallel()

	if !canTransitionBlockTreatmentRequestStatus(
		generated.BlockTreatmentRequestStatusSubmitted,
		generated.BlockTreatmentRequestStatusSubmitted,
	) {
		t.Fatal("expected submitted -> submitted transition guard check to pass")
	}

	if canTransitionBlockTreatmentRequestStatus(
		generated.BlockTreatmentRequestStatusSubmitted,
		generated.BlockTreatmentRequestStatusUnderReview,
	) {
		t.Fatal("expected submitted -> under_review required check to fail")
	}

	if !canSubmitBlockTreatmentRequestFrom(generated.BlockTreatmentRequestStatusDraft) {
		t.Fatal("expected submit from DRAFT to be allowed")
	}
	if !canSubmitBlockTreatmentRequestFrom(generated.BlockTreatmentRequestStatusRejected) {
		t.Fatal("expected submit from REJECTED to be allowed")
	}
	if canSubmitBlockTreatmentRequestFrom(generated.BlockTreatmentRequestStatusSubmitted) {
		t.Fatal("expected submit from SUBMITTED to be rejected")
	}

	if !canCancelBlockTreatmentRequestFrom(generated.BlockTreatmentRequestStatusDraft) {
		t.Fatal("expected cancel from DRAFT to be allowed")
	}
	if !canCancelBlockTreatmentRequestFrom(generated.BlockTreatmentRequestStatusSubmitted) {
		t.Fatal("expected cancel from SUBMITTED to be allowed")
	}
	if canCancelBlockTreatmentRequestFrom(generated.BlockTreatmentRequestStatusUnderReview) {
		t.Fatal("expected cancel from UNDER_REVIEW to be rejected")
	}

	if !canApplyBlockTreatmentRequestFrom(generated.BlockTreatmentRequestStatusApproved) {
		t.Fatal("expected apply from APPROVED to be allowed")
	}
	if canApplyBlockTreatmentRequestFrom(generated.BlockTreatmentRequestStatusSubmitted) {
		t.Fatal("expected apply from SUBMITTED to be rejected")
	}

	if status, ok := parseBlockTreatmentRequestStatus("UNDER_REVIEW"); !ok || status != generated.BlockTreatmentRequestStatusUnderReview {
		t.Fatalf("unexpected parse result: status=%q ok=%t", status, ok)
	}
	if _, ok := parseBlockTreatmentRequestStatus("UNKNOWN"); ok {
		t.Fatal("expected unknown status parse to fail")
	}
}

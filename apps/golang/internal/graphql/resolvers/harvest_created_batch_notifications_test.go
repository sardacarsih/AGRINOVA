package resolvers

import (
	"strings"
	"testing"

	"agrinovagraphql/server/internal/graphql/domain/auth"
)

func TestBuildHarvestCreatedBatchFCMPayload_UsesRoleSpecificRoute(t *testing.T) {
	summary := harvestCreatedBatchNotificationSummary{
		MandorID:    "mandor-1",
		MandorName:  "Mandor Alpha",
		HarvestIDs:  []string{"harvest-1", "harvest-2"},
		Blocks:      []string{"A1", "A2"},
		TotalWeight: 245.5,
		Count:       2,
	}

	t.Run("asisten", func(t *testing.T) {
		payload := buildHarvestCreatedBatchFCMPayload(summary, auth.UserRoleAsisten)

		if payload.ClickAction != "/asisten" {
			t.Fatalf("expected asisten click action, got %q", payload.ClickAction)
		}
		if payload.Type != "HARVEST_APPROVAL_NEEDED" {
			t.Fatalf("unexpected payload type: %q", payload.Type)
		}
		if payload.PanenID != "harvest-1" {
			t.Fatalf("expected first harvest ID, got %q", payload.PanenID)
		}
		if !strings.Contains(payload.Body, "memerlukan persetujuan") {
			t.Fatalf("expected approval wording, got %q", payload.Body)
		}
	})

	t.Run("manager", func(t *testing.T) {
		payload := buildHarvestCreatedBatchFCMPayload(summary, auth.UserRoleManager)

		if payload.ClickAction != "/manager" {
			t.Fatalf("expected manager click action, got %q", payload.ClickAction)
		}
		if payload.Title != "Notifikasi Panen Baru" {
			t.Fatalf("unexpected manager title: %q", payload.Title)
		}
		if !strings.Contains(payload.Body, "memerlukan perhatian") {
			t.Fatalf("expected manager wording, got %q", payload.Body)
		}
	})
}

func TestBuildHarvestCreatedBatchNotificationContent_UsesBatchSummary(t *testing.T) {
	summary := harvestCreatedBatchNotificationSummary{
		MandorName:  "Mandor Beta",
		Blocks:      []string{"B2", "B3", "B4"},
		TotalWeight: 300,
		Count:       3,
	}

	title, message := buildHarvestCreatedBatchNotificationContent(summary, auth.UserRoleAsisten)
	if title != "Persetujuan Panen Diperlukan" {
		t.Fatalf("unexpected title: %q", title)
	}
	if !strings.Contains(message, "3 data panen") {
		t.Fatalf("expected batch count in message, got %q", message)
	}
	if !strings.Contains(message, "Mandor Beta") {
		t.Fatalf("expected mandor name in message, got %q", message)
	}
	if !strings.Contains(message, "300.0 kg") {
		t.Fatalf("expected total weight in message, got %q", message)
	}
}

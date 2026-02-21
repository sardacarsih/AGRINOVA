package resolvers

import (
	"context"
	"testing"
	"time"

	"agrinovagraphql/server/internal/graphql/domain/satpam"
)

func TestSatpamSubscriptionHub_VehicleEntryDelivery(t *testing.T) {
	t.Parallel()

	hub := newSatpamSubscriptionHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	ch := hub.subscribeVehicleEntry(ctx)
	expected := &satpam.SatpamGuestLog{ID: "entry-1"}

	hub.publishVehicleEntry(expected)

	select {
	case got := <-ch:
		if got == nil || got.ID != expected.ID {
			t.Fatalf("unexpected payload: %#v", got)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("timed out waiting for vehicle entry event")
	}
}

func TestSatpamSubscriptionHub_DeviceScopedSyncUpdate(t *testing.T) {
	t.Parallel()

	hub := newSatpamSubscriptionHub()
	ctxA, cancelA := context.WithCancel(context.Background())
	defer cancelA()
	ctxB, cancelB := context.WithCancel(context.Background())
	defer cancelB()

	chA := hub.subscribeSyncUpdate(ctxA, "device-a")
	chB := hub.subscribeSyncUpdate(ctxB, "device-b")

	expected := &satpam.SatpamSyncStatus{PendingSyncCount: 3}
	hub.publishSyncUpdate("device-a", expected)

	select {
	case got := <-chA:
		if got == nil || got.PendingSyncCount != expected.PendingSyncCount {
			t.Fatalf("unexpected sync payload: %#v", got)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("timed out waiting for device-a sync update")
	}

	select {
	case <-chB:
		t.Fatal("device-b subscriber should not receive device-a update")
	case <-time.After(150 * time.Millisecond):
		// expected
	}
}

func TestSatpamSubscriptionHub_ContextCancellationClosesChannel(t *testing.T) {
	t.Parallel()

	hub := newSatpamSubscriptionHub()
	ctx, cancel := context.WithCancel(context.Background())
	ch := hub.subscribeVehicleExit(ctx)

	cancel()

	select {
	case _, ok := <-ch:
		if ok {
			t.Fatal("expected channel to be closed after context cancellation")
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("timed out waiting for channel to close")
	}
}

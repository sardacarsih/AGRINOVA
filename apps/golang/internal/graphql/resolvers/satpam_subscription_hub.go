package resolvers

import (
	"context"
	"strings"
	"sync"

	"agrinovagraphql/server/internal/graphql/domain/satpam"
)

type satpamGuestLogSubscriberSet map[chan *satpam.SatpamGuestLog]struct{}
type satpamOverstaySubscriberSet map[chan *satpam.VehicleInsideInfo]struct{}
type satpamSyncSubscriberSet map[chan *satpam.SatpamSyncStatus]struct{}

type satpamSubscriptionHub struct {
	mu sync.RWMutex

	vehicleEntrySubscribers satpamGuestLogSubscriberSet
	vehicleExitSubscribers  satpamGuestLogSubscriberSet
	overstaySubscribers     satpamOverstaySubscriberSet
	syncSubscribersByDevice map[string]satpamSyncSubscriberSet
}

func newSatpamSubscriptionHub() *satpamSubscriptionHub {
	return &satpamSubscriptionHub{
		vehicleEntrySubscribers: make(satpamGuestLogSubscriberSet),
		vehicleExitSubscribers:  make(satpamGuestLogSubscriberSet),
		overstaySubscribers:     make(satpamOverstaySubscriberSet),
		syncSubscribersByDevice: make(map[string]satpamSyncSubscriberSet),
	}
}

var globalSatpamSubscriptionHub = newSatpamSubscriptionHub()

func subscribeSatpamVehicleEntry(ctx context.Context) (<-chan *satpam.SatpamGuestLog, error) {
	return globalSatpamSubscriptionHub.subscribeVehicleEntry(ctx), nil
}

func subscribeSatpamVehicleExit(ctx context.Context) (<-chan *satpam.SatpamGuestLog, error) {
	return globalSatpamSubscriptionHub.subscribeVehicleExit(ctx), nil
}

func subscribeSatpamOverstayAlert(ctx context.Context) (<-chan *satpam.VehicleInsideInfo, error) {
	return globalSatpamSubscriptionHub.subscribeOverstay(ctx), nil
}

func subscribeSatpamSyncUpdate(ctx context.Context, deviceID string) (<-chan *satpam.SatpamSyncStatus, error) {
	return globalSatpamSubscriptionHub.subscribeSyncUpdate(ctx, deviceID), nil
}

func publishSatpamVehicleEntry(record *satpam.SatpamGuestLog) {
	globalSatpamSubscriptionHub.publishVehicleEntry(record)
}

func publishSatpamVehicleExit(record *satpam.SatpamGuestLog) {
	globalSatpamSubscriptionHub.publishVehicleExit(record)
}

func publishSatpamOverstayAlert(record *satpam.VehicleInsideInfo) {
	globalSatpamSubscriptionHub.publishOverstay(record)
}

func publishSatpamSyncUpdate(deviceID string, status *satpam.SatpamSyncStatus) {
	globalSatpamSubscriptionHub.publishSyncUpdate(deviceID, status)
}

func (h *satpamSubscriptionHub) subscribeVehicleEntry(ctx context.Context) <-chan *satpam.SatpamGuestLog {
	return h.subscribeGuestLog(ctx, &h.vehicleEntrySubscribers)
}

func (h *satpamSubscriptionHub) subscribeVehicleExit(ctx context.Context) <-chan *satpam.SatpamGuestLog {
	return h.subscribeGuestLog(ctx, &h.vehicleExitSubscribers)
}

func (h *satpamSubscriptionHub) subscribeOverstay(ctx context.Context) <-chan *satpam.VehicleInsideInfo {
	ch := make(chan *satpam.VehicleInsideInfo, 16)

	h.mu.Lock()
	h.overstaySubscribers[ch] = struct{}{}
	h.mu.Unlock()

	go func() {
		<-ctx.Done()
		h.mu.Lock()
		delete(h.overstaySubscribers, ch)
		h.mu.Unlock()
		close(ch)
	}()

	return ch
}

func (h *satpamSubscriptionHub) subscribeSyncUpdate(ctx context.Context, deviceID string) <-chan *satpam.SatpamSyncStatus {
	ch := make(chan *satpam.SatpamSyncStatus, 16)
	normalizedDeviceID := normalizeSatpamDeviceID(deviceID)
	if normalizedDeviceID == "" {
		close(ch)
		return ch
	}

	h.mu.Lock()
	if h.syncSubscribersByDevice[normalizedDeviceID] == nil {
		h.syncSubscribersByDevice[normalizedDeviceID] = make(satpamSyncSubscriberSet)
	}
	h.syncSubscribersByDevice[normalizedDeviceID][ch] = struct{}{}
	h.mu.Unlock()

	go func() {
		<-ctx.Done()
		h.mu.Lock()
		subscribers := h.syncSubscribersByDevice[normalizedDeviceID]
		delete(subscribers, ch)
		if len(subscribers) == 0 {
			delete(h.syncSubscribersByDevice, normalizedDeviceID)
		}
		h.mu.Unlock()
		close(ch)
	}()

	return ch
}

func (h *satpamSubscriptionHub) publishVehicleEntry(record *satpam.SatpamGuestLog) {
	h.publishGuestLog(record, h.vehicleEntrySubscribers)
}

func (h *satpamSubscriptionHub) publishVehicleExit(record *satpam.SatpamGuestLog) {
	h.publishGuestLog(record, h.vehicleExitSubscribers)
}

func (h *satpamSubscriptionHub) publishOverstay(record *satpam.VehicleInsideInfo) {
	if record == nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for ch := range h.overstaySubscribers {
		select {
		case ch <- record:
		default:
			// Keep mutation path non-blocking for slow subscribers.
		}
	}
}

func (h *satpamSubscriptionHub) publishSyncUpdate(deviceID string, status *satpam.SatpamSyncStatus) {
	if status == nil {
		return
	}

	normalizedDeviceID := normalizeSatpamDeviceID(deviceID)
	if normalizedDeviceID == "" {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for ch := range h.syncSubscribersByDevice[normalizedDeviceID] {
		select {
		case ch <- status:
		default:
			// Keep mutation path non-blocking for slow subscribers.
		}
	}
}

func (h *satpamSubscriptionHub) subscribeGuestLog(ctx context.Context, subscribers *satpamGuestLogSubscriberSet) <-chan *satpam.SatpamGuestLog {
	ch := make(chan *satpam.SatpamGuestLog, 16)

	h.mu.Lock()
	(*subscribers)[ch] = struct{}{}
	h.mu.Unlock()

	go func() {
		<-ctx.Done()
		h.mu.Lock()
		delete(*subscribers, ch)
		h.mu.Unlock()
		close(ch)
	}()

	return ch
}

func (h *satpamSubscriptionHub) publishGuestLog(record *satpam.SatpamGuestLog, subscribers satpamGuestLogSubscriberSet) {
	if record == nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for ch := range subscribers {
		select {
		case ch <- record:
		default:
			// Keep mutation path non-blocking for slow subscribers.
		}
	}
}

func normalizeSatpamDeviceID(deviceID string) string {
	return strings.TrimSpace(deviceID)
}

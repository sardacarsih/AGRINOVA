package resolvers

import (
	"context"
	"sync"

	"agrinovagraphql/server/internal/graphql/domain/mandor"
)

type harvestSubscriberSet map[chan *mandor.HarvestRecord]struct{}

type harvestSubscriptionHub struct {
	mu       sync.RWMutex
	created  harvestSubscriberSet
	approved harvestSubscriberSet
	rejected harvestSubscriberSet
}

func newHarvestSubscriptionHub() *harvestSubscriptionHub {
	return &harvestSubscriptionHub{
		created:  make(harvestSubscriberSet),
		approved: make(harvestSubscriberSet),
		rejected: make(harvestSubscriberSet),
	}
}

var globalHarvestSubscriptionHub = newHarvestSubscriptionHub()

func subscribeHarvestRecordCreated(ctx context.Context) (<-chan *mandor.HarvestRecord, error) {
	return globalHarvestSubscriptionHub.subscribeCreated(ctx), nil
}

func subscribeHarvestRecordApproved(ctx context.Context) (<-chan *mandor.HarvestRecord, error) {
	return globalHarvestSubscriptionHub.subscribeApproved(ctx), nil
}

func subscribeHarvestRecordRejected(ctx context.Context) (<-chan *mandor.HarvestRecord, error) {
	return globalHarvestSubscriptionHub.subscribeRejected(ctx), nil
}

func publishHarvestRecordCreated(record *mandor.HarvestRecord) {
	globalHarvestSubscriptionHub.publishCreated(record)
}

func publishHarvestRecordApproved(record *mandor.HarvestRecord) {
	globalHarvestSubscriptionHub.publishApproved(record)
}

func publishHarvestRecordRejected(record *mandor.HarvestRecord) {
	globalHarvestSubscriptionHub.publishRejected(record)
}

func (h *harvestSubscriptionHub) subscribeCreated(ctx context.Context) <-chan *mandor.HarvestRecord {
	return h.subscribe(ctx, &h.created)
}

func (h *harvestSubscriptionHub) subscribeApproved(ctx context.Context) <-chan *mandor.HarvestRecord {
	return h.subscribe(ctx, &h.approved)
}

func (h *harvestSubscriptionHub) subscribeRejected(ctx context.Context) <-chan *mandor.HarvestRecord {
	return h.subscribe(ctx, &h.rejected)
}

func (h *harvestSubscriptionHub) subscribe(ctx context.Context, subscribers *harvestSubscriberSet) <-chan *mandor.HarvestRecord {
	ch := make(chan *mandor.HarvestRecord, 16)

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

func (h *harvestSubscriptionHub) publishCreated(record *mandor.HarvestRecord) {
	h.publish(record, h.created)
}

func (h *harvestSubscriptionHub) publishApproved(record *mandor.HarvestRecord) {
	h.publish(record, h.approved)
}

func (h *harvestSubscriptionHub) publishRejected(record *mandor.HarvestRecord) {
	h.publish(record, h.rejected)
}

func (h *harvestSubscriptionHub) publish(record *mandor.HarvestRecord, subscribers harvestSubscriberSet) {
	if record == nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for ch := range subscribers {
		select {
		case ch <- record:
		default:
			// Drop when subscriber is slow to keep mutation path non-blocking.
		}
	}
}

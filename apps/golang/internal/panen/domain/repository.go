package domain

import (
	"context"
)

// HarvestRepository defines the interface for harvest data persistence
type HarvestRepository interface {
	Create(ctx context.Context, record *HarvestRecord) error
	GetByID(ctx context.Context, id string) (*HarvestRecord, error)
	GetByLocalID(ctx context.Context, localID, mandorID string) (*HarvestRecord, error)
	Update(ctx context.Context, record *HarvestRecord) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, filters HarvestFilters) ([]*HarvestRecord, int64, error)
	GetStatistics(ctx context.Context, filters HarvestFilters) (*HarvestStatistics, error)
}

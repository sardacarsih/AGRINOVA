package resolvers

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"

	"agrinovagraphql/server/internal/graphql/domain/asisten"
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/mandor"
	"agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/internal/middleware"
	"agrinovagraphql/server/internal/panen/models"
	panenServices "agrinovagraphql/server/internal/panen/services"
)

type PanenResolver struct {
	db          *gorm.DB
	service     *panenServices.PanenService
	rbacService *middleware.AuthMiddleware
}

func NewPanenResolver(db *gorm.DB, authMiddleware *middleware.AuthMiddleware) *PanenResolver {
	return &PanenResolver{
		db:          db,
		service:     panenServices.NewPanenService(db),
		rbacService: authMiddleware,
	}
}

// WithDB returns a resolver clone that uses the provided DB handle.
// Useful for running resolver/service logic inside an existing transaction.
func (r *PanenResolver) WithDB(db *gorm.DB) *PanenResolver {
	if db == nil {
		return r
	}
	return &PanenResolver{
		db:          db,
		service:     panenServices.NewPanenService(db),
		rbacService: r.rbacService,
	}
}

// Query Resolvers

// HarvestRecords retrieves harvest records
func (r *PanenResolver) HarvestRecords(ctx context.Context, filters *models.HarvestFilters) ([]*models.HarvestRecord, error) {
	return r.service.GetHarvestRecords(ctx, filters)
}

// HarvestRecordsByMandor retrieves harvest records by mandor ID.
func (r *PanenResolver) HarvestRecordsByMandor(ctx context.Context, mandorID string, filters *models.HarvestFilters) ([]*models.HarvestRecord, error) {
	return r.service.GetHarvestRecordsByMandor(ctx, mandorID, filters)
}

// HarvestRecordsByManager retrieves harvest records scoped to manager hierarchy.
func (r *PanenResolver) HarvestRecordsByManager(ctx context.Context, managerID string, filters *models.HarvestFilters) ([]*models.HarvestRecord, error) {
	return r.service.GetHarvestRecordsByManager(ctx, managerID, filters)
}

// HarvestRecord retrieves a specific harvest record by ID
func (r *PanenResolver) HarvestRecord(ctx context.Context, id string) (*models.HarvestRecord, error) {
	return r.service.GetHarvestRecord(ctx, id)
}

// HarvestRecordByManager retrieves one harvest record if it belongs to manager hierarchy.
func (r *PanenResolver) HarvestRecordByManager(ctx context.Context, id, managerID string) (*models.HarvestRecord, error) {
	return r.service.GetHarvestRecordByIDForManager(ctx, id, managerID)
}

// HarvestRecordsByStatus retrieves harvest records filtered by status
func (r *PanenResolver) HarvestRecordsByStatus(ctx context.Context, status mandor.HarvestStatus) ([]*models.HarvestRecord, error) {
	return r.service.GetHarvestRecordsByStatus(ctx, status)
}

// HarvestRecordsByManagerAndStatus retrieves manager-scoped harvest records filtered by status.
func (r *PanenResolver) HarvestRecordsByManagerAndStatus(ctx context.Context, managerID string, status mandor.HarvestStatus) ([]*models.HarvestRecord, error) {
	return r.service.GetHarvestRecordsByManagerAndStatus(ctx, managerID, status)
}

// GetByLocalID retrieves a harvest record by local ID
func (r *PanenResolver) GetByLocalID(ctx context.Context, localID, mandorID string) (*models.HarvestRecord, error) {
	return r.service.GetByLocalID(ctx, localID, mandorID)
}

// Mutation Resolvers

// CreateHarvestRecord creates a new harvest record
func (r *PanenResolver) CreateHarvestRecord(ctx context.Context, input mandor.CreateHarvestRecordInput) (*models.HarvestRecord, error) {
	// RBAC Permission Check: Require harvest:create permission
	if r.rbacService != nil {
		if err := r.rbacService.ValidateHarvestAccess(ctx, "create"); err != nil {
			return nil, fmt.Errorf("access denied: %v", err)
		}
	}

	return r.service.CreateHarvestRecord(ctx, input)
}

// UpdateHarvestRecord updates an existing harvest record
func (r *PanenResolver) UpdateHarvestRecord(ctx context.Context, input mandor.UpdateHarvestRecordInput) (*models.HarvestRecord, error) {
	return r.service.UpdateHarvestRecord(ctx, input)
}

// ApproveHarvestRecord approves a harvest record
func (r *PanenResolver) ApproveHarvestRecord(ctx context.Context, input asisten.ApproveHarvestInput) (*models.HarvestRecord, error) {
	// RBAC Permission Check: Require harvest:approve permission
	if r.rbacService != nil {
		if err := r.rbacService.ValidateHarvestAccess(ctx, "approve"); err != nil {
			return nil, fmt.Errorf("access denied: %v", err)
		}
	}

	return r.service.ApproveHarvestRecord(ctx, input)
}

// RejectHarvestRecord rejects a harvest record with reason
func (r *PanenResolver) RejectHarvestRecord(ctx context.Context, input asisten.RejectHarvestInput) (*models.HarvestRecord, error) {
	// RBAC Permission Check: Require harvest:reject permission
	if r.rbacService != nil {
		if err := r.rbacService.ValidateHarvestAccess(ctx, "reject"); err != nil {
			return nil, fmt.Errorf("access denied: %v", err)
		}
	}

	return r.service.RejectHarvestRecord(ctx, input)
}

// DeleteHarvestRecord deletes a harvest record (soft delete)
func (r *PanenResolver) DeleteHarvestRecord(ctx context.Context, id string) (bool, error) {
	return r.service.DeleteHarvestRecord(ctx, id)
}

// Field Resolvers

// Mandor resolves the mandor field for HarvestRecord
func (r *PanenResolver) HarvestRecord_Mandor(ctx context.Context, obj *mandor.HarvestRecord) (*auth.User, error) {
	return obj.Mandor, nil
}

// Block resolves the block field for HarvestRecord
func (r *PanenResolver) HarvestRecord_Block(ctx context.Context, obj *mandor.HarvestRecord) (*master.Block, error) {
	return obj.Block, nil
}

// Subscription Resolvers

// HarvestRecordCreated handles subscription for newly created harvest records
func (r *PanenResolver) HarvestRecordCreated(ctx context.Context) (<-chan *models.HarvestRecord, error) {
	// Create a channel for the subscription
	ch := make(chan *models.HarvestRecord, 1)

	// In a real implementation, this would connect to a message broker
	// For now, we'll return an empty channel
	go func() {
		defer close(ch)
		// TODO: Implement real-time subscription logic
		// This could integrate with Redis, WebSocket, or other message brokers
		<-ctx.Done()
	}()

	return ch, nil
}

// HarvestRecordApproved handles subscription for approved harvest records
func (r *PanenResolver) HarvestRecordApproved(ctx context.Context) (<-chan *models.HarvestRecord, error) {
	ch := make(chan *models.HarvestRecord, 1)

	go func() {
		defer close(ch)
		// TODO: Implement real-time subscription logic for approved records
		<-ctx.Done()
	}()

	return ch, nil
}

// HarvestRecordRejected handles subscription for rejected harvest records
func (r *PanenResolver) HarvestRecordRejected(ctx context.Context) (<-chan *models.HarvestRecord, error) {
	ch := make(chan *models.HarvestRecord, 1)

	go func() {
		defer close(ch)
		// TODO: Implement real-time subscription logic for rejected records
		<-ctx.Done()
	}()

	return ch, nil
}

// GetHarvestRecordsByMandorSince retrieves harvest records by mandor ID updated since a given time
// Used for mobile sync to pull approval status updates
func (r *PanenResolver) GetHarvestRecordsByMandorSince(ctx context.Context, mandorID string, since time.Time) ([]*mandor.HarvestRecord, error) {
	return r.service.GetHarvestRecordsByMandorSince(ctx, mandorID, since)
}

// SaveHarvestRecord saves an existing harvest record (for conflict resolution updates)
func (r *PanenResolver) SaveHarvestRecord(ctx context.Context, record *models.HarvestRecord) error {
	return r.service.SaveHarvestRecord(ctx, record)
}

// GetMandorDashboardStats retrieves dashboard statistics for a mandor
func (r *PanenResolver) GetMandorDashboardStats(ctx context.Context, mandorID string) (*mandor.MandorDashboardStats, error) {
	return r.service.GetMandorDashboardStats(ctx, mandorID)
}

// GetMandorActivities retrieves recent activities for a mandor
func (r *PanenResolver) GetMandorActivities(ctx context.Context, mandorID string, limit int) ([]*mandor.MandorActivity, error) {
	return r.service.GetMandorActivities(ctx, mandorID, limit)
}

// GetMandorHistory retrieves paginated harvest history for a mandor
func (r *PanenResolver) GetMandorHistory(ctx context.Context, mandorID string, filter *mandor.MandorHistoryFilter) (*mandor.MandorHistoryResponse, error) {
	return r.service.GetMandorHistory(ctx, mandorID, filter)
}

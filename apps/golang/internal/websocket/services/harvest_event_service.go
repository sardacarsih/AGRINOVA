package services

import (
	"context"
	"time"

	"agrinovagraphql/server/internal/graphql/domain/asisten"
	"agrinovagraphql/server/internal/graphql/domain/mandor"
	panenModels "agrinovagraphql/server/internal/panen/models"
	panenServices "agrinovagraphql/server/internal/panen/services"
	"agrinovagraphql/server/internal/websocket/models"
)

// HarvestEventService wraps the panen service and adds event broadcasting
type HarvestEventService struct {
	panenService     *panenServices.PanenService
	eventBroadcaster *EventBroadcaster
}

// NewHarvestEventService creates a new harvest event service
func NewHarvestEventService(panenService *panenServices.PanenService, eventBroadcaster *EventBroadcaster) *HarvestEventService {
	return &HarvestEventService{
		panenService:     panenService,
		eventBroadcaster: eventBroadcaster,
	}
}

// CreateHarvestRecord creates a harvest record and broadcasts the event
func (s *HarvestEventService) CreateHarvestRecord(ctx context.Context, input mandor.CreateHarvestRecordInput) (*panenModels.HarvestRecord, error) {
	// Create the harvest record using the original service
	record, err := s.panenService.CreateHarvestRecord(ctx, input)
	if err != nil {
		return nil, err
	}

	// Convert to GraphQL model for broadcasting
	graphqlRecord := s.convertToGraphQLHarvestRecord(record)

	// Broadcast the event
	s.eventBroadcaster.OnHarvestRecordCreated(graphqlRecord)

	return record, nil
}

// ApproveHarvestRecord approves a harvest record and broadcasts the event
func (s *HarvestEventService) ApproveHarvestRecord(ctx context.Context, input asisten.ApproveHarvestInput) (*panenModels.HarvestRecord, error) {
	// Approve the harvest record using the original service
	record, err := s.panenService.ApproveHarvestRecord(ctx, input)
	if err != nil {
		return nil, err
	}

	// Convert to GraphQL model for broadcasting
	graphqlRecord := s.convertToGraphQLHarvestRecord(record)

	// Broadcast the event
	s.eventBroadcaster.OnHarvestRecordApproved(graphqlRecord)

	return record, nil
}

// RejectHarvestRecord rejects a harvest record and broadcasts the event
func (s *HarvestEventService) RejectHarvestRecord(ctx context.Context, input asisten.RejectHarvestInput) (*panenModels.HarvestRecord, error) {
	// Reject the harvest record using the original service
	record, err := s.panenService.RejectHarvestRecord(ctx, input)
	if err != nil {
		return nil, err
	}

	// Convert to GraphQL model for broadcasting
	graphqlRecord := s.convertToGraphQLHarvestRecord(record)

	// Broadcast the event
	s.eventBroadcaster.OnHarvestRecordRejected(graphqlRecord)

	return record, nil
}

// UpdateHarvestRecord updates a harvest record and broadcasts the event
func (s *HarvestEventService) UpdateHarvestRecord(ctx context.Context, input mandor.UpdateHarvestRecordInput) (*panenModels.HarvestRecord, error) {
	// Update the harvest record using the original service
	record, err := s.panenService.UpdateHarvestRecord(ctx, input)
	if err != nil {
		return nil, err
	}

	// Convert to GraphQL model for broadcasting
	graphqlRecord := s.convertToGraphQLHarvestRecord(record)

	// Broadcast a generic update event (could be more specific if needed)
	s.eventBroadcaster.wsHandler.BroadcastToChannel(models.ChannelHarvest, "harvestRecordUpdated", graphqlRecord)

	return record, nil
}

// DeleteHarvestRecord deletes a harvest record and broadcasts the event
func (s *HarvestEventService) DeleteHarvestRecord(ctx context.Context, id string) (bool, error) {
	// Get the record before deletion for broadcasting
	record, err := s.panenService.GetHarvestRecord(ctx, id)
	if err != nil {
		return false, err
	}

	// Delete the harvest record using the original service
	success, err := s.panenService.DeleteHarvestRecord(ctx, id)
	if err != nil {
		return false, err
	}

	if success {
		// Convert to GraphQL model for broadcasting
		graphqlRecord := s.convertToGraphQLHarvestRecord(record)

		// Broadcast deletion event
		s.eventBroadcaster.wsHandler.BroadcastToChannel(models.ChannelHarvest, "harvestRecordDeleted", graphqlRecord)
	}

	return success, nil
}

// Delegate other methods to the original service

// GetHarvestRecords delegates to the original service
func (s *HarvestEventService) GetHarvestRecords(ctx context.Context) ([]*panenModels.HarvestRecord, error) {
	return s.panenService.GetHarvestRecords(ctx, nil)
}

// GetHarvestRecord delegates to the original service
func (s *HarvestEventService) GetHarvestRecord(ctx context.Context, id string) (*panenModels.HarvestRecord, error) {
	return s.panenService.GetHarvestRecord(ctx, id)
}

// GetHarvestRecordsByStatus delegates to the original service
func (s *HarvestEventService) GetHarvestRecordsByStatus(ctx context.Context, status mandor.HarvestStatus) ([]*panenModels.HarvestRecord, error) {
	return s.panenService.GetHarvestRecordsByStatus(ctx, status)
}

// convertToGraphQLHarvestRecord converts internal model to GraphQL model
func (s *HarvestEventService) convertToGraphQLHarvestRecord(record *panenModels.HarvestRecord) *mandor.HarvestRecord {
	// This is a simplified conversion - in practice, you would implement proper mapping
	// based on your actual model structures

	// Convert timestamps
	var approvedAt *time.Time
	if record.ApprovedAt != nil {
		approvedAt = record.ApprovedAt
	}

	return &mandor.HarvestRecord{
		ID:             record.ID,
		Tanggal:        record.Tanggal,
		MandorID:       record.MandorID,
		BlockID:        record.BlockID,
		Karyawan:       harvestWorkerLabel(record.Karyawan, record.Nik, record.KaryawanID),
		BeratTbs:       record.BeratTbs,
		JumlahJanjang:  record.JumlahJanjang,
		Status:         mandor.HarvestStatus(record.Status),
		ApprovedBy:     record.ApprovedBy,
		ApprovedAt:     approvedAt,
		RejectedReason: record.RejectedReason,
		CreatedAt:      record.CreatedAt,
		UpdatedAt:      record.UpdatedAt,
		// Note: Relations like Mandor and Block would need to be populated separately
		// based on your database loading strategy
	}
}

func harvestWorkerLabel(karyawan string, nik *string, karyawanID *string) string {
	if karyawan != "" {
		return karyawan
	}
	if nik != nil && *nik != "" {
		return *nik
	}
	if karyawanID != nil && *karyawanID != "" {
		return *karyawanID
	}
	return ""
}

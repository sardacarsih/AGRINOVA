package service

import (
	"context"
	"time"

	"agrinovagraphql/server/internal/panen/application"
	"agrinovagraphql/server/internal/panen/domain"
)

// HarvestService defines the application service for harvest operations
type HarvestService struct {
	repo domain.HarvestRepository
	// In a real scenario, we would inject other services/repos here for validation (e.g., UserRepo, BlockRepo)
}

// GetByLocalID retrieves a harvest record by local ID (for idempotency checks)
func (s *HarvestService) GetByLocalID(ctx context.Context, localID, mandorID string) (*application.HarvestResponse, error) {
	record, err := s.repo.GetByLocalID(ctx, localID, mandorID)
	if err != nil {
		return nil, err
	}
	return application.FromDomain(record), nil
}

// NewHarvestService creates a new HarvestService
func NewHarvestService(repo domain.HarvestRepository) *HarvestService {
	return &HarvestService{
		repo: repo,
	}
}

// CreateHarvest creates a new harvest record
func (s *HarvestService) CreateHarvest(ctx context.Context, req application.CreateHarvestRequest) (*application.HarvestResponse, error) {
	// TODO: Validate MandorID and BlockID against their respective services/repositories

	record := &domain.HarvestRecord{
		LocalID:       req.LocalID,
		Tanggal:       req.Tanggal,
		MandorID:      req.MandorID,
		BlockID:       req.BlockID,
		Karyawan:      req.Karyawan,
		BeratTbs:      req.BeratTbs,
		JumlahJanjang: req.JumlahJanjang,
		Status:        domain.HarvestStatusPending,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := s.repo.Create(ctx, record); err != nil {
		return nil, err
	}

	return application.FromDomain(record), nil
}

// GetHarvestByID retrieves a harvest record by ID
func (s *HarvestService) GetHarvestByID(ctx context.Context, id string) (*application.HarvestResponse, error) {
	record, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return application.FromDomain(record), nil
}

// UpdateHarvest updates an existing harvest record
func (s *HarvestService) UpdateHarvest(ctx context.Context, req application.UpdateHarvestRequest) (*application.HarvestResponse, error) {
	record, err := s.repo.GetByID(ctx, req.ID)
	if err != nil {
		return nil, err
	}

	// Business Rule: Cannot modify if already approved
	if record.Status == domain.HarvestStatusApproved {
		return nil, domain.NewAppError(domain.ErrCannotModifyApproved, "Cannot modify approved record", "status")
	}

	if req.BeratTbs != nil {
		record.BeratTbs = *req.BeratTbs
	}
	if req.JumlahJanjang != nil {
		record.JumlahJanjang = *req.JumlahJanjang
	}
	if req.Karyawan != nil {
		record.Karyawan = *req.Karyawan
	}
	record.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, record); err != nil {
		return nil, err
	}

	return application.FromDomain(record), nil
}

// ApproveHarvest approves a harvest record
func (s *HarvestService) ApproveHarvest(ctx context.Context, req application.ApproveHarvestRequest) (*application.HarvestResponse, error) {
	record, err := s.repo.GetByID(ctx, req.ID)
	if err != nil {
		return nil, err
	}

	if record.Status == domain.HarvestStatusApproved {
		return nil, domain.NewAppError(domain.ErrHarvestAlreadyApproved, "Harvest already approved", "status")
	}

	record.Status = domain.HarvestStatusApproved
	record.ApprovedBy = &req.ApprovedBy
	record.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, record); err != nil {
		return nil, err
	}

	return application.FromDomain(record), nil
}

// RejectHarvest rejects a harvest record
func (s *HarvestService) RejectHarvest(ctx context.Context, req application.RejectHarvestRequest) (*application.HarvestResponse, error) {
	record, err := s.repo.GetByID(ctx, req.ID)
	if err != nil {
		return nil, err
	}

	if record.Status == domain.HarvestStatusRejected {
		return nil, domain.NewAppError(domain.ErrHarvestAlreadyRejected, "Harvest already rejected", "status")
	}

	record.Status = domain.HarvestStatusRejected
	record.RejectedReason = &req.RejectedReason
	record.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, record); err != nil {
		return nil, err
	}

	return application.FromDomain(record), nil
}

// ListHarvests retrieves a list of harvest records
func (s *HarvestService) ListHarvests(ctx context.Context, filters domain.HarvestFilters) ([]*application.HarvestResponse, int64, error) {
	records, total, err := s.repo.List(ctx, filters)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]*application.HarvestResponse, len(records))
	for i, r := range records {
		responses[i] = application.FromDomain(r)
	}

	return responses, total, nil
}

// GetStatistics retrieves harvest statistics
func (s *HarvestService) GetStatistics(ctx context.Context, filters domain.HarvestFilters) (*domain.HarvestStatistics, error) {
	return s.repo.GetStatistics(ctx, filters)
}

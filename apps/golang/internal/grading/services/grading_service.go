package services

import (
	"agrinovagraphql/server/internal/graphql/generated"
	"agrinovagraphql/server/internal/grading/models"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type GradingService struct {
	db *gorm.DB
}

func NewGradingService(db *gorm.DB) *GradingService {
	return &GradingService{
		db: db,
	}
}

func (s *GradingService) CreateGradingRecord(ctx context.Context, input generated.CreateGradingRecordInput) (*models.GradingRecord, error) {
	// Convert input to model
	grading := &models.GradingRecord{
		HarvestRecordID:      input.HarvestRecordID,
		GraderID:             getCurrentUserID(ctx),
		QualityScore:         int(input.QualityScore),
		MaturityLevel:        input.MaturityLevel,
		BrondolanPercentage:  input.BrondolanPercentage,
		LooseFruitPercentage: input.LooseFruitPercentage,
		DirtPercentage:       input.DirtPercentage,
		GradingNotes:         input.GradingNotes,
		GradingDate:          input.GradingDate,
		IsApproved:           false,
	}

	// Save to database
	if err := s.db.Create(grading).Error; err != nil {
		return nil, fmt.Errorf("failed to create grading record: %w", err)
	}

	// Load relationships
	if err := s.loadRelationships(ctx, grading); err != nil {
		return nil, err
	}

	return grading, nil
}

func (s *GradingService) UpdateGradingRecord(ctx context.Context, id string, input generated.UpdateGradingRecordInput) (*models.GradingRecord, error) {
	var grading models.GradingRecord

	// Find existing record
	if err := s.db.First(&grading, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("grading record not found")
		}
		return nil, fmt.Errorf("failed to find grading record: %w", err)
	}

	// Check if user can update this record (not approved yet)
	if grading.IsApproved {
		return nil, fmt.Errorf("cannot update approved grading record")
	}

	// Update fields
	if input.QualityScore != nil {
		grading.QualityScore = int(*input.QualityScore)
	}
	if input.MaturityLevel != nil {
		grading.MaturityLevel = *input.MaturityLevel
	}
	if input.BrondolanPercentage != nil {
		grading.BrondolanPercentage = *input.BrondolanPercentage
	}
	if input.LooseFruitPercentage != nil {
		grading.LooseFruitPercentage = *input.LooseFruitPercentage
	}
	if input.DirtPercentage != nil {
		grading.DirtPercentage = *input.DirtPercentage
	}
	if input.GradingNotes != nil {
		grading.GradingNotes = input.GradingNotes
	}

	// Save changes
	if err := s.db.Save(&grading).Error; err != nil {
		return nil, fmt.Errorf("failed to update grading record: %w", err)
	}

	// Load relationships
	if err := s.loadRelationships(ctx, &grading); err != nil {
		return nil, err
	}

	return &grading, nil
}

func (s *GradingService) ApproveGrading(ctx context.Context, id string, input generated.GradingApprovalInput) (*models.GradingRecord, error) {
	var grading models.GradingRecord

	// Find existing record
	if err := s.db.First(&grading, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("grading record not found")
		}
		return nil, fmt.Errorf("failed to find grading record: %w", err)
	}

	// Check if already approved
	if grading.IsApproved {
		return nil, fmt.Errorf("grading record already processed")
	}

	// Update approval status
	grading.IsApproved = input.Approved
	currentUserID := getCurrentUserID(ctx)
	grading.ApprovedBy = &currentUserID
	now := time.Now()
	grading.ApprovedAt = &now

	if !input.Approved && input.RejectionReason != nil {
		grading.RejectionReason = input.RejectionReason
	}

	// Save changes
	if err := s.db.Save(&grading).Error; err != nil {
		return nil, fmt.Errorf("failed to approve grading record: %w", err)
	}

	// Load relationships
	if err := s.loadRelationships(ctx, &grading); err != nil {
		return nil, err
	}

	return &grading, nil
}

func (s *GradingService) RejectGrading(ctx context.Context, id string, input generated.GradingApprovalInput) (*models.GradingRecord, error) {
	// For rejection, we call approve with approved=false
	input.Approved = false
	return s.ApproveGrading(ctx, id, input)
}

func (s *GradingService) ListGradingRecords(ctx context.Context) ([]*models.GradingRecord, error) {
	var gradings []*models.GradingRecord

	// Apply RLS filtering based on user context
	query := s.db.WithContext(ctx)

	// If not super admin, filter by user's assigned companies/estates
	if !isSuperAdmin(ctx) {
		query = applyRLSFilters(ctx, query)
	}

	if err := query.Find(&gradings).Error; err != nil {
		return nil, fmt.Errorf("failed to list grading records: %w", err)
	}

	// Load relationships for each record
	for _, grading := range gradings {
		if err := s.loadRelationships(ctx, grading); err != nil {
			return nil, err
		}
	}

	return gradings, nil
}

func (s *GradingService) GetGradingRecord(ctx context.Context, id string) (*models.GradingRecord, error) {
	var grading models.GradingRecord

	// Apply RLS filtering
	query := s.db.WithContext(ctx)
	if !isSuperAdmin(ctx) {
		query = applyRLSFilters(ctx, query)
	}

	if err := query.First(&grading, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("grading record not found")
		}
		return nil, fmt.Errorf("failed to get grading record: %w", err)
	}

	// Load relationships
	if err := s.loadRelationships(ctx, &grading); err != nil {
		return nil, err
	}

	return &grading, nil
}

func (s *GradingService) GetGradingRecordsByHarvest(ctx context.Context, harvestRecordId string) ([]*models.GradingRecord, error) {
	var gradings []*models.GradingRecord

	// Apply RLS filtering
	query := s.db.WithContext(ctx).Where("harvest_record_id = ?", harvestRecordId)
	if !isSuperAdmin(ctx) {
		query = applyRLSFilters(ctx, query)
	}

	if err := query.Find(&gradings).Error; err != nil {
		return nil, fmt.Errorf("failed to get grading records by harvest: %w", err)
	}

	// Load relationships for each record
	for _, grading := range gradings {
		if err := s.loadRelationships(ctx, grading); err != nil {
			return nil, err
		}
	}

	return gradings, nil
}

func (s *GradingService) GetPendingApprovals(ctx context.Context) ([]*models.GradingRecord, error) {
	var gradings []*models.GradingRecord

	// Apply RLS filtering
	query := s.db.WithContext(ctx).Where("is_approved = ?", false)
	if !isSuperAdmin(ctx) {
		query = applyRLSFilters(ctx, query)
	}

	if err := query.Find(&gradings).Error; err != nil {
		return nil, fmt.Errorf("failed to get pending approvals: %w", err)
	}

	// Load relationships for each record
	for _, grading := range gradings {
		if err := s.loadRelationships(ctx, grading); err != nil {
			return nil, err
		}
	}

	return gradings, nil
}

func (s *GradingService) SubscribeToGradingUpdates(ctx context.Context) (<-chan *models.GradingRecord, error) {
	// TODO: Implement WebSocket subscription for grading updates
	// This will be implemented when we add WebSocket support for grading
	ch := make(chan *models.GradingRecord)
	return ch, nil
}

func (s *GradingService) SubscribeToGradingApprovals(ctx context.Context) (<-chan *models.GradingRecord, error) {
	// TODO: Implement WebSocket subscription for grading approvals
	// This will be implemented when we add WebSocket support for grading
	ch := make(chan *models.GradingRecord)
	return ch, nil
}

func (s *GradingService) SubscribeToGradingRejections(ctx context.Context) (<-chan *models.GradingRecord, error) {
	// TODO: Implement WebSocket subscription for grading rejections
	// This will be implemented when we add WebSocket support for grading
	ch := make(chan *models.GradingRecord)
	return ch, nil
}

// Helper functions

func (s *GradingService) loadRelationships(ctx context.Context, grading *models.GradingRecord) error {
	// TODO: Implement manual relationship loading to avoid circular imports
	// For now, relationships will be loaded by GraphQL resolvers
	// This is a placeholder to prevent compilation errors
	return nil
}

// Context helper functions (these should be imported from auth package)
func getCurrentUserID(ctx context.Context) string {
	if userID, ok := ctx.Value("user_id").(string); ok {
		return userID
	}
	return ""
}

func isSuperAdmin(ctx context.Context) bool {
	if role, ok := ctx.Value("user_role").(string); ok {
		return role == "SUPER_ADMIN"
	}
	return false
}

func applyRLSFilters(ctx context.Context, query *gorm.DB) *gorm.DB {
	// TODO: Implement RLS filtering logic based on user's assignments
	// This should filter by companies/estates/divisions assigned to the user
	return query
}
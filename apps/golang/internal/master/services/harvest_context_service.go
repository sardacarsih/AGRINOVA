package services

import (
	"context"
	"fmt"
	"time"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/internal/master/models"
)

// ============================================================================
// Smart Progressive Loading Service Methods
// ============================================================================

// GetHarvestContext provides optimized harvest context with role-based defaults
func (s *masterService) GetHarvestContext(ctx context.Context, userID string) (*models.HarvestContext, error) {
	// Get user to determine role
	user, err := s.getUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Build assignment summary
	assignmentSummary, err := s.getAssignmentSummary(ctx, userID, user.Role)
	if err != nil {
		return nil, err
	}

	// Get recent blocks (last 7 days)
	recentBlocks, err := s.GetRecentBlocksByUser(ctx, userID, 7)
	if err != nil {
		// Log error but don't fail the request
		recentBlocks = []*models.BlockWithStats{}
	}

	// Auto-load blocks for Mandor with single division
	var defaultBlocks []*models.Block
	if user.Role == auth.UserRoleMandor && assignmentSummary.TotalDivisions == 1 && assignmentSummary.PrimaryDivisionID != nil {
		filters := &models.BlockFilters{
			DivisionID:      *assignmentSummary.PrimaryDivisionID,
			IncludeInactive: false,
			Limit:           100,
			Offset:          0,
			SortBy:          "alphabetical",
		}
		blocksPage, err := s.GetBlocksByDivisionPaginated(ctx, filters, userID)
		if err == nil {
			defaultBlocks = blocksPage.Blocks
		} else {
			defaultBlocks = []*models.Block{}
		}
	} else {
		defaultBlocks = []*models.Block{}
	}

	return &models.HarvestContext{
		AssignmentSummary:     assignmentSummary,
		RecentBlocks:          recentBlocks,
		DefaultDivisionBlocks: defaultBlocks,
	}, nil
}

// getAssignmentSummary builds assignment summary for a user
func (s *masterService) getAssignmentSummary(ctx context.Context, userID string, role auth.UserRole) (*models.AssignmentSummary, error) {
	summary := &models.AssignmentSummary{
		TotalEstates:   0,
		TotalDivisions: 0,
		TotalBlocks:    0,
	}

	// Count estates
	var estateCount int64
	if err := s.repo.GetDB().WithContext(ctx).
		Table("user_estate_assignments").
		Where("user_id = ? AND is_active = true", userID).
		Count(&estateCount).Error; err != nil {
		return nil, fmt.Errorf("failed to count estates: %w", err)
	}
	summary.TotalEstates = int32(estateCount)

	// Count divisions and get primary division for Mandor
	divisionAssignments, err := s.repo.GetUserDivisionAssignments(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get division assignments: %w", err)
	}

	activeDivisions := 0
	var primaryDivisionID *string
	for _, assignment := range divisionAssignments {
		if assignment.IsActive {
			activeDivisions++
			if primaryDivisionID == nil {
				primaryDivisionID = &assignment.DivisionID
			}
		}
	}
	summary.TotalDivisions = int32(activeDivisions)

	// Set primary division for Mandor with single assignment
	if role == auth.UserRoleMandor && activeDivisions == 1 {
		summary.PrimaryDivisionID = primaryDivisionID
	}

	// Count blocks accessible to user
	var blockCount int64
	if activeDivisions > 0 {
		divisionIDs := make([]string, 0, activeDivisions)
		for _, assignment := range divisionAssignments {
			if assignment.IsActive {
				divisionIDs = append(divisionIDs, assignment.DivisionID)
			}
		}

		if err := s.repo.GetDB().WithContext(ctx).
			Table("blocks").
			Where("division_id IN (?) AND deleted_at IS NULL", divisionIDs).
			Count(&blockCount).Error; err != nil {
			return nil, fmt.Errorf("failed to count blocks: %w", err)
		}
	}
	summary.TotalBlocks = int32(blockCount)

	return summary, nil
}

// GetRecentBlocksByUser returns blocks recently used by a user
func (s *masterService) GetRecentBlocksByUser(ctx context.Context, userID string, days int) ([]*models.BlockWithStats, error) {
	// Validate user access
	user, err := s.getUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Query recent harvest records with block info
	type BlockStats struct {
		BlockID         string
		KodeBlok        string
		Nama            string
		DivisionID      string
		DivisionNama    string
		EstateID        string
		LastHarvestDate time.Time
		HarvestCount    int32
	}

	var stats []BlockStats
	cutoffDate := time.Now().AddDate(0, 0, -days)

	query := s.repo.GetDB().WithContext(ctx).
		Table("harvest_records hr").
		Select(`
			b.id as block_id,
			b.block_code as kode_blok,
			b.name as nama,
			d.id as division_id,
			d.name as division_nama,
			d.estate_id,
			MAX(hr.tanggal) as last_harvest_date,
			COUNT(hr.id) as harvest_count
		`).
		Joins("JOIN blocks b ON hr.block_id = b.id").
		Joins("JOIN divisions d ON b.division_id = d.id").
		Where("hr.mandor_id = ? AND hr.tanggal >= ? AND b.deleted_at IS NULL", userID, cutoffDate).
		Group("b.id, b.block_code, b.name, d.id, d.name, d.estate_id").
		Order("last_harvest_date DESC").
		Limit(10)

	if err := query.Scan(&stats).Error; err != nil {
		return nil, fmt.Errorf("failed to get recent blocks: %w", err)
	}

	// Convert to BlockWithStats
	results := make([]*models.BlockWithStats, len(stats))
	for i, stat := range stats {
		results[i] = &models.BlockWithStats{
			ID:       stat.BlockID,
			KodeBlok: stat.KodeBlok,
			Nama:     stat.Nama,
			Division: &models.Division{
				ID:       stat.DivisionID,
				Name:     stat.DivisionNama,
				EstateID: stat.EstateID,
			},
			LastHarvestDate: &stat.LastHarvestDate,
			HarvestCount:    stat.HarvestCount,
		}
	}

	// If user is not Mandor, return empty array (only Mandor has harvest records)
	if user.Role != auth.UserRoleMandor {
		return []*models.BlockWithStats{}, nil
	}

	return results, nil
}

// GetBlocksByDivisionPaginated provides paginated block loading with search and filters
func (s *masterService) GetBlocksByDivisionPaginated(
	ctx context.Context,
	filters *models.BlockFilters,
	userID string,
) (*models.BlocksPage, error) {
	// Validate division access
	if err := s.ValidateDivisionAccess(ctx, userID, filters.DivisionID); err != nil {
		return nil, err
	}

	// Build base query
	query := s.repo.GetDB().WithContext(ctx).
		Table("blocks").
		Where("division_id = ? AND deleted_at IS NULL", filters.DivisionID)

	// Apply status filter
	if !filters.IncludeInactive {
		query = query.Where("is_active = ?", true)
	}

	// Apply search filter (full-text search on block_code and name)
	if filters.Search != "" {
		searchTerm := "%" + filters.Search + "%"
		query = query.Where("(block_code LIKE ? OR name LIKE ?)", searchTerm, searchTerm)
	}

	// Get total count
	var totalCount int64
	if err := query.Count(&totalCount).Error; err != nil {
		return nil, fmt.Errorf("failed to count blocks: %w", err)
	}

	// Apply sorting
	switch filters.SortBy {
	case "recent":
		query = query.Order("updated_at DESC")
	case "size":
		query = query.Order("area_ha DESC NULLS LAST")
	default: // "alphabetical"
		query = query.Order("block_code ASC")
	}

	// Apply pagination
	query = query.Limit(int(filters.Limit)).Offset(int(filters.Offset))

	// Execute query with preloading
	var blocks []master.Block
	if err := query.
		Preload("Division").
		Preload("Division.Estate").
		Find(&blocks).Error; err != nil {
		return nil, fmt.Errorf("failed to get blocks: %w", err)
	}

	// Convert to models.Block
	results := make([]*models.Block, len(blocks))
	for i, block := range blocks {
		results[i] = s.convertGORMBlockToModel(&block)
	}

	// Calculate hasMore
	hasMore := (filters.Offset + filters.Limit) < int32(totalCount)

	return &models.BlocksPage{
		Blocks:     results,
		TotalCount: int32(totalCount),
		HasMore:    hasMore,
	}, nil
}

// convertGORMBlockToModel converts GORM block model to models.Block
func (s *masterService) convertGORMBlockToModel(gormBlock *master.Block) *models.Block {
	block := &models.Block{
		ID:           gormBlock.ID,
		BlockCode:    gormBlock.BlockCode,
		Name:         gormBlock.Name,
		LuasHa:       gormBlock.LuasHa,
		CropType:     gormBlock.CropType,
		PlantingYear: gormBlock.PlantingYear,
		DivisionID:   gormBlock.DivisionID,
		CreatedAt:    gormBlock.CreatedAt,
		UpdatedAt:    gormBlock.UpdatedAt,
	}

	// Convert division if preloaded
	if gormBlock.Division != nil {
		block.Division = &models.Division{
			ID:       gormBlock.Division.ID,
			Name:     gormBlock.Division.Name,
			Code:     gormBlock.Division.Code,
			EstateID: gormBlock.Division.EstateID,
		}

		// Convert estate if preloaded
		if gormBlock.Division.Estate != nil {
			block.Division.Estate = &models.Estate{
				ID:   gormBlock.Division.Estate.ID,
				Name: gormBlock.Division.Estate.Name,
				// Lokasi:    gormBlock.Division.Estate.Lokasi, // Field doesn't exist
				// LuasHa:    gormBlock.Division.Estate.LuasHa, // Field doesn't exist
				CompanyID: gormBlock.Division.Estate.CompanyID,
			}
		}
	}

	return block
}

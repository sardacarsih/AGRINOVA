package postgres

import (
	"context"

	"agrinovagraphql/server/internal/auth/features/shared/domain"

	"gorm.io/gorm"
)

// AssignmentRepository implements domain.AssignmentRepository for PostgreSQL
type AssignmentRepository struct {
	db *gorm.DB
}

// NewAssignmentRepository creates new PostgreSQL assignment repository
func NewAssignmentRepository(db *gorm.DB) *AssignmentRepository {
	return &AssignmentRepository{db: db}
}

// FindByUserID finds all assignments for a user
func (r *AssignmentRepository) FindByUserID(ctx context.Context, userID string) ([]*domain.Assignment, error) {
	var domainAssignments []*domain.Assignment

	// 1. Fetch Company Assignments
	var companyAssignments []UserCompanyAssignmentModel
	if err := r.db.WithContext(ctx).
		Preload("Company").
		Where("user_id = ? AND is_active = true", userID).
		Find(&companyAssignments).Error; err != nil {
		return nil, err
	}

	for _, ca := range companyAssignments {
		assign := &domain.Assignment{
			ID:         ca.ID,
			UserID:     ca.UserID,
			CompanyID:  ca.CompanyID,
			IsActive:   ca.IsActive,
			AssignedBy: ca.AssignedBy,
			CreatedAt:  ca.CreatedAt,
			UpdatedAt:  ca.UpdatedAt,
		}
		if ca.Company != nil {
			assign.Company = &domain.Company{
				ID:      ca.Company.ID,
				Name:    ca.Company.Name,
				LogoURL: ca.Company.LogoURL,
				Status:  ca.Company.Status,
				Address: ca.Company.Address,
				Phone:   ca.Company.Phone,
			}
		}
		domainAssignments = append(domainAssignments, assign)
	}

	// 2. Fetch Estate Assignments
	var estateAssignments []UserEstateAssignmentModel
	if err := r.db.WithContext(ctx).
		Preload("Estate").
		Where("user_id = ? AND is_active = true", userID).
		Find(&estateAssignments).Error; err != nil {
		return nil, err
	}

	for _, ea := range estateAssignments {
		assign := &domain.Assignment{
			ID:         ea.ID,
			UserID:     ea.UserID,
			EstateID:   &ea.EstateID,
			IsActive:   ea.IsActive,
			AssignedBy: ea.AssignedBy,
			CreatedAt:  ea.CreatedAt,
			UpdatedAt:  ea.UpdatedAt,
		}
		if ea.Estate != nil {
			assign.Estate = &domain.Estate{
				ID:        ea.Estate.ID,
				CompanyID: ea.Estate.CompanyID,
				Name:      ea.Estate.Name,
				Code:      ea.Estate.Code,
				IsActive:  ea.Estate.IsActive,
			}
			assign.CompanyID = ea.Estate.CompanyID
		}
		domainAssignments = append(domainAssignments, assign)
	}

	// 3. Fetch Division Assignments
	var divisionAssignments []UserDivisionAssignmentModel
	if err := r.db.WithContext(ctx).
		Preload("Division").
		Preload("Division.Company"). // Load company through division
		Preload("Division.Estate").  // Also load the estate through division
		Where("user_id = ? AND is_active = true", userID).
		Find(&divisionAssignments).Error; err != nil {
		return nil, err
	}

	for _, da := range divisionAssignments {
		assign := &domain.Assignment{
			ID:         da.ID,
			UserID:     da.UserID,
			DivisionID: &da.DivisionID,
			IsActive:   da.IsActive,
			AssignedBy: da.AssignedBy,
			CreatedAt:  da.CreatedAt,
			UpdatedAt:  da.UpdatedAt,
		}
		if da.Division != nil {
			assign.Division = &domain.Division{
				ID:        da.Division.ID,
				CompanyID: da.Division.CompanyID,
				EstateID:  da.Division.EstateID,
				Name:      da.Division.Name,
				Code:      da.Division.Code,
				IsActive:  da.Division.IsActive,
			}
			assign.CompanyID = da.Division.CompanyID
			if da.Division.EstateID != nil {
				assign.EstateID = da.Division.EstateID
			}
			// Load the Company from the Division
			if da.Division.Company != nil {
				assign.Company = &domain.Company{
					ID:      da.Division.Company.ID,
					Name:    da.Division.Company.Name,
					LogoURL: da.Division.Company.LogoURL,
					Status:  da.Division.Company.Status,
					Address: da.Division.Company.Address,
					Phone:   da.Division.Company.Phone,
				}
			}
			// Also load the Estate from the Division
			if da.Division.Estate != nil {
				assign.Estate = &domain.Estate{
					ID:        da.Division.Estate.ID,
					CompanyID: da.Division.Estate.CompanyID,
					Name:      da.Division.Estate.Name,
					Code:      da.Division.Estate.Code,
					IsActive:  da.Division.Estate.IsActive,
				}
			}
		}
		domainAssignments = append(domainAssignments, assign)
	}

	return domainAssignments, nil
}

// FindByUserAndCompany finds assignments for user in specific company
func (r *AssignmentRepository) FindByUserAndCompany(ctx context.Context, userID, companyID string) ([]*domain.Assignment, error) {
	// Reusing FindByUserID and filtering for simplicity, or implement specific query
	all, err := r.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	var filtered []*domain.Assignment
	for _, a := range all {
		if a.CompanyID == companyID {
			filtered = append(filtered, a)
		}
	}
	return filtered, nil
}

// FindByUserAndEstate finds assignments for user in specific estate
func (r *AssignmentRepository) FindByUserAndEstate(ctx context.Context, userID, estateID string) ([]*domain.Assignment, error) {
	// Reusing FindByUserID and filtering
	all, err := r.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	var filtered []*domain.Assignment
	for _, a := range all {
		if a.EstateID != nil && *a.EstateID == estateID {
			filtered = append(filtered, a)
		}
	}
	return filtered, nil
}

// FindWithDetails finds assignments with all related details
func (r *AssignmentRepository) FindWithDetails(ctx context.Context, userID string) ([]*domain.Assignment, error) {
	return r.FindByUserID(ctx, userID)
}

// FindActiveAssignments finds all active assignments for a user
func (r *AssignmentRepository) FindActiveAssignments(ctx context.Context, userID string) ([]*domain.Assignment, error) {
	return r.FindByUserID(ctx, userID)
}

// CreateAssignment creates a new assignment
func (r *AssignmentRepository) CreateAssignment(ctx context.Context, assignment *domain.Assignment) error {
	// Not implemented for split tables yet
	return nil
}

// UpdateAssignment updates an existing assignment
func (r *AssignmentRepository) UpdateAssignment(ctx context.Context, assignment *domain.Assignment) error {
	// Not implemented for split tables yet
	return nil
}

// RevokeAssignment deactivates an assignment
func (r *AssignmentRepository) RevokeAssignment(ctx context.Context, assignmentID string) error {
	// Try revoking in all 3 tables

	res := r.db.WithContext(ctx).Model(&UserCompanyAssignmentModel{}).Where("id = ?", assignmentID).Update("is_active", false)
	if res.Error == nil && res.RowsAffected > 0 {
		return nil
	}

	res = r.db.WithContext(ctx).Model(&UserEstateAssignmentModel{}).Where("id = ?", assignmentID).Update("is_active", false)
	if res.Error == nil && res.RowsAffected > 0 {
		return nil
	}

	res = r.db.WithContext(ctx).Model(&UserDivisionAssignmentModel{}).Where("id = ?", assignmentID).Update("is_active", false)
	if res.Error == nil && res.RowsAffected > 0 {
		return nil
	}

	return nil // If id not found, consider it revoked or no-op
}

package postgres

import (
	"context"

	"agrinovagraphql/server/internal/auth/features/shared/domain"

	"gorm.io/gorm"
)

// DivisionRepository implements domain.DivisionRepository for PostgreSQL
type DivisionRepository struct {
	db *gorm.DB
}

// NewDivisionRepository creates new PostgreSQL division repository
func NewDivisionRepository(db *gorm.DB) *DivisionRepository {
	return &DivisionRepository{db: db}
}

// FindByID finds division by ID
func (r *DivisionRepository) FindByID(ctx context.Context, id string) (*domain.Division, error) {
	var division DivisionModel
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&division).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.toDomainDivision(&division), nil
}

// FindByEstate finds all divisions for an estate
func (r *DivisionRepository) FindByEstate(ctx context.Context, estateID string) ([]*domain.Division, error) {
	var divisions []DivisionModel
	err := r.db.WithContext(ctx).
		Where("estate_id = ? AND deleted_at IS NULL", estateID).
		Order("name").
		Find(&divisions).Error

	if err != nil {
		return nil, err
	}

	return r.toDomainDivisions(divisions), nil
}

// FindByCompany finds all divisions for a company
func (r *DivisionRepository) FindByCompany(ctx context.Context, companyID string) ([]*domain.Division, error) {
	var divisions []DivisionModel
	err := r.db.WithContext(ctx).
		Where("company_id = ? AND deleted_at IS NULL", companyID).
		Order("name").
		Find(&divisions).Error

	if err != nil {
		return nil, err
	}

	return r.toDomainDivisions(divisions), nil
}

// FindByKode finds division by code
func (r *DivisionRepository) FindByKode(ctx context.Context, kode string) (*domain.Division, error) {
	var division DivisionModel
	err := r.db.WithContext(ctx).
		Where("code = ? AND deleted_at IS NULL", kode).
		First(&division).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.toDomainDivision(&division), nil
}

// FindActive finds active divisions for an estate
func (r *DivisionRepository) FindActive(ctx context.Context, estateID string) ([]*domain.Division, error) {
	var divisions []DivisionModel
	err := r.db.WithContext(ctx).
		Where("estate_id = ? AND is_active = true AND deleted_at IS NULL", estateID).
		Order("name").
		Find(&divisions).Error

	if err != nil {
		return nil, err
	}

	return r.toDomainDivisions(divisions), nil
}

// Helper methods

func (r *DivisionRepository) toDomainDivisions(divisions []DivisionModel) []*domain.Division {
	domainDivisions := make([]*domain.Division, len(divisions))
	for i, division := range divisions {
		domainDivisions[i] = r.toDomainDivision(&division)
	}
	return domainDivisions
}

func (r *DivisionRepository) toDomainDivision(division *DivisionModel) *domain.Division {
	return &domain.Division{
		ID:        division.ID,
		CompanyID: division.CompanyID,
		EstateID:  division.EstateID,
		Name:      division.Name,
		Code:      division.Code,
		IsActive:  division.IsActive,
	}
}

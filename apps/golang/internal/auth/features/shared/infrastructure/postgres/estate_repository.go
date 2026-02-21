package postgres

import (
	"context"

	"agrinovagraphql/server/internal/auth/features/shared/domain"

	"gorm.io/gorm"
)

// EstateRepository implements domain.EstateRepository for PostgreSQL
type EstateRepository struct {
	db *gorm.DB
}

// NewEstateRepository creates new PostgreSQL estate repository
func NewEstateRepository(db *gorm.DB) *EstateRepository {
	return &EstateRepository{db: db}
}

// FindByID finds estate by ID
func (r *EstateRepository) FindByID(ctx context.Context, id string) (*domain.Estate, error) {
	var estate EstateModel
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&estate).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.toDomainEstate(&estate), nil
}

// FindByCompany finds all estates for a company
func (r *EstateRepository) FindByCompany(ctx context.Context, companyID string) ([]*domain.Estate, error) {
	var estates []EstateModel
	err := r.db.WithContext(ctx).
		Where("company_id = ? AND deleted_at IS NULL", companyID).
		Order("name").
		Find(&estates).Error

	if err != nil {
		return nil, err
	}

	return r.toDomainEstates(estates), nil
}

// FindByKode finds estate by code
func (r *EstateRepository) FindByKode(ctx context.Context, kode string) (*domain.Estate, error) {
	var estate EstateModel
	err := r.db.WithContext(ctx).
		Where("code = ? AND deleted_at IS NULL", kode).
		First(&estate).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.toDomainEstate(&estate), nil
}

// FindActive finds active estates for a company
func (r *EstateRepository) FindActive(ctx context.Context, companyID string) ([]*domain.Estate, error) {
	var estates []EstateModel
	err := r.db.WithContext(ctx).
		Where("company_id = ? AND is_active = true AND deleted_at IS NULL", companyID).
		Order("name").
		Find(&estates).Error

	if err != nil {
		return nil, err
	}

	return r.toDomainEstates(estates), nil
}

// Helper methods

func (r *EstateRepository) toDomainEstates(estates []EstateModel) []*domain.Estate {
	domainEstates := make([]*domain.Estate, len(estates))
	for i, estate := range estates {
		domainEstates[i] = r.toDomainEstate(&estate)
	}
	return domainEstates
}

func (r *EstateRepository) toDomainEstate(estate *EstateModel) *domain.Estate {
	return &domain.Estate{
		ID:        estate.ID,
		CompanyID: estate.CompanyID,
		Name:      estate.Name,
		Code:      estate.Code,
		IsActive:  estate.IsActive,
	}
}

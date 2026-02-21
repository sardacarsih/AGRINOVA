package postgres

import (
	"context"

	"agrinovagraphql/server/internal/auth/features/shared/domain"

	"gorm.io/gorm"
)

// CompanyRepository implements domain.CompanyRepository for PostgreSQL
type CompanyRepository struct {
	db *gorm.DB
}

// NewCompanyRepository creates new PostgreSQL company repository
func NewCompanyRepository(db *gorm.DB) *CompanyRepository {
	return &CompanyRepository{db: db}
}

// FindByID finds company by ID
func (r *CompanyRepository) FindByID(ctx context.Context, id string) (*domain.Company, error) {
	var company CompanyModel
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&company).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.toDomainCompany(&company), nil
}

// FindByKode finds company by code
func (r *CompanyRepository) FindByKode(ctx context.Context, kode string) (*domain.Company, error) {
	var company CompanyModel
	err := r.db.WithContext(ctx).
		Where("company_code = ? AND deleted_at IS NULL", kode).
		First(&company).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.toDomainCompany(&company), nil
}

// FindAll finds all companies
func (r *CompanyRepository) FindAll(ctx context.Context) ([]*domain.Company, error) {
	var companies []CompanyModel
	err := r.db.WithContext(ctx).
		Where("deleted_at IS NULL").
		Order("name").
		Find(&companies).Error

	if err != nil {
		return nil, err
	}

	return r.toDomainCompanies(companies), nil
}

// FindActive finds only active companies
func (r *CompanyRepository) FindActive(ctx context.Context) ([]*domain.Company, error) {
	var companies []CompanyModel
	err := r.db.WithContext(ctx).
		Where("status = ? AND deleted_at IS NULL", "ACTIVE").
		Order("name").
		Find(&companies).Error

	if err != nil {
		return nil, err
	}

	return r.toDomainCompanies(companies), nil
}

// Helper methods

func (r *CompanyRepository) toDomainCompanies(companies []CompanyModel) []*domain.Company {
	domainCompanies := make([]*domain.Company, len(companies))
	for i, company := range companies {
		domainCompanies[i] = r.toDomainCompany(&company)
	}
	return domainCompanies
}

func (r *CompanyRepository) toDomainCompany(company *CompanyModel) *domain.Company {
	return &domain.Company{
		ID:      company.ID,
		Name:    company.Name,
		Status:  company.Status,
		Address: company.Address,
		Phone:   company.Phone,
	}
}

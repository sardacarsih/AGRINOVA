package postgres

import (
	"context"
	"errors"
	"strings"

	"agrinovagraphql/server/internal/auth/domain"
	authDomain "agrinovagraphql/server/internal/graphql/domain/auth"

	"gorm.io/gorm"
)

type userRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new postgres user repository
func NewUserRepository(db *gorm.DB) domain.UserRepository {
	return &userRepository{
		db: db,
	}
}

func (r *userRepository) FindByID(ctx context.Context, id string) (*domain.User, error) {
	var userGorm authDomain.User
	if err := r.db.WithContext(ctx).Preload("Assignments.Company").First(&userGorm, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Return nil if not found, let service handle error if needed
		}
		return nil, err
	}
	return toDomainUser(&userGorm), nil
}

func (r *userRepository) FindByUsername(ctx context.Context, username string) (*domain.User, error) {
	var userGorm authDomain.User
	if err := r.db.WithContext(ctx).Preload("Assignments.Company").First(&userGorm, "username = ?", username).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return toDomainUser(&userGorm), nil
}

func (r *userRepository) FindByIdentifier(ctx context.Context, identifier string) (*domain.User, error) {
	var userGorm authDomain.User
	if err := r.db.WithContext(ctx).Preload("Assignments.Company").Where("username = ? OR email = ?", identifier, identifier).First(&userGorm).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return toDomainUser(&userGorm), nil
}

func (r *userRepository) FindByCompany(ctx context.Context, companyID string) ([]*domain.User, error) {
	var usersGorm []authDomain.User
	// Use JOIN to filter by company_id in assignments
	err := r.db.WithContext(ctx).
		Preload("Assignments.Company").
		Joins("JOIN user_company_assignments ON user_company_assignments.user_id = users.id").
		Where("user_company_assignments.company_id = ? AND user_company_assignments.is_active = ?", companyID, true).
		Find(&usersGorm).Error

	if err != nil {
		return nil, err
	}
	return toDomainUsers(usersGorm), nil
}

func (r *userRepository) FindByRole(ctx context.Context, role string) ([]*domain.User, error) {
	var usersGorm []authDomain.User
	if err := r.db.WithContext(ctx).Preload("Assignments.Company").Where("role = ?", role).Find(&usersGorm).Error; err != nil {
		return nil, err
	}
	return toDomainUsers(usersGorm), nil
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) error {
	userGorm := toGormUser(user)
	if err := r.db.WithContext(ctx).Create(userGorm).Error; err != nil {
		return err
	}
	// Update ID and timestamps back to domain model
	user.ID = userGorm.ID
	user.CreatedAt = userGorm.CreatedAt
	user.UpdatedAt = userGorm.UpdatedAt
	return nil
}

func (r *userRepository) Update(ctx context.Context, user *domain.User) error {
	userGorm := toGormUser(user)
	// Use Save to ensure all fields are updated, including zero values (like IsActive=false)
	// Note: updating assignments usually handled separately or via gorm association mode,
	// but here we just update user core fields.
	if err := r.db.WithContext(ctx).Save(userGorm).Error; err != nil {
		return err
	}
	return nil
}

func (r *userRepository) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&authDomain.User{}, "id = ?", id).Error; err != nil {
		return err
	}
	return nil
}

func (r *userRepository) FindWithFilters(ctx context.Context, filters domain.UserFilters) ([]*domain.User, int64, error) {
	query := r.db.WithContext(ctx).Model(&authDomain.User{}).Preload("Assignments.Company")

	if filters.CompanyID != nil {
		query = query.Joins("JOIN user_company_assignments ON user_company_assignments.user_id = users.id").
			Where("user_company_assignments.company_id = ?", *filters.CompanyID)
	}
	if filters.Role != nil {
		query = query.Where("role = ?", *filters.Role)
	}
	if filters.IsActive != nil {
		query = query.Where("is_active = ?", *filters.IsActive)
	}
	if filters.Search != nil && *filters.Search != "" {
		searchTerm := "%" + strings.ToLower(*filters.Search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(username) LIKE ?", searchTerm, searchTerm)
	}

	var totalCount int64
	// For count, be careful with joins/duplicates if one user has multiple assignments in same company (unlikely but possible)
	// Use Distinct if needed.
	if err := query.Distinct("users.id").Count(&totalCount).Error; err != nil {
		return nil, 0, err
	}

	if filters.Offset > 0 {
		query = query.Offset(filters.Offset)
	}
	if filters.Limit > 0 {
		query = query.Limit(filters.Limit)
	}

	var usersGorm []authDomain.User
	if err := query.Find(&usersGorm).Error; err != nil {
		return nil, 0, err
	}

	return toDomainUsers(usersGorm), totalCount, nil
}

// Helpers / Mappers

func toDomainUser(g *authDomain.User) *domain.User {
	if g == nil {
		return nil
	}

	var assignments []domain.UserCompanyAssignment
	if len(g.Assignments) > 0 {
		for _, a := range g.Assignments {
			var company *domain.Company
			if a.Company != nil {
				company = &domain.Company{
					ID:      a.Company.ID,
					Nama:    a.Company.Name,
					Status:  string(a.Company.Status),
					Address: a.Company.Address,
					Phone:   a.Company.Phone,
				}
			}
			assignments = append(assignments, domain.UserCompanyAssignment{
				ID:         a.ID,
				UserID:     a.UserID,
				CompanyID:  a.CompanyID,
				Company:    company,
				IsActive:   a.IsActive,
				AssignedAt: a.AssignedAt,
				AssignedBy: a.AssignedBy,
				CreatedAt:  a.CreatedAt,
				UpdatedAt:  a.UpdatedAt,
			})
		}
	}

	return &domain.User{
		ID:          g.ID,
		Username:    g.Username,
		Name:        g.Name,
		Email:       g.Email,
		PhoneNumber: g.PhoneNumber,
		Password:    "", // Password not in authDomain.User, need separate query
		Role:        string(g.Role),
		IsActive:    g.IsActive,
		CreatedAt:   g.CreatedAt,
		UpdatedAt:   g.UpdatedAt,
		Assignments: assignments,
	}
}

func toDomainUsers(gs []authDomain.User) []*domain.User {
	users := make([]*domain.User, len(gs))
	for i, g := range gs {
		users[i] = toDomainUser(&g)
	}
	return users
}

func toGormUser(d *domain.User) *authDomain.User {
	if d == nil {
		return nil
	}
	return &authDomain.User{
		ID:          d.ID,
		Username:    d.Username,
		Name:        d.Name,
		Email:       d.Email,
		PhoneNumber: d.PhoneNumber,
		// Password: not in authDomain.User (security)
		Role:      authDomain.UserRole(d.Role),
		IsActive:  d.IsActive,
		CreatedAt: d.CreatedAt,
		UpdatedAt: d.UpdatedAt,
		// Assignments are typically managed via separate service methods or association updates
	}
}

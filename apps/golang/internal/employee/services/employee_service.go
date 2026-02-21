package services

import (
	"context"
	"fmt"
	"strings"

	"agrinovagraphql/server/internal/employee/models"
	"agrinovagraphql/server/internal/graphql/domain/master"

	"gorm.io/gorm"
)

type EmployeeService struct {
	db *gorm.DB
}

type EmployeeListFilter struct {
	CompanyIDs   []string
	Search       *string
	EmployeeType *string
	IsActive     *bool
	DivisionID   *string
	SortBy       string
	SortOrder    string
	Page         int
	Limit        int
}

func NewEmployeeService(db *gorm.DB) *EmployeeService {
	return &EmployeeService{
		db: db,
	}
}

func (s *EmployeeService) CreateEmployee(ctx context.Context, input master.CreateEmployeeInput) (*models.Employee, error) {
	employee := models.Employee{
		NIK:        input.Nik,
		Name:       input.Name,
		Role:       input.Role,
		CompanyID:  input.CompanyID,
		DivisionID: input.DivisionID,
		IsActive:   true,
	}

	if input.PhotoURL != nil {
		employee.PhotoURL = *input.PhotoURL
	}

	if err := s.db.Create(&employee).Error; err != nil {
		return nil, fmt.Errorf("failed to create employee: %w", err)
	}

	return &employee, nil
}

func (s *EmployeeService) UpdateEmployee(ctx context.Context, input master.UpdateEmployeeInput) (*models.Employee, error) {
	var employee models.Employee
	if err := s.db.First(&employee, "id = ?", input.ID).Error; err != nil {
		return nil, fmt.Errorf("employee not found: %w", err)
	}

	if input.Name != nil {
		employee.Name = *input.Name
	}
	if input.Role != nil {
		employee.Role = *input.Role
	}
	if input.CompanyID != nil {
		employee.CompanyID = *input.CompanyID
	}
	if input.DivisionID != nil {
		employee.DivisionID = input.DivisionID
	}
	if input.PhotoURL != nil {
		employee.PhotoURL = *input.PhotoURL
	}
	if input.IsActive != nil {
		employee.IsActive = *input.IsActive
	}

	if err := s.db.Save(&employee).Error; err != nil {
		return nil, fmt.Errorf("failed to update employee: %w", err)
	}

	return &employee, nil
}

func (s *EmployeeService) SyncEmployees(ctx context.Context, input []*master.SyncEmployeeInput) ([]*models.Employee, error) {
	var syncedEmployees []*models.Employee

	// Use transaction for bulk sync
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, item := range input {
			var employee models.Employee

			// Upsert logic based on NIK + CompanyID
			// Try to find existing employee by NIK and CompanyID
			result := tx.Where("nik = ? AND company_id = ?", item.Nik, item.CompanyID).First(&employee)

			if result.Error == nil {
				// Update existing
				employee.Name = item.Name
				employee.Role = item.Role
				employee.CompanyID = item.CompanyID
				employee.IsActive = item.IsActive
				if item.PhotoURL != nil {
					employee.PhotoURL = *item.PhotoURL
				}
				if err := tx.Save(&employee).Error; err != nil {
					return err
				}
			} else if result.Error == gorm.ErrRecordNotFound {
				// Create new
				employee = models.Employee{
					NIK:       item.Nik,
					Name:      item.Name,
					Role:      item.Role,
					CompanyID: item.CompanyID,
					IsActive:  item.IsActive,
				}
				if item.PhotoURL != nil {
					employee.PhotoURL = *item.PhotoURL
				}
				if err := tx.Create(&employee).Error; err != nil {
					return err
				}
			} else {
				return result.Error
			}

			syncedEmployees = append(syncedEmployees, &employee)
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to sync employees: %w", err)
	}

	return syncedEmployees, nil
}

func (s *EmployeeService) GetEmployee(ctx context.Context, id string) (*models.Employee, error) {
	var employee models.Employee
	if err := s.db.First(&employee, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("employee not found: %w", err)
	}
	return &employee, nil
}

func (s *EmployeeService) GetEmployeeByNIK(ctx context.Context, nik string, companyID string) (*models.Employee, error) {
	var employee models.Employee
	if err := s.db.First(&employee, "nik = ? AND company_id = ?", nik, companyID).Error; err != nil {
		return nil, fmt.Errorf("employee not found: %w", err)
	}
	return &employee, nil
}

func (s *EmployeeService) ListEmployees(ctx context.Context) ([]*models.Employee, error) {
	var employees []*models.Employee
	if err := s.db.Find(&employees).Error; err != nil {
		return nil, fmt.Errorf("failed to list employees: %w", err)
	}
	return employees, nil
}

func (s *EmployeeService) ListEmployeesByCompany(ctx context.Context, companyID string) ([]*models.Employee, error) {
	var employees []*models.Employee
	if err := s.db.Where("company_id = ?", companyID).Find(&employees).Error; err != nil {
		return nil, fmt.Errorf("failed to list employees by company: %w", err)
	}
	return employees, nil
}

func (s *EmployeeService) ListEmployeesPaginated(ctx context.Context, filter EmployeeListFilter) ([]*models.Employee, int64, error) {
	var employees []*models.Employee
	var total int64

	page := filter.Page
	if page <= 0 {
		page = 1
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}

	query := s.db.WithContext(ctx).Model(&models.Employee{})

	if len(filter.CompanyIDs) > 0 {
		query = query.Where("company_id IN ?", filter.CompanyIDs)
	}

	if filter.Search != nil && strings.TrimSpace(*filter.Search) != "" {
		term := "%" + strings.ToLower(strings.TrimSpace(*filter.Search)) + "%"
		query = query.Where(
			"LOWER(nik) LIKE ? OR LOWER(name) LIKE ? OR LOWER(role) LIKE ?",
			term,
			term,
			term,
		)
	}

	if filter.EmployeeType != nil && strings.TrimSpace(*filter.EmployeeType) != "" {
		employeeType := strings.ToUpper(strings.TrimSpace(*filter.EmployeeType))
		switch employeeType {
		case "KHL":
			query = query.Where("UPPER(role) LIKE ?", "%KHL%")
		case "BORONGAN":
			query = query.Where("UPPER(role) LIKE ?", "%BORONG%")
		case "KHT":
			query = query.Where("UPPER(role) LIKE ?", "%KHT%")
		case "BULANAN":
			query = query.Where(
				"UPPER(role) NOT LIKE ? AND UPPER(role) NOT LIKE ? AND UPPER(role) NOT LIKE ?",
				"%KHL%",
				"%BORONG%",
				"%KHT%",
			)
		}
	}

	if filter.IsActive != nil {
		query = query.Where("is_active = ?", *filter.IsActive)
	}

	if filter.DivisionID != nil && strings.TrimSpace(*filter.DivisionID) != "" {
		query = query.Where("division_id = ?", strings.TrimSpace(*filter.DivisionID))
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count employees: %w", err)
	}

	sortByColumn := "name"
	switch strings.ToLower(strings.TrimSpace(filter.SortBy)) {
	case "nik":
		sortByColumn = "nik"
	case "name":
		sortByColumn = "name"
	case "role":
		sortByColumn = "role"
	case "created_at", "createdat":
		sortByColumn = "created_at"
	case "updated_at", "updatedat":
		sortByColumn = "updated_at"
	}

	sortOrder := "asc"
	if strings.EqualFold(strings.TrimSpace(filter.SortOrder), "desc") {
		sortOrder = "desc"
	}

	offset := (page - 1) * limit
	if err := query.
		Order(sortByColumn + " " + sortOrder).
		Offset(offset).
		Limit(limit).
		Find(&employees).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list employees paginated: %w", err)
	}

	return employees, total, nil
}

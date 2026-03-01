package repositories

import (
	"context"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/master/models"
)

// MasterRepository defines the interface for master data repository operations
type MasterRepository interface {
	// Company operations
	CreateCompany(ctx context.Context, company *models.Company) error
	GetCompanyByID(ctx context.Context, id string) (*models.Company, error)
	GetCompanies(ctx context.Context, filters *models.MasterFilters) ([]*models.Company, error)
	UpdateCompany(ctx context.Context, company *models.Company) error
	DeleteCompany(ctx context.Context, id string) error
	CountCompanies(ctx context.Context, filters *models.MasterFilters) (int64, error)

	// Estate operations
	CreateEstate(ctx context.Context, estate *models.Estate) error
	GetEstateByID(ctx context.Context, id string) (*models.Estate, error)
	GetEstates(ctx context.Context, filters *models.MasterFilters) ([]*models.Estate, error)
	GetEstatesByCompanyID(ctx context.Context, companyID string) ([]*models.Estate, error)
	UpdateEstate(ctx context.Context, estate *models.Estate) error
	DeleteEstate(ctx context.Context, id string) error
	CountEstates(ctx context.Context, filters *models.MasterFilters) (int64, error)

	// Block operations
	CreateBlock(ctx context.Context, block *models.Block) error
	GetBlockByID(ctx context.Context, id string) (*models.Block, error)
	GetBlocks(ctx context.Context, filters *models.MasterFilters) ([]*models.Block, error)
	GetBlocksByDivisionID(ctx context.Context, divisionID string) ([]*models.Block, error)
	UpdateBlock(ctx context.Context, block *models.Block) error
	DeleteBlock(ctx context.Context, id string) error
	CountBlocks(ctx context.Context, filters *models.MasterFilters) (int64, error)
	CreateTarifBlok(ctx context.Context, tarifBlok *models.TarifBlok) error
	GetTarifBlokByID(ctx context.Context, id string) (*models.TarifBlok, error)
	GetTarifBloks(ctx context.Context, companyIDs []string) ([]*models.TarifBlok, error)
	CreateLandType(ctx context.Context, landType *models.LandType) error
	GetLandTypes(ctx context.Context, isActive *bool) ([]*models.LandType, error)
	GetLandTypeByID(ctx context.Context, id string) (*models.LandType, error)
	GetLandTypeByCode(ctx context.Context, code string) (*models.LandType, error)
	UpdateLandType(ctx context.Context, landType *models.LandType) error
	DeleteLandType(ctx context.Context, id string) error
	ExistsTarifBlokByCompanyAndPerlakuan(ctx context.Context, companyID, perlakuan string, excludeID *string) (bool, error)
	UpdateTarifBlok(ctx context.Context, tarifBlok *models.TarifBlok) error
	DeleteTarifBlok(ctx context.Context, id string) error

	// Division operations
	CreateDivision(ctx context.Context, division *models.Division) error
	GetDivisionByID(ctx context.Context, id string) (*models.Division, error)
	GetDivisions(ctx context.Context, filters *models.MasterFilters) ([]*models.Division, error)
	GetDivisionsByEstateID(ctx context.Context, estateID string) ([]*models.Division, error)
	UpdateDivision(ctx context.Context, division *models.Division) error
	DeleteDivision(ctx context.Context, id string) error
	CountDivisions(ctx context.Context, filters *models.MasterFilters) (int64, error)

	// Assignment operations
	CreateEstateAssignment(ctx context.Context, assignment *models.UserEstateAssignment) error
	GetEstateAssignmentByID(ctx context.Context, id string) (*models.UserEstateAssignment, error)
	GetEstateAssignments(ctx context.Context, userID *string, estateID *string) ([]*models.UserEstateAssignment, error)
	GetUserEstateAssignments(ctx context.Context, userID string) ([]*models.UserEstateAssignment, error)
	UpdateEstateAssignment(ctx context.Context, assignment *models.UserEstateAssignment) error
	DeleteEstateAssignment(ctx context.Context, id string) error

	CreateDivisionAssignment(ctx context.Context, assignment *models.UserDivisionAssignment) error
	GetDivisionAssignmentByID(ctx context.Context, id string) (*models.UserDivisionAssignment, error)
	GetDivisionAssignments(ctx context.Context, userID *string, divisionID *string) ([]*models.UserDivisionAssignment, error)
	GetUserDivisionAssignments(ctx context.Context, userID string) ([]*models.UserDivisionAssignment, error)
	UpdateDivisionAssignment(ctx context.Context, assignment *models.UserDivisionAssignment) error
	DeleteDivisionAssignment(ctx context.Context, id string) error

	CreateCompanyAssignment(ctx context.Context, assignment *models.UserCompanyAssignment) error
	GetCompanyAssignmentByID(ctx context.Context, id string) (*models.UserCompanyAssignment, error)
	GetCompanyAssignments(ctx context.Context, userID *string, companyID *string) ([]*models.UserCompanyAssignment, error)
	GetUserCompanyAssignments(ctx context.Context, userID string) ([]*models.UserCompanyAssignment, error)
	UpdateCompanyAssignment(ctx context.Context, assignment *models.UserCompanyAssignment) error
	DeleteCompanyAssignment(ctx context.Context, id string) error

	// Bulk operations
	GetUserAssignments(ctx context.Context, userID string) (*models.UserAssignmentsResponse, error)
	GetMasterDataStatistics(ctx context.Context, companyID *string) (*models.MasterDataStatistics, error)

	// Transaction support
	WithTransaction(tx *gorm.DB) MasterRepository
	BeginTransaction(ctx context.Context) (*gorm.DB, error)
	GetDB() *gorm.DB
}

// masterRepository implements MasterRepository interface
type masterRepository struct {
	db *gorm.DB
}

// NewMasterRepository creates a new master repository
func NewMasterRepository(db *gorm.DB) MasterRepository {
	return &masterRepository{db: db}
}

// GetDB returns the underlying GORM DB instance
func (r *masterRepository) GetDB() *gorm.DB {
	return r.db
}

// WithTransaction returns a new repository instance with transaction
func (r *masterRepository) WithTransaction(tx *gorm.DB) MasterRepository {
	return &masterRepository{db: tx}
}

// BeginTransaction starts a new database transaction
func (r *masterRepository) BeginTransaction(ctx context.Context) (*gorm.DB, error) {
	return r.db.Begin(), nil
}

// Company operations

func (r *masterRepository) CreateCompany(ctx context.Context, company *models.Company) error {
	return r.db.WithContext(ctx).Create(company).Error
}

func (r *masterRepository) GetCompanyByID(ctx context.Context, id string) (*models.Company, error) {
	var company models.Company
	err := r.db.WithContext(ctx).
		Preload("Estates").
		Where("id = ?", id).
		First(&company).Error
	if err != nil {
		return nil, err
	}
	return &company, nil
}

func (r *masterRepository) GetCompanies(ctx context.Context, filters *models.MasterFilters) ([]*models.Company, error) {
	var companies []*models.Company
	query := r.db.WithContext(ctx).
		Preload("Estates")

	query = r.applyCompanyFilters(query, filters)
	query = r.applyPagination(query, filters)
	query = r.applyOrdering(query, filters, "companies")

	err := query.Find(&companies).Error
	return companies, err
}

func (r *masterRepository) UpdateCompany(ctx context.Context, company *models.Company) error {
	company.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(company).Error
}

func (r *masterRepository) DeleteCompany(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Company{}, "id = ?", id).Error
}

func (r *masterRepository) CountCompanies(ctx context.Context, filters *models.MasterFilters) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&models.Company{})
	query = r.applyCompanyFilters(query, filters)
	err := query.Count(&count).Error
	return count, err
}

// Estate operations

func (r *masterRepository) CreateEstate(ctx context.Context, estate *models.Estate) error {
	return r.db.WithContext(ctx).Create(estate).Error
}

func (r *masterRepository) GetEstateByID(ctx context.Context, id string) (*models.Estate, error) {
	var estate models.Estate
	err := r.db.WithContext(ctx).
		Preload("Company").
		Preload("Divisions").
		Where("id = ?", id).
		First(&estate).Error
	if err != nil {
		return nil, err
	}
	return &estate, nil
}

func (r *masterRepository) GetEstates(ctx context.Context, filters *models.MasterFilters) ([]*models.Estate, error) {
	var estates []*models.Estate
	query := r.db.WithContext(ctx).
		Preload("Company").
		Preload("Divisions")

	query = r.applyEstateFilters(query, filters)
	query = r.applyPagination(query, filters)
	query = r.applyOrdering(query, filters, "estates")

	err := query.Find(&estates).Error
	return estates, err
}

func (r *masterRepository) GetEstatesByCompanyID(ctx context.Context, companyID string) ([]*models.Estate, error) {
	var estates []*models.Estate
	err := r.db.WithContext(ctx).
		Preload("Company").
		Preload("Divisions").
		Where("company_id = ?", companyID).
		Find(&estates).Error
	return estates, err
}

func (r *masterRepository) UpdateEstate(ctx context.Context, estate *models.Estate) error {
	estate.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(estate).Error
}

func (r *masterRepository) DeleteEstate(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Estate{}, "id = ?", id).Error
}

func (r *masterRepository) CountEstates(ctx context.Context, filters *models.MasterFilters) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&models.Estate{})
	query = r.applyEstateFilters(query, filters)
	err := query.Count(&count).Error
	return count, err
}

// Block operations

func (r *masterRepository) CreateBlock(ctx context.Context, block *models.Block) error {
	return r.db.WithContext(ctx).Create(block).Error
}

func (r *masterRepository) GetBlockByID(ctx context.Context, id string) (*models.Block, error) {
	var block models.Block
	err := r.db.WithContext(ctx).
		Preload("LandType").
		Preload("TarifBlok").
		Preload("TarifBlok.LandType").
		Preload("Division").
		Preload("Division.Estate").
		Preload("Division.Estate.Company").
		Where("id = ?", id).
		First(&block).Error
	if err != nil {
		return nil, err
	}
	return &block, nil
}

func (r *masterRepository) GetBlocks(ctx context.Context, filters *models.MasterFilters) ([]*models.Block, error) {
	var blocks []*models.Block
	query := r.db.WithContext(ctx).
		Preload("LandType").
		Preload("TarifBlok").
		Preload("TarifBlok.LandType").
		Preload("Division").
		Preload("Division.Estate").
		Preload("Division.Estate.Company")

	query = r.applyBlockFilters(query, filters)
	query = r.applyPagination(query, filters)
	query = r.applyOrdering(query, filters, "blocks")

	err := query.Find(&blocks).Error
	return blocks, err
}

func (r *masterRepository) GetBlocksByDivisionID(ctx context.Context, divisionID string) ([]*models.Block, error) {
	var blocks []*models.Block
	err := r.db.WithContext(ctx).
		Preload("LandType").
		Preload("TarifBlok").
		Preload("TarifBlok.LandType").
		Preload("Division").
		Preload("Division.Estate").
		Preload("Division.Estate.Company").
		Where("division_id = ?", divisionID).
		Find(&blocks).Error
	return blocks, err
}

func (r *masterRepository) UpdateBlock(ctx context.Context, block *models.Block) error {
	block.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).
		Omit(clause.Associations).
		Save(block).Error
}

func (r *masterRepository) DeleteBlock(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Block{}, "id = ?", id).Error
}

func (r *masterRepository) CountBlocks(ctx context.Context, filters *models.MasterFilters) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&models.Block{})
	query = r.applyBlockFilters(query, filters)
	err := query.Count(&count).Error
	return count, err
}

func (r *masterRepository) CreateTarifBlok(ctx context.Context, tarifBlok *models.TarifBlok) error {
	return r.db.WithContext(ctx).Create(tarifBlok).Error
}

func (r *masterRepository) GetTarifBlokByID(ctx context.Context, id string) (*models.TarifBlok, error) {
	var tarifBlok models.TarifBlok
	err := r.db.WithContext(ctx).
		Preload("Company").
		Preload("LandType").
		Where("id = ?", id).
		First(&tarifBlok).Error
	if err != nil {
		return nil, err
	}
	return &tarifBlok, nil
}

func (r *masterRepository) GetTarifBloks(ctx context.Context, companyIDs []string) ([]*models.TarifBlok, error) {
	var tarifBloks []*models.TarifBlok
	query := r.db.WithContext(ctx).
		Preload("Company").
		Preload("LandType").
		Where("is_active = ?", true)

	if len(companyIDs) > 0 {
		query = query.Where("company_id IN ?", companyIDs)
	}

	err := query.
		Order("perlakuan ASC").
		Find(&tarifBloks).Error
	return tarifBloks, err
}

func (r *masterRepository) CreateLandType(ctx context.Context, landType *models.LandType) error {
	return r.db.WithContext(ctx).Create(landType).Error
}

func (r *masterRepository) GetLandTypes(ctx context.Context, isActive *bool) ([]*models.LandType, error) {
	var landTypes []*models.LandType
	query := r.db.WithContext(ctx).Model(&models.LandType{})
	if isActive != nil {
		query = query.Where("is_active = ?", *isActive)
	}

	err := query.Order("code ASC").Find(&landTypes).Error
	return landTypes, err
}

func (r *masterRepository) GetLandTypeByID(ctx context.Context, id string) (*models.LandType, error) {
	var landType models.LandType
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&landType).Error; err != nil {
		return nil, err
	}
	return &landType, nil
}

func (r *masterRepository) GetLandTypeByCode(ctx context.Context, code string) (*models.LandType, error) {
	var landType models.LandType
	if err := r.db.WithContext(ctx).Where("UPPER(TRIM(code)) = UPPER(TRIM(?))", code).First(&landType).Error; err != nil {
		return nil, err
	}
	return &landType, nil
}

func (r *masterRepository) UpdateLandType(ctx context.Context, landType *models.LandType) error {
	landType.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(landType).Error
}

func (r *masterRepository) DeleteLandType(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.LandType{}, "id = ?", id).Error
}

func (r *masterRepository) ExistsTarifBlokByCompanyAndPerlakuan(ctx context.Context, companyID, perlakuan string, excludeID *string) (bool, error) {
	var count int64
	query := r.db.WithContext(ctx).
		Model(&models.TarifBlok{}).
		Where("company_id = ?", companyID).
		Where("LOWER(perlakuan) = LOWER(?)", strings.TrimSpace(perlakuan))

	if excludeID != nil && *excludeID != "" {
		query = query.Where("id <> ?", *excludeID)
	}

	if err := query.Count(&count).Error; err != nil {
		return false, err
	}

	return count > 0, nil
}

func (r *masterRepository) UpdateTarifBlok(ctx context.Context, tarifBlok *models.TarifBlok) error {
	tarifBlok.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(tarifBlok).Error
}

func (r *masterRepository) DeleteTarifBlok(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.TarifBlok{}, "id = ?", id).Error
}

// Division operations

func (r *masterRepository) CreateDivision(ctx context.Context, division *models.Division) error {
	return r.db.WithContext(ctx).Create(division).Error
}

func (r *masterRepository) GetDivisionByID(ctx context.Context, id string) (*models.Division, error) {
	var division models.Division
	err := r.db.WithContext(ctx).
		Preload("Estate").
		Preload("Estate.Company").
		Preload("Blocks").
		Where("id = ?", id).
		First(&division).Error
	if err != nil {
		return nil, err
	}
	return &division, nil
}

func (r *masterRepository) GetDivisions(ctx context.Context, filters *models.MasterFilters) ([]*models.Division, error) {
	var divisions []*models.Division
	query := r.db.WithContext(ctx).
		Preload("Estate").
		Preload("Estate.Company").
		Preload("Blocks")

	query = r.applyDivisionFilters(query, filters)
	query = r.applyPagination(query, filters)
	query = r.applyOrdering(query, filters, "divisions")

	err := query.Find(&divisions).Error
	return divisions, err
}

func (r *masterRepository) GetDivisionsByEstateID(ctx context.Context, estateID string) ([]*models.Division, error) {
	var divisions []*models.Division
	err := r.db.WithContext(ctx).
		Preload("Estate").
		Preload("Estate.Company").
		Preload("Blocks").
		Where("estate_id = ?", estateID).
		Find(&divisions).Error
	return divisions, err
}

func (r *masterRepository) UpdateDivision(ctx context.Context, division *models.Division) error {
	division.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(division).Error
}

func (r *masterRepository) DeleteDivision(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Division{}, "id = ?", id).Error
}

func (r *masterRepository) CountDivisions(ctx context.Context, filters *models.MasterFilters) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&models.Division{})
	query = r.applyDivisionFilters(query, filters)
	err := query.Count(&count).Error
	return count, err
}

// Estate Assignment operations

func (r *masterRepository) CreateEstateAssignment(ctx context.Context, assignment *models.UserEstateAssignment) error {
	return r.db.WithContext(ctx).Create(assignment).Error
}

func (r *masterRepository) GetEstateAssignmentByID(ctx context.Context, id string) (*models.UserEstateAssignment, error) {
	var assignment models.UserEstateAssignment
	err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Estate").
		Preload("Estate.Company").
		Where("id = ?", id).
		First(&assignment).Error
	if err != nil {
		return nil, err
	}
	return &assignment, nil
}

func (r *masterRepository) GetEstateAssignments(ctx context.Context, userID *string, estateID *string) ([]*models.UserEstateAssignment, error) {
	var assignments []*models.UserEstateAssignment
	query := r.db.WithContext(ctx).
		Preload("User").
		Preload("Estate").
		Preload("Estate.Company")

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}
	if estateID != nil {
		query = query.Where("estate_id = ?", *estateID)
	}

	err := query.Find(&assignments).Error
	return assignments, err
}

func (r *masterRepository) GetUserEstateAssignments(ctx context.Context, userID string) ([]*models.UserEstateAssignment, error) {
	return r.GetEstateAssignments(ctx, &userID, nil)
}

func (r *masterRepository) UpdateEstateAssignment(ctx context.Context, assignment *models.UserEstateAssignment) error {
	assignment.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(assignment).Error
}

func (r *masterRepository) DeleteEstateAssignment(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.UserEstateAssignment{}, "id = ?", id).Error
}

// Division Assignment operations

func (r *masterRepository) CreateDivisionAssignment(ctx context.Context, assignment *models.UserDivisionAssignment) error {
	return r.db.WithContext(ctx).Create(assignment).Error
}

func (r *masterRepository) GetDivisionAssignmentByID(ctx context.Context, id string) (*models.UserDivisionAssignment, error) {
	var assignment models.UserDivisionAssignment
	err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Division").
		Preload("Division.Estate").
		Preload("Division.Estate.Company").
		Where("id = ?", id).
		First(&assignment).Error
	if err != nil {
		return nil, err
	}
	return &assignment, nil
}

func (r *masterRepository) GetDivisionAssignments(ctx context.Context, userID *string, divisionID *string) ([]*models.UserDivisionAssignment, error) {
	var assignments []*models.UserDivisionAssignment
	query := r.db.WithContext(ctx).
		Preload("User").
		Preload("Division").
		Preload("Division.Estate").
		Preload("Division.Estate.Company")

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}
	if divisionID != nil {
		query = query.Where("division_id = ?", *divisionID)
	}

	err := query.Find(&assignments).Error
	return assignments, err
}

func (r *masterRepository) GetUserDivisionAssignments(ctx context.Context, userID string) ([]*models.UserDivisionAssignment, error) {
	return r.GetDivisionAssignments(ctx, &userID, nil)
}

func (r *masterRepository) UpdateDivisionAssignment(ctx context.Context, assignment *models.UserDivisionAssignment) error {
	assignment.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(assignment).Error
}

func (r *masterRepository) DeleteDivisionAssignment(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.UserDivisionAssignment{}, "id = ?", id).Error
}

// Company Assignment operations

func (r *masterRepository) CreateCompanyAssignment(ctx context.Context, assignment *models.UserCompanyAssignment) error {
	return r.db.WithContext(ctx).Create(assignment).Error
}

func (r *masterRepository) GetCompanyAssignmentByID(ctx context.Context, id string) (*models.UserCompanyAssignment, error) {
	var assignment models.UserCompanyAssignment
	err := r.db.WithContext(ctx).
		Preload("Company").
		Where("id = ?", id).
		First(&assignment).Error
	if err != nil {
		return nil, err
	}
	return &assignment, nil
}

func (r *masterRepository) GetCompanyAssignments(ctx context.Context, userID *string, companyID *string) ([]*models.UserCompanyAssignment, error) {
	var assignments []*models.UserCompanyAssignment
	query := r.db.WithContext(ctx).
		Preload("Company")

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}
	if companyID != nil {
		query = query.Where("company_id = ?", *companyID)
	}

	err := query.Find(&assignments).Error
	return assignments, err
}

func (r *masterRepository) GetUserCompanyAssignments(ctx context.Context, userID string) ([]*models.UserCompanyAssignment, error) {
	return r.GetCompanyAssignments(ctx, &userID, nil)
}

func (r *masterRepository) UpdateCompanyAssignment(ctx context.Context, assignment *models.UserCompanyAssignment) error {
	assignment.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(assignment).Error
}

func (r *masterRepository) DeleteCompanyAssignment(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.UserCompanyAssignment{}, "id = ?", id).Error
}

// Bulk operations

func (r *masterRepository) GetUserAssignments(ctx context.Context, userID string) (*models.UserAssignmentsResponse, error) {
	var response models.UserAssignmentsResponse
	var currentUser struct {
		Role auth.UserRole `gorm:"column:role"`
	}
	if err := r.db.WithContext(ctx).
		Table("users").
		Select("role").
		Where("id = ?", userID).
		Take(&currentUser).Error; err != nil {
		return nil, fmt.Errorf("failed to get user role: %w", err)
	}

	// Get company assignments first (source of scope for AREA_MANAGER).
	companyAssignments, err := r.GetUserCompanyAssignments(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get company assignments: %w", err)
	}

	// Extract active companies (deduplicated).
	companySeen := make(map[string]struct{}, len(companyAssignments))
	activeCompanyIDs := make([]string, 0, len(companyAssignments))
	for _, assignment := range companyAssignments {
		if !assignment.IsActive {
			continue
		}

		companyID := strings.TrimSpace(assignment.CompanyID)
		if companyID == "" && assignment.Company != nil {
			companyID = strings.TrimSpace(assignment.Company.ID)
		}
		if companyID == "" {
			continue
		}

		if _, exists := companySeen[companyID]; exists {
			continue
		}
		companySeen[companyID] = struct{}{}
		activeCompanyIDs = append(activeCompanyIDs, companyID)

		if assignment.Company != nil && strings.TrimSpace(assignment.Company.ID) != "" {
			response.Companies = append(response.Companies, *assignment.Company)
		}
	}

	// Get estate assignments
	estateAssignments, err := r.GetUserEstateAssignments(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get estate assignments: %w", err)
	}

	// Build estate scope from active assignments.
	// Source of truth:
	// 1) user_estate_assignments
	// 2) estate implied by active user_division_assignments
	estateScope := make(map[string]struct{}, len(estateAssignments))
	addEstateScope := func(estateID string) {
		trimmed := strings.TrimSpace(estateID)
		if trimmed == "" {
			return
		}
		estateScope[trimmed] = struct{}{}
	}

	for _, assignment := range estateAssignments {
		if assignment.IsActive && assignment.Estate != nil && assignment.Estate.ID != "" {
			addEstateScope(assignment.Estate.ID)
		}
	}

	divisionAssignments, err := r.GetUserDivisionAssignments(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get division assignments: %w", err)
	}
	for _, assignment := range divisionAssignments {
		if assignment.IsActive && assignment.Division != nil {
			addEstateScope(assignment.Division.EstateID)
		}
	}

	// Company-level scope expansion only for company-scoped roles.
	roleKey := strings.ToUpper(strings.TrimSpace(string(currentUser.Role)))
	allowCompanyEstateExpansion := roleKey == strings.ToUpper(string(auth.UserRoleAreaManager)) ||
		roleKey == strings.ToUpper(string(auth.UserRoleCompanyAdmin)) ||
		roleKey == strings.ToUpper(string(auth.UserRoleSuperAdmin))
	if allowCompanyEstateExpansion && len(activeCompanyIDs) > 0 {
		var companyScopedEstates []models.Estate
		if err := r.db.WithContext(ctx).
			Where("company_id IN ?", activeCompanyIDs).
			Select("id").
			Find(&companyScopedEstates).Error; err != nil {
			return nil, fmt.Errorf("failed to expand company-scoped estates: %w", err)
		}

		for _, estate := range companyScopedEstates {
			addEstateScope(estate.ID)
		}
	}

	activeEstateIDs := make([]string, 0, len(estateScope))
	for estateID := range estateScope {
		activeEstateIDs = append(activeEstateIDs, estateID)
	}

	if len(activeEstateIDs) > 0 {
		var scopedEstates []models.Estate
		if err := r.db.WithContext(ctx).
			Where("id IN ?", activeEstateIDs).
			Order("name ASC").
			Find(&scopedEstates).Error; err != nil {
			return nil, fmt.Errorf("failed to get scoped estates: %w", err)
		}

		for _, estate := range scopedEstates {
			if strings.TrimSpace(estate.ID) == "" {
				continue
			}
			response.Estates = append(response.Estates, estate)
		}
	}

	// Sync division scope strictly by estate assignments.
	divisionSeen := make(map[string]struct{})
	if len(activeEstateIDs) > 0 {
		var scopedDivisions []models.Division
		if err := r.db.WithContext(ctx).
			Where("estate_id IN ?", activeEstateIDs).
			Order("name ASC").
			Find(&scopedDivisions).Error; err != nil {
			return nil, fmt.Errorf("failed to get estate-scoped divisions: %w", err)
		}

		for _, division := range scopedDivisions {
			if division.ID == "" {
				continue
			}
			if _, exists := divisionSeen[division.ID]; exists {
				continue
			}
			divisionSeen[division.ID] = struct{}{}
			response.Divisions = append(response.Divisions, division)
		}
	}

	return &response, nil
}

func (r *masterRepository) GetMasterDataStatistics(ctx context.Context, companyID *string) (*models.MasterDataStatistics, error) {
	var stats models.MasterDataStatistics
	var err error

	// Count companies
	query := r.db.WithContext(ctx).Model(&models.Company{})
	if companyID != nil {
		query = query.Where("id = ?", *companyID)
	}
	if err = query.Count(&stats.TotalCompanies).Error; err != nil {
		return nil, err
	}

	// Count active companies
	query = r.db.WithContext(ctx).Model(&models.Company{}).Where("status = ?", models.CompanyActive)
	if companyID != nil {
		query = query.Where("id = ?", *companyID)
	}
	if err = query.Count(&stats.ActiveCompanies).Error; err != nil {
		return nil, err
	}

	// Count estates
	query = r.db.WithContext(ctx).Model(&models.Estate{})
	if companyID != nil {
		query = query.Where("company_id = ?", *companyID)
	}
	if err = query.Count(&stats.TotalEstates).Error; err != nil {
		return nil, err
	}

	// Count blocks
	query = r.db.WithContext(ctx).Model(&models.Block{})
	if companyID != nil {
		query = query.Joins("JOIN divisions ON blocks.division_id = divisions.id").
			Joins("JOIN estates ON divisions.estate_id = estates.id").
			Where("estates.company_id = ?", *companyID)
	}
	if err = query.Count(&stats.TotalBlocks).Error; err != nil {
		return nil, err
	}

	// Count divisions
	query = r.db.WithContext(ctx).Model(&models.Division{})
	if companyID != nil {
		query = query.Joins("JOIN estates ON divisions.estate_id = estates.id").
			Where("estates.company_id = ?", *companyID)
	}
	if err = query.Count(&stats.TotalDivisions).Error; err != nil {
		return nil, err
	}

	// Count assignments
	if err = r.db.WithContext(ctx).Model(&models.UserEstateAssignment{}).Count(&stats.TotalEstateAssignments).Error; err != nil {
		return nil, err
	}
	if err = r.db.WithContext(ctx).Model(&models.UserDivisionAssignment{}).Count(&stats.TotalDivisionAssignments).Error; err != nil {
		return nil, err
	}
	if err = r.db.WithContext(ctx).Model(&models.UserCompanyAssignment{}).Count(&stats.TotalCompanyAssignments).Error; err != nil {
		return nil, err
	}

	stats.LastUpdated = time.Now()
	return &stats, nil
}

// Helper functions for building queries

func (r *masterRepository) applyCompanyFilters(query *gorm.DB, filters *models.MasterFilters) *gorm.DB {
	if filters == nil {
		return query
	}

	if filters.IsActive != nil {
		query = query.Where("is_active = ?", *filters.IsActive)
	}

	if filters.Search != nil && *filters.Search != "" {
		searchTerm := "%" + strings.ToLower(*filters.Search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(address) LIKE ? OR LOWER(description) LIKE ?",
			searchTerm, searchTerm, searchTerm)
	}

	return query
}

func (r *masterRepository) applyEstateFilters(query *gorm.DB, filters *models.MasterFilters) *gorm.DB {
	if filters == nil {
		return query
	}

	if filters.CompanyID != nil {
		query = query.Where("company_id = ?", *filters.CompanyID)
	}

	if filters.Search != nil && *filters.Search != "" {
		searchTerm := "%" + strings.ToLower(*filters.Search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(code) LIKE ? OR LOWER(location) LIKE ?", searchTerm, searchTerm, searchTerm)
	}

	return query
}

func (r *masterRepository) applyBlockFilters(query *gorm.DB, filters *models.MasterFilters) *gorm.DB {
	if filters == nil {
		return query
	}

	if filters.DivisionID != nil {
		query = query.Where("blocks.division_id = ?", *filters.DivisionID)
	}

	if filters.EstateID != nil {
		query = query.Joins("JOIN divisions ON blocks.division_id = divisions.id").
			Where("divisions.estate_id = ?", *filters.EstateID)
	}

	if filters.CompanyID != nil {
		query = query.Joins("JOIN divisions ON blocks.division_id = divisions.id").
			Joins("JOIN estates ON divisions.estate_id = estates.id").
			Where("estates.company_id = ?", *filters.CompanyID)
	}

	if filters.Search != nil && *filters.Search != "" {
		searchTerm := "%" + strings.ToLower(*filters.Search) + "%"
		query = query.Where(
			"LOWER(blocks.name) LIKE ?",
			searchTerm,
		)
	}

	return query
}

func (r *masterRepository) applyDivisionFilters(query *gorm.DB, filters *models.MasterFilters) *gorm.DB {
	if filters == nil {
		return query
	}

	if filters.EstateID != nil {
		query = query.Where("estate_id = ?", *filters.EstateID)
	}

	if filters.CompanyID != nil {
		query = query.Joins("JOIN estates ON divisions.estate_id = estates.id").
			Where("estates.company_id = ?", *filters.CompanyID)
	}

	if filters.Search != nil && *filters.Search != "" {
		searchTerm := "%" + strings.ToLower(*filters.Search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(code) LIKE ?", searchTerm, searchTerm)
	}

	return query
}

func (r *masterRepository) applyPagination(query *gorm.DB, filters *models.MasterFilters) *gorm.DB {
	if filters == nil {
		return query.Limit(models.DefaultLimit)
	}

	limit := models.DefaultLimit
	if filters.Limit != nil && *filters.Limit > 0 && *filters.Limit <= models.MaxLimit {
		limit = *filters.Limit
	}

	offset := 0
	if filters.Offset != nil && *filters.Offset > 0 {
		offset = *filters.Offset
	}

	return query.Limit(limit).Offset(offset)
}

func (r *masterRepository) applyOrdering(query *gorm.DB, filters *models.MasterFilters, table string) *gorm.DB {
	if filters == nil {
		return query.Order(fmt.Sprintf("%s.%s %s", table, models.DefaultOrderBy, models.DefaultOrderDir))
	}

	orderBy := models.DefaultOrderBy
	if filters.OrderBy != nil && *filters.OrderBy != "" {
		orderBy = *filters.OrderBy
	}

	orderDir := models.DefaultOrderDir
	if filters.OrderDir != nil && (*filters.OrderDir == "ASC" || *filters.OrderDir == "DESC") {
		orderDir = *filters.OrderDir
	}

	return query.Order(fmt.Sprintf("%s.%s %s", table, orderBy, orderDir))
}

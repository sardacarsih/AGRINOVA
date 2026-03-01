package services

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/internal/master/models"
	"agrinovagraphql/server/internal/master/repositories"
)

// MasterService defines the interface for master data business logic
type MasterService interface {
	// Company operations
	CreateCompany(ctx context.Context, req *models.CreateCompanyRequest, creatorID string) (*models.Company, error)
	GetCompanyByID(ctx context.Context, id string, userID string) (*models.Company, error)
	GetCompanies(ctx context.Context, filters *models.MasterFilters, userID string) ([]*models.Company, error)
	CountCompanies(ctx context.Context, filters *models.MasterFilters, userID string) (int64, error)
	UpdateCompany(ctx context.Context, req *models.UpdateCompanyRequest, updaterID string) (*models.Company, error)
	DeleteCompany(ctx context.Context, id string, deleterID string) error

	// Estate operations
	CreateEstate(ctx context.Context, req *models.CreateEstateRequest, creatorID string) (*models.Estate, error)
	GetEstateByID(ctx context.Context, id string, userID string) (*models.Estate, error)
	GetEstates(ctx context.Context, filters *models.MasterFilters, userID string) ([]*models.Estate, error)
	UpdateEstate(ctx context.Context, req *models.UpdateEstateRequest, updaterID string) (*models.Estate, error)
	DeleteEstate(ctx context.Context, id string, deleterID string) error

	// Block operations
	CreateBlock(ctx context.Context, req *models.CreateBlockRequest, creatorID string) (*models.Block, error)
	GetBlockByID(ctx context.Context, id string, userID string) (*models.Block, error)
	GetBlocks(ctx context.Context, filters *models.MasterFilters, userID string) ([]*models.Block, error)
	GetLandTypes(ctx context.Context, userID string) ([]*models.LandType, error)
	CreateLandType(ctx context.Context, req *models.CreateLandTypeRequest, creatorID string) (*models.LandType, error)
	UpdateLandType(ctx context.Context, req *models.UpdateLandTypeRequest, updaterID string) (*models.LandType, error)
	DeleteLandType(ctx context.Context, id string, deleterID string) error
	GetTarifBloks(ctx context.Context, userID string) ([]*models.TarifBlok, error)
	CreateTarifBlok(ctx context.Context, req *models.CreateTarifBlokRequest, creatorID string) (*models.TarifBlok, error)
	UpdateTarifBlok(ctx context.Context, req *models.UpdateTarifBlokRequest, updaterID string) (*models.TarifBlok, error)
	DeleteTarifBlok(ctx context.Context, id string, deleterID string) error
	UpdateBlock(ctx context.Context, req *models.UpdateBlockRequest, updaterID string) (*models.Block, error)
	DeleteBlock(ctx context.Context, id string, deleterID string) error

	// Division operations
	CreateDivision(ctx context.Context, req *models.CreateDivisionRequest, creatorID string) (*models.Division, error)
	GetDivisionByID(ctx context.Context, id string, userID string) (*models.Division, error)
	GetDivisions(ctx context.Context, filters *models.MasterFilters, userID string) ([]*models.Division, error)
	UpdateDivision(ctx context.Context, req *models.UpdateDivisionRequest, updaterID string) (*models.Division, error)
	DeleteDivision(ctx context.Context, id string, deleterID string) error

	// Assignment operations
	AssignUserToEstate(ctx context.Context, req *models.AssignUserToEstateRequest, assignerID string) (*models.UserEstateAssignment, error)
	AssignUserToDivision(ctx context.Context, req *models.AssignUserToDivisionRequest, assignerID string) (*models.UserDivisionAssignment, error)
	AssignUserToCompany(ctx context.Context, req *models.AssignUserToCompanyRequest, assignerID string) (*models.UserCompanyAssignment, error)
	RemoveEstateAssignment(ctx context.Context, id string, removerID string) error
	RemoveDivisionAssignment(ctx context.Context, id string, removerID string) error
	RemoveCompanyAssignment(ctx context.Context, id string, removerID string) error

	GetEstateAssignments(ctx context.Context, userID string) ([]*models.UserEstateAssignment, error)
	GetDivisionAssignments(ctx context.Context, userID string) ([]*models.UserDivisionAssignment, error)
	GetCompanyAssignments(ctx context.Context, userID string) ([]*models.UserCompanyAssignment, error)
	GetUserAssignments(ctx context.Context, userID string) (*models.UserAssignmentsResponse, error)

	// Validation and utility methods
	ValidateCompanyAccess(ctx context.Context, userID string, companyID string) error
	ValidateEstateAccess(ctx context.Context, userID string, estateID string) error
	ValidateDivisionAccess(ctx context.Context, userID string, divisionID string) error
	ValidateUserRole(userRole auth.UserRole, allowedRoles []auth.UserRole) error
	GetMasterDataStatistics(ctx context.Context, userID string, companyID *string) (*models.MasterDataStatistics, error)
}

// masterService implements MasterService interface
type masterService struct {
	repo      repositories.MasterRepository
	validator *validator.Validate
	db        *gorm.DB
}

// NewMasterService creates a new master service
func NewMasterService(repo repositories.MasterRepository, db *gorm.DB) MasterService {
	return &masterService{
		repo:      repo,
		validator: validator.New(),
		db:        db,
	}
}

func buildCreateBlockValidationError(err error) *models.MasterDataError {
	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok || len(validationErrors) == 0 {
		return models.NewMasterDataError(models.ErrCodeInvalidInput, "invalid input data", "")
	}

	first := validationErrors[0]
	field := first.Field()
	tag := first.Tag()

	message := "invalid input data"
	switch field {
	case "BlockCode":
		if tag == "max" {
			message = "block_code maksimal 50 karakter"
		} else {
			message = "format block_code tidak valid"
		}
		field = "block_code"
	case "Name":
		if tag == "min" || tag == "max" {
			message = "name harus 2-255 karakter"
		} else {
			message = "name wajib diisi"
		}
		field = "name"
	case "DivisionID":
		if tag == "uuid" {
			message = "division_id harus UUID valid"
		} else {
			message = "division_id wajib diisi"
		}
		field = "division_id"
	case "LuasHa":
		message = "luas_ha tidak boleh negatif"
		field = "luas_ha"
	case "CropType":
		message = "crop_type maksimal 100 karakter"
		field = "crop_type"
	case "PlantingYear":
		message = "planting_year harus antara 1900-2100"
		field = "planting_year"
	case "Status":
		message = "status hanya boleh INTI atau KKPA"
		field = "status"
	case "ISTM":
		message = "istm hanya boleh Y atau N"
		field = "istm"
	case "TarifBlokID":
		message = "tarif_blok_id harus UUID valid"
		field = "tarif_blok_id"
	case "LandTypeID":
		message = "land_type_id harus UUID valid"
		field = "land_type_id"
	}

	return models.NewMasterDataError(models.ErrCodeInvalidInput, message, field)
}

func buildCreateTarifBlokValidationError(err error) *models.MasterDataError {
	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok || len(validationErrors) == 0 {
		return models.NewMasterDataError(models.ErrCodeInvalidInput, "invalid input data", "")
	}

	first := validationErrors[0]
	field := first.Field()
	tag := first.Tag()

	message := "invalid input data"
	switch field {
	case "CompanyID":
		if tag == "uuid" {
			message = "company_id harus UUID valid"
		} else {
			message = "company_id wajib diisi"
		}
		field = "company_id"
	case "Perlakuan":
		if tag == "max" {
			message = "perlakuan maksimal 100 karakter"
		} else {
			message = "perlakuan wajib diisi"
		}
		field = "perlakuan"
	case "LandTypeID":
		message = "land_type_id harus UUID valid"
		field = "land_type_id"
	case "TarifCode":
		message = "tarif_code harus 1-20 karakter"
		field = "tarif_code"
	case "SchemeType":
		message = "scheme_type harus 1-50 karakter"
		field = "scheme_type"
	case "BJRMinKg":
		message = "bjr_min_kg tidak boleh negatif"
		field = "bjr_min_kg"
	case "BJRMaxKg":
		message = "bjr_max_kg tidak boleh negatif"
		field = "bjr_max_kg"
	case "SortOrder":
		message = "sort_order harus antara 0-9999"
		field = "sort_order"
	case "Basis":
		message = "basis tidak boleh negatif"
		field = "basis"
	case "TarifUpah":
		message = "tarif_upah tidak boleh negatif"
		field = "tarif_upah"
	case "Premi":
		message = "premi tidak boleh negatif"
		field = "premi"
	case "TarifPremi1":
		message = "tarif_premi1 tidak boleh negatif"
		field = "tarif_premi1"
	case "TarifPremi2":
		message = "tarif_premi2 tidak boleh negatif"
		field = "tarif_premi2"
	}

	return models.NewMasterDataError(models.ErrCodeInvalidInput, message, field)
}

func normalizeOptionalUUIDPtr(value **string) {
	if value == nil || *value == nil {
		return
	}
	trimmed := strings.TrimSpace(**value)
	if trimmed == "" {
		*value = nil
		return
	}
	*value = &trimmed
}

func normalizeLandTypeCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

func normalizeSchemeCode(code *string) string {
	if code == nil || strings.TrimSpace(*code) == "" {
		return "GENERAL"
	}
	return strings.ToUpper(strings.TrimSpace(*code))
}

func normalizeTarifCode(code *string) string {
	if code == nil {
		return ""
	}
	return strings.ToUpper(strings.TrimSpace(*code))
}

func schemeNameFromCode(code string) string {
	switch strings.ToUpper(strings.TrimSpace(code)) {
	case "KATEGORI_BJR":
		return "Kategori BJR"
	case "BEDA_LAHAN":
		return "Beda Lahan"
	case "GENERAL":
		return "General"
	default:
		readable := strings.ReplaceAll(strings.ToLower(strings.TrimSpace(code)), "_", " ")
		if readable == "" {
			return "General"
		}
		return strings.ToUpper(readable[:1]) + readable[1:]
	}
}

func shouldSkipTariffProjectionSync(err error) bool {
	if err == nil {
		return false
	}
	lower := strings.ToLower(err.Error())
	return strings.Contains(lower, `relation "tariff_schemes" does not exist`) ||
		strings.Contains(lower, `relation "tariff_scheme_rules" does not exist`) ||
		strings.Contains(lower, `relation "tariff_rule_overrides" does not exist`) ||
		strings.Contains(lower, "tariff_schemes does not exist") ||
		strings.Contains(lower, "tariff_scheme_rules does not exist") ||
		strings.Contains(lower, "tariff_rule_overrides does not exist")
}

func (s *masterService) syncTariffProjectionFromTarifBlok(ctx context.Context, tarifBlok *models.TarifBlok) error {
	if tarifBlok == nil {
		return nil
	}

	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return fmt.Errorf("failed to start transaction for tariff projection sync: %w", tx.Error)
	}
	defer func() {
		if recover() != nil {
			tx.Rollback()
		}
	}()

	schemeCode := normalizeSchemeCode(tarifBlok.SchemeType)
	schemeName := schemeNameFromCode(schemeCode)
	tarifCode := normalizeTarifCode(tarifBlok.TarifCode)
	if tarifCode == "" {
		tx.Rollback()
		return models.NewMasterDataError(models.ErrCodeInvalidInput, "tarif_code wajib diisi", "tarifCode")
	}

	var schemeID string
	err := tx.Raw(`
		SELECT id
		FROM tariff_schemes
		WHERE company_id = ?
		  AND COALESCE(land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
		      = COALESCE(?::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
		  AND LOWER(TRIM(scheme_code)) = LOWER(TRIM(?))
		LIMIT 1
	`, tarifBlok.CompanyID, tarifBlok.LandTypeID, schemeCode).Scan(&schemeID).Error
	if err != nil {
		tx.Rollback()
		if shouldSkipTariffProjectionSync(err) {
			return nil
		}
		return fmt.Errorf("failed to query tariff scheme: %w", err)
	}

	if strings.TrimSpace(schemeID) == "" {
		err = tx.Raw(`
			INSERT INTO tariff_schemes (
				id,
				company_id,
				land_type_id,
				scheme_code,
				scheme_name,
				description,
				is_active,
				created_at,
				updated_at
			) VALUES (
				gen_random_uuid(),
				?,
				?,
				?,
				?,
				?,
				?,
				NOW(),
				NOW()
			)
			RETURNING id
		`,
			tarifBlok.CompanyID,
			tarifBlok.LandTypeID,
			schemeCode,
			schemeName,
			"Auto-generated from tarif_blok source",
			tarifBlok.IsActive,
		).Scan(&schemeID).Error
		if err != nil {
			tx.Rollback()
			if shouldSkipTariffProjectionSync(err) {
				return nil
			}
			return fmt.Errorf("failed to insert tariff scheme: %w", err)
		}
	}

	err = tx.Exec(`
		INSERT INTO tariff_scheme_rules (
			id,
			scheme_id,
			tarif_code,
			perlakuan,
			keterangan,
			bjr_min_kg,
			bjr_max_kg,
			basis,
			tarif_upah,
			premi,
			target_lebih_kg,
			tarif_premi1,
			tarif_premi2,
			sort_order,
			is_active,
			created_at,
			updated_at
		) VALUES (
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			NOW(),
			NOW()
		)
		ON CONFLICT (id) DO UPDATE SET
			scheme_id = EXCLUDED.scheme_id,
			tarif_code = EXCLUDED.tarif_code,
			perlakuan = EXCLUDED.perlakuan,
			keterangan = EXCLUDED.keterangan,
			bjr_min_kg = EXCLUDED.bjr_min_kg,
			bjr_max_kg = EXCLUDED.bjr_max_kg,
			basis = EXCLUDED.basis,
			tarif_upah = EXCLUDED.tarif_upah,
			premi = EXCLUDED.premi,
			target_lebih_kg = EXCLUDED.target_lebih_kg,
			tarif_premi1 = EXCLUDED.tarif_premi1,
			tarif_premi2 = EXCLUDED.tarif_premi2,
			sort_order = EXCLUDED.sort_order,
			is_active = EXCLUDED.is_active,
			updated_at = NOW()
	`,
		tarifBlok.ID,
		schemeID,
		tarifCode,
		tarifBlok.Perlakuan,
		tarifBlok.Keterangan,
		tarifBlok.BJRMinKg,
		tarifBlok.BJRMaxKg,
		tarifBlok.Basis,
		tarifBlok.TarifUpah,
		tarifBlok.Premi,
		tarifBlok.TargetLebih,
		tarifBlok.TarifPremi1,
		tarifBlok.TarifPremi2,
		tarifBlok.SortOrder,
		tarifBlok.IsActive,
	).Error
	if err != nil {
		tx.Rollback()
		if shouldSkipTariffProjectionSync(err) {
			return nil
		}
		return fmt.Errorf("failed to upsert tariff scheme rule: %w", err)
	}

	err = tx.Exec(`
		DELETE FROM tariff_rule_overrides
		WHERE rule_id = ?
		  AND effective_from IS NULL
		  AND effective_to IS NULL
		  AND override_type IN ('NORMAL', 'HOLIDAY', 'LEBARAN')
	`, tarifBlok.ID).Error
	if err != nil {
		tx.Rollback()
		if shouldSkipTariffProjectionSync(err) {
			return nil
		}
		return fmt.Errorf("failed to clear default tariff overrides: %w", err)
	}

	err = tx.Exec(`
		INSERT INTO tariff_rule_overrides (
			rule_id,
			override_type,
			effective_from,
			effective_to,
			tarif_upah,
			premi,
			tarif_premi1,
			tarif_premi2,
			notes,
			is_active,
			created_at,
			updated_at
		) VALUES (
			?,
			'NORMAL',
			NULL,
			NULL,
			?,
			?,
			?,
			?,
			'Default rate from tarif_blok',
			?,
			NOW(),
			NOW()
		)
	`,
		tarifBlok.ID,
		tarifBlok.TarifUpah,
		tarifBlok.Premi,
		tarifBlok.TarifPremi1,
		tarifBlok.TarifPremi2,
		tarifBlok.IsActive,
	).Error
	if err != nil {
		tx.Rollback()
		if shouldSkipTariffProjectionSync(err) {
			return nil
		}
		return fmt.Errorf("failed to insert normal override: %w", err)
	}

	if tarifBlok.TarifLibur != nil {
		err = tx.Exec(`
			INSERT INTO tariff_rule_overrides (
				rule_id,
				override_type,
				effective_from,
				effective_to,
				tarif_upah,
				notes,
				is_active,
				created_at,
				updated_at
			) VALUES (
				?,
				'HOLIDAY',
				NULL,
				NULL,
				?,
				'Holiday override from tarif_blok.tarif_libur',
				?,
				NOW(),
				NOW()
			)
		`, tarifBlok.ID, tarifBlok.TarifLibur, tarifBlok.IsActive).Error
		if err != nil {
			tx.Rollback()
			if shouldSkipTariffProjectionSync(err) {
				return nil
			}
			return fmt.Errorf("failed to insert holiday override: %w", err)
		}
	}

	if tarifBlok.TarifLebaran != nil {
		err = tx.Exec(`
			INSERT INTO tariff_rule_overrides (
				rule_id,
				override_type,
				effective_from,
				effective_to,
				tarif_upah,
				notes,
				is_active,
				created_at,
				updated_at
			) VALUES (
				?,
				'LEBARAN',
				NULL,
				NULL,
				?,
				'Lebaran override from tarif_blok.tarif_lebaran',
				?,
				NOW(),
				NOW()
			)
		`, tarifBlok.ID, tarifBlok.TarifLebaran, tarifBlok.IsActive).Error
		if err != nil {
			tx.Rollback()
			if shouldSkipTariffProjectionSync(err) {
				return nil
			}
			return fmt.Errorf("failed to insert lebaran override: %w", err)
		}
	}

	if err := tx.Commit().Error; err != nil {
		if shouldSkipTariffProjectionSync(err) {
			return nil
		}
		return fmt.Errorf("failed to commit tariff projection sync: %w", err)
	}

	return nil
}

func (s *masterService) deleteTariffProjectionByRuleID(ctx context.Context, ruleID string) error {
	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return fmt.Errorf("failed to start transaction for tariff projection delete: %w", tx.Error)
	}
	defer func() {
		if recover() != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Exec(`DELETE FROM tariff_scheme_rules WHERE id = ?`, ruleID).Error; err != nil {
		tx.Rollback()
		if shouldSkipTariffProjectionSync(err) {
			return nil
		}
		return fmt.Errorf("failed to delete tariff scheme rule: %w", err)
	}

	if err := tx.Exec(`
		DELETE FROM tariff_schemes s
		WHERE NOT EXISTS (
			SELECT 1 FROM tariff_scheme_rules r WHERE r.scheme_id = s.id
		)
	`).Error; err != nil {
		tx.Rollback()
		if shouldSkipTariffProjectionSync(err) {
			return nil
		}
		return fmt.Errorf("failed to cleanup empty tariff schemes: %w", err)
	}

	if err := tx.Commit().Error; err != nil {
		if shouldSkipTariffProjectionSync(err) {
			return nil
		}
		return fmt.Errorf("failed to commit tariff projection delete: %w", err)
	}

	return nil
}

func (s *masterService) resolveLandTypeFromInput(ctx context.Context, landTypeID *string, schemeType *string) (*models.LandType, error) {
	if landTypeID == nil && schemeType == nil {
		return nil, nil
	}

	var byID *models.LandType
	if landTypeID != nil {
		lt, err := s.repo.GetLandTypeByID(ctx, *landTypeID)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, models.NewMasterDataError(models.ErrCodeNotFound, "land type tidak ditemukan", "landTypeId")
			}
			return nil, fmt.Errorf("failed to get land type by id: %w", err)
		}
		byID = lt
	}

	if schemeType != nil {
		lt, err := s.repo.GetLandTypeByCode(ctx, *schemeType)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, models.NewMasterDataError(models.ErrCodeNotFound, "schemeType tidak ditemukan pada land_types", "schemeType")
			}
			return nil, fmt.Errorf("failed to get land type by code: %w", err)
		}
		if byID != nil && byID.ID != lt.ID {
			return nil, models.NewMasterDataError(
				models.ErrCodeBusinessRuleViolation,
				"landTypeId dan schemeType tidak konsisten",
				"landTypeId",
			)
		}
		return lt, nil
	}

	return byID, nil
}

func ensureLandTypeMatch(blockLandTypeID *string, tarifLandTypeID *string) *models.MasterDataError {
	if blockLandTypeID != nil && tarifLandTypeID != nil && *blockLandTypeID != *tarifLandTypeID {
		return models.NewMasterDataError(
			models.ErrCodeBusinessRuleViolation,
			"tipe lahan block harus sama dengan tipe lahan tarif",
			"tarifBlokId",
		)
	}
	return nil
}

// Company operations

func (s *masterService) CreateCompany(ctx context.Context, req *models.CreateCompanyRequest, creatorID string) (*models.Company, error) {
	// Validate input
	if err := s.validator.Struct(req); err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeInvalidInput, "invalid input data", "")
	}

	// Check if creator has permission (only Super Admin can create companies)
	creator, err := s.getUserByID(ctx, creatorID)
	if err != nil {
		return nil, err
	}

	if creator.Role != auth.UserRoleSuperAdmin {
		return nil, models.NewMasterDataError(models.ErrCodePermissionDenied, "only super admin can create companies", "")
	}

	// Create company
	company := &master.Company{
		ID:          uuid.New().String(),
		Name:        req.Name,
		CompanyCode: req.CompanyCode,
		Description: &req.Description,
		LogoURL:     &req.LogoURL,
		Address:     &req.Address,
		Phone:       &req.Phone,
		Status:      master.CompanyStatusActive,
		IsActive:    true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if req.Status != nil {
		company.Status = *req.Status
	}
	if req.IsActive != nil {
		company.IsActive = *req.IsActive
	}

	if req.Status != nil {
		company.Status = *req.Status
	}
	if req.IsActive != nil {
		company.IsActive = *req.IsActive
	}

	if err := s.repo.CreateCompany(ctx, company); err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return nil, models.NewMasterDataError(models.ErrCodeDuplicateEntry, "company name already exists", "name")
		}
		return nil, fmt.Errorf("failed to create company: %w", err)
	}

	return s.repo.GetCompanyByID(ctx, company.ID)
}

func (s *masterService) GetCompanyByID(ctx context.Context, id string, userID string) (*models.Company, error) {
	// Validate access
	if err := s.ValidateCompanyAccess(ctx, userID, id); err != nil {
		return nil, err
	}

	company, err := s.repo.GetCompanyByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewMasterDataError(models.ErrCodeNotFound, "company not found", "id")
		}
		return nil, fmt.Errorf("failed to get company: %w", err)
	}

	return company, nil
}

func (s *masterService) GetCompanies(ctx context.Context, filters *models.MasterFilters, userID string) ([]*models.Company, error) {
	user, err := s.getUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Filter based on user role and assignments
	if filters == nil {
		filters = &models.MasterFilters{}
	}

	// Apply company-level access control
	switch user.Role {
	case auth.UserRoleSuperAdmin:
		// Super admin can see all companies
	case auth.UserRoleAreaManager:
		// Area manager can see assigned companies
		assignments, err := s.repo.GetUserCompanyAssignments(ctx, userID)
		if err != nil {
			return nil, err
		}
		if len(assignments) == 0 {
			return []*models.Company{}, nil
		}
		// This would require additional logic to filter by assigned companies
	default:
		// Other roles can only see their own company
		var assignments []*models.UserCompanyAssignment
		assignments, err = s.repo.GetUserCompanyAssignments(ctx, userID)
		if err != nil {
			return nil, err
		}
		if len(assignments) > 0 {
			filters.CompanyID = &assignments[0].CompanyID
		} else {
			return []*models.Company{}, nil
		}
	}

	return s.repo.GetCompanies(ctx, filters)
}

func (s *masterService) CountCompanies(ctx context.Context, filters *models.MasterFilters, userID string) (int64, error) {
	user, err := s.getUserByID(ctx, userID)
	if err != nil {
		return 0, err
	}

	// Filter based on user role and assignments
	if filters == nil {
		filters = &models.MasterFilters{}
	}

	// Apply company-level access control
	switch user.Role {
	case auth.UserRoleSuperAdmin:
		// Super admin can see all companies
	default:
		// Other roles can only see their own company
		var assignments []*models.UserCompanyAssignment
		assignments, err = s.repo.GetUserCompanyAssignments(ctx, userID)
		if err != nil {
			return 0, err
		}
		if len(assignments) > 0 {
			filters.CompanyID = &assignments[0].CompanyID
		} else {
			return 0, nil
		}
	}

	return s.repo.CountCompanies(ctx, filters)
}

func (s *masterService) UpdateCompany(ctx context.Context, req *models.UpdateCompanyRequest, updaterID string) (*models.Company, error) {
	// Validate input
	if err := s.validator.Struct(req); err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeInvalidInput, "invalid input data", "")
	}

	// Get existing company
	company, err := s.repo.GetCompanyByID(ctx, req.ID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewMasterDataError(models.ErrCodeNotFound, "company not found", "id")
		}
		return nil, fmt.Errorf("failed to get company: %w", err)
	}

	// Validate access
	if err := s.ValidateCompanyAccess(ctx, updaterID, req.ID); err != nil {
		return nil, err
	}

	// Update fields
	if req.Name != nil {
		company.Name = *req.Name
	}
	if req.CompanyCode != nil {
		company.CompanyCode = *req.CompanyCode
	}
	if req.Description != nil {
		company.Description = req.Description
	}
	if req.LogoURL != nil {
		company.LogoURL = req.LogoURL
	}
	if req.Address != nil {
		company.Address = req.Address
	}
	if req.Phone != nil {
		company.Phone = req.Phone
	}
	if req.Status != nil {
		company.Status = master.CompanyStatus(*req.Status)
	}
	if req.IsActive != nil {
		company.IsActive = *req.IsActive
	}

	if err := s.repo.UpdateCompany(ctx, company); err != nil {
		return nil, fmt.Errorf("failed to update company: %w", err)
	}

	return s.repo.GetCompanyByID(ctx, company.ID)
}

func (s *masterService) DeleteCompany(ctx context.Context, id string, deleterID string) error {
	// Check if deleter has permission (only Super Admin can delete companies)
	deleter, err := s.getUserByID(ctx, deleterID)
	if err != nil {
		return err
	}

	if deleter.Role != auth.UserRoleSuperAdmin {
		return models.NewMasterDataError(models.ErrCodePermissionDenied, "only super admin can delete companies", "")
	}

	// Check if company exists
	company, err := s.repo.GetCompanyByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.NewMasterDataError(models.ErrCodeNotFound, "company not found", "id")
		}
		return fmt.Errorf("failed to get company: %w", err)
	}

	// Check for estate dependencies
	if len(company.Estates) > 0 {
		return models.NewMasterDataError(
			models.ErrCodeDependencyExists,
			fmt.Sprintf(
				"Perusahaan tidak dapat dihapus karena masih memiliki %d estate. Hapus atau pindahkan semua estate terlebih dahulu.",
				len(company.Estates),
			),
			"",
		)
	}

	// Check for user dependencies via separate query (users are related via assignments, not direct FK)
	var userCount int64
	if err := s.db.Table("users").Where("company_id = ?", id).Count(&userCount).Error; err != nil {
		return fmt.Errorf("failed to check user dependencies: %w", err)
	}
	if userCount > 0 {
		return models.NewMasterDataError(
			models.ErrCodeDependencyExists,
			fmt.Sprintf(
				"Perusahaan tidak dapat dihapus karena masih memiliki %d pengguna. Nonaktifkan atau pindahkan pengguna tersebut terlebih dahulu.",
				userCount,
			),
			"",
		)
	}

	var companyAssignmentCount int64
	if err := s.db.Table("user_company_assignments").Where("company_id = ?", id).Count(&companyAssignmentCount).Error; err != nil {
		return fmt.Errorf("failed to check company assignment dependencies: %w", err)
	}
	if companyAssignmentCount > 0 {
		return models.NewMasterDataError(
			models.ErrCodeDependencyExists,
			fmt.Sprintf(
				"Perusahaan tidak dapat dihapus karena masih memiliki %d assignment user-company. Hapus assignment tersebut terlebih dahulu.",
				companyAssignmentCount,
			),
			"",
		)
	}

	return s.repo.DeleteCompany(ctx, id)
}

// Estate operations

func (s *masterService) CreateEstate(ctx context.Context, req *models.CreateEstateRequest, creatorID string) (*models.Estate, error) {
	// Validate input
	if err := s.validator.Struct(req); err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeInvalidInput, "invalid input data", "")
	}

	// Validate access to company
	if err := s.ValidateCompanyAccess(ctx, creatorID, req.CompanyID); err != nil {
		return nil, err
	}

	// Check if creator has permission
	creator, err := s.getUserByID(ctx, creatorID)
	if err != nil {
		return nil, err
	}

	allowedRoles := []auth.UserRole{auth.UserRoleSuperAdmin, auth.UserRoleCompanyAdmin}
	if err := s.ValidateUserRole(creator.Role, allowedRoles); err != nil {
		return nil, err
	}

	// Create estate
	estate := &models.Estate{
		Name:      req.Name,
		Code:      req.Code,
		Location:  &req.Location,
		LuasHa:    req.LuasHa,
		CompanyID: req.CompanyID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.repo.CreateEstate(ctx, estate); err != nil {
		return nil, fmt.Errorf("failed to create estate: %w", err)
	}

	return s.repo.GetEstateByID(ctx, estate.ID)
}

func (s *masterService) GetEstateByID(ctx context.Context, id string, userID string) (*models.Estate, error) {
	// Validate access
	if err := s.ValidateEstateAccess(ctx, userID, id); err != nil {
		return nil, err
	}

	estate, err := s.repo.GetEstateByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewMasterDataError(models.ErrCodeNotFound, "estate not found", "id")
		}
		return nil, fmt.Errorf("failed to get estate: %w", err)
	}

	return estate, nil
}

func (s *masterService) GetEstates(ctx context.Context, filters *models.MasterFilters, userID string) ([]*models.Estate, error) {
	user, err := s.getUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Filter based on user role and assignments
	if filters == nil {
		filters = &models.MasterFilters{}
	}

	// Apply estate-level access control
	switch user.Role {
	case auth.UserRoleSuperAdmin:
		// Super admin can see all estates
	case auth.UserRoleAreaManager:
		// Area manager can see estates in assigned companies
		companyAssignments, err := s.repo.GetUserCompanyAssignments(ctx, userID)
		if err != nil {
			return nil, err
		}
		if len(companyAssignments) == 0 {
		}
	case auth.UserRoleManager:
		// Manager can see assigned estates
		// This would require getting assigned estates and filtering
	default:
		// Other roles can only see estates in their company
		assignments, err := s.repo.GetUserCompanyAssignments(ctx, userID)
		if err != nil {
			return nil, err
		}
		if len(assignments) > 0 {
			filters.CompanyID = &assignments[0].CompanyID
		} else {
			return []*models.Estate{}, nil
		}
	}

	return s.repo.GetEstates(ctx, filters)
}
func (s *masterService) UpdateEstate(ctx context.Context, req *models.UpdateEstateRequest, updaterID string) (*models.Estate, error) {
	// Validate input
	if err := s.validator.Struct(req); err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeInvalidInput, "invalid input data", "")
	}

	// Validate access
	if err := s.ValidateEstateAccess(ctx, updaterID, req.ID); err != nil {
		return nil, err
	}

	// Get existing estate
	estate, err := s.repo.GetEstateByID(ctx, req.ID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewMasterDataError(models.ErrCodeNotFound, "estate not found", "id")
		}
		return nil, fmt.Errorf("failed to get estate: %w", err)
	}

	// Update fields
	if req.Name != nil {
		estate.Name = *req.Name
	}
	if req.Code != nil {
		estate.Code = *req.Code
	}
	if req.Location != nil {
		estate.Location = req.Location
	}
	if req.LuasHa != nil {
		estate.LuasHa = req.LuasHa
	}

	if err := s.repo.UpdateEstate(ctx, estate); err != nil {
		return nil, fmt.Errorf("failed to update estate: %w", err)
	}

	return s.repo.GetEstateByID(ctx, estate.ID)
}

func (s *masterService) DeleteEstate(ctx context.Context, id string, deleterID string) error {
	// Validate access
	if err := s.ValidateEstateAccess(ctx, deleterID, id); err != nil {
		return err
	}

	// Check if estate exists and get dependencies
	estate, err := s.repo.GetEstateByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.NewMasterDataError(models.ErrCodeNotFound, "estate not found", "id")
		}
		return fmt.Errorf("failed to get estate: %w", err)
	}

	// Check for dependencies
	if len(estate.Divisions) > 0 {
		return models.NewMasterDataError(
			models.ErrCodeDependencyExists,
			fmt.Sprintf(
				"Estate tidak dapat dihapus karena masih memiliki %d divisi. Hapus atau pindahkan semua divisi terlebih dahulu.",
				len(estate.Divisions),
			),
			"",
		)
	}

	var estateAssignmentCount int64
	if err := s.db.Table("user_estate_assignments").Where("estate_id = ?", id).Count(&estateAssignmentCount).Error; err != nil {
		return fmt.Errorf("failed to check estate assignment dependencies: %w", err)
	}
	if estateAssignmentCount > 0 {
		return models.NewMasterDataError(
			models.ErrCodeDependencyExists,
			fmt.Sprintf(
				"Estate tidak dapat dihapus karena masih memiliki %d assignment user-estate. Hapus assignment tersebut terlebih dahulu.",
				estateAssignmentCount,
			),
			"",
		)
	}

	return s.repo.DeleteEstate(ctx, id)
}

// Block operations (similar pattern as estates)
func (s *masterService) CreateBlock(ctx context.Context, req *models.CreateBlockRequest, creatorID string) (*models.Block, error) {
	req.BlockCode = strings.TrimSpace(req.BlockCode)
	req.Name = strings.TrimSpace(req.Name)
	shouldAutoGenerateBlockCode := req.BlockCode == ""
	req.Status = strings.ToUpper(strings.TrimSpace(req.Status))
	req.ISTM = strings.ToUpper(strings.TrimSpace(req.ISTM))
	if req.Status == "" {
		req.Status = "INTI"
	}
	if req.ISTM == "" {
		req.ISTM = "N"
	}
	if req.TarifBlokID != nil && strings.TrimSpace(*req.TarifBlokID) == "" {
		req.TarifBlokID = nil
	}
	normalizeOptionalUUIDPtr(&req.LandTypeID)

	// Compatibility guard:
	// some running builds may still have BlockCode tagged as required.
	// Keep validation for other fields while allowing auto-generated block code.
	if shouldAutoGenerateBlockCode {
		req.BlockCode = "AUTO"
	}

	// Validate input
	if err := s.validator.Struct(req); err != nil {
		return nil, buildCreateBlockValidationError(err)
	}

	// Validate access to division (which includes estate access)
	if err := s.ValidateDivisionAccess(ctx, creatorID, req.DivisionID); err != nil {
		return nil, err
	}

	if shouldAutoGenerateBlockCode {
		autoCode, err := s.generateAutoBlockCode(ctx, req.DivisionID)
		if err != nil {
			return nil, err
		}
		req.BlockCode = autoCode
	}

	blockCompanyID, _, err := s.getDivisionScopeIDs(ctx, req.DivisionID)
	if err != nil {
		return nil, err
	}

	if req.LandTypeID != nil {
		if _, err := s.repo.GetLandTypeByID(ctx, *req.LandTypeID); err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, models.NewMasterDataError(models.ErrCodeNotFound, "land type tidak ditemukan", "landTypeId")
			}
			return nil, fmt.Errorf("failed to get land type: %w", err)
		}
	}

	if err := s.ensureBlockSequenceUniqueInEstate(ctx, blockCompanyID, req.DivisionID, req.BlockCode, nil); err != nil {
		return nil, err
	}
	if err := s.ensureBlockNameUniqueInCompany(ctx, blockCompanyID, req.Name, nil); err != nil {
		return nil, err
	}

	var perlakuan *string
	if req.TarifBlokID != nil && *req.TarifBlokID != "" {
		tarifBlok, err := s.repo.GetTarifBlokByID(ctx, *req.TarifBlokID)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, models.NewMasterDataError(models.ErrCodeNotFound, "tarif blok tidak ditemukan", "tarifBlokId")
			}
			return nil, fmt.Errorf("failed to get tarif blok: %w", err)
		}
		if tarifBlok.CompanyID != blockCompanyID {
			return nil, models.NewMasterDataError(
				models.ErrCodeBusinessRuleViolation,
				"tarif blok harus berasal dari company yang sama dengan block",
				"tarifBlokId",
			)
		}
		if matchErr := ensureLandTypeMatch(req.LandTypeID, tarifBlok.LandTypeID); matchErr != nil {
			return nil, matchErr
		}
		if req.LandTypeID == nil && tarifBlok.LandTypeID != nil {
			req.LandTypeID = tarifBlok.LandTypeID
		}
		perlakuan = &tarifBlok.Perlakuan
	}

	// Create block
	block := &models.Block{
		BlockCode:    req.BlockCode,
		Name:         req.Name,
		LuasHa:       req.LuasHa,
		CropType:     &req.CropType,
		PlantingYear: convertIntToInt32Ptr(req.PlantingYear),
		Status:       req.Status,
		ISTM:         req.ISTM,
		Perlakuan:    perlakuan,
		LandTypeID:   req.LandTypeID,
		TarifBlokID:  req.TarifBlokID,
		DivisionID:   req.DivisionID,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.repo.CreateBlock(ctx, block); err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return nil, models.NewMasterDataError(models.ErrCodeDuplicateEntry, "block code already exists in division", "blockCode")
		}
		return nil, fmt.Errorf("failed to create block: %w", err)
	}

	return s.repo.GetBlockByID(ctx, block.ID)
}

func (s *masterService) GetBlockByID(ctx context.Context, id string, userID string) (*models.Block, error) {
	block, err := s.repo.GetBlockByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewMasterDataError(models.ErrCodeNotFound, "block not found", "id")
		}
		return nil, fmt.Errorf("failed to get block: %w", err)
	}

	// Validate access to the division
	if err := s.ValidateDivisionAccess(ctx, userID, block.DivisionID); err != nil {
		return nil, err
	}

	return block, nil
}

func (s *masterService) GetBlocks(ctx context.Context, filters *models.MasterFilters, userID string) ([]*models.Block, error) {
	user, err := s.getUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Filter based on user role and assignments
	if filters == nil {
		filters = &models.MasterFilters{}
	}

	// Apply access control based on user role
	switch user.Role {
	case auth.UserRoleSuperAdmin:
		// Super admin can see all blocks
	default:
		// Other roles see blocks in their company
		if filters.CompanyID == nil {
			assignments, err := s.repo.GetUserCompanyAssignments(ctx, userID)
			if err != nil {
				return nil, err
			}
			if len(assignments) > 0 {
				filters.CompanyID = &assignments[0].CompanyID
			} else {
				return []*models.Block{}, nil
			}
		}
	}

	return s.repo.GetBlocks(ctx, filters)
}

func (s *masterService) GetLandTypes(ctx context.Context, userID string) ([]*models.LandType, error) {
	if _, err := s.getUserByID(ctx, userID); err != nil {
		return nil, err
	}
	activeOnly := true
	return s.repo.GetLandTypes(ctx, &activeOnly)
}

func (s *masterService) CreateLandType(ctx context.Context, req *models.CreateLandTypeRequest, creatorID string) (*models.LandType, error) {
	req.Code = normalizeLandTypeCode(req.Code)
	req.Name = strings.TrimSpace(req.Name)
	if req.Description != nil {
		trimmed := strings.TrimSpace(*req.Description)
		if trimmed == "" {
			req.Description = nil
		} else {
			req.Description = &trimmed
		}
	}

	if err := s.validator.Struct(req); err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeInvalidInput, "invalid input data", "")
	}
	if _, err := s.getUserByID(ctx, creatorID); err != nil {
		return nil, err
	}

	existing, err := s.repo.GetLandTypeByCode(ctx, req.Code)
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("failed to validate land type uniqueness: %w", err)
	}
	if err == nil && existing != nil {
		return nil, models.NewMasterDataError(
			models.ErrCodeDuplicateEntry,
			"kode land type sudah digunakan",
			"code",
		)
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	landType := &models.LandType{
		ID:          uuid.New().String(),
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
		IsActive:    isActive,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.repo.CreateLandType(ctx, landType); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(err.Error(), "unique") {
			return nil, models.NewMasterDataError(
				models.ErrCodeDuplicateEntry,
				"kode land type sudah digunakan",
				"code",
			)
		}
		return nil, fmt.Errorf("failed to create land type: %w", err)
	}

	return s.repo.GetLandTypeByID(ctx, landType.ID)
}

func (s *masterService) UpdateLandType(ctx context.Context, req *models.UpdateLandTypeRequest, updaterID string) (*models.LandType, error) {
	if req.Code != nil {
		normalized := normalizeLandTypeCode(*req.Code)
		req.Code = &normalized
	}
	if req.Name != nil {
		trimmed := strings.TrimSpace(*req.Name)
		req.Name = &trimmed
	}
	if req.Description != nil {
		trimmed := strings.TrimSpace(*req.Description)
		req.Description = &trimmed
	}

	if err := s.validator.Struct(req); err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeInvalidInput, "invalid input data", "")
	}
	if _, err := s.getUserByID(ctx, updaterID); err != nil {
		return nil, err
	}

	landType, err := s.repo.GetLandTypeByID(ctx, req.ID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewMasterDataError(models.ErrCodeNotFound, "land type tidak ditemukan", "id")
		}
		return nil, fmt.Errorf("failed to get land type: %w", err)
	}

	if req.Code != nil {
		existing, findErr := s.repo.GetLandTypeByCode(ctx, *req.Code)
		if findErr != nil && findErr != gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("failed to validate land type uniqueness: %w", findErr)
		}
		if findErr == nil && existing != nil && existing.ID != landType.ID {
			return nil, models.NewMasterDataError(
				models.ErrCodeDuplicateEntry,
				"kode land type sudah digunakan",
				"code",
			)
		}
		landType.Code = *req.Code
	}

	if req.Name != nil {
		landType.Name = *req.Name
	}
	if req.Description != nil {
		if *req.Description == "" {
			landType.Description = nil
		} else {
			landType.Description = req.Description
		}
	}
	if req.IsActive != nil {
		landType.IsActive = *req.IsActive
	}

	if err := s.repo.UpdateLandType(ctx, landType); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(err.Error(), "unique") {
			return nil, models.NewMasterDataError(
				models.ErrCodeDuplicateEntry,
				"kode land type sudah digunakan",
				"code",
			)
		}
		return nil, fmt.Errorf("failed to update land type: %w", err)
	}

	return s.repo.GetLandTypeByID(ctx, landType.ID)
}

func (s *masterService) DeleteLandType(ctx context.Context, id string, deleterID string) error {
	if _, err := s.getUserByID(ctx, deleterID); err != nil {
		return err
	}

	if _, err := s.repo.GetLandTypeByID(ctx, id); err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.NewMasterDataError(models.ErrCodeNotFound, "land type tidak ditemukan", "id")
		}
		return fmt.Errorf("failed to get land type: %w", err)
	}

	var blockCount int64
	if err := s.db.WithContext(ctx).Table("blocks").Where("land_type_id = ?", id).Count(&blockCount).Error; err != nil {
		return fmt.Errorf("failed to validate land type usage in blocks: %w", err)
	}

	var tarifCount int64
	if err := s.db.WithContext(ctx).Table("tarif_blok").Where("land_type_id = ?", id).Count(&tarifCount).Error; err != nil {
		return fmt.Errorf("failed to validate land type usage in tarif blok: %w", err)
	}

	if blockCount > 0 || tarifCount > 0 {
		return models.NewMasterDataError(
			models.ErrCodeDependencyExists,
			fmt.Sprintf(
				"Land type tidak dapat dihapus karena masih digunakan oleh %d blok dan %d tarif blok.",
				blockCount,
				tarifCount,
			),
			"id",
		)
	}

	if err := s.repo.DeleteLandType(ctx, id); err != nil {
		return fmt.Errorf("failed to delete land type: %w", err)
	}

	return nil
}

func (s *masterService) GetTarifBloks(ctx context.Context, userID string) ([]*models.TarifBlok, error) {
	user, err := s.getUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if user.Role == auth.UserRoleSuperAdmin {
		return s.repo.GetTarifBloks(ctx, nil)
	}

	if companyID, ok := ctx.Value("company_id").(string); ok && strings.TrimSpace(companyID) != "" {
		return s.repo.GetTarifBloks(ctx, []string{companyID})
	}

	assignments, err := s.repo.GetUserCompanyAssignments(ctx, userID)
	if err != nil {
		return nil, err
	}
	if len(assignments) == 0 {
		return []*models.TarifBlok{}, nil
	}

	companyIDSet := make(map[string]struct{}, len(assignments))
	companyIDs := make([]string, 0, len(assignments))
	for _, assignment := range assignments {
		if !assignment.IsActive {
			continue
		}
		if _, exists := companyIDSet[assignment.CompanyID]; exists {
			continue
		}
		companyIDSet[assignment.CompanyID] = struct{}{}
		companyIDs = append(companyIDs, assignment.CompanyID)
	}

	if len(companyIDs) == 0 {
		return []*models.TarifBlok{}, nil
	}

	return s.repo.GetTarifBloks(ctx, companyIDs)
}

func (s *masterService) resolveCreateTarifBlokCompanyScope(
	ctx context.Context,
	creatorID string,
	requestedCompanyID string,
) (string, error) {
	trimmedRequested := strings.TrimSpace(requestedCompanyID)

	user, err := s.getUserByID(ctx, creatorID)
	if err != nil {
		return "", err
	}
	roleFromContext := auth.UserRole("")
	if roleValue := ctx.Value("user_role"); roleValue != nil {
		switch role := roleValue.(type) {
		case auth.UserRole:
			roleFromContext = role
		case string:
			roleFromContext = auth.UserRole(strings.TrimSpace(role))
		}
	}
	userRole := user.Role
	if roleFromContext != "" {
		userRole = roleFromContext
	}

	// Super admin can target any company.
	if userRole == auth.UserRoleSuperAdmin {
		return trimmedRequested, nil
	}

	// Only hard-enforce company scope for COMPANY_ADMIN.
	if userRole != auth.UserRoleCompanyAdmin {
		return trimmedRequested, nil
	}

	assignments, err := s.repo.GetUserCompanyAssignments(ctx, creatorID)
	if err != nil {
		return "", err
	}

	activeCompanyIDSet := make(map[string]struct{}, len(assignments))
	activeCompanyIDs := make([]string, 0, len(assignments))
	for _, assignment := range assignments {
		if assignment == nil || !assignment.IsActive {
			continue
		}

		companyID := strings.TrimSpace(assignment.CompanyID)
		if companyID == "" {
			continue
		}

		if _, exists := activeCompanyIDSet[companyID]; exists {
			continue
		}

		activeCompanyIDSet[companyID] = struct{}{}
		activeCompanyIDs = append(activeCompanyIDs, companyID)
	}

	if len(activeCompanyIDs) == 0 {
		return "", models.NewMasterDataError(
			models.ErrCodePermissionDenied,
			"company admin tidak memiliki assignment company aktif",
			"company_id",
		)
	}

	if scopedCompanyID, ok := ctx.Value("company_id").(string); ok {
		scopedCompanyID = strings.TrimSpace(scopedCompanyID)
		if scopedCompanyID != "" {
			if _, allowed := activeCompanyIDSet[scopedCompanyID]; !allowed {
				return "", models.NewMasterDataError(
					models.ErrCodePermissionDenied,
					"company_id pada session tidak termasuk assignment aktif",
					"company_id",
				)
			}

			if trimmedRequested != "" && trimmedRequested != scopedCompanyID {
				return "", models.NewMasterDataError(
					models.ErrCodePermissionDenied,
					"company_id tidak sesuai scope company admin",
					"company_id",
				)
			}

			return scopedCompanyID, nil
		}
	}

	if trimmedRequested != "" {
		if _, allowed := activeCompanyIDSet[trimmedRequested]; !allowed {
			return "", models.NewMasterDataError(
				models.ErrCodePermissionDenied,
				"company_id tidak termasuk assignment aktif user",
				"company_id",
			)
		}
		return trimmedRequested, nil
	}

	if len(activeCompanyIDs) == 1 {
		return activeCompanyIDs[0], nil
	}

	return "", models.NewMasterDataError(
		models.ErrCodeInvalidInput,
		"company_id wajib diisi untuk company admin yang memiliki lebih dari satu assignment aktif",
		"company_id",
	)
}

func (s *masterService) CreateTarifBlok(ctx context.Context, req *models.CreateTarifBlokRequest, creatorID string) (*models.TarifBlok, error) {
	resolvedCompanyID, err := s.resolveCreateTarifBlokCompanyScope(ctx, creatorID, req.CompanyID)
	if err != nil {
		return nil, err
	}
	req.CompanyID = resolvedCompanyID

	req.Perlakuan = strings.TrimSpace(req.Perlakuan)
	normalizeOptionalUUIDPtr(&req.LandTypeID)
	if req.Keterangan != nil {
		trimmed := strings.TrimSpace(*req.Keterangan)
		req.Keterangan = &trimmed
	}
	if req.TarifCode != nil {
		normalized := strings.ToUpper(strings.TrimSpace(*req.TarifCode))
		req.TarifCode = &normalized
	}
	if req.SchemeType != nil {
		normalized := strings.ToUpper(strings.TrimSpace(*req.SchemeType))
		req.SchemeType = &normalized
	}
	if req.BJRMinKg != nil && req.BJRMaxKg != nil && *req.BJRMinKg >= *req.BJRMaxKg {
		return nil, models.NewMasterDataError(
			models.ErrCodeInvalidInput,
			"bjr_min_kg harus lebih kecil dari bjr_max_kg",
			"bjr_min_kg",
		)
	}
	if req.TarifCode == nil || strings.TrimSpace(*req.TarifCode) == "" {
		return nil, models.NewMasterDataError(
			models.ErrCodeInvalidInput,
			"tarif_code wajib diisi",
			"tarifCode",
		)
	}

	if err := s.validator.Struct(req); err != nil {
		return nil, buildCreateTarifBlokValidationError(err)
	}

	if err := s.ValidateCompanyAccess(ctx, creatorID, req.CompanyID); err != nil {
		return nil, err
	}

	resolvedLandType, err := s.resolveLandTypeFromInput(ctx, req.LandTypeID, req.SchemeType)
	if err != nil {
		return nil, err
	}
	if resolvedLandType != nil {
		req.LandTypeID = &resolvedLandType.ID
		if req.SchemeType == nil || strings.TrimSpace(*req.SchemeType) == "" {
			code := resolvedLandType.Code
			req.SchemeType = &code
		}
	}

	alreadyExists, err := s.repo.ExistsTarifBlokByCompanyAndPerlakuan(ctx, req.CompanyID, req.Perlakuan, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to validate tarif blok uniqueness: %w", err)
	}
	if alreadyExists {
		return nil, models.NewMasterDataError(
			models.ErrCodeDuplicateEntry,
			"perlakuan already exists for this company",
			"perlakuan",
		)
	}

	if req.TarifCode != nil && req.LandTypeID != nil {
		var duplicateCount int64
		if err := s.db.WithContext(ctx).
			Table("tarif_blok").
			Where("company_id = ?", req.CompanyID).
			Where("land_type_id = ?", *req.LandTypeID).
			Where("LOWER(TRIM(tarif_code)) = LOWER(TRIM(?))", *req.TarifCode).
			Count(&duplicateCount).Error; err != nil {
			return nil, fmt.Errorf("failed to validate tarif code uniqueness: %w", err)
		}
		if duplicateCount > 0 {
			return nil, models.NewMasterDataError(
				models.ErrCodeDuplicateEntry,
				"tarif_code already exists for this land type in company",
				"tarifCode",
			)
		}
	} else if req.TarifCode != nil && req.SchemeType != nil {
		var duplicateCount int64
		if err := s.db.WithContext(ctx).
			Table("tarif_blok").
			Where("company_id = ?", req.CompanyID).
			Where("LOWER(TRIM(scheme_type)) = LOWER(TRIM(?))", *req.SchemeType).
			Where("LOWER(TRIM(tarif_code)) = LOWER(TRIM(?))", *req.TarifCode).
			Count(&duplicateCount).Error; err != nil {
			return nil, fmt.Errorf("failed to validate tarif code uniqueness by scheme type: %w", err)
		}
		if duplicateCount > 0 {
			return nil, models.NewMasterDataError(
				models.ErrCodeDuplicateEntry,
				"tarif_code already exists for this scheme in company",
				"tarifCode",
			)
		}
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	tarifBlok := &models.TarifBlok{
		ID:           uuid.New().String(),
		CompanyID:    req.CompanyID,
		Perlakuan:    req.Perlakuan,
		Keterangan:   req.Keterangan,
		LandTypeID:   req.LandTypeID,
		TarifCode:    req.TarifCode,
		SchemeType:   req.SchemeType,
		BJRMinKg:     req.BJRMinKg,
		BJRMaxKg:     req.BJRMaxKg,
		TargetLebih:  req.TargetLebih,
		SortOrder:    req.SortOrder,
		Basis:        req.Basis,
		TarifUpah:    req.TarifUpah,
		Premi:        req.Premi,
		TarifPremi1:  req.TarifPremi1,
		TarifPremi2:  req.TarifPremi2,
		TarifLibur:   req.TarifLibur,
		TarifLebaran: req.TarifLebaran,
		IsActive:     isActive,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.repo.CreateTarifBlok(ctx, tarifBlok); err != nil {
		if strings.Contains(err.Error(), "uq_tarif_blok_company_perlakuan") || strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return nil, models.NewMasterDataError(
				models.ErrCodeDuplicateEntry,
				"perlakuan already exists for this company",
				"perlakuan",
			)
		}
		return nil, fmt.Errorf("failed to create tarif blok: %w", err)
	}

	if err := s.syncTariffProjectionFromTarifBlok(ctx, tarifBlok); err != nil {
		return nil, fmt.Errorf("failed to sync tariff scheme projection: %w", err)
	}

	return s.repo.GetTarifBlokByID(ctx, tarifBlok.ID)
}

func (s *masterService) UpdateTarifBlok(ctx context.Context, req *models.UpdateTarifBlokRequest, updaterID string) (*models.TarifBlok, error) {
	if req.Perlakuan != nil {
		trimmed := strings.TrimSpace(*req.Perlakuan)
		req.Perlakuan = &trimmed
	}
	normalizeOptionalUUIDPtr(&req.LandTypeID)
	if req.Keterangan != nil {
		trimmed := strings.TrimSpace(*req.Keterangan)
		req.Keterangan = &trimmed
	}
	if req.TarifCode != nil {
		normalized := strings.ToUpper(strings.TrimSpace(*req.TarifCode))
		req.TarifCode = &normalized
	}
	if req.SchemeType != nil {
		normalized := strings.ToUpper(strings.TrimSpace(*req.SchemeType))
		req.SchemeType = &normalized
	}
	if req.BJRMinKg != nil && req.BJRMaxKg != nil && *req.BJRMinKg >= *req.BJRMaxKg {
		return nil, models.NewMasterDataError(
			models.ErrCodeInvalidInput,
			"bjr_min_kg harus lebih kecil dari bjr_max_kg",
			"bjr_min_kg",
		)
	}

	if err := s.validator.Struct(req); err != nil {
		return nil, buildCreateTarifBlokValidationError(err)
	}

	tarifBlok, err := s.repo.GetTarifBlokByID(ctx, req.ID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewMasterDataError(models.ErrCodeNotFound, "tarif blok not found", "id")
		}
		return nil, fmt.Errorf("failed to get tarif blok: %w", err)
	}

	if err := s.ValidateCompanyAccess(ctx, updaterID, tarifBlok.CompanyID); err != nil {
		return nil, err
	}

	if req.CompanyID != nil {
		if err := s.ValidateCompanyAccess(ctx, updaterID, *req.CompanyID); err != nil {
			return nil, err
		}
		tarifBlok.CompanyID = *req.CompanyID
	}
	if req.Perlakuan != nil {
		tarifBlok.Perlakuan = *req.Perlakuan
	}
	if req.Keterangan != nil {
		tarifBlok.Keterangan = req.Keterangan
	}
	if req.LandTypeID != nil {
		tarifBlok.LandTypeID = req.LandTypeID
	}
	if req.TarifCode != nil {
		tarifBlok.TarifCode = req.TarifCode
	}
	if req.SchemeType != nil {
		tarifBlok.SchemeType = req.SchemeType
	}

	resolvedLandType, err := s.resolveLandTypeFromInput(ctx, tarifBlok.LandTypeID, tarifBlok.SchemeType)
	if err != nil {
		return nil, err
	}
	if resolvedLandType != nil {
		tarifBlok.LandTypeID = &resolvedLandType.ID
		if tarifBlok.SchemeType == nil || strings.TrimSpace(*tarifBlok.SchemeType) == "" {
			code := resolvedLandType.Code
			tarifBlok.SchemeType = &code
		}
	}
	if tarifBlok.TarifCode == nil || strings.TrimSpace(*tarifBlok.TarifCode) == "" {
		return nil, models.NewMasterDataError(
			models.ErrCodeInvalidInput,
			"tarif_code wajib diisi",
			"tarifCode",
		)
	}

	if req.CompanyID != nil || req.Perlakuan != nil {
		alreadyExists, err := s.repo.ExistsTarifBlokByCompanyAndPerlakuan(
			ctx,
			tarifBlok.CompanyID,
			tarifBlok.Perlakuan,
			&tarifBlok.ID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to validate tarif blok uniqueness: %w", err)
		}
		if alreadyExists {
			return nil, models.NewMasterDataError(
				models.ErrCodeDuplicateEntry,
				"perlakuan already exists for this company",
				"perlakuan",
			)
		}
	}

	if req.BJRMinKg != nil {
		tarifBlok.BJRMinKg = req.BJRMinKg
	}
	if req.BJRMaxKg != nil {
		tarifBlok.BJRMaxKg = req.BJRMaxKg
	}
	if req.TargetLebih != nil {
		tarifBlok.TargetLebih = req.TargetLebih
	}
	if req.SortOrder != nil {
		tarifBlok.SortOrder = req.SortOrder
	}

	if tarifBlok.BJRMinKg != nil && tarifBlok.BJRMaxKg != nil && *tarifBlok.BJRMinKg >= *tarifBlok.BJRMaxKg {
		return nil, models.NewMasterDataError(
			models.ErrCodeInvalidInput,
			"bjr_min_kg harus lebih kecil dari bjr_max_kg",
			"bjr_min_kg",
		)
	}

	if tarifBlok.TarifCode != nil && tarifBlok.LandTypeID != nil {
		var duplicateCount int64
		if err := s.db.WithContext(ctx).
			Table("tarif_blok").
			Where("company_id = ?", tarifBlok.CompanyID).
			Where("land_type_id = ?", *tarifBlok.LandTypeID).
			Where("LOWER(TRIM(tarif_code)) = LOWER(TRIM(?))", *tarifBlok.TarifCode).
			Where("id <> ?", tarifBlok.ID).
			Count(&duplicateCount).Error; err != nil {
			return nil, fmt.Errorf("failed to validate tarif code uniqueness: %w", err)
		}
		if duplicateCount > 0 {
			return nil, models.NewMasterDataError(
				models.ErrCodeDuplicateEntry,
				"tarif_code already exists for this land type in company",
				"tarifCode",
			)
		}
	} else if tarifBlok.TarifCode != nil && tarifBlok.SchemeType != nil {
		var duplicateCount int64
		if err := s.db.WithContext(ctx).
			Table("tarif_blok").
			Where("company_id = ?", tarifBlok.CompanyID).
			Where("LOWER(TRIM(scheme_type)) = LOWER(TRIM(?))", *tarifBlok.SchemeType).
			Where("LOWER(TRIM(tarif_code)) = LOWER(TRIM(?))", *tarifBlok.TarifCode).
			Where("id <> ?", tarifBlok.ID).
			Count(&duplicateCount).Error; err != nil {
			return nil, fmt.Errorf("failed to validate tarif code uniqueness by scheme type: %w", err)
		}
		if duplicateCount > 0 {
			return nil, models.NewMasterDataError(
				models.ErrCodeDuplicateEntry,
				"tarif_code already exists for this scheme in company",
				"tarifCode",
			)
		}
	}

	if req.Basis != nil {
		tarifBlok.Basis = req.Basis
	}
	if req.TarifUpah != nil {
		tarifBlok.TarifUpah = req.TarifUpah
	}
	if req.Premi != nil {
		tarifBlok.Premi = req.Premi
	}
	if req.TarifPremi1 != nil {
		tarifBlok.TarifPremi1 = req.TarifPremi1
	}
	if req.TarifPremi2 != nil {
		tarifBlok.TarifPremi2 = req.TarifPremi2
	}
	if req.TarifLibur != nil {
		tarifBlok.TarifLibur = req.TarifLibur
	}
	if req.TarifLebaran != nil {
		tarifBlok.TarifLebaran = req.TarifLebaran
	}
	if req.IsActive != nil {
		tarifBlok.IsActive = *req.IsActive
	}

	if err := s.repo.UpdateTarifBlok(ctx, tarifBlok); err != nil {
		if strings.Contains(err.Error(), "uq_tarif_blok_company_perlakuan") || strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return nil, models.NewMasterDataError(
				models.ErrCodeDuplicateEntry,
				"perlakuan already exists for this company",
				"perlakuan",
			)
		}
		return nil, fmt.Errorf("failed to update tarif blok: %w", err)
	}

	// Keep denormalized blocks.perlakuan aligned with the linked tariff rule.
	if err := s.db.WithContext(ctx).
		Table("blocks").
		Where("tarif_blok_id = ?", tarifBlok.ID).
		Where("perlakuan IS DISTINCT FROM ?", tarifBlok.Perlakuan).
		Update("perlakuan", tarifBlok.Perlakuan).Error; err != nil {
		return nil, fmt.Errorf("failed to sync block perlakuan from tarif blok: %w", err)
	}

	if err := s.syncTariffProjectionFromTarifBlok(ctx, tarifBlok); err != nil {
		return nil, fmt.Errorf("failed to sync tariff scheme projection: %w", err)
	}

	return s.repo.GetTarifBlokByID(ctx, tarifBlok.ID)
}

func (s *masterService) DeleteTarifBlok(ctx context.Context, id string, deleterID string) error {
	tarifBlok, err := s.repo.GetTarifBlokByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.NewMasterDataError(models.ErrCodeNotFound, "tarif blok not found", "id")
		}
		return fmt.Errorf("failed to get tarif blok: %w", err)
	}

	if err := s.ValidateCompanyAccess(ctx, deleterID, tarifBlok.CompanyID); err != nil {
		return err
	}

	var blockCount int64
	if err := s.db.WithContext(ctx).Table("blocks").Where("tarif_blok_id = ?", id).Count(&blockCount).Error; err != nil {
		return fmt.Errorf("failed to validate tarif blok usage: %w", err)
	}
	if blockCount > 0 {
		return models.NewMasterDataError(
			models.ErrCodeDependencyExists,
			fmt.Sprintf(
				"Tarif blok tidak dapat dihapus karena masih digunakan oleh %d blok. Lepaskan relasi tarif dari blok terkait terlebih dahulu.",
				blockCount,
			),
			"id",
		)
	}

	if err := s.repo.DeleteTarifBlok(ctx, id); err != nil {
		return fmt.Errorf("failed to delete tarif blok: %w", err)
	}

	if err := s.deleteTariffProjectionByRuleID(ctx, id); err != nil {
		return fmt.Errorf("failed to delete tariff scheme projection: %w", err)
	}

	return nil
}

func (s *masterService) UpdateBlock(ctx context.Context, req *models.UpdateBlockRequest, updaterID string) (*models.Block, error) {
	if req.BlockCode != nil {
		trimmedBlockCode := strings.TrimSpace(*req.BlockCode)
		req.BlockCode = &trimmedBlockCode
	}
	if req.Name != nil {
		trimmedName := strings.TrimSpace(*req.Name)
		req.Name = &trimmedName
	}
	if req.Status != nil {
		normalizedStatus := strings.ToUpper(strings.TrimSpace(*req.Status))
		if normalizedStatus == "" {
			req.Status = nil
		} else {
			req.Status = &normalizedStatus
		}
	}
	if req.ISTM != nil {
		normalizedISTM := strings.ToUpper(strings.TrimSpace(*req.ISTM))
		if normalizedISTM == "" {
			req.ISTM = nil
		} else {
			req.ISTM = &normalizedISTM
		}
	}
	normalizeOptionalUUIDPtr(&req.LandTypeID)
	if req.TarifBlokID != nil {
		trimmedTarifID := strings.TrimSpace(*req.TarifBlokID)
		req.TarifBlokID = &trimmedTarifID
	}

	// Validate input
	if err := s.validator.Struct(req); err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeInvalidInput, "invalid input data", "")
	}

	// Get existing block
	block, err := s.repo.GetBlockByID(ctx, req.ID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewMasterDataError(models.ErrCodeNotFound, "block not found", "id")
		}
		return nil, fmt.Errorf("failed to get block: %w", err)
	}

	// Validate access to division
	if err := s.ValidateDivisionAccess(ctx, updaterID, block.DivisionID); err != nil {
		return nil, err
	}

	blockCompanyID, _, err := s.getDivisionScopeIDs(ctx, block.DivisionID)
	if err != nil {
		return nil, err
	}

	if req.LandTypeID != nil {
		if _, err := s.repo.GetLandTypeByID(ctx, *req.LandTypeID); err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, models.NewMasterDataError(models.ErrCodeNotFound, "land type tidak ditemukan", "landTypeId")
			}
			return nil, fmt.Errorf("failed to get land type: %w", err)
		}
	}

	if req.BlockCode != nil {
		if err := s.ensureBlockSequenceUniqueInEstate(ctx, blockCompanyID, block.DivisionID, *req.BlockCode, &block.ID); err != nil {
			return nil, err
		}
	}
	if req.Name != nil {
		if err := s.ensureBlockNameUniqueInCompany(ctx, blockCompanyID, *req.Name, &block.ID); err != nil {
			return nil, err
		}
	}

	// Update fields
	if req.BlockCode != nil {
		block.BlockCode = *req.BlockCode
	}
	if req.Name != nil {
		block.Name = *req.Name
	}
	if req.LuasHa != nil {
		block.LuasHa = req.LuasHa
	}
	if req.CropType != nil {
		block.CropType = req.CropType
	}
	if req.PlantingYear != nil {
		block.PlantingYear = convertIntToInt32Ptr(req.PlantingYear)
	}
	if req.Status != nil {
		block.Status = *req.Status
	}
	if req.ISTM != nil {
		block.ISTM = *req.ISTM
	}
	if req.LandTypeID != nil {
		block.LandTypeID = req.LandTypeID
	}
	if req.TarifBlokID != nil {
		if *req.TarifBlokID == "" {
			block.TarifBlokID = nil
			block.Perlakuan = nil
			block.TarifBlok = nil
		} else {
			tarifBlok, err := s.repo.GetTarifBlokByID(ctx, *req.TarifBlokID)
			if err != nil {
				if err == gorm.ErrRecordNotFound {
					return nil, models.NewMasterDataError(models.ErrCodeNotFound, "tarif blok tidak ditemukan", "tarifBlokId")
				}
				return nil, fmt.Errorf("failed to get tarif blok: %w", err)
			}
			if tarifBlok.CompanyID != blockCompanyID {
				return nil, models.NewMasterDataError(
					models.ErrCodeBusinessRuleViolation,
					"tarif blok harus berasal dari company yang sama dengan block",
					"tarifBlokId",
				)
			}
			if matchErr := ensureLandTypeMatch(block.LandTypeID, tarifBlok.LandTypeID); matchErr != nil {
				return nil, matchErr
			}
			if block.LandTypeID == nil && tarifBlok.LandTypeID != nil {
				block.LandTypeID = tarifBlok.LandTypeID
			}
			nextTarifID := tarifBlok.ID
			block.TarifBlokID = &nextTarifID
			block.Perlakuan = &tarifBlok.Perlakuan
			block.TarifBlok = tarifBlok
		}
	}

	if block.TarifBlokID != nil && strings.TrimSpace(*block.TarifBlokID) != "" {
		tarifBlok, err := s.repo.GetTarifBlokByID(ctx, *block.TarifBlokID)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, models.NewMasterDataError(models.ErrCodeNotFound, "tarif blok tidak ditemukan", "tarifBlokId")
			}
			return nil, fmt.Errorf("failed to get tarif blok: %w", err)
		}
		if matchErr := ensureLandTypeMatch(block.LandTypeID, tarifBlok.LandTypeID); matchErr != nil {
			return nil, matchErr
		}
		if block.LandTypeID == nil && tarifBlok.LandTypeID != nil {
			block.LandTypeID = tarifBlok.LandTypeID
		}
	}

	if err := s.repo.UpdateBlock(ctx, block); err != nil {
		return nil, fmt.Errorf("failed to update block: %w", err)
	}

	return s.repo.GetBlockByID(ctx, block.ID)
}

func (s *masterService) DeleteBlock(ctx context.Context, id string, deleterID string) error {
	// Get block to check division access
	block, err := s.repo.GetBlockByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.NewMasterDataError(models.ErrCodeNotFound, "block not found", "id")
		}
		return fmt.Errorf("failed to get block: %w", err)
	}

	// Validate access to division
	if err := s.ValidateDivisionAccess(ctx, deleterID, block.DivisionID); err != nil {
		return err
	}

	var harvestCount int64
	if err := s.db.WithContext(ctx).Table("harvest_records").Where("block_id = ?", id).Count(&harvestCount).Error; err != nil {
		return fmt.Errorf("failed to check block harvest dependencies: %w", err)
	}
	if harvestCount > 0 {
		return models.NewMasterDataError(
			models.ErrCodeDependencyExists,
			fmt.Sprintf(
				"Blok tidak dapat dihapus karena sudah memiliki %d data panen. Gunakan blok lain untuk transaksi baru.",
				harvestCount,
			),
			"",
		)
	}

	if err := s.repo.DeleteBlock(ctx, id); err != nil {
		lowerErr := strings.ToLower(err.Error())
		if strings.Contains(lowerErr, "foreign key") || strings.Contains(lowerErr, "constraint") {
			return models.NewMasterDataError(
				models.ErrCodeDependencyExists,
				"Blok tidak dapat dihapus karena masih digunakan oleh data lain.",
				"",
			)
		}
		return err
	}

	return nil
}

// Division operations (similar pattern)
func (s *masterService) CreateDivision(ctx context.Context, req *models.CreateDivisionRequest, creatorID string) (*models.Division, error) {
	// Validate input
	if err := s.validator.Struct(req); err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeInvalidInput, "invalid input data", "")
	}

	// Validate access to estate
	if err := s.ValidateEstateAccess(ctx, creatorID, req.EstateID); err != nil {
		return nil, err
	}

	// Create division
	division := &models.Division{
		Name:      req.Name,
		Code:      req.Code,
		EstateID:  req.EstateID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.repo.CreateDivision(ctx, division); err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return nil, models.NewMasterDataError(models.ErrCodeDuplicateEntry, "division code already exists in estate", "code")
		}
		return nil, fmt.Errorf("failed to create division: %w", err)
	}

	return s.repo.GetDivisionByID(ctx, division.ID)
}

func (s *masterService) GetDivisionByID(ctx context.Context, id string, userID string) (*models.Division, error) {
	division, err := s.repo.GetDivisionByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewMasterDataError(models.ErrCodeNotFound, "division not found", "id")
		}
		return nil, fmt.Errorf("failed to get division: %w", err)
	}

	// Validate access to the estate
	if err := s.ValidateEstateAccess(ctx, userID, division.EstateID); err != nil {
		return nil, err
	}

	return division, nil
}

func (s *masterService) GetDivisions(ctx context.Context, filters *models.MasterFilters, userID string) ([]*models.Division, error) {
	user, err := s.getUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Filter based on user role and assignments
	if filters == nil {
		filters = &models.MasterFilters{}
	}

	// Apply access control based on user role
	switch user.Role {
	case auth.UserRoleSuperAdmin:
		// Super admin can see all divisions
	default:
		// Other roles see divisions in their company
		if filters.CompanyID == nil {
			assignments, err := s.repo.GetUserCompanyAssignments(ctx, userID)
			if err != nil {
				return nil, err
			}
			if len(assignments) > 0 {
				filters.CompanyID = &assignments[0].CompanyID
			} else {
				return []*models.Division{}, nil
			}
		}
	}

	return s.repo.GetDivisions(ctx, filters)
}

func (s *masterService) UpdateDivision(ctx context.Context, req *models.UpdateDivisionRequest, updaterID string) (*models.Division, error) {
	// Validate input
	if err := s.validator.Struct(req); err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeInvalidInput, "invalid input data", "")
	}

	// Get existing division
	division, err := s.repo.GetDivisionByID(ctx, req.ID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewMasterDataError(models.ErrCodeNotFound, "division not found", "id")
		}
		return nil, fmt.Errorf("failed to get division: %w", err)
	}

	// Validate access to estate
	if err := s.ValidateEstateAccess(ctx, updaterID, division.EstateID); err != nil {
		return nil, err
	}

	// Update fields
	if req.Name != nil {
		division.Name = *req.Name
	}
	if req.Code != nil {
		division.Code = *req.Code
	}

	if err := s.repo.UpdateDivision(ctx, division); err != nil {
		return nil, fmt.Errorf("failed to update division: %w", err)
	}

	return s.repo.GetDivisionByID(ctx, division.ID)
}

func (s *masterService) DeleteDivision(ctx context.Context, id string, deleterID string) error {
	// Get division to check estate access
	division, err := s.repo.GetDivisionByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.NewMasterDataError(models.ErrCodeNotFound, "division not found", "id")
		}
		return fmt.Errorf("failed to get division: %w", err)
	}

	// Validate access to estate
	if err := s.ValidateEstateAccess(ctx, deleterID, division.EstateID); err != nil {
		return err
	}

	if len(division.Blocks) > 0 {
		return models.NewMasterDataError(
			models.ErrCodeDependencyExists,
			fmt.Sprintf(
				"Divisi tidak dapat dihapus karena masih memiliki %d blok. Hapus atau pindahkan semua blok terlebih dahulu.",
				len(division.Blocks),
			),
			"",
		)
	}

	var divisionAssignmentCount int64
	if err := s.db.Table("user_division_assignments").Where("division_id = ?", id).Count(&divisionAssignmentCount).Error; err != nil {
		return fmt.Errorf("failed to check division assignment dependencies: %w", err)
	}
	if divisionAssignmentCount > 0 {
		return models.NewMasterDataError(
			models.ErrCodeDependencyExists,
			fmt.Sprintf(
				"Divisi tidak dapat dihapus karena masih memiliki %d assignment user-division. Hapus assignment tersebut terlebih dahulu.",
				divisionAssignmentCount,
			),
			"",
		)
	}

	if err := s.repo.DeleteDivision(ctx, id); err != nil {
		lowerErr := strings.ToLower(err.Error())
		if strings.Contains(lowerErr, "foreign key") || strings.Contains(lowerErr, "constraint") {
			return models.NewMasterDataError(
				models.ErrCodeDependencyExists,
				"Divisi tidak dapat dihapus karena masih digunakan oleh data lain.",
				"",
			)
		}
		return err
	}

	return nil
}

// Assignment operations

func (s *masterService) AssignUserToEstate(ctx context.Context, req *models.AssignUserToEstateRequest, assignerID string) (*models.UserEstateAssignment, error) {
	// Validate input
	if err := s.validator.Struct(req); err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeInvalidInput, "invalid input data", "")
	}

	// Validate access
	if err := s.ValidateEstateAccess(ctx, assignerID, req.EstateID); err != nil {
		return nil, err
	}

	// Get user to validate role
	user, err := s.getUserByID(ctx, req.UserID)
	if err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeNotFound, "user not found", "user_id")
	}

	// Allow Manager, ASISTEN, and MANDOR to be assigned to estates
	allowedRoles := []auth.UserRole{
		auth.UserRoleManager,
		auth.UserRoleAsisten,
		auth.UserRoleMandor,
	}
	if err := s.ValidateUserRole(user.Role, allowedRoles); err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeInvalidInput, "only managers, asisten, or mandor can be assigned to estates", "user_id")
	}
	if user.Role == auth.UserRoleManager {
		if err := s.ensureNoActiveEstateAssignmentConflictByRole(ctx, req.EstateID, req.UserID, auth.UserRoleManager); err != nil {
			return nil, err
		}
	}

	// MANDATORY DIVISION CHECK for ASISTEN and MANDOR
	if user.Role == auth.UserRoleAsisten || user.Role == auth.UserRoleMandor {
		divisionAssignments, err := s.repo.GetUserDivisionAssignments(ctx, req.UserID)
		if err != nil {
			return nil, fmt.Errorf("failed to check division assignments: %w", err)
		}

		// Check if user has at least 1 active division assignment
		hasActiveDivision := false
		for _, assignment := range divisionAssignments {
			if assignment.IsActive {
				hasActiveDivision = true
				break
			}
		}

		if !hasActiveDivision {
			return nil, models.NewMasterDataError(
				models.ErrCodeBusinessRuleViolation,
				"ASISTEN and MANDOR must have at least one active division assignment before estate assignment",
				"user_id",
			)
		}
	}

	// Check for existing active assignment
	existingAssignments, err := s.repo.GetEstateAssignments(ctx, &req.UserID, &req.EstateID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing assignments: %w", err)
	}

	for _, assignment := range existingAssignments {
		if assignment.IsActive {
			return nil, models.NewMasterDataError(models.ErrCodeAssignmentConflict, "user already assigned to this estate", "")
		}
	}

	// Create assignment
	assignment := &models.UserEstateAssignment{
		UserID:     req.UserID,
		EstateID:   req.EstateID,
		IsActive:   true,
		AssignedBy: &assignerID,
		AssignedAt: time.Now(),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := s.repo.CreateEstateAssignment(ctx, assignment); err != nil {
		return nil, fmt.Errorf("failed to create estate assignment: %w", err)
	}

	return s.repo.GetEstateAssignmentByID(ctx, assignment.ID)
}

func (s *masterService) AssignUserToDivision(ctx context.Context, req *models.AssignUserToDivisionRequest, assignerID string) (*models.UserDivisionAssignment, error) {
	// Validate input
	if err := s.validator.Struct(req); err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeInvalidInput, "invalid input data", "")
	}

	// Get division to validate estate access
	division, err := s.repo.GetDivisionByID(ctx, req.DivisionID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewMasterDataError(models.ErrCodeNotFound, "division not found", "division_id")
		}
		return nil, fmt.Errorf("failed to get division: %w", err)
	}

	// Validate access to estate
	if err := s.ValidateEstateAccess(ctx, assignerID, division.EstateID); err != nil {
		return nil, err
	}

	// Get user to validate role
	user, err := s.getUserByID(ctx, req.UserID)
	if err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeNotFound, "user not found", "user_id")
	}

	// Only asisten and mandor can be assigned to divisions
	allowedRoles := []auth.UserRole{auth.UserRoleAsisten, auth.UserRoleMandor}
	if err := s.ValidateUserRole(user.Role, allowedRoles); err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeInvalidInput, "only asisten or mandor can be assigned to divisions", "user_id")
	}

	// Check for existing active assignment
	existingAssignments, err := s.repo.GetDivisionAssignments(ctx, &req.UserID, &req.DivisionID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing assignments: %w", err)
	}

	for _, assignment := range existingAssignments {
		if assignment.IsActive {
			return nil, models.NewMasterDataError(models.ErrCodeAssignmentConflict, "user already assigned to this division", "")
		}
	}

	// Create assignment
	assignment := &models.UserDivisionAssignment{
		UserID:     req.UserID,
		DivisionID: req.DivisionID,
		IsActive:   true,
		AssignedBy: &assignerID,
		AssignedAt: time.Now(),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := s.repo.CreateDivisionAssignment(ctx, assignment); err != nil {
		return nil, fmt.Errorf("failed to create division assignment: %w", err)
	}

	return s.repo.GetDivisionAssignmentByID(ctx, assignment.ID)
}

func (s *masterService) AssignUserToCompany(ctx context.Context, req *models.AssignUserToCompanyRequest, assignerID string) (*models.UserCompanyAssignment, error) {
	// Validate input
	if err := s.validator.Struct(req); err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeInvalidInput, "invalid input data", "")
	}

	// Only super admin can assign users to companies
	assigner, err := s.getUserByID(ctx, assignerID)
	if err != nil {
		return nil, err
	}

	if assigner.Role != auth.UserRoleSuperAdmin {
		return nil, models.NewMasterDataError(models.ErrCodePermissionDenied, "only super admin can assign users to companies", "")
	}

	// Get user to validate role
	user, err := s.getUserByID(ctx, req.UserID)
	if err != nil {
		return nil, models.NewMasterDataError(models.ErrCodeNotFound, "user not found", "user_id")
	}

	// Only area managers can be assigned to companies
	if user.Role != auth.UserRoleAreaManager {
		return nil, models.NewMasterDataError(models.ErrCodeInvalidInput, "only area managers can be assigned to companies", "user_id")
	}
	if err := s.ensureNoActiveCompanyAssignmentConflictByRole(ctx, req.CompanyID, req.UserID, auth.UserRoleAreaManager); err != nil {
		return nil, err
	}

	// Validate company access
	if err := s.ValidateCompanyAccess(ctx, assignerID, req.CompanyID); err != nil {
		return nil, err
	}

	// Check for existing active assignment
	existingAssignments, err := s.repo.GetCompanyAssignments(ctx, &req.UserID, &req.CompanyID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing assignments: %w", err)
	}

	for _, assignment := range existingAssignments {
		if assignment.IsActive {
			return nil, models.NewMasterDataError(models.ErrCodeAssignmentConflict, "user already assigned to this company", "")
		}
	}

	// Create assignment
	assignment := &models.UserCompanyAssignment{
		UserID:     req.UserID,
		CompanyID:  req.CompanyID,
		IsActive:   true,
		AssignedBy: &assignerID,
		AssignedAt: time.Now(),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := s.repo.CreateCompanyAssignment(ctx, assignment); err != nil {
		return nil, fmt.Errorf("failed to create company assignment: %w", err)
	}

	return s.repo.GetCompanyAssignmentByID(ctx, assignment.ID)
}

// Assignment removal operations
func (s *masterService) RemoveEstateAssignment(ctx context.Context, id string, removerID string) error {
	assignment, err := s.repo.GetEstateAssignmentByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.NewMasterDataError(models.ErrCodeNotFound, "estate assignment not found", "id")
		}
		return fmt.Errorf("failed to get estate assignment: %w", err)
	}

	// Validate access to estate
	if err := s.ValidateEstateAccess(ctx, removerID, assignment.EstateID); err != nil {
		return err
	}

	return s.repo.DeleteEstateAssignment(ctx, id)
}

func (s *masterService) RemoveDivisionAssignment(ctx context.Context, id string, removerID string) error {
	assignment, err := s.repo.GetDivisionAssignmentByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.NewMasterDataError(models.ErrCodeNotFound, "division assignment not found", "id")
		}
		return fmt.Errorf("failed to get division assignment: %w", err)
	}

	// Validate access to estate through division
	if err := s.ValidateEstateAccess(ctx, removerID, assignment.Division.EstateID); err != nil {
		return err
	}

	return s.repo.DeleteDivisionAssignment(ctx, id)
}

func (s *masterService) RemoveCompanyAssignment(ctx context.Context, id string, removerID string) error {
	// Only super admin can remove company assignments
	remover, err := s.getUserByID(ctx, removerID)
	if err != nil {
		return err
	}

	if remover.Role != auth.UserRoleSuperAdmin {
		return models.NewMasterDataError(models.ErrCodePermissionDenied, "only super admin can remove company assignments", "")
	}

	_, err = s.repo.GetCompanyAssignmentByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.NewMasterDataError(models.ErrCodeNotFound, "company assignment not found", "id")
		}
		return fmt.Errorf("failed to get company assignment: %w", err)
	}

	return s.repo.DeleteCompanyAssignment(ctx, id)
}

// Assignment query operations
func (s *masterService) GetEstateAssignments(ctx context.Context, userID string) ([]*models.UserEstateAssignment, error) {
	return s.repo.GetUserEstateAssignments(ctx, userID)
}

func (s *masterService) GetDivisionAssignments(ctx context.Context, userID string) ([]*models.UserDivisionAssignment, error) {
	return s.repo.GetUserDivisionAssignments(ctx, userID)
}

func (s *masterService) GetCompanyAssignments(ctx context.Context, userID string) ([]*models.UserCompanyAssignment, error) {
	return s.repo.GetUserCompanyAssignments(ctx, userID)
}

func (s *masterService) GetUserAssignments(ctx context.Context, userID string) (*models.UserAssignmentsResponse, error) {
	return s.repo.GetUserAssignments(ctx, userID)
}

// Validation and utility methods

func (s *masterService) ValidateCompanyAccess(ctx context.Context, userID string, companyID string) error {
	user, err := s.getUserByID(ctx, userID)
	if err != nil {
		return err
	}

	// Apply company-level access control
	switch user.Role {
	case auth.UserRoleSuperAdmin:
		// Super admin can see all companies
	case auth.UserRoleAreaManager:
		// Area manager can see assigned companies
		assignments, err := s.repo.GetUserCompanyAssignments(ctx, userID)
		if err != nil {
			return err
		}

		// Check if user has access to the company
		hasAccess := false
		for _, assignment := range assignments {
			if assignment.CompanyID == companyID {
				hasAccess = true
				break
			}
		}

		if !hasAccess {
			return models.NewMasterDataError(models.ErrCodePermissionDenied, "access denied to company", "")
		}
	case auth.UserRoleCompanyAdmin:
		// Company admin can only see their own company
		assignments, err := s.repo.GetUserCompanyAssignments(ctx, userID)
		if err != nil {
			return err
		}
		hasAccess := false
		for _, assignment := range assignments {
			if assignment.CompanyID == companyID {
				hasAccess = true
				break
			}
		}
		if !hasAccess {
			return models.NewMasterDataError(models.ErrCodePermissionDenied, "access denied to company", "")
		}
	default:
		// Other roles can only access their assigned company
		assignments, err := s.repo.GetUserCompanyAssignments(ctx, userID)
		if err != nil {
			return err
		}
		hasAccess := false
		for _, assignment := range assignments {
			if assignment.CompanyID == companyID {
				hasAccess = true
				break
			}
		}
		if !hasAccess {
			return models.NewMasterDataError(models.ErrCodePermissionDenied, "access denied to company", "")
		}
	}

	return nil
}

func (s *masterService) ValidateEstateAccess(ctx context.Context, userID string, estateID string) error {
	user, err := s.getUserByID(ctx, userID)
	if err != nil {
		return err
	}

	estate, err := s.repo.GetEstateByID(ctx, estateID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.NewMasterDataError(models.ErrCodeNotFound, "estate not found", "estate_id")
		}
		return fmt.Errorf("failed to get estate: %w", err)
	}

	switch user.Role {
	case auth.UserRoleSuperAdmin:
		return nil // Super admin has access to all estates
	case auth.UserRoleAreaManager:
		// Check if area manager is assigned to the estate's company
		return s.ValidateCompanyAccess(ctx, userID, estate.CompanyID)
	case auth.UserRoleManager:
		// Check if manager is assigned to this estate
		assignments, err := s.repo.GetEstateAssignments(ctx, &userID, &estateID)
		if err != nil {
			return fmt.Errorf("failed to check estate assignments: %w", err)
		}
		for _, assignment := range assignments {
			if assignment.IsActive {
				return nil
			}
		}
		return models.NewMasterDataError(models.ErrCodePermissionDenied, "access denied to estate", "")
	default:
		// Other roles need to be in the same company
		assignments, err := s.repo.GetUserCompanyAssignments(ctx, userID)
		if err != nil {
			return err
		}
		hasAccess := false
		for _, assignment := range assignments {
			if assignment.CompanyID == estate.CompanyID {
				hasAccess = true
				break
			}
		}
		if !hasAccess {
			return models.NewMasterDataError(models.ErrCodePermissionDenied, "access denied to estate", "")
		}
		return nil
	}
}

func (s *masterService) ValidateDivisionAccess(ctx context.Context, userID string, divisionID string) error {
	user, err := s.getUserByID(ctx, userID)
	if err != nil {
		return err
	}

	division, err := s.repo.GetDivisionByID(ctx, divisionID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.NewMasterDataError(models.ErrCodeNotFound, "division not found", "division_id")
		}
		return fmt.Errorf("failed to get division: %w", err)
	}

	switch user.Role {
	case auth.UserRoleSuperAdmin:
		return nil // Super admin has access to all divisions
	case auth.UserRoleAreaManager:
		// Check if area manager is assigned to the division's company
		return s.ValidateCompanyAccess(ctx, userID, division.Estate.CompanyID)
	case auth.UserRoleManager:
		// Check if manager is assigned to the division's estate
		return s.ValidateEstateAccess(ctx, userID, division.EstateID)
	case auth.UserRoleAsisten:
		// Check if asisten is assigned to this division
		assignments, err := s.repo.GetDivisionAssignments(ctx, &userID, &divisionID)
		if err != nil {
			return fmt.Errorf("failed to check division assignments: %w", err)
		}
		for _, assignment := range assignments {
			if assignment.IsActive {
				return nil
			}
		}
		return models.NewMasterDataError(models.ErrCodePermissionDenied, "access denied to division", "")
	case auth.UserRoleMandor:
		// Check if mandor is assigned to this division
		assignments, err := s.repo.GetDivisionAssignments(ctx, &userID, &divisionID)
		if err != nil {
			return fmt.Errorf("failed to check division assignments: %w", err)
		}
		for _, assignment := range assignments {
			if assignment.IsActive {
				return nil
			}
		}
		return models.NewMasterDataError(models.ErrCodePermissionDenied, "access denied to division", "")
	default:
		// Other roles need to be in the same company
		assignments, err := s.repo.GetUserCompanyAssignments(ctx, userID)
		if err != nil {
			return err
		}
		hasAccess := false
		for _, assignment := range assignments {
			if assignment.CompanyID == division.Estate.CompanyID {
				hasAccess = true
				break
			}
		}
		if !hasAccess {
			return models.NewMasterDataError(models.ErrCodePermissionDenied, "access denied to division", "")
		}
		return nil
	}
}

func (s *masterService) ValidateUserRole(userRole auth.UserRole, allowedRoles []auth.UserRole) error {
	for _, role := range allowedRoles {
		if userRole == role {
			return nil
		}
	}
	return models.NewMasterDataError(models.ErrCodePermissionDenied, "insufficient role permissions", "")
}

func (s *masterService) GetMasterDataStatistics(ctx context.Context, userID string, companyID *string) (*models.MasterDataStatistics, error) {
	// Validate access if company ID is provided
	if companyID != nil {
		if err := s.ValidateCompanyAccess(ctx, userID, *companyID); err != nil {
			return nil, err
		}
	}

	return s.repo.GetMasterDataStatistics(ctx, companyID)
}

// ValidateCompleteAssignments validates that ASISTEN and MANDOR have both division and estate assignments
func (s *masterService) ValidateCompleteAssignments(ctx context.Context, userID string, role auth.UserRole) error {
	if role != auth.UserRoleAsisten && role != auth.UserRoleMandor {
		return nil // Only validate for ASISTEN and MANDOR
	}

	// Check division assignments
	divisionAssignments, err := s.repo.GetUserDivisionAssignments(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to check division assignments: %w", err)
	}

	hasActiveDivision := false
	for _, assignment := range divisionAssignments {
		if assignment.IsActive {
			hasActiveDivision = true
			break
		}
	}

	if !hasActiveDivision {
		return models.NewMasterDataError(
			models.ErrCodeBusinessRuleViolation,
			fmt.Sprintf("%s must have at least one active division assignment", role),
			"user_id",
		)
	}

	// Check estate assignments
	estateAssignments, err := s.repo.GetUserEstateAssignments(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to check estate assignments: %w", err)
	}

	hasActiveEstate := false
	for _, assignment := range estateAssignments {
		if assignment.IsActive {
			hasActiveEstate = true
			break
		}
	}

	if !hasActiveEstate {
		return models.NewMasterDataError(
			models.ErrCodeBusinessRuleViolation,
			fmt.Sprintf("%s must have at least one active estate assignment", role),
			"user_id",
		)
	}

	return nil
}

func (s *masterService) ensureNoActiveEstateAssignmentConflictByRole(
	ctx context.Context,
	estateID string,
	excludeUserID string,
	role auth.UserRole,
) error {
	assignments, err := s.repo.GetEstateAssignments(ctx, nil, &estateID)
	if err != nil {
		return fmt.Errorf("failed to check estate assignment conflicts: %w", err)
	}

	for _, assignment := range assignments {
		if assignment == nil || !assignment.IsActive || assignment.UserID == excludeUserID {
			continue
		}
		if assignment.User == nil || !assignment.User.IsActive || assignment.User.Role != role {
			continue
		}

		conflictingUsername := strings.TrimSpace(assignment.User.Username)
		if conflictingUsername == "" {
			conflictingUsername = assignment.UserID
		}

		return models.NewMasterDataError(
			models.ErrCodeAssignmentConflict,
			fmt.Sprintf("%s tidak boleh memiliki assignment ESTATE aktif yang sama. Konflik pada user %s", role, conflictingUsername),
			"estate_id",
		)
	}

	return nil
}

func (s *masterService) ensureNoActiveCompanyAssignmentConflictByRole(
	ctx context.Context,
	companyID string,
	excludeUserID string,
	role auth.UserRole,
) error {
	assignments, err := s.repo.GetCompanyAssignments(ctx, nil, &companyID)
	if err != nil {
		return fmt.Errorf("failed to check company assignment conflicts: %w", err)
	}

	for _, assignment := range assignments {
		if assignment == nil || !assignment.IsActive || assignment.UserID == excludeUserID {
			continue
		}

		assignedUser, err := s.getUserByID(ctx, assignment.UserID)
		if err != nil || assignedUser == nil || !assignedUser.IsActive || assignedUser.Role != role {
			continue
		}

		conflictingUsername := strings.TrimSpace(assignedUser.Username)
		if conflictingUsername == "" {
			conflictingUsername = assignment.UserID
		}

		return models.NewMasterDataError(
			models.ErrCodeAssignmentConflict,
			fmt.Sprintf("%s tidak boleh memiliki assignment COMPANY aktif yang sama. Konflik pada user %s", role, conflictingUsername),
			"company_id",
		)
	}

	return nil
}

func (s *masterService) getDivisionScopeIDs(ctx context.Context, divisionID string) (string, string, error) {
	division, err := s.repo.GetDivisionByID(ctx, divisionID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", "", models.NewMasterDataError(models.ErrCodeNotFound, "division not found", "division_id")
		}
		return "", "", fmt.Errorf("failed to get division: %w", err)
	}

	estateID := strings.TrimSpace(division.EstateID)
	if estateID == "" && division.Estate != nil {
		estateID = strings.TrimSpace(division.Estate.ID)
	}
	if estateID == "" {
		return "", "", models.NewMasterDataError(models.ErrCodeBusinessRuleViolation, "estate pada divisi tidak valid", "division_id")
	}

	companyID := ""
	if division.Estate != nil {
		companyID = strings.TrimSpace(division.Estate.CompanyID)
	}
	if companyID != "" {
		return companyID, estateID, nil
	}

	estate, err := s.repo.GetEstateByID(ctx, estateID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", "", models.NewMasterDataError(models.ErrCodeNotFound, "estate not found", "estate_id")
		}
		return "", "", fmt.Errorf("failed to get estate: %w", err)
	}
	if estate.CompanyID == "" {
		return "", "", models.NewMasterDataError(models.ErrCodeBusinessRuleViolation, "company pada estate tidak valid", "division_id")
	}

	return estate.CompanyID, estateID, nil
}

type estateBlockCodeRow struct {
	ID           string
	BlockCode    string
	DivisionCode string
}

const (
	blockSequenceMax   = 999
	blockSequenceWidth = 3
)

func parseBlockSequence(blockCode string, divisionCode string) (int, error) {
	prefix := strings.ToUpper(strings.TrimSpace(divisionCode))
	if prefix == "" {
		return 0, fmt.Errorf("division code is empty")
	}

	normalizedCode := strings.ToUpper(strings.TrimSpace(blockCode))
	if normalizedCode == "" {
		return 0, fmt.Errorf("block code is empty")
	}
	if !strings.HasPrefix(normalizedCode, prefix) {
		return 0, fmt.Errorf("block code does not start with division code")
	}

	suffix := strings.TrimPrefix(normalizedCode, prefix)
	if suffix == "" {
		return 0, fmt.Errorf("block code suffix is empty")
	}
	if len(suffix) > blockSequenceWidth {
		return 0, fmt.Errorf("block code suffix exceeds %d digits", blockSequenceWidth)
	}

	sequence, err := strconv.Atoi(suffix)
	if err != nil || sequence <= 0 || sequence > blockSequenceMax {
		return 0, fmt.Errorf("block code suffix must be positive integer")
	}

	return sequence, nil
}

func nextAutoBlockCodeForEstate(divisionCode string, existingBlocks []estateBlockCodeRow) (string, error) {
	prefix := strings.ToUpper(strings.TrimSpace(divisionCode))
	if prefix == "" {
		return "", fmt.Errorf("division code is empty")
	}

	usedSequence := make(map[int]struct{}, len(existingBlocks))
	maxSequence := 0

	for _, block := range existingBlocks {
		sequence, err := parseBlockSequence(block.BlockCode, block.DivisionCode)
		if err != nil {
			continue
		}
		usedSequence[sequence] = struct{}{}
		if sequence > maxSequence {
			maxSequence = sequence
		}
	}

	if maxSequence >= blockSequenceMax {
		for sequence := 1; sequence <= blockSequenceMax; sequence++ {
			if _, exists := usedSequence[sequence]; exists {
				continue
			}
			candidate := fmt.Sprintf("%s%0*d", prefix, blockSequenceWidth, sequence)
			if len(candidate) > 50 {
				return "", fmt.Errorf("generated block code exceeds maximum length")
			}
			return candidate, nil
		}
		return "", fmt.Errorf("nomor urut blok di estate ini sudah habis (001-999)")
	}

	for sequence := maxSequence + 1; sequence <= blockSequenceMax; sequence++ {
		if _, exists := usedSequence[sequence]; exists {
			continue
		}
		candidate := fmt.Sprintf("%s%0*d", prefix, blockSequenceWidth, sequence)
		if len(candidate) > 50 {
			return "", fmt.Errorf("generated block code exceeds maximum length")
		}
		return candidate, nil
	}

	return "", fmt.Errorf("nomor urut blok di estate ini sudah mencapai %03d", blockSequenceMax)
}

func (s *masterService) getEstateBlockCodeRows(ctx context.Context, companyID string, estateID string) ([]estateBlockCodeRow, error) {
	var rows []estateBlockCodeRow
	err := s.db.WithContext(ctx).
		Table("blocks b").
		Select("b.id, b.block_code, d.code AS division_code").
		Joins("JOIN divisions d ON d.id = b.division_id").
		Joins("JOIN estates e ON e.id = d.estate_id").
		Where("e.company_id = ?", companyID).
		Where("e.id = ?", estateID).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return rows, nil
}

func (s *masterService) generateAutoBlockCode(ctx context.Context, divisionID string) (string, error) {
	division, err := s.repo.GetDivisionByID(ctx, divisionID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", models.NewMasterDataError(models.ErrCodeNotFound, "division not found", "division_id")
		}
		return "", fmt.Errorf("failed to get division: %w", err)
	}

	if strings.TrimSpace(division.Code) == "" {
		return "", models.NewMasterDataError(models.ErrCodeBusinessRuleViolation, "division code kosong, tidak dapat generate block code", "division_id")
	}

	companyID, estateID, err := s.getDivisionScopeIDs(ctx, divisionID)
	if err != nil {
		return "", err
	}

	existingBlocks, err := s.getEstateBlockCodeRows(ctx, companyID, estateID)
	if err != nil {
		return "", fmt.Errorf("failed to get existing block codes in estate scope: %w", err)
	}

	blockCode, err := nextAutoBlockCodeForEstate(division.Code, existingBlocks)
	if err != nil {
		return "", models.NewMasterDataError(models.ErrCodeBusinessRuleViolation, err.Error(), "block_code")
	}

	return blockCode, nil
}

func (s *masterService) ensureBlockSequenceUniqueInEstate(
	ctx context.Context,
	companyID string,
	divisionID string,
	blockCode string,
	excludeBlockID *string,
) error {
	division, err := s.repo.GetDivisionByID(ctx, divisionID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.NewMasterDataError(models.ErrCodeNotFound, "division not found", "division_id")
		}
		return fmt.Errorf("failed to get division: %w", err)
	}

	candidateSequence, err := parseBlockSequence(blockCode, division.Code)
	if err != nil {
		return models.NewMasterDataError(
			models.ErrCodeBusinessRuleViolation,
			"block_code harus mengikuti format kode_divisi + nomor urut",
			"blockCode",
		)
	}

	estateID := strings.TrimSpace(division.EstateID)
	if estateID == "" && division.Estate != nil {
		estateID = strings.TrimSpace(division.Estate.ID)
	}
	if estateID == "" {
		return models.NewMasterDataError(models.ErrCodeBusinessRuleViolation, "estate pada divisi tidak valid", "division_id")
	}

	existingBlocks, err := s.getEstateBlockCodeRows(ctx, companyID, estateID)
	if err != nil {
		return fmt.Errorf("failed to validate block number uniqueness: %w", err)
	}

	for _, existingBlock := range existingBlocks {
		if excludeBlockID != nil && existingBlock.ID == *excludeBlockID {
			continue
		}

		sequence, err := parseBlockSequence(existingBlock.BlockCode, existingBlock.DivisionCode)
		if err != nil {
			continue
		}
		if sequence != candidateSequence {
			continue
		}

		return models.NewMasterDataError(
			models.ErrCodeDuplicateEntry,
			fmt.Sprintf("nomor urut blok %d sudah digunakan pada estate yang sama di company ini", candidateSequence),
			"blockCode",
		)
	}

	return nil
}

func (s *masterService) ensureBlockNameUniqueInCompany(
	ctx context.Context,
	companyID string,
	blockName string,
	excludeBlockID *string,
) error {
	normalizedName := strings.TrimSpace(blockName)
	if normalizedName == "" {
		return models.NewMasterDataError(
			models.ErrCodeInvalidInput,
			"nama blok wajib diisi",
			"name",
		)
	}

	query := s.db.WithContext(ctx).
		Table("blocks b").
		Joins("JOIN divisions d ON d.id = b.division_id").
		Joins("JOIN estates e ON e.id = d.estate_id").
		Where("e.company_id = ?", companyID).
		Where("LOWER(TRIM(b.name)) = LOWER(TRIM(?))", normalizedName)

	if excludeBlockID != nil && strings.TrimSpace(*excludeBlockID) != "" {
		query = query.Where("b.id <> ?", *excludeBlockID)
	}

	var duplicateCount int64
	if err := query.Count(&duplicateCount).Error; err != nil {
		return fmt.Errorf("failed to validate block name uniqueness: %w", err)
	}
	if duplicateCount > 0 {
		return models.NewMasterDataError(
			models.ErrCodeDuplicateEntry,
			"nama blok sudah digunakan di company yang sama",
			"name",
		)
	}

	return nil
}

// Helper function to get user by ID
func (s *masterService) getUserByID(ctx context.Context, userID string) (*auth.User, error) {
	var user auth.User
	if err := s.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewMasterDataError(models.ErrCodeNotFound, "user not found", "user_id")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

// Helper function to convert *int to *int32
func convertIntToInt32Ptr(intPtr *int) *int32 {
	if intPtr == nil {
		return nil
	}
	val := int32(*intPtr)
	return &val
}

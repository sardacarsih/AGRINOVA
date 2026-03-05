package resolvers

import (
	employeeModels "agrinovagraphql/server/internal/employee/models"
	employeeServices "agrinovagraphql/server/internal/employee/services"
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/internal/graphql/generated"
	masterModels "agrinovagraphql/server/internal/master/models"
	masterRepositories "agrinovagraphql/server/internal/master/repositories"
	"agrinovagraphql/server/internal/middleware"
	notificationModels "agrinovagraphql/server/internal/notifications/models"
	notificationServices "agrinovagraphql/server/internal/notifications/services"
	"context"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var semesterPattern = regexp.MustCompile(`^\d{4}-(S1|S2)$`)

// Master data mutations

// CreateCompany is the resolver for the createCompany field.
func (r *mutationResolver) CreateCompany(ctx context.Context, input master.CreateCompanyInput) (*master.Company, error) {
	return r.MasterResolver.CreateCompany(ctx, input)
}

// UpdateCompany is the resolver for the updateCompany field.
func (r *mutationResolver) UpdateCompany(ctx context.Context, input master.UpdateCompanyInput) (*master.Company, error) {
	return r.MasterResolver.UpdateCompany(ctx, input)
}

// DeleteCompany is the resolver for the deleteCompany field.
func (r *mutationResolver) DeleteCompany(ctx context.Context, id string) (bool, error) {
	return r.MasterResolver.DeleteCompany(ctx, id)
}

// CreateEstate is the resolver for the createEstate field.
func (r *mutationResolver) CreateEstate(ctx context.Context, input master.CreateEstateInput) (*master.Estate, error) {
	return r.MasterResolver.CreateEstate(ctx, input)
}

// UpdateEstate is the resolver for the updateEstate field.
func (r *mutationResolver) UpdateEstate(ctx context.Context, input master.UpdateEstateInput) (*master.Estate, error) {
	return r.MasterResolver.UpdateEstate(ctx, input)
}

// DeleteEstate is the resolver for the deleteEstate field.
func (r *mutationResolver) DeleteEstate(ctx context.Context, id string) (bool, error) {
	return r.MasterResolver.DeleteEstate(ctx, id)
}

// CreateBlock is the resolver for the createBlock field.
func (r *mutationResolver) CreateBlock(ctx context.Context, input master.CreateBlockInput) (*master.Block, error) {
	return r.MasterResolver.CreateBlock(ctx, input)
}

// UpdateBlock is the resolver for the updateBlock field.
func (r *mutationResolver) UpdateBlock(ctx context.Context, input master.UpdateBlockInput) (*master.Block, error) {
	return r.MasterResolver.UpdateBlock(ctx, input)
}

// DeleteBlock is the resolver for the deleteBlock field.
func (r *mutationResolver) DeleteBlock(ctx context.Context, id string) (bool, error) {
	return r.MasterResolver.DeleteBlock(ctx, id)
}

// CreateTarifBlok is the resolver for the createTarifBlok field.
func (r *mutationResolver) CreateTarifBlok(ctx context.Context, input master.CreateTarifBlokInput) (*master.TarifBlok, error) {
	return r.MasterResolver.CreateTarifBlok(ctx, input)
}

// UpdateTarifBlok is the resolver for the updateTarifBlok field.
func (r *mutationResolver) UpdateTarifBlok(ctx context.Context, input master.UpdateTarifBlokInput) (*master.TarifBlok, error) {
	return r.MasterResolver.UpdateTarifBlok(ctx, input)
}

// DeleteTarifBlok is the resolver for the deleteTarifBlok field.
func (r *mutationResolver) DeleteTarifBlok(ctx context.Context, id string) (bool, error) {
	return r.MasterResolver.DeleteTarifBlok(ctx, id)
}

// CreateTariffRuleOverride is the resolver for the createTariffRuleOverride field.
func (r *mutationResolver) CreateTariffRuleOverride(ctx context.Context, input generated.CreateTariffRuleOverrideInput) (*generated.TariffRuleOverride, error) {
	userID, err := r.requireRBACPermission(ctx, "block:update")
	if err != nil {
		return nil, err
	}

	ruleID := strings.TrimSpace(input.RuleID)
	if ruleID == "" {
		return nil, fmt.Errorf("ruleId is required")
	}

	overrideType, err := normalizeTariffOverrideType(input.OverrideType)
	if err != nil {
		return nil, err
	}

	effectiveFrom := normalizeDateTimePointer(input.EffectiveFrom)
	effectiveTo := normalizeDateTimePointer(input.EffectiveTo)
	if err := validateTariffOverridePeriod(effectiveFrom, effectiveTo); err != nil {
		return nil, err
	}

	if input.TarifUpah == nil && input.Premi == nil && input.TarifPremi1 == nil && input.TarifPremi2 == nil {
		return nil, fmt.Errorf("minimal salah satu nilai tarif (tarifUpah/premi/tarifPremi1/tarifPremi2) wajib diisi")
	}

	companyID, err := r.resolveTariffRuleCompanyID(ctx, ruleID)
	if err != nil {
		return nil, err
	}
	if err := r.validateCompanyScope(ctx, userID, companyID); err != nil {
		return nil, err
	}

	isActive := true
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	if isActive {
		conflict, err := r.hasTariffOverridePeriodConflict(ctx, ruleID, overrideType, effectiveFrom, effectiveTo, nil)
		if err != nil {
			return nil, err
		}
		if conflict {
			return nil, fmt.Errorf("periode override bentrok dengan data override aktif lain untuk tipe %s", overrideType)
		}
	}

	now := time.Now()
	record := &tariffRuleOverrideRow{
		ID:            uuid.NewString(),
		RuleID:        ruleID,
		OverrideType:  string(overrideType),
		EffectiveFrom: effectiveFrom,
		EffectiveTo:   effectiveTo,
		TarifUpah:     input.TarifUpah,
		Premi:         input.Premi,
		TarifPremi1:   input.TarifPremi1,
		TarifPremi2:   input.TarifPremi2,
		Notes:         normalizeOptionalString(input.Notes),
		IsActive:      isActive,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := r.db.WithContext(ctx).Table("tariff_rule_overrides").Create(record).Error; err != nil {
		return nil, fmt.Errorf("failed to create tariff rule override: %w", err)
	}

	return toGraphQLTariffRuleOverride(record), nil
}

// UpdateTariffRuleOverride is the resolver for the updateTariffRuleOverride field.
func (r *mutationResolver) UpdateTariffRuleOverride(ctx context.Context, input generated.UpdateTariffRuleOverrideInput) (*generated.TariffRuleOverride, error) {
	userID, err := r.requireRBACPermission(ctx, "block:update")
	if err != nil {
		return nil, err
	}

	overrideID := strings.TrimSpace(input.ID)
	if overrideID == "" {
		return nil, fmt.Errorf("id is required")
	}

	existing, err := r.loadTariffRuleOverrideByID(ctx, overrideID)
	if err != nil {
		return nil, err
	}

	if err := r.validateCompanyScope(ctx, userID, existing.CompanyID); err != nil {
		return nil, err
	}

	nextType := existing.OverrideType
	if input.OverrideType != nil {
		validatedType, err := normalizeTariffOverrideType(*input.OverrideType)
		if err != nil {
			return nil, err
		}
		nextType = string(validatedType)
	}

	nextFrom := existing.EffectiveFrom
	if input.EffectiveFrom != nil {
		nextFrom = normalizeDateTimePointer(input.EffectiveFrom)
	}

	nextTo := existing.EffectiveTo
	if input.EffectiveTo != nil {
		nextTo = normalizeDateTimePointer(input.EffectiveTo)
	}

	if err := validateTariffOverridePeriod(nextFrom, nextTo); err != nil {
		return nil, err
	}

	nextIsActive := existing.IsActive
	if input.IsActive != nil {
		nextIsActive = *input.IsActive
	}

	if nextIsActive {
		nextEnumType := generated.TariffOverrideType(nextType)
		conflict, err := r.hasTariffOverridePeriodConflict(ctx, existing.RuleID, nextEnumType, nextFrom, nextTo, &overrideID)
		if err != nil {
			return nil, err
		}
		if conflict {
			return nil, fmt.Errorf("periode override bentrok dengan data override aktif lain untuk tipe %s", nextEnumType)
		}
	}

	updates := map[string]any{
		"updated_at": time.Now(),
	}

	if input.OverrideType != nil {
		updates["override_type"] = nextType
	}
	if input.EffectiveFrom != nil {
		updates["effective_from"] = nextFrom
	}
	if input.EffectiveTo != nil {
		updates["effective_to"] = nextTo
	}
	if input.TarifUpah != nil {
		updates["tarif_upah"] = input.TarifUpah
	}
	if input.Premi != nil {
		updates["premi"] = input.Premi
	}
	if input.TarifPremi1 != nil {
		updates["tarif_premi1"] = input.TarifPremi1
	}
	if input.TarifPremi2 != nil {
		updates["tarif_premi2"] = input.TarifPremi2
	}
	if input.Notes != nil {
		updates["notes"] = normalizeOptionalString(input.Notes)
	}
	if input.IsActive != nil {
		updates["is_active"] = input.IsActive
	}

	if err := r.db.WithContext(ctx).Table("tariff_rule_overrides").Where("id = ?", overrideID).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update tariff rule override: %w", err)
	}

	updated, err := r.loadTariffRuleOverrideByID(ctx, overrideID)
	if err != nil {
		return nil, err
	}

	return toGraphQLTariffRuleOverride(updated), nil
}

// DeleteTariffRuleOverride is the resolver for the deleteTariffRuleOverride field.
func (r *mutationResolver) DeleteTariffRuleOverride(ctx context.Context, id string) (bool, error) {
	userID, err := r.requireRBACPermission(ctx, "block:delete")
	if err != nil {
		return false, err
	}

	overrideID := strings.TrimSpace(id)
	if overrideID == "" {
		return false, fmt.Errorf("id is required")
	}

	existing, err := r.loadTariffRuleOverrideByID(ctx, overrideID)
	if err != nil {
		return false, err
	}

	if err := r.validateCompanyScope(ctx, userID, existing.CompanyID); err != nil {
		return false, err
	}

	if err := r.db.WithContext(ctx).Table("tariff_rule_overrides").Where("id = ?", overrideID).Delete(nil).Error; err != nil {
		return false, fmt.Errorf("failed to delete tariff rule override: %w", err)
	}

	return true, nil
}

// CreateLandType is the resolver for the createLandType field.
func (r *mutationResolver) CreateLandType(ctx context.Context, input master.CreateLandTypeInput) (*generated.LandType, error) {
	landType, err := r.MasterResolver.CreateLandType(ctx, master.CreateLandTypeInput{
		Code:        input.Code,
		Name:        input.Name,
		Description: input.Description,
		IsActive:    input.IsActive,
	})
	if err != nil {
		return nil, err
	}

	return &generated.LandType{
		ID:          landType.ID,
		Code:        landType.Code,
		Name:        landType.Name,
		Description: landType.Description,
		IsActive:    landType.IsActive,
		CreatedAt:   landType.CreatedAt,
		UpdatedAt:   landType.UpdatedAt,
	}, nil
}

// UpdateLandType is the resolver for the updateLandType field.
func (r *mutationResolver) UpdateLandType(ctx context.Context, input master.UpdateLandTypeInput) (*generated.LandType, error) {
	landType, err := r.MasterResolver.UpdateLandType(ctx, master.UpdateLandTypeInput{
		ID:          input.ID,
		Code:        input.Code,
		Name:        input.Name,
		Description: input.Description,
		IsActive:    input.IsActive,
	})
	if err != nil {
		return nil, err
	}

	return &generated.LandType{
		ID:          landType.ID,
		Code:        landType.Code,
		Name:        landType.Name,
		Description: landType.Description,
		IsActive:    landType.IsActive,
		CreatedAt:   landType.CreatedAt,
		UpdatedAt:   landType.UpdatedAt,
	}, nil
}

// DeleteLandType is the resolver for the deleteLandType field.
func (r *mutationResolver) DeleteLandType(ctx context.Context, id string) (bool, error) {
	return r.MasterResolver.DeleteLandType(ctx, id)
}

// CreateDivision is the resolver for the createDivision field.
func (r *mutationResolver) CreateDivision(ctx context.Context, input master.CreateDivisionInput) (*master.Division, error) {
	return r.MasterResolver.CreateDivision(ctx, input)
}

// UpdateDivision is the resolver for the updateDivision field.
func (r *mutationResolver) UpdateDivision(ctx context.Context, input master.UpdateDivisionInput) (*master.Division, error) {
	return r.MasterResolver.UpdateDivision(ctx, input)
}

// DeleteDivision is the resolver for the deleteDivision field.
func (r *mutationResolver) DeleteDivision(ctx context.Context, id string) (bool, error) {
	return r.MasterResolver.DeleteDivision(ctx, id)
}

// CreateEmployee is the resolver for the createEmployee field.
func (r *mutationResolver) CreateEmployee(ctx context.Context, input master.CreateEmployeeInput) (*master.Employee, error) {
	userID, err := r.requireRBACPermission(ctx, "employee:create")
	if err != nil {
		return nil, err
	}

	if err := r.validateCompanyScope(ctx, userID, input.CompanyID); err != nil {
		return nil, err
	}

	employee, err := r.EmployeeService.CreateEmployee(ctx, input)
	if err != nil {
		return nil, err
	}
	return convertEmployeeToGraphQL(employee), nil
}

// UpdateEmployee is the resolver for the updateEmployee field.
func (r *mutationResolver) UpdateEmployee(ctx context.Context, input generated.UpdateEmployeeInput) (*master.Employee, error) {
	userID, err := r.requireRBACPermission(ctx, "employee:update")
	if err != nil {
		return nil, err
	}

	existingEmployee, err := r.EmployeeService.GetEmployee(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	if err := r.validateCompanyScope(ctx, userID, existingEmployee.CompanyID); err != nil {
		return nil, err
	}

	if input.CompanyID != nil {
		if err := r.validateCompanyScope(ctx, userID, *input.CompanyID); err != nil {
			return nil, err
		}
	}

	updatedEmployee, err := r.EmployeeService.UpdateEmployee(ctx, master.UpdateEmployeeInput{
		ID:         input.ID,
		Name:       input.Name,
		Role:       input.Role,
		CompanyID:  input.CompanyID,
		DivisionID: input.DivisionID,
		PhotoURL:   input.PhotoURL,
		IsActive:   input.IsActive,
	})
	if err != nil {
		return nil, err
	}
	return convertEmployeeToGraphQL(updatedEmployee), nil
}

// SyncEmployees is the resolver for the syncEmployees field.
func (r *mutationResolver) SyncEmployees(ctx context.Context, input []*generated.SyncEmployeeInput) ([]*master.Employee, error) {
	userID, err := r.requireRBACPermission(ctx, "employee:update")
	if err != nil {
		return nil, err
	}

	convertedInput := make([]*master.SyncEmployeeInput, 0, len(input))
	for _, item := range input {
		if err := r.validateCompanyScope(ctx, userID, item.CompanyID); err != nil {
			return nil, err
		}
		convertedInput = append(convertedInput, &master.SyncEmployeeInput{
			Nik:       item.Nik,
			Name:      item.Name,
			Role:      item.Role,
			CompanyID: item.CompanyID,
			PhotoURL:  item.PhotoURL,
			IsActive:  item.IsActive,
		})
	}

	employees, err := r.EmployeeService.SyncEmployees(ctx, convertedInput)
	if err != nil {
		return nil, err
	}

	result := make([]*master.Employee, 0, len(employees))
	for _, employee := range employees {
		result = append(result, convertEmployeeToGraphQL(employee))
	}
	return result, nil
}

// CreateVehicle is the resolver for the createVehicle field.
func (r *mutationResolver) CreateVehicle(ctx context.Context, input master.CreateVehicleInput) (*master.Vehicle, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	companyID, err := r.resolveVehicleCreateCompanyID(ctx, userID, input.CompanyID)
	if err != nil {
		return nil, err
	}

	registrationPlate := normalizeVehicleRegistrationPlate(input.RegistrationPlate)
	chassisNumber := strings.TrimSpace(input.ChassisNumber)
	engineNumber := strings.TrimSpace(input.EngineNumber)
	brand := strings.TrimSpace(input.Brand)
	model := strings.TrimSpace(input.Model)
	vehicleCategory := normalizeVehicleCategory(input.VehicleCategory)
	vehicleType := strings.ToUpper(strings.TrimSpace(input.VehicleType))
	if registrationPlate == "" {
		return nil, fmt.Errorf("registrationPlate is required")
	}
	if chassisNumber == "" {
		return nil, fmt.Errorf("chassisNumber is required")
	}
	if engineNumber == "" {
		return nil, fmt.Errorf("engineNumber is required")
	}
	if input.ManufactureYear < 1900 || input.ManufactureYear > 2100 {
		return nil, fmt.Errorf("manufactureYear must be between 1900 and 2100")
	}
	if vehicleCategory == "" {
		return nil, fmt.Errorf("vehicleCategory is required")
	}
	if !isValidVehicleCategory(vehicleCategory) {
		return nil, fmt.Errorf("vehicleCategory must be one of CAR, MOTORCYCLE, TRUCK, HEAVY_EQUIPMENT")
	}
	if brand == "" {
		return nil, fmt.Errorf("brand is required")
	}
	if model == "" {
		return nil, fmt.Errorf("model is required")
	}
	if vehicleType == "" {
		return nil, fmt.Errorf("vehicleType is required")
	}

	var duplicateCount int64
	if err := r.db.WithContext(ctx).
		Model(&master.Vehicle{}).
		Where("company_id = ? AND registration_plate = ?", companyID, registrationPlate).
		Count(&duplicateCount).Error; err != nil {
		return nil, fmt.Errorf("failed to validate duplicate plate: %w", err)
	}
	if duplicateCount > 0 {
		return nil, fmt.Errorf("vehicle with registrationPlate %s already exists in this company", registrationPlate)
	}

	isActive := true
	if input.IsActive != nil {
		isActive = *input.IsActive
	}
	status := normalizeVehicleStatus(resolveVehicleInitialStatus(input.Status, isActive))
	if !isValidVehicleStatus(status) {
		return nil, fmt.Errorf("status must be one of ACTIVE, INACTIVE, SOLD, SCRAPPED, TRANSFERRED")
	}

	now := time.Now()
	var deactivatedAt *time.Time
	if !isActive || status != "ACTIVE" {
		deactivatedAt = &now
	}
	vehicle := &master.Vehicle{
		ID:                 uuid.NewString(),
		CompanyID:          companyID,
		RegistrationPlate:  registrationPlate,
		ChassisNumber:      chassisNumber,
		EngineNumber:       engineNumber,
		ManufactureYear:    input.ManufactureYear,
		VehicleCategory:    vehicleCategory,
		Brand:              brand,
		Model:              model,
		RegistrationRegion: normalizeOptionalString(input.RegistrationRegion),
		VehicleType:        vehicleType,
		AssignedDriverName: normalizeOptionalString(input.AssignedDriverName),
		Notes:              normalizeOptionalString(input.Notes),
		IsActive:           isActive,
		Status:             status,
		DeactivatedAt:      deactivatedAt,
		STNKExpiryDate:     input.STNKExpiryDate,
		KIRExpiryDate:      input.KIRExpiryDate,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if err := r.db.WithContext(ctx).Create(vehicle).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return nil, fmt.Errorf("vehicle with registrationPlate %s already exists in this company", registrationPlate)
		}
		return nil, fmt.Errorf("failed to create vehicle: %w", err)
	}

	return vehicle, nil
}

// UpdateVehicle is the resolver for the updateVehicle field.
func (r *mutationResolver) UpdateVehicle(ctx context.Context, input master.UpdateVehicleInput) (*master.Vehicle, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	vehicle, err := r.loadVehicleByID(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	if err := r.validateCompanyScope(ctx, userID, vehicle.CompanyID); err != nil {
		return nil, err
	}

	if input.RegistrationPlate != nil {
		registrationPlate := normalizeVehicleRegistrationPlate(*input.RegistrationPlate)
		if registrationPlate == "" {
			return nil, fmt.Errorf("registrationPlate must not be empty")
		}
		vehicle.RegistrationPlate = registrationPlate
	}
	if input.ChassisNumber != nil {
		chassisNumber := strings.TrimSpace(*input.ChassisNumber)
		if chassisNumber == "" {
			return nil, fmt.Errorf("chassisNumber must not be empty")
		}
		vehicle.ChassisNumber = chassisNumber
	}
	if input.EngineNumber != nil {
		engineNumber := strings.TrimSpace(*input.EngineNumber)
		if engineNumber == "" {
			return nil, fmt.Errorf("engineNumber must not be empty")
		}
		vehicle.EngineNumber = engineNumber
	}
	if input.ManufactureYear != nil {
		if *input.ManufactureYear < 1900 || *input.ManufactureYear > 2100 {
			return nil, fmt.Errorf("manufactureYear must be between 1900 and 2100")
		}
		vehicle.ManufactureYear = *input.ManufactureYear
	}
	if input.VehicleCategory != nil {
		vehicleCategory := normalizeVehicleCategory(*input.VehicleCategory)
		if !isValidVehicleCategory(vehicleCategory) {
			return nil, fmt.Errorf("vehicleCategory must be one of CAR, MOTORCYCLE, TRUCK, HEAVY_EQUIPMENT")
		}
		vehicle.VehicleCategory = vehicleCategory
	}
	if input.Brand != nil {
		brand := strings.TrimSpace(*input.Brand)
		if brand == "" {
			return nil, fmt.Errorf("brand must not be empty")
		}
		vehicle.Brand = brand
	}
	if input.Model != nil {
		model := strings.TrimSpace(*input.Model)
		if model == "" {
			return nil, fmt.Errorf("model must not be empty")
		}
		vehicle.Model = model
	}
	if input.RegistrationRegion != nil {
		vehicle.RegistrationRegion = normalizeOptionalString(input.RegistrationRegion)
	}
	if input.VehicleType != nil {
		vehicleType := strings.ToUpper(strings.TrimSpace(*input.VehicleType))
		if vehicleType == "" {
			return nil, fmt.Errorf("vehicleType must not be empty")
		}
		vehicle.VehicleType = vehicleType
	}
	if input.AssignedDriverName != nil {
		vehicle.AssignedDriverName = normalizeOptionalString(input.AssignedDriverName)
	}
	if input.Notes != nil {
		vehicle.Notes = normalizeOptionalString(input.Notes)
	}
	if input.Status != nil {
		status := normalizeVehicleStatus(*input.Status)
		if !isValidVehicleStatus(status) {
			return nil, fmt.Errorf("status must be one of ACTIVE, INACTIVE, SOLD, SCRAPPED, TRANSFERRED")
		}
		vehicle.Status = status
	}
	if input.IsActive != nil {
		vehicle.IsActive = *input.IsActive
	}
	if input.DeactivatedAt != nil {
		vehicle.DeactivatedAt = input.DeactivatedAt
	}
	if input.STNKExpiryDate != nil {
		vehicle.STNKExpiryDate = input.STNKExpiryDate
	}
	if input.KIRExpiryDate != nil {
		vehicle.KIRExpiryDate = input.KIRExpiryDate
	}

	vehicle.Status = resolveVehicleStatusFromState(vehicle.Status, vehicle.IsActive)
	if !vehicle.IsActive || vehicle.Status != "ACTIVE" {
		if vehicle.DeactivatedAt == nil {
			now := time.Now()
			vehicle.DeactivatedAt = &now
		}
	} else {
		vehicle.DeactivatedAt = nil
	}

	var duplicateCount int64
	if err := r.db.WithContext(ctx).
		Model(&master.Vehicle{}).
		Where("company_id = ? AND registration_plate = ? AND id <> ?", vehicle.CompanyID, vehicle.RegistrationPlate, vehicle.ID).
		Count(&duplicateCount).Error; err != nil {
		return nil, fmt.Errorf("failed to validate duplicate plate: %w", err)
	}
	if duplicateCount > 0 {
		return nil, fmt.Errorf("vehicle with registrationPlate %s already exists in this company", vehicle.RegistrationPlate)
	}

	vehicle.UpdatedAt = time.Now()
	if err := r.db.WithContext(ctx).Save(vehicle).Error; err != nil {
		return nil, fmt.Errorf("failed to update vehicle: %w", err)
	}

	return vehicle, nil
}

// DeleteVehicle is the resolver for the deleteVehicle field.
func (r *mutationResolver) DeleteVehicle(ctx context.Context, id string) (bool, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return false, fmt.Errorf("authentication required")
	}

	vehicle, err := r.loadVehicleByID(ctx, id)
	if err != nil {
		return false, err
	}

	if err := r.validateCompanyScope(ctx, userID, vehicle.CompanyID); err != nil {
		return false, err
	}

	if err := r.db.WithContext(ctx).Delete(&master.Vehicle{}, "id = ?", id).Error; err != nil {
		return false, fmt.Errorf("failed to delete vehicle: %w", err)
	}

	return true, nil
}

// CreateVehicleTax is the resolver for the createVehicleTax field.
func (r *mutationResolver) CreateVehicleTax(ctx context.Context, input generated.CreateVehicleTaxInput) (*generated.VehicleTax, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	vehicle, err := r.loadVehicleByID(ctx, input.VehicleID)
	if err != nil {
		return nil, err
	}
	if err := r.validateCompanyScope(ctx, userID, vehicle.CompanyID); err != nil {
		return nil, err
	}

	if input.TaxYear < 1900 || input.TaxYear > 2100 {
		return nil, fmt.Errorf("taxYear must be between 1900 and 2100")
	}
	if input.DueDate.IsZero() {
		return nil, fmt.Errorf("dueDate is required")
	}

	var duplicateCount int64
	if err := r.db.WithContext(ctx).
		Model(&master.VehicleTax{}).
		Where("vehicle_id = ? AND tax_year = ?", input.VehicleID, input.TaxYear).
		Count(&duplicateCount).Error; err != nil {
		return nil, fmt.Errorf("failed to validate duplicate vehicle tax: %w", err)
	}
	if duplicateCount > 0 {
		return nil, fmt.Errorf("vehicle tax for year %d already exists", input.TaxYear)
	}

	taxStatus := normalizeVehicleTaxStatus(resolveVehicleTaxInitialStatus(input.TaxStatus, input.PaymentDate, input.DueDate))
	if !isValidVehicleTaxStatus(taxStatus) {
		return nil, fmt.Errorf("taxStatus must be one of OPEN, PAID, OVERDUE, VOID")
	}

	totalAmount := resolveVehicleTaxTotal(input.TotalAmount, input.PkbAmount, input.SwdklljAmount, input.AdminAmount, input.PenaltyAmount)
	paymentDate := input.PaymentDate
	if taxStatus == "PAID" && paymentDate == nil {
		now := time.Now()
		paymentDate = &now
	}
	if taxStatus != "PAID" && paymentDate != nil && input.TaxStatus != nil {
		paymentDate = nil
	}

	now := time.Now()
	vehicleTax := &master.VehicleTax{
		ID:               uuid.NewString(),
		VehicleID:        input.VehicleID,
		TaxYear:          input.TaxYear,
		DueDate:          input.DueDate,
		PKBAmount:        input.PkbAmount,
		SWDKLLJAmount:    input.SwdklljAmount,
		AdminAmount:      input.AdminAmount,
		PenaltyAmount:    input.PenaltyAmount,
		TotalAmount:      totalAmount,
		PaymentDate:      paymentDate,
		PaymentMethod:    normalizeOptionalString(input.PaymentMethod),
		PaymentReference: normalizeOptionalString(input.PaymentReference),
		TaxStatus:        taxStatus,
		Notes:            normalizeOptionalString(input.Notes),
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if err := r.db.WithContext(ctx).Create(vehicleTax).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return nil, fmt.Errorf("vehicle tax for year %d already exists", input.TaxYear)
		}
		return nil, fmt.Errorf("failed to create vehicle tax: %w", err)
	}

	return convertVehicleTaxToGraphQL(vehicleTax), nil
}

// UpdateVehicleTax is the resolver for the updateVehicleTax field.
func (r *mutationResolver) UpdateVehicleTax(ctx context.Context, input generated.UpdateVehicleTaxInput) (*generated.VehicleTax, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	vehicleTax, err := r.loadVehicleTaxByID(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	vehicle, err := r.loadVehicleByID(ctx, vehicleTax.VehicleID)
	if err != nil {
		return nil, err
	}
	if err := r.validateCompanyScope(ctx, userID, vehicle.CompanyID); err != nil {
		return nil, err
	}

	amountsChanged := false
	statusProvided := false
	totalProvided := false

	if input.TaxYear != nil {
		if *input.TaxYear < 1900 || *input.TaxYear > 2100 {
			return nil, fmt.Errorf("taxYear must be between 1900 and 2100")
		}
		vehicleTax.TaxYear = *input.TaxYear
	}
	if input.DueDate != nil {
		if input.DueDate.IsZero() {
			return nil, fmt.Errorf("dueDate must not be empty")
		}
		vehicleTax.DueDate = *input.DueDate
	}
	if input.PkbAmount != nil {
		vehicleTax.PKBAmount = *input.PkbAmount
		amountsChanged = true
	}
	if input.SwdklljAmount != nil {
		vehicleTax.SWDKLLJAmount = *input.SwdklljAmount
		amountsChanged = true
	}
	if input.AdminAmount != nil {
		vehicleTax.AdminAmount = *input.AdminAmount
		amountsChanged = true
	}
	if input.PenaltyAmount != nil {
		vehicleTax.PenaltyAmount = *input.PenaltyAmount
		amountsChanged = true
	}
	if input.TotalAmount != nil {
		vehicleTax.TotalAmount = *input.TotalAmount
		totalProvided = true
	}
	if input.PaymentDate != nil {
		vehicleTax.PaymentDate = input.PaymentDate
	}
	if input.PaymentMethod != nil {
		vehicleTax.PaymentMethod = normalizeOptionalString(input.PaymentMethod)
	}
	if input.PaymentReference != nil {
		vehicleTax.PaymentReference = normalizeOptionalString(input.PaymentReference)
	}
	if input.Notes != nil {
		vehicleTax.Notes = normalizeOptionalString(input.Notes)
	}
	if input.TaxStatus != nil {
		status := normalizeVehicleTaxStatus(*input.TaxStatus)
		if !isValidVehicleTaxStatus(status) {
			return nil, fmt.Errorf("taxStatus must be one of OPEN, PAID, OVERDUE, VOID")
		}
		vehicleTax.TaxStatus = status
		statusProvided = true
	}

	if !totalProvided && amountsChanged {
		vehicleTax.TotalAmount = resolveVehicleTaxTotal(nil, vehicleTax.PKBAmount, vehicleTax.SWDKLLJAmount, vehicleTax.AdminAmount, vehicleTax.PenaltyAmount)
	}

	if statusProvided {
		if vehicleTax.TaxStatus == "PAID" && vehicleTax.PaymentDate == nil {
			now := time.Now()
			vehicleTax.PaymentDate = &now
		}
		if vehicleTax.TaxStatus != "PAID" && input.PaymentDate == nil {
			vehicleTax.PaymentDate = nil
		}
	} else {
		vehicleTax.TaxStatus = resolveVehicleTaxStatusFromDates(vehicleTax.TaxStatus, vehicleTax.PaymentDate, vehicleTax.DueDate)
	}

	var duplicateCount int64
	if err := r.db.WithContext(ctx).
		Model(&master.VehicleTax{}).
		Where("vehicle_id = ? AND tax_year = ? AND id <> ?", vehicleTax.VehicleID, vehicleTax.TaxYear, vehicleTax.ID).
		Count(&duplicateCount).Error; err != nil {
		return nil, fmt.Errorf("failed to validate duplicate vehicle tax: %w", err)
	}
	if duplicateCount > 0 {
		return nil, fmt.Errorf("vehicle tax for year %d already exists", vehicleTax.TaxYear)
	}

	vehicleTax.UpdatedAt = time.Now()
	if err := r.db.WithContext(ctx).Save(vehicleTax).Error; err != nil {
		return nil, fmt.Errorf("failed to update vehicle tax: %w", err)
	}

	return convertVehicleTaxToGraphQL(vehicleTax), nil
}

// DeleteVehicleTax is the resolver for the deleteVehicleTax field.
func (r *mutationResolver) DeleteVehicleTax(ctx context.Context, id string) (bool, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return false, fmt.Errorf("authentication required")
	}

	vehicleTax, err := r.loadVehicleTaxByID(ctx, id)
	if err != nil {
		return false, err
	}

	vehicle, err := r.loadVehicleByID(ctx, vehicleTax.VehicleID)
	if err != nil {
		return false, err
	}
	if err := r.validateCompanyScope(ctx, userID, vehicle.CompanyID); err != nil {
		return false, err
	}

	if err := r.db.WithContext(ctx).Delete(&master.VehicleTax{}, "id = ?", id).Error; err != nil {
		return false, fmt.Errorf("failed to delete vehicle tax: %w", err)
	}

	return true, nil
}

// CreateVehicleTaxDocument is the resolver for the createVehicleTaxDocument field.
func (r *mutationResolver) CreateVehicleTaxDocument(ctx context.Context, input generated.CreateVehicleTaxDocumentInput) (*generated.VehicleTaxDocument, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	vehicleTaxID := strings.TrimSpace(input.VehicleTaxID)
	if vehicleTaxID == "" {
		return nil, fmt.Errorf("vehicleTaxId is required")
	}

	documentType := normalizeVehicleTaxDocumentType(input.DocumentType)
	if !isValidVehicleTaxDocumentType(documentType) {
		return nil, fmt.Errorf("documentType must be one of BUKTI_BAYAR, STNK, NOTICE, OTHER")
	}

	filePath := strings.TrimSpace(input.FilePath)
	if filePath == "" {
		return nil, fmt.Errorf("filePath is required")
	}
	if !strings.HasPrefix(filePath, "/uploads/vehicle_tax_documents/") {
		return nil, fmt.Errorf("filePath must start with /uploads/vehicle_tax_documents/")
	}

	vehicleTax, err := r.loadVehicleTaxByID(ctx, vehicleTaxID)
	if err != nil {
		return nil, err
	}

	vehicle, err := r.loadVehicleByID(ctx, vehicleTax.VehicleID)
	if err != nil {
		return nil, err
	}
	if err := r.validateCompanyScope(ctx, userID, vehicle.CompanyID); err != nil {
		return nil, err
	}

	now := time.Now()
	vehicleTaxDocument := &master.VehicleTaxDocument{
		ID:           uuid.NewString(),
		VehicleTaxID: vehicleTaxID,
		DocumentType: documentType,
		FilePath:     filePath,
		UploadedBy:   nil,
		UploadedAt:   now,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := r.db.WithContext(ctx).Create(vehicleTaxDocument).Error; err != nil {
		return nil, fmt.Errorf("failed to create vehicle tax document: %w", err)
	}

	return convertVehicleTaxDocumentToGraphQL(vehicleTaxDocument), nil
}

// DeleteVehicleTaxDocument is the resolver for the deleteVehicleTaxDocument field.
func (r *mutationResolver) DeleteVehicleTaxDocument(ctx context.Context, id string) (bool, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return false, fmt.Errorf("authentication required")
	}

	vehicleTaxDocument, err := r.loadVehicleTaxDocumentByID(ctx, id)
	if err != nil {
		return false, err
	}

	vehicleTax, err := r.loadVehicleTaxByID(ctx, vehicleTaxDocument.VehicleTaxID)
	if err != nil {
		return false, err
	}

	vehicle, err := r.loadVehicleByID(ctx, vehicleTax.VehicleID)
	if err != nil {
		return false, err
	}
	if err := r.validateCompanyScope(ctx, userID, vehicle.CompanyID); err != nil {
		return false, err
	}

	if err := r.db.WithContext(ctx).Delete(&master.VehicleTaxDocument{}, "id = ?", id).Error; err != nil {
		return false, fmt.Errorf("failed to delete vehicle tax document: %w", err)
	}

	return true, nil
}

// Master data queries

// Companies is the resolver for the companies field.
func (r *queryResolver) Companies(ctx context.Context, search *string, isActive *bool, page *int32, limit *int32) (*master.CompanyPaginationResponse, error) {
	return r.MasterResolver.GetCompanies(ctx, search, isActive, page, limit)
}

// Company is the resolver for the company field.
func (r *queryResolver) Company(ctx context.Context, id string) (*master.Company, error) {
	return r.MasterResolver.GetCompany(ctx, id)
}

// Estates is the resolver for the estates field.
func (r *queryResolver) Estates(ctx context.Context) ([]*master.Estate, error) {
	return r.MasterResolver.GetEstates(ctx)
}

// Estate is the resolver for the estate field.
func (r *queryResolver) Estate(ctx context.Context, id string) (*master.Estate, error) {
	return r.MasterResolver.GetEstate(ctx, id)
}

// Blocks is the resolver for the blocks field.
func (r *queryResolver) Blocks(ctx context.Context) ([]*master.Block, error) {
	return r.MasterResolver.GetBlocks(ctx)
}

// BlocksPaginated is the resolver for the blocksPaginated field.
func (r *queryResolver) BlocksPaginated(
	ctx context.Context,
	companyID *string,
	search *string,
	page *int32,
	limit *int32,
) (*generated.BlockPaginationResponse, error) {
	userID, err := r.requireRBACPermission(ctx, "block:read")
	if err != nil {
		return nil, err
	}

	pageValue := int32(1)
	if page != nil && *page > 0 {
		pageValue = *page
	}

	limitValue := int32(20)
	if limit != nil && *limit > 0 {
		limitValue = *limit
	}
	if limitValue > 200 {
		limitValue = 200
	}

	filters := &masterModels.MasterFilters{}

	if search != nil {
		searchValue := strings.TrimSpace(*search)
		if searchValue != "" {
			filters.Search = &searchValue
		}
	}

	role := middleware.GetUserRoleFromContext(ctx)
	if companyID != nil {
		companyValue := strings.TrimSpace(*companyID)
		if companyValue != "" {
			if role != auth.UserRoleSuperAdmin {
				if err := r.validateCompanyScope(ctx, userID, companyValue); err != nil {
					return nil, err
				}
			}
			filters.CompanyID = &companyValue
		}
	}

	if role != auth.UserRoleSuperAdmin && filters.CompanyID == nil {
		companyIDs, err := r.getAssignedCompanyIDs(ctx, userID)
		if err != nil {
			return nil, err
		}
		if len(companyIDs) == 0 {
			return &generated.BlockPaginationResponse{
				Data: []*master.Block{},
				Pagination: &master.Pagination{
					Page:  pageValue,
					Limit: limitValue,
					Total: 0,
					Pages: 1,
				},
			}, nil
		}
		companyScopeID := companyIDs[0]
		filters.CompanyID = &companyScopeID
	}

	limitInt := int(limitValue)
	offsetInt := int((pageValue - 1) * limitValue)
	filters.Limit = &limitInt
	filters.Offset = &offsetInt

	blocks, err := r.MasterResolver.GetMasterService().GetBlocks(ctx, filters, userID)
	if err != nil {
		return nil, err
	}

	repo := masterRepositories.NewMasterRepository(r.db)
	total, err := repo.CountBlocks(ctx, filters)
	if err != nil {
		return nil, err
	}

	result := make([]*master.Block, 0, len(blocks))
	for _, block := range blocks {
		result = append(result, r.MasterResolver.ConvertBlockToGraphQL(block))
	}

	totalPages := int32((total + int64(limitValue) - 1) / int64(limitValue))
	if totalPages == 0 {
		totalPages = 1
	}

	return &generated.BlockPaginationResponse{
		Data: result,
		Pagination: &master.Pagination{
			Page:  pageValue,
			Limit: limitValue,
			Total: int32(total),
			Pages: totalPages,
		},
	}, nil
}

// Block is the resolver for the block field.
func (r *queryResolver) Block(ctx context.Context, id string) (*master.Block, error) {
	return r.MasterResolver.GetBlock(ctx, id)
}

// LandTypes is the resolver for the landTypes field.
func (r *queryResolver) LandTypes(ctx context.Context) ([]*generated.LandType, error) {
	landTypes, err := r.MasterResolver.GetLandTypes(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]*generated.LandType, 0, len(landTypes))
	for _, landType := range landTypes {
		if landType == nil {
			continue
		}
		result = append(result, &generated.LandType{
			ID:          landType.ID,
			Code:        landType.Code,
			Name:        landType.Name,
			Description: landType.Description,
			IsActive:    landType.IsActive,
			CreatedAt:   landType.CreatedAt,
			UpdatedAt:   landType.UpdatedAt,
		})
	}

	return result, nil
}

// TarifBloks is the resolver for the tarifBloks field.
func (r *queryResolver) TarifBloks(ctx context.Context) ([]*master.TarifBlok, error) {
	return r.MasterResolver.GetTarifBloks(ctx)
}

// TariffRuleOverrides is the resolver for the tariffRuleOverrides field.
func (r *queryResolver) TariffRuleOverrides(ctx context.Context, ruleID *string, overrideType *generated.TariffOverrideType, isActive *bool) ([]*generated.TariffRuleOverride, error) {
	userID, err := r.requireRBACPermission(ctx, "block:read")
	if err != nil {
		return nil, err
	}

	query := r.db.WithContext(ctx).
		Table("tariff_rule_overrides tro").
		Select(`
			tro.id,
			tro.rule_id,
			tro.override_type,
			tro.effective_from,
			tro.effective_to,
			tro.tarif_upah,
			tro.premi,
			tro.tarif_premi1,
			tro.tarif_premi2,
			tro.notes,
			tro.is_active,
			tro.created_at,
			tro.updated_at,
			ts.company_id
		`).
		Joins("JOIN tariff_scheme_rules tr ON tr.id = tro.rule_id").
		Joins("JOIN tariff_schemes ts ON ts.id = tr.scheme_id")

	if ruleID != nil && strings.TrimSpace(*ruleID) != "" {
		query = query.Where("tro.rule_id = ?", strings.TrimSpace(*ruleID))
	}

	if overrideType != nil {
		normalizedType, err := normalizeTariffOverrideType(*overrideType)
		if err != nil {
			return nil, err
		}
		query = query.Where("tro.override_type = ?", string(normalizedType))
	}

	if isActive != nil {
		query = query.Where("tro.is_active = ?", *isActive)
	}

	role := middleware.GetUserRoleFromContext(ctx)
	if role != auth.UserRoleSuperAdmin {
		companyIDs, err := r.getAssignedCompanyIDs(ctx, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve company scope: %w", err)
		}
		if len(companyIDs) == 0 {
			return []*generated.TariffRuleOverride{}, nil
		}
		query = query.Where("ts.company_id IN ?", companyIDs)
	}

	rows := make([]*tariffRuleOverrideRow, 0)
	if err := query.
		Order("tro.rule_id ASC").
		Order("tro.override_type ASC").
		Order("COALESCE(tro.effective_from, DATE '1900-01-01') ASC").
		Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("failed to get tariff rule overrides: %w", err)
	}

	result := make([]*generated.TariffRuleOverride, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		result = append(result, toGraphQLTariffRuleOverride(row))
	}

	return result, nil
}

// BlockTariffChangeLogs is the resolver for the blockTariffChangeLogs field.
func (r *queryResolver) BlockTariffChangeLogs(
	ctx context.Context,
	companyID *string,
	blockID *string,
	search *string,
	eventType *string,
	page *int32,
	limit *int32,
) (*generated.BlockTariffChangeLogPaginationResponse, error) {
	userID, err := r.requireRBACPermission(ctx, "block:read")
	if err != nil {
		return nil, err
	}

	pageValue := int32(1)
	if page != nil && *page > 0 {
		pageValue = *page
	}

	limitValue := int32(20)
	if limit != nil && *limit > 0 {
		limitValue = *limit
	}
	if limitValue > 200 {
		limitValue = 200
	}

	role := middleware.GetUserRoleFromContext(ctx)

	companyFilterValue := ""
	if companyID != nil {
		companyFilterValue = strings.TrimSpace(*companyID)
	}
	if companyFilterValue != "" && role != auth.UserRoleSuperAdmin {
		if err := r.validateCompanyScope(ctx, userID, companyFilterValue); err != nil {
			return nil, err
		}
	}

	assignedCompanyIDs := make([]string, 0)
	if role != auth.UserRoleSuperAdmin && companyFilterValue == "" {
		assignedCompanyIDs, err = r.getAssignedCompanyIDs(ctx, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve company scope: %w", err)
		}
		if len(assignedCompanyIDs) == 0 {
			return &generated.BlockTariffChangeLogPaginationResponse{
				Data: []*generated.BlockTariffChangeLog{},
				Pagination: &master.Pagination{
					Page:  pageValue,
					Limit: limitValue,
					Total: 0,
					Pages: 1,
				},
			}, nil
		}
	}

	blockFilterValue := ""
	if blockID != nil {
		blockFilterValue = strings.TrimSpace(*blockID)
	}
	searchValue := ""
	if search != nil {
		searchValue = strings.TrimSpace(*search)
	}
	eventTypeValue := ""
	if eventType != nil {
		eventTypeValue = strings.ToUpper(strings.TrimSpace(*eventType))
	}

	applyFilters := func(query *gorm.DB) *gorm.DB {
		companyScopeExpr := "COALESCE(l.company_id, e.company_id)"

		if companyFilterValue != "" {
			query = query.Where(companyScopeExpr+" = ?", companyFilterValue)
		} else if role != auth.UserRoleSuperAdmin {
			query = query.Where(companyScopeExpr+" IN ?", assignedCompanyIDs)
		}

		if blockFilterValue != "" {
			query = query.Where("l.block_id = ?", blockFilterValue)
		}

		if searchValue != "" {
			pattern := "%" + searchValue + "%"
			query = query.Where(
				`(b.block_code ILIKE ? OR b.name ILIKE ? OR r.tarif_code ILIKE ? OR r.perlakuan ILIKE ?)`,
				pattern,
				pattern,
				pattern,
				pattern,
			)
		}

		if eventTypeValue != "" {
			query = query.Where("UPPER(l.event_type) = ?", eventTypeValue)
		}

		return query
	}

	baseQuery := r.db.WithContext(ctx).
		Table("block_tariff_change_logs l").
		Select(`
			l.id,
			l.changed_at,
			l.event_type,
			l.changed_by,
			COALESCE(NULLIF(TRIM(u.name), ''), NULLIF(TRIM(u.username), '')) AS changed_by_name,
			COALESCE(l.company_id, e.company_id) AS company_id,
			c.name AS company_name,
			l.block_id,
			b.block_code,
			b.name AS block_name,
			d.id AS division_id,
			d.name AS division_name,
			e.id AS estate_id,
			e.name AS estate_name,
			l.rule_id,
			r.tarif_code,
			r.perlakuan AS rule_perlakuan,
			l.override_id,
			l.override_type,
			l.effective_from,
			l.effective_to,
			l.old_tarif_blok_id,
			l.new_tarif_blok_id,
			l.old_values::text AS old_values,
			l.new_values::text AS new_values
		`).
		Joins("LEFT JOIN blocks b ON b.id = l.block_id").
		Joins("LEFT JOIN divisions d ON d.id = b.division_id").
		Joins("LEFT JOIN estates e ON e.id = d.estate_id").
		Joins("LEFT JOIN companies c ON c.id = COALESCE(l.company_id, e.company_id)").
		Joins("LEFT JOIN tariff_scheme_rules r ON r.id = l.rule_id").
		Joins("LEFT JOIN users u ON u.id::text = l.changed_by")

	dataQuery := applyFilters(baseQuery.Session(&gorm.Session{}))

	rows := make([]*blockTariffChangeLogRow, 0)
	if err := dataQuery.
		Order("l.changed_at DESC").
		Order("l.id DESC").
		Offset(int((pageValue - 1) * limitValue)).
		Limit(int(limitValue)).
		Find(&rows).Error; err != nil {
		if isMissingRelationError(err, "block_tariff_change_logs") {
			return emptyBlockTariffChangeLogPaginationResponse(pageValue, limitValue), nil
		}
		return nil, fmt.Errorf("failed to get block tariff change logs: %w", err)
	}

	countQuery := applyFilters(
		r.db.WithContext(ctx).
			Table("block_tariff_change_logs l").
			Joins("LEFT JOIN blocks b ON b.id = l.block_id").
			Joins("LEFT JOIN divisions d ON d.id = b.division_id").
			Joins("LEFT JOIN estates e ON e.id = d.estate_id").
			Joins("LEFT JOIN companies c ON c.id = COALESCE(l.company_id, e.company_id)").
			Joins("LEFT JOIN tariff_scheme_rules r ON r.id = l.rule_id"),
	)

	var total int64
	if err := countQuery.Count(&total).Error; err != nil {
		if isMissingRelationError(err, "block_tariff_change_logs") {
			return emptyBlockTariffChangeLogPaginationResponse(pageValue, limitValue), nil
		}
		return nil, fmt.Errorf("failed to count block tariff change logs: %w", err)
	}

	result := make([]*generated.BlockTariffChangeLog, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		result = append(result, &generated.BlockTariffChangeLog{
			ID:             row.ID,
			ChangedAt:      row.ChangedAt,
			EventType:      row.EventType,
			ChangedBy:      row.ChangedBy,
			ChangedByName:  row.ChangedByName,
			CompanyID:      row.CompanyID,
			CompanyName:    row.CompanyName,
			BlockID:        row.BlockID,
			BlockCode:      row.BlockCode,
			BlockName:      row.BlockName,
			DivisionID:     row.DivisionID,
			DivisionName:   row.DivisionName,
			EstateID:       row.EstateID,
			EstateName:     row.EstateName,
			RuleID:         row.RuleID,
			TarifCode:      row.TarifCode,
			RulePerlakuan:  row.RulePerlakuan,
			OverrideID:     row.OverrideID,
			OverrideType:   row.OverrideType,
			EffectiveFrom:  row.EffectiveFrom,
			EffectiveTo:    row.EffectiveTo,
			OldTarifBlokID: row.OldTarifBlokID,
			NewTarifBlokID: row.NewTarifBlokID,
			OldValues:      row.OldValues,
			NewValues:      row.NewValues,
		})
	}

	totalPages := int32((total + int64(limitValue) - 1) / int64(limitValue))
	if totalPages == 0 {
		totalPages = 1
	}

	return &generated.BlockTariffChangeLogPaginationResponse{
		Data: result,
		Pagination: &master.Pagination{
			Page:  pageValue,
			Limit: limitValue,
			Total: int32(total),
			Pages: totalPages,
		},
	}, nil
}

// TariffManagementDecisions is the resolver for the tariffManagementDecisions field.
func (r *queryResolver) TariffManagementDecisions(
	ctx context.Context,
	companyID *string,
	entityType *string,
	entityID *string,
	limit *int32,
) ([]*generated.TariffManagementDecision, error) {
	userID, err := r.requireRBACPermission(ctx, "block:read")
	if err != nil {
		return nil, err
	}

	limitValue := int32(50)
	if limit != nil && *limit > 0 {
		limitValue = *limit
	}
	if limitValue > 200 {
		limitValue = 200
	}

	role := middleware.GetUserRoleFromContext(ctx)
	query := r.db.WithContext(ctx).Table("tariff_management_decisions")

	companyFilter := ""
	if companyID != nil {
		companyFilter = strings.TrimSpace(*companyID)
	}
	if companyFilter != "" {
		if role != auth.UserRoleSuperAdmin {
			if err := r.validateCompanyScope(ctx, userID, companyFilter); err != nil {
				return nil, err
			}
		}
		query = query.Where("company_id = ?", companyFilter)
	} else if role != auth.UserRoleSuperAdmin {
		companyIDs, err := r.getAssignedCompanyIDs(ctx, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve company scope: %w", err)
		}
		if len(companyIDs) == 0 {
			return []*generated.TariffManagementDecision{}, nil
		}
		query = query.Where("company_id IN ?", companyIDs)
	}

	if entityType != nil && strings.TrimSpace(*entityType) != "" {
		query = query.Where("UPPER(entity_type) = ?", strings.ToUpper(strings.TrimSpace(*entityType)))
	}
	if entityID != nil && strings.TrimSpace(*entityID) != "" {
		query = query.Where("entity_id = ?", strings.TrimSpace(*entityID))
	}

	rows := make([]*tariffManagementDecisionRow, 0)
	if err := query.
		Order("decided_at DESC").
		Limit(int(limitValue)).
		Find(&rows).Error; err != nil {
		if isMissingRelationError(err, "tariff_management_decisions") {
			return []*generated.TariffManagementDecision{}, nil
		}
		return nil, fmt.Errorf("failed to load tariff management decisions: %w", err)
	}

	result := make([]*generated.TariffManagementDecision, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		result = append(result, &generated.TariffManagementDecision{
			ID:             row.ID,
			EntityType:     row.EntityType,
			EntityID:       row.EntityID,
			ActionType:     row.ActionType,
			CompanyID:      row.CompanyID,
			DecisionNo:     row.DecisionNo,
			DecisionReason: row.DecisionReason,
			EffectiveNote:  row.EffectiveNote,
			DecidedBy:      row.DecidedBy,
			DecidedAt:      row.DecidedAt,
			Metadata:       row.Metadata,
		})
	}

	return result, nil
}

// BlockTreatmentSemesterRequests is the resolver for the blockTreatmentSemesterRequests field.
func (r *queryResolver) BlockTreatmentSemesterRequests(
	ctx context.Context,
	companyID *string,
	semester *string,
	status *generated.BlockTreatmentRequestStatus,
	createdBy *string,
	limit *int32,
	offset *int32,
) ([]*generated.BlockTreatmentSemesterRequest, error) {
	userID, err := r.requireRBACPermission(ctx, "block:read")
	if err != nil {
		return nil, err
	}

	limitValue := int32(50)
	if limit != nil && *limit > 0 {
		limitValue = *limit
	}
	if limitValue > 200 {
		limitValue = 200
	}
	offsetValue := int32(0)
	if offset != nil && *offset > 0 {
		offsetValue = *offset
	}

	role := middleware.GetUserRoleFromContext(ctx)
	query := r.db.WithContext(ctx).
		Table("block_treatment_change_requests r").
		Select(`
			r.id,
			r.company_id,
			c.name AS company_name,
			r.semester,
			r.status,
			r.notes,
			r.revision_no,
			r.submitted_at,
			r.reviewed_by,
			COALESCE(NULLIF(TRIM(u_review.name), ''), NULLIF(TRIM(u_review.username), '')) AS reviewed_by_name,
			r.reviewed_at,
			r.approved_by,
			COALESCE(NULLIF(TRIM(u_approve.name), ''), NULLIF(TRIM(u_approve.username), '')) AS approved_by_name,
			r.approved_at,
			r.rejected_reason,
			r.applied_by,
			COALESCE(NULLIF(TRIM(u_apply.name), ''), NULLIF(TRIM(u_apply.username), '')) AS applied_by_name,
			r.applied_at,
			r.created_by,
			COALESCE(NULLIF(TRIM(u_create.name), ''), NULLIF(TRIM(u_create.username), '')) AS created_by_name,
			r.created_at,
			r.updated_at
		`).
		Joins("LEFT JOIN companies c ON c.id = r.company_id").
		Joins("LEFT JOIN users u_review ON u_review.id = r.reviewed_by").
		Joins("LEFT JOIN users u_approve ON u_approve.id = r.approved_by").
		Joins("LEFT JOIN users u_apply ON u_apply.id = r.applied_by").
		Joins("LEFT JOIN users u_create ON u_create.id = r.created_by")

	companyFilter := ""
	if companyID != nil {
		companyFilter = strings.TrimSpace(*companyID)
	}
	if companyFilter != "" {
		if role != auth.UserRoleSuperAdmin {
			if err := r.validateCompanyScope(ctx, userID, companyFilter); err != nil {
				return nil, err
			}
		}
		query = query.Where("r.company_id = ?", companyFilter)
	} else if role != auth.UserRoleSuperAdmin {
		companyIDs, err := r.getAssignedCompanyIDs(ctx, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve company scope: %w", err)
		}
		if len(companyIDs) == 0 {
			return []*generated.BlockTreatmentSemesterRequest{}, nil
		}
		query = query.Where("r.company_id IN ?", companyIDs)
	}

	if role == auth.UserRoleManager {
		query = query.Where("r.created_by = ?", userID)
	}

	if semester != nil && strings.TrimSpace(*semester) != "" {
		normalizedSemester, err := normalizeSemester(strings.TrimSpace(*semester))
		if err != nil {
			return nil, err
		}
		query = query.Where("UPPER(TRIM(r.semester)) = ?", normalizedSemester)
	}
	if status != nil {
		normalizedStatus := strings.ToUpper(strings.TrimSpace(status.String()))
		query = query.Where("r.status = ?", normalizedStatus)
	}
	if createdBy != nil && strings.TrimSpace(*createdBy) != "" {
		query = query.Where("r.created_by = ?", strings.TrimSpace(*createdBy))
	}

	rows := make([]*blockTreatmentRequestRow, 0)
	if err := query.
		Order("r.created_at DESC").
		Offset(int(offsetValue)).
		Limit(int(limitValue)).
		Find(&rows).Error; err != nil {
		if isMissingRelationError(err, "block_treatment_change_requests") {
			return []*generated.BlockTreatmentSemesterRequest{}, nil
		}
		return nil, fmt.Errorf("failed to load block treatment requests: %w", err)
	}
	if len(rows) == 0 {
		return []*generated.BlockTreatmentSemesterRequest{}, nil
	}

	requestIDs := make([]string, 0, len(rows))
	for _, row := range rows {
		requestIDs = append(requestIDs, row.ID)
	}
	itemsMap, err := r.loadBlockTreatmentRequestItems(ctx, requestIDs)
	if err != nil {
		return nil, err
	}

	result := make([]*generated.BlockTreatmentSemesterRequest, 0, len(rows))
	for _, row := range rows {
		result = append(result, toGraphQLBlockTreatmentRequest(row, itemsMap[row.ID]))
	}

	return result, nil
}

// BlockTreatmentSemesterRequest is the resolver for the blockTreatmentSemesterRequest field.
func (r *queryResolver) BlockTreatmentSemesterRequest(ctx context.Context, id string) (*generated.BlockTreatmentSemesterRequest, error) {
	userID, err := r.requireRBACPermission(ctx, "block:read")
	if err != nil {
		return nil, err
	}

	return r.loadBlockTreatmentSemesterRequestWithItems(ctx, strings.TrimSpace(id), userID)
}

// CreateBlockTreatmentSemesterRequest is the resolver for the createBlockTreatmentSemesterRequest field.
func (r *mutationResolver) CreateBlockTreatmentSemesterRequest(ctx context.Context, input generated.CreateBlockTreatmentSemesterRequestInput) (*generated.BlockTreatmentSemesterRequest, error) {
	userID, err := r.requireRBACPermission(ctx, "block:update")
	if err != nil {
		return nil, err
	}
	if middleware.GetUserRoleFromContext(ctx) != auth.UserRoleManager {
		return nil, fmt.Errorf("hanya MANAGER yang dapat membuat pengajuan perubahan perlakuan blok")
	}

	companyID := strings.TrimSpace(input.CompanyID)
	if companyID == "" {
		return nil, fmt.Errorf("companyId is required")
	}
	if err := r.validateCompanyScope(ctx, userID, companyID); err != nil {
		return nil, err
	}

	semesterValue, err := normalizeSemester(input.Semester)
	if err != nil {
		return nil, err
	}
	if len(input.Items) == 0 {
		return nil, fmt.Errorf("minimal 1 item perubahan blok wajib diisi")
	}

	blockIDSet := map[string]struct{}{}
	proposedTarifSet := map[string]struct{}{}
	blockIDs := make([]string, 0, len(input.Items))
	proposedTarifIDs := make([]string, 0, len(input.Items))
	itemImpactByBlock := map[string]*string{}
	itemProposedTarifByBlock := map[string]string{}

	for _, item := range input.Items {
		blockID := strings.TrimSpace(item.BlockID)
		if blockID == "" {
			return nil, fmt.Errorf("item.blockId wajib diisi")
		}
		proposedTarifID := strings.TrimSpace(item.ProposedTarifBlokID)
		if proposedTarifID == "" {
			return nil, fmt.Errorf("item.proposedTarifBlokId wajib diisi")
		}
		if _, exists := blockIDSet[blockID]; exists {
			return nil, fmt.Errorf("duplikasi blockId dalam item request: %s", blockID)
		}

		blockIDSet[blockID] = struct{}{}
		blockIDs = append(blockIDs, blockID)
		itemProposedTarifByBlock[blockID] = proposedTarifID
		itemImpactByBlock[blockID] = normalizeOptionalString(item.ImpactSummary)

		if _, exists := proposedTarifSet[proposedTarifID]; !exists {
			proposedTarifSet[proposedTarifID] = struct{}{}
			proposedTarifIDs = append(proposedTarifIDs, proposedTarifID)
		}
	}

	tx := r.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", tx.Error)
	}
	defer func() {
		if recover() != nil {
			tx.Rollback()
		}
	}()

	blockRows := make([]*blockScopeRow, 0)
	if err := tx.
		Table("blocks b").
		Select(`
			b.id,
			b.block_code,
			b.name AS block_name,
			b.tarif_blok_id AS current_tarif_blok_id,
			b.perlakuan AS current_perlakuan,
			e.company_id,
			d.name AS division_name,
			e.name AS estate_name
		`).
		Joins("JOIN divisions d ON d.id = b.division_id").
		Joins("JOIN estates e ON e.id = d.estate_id").
		Where("b.id IN ?", blockIDs).
		Find(&blockRows).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to load block scope: %w", err)
	}
	if len(blockRows) != len(blockIDs) {
		tx.Rollback()
		return nil, fmt.Errorf("beberapa blockId tidak ditemukan")
	}

	blockByID := make(map[string]*blockScopeRow, len(blockRows))
	for _, row := range blockRows {
		if row.CompanyID != companyID {
			tx.Rollback()
			return nil, fmt.Errorf("block %s berada di company berbeda", row.BlockID)
		}
		blockByID[row.BlockID] = row
	}

	tarifRows := make([]*tarifBlokScopeRow, 0)
	if err := tx.
		Table("tarif_blok").
		Select("id, company_id, perlakuan").
		Where("id IN ?", proposedTarifIDs).
		Find(&tarifRows).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to load proposed tarif blocks: %w", err)
	}
	if len(tarifRows) != len(proposedTarifIDs) {
		tx.Rollback()
		return nil, fmt.Errorf("beberapa proposedTarifBlokId tidak ditemukan")
	}

	tarifByID := make(map[string]*tarifBlokScopeRow, len(tarifRows))
	for _, row := range tarifRows {
		if row.CompanyID != companyID {
			tx.Rollback()
			return nil, fmt.Errorf("tarif blok %s berada di company berbeda", row.ID)
		}
		tarifByID[row.ID] = row
	}

	var revisionNo int32
	if err := tx.
		Table("block_treatment_change_requests").
		Select("COALESCE(MAX(revision_no), 0) + 1").
		Where("company_id = ? AND semester = ? AND created_by = ?", companyID, semesterValue, userID).
		Scan(&revisionNo).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to resolve revision number: %w", err)
	}
	if revisionNo <= 0 {
		revisionNo = 1
	}

	now := time.Now()
	requestID := uuid.NewString()
	requestRecord := &blockTreatmentRequestRecord{
		ID:         requestID,
		CompanyID:  companyID,
		Semester:   semesterValue,
		Status:     string(generated.BlockTreatmentRequestStatusDraft),
		Notes:      normalizeOptionalString(input.Notes),
		RevisionNo: revisionNo,
		CreatedBy:  userID,
		UpdatedBy:  &userID,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if err := tx.Table("block_treatment_change_requests").Create(requestRecord).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create block treatment request: %w", err)
	}

	itemRecords := make([]*blockTreatmentRequestItemRecord, 0, len(blockIDs))
	for _, blockID := range blockIDs {
		blockInfo := blockByID[blockID]
		proposedTarifID := itemProposedTarifByBlock[blockID]
		proposedInfo := tarifByID[proposedTarifID]
		itemRecords = append(itemRecords, &blockTreatmentRequestItemRecord{
			ID:                  uuid.NewString(),
			RequestID:           requestID,
			BlockID:             blockInfo.BlockID,
			CurrentTarifBlokID:  blockInfo.CurrentTarifBlokID,
			CurrentPerlakuan:    blockInfo.CurrentPerlakuan,
			ProposedTarifBlokID: proposedTarifID,
			ProposedPerlakuan:   proposedInfo.Perlakuan,
			ImpactSummary:       itemImpactByBlock[blockID],
			CreatedAt:           now,
			UpdatedAt:           now,
		})
	}
	if err := tx.Table("block_treatment_change_request_items").Create(&itemRecords).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create block treatment request items: %w", err)
	}

	if err := r.insertBlockTreatmentRequestStatusLog(ctx, tx, requestID, nil, generated.BlockTreatmentRequestStatusDraft, "CREATE", requestRecord.Notes, &userID); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit block treatment request creation: %w", err)
	}

	return r.loadBlockTreatmentSemesterRequestWithItems(ctx, requestID, userID)
}

// SubmitBlockTreatmentSemesterRequest is the resolver for the submitBlockTreatmentSemesterRequest field.
func (r *mutationResolver) SubmitBlockTreatmentSemesterRequest(ctx context.Context, id string) (*generated.BlockTreatmentSemesterRequest, error) {
	userID, err := r.requireRBACPermission(ctx, "block:update")
	if err != nil {
		return nil, err
	}
	role := middleware.GetUserRoleFromContext(ctx)
	if !canSubmitOrCancelBlockTreatmentRequest(role) {
		return nil, fmt.Errorf("hanya MANAGER yang dapat submit pengajuan perubahan perlakuan blok")
	}
	requestID := strings.TrimSpace(id)
	if requestID == "" {
		return nil, fmt.Errorf("id is required")
	}

	tx := r.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", tx.Error)
	}
	defer func() {
		if recover() != nil {
			tx.Rollback()
		}
	}()

	requestRow, err := r.loadBlockTreatmentRequestByID(ctx, tx, requestID, true)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	if !canManagerActOnOwnBlockTreatmentRequest(role, requestRow.CreatedBy, userID) {
		tx.Rollback()
		return nil, fmt.Errorf("anda hanya dapat submit request yang dibuat sendiri")
	}
	if err := r.validateCompanyScope(ctx, userID, requestRow.CompanyID); err != nil {
		tx.Rollback()
		return nil, err
	}
	currentStatus, ok := parseBlockTreatmentRequestStatus(requestRow.Status)
	if !ok {
		tx.Rollback()
		return nil, fmt.Errorf("request memiliki status tidak valid: %s", requestRow.Status)
	}
	if !canSubmitBlockTreatmentRequestFrom(currentStatus) {
		tx.Rollback()
		return nil, fmt.Errorf("request hanya dapat disubmit dari status DRAFT atau REJECTED")
	}

	var itemCount int64
	if err := tx.Table("block_treatment_change_request_items").
		Where("request_id = ?", requestID).
		Count(&itemCount).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to validate request items: %w", err)
	}
	if itemCount == 0 {
		tx.Rollback()
		return nil, fmt.Errorf("request tidak memiliki item perubahan blok")
	}

	var overlappingPendingCount int64
	if err := tx.Raw(`
		SELECT COUNT(1)
		FROM block_treatment_change_request_items i
		JOIN block_treatment_change_requests r ON r.id = i.request_id
		WHERE r.company_id = ?
		  AND r.semester = ?
		  AND r.id <> ?
		  AND r.status IN ('SUBMITTED', 'UNDER_REVIEW')
		  AND i.block_id IN (
			  SELECT block_id
			  FROM block_treatment_change_request_items
			  WHERE request_id = ?
		  )
	`, requestRow.CompanyID, requestRow.Semester, requestID, requestID).Scan(&overlappingPendingCount).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to validate pending conflict: %w", err)
	}
	if overlappingPendingCount > 0 {
		tx.Rollback()
		return nil, fmt.Errorf("masih ada pengajuan aktif untuk blok yang sama di semester ini")
	}

	now := time.Now()
	if err := tx.Table("block_treatment_change_requests").
		Where("id = ?", requestID).
		Updates(map[string]any{
			"status":       string(generated.BlockTreatmentRequestStatusSubmitted),
			"submitted_at": now,
			"updated_by":   userID,
			"updated_at":   now,
		}).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to submit request: %w", err)
	}

	fromStatus := requestRow.Status
	if err := r.insertBlockTreatmentRequestStatusLog(ctx, tx, requestID, &fromStatus, generated.BlockTreatmentRequestStatusSubmitted, "SUBMIT", nil, &userID); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit request submit: %w", err)
	}
	r.notifyBlockTreatmentWorkflowStatusChange(ctx, requestRow, generated.BlockTreatmentRequestStatusSubmitted, userID, nil)

	return r.loadBlockTreatmentSemesterRequestWithItems(ctx, requestID, userID)
}

// ReviewBlockTreatmentSemesterRequest is the resolver for the reviewBlockTreatmentSemesterRequest field.
func (r *mutationResolver) ReviewBlockTreatmentSemesterRequest(ctx context.Context, id string, notes *string) (*generated.BlockTreatmentSemesterRequest, error) {
	return r.transitionBlockTreatmentSemesterRequestStatus(ctx, id, notes, generated.BlockTreatmentRequestStatusSubmitted, generated.BlockTreatmentRequestStatusUnderReview, "REVIEW", true, false, false, false)
}

// ApproveBlockTreatmentSemesterRequest is the resolver for the approveBlockTreatmentSemesterRequest field.
func (r *mutationResolver) ApproveBlockTreatmentSemesterRequest(ctx context.Context, id string, notes *string) (*generated.BlockTreatmentSemesterRequest, error) {
	return r.transitionBlockTreatmentSemesterRequestStatus(ctx, id, notes, generated.BlockTreatmentRequestStatusUnderReview, generated.BlockTreatmentRequestStatusApproved, "APPROVE", false, true, false, false)
}

// RejectBlockTreatmentSemesterRequest is the resolver for the rejectBlockTreatmentSemesterRequest field.
func (r *mutationResolver) RejectBlockTreatmentSemesterRequest(ctx context.Context, id string, reason string) (*generated.BlockTreatmentSemesterRequest, error) {
	reasonPtr := normalizeOptionalString(&reason)
	if reasonPtr == nil {
		return nil, fmt.Errorf("reason wajib diisi")
	}
	return r.transitionBlockTreatmentSemesterRequestStatus(ctx, id, reasonPtr, generated.BlockTreatmentRequestStatusUnderReview, generated.BlockTreatmentRequestStatusRejected, "REJECT", false, false, true, false)
}

// ApplyBlockTreatmentSemesterRequest is the resolver for the applyBlockTreatmentSemesterRequest field.
func (r *mutationResolver) ApplyBlockTreatmentSemesterRequest(ctx context.Context, id string) (*generated.BlockTreatmentSemesterRequest, error) {
	userID, err := r.requireRBACPermission(ctx, "block:update")
	if err != nil {
		return nil, err
	}

	role := middleware.GetUserRoleFromContext(ctx)
	if !canApplyBlockTreatmentRequest(role) {
		return nil, fmt.Errorf("hanya AREA_MANAGER/COMPANY_ADMIN/SUPER_ADMIN yang dapat apply perubahan perlakuan blok")
	}

	requestID := strings.TrimSpace(id)
	if requestID == "" {
		return nil, fmt.Errorf("id is required")
	}

	tx := r.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", tx.Error)
	}
	defer func() {
		if recover() != nil {
			tx.Rollback()
		}
	}()

	requestRow, err := r.loadBlockTreatmentRequestByID(ctx, tx, requestID, true)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	if role != auth.UserRoleSuperAdmin {
		if err := r.validateCompanyScope(ctx, userID, requestRow.CompanyID); err != nil {
			tx.Rollback()
			return nil, err
		}
	}
	currentStatus, ok := parseBlockTreatmentRequestStatus(requestRow.Status)
	if !ok {
		tx.Rollback()
		return nil, fmt.Errorf("request memiliki status tidak valid: %s", requestRow.Status)
	}
	if !canApplyBlockTreatmentRequestFrom(currentStatus) {
		tx.Rollback()
		return nil, fmt.Errorf("request hanya bisa di-apply dari status APPROVED")
	}

	if err := applyBlockTreatmentChanges(tx, requestID); err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to apply block treatment changes: %w", err)
	}

	now := time.Now()
	if err := tx.Table("block_treatment_change_requests").
		Where("id = ?", requestID).
		Updates(map[string]any{
			"status":     string(generated.BlockTreatmentRequestStatusApplied),
			"applied_by": userID,
			"applied_at": now,
			"updated_by": userID,
			"updated_at": now,
		}).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to update request status to APPLIED: %w", err)
	}

	fromStatus := requestRow.Status
	if err := r.insertBlockTreatmentRequestStatusLog(ctx, tx, requestID, &fromStatus, generated.BlockTreatmentRequestStatusApplied, "APPLY", nil, &userID); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit apply request: %w", err)
	}
	r.notifyBlockTreatmentWorkflowStatusChange(ctx, requestRow, generated.BlockTreatmentRequestStatusApplied, userID, nil)

	return r.loadBlockTreatmentSemesterRequestWithItems(ctx, requestID, userID)
}

// CancelBlockTreatmentSemesterRequest is the resolver for the cancelBlockTreatmentSemesterRequest field.
func (r *mutationResolver) CancelBlockTreatmentSemesterRequest(ctx context.Context, id string, reason *string) (*generated.BlockTreatmentSemesterRequest, error) {
	userID, err := r.requireRBACPermission(ctx, "block:update")
	if err != nil {
		return nil, err
	}
	role := middleware.GetUserRoleFromContext(ctx)
	if !canSubmitOrCancelBlockTreatmentRequest(role) {
		return nil, fmt.Errorf("hanya MANAGER yang dapat membatalkan request")
	}

	requestID := strings.TrimSpace(id)
	if requestID == "" {
		return nil, fmt.Errorf("id is required")
	}

	tx := r.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", tx.Error)
	}
	defer func() {
		if recover() != nil {
			tx.Rollback()
		}
	}()

	requestRow, err := r.loadBlockTreatmentRequestByID(ctx, tx, requestID, true)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	if !canManagerActOnOwnBlockTreatmentRequest(role, requestRow.CreatedBy, userID) {
		tx.Rollback()
		return nil, fmt.Errorf("anda hanya dapat membatalkan request yang dibuat sendiri")
	}
	currentStatus, ok := parseBlockTreatmentRequestStatus(requestRow.Status)
	if !ok {
		tx.Rollback()
		return nil, fmt.Errorf("request memiliki status tidak valid: %s", requestRow.Status)
	}
	if !canCancelBlockTreatmentRequestFrom(currentStatus) {
		tx.Rollback()
		return nil, fmt.Errorf("request hanya dapat dibatalkan dari status DRAFT atau SUBMITTED")
	}

	now := time.Now()
	updates := map[string]any{
		"status":     string(generated.BlockTreatmentRequestStatusCancelled),
		"updated_by": userID,
		"updated_at": now,
	}
	reasonValue := normalizeOptionalString(reason)
	if reasonValue != nil {
		updates["notes"] = appendAuditNote(requestRow.Notes, "CANCEL", *reasonValue)
	}

	if err := tx.Table("block_treatment_change_requests").
		Where("id = ?", requestID).
		Updates(updates).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to cancel request: %w", err)
	}

	fromStatus := requestRow.Status
	if err := r.insertBlockTreatmentRequestStatusLog(ctx, tx, requestID, &fromStatus, generated.BlockTreatmentRequestStatusCancelled, "CANCEL", reasonValue, &userID); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit cancel request: %w", err)
	}

	return r.loadBlockTreatmentSemesterRequestWithItems(ctx, requestID, userID)
}

func isMissingRelationError(err error, relationName string) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	expected := `relation "` + strings.ToLower(strings.TrimSpace(relationName)) + `" does not exist`
	return strings.Contains(message, "sqlstate 42p01") || strings.Contains(message, expected)
}

func emptyBlockTariffChangeLogPaginationResponse(pageValue int32, limitValue int32) *generated.BlockTariffChangeLogPaginationResponse {
	return &generated.BlockTariffChangeLogPaginationResponse{
		Data: []*generated.BlockTariffChangeLog{},
		Pagination: &master.Pagination{
			Page:  pageValue,
			Limit: limitValue,
			Total: 0,
			Pages: 1,
		},
	}
}

// Divisions is the resolver for the divisions field.
func (r *queryResolver) Divisions(ctx context.Context) ([]*master.Division, error) {
	return r.MasterResolver.GetDivisions(ctx)
}

// Division is the resolver for the division field.
func (r *queryResolver) Division(ctx context.Context, id string) (*master.Division, error) {
	return r.MasterResolver.GetDivision(ctx, id)
}

// MyAssignments is the resolver for the myAssignments field.
func (r *queryResolver) MyAssignments(ctx context.Context) (*auth.UserAssignments, error) {
	return r.MasterResolver.GetMyAssignments(ctx)
}

// EstateAssignments is the resolver for the estateAssignments field.
func (r *queryResolver) EstateAssignments(ctx context.Context) ([]*generated.UserEstateAssignment, error) {
	panic(fmt.Errorf("not implemented: EstateAssignments - estateAssignments"))
}

// DivisionAssignments is the resolver for the divisionAssignments field.
func (r *queryResolver) DivisionAssignments(ctx context.Context) ([]*generated.UserDivisionAssignment, error) {
	panic(fmt.Errorf("not implemented: DivisionAssignments - divisionAssignments"))
}

// CompanyAssignments is the resolver for the companyAssignments field.
func (r *queryResolver) CompanyAssignments(ctx context.Context) ([]*generated.UserCompanyAssignment, error) {
	panic(fmt.Errorf("not implemented: CompanyAssignments - companyAssignments"))
}

// Employees is the resolver for the employees field.
func (r *queryResolver) Employees(ctx context.Context) ([]*master.Employee, error) {
	userID, err := r.requireRBACPermission(ctx, "employee:read")
	if err != nil {
		return nil, err
	}

	role := middleware.GetUserRoleFromContext(ctx)
	if role == auth.UserRoleSuperAdmin {
		employees, err := r.EmployeeService.ListEmployees(ctx)
		if err != nil {
			return nil, err
		}
		result := make([]*master.Employee, 0, len(employees))
		for _, employee := range employees {
			result = append(result, convertEmployeeToGraphQL(employee))
		}
		return result, nil
	}

	companyIDs, err := r.getAssignedCompanyIDs(ctx, userID)
	if err != nil {
		return nil, err
	}
	if len(companyIDs) == 0 {
		return []*master.Employee{}, nil
	}

	result := make([]*master.Employee, 0)
	for _, companyID := range companyIDs {
		employees, err := r.EmployeeService.ListEmployeesByCompany(ctx, companyID)
		if err != nil {
			return nil, err
		}
		for _, employee := range employees {
			result = append(result, convertEmployeeToGraphQL(employee))
		}
	}
	return result, nil
}

// EmployeesPaginated is the resolver for the employeesPaginated field.
func (r *queryResolver) EmployeesPaginated(
	ctx context.Context,
	companyID *string,
	search *string,
	employeeType *string,
	isActive *bool,
	divisionID *string,
	sortBy *string,
	sortOrder *string,
	page *int32,
	limit *int32,
) (*generated.EmployeePaginationResponse, error) {
	userID, err := r.requireRBACPermission(ctx, "employee:read")
	if err != nil {
		return nil, err
	}

	pageValue := int32(1)
	if page != nil && *page > 0 {
		pageValue = *page
	}

	limitValue := int32(20)
	if limit != nil && *limit > 0 {
		limitValue = *limit
	}
	if limitValue > 200 {
		limitValue = 200
	}

	var companyIDs []string
	role := middleware.GetUserRoleFromContext(ctx)

	if role == auth.UserRoleSuperAdmin {
		if companyID != nil && strings.TrimSpace(*companyID) != "" {
			companyIDs = []string{strings.TrimSpace(*companyID)}
		}
	} else {
		assignedCompanyIDs, err := r.getAssignedCompanyIDs(ctx, userID)
		if err != nil {
			return nil, err
		}

		if companyID != nil && strings.TrimSpace(*companyID) != "" {
			targetCompanyID := strings.TrimSpace(*companyID)
			if err := r.validateCompanyScope(ctx, userID, targetCompanyID); err != nil {
				return nil, err
			}
			companyIDs = []string{targetCompanyID}
		} else {
			companyIDs = assignedCompanyIDs
		}
	}

	if role != auth.UserRoleSuperAdmin && len(companyIDs) == 0 {
		return &generated.EmployeePaginationResponse{
			Data: []*master.Employee{},
			Pagination: &master.Pagination{
				Page:  pageValue,
				Limit: limitValue,
				Total: 0,
				Pages: 1,
			},
		}, nil
	}

	sortByValue := "name"
	if sortBy != nil && strings.TrimSpace(*sortBy) != "" {
		sortByValue = strings.TrimSpace(*sortBy)
	}

	sortOrderValue := "asc"
	if sortOrder != nil && strings.TrimSpace(*sortOrder) != "" {
		sortOrderValue = strings.TrimSpace(*sortOrder)
	}

	employees, total, err := r.EmployeeService.ListEmployeesPaginated(ctx, employeeServices.EmployeeListFilter{
		CompanyIDs:   companyIDs,
		Search:       search,
		EmployeeType: employeeType,
		IsActive:     isActive,
		DivisionID:   divisionID,
		SortBy:       sortByValue,
		SortOrder:    sortOrderValue,
		Page:         int(pageValue),
		Limit:        int(limitValue),
	})
	if err != nil {
		return nil, err
	}

	result := make([]*master.Employee, 0, len(employees))
	for _, employee := range employees {
		result = append(result, convertEmployeeToGraphQL(employee))
	}

	totalPages := int32((total + int64(limitValue) - 1) / int64(limitValue))
	if totalPages == 0 {
		totalPages = 1
	}

	return &generated.EmployeePaginationResponse{
		Data: result,
		Pagination: &master.Pagination{
			Page:  pageValue,
			Limit: limitValue,
			Total: int32(total),
			Pages: totalPages,
		},
	}, nil
}

// Employee is the resolver for the employee field.
func (r *queryResolver) Employee(ctx context.Context, id string) (*master.Employee, error) {
	userID, err := r.requireRBACPermission(ctx, "employee:read")
	if err != nil {
		return nil, err
	}

	employee, err := r.EmployeeService.GetEmployee(ctx, id)
	if err != nil {
		return nil, err
	}

	if err := r.validateCompanyScope(ctx, userID, employee.CompanyID); err != nil {
		return nil, err
	}

	return convertEmployeeToGraphQL(employee), nil
}

// EmployeeByNik is the resolver for the employeeByNik field.
func (r *queryResolver) EmployeeByNik(ctx context.Context, nik string, companyID string) (*master.Employee, error) {
	userID, err := r.requireRBACPermission(ctx, "employee:read")
	if err != nil {
		return nil, err
	}

	if err := r.validateCompanyScope(ctx, userID, companyID); err != nil {
		return nil, err
	}

	employee, err := r.EmployeeService.GetEmployeeByNIK(ctx, nik, companyID)
	if err != nil {
		return nil, err
	}
	return convertEmployeeToGraphQL(employee), nil
}

// EmployeesByCompany is the resolver for the employeesByCompany field.
func (r *queryResolver) EmployeesByCompany(ctx context.Context, companyID string) ([]*master.Employee, error) {
	userID, err := r.requireRBACPermission(ctx, "employee:read")
	if err != nil {
		return nil, err
	}

	if err := r.validateCompanyScope(ctx, userID, companyID); err != nil {
		return nil, err
	}

	employees, err := r.EmployeeService.ListEmployeesByCompany(ctx, companyID)
	if err != nil {
		return nil, err
	}

	result := make([]*master.Employee, 0, len(employees))
	for _, employee := range employees {
		result = append(result, convertEmployeeToGraphQL(employee))
	}
	return result, nil
}

// Vehicles is the resolver for the vehicles field.
func (r *queryResolver) Vehicles(ctx context.Context, companyID *string, search *string, isActive *bool) ([]*master.Vehicle, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	role := middleware.GetUserRoleFromContext(ctx)
	query := r.db.WithContext(ctx).Model(&master.Vehicle{})

	if role == auth.UserRoleSuperAdmin {
		if companyID != nil && strings.TrimSpace(*companyID) != "" {
			targetCompanyID := strings.TrimSpace(*companyID)
			query = query.Where("company_id = ?", targetCompanyID)
		}
	} else {
		assignedCompanyIDs, err := r.getAssignedCompanyIDs(ctx, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve company scope: %w", err)
		}
		if len(assignedCompanyIDs) == 0 {
			return []*master.Vehicle{}, nil
		}

		if companyID != nil && strings.TrimSpace(*companyID) != "" {
			targetCompanyID := strings.TrimSpace(*companyID)
			if err := r.validateCompanyScope(ctx, userID, targetCompanyID); err != nil {
				return nil, err
			}
			query = query.Where("company_id = ?", targetCompanyID)
		} else {
			query = query.Where("company_id IN ?", assignedCompanyIDs)
		}
	}

	if isActive != nil {
		query = query.Where("is_active = ?", *isActive)
	}

	if search != nil && strings.TrimSpace(*search) != "" {
		searchTerm := "%" + strings.TrimSpace(*search) + "%"
		query = query.Where(
			"registration_plate ILIKE ? OR COALESCE(assigned_driver_name, '') ILIKE ? OR vehicle_type ILIKE ? OR vehicle_category ILIKE ? OR brand ILIKE ? OR model ILIKE ? OR chassis_number ILIKE ? OR engine_number ILIKE ?",
			searchTerm,
			searchTerm,
			searchTerm,
			searchTerm,
			searchTerm,
			searchTerm,
			searchTerm,
			searchTerm,
		)
	}

	var vehicles []*master.Vehicle
	if err := query.Order("updated_at DESC").Find(&vehicles).Error; err != nil {
		return nil, fmt.Errorf("failed to get vehicles: %w", err)
	}

	return vehicles, nil
}

// VehiclesPaginated is the resolver for the vehiclesPaginated field.
func (r *queryResolver) VehiclesPaginated(
	ctx context.Context,
	companyID *string,
	search *string,
	isActive *bool,
	page *int32,
	limit *int32,
) (*generated.VehiclePaginationResponse, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	pageValue := int32(1)
	if page != nil && *page > 0 {
		pageValue = *page
	}

	limitValue := int32(20)
	if limit != nil && *limit > 0 {
		limitValue = *limit
	}
	if limitValue > 200 {
		limitValue = 200
	}

	query := r.db.WithContext(ctx).Model(&master.Vehicle{})
	role := middleware.GetUserRoleFromContext(ctx)

	if role == auth.UserRoleSuperAdmin {
		if companyID != nil && strings.TrimSpace(*companyID) != "" {
			targetCompanyID := strings.TrimSpace(*companyID)
			query = query.Where("company_id = ?", targetCompanyID)
		}
	} else {
		assignedCompanyIDs, err := r.getAssignedCompanyIDs(ctx, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve company scope: %w", err)
		}
		if len(assignedCompanyIDs) == 0 {
			return &generated.VehiclePaginationResponse{
				Data: []*master.Vehicle{},
				Pagination: &master.Pagination{
					Page:  pageValue,
					Limit: limitValue,
					Total: 0,
					Pages: 1,
				},
			}, nil
		}

		if companyID != nil && strings.TrimSpace(*companyID) != "" {
			targetCompanyID := strings.TrimSpace(*companyID)
			if err := r.validateCompanyScope(ctx, userID, targetCompanyID); err != nil {
				return nil, err
			}
			query = query.Where("company_id = ?", targetCompanyID)
		} else {
			query = query.Where("company_id IN ?", assignedCompanyIDs)
		}
	}

	if isActive != nil {
		query = query.Where("is_active = ?", *isActive)
	}

	if search != nil && strings.TrimSpace(*search) != "" {
		searchTerm := "%" + strings.TrimSpace(*search) + "%"
		query = query.Where(
			"registration_plate ILIKE ? OR COALESCE(assigned_driver_name, '') ILIKE ? OR vehicle_type ILIKE ? OR vehicle_category ILIKE ? OR brand ILIKE ? OR model ILIKE ? OR chassis_number ILIKE ? OR engine_number ILIKE ?",
			searchTerm,
			searchTerm,
			searchTerm,
			searchTerm,
			searchTerm,
			searchTerm,
			searchTerm,
			searchTerm,
		)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count vehicles: %w", err)
	}

	offset := int((pageValue - 1) * limitValue)
	var vehicles []*master.Vehicle
	if err := query.
		Order("updated_at DESC").
		Offset(offset).
		Limit(int(limitValue)).
		Find(&vehicles).Error; err != nil {
		return nil, fmt.Errorf("failed to get vehicles: %w", err)
	}

	totalPages := int32((total + int64(limitValue) - 1) / int64(limitValue))
	if totalPages == 0 {
		totalPages = 1
	}

	return &generated.VehiclePaginationResponse{
		Data: vehicles,
		Pagination: &master.Pagination{
			Page:  pageValue,
			Limit: limitValue,
			Total: int32(total),
			Pages: totalPages,
		},
	}, nil
}

// Vehicle is the resolver for the vehicle field.
func (r *queryResolver) Vehicle(ctx context.Context, id string) (*master.Vehicle, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	vehicle, err := r.loadVehicleByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if err := r.validateCompanyScope(ctx, userID, vehicle.CompanyID); err != nil {
		return nil, err
	}

	return vehicle, nil
}

// VehicleTaxes is the resolver for the vehicleTaxes field.
func (r *queryResolver) VehicleTaxes(ctx context.Context, vehicleID string, taxYear *int32, taxStatus *string) ([]*generated.VehicleTax, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	vehicle, err := r.loadVehicleByID(ctx, vehicleID)
	if err != nil {
		return nil, err
	}
	if err := r.validateCompanyScope(ctx, userID, vehicle.CompanyID); err != nil {
		return nil, err
	}

	query := r.db.WithContext(ctx).Model(&master.VehicleTax{}).Where("vehicle_id = ?", vehicleID)
	if taxYear != nil {
		query = query.Where("tax_year = ?", *taxYear)
	}
	if taxStatus != nil && strings.TrimSpace(*taxStatus) != "" {
		status := normalizeVehicleTaxStatus(*taxStatus)
		if !isValidVehicleTaxStatus(status) {
			return nil, fmt.Errorf("taxStatus must be one of OPEN, PAID, OVERDUE, VOID")
		}
		query = query.Where("tax_status = ?", status)
	}

	var taxes []*master.VehicleTax
	if err := query.Order("tax_year DESC, due_date ASC, updated_at DESC").Find(&taxes).Error; err != nil {
		return nil, fmt.Errorf("failed to get vehicle taxes: %w", err)
	}

	result := make([]*generated.VehicleTax, 0, len(taxes))
	for _, item := range taxes {
		result = append(result, convertVehicleTaxToGraphQL(item))
	}
	return result, nil
}

// VehicleTax is the resolver for the vehicleTax field.
func (r *queryResolver) VehicleTax(ctx context.Context, id string) (*generated.VehicleTax, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	vehicleTax, err := r.loadVehicleTaxByID(ctx, id)
	if err != nil {
		return nil, err
	}

	vehicle, err := r.loadVehicleByID(ctx, vehicleTax.VehicleID)
	if err != nil {
		return nil, err
	}
	if err := r.validateCompanyScope(ctx, userID, vehicle.CompanyID); err != nil {
		return nil, err
	}

	return convertVehicleTaxToGraphQL(vehicleTax), nil
}

// VehicleTaxDocuments is the resolver for the vehicleTaxDocuments field.
func (r *queryResolver) VehicleTaxDocuments(ctx context.Context, vehicleTaxID string) ([]*generated.VehicleTaxDocument, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	vehicleTax, err := r.loadVehicleTaxByID(ctx, vehicleTaxID)
	if err != nil {
		return nil, err
	}

	vehicle, err := r.loadVehicleByID(ctx, vehicleTax.VehicleID)
	if err != nil {
		return nil, err
	}
	if err := r.validateCompanyScope(ctx, userID, vehicle.CompanyID); err != nil {
		return nil, err
	}

	var documents []*master.VehicleTaxDocument
	if err := r.db.WithContext(ctx).
		Model(&master.VehicleTaxDocument{}).
		Where("vehicle_tax_id = ?", vehicleTaxID).
		Order("uploaded_at DESC, created_at DESC").
		Find(&documents).Error; err != nil {
		return nil, fmt.Errorf("failed to get vehicle tax documents: %w", err)
	}

	result := make([]*generated.VehicleTaxDocument, 0, len(documents))
	for _, item := range documents {
		result = append(result, convertVehicleTaxDocumentToGraphQL(item))
	}
	return result, nil
}

// Assignment mutations

// AssignUserToEstate is the resolver for the assignUserToEstate field.
func (r *mutationResolver) AssignUserToEstate(ctx context.Context, userID string, estateID string) (*generated.UserEstateAssignment, error) {
	panic(fmt.Errorf("not implemented: AssignUserToEstate - assignUserToEstate"))
}

// AssignUserToDivision is the resolver for the assignUserToDivision field.
func (r *mutationResolver) AssignUserToDivision(ctx context.Context, userID string, divisionID string) (*generated.UserDivisionAssignment, error) {
	panic(fmt.Errorf("not implemented: AssignUserToDivision - assignUserToDivision"))
}

// AssignUserToCompany is the resolver for the assignUserToCompany field.
func (r *mutationResolver) AssignUserToCompany(ctx context.Context, userID string, companyID string) (*generated.UserCompanyAssignment, error) {
	panic(fmt.Errorf("not implemented: AssignUserToCompany - assignUserToCompany"))
}

// RemoveEstateAssignment is the resolver for the removeEstateAssignment field.
func (r *mutationResolver) RemoveEstateAssignment(ctx context.Context, id string) (bool, error) {
	panic(fmt.Errorf("not implemented: RemoveEstateAssignment - removeEstateAssignment"))
}

// RemoveDivisionAssignment is the resolver for the removeDivisionAssignment field.
func (r *mutationResolver) RemoveDivisionAssignment(ctx context.Context, id string) (bool, error) {
	panic(fmt.Errorf("not implemented: RemoveDivisionAssignment - removeDivisionAssignment"))
}

// RemoveCompanyAssignment is the resolver for the removeCompanyAssignment field.
func (r *mutationResolver) RemoveCompanyAssignment(ctx context.Context, id string) (bool, error) {
	panic(fmt.Errorf("not implemented: RemoveCompanyAssignment - removeCompanyAssignment"))
}

// Subscription resolvers

// CompanyCreated is the resolver for the companyCreated field.
func (r *subscriptionResolver) CompanyCreated(ctx context.Context) (<-chan *master.Company, error) {
	return r.WebSocketSubscriptionResolver.CompanyCreated(ctx)
}

// CompanyUpdated is the resolver for the companyUpdated field.
func (r *subscriptionResolver) CompanyUpdated(ctx context.Context) (<-chan *master.Company, error) {
	return r.WebSocketSubscriptionResolver.CompanyUpdated(ctx)
}

// CompanyDeleted is the resolver for the companyDeleted field.
func (r *subscriptionResolver) CompanyDeleted(ctx context.Context) (<-chan string, error) {
	return r.WebSocketSubscriptionResolver.CompanyDeleted(ctx)
}

// CompanyStatusChanged is the resolver for the companyStatusChanged field.
func (r *subscriptionResolver) CompanyStatusChanged(ctx context.Context) (<-chan *master.Company, error) {
	return r.WebSocketSubscriptionResolver.CompanyStatusChanged(ctx)
}

// CompanyStatusChange is the resolver for the companyStatusChange subscription field.
func (r *subscriptionResolver) CompanyStatusChange(ctx context.Context) (<-chan *generated.CompanyPerformanceData, error) {
	return nil, fmt.Errorf("temporary stub")
}

type tariffRuleOverrideRow struct {
	ID            string     `gorm:"column:id"`
	RuleID        string     `gorm:"column:rule_id"`
	OverrideType  string     `gorm:"column:override_type"`
	EffectiveFrom *time.Time `gorm:"column:effective_from"`
	EffectiveTo   *time.Time `gorm:"column:effective_to"`
	TarifUpah     *float64   `gorm:"column:tarif_upah"`
	Premi         *float64   `gorm:"column:premi"`
	TarifPremi1   *float64   `gorm:"column:tarif_premi1"`
	TarifPremi2   *float64   `gorm:"column:tarif_premi2"`
	Notes         *string    `gorm:"column:notes"`
	IsActive      bool       `gorm:"column:is_active"`
	CreatedAt     time.Time  `gorm:"column:created_at"`
	UpdatedAt     time.Time  `gorm:"column:updated_at"`
	CompanyID     string     `gorm:"column:company_id"`
}

type blockTariffChangeLogRow struct {
	ID             string     `gorm:"column:id"`
	ChangedAt      time.Time  `gorm:"column:changed_at"`
	EventType      string     `gorm:"column:event_type"`
	ChangedBy      *string    `gorm:"column:changed_by"`
	ChangedByName  *string    `gorm:"column:changed_by_name"`
	CompanyID      *string    `gorm:"column:company_id"`
	CompanyName    *string    `gorm:"column:company_name"`
	BlockID        *string    `gorm:"column:block_id"`
	BlockCode      *string    `gorm:"column:block_code"`
	BlockName      *string    `gorm:"column:block_name"`
	DivisionID     *string    `gorm:"column:division_id"`
	DivisionName   *string    `gorm:"column:division_name"`
	EstateID       *string    `gorm:"column:estate_id"`
	EstateName     *string    `gorm:"column:estate_name"`
	RuleID         *string    `gorm:"column:rule_id"`
	TarifCode      *string    `gorm:"column:tarif_code"`
	RulePerlakuan  *string    `gorm:"column:rule_perlakuan"`
	OverrideID     *string    `gorm:"column:override_id"`
	OverrideType   *string    `gorm:"column:override_type"`
	EffectiveFrom  *time.Time `gorm:"column:effective_from"`
	EffectiveTo    *time.Time `gorm:"column:effective_to"`
	OldTarifBlokID *string    `gorm:"column:old_tarif_blok_id"`
	NewTarifBlokID *string    `gorm:"column:new_tarif_blok_id"`
	OldValues      *string    `gorm:"column:old_values"`
	NewValues      *string    `gorm:"column:new_values"`
}

type tariffManagementDecisionRow struct {
	ID             string    `gorm:"column:id"`
	EntityType     string    `gorm:"column:entity_type"`
	EntityID       string    `gorm:"column:entity_id"`
	ActionType     string    `gorm:"column:action_type"`
	CompanyID      string    `gorm:"column:company_id"`
	DecisionNo     string    `gorm:"column:decision_no"`
	DecisionReason string    `gorm:"column:decision_reason"`
	EffectiveNote  string    `gorm:"column:effective_note"`
	DecidedBy      string    `gorm:"column:decided_by"`
	DecidedAt      time.Time `gorm:"column:decided_at"`
	Metadata       *string   `gorm:"column:metadata"`
}

type blockScopeRow struct {
	BlockID            string  `gorm:"column:id"`
	BlockCode          string  `gorm:"column:block_code"`
	BlockName          string  `gorm:"column:block_name"`
	CurrentTarifBlokID *string `gorm:"column:current_tarif_blok_id"`
	CurrentPerlakuan   *string `gorm:"column:current_perlakuan"`
	CompanyID          string  `gorm:"column:company_id"`
	DivisionName       *string `gorm:"column:division_name"`
	EstateName         *string `gorm:"column:estate_name"`
}

type tarifBlokScopeRow struct {
	ID        string  `gorm:"column:id"`
	CompanyID string  `gorm:"column:company_id"`
	Perlakuan *string `gorm:"column:perlakuan"`
}

type blockTreatmentRequestRecord struct {
	ID             string     `gorm:"column:id"`
	CompanyID      string     `gorm:"column:company_id"`
	Semester       string     `gorm:"column:semester"`
	Status         string     `gorm:"column:status"`
	Notes          *string    `gorm:"column:notes"`
	RevisionNo     int32      `gorm:"column:revision_no"`
	SubmittedAt    *time.Time `gorm:"column:submitted_at"`
	ReviewedBy     *string    `gorm:"column:reviewed_by"`
	ReviewedAt     *time.Time `gorm:"column:reviewed_at"`
	ApprovedBy     *string    `gorm:"column:approved_by"`
	ApprovedAt     *time.Time `gorm:"column:approved_at"`
	RejectedReason *string    `gorm:"column:rejected_reason"`
	AppliedBy      *string    `gorm:"column:applied_by"`
	AppliedAt      *time.Time `gorm:"column:applied_at"`
	CreatedBy      string     `gorm:"column:created_by"`
	UpdatedBy      *string    `gorm:"column:updated_by"`
	CreatedAt      time.Time  `gorm:"column:created_at"`
	UpdatedAt      time.Time  `gorm:"column:updated_at"`
}

type blockTreatmentRequestRow struct {
	ID             string     `gorm:"column:id"`
	CompanyID      string     `gorm:"column:company_id"`
	CompanyName    *string    `gorm:"column:company_name"`
	Semester       string     `gorm:"column:semester"`
	Status         string     `gorm:"column:status"`
	Notes          *string    `gorm:"column:notes"`
	RevisionNo     int32      `gorm:"column:revision_no"`
	SubmittedAt    *time.Time `gorm:"column:submitted_at"`
	ReviewedBy     *string    `gorm:"column:reviewed_by"`
	ReviewedByName *string    `gorm:"column:reviewed_by_name"`
	ReviewedAt     *time.Time `gorm:"column:reviewed_at"`
	ApprovedBy     *string    `gorm:"column:approved_by"`
	ApprovedByName *string    `gorm:"column:approved_by_name"`
	ApprovedAt     *time.Time `gorm:"column:approved_at"`
	RejectedReason *string    `gorm:"column:rejected_reason"`
	AppliedBy      *string    `gorm:"column:applied_by"`
	AppliedByName  *string    `gorm:"column:applied_by_name"`
	AppliedAt      *time.Time `gorm:"column:applied_at"`
	CreatedBy      string     `gorm:"column:created_by"`
	CreatedByName  *string    `gorm:"column:created_by_name"`
	CreatedAt      time.Time  `gorm:"column:created_at"`
	UpdatedAt      time.Time  `gorm:"column:updated_at"`
}

type blockTreatmentRequestItemRecord struct {
	ID                  string    `gorm:"column:id"`
	RequestID           string    `gorm:"column:request_id"`
	BlockID             string    `gorm:"column:block_id"`
	CurrentTarifBlokID  *string   `gorm:"column:current_tarif_blok_id"`
	CurrentPerlakuan    *string   `gorm:"column:current_perlakuan"`
	ProposedTarifBlokID string    `gorm:"column:proposed_tarif_blok_id"`
	ProposedPerlakuan   *string   `gorm:"column:proposed_perlakuan"`
	ImpactSummary       *string   `gorm:"column:impact_summary"`
	CreatedAt           time.Time `gorm:"column:created_at"`
	UpdatedAt           time.Time `gorm:"column:updated_at"`
}

type blockTreatmentRequestItemRow struct {
	ID                  string    `gorm:"column:id"`
	RequestID           string    `gorm:"column:request_id"`
	BlockID             string    `gorm:"column:block_id"`
	BlockCode           *string   `gorm:"column:block_code"`
	BlockName           *string   `gorm:"column:block_name"`
	DivisionName        *string   `gorm:"column:division_name"`
	EstateName          *string   `gorm:"column:estate_name"`
	CurrentTarifBlokID  *string   `gorm:"column:current_tarif_blok_id"`
	CurrentPerlakuan    *string   `gorm:"column:current_perlakuan"`
	ProposedTarifBlokID string    `gorm:"column:proposed_tarif_blok_id"`
	ProposedPerlakuan   *string   `gorm:"column:proposed_perlakuan"`
	ImpactSummary       *string   `gorm:"column:impact_summary"`
	CreatedAt           time.Time `gorm:"column:created_at"`
	UpdatedAt           time.Time `gorm:"column:updated_at"`
}

func normalizeSemester(value string) (string, error) {
	normalized := strings.ToUpper(strings.TrimSpace(value))
	if normalized == "" {
		return "", fmt.Errorf("semester wajib diisi")
	}
	if !semesterPattern.MatchString(normalized) {
		return "", fmt.Errorf("semester harus berformat YYYY-S1 atau YYYY-S2 (contoh: 2026-S1)")
	}
	return normalized, nil
}

func toBlockTreatmentRequestStatus(value string) generated.BlockTreatmentRequestStatus {
	normalized := generated.BlockTreatmentRequestStatus(strings.ToUpper(strings.TrimSpace(value)))
	if normalized.IsValid() {
		return normalized
	}
	return generated.BlockTreatmentRequestStatusDraft
}

func parseBlockTreatmentRequestStatus(value string) (generated.BlockTreatmentRequestStatus, bool) {
	normalized := generated.BlockTreatmentRequestStatus(strings.ToUpper(strings.TrimSpace(value)))
	if !normalized.IsValid() {
		return "", false
	}
	return normalized, true
}

func canSubmitOrCancelBlockTreatmentRequest(role auth.UserRole) bool {
	return role == auth.UserRoleManager
}

func canReviewOrDecisionBlockTreatmentRequest(role auth.UserRole) bool {
	return role == auth.UserRoleAreaManager
}

func canApplyBlockTreatmentRequest(role auth.UserRole) bool {
	return role == auth.UserRoleAreaManager || role == auth.UserRoleCompanyAdmin || role == auth.UserRoleSuperAdmin
}

func canManagerActOnOwnBlockTreatmentRequest(role auth.UserRole, requestCreatedBy string, actorID string) bool {
	if !canSubmitOrCancelBlockTreatmentRequest(role) {
		return false
	}
	return strings.TrimSpace(requestCreatedBy) == strings.TrimSpace(actorID)
}

func canTransitionBlockTreatmentRequestStatus(
	currentStatus generated.BlockTreatmentRequestStatus,
	requiredFrom generated.BlockTreatmentRequestStatus,
) bool {
	return currentStatus == requiredFrom
}

func canSubmitBlockTreatmentRequestFrom(currentStatus generated.BlockTreatmentRequestStatus) bool {
	return currentStatus == generated.BlockTreatmentRequestStatusDraft ||
		currentStatus == generated.BlockTreatmentRequestStatusRejected
}

func canCancelBlockTreatmentRequestFrom(currentStatus generated.BlockTreatmentRequestStatus) bool {
	return currentStatus == generated.BlockTreatmentRequestStatusDraft ||
		currentStatus == generated.BlockTreatmentRequestStatusSubmitted
}

func canApplyBlockTreatmentRequestFrom(currentStatus generated.BlockTreatmentRequestStatus) bool {
	return currentStatus == generated.BlockTreatmentRequestStatusApproved
}

func appendAuditNote(existing *string, tag string, note string) *string {
	trimmedNote := strings.TrimSpace(note)
	if trimmedNote == "" {
		return existing
	}
	entry := fmt.Sprintf("[%s] %s", strings.ToUpper(strings.TrimSpace(tag)), trimmedNote)
	if existing == nil || strings.TrimSpace(*existing) == "" {
		return &entry
	}
	merged := strings.TrimSpace(*existing) + "\n" + entry
	return &merged
}

func toGraphQLBlockTreatmentRequest(row *blockTreatmentRequestRow, items []*generated.BlockTreatmentSemesterRequestItem) *generated.BlockTreatmentSemesterRequest {
	if row == nil {
		return nil
	}
	if items == nil {
		items = []*generated.BlockTreatmentSemesterRequestItem{}
	}
	return &generated.BlockTreatmentSemesterRequest{
		ID:             row.ID,
		CompanyID:      row.CompanyID,
		CompanyName:    row.CompanyName,
		Semester:       row.Semester,
		Status:         toBlockTreatmentRequestStatus(row.Status),
		Notes:          row.Notes,
		RevisionNo:     row.RevisionNo,
		SubmittedAt:    row.SubmittedAt,
		ReviewedBy:     row.ReviewedBy,
		ReviewedByName: row.ReviewedByName,
		ReviewedAt:     row.ReviewedAt,
		ApprovedBy:     row.ApprovedBy,
		ApprovedByName: row.ApprovedByName,
		ApprovedAt:     row.ApprovedAt,
		RejectedReason: row.RejectedReason,
		AppliedBy:      row.AppliedBy,
		AppliedByName:  row.AppliedByName,
		AppliedAt:      row.AppliedAt,
		CreatedBy:      row.CreatedBy,
		CreatedByName:  row.CreatedByName,
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
		Items:          items,
	}
}

func (r *Resolver) loadBlockTreatmentRequestByID(ctx context.Context, db *gorm.DB, requestID string, lock bool) (*blockTreatmentRequestRow, error) {
	query := db.WithContext(ctx).
		Table("block_treatment_change_requests r").
		Select(`
			r.id,
			r.company_id,
			c.name AS company_name,
			r.semester,
			r.status,
			r.notes,
			r.revision_no,
			r.submitted_at,
			r.reviewed_by,
			COALESCE(NULLIF(TRIM(u_review.name), ''), NULLIF(TRIM(u_review.username), '')) AS reviewed_by_name,
			r.reviewed_at,
			r.approved_by,
			COALESCE(NULLIF(TRIM(u_approve.name), ''), NULLIF(TRIM(u_approve.username), '')) AS approved_by_name,
			r.approved_at,
			r.rejected_reason,
			r.applied_by,
			COALESCE(NULLIF(TRIM(u_apply.name), ''), NULLIF(TRIM(u_apply.username), '')) AS applied_by_name,
			r.applied_at,
			r.created_by,
			COALESCE(NULLIF(TRIM(u_create.name), ''), NULLIF(TRIM(u_create.username), '')) AS created_by_name,
			r.created_at,
			r.updated_at
		`).
		Joins("LEFT JOIN companies c ON c.id = r.company_id").
		Joins("LEFT JOIN users u_review ON u_review.id = r.reviewed_by").
		Joins("LEFT JOIN users u_approve ON u_approve.id = r.approved_by").
		Joins("LEFT JOIN users u_apply ON u_apply.id = r.applied_by").
		Joins("LEFT JOIN users u_create ON u_create.id = r.created_by").
		Where("r.id = ?", requestID)

	if lock {
		query = query.Clauses(clause.Locking{Strength: "UPDATE"})
	}

	var row blockTreatmentRequestRow
	if err := query.Take(&row).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("block treatment request tidak ditemukan")
		}
		if isMissingRelationError(err, "block_treatment_change_requests") {
			return nil, fmt.Errorf("fitur pengajuan perlakuan blok belum tersedia di database, jalankan migration 000065")
		}
		return nil, fmt.Errorf("failed to load block treatment request: %w", err)
	}
	return &row, nil
}

func (r *Resolver) loadBlockTreatmentRequestItems(ctx context.Context, requestIDs []string) (map[string][]*generated.BlockTreatmentSemesterRequestItem, error) {
	result := make(map[string][]*generated.BlockTreatmentSemesterRequestItem, len(requestIDs))
	if len(requestIDs) == 0 {
		return result, nil
	}

	rows := make([]*blockTreatmentRequestItemRow, 0)
	if err := r.db.WithContext(ctx).
		Table("block_treatment_change_request_items i").
		Select(`
			i.id,
			i.request_id,
			i.block_id,
			b.block_code,
			b.name AS block_name,
			d.name AS division_name,
			e.name AS estate_name,
			i.current_tarif_blok_id,
			i.current_perlakuan,
			i.proposed_tarif_blok_id,
			i.proposed_perlakuan,
			i.impact_summary,
			i.created_at,
			i.updated_at
		`).
		Joins("LEFT JOIN blocks b ON b.id = i.block_id").
		Joins("LEFT JOIN divisions d ON d.id = b.division_id").
		Joins("LEFT JOIN estates e ON e.id = d.estate_id").
		Where("i.request_id IN ?", requestIDs).
		Order("i.created_at ASC").
		Find(&rows).Error; err != nil {
		if isMissingRelationError(err, "block_treatment_change_request_items") {
			return result, nil
		}
		return nil, fmt.Errorf("failed to load block treatment request items: %w", err)
	}

	for _, row := range rows {
		if row == nil {
			continue
		}
		blockCode := ""
		if row.BlockCode != nil {
			blockCode = strings.TrimSpace(*row.BlockCode)
		}
		blockName := ""
		if row.BlockName != nil {
			blockName = strings.TrimSpace(*row.BlockName)
		}
		result[row.RequestID] = append(result[row.RequestID], &generated.BlockTreatmentSemesterRequestItem{
			ID:                  row.ID,
			RequestID:           row.RequestID,
			BlockID:             row.BlockID,
			BlockCode:           blockCode,
			BlockName:           blockName,
			DivisionName:        row.DivisionName,
			EstateName:          row.EstateName,
			CurrentTarifBlokID:  row.CurrentTarifBlokID,
			CurrentPerlakuan:    row.CurrentPerlakuan,
			ProposedTarifBlokID: row.ProposedTarifBlokID,
			ProposedPerlakuan:   row.ProposedPerlakuan,
			ImpactSummary:       row.ImpactSummary,
			CreatedAt:           row.CreatedAt,
			UpdatedAt:           row.UpdatedAt,
		})
	}

	return result, nil
}

func (r *Resolver) loadBlockTreatmentSemesterRequestWithItems(ctx context.Context, requestID string, userID string) (*generated.BlockTreatmentSemesterRequest, error) {
	requestRow, err := r.loadBlockTreatmentRequestByID(ctx, r.db, requestID, false)
	if err != nil {
		return nil, err
	}

	role := middleware.GetUserRoleFromContext(ctx)
	if role == auth.UserRoleManager && requestRow.CreatedBy != userID {
		return nil, fmt.Errorf("request tidak ditemukan pada scope manager")
	}
	if role != auth.UserRoleSuperAdmin {
		if err := r.validateCompanyScope(ctx, userID, requestRow.CompanyID); err != nil {
			return nil, err
		}
	}

	itemsMap, err := r.loadBlockTreatmentRequestItems(ctx, []string{requestID})
	if err != nil {
		return nil, err
	}
	return toGraphQLBlockTreatmentRequest(requestRow, itemsMap[requestID]), nil
}

func (r *Resolver) insertBlockTreatmentRequestStatusLog(
	ctx context.Context,
	tx *gorm.DB,
	requestID string,
	fromStatus *string,
	toStatus generated.BlockTreatmentRequestStatus,
	action string,
	notes *string,
	actedBy *string,
) error {
	logID := uuid.NewString()
	nowSQLExpr := currentTimestampSQLExpr(tx)
	insertSQL := fmt.Sprintf(`
		INSERT INTO block_treatment_request_status_logs (
			id,
			request_id,
			from_status,
			to_status,
			action,
			notes,
			acted_by,
			acted_at
		) VALUES (
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			%s
		)
	`, nowSQLExpr)
	if err := tx.WithContext(ctx).Exec(insertSQL,
		logID,
		requestID,
		fromStatus,
		string(toStatus),
		action,
		notes,
		actedBy,
	).Error; err != nil {
		if isMissingRelationError(err, "block_treatment_request_status_logs") {
			return fmt.Errorf("fitur pengajuan perlakuan blok belum tersedia di database, jalankan migration 000065")
		}
		return fmt.Errorf("failed to write block treatment status log: %w", err)
	}
	return nil
}

func (r *mutationResolver) transitionBlockTreatmentSemesterRequestStatus(
	ctx context.Context,
	id string,
	notes *string,
	requiredFrom generated.BlockTreatmentRequestStatus,
	targetStatus generated.BlockTreatmentRequestStatus,
	action string,
	setReviewMeta bool,
	setApproveMeta bool,
	setRejectReason bool,
	_ bool,
) (*generated.BlockTreatmentSemesterRequest, error) {
	userID, err := r.requireRBACPermission(ctx, "block:update")
	if err != nil {
		return nil, err
	}
	role := middleware.GetUserRoleFromContext(ctx)
	if !canReviewOrDecisionBlockTreatmentRequest(role) {
		return nil, fmt.Errorf("hanya AREA_MANAGER yang dapat melakukan aksi %s", strings.ToLower(action))
	}

	requestID := strings.TrimSpace(id)
	if requestID == "" {
		return nil, fmt.Errorf("id is required")
	}

	tx := r.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", tx.Error)
	}
	defer func() {
		if recover() != nil {
			tx.Rollback()
		}
	}()

	requestRow, err := r.loadBlockTreatmentRequestByID(ctx, tx, requestID, true)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	if err := r.validateCompanyScope(ctx, userID, requestRow.CompanyID); err != nil {
		tx.Rollback()
		return nil, err
	}

	currentStatus, ok := parseBlockTreatmentRequestStatus(requestRow.Status)
	if !ok {
		tx.Rollback()
		return nil, fmt.Errorf("request memiliki status tidak valid: %s", requestRow.Status)
	}
	if !canTransitionBlockTreatmentRequestStatus(currentStatus, requiredFrom) {
		tx.Rollback()
		return nil, fmt.Errorf("request status saat ini %s, tidak dapat diproses ke %s", currentStatus, targetStatus)
	}

	now := time.Now()
	updates := map[string]any{
		"status":     string(targetStatus),
		"updated_by": userID,
		"updated_at": now,
	}

	noteValue := normalizeOptionalString(notes)
	if noteValue != nil && !setRejectReason {
		updates["notes"] = appendAuditNote(requestRow.Notes, action, *noteValue)
	}
	if setReviewMeta {
		updates["reviewed_by"] = userID
		updates["reviewed_at"] = now
	}
	if setApproveMeta {
		updates["approved_by"] = userID
		updates["approved_at"] = now
	}
	if setRejectReason {
		if noteValue == nil {
			tx.Rollback()
			return nil, fmt.Errorf("reason wajib diisi")
		}
		updates["rejected_reason"] = *noteValue
		updates["notes"] = appendAuditNote(requestRow.Notes, action, *noteValue)
	}

	if err := tx.Table("block_treatment_change_requests").
		Where("id = ?", requestID).
		Updates(updates).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to update block treatment request status: %w", err)
	}

	fromStatus := requestRow.Status
	if err := r.insertBlockTreatmentRequestStatusLog(ctx, tx, requestID, &fromStatus, targetStatus, action, noteValue, &userID); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit block treatment request transition: %w", err)
	}
	if targetStatus == generated.BlockTreatmentRequestStatusApproved || targetStatus == generated.BlockTreatmentRequestStatusRejected {
		r.notifyBlockTreatmentWorkflowStatusChange(ctx, requestRow, targetStatus, userID, noteValue)
	}

	return r.loadBlockTreatmentSemesterRequestWithItems(ctx, requestID, userID)
}

func currentTimestampSQLExpr(db *gorm.DB) string {
	if db != nil && db.Dialector != nil && strings.EqualFold(db.Dialector.Name(), "sqlite") {
		return "CURRENT_TIMESTAMP"
	}
	return "NOW()"
}

func applyBlockTreatmentChanges(tx *gorm.DB, requestID string) error {
	nowSQLExpr := currentTimestampSQLExpr(tx)
	if tx != nil && tx.Dialector != nil && strings.EqualFold(tx.Dialector.Name(), "sqlite") {
		sqliteApplySQL := fmt.Sprintf(`
			UPDATE blocks
			SET
				tarif_blok_id = (
					SELECT i.proposed_tarif_blok_id
					FROM block_treatment_change_request_items i
					WHERE i.request_id = ?
					  AND i.block_id = blocks.id
					LIMIT 1
				),
				perlakuan = (
					SELECT i.proposed_perlakuan
					FROM block_treatment_change_request_items i
					WHERE i.request_id = ?
					  AND i.block_id = blocks.id
					LIMIT 1
				),
				updated_at = %s
			WHERE id IN (
				SELECT block_id
				FROM block_treatment_change_request_items
				WHERE request_id = ?
			)
		`, nowSQLExpr)
		return tx.Exec(sqliteApplySQL, requestID, requestID, requestID).Error
	}

	postgresApplySQL := fmt.Sprintf(`
		UPDATE blocks b
		SET
			tarif_blok_id = i.proposed_tarif_blok_id,
			perlakuan = i.proposed_perlakuan,
			updated_at = %s
		FROM block_treatment_change_request_items i
		WHERE i.request_id = ?
		  AND b.id = i.block_id
	`, nowSQLExpr)
	return tx.Exec(postgresApplySQL, requestID).Error
}

func (r *Resolver) notifyBlockTreatmentWorkflowStatusChange(
	ctx context.Context,
	requestRow *blockTreatmentRequestRow,
	targetStatus generated.BlockTreatmentRequestStatus,
	actorID string,
	note *string,
) {
	if r == nil || r.NotificationService == nil || requestRow == nil {
		return
	}

	targetStatusValue := strings.ToUpper(strings.TrimSpace(targetStatus.String()))
	if targetStatusValue == "" {
		return
	}

	actorRole := middleware.GetUserRoleFromContext(ctx)
	title := ""
	message := ""
	recipientID := ""
	recipientRole := ""
	recipientCompanyID := ""
	priority := notificationModels.NotificationPriorityMedium

	switch targetStatus {
	case generated.BlockTreatmentRequestStatusSubmitted:
		title = "Pengajuan perlakuan blok menunggu review"
		message = fmt.Sprintf("Request %s semester %s telah disubmit dan menunggu review.", requestRow.ID, requestRow.Semester)
		recipientRole = string(auth.UserRoleAreaManager)
		recipientCompanyID = requestRow.CompanyID
		priority = notificationModels.NotificationPriorityHigh
	case generated.BlockTreatmentRequestStatusApproved:
		title = "Pengajuan perlakuan blok disetujui"
		message = fmt.Sprintf("Request %s semester %s telah disetujui.", requestRow.ID, requestRow.Semester)
		recipientID = requestRow.CreatedBy
	case generated.BlockTreatmentRequestStatusRejected:
		title = "Pengajuan perlakuan blok ditolak"
		if note != nil && strings.TrimSpace(*note) != "" {
			message = fmt.Sprintf("Request %s semester %s ditolak. Alasan: %s", requestRow.ID, requestRow.Semester, strings.TrimSpace(*note))
		} else {
			message = fmt.Sprintf("Request %s semester %s ditolak.", requestRow.ID, requestRow.Semester)
		}
		recipientID = requestRow.CreatedBy
		priority = notificationModels.NotificationPriorityHigh
	case generated.BlockTreatmentRequestStatusApplied:
		title = "Perubahan perlakuan blok sudah diterapkan"
		message = fmt.Sprintf("Request %s semester %s sudah di-apply ke data blok.", requestRow.ID, requestRow.Semester)
		recipientID = requestRow.CreatedBy
	default:
		return
	}

	metadata := map[string]interface{}{
		"requestId":  requestRow.ID,
		"companyId":  requestRow.CompanyID,
		"semester":   requestRow.Semester,
		"fromStatus": strings.ToUpper(strings.TrimSpace(requestRow.Status)),
		"toStatus":   targetStatusValue,
	}
	if note != nil && strings.TrimSpace(*note) != "" {
		metadata["notes"] = strings.TrimSpace(*note)
	}

	idempotencyKey := fmt.Sprintf(
		"block-treatment:%s:%s:%s",
		strings.ToLower(targetStatusValue),
		requestRow.ID,
		strings.TrimSpace(actorID),
	)

	input := &notificationServices.CreateNotificationInput{
		Type:               notificationModels.NotificationTypeCompanyUpdate,
		Priority:           priority,
		Title:              title,
		Message:            message,
		RecipientID:        recipientID,
		RecipientRole:      recipientRole,
		RecipientCompanyID: recipientCompanyID,
		RelatedEntityType:  "BLOCK_TREATMENT_REQUEST",
		RelatedEntityID:    requestRow.ID,
		ActionURL:          "/blocks?tab=workflow",
		ActionLabel:        "Buka Workflow",
		Metadata:           metadata,
		SenderID:           strings.TrimSpace(actorID),
		SenderRole:         string(actorRole),
		IdempotencyKey:     idempotencyKey,
	}

	if _, err := r.NotificationService.CreateNotification(ctx, input); err != nil {
		log.Printf("block treatment notification failed (status=%s request=%s): %v", targetStatusValue, requestRow.ID, err)
	}
}

func normalizeTariffOverrideType(value generated.TariffOverrideType) (generated.TariffOverrideType, error) {
	normalized := generated.TariffOverrideType(strings.ToUpper(strings.TrimSpace(value.String())))
	if !normalized.IsValid() {
		return "", fmt.Errorf("overrideType harus salah satu dari NORMAL, HOLIDAY, LEBARAN")
	}
	return normalized, nil
}

func normalizeDateTimePointer(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	year, month, day := value.UTC().Date()
	normalized := time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
	return &normalized
}

func validateTariffOverridePeriod(effectiveFrom *time.Time, effectiveTo *time.Time) error {
	if effectiveFrom != nil && effectiveTo != nil && effectiveFrom.After(*effectiveTo) {
		return fmt.Errorf("effectiveFrom tidak boleh lebih besar dari effectiveTo")
	}
	return nil
}

func toGraphQLTariffRuleOverride(row *tariffRuleOverrideRow) *generated.TariffRuleOverride {
	if row == nil {
		return nil
	}

	overrideType := generated.TariffOverrideType(strings.ToUpper(strings.TrimSpace(row.OverrideType)))
	if !overrideType.IsValid() {
		overrideType = generated.TariffOverrideTypeNormal
	}

	return &generated.TariffRuleOverride{
		ID:            row.ID,
		RuleID:        row.RuleID,
		OverrideType:  overrideType,
		EffectiveFrom: row.EffectiveFrom,
		EffectiveTo:   row.EffectiveTo,
		TarifUpah:     row.TarifUpah,
		Premi:         row.Premi,
		TarifPremi1:   row.TarifPremi1,
		TarifPremi2:   row.TarifPremi2,
		Notes:         row.Notes,
		IsActive:      row.IsActive,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}
}

func (r *Resolver) resolveTariffRuleCompanyID(ctx context.Context, ruleID string) (string, error) {
	var row struct {
		CompanyID string `gorm:"column:company_id"`
	}

	err := r.db.WithContext(ctx).
		Table("tariff_scheme_rules tr").
		Select("ts.company_id").
		Joins("JOIN tariff_schemes ts ON ts.id = tr.scheme_id").
		Where("tr.id = ?", ruleID).
		Take(&row).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", fmt.Errorf("tariff rule tidak ditemukan")
		}
		return "", fmt.Errorf("failed to load tariff rule: %w", err)
	}

	return row.CompanyID, nil
}

func (r *Resolver) loadTariffRuleOverrideByID(ctx context.Context, overrideID string) (*tariffRuleOverrideRow, error) {
	var row tariffRuleOverrideRow

	err := r.db.WithContext(ctx).
		Table("tariff_rule_overrides tro").
		Select(`
			tro.id,
			tro.rule_id,
			tro.override_type,
			tro.effective_from,
			tro.effective_to,
			tro.tarif_upah,
			tro.premi,
			tro.tarif_premi1,
			tro.tarif_premi2,
			tro.notes,
			tro.is_active,
			tro.created_at,
			tro.updated_at,
			ts.company_id
		`).
		Joins("JOIN tariff_scheme_rules tr ON tr.id = tro.rule_id").
		Joins("JOIN tariff_schemes ts ON ts.id = tr.scheme_id").
		Where("tro.id = ?", overrideID).
		Take(&row).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("tariff override tidak ditemukan")
		}
		return nil, fmt.Errorf("failed to load tariff override: %w", err)
	}

	return &row, nil
}

func (r *Resolver) hasTariffOverridePeriodConflict(
	ctx context.Context,
	ruleID string,
	overrideType generated.TariffOverrideType,
	effectiveFrom *time.Time,
	effectiveTo *time.Time,
	excludeID *string,
) (bool, error) {
	minDate := time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC)
	maxDate := time.Date(2999, 12, 31, 0, 0, 0, 0, time.UTC)

	fromDate := minDate
	if effectiveFrom != nil {
		fromDate = *effectiveFrom
	}
	toDate := maxDate
	if effectiveTo != nil {
		toDate = *effectiveTo
	}

	query := r.db.WithContext(ctx).
		Table("tariff_rule_overrides tro").
		Where("tro.rule_id = ?", ruleID).
		Where("tro.override_type = ?", string(overrideType)).
		Where("tro.is_active = ?", true).
		Where(
			`COALESCE(tro.effective_from, DATE '1900-01-01') <= ? AND COALESCE(tro.effective_to, DATE '2999-12-31') >= ?`,
			toDate,
			fromDate,
		)

	if excludeID != nil && strings.TrimSpace(*excludeID) != "" {
		query = query.Where("tro.id <> ?", strings.TrimSpace(*excludeID))
	}

	var count int64
	if err := query.Count(&count).Error; err != nil {
		return false, fmt.Errorf("failed to validate override conflict: %w", err)
	}

	return count > 0, nil
}

func (r *Resolver) requireRBACPermission(ctx context.Context, permission string) (string, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return "", fmt.Errorf("authentication required")
	}

	if r.RBACService == nil {
		return userID, nil
	}

	hasPermission, err := r.RBACService.HasPermission(ctx, userID, permission)
	if err != nil {
		return "", fmt.Errorf("failed to check permission: %w", err)
	}
	if !hasPermission {
		return "", fmt.Errorf("access denied: permission '%s' not granted", permission)
	}

	return userID, nil
}

func (r *Resolver) validateCompanyScope(ctx context.Context, userID, companyID string) error {
	if err := r.MasterResolver.GetMasterService().ValidateCompanyAccess(ctx, userID, companyID); err != nil {
		return fmt.Errorf("access denied: %w", err)
	}
	return nil
}

func (r *Resolver) getAssignedCompanyIDs(ctx context.Context, userID string) ([]string, error) {
	companyIDs := make([]string, 0)
	err := r.db.WithContext(ctx).
		Table("user_company_assignments").
		Where("user_id = ? AND is_active = ?", userID, true).
		Distinct("company_id").
		Pluck("company_id", &companyIDs).Error
	if err != nil {
		return nil, err
	}
	return companyIDs, nil
}

func convertEmployeeToGraphQL(employee *employeeModels.Employee) *master.Employee {
	var photoURL *string
	if strings.TrimSpace(employee.PhotoURL) != "" {
		photoURL = &employee.PhotoURL
	}

	return &master.Employee{
		ID:         employee.ID,
		Nik:        employee.NIK,
		Name:       employee.Name,
		Role:       employee.Role,
		CompanyID:  employee.CompanyID,
		DivisionID: employee.DivisionID,
		PhotoURL:   photoURL,
		IsActive:   employee.IsActive,
		CreatedAt:  employee.CreatedAt,
		UpdatedAt:  employee.UpdatedAt,
	}
}

func convertVehicleTaxToGraphQL(vehicleTax *master.VehicleTax) *generated.VehicleTax {
	if vehicleTax == nil {
		return nil
	}

	return &generated.VehicleTax{
		ID:               vehicleTax.ID,
		VehicleID:        vehicleTax.VehicleID,
		TaxYear:          vehicleTax.TaxYear,
		DueDate:          vehicleTax.DueDate,
		PkbAmount:        vehicleTax.PKBAmount,
		SwdklljAmount:    vehicleTax.SWDKLLJAmount,
		AdminAmount:      vehicleTax.AdminAmount,
		PenaltyAmount:    vehicleTax.PenaltyAmount,
		TotalAmount:      vehicleTax.TotalAmount,
		PaymentDate:      vehicleTax.PaymentDate,
		PaymentMethod:    vehicleTax.PaymentMethod,
		PaymentReference: vehicleTax.PaymentReference,
		TaxStatus:        vehicleTax.TaxStatus,
		Notes:            vehicleTax.Notes,
		CreatedAt:        vehicleTax.CreatedAt,
		UpdatedAt:        vehicleTax.UpdatedAt,
	}
}

func convertVehicleTaxDocumentToGraphQL(vehicleTaxDocument *master.VehicleTaxDocument) *generated.VehicleTaxDocument {
	if vehicleTaxDocument == nil {
		return nil
	}

	var uploadedBy *int32
	if vehicleTaxDocument.UploadedBy != nil {
		value := int32(*vehicleTaxDocument.UploadedBy)
		uploadedBy = &value
	}

	return &generated.VehicleTaxDocument{
		ID:           vehicleTaxDocument.ID,
		VehicleTaxID: vehicleTaxDocument.VehicleTaxID,
		DocumentType: vehicleTaxDocument.DocumentType,
		FilePath:     vehicleTaxDocument.FilePath,
		UploadedBy:   uploadedBy,
		UploadedAt:   vehicleTaxDocument.UploadedAt,
		CreatedAt:    vehicleTaxDocument.CreatedAt,
		UpdatedAt:    vehicleTaxDocument.UpdatedAt,
	}
}

func normalizeVehicleRegistrationPlate(value string) string {
	return strings.ToUpper(strings.Join(strings.Fields(value), " "))
}

func normalizeVehicleCategory(value string) string {
	return strings.ToUpper(strings.TrimSpace(value))
}

func normalizeVehicleStatus(value string) string {
	return strings.ToUpper(strings.TrimSpace(value))
}

func isValidVehicleCategory(value string) bool {
	switch value {
	case "CAR", "MOTORCYCLE", "TRUCK", "HEAVY_EQUIPMENT":
		return true
	default:
		return false
	}
}

func isValidVehicleStatus(value string) bool {
	switch value {
	case "ACTIVE", "INACTIVE", "SOLD", "SCRAPPED", "TRANSFERRED":
		return true
	default:
		return false
	}
}

func resolveVehicleInitialStatus(requested *string, isActive bool) string {
	if requested != nil && strings.TrimSpace(*requested) != "" {
		return *requested
	}
	if isActive {
		return "ACTIVE"
	}
	return "INACTIVE"
}

func resolveVehicleStatusFromState(currentStatus string, isActive bool) string {
	status := normalizeVehicleStatus(currentStatus)
	if status == "" {
		if isActive {
			return "ACTIVE"
		}
		return "INACTIVE"
	}
	if status == "ACTIVE" && !isActive {
		return "INACTIVE"
	}
	if status == "INACTIVE" && isActive {
		return "ACTIVE"
	}
	return status
}

func normalizeVehicleTaxStatus(value string) string {
	return strings.ToUpper(strings.TrimSpace(value))
}

func isValidVehicleTaxStatus(value string) bool {
	switch value {
	case "OPEN", "PAID", "OVERDUE", "VOID":
		return true
	default:
		return false
	}
}

func normalizeVehicleTaxDocumentType(value string) string {
	return strings.ToUpper(strings.TrimSpace(value))
}

func isValidVehicleTaxDocumentType(value string) bool {
	switch value {
	case "BUKTI_BAYAR", "STNK", "NOTICE", "OTHER":
		return true
	default:
		return false
	}
}

func resolveVehicleTaxInitialStatus(requested *string, paymentDate *time.Time, dueDate time.Time) string {
	if requested != nil && strings.TrimSpace(*requested) != "" {
		return *requested
	}
	if paymentDate != nil {
		return "PAID"
	}
	if isVehicleTaxOverdue(dueDate) {
		return "OVERDUE"
	}
	return "OPEN"
}

func resolveVehicleTaxStatusFromDates(currentStatus string, paymentDate *time.Time, dueDate time.Time) string {
	status := normalizeVehicleTaxStatus(currentStatus)
	if status == "VOID" {
		return "VOID"
	}
	if paymentDate != nil {
		return "PAID"
	}
	if isVehicleTaxOverdue(dueDate) {
		return "OVERDUE"
	}
	return "OPEN"
}

func resolveVehicleTaxTotal(requested *float64, pkb, swdkllj, admin, penalty float64) float64 {
	if requested != nil {
		return *requested
	}
	return pkb + swdkllj + admin + penalty
}

func isVehicleTaxOverdue(dueDate time.Time) bool {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	due := dueDate.UTC().Truncate(24 * time.Hour)
	return due.Before(today)
}

func normalizeOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func (r *Resolver) resolveVehicleCreateCompanyID(ctx context.Context, userID string, requestedCompanyID *string) (string, error) {
	role := middleware.GetUserRoleFromContext(ctx)
	if requestedCompanyID != nil && strings.TrimSpace(*requestedCompanyID) != "" {
		targetCompanyID := strings.TrimSpace(*requestedCompanyID)
		if role != auth.UserRoleSuperAdmin {
			if err := r.validateCompanyScope(ctx, userID, targetCompanyID); err != nil {
				return "", err
			}
		}
		return targetCompanyID, nil
	}

	assignedCompanyIDs, err := r.getAssignedCompanyIDs(ctx, userID)
	if err != nil {
		return "", fmt.Errorf("failed to resolve company scope: %w", err)
	}
	if len(assignedCompanyIDs) == 0 {
		if role == auth.UserRoleSuperAdmin {
			return "", fmt.Errorf("companyId is required for super admin")
		}
		return "", fmt.Errorf("user has no assigned company")
	}
	if len(assignedCompanyIDs) > 1 {
		return "", fmt.Errorf("companyId is required because user has multiple company assignments")
	}

	return assignedCompanyIDs[0], nil
}

func (r *Resolver) loadVehicleByID(ctx context.Context, id string) (*master.Vehicle, error) {
	var vehicle master.Vehicle
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&vehicle).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("vehicle not found")
		}
		return nil, fmt.Errorf("failed to get vehicle: %w", err)
	}
	return &vehicle, nil
}

func (r *Resolver) loadVehicleTaxByID(ctx context.Context, id string) (*master.VehicleTax, error) {
	var vehicleTax master.VehicleTax
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&vehicleTax).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("vehicle tax not found")
		}
		return nil, fmt.Errorf("failed to get vehicle tax: %w", err)
	}
	return &vehicleTax, nil
}

func (r *Resolver) loadVehicleTaxDocumentByID(ctx context.Context, id string) (*master.VehicleTaxDocument, error) {
	var vehicleTaxDocument master.VehicleTaxDocument
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&vehicleTaxDocument).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("vehicle tax document not found")
		}
		return nil, fmt.Errorf("failed to get vehicle tax document: %w", err)
	}
	return &vehicleTaxDocument, nil
}

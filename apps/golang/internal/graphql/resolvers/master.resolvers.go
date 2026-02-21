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
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

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

// TarifBloks is the resolver for the tarifBloks field.
func (r *queryResolver) TarifBloks(ctx context.Context) ([]*master.TarifBlok, error) {
	return r.MasterResolver.GetTarifBloks(ctx)
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

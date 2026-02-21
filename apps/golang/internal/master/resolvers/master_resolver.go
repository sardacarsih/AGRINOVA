package resolvers

import (
	"context"
	"fmt"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/internal/master/models"
	"agrinovagraphql/server/internal/master/services"
	"agrinovagraphql/server/internal/middleware"
)

// MasterResolver handles master data GraphQL operations
type MasterResolver struct {
	MasterService services.MasterService
	rbacService   *middleware.AuthMiddleware
}

// GetMasterService returns the master service
func (r *MasterResolver) GetMasterService() services.MasterService {
	return r.MasterService
}

// NewMasterResolver creates a new master resolver
func NewMasterResolver(masterService services.MasterService, authMiddleware *middleware.AuthMiddleware) *MasterResolver {
	return &MasterResolver{
		MasterService: masterService,
		rbacService:   authMiddleware,
	}
}

// Company operations

func (r *MasterResolver) CreateCompany(ctx context.Context, input master.CreateCompanyInput) (*master.Company, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	// RBAC Permission Check: Require company:create permission
	if r.rbacService != nil {
		if err := r.rbacService.CheckRBACPermission(ctx, "company:create"); err != nil {
			return nil, &models.MasterDataError{
				Code:    models.ErrCodePermissionDenied,
				Message: fmt.Sprintf("access denied: %v", err),
			}
		}
	}

	req := &models.CreateCompanyRequest{
		Name:        input.Name,
		CompanyCode: input.CompanyCode,
		Description: stringFromPtr(input.Description),
		LogoURL:     stringFromPtr(input.LogoURL),
		Address:     stringFromPtr(input.Address),
		Phone:       stringFromPtr(input.Phone),
		Status:      input.Status,
		IsActive:    input.IsActive,
	}

	company, err := r.MasterService.CreateCompany(ctx, req, userID)
	if err != nil {
		return nil, err
	}

	return r.convertCompanyToGraphQL(company), nil
}

func (r *MasterResolver) UpdateCompany(ctx context.Context, input master.UpdateCompanyInput) (*master.Company, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	// RBAC Permission Check: Require company:write permission
	if r.rbacService != nil {
		if err := r.rbacService.CheckRBACPermission(ctx, "company:write"); err != nil {
			return nil, &models.MasterDataError{
				Code:    models.ErrCodePermissionDenied,
				Message: fmt.Sprintf("access denied: %v", err),
			}
		}
	}

	req := &models.UpdateCompanyRequest{
		ID:          input.ID,
		Name:        input.Name,
		CompanyCode: input.CompanyCode,
		Description: input.Description,
		LogoURL:     input.LogoURL,
		Address:     input.Address,
		Phone:       input.Phone,
		IsActive:    input.IsActive,
	}

	if input.Status != nil {
		status := models.CompanyStatus(*input.Status)
		req.Status = &status
	}

	company, err := r.MasterService.UpdateCompany(ctx, req, userID)
	if err != nil {
		return nil, err
	}

	return r.convertCompanyToGraphQL(company), nil
}

func (r *MasterResolver) DeleteCompany(ctx context.Context, id string) (bool, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return false, err
	}

	// RBAC Permission Check: Require company:delete permission
	if r.rbacService != nil {
		if err := r.rbacService.CheckRBACPermission(ctx, "company:delete"); err != nil {
			return false, &models.MasterDataError{
				Code:    models.ErrCodePermissionDenied,
				Message: fmt.Sprintf("access denied: %v", err),
			}
		}
	}

	if err := r.MasterService.DeleteCompany(ctx, id, userID); err != nil {
		return false, err
	}

	return true, nil
}

func (r *MasterResolver) GetCompanies(ctx context.Context, search *string, isActive *bool, page *int32, limit *int32) (*master.CompanyPaginationResponse, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	filters := &models.MasterFilters{}
	if search != nil {
		filters.Search = search
	}
	if isActive != nil {
		filters.IsActive = isActive
	}

	// Pagination
	p := 1
	if page != nil && *page > 0 {
		p = int(*page)
	}
	l := models.DefaultLimit
	if limit != nil && *limit > 0 {
		l = int(*limit)
	}
	offset := (p - 1) * l
	filters.Limit = &l
	filters.Offset = &offset

	companies, err := r.MasterService.GetCompanies(ctx, filters, userID)
	if err != nil {
		return nil, err
	}

	total, err := r.MasterService.CountCompanies(ctx, filters, userID)
	if err != nil {
		return nil, err
	}

	resultData := make([]*master.Company, len(companies))
	for i, company := range companies {
		resultData[i] = r.convertCompanyToGraphQL(company)
	}

	pages := int(total) / l
	if int(total)%l > 0 {
		pages++
	}

	return &master.CompanyPaginationResponse{
		Data: resultData,
		Pagination: &master.Pagination{
			Page:  int32(p),
			Limit: int32(l),
			Total: int32(total),
			Pages: int32(pages),
		},
	}, nil
}

func (r *MasterResolver) GetCompany(ctx context.Context, id string) (*master.Company, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	company, err := r.MasterService.GetCompanyByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	return r.convertCompanyToGraphQL(company), nil
}

// Estate operations

func (r *MasterResolver) CreateEstate(ctx context.Context, input master.CreateEstateInput) (*master.Estate, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.requirePermission(ctx, "estate:create"); err != nil {
		return nil, err
	}

	req := &models.CreateEstateRequest{
		Name:      input.Name,
		Code:      input.Code,
		Location:  stringFromPtr(input.Location),
		LuasHa:    input.LuasHa,
		CompanyID: input.CompanyID,
	}

	estate, err := r.MasterService.CreateEstate(ctx, req, userID)
	if err != nil {
		return nil, err
	}

	return r.convertEstateToGraphQL(estate), nil
}

func (r *MasterResolver) UpdateEstate(ctx context.Context, input master.UpdateEstateInput) (*master.Estate, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.requirePermission(ctx, "estate:update"); err != nil {
		return nil, err
	}

	req := &models.UpdateEstateRequest{
		ID:       input.ID,
		Name:     input.Name,
		Code:     input.Code,
		Location: input.Location,
		LuasHa:   input.LuasHa,
	}

	estate, err := r.MasterService.UpdateEstate(ctx, req, userID)
	if err != nil {
		return nil, err
	}

	return r.convertEstateToGraphQL(estate), nil
}

func (r *MasterResolver) DeleteEstate(ctx context.Context, id string) (bool, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return false, err
	}

	if err := r.requirePermission(ctx, "estate:delete"); err != nil {
		return false, err
	}

	if err := r.MasterService.DeleteEstate(ctx, id, userID); err != nil {
		return false, err
	}

	return true, nil
}

func (r *MasterResolver) GetEstates(ctx context.Context) ([]*master.Estate, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.requirePermission(ctx, "estate:read"); err != nil {
		return nil, err
	}

	limit := models.MaxLimit
	estates, err := r.MasterService.GetEstates(ctx, &models.MasterFilters{
		Limit: &limit,
	}, userID)
	if err != nil {
		return nil, err
	}

	result := make([]*master.Estate, len(estates))
	for i, estate := range estates {
		result[i] = r.convertEstateToGraphQL(estate)
	}

	return result, nil
}

func (r *MasterResolver) GetEstate(ctx context.Context, id string) (*master.Estate, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.requirePermission(ctx, "estate:read"); err != nil {
		return nil, err
	}

	estate, err := r.MasterService.GetEstateByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	return r.convertEstateToGraphQL(estate), nil
}

// Block operations

func (r *MasterResolver) CreateBlock(ctx context.Context, input master.CreateBlockInput) (*master.Block, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.requirePermission(ctx, "block:create"); err != nil {
		return nil, err
	}

	req := &models.CreateBlockRequest{
		BlockCode:    input.BlockCode,
		Name:         input.Name,
		LuasHa:       input.LuasHa,
		CropType:     stringFromPtr(input.CropType),
		PlantingYear: int32PtrToIntPtr(input.PlantingYear),
		Status:       stringFromPtr(input.Status),
		ISTM:         stringFromPtr(input.ISTM),
		TarifBlokID:  input.TarifBlokID,
		DivisionID:   input.DivisionID,
	}

	block, err := r.MasterService.CreateBlock(ctx, req, userID)
	if err != nil {
		return nil, err
	}

	return r.convertBlockToGraphQL(block), nil
}

func (r *MasterResolver) UpdateBlock(ctx context.Context, input master.UpdateBlockInput) (*master.Block, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.requirePermission(ctx, "block:update"); err != nil {
		return nil, err
	}

	req := &models.UpdateBlockRequest{
		ID:           input.ID,
		BlockCode:    input.BlockCode,
		Name:         input.Name,
		LuasHa:       input.LuasHa,
		CropType:     input.CropType,
		PlantingYear: int32PtrToIntPtr(input.PlantingYear),
		Status:       input.Status,
		ISTM:         input.ISTM,
		TarifBlokID:  input.TarifBlokID,
	}

	block, err := r.MasterService.UpdateBlock(ctx, req, userID)
	if err != nil {
		return nil, err
	}

	return r.convertBlockToGraphQL(block), nil
}

func (r *MasterResolver) DeleteBlock(ctx context.Context, id string) (bool, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return false, err
	}

	if err := r.requirePermission(ctx, "block:delete"); err != nil {
		return false, err
	}

	if err := r.MasterService.DeleteBlock(ctx, id, userID); err != nil {
		return false, err
	}

	return true, nil
}

func (r *MasterResolver) GetBlocks(ctx context.Context) ([]*master.Block, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.requirePermission(ctx, "block:read"); err != nil {
		return nil, err
	}

	limit := models.MaxLimit
	blocks, err := r.MasterService.GetBlocks(ctx, &models.MasterFilters{
		Limit: &limit,
	}, userID)
	if err != nil {
		return nil, err
	}

	result := make([]*master.Block, len(blocks))
	for i, block := range blocks {
		result[i] = r.convertBlockToGraphQL(block)
	}

	return result, nil
}

func (r *MasterResolver) GetBlock(ctx context.Context, id string) (*master.Block, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.requirePermission(ctx, "block:read"); err != nil {
		return nil, err
	}

	block, err := r.MasterService.GetBlockByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	return r.convertBlockToGraphQL(block), nil
}

func (r *MasterResolver) GetTarifBloks(ctx context.Context) ([]*master.TarifBlok, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.requirePermission(ctx, "block:read"); err != nil {
		return nil, err
	}

	tarifBloks, err := r.MasterService.GetTarifBloks(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := make([]*master.TarifBlok, len(tarifBloks))
	for i, tarifBlok := range tarifBloks {
		result[i] = r.convertTarifBlokToGraphQL(tarifBlok)
	}

	return result, nil
}

func (r *MasterResolver) CreateTarifBlok(ctx context.Context, input master.CreateTarifBlokInput) (*master.TarifBlok, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.requirePermission(ctx, "block:create"); err != nil {
		return nil, err
	}

	req := &models.CreateTarifBlokRequest{
		CompanyID:    input.CompanyID,
		Perlakuan:    input.Perlakuan,
		Basis:        input.Basis,
		TarifUpah:    input.TarifUpah,
		Premi:        input.Premi,
		TarifPremi1:  input.TarifPremi1,
		TarifPremi2:  input.TarifPremi2,
		TarifLibur:   input.TarifLibur,
		TarifLebaran: input.TarifLebaran,
		IsActive:     input.IsActive,
	}

	tarifBlok, err := r.MasterService.CreateTarifBlok(ctx, req, userID)
	if err != nil {
		return nil, err
	}

	return r.convertTarifBlokToGraphQL(tarifBlok), nil
}

func (r *MasterResolver) UpdateTarifBlok(ctx context.Context, input master.UpdateTarifBlokInput) (*master.TarifBlok, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.requirePermission(ctx, "block:update"); err != nil {
		return nil, err
	}

	req := &models.UpdateTarifBlokRequest{
		ID:           input.ID,
		CompanyID:    input.CompanyID,
		Perlakuan:    input.Perlakuan,
		Basis:        input.Basis,
		TarifUpah:    input.TarifUpah,
		Premi:        input.Premi,
		TarifPremi1:  input.TarifPremi1,
		TarifPremi2:  input.TarifPremi2,
		TarifLibur:   input.TarifLibur,
		TarifLebaran: input.TarifLebaran,
		IsActive:     input.IsActive,
	}

	tarifBlok, err := r.MasterService.UpdateTarifBlok(ctx, req, userID)
	if err != nil {
		return nil, err
	}

	return r.convertTarifBlokToGraphQL(tarifBlok), nil
}

func (r *MasterResolver) DeleteTarifBlok(ctx context.Context, id string) (bool, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return false, err
	}

	if err := r.requirePermission(ctx, "block:delete"); err != nil {
		return false, err
	}

	if err := r.MasterService.DeleteTarifBlok(ctx, id, userID); err != nil {
		return false, err
	}

	return true, nil
}

// Division operations

func (r *MasterResolver) CreateDivision(ctx context.Context, input master.CreateDivisionInput) (*master.Division, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.requirePermission(ctx, "division:create"); err != nil {
		return nil, err
	}

	req := &models.CreateDivisionRequest{
		Name:     input.Name,
		Code:     input.Code,
		EstateID: input.EstateID,
	}

	division, err := r.MasterService.CreateDivision(ctx, req, userID)
	if err != nil {
		return nil, err
	}

	return r.convertDivisionToGraphQL(division), nil
}

func (r *MasterResolver) UpdateDivision(ctx context.Context, input master.UpdateDivisionInput) (*master.Division, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.requirePermission(ctx, "division:update"); err != nil {
		return nil, err
	}

	req := &models.UpdateDivisionRequest{
		ID:   input.ID,
		Name: input.Name,
		Code: input.Code,
	}

	division, err := r.MasterService.UpdateDivision(ctx, req, userID)
	if err != nil {
		return nil, err
	}

	return r.convertDivisionToGraphQL(division), nil
}

func (r *MasterResolver) DeleteDivision(ctx context.Context, id string) (bool, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return false, err
	}

	if err := r.requirePermission(ctx, "division:delete"); err != nil {
		return false, err
	}

	if err := r.MasterService.DeleteDivision(ctx, id, userID); err != nil {
		return false, err
	}

	return true, nil
}

func (r *MasterResolver) GetDivisions(ctx context.Context) ([]*master.Division, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.requirePermission(ctx, "division:read"); err != nil {
		return nil, err
	}

	limit := models.MaxLimit
	divisions, err := r.MasterService.GetDivisions(ctx, &models.MasterFilters{
		Limit: &limit,
	}, userID)
	if err != nil {
		return nil, err
	}

	result := make([]*master.Division, len(divisions))
	for i, division := range divisions {
		result[i] = r.convertDivisionToGraphQL(division)
	}

	return result, nil
}

func (r *MasterResolver) GetDivision(ctx context.Context, id string) (*master.Division, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.requirePermission(ctx, "division:read"); err != nil {
		return nil, err
	}

	division, err := r.MasterService.GetDivisionByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	return r.convertDivisionToGraphQL(division), nil
}

// Assignment operations

func (r *MasterResolver) AssignUserToEstate(ctx context.Context, userID string, estateID string) (*models.UserEstateAssignment, error) {
	assignerID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	req := &models.AssignUserToEstateRequest{
		UserID:   userID,
		EstateID: estateID,
	}

	assignment, err := r.MasterService.AssignUserToEstate(ctx, req, assignerID)
	if err != nil {
		return nil, err
	}

	return r.convertEstateAssignmentToGraphQL(assignment), nil
}

func (r *MasterResolver) AssignUserToDivision(ctx context.Context, userID string, divisionID string) (*models.UserDivisionAssignment, error) {
	assignerID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	req := &models.AssignUserToDivisionRequest{
		UserID:     userID,
		DivisionID: divisionID,
	}

	assignment, err := r.MasterService.AssignUserToDivision(ctx, req, assignerID)
	if err != nil {
		return nil, err
	}

	return r.convertDivisionAssignmentToGraphQL(assignment), nil
}

func (r *MasterResolver) AssignUserToCompany(ctx context.Context, userID string, companyID string) (*models.UserCompanyAssignment, error) {
	assignerID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	req := &models.AssignUserToCompanyRequest{
		UserID:    userID,
		CompanyID: companyID,
	}

	assignment, err := r.MasterService.AssignUserToCompany(ctx, req, assignerID)
	if err != nil {
		return nil, err
	}

	return r.convertCompanyAssignmentToGraphQL(assignment), nil
}

func (r *MasterResolver) RemoveEstateAssignment(ctx context.Context, id string) (bool, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return false, err
	}

	if err := r.MasterService.RemoveEstateAssignment(ctx, id, userID); err != nil {
		return false, err
	}

	return true, nil
}

func (r *MasterResolver) RemoveDivisionAssignment(ctx context.Context, id string) (bool, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return false, err
	}

	if err := r.MasterService.RemoveDivisionAssignment(ctx, id, userID); err != nil {
		return false, err
	}

	return true, nil
}

func (r *MasterResolver) RemoveCompanyAssignment(ctx context.Context, id string) (bool, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return false, err
	}

	if err := r.MasterService.RemoveCompanyAssignment(ctx, id, userID); err != nil {
		return false, err
	}

	return true, nil
}

// Assignment query operations

func (r *MasterResolver) GetMyAssignments(ctx context.Context) (*auth.UserAssignments, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	assignments, err := r.MasterService.GetUserAssignments(ctx, userID)
	if err != nil {
		return nil, err
	}

	return r.convertUserAssignmentsToGraphQL(assignments), nil
}

func (r *MasterResolver) GetEstateAssignments(ctx context.Context) ([]*models.UserEstateAssignment, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	assignments, err := r.MasterService.GetEstateAssignments(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := make([]*models.UserEstateAssignment, len(assignments))
	for i, assignment := range assignments {
		result[i] = r.convertEstateAssignmentToGraphQL(assignment)
	}

	return result, nil
}

func (r *MasterResolver) GetDivisionAssignments(ctx context.Context) ([]*models.UserDivisionAssignment, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	assignments, err := r.MasterService.GetDivisionAssignments(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := make([]*models.UserDivisionAssignment, len(assignments))
	for i, assignment := range assignments {
		result[i] = r.convertDivisionAssignmentToGraphQL(assignment)
	}

	return result, nil
}

func (r *MasterResolver) GetCompanyAssignments(ctx context.Context) ([]*models.UserCompanyAssignment, error) {
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}

	assignments, err := r.MasterService.GetCompanyAssignments(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := make([]*models.UserCompanyAssignment, len(assignments))
	for i, assignment := range assignments {
		result[i] = r.convertCompanyAssignmentToGraphQL(assignment)
	}

	return result, nil
}

// ConvertBlockToGraphQL converts internal block model into GraphQL block model.
func (r *MasterResolver) ConvertBlockToGraphQL(block *models.Block) *master.Block {
	return r.convertBlockToGraphQL(block)
}

// Conversion functions

func (r *MasterResolver) convertCompanyToGraphQL(company *models.Company) *master.Company {
	if company == nil {
		return nil
	}

	result := &master.Company{
		ID:          company.ID,
		Name:        company.Name,
		CompanyCode: company.CompanyCode,
		Address:     company.Address,
		Phone:       company.Phone,
		Status:      master.CompanyStatus(company.Status),
		Description: company.Description,
		LogoURL:     company.LogoURL,
		IsActive:    company.IsActive,
		Estates:     []*master.Estate{},
		CreatedAt:   company.CreatedAt,
		UpdatedAt:   company.UpdatedAt,
	}

	for _, estate := range company.Estates {
		if estate == nil {
			continue
		}
		result.Estates = append(result.Estates, &master.Estate{
			ID:        estate.ID,
			Name:      estate.Name,
			Code:      estate.Code,
			Location:  estate.Location,
			LuasHa:    estate.LuasHa,
			CompanyID: estate.CompanyID,
			Divisions: []*master.Division{},
			CreatedAt: estate.CreatedAt,
			UpdatedAt: estate.UpdatedAt,
		})
	}

	return result
}

func (r *MasterResolver) convertEstateToGraphQL(estate *models.Estate) *master.Estate {
	if estate == nil {
		return nil
	}

	result := &master.Estate{
		ID:        estate.ID,
		Name:      estate.Name,
		Code:      estate.Code,
		Location:  estate.Location,
		LuasHa:    estate.LuasHa,
		CompanyID: estate.CompanyID,
		Divisions: []*master.Division{},
		CreatedAt: estate.CreatedAt,
		UpdatedAt: estate.UpdatedAt,
	}

	if estate.Company != nil {
		result.Company = r.convertCompanyToGraphQL(estate.Company)
	}

	for _, division := range estate.Divisions {
		if division == nil {
			continue
		}
		result.Divisions = append(result.Divisions, &master.Division{
			ID:        division.ID,
			Name:      division.Name,
			Code:      division.Code,
			EstateID:  division.EstateID,
			Blocks:    []*master.Block{},
			CreatedAt: division.CreatedAt,
			UpdatedAt: division.UpdatedAt,
		})
	}

	return result
}

func (r *MasterResolver) convertBlockToGraphQL(block *models.Block) *master.Block {
	if block == nil {
		return nil
	}

	result := &master.Block{
		ID:           block.ID,
		BlockCode:    block.BlockCode,
		Name:         block.Name,
		LuasHa:       block.LuasHa,
		CropType:     block.CropType,
		PlantingYear: block.PlantingYear,
		Status:       block.Status,
		ISTM:         block.ISTM,
		Perlakuan:    block.Perlakuan,
		TarifBlokID:  block.TarifBlokID,
		DivisionID:   block.DivisionID,
		IsActive:     block.IsActive,
		CreatedAt:    block.CreatedAt,
		UpdatedAt:    block.UpdatedAt,
	}

	if block.TarifBlok != nil {
		result.TarifBlok = r.convertTarifBlokToGraphQL(block.TarifBlok)
	}

	if block.Division != nil {
		result.Division = r.convertDivisionToGraphQL(block.Division)
	}

	return result
}

func (r *MasterResolver) convertDivisionToGraphQL(division *models.Division) *master.Division {
	if division == nil {
		return nil
	}

	result := &master.Division{
		ID:        division.ID,
		Name:      division.Name,
		Code:      division.Code,
		EstateID:  division.EstateID,
		Blocks:    []*master.Block{},
		CreatedAt: division.CreatedAt,
		UpdatedAt: division.UpdatedAt,
	}

	if division.Estate != nil {
		result.Estate = r.convertEstateToGraphQL(division.Estate)
	}

	for _, block := range division.Blocks {
		if block == nil {
			continue
		}
		result.Blocks = append(result.Blocks, &master.Block{
			ID:           block.ID,
			BlockCode:    block.BlockCode,
			Name:         block.Name,
			LuasHa:       block.LuasHa,
			CropType:     block.CropType,
			PlantingYear: block.PlantingYear,
			Status:       block.Status,
			ISTM:         block.ISTM,
			Perlakuan:    block.Perlakuan,
			TarifBlokID:  block.TarifBlokID,
			DivisionID:   block.DivisionID,
			IsActive:     block.IsActive,
			CreatedAt:    block.CreatedAt,
			UpdatedAt:    block.UpdatedAt,
		})
	}

	return result
}

func (r *MasterResolver) convertTarifBlokToGraphQL(tarifBlok *models.TarifBlok) *master.TarifBlok {
	if tarifBlok == nil {
		return nil
	}

	result := &master.TarifBlok{
		ID:           tarifBlok.ID,
		CompanyID:    tarifBlok.CompanyID,
		Perlakuan:    tarifBlok.Perlakuan,
		Basis:        tarifBlok.Basis,
		TarifUpah:    tarifBlok.TarifUpah,
		Premi:        tarifBlok.Premi,
		TarifPremi1:  tarifBlok.TarifPremi1,
		TarifPremi2:  tarifBlok.TarifPremi2,
		TarifLibur:   tarifBlok.TarifLibur,
		TarifLebaran: tarifBlok.TarifLebaran,
		IsActive:     tarifBlok.IsActive,
		CreatedAt:    tarifBlok.CreatedAt,
		UpdatedAt:    tarifBlok.UpdatedAt,
	}

	if tarifBlok.Company != nil {
		result.Company = r.convertCompanyToGraphQL(tarifBlok.Company)
	}

	return result
}

func (r *MasterResolver) convertUserToGraphQL(user *auth.User) *auth.User {
	return &auth.User{
		ID:          user.ID,
		Username:    user.Username,
		Name:        user.Name,
		Email:       user.Email,
		PhoneNumber: user.PhoneNumber,
		Role:        auth.UserRole(user.Role),
		IsActive:    user.IsActive,
		CreatedAt:   user.CreatedAt,
		UpdatedAt:   user.UpdatedAt,
		// Company will be handled by GraphQL field resolvers
	}
}

func (r *MasterResolver) convertEstateAssignmentToGraphQL(assignment *models.UserEstateAssignment) *models.UserEstateAssignment {
	return &models.UserEstateAssignment{
		ID:         assignment.ID,
		UserID:     assignment.UserID,
		EstateID:   assignment.EstateID,
		IsActive:   assignment.IsActive,
		AssignedBy: assignment.AssignedBy,
		AssignedAt: assignment.AssignedAt,
		CreatedAt:  assignment.CreatedAt,
		UpdatedAt:  assignment.UpdatedAt,
		// User and Estate will be handled by GraphQL field resolvers
	}
}

func (r *MasterResolver) convertDivisionAssignmentToGraphQL(assignment *models.UserDivisionAssignment) *models.UserDivisionAssignment {
	return &models.UserDivisionAssignment{
		ID:         assignment.ID,
		UserID:     assignment.UserID,
		DivisionID: assignment.DivisionID,
		IsActive:   assignment.IsActive,
		AssignedBy: assignment.AssignedBy,
		AssignedAt: assignment.AssignedAt,
		CreatedAt:  assignment.CreatedAt,
		UpdatedAt:  assignment.UpdatedAt,
		// User and Division will be handled by GraphQL field resolvers
	}
}

func (r *MasterResolver) convertCompanyAssignmentToGraphQL(assignment *models.UserCompanyAssignment) *models.UserCompanyAssignment {
	return &models.UserCompanyAssignment{
		ID:         assignment.ID,
		UserID:     assignment.UserID,
		CompanyID:  assignment.CompanyID,
		IsActive:   assignment.IsActive,
		AssignedBy: assignment.AssignedBy,
		AssignedAt: assignment.AssignedAt,
		CreatedAt:  assignment.CreatedAt,
		UpdatedAt:  assignment.UpdatedAt,
		// User and Company will be handled by GraphQL field resolvers
	}
}

func (r *MasterResolver) convertUserAssignmentsToGraphQL(assignments *models.UserAssignmentsResponse) *auth.UserAssignments {
	// Convert estates
	estates := make([]*master.Estate, len(assignments.Estates))
	for i, estate := range assignments.Estates {
		estates[i] = r.convertEstateToGraphQL(&estate)
	}

	// Convert divisions
	divisions := make([]*master.Division, len(assignments.Divisions))
	for i, division := range assignments.Divisions {
		divisions[i] = r.convertDivisionToGraphQL(&division)
	}

	// Convert companies
	companies := make([]*master.Company, len(assignments.Companies))
	for i, company := range assignments.Companies {
		companies[i] = r.convertCompanyToGraphQL(&company)
	}

	return &auth.UserAssignments{
		Estates:   estates,
		Divisions: divisions,
		Companies: companies,
	}
}

// Helper functions

func (r *MasterResolver) getUserIDFromContext(ctx context.Context) (string, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return "", &models.MasterDataError{
			Code:    models.ErrCodePermissionDenied,
			Message: "authentication required",
		}
	}
	return userID, nil
}

func (r *MasterResolver) requirePermission(ctx context.Context, permission string) error {
	if r.rbacService != nil {
		if err := r.rbacService.CheckRBACPermission(ctx, permission); err != nil {
			return &models.MasterDataError{
				Code:    models.ErrCodePermissionDenied,
				Message: fmt.Sprintf("access denied: %v", err),
			}
		}
	}
	return nil
}

func stringFromPtr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func ptrToString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func intFromPtr(i *int) int {
	if i == nil {
		return 0
	}
	return *i
}

func int32PtrToIntPtr(i32 *int32) *int {
	if i32 == nil {
		return nil
	}
	i := int(*i32)
	return &i
}

func intPtrToInt32Ptr(i *int) *int32 {
	if i == nil {
		return nil
	}
	i32 := int32(*i)
	return &i32
}

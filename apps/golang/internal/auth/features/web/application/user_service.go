package web

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"agrinovagraphql/server/internal/auth/features/shared/domain"
)

var companyAdminManageableRoles = map[domain.Role]struct{}{
	domain.RoleManager:   {},
	domain.RoleAsisten:   {},
	domain.RoleMandor:    {},
	domain.RoleSatpam:    {},
	domain.RoleTimbangan: {},
	domain.RoleGrading:   {},
}

var rolesRequiringCompany = map[domain.Role]struct{}{
	domain.RoleCompanyAdmin: {},
	domain.RoleAreaManager:  {},
	domain.RoleManager:      {},
	domain.RoleAsisten:      {},
	domain.RoleMandor:       {},
	domain.RoleSatpam:       {},
	domain.RoleGrading:      {},
	domain.RoleTimbangan:    {},
}

var rolesRequiringEstate = map[domain.Role]struct{}{
	domain.RoleManager: {},
	domain.RoleAsisten: {},
	domain.RoleMandor:  {},
}

var rolesRequiringDivision = map[domain.Role]struct{}{
	domain.RoleAsisten: {},
	domain.RoleMandor:  {},
}

// UserManagementService handles user CRUD operations
type UserManagementService struct {
	userRepo       domain.UserRepository
	passwordSvc    domain.PasswordService
	securityLogger domain.SecurityEventLogger
}

// NewUserManagementService creates new user management service
func NewUserManagementService(
	userRepo domain.UserRepository,
	passwordSvc domain.PasswordService,
	securityLogger domain.SecurityEventLogger,
) *UserManagementService {
	return &UserManagementService{
		userRepo:       userRepo,
		passwordSvc:    passwordSvc,
		securityLogger: securityLogger,
	}
}

// GetUsers returns users with filters
func (s *UserManagementService) GetUsers(ctx context.Context, filters domain.UserFilters) ([]*domain.User, int64, error) {
	if s.isCompanyAdminRequester(ctx) {
		requesterCompanyID := s.requesterCompanyID(ctx)
		if requesterCompanyID == "" {
			return nil, 0, errors.New("company context is required")
		}

		// Force tenant scoping to requester's own company.
		filters.CompanyID = &requesterCompanyID

		// Company admin cannot query higher roles.
		if filters.Role != nil && !s.isManageableByCompanyAdmin(*filters.Role) {
			return nil, 0, errors.New("company admin can only access MANAGER and below roles")
		}
	}

	return s.userRepo.FindWithFilters(ctx, filters)
}

// GetUserByID returns user by ID
func (s *UserManagementService) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, nil
	}

	if err := s.ensureCompanyAdminTargetAccess(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

// CreateUser creates a new user
func (s *UserManagementService) CreateUser(ctx context.Context, input domain.UserDTO, password string) (*domain.User, error) {
	if s.isCompanyAdminRequester(ctx) {
		if !s.isManageableByCompanyAdmin(input.Role) {
			return nil, errors.New("company admin can only manage MANAGER and below roles")
		}

		requesterCompanyID := s.requesterCompanyID(ctx)
		if requesterCompanyID == "" {
			return nil, errors.New("company context is required")
		}

		// Force assignment to requester's company only.
		input.CompanyID = requesterCompanyID
		input.CompanyIDs = []string{requesterCompanyID}
	}

	// Check if username/email exists
	existing, err := s.userRepo.FindByIdentifier(ctx, input.Username)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("username already exists")
	}

	hashedPassword, err := s.passwordSvc.HashPassword(password)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		ID:                 generateID(), // Reuse helper
		Username:           input.Username,
		Name:               input.Name,
		Email:              input.Email,
		Phone:              input.Phone,
		Avatar:             input.Avatar,
		Password:           hashedPassword,
		Role:               input.Role,
		IsActive:           input.IsActive,
		ManagerID:          input.ManagerID,
		LanguagePreference: input.LanguagePreference,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	// Create assignments for all CompanyIDs (multi-company support)
	companyIDs := input.CompanyIDs
	if len(companyIDs) == 0 && input.CompanyID != "" {
		// Backward compatibility: use single CompanyID if CompanyIDs is empty
		companyIDs = []string{input.CompanyID}
	}
	companyIDs = uniqueNonEmptyStrings(companyIDs)
	estateIDs := uniqueNonEmptyStrings(input.EstateIDs)
	divisionIDs := uniqueNonEmptyStrings(input.DivisionIDs)

	if err := validateRoleAssignmentRequirements(input.Role, companyIDs, estateIDs, divisionIDs); err != nil {
		return nil, err
	}

	// Extract current user ID for AssignedBy from context
	var performerID string
	if val := ctx.Value("user_id"); val != nil {
		performerID = val.(string)
	}
	if performerID == "" {
		performerID = "00000000-0000-0000-0000-000000000000" // Fallback to system
	}

	for _, companyID := range companyIDs {
		// Base company assignment
		assignment := domain.Assignment{
			ID:         generateID(),
			UserID:     user.ID,
			CompanyID:  companyID,
			AssignedBy: performerID,
			IsActive:   true,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}
		user.Assignments = append(user.Assignments, assignment)

		// Create estate assignments if provided
		for _, estateID := range estateIDs {
			eID := estateID
			estAssignment := domain.Assignment{
				ID:         generateID(),
				UserID:     user.ID,
				CompanyID:  companyID,
				EstateID:   &eID,
				AssignedBy: performerID,
				IsActive:   true,
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			}
			user.Assignments = append(user.Assignments, estAssignment)
		}

		// Create division assignments if provided
		for _, divisionID := range divisionIDs {
			dID := divisionID
			divAssignment := domain.Assignment{
				ID:         generateID(),
				UserID:     user.ID,
				CompanyID:  companyID,
				DivisionID: &dID,
				AssignedBy: performerID,
				IsActive:   true,
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			}
			user.Assignments = append(user.Assignments, divAssignment)
		}
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	s.securityLogger.LogSecurityEvent(ctx, &domain.SecurityEvent{
		Event:    domain.EventSuspiciousActivity, // TODO: Add EventUserCreated
		Details:  map[string]interface{}{"action": "create_user", "target_user": user.Username},
		Severity: domain.SeverityInfo,
	})

	return user, nil
}

// UpdateUser updates existing user
func (s *UserManagementService) UpdateUser(ctx context.Context, input domain.UserDTO) (*domain.User, error) {
	user, err := s.userRepo.FindByID(ctx, input.ID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	if err := s.ensureCompanyAdminTargetAccess(ctx, user); err != nil {
		return nil, err
	}

	requesterID := s.requesterUserID(ctx)
	isSelfUpdate := requesterID != "" && requesterID == input.ID

	if s.isCompanyAdminRequester(ctx) && !isSelfUpdate {
		// Company admin cannot assign higher roles.
		if input.Role != "" && !s.isManageableByCompanyAdmin(input.Role) {
			return nil, errors.New("company admin can only manage MANAGER and below roles")
		}

		requesterCompanyID := s.requesterCompanyID(ctx)
		if requesterCompanyID == "" {
			return nil, errors.New("company context is required")
		}

		// Force assignment to requester's company only.
		input.CompanyID = requesterCompanyID
		input.CompanyIDs = []string{requesterCompanyID}
	}

	// Update basic fields
	if input.Username != "" && input.Username != user.Username {
		// Check uniqueness
		existing, err := s.userRepo.FindByIdentifier(ctx, input.Username)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return nil, errors.New("username already exists")
		}
		user.Username = input.Username
	}

	user.Email = input.Email
	user.Avatar = input.Avatar
	if input.Role != "" {
		user.Role = input.Role
	}
	user.IsActive = input.IsActive
	if input.LanguagePreference != nil {
		user.LanguagePreference = input.LanguagePreference
	}
	user.ManagerID = input.ManagerID
	user.UpdatedAt = time.Now()

	// Handle multi-company assignments via CompanyIDs
	companyIDs := uniqueNonEmptyStrings(input.CompanyIDs)
	if len(companyIDs) == 0 && input.CompanyID != "" {
		// Backward compatibility
		companyIDs = []string{input.CompanyID}
	}
	estateIDs := uniqueNonEmptyStrings(input.EstateIDs)
	divisionIDs := uniqueNonEmptyStrings(input.DivisionIDs)

	effectiveRole := user.Role
	if input.Role != "" {
		effectiveRole = input.Role
	}

	currentCompanyIDs, currentEstateIDs, currentDivisionIDs := extractActiveAssignmentIDs(user.Assignments)

	effectiveCompanyIDs := currentCompanyIDs
	if input.CompanyIDs != nil {
		effectiveCompanyIDs = companyIDs
	}

	effectiveEstateIDs := currentEstateIDs
	if input.EstateIDs != nil {
		effectiveEstateIDs = estateIDs
	}

	effectiveDivisionIDs := currentDivisionIDs
	if input.DivisionIDs != nil {
		effectiveDivisionIDs = divisionIDs
	}

	shouldValidateRoleAssignments := input.Role != "" ||
		input.CompanyIDs != nil ||
		input.EstateIDs != nil ||
		input.DivisionIDs != nil

	if shouldValidateRoleAssignments {
		if err := validateRoleAssignmentRequirements(effectiveRole, effectiveCompanyIDs, effectiveEstateIDs, effectiveDivisionIDs); err != nil {
			return nil, err
		}
	}

	if len(companyIDs) > 0 {
		// Build sets of desired IDs
		desiredCompanies := make(map[string]bool)
		for _, cid := range companyIDs {
			desiredCompanies[cid] = true
		}
		desiredEstates := make(map[string]bool)
		for _, eid := range estateIDs {
			desiredEstates[eid] = true
		}
		desiredDivisions := make(map[string]bool)
		for _, did := range divisionIDs {
			desiredDivisions[did] = true
		}

		// Build indices of existing active assignments, grouped by key.
		existingCompanies := make(map[string][]int)
		existingEstates := make(map[string][]int)
		existingDivisions := make(map[string][]int)

		for i, a := range user.Assignments {
			if a.IsActive {
				if a.EstateID != nil {
					existingEstates[*a.EstateID] = append(existingEstates[*a.EstateID], i)
				} else if a.DivisionID != nil {
					existingDivisions[*a.DivisionID] = append(existingDivisions[*a.DivisionID], i)
				} else {
					existingCompanies[a.CompanyID] = append(existingCompanies[a.CompanyID], i)
				}
			}
		}

		now := time.Now()
		deactivate := func(idx int) {
			user.Assignments[idx].IsActive = false
			user.Assignments[idx].UpdatedAt = now
		}
		updateExisting := func(idx int, assignedBy string) {
			user.Assignments[idx].AssignedBy = assignedBy
			user.Assignments[idx].IsActive = true
			user.Assignments[idx].UpdatedAt = now
		}

		// Deactivate company assignments not in desired set.
		for companyID, indexes := range existingCompanies {
			if !desiredCompanies[companyID] {
				for _, idx := range indexes {
					deactivate(idx)
				}
			}
		}

		// Deactivate estate assignments not in desired set.
		for estateID, indexes := range existingEstates {
			if !desiredEstates[estateID] {
				for _, idx := range indexes {
					deactivate(idx)
				}
			}
		}

		// Deactivate division assignments not in desired set.
		for divisionID, indexes := range existingDivisions {
			if !desiredDivisions[divisionID] {
				for _, idx := range indexes {
					deactivate(idx)
				}
			}
		}

		// Extract current user ID for AssignedBy from context
		var performerID string
		if val := ctx.Value("user_id"); val != nil {
			performerID = val.(string)
		}
		if performerID == "" {
			performerID = "00000000-0000-0000-0000-000000000000" // Fallback to system
		}

		primaryCompanyID := companyIDs[0]

		// Add/update company-only assignments and collapse duplicates to single active row.
		for _, companyID := range companyIDs {
			if indexes, exists := existingCompanies[companyID]; exists && len(indexes) > 0 {
				updateExisting(indexes[0], performerID)
				for _, dupIdx := range indexes[1:] {
					deactivate(dupIdx)
				}
			} else {
				newAssignment := domain.Assignment{
					ID:         generateID(),
					UserID:     user.ID,
					CompanyID:  companyID,
					AssignedBy: performerID,
					IsActive:   true,
					CreatedAt:  now,
					UpdatedAt:  now,
				}
				user.Assignments = append(user.Assignments, newAssignment)
			}
		}

		// Add/update estate assignments (not cross-product with companies).
		for _, estateID := range estateIDs {
			if indexes, exists := existingEstates[estateID]; exists && len(indexes) > 0 {
				updateExisting(indexes[0], performerID)
				for _, dupIdx := range indexes[1:] {
					deactivate(dupIdx)
				}
			} else {
				eID := estateID
				newAssignment := domain.Assignment{
					ID:         generateID(),
					UserID:     user.ID,
					CompanyID:  primaryCompanyID,
					EstateID:   &eID,
					AssignedBy: performerID,
					IsActive:   true,
					CreatedAt:  now,
					UpdatedAt:  now,
				}
				user.Assignments = append(user.Assignments, newAssignment)
			}
		}

		// Add/update division assignments (not cross-product with companies).
		for _, divisionID := range divisionIDs {
			if indexes, exists := existingDivisions[divisionID]; exists && len(indexes) > 0 {
				updateExisting(indexes[0], performerID)
				for _, dupIdx := range indexes[1:] {
					deactivate(dupIdx)
				}
			} else {
				dID := divisionID
				newAssignment := domain.Assignment{
					ID:         generateID(),
					UserID:     user.ID,
					CompanyID:  primaryCompanyID,
					DivisionID: &dID,
					AssignedBy: performerID,
					IsActive:   true,
					CreatedAt:  now,
					UpdatedAt:  now,
				}
				user.Assignments = append(user.Assignments, newAssignment)
			}
		}
	}

	// Set transient fields for immediate response
	user.Name = input.Name
	user.Phone = input.Phone

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

// DeleteUser deletes a user
func (s *UserManagementService) DeleteUser(ctx context.Context, id string) error {
	if s.isCompanyAdminRequester(ctx) {
		targetUser, err := s.userRepo.FindByID(ctx, id)
		if err != nil {
			return err
		}
		if targetUser == nil {
			return errors.New("user not found")
		}
		if err := s.ensureCompanyAdminTargetAccess(ctx, targetUser); err != nil {
			return err
		}
	}

	return s.userRepo.Delete(ctx, id)
}

// ResetPassword resets user password (admin)
func (s *UserManagementService) ResetPassword(ctx context.Context, id string, newPassword string) error {
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	if err := s.ensureCompanyAdminTargetAccess(ctx, user); err != nil {
		return err
	}

	hashedPassword, err := s.passwordSvc.HashPassword(newPassword)
	if err != nil {
		return err
	}

	user.Password = hashedPassword
	user.UpdatedAt = time.Now()

	if err := s.userRepo.Update(ctx, user); err != nil {
		return err
	}

	s.securityLogger.LogSecurityEvent(ctx, &domain.SecurityEvent{
		UserID:   &id,
		Event:    domain.EventPasswordChange,
		Details:  map[string]interface{}{"action": "admin_reset"},
		Severity: domain.SeverityInfo,
	})

	return nil
}

func (s *UserManagementService) ToggleStatus(ctx context.Context, id string) (*domain.User, error) {
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	if err := s.ensureCompanyAdminTargetAccess(ctx, user); err != nil {
		return nil, err
	}

	user.IsActive = !user.IsActive
	user.UpdatedAt = time.Now()

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserManagementService) requesterRole(ctx context.Context) domain.Role {
	roleVal := ctx.Value("user_role")
	if roleVal == nil {
		return ""
	}
	return domain.Role(strings.ToUpper(strings.TrimSpace(fmt.Sprintf("%v", roleVal))))
}

func (s *UserManagementService) requesterCompanyID(ctx context.Context) string {
	companyVal := ctx.Value("company_id")
	if companyVal == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprintf("%v", companyVal))
}

func (s *UserManagementService) requesterUserID(ctx context.Context) string {
	userVal := ctx.Value("user_id")
	if userVal == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprintf("%v", userVal))
}

func (s *UserManagementService) isCompanyAdminRequester(ctx context.Context) bool {
	return s.requesterRole(ctx) == domain.RoleCompanyAdmin
}

func (s *UserManagementService) isManageableByCompanyAdmin(role domain.Role) bool {
	_, ok := companyAdminManageableRoles[role]
	return ok
}

func (s *UserManagementService) userInCompany(user *domain.User, companyID string) bool {
	for _, assignment := range user.Assignments {
		if assignment.IsActive && assignment.CompanyID == companyID {
			return true
		}
	}
	return false
}

func (s *UserManagementService) ensureCompanyAdminTargetAccess(ctx context.Context, targetUser *domain.User) error {
	if !s.isCompanyAdminRequester(ctx) {
		return nil
	}

	// Company admin must be able to update their own profile.
	requesterID := s.requesterUserID(ctx)
	if requesterID != "" && targetUser != nil && targetUser.ID == requesterID {
		return nil
	}

	requesterCompanyID := s.requesterCompanyID(ctx)
	if requesterCompanyID == "" {
		return errors.New("company context is required")
	}

	if !s.userInCompany(targetUser, requesterCompanyID) {
		return errors.New("access denied: target user is outside your company scope")
	}

	if !s.isManageableByCompanyAdmin(targetUser.Role) {
		return errors.New("access denied: company admin can only manage MANAGER and below roles")
	}

	return nil
}

func uniqueNonEmptyStrings(values []string) []string {
	if len(values) == 0 {
		return values
	}

	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))

	for _, value := range values {
		v := strings.TrimSpace(value)
		if v == "" {
			continue
		}
		if _, exists := seen[v]; exists {
			continue
		}
		seen[v] = struct{}{}
		result = append(result, v)
	}

	return result
}

func extractActiveAssignmentIDs(assignments []domain.Assignment) ([]string, []string, []string) {
	companyIDs := make([]string, 0, len(assignments))
	estateIDs := make([]string, 0)
	divisionIDs := make([]string, 0)

	for _, assignment := range assignments {
		if !assignment.IsActive {
			continue
		}

		if assignment.CompanyID != "" {
			companyIDs = append(companyIDs, assignment.CompanyID)
		}

		if assignment.EstateID != nil {
			estateIDs = append(estateIDs, *assignment.EstateID)
		}

		if assignment.DivisionID != nil {
			divisionIDs = append(divisionIDs, *assignment.DivisionID)
		}
	}

	return uniqueNonEmptyStrings(companyIDs), uniqueNonEmptyStrings(estateIDs), uniqueNonEmptyStrings(divisionIDs)
}

func validateRoleAssignmentRequirements(role domain.Role, companyIDs, estateIDs, divisionIDs []string) error {
	if role == domain.RoleManager {
		if len(companyIDs) != 1 {
			return fmt.Errorf("%s wajib tepat 1 COMPANY", role)
		}

		if len(estateIDs) < 1 {
			return fmt.Errorf("%s wajib minimal 1 ESTATE", role)
		}
	}

	if role == domain.RoleAreaManager {
		if len(companyIDs) < 1 {
			return fmt.Errorf("%s wajib minimal 1 COMPANY", role)
		}
	}

	if _, required := rolesRequiringCompany[role]; required && len(companyIDs) == 0 {
		return fmt.Errorf("%s wajib ada COMPANY", role)
	}

	if _, required := rolesRequiringEstate[role]; required && len(estateIDs) == 0 {
		return fmt.Errorf("%s wajib ada ESTATE", role)
	}

	if _, required := rolesRequiringDivision[role]; required && len(divisionIDs) == 0 {
		return fmt.Errorf("%s wajib ada DIVISI", role)
	}

	return nil
}

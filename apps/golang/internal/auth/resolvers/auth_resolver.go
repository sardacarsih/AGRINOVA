package resolvers

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	// Features modules (Clean Architecture)
	// Features modules (Clean Architecture)
	mobileGraphQL "agrinovagraphql/server/internal/auth/features/mobile/interfaces/graphql"
	sharedApp "agrinovagraphql/server/internal/auth/features/shared/application"
	sharedDomain "agrinovagraphql/server/internal/auth/features/shared/domain"
	webApp "agrinovagraphql/server/internal/auth/features/web/application"
	webGraphQL "agrinovagraphql/server/internal/auth/features/web/interfaces/graphql"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/internal/middleware"
)

// AuthResolver handles authentication GraphQL operations
// Supports both new features modules (Clean Architecture) and legacy services during migration
type AuthResolver struct {
	// New Clean Architecture features modules
	webResolver    *webGraphQL.Resolver
	mobileResolver *mobileGraphQL.Resolver

	// Service Integrations
	sharedAuthService     *sharedApp.SharedAuthService
	userManagementService *webApp.UserManagementService
}

// NewAuthResolver creates a new auth resolver with optional features resolvers
// NewAuthResolver creates a new auth resolver with optional features resolvers
func NewAuthResolver() *AuthResolver {
	return &AuthResolver{}
}

// SetSharedAuthService sets shared auth service
func (r *AuthResolver) SetSharedAuthService(s *sharedApp.SharedAuthService) {
	r.sharedAuthService = s
}

// SetUserManagementService sets user management service
func (r *AuthResolver) SetUserManagementService(s *webApp.UserManagementService) {
	r.userManagementService = s
}

// SetWebResolver sets the web features resolver (for dependency injection)
func (r *AuthResolver) SetWebResolver(resolver *webGraphQL.Resolver) {
	r.webResolver = resolver
}

// SetMobileResolver sets the mobile features resolver (for dependency injection)
func (r *AuthResolver) SetMobileResolver(resolver *mobileGraphQL.Resolver) {
	r.mobileResolver = resolver
}

// WebLogin handles web authentication with cookie-based session management
func (r *AuthResolver) WebLogin(ctx context.Context, input auth.WebLoginInput) (*auth.WebLoginPayload, error) {
	// Use new features resolver if available
	if r.webResolver != nil {
		return r.webResolver.WebLogin(ctx, input)
	}
	// Fallback error
	return nil, fmt.Errorf("web authentication service not initialized")
}

// MobileLogin handles simplified mobile authentication with auto role detection
func (r *AuthResolver) MobileLogin(ctx context.Context, input auth.MobileLoginInput) (*auth.AuthPayload, error) {
	// Use new features resolver if available
	if r.mobileResolver != nil {
		return r.mobileResolver.MobileLogin(ctx, input)
	}
	// Fallback to error if not available (legacy AuthService removed)
	return nil, fmt.Errorf("mobile authentication service not initialized")
}

// RefreshToken handles token refresh using standard AuthPayload
func (r *AuthResolver) RefreshToken(ctx context.Context, input auth.RefreshTokenInput) (*auth.AuthPayload, error) {
	// Use new features resolver if available
	if r.mobileResolver != nil {
		return r.mobileResolver.RefreshToken(ctx, input)
	}
	// Fallback to error
	return nil, fmt.Errorf("mobile authentication service not initialized")
}

// DeviceRenew handles token renewal via offline/session token
func (r *AuthResolver) DeviceRenew(ctx context.Context, input auth.DeviceRenewInput) (*auth.AuthPayload, error) {
	if r.mobileResolver != nil {
		return r.mobileResolver.DeviceRenew(ctx, input)
	}
	return nil, fmt.Errorf("mobile authentication service not initialized")
}

// Logout handles user logout
func (r *AuthResolver) Logout(ctx context.Context) (bool, error) {
	// 1. Check for Web Session (via Cookie)
	// We check if the request has the session cookie using middleware helper or direct check
	// Note: We need to access the request cookies. The WebResolver.WebLogout does this.
	// But how do we *know* if it's a web request without trying?
	// We can check if "http" context has the cookie.

	isWeb := false
	httpCtx := ctx.Value("http")
	if httpCtx != nil {
		if httpContext, ok := httpCtx.(map[string]interface{}); ok {
			if req, ok := httpContext["request"].(*http.Request); ok {
				// Check for session_id cookie
				if _, err := req.Cookie("session_id"); err == nil {
					isWeb = true
				}
			}
		}
	}

	if isWeb && r.webResolver != nil {
		return r.webResolver.WebLogout(ctx)
	}

	// 2. Check for Mobile Auth (via Bearer Token)
	token := ctx.Value("auth_token")
	if token != nil {
		// We need deviceID for mobile logout.
		// It should have been extracted by middleware from JWT claims.
		deviceIDValue := ctx.Value("device_id")

		// Check if deviceID is present and not empty
		if r.mobileResolver != nil && deviceIDValue != nil {
			deviceID, ok := deviceIDValue.(string)
			if ok && deviceID != "" {
				return r.mobileResolver.MobileLogout(ctx, deviceID)
			}
		}

		// If deviceID is missing from context but we have a valid auth token,
		// we should still clear local session state and return success.
		// This handles edge cases where the token was generated without deviceID
		// or the device was already unbound.
		return true, nil
	}

	return false, fmt.Errorf("no active session found")
}

// LogoutAllDevices handles logout from all devices
func (r *AuthResolver) LogoutAllDevices(ctx context.Context) (bool, error) {
	// Extract user ID using middleware helper
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return false, fmt.Errorf("authentication required")
	}
	if r.sharedAuthService == nil {
		return false, fmt.Errorf("shared auth service not unavailable")
	}
	err := r.sharedAuthService.LogoutAllDevices(ctx, userID)
	return err == nil, err
}

// ChangePassword handles password change
func (r *AuthResolver) ChangePassword(ctx context.Context, input auth.ChangePasswordInput) (bool, error) {
	// Extract user ID using middleware helper
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return false, fmt.Errorf("authentication required")
	}

	// Users can always change their own password
	// Note: RBAC validation is not needed for self-service password changes

	if r.sharedAuthService == nil {
		return false, fmt.Errorf("shared auth service unavailable")
	}
	err := r.sharedAuthService.ChangePassword(ctx, userID, input.CurrentPassword, input.NewPassword)
	return err == nil, err
}

// BindDevice handles device binding
func (r *AuthResolver) BindDevice(ctx context.Context, input auth.DeviceBindInput) (*auth.DeviceResponse, error) {
	// Extract user ID from context
	userID := ctx.Value("user_id")
	if userID == nil {
		return nil, fmt.Errorf("authentication required")
	}
	// BindDevice is currently handled by Mobile Login flow mostly.
	// Implementing explicit Bind if needed via SharedAuthService or MobileService
	// For now, return error as legacy is removed
	return nil, fmt.Errorf("device binding should be done via login or mobile service")
}

// UnbindDevice handles device unbinding
func (r *AuthResolver) UnbindDevice(ctx context.Context, deviceID string) (bool, error) {
	// Extract user ID from context
	userID := ctx.Value("user_id")
	if userID == nil {
		return false, fmt.Errorf("authentication required")
	}
	// Unbind via MobileService if available, or Shared if we move it there
	// Currently Unbind is in MobileService
	if r.mobileResolver != nil {
		success, err := r.mobileResolver.MobileLogout(ctx, deviceID) // MobileLogout effectively unbinds/revokes
		return success, err
	}
	return false, fmt.Errorf("mobile service unavailable")
}

// Me returns current authenticated user
func (r *AuthResolver) Me(ctx context.Context) (*auth.User, error) {
	// Try web authentication first (via new WebResolver)
	if r.webResolver != nil {
		user, err := r.webResolver.Me(ctx)
		if err == nil {
			return user, nil
		}
	}

	// Fall back to JWT authentication using middleware helper
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}
	if r.userManagementService == nil {
		return nil, fmt.Errorf("user service unavailable")
	}
	user, err := r.userManagementService.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return r.toGraphQLUser(user), nil
}

// CurrentUser returns current user with full company context
func (r *AuthResolver) CurrentUser(ctx context.Context) (*auth.WebLoginPayload, error) {
	if r.webResolver != nil {
		return r.webResolver.CurrentUser(ctx)
	}
	return nil, fmt.Errorf("web auth service unavailable")
}

// MyDevices returns current user's devices
func (r *AuthResolver) MyDevices(ctx context.Context) ([]*auth.Device, error) {
	// Extract user ID using middleware helper
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}
	if r.sharedAuthService == nil {
		return nil, fmt.Errorf("shared auth service unavailable")
	}
	devices, err := r.sharedAuthService.GetMyDevices(ctx, userID)
	if err != nil {
		return nil, err
	}

	var gqlDevices []*auth.Device
	for _, d := range devices {
		gqlDevices = append(gqlDevices, r.toGraphQLDevice(d))
	}
	return gqlDevices, nil
}

// UpdateUser updates an existing user
func (r *AuthResolver) UpdateUser(ctx context.Context, input auth.UpdateUserInput) (*auth.User, error) {
	if r.userManagementService == nil {
		return nil, fmt.Errorf("user service unavailable")
	}

	requesterID := middleware.GetCurrentUserID(ctx)
	if requesterID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	requesterRole := middleware.GetUserRoleFromContext(ctx)
	isSuperAdmin := requesterRole == auth.UserRoleSuperAdmin
	isCompanyAdminManagingOther := requesterRole == auth.UserRoleCompanyAdmin && input.ID != requesterID

	// Only super admin and company admin (when managing other users) can bypass self-update restrictions.
	// Everyone else, including company admin updating their own account, can only edit basic profile fields.
	if !isSuperAdmin && !isCompanyAdminManagingOther {
		if input.ID != requesterID {
			return nil, fmt.Errorf("access denied: can only update your own profile")
		}

		if input.Role != nil ||
			input.IsActive != nil ||
			input.Username != nil ||
			input.ManagerID != nil ||
			len(input.CompanyIDs) > 0 ||
			len(input.EstateIDs) > 0 ||
			len(input.DivisionIDs) > 0 {
			return nil, fmt.Errorf("access denied: only name, email, phone number, and avatar can be updated")
		}
	}

	existingUser, err := r.userManagementService.GetUserByID(ctx, input.ID)
	if err != nil {
		return nil, err
	}
	if existingUser == nil {
		return nil, fmt.Errorf("user not found")
	}

	username := existingUser.Username
	if input.Username != nil {
		username = *input.Username
	}

	name := existingUser.Name
	if input.Name != nil {
		name = *input.Name
	}

	email := existingUser.Email
	if input.Email != nil {
		email = input.Email
	}

	phone := existingUser.Phone
	if input.PhoneNumber != nil {
		phone = input.PhoneNumber
	}

	avatar := existingUser.Avatar
	if input.Avatar != nil {
		if strings.TrimSpace(*input.Avatar) == "" {
			avatar = nil
		} else {
			avatar = input.Avatar
		}
	}

	role := existingUser.Role
	if input.Role != nil {
		role = sharedDomain.Role(*input.Role)
	}

	isActive := existingUser.IsActive
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	managerID := existingUser.ManagerID
	if input.ManagerID != nil {
		managerID = input.ManagerID
	}

	userDTO := sharedDomain.UserDTO{
		ID:          input.ID,
		Username:    username,
		Name:        name,
		Email:       email,
		Phone:       phone,
		Avatar:      avatar,
		Role:        role,
		IsActive:    isActive,
		CompanyIDs:  input.CompanyIDs,
		EstateIDs:   input.EstateIDs,
		DivisionIDs: input.DivisionIDs,
		ManagerID:   managerID,
	}
	user, err := r.userManagementService.UpdateUser(ctx, userDTO)
	if err != nil {
		return nil, err
	}
	return r.toGraphQLUser(user), nil
}

// DeleteUser deletes a user
func (r *AuthResolver) DeleteUser(ctx context.Context, id string) (bool, error) {
	if r.userManagementService == nil {
		return false, fmt.Errorf("user service unavailable")
	}
	err := r.userManagementService.DeleteUser(ctx, id)
	return err == nil, err
}

// ResetUserPassword resets a user's password (admin only)
func (r *AuthResolver) ResetUserPassword(ctx context.Context, input auth.ResetPasswordInput) (bool, error) {
	if r.userManagementService == nil {
		return false, fmt.Errorf("user service unavailable")
	}
	err := r.userManagementService.ResetPassword(ctx, input.UserID, input.NewPassword)
	return err == nil, err
}

// ToggleUserStatus toggles a user's active status
func (r *AuthResolver) ToggleUserStatus(ctx context.Context, id string) (*auth.User, error) {
	if r.userManagementService == nil {
		return nil, fmt.Errorf("user service unavailable")
	}
	user, err := r.userManagementService.ToggleStatus(ctx, id)
	if err != nil {
		return nil, err
	}
	return r.toGraphQLUser(user), nil
}

// GetUsers returns all users with filtering
func (r *AuthResolver) GetUsers(ctx context.Context, companyID *string, role *auth.UserRole, isActive *bool, search *string, limit *int32, offset *int32) ([]*auth.User, int64, error) {
	if r.userManagementService == nil {
		return nil, 0, fmt.Errorf("user service unavailable")
	}

	var domainRole *sharedDomain.Role
	if role != nil {
		r := sharedDomain.Role(*role)
		domainRole = &r
	}

	filters := sharedDomain.UserFilters{
		CompanyID: companyID,
		Role:      domainRole,
		IsActive:  isActive,
		Search:    search,
		Limit:     int(intValue(limit)),
		Offset:    int(intValue(offset)),
	}

	users, count, err := r.userManagementService.GetUsers(ctx, filters)
	if err != nil {
		return nil, 0, err
	}

	var gqlUsers []*auth.User
	for _, u := range users {
		gqlUsers = append(gqlUsers, r.toGraphQLUser(u))
	}
	return gqlUsers, count, nil
}

// GetUserByID returns a specific user by ID
func (r *AuthResolver) GetUserByID(ctx context.Context, id string) (*auth.User, error) {
	if r.userManagementService == nil {
		return nil, fmt.Errorf("user service unavailable")
	}
	user, err := r.userManagementService.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return r.toGraphQLUser(user), nil
}

// GetUsersByCompany returns users filtered by company
func (r *AuthResolver) GetUsersByCompany(ctx context.Context, companyID string) ([]*auth.User, error) {
	if r.userManagementService == nil {
		return nil, fmt.Errorf("user service unavailable")
	}
	filters := sharedDomain.UserFilters{CompanyID: &companyID}
	users, _, err := r.userManagementService.GetUsers(ctx, filters)
	if err != nil {
		return nil, err
	}
	var gqlUsers []*auth.User
	for _, u := range users {
		gqlUsers = append(gqlUsers, r.toGraphQLUser(u))
	}
	return gqlUsers, nil
}

// GetUsersByRole returns users filtered by role
func (r *AuthResolver) GetUsersByRole(ctx context.Context, role auth.UserRole) ([]*auth.User, error) {
	if r.userManagementService == nil {
		return nil, fmt.Errorf("user service unavailable")
	}
	domainRole := sharedDomain.Role(role)
	filters := sharedDomain.UserFilters{Role: &domainRole}
	users, _, err := r.userManagementService.GetUsers(ctx, filters)
	if err != nil {
		return nil, err
	}
	var gqlUsers []*auth.User
	for _, u := range users {
		gqlUsers = append(gqlUsers, r.toGraphQLUser(u))
	}
	return gqlUsers, nil
}

// CreateUser creates a new user (delegates to authService)
func (r *AuthResolver) CreateUser(ctx context.Context, input auth.CreateUserInput) (*auth.User, error) {
	if r.userManagementService == nil {
		return nil, fmt.Errorf("user service unavailable")
	}

	var isActive bool
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	// Use first CompanyID for backward compat, pass all via CompanyIDs
	var primaryCompanyID string
	if len(input.CompanyIDs) > 0 {
		primaryCompanyID = input.CompanyIDs[0]
	}

	dto := sharedDomain.UserDTO{
		Username:    input.Username,
		Name:        input.Name,
		Email:       input.Email,
		Phone:       input.PhoneNumber,
		Role:        sharedDomain.Role(input.Role),
		IsActive:    isActive,
		CompanyID:   primaryCompanyID,
		CompanyIDs:  input.CompanyIDs,
		EstateIDs:   input.EstateIDs,
		DivisionIDs: input.DivisionIDs,
		ManagerID:   input.ManagerID,
	}

	user, err := r.userManagementService.CreateUser(ctx, dto, input.Password)
	if err != nil {
		return nil, err
	}
	return r.toGraphQLUser(user), nil
}

// Helpers

func (r *AuthResolver) toGraphQLUser(u *sharedDomain.User) *auth.User {
	if u == nil {
		return nil
	}

	user := &auth.User{
		ID:          u.ID,
		Username:    u.Username,
		Name:        u.Name,
		Email:       u.Email,
		PhoneNumber: u.Phone,
		Avatar:      u.Avatar,
		Role:        auth.UserRole(u.Role),
		IsActive:    u.IsActive,
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
		ManagerID:   u.ManagerID,
		Manager:     r.toGraphQLUser(u.Manager),
	}

	// Map company assignments so Company/CompanyID resolvers can resolve company info
	if len(u.Assignments) > 0 {
		var assignments []auth.UserCompanyAssignment
		for _, assignment := range u.Assignments {
			// Only map company-level assignments (estate/division handled separately)
			if assignment.EstateID != nil || assignment.DivisionID != nil {
				continue
			}

			companyAssignment := auth.UserCompanyAssignment{
				ID:        assignment.ID,
				UserID:    assignment.UserID,
				CompanyID: assignment.CompanyID,
				IsActive:  assignment.IsActive,
				CreatedAt: assignment.CreatedAt,
				UpdatedAt: assignment.UpdatedAt,
			}

			if assignment.AssignedBy != "" {
				assignedBy := assignment.AssignedBy
				companyAssignment.AssignedBy = &assignedBy
			}

			// Use CreatedAt as AssignedAt if no explicit field exists in domain model
			companyAssignment.AssignedAt = assignment.CreatedAt

			if assignment.Company != nil {
				companyAssignment.Company = &master.Company{
					ID:      assignment.Company.ID,
					Name:    assignment.Company.Name,
					Address: assignment.Company.Address,
					Phone:   assignment.Company.Phone,
				}
			}

			assignments = append(assignments, companyAssignment)
		}
		user.Assignments = assignments
	}

	// Populate CompanyID, Estates, and Divisions from active assignments
	if len(u.Assignments) > 0 {
		seenEstateIDs := make(map[string]bool)
		seenDivisionIDs := make(map[string]bool)

		for _, assignment := range u.Assignments {
			if !assignment.IsActive {
				continue
			}

			// populate estates
			if assignment.Estate != nil {
				if seenEstateIDs[assignment.Estate.ID] {
					continue
				}
				seenEstateIDs[assignment.Estate.ID] = true

				estate := &master.Estate{
					ID:        assignment.Estate.ID,
					CompanyID: assignment.Estate.CompanyID,
					Name:      assignment.Estate.Name,
				}
				user.Estates = append(user.Estates, estate)
			}

			// populate divisions
			if assignment.Division != nil {
				if seenDivisionIDs[assignment.Division.ID] {
					continue
				}
				seenDivisionIDs[assignment.Division.ID] = true

				division := &master.Division{
					ID:       assignment.Division.ID,
					Name:     assignment.Division.Name,
					Code:     stringValue(assignment.Division.Code),
					EstateID: stringValue(assignment.Division.EstateID),
				}
				user.Divisions = append(user.Divisions, division)
			}
		}
	}

	return user
}

func (r *AuthResolver) toGraphQLDevice(d *sharedDomain.DeviceBinding) *auth.Device {
	if d == nil {
		return nil
	}

	trustLevel := "unknown"
	if d.IsTrusted {
		trustLevel = "trusted"
	} else if d.IsAuthorized {
		trustLevel = "authorized"
	}

	return &auth.Device{
		ID:                d.ID,
		DeviceID:          d.DeviceID,
		DeviceFingerprint: d.DeviceFingerprint,
		Platform:          auth.PlatformType(d.Platform),
		DeviceInfo: &auth.DeviceInfo{
			Model:      d.DeviceInfo.Model,
			OsVersion:  d.DeviceInfo.OSVersion,
			AppVersion: d.DeviceInfo.AppVersion,
			DeviceName: &d.DeviceInfo.DeviceName,
		},
		TrustLevel:   trustLevel,
		IsTrusted:    d.IsTrusted,
		IsAuthorized: d.IsAuthorized,
		LastSeenAt:   d.LastSeenAt,
		CreatedAt:    d.CreatedAt,
		UpdatedAt:    d.UpdatedAt,
	}
}

func stringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func boolValue(b *bool) bool {
	if b == nil {
		return false
	}
	return *b
}

func intValue(i *int32) int {
	if i == nil {
		return 0
	}
	return int(*i)
}

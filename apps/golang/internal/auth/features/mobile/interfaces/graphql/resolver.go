package graphql

import (
	"context"
	"errors"
	"time"

	mobile "agrinovagraphql/server/internal/auth/features/mobile/application"
	mobileDomain "agrinovagraphql/server/internal/auth/features/mobile/domain"
	sharedDomain "agrinovagraphql/server/internal/auth/features/shared/domain"
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/master"

	"github.com/vektah/gqlparser/v2/gqlerror"
)

// =============================================================================
// Type Conversion Helpers
// =============================================================================

// ptrString converts *string to string (empty string if nil)
func ptrString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// strPtr converts string to *string
func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// timePtr converts time.Time to *time.Time
func timePtr(t time.Time) *time.Time {
	if t.IsZero() {
		return nil
	}
	return &t
}

// =============================================================================
// Resolver Implementation
// =============================================================================

// Resolver implements GraphQL resolvers for mobile authentication
type Resolver struct {
	mobileAuthService mobileDomain.MobileAuthService
}

// NewResolver creates new mobile authentication GraphQL resolver
func NewResolver(mobileAuthService mobileDomain.MobileAuthService) *Resolver {
	return &Resolver{
		mobileAuthService: mobileAuthService,
	}
}

// MobileLogin handles mobile login mutation
func (r *Resolver) MobileLogin(ctx context.Context, input auth.MobileLoginInput) (*auth.AuthPayload, error) {
	// Convert GraphQL input to domain input
	// Note: MobileLoginInput doesn't have DeviceInfo in GraphQL schema
	mobileLoginInput := mobileDomain.MobileLoginInput{
		Identifier:        input.Identifier,
		Password:          input.Password,
		Platform:          sharedDomain.PlatformType(input.Platform),
		DeviceID:          ptrString(input.DeviceID),
		DeviceFingerprint: ptrString(input.DeviceFingerprint),
		DeviceInfo:        nil, // DeviceInfo not in GraphQL MobileLoginInput
		BiometricToken:    nil, // BiometricToken not in GraphQL MobileLoginInput
	}

	// Call mobile auth service
	result, err := r.mobileAuthService.Login(ctx, mobileLoginInput)
	if err != nil {
		return nil, mapMobileAuthError(err)
	}

	// Convert domain result to GraphQL payload
	return &auth.AuthPayload{
		AccessToken:      result.AccessToken,
		RefreshToken:     result.RefreshToken,
		OfflineToken:     strPtr(result.OfflineToken),
		TokenType:        "Bearer",
		ExpiresIn:        int32(time.Until(result.ExpiresAt).Seconds()),
		ExpiresAt:        result.ExpiresAt,
		RefreshExpiresAt: timePtr(result.RefreshExpiresAt),
		OfflineExpiresAt: timePtr(result.OfflineExpiresAt),
		User:             mapUserToGraphQL(result.User),
		Assignments:      mapAssignmentsToUserAssignments(result.Assignments),
	}, nil
}

// MobileLogout handles mobile logout mutation
func (r *Resolver) MobileLogout(ctx context.Context, deviceID string) (bool, error) {
	if deviceID == "" {
		return false, ErrMissingDeviceID
	}

	if err := r.mobileAuthService.Logout(ctx, deviceID); err != nil {
		return false, err
	}

	return true, nil
}

// RefreshToken handles token refresh mutation
func (r *Resolver) RefreshToken(ctx context.Context, input auth.RefreshTokenInput) (*auth.AuthPayload, error) {
	if input.RefreshToken == "" {
		return nil, ErrMissingRefreshToken
	}

	refreshInput := mobileDomain.RefreshTokenInput{
		RefreshToken:      input.RefreshToken,
		DeviceID:          input.DeviceID,
		DeviceFingerprint: input.DeviceFingerprint,
	}

	result, err := r.mobileAuthService.RefreshToken(ctx, refreshInput)
	if err != nil {
		return nil, &gqlerror.Error{
			Message: mapMobileAuthError(err).Error(),
			Extensions: map[string]interface{}{
				"code":      "REFRESH_EXPIRED",
				"retryable": true,
			},
		}
	}

	return &auth.AuthPayload{
		AccessToken:      result.AccessToken,
		RefreshToken:     result.RefreshToken,
		TokenType:        "Bearer",
		ExpiresIn:        int32(time.Until(result.ExpiresAt).Seconds()),
		ExpiresAt:        result.ExpiresAt,
		RefreshExpiresAt: timePtr(result.RefreshExpiresAt),
		User:             mapUserToGraphQL(result.User),
		Assignments:      mapAssignmentsToUserAssignments(result.Assignments),
	}, nil
}

// DeviceRenew handles token renewal using an offline/session token
func (r *Resolver) DeviceRenew(ctx context.Context, input auth.DeviceRenewInput) (*auth.AuthPayload, error) {
	if input.OfflineToken == "" {
		return nil, ErrMissingOfflineToken
	}

	renewInput := mobileDomain.DeviceRenewInput{
		OfflineToken:      input.OfflineToken,
		DeviceID:          input.DeviceID,
		DeviceFingerprint: input.DeviceFingerprint,
	}

	result, err := r.mobileAuthService.DeviceRenew(ctx, renewInput)
	if err != nil {
		return nil, &gqlerror.Error{
			Message: mapMobileAuthError(err).Error(),
			Extensions: map[string]interface{}{
				"code":      "SESSION_EXPIRED",
				"retryable": false,
			},
		}
	}

	return &auth.AuthPayload{
		AccessToken:      result.AccessToken,
		RefreshToken:     result.RefreshToken,
		TokenType:        "Bearer",
		ExpiresIn:        int32(time.Until(result.ExpiresAt).Seconds()),
		ExpiresAt:        result.ExpiresAt,
		RefreshExpiresAt: timePtr(result.RefreshExpiresAt),
		User:             mapUserToGraphQL(result.User),
		Assignments:      mapAssignmentsToUserAssignments(result.Assignments),
	}, nil
}

// ValidateOfflineAccess handles offline access validation query
func (r *Resolver) ValidateOfflineAccess(ctx context.Context, offlineToken string) (*auth.User, error) {
	if offlineToken == "" {
		return nil, ErrMissingOfflineToken
	}

	user, err := r.mobileAuthService.ValidateOfflineAccess(ctx, offlineToken)
	if err != nil {
		return nil, mapMobileAuthError(err)
	}

	return mapUserToGraphQL(sharedDomain.ToUserDTO(user)), nil
}

// UnbindDevice handles device unbinding mutation
func (r *Resolver) UnbindDevice(ctx context.Context, deviceID string) (bool, error) {
	if deviceID == "" {
		return false, ErrMissingDeviceID
	}

	if err := r.mobileAuthService.UnbindDevice(ctx, deviceID); err != nil {
		return false, err
	}

	return true, nil
}

// =============================================================================
// Error Mapping
// =============================================================================

func mapMobileAuthError(err error) error {
	switch err {
	case mobile.ErrInvalidCredentials:
		return errors.New("invalid username or password")
	case mobile.ErrInvalidToken:
		return errors.New("invalid or expired token")
	case mobile.ErrUserNotFound:
		return errors.New("user not found")
	case mobile.ErrDeviceNotFound:
		return errors.New("device not found")
	case mobile.ErrDeviceNotAuthorized:
		return errors.New("device not authorized")
	case mobile.ErrDeviceAlreadyBound:
		return errors.New("device already bound to user")
	case mobile.ErrDeviceFingerprintMismatch:
		return errors.New("device fingerprint mismatch")
	case mobile.ErrNoCompany:
		return errors.New("akun tidak terafiliasi dengan perusahaan")
	case mobile.ErrNoAssignments:
		return errors.New("akun tidak memiliki penugasan aktif")
	case mobile.ErrMobileAccessDenied:
		return errors.New("role ini tidak diizinkan login via mobile, silahkan gunakan web")
	default:
		return err
	}
}

// =============================================================================
// Type Mapping Functions
// =============================================================================

func mapUserToGraphQL(user sharedDomain.UserDTO) *auth.User {
	gqlUser := &auth.User{
		ID:          user.ID,
		Username:    user.Username,
		Name:        user.Name,
		Email:       user.Email,
		PhoneNumber: user.Phone,
		Avatar:      user.Avatar,
		Role:        auth.UserRole(user.Role),
		IsActive:    user.IsActive,
		ManagerID:   user.ManagerID,
	}

	if user.Manager != nil {
		gqlUser.Manager = mapUserToGraphQL(*user.Manager)
	}

	return gqlUser
}

func mapAssignmentsToUserAssignments(assignments []sharedDomain.AssignmentDTO) *auth.UserAssignments {
	// Always return non-nil UserAssignments (required by GraphQL schema: assignments: UserAssignments!)
	if len(assignments) == 0 {
		return &auth.UserAssignments{
			Companies: []*master.Company{},
			Estates:   []*master.Estate{},
			Divisions: []*master.Division{},
		}
	}

	// Group assignments by type
	var companies []*master.Company
	var estates []*master.Estate
	var divisions []*master.Division

	companyMap := make(map[string]bool)
	estateMap := make(map[string]bool)
	divisionMap := make(map[string]bool)

	for _, assignment := range assignments {
		if assignment.Company != nil && !companyMap[assignment.Company.ID] {
			companies = append(companies, &master.Company{
				ID:     assignment.Company.ID,
				Name:   assignment.Company.Name,
				Status: master.CompanyStatus(assignment.Company.Status),
			})
			companyMap[assignment.Company.ID] = true
		}

		if assignment.Estate != nil && !estateMap[assignment.Estate.ID] {
			estates = append(estates, &master.Estate{
				ID:   assignment.Estate.ID,
				Name: assignment.Estate.Name,
			})
			estateMap[assignment.Estate.ID] = true
		}

		if assignment.Division != nil && !divisionMap[assignment.Division.ID] {
			var estateIDStr string
			if assignment.Division.EstateID != nil {
				estateIDStr = *assignment.Division.EstateID
			}
			divisions = append(divisions, &master.Division{
				ID:       assignment.Division.ID,
				Name:     assignment.Division.Name,
				EstateID: estateIDStr,
			})
			divisionMap[assignment.Division.ID] = true
		}
	}

	return &auth.UserAssignments{
		Estates:   estates,
		Divisions: divisions,
		Companies: companies,
	}
}

// =============================================================================
// Errors
// =============================================================================

var (
	ErrMissingDeviceID     = errors.New("device ID is required")
	ErrMissingRefreshToken = errors.New("refresh token is required")
	ErrMissingOfflineToken = errors.New("offline token is required")
)

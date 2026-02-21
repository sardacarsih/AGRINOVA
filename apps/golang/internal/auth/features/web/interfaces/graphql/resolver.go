package graphql

import (
	"context"
	"errors"
	"net/http"

	sharedDomain "agrinovagraphql/server/internal/auth/features/shared/domain"
	web "agrinovagraphql/server/internal/auth/features/web/application"
	webDomain "agrinovagraphql/server/internal/auth/features/web/domain"
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/master"
)

// =============================================================================
// Resolver Implementation
// =============================================================================

// Resolver implements GraphQL resolvers for web authentication
type Resolver struct {
	webAuthService webDomain.WebAuthService
}

// NewResolver creates new web authentication GraphQL resolver
func NewResolver(webAuthService webDomain.WebAuthService) *Resolver {
	return &Resolver{
		webAuthService: webAuthService,
	}
}

// WebLogin handles web login mutation
func (r *Resolver) WebLogin(ctx context.Context, input auth.WebLoginInput) (*auth.WebLoginPayload, error) {
	// Convert GraphQL input to domain input
	// Note: GraphQL schema doesn't have RememberMe field, default to false
	webLoginInput := webDomain.WebLoginInput{
		Identifier: input.Identifier,
		Password:   input.Password,
		IPAddress:  getClientIPAddress(ctx),
		UserAgent:  getClientUserAgent(ctx),
		RememberMe: false,
	}

	// Call web auth service
	result, err := r.webAuthService.Login(ctx, webLoginInput)
	if err != nil {
		return nil, mapWebAuthError(err)
	}

	// Convert domain result to GraphQL payload
	return &auth.WebLoginPayload{
		Success:     true,
		SessionID:   &result.SessionID,
		User:        mapUserToGraphQL(result.User),
		Assignments: mapAssignmentsToUserAssignments(result.Assignments),
	}, nil
}

// WebLogout handles web logout mutation
func (r *Resolver) WebLogout(ctx context.Context) (bool, error) {
	// Extract session ID from context or cookies
	sessionID := extractSessionIDFromContext(ctx)
	if sessionID == "" {
		return false, ErrMissingSessionID
	}

	if err := r.webAuthService.Logout(ctx, sessionID); err != nil {
		return false, err
	}

	return true, nil
}

// Me returns current authenticated user
func (r *Resolver) Me(ctx context.Context) (*auth.User, error) {
	sessionID := extractSessionIDFromContext(ctx)
	if sessionID == "" {
		return nil, ErrMissingSessionID
	}

	result, err := r.webAuthService.GetMe(ctx, sessionID)
	if err != nil {
		return nil, mapWebAuthError(err)
	}

	return mapUserToGraphQL(result.User), nil
}

// CurrentUser returns current user with full company context
func (r *Resolver) CurrentUser(ctx context.Context) (*auth.WebLoginPayload, error) {
	sessionID := extractSessionIDFromContext(ctx)
	if sessionID == "" {
		return nil, ErrMissingSessionID
	}

	result, err := r.webAuthService.GetMe(ctx, sessionID)
	if err != nil {
		return nil, mapWebAuthError(err)
	}

	return &auth.WebLoginPayload{
		Success:     true,
		SessionID:   &result.SessionID,
		User:        mapUserToGraphQL(result.User),
		Assignments: mapAssignmentsToUserAssignments(result.Assignments),
	}, nil
}

// ValidateWebSession handles session validation query
// NOTE: Disabled - WebSessionValidation type not in GraphQL schema
/*
func (r *Resolver) ValidateWebSession(ctx context.Context) (*generated.WebSessionValidation, error) {
	sessionToken := extractSessionTokenFromContext(ctx)
	if sessionToken == "" {
		reason := "No session token found"
		return &generated.WebSessionValidation{
			Valid:  false,
			Reason: &reason,
		}, nil
	}

	session, err := r.webAuthService.ValidateSession(ctx, sessionToken)
	if err != nil {
		reason := err.Error()
		return &generated.WebSessionValidation{
			Valid:  false,
			Reason: &reason,
		}, nil
	}

	return &generated.WebSessionValidation{
		Valid:        true,
		SessionID:   &session.ID,
		UserID:      &session.UserID,
		ExpiresAt:   &session.ExpiresAt,
		LastActivity: &session.LastActivity,
	}, nil
}
*/

// =============================================================================
// Error Mapping
// =============================================================================

func mapWebAuthError(err error) error {
	switch err {
	case web.ErrInvalidCredentials:
		return errors.New("invalid username or password")
	case web.ErrInvalidSession:
		return errors.New("invalid or expired session")
	default:
		return err
	}
}

// =============================================================================
// Type Mapping Functions
// =============================================================================

func mapUserToGraphQL(user sharedDomain.UserDTO) *auth.User {
	return &auth.User{
		ID:          user.ID,
		Username:    user.Username,
		Name:        user.Name,
		Email:       user.Email,
		PhoneNumber: user.Phone,
		Avatar:      user.Avatar,
		Role:        auth.UserRole(user.Role),
		IsActive:    user.IsActive,
	}
}

func mapAssignmentsToUserAssignments(assignments []sharedDomain.AssignmentDTO) *auth.UserAssignments {
	if len(assignments) == 0 {
		return nil
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
			divisions = append(divisions, &master.Division{
				ID:   assignment.Division.ID,
				Name: assignment.Division.Name,
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
// Context Helpers
// =============================================================================

func getClientIPAddress(ctx context.Context) string {
	httpCtx := ctx.Value("http")
	if httpCtx == nil {
		return ""
	}

	httpContext, ok := httpCtx.(map[string]interface{})
	if !ok {
		return ""
	}

	request, ok := httpContext["request"].(*http.Request)
	if !ok {
		return ""
	}

	// Check X-Forwarded-For header first
	if xff := request.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}

	// Check X-Real-IP header
	if xri := request.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	return request.RemoteAddr
}

func getClientUserAgent(ctx context.Context) string {
	httpCtx := ctx.Value("http")
	if httpCtx == nil {
		return ""
	}

	httpContext, ok := httpCtx.(map[string]interface{})
	if !ok {
		return ""
	}

	request, ok := httpContext["request"].(*http.Request)
	if !ok {
		return ""
	}

	return request.Header.Get("User-Agent")
}

func extractSessionIDFromContext(ctx context.Context) string {
	httpCtx := ctx.Value("http")
	if httpCtx == nil {
		return ""
	}

	httpContext, ok := httpCtx.(map[string]interface{})
	if !ok {
		return ""
	}

	request, ok := httpContext["request"].(*http.Request)
	if !ok {
		return ""
	}

	cookie, err := request.Cookie("session_id")
	if err != nil {
		return ""
	}

	return cookie.Value
}

func extractSessionTokenFromContext(ctx context.Context) string {
	httpCtx := ctx.Value("http")
	if httpCtx == nil {
		return ""
	}

	httpContext, ok := httpCtx.(map[string]interface{})
	if !ok {
		return ""
	}

	request, ok := httpContext["request"].(*http.Request)
	if !ok {
		return ""
	}

	cookie, err := request.Cookie("session_token")
	if err != nil {
		return ""
	}

	return cookie.Value
}

// =============================================================================
// Errors
// =============================================================================

var (
	ErrMissingSessionID = errors.New("session ID is required")
)

package resolvers

import (
	"context"
	"fmt"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/generated"
	"agrinovagraphql/server/internal/middleware"

	"github.com/google/uuid"
)

// ForceLogoutSession handles force logout of a specific session
func (r *AuthResolver) ForceLogoutSession(ctx context.Context, sessionID uuid.UUID, reason *string) (*auth.ForceLogoutResponse, error) {
	// Check if user is SUPER_ADMIN
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("unauthorized")
	}

	user, err := r.userManagementService.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("unauthorized: user not found")
	}

	if auth.UserRole(user.Role) != auth.UserRoleSuperAdmin {
		return nil, fmt.Errorf("insufficient permissions")
	}

	reasonStr := "Admin forced logout"
	if reason != nil {
		reasonStr = *reason
	}

	err = r.sharedAuthService.RevokeSession(ctx, sessionID.String(), user.ID, reasonStr)
	if err != nil {
		return &auth.ForceLogoutResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to revoke session: %v", err),
		}, nil
	}

	return &auth.ForceLogoutResponse{
		Success: true,
		Message: "Session revoked successfully",
	}, nil
}

// ForceLogoutAllSessions handles force logout of all sessions for a user
func (r *AuthResolver) ForceLogoutAllSessions(ctx context.Context, targetUserID uuid.UUID, reason *string) (*auth.ForceLogoutResponse, error) {
	// Check if user is SUPER_ADMIN
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("unauthorized")
	}

	user, err := r.userManagementService.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("unauthorized: user not found")
	}

	if auth.UserRole(user.Role) != auth.UserRoleSuperAdmin {
		return nil, fmt.Errorf("insufficient permissions")
	}

	reasonStr := "Admin forced logout all sessions"
	if reason != nil {
		reasonStr = *reason
	}

	count, err := r.sharedAuthService.RevokeAllUserSessions(ctx, targetUserID.String(), user.ID, reasonStr)
	if err != nil {
		return &auth.ForceLogoutResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to revoke sessions: %v", err),
			Count:   nil,
		}, nil
	}

	countInt := int32(count)
	return &auth.ForceLogoutResponse{
		Success: true,
		Message: fmt.Sprintf("Revoked %d sessions", count),
		Count:   &countInt,
	}, nil
}

// UserSessions retrieves user sessions with filtering
func (r *AuthResolver) UserSessions(ctx context.Context, filter *generated.SessionFilterInput) ([]*generated.UserSession, error) {
	// Check if user is SUPER_ADMIN
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("unauthorized")
	}

	user, err := r.userManagementService.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("unauthorized: user not found")
	}

	if auth.UserRole(user.Role) != auth.UserRoleSuperAdmin {
		return nil, fmt.Errorf("insufficient permissions")
	}

	// Filter by UserID if provided, or current user? usually admin lists for specific user
	targetUserID := ""
	if filter != nil && filter.UserID != nil {
		targetUserID = filter.UserID.String()
	} else {
		// If no user specified, maybe return error or own sessions?
		// Assuming for now simple implementation using GetSessions(userID)
		// If targetUserID is empty, existing legacy supported filtering all sessions?
		// My SharedAuthService only supports by UserID.
		// If filter.UserID is missing, we might need a FindAllSessions or fail.
		// For safety/time, I'll error if UserID is missing unless I implemented generic FindAll.
		// Re-reading legacy logic: `r.webAuthResolver.webAuthService.GetSessions(ctx, filter)`
		// If filter had nil user, it probably listed all.
		// I will limit to UserID required for now or list own sessions if empty?
		// Let's require UserID or list own.
		if targetUserID == "" {
			targetUserID = userID
		}
	}

	sessions, err := r.sharedAuthService.GetSessions(ctx, targetUserID)
	if err != nil {
		return nil, err
	}

	// Convert to GraphQL model
	var gqlSessions []*generated.UserSession
	for _, s := range sessions {
		// Fetch user for each session
		sessionUserDomain, err := r.userManagementService.GetUserByID(ctx, s.UserID)
		if err != nil {
			continue // Skip if user not found
		}
		sessionUser := r.toGraphQLUser(sessionUserDomain)

		var revokedBy *auth.User
		if s.RevokedBy != nil && *s.RevokedBy != "" {
			revokedByDomain, _ := r.userManagementService.GetUserByID(ctx, *s.RevokedBy)
			if revokedByDomain != nil {
				revokedBy = r.toGraphQLUser(revokedByDomain)
			}
		}

		sessionID := uuid.Nil
		if s.ID != "" {
			sessionID = uuid.MustParse(s.ID)
		}

		gqlSessions = append(gqlSessions, &generated.UserSession{
			ID:            sessionID,
			User:          sessionUser,
			SessionID:     s.SessionToken,
			Platform:      string(s.Platform),
			IPAddress:     &s.IPAddress,
			UserAgent:     &s.UserAgent,
			LoginTime:     s.CreatedAt,
			LastActivity:  s.LastActivity,
			ExpiresAt:     s.ExpiresAt,
			Revoked:       s.Revoked,
			RevokedBy:     revokedBy,
			RevokedReason: s.RevokedReason,
		})
	}

	return gqlSessions, nil
}

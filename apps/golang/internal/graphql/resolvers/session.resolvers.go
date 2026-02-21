package resolvers

import (
	authmodels "agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/generated"
	"agrinovagraphql/server/internal/middleware"
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ForceLogoutSession is the resolver for the forceLogoutSession field.
func (r *mutationResolver) ForceLogoutSession(ctx context.Context, sessionID uuid.UUID, reason *string) (*auth.ForceLogoutResponse, error) {
	currentUserID, err := requireSuperAdmin(ctx)
	if err != nil {
		return nil, err
	}

	reasonText := "Admin forced logout"
	if reason != nil && *reason != "" {
		reasonText = *reason
	}

	var targetSession authmodels.UserSession
	if err := r.db.WithContext(ctx).
		Where("id = ?", sessionID.String()).
		First(&targetSession).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &auth.ForceLogoutResponse{
				Success: false,
				Message: "Session tidak ditemukan",
			}, nil
		}
		return nil, err
	}

	if err := r.db.WithContext(ctx).
		Model(&authmodels.UserSession{}).
		Where("id = ?", sessionID.String()).
		Updates(map[string]interface{}{
			"is_active":      false,
			"revoked":        true,
			"revoked_reason": reasonText,
			"revoked_by":     currentUserID,
			"updated_at":     time.Now(),
		}).Error; err != nil {
		return nil, err
	}

	tokenQuery := r.db.WithContext(ctx).
		Model(&authmodels.JWTToken{}).
		Where("user_id = ? AND is_revoked = ?", targetSession.UserID, false)

	if targetSession.DeviceID != nil && *targetSession.DeviceID != "" {
		tokenQuery = tokenQuery.Where("device_id = ?", *targetSession.DeviceID)
	}

	_ = tokenQuery.Updates(map[string]interface{}{
		"is_revoked": true,
		"revoked_at": time.Now(),
		"updated_at": time.Now(),
	}).Error

	return &auth.ForceLogoutResponse{
		Success: true,
		Message: "Session berhasil direvoke",
	}, nil
}

// ForceLogoutAllSessions is the resolver for the forceLogoutAllSessions field.
func (r *mutationResolver) ForceLogoutAllSessions(ctx context.Context, userID uuid.UUID, reason *string) (*auth.ForceLogoutResponse, error) {
	currentUserID, err := requireSuperAdmin(ctx)
	if err != nil {
		return nil, err
	}

	reasonText := "Admin forced logout all sessions"
	if reason != nil && *reason != "" {
		reasonText = *reason
	}

	sessionResult := r.db.WithContext(ctx).
		Model(&authmodels.UserSession{}).
		Where("user_id = ? AND is_active = ?", userID.String(), true).
		Updates(map[string]interface{}{
			"is_active":      false,
			"revoked":        true,
			"revoked_reason": reasonText,
			"revoked_by":     currentUserID,
			"updated_at":     time.Now(),
		})
	if sessionResult.Error != nil {
		return nil, sessionResult.Error
	}

	_ = r.db.WithContext(ctx).
		Model(&authmodels.JWTToken{}).
		Where("user_id = ? AND is_revoked = ?", userID.String(), false).
		Updates(map[string]interface{}{
			"is_revoked": true,
			"revoked_at": time.Now(),
			"updated_at": time.Now(),
		}).Error

	count := int32(sessionResult.RowsAffected)
	return &auth.ForceLogoutResponse{
		Success: true,
		Message: "Semua session pengguna berhasil direvoke",
		Count:   &count,
	}, nil
}

// UserSessions is the resolver for the userSessions field.
func (r *queryResolver) UserSessions(ctx context.Context, filter *generated.SessionFilterInput) ([]*generated.UserSession, error) {
	if _, err := requireSuperAdmin(ctx); err != nil {
		return nil, err
	}

	query := r.db.WithContext(ctx).
		Model(&authmodels.UserSession{}).
		Preload("User")

	if filter != nil {
		if filter.UserID != nil {
			query = query.Where("user_id = ?", filter.UserID.String())
		}
		if filter.Platform != nil && *filter.Platform != "" {
			query = query.Where("platform = ?", *filter.Platform)
		}
		if filter.Revoked != nil {
			query = query.Where("revoked = ?", *filter.Revoked)
		}
		if filter.ActiveOnly != nil && *filter.ActiveOnly {
			query = query.Where("is_active = ? AND revoked = ? AND expires_at > ?", true, false, time.Now())
		}
	}

	var sessions []authmodels.UserSession
	if err := query.Order("created_at DESC").Find(&sessions).Error; err != nil {
		return nil, err
	}

	result := make([]*generated.UserSession, 0, len(sessions))
	for _, session := range sessions {
		sessionUser := &session.User
		if sessionUser == nil || sessionUser.ID == "" {
			fallbackUser, err := r.AuthResolver.GetUserByID(ctx, session.UserID)
			if err == nil && fallbackUser != nil {
				sessionUser = fallbackUser
			}
		}
		if sessionUser == nil {
			continue
		}

		var revokedBy *auth.User
		if session.RevokedBy != nil && *session.RevokedBy != "" {
			fallbackRevokedBy, err := r.AuthResolver.GetUserByID(ctx, *session.RevokedBy)
			if err == nil {
				revokedBy = fallbackRevokedBy
			}
		}

		result = append(result, &generated.UserSession{
			ID:            mustParseUUID(session.ID),
			User:          sessionUser,
			SessionID:     session.SessionToken,
			Platform:      string(session.Platform),
			IPAddress:     nonEmptyStringPtr(session.IPAddress),
			UserAgent:     nonEmptyStringPtr(session.UserAgent),
			LoginTime:     firstNonZeroTime(session.CreatedAt, session.UpdatedAt, session.LastActivity, session.ExpiresAt),
			LastActivity:  firstNonZeroTime(session.LastActivity, session.UpdatedAt, session.CreatedAt, session.ExpiresAt),
			ExpiresAt:     firstNonZeroTime(session.ExpiresAt, session.LastActivity, session.UpdatedAt, session.CreatedAt),
			Revoked:       session.Revoked,
			RevokedBy:     revokedBy,
			RevokedReason: session.RevokedReason,
		})
	}

	return result, nil
}

func requireSuperAdmin(ctx context.Context) (string, error) {
	currentUserID := middleware.GetCurrentUserID(ctx)
	if currentUserID == "" {
		return "", errors.New("unauthorized")
	}

	role := middleware.GetUserRoleFromContext(ctx)
	if role != auth.UserRoleSuperAdmin {
		return "", errors.New("insufficient permissions")
	}

	return currentUserID, nil
}

func mustParseUUID(id string) uuid.UUID {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return uuid.Nil
	}
	return parsed
}

func nonEmptyStringPtr(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func firstNonZeroTime(values ...time.Time) time.Time {
	for _, value := range values {
		if !value.IsZero() {
			return value
		}
	}
	return time.Now()
}

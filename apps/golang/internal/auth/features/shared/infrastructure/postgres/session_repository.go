package postgres

import (
	"context"
	"time"

	"agrinovagraphql/server/internal/auth/features/shared/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SessionRepository implements domain.SessionRepository for PostgreSQL
type SessionRepository struct {
	db *gorm.DB
}

// NewSessionRepository creates new PostgreSQL session repository
func NewSessionRepository(db *gorm.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

// CreateSession creates a new user session
func (r *SessionRepository) CreateSession(ctx context.Context, session *domain.UserSession) error {
	sessionModel := r.fromDomainSession(session)
	if sessionModel.ID == "" {
		sessionModel.ID = uuid.New().String()
	}

	if err := r.db.WithContext(ctx).Create(sessionModel).Error; err != nil {
		return err
	}

	// Keep domain/session ID aligned with persisted record so upstream logic
	// (e.g., single-session pruning) does not revoke the freshly created session.
	session.ID = sessionModel.ID
	return nil
}

// FindSessionByToken finds session by token
func (r *SessionRepository) FindSessionByToken(ctx context.Context, token string) (*domain.UserSession, error) {
	var session SessionModel
	err := r.db.WithContext(ctx).
		Where("session_token = ? AND is_active = true", token).
		First(&session).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.toDomainSession(&session), nil
}

// FindSessionByID finds session by ID
func (r *SessionRepository) FindSessionByID(ctx context.Context, id string) (*domain.UserSession, error) {
	var session SessionModel
	err := r.db.WithContext(ctx).
		Where("id = ? AND is_active = true", id).
		First(&session).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.toDomainSession(&session), nil
}

// FindActiveSessionsByUser finds all active sessions for a user
func (r *SessionRepository) FindActiveSessionsByUser(ctx context.Context, userID string) ([]*domain.UserSession, error) {
	var sessions []SessionModel
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND is_active = true", userID).
		Order("last_activity DESC").
		Find(&sessions).Error

	if err != nil {
		return nil, err
	}

	domainSessions := make([]*domain.UserSession, len(sessions))
	for i, session := range sessions {
		domainSessions[i] = r.toDomainSession(&session)
	}

	return domainSessions, nil
}

// UpdateSession updates an existing session
func (r *SessionRepository) UpdateSession(ctx context.Context, session *domain.UserSession) error {
	sessionModel := r.fromDomainSession(session)
	return r.db.WithContext(ctx).
		Where("id = ?", session.ID).
		Updates(sessionModel).Error
}

// RevokeSession deactivates a session by ID or session token.
// This keeps backward compatibility because some call sites pass session ID while
// web cookie flow passes the session token value.
func (r *SessionRepository) RevokeSession(ctx context.Context, sessionID string) error {
	return r.db.WithContext(ctx).
		Model(&SessionModel{}).
		Where("id::text = ? OR session_token = ?", sessionID, sessionID).
		Updates(map[string]interface{}{
			"is_active": false,
			"updated_at": time.Now(),
		}).Error
}

// RevokeAllUserSessions deactivates all sessions for a user
func (r *SessionRepository) RevokeAllUserSessions(ctx context.Context, userID string) error {
	return r.db.WithContext(ctx).
		Model(&SessionModel{}).
		Where("user_id = ?", userID).
		Updates(map[string]interface{}{
			"is_active": false,
			"updated_at": time.Now(),
		}).Error
}

// RevokeExpiredSessions deactivates all expired sessions
func (r *SessionRepository) RevokeExpiredSessions(ctx context.Context) error {
	return r.db.WithContext(ctx).
		Model(&SessionModel{}).
		Where("expires_at < ?", time.Now()).
		Updates(map[string]interface{}{
			"is_active": false,
			"updated_at": time.Now(),
		}).Error
}

// CleanupOldSessions removes old inactive sessions
func (r *SessionRepository) CleanupOldSessions(ctx context.Context, olderThan time.Duration) error {
	cutoff := time.Now().Add(-olderThan)
	return r.db.WithContext(ctx).
		Where("is_active = false AND updated_at < ?", cutoff).
		Delete(&SessionModel{}).Error
}

// SessionModel represents the GORM model for sessions table
type SessionModel struct {
	ID           string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID       string    `gorm:"not null;index"`
	DeviceID     *string   `gorm:"index"`
	SessionToken string    `gorm:"not null;uniqueIndex"`
	RefreshToken *string   `gorm:"index"`
	Platform     string    `gorm:"not null"`
	IPAddress    string
	UserAgent    string
	LastActivity time.Time `gorm:"index"`
	ExpiresAt    time.Time `gorm:"index"`
	IsActive     bool      `gorm:"default:true;index"`
	LoginMethod  string    `gorm:"not null"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// TableName returns the table name for SessionModel
func (SessionModel) TableName() string {
	return "user_sessions"
}

// Helper methods to convert between domain and GORM models

func (r *SessionRepository) toDomainSession(session *SessionModel) *domain.UserSession {
	return &domain.UserSession{
		ID:           session.ID,
		UserID:       session.UserID,
		DeviceID:     session.DeviceID,
		SessionToken: session.SessionToken,
		RefreshToken: session.RefreshToken,
		Platform:     domain.PlatformType(session.Platform),
		IPAddress:    session.IPAddress,
		UserAgent:    session.UserAgent,
		LastActivity: session.LastActivity,
		ExpiresAt:    session.ExpiresAt,
		IsActive:     session.IsActive,
		LoginMethod:  session.LoginMethod,
		CreatedAt:    session.CreatedAt,
		UpdatedAt:    session.UpdatedAt,
	}
}

func (r *SessionRepository) fromDomainSession(session *domain.UserSession) *SessionModel {
	return &SessionModel{
		ID:           session.ID,
		UserID:       session.UserID,
		DeviceID:     session.DeviceID,
		SessionToken: session.SessionToken,
		RefreshToken: session.RefreshToken,
		Platform:     string(session.Platform),
		IPAddress:    session.IPAddress,
		UserAgent:    session.UserAgent,
		LastActivity: session.LastActivity,
		ExpiresAt:    session.ExpiresAt,
		IsActive:     session.IsActive,
		LoginMethod:  session.LoginMethod,
		CreatedAt:    session.CreatedAt,
		UpdatedAt:    session.UpdatedAt,
	}
}

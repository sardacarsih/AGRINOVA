package postgres

import (
	"context"
	"encoding/json"
	"time"

	"agrinovagraphql/server/internal/auth/features/shared/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SecurityEventRepository implements domain.SecurityEventRepository for PostgreSQL
type SecurityEventRepository struct {
	db *gorm.DB
}

// NewSecurityEventRepository creates new PostgreSQL security event repository
func NewSecurityEventRepository(db *gorm.DB) *SecurityEventRepository {
	return &SecurityEventRepository{db: db}
}

// LogSecurityEvent logs a security event to database
func (r *SecurityEventRepository) LogSecurityEvent(ctx context.Context, event *domain.SecurityEvent) error {
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now()
	}

	eventModel := r.fromDomainEvent(event)
	eventModel.ID = uuid.New().String()

	// Marshal details to JSON
	if event.Details != nil {
		detailsJSON, err := json.Marshal(event.Details)
		if err != nil {
			return err
		}
		eventModel.DetailsJSON = string(detailsJSON)
	}

	return r.db.WithContext(ctx).Create(eventModel).Error
}

// FindRecentEvents finds recent security events for a user
func (r *SecurityEventRepository) FindRecentEvents(ctx context.Context, userID *string, limit int) ([]*domain.SecurityEvent, error) {
	query := r.db.WithContext(ctx).Model(&SecurityEventModel{})

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	var events []SecurityEventModel
	err := query.
		Order("created_at DESC").
		Limit(limit).
		Find(&events).Error

	if err != nil {
		return nil, err
	}

	return r.toDomainEvents(events), nil
}

// FindFailedLogins finds failed login attempts for an identifier
func (r *SecurityEventRepository) FindFailedLogins(ctx context.Context, identifier string, since time.Time) ([]*domain.SecurityEvent, error) {
	var events []SecurityEventModel
	err := r.db.WithContext(ctx).
		Where("event = ? AND details_json LIKE ? AND created_at > ?",
			domain.EventLoginFailure,
			"%"+identifier+"%",
			since).
		Order("created_at DESC").
		Find(&events).Error

	if err != nil {
		return nil, err
	}

	return r.toDomainEvents(events), nil
}

// CleanupOldEvents removes old security events beyond retention period
func (r *SecurityEventRepository) CleanupOldEvents(ctx context.Context, olderThan time.Duration) error {
	cutoff := time.Now().Add(-olderThan)
	return r.db.WithContext(ctx).
		Where("created_at < ?", cutoff).
		Delete(&SecurityEventModel{}).Error
}

// SecurityEventModel represents the GORM model for security events table
type SecurityEventModel struct {
	ID          string  `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID      *string `gorm:"index"`
	Event       string  `gorm:"column:event_type;not null;index"`
	Severity    string  `gorm:"column:severity;not null;default:'INFO'"`
	IPAddress   string
	UserAgent   string
	DetailsJSON string    `gorm:"column:details;type:jsonb"`
	CreatedAt   time.Time `gorm:"index"`
}

// TableName returns the table name for SecurityEventModel
func (SecurityEventModel) TableName() string {
	return "security_events"
}

// Helper methods to convert between domain and GORM models

func (r *SecurityEventRepository) toDomainEvents(events []SecurityEventModel) []*domain.SecurityEvent {
	domainEvents := make([]*domain.SecurityEvent, len(events))
	for i, event := range events {
		domainEvents[i] = r.toDomainEvent(&event)
	}
	return domainEvents
}

func (r *SecurityEventRepository) toDomainEvent(event *SecurityEventModel) *domain.SecurityEvent {
	domainEvent := &domain.SecurityEvent{
		ID:        event.ID,
		UserID:    event.UserID,
		Event:     domain.SecurityEventType(event.Event),
		Severity:  domain.SecurityEventSeverity(event.Severity),
		IPAddress: event.IPAddress,
		UserAgent: event.UserAgent,
		CreatedAt: event.CreatedAt,
	}

	// Parse details JSON
	if event.DetailsJSON != "" {
		var details map[string]interface{}
		if err := json.Unmarshal([]byte(event.DetailsJSON), &details); err == nil {
			domainEvent.Details = details
		}
	}

	return domainEvent
}

func (r *SecurityEventRepository) fromDomainEvent(event *domain.SecurityEvent) *SecurityEventModel {
	severity := string(event.Severity)
	if severity == "" {
		severity = "INFO"
	}

	return &SecurityEventModel{
		ID:        event.ID,
		UserID:    event.UserID,
		Event:     string(event.Event),
		Severity:  severity,
		IPAddress: event.IPAddress,
		UserAgent: event.UserAgent,
		CreatedAt: event.CreatedAt,
	}
}

package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"agrinovagraphql/server/internal/notifications/models"
	"agrinovagraphql/server/internal/notifications/repositories"
	wsModels "agrinovagraphql/server/internal/websocket/models"
	"gorm.io/gorm"
)

// WebSocketBroadcaster interface for broadcasting events (breaks circular import)
type WebSocketBroadcaster interface {
	BroadcastNotification(notification *models.Notification) error
	BroadcastToRole(role string, event string, data interface{})
	BroadcastToUser(userID string, event string, data interface{})
}

// WebSocketHandler interface for WebSocket operations (breaks circular import)
type WebSocketHandler interface {
	BroadcastToUser(userID string, event string, data interface{})
	BroadcastToRole(role string, event string, data interface{})
	BroadcastToCompany(companyID string, event string, data interface{})
	BroadcastToChannel(channel wsModels.ChannelType, event string, data interface{})
}

// NotificationService handles business logic for notifications
type NotificationService struct {
	repo             *repositories.NotificationRepository
	wsHandler        WebSocketHandler
	eventBroadcaster WebSocketBroadcaster
}

// NewNotificationService creates a new notification service
func NewNotificationService(
	repo *repositories.NotificationRepository,
	wsHandler WebSocketHandler,
	eventBroadcaster WebSocketBroadcaster,
) *NotificationService {
	return &NotificationService{
		repo:             repo,
		wsHandler:        wsHandler,
		eventBroadcaster: eventBroadcaster,
	}
}

// CreateNotification creates a new notification and broadcasts it in real-time
func (s *NotificationService) CreateNotification(ctx context.Context, input *CreateNotificationInput) (*models.Notification, error) {
	recipientID := strings.TrimSpace(input.RecipientID)
	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)

	if recipientID != "" && idempotencyKey != "" {
		existing, err := s.repo.GetByRecipientAndIdempotencyKey(ctx, recipientID, idempotencyKey)
		if err == nil {
			return existing, nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) && !isMissingIdempotencyColumnError(err) {
			return nil, fmt.Errorf("failed to check notification idempotency: %w", err)
		}
	}

	// Generate UUID if not provided
	notificationID := input.ID
	if notificationID == "" {
		notificationID = uuid.New().String()
	}

	// Create notification model
	notification := &models.Notification{
		ID:                 notificationID,
		Type:               input.Type,
		Priority:           input.Priority,
		Status:             models.NotificationStatusUnread,
		Title:              input.Title,
		Message:            input.Message,
		RecipientID:        input.RecipientID,
		RecipientRole:      input.RecipientRole,
		RecipientCompanyID: input.RecipientCompanyID,
		RelatedEntityType:  input.RelatedEntityType,
		RelatedEntityID:    input.RelatedEntityID,
		ActionURL:          input.ActionURL,
		ActionLabel:        input.ActionLabel,
		SenderID:           input.SenderID,
		SenderRole:         input.SenderRole,
		ScheduledFor:       input.ScheduledFor,
		ExpiresAt:          input.ExpiresAt,
		IdempotencyKey:     idempotencyKey,
	}

	// Set metadata if provided
	if input.Metadata != nil {
		if err := notification.SetMetadataMap(input.Metadata); err != nil {
			return nil, fmt.Errorf("failed to set metadata: %w", err)
		}
	}

	// Save notification and initial delivery rows atomically
	deliveries := s.buildInitialDeliveries(notification)
	if err := s.repo.CreateNotificationWithDeliveries(ctx, notification, deliveries); err != nil {
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}

	// Broadcast real-time notification if it should be delivered now
	if notification.ShouldBeDelivered() {
		s.broadcastNotification(notification)
		s.markWebDeliveryDelivered(ctx, notification)
	}

	return notification, nil
}

func (s *NotificationService) buildInitialDeliveries(notification *models.Notification) []*models.NotificationDelivery {
	if notification == nil {
		return nil
	}

	return []*models.NotificationDelivery{
		{
			NotificationID: notification.ID,
			Channel:        models.NotificationDeliveryChannelWeb,
			DeliveryStatus: models.NotificationDeliveryStatusPending,
		},
	}
}

func (s *NotificationService) markWebDeliveryDelivered(ctx context.Context, notification *models.Notification) {
	if s.repo == nil || notification == nil {
		return
	}

	hasRealtimeTarget := notification.RecipientID != "" ||
		notification.RecipientRole != "" ||
		notification.RecipientCompanyID != ""
	if !hasRealtimeTarget {
		return
	}

	_ = s.repo.UpdateDeliveryStatus(
		ctx,
		notification.ID,
		models.NotificationDeliveryChannelWeb,
		models.NotificationDeliveryStatusDelivered,
		nil,
	)
}

// CreateFromTemplate creates a notification from a template with variable substitution
func (s *NotificationService) CreateFromTemplate(ctx context.Context, templateName string, variables map[string]interface{}, recipients *NotificationRecipients) (*models.Notification, error) {
	// Get template
	template, err := s.repo.GetTemplateByName(ctx, templateName)
	if err != nil {
		return nil, fmt.Errorf("failed to get template %s: %w", templateName, err)
	}

	// Substitute variables in title and message
	title := s.substituteVariables(template.TitleTemplate, variables)
	message := s.substituteVariables(template.MessageTemplate, variables)

	// Parse default metadata
	var metadata map[string]interface{}
	if template.DefaultMetadata != "" {
		json.Unmarshal([]byte(template.DefaultMetadata), &metadata)
	}

	// Merge with provided metadata
	for k, v := range variables {
		if metadata == nil {
			metadata = make(map[string]interface{})
		}
		metadata[k] = v
	}

	// Create notification input
	input := &CreateNotificationInput{
		Type:               template.Type,
		Priority:           template.Priority,
		Title:              title,
		Message:            message,
		RecipientID:        recipients.UserID,
		RecipientRole:      recipients.Role,
		RecipientCompanyID: recipients.CompanyID,
		RelatedEntityType:  recipients.RelatedEntityType,
		RelatedEntityID:    recipients.RelatedEntityID,
		ActionURL:          template.ActionURL,
		ActionLabel:        template.ActionLabel,
		Metadata:           metadata,
		SenderID:           recipients.SenderID,
		SenderRole:         recipients.SenderRole,
	}

	return s.CreateNotification(ctx, input)
}

// GetUserNotifications retrieves notifications for a user with filtering
func (s *NotificationService) GetUserNotifications(ctx context.Context, userID string, filter *repositories.NotificationFilter) ([]*models.Notification, error) {
	return s.repo.GetUserNotifications(ctx, userID, filter)
}

// GetNotificationByID retrieves a specific notification
func (s *NotificationService) GetNotificationByID(ctx context.Context, id string) (*models.Notification, error) {
	return s.repo.GetNotificationByID(ctx, id)
}

// UpdateNotificationStatus updates notification status and broadcasts the change
func (s *NotificationService) UpdateNotificationStatus(ctx context.Context, id string, userID string, updates *NotificationUpdates) (*models.Notification, error) {
	// Get the notification first
	notification, err := s.repo.GetNotificationByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get notification: %w", err)
	}

	// Verify user ownership
	if notification.RecipientID != userID {
		return nil, fmt.Errorf("notification does not belong to user")
	}

	// Apply updates
	if updates.MarkAsRead {
		if err := s.repo.MarkAsRead(ctx, id, userID); err != nil {
			return nil, fmt.Errorf("failed to mark as read: %w", err)
		}
	}

	if updates.MarkAsDismissed {
		if err := s.repo.MarkAsDismissed(ctx, id, userID); err != nil {
			return nil, fmt.Errorf("failed to mark as dismissed: %w", err)
		}
	}

	if updates.MarkAsArchived {
		if err := s.repo.MarkAsArchived(ctx, id, userID); err != nil {
			return nil, fmt.Errorf("failed to mark as archived: %w", err)
		}
	}

	if updates.RecordClick {
		if err := s.repo.RecordClick(ctx, id, userID); err != nil {
			return nil, fmt.Errorf("failed to record click: %w", err)
		}
	}

	// Get updated notification
	updatedNotification, err := s.repo.GetNotificationByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated notification: %w", err)
	}

	// Broadcast the update
	s.broadcastNotificationUpdate(updatedNotification)

	return updatedNotification, nil
}

// MarkAsRead marks a notification as read
func (s *NotificationService) MarkAsRead(ctx context.Context, id string, userID string) (*models.Notification, error) {
	return s.UpdateNotificationStatus(ctx, id, userID, &NotificationUpdates{MarkAsRead: true})
}

// DismissNotification marks a notification as dismissed
func (s *NotificationService) DismissNotification(ctx context.Context, id string, userID string) (*models.Notification, error) {
	return s.UpdateNotificationStatus(ctx, id, userID, &NotificationUpdates{MarkAsDismissed: true})
}

// ArchiveNotification marks a notification as archived
func (s *NotificationService) ArchiveNotification(ctx context.Context, id string, userID string) (*models.Notification, error) {
	return s.UpdateNotificationStatus(ctx, id, userID, &NotificationUpdates{MarkAsArchived: true})
}

// MarkAllAsRead marks all unread notifications for a user as read
func (s *NotificationService) MarkAllAsRead(ctx context.Context, userID string) error {
	if err := s.repo.MarkAllAsRead(ctx, userID); err != nil {
		return fmt.Errorf("failed to mark all as read: %w", err)
	}

	// Broadcast summary update
	s.broadcastSummaryUpdate(userID)

	return nil
}

// ClearReadNotifications removes all read notifications for a user
func (s *NotificationService) ClearReadNotifications(ctx context.Context, userID string) error {
	if err := s.repo.ClearReadNotifications(ctx, userID); err != nil {
		return fmt.Errorf("failed to clear read notifications: %w", err)
	}

	// Broadcast summary update
	s.broadcastSummaryUpdate(userID)

	return nil
}

// GetUnreadCount returns the count of unread notifications for a user
func (s *NotificationService) GetUnreadCount(ctx context.Context, userID string) (int, error) {
	count, err := s.repo.GetUnreadCount(ctx, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to get unread count: %w", err)
	}
	return int(count), nil
}

// GetNotificationSummary returns aggregated notification statistics for a user
func (s *NotificationService) GetNotificationSummary(ctx context.Context, userID string) (*models.NotificationSummary, error) {
	summary, err := s.repo.GetNotificationSummary(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get notification summary: %w", err)
	}
	return summary, nil
}

// NotificationPreferences methods

// GetUserPreferences retrieves notification preferences for a user
func (s *NotificationService) GetUserPreferences(ctx context.Context, userID string) (*models.NotificationPreferences, error) {
	return s.repo.GetUserPreferences(ctx, userID)
}

// UpdateUserPreferences updates notification preferences for a user
func (s *NotificationService) UpdateUserPreferences(ctx context.Context, userID string, updates *PreferencesUpdates) (*models.NotificationPreferences, error) {
	// Get existing preferences
	preferences, err := s.repo.GetUserPreferences(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user preferences: %w", err)
	}

	// Apply updates
	if updates.EnableWebNotifications != nil {
		preferences.EnableWebNotifications = *updates.EnableWebNotifications
	}
	if updates.EnableMobileNotifications != nil {
		preferences.EnableMobileNotifications = *updates.EnableMobileNotifications
	}
	if updates.EnableEmailNotifications != nil {
		preferences.EnableEmailNotifications = *updates.EnableEmailNotifications
	}
	if updates.TypePreferences != nil {
		jsonBytes, _ := json.Marshal(updates.TypePreferences)
		preferences.TypePreferences = string(jsonBytes)
	}
	if updates.MinimumPriority != nil {
		preferences.MinimumPriority = *updates.MinimumPriority
	}
	if updates.QuietHoursStart != nil {
		preferences.QuietHoursStart = *updates.QuietHoursStart
	}
	if updates.QuietHoursEnd != nil {
		preferences.QuietHoursEnd = *updates.QuietHoursEnd
	}
	if updates.QuietHoursTimezone != nil {
		preferences.QuietHoursTimezone = *updates.QuietHoursTimezone
	}

	// Save updates
	if err := s.repo.UpdateUserPreferences(ctx, preferences); err != nil {
		return nil, fmt.Errorf("failed to update preferences: %w", err)
	}

	return preferences, nil
}

// NotificationTemplate methods

// GetAllTemplates retrieves all notification templates
func (s *NotificationService) GetAllTemplates(ctx context.Context) ([]*models.NotificationTemplate, error) {
	if s.repo == nil {
		return nil, fmt.Errorf("notification repository not initialized")
	}
	return s.repo.GetAllTemplates(ctx)
}

// GetTemplate retrieves a specific notification template by ID
func (s *NotificationService) GetTemplate(ctx context.Context, id string) (*models.NotificationTemplate, error) {
	if s.repo == nil {
		return nil, fmt.Errorf("notification repository not initialized")
	}
	return s.repo.GetTemplate(ctx, id)
}

// CreateTemplate creates a new notification template
func (s *NotificationService) CreateTemplate(ctx context.Context, template *models.NotificationTemplate) error {
	if s.repo == nil {
		return fmt.Errorf("notification repository not initialized")
	}
	return s.repo.CreateTemplate(ctx, template)
}

// UpdateTemplate updates a notification template
func (s *NotificationService) UpdateTemplate(ctx context.Context, template *models.NotificationTemplate) error {
	if s.repo == nil {
		return fmt.Errorf("notification repository not initialized")
	}
	return s.repo.UpdateTemplate(ctx, template)
}

// DeleteTemplate deletes a notification template
func (s *NotificationService) DeleteTemplate(ctx context.Context, id string) error {
	if s.repo == nil {
		return fmt.Errorf("notification repository not initialized")
	}
	return s.repo.DeleteTemplate(ctx, id)
}

// Business logic helpers for creating notifications

// NotifyHarvestCreated creates a notification for new harvest record
func (s *NotificationService) NotifyHarvestCreated(ctx context.Context, harvestID string, mandorID string, mandorName string, blockName string, weight float64) error {
	metadata := map[string]interface{}{
		"harvestId": harvestID,
		"mandor":    mandorName,
		"block":     blockName,
		"weight":    weight,
		"priority":  "high",
	}

	input := &CreateNotificationInput{
		Type:              models.NotificationTypeHarvestApprovalNeeded,
		Priority:          models.NotificationPriorityHigh,
		Title:             "Persetujuan Panen Diperlukan",
		Message:           fmt.Sprintf("Data panen baru dari %s di blok %s (%.1f kg) memerlukan persetujuan", mandorName, blockName, weight),
		RecipientRole:     "ASISTEN",
		RelatedEntityType: "HARVEST_RECORD",
		RelatedEntityID:   harvestID,
		ActionURL:         "/dashboard/asisten/approval",
		ActionLabel:       "Review",
		Metadata:          metadata,
		SenderID:          mandorID,
		SenderRole:        "MANDOR",
	}

	_, err := s.CreateNotification(ctx, input)
	return err
}

// NotifyHarvestApproved creates notifications for approved harvest
func (s *NotificationService) NotifyHarvestApproved(ctx context.Context, harvestID string, mandorID string, approverID string, blockName string, weight float64) error {
	metadata := map[string]interface{}{
		"harvestId": harvestID,
		"block":     blockName,
		"weight":    weight,
		"approved":  true,
	}

	// Notify the mandor
	input := &CreateNotificationInput{
		Type:              models.NotificationTypeHarvestApproved,
		Priority:          models.NotificationPriorityMedium,
		Title:             "Data Panen Disetujui",
		Message:           fmt.Sprintf("Data panen Anda di blok %s (%.1f kg) telah disetujui", blockName, weight),
		RecipientID:       mandorID,
		RelatedEntityType: "HARVEST_RECORD",
		RelatedEntityID:   harvestID,
		ActionURL:         "/dashboard/mandor/history",
		ActionLabel:       "Lihat Detail",
		Metadata:          metadata,
		SenderID:          approverID,
		SenderRole:        "ASISTEN",
	}

	_, err := s.CreateNotification(ctx, input)
	return err
}

// NotifyHarvestRejected creates notifications for rejected harvest
func (s *NotificationService) NotifyHarvestRejected(ctx context.Context, harvestID string, mandorID string, approverID string, blockName string, weight float64, reason string) error {
	metadata := map[string]interface{}{
		"harvestId":      harvestID,
		"block":          blockName,
		"weight":         weight,
		"approved":       false,
		"rejectedReason": reason,
	}

	// Notify the mandor
	input := &CreateNotificationInput{
		Type:              models.NotificationTypeHarvestRejected,
		Priority:          models.NotificationPriorityHigh,
		Title:             "Data Panen Ditolak",
		Message:           fmt.Sprintf("Data panen Anda di blok %s (%.1f kg) ditolak: %s", blockName, weight, reason),
		RecipientID:       mandorID,
		RelatedEntityType: "HARVEST_RECORD",
		RelatedEntityID:   harvestID,
		ActionURL:         "/dashboard/mandor/panen",
		ActionLabel:       "Perbaiki Data",
		Metadata:          metadata,
		SenderID:          approverID,
		SenderRole:        "ASISTEN",
	}

	_, err := s.CreateNotification(ctx, input)
	return err
}

// NotifyGateCheck creates notifications for gate check events
func (s *NotificationService) NotifyGateCheck(ctx context.Context, gateCheckID string, satpamID string, vehicleNumber string, driverName string, intent string) error {
	metadata := map[string]interface{}{
		"gateCheckId":   gateCheckID,
		"vehicleNumber": vehicleNumber,
		"driverName":    driverName,
		"intent":        intent,
	}

	var title, message string
	if intent == "ENTRY" {
		title = "Kendaraan Masuk"
		message = fmt.Sprintf("Kendaraan %s dengan supir %s memasuki area kebun", vehicleNumber, driverName)
	} else {
		title = "Kendaraan Keluar"
		message = fmt.Sprintf("Kendaraan %s dengan supir %s keluar dari area kebun", vehicleNumber, driverName)
	}

	input := &CreateNotificationInput{
		Type:              models.NotificationTypeGateCheckCreated,
		Priority:          models.NotificationPriorityMedium,
		Title:             title,
		Message:           message,
		RecipientRole:     "MANAGER",
		RelatedEntityType: "GATE_CHECK_RECORD",
		RelatedEntityID:   gateCheckID,
		ActionURL:         "/dashboard/manager/gate-logs",
		ActionLabel:       "Lihat Log",
		Metadata:          metadata,
		SenderID:          satpamID,
		SenderRole:        "SATPAM",
	}

	_, err := s.CreateNotification(ctx, input)
	return err
}

// NotifySystemAlert creates system alert notifications
func (s *NotificationService) NotifySystemAlert(ctx context.Context, alertType string, message string, severity models.NotificationPriority, targetRoles []string) error {
	metadata := map[string]interface{}{
		"alertType": alertType,
		"severity":  severity,
		"timestamp": time.Now(),
	}

	// Create notifications for each target role
	for _, role := range targetRoles {
		input := &CreateNotificationInput{
			Type:          models.NotificationTypeSystemAlert,
			Priority:      severity,
			Title:         "Peringatan Sistem",
			Message:       message,
			RecipientRole: role,
			ActionURL:     "/dashboard/system/alerts",
			ActionLabel:   "Lihat Detail",
			Metadata:      metadata,
		}

		if _, err := s.CreateNotification(ctx, input); err != nil {
			return err
		}
	}

	return nil
}

// Real-time broadcasting methods

// broadcastNotification broadcasts a new notification in real-time
func (s *NotificationService) broadcastNotification(notification *models.Notification) {
	if s.wsHandler == nil {
		return
	}

	// Direct user notification
	if notification.RecipientID != "" {
		s.wsHandler.BroadcastToUser(notification.RecipientID, "notificationReceived", notification)
	}

	// Role-based notification
	if notification.RecipientRole != "" {
		s.wsHandler.BroadcastToRole(notification.RecipientRole, "notificationReceived", notification)
	}

	// Company-wide notification
	if notification.RecipientCompanyID != "" {
		s.wsHandler.BroadcastToCompany(notification.RecipientCompanyID, "notificationReceived", notification)
	}

	// Priority-based channels
	switch notification.Priority {
	case models.NotificationPriorityCritical:
		s.wsHandler.BroadcastToChannel(wsModels.ChannelSystem, "criticalNotification", notification)
	case models.NotificationPriorityHigh:
		s.wsHandler.BroadcastToChannel(wsModels.ChannelWebDashboard, "highPriorityNotification", notification)
	}
}

// broadcastNotificationUpdate broadcasts notification status updates
func (s *NotificationService) broadcastNotificationUpdate(notification *models.Notification) {
	if s.wsHandler == nil {
		return
	}

	if notification.RecipientID != "" {
		s.wsHandler.BroadcastToUser(notification.RecipientID, "notificationUpdated", notification)
	}
}

// broadcastSummaryUpdate broadcasts notification summary updates
func (s *NotificationService) broadcastSummaryUpdate(userID string) {
	if s.wsHandler == nil {
		return
	}

	// Get updated summary
	summary, err := s.GetNotificationSummary(context.Background(), userID)
	if err != nil {
		return
	}

	s.wsHandler.BroadcastToUser(userID, "notificationSummaryUpdated", summary)
}

// Helper methods

// substituteVariables replaces placeholders in a template string with actual values
func (s *NotificationService) substituteVariables(template string, variables map[string]interface{}) string {
	result := template
	for key, value := range variables {
		placeholder := fmt.Sprintf("{{%s}}", key)
		replacement := fmt.Sprintf("%v", value)
		result = strings.ReplaceAll(result, placeholder, replacement)
	}
	return result
}

func isMissingIdempotencyColumnError(err error) bool {
	if err == nil {
		return false
	}

	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "idempotency_key") &&
		(strings.Contains(msg, "column") || strings.Contains(msg, "field")) &&
		(strings.Contains(msg, "does not exist") || strings.Contains(msg, "unknown"))
}

// Supporting types for service operations

// CreateNotificationInput represents input for creating notifications
type CreateNotificationInput struct {
	ID                 string
	Type               models.NotificationType
	Priority           models.NotificationPriority
	Title              string
	Message            string
	IdempotencyKey     string
	RecipientID        string
	RecipientRole      string
	RecipientCompanyID string
	RelatedEntityType  string
	RelatedEntityID    string
	ActionURL          string
	ActionLabel        string
	Metadata           map[string]interface{}
	SenderID           string
	SenderRole         string
	ScheduledFor       *time.Time
	ExpiresAt          *time.Time
}

// NotificationUpdates represents updates to apply to a notification
type NotificationUpdates struct {
	MarkAsRead      bool
	MarkAsDismissed bool
	MarkAsArchived  bool
	RecordClick     bool
}

// NotificationRecipients represents targeting information for notifications
type NotificationRecipients struct {
	UserID            string
	Role              string
	CompanyID         string
	RelatedEntityType string
	RelatedEntityID   string
	SenderID          string
	SenderRole        string
}

// PreferencesUpdates represents updates to notification preferences
type PreferencesUpdates struct {
	EnableWebNotifications    *bool
	EnableMobileNotifications *bool
	EnableEmailNotifications  *bool
	TypePreferences           map[string]bool
	MinimumPriority           *models.NotificationPriority
	QuietHoursStart           *string
	QuietHoursEnd             *string
	QuietHoursTimezone        *string
}

package repositories

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"gorm.io/gorm"

	"agrinovagraphql/server/internal/notifications/models"
)

// NotificationRepository handles database operations for notifications
type NotificationRepository struct {
	db *gorm.DB
}

// NewNotificationRepository creates a new notification repository
func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{
		db: db,
	}
}

// CreateNotification creates a new notification
func (r *NotificationRepository) CreateNotification(ctx context.Context, notification *models.Notification) error {
	result := r.db.WithContext(ctx).Create(notification)
	return result.Error
}

// CreateNotificationWithDeliveries creates a notification and related delivery rows in one transaction.
func (r *NotificationRepository) CreateNotificationWithDeliveries(
	ctx context.Context,
	notification *models.Notification,
	deliveries []*models.NotificationDelivery,
) error {
	createWithStrategy := func(omitIdempotencyKey bool, skipDeliveries bool) error {
		return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			createQuery := tx
			if omitIdempotencyKey {
				createQuery = createQuery.Omit("idempotency_key")
			}

			if err := createQuery.Create(notification).Error; err != nil {
				return err
			}

			if skipDeliveries || len(deliveries) == 0 {
				return nil
			}

			cleanDeliveries := make([]*models.NotificationDelivery, 0, len(deliveries))
			for _, delivery := range deliveries {
				if delivery == nil {
					continue
				}

				if strings.TrimSpace(delivery.NotificationID) == "" {
					delivery.NotificationID = notification.ID
				}
				if strings.TrimSpace(delivery.Channel) == "" {
					continue
				}
				if strings.TrimSpace(delivery.DeliveryStatus) == "" {
					delivery.DeliveryStatus = models.NotificationDeliveryStatusPending
				}

				cleanDeliveries = append(cleanDeliveries, delivery)
			}

			if len(cleanDeliveries) == 0 {
				return nil
			}

			if err := tx.Create(&cleanDeliveries).Error; err != nil {
				return err
			}

			return nil
		})
	}

	err := createWithStrategy(false, false)
	if err == nil {
		return nil
	}

	missingIdempotency := isMissingColumnError(err, "idempotency_key")
	missingDeliveryTable := isMissingTableError(err, "notification_deliveries")
	if !missingIdempotency && !missingDeliveryTable {
		return err
	}

	return createWithStrategy(missingIdempotency, missingDeliveryTable)
}

func isMissingColumnError(err error, column string) bool {
	if err == nil {
		return false
	}

	msg := strings.ToLower(err.Error())
	columnName := strings.ToLower(strings.TrimSpace(column))
	if columnName == "" {
		return false
	}

	return strings.Contains(msg, columnName) &&
		(strings.Contains(msg, "column") || strings.Contains(msg, "field")) &&
		(strings.Contains(msg, "does not exist") || strings.Contains(msg, "unknown"))
}

func isMissingTableError(err error, table string) bool {
	if err == nil {
		return false
	}

	msg := strings.ToLower(err.Error())
	tableName := strings.ToLower(strings.TrimSpace(table))
	if tableName == "" {
		return false
	}

	return strings.Contains(msg, tableName) &&
		(strings.Contains(msg, "relation") || strings.Contains(msg, "table")) &&
		(strings.Contains(msg, "does not exist") || strings.Contains(msg, "unknown"))
}

// GetNotificationByID retrieves a notification by ID
func (r *NotificationRepository) GetNotificationByID(ctx context.Context, id string) (*models.Notification, error) {
	var notification models.Notification
	result := r.db.WithContext(ctx).First(&notification, "id = ?", id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &notification, nil
}

// GetByRecipientAndIdempotencyKey retrieves a notification by recipient and idempotency key.
func (r *NotificationRepository) GetByRecipientAndIdempotencyKey(ctx context.Context, userID string, idempotencyKey string) (*models.Notification, error) {
	var notification models.Notification
	result := r.db.WithContext(ctx).
		Where("recipient_id = ? AND idempotency_key = ?", userID, idempotencyKey).
		First(&notification)
	if result.Error != nil {
		return nil, result.Error
	}
	return &notification, nil
}

// GetUserNotifications retrieves notifications for a specific user with filtering and pagination
func (r *NotificationRepository) GetUserNotifications(ctx context.Context, userID string, filter *NotificationFilter) ([]*models.Notification, error) {
	query := r.db.WithContext(ctx).Where("recipient_id = ?", userID)

	// Apply filters
	if filter != nil {
		query = r.applyFilters(query, filter)
	}

	// Apply ordering
	orderBy := "created_at DESC"
	if filter != nil && filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	query = query.Order(orderBy)

	// Apply pagination
	if filter != nil {
		if filter.Limit > 0 {
			query = query.Limit(filter.Limit)
		}
		if filter.Offset > 0 {
			query = query.Offset(filter.Offset)
		}
	}

	var notifications []*models.Notification
	result := query.Find(&notifications)
	if result.Error != nil {
		return nil, result.Error
	}

	return notifications, nil
}

// GetRoleNotifications retrieves notifications for a specific role
func (r *NotificationRepository) GetRoleNotifications(ctx context.Context, role string, filter *NotificationFilter) ([]*models.Notification, error) {
	query := r.db.WithContext(ctx).Where("recipient_role = ?", role)

	// Apply filters
	if filter != nil {
		query = r.applyFilters(query, filter)
	}

	// Apply ordering and pagination
	orderBy := "created_at DESC"
	if filter != nil && filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	query = query.Order(orderBy)

	if filter != nil {
		if filter.Limit > 0 {
			query = query.Limit(filter.Limit)
		}
		if filter.Offset > 0 {
			query = query.Offset(filter.Offset)
		}
	}

	var notifications []*models.Notification
	result := query.Find(&notifications)
	if result.Error != nil {
		return nil, result.Error
	}

	return notifications, nil
}

// GetCompanyNotifications retrieves notifications for a specific company
func (r *NotificationRepository) GetCompanyNotifications(ctx context.Context, companyID string, filter *NotificationFilter) ([]*models.Notification, error) {
	query := r.db.WithContext(ctx).Where("recipient_company_id = ?", companyID)

	// Apply filters
	if filter != nil {
		query = r.applyFilters(query, filter)
	}

	// Apply ordering and pagination
	orderBy := "created_at DESC"
	if filter != nil && filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	query = query.Order(orderBy)

	if filter != nil {
		if filter.Limit > 0 {
			query = query.Limit(filter.Limit)
		}
		if filter.Offset > 0 {
			query = query.Offset(filter.Offset)
		}
	}

	var notifications []*models.Notification
	result := query.Find(&notifications)
	if result.Error != nil {
		return nil, result.Error
	}

	return notifications, nil
}

// UpdateNotification updates a notification
func (r *NotificationRepository) UpdateNotification(ctx context.Context, notification *models.Notification) error {
	result := r.db.WithContext(ctx).Save(notification)
	return result.Error
}

// UpdateDeliveryStatus updates status for a delivery row by notification + channel.
func (r *NotificationRepository) UpdateDeliveryStatus(
	ctx context.Context,
	notificationID string,
	channel string,
	status string,
	failureReason *string,
) error {
	updates := map[string]interface{}{
		"delivery_status": status,
		"updated_at":      time.Now(),
	}

	if status == models.NotificationDeliveryStatusDelivered {
		updates["delivered_at"] = time.Now()
		updates["failure_reason"] = ""
	}

	if failureReason != nil {
		updates["failure_reason"] = *failureReason
	}

	result := r.db.WithContext(ctx).Model(&models.NotificationDelivery{}).
		Where("notification_id = ? AND channel = ?", notificationID, channel).
		Updates(updates)

	return result.Error
}

// MarkAsRead marks a notification as read
func (r *NotificationRepository) MarkAsRead(ctx context.Context, id string, userID string) error {
	now := time.Now()
	result := r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("id = ? AND recipient_id = ?", id, userID).
		Updates(map[string]interface{}{
			"status":  models.NotificationStatusRead,
			"read_at": now,
		})
	return result.Error
}

// MarkAsDismissed marks a notification as dismissed
func (r *NotificationRepository) MarkAsDismissed(ctx context.Context, id string, userID string) error {
	now := time.Now()
	result := r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("id = ? AND recipient_id = ?", id, userID).
		Updates(map[string]interface{}{
			"status":       models.NotificationStatusDismissed,
			"dismissed_at": now,
		})
	return result.Error
}

// MarkAsArchived marks a notification as archived
func (r *NotificationRepository) MarkAsArchived(ctx context.Context, id string, userID string) error {
	now := time.Now()
	result := r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("id = ? AND recipient_id = ?", id, userID).
		Updates(map[string]interface{}{
			"status":      models.NotificationStatusArchived,
			"archived_at": now,
		})
	return result.Error
}

// RecordClick records when a notification action was clicked
func (r *NotificationRepository) RecordClick(ctx context.Context, id string, userID string) error {
	now := time.Now()
	updates := map[string]interface{}{
		"clicked_at": now,
	}

	// Also mark as read if not already read
	var notification models.Notification
	if err := r.db.WithContext(ctx).First(&notification, "id = ? AND recipient_id = ?", id, userID).Error; err != nil {
		return err
	}

	if notification.Status == models.NotificationStatusUnread {
		updates["status"] = models.NotificationStatusRead
		updates["read_at"] = now
	}

	result := r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("id = ? AND recipient_id = ?", id, userID).
		Updates(updates)
	return result.Error
}

// MarkAllAsRead marks all unread notifications for a user as read
func (r *NotificationRepository) MarkAllAsRead(ctx context.Context, userID string) error {
	now := time.Now()
	result := r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("recipient_id = ? AND status = ?", userID, models.NotificationStatusUnread).
		Updates(map[string]interface{}{
			"status":  models.NotificationStatusRead,
			"read_at": now,
		})
	return result.Error
}

// ClearReadNotifications removes all read notifications for a user
func (r *NotificationRepository) ClearReadNotifications(ctx context.Context, userID string) error {
	result := r.db.WithContext(ctx).
		Where("recipient_id = ? AND status = ?", userID, models.NotificationStatusRead).
		Delete(&models.Notification{})
	return result.Error
}

// GetUnreadCount returns the count of unread notifications for a user
func (r *NotificationRepository) GetUnreadCount(ctx context.Context, userID string) (int64, error) {
	var count int64
	result := r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("recipient_id = ? AND status = ?", userID, models.NotificationStatusUnread).
		Count(&count)
	if result.Error != nil {
		return 0, result.Error
	}
	return count, nil
}

// GetNotificationSummary returns aggregated notification statistics for a user
func (r *NotificationRepository) GetNotificationSummary(ctx context.Context, userID string) (*models.NotificationSummary, error) {
	summary := &models.NotificationSummary{}

	// Get unread count
	unreadCount, err := r.GetUnreadCount(ctx, userID)
	if err != nil {
		return nil, err
	}
	summary.UnreadCount = int32(unreadCount)

	// Get high priority count
	var highPriorityCount int64
	r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("recipient_id = ? AND status = ? AND priority = ?",
			userID, models.NotificationStatusUnread, models.NotificationPriorityHigh).
		Count(&highPriorityCount)
	summary.HighPriorityCount = int32(highPriorityCount)

	// Get critical count
	var criticalCount int64
	r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("recipient_id = ? AND status = ? AND priority = ?",
			userID, models.NotificationStatusUnread, models.NotificationPriorityCritical).
		Count(&criticalCount)
	summary.CriticalCount = int32(criticalCount)

	// Get count by type
	countByType, err := r.getCountByType(ctx, userID)
	if err != nil {
		return nil, err
	}
	summary.CountByType = countByType

	// Get recent notifications (last 5)
	recent, err := r.GetUserNotifications(ctx, userID, &NotificationFilter{
		Limit:   5,
		OrderBy: "created_at DESC",
	})
	if err != nil {
		return nil, err
	}
	summary.RecentNotifications = recent

	return summary, nil
}

// DeleteExpiredNotifications removes expired notifications
func (r *NotificationRepository) DeleteExpiredNotifications(ctx context.Context) error {
	now := time.Now()
	result := r.db.WithContext(ctx).
		Where("expires_at IS NOT NULL AND expires_at < ?", now).
		Delete(&models.Notification{})
	return result.Error
}

// NotificationTemplate methods

// CreateTemplate creates a new notification template
func (r *NotificationRepository) CreateTemplate(ctx context.Context, template *models.NotificationTemplate) error {
	result := r.db.WithContext(ctx).Create(template)
	return result.Error
}

// GetTemplate retrieves a template by ID
func (r *NotificationRepository) GetTemplate(ctx context.Context, id string) (*models.NotificationTemplate, error) {
	var template models.NotificationTemplate
	result := r.db.WithContext(ctx).First(&template, "id = ?", id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &template, nil
}

// GetTemplateByName retrieves a template by name
func (r *NotificationRepository) GetTemplateByName(ctx context.Context, name string) (*models.NotificationTemplate, error) {
	var template models.NotificationTemplate
	result := r.db.WithContext(ctx).First(&template, "name = ? AND is_active = ?", name, true)
	if result.Error != nil {
		return nil, result.Error
	}
	return &template, nil
}

// GetAllTemplates retrieves all active templates
func (r *NotificationRepository) GetAllTemplates(ctx context.Context) ([]*models.NotificationTemplate, error) {
	var templates []*models.NotificationTemplate
	result := r.db.WithContext(ctx).Where("is_active = ?", true).Find(&templates)
	if result.Error != nil {
		return nil, result.Error
	}
	return templates, nil
}

// UpdateTemplate updates a notification template
func (r *NotificationRepository) UpdateTemplate(ctx context.Context, template *models.NotificationTemplate) error {
	result := r.db.WithContext(ctx).Save(template)
	return result.Error
}

// DeleteTemplate soft deletes a template
func (r *NotificationRepository) DeleteTemplate(ctx context.Context, id string) error {
	result := r.db.WithContext(ctx).Model(&models.NotificationTemplate{}).
		Where("id = ?", id).
		Update("is_active", false)
	return result.Error
}

// NotificationPreferences methods

// GetUserPreferences retrieves notification preferences for a user
func (r *NotificationRepository) GetUserPreferences(ctx context.Context, userID string) (*models.NotificationPreferences, error) {
	var preferences models.NotificationPreferences
	result := r.db.WithContext(ctx).First(&preferences, "user_id = ?", userID)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// Return default preferences
			return r.createDefaultPreferences(ctx, userID)
		}
		return nil, result.Error
	}
	return &preferences, nil
}

// UpdateUserPreferences updates notification preferences for a user
func (r *NotificationRepository) UpdateUserPreferences(ctx context.Context, preferences *models.NotificationPreferences) error {
	result := r.db.WithContext(ctx).Save(preferences)
	return result.Error
}

// Helper methods

// applyFilters applies filtering conditions to a query
func (r *NotificationRepository) applyFilters(query *gorm.DB, filter *NotificationFilter) *gorm.DB {
	if len(filter.Types) > 0 {
		query = query.Where("type IN ?", filter.Types)
	}

	if len(filter.Priorities) > 0 {
		query = query.Where("priority IN ?", filter.Priorities)
	}

	if len(filter.Statuses) > 0 {
		query = query.Where("status IN ?", filter.Statuses)
	}

	if filter.RecipientRole != "" {
		query = query.Where("recipient_role = ?", filter.RecipientRole)
	}

	if filter.RelatedEntityType != "" {
		query = query.Where("related_entity_type = ?", filter.RelatedEntityType)
	}

	if filter.CreatedAfter != nil {
		query = query.Where("created_at >= ?", *filter.CreatedAfter)
	}

	if filter.CreatedBefore != nil {
		query = query.Where("created_at <= ?", *filter.CreatedBefore)
	}

	if filter.UnreadOnly {
		query = query.Where("status = ?", models.NotificationStatusUnread)
	}

	return query
}

// getCountByType returns notification counts grouped by type
func (r *NotificationRepository) getCountByType(ctx context.Context, userID string) ([]*models.NotificationTypeCount, error) {
	var results []struct {
		Type        models.NotificationType
		Count       int
		UnreadCount int
	}

	err := r.db.WithContext(ctx).Model(&models.Notification{}).
		Select("type, COUNT(*) as count, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as unread_count", models.NotificationStatusUnread).
		Where("recipient_id = ?", userID).
		Group("type").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	var countByType []*models.NotificationTypeCount
	for _, result := range results {
		countByType = append(countByType, &models.NotificationTypeCount{
			Type:        result.Type,
			Count:       int32(result.Count),
			UnreadCount: int32(result.UnreadCount),
		})
	}

	return countByType, nil
}

// createDefaultPreferences creates default notification preferences for a user
func (r *NotificationRepository) createDefaultPreferences(ctx context.Context, userID string) (*models.NotificationPreferences, error) {
	preferences := &models.NotificationPreferences{
		UserID:                    userID,
		EnableWebNotifications:    true,
		EnableMobileNotifications: true,
		EnableEmailNotifications:  false,
		MinimumPriority:           models.NotificationPriorityLow,
		QuietHoursTimezone:        "Asia/Jakarta",
	}

	// Set default type preferences (all enabled)
	typePrefs := make(map[string]bool)
	typePrefs["HARVEST_CREATED"] = true
	typePrefs["HARVEST_APPROVAL_NEEDED"] = true
	typePrefs["HARVEST_APPROVED"] = true
	typePrefs["HARVEST_REJECTED"] = true
	typePrefs["GATE_CHECK_CREATED"] = true
	typePrefs["SYSTEM_ALERT"] = true

	jsonBytes, _ := json.Marshal(typePrefs)
	preferences.TypePreferences = string(jsonBytes)

	if err := r.db.WithContext(ctx).Create(preferences).Error; err != nil {
		return nil, err
	}

	return preferences, nil
}

// Supporting types for repository operations

// NotificationFilter represents filtering options for notifications
type NotificationFilter struct {
	Types             []models.NotificationType
	Priorities        []models.NotificationPriority
	Statuses          []models.NotificationStatus
	RecipientRole     string
	RelatedEntityType string
	CreatedAfter      *time.Time
	CreatedBefore     *time.Time
	UnreadOnly        bool
	Limit             int
	Offset            int
	OrderBy           string
}

package resolvers

import (
	"context"
	"fmt"

	"agrinovagraphql/server/internal/graphql/domain/manager"
	"agrinovagraphql/server/internal/graphql/generated"
	"agrinovagraphql/server/internal/notifications/models"
	"agrinovagraphql/server/internal/notifications/repositories"
	notificationServices "agrinovagraphql/server/internal/notifications/services"
)

// === QUERIES ===

// Notifications returns notifications for the current user
func (r *queryResolver) Notifications(ctx context.Context, filter *generated.NotificationFilterInput, limit *int32, offset *int32, orderBy *string) ([]*models.Notification, error) {
	// Get current user ID from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Convert filter input to repository filter
	repoFilter := &repositories.NotificationFilter{}
	if filter != nil {
		if filter.Types != nil {
			for _, t := range filter.Types {
				repoFilter.Types = append(repoFilter.Types, models.NotificationType(t))
			}
		}
		if filter.Priorities != nil {
			for _, p := range filter.Priorities {
				repoFilter.Priorities = append(repoFilter.Priorities, models.NotificationPriority(p))
			}
		}
		if filter.Statuses != nil {
			for _, s := range filter.Statuses {
				repoFilter.Statuses = append(repoFilter.Statuses, models.NotificationStatus(s))
			}
		}
		if filter.RecipientRole != nil {
			repoFilter.RecipientRole = *filter.RecipientRole
		}
		if filter.RelatedEntityType != nil {
			repoFilter.RelatedEntityType = *filter.RelatedEntityType
		}
		if filter.CreatedAfter != nil {
			repoFilter.CreatedAfter = filter.CreatedAfter
		}
		if filter.CreatedBefore != nil {
			repoFilter.CreatedBefore = filter.CreatedBefore
		}
		if filter.UnreadOnly != nil {
			repoFilter.UnreadOnly = *filter.UnreadOnly
		}
	}

	// Set pagination
	if limit != nil {
		repoFilter.Limit = int(*limit)
	} else {
		repoFilter.Limit = 20 // Default limit
	}
	if offset != nil {
		repoFilter.Offset = int(*offset)
	}
	if orderBy != nil {
		repoFilter.OrderBy = *orderBy
	}

	// Get notifications from service
	notifications, err := r.NotificationService.GetUserNotifications(ctx, userID, repoFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to get notifications: %w", err)
	}

	return notifications, nil
}

// Notification returns a specific notification by ID
func (r *queryResolver) Notification(ctx context.Context, id string) (*models.Notification, error) {
	// Get current user ID from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Get notification
	notification, err := r.NotificationService.GetNotificationByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get notification: %w", err)
	}

	// Check if user is authorized to view this notification
	if notification.RecipientID != userID {
		// TODO: Add check for admin role or if user has access to recipient's company/role
		return nil, fmt.Errorf("unauthorized to view this notification")
	}

	return notification, nil
}

// UnreadNotificationCount returns the count of unread notifications
func (r *queryResolver) UnreadNotificationCount(ctx context.Context) (int32, error) {
	// Get current user ID from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return 0, fmt.Errorf("authentication required: %w", err)
	}

	// Get unread count
	count, err := r.NotificationService.GetUnreadCount(ctx, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to get unread count: %w", err)
	}

	return int32(count), nil
}

// NotificationPreferences returns notification preferences for the current user
func (r *queryResolver) NotificationPreferences(ctx context.Context) (*models.NotificationPreferences, error) {
	// Get current user ID from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Get preferences
	prefs, err := r.NotificationService.GetUserPreferences(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get notification preferences: %w", err)
	}

	return prefs, nil
}

// NotificationTemplates returns all notification templates (admin only)
func (r *queryResolver) NotificationTemplates(ctx context.Context) ([]*models.NotificationTemplate, error) {
	// TODO: Add admin check

	// Get templates
	templates, err := r.NotificationService.GetAllTemplates(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get notification templates: %w", err)
	}

	return templates, nil
}

// NotificationTemplate returns a specific notification template
func (r *queryResolver) NotificationTemplate(ctx context.Context, id string) (*models.NotificationTemplate, error) {
	// TODO: Add admin check

	// Get template
	template, err := r.NotificationService.GetTemplate(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get template: %w", err)
	}

	return template, nil
}

// === MUTATIONS ===

// CreateNotification creates a new notification
func (r *mutationResolver) CreateNotification(ctx context.Context, input generated.CreateNotificationInput) (*models.Notification, error) {
	// Get current user ID from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Convert input to service input
	serviceInput := &notificationServices.CreateNotificationInput{
		Type:               models.NotificationType(input.Type),
		Priority:           *input.Priority,
		Title:              input.Title,
		Message:            input.Message,
		RecipientID:        "", // Default empty
		RecipientRole:      "", // Default empty
		RecipientCompanyID: "", // Default empty
		SenderID:           userID,
		SenderRole:         "", // Will be set from context if available
	}

	if input.RecipientID != nil {
		serviceInput.RecipientID = *input.RecipientID
	}
	if input.RecipientRole != nil {
		serviceInput.RecipientRole = *input.RecipientRole
	}
	if input.RecipientCompanyID != nil {
		serviceInput.RecipientCompanyID = *input.RecipientCompanyID
	}
	if input.RelatedEntityType != nil {
		serviceInput.RelatedEntityType = *input.RelatedEntityType
	}
	if input.RelatedEntityID != nil {
		serviceInput.RelatedEntityID = *input.RelatedEntityID
	}
	if input.ActionURL != nil {
		serviceInput.ActionURL = *input.ActionURL
	}
	if input.ActionLabel != nil {
		serviceInput.ActionLabel = *input.ActionLabel
	}
	if input.ScheduledFor != nil {
		serviceInput.ScheduledFor = input.ScheduledFor
	}
	if input.ExpiresAt != nil {
		serviceInput.ExpiresAt = input.ExpiresAt
	}

	// Metadata is already a map in the service input, no need to parse

	// Create notification
	notification, err := r.NotificationService.CreateNotification(ctx, serviceInput)
	if err != nil {
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}

	return notification, nil
}

// UpdateNotification updates an existing notification
func (r *mutationResolver) UpdateNotification(ctx context.Context, input generated.UpdateNotificationInput) (*models.Notification, error) {
	// Get current user ID from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Prepare updates
	updates := &notificationServices.NotificationUpdates{}
	if input.MarkAsRead != nil {
		updates.MarkAsRead = *input.MarkAsRead
	}
	if input.MarkAsDismissed != nil {
		updates.MarkAsDismissed = *input.MarkAsDismissed
	}
	if input.MarkAsArchived != nil {
		updates.MarkAsArchived = *input.MarkAsArchived
	}

	// Update notification
	notification, err := r.NotificationService.UpdateNotificationStatus(ctx, input.ID, userID, updates)
	if err != nil {
		return nil, fmt.Errorf("failed to update notification: %w", err)
	}

	return notification, nil
}

// MarkNotificationAsRead marks a notification as read
func (r *mutationResolver) MarkNotificationAsRead(ctx context.Context, id string) (*models.Notification, error) {
	// Get current user from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Mark as read
	notification, err := r.NotificationService.MarkAsRead(ctx, id, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to mark notification as read: %w", err)
	}

	return notification, nil
}

// DismissNotification marks a notification as dismissed
func (r *mutationResolver) DismissNotification(ctx context.Context, id string) (*models.Notification, error) {
	// Get current user from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Dismiss notification
	notification, err := r.NotificationService.DismissNotification(ctx, id, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to dismiss notification: %w", err)
	}

	return notification, nil
}

// ArchiveNotification marks a notification as archived
func (r *mutationResolver) ArchiveNotification(ctx context.Context, id string) (*models.Notification, error) {
	// Get current user from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Archive notification
	notification, err := r.NotificationService.ArchiveNotification(ctx, id, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to archive notification: %w", err)
	}

	return notification, nil
}

// MarkAllNotificationsAsRead marks all notifications as read for the current user
func (r *mutationResolver) MarkAllNotificationsAsRead(ctx context.Context) (bool, error) {
	// Get current user from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return false, fmt.Errorf("authentication required: %w", err)
	}

	// Mark all as read
	if err := r.NotificationService.MarkAllAsRead(ctx, userID); err != nil {
		return false, fmt.Errorf("failed to mark all notifications as read: %w", err)
	}

	return true, nil
}

// ClearReadNotifications removes all read notifications for the current user
func (r *mutationResolver) ClearReadNotifications(ctx context.Context) (bool, error) {
	// Get current user from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return false, fmt.Errorf("authentication required: %w", err)
	}

	// Clear read notifications
	if err := r.NotificationService.ClearReadNotifications(ctx, userID); err != nil {
		return false, fmt.Errorf("failed to clear read notifications: %w", err)
	}

	return true, nil
}

// UpdateNotificationPreferences updates notification preferences for the current user
func (r *mutationResolver) UpdateNotificationPreferences(ctx context.Context, input generated.UpdateNotificationPreferencesInput) (*models.NotificationPreferences, error) {
	// Get current user ID from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Prepare updates
	updates := &notificationServices.PreferencesUpdates{}
	if input.EnableWebNotifications != nil {
		updates.EnableWebNotifications = input.EnableWebNotifications
	}
	if input.EnableMobileNotifications != nil {
		updates.EnableMobileNotifications = input.EnableMobileNotifications
	}
	if input.EnableEmailNotifications != nil {
		updates.EnableEmailNotifications = input.EnableEmailNotifications
	}
	if input.MinimumPriority != nil {
		priority := models.NotificationPriority(*input.MinimumPriority)
		updates.MinimumPriority = &priority
	}
	if input.QuietHoursStart != nil {
		updates.QuietHoursStart = input.QuietHoursStart
	}
	if input.QuietHoursEnd != nil {
		updates.QuietHoursEnd = input.QuietHoursEnd
	}
	if input.QuietHoursTimezone != nil {
		updates.QuietHoursTimezone = input.QuietHoursTimezone
	}

	// Type preferences handling - skip for now as it's a JSON string

	// Update preferences
	prefs, err := r.NotificationService.UpdateUserPreferences(ctx, userID, updates)
	if err != nil {
		return nil, fmt.Errorf("failed to update notification preferences: %w", err)
	}

	return prefs, nil
}

// CreateNotificationTemplate creates a new notification template (admin only)
func (r *mutationResolver) CreateNotificationTemplate(ctx context.Context, input generated.CreateNotificationTemplateInput) (*models.NotificationTemplate, error) {
	// TODO: Add admin check

	// Create template model
	template := &models.NotificationTemplate{
		Name:            input.Name,
		Type:            models.NotificationType(input.Type),
		Priority:        models.NotificationPriority(input.Priority),
		TitleTemplate:   input.TitleTemplate,
		MessageTemplate: input.MessageTemplate,
		IsActive:        true,
	}

	if input.ActionURL != nil {
		template.ActionURL = *input.ActionURL
	}
	if input.ActionLabel != nil {
		template.ActionLabel = *input.ActionLabel
	}
	if input.DefaultMetadata != nil {
		template.DefaultMetadata = *input.DefaultMetadata
	}

	// Save template
	if err := r.NotificationService.CreateTemplate(ctx, template); err != nil {
		return nil, fmt.Errorf("failed to create template: %w", err)
	}

	return template, nil
}

// UpdateNotificationTemplate updates a notification template (admin only)
func (r *mutationResolver) UpdateNotificationTemplate(ctx context.Context, id string, input generated.CreateNotificationTemplateInput) (*models.NotificationTemplate, error) {
	// TODO: Add admin check

	// Get existing template
	template, err := r.NotificationService.GetTemplate(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get template: %w", err)
	}

	// Update fields
	template.Name = input.Name
	template.Type = models.NotificationType(input.Type)
	template.Priority = models.NotificationPriority(input.Priority)
	template.TitleTemplate = input.TitleTemplate
	template.MessageTemplate = input.MessageTemplate

	if input.ActionURL != nil {
		template.ActionURL = *input.ActionURL
	}
	if input.ActionLabel != nil {
		template.ActionLabel = *input.ActionLabel
	}
	if input.DefaultMetadata != nil {
		template.DefaultMetadata = *input.DefaultMetadata
	}

	// Save template
	if err := r.NotificationService.UpdateTemplate(ctx, template); err != nil {
		return nil, fmt.Errorf("failed to update template: %w", err)
	}

	return template, nil
}

// DeleteNotificationTemplate deletes a notification template (admin only)
func (r *mutationResolver) DeleteNotificationTemplate(ctx context.Context, id string) (bool, error) {
	// TODO: Add admin check

	// Delete template
	if err := r.NotificationService.DeleteTemplate(ctx, id); err != nil {
		return false, fmt.Errorf("failed to delete template: %w", err)
	}

	return true, nil
}

// TriggerManagerDailySummary manually triggers a daily summary notification for the current manager
// This sends YESTERDAY's data - useful for testing the notification flow
func (r *mutationResolver) TriggerManagerDailySummary(ctx context.Context) (*manager.ManagerDailySummaryResult, error) {
	// Get current user ID from context
	userID, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return &manager.ManagerDailySummaryResult{
			Success:           false,
			NotificationsSent: 0,
			ErrorMessage:      strPtr(fmt.Sprintf("authentication required: %v", err)),
		}, nil
	}

	// Check if manager notification service is available
	if r.ManagerNotificationService == nil {
		return &manager.ManagerDailySummaryResult{
			Success:           false,
			NotificationsSent: 0,
			ErrorMessage:      strPtr("Manager notification service not configured"),
		}, nil
	}

	// Generate summary data
	summaryData, err := r.ManagerNotificationService.GenerateDailySummary(ctx, userID)
	if err != nil {
		return &manager.ManagerDailySummaryResult{
			Success:           false,
			NotificationsSent: 0,
			ErrorMessage:      strPtr(fmt.Sprintf("failed to generate summary: %v", err)),
		}, nil
	}

	// Send notification
	if err := r.ManagerNotificationService.SendDailySummary(ctx, userID); err != nil {
		return &manager.ManagerDailySummaryResult{
			Success:           false,
			NotificationsSent: 0,
			SummaryData:       convertToGeneratedSummaryData(summaryData),
			ErrorMessage:      strPtr(fmt.Sprintf("failed to send notification: %v", err)),
		}, nil
	}

	return &manager.ManagerDailySummaryResult{
		Success:           true,
		NotificationsSent: 1,
		SummaryData:       convertToGeneratedSummaryData(summaryData),
		ErrorMessage:      nil,
	}, nil
}

// convertToGeneratedSummaryData converts internal summary data to GraphQL generated type
func convertToGeneratedSummaryData(data *notificationServices.ManagerDailySummaryData) *manager.ManagerDailySummaryData {
	if data == nil {
		return nil
	}

	return &manager.ManagerDailySummaryData{
		DateLabel:              data.DateLabel,
		SummaryDate:            data.SummaryDate,
		YesterdayProduction:    data.YesterdayProduction,
		WeeklyProduction:       data.WeeklyProduction,
		MonthlyTarget:          data.MonthlyTarget,
		TargetAchievement:      data.TargetAchievement,
		PendingApprovals:       int32(data.PendingApprovals),
		ActiveMandors:          int32(data.ActiveMandors),
		TotalMandors:           int32(data.TotalMandors),
		TopPerformerName:       data.TopPerformerName,
		TopPerformerProduction: data.TopPerformerProduction,
		AlertCount:             int32(data.AlertCount),
		Alerts:                 data.Alerts,
	}
}

// strPtr returns a pointer to the given string
func strPtr(s string) *string {
	return &s
}

// === SUBSCRIPTIONS ===

// NotificationReceived subscribes to new notifications for the current user
func (r *subscriptionResolver) NotificationReceived(ctx context.Context) (<-chan *models.Notification, error) {
	// Get current user from context
	_, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Create a channel for notifications
	ch := make(chan *models.Notification, 100)

	// Register with WebSocket handler for user-specific notifications
	// This would integrate with the existing WebSocket subscription system
	// For now, we'll return the channel

	go func() {
		defer close(ch)
		// This would listen for WebSocket events and forward to the channel
		// Implementation would depend on your WebSocket subscription mechanism
		<-ctx.Done()
	}()

	return ch, nil
}

// NotificationUpdated subscribes to notification status changes
func (r *subscriptionResolver) NotificationUpdated(ctx context.Context) (<-chan *models.Notification, error) {
	// Get current user from context
	_, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Create a channel for notification updates
	ch := make(chan *models.Notification, 100)

	go func() {
		defer close(ch)
		// This would listen for WebSocket events and forward to the channel
		<-ctx.Done()
	}()

	return ch, nil
}

// NotificationSummaryUpdated subscribes to notification summary changes
func (r *subscriptionResolver) NotificationSummaryUpdated(ctx context.Context) (<-chan *models.NotificationSummary, error) {
	// Get current user from context
	_, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Create a channel for summary updates
	ch := make(chan *models.NotificationSummary, 100)

	go func() {
		defer close(ch)
		// This would listen for WebSocket events and forward to the channel
		<-ctx.Done()
	}()

	return ch, nil
}

// === HELPER METHODS ===

// getUserIDFromContext gets the current authenticated user ID from context
func (r *Resolver) getUserIDFromContext(ctx context.Context) (string, error) {
	// First try to get user_id directly from context
	userID := ctx.Value("user_id")
	if userID != nil {
		userIDStr, ok := userID.(string)
		if ok {
			return userIDStr, nil
		}
	}

	// If not found, try to get it from HTTP context (for GraphQL wrapped in Gin)
	httpContext := ctx.Value("http")
	if httpContext != nil {
		httpMap, ok := httpContext.(map[string]interface{})
		if ok {
			_, ok := httpMap["request"]
			if ok {
				// Could extract from request headers or other context if needed
				return "", fmt.Errorf("user not authenticated")
			}
		}
	}

	return "", fmt.Errorf("user not authenticated")
}

// hasAdminRole checks if user has admin role
func (r *Resolver) hasAdminRole(role string) bool {
	return role == "SUPER_ADMIN" || role == "COMPANY_ADMIN"
}

// getStringValue safely gets string value from pointer
func getStringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// CriticalNotifications subscribes to critical notifications
func (r *subscriptionResolver) CriticalNotifications(ctx context.Context) (<-chan *models.Notification, error) {
	// Get current user from context
	_, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Create a channel for critical notifications
	ch := make(chan *models.Notification, 100)

	go func() {
		defer close(ch)
		// This would listen for WebSocket events and forward to the channel
		<-ctx.Done()
	}()

	return ch, nil
}

// HighPriorityNotifications subscribes to high priority notifications
func (r *subscriptionResolver) HighPriorityNotifications(ctx context.Context) (<-chan *models.Notification, error) {
	// Get current user from context
	_, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Create a channel for high priority notifications
	ch := make(chan *models.Notification, 100)

	go func() {
		defer close(ch)
		// This would listen for WebSocket events and forward to the channel
		<-ctx.Done()
	}()

	return ch, nil
}

// RoleNotifications subscribes to notifications for a specific role
func (r *subscriptionResolver) RoleNotifications(ctx context.Context, role string) (<-chan *models.Notification, error) {
	// Get current user from context
	_, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Create a channel for role notifications
	ch := make(chan *models.Notification, 100)

	go func() {
		defer close(ch)
		// This would listen for WebSocket events and forward to the channel
		<-ctx.Done()
	}()

	return ch, nil
}

// TypeNotifications subscribes to notifications of specific types
func (r *subscriptionResolver) TypeNotifications(ctx context.Context, types []models.NotificationType) (<-chan *models.Notification, error) {
	// Get current user from context
	_, err := r.getUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication required: %w", err)
	}

	// Create a channel for type notifications
	ch := make(chan *models.Notification, 100)

	go func() {
		defer close(ch)
		// This would listen for WebSocket events and forward to the channel
		<-ctx.Done()
	}()

	return ch, nil
}

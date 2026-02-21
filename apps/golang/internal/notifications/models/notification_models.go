package models

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// NotificationType represents the type of notification
type NotificationType string

const (
	// Harvest workflow notifications
	NotificationTypeHarvestCreated        NotificationType = "HARVEST_CREATED"
	NotificationTypeHarvestApprovalNeeded NotificationType = "HARVEST_APPROVAL_NEEDED"
	NotificationTypeHarvestApproved       NotificationType = "HARVEST_APPROVED"
	NotificationTypeHarvestRejected       NotificationType = "HARVEST_REJECTED"
	NotificationTypeHighVolumeHarvest     NotificationType = "HIGH_VOLUME_HARVEST"
	NotificationTypeHighValueHarvest      NotificationType = "HIGH_VALUE_HARVEST"

	// Management notifications
	NotificationTypeHarvestSummaryDaily  NotificationType = "HARVEST_SUMMARY_DAILY"
	NotificationTypeHarvestSummaryWeekly NotificationType = "HARVEST_SUMMARY_WEEKLY"
	NotificationTypeProductionMilestone  NotificationType = "PRODUCTION_MILESTONE"
	NotificationTypeQualityAlert         NotificationType = "QUALITY_ALERT"
	NotificationTypeEstatePerformance    NotificationType = "ESTATE_PERFORMANCE"
	NotificationTypeCompanyPerformance   NotificationType = "COMPANY_PERFORMANCE"
	NotificationTypeCriticalEscalation   NotificationType = "CRITICAL_ESCALATION"

	// Gate check notifications
	NotificationTypeGateCheckCreated   NotificationType = "GATE_CHECK_CREATED"
	NotificationTypeGateCheckCompleted NotificationType = "GATE_CHECK_COMPLETED"
	NotificationTypeGateCheckAlert     NotificationType = "GATE_CHECK_ALERT"

	// System notifications
	NotificationTypeSystemAlert      NotificationType = "SYSTEM_ALERT"
	NotificationTypeUserStatusChange NotificationType = "USER_STATUS_CHANGE"
	NotificationTypeCompanyUpdate    NotificationType = "COMPANY_UPDATE"

	// PKS Integration notifications
	NotificationTypePKSDataReceived NotificationType = "PKS_DATA_RECEIVED"
	NotificationTypePKSDataSync     NotificationType = "PKS_DATA_SYNC"

	// Security and compliance notifications
	NotificationTypeSecurityAlert   NotificationType = "SECURITY_ALERT"
	NotificationTypeComplianceAlert NotificationType = "COMPLIANCE_ALERT"
	NotificationTypeDataIntegrity   NotificationType = "DATA_INTEGRITY"
)

// NotificationPriority represents the urgency level of a notification
type NotificationPriority string

const (
	NotificationPriorityLow      NotificationPriority = "LOW"
	NotificationPriorityMedium   NotificationPriority = "MEDIUM"
	NotificationPriorityHigh     NotificationPriority = "HIGH"
	NotificationPriorityCritical NotificationPriority = "CRITICAL"
)

// NotificationStatus represents the current status of a notification
type NotificationStatus string

const (
	NotificationStatusUnread    NotificationStatus = "UNREAD"
	NotificationStatusRead      NotificationStatus = "READ"
	NotificationStatusDismissed NotificationStatus = "DISMISSED"
	NotificationStatusArchived  NotificationStatus = "ARCHIVED"
)

// Delivery channel constants
const (
	NotificationDeliveryChannelWeb    = "WEB"
	NotificationDeliveryChannelMobile = "MOBILE"
	NotificationDeliveryChannelEmail  = "EMAIL"
)

// Delivery status constants
const (
	NotificationDeliveryStatusPending   = "PENDING"
	NotificationDeliveryStatusDelivered = "DELIVERED"
	NotificationDeliveryStatusFailed    = "FAILED"
)

// Notification represents a system notification
type Notification struct {
	ID       string               `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Type     NotificationType     `gorm:"type:varchar(50);not null;index" json:"type"`
	Priority NotificationPriority `gorm:"type:varchar(20);not null;default:'MEDIUM'" json:"priority"`
	Status   NotificationStatus   `gorm:"type:varchar(20);not null;default:'UNREAD'" json:"status"`
	Title    string               `gorm:"type:varchar(255);not null" json:"title"`
	Message  string               `gorm:"type:text;not null" json:"message"`

	// Recipients and targeting
	RecipientID        string `gorm:"type:varchar(36);index" json:"recipientId"`
	RecipientRole      string `gorm:"type:varchar(50);index" json:"recipientRole,omitempty"`
	RecipientCompanyID string `gorm:"type:varchar(36);index" json:"recipientCompanyId,omitempty"`

	// Related entity information
	RelatedEntityType string `gorm:"type:varchar(50)" json:"relatedEntityType,omitempty"`
	RelatedEntityID   string `gorm:"type:varchar(36)" json:"relatedEntityId,omitempty"`

	// Action information
	ActionURL   string `gorm:"type:varchar(500)" json:"actionUrl,omitempty"`
	ActionLabel string `gorm:"type:varchar(100)" json:"actionLabel,omitempty"`

	// Metadata for rich notifications
	Metadata string `gorm:"type:json" json:"metadata,omitempty"`

	// Sender information
	SenderID   string `gorm:"type:varchar(36)" json:"senderId,omitempty"`
	SenderRole string `gorm:"type:varchar(50)" json:"senderRole,omitempty"`

	// Idempotency to prevent duplicate notifications for retried events
	IdempotencyKey string `gorm:"type:varchar(191);index" json:"idempotencyKey,omitempty"`

	// Scheduling
	ScheduledFor *time.Time `gorm:"index" json:"scheduledFor,omitempty"`
	ExpiresAt    *time.Time `gorm:"index" json:"expiresAt,omitempty"`

	// Interaction tracking
	ReadAt      *time.Time `json:"readAt,omitempty"`
	DismissedAt *time.Time `json:"dismissedAt,omitempty"`
	ArchivedAt  *time.Time `json:"archivedAt,omitempty"`
	ClickedAt   *time.Time `json:"clickedAt,omitempty"`

	// Standard timestamps
	CreatedAt time.Time      `gorm:"index" json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deletedAt,omitempty"`
}

// NotificationTemplate represents a reusable notification template
type NotificationTemplate struct {
	ID              string               `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name            string               `gorm:"type:varchar(100);not null;unique" json:"name"`
	Type            NotificationType     `gorm:"type:varchar(50);not null" json:"type"`
	Priority        NotificationPriority `gorm:"type:varchar(20);not null;default:'MEDIUM'" json:"priority"`
	TitleTemplate   string               `gorm:"type:varchar(255);not null" json:"titleTemplate"`
	MessageTemplate string               `gorm:"type:text;not null" json:"messageTemplate"`
	ActionURL       string               `gorm:"type:varchar(500)" json:"actionUrl,omitempty"`
	ActionLabel     string               `gorm:"type:varchar(100)" json:"actionLabel,omitempty"`
	DefaultMetadata string               `gorm:"type:json" json:"defaultMetadata,omitempty"`
	IsActive        bool                 `gorm:"not null;default:true" json:"isActive"`

	CreatedAt time.Time `gorm:"index" json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// NotificationPreferences represents user preferences for notifications
type NotificationPreferences struct {
	ID     string `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID string `gorm:"type:varchar(36);not null;unique" json:"userId"`

	// Channel preferences
	EnableWebNotifications    bool `gorm:"not null;default:true" json:"enableWebNotifications"`
	EnableMobileNotifications bool `gorm:"not null;default:true" json:"enableMobileNotifications"`
	EnableEmailNotifications  bool `gorm:"not null;default:false" json:"enableEmailNotifications"`

	// Type-specific preferences (JSON object with NotificationType as keys)
	TypePreferences string `gorm:"type:json" json:"typePreferences"`

	// Priority filtering
	MinimumPriority NotificationPriority `gorm:"type:varchar(20);not null;default:'LOW'" json:"minimumPriority"`

	// Quiet hours
	QuietHoursStart    string `gorm:"type:varchar(5)" json:"quietHoursStart,omitempty"` // HH:MM format
	QuietHoursEnd      string `gorm:"type:varchar(5)" json:"quietHoursEnd,omitempty"`   // HH:MM format
	QuietHoursTimezone string `gorm:"type:varchar(50);default:'Asia/Jakarta'" json:"quietHoursTimezone"`

	CreatedAt time.Time `gorm:"index" json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// NotificationSummary provides aggregated notification statistics
type NotificationSummary struct {
	UnreadCount         int32                    `json:"unreadCount"`
	HighPriorityCount   int32                    `json:"highPriorityCount"`
	CriticalCount       int32                    `json:"criticalCount"`
	CountByType         []*NotificationTypeCount `json:"countByType"`
	RecentNotifications []*Notification          `json:"recentNotifications"`
}

// NotificationTypeCount represents count for a specific notification type
type NotificationTypeCount struct {
	Type        NotificationType `json:"type"`
	Count       int32            `json:"count"`
	UnreadCount int32            `json:"unreadCount"`
}

// NotificationDelivery tracks notification delivery status across channels
type NotificationDelivery struct {
	ID             string     `gorm:"primaryKey;type:varchar(36)" json:"id"`
	NotificationID string     `gorm:"type:varchar(36);not null;index;index:idx_notification_delivery_channel,priority:1" json:"notificationId"`
	Channel        string     `gorm:"type:varchar(20);not null;index:idx_notification_delivery_channel,priority:2" json:"channel"` // WEB, MOBILE, EMAIL
	DeliveryStatus string     `gorm:"type:varchar(20);not null;default:'PENDING'" json:"deliveryStatus"`                           // PENDING, DELIVERED, FAILED
	DeliveredAt    *time.Time `json:"deliveredAt,omitempty"`
	FailureReason  string     `gorm:"type:text" json:"failureReason,omitempty"`
	RetryCount     int        `gorm:"not null;default:0" json:"retryCount"`

	CreatedAt time.Time `gorm:"index" json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// Foreign key relationship
	Notification Notification `gorm:"foreignKey:NotificationID;constraint:OnDelete:CASCADE" json:"notification,omitempty"`
}

// BeforeCreate hook to generate UUID for notifications
func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == "" {
		n.ID = generateUUID()
	}
	return nil
}

// BeforeCreate hook to generate UUID for notification templates
func (nt *NotificationTemplate) BeforeCreate(tx *gorm.DB) error {
	if nt.ID == "" {
		nt.ID = generateUUID()
	}
	return nil
}

// BeforeCreate hook to generate UUID for notification preferences
func (np *NotificationPreferences) BeforeCreate(tx *gorm.DB) error {
	if np.ID == "" {
		np.ID = generateUUID()
	}
	return nil
}

// BeforeCreate hook to generate UUID for notification delivery
func (nd *NotificationDelivery) BeforeCreate(tx *gorm.DB) error {
	if nd.ID == "" {
		nd.ID = generateUUID()
	}
	return nil
}

// Helper function to generate UUID (you might want to use a proper UUID library)
func generateUUID() string {
	// This is a simple UUID generator - in production use a proper UUID library
	// like google/uuid or gofrs/uuid
	return "notif-" + time.Now().Format("20060102150405") + "-" +
		string(rune(time.Now().UnixNano()%1000000))
}

// Methods for Notification model

// MarkAsRead marks the notification as read
func (n *Notification) MarkAsRead() {
	now := time.Now()
	n.Status = NotificationStatusRead
	n.ReadAt = &now
}

// MarkAsDismissed marks the notification as dismissed
func (n *Notification) MarkAsDismissed() {
	now := time.Now()
	n.Status = NotificationStatusDismissed
	n.DismissedAt = &now
}

// MarkAsArchived marks the notification as archived
func (n *Notification) MarkAsArchived() {
	now := time.Now()
	n.Status = NotificationStatusArchived
	n.ArchivedAt = &now
}

// MarkAsClicked records when a notification action was clicked
func (n *Notification) MarkAsClicked() {
	now := time.Now()
	n.ClickedAt = &now
	// Also mark as read if not already read
	if n.Status == NotificationStatusUnread {
		n.MarkAsRead()
	}
}

// IsExpired checks if the notification has expired
func (n *Notification) IsExpired() bool {
	return n.ExpiresAt != nil && time.Now().After(*n.ExpiresAt)
}

// ShouldBeDelivered checks if notification should be delivered based on scheduling
func (n *Notification) ShouldBeDelivered() bool {
	if n.IsExpired() {
		return false
	}
	if n.ScheduledFor != nil && time.Now().Before(*n.ScheduledFor) {
		return false
	}
	return true
}

// GetMetadataMap parses JSON metadata into a map
func (n *Notification) GetMetadataMap() (map[string]interface{}, error) {
	if n.Metadata == "" {
		return make(map[string]interface{}), nil
	}

	var metadata map[string]interface{}
	err := json.Unmarshal([]byte(n.Metadata), &metadata)
	return metadata, err
}

// SetMetadataMap converts a map to JSON metadata
func (n *Notification) SetMetadataMap(metadata map[string]interface{}) error {
	if len(metadata) == 0 {
		n.Metadata = ""
		return nil
	}

	jsonBytes, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	n.Metadata = string(jsonBytes)
	return nil
}

// ManagerDailySummaryData represents the data for a manager's daily summary notification
type ManagerDailySummaryData struct {
	DateLabel              string    `json:"dateLabel"`
	SummaryDate            time.Time `json:"summaryDate"`
	YesterdayProduction    float64   `json:"yesterdayProduction"`
	WeeklyProduction       float64   `json:"weeklyProduction"`
	MonthlyTarget          float64   `json:"monthlyTarget"`
	TargetAchievement      float64   `json:"targetAchievement"`
	PendingApprovals       int32     `json:"pendingApprovals"`
	ActiveMandors          int32     `json:"activeMandors"`
	TotalMandors           int32     `json:"totalMandors"`
	TopPerformerName       string    `json:"topPerformerName"`
	TopPerformerProduction float64   `json:"topPerformerProduction"`
	AlertCount             int32     `json:"alertCount"`
	Alerts                 []string  `json:"alerts"`
}

// ManagerDailySummaryResult represents the result of triggering a manager daily summary
type ManagerDailySummaryResult struct {
	Success           bool                     `json:"success"`
	NotificationsSent int32                    `json:"notificationsSent"`
	SummaryData       *ManagerDailySummaryData `json:"summaryData,omitempty"`
	ErrorMessage      *string                  `json:"errorMessage,omitempty"`
}

package fcm

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

// FCMPayload represents the data sent in FCM notifications
type FCMPayload struct {
	Type           string `json:"type"`     // HARVEST_APPROVAL_NEEDED, HARVEST_STATUS_UPDATE
	PanenID        string `json:"panen_id"` // Harvest record ID
	Action         string `json:"action"`   // CREATED, APPROVED, REJECTED
	Title          string `json:"title"`    // Notification title
	Body           string `json:"body"`     // Notification body
	MandorName     string `json:"mandor_name,omitempty"`
	BlockName      string `json:"block_name,omitempty"`
	Weight         string `json:"weight,omitempty"`
	RejectedReason string `json:"rejected_reason,omitempty"`
	ClickAction    string `json:"click_action"` // Deep link path
}

// FCMProvider handles Firebase Cloud Messaging operations
type FCMProvider struct {
	client       *messaging.Client
	maxRetries   int
	retryBackoff time.Duration
}

// NewFCMProvider creates a new FCM provider instance
func NewFCMProvider(credentialsPath string) (*FCMProvider, error) {
	ctx := context.Background()
	opt := option.WithCredentialsFile(credentialsPath)

	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		return nil, fmt.Errorf("failed to create firebase app: %w", err)
	}

	client, err := app.Messaging(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create messaging client: %w", err)
	}

	return &FCMProvider{
		client:       client,
		maxRetries:   3,
		retryBackoff: 1 * time.Second,
	}, nil
}

// NewFCMProviderWithJSON creates FCM provider from JSON credentials content
func NewFCMProviderWithJSON(credentialsJSON []byte) (*FCMProvider, error) {
	ctx := context.Background()
	opt := option.WithCredentialsJSON(credentialsJSON)

	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		return nil, fmt.Errorf("failed to create firebase app: %w", err)
	}

	client, err := app.Messaging(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create messaging client: %w", err)
	}

	return &FCMProvider{
		client:       client,
		maxRetries:   3,
		retryBackoff: 1 * time.Second,
	}, nil
}

// SendToTokens sends notification to multiple FCM tokens with retry logic
func (p *FCMProvider) SendToTokens(ctx context.Context, tokens []string, payload FCMPayload) (*SendResult, error) {
	if len(tokens) == 0 {
		return &SendResult{SuccessCount: 0, FailureCount: 0}, nil
	}

	// Build data map, excluding empty values
	data := make(map[string]string)
	data["type"] = payload.Type
	data["panen_id"] = payload.PanenID
	data["action"] = payload.Action
	data["click_action"] = payload.ClickAction

	if payload.MandorName != "" {
		data["mandor_name"] = payload.MandorName
	}
	if payload.BlockName != "" {
		data["block_name"] = payload.BlockName
	}
	if payload.Weight != "" {
		data["weight"] = payload.Weight
	}
	if payload.RejectedReason != "" {
		data["rejected_reason"] = payload.RejectedReason
	}

	message := &messaging.MulticastMessage{
		Tokens: tokens,
		Notification: &messaging.Notification{
			Title: payload.Title,
			Body:  payload.Body,
		},
		Data: data,
		Android: &messaging.AndroidConfig{
			Priority: "high",
			Notification: &messaging.AndroidNotification{
				ChannelID: "harvest_notifications",
				Priority:  messaging.PriorityMax,
				Sound:     "default",
			},
		},
		APNS: &messaging.APNSConfig{
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					Sound:            "default",
					ContentAvailable: true,
				},
			},
		},
	}

	var lastErr error
	var result *SendResult

	for attempt := 0; attempt < p.maxRetries; attempt++ {
		response, err := p.client.SendEachForMulticast(ctx, message)
		if err != nil {
			lastErr = err
			log.Printf("FCM send attempt %d/%d failed: %v", attempt+1, p.maxRetries, err)
			time.Sleep(p.retryBackoff * time.Duration(attempt+1))
			continue
		}

		result = &SendResult{
			SuccessCount: response.SuccessCount,
			FailureCount: response.FailureCount,
			FailedTokens: make([]string, 0),
		}

		// Collect failed tokens for cleanup
		for i, resp := range response.Responses {
			if !resp.Success {
				result.FailedTokens = append(result.FailedTokens, tokens[i])
				if resp.Error != nil {
					log.Printf("FCM send to token failed: %v", resp.Error)
				}
			}
		}

		log.Printf("FCM notification sent: %d success, %d failure, type: %s, panen_id: %s",
			response.SuccessCount, response.FailureCount, payload.Type, payload.PanenID)

		return result, nil
	}

	return nil, fmt.Errorf("FCM send failed after %d retries: %w", p.maxRetries, lastErr)
}

// SendToToken sends notification to a single FCM token
func (p *FCMProvider) SendToToken(ctx context.Context, token string, payload FCMPayload) error {
	result, err := p.SendToTokens(ctx, []string{token}, payload)
	if err != nil {
		return err
	}
	if result.FailureCount > 0 {
		return fmt.Errorf("failed to send to token")
	}
	return nil
}

// SendResult contains the result of a multicast send operation
type SendResult struct {
	SuccessCount int
	FailureCount int
	FailedTokens []string // Tokens that failed, for cleanup
}

// PayloadBuilder helps construct FCM payloads
type PayloadBuilder struct {
	payload FCMPayload
}

// NewPayloadBuilder creates a new payload builder
func NewPayloadBuilder() *PayloadBuilder {
	return &PayloadBuilder{payload: FCMPayload{}}
}

// ForHarvestApprovalNeeded creates payload for new harvest notification
func (b *PayloadBuilder) ForHarvestApprovalNeeded(panenID, mandorName, blockName string, bunchCount int32) FCMPayload {
	return FCMPayload{
		Type:        "HARVEST_APPROVAL_NEEDED",
		PanenID:     panenID,
		Action:      "CREATED",
		Title:       "Persetujuan Panen Diperlukan",
		Body:        fmt.Sprintf("Data panen dari %s di Blok %s (%d jjg)", mandorName, normalizeBlockName(blockName), bunchCount),
		MandorName:  mandorName,
		BlockName:   blockName,
		Weight:      fmt.Sprintf("%d", bunchCount),
		ClickAction: "/asisten",
	}
}

// ForManagerHarvestApprovalNeeded creates payload for manager notification when a new harvest is submitted.
func (b *PayloadBuilder) ForManagerHarvestApprovalNeeded(panenID, mandorName, blockName string, bunchCount int32) FCMPayload {
	return FCMPayload{
		Type:        "HARVEST_APPROVAL_NEEDED",
		PanenID:     panenID,
		Action:      "CREATED",
		Title:       "Notifikasi Panen Baru",
		Body:        fmt.Sprintf("Mandor %s submit panen di Blok %s (%d jjg)", mandorName, normalizeBlockName(blockName), bunchCount),
		MandorName:  mandorName,
		BlockName:   blockName,
		Weight:      fmt.Sprintf("%d", bunchCount),
		ClickAction: "/manager",
	}
}

// ForHarvestApproved creates payload for approved harvest notification
func (b *PayloadBuilder) ForHarvestApproved(panenID, asistenName, blockName string, harvestDate string, bunchCount int32) FCMPayload {
	return FCMPayload{
		Type:        "HARVEST_STATUS_UPDATE",
		PanenID:     panenID,
		Action:      "APPROVED",
		Title:       "Data Panen Disetujui ✓",
		Body:        fmt.Sprintf("Panen di Blok %s (%d jjg, %s) telah disetujui oleh %s", normalizeBlockName(blockName), bunchCount, harvestDate, asistenName),
		BlockName:   blockName,
		ClickAction: "/mandor",
	}
}

// ForHarvestRejected creates payload for rejected harvest notification
func (b *PayloadBuilder) ForHarvestRejected(panenID, asistenName, blockName, reason string, harvestDate string, bunchCount int32) FCMPayload {
	return FCMPayload{
		Type:           "HARVEST_STATUS_UPDATE",
		PanenID:        panenID,
		Action:         "REJECTED",
		Title:          "Data Panen Ditolak ✗",
		Body:           fmt.Sprintf("Panen di Blok %s (%d jjg, %s) ditolak: %s", normalizeBlockName(blockName), bunchCount, harvestDate, reason),
		BlockName:      blockName,
		RejectedReason: reason,
		ClickAction:    "/mandor",
	}
}

func normalizeBlockName(blockName string) string {
	trimmed := strings.TrimSpace(blockName)
	if trimmed == "" {
		return "-"
	}

	lower := strings.ToLower(trimmed)
	if strings.HasPrefix(lower, "blok ") {
		return strings.TrimSpace(trimmed[5:])
	}
	if strings.HasPrefix(lower, "block ") {
		return strings.TrimSpace(trimmed[6:])
	}

	return trimmed
}

// ManagerSummaryData contains data for manager daily summary notification
type ManagerSummaryData struct {
	DateLabel              string
	YesterdayProduction    float64
	TargetAchievement      float64
	PendingApprovals       int
	ActiveMandors          int
	TotalMandors           int
	TopPerformerName       string
	TopPerformerProduction float64
	AlertCount             int
}

// ForManagerDailySummary creates payload for manager daily summary notification
// Contains YESTERDAY's data - sent at 08:00 to ensure Mandor sync completion
func (b *PayloadBuilder) ForManagerDailySummary(data ManagerSummaryData) FCMPayload {
	body := fmt.Sprintf("Produksi: %.1f ton • Target: %.1f%% • Mandor Aktif: %d/%d",
		data.YesterdayProduction,
		data.TargetAchievement,
		data.ActiveMandors,
		data.TotalMandors)

	if data.PendingApprovals > 0 {
		body += fmt.Sprintf(" • Pending: %d", data.PendingApprovals)
	}

	return FCMPayload{
		Type:        "MANAGER_DAILY_SUMMARY",
		Action:      "DAILY_SUMMARY",
		Title:       fmt.Sprintf("📊 Ringkasan %s", data.DateLabel),
		Body:        body,
		ClickAction: "/manager",
	}
}

// ForManagerPerformanceAlert creates payload for performance alert notification
func (b *PayloadBuilder) ForManagerPerformanceAlert(divisionName string, achievement float64) FCMPayload {
	return FCMPayload{
		Type:        "MANAGER_PERFORMANCE_ALERT",
		Action:      "PERFORMANCE_ALERT",
		Title:       "⚠️ Alert Performa",
		Body:        fmt.Sprintf("Divisi %s di bawah target: %.1f%% tercapai", divisionName, achievement),
		ClickAction: "/manager",
	}
}

// ForManagerTargetAchieved creates payload for target achievement notification
func (b *PayloadBuilder) ForManagerTargetAchieved(estateName string, achievement float64) FCMPayload {
	return FCMPayload{
		Type:        "MANAGER_TARGET_ACHIEVED",
		Action:      "TARGET_ACHIEVED",
		Title:       "🎉 Target Tercapai!",
		Body:        fmt.Sprintf("Estate %s mencapai target: %.1f%%", estateName, achievement),
		ClickAction: "/manager",
	}
}

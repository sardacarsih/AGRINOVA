package resolvers

import (
	"context"
	"fmt"
	"log"
	"strings"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	notificationModels "agrinovagraphql/server/internal/notifications/models"
	notificationServices "agrinovagraphql/server/internal/notifications/services"
	panenModels "agrinovagraphql/server/internal/panen/models"
	"agrinovagraphql/server/pkg/fcm"
)

type harvestCreatedBatchNotificationSummary struct {
	MandorID    string
	MandorName  string
	HarvestIDs  []string
	Blocks      []string
	blockSeen   map[string]struct{}
	TotalWeight float64
	Count       int
}

type harvestCreatedBatchFCMNotifier interface {
	NotifyMultipleMandors(ctx context.Context, mandorIDs []string, payload fcm.FCMPayload) error
}

func (r *mutationResolver) notifyAsistenHarvestCreatedBatch(
	ctx context.Context,
	records []*panenModels.HarvestRecord,
) {
	summaries := r.buildHarvestCreatedBatchNotificationSummaries(ctx, records)
	if len(summaries) == 0 {
		return
	}

	for _, summary := range summaries {
		summary := summary
		go func() {
			background := context.Background()
			recipients, err := r.resolveHarvestCreatedRecipients(background, summary.MandorID)
			if err != nil {
				log.Printf(
					"Failed to resolve harvest-created batch recipients for mandor %s: %v",
					summary.MandorID,
					err,
				)
				return
			}

			if len(recipients) == 0 {
				return
			}

			if !isNilValue(r.FCMNotificationService) {
				if notifier, ok := r.FCMNotificationService.(harvestCreatedBatchFCMNotifier); ok && !isNilValue(notifier) {
					for _, recipient := range recipients {
						payload := buildHarvestCreatedBatchFCMPayload(summary, recipient.Role)
						if err := notifier.NotifyMultipleMandors(background, []string{recipient.UserID}, payload); err != nil {
							log.Printf(
								"Failed to send harvest-created batch FCM to %s %s: %v",
								strings.ToLower(string(recipient.Role)),
								recipient.UserID,
								err,
							)
						}
					}
				}
			}

			if r.NotificationService != nil {
				for _, recipient := range recipients {
					if err := r.createHarvestCreatedBatchNotification(background, summary, recipient); err != nil {
						log.Printf(
							"Failed to create harvest-created batch notification for %s %s: %v",
							strings.ToLower(string(recipient.Role)),
							recipient.UserID,
							err,
						)
					}
				}
			}
		}()
	}
}

func (r *mutationResolver) buildHarvestCreatedBatchNotificationSummaries(
	ctx context.Context,
	records []*panenModels.HarvestRecord,
) []harvestCreatedBatchNotificationSummary {
	if len(records) == 0 {
		return nil
	}

	grouped := make(map[string]*harvestCreatedBatchNotificationSummary, len(records))
	order := make([]string, 0, len(records))

	for _, record := range records {
		if record == nil {
			continue
		}

		mandorID := strings.TrimSpace(record.MandorID)
		harvestID := strings.TrimSpace(record.ID)
		if mandorID == "" || harvestID == "" {
			continue
		}

		summary, exists := grouped[mandorID]
		if !exists {
			fallbackMandorName := ""
			if record.Mandor != nil {
				if name := strings.TrimSpace(record.Mandor.Name); name != "" {
					fallbackMandorName = name
				} else if username := strings.TrimSpace(record.Mandor.Username); username != "" {
					fallbackMandorName = username
				}
			}

			summary = &harvestCreatedBatchNotificationSummary{
				MandorID:   mandorID,
				MandorName: fallbackMandorName,
				HarvestIDs: make([]string, 0, 4),
				Blocks:     make([]string, 0, 4),
				blockSeen:  make(map[string]struct{}, 4),
			}
			grouped[mandorID] = summary
			order = append(order, mandorID)
		}

		summary.HarvestIDs = append(summary.HarvestIDs, harvestID)
		summary.TotalWeight += record.BeratTbs
		summary.Count++
		summary.addBlock(r.resolveHarvestBlockName(ctx, record))
	}

	summaries := make([]harvestCreatedBatchNotificationSummary, 0, len(order))
	for _, mandorID := range order {
		summary := grouped[mandorID]
		if summary == nil || summary.Count == 0 {
			continue
		}

		mandorName, _ := r.resolveHarvestNotificationLabels(
			ctx,
			summary.MandorID,
			"",
			summary.MandorName,
			"",
		)
		summary.MandorName = mandorName
		summaries = append(summaries, *summary)
	}

	return summaries
}

func (r *mutationResolver) createHarvestCreatedBatchNotification(
	ctx context.Context,
	summary harvestCreatedBatchNotificationSummary,
	recipient harvestNotificationRecipient,
) error {
	title, message := buildHarvestCreatedBatchNotificationContent(summary, recipient.Role)

	actionURL := "/dashboard/asisten/approval"
	actionLabel := "Review"
	if recipient.Role == auth.UserRoleManager {
		actionURL = "/dashboard/manager/approval"
	}

	metadata := map[string]interface{}{
		"harvestIds":     summary.HarvestIDs,
		"batchCount":     summary.Count,
		"blocks":         summary.Blocks,
		"totalWeight":    summary.TotalWeight,
		"batchCoalesced": true,
		"mandorId":       summary.MandorID,
		"mandorName":     summary.MandorName,
	}

	input := &notificationServices.CreateNotificationInput{
		Type:              notificationModels.NotificationTypeHarvestApprovalNeeded,
		Priority:          notificationModels.NotificationPriorityHigh,
		Title:             title,
		Message:           message,
		RecipientID:       recipient.UserID,
		RelatedEntityType: "HARVEST_RECORD",
		RelatedEntityID:   summary.HarvestIDs[0],
		ActionURL:         actionURL,
		ActionLabel:       actionLabel,
		Metadata:          metadata,
		SenderID:          summary.MandorID,
		SenderRole:        string(auth.UserRoleMandor),
		IdempotencyKey: fmt.Sprintf(
			"harvest-created-batch:%s:%s:%s:%d",
			strings.ToLower(string(recipient.Role)),
			recipient.UserID,
			summary.HarvestIDs[0],
			summary.Count,
		),
	}

	_, err := r.NotificationService.CreateNotification(ctx, input)
	return err
}

func buildHarvestCreatedBatchFCMPayload(
	summary harvestCreatedBatchNotificationSummary,
	role auth.UserRole,
) fcm.FCMPayload {
	title, message := buildHarvestCreatedBatchNotificationContent(summary, role)

	clickAction := "/asisten"
	if role == auth.UserRoleManager {
		clickAction = "/manager"
	}

	payload := fcm.FCMPayload{
		Type:        "HARVEST_APPROVAL_NEEDED",
		PanenID:     summary.HarvestIDs[0],
		Action:      "CREATED",
		Title:       title,
		Body:        message,
		MandorName:  summary.MandorName,
		BlockName:   firstHarvestBatchBlock(summary.Blocks),
		ClickAction: clickAction,
	}

	if summary.TotalWeight > 0 {
		payload.Weight = fmt.Sprintf("%.1f", summary.TotalWeight)
	}

	return payload
}

func buildHarvestCreatedBatchNotificationContent(
	summary harvestCreatedBatchNotificationSummary,
	role auth.UserRole,
) (string, string) {
	recordLabel := formatHarvestBatchRecordLabel(summary.Count)
	blockSummary := formatHarvestBatchBlockSummary(summary.Blocks)
	weightSummary := formatHarvestBatchWeight(summary.TotalWeight)

	mandorName := strings.TrimSpace(summary.MandorName)
	if mandorName == "" {
		mandorName = "Mandor"
	}

	if role == auth.UserRoleManager {
		title := "Notifikasi Panen Baru"
		message := fmt.Sprintf(
			"%s baru dari %s di %s%s memerlukan perhatian",
			capitalizeHarvestBatchRecordLabel(recordLabel),
			mandorName,
			blockSummary,
			weightSummary,
		)
		return title, message
	}

	title := "Persetujuan Panen Diperlukan"
	message := fmt.Sprintf(
		"%s baru dari %s di %s%s memerlukan persetujuan",
		capitalizeHarvestBatchRecordLabel(recordLabel),
		mandorName,
		blockSummary,
		weightSummary,
	)

	return title, message
}

func (s *harvestCreatedBatchNotificationSummary) addBlock(blockName string) {
	if s == nil {
		return
	}

	normalized := normalizeHarvestBatchBlockName(blockName)
	if normalized == "" {
		return
	}

	if _, exists := s.blockSeen[normalized]; exists {
		return
	}

	s.blockSeen[normalized] = struct{}{}
	s.Blocks = append(s.Blocks, normalized)
}

package resolvers

import (
	"context"
	"fmt"
	"log"
	"strings"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/mandor"
	notificationModels "agrinovagraphql/server/internal/notifications/models"
	notificationServices "agrinovagraphql/server/internal/notifications/services"
	"agrinovagraphql/server/pkg/fcm"
)

type harvestBatchStatus string

const (
	harvestBatchStatusApproved harvestBatchStatus = "APPROVED"
	harvestBatchStatusRejected harvestBatchStatus = "REJECTED"
)

type harvestBatchNotificationSummary struct {
	MandorID    string
	HarvestIDs  []string
	Blocks      []string
	blockSeen   map[string]struct{}
	TotalWeight float64
	Count       int
}

type harvestBatchBroadcastFCMNotifier interface {
	NotifyMultipleMandors(ctx context.Context, mandorIDs []string, payload fcm.FCMPayload) error
}

func (r *mutationResolver) notifyMandorHarvestApprovedBatch(
	ctx context.Context,
	records []*mandor.HarvestRecord,
	approverID string,
) {
	r.notifyMandorHarvestBatch(ctx, records, approverID, "", harvestBatchStatusApproved)
}

func (r *mutationResolver) notifyMandorHarvestRejectedBatch(
	ctx context.Context,
	records []*mandor.HarvestRecord,
	reason string,
	approverID string,
) {
	r.notifyMandorHarvestBatch(ctx, records, approverID, reason, harvestBatchStatusRejected)
}

func (r *mutationResolver) notifyMandorHarvestBatch(
	ctx context.Context,
	records []*mandor.HarvestRecord,
	approverID string,
	reason string,
	status harvestBatchStatus,
) {
	summaries := r.buildHarvestBatchNotificationSummaries(ctx, records)
	if len(summaries) == 0 {
		return
	}

	approverName := r.resolveApproverName(ctx, approverID)

	for _, summary := range summaries {
		summary := summary
		go func() {
			background := context.Background()

			if !isNilValue(r.FCMNotificationService) {
				if notifier, ok := r.FCMNotificationService.(harvestBatchBroadcastFCMNotifier); ok && !isNilValue(notifier) {
					payload := buildHarvestBatchFCMPayload(summary, status, approverName, reason)
					if err := notifier.NotifyMultipleMandors(background, []string{summary.MandorID}, payload); err != nil {
						log.Printf(
							"Failed to send batch %s FCM notification to mandor %s: %v",
							strings.ToLower(string(status)),
							summary.MandorID,
							err,
						)
					}
				}
			}

			if r.NotificationService != nil {
				if err := r.createMandorHarvestBatchNotification(background, summary, status, approverID, approverName, reason); err != nil {
					log.Printf(
						"Failed to create batch %s notification for mandor %s: %v",
						strings.ToLower(string(status)),
						summary.MandorID,
						err,
					)
				}
			}
		}()
	}
}

func (r *mutationResolver) buildHarvestBatchNotificationSummaries(
	ctx context.Context,
	records []*mandor.HarvestRecord,
) []harvestBatchNotificationSummary {
	if len(records) == 0 {
		return nil
	}

	grouped := make(map[string]*harvestBatchNotificationSummary, len(records))
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
			summary = &harvestBatchNotificationSummary{
				MandorID:   mandorID,
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

	summaries := make([]harvestBatchNotificationSummary, 0, len(order))
	for _, mandorID := range order {
		if summary := grouped[mandorID]; summary != nil && summary.Count > 0 {
			summaries = append(summaries, *summary)
		}
	}

	return summaries
}

func (r *mutationResolver) createMandorHarvestBatchNotification(
	ctx context.Context,
	summary harvestBatchNotificationSummary,
	status harvestBatchStatus,
	approverID string,
	approverName string,
	reason string,
) error {
	title, message := buildHarvestBatchNotificationContent(status, summary.Count, summary.Blocks, summary.TotalWeight, approverName, reason)

	notificationType := notificationModels.NotificationTypeHarvestApproved
	priority := notificationModels.NotificationPriorityMedium
	actionURL := "/dashboard/mandor/history"
	actionLabel := "Lihat Detail"

	if status == harvestBatchStatusRejected {
		notificationType = notificationModels.NotificationTypeHarvestRejected
		priority = notificationModels.NotificationPriorityHigh
		actionURL = "/dashboard/mandor/panen"
		actionLabel = "Perbaiki Data"
	}

	metadata := map[string]interface{}{
		"harvestIds":     summary.HarvestIDs,
		"batchCount":     summary.Count,
		"blocks":         summary.Blocks,
		"totalWeight":    summary.TotalWeight,
		"batchCoalesced": true,
		"approved":       status == harvestBatchStatusApproved,
	}
	if trimmedReason := strings.TrimSpace(reason); trimmedReason != "" {
		metadata["rejectedReason"] = trimmedReason
	}

	input := &notificationServices.CreateNotificationInput{
		Type:              notificationType,
		Priority:          priority,
		Title:             title,
		Message:           message,
		IdempotencyKey:    fmt.Sprintf("harvest-batch:%s:%s:%s:%d", strings.ToLower(string(status)), summary.MandorID, summary.HarvestIDs[0], summary.Count),
		RecipientID:       summary.MandorID,
		RelatedEntityType: "HARVEST_RECORD",
		RelatedEntityID:   summary.HarvestIDs[0],
		ActionURL:         actionURL,
		ActionLabel:       actionLabel,
		Metadata:          metadata,
		SenderID:          approverID,
		SenderRole:        string(auth.UserRoleAsisten),
	}

	_, err := r.NotificationService.CreateNotification(ctx, input)
	return err
}

func (s *harvestBatchNotificationSummary) addBlock(blockName string) {
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

func buildHarvestBatchFCMPayload(
	summary harvestBatchNotificationSummary,
	status harvestBatchStatus,
	approverName string,
	reason string,
) fcm.FCMPayload {
	title, message := buildHarvestBatchNotificationContent(status, summary.Count, summary.Blocks, summary.TotalWeight, approverName, reason)

	payload := fcm.FCMPayload{
		Type:        "HARVEST_STATUS_UPDATE",
		PanenID:     summary.HarvestIDs[0],
		Action:      string(status),
		Title:       title,
		Body:        message,
		BlockName:   firstHarvestBatchBlock(summary.Blocks),
		ClickAction: "/mandor",
	}

	if summary.TotalWeight > 0 {
		payload.Weight = fmt.Sprintf("%.1f", summary.TotalWeight)
	}
	if status == harvestBatchStatusRejected {
		payload.RejectedReason = strings.TrimSpace(reason)
	}

	return payload
}

func buildHarvestBatchNotificationContent(
	status harvestBatchStatus,
	count int,
	blocks []string,
	totalWeight float64,
	approverName string,
	reason string,
) (string, string) {
	recordLabel := formatHarvestBatchRecordLabel(count)
	blockSummary := formatHarvestBatchBlockSummary(blocks)
	weightSummary := formatHarvestBatchWeight(totalWeight)
	actorName := strings.TrimSpace(approverName)
	if actorName == "" {
		actorName = "Asisten"
	}

	titlePrefix := "Disetujui"
	verb := "disetujui"
	if status == harvestBatchStatusRejected {
		titlePrefix = "Ditolak"
		verb = "ditolak"
	}

	title := fmt.Sprintf("%s %s", titlePrefix, capitalizeHarvestBatchRecordLabel(recordLabel))
	message := fmt.Sprintf("%s Anda di %s%s telah %s oleh %s", capitalizeHarvestBatchRecordLabel(recordLabel), blockSummary, weightSummary, verb, actorName)

	if status == harvestBatchStatusRejected {
		trimmedReason := strings.TrimSpace(reason)
		if trimmedReason == "" {
			trimmedReason = "Data panen ditolak"
		}
		message = fmt.Sprintf("%s: %s", message, trimmedReason)
	}

	return title, message
}

func formatHarvestBatchRecordLabel(count int) string {
	if count <= 1 {
		return "1 data panen"
	}

	return fmt.Sprintf("%d data panen", count)
}

func capitalizeHarvestBatchRecordLabel(label string) string {
	trimmed := strings.TrimSpace(label)
	if trimmed == "" {
		return "Data panen"
	}

	return strings.ToUpper(trimmed[:1]) + trimmed[1:]
}

func formatHarvestBatchBlockSummary(blocks []string) string {
	switch len(blocks) {
	case 0:
		return "beberapa blok"
	case 1:
		return fmt.Sprintf("blok %s", blocks[0])
	case 2:
		return fmt.Sprintf("blok %s dan %s", blocks[0], blocks[1])
	default:
		return fmt.Sprintf("blok %s, %s, dan %d blok lainnya", blocks[0], blocks[1], len(blocks)-2)
	}
}

func formatHarvestBatchWeight(totalWeight float64) string {
	if totalWeight <= 0 {
		return ""
	}

	return fmt.Sprintf(" (%.1f kg)", totalWeight)
}

func normalizeHarvestBatchBlockName(blockName string) string {
	trimmed := strings.TrimSpace(blockName)
	if trimmed == "" {
		return ""
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

func firstHarvestBatchBlock(blocks []string) string {
	if len(blocks) == 0 {
		return ""
	}

	return blocks[0]
}

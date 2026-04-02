package resolvers

import (
	"agrinovagraphql/server/internal/graphql/domain/auth"
	notificationModels "agrinovagraphql/server/internal/notifications/models"
	notificationServices "agrinovagraphql/server/internal/notifications/services"
	panenModels "agrinovagraphql/server/internal/panen/models"

	"agrinovagraphql/server/internal/middleware"
	"context"
	"fmt"
	"log"
	"strings"
	"time"
)

func (r *mutationResolver) notifyAsistenHarvestCreated(ctx context.Context, record *panenModels.HarvestRecord) {
	if record == nil {
		return
	}

	mandorID := strings.TrimSpace(record.MandorID)
	if mandorID == "" {
		return
	}

	mandorName := "Mandor"
	if record.Mandor != nil {
		if name := strings.TrimSpace(record.Mandor.Name); name != "" {
			mandorName = name
		} else if username := strings.TrimSpace(record.Mandor.Username); username != "" {
			mandorName = username
		}
	}

	blockName := "Block"
	if record.Block != nil {
		if name := strings.TrimSpace(record.Block.Name); name != "" {
			blockName = name
		}
	}
	blockID := strings.TrimSpace(record.BlockID)

	harvestID := strings.TrimSpace(record.ID)
	bunchCount := record.JumlahJanjang
	weight := record.BeratTbs

	notifier := r.FCMNotificationService
	notificationService := r.NotificationService
	if isNilValue(notifier) && notificationService == nil {
		return
	}

	go func(
		notifier HarvestFCMNotifier,
		notificationService *notificationServices.NotificationService,
		harvestID string,
		mandorID string,
		blockID string,
		mandorName string,
		blockName string,
		bunchCount int32,
		weight float64,
	) {
		lookupCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		resolvedMandorName, resolvedBlockName := r.resolveHarvestNotificationLabels(
			lookupCtx,
			mandorID,
			blockID,
			mandorName,
			blockName,
		)

		if !isNilValue(notifier) {
			err := notifier.NotifyAsistenNewHarvest(
				context.Background(),
				harvestID,
				mandorID,
				resolvedMandorName,
				resolvedBlockName,
				bunchCount,
			)
			if err != nil {
				log.Printf(
					"Failed to send FCM notification to asisten for harvest %s (mandor %s): %v",
					harvestID,
					mandorID,
					err,
				)
			}
		}

		if notificationService != nil {
			if err := r.notifyHarvestCreatedHierarchyNotifications(
				context.Background(),
				harvestID,
				mandorID,
				resolvedMandorName,
				resolvedBlockName,
				weight,
			); err != nil {
				log.Printf(
					"Failed to create hierarchical harvest-created notification for harvest %s: %v",
					harvestID,
					err,
				)
			}
		}
	}(
		notifier,
		notificationService,
		harvestID,
		mandorID,
		blockID,
		mandorName,
		blockName,
		bunchCount,
		weight,
	)
}

func (r *mutationResolver) resolveHarvestNotificationLabels(
	ctx context.Context,
	mandorID string,
	blockID string,
	fallbackMandorName string,
	fallbackBlockName string,
) (string, string) {
	mandorName := strings.TrimSpace(fallbackMandorName)
	if mandorName == "" {
		mandorName = "Mandor"
	}

	blockName := strings.TrimSpace(fallbackBlockName)
	if blockName == "" {
		blockName = "Block"
	}

	if r.db == nil {
		return mandorName, blockName
	}

	if mandorName == "Mandor" && strings.TrimSpace(mandorID) != "" {
		var row struct {
			Name     string `gorm:"column:name"`
			Username string `gorm:"column:username"`
		}
		if err := r.db.WithContext(ctx).
			Table("users").
			Select("name", "username").
			Where("id = ?", mandorID).
			Limit(1).
			Scan(&row).Error; err == nil {
			if name := strings.TrimSpace(row.Name); name != "" {
				mandorName = name
			} else if username := strings.TrimSpace(row.Username); username != "" {
				mandorName = username
			}
		}
	}

	if blockName == "Block" && strings.TrimSpace(blockID) != "" {
		var row struct {
			Name      string `gorm:"column:name"`
			BlockCode string `gorm:"column:block_code"`
		}
		if err := r.db.WithContext(ctx).
			Table("blocks").
			Select("name", "block_code").
			Where("id = ?", blockID).
			Limit(1).
			Scan(&row).Error; err == nil {
			if name := strings.TrimSpace(row.Name); name != "" {
				blockName = name
			} else if code := strings.TrimSpace(row.BlockCode); code != "" {
				blockName = code
			}
		}
	}

	return mandorName, blockName
}

type harvestNotificationRecipient struct {
	UserID string
	Role   auth.UserRole
}

func (r *mutationResolver) notifyHarvestCreatedHierarchyNotifications(
	ctx context.Context,
	harvestID string,
	mandorID string,
	mandorName string,
	blockName string,
	weight float64,
) error {
	if r.NotificationService == nil {
		return nil
	}

	recipients, err := r.resolveHarvestCreatedRecipients(ctx, mandorID)
	if err != nil {
		return err
	}

	// Fallback keeps old behavior if hierarchy mapping is unavailable.
	if len(recipients) == 0 {
		return r.NotificationService.NotifyHarvestCreated(
			ctx,
			harvestID,
			mandorID,
			mandorName,
			blockName,
			weight,
		)
	}

	metadata := map[string]interface{}{
		"harvestId":  harvestID,
		"mandorId":   mandorID,
		"mandorName": mandorName,
		"block":      blockName,
		"weight":     weight,
	}

	for _, recipient := range recipients {
		actionURL := "/approvals"
		actionLabel := "Review"
		switch recipient.Role {
		case auth.UserRoleAsisten:
			actionURL = "/dashboard/asisten/approval"
		case auth.UserRoleManager:
			actionURL = "/dashboard/manager/approval"
		}

		input := &notificationServices.CreateNotificationInput{
			Type:              notificationModels.NotificationTypeHarvestApprovalNeeded,
			Priority:          notificationModels.NotificationPriorityHigh,
			Title:             "Persetujuan Panen Diperlukan",
			Message:           fmt.Sprintf("Data panen baru dari %s di blok %s (%.1f kg) memerlukan persetujuan", mandorName, blockName, weight),
			RecipientID:       recipient.UserID,
			RelatedEntityType: "HARVEST_RECORD",
			RelatedEntityID:   harvestID,
			ActionURL:         actionURL,
			ActionLabel:       actionLabel,
			Metadata:          metadata,
			SenderID:          mandorID,
			SenderRole:        string(auth.UserRoleMandor),
			IdempotencyKey:    fmt.Sprintf("harvest-created:%s:%s", harvestID, recipient.UserID),
		}

		if _, createErr := r.NotificationService.CreateNotification(ctx, input); createErr != nil {
			return createErr
		}
	}

	return nil
}

func (r *mutationResolver) resolveHarvestCreatedRecipients(
	ctx context.Context,
	mandorID string,
) ([]harvestNotificationRecipient, error) {
	if r.HierarchyService == nil {
		return nil, nil
	}

	asisten, err := r.HierarchyService.GetParent(ctx, mandorID)
	if err != nil {
		return nil, err
	}
	if asisten == nil {
		return nil, nil
	}

	recipients := make([]harvestNotificationRecipient, 0, 2)
	seen := make(map[string]struct{}, 2)
	appendRecipient := func(userID string, role auth.UserRole) {
		id := strings.TrimSpace(userID)
		if id == "" {
			return
		}
		if _, exists := seen[id]; exists {
			return
		}
		seen[id] = struct{}{}
		recipients = append(recipients, harvestNotificationRecipient{
			UserID: id,
			Role:   role,
		})
	}

	// Primary target: direct supervisor of mandor.
	switch asisten.Role {
	case auth.UserRoleAsisten, auth.UserRoleManager:
		appendRecipient(asisten.ID, asisten.Role)
	}

	// Secondary target: direct supervisor of asisten (manager).
	manager, err := r.HierarchyService.GetParent(ctx, asisten.ID)
	if err != nil {
		return nil, err
	}
	if manager != nil && manager.Role == auth.UserRoleManager {
		appendRecipient(manager.ID, manager.Role)
	}

	return recipients, nil
}

type harvestApprovalFCMNotifier interface {
	NotifyMandorApproved(
		ctx context.Context,
		harvestID string,
		mandorID string,
		asistenName string,
		blockName string,
		harvestDate string,
		bunchCount int32,
	) error
}

type harvestRejectionFCMNotifier interface {
	NotifyMandorRejected(
		ctx context.Context,
		harvestID string,
		mandorID string,
		asistenName string,
		blockName string,
		reason string,
		harvestDate string,
		bunchCount int32,
	) error
}

func (r *mutationResolver) notifyMandorHarvestApproved(
	ctx context.Context,
	record *panenModels.HarvestRecord,
	approverID string,
) {
	if record == nil {
		return
	}

	mandorID := strings.TrimSpace(record.MandorID)
	harvestID := strings.TrimSpace(record.ID)
	if mandorID == "" || harvestID == "" {
		return
	}

	asistenName := r.resolveApproverName(ctx, approverID)
	blockName := r.resolveHarvestBlockName(ctx, record)
	harvestDate := record.Tanggal.Format("02/01/2006")
	bunchCount := record.JumlahJanjang

	if !isNilValue(r.FCMNotificationService) {
		if notifier, ok := r.FCMNotificationService.(harvestApprovalFCMNotifier); ok && !isNilValue(notifier) {
			go func() {
				err := notifier.NotifyMandorApproved(
					context.Background(),
					harvestID,
					mandorID,
					asistenName,
					blockName,
					harvestDate,
					bunchCount,
				)
				if err != nil {
					log.Printf(
						"Failed to send FCM approval notification to mandor %s for harvest %s: %v",
						mandorID,
						harvestID,
						err,
					)
				}
			}()
		}
	}

	if r.NotificationService != nil {
		go func() {
			if err := r.NotificationService.NotifyHarvestApproved(
				context.Background(),
				harvestID,
				mandorID,
				approverID,
				blockName,
				record.BeratTbs,
			); err != nil {
				log.Printf(
					"Failed to create harvest-approved notification for harvest %s: %v",
					harvestID,
					err,
				)
			}
		}()
	}
}

func (r *mutationResolver) notifyMandorHarvestRejected(
	ctx context.Context,
	record *panenModels.HarvestRecord,
	reason string,
	approverID string,
) {
	if record == nil {
		return
	}

	mandorID := strings.TrimSpace(record.MandorID)
	harvestID := strings.TrimSpace(record.ID)
	if mandorID == "" || harvestID == "" {
		return
	}

	asistenName := r.resolveApproverName(ctx, approverID)
	blockName := r.resolveHarvestBlockName(ctx, record)
	rejectedReason := strings.TrimSpace(reason)
	if rejectedReason == "" {
		rejectedReason = "Data panen ditolak"
	}
	harvestDate := record.Tanggal.Format("02/01/2006")
	bunchCount := record.JumlahJanjang

	if !isNilValue(r.FCMNotificationService) {
		if notifier, ok := r.FCMNotificationService.(harvestRejectionFCMNotifier); ok && !isNilValue(notifier) {
			go func() {
				err := notifier.NotifyMandorRejected(
					context.Background(),
					harvestID,
					mandorID,
					asistenName,
					blockName,
					rejectedReason,
					harvestDate,
					bunchCount,
				)
				if err != nil {
					log.Printf(
						"Failed to send FCM rejection notification to mandor %s for harvest %s: %v",
						mandorID,
						harvestID,
						err,
					)
				}
			}()
		}
	}

	if r.NotificationService != nil {
		go func() {
			if err := r.NotificationService.NotifyHarvestRejected(
				context.Background(),
				harvestID,
				mandorID,
				approverID,
				blockName,
				record.BeratTbs,
				rejectedReason,
			); err != nil {
				log.Printf(
					"Failed to create harvest-rejected notification for harvest %s: %v",
					harvestID,
					err,
				)
			}
		}()
	}
}

func (r *mutationResolver) resolveApproverName(ctx context.Context, approverID string) string {
	candidateID := strings.TrimSpace(approverID)
	if candidateID == "" {
		candidateID = strings.TrimSpace(middleware.GetCurrentUserID(ctx))
	}

	if candidateID != "" {
		var user struct {
			Name     string
			Username string
		}
		if err := r.db.WithContext(ctx).
			Table("users").
			Select("name, username").
			Where("id = ?", candidateID).
			Take(&user).Error; err == nil {
			if name := strings.TrimSpace(user.Name); name != "" {
				return name
			}
			if username := strings.TrimSpace(user.Username); username != "" {
				return username
			}
		}
	}

	return "Asisten"
}

func (r *mutationResolver) resolveHarvestBlockName(ctx context.Context, record *panenModels.HarvestRecord) string {
	if record != nil && record.Block != nil {
		if name := strings.TrimSpace(record.Block.Name); name != "" {
			return name
		}
	}
	if record == nil {
		return "Block"
	}

	blockID := strings.TrimSpace(record.BlockID)
	if blockID == "" {
		return "Block"
	}

	var block struct {
		Name string
	}
	if err := r.db.WithContext(ctx).
		Table("blocks").
		Select("name").
		Where("id = ?", blockID).
		Take(&block).Error; err == nil {
		if name := strings.TrimSpace(block.Name); name != "" {
			return name
		}
	}

	return "Block"
}

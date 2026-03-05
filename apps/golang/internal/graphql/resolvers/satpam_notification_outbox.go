package resolvers

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	notificationModels "agrinovagraphql/server/internal/notifications/models"
	notificationServices "agrinovagraphql/server/internal/notifications/services"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	satpamNotificationOutboxStatusPending    = "PENDING"
	satpamNotificationOutboxStatusProcessing = "PROCESSING"
	satpamNotificationOutboxStatusCompleted  = "COMPLETED"
	satpamNotificationOutboxStatusFailed     = "FAILED"

	satpamNotificationOutboxBatchSize    = 12
	satpamNotificationOutboxMaxAttempts  = 5
	satpamNotificationOutboxPollInterval = 2 * time.Second
)

type satpamNotificationOutboxJob struct {
	ID               string     `gorm:"column:id;type:uuid;default:gen_random_uuid()"`
	CompanyID        string     `gorm:"column:company_id"`
	SenderID         *string    `gorm:"column:sender_id"`
	DeviceID         string     `gorm:"column:device_id"`
	TransactionID    string     `gorm:"column:transaction_id"`
	NotificationType string     `gorm:"column:notification_type"`
	Priority         string     `gorm:"column:priority"`
	Title            string     `gorm:"column:title"`
	Intent           string     `gorm:"column:intent"`
	RecordCount      int        `gorm:"column:record_count"`
	SamplePlatesJSON string     `gorm:"column:sample_plates_json"`
	Status           string     `gorm:"column:status"`
	Attempts         int        `gorm:"column:attempts"`
	LastError        *string    `gorm:"column:last_error"`
	AvailableAt      time.Time  `gorm:"column:available_at"`
	ProcessedAt      *time.Time `gorm:"column:processed_at"`
	CreatedAt        time.Time  `gorm:"column:created_at"`
	UpdatedAt        time.Time  `gorm:"column:updated_at"`
}

func (satpamNotificationOutboxJob) TableName() string {
	return "satpam_notification_outbox"
}

func (r *Resolver) startSatpamNotificationOutboxWorker() {
	if r == nil || r.db == nil || r.NotificationService == nil {
		return
	}

	r.satpamNotificationOutboxOnce.Do(func() {
		workerCtx, cancel := context.WithCancel(context.Background())
		r.satpamNotificationOutboxCancel = cancel

		go func() {
			defer func() {
				if recovered := recover(); recovered != nil {
					fmt.Printf("satpam notification outbox worker stopped: panic: %v\n", recovered)
				}
			}()

			r.runSatpamNotificationOutboxWorker(workerCtx)
		}()
	})
}

func (r *Resolver) runSatpamNotificationOutboxWorker(ctx context.Context) {
	ticker := time.NewTicker(satpamNotificationOutboxPollInterval)
	defer ticker.Stop()

	r.processSatpamNotificationOutboxBatches(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			r.processSatpamNotificationOutboxBatches(ctx)
		}
	}
}

func (r *Resolver) processSatpamNotificationOutboxBatches(ctx context.Context) {
	if !r.db.WithContext(ctx).Migrator().HasTable(&satpamNotificationOutboxJob{}) {
		return
	}

	for {
		processed, err := r.processSatpamNotificationOutboxBatch(ctx, satpamNotificationOutboxBatchSize)
		if err != nil {
			fmt.Printf("failed processing satpam notification outbox batch: %v\n", err)
			return
		}
		if processed < satpamNotificationOutboxBatchSize {
			return
		}
	}
}

func (r *Resolver) processSatpamNotificationOutboxBatch(ctx context.Context, limit int) (int, error) {
	jobs, err := r.claimSatpamNotificationOutboxBatch(ctx, limit)
	if err != nil {
		return 0, err
	}
	if len(jobs) == 0 {
		return 0, nil
	}

	for _, job := range jobs {
		deliveryCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
		deliveryErr := r.deliverSatpamNotificationOutboxJob(deliveryCtx, &job)
		cancel()

		if deliveryErr != nil {
			if err := r.markSatpamNotificationOutboxJobFailure(ctx, &job, deliveryErr); err != nil {
				fmt.Printf("failed marking satpam notification outbox job %s as failed: %v\n", job.ID, err)
			}
			continue
		}

		if err := r.markSatpamNotificationOutboxJobCompleted(ctx, job.ID); err != nil {
			fmt.Printf("failed marking satpam notification outbox job %s as completed: %v\n", job.ID, err)
		}
	}

	return len(jobs), nil
}

func (r *Resolver) claimSatpamNotificationOutboxBatch(ctx context.Context, limit int) ([]satpamNotificationOutboxJob, error) {
	if limit <= 0 {
		return nil, nil
	}

	var jobs []satpamNotificationOutboxJob
	now := time.Now()

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
			Where("status = ? AND available_at <= ?", satpamNotificationOutboxStatusPending, now).
			Order("created_at ASC").
			Limit(limit).
			Find(&jobs).Error; err != nil {
			return fmt.Errorf("failed querying satpam notification outbox: %w", err)
		}
		if len(jobs) == 0 {
			return nil
		}

		ids := make([]string, 0, len(jobs))
		for _, job := range jobs {
			ids = append(ids, job.ID)
		}

		if err := tx.Model(&satpamNotificationOutboxJob{}).
			Where("id IN ?", ids).
			Updates(map[string]interface{}{
				"status":     satpamNotificationOutboxStatusProcessing,
				"attempts":   gorm.Expr("attempts + 1"),
				"updated_at": now,
			}).Error; err != nil {
			return fmt.Errorf("failed claiming satpam notification outbox rows: %w", err)
		}

		for i := range jobs {
			jobs[i].Status = satpamNotificationOutboxStatusProcessing
			jobs[i].Attempts++
			jobs[i].UpdatedAt = now
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return jobs, nil
}

func (r *Resolver) markSatpamNotificationOutboxJobCompleted(ctx context.Context, jobID string) error {
	now := time.Now()
	if err := r.db.WithContext(ctx).
		Model(&satpamNotificationOutboxJob{}).
		Where("id = ?", jobID).
		Updates(map[string]interface{}{
			"status":       satpamNotificationOutboxStatusCompleted,
			"processed_at": now,
			"last_error":   nil,
			"updated_at":   now,
		}).Error; err != nil {
		return fmt.Errorf("failed updating satpam notification outbox completion: %w", err)
	}

	return nil
}

func (r *Resolver) markSatpamNotificationOutboxJobFailure(
	ctx context.Context,
	job *satpamNotificationOutboxJob,
	deliveryErr error,
) error {
	if job == nil {
		return nil
	}

	nextStatus := satpamNotificationOutboxStatusPending
	nextAvailableAt := time.Now().Add(time.Duration(job.Attempts) * time.Second)
	if job.Attempts >= satpamNotificationOutboxMaxAttempts {
		nextStatus = satpamNotificationOutboxStatusFailed
		nextAvailableAt = time.Now()
	}

	updateValues := map[string]interface{}{
		"status":       nextStatus,
		"last_error":   deliveryErr.Error(),
		"available_at": nextAvailableAt,
		"updated_at":   time.Now(),
	}

	if err := r.db.WithContext(ctx).
		Model(&satpamNotificationOutboxJob{}).
		Where("id = ?", job.ID).
		Updates(updateValues).Error; err != nil {
		return fmt.Errorf("failed updating satpam notification outbox failure state: %w", err)
	}

	fmt.Printf(
		"failed delivering satpam notification outbox job %s (attempt %d/%d): %v\n",
		job.ID,
		job.Attempts,
		satpamNotificationOutboxMaxAttempts,
		deliveryErr,
	)

	return nil
}

func (r *Resolver) deliverSatpamNotificationOutboxJob(ctx context.Context, job *satpamNotificationOutboxJob) error {
	if r.NotificationService == nil || job == nil {
		return nil
	}

	companyID := strings.TrimSpace(job.CompanyID)
	if companyID == "" {
		return nil
	}

	recipients, err := r.getSatpamNotificationRecipients(ctx, companyID)
	if err != nil {
		return err
	}
	if len(recipients) == 0 {
		return nil
	}

	var samplePlates []string
	if strings.TrimSpace(job.SamplePlatesJSON) != "" {
		if err := json.Unmarshal([]byte(job.SamplePlatesJSON), &samplePlates); err != nil {
			return fmt.Errorf("failed decoding satpam notification outbox sample plates: %w", err)
		}
	}

	summary := satpamSyncNotificationSummary{
		NotificationType: notificationModels.NotificationType(job.NotificationType),
		Priority:         notificationModels.NotificationPriority(job.Priority),
		Title:            job.Title,
		Intent:           strings.TrimSpace(job.Intent),
		Count:            job.RecordCount,
		SamplePlates:     samplePlates,
	}

	relatedEntityID := strings.TrimSpace(job.TransactionID)
	if relatedEntityID == "" {
		relatedEntityID = strings.TrimSpace(job.DeviceID)
	}
	if relatedEntityID == "" {
		relatedEntityID = "sync"
	}

	idempotencyKey := fmt.Sprintf(
		"satpam:sync:%s:%s",
		strings.ToLower(strings.TrimSpace(summary.Intent)),
		relatedEntityID,
	)

	senderID := ""
	if job.SenderID != nil {
		senderID = strings.TrimSpace(*job.SenderID)
	}

	message := buildSatpamSyncSummaryMessage(summary)
	for _, recipient := range recipients {
		input := &notificationServices.CreateNotificationInput{
			Type:               summary.NotificationType,
			Priority:           summary.Priority,
			Title:              summary.Title,
			Message:            message,
			IdempotencyKey:     idempotencyKey,
			RecipientID:        recipient.ID,
			RecipientRole:      string(recipient.Role),
			RecipientCompanyID: companyID,
			RelatedEntityType:  "GATE_CHECK_SYNC",
			RelatedEntityID:    relatedEntityID,
			ActionURL:          "/dashboard/manager/gate-logs",
			ActionLabel:        "Lihat Log",
			Metadata: map[string]interface{}{
				"count":         summary.Count,
				"intent":        summary.Intent,
				"deviceId":      strings.TrimSpace(job.DeviceID),
				"transactionId": strings.TrimSpace(job.TransactionID),
				"samplePlates":  summary.SamplePlates,
			},
			SenderID:   senderID,
			SenderRole: "SATPAM",
		}

		if _, err := r.NotificationService.CreateNotification(ctx, input); err != nil {
			return fmt.Errorf(
				"failed creating sync %s notification for recipient %s: %w",
				summary.Intent,
				recipient.ID,
				err,
			)
		}
	}

	return nil
}

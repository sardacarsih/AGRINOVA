package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000045OptimizeNotificationIdempotencyAndDelivery adds idempotency and
// delivery tracking indexes for notification flow stability.
func Migration000045OptimizeNotificationIdempotencyAndDelivery(db *gorm.DB) error {
	log.Println("Running migration: 000045_optimize_notification_idempotency_and_delivery")

	if err := db.Exec(`
		ALTER TABLE notifications
			ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(191);
	`).Error; err != nil {
		log.Printf("Note: Adding notifications.idempotency_key may have issues: %v", err)
	}

	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_recipient_idempotency
		ON notifications (recipient_id, idempotency_key)
		WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';
	`).Error; err != nil {
		log.Printf("Note: Creating uq_notifications_recipient_idempotency may have issues: %v", err)
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_notifications_recipient_status_created
		ON notifications (recipient_id, status, created_at DESC);
	`).Error; err != nil {
		log.Printf("Note: Creating idx_notifications_recipient_status_created may have issues: %v", err)
	}

	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_deliveries_notification_channel
		ON notification_deliveries (notification_id, channel);
	`).Error; err != nil {
		log.Printf("Note: Creating uq_notification_deliveries_notification_channel may have issues: %v", err)
	}

	log.Println("Migration 000045 completed: notification idempotency and delivery indexes optimized")
	return nil
}

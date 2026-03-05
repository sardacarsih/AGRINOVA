package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000059CreateSatpamNotificationOutbox creates a durable outbox table
// for SATPAM sync summary notifications.
func Migration000059CreateSatpamNotificationOutbox(db *gorm.DB) error {
	log.Println("Running migration: 000059_create_satpam_notification_outbox")

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS satpam_notification_outbox (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			sender_id UUID,
			device_id VARCHAR(255),
			transaction_id VARCHAR(255),
			notification_type VARCHAR(50) NOT NULL,
			priority VARCHAR(20) NOT NULL,
			title VARCHAR(255) NOT NULL,
			intent VARCHAR(20) NOT NULL,
			record_count INTEGER NOT NULL,
			sample_plates_json TEXT,
			status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
			attempts INTEGER NOT NULL DEFAULT 0,
			last_error TEXT,
			available_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			processed_at TIMESTAMP,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`).Error; err != nil {
		return err
	}

	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_satpam_notification_outbox_status_available_at ON satpam_notification_outbox(status, available_at)",
		"CREATE INDEX IF NOT EXISTS idx_satpam_notification_outbox_company_id ON satpam_notification_outbox(company_id)",
		"CREATE INDEX IF NOT EXISTS idx_satpam_notification_outbox_transaction_id ON satpam_notification_outbox(transaction_id)",
	}

	for _, stmt := range indexes {
		if err := db.Exec(stmt).Error; err != nil {
			return err
		}
	}

	log.Println("Migration 000059 completed: satpam_notification_outbox created")
	return nil
}

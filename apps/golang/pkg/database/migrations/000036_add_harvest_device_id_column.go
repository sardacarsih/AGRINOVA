package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000036AddHarvestDeviceIDColumn adds device_id to harvest_records.
func Migration000036AddHarvestDeviceIDColumn(db *gorm.DB) error {
	log.Println("Running migration: 000036_add_harvest_device_id_column")

	if err := db.Exec(`
		ALTER TABLE harvest_records
		ADD COLUMN IF NOT EXISTS device_id TEXT;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_harvest_records_device_id
		ON harvest_records(device_id);
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000036 completed: harvest_records.device_id is available")
	return nil
}

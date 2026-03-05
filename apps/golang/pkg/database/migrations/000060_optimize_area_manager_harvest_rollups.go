package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000060OptimizeAreaManagerHarvestRollups adds a partial composite
// index that matches area manager production rollups by estate and date range.
func Migration000060OptimizeAreaManagerHarvestRollups(db *gorm.DB) error {
	log.Println("Running migration: 000060_optimize_area_manager_harvest_rollups")

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_harvest_records_estate_tanggal_approved_pending
		ON harvest_records(estate_id, tanggal)
		WHERE status IN ('APPROVED', 'PENDING');
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000060 completed: harvest_records(estate_id, tanggal) partial index created")
	return nil
}

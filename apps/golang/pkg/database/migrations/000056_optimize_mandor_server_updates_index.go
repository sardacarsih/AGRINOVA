package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000056OptimizeMandorServerUpdatesIndex adds a targeted covering
// partial index for mandorServerUpdates pull queries:
// WHERE mandor_id = ? AND updated_at > ? AND status IN ('APPROVED', 'REJECTED')
// ORDER BY updated_at DESC
func Migration000056OptimizeMandorServerUpdatesIndex(db *gorm.DB) error {
	log.Println("Running migration: 000056_optimize_mandor_server_updates_index")

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_harvest_mandor_server_updates_pull
		ON harvest_records (mandor_id, updated_at DESC)
		INCLUDE (id, local_id, status, approved_by, approved_at, rejected_reason)
		WHERE status IN ('APPROVED', 'REJECTED');
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000056 completed: mandorServerUpdates pull index added")
	return nil
}

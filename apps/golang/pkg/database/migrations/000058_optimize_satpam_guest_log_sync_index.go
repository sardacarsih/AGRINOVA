package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000058OptimizeSatpamGuestLogSyncIndex adds the composite index used
// by SATPAM sync lookups on company_id + local_id.
func Migration000058OptimizeSatpamGuestLogSyncIndex(db *gorm.DB) error {
	log.Println("Running migration: 000058_optimize_satpam_guest_log_sync_index")

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_company_local_id
		ON gate_guest_logs(company_id, local_id);
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000058 completed: gate_guest_logs(company_id, local_id) indexed")
	return nil
}

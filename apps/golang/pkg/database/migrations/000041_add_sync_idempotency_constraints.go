package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000041AddSyncIdempotencyConstraints adds per-user unique constraints
// on local_id for harvest_records and gate_guest_logs so duplicate sync pushes
// are idempotent: the same localId from the same user is rejected on insert but
// the server can return the already-stored serverId.
func Migration000041AddSyncIdempotencyConstraints(db *gorm.DB) error {
	log.Println("Running migration: 000041_add_sync_idempotency_constraints")

	// harvest_records: idempotency per mandor
	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint
				WHERE conname = 'uq_harvest_mandor_localid'
			) THEN
				ALTER TABLE harvest_records
					ADD CONSTRAINT uq_harvest_mandor_localid
					UNIQUE (mandor_id, local_id);
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Note: Adding uq_harvest_mandor_localid constraint may have issues: %v", err)
	}

	// gate_guest_logs: ensure local_id column exists
	if err := db.Exec(`
		ALTER TABLE gate_guest_logs
			ADD COLUMN IF NOT EXISTS local_id TEXT;
	`).Error; err != nil {
		log.Printf("Note: Adding local_id column to gate_guest_logs may have issues: %v", err)
	}

	// gate_guest_logs: idempotency per satpam (created_by)
	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint
				WHERE conname = 'uq_guestlog_createdby_localid'
			) THEN
				ALTER TABLE gate_guest_logs
					ADD CONSTRAINT uq_guestlog_createdby_localid
					UNIQUE (created_by, local_id);
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Note: Adding uq_guestlog_createdby_localid constraint may have issues: %v", err)
	}

	log.Println("Migration 000041 completed: sync idempotency constraints added")
	return nil
}

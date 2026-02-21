package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000032AddHarvestRecordsNikColumn adds nik column to harvest_records.
func Migration000032AddHarvestRecordsNikColumn(db *gorm.DB) error {
	log.Println("Running migration: 000032_add_harvest_records_nik_column")

	if err := db.Exec(`
		ALTER TABLE harvest_records
		ADD COLUMN IF NOT EXISTS nik TEXT;
	`).Error; err != nil {
		return err
	}

	// Backfill from karyawan so historical rows remain queryable by nik.
	if err := db.Exec(`
		UPDATE harvest_records
		SET nik = NULLIF(TRIM(karyawan::text), '')
		WHERE (nik IS NULL OR TRIM(nik) = '')
			AND karyawan IS NOT NULL
			AND TRIM(karyawan::text) <> '';
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_harvest_records_nik
		ON harvest_records(nik);
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000032 completed: harvest_records.nik is available")
	return nil
}

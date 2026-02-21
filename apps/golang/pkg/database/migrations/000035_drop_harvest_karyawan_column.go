package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000035DropHarvestKaryawanColumn removes deprecated harvest_records.karyawan.
func Migration000035DropHarvestKaryawanColumn(db *gorm.DB) error {
	log.Println("Running migration: 000035_drop_harvest_karyawan_column")

	// Prefer canonical employee reference for nik backfill before dropping legacy column.
	if err := db.Exec(`
		UPDATE harvest_records hr
		SET nik = NULLIF(TRIM(e.nik), '')
		FROM employees e
		WHERE hr.karyawan_id = e.id
		  AND (hr.nik IS NULL OR TRIM(hr.nik) = '')
		  AND e.nik IS NOT NULL
		  AND TRIM(e.nik) <> '';
	`).Error; err != nil {
		return err
	}

	// Keep historical rows queryable by nik when only legacy karyawan exists.
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
		DROP INDEX IF EXISTS idx_harvest_karyawan;
		DROP INDEX IF EXISTS idx_harvest_karyawan_text;
		DROP INDEX IF EXISTS idx_harvest_records_karyawan;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		ALTER TABLE harvest_records
		DROP COLUMN IF EXISTS karyawan;
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000035 completed: harvest_records.karyawan removed")
	return nil
}

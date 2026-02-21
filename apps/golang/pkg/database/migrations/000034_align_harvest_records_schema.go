package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000034AlignHarvestRecordsSchema aligns harvest_records columns across legacy installs.
func Migration000034AlignHarvestRecordsSchema(db *gorm.DB) error {
	log.Println("Running migration: 000034_align_harvest_records_schema")

	if err := db.Exec(`
		ALTER TABLE harvest_records
		ADD COLUMN IF NOT EXISTS company_id UUID,
		ADD COLUMN IF NOT EXISTS estate_id UUID,
		ADD COLUMN IF NOT EXISTS division_id UUID,
		ADD COLUMN IF NOT EXISTS karyawan_id UUID,
		ADD COLUMN IF NOT EXISTS nik TEXT,
		ADD COLUMN IF NOT EXISTS approved_by UUID,
		ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
		ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
		ADD COLUMN IF NOT EXISTS notes TEXT,
		ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
		ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
		ADD COLUMN IF NOT EXISTS photo_url TEXT,
		ADD COLUMN IF NOT EXISTS jjg_matang INTEGER NOT NULL DEFAULT 0,
		ADD COLUMN IF NOT EXISTS jjg_mentah INTEGER NOT NULL DEFAULT 0,
		ADD COLUMN IF NOT EXISTS jjg_lewat_matang INTEGER NOT NULL DEFAULT 0,
		ADD COLUMN IF NOT EXISTS jjg_busuk_abnormal INTEGER NOT NULL DEFAULT 0,
		ADD COLUMN IF NOT EXISTS jjg_tangkai_panjang INTEGER NOT NULL DEFAULT 0,
		ADD COLUMN IF NOT EXISTS total_brondolan DOUBLE PRECISION NOT NULL DEFAULT 0;
	`).Error; err != nil {
		return err
	}

	// Explicitly remove deprecated assistant foreign key column.
	if err := db.Exec(`
		ALTER TABLE harvest_records
		DROP COLUMN IF EXISTS asisten_id;
	`).Error; err != nil {
		return err
	}

	// Backfill nik from karyawan for existing rows.
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
		CREATE INDEX IF NOT EXISTS idx_harvest_records_company_id
		ON harvest_records(company_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_harvest_records_estate_id
		ON harvest_records(estate_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_harvest_records_division_id
		ON harvest_records(division_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_harvest_records_karyawan_id
		ON harvest_records(karyawan_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_harvest_records_nik
		ON harvest_records(nik);
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000034 completed: harvest_records schema aligned")
	return nil
}

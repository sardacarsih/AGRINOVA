package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000033AddHarvestQualityColumns adds quality breakdown columns to harvest_records.
func Migration000033AddHarvestQualityColumns(db *gorm.DB) error {
	log.Println("Running migration: 000033_add_harvest_quality_columns")

	if err := db.Exec(`
		ALTER TABLE harvest_records
		ADD COLUMN IF NOT EXISTS jjg_matang INTEGER NOT NULL DEFAULT 0,
		ADD COLUMN IF NOT EXISTS jjg_mentah INTEGER NOT NULL DEFAULT 0,
		ADD COLUMN IF NOT EXISTS jjg_lewat_matang INTEGER NOT NULL DEFAULT 0,
		ADD COLUMN IF NOT EXISTS jjg_busuk_abnormal INTEGER NOT NULL DEFAULT 0,
		ADD COLUMN IF NOT EXISTS jjg_tangkai_panjang INTEGER NOT NULL DEFAULT 0,
		ADD COLUMN IF NOT EXISTS total_brondolan DOUBLE PRECISION NOT NULL DEFAULT 0;
	`).Error; err != nil {
		return err
	}

	// Backfill older rows so quality totals remain meaningful.
	if err := db.Exec(`
		UPDATE harvest_records
		SET jjg_matang = COALESCE(jumlah_janjang, 0)
		WHERE COALESCE(jjg_matang, 0) = 0
			AND COALESCE(jjg_mentah, 0) = 0
			AND COALESCE(jjg_lewat_matang, 0) = 0
			AND COALESCE(jjg_busuk_abnormal, 0) = 0
			AND COALESCE(jjg_tangkai_panjang, 0) = 0
			AND COALESCE(jumlah_janjang, 0) > 0;
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000033 completed: harvest quality columns are available")
	return nil
}

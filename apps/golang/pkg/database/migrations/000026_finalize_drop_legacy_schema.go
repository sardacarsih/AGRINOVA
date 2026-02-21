package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000026FinalizeDropLegacySchema removes legacy master columns after
// cutover parity has been validated and marks schema as finalized.
func Migration000026FinalizeDropLegacySchema(db *gorm.DB) error {
	log.Println("Running migration: 000026_finalize_drop_legacy_schema")

	finalized, err := isLegacySchemaFinalized(db)
	if err != nil {
		return err
	}
	if finalized {
		log.Println("Migration 000026 skipped: legacy schema already finalized")
		return nil
	}

	if err := Migration000025ValidateLegacyCutoverReadiness(db); err != nil {
		return err
	}

	if err := db.Exec(`
		DROP TRIGGER IF EXISTS trg_sync_companies_legacy_columns ON companies;
		DROP TRIGGER IF EXISTS trg_sync_estates_legacy_columns ON estates;
		DROP TRIGGER IF EXISTS trg_sync_divisions_legacy_columns ON divisions;
		DROP TRIGGER IF EXISTS trg_sync_blocks_legacy_columns ON blocks;

		DROP FUNCTION IF EXISTS sync_companies_legacy_columns();
		DROP FUNCTION IF EXISTS sync_estates_legacy_columns();
		DROP FUNCTION IF EXISTS sync_divisions_legacy_columns();
		DROP FUNCTION IF EXISTS sync_blocks_legacy_columns();
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DROP INDEX IF EXISTS idx_companies_nama;
		DROP INDEX IF EXISTS idx_estates_nama;
		DROP INDEX IF EXISTS idx_divisions_nama;
		DROP INDEX IF EXISTS idx_divisions_kode;
		DROP INDEX IF EXISTS idx_blocks_nama;
		DROP INDEX IF EXISTS idx_blocks_kode_blok;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		ALTER TABLE companies
			DROP COLUMN IF EXISTS nama,
			DROP COLUMN IF EXISTS kode,
			DROP COLUMN IF EXISTS alamat,
			DROP COLUMN IF EXISTS telepon;

		ALTER TABLE estates
			DROP COLUMN IF EXISTS nama,
			DROP COLUMN IF EXISTS kode,
			DROP COLUMN IF EXISTS lokasi,
			DROP COLUMN IF EXISTS luas_ha;

		ALTER TABLE divisions
			DROP COLUMN IF EXISTS nama,
			DROP COLUMN IF EXISTS kode;

		ALTER TABLE blocks
			DROP COLUMN IF EXISTS nama,
			DROP COLUMN IF EXISTS kode_blok,
			DROP COLUMN IF EXISTS kode,
			DROP COLUMN IF EXISTS luas_ha,
			DROP COLUMN IF EXISTS jenis_tanaman,
			DROP COLUMN IF EXISTS tahun_tanam;
	`).Error; err != nil {
		return err
	}

	if err := markLegacySchemaFinalized(db); err != nil {
		return err
	}

	log.Println("Migration 000026 completed: legacy master schema dropped and finalized")
	return nil
}

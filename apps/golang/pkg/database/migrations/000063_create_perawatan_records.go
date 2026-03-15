package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000063CreatePerawatanRecords creates the maintenance transaction table
// used by MANDOR_PERAWATAN users.
func Migration000063CreatePerawatanRecords(db *gorm.DB) error {
	log.Println("Running migration: 000063_create_perawatan_records")

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS perawatan_records (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE RESTRICT,
			jenis_perawatan VARCHAR(50) NOT NULL,
			tanggal_perawatan TIMESTAMPTZ NOT NULL,
			pekerja_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
			luas_area DOUBLE PRECISION NOT NULL,
			pupuk_digunakan TEXT,
			herbisida_digunakan TEXT,
			catatan TEXT,
			status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			deleted_at TIMESTAMPTZ,
			CONSTRAINT chk_perawatan_records_jenis_perawatan
				CHECK (jenis_perawatan IN (
					'PEMUPUKAN',
					'PENYEMPROTAN_HERBISIDA',
					'PEMANGKASAN',
					'PEMBERSIHAN_PARIT',
					'PEMBERSIHAN_GULMA',
					'PERAWATAN_JALAN',
					'LAINNYA'
				)),
			CONSTRAINT chk_perawatan_records_status
				CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
			CONSTRAINT chk_perawatan_records_luas_area
				CHECK (luas_area > 0)
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_perawatan_records_pekerja_id
		ON perawatan_records (pekerja_id)
		WHERE deleted_at IS NULL;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_perawatan_records_block_id
		ON perawatan_records (block_id)
		WHERE deleted_at IS NULL;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_perawatan_records_tanggal_perawatan
		ON perawatan_records (tanggal_perawatan DESC)
		WHERE deleted_at IS NULL;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_perawatan_records_status
		ON perawatan_records (status)
		WHERE deleted_at IS NULL;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_perawatan_records_jenis_status
		ON perawatan_records (jenis_perawatan, status)
		WHERE deleted_at IS NULL;
	`).Error; err != nil {
		return err
	}

	return nil
}

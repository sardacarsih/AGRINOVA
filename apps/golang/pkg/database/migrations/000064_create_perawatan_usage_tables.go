package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000064CreatePerawatanUsageTables creates a unified material usage
// table for maintenance records and backfills any legacy split tables.
func Migration000064CreatePerawatanUsageTables(db *gorm.DB) error {
	log.Println("Running migration: 000064_create_perawatan_usage_tables")

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS perawatan_material_usages (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			perawatan_record_id UUID NOT NULL REFERENCES perawatan_records(id) ON DELETE CASCADE,
			material_category VARCHAR(20) NOT NULL,
			material_name TEXT NOT NULL,
			quantity DOUBLE PRECISION NOT NULL,
			unit VARCHAR(20) NOT NULL,
			unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
			total_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT chk_perawatan_material_usages_category
				CHECK (material_category IN ('PUPUK', 'HERBISIDA')),
			CONSTRAINT chk_perawatan_material_usages_quantity CHECK (quantity > 0),
			CONSTRAINT chk_perawatan_material_usages_unit_price CHECK (unit_price >= 0),
			CONSTRAINT chk_perawatan_material_usages_total_cost CHECK (total_cost >= 0)
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_perawatan_material_usages_record_id
		ON perawatan_material_usages (perawatan_record_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_perawatan_material_usages_category
		ON perawatan_material_usages (material_category);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_perawatan_material_usages_record_category
		ON perawatan_material_usages (perawatan_record_id, material_category);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_perawatan_material_usages_created_at
		ON perawatan_material_usages (created_at DESC);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DO $$
		BEGIN
			IF to_regclass('pupuk_usage') IS NOT NULL THEN
				INSERT INTO perawatan_material_usages (
					id,
					perawatan_record_id,
					material_category,
					material_name,
					quantity,
					unit,
					unit_price,
					total_cost,
					created_at,
					updated_at
				)
				SELECT
					id,
					perawatan_record_id,
					'PUPUK',
					jenis_pupuk,
					jumlah_kg,
					'KG',
					harga_per_kg,
					total_biaya,
					created_at,
					updated_at
				FROM pupuk_usage
				ON CONFLICT (id) DO NOTHING;
			END IF;

			IF to_regclass('herbisida_usage') IS NOT NULL THEN
				INSERT INTO perawatan_material_usages (
					id,
					perawatan_record_id,
					material_category,
					material_name,
					quantity,
					unit,
					unit_price,
					total_cost,
					created_at,
					updated_at
				)
				SELECT
					id,
					perawatan_record_id,
					'HERBISIDA',
					jenis_herbisida,
					jumlah_liter,
					'LITER',
					harga_per_liter,
					total_biaya,
					created_at,
					updated_at
				FROM herbisida_usage
				ON CONFLICT (id) DO NOTHING;
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	return nil
}

package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000048AddLandTypesAndTarifBlockAlignment creates land_types master data,
// aligns tarif_blok and blocks to land_type_id, and enforces FK/index constraints.
func Migration000048AddLandTypesAndTarifBlockAlignment(db *gorm.DB) error {
	log.Println("Running migration: 000048_add_land_types_and_tarif_block_alignment")

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS land_types (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			code VARCHAR(50) NOT NULL UNIQUE,
			name VARCHAR(100) NOT NULL,
			description TEXT,
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);

		INSERT INTO land_types (code, name, description, is_active, created_at, updated_at)
		VALUES
			('TYPE_1', 'Daratan, Rata, Bergelombang', 'Kelompok tipe lahan: Daratan, Rata, Bergelombang', TRUE, NOW(), NOW()),
			('TYPE_2', 'Berbukit, Rendahan, Gambut', 'Kelompok tipe lahan: Berbukit, Rendahan, Gambut', TRUE, NOW(), NOW())
		ON CONFLICT (code) DO UPDATE
		SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			is_active = TRUE,
			updated_at = NOW();
	`).Error; err != nil {
		return err
	}

	isBaseTable, err := isTarifBlokBaseTable(db)
	if err != nil {
		return err
	}
	if !isBaseTable {
		log.Println("Migration 000048 skipped tarif_blok alignment: tarif_blok is not a base table")
		return nil
	}

	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'land_type_id') THEN
				ALTER TABLE tarif_blok ADD COLUMN land_type_id UUID;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'land_type_id') THEN
				ALTER TABLE blocks ADD COLUMN land_type_id UUID;
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		UPDATE tarif_blok tb
		SET land_type_id = lt.id
		FROM land_types lt
		WHERE tb.land_type_id IS NULL
		  AND UPPER(TRIM(COALESCE(tb.scheme_type, ''))) = lt.code;

		UPDATE blocks b
		SET land_type_id = tb.land_type_id
		FROM tarif_blok tb
		WHERE b.tarif_blok_id = tb.id
		  AND b.land_type_id IS NULL
		  AND tb.land_type_id IS NOT NULL;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tarif_blok_land_type') THEN
				ALTER TABLE tarif_blok
				ADD CONSTRAINT fk_tarif_blok_land_type
				FOREIGN KEY (land_type_id) REFERENCES land_types(id)
				ON UPDATE CASCADE ON DELETE SET NULL;
			END IF;

			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_blocks_land_type') THEN
				ALTER TABLE blocks
				ADD CONSTRAINT fk_blocks_land_type
				FOREIGN KEY (land_type_id) REFERENCES land_types(id)
				ON UPDATE CASCADE ON DELETE SET NULL;
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_land_types_code ON land_types(code);
		CREATE INDEX IF NOT EXISTS idx_tarif_blok_land_type_id ON tarif_blok(land_type_id);
		CREATE INDEX IF NOT EXISTS idx_blocks_land_type_id ON blocks(land_type_id);
		CREATE UNIQUE INDEX IF NOT EXISTS uq_tarif_blok_company_land_type_code
			ON tarif_blok(company_id, land_type_id, LOWER(TRIM(tarif_code)))
			WHERE land_type_id IS NOT NULL AND tarif_code IS NOT NULL;
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000048 completed: land_types and tariff/block alignment")
	return nil
}

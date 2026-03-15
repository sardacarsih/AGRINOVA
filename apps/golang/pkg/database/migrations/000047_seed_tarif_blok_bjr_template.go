package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000047SeedTarifBlokBJRTemplate standardizes tarif_blok with
// structured BJR tariff fields and seeds supplier templates per company.
func Migration000047SeedTarifBlokBJRTemplate(db *gorm.DB) error {
	log.Println("Running migration: 000047_seed_tarif_blok_bjr_template")

	isBaseTable, err := isTarifBlokBaseTable(db)
	if err != nil {
		return err
	}
	if !isBaseTable {
		log.Println("Migration 000047 skipped: tarif_blok is not a base table")
		return nil
	}

	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'keterangan') THEN
				ALTER TABLE tarif_blok ADD COLUMN keterangan TEXT;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'tarif_code') THEN
				ALTER TABLE tarif_blok ADD COLUMN tarif_code VARCHAR(20);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'scheme_type') THEN
				ALTER TABLE tarif_blok ADD COLUMN scheme_type VARCHAR(30);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'bjr_min_kg') THEN
				ALTER TABLE tarif_blok ADD COLUMN bjr_min_kg NUMERIC(10,2);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'bjr_max_kg') THEN
				ALTER TABLE tarif_blok ADD COLUMN bjr_max_kg NUMERIC(10,2);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'target_lebih_kg') THEN
				ALTER TABLE tarif_blok ADD COLUMN target_lebih_kg NUMERIC(14,2);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'sort_order') THEN
				ALTER TABLE tarif_blok ADD COLUMN sort_order INTEGER;
			END IF;

			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_tarif_blok_scheme_type') THEN
				ALTER TABLE tarif_blok
				ADD CONSTRAINT check_tarif_blok_scheme_type
				CHECK (scheme_type IS NULL OR scheme_type IN ('KATEGORI_BJR', 'BEDA_LAHAN'));
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		WITH template(tarif_code, scheme_type, bjr_min_kg, bjr_max_kg, basis, tarif_upah, premi, target_lebih_kg, tarif_premi1, sort_order, perlakuan, keterangan) AS (
			VALUES
				('BJR20', 'KATEGORI_BJR', 20::numeric, NULL::numeric, 1000::numeric, 160::numeric, 5000::numeric, 1000::numeric, 175::numeric, 1, 'BJR20 - Kategori BJR', 'Rentang BJR >= 20 Kg'),
				('BJR16', 'KATEGORI_BJR', 16::numeric, 20::numeric, 1100::numeric, 130::numeric, 5000::numeric, 1100::numeric, 160::numeric, 2, 'BJR16 - Kategori BJR', 'Rentang BJR >= 16 dan < 20 Kg'),
				('BJR13', 'KATEGORI_BJR', 13::numeric, 16::numeric, 1150::numeric, 125::numeric, 5000::numeric, 1150::numeric, 153::numeric, 3, 'BJR13 - Kategori BJR', 'Rentang BJR >= 13 dan < 16 Kg'),
				('BJR10', 'KATEGORI_BJR', 10::numeric, 13::numeric, 1100::numeric, 127::numeric, 5000::numeric, 1100::numeric, 155::numeric, 4, 'BJR10 - Kategori BJR', 'Rentang BJR >= 10 dan < 13 Kg'),
				('BJR7', 'KATEGORI_BJR', 7::numeric, 10::numeric, 950::numeric, 150::numeric, 5000::numeric, 950::numeric, 198::numeric, 5, 'BJR7 - Kategori BJR', 'Rentang BJR >= 7 dan < 10 Kg'),
				('BJR4', 'KATEGORI_BJR', 4::numeric, 7::numeric, 750::numeric, 195::numeric, 5000::numeric, 750::numeric, 245::numeric, 6, 'BJR4 - Kategori BJR', 'Rentang BJR >= 4 dan < 7 Kg'),
				('BJR0', 'KATEGORI_BJR', NULL::numeric, 4::numeric, 500::numeric, 290::numeric, 5000::numeric, 500::numeric, 325::numeric, 7, 'BJR0 - Kategori BJR', 'Rentang BJR < 4 Kg'),
				('BJR20', 'BEDA_LAHAN', 20::numeric, NULL::numeric, 1000::numeric, 162::numeric, 5000::numeric, 1000::numeric, 177::numeric, 1, 'BJR20 - Beda Lahan', 'Rentang BJR >= 20 Kg'),
				('BJR16', 'BEDA_LAHAN', 16::numeric, 20::numeric, 1100::numeric, 132::numeric, 5000::numeric, 1100::numeric, 162::numeric, 2, 'BJR16 - Beda Lahan', 'Rentang BJR >= 16 dan < 20 Kg'),
				('BJR13', 'BEDA_LAHAN', 13::numeric, 16::numeric, 1150::numeric, 127::numeric, 5000::numeric, 1150::numeric, 155::numeric, 3, 'BJR13 - Beda Lahan', 'Rentang BJR >= 13 dan < 16 Kg'),
				('BJR10', 'BEDA_LAHAN', 10::numeric, 13::numeric, 1100::numeric, 129::numeric, 5000::numeric, 1100::numeric, 157::numeric, 4, 'BJR10 - Beda Lahan', 'Rentang BJR >= 10 dan < 13 Kg'),
				('BJR7', 'BEDA_LAHAN', 7::numeric, 10::numeric, 950::numeric, 152::numeric, 5000::numeric, 950::numeric, 200::numeric, 5, 'BJR7 - Beda Lahan', 'Rentang BJR >= 7 dan < 10 Kg'),
				('BJR4', 'BEDA_LAHAN', 4::numeric, 7::numeric, 750::numeric, 197::numeric, 5000::numeric, 750::numeric, 247::numeric, 6, 'BJR4 - Beda Lahan', 'Rentang BJR >= 4 dan < 7 Kg'),
				('BJR0', 'BEDA_LAHAN', NULL::numeric, 4::numeric, 500::numeric, 292::numeric, 5000::numeric, 500::numeric, 327::numeric, 7, 'BJR0 - Beda Lahan', 'Rentang BJR < 4 Kg')
		),
		target AS (
			SELECT c.id AS company_id, t.*
			FROM companies c
			CROSS JOIN template t
		),
		updated AS (
			UPDATE tarif_blok tb
			SET
				tarif_code = target.tarif_code,
				scheme_type = target.scheme_type,
				bjr_min_kg = target.bjr_min_kg,
				bjr_max_kg = target.bjr_max_kg,
				target_lebih_kg = target.target_lebih_kg,
				sort_order = target.sort_order,
				perlakuan = target.perlakuan,
				keterangan = target.keterangan,
				basis = target.basis,
				tarif_upah = target.tarif_upah,
				premi = target.premi,
				tarif_premi1 = target.tarif_premi1,
				tarif_premi2 = NULL,
				tarif_libur = NULL,
				tarif_lebaran = NULL,
				is_active = TRUE,
				updated_at = NOW()
			FROM target
			WHERE tb.company_id = target.company_id
			  AND (
				(
					LOWER(TRIM(COALESCE(tb.scheme_type, ''))) = LOWER(TRIM(target.scheme_type))
					AND LOWER(TRIM(COALESCE(tb.tarif_code, ''))) = LOWER(TRIM(target.tarif_code))
				)
				OR LOWER(TRIM(tb.perlakuan)) = LOWER(TRIM(target.perlakuan))
			  )
			RETURNING tb.company_id, tb.perlakuan
		)
		INSERT INTO tarif_blok (
			id,
			company_id,
			perlakuan,
			keterangan,
			tarif_code,
			scheme_type,
			bjr_min_kg,
			bjr_max_kg,
			target_lebih_kg,
			sort_order,
			basis,
			tarif_upah,
			premi,
			tarif_premi1,
			tarif_premi2,
			tarif_libur,
			tarif_lebaran,
			is_active,
			created_at,
			updated_at
		)
		SELECT
			gen_random_uuid(),
			target.company_id,
			target.perlakuan,
			target.keterangan,
			target.tarif_code,
			target.scheme_type,
			target.bjr_min_kg,
			target.bjr_max_kg,
			target.target_lebih_kg,
			target.sort_order,
			target.basis,
			target.tarif_upah,
			target.premi,
			target.tarif_premi1,
			NULL::numeric,
			NULL::numeric,
			NULL::numeric,
			TRUE,
			NOW(),
			NOW()
		FROM target
		LEFT JOIN updated u
			ON u.company_id = target.company_id
			AND LOWER(TRIM(u.perlakuan)) = LOWER(TRIM(target.perlakuan))
		WHERE u.company_id IS NULL
		  AND NOT EXISTS (
			SELECT 1
			FROM tarif_blok tb
			WHERE tb.company_id = target.company_id
			  AND (
				(
					LOWER(TRIM(COALESCE(tb.scheme_type, ''))) = LOWER(TRIM(target.scheme_type))
					AND LOWER(TRIM(COALESCE(tb.tarif_code, ''))) = LOWER(TRIM(target.tarif_code))
				)
				OR LOWER(TRIM(tb.perlakuan)) = LOWER(TRIM(target.perlakuan))
			  )
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		WITH ranked AS (
			SELECT
				id,
				FIRST_VALUE(id) OVER (
					PARTITION BY company_id, LOWER(TRIM(scheme_type)), LOWER(TRIM(tarif_code))
					ORDER BY created_at NULLS LAST, id
				) AS canonical_id
			FROM tarif_blok
			WHERE scheme_type IS NOT NULL
			  AND tarif_code IS NOT NULL
		),
		duplicates AS (
			SELECT id AS duplicate_id, canonical_id
			FROM ranked
			WHERE id <> canonical_id
		)
		UPDATE blocks b
		SET tarif_blok_id = d.canonical_id
		FROM duplicates d
		WHERE b.tarif_blok_id = d.duplicate_id;

		WITH ranked AS (
			SELECT
				id,
				FIRST_VALUE(id) OVER (
					PARTITION BY company_id, LOWER(TRIM(scheme_type)), LOWER(TRIM(tarif_code))
					ORDER BY created_at NULLS LAST, id
				) AS canonical_id
			FROM tarif_blok
			WHERE scheme_type IS NOT NULL
			  AND tarif_code IS NOT NULL
		),
		duplicates AS (
			SELECT id AS duplicate_id
			FROM ranked
			WHERE id <> canonical_id
		)
		DELETE FROM tarif_blok tb
		USING duplicates d
		WHERE tb.id = d.duplicate_id;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_tarif_blok_scheme_type ON tarif_blok(scheme_type);
		CREATE INDEX IF NOT EXISTS idx_tarif_blok_tarif_code ON tarif_blok(tarif_code);
		CREATE UNIQUE INDEX IF NOT EXISTS uq_tarif_blok_company_scheme_code
			ON tarif_blok(company_id, LOWER(TRIM(scheme_type)), LOWER(TRIM(tarif_code)))
			WHERE scheme_type IS NOT NULL AND tarif_code IS NOT NULL;
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000047 completed: tarif_blok BJR templates seeded")
	return nil
}

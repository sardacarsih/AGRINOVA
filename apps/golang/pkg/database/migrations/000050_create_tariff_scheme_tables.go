package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000050CreateTariffSchemeTables creates normalized tariff schema tables:
// - tariff_schemes (header)
// - tariff_scheme_rules (BJR/detail rows)
// - tariff_rule_overrides (NORMAL/HOLIDAY/LEBARAN + effective period)
// and backfills data from legacy tarif_blok rows.
func Migration000050CreateTariffSchemeTables(db *gorm.DB) error {
	log.Println("Running migration: 000050_create_tariff_scheme_tables")

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS tariff_schemes (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			land_type_id UUID,
			scheme_code VARCHAR(50) NOT NULL,
			scheme_name VARCHAR(120) NOT NULL,
			description TEXT,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS tariff_scheme_rules (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			scheme_id UUID NOT NULL,
			tarif_code VARCHAR(30) NOT NULL,
			perlakuan VARCHAR(100) NOT NULL,
			keterangan TEXT,
			bjr_min_kg NUMERIC(10,2),
			bjr_max_kg NUMERIC(10,2),
			basis NUMERIC(14,2),
			tarif_upah NUMERIC(14,2),
			premi NUMERIC(14,2),
			target_lebih_kg NUMERIC(14,2),
			tarif_premi1 NUMERIC(14,2),
			tarif_premi2 NUMERIC(14,2),
			sort_order INTEGER,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS tariff_rule_overrides (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			rule_id UUID NOT NULL,
			override_type VARCHAR(20) NOT NULL,
			effective_from DATE,
			effective_to DATE,
			tarif_upah NUMERIC(14,2),
			premi NUMERIC(14,2),
			tarif_premi1 NUMERIC(14,2),
			tarif_premi2 NUMERIC(14,2),
			notes TEXT,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);
	`).Error; err != nil {
		return err
	}

	isBaseTable, err := isTarifBlokBaseTable(db)
	if err != nil {
		return err
	}
	if !isBaseTable {
		log.Println("Migration 000050 skipped tarif_blok backfill: tarif_blok is not a base table")
		return nil
	}

	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tariff_schemes_company') THEN
				ALTER TABLE tariff_schemes
				ADD CONSTRAINT fk_tariff_schemes_company
				FOREIGN KEY (company_id) REFERENCES companies(id)
				ON UPDATE CASCADE ON DELETE CASCADE;
			END IF;

			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tariff_schemes_land_type') THEN
				ALTER TABLE tariff_schemes
				ADD CONSTRAINT fk_tariff_schemes_land_type
				FOREIGN KEY (land_type_id) REFERENCES land_types(id)
				ON UPDATE CASCADE ON DELETE SET NULL;
			END IF;

			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tariff_scheme_rules_scheme') THEN
				ALTER TABLE tariff_scheme_rules
				ADD CONSTRAINT fk_tariff_scheme_rules_scheme
				FOREIGN KEY (scheme_id) REFERENCES tariff_schemes(id)
				ON UPDATE CASCADE ON DELETE CASCADE;
			END IF;

			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tariff_rule_overrides_rule') THEN
				ALTER TABLE tariff_rule_overrides
				ADD CONSTRAINT fk_tariff_rule_overrides_rule
				FOREIGN KEY (rule_id) REFERENCES tariff_scheme_rules(id)
				ON UPDATE CASCADE ON DELETE CASCADE;
			END IF;

			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_tariff_scheme_rules_bjr_range') THEN
				ALTER TABLE tariff_scheme_rules
				ADD CONSTRAINT check_tariff_scheme_rules_bjr_range
				CHECK (
					bjr_min_kg IS NULL OR bjr_max_kg IS NULL OR bjr_min_kg < bjr_max_kg
				);
			END IF;

			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_tariff_rule_overrides_type') THEN
				ALTER TABLE tariff_rule_overrides
				ADD CONSTRAINT check_tariff_rule_overrides_type
				CHECK (override_type IN ('NORMAL', 'HOLIDAY', 'LEBARAN'));
			END IF;

			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_tariff_rule_overrides_period') THEN
				ALTER TABLE tariff_rule_overrides
				ADD CONSTRAINT check_tariff_rule_overrides_period
				CHECK (
					effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to
				);
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_tariff_schemes_company_id ON tariff_schemes(company_id);
		CREATE INDEX IF NOT EXISTS idx_tariff_schemes_land_type_id ON tariff_schemes(land_type_id);
		CREATE INDEX IF NOT EXISTS idx_tariff_schemes_scheme_code ON tariff_schemes(LOWER(TRIM(scheme_code)));
		CREATE UNIQUE INDEX IF NOT EXISTS uq_tariff_schemes_company_land_type_code
			ON tariff_schemes(
				company_id,
				COALESCE(land_type_id, '00000000-0000-0000-0000-000000000000'::uuid),
				LOWER(TRIM(scheme_code))
			);

		CREATE INDEX IF NOT EXISTS idx_tariff_scheme_rules_scheme_id ON tariff_scheme_rules(scheme_id);
		CREATE INDEX IF NOT EXISTS idx_tariff_scheme_rules_sort_order ON tariff_scheme_rules(sort_order);
		CREATE UNIQUE INDEX IF NOT EXISTS uq_tariff_scheme_rules_scheme_code
			ON tariff_scheme_rules(scheme_id, LOWER(TRIM(tarif_code)));

		CREATE INDEX IF NOT EXISTS idx_tariff_rule_overrides_rule ON tariff_rule_overrides(rule_id);
		CREATE INDEX IF NOT EXISTS idx_tariff_rule_overrides_rule_type_dates
			ON tariff_rule_overrides(rule_id, override_type, effective_from, effective_to)
			WHERE is_active = TRUE;
		CREATE UNIQUE INDEX IF NOT EXISTS uq_tariff_rule_overrides_scope
			ON tariff_rule_overrides(
				rule_id,
				override_type,
				COALESCE(effective_from, DATE '1900-01-01'),
				COALESCE(effective_to, DATE '2999-12-31')
			);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		WITH source AS (
			SELECT DISTINCT
				tb.company_id,
				tb.land_type_id,
				UPPER(TRIM(COALESCE(NULLIF(tb.scheme_type, ''), 'GENERAL'))) AS scheme_code
			FROM tarif_blok tb
			WHERE tb.company_id IS NOT NULL
		)
		INSERT INTO tariff_schemes (
			id,
			company_id,
			land_type_id,
			scheme_code,
			scheme_name,
			description,
			is_active,
			created_at,
			updated_at
		)
		SELECT
			gen_random_uuid(),
			s.company_id,
			s.land_type_id,
			s.scheme_code,
			CASE
				WHEN s.scheme_code = 'KATEGORI_BJR' THEN 'Kategori BJR'
				WHEN s.scheme_code = 'BEDA_LAHAN' THEN 'Beda Lahan'
				WHEN s.scheme_code = 'GENERAL' THEN 'General'
				ELSE INITCAP(REPLACE(LOWER(s.scheme_code), '_', ' '))
			END AS scheme_name,
			'Migrated from tarif_blok',
			TRUE,
			NOW(),
			NOW()
		FROM source s
		WHERE NOT EXISTS (
			SELECT 1
			FROM tariff_schemes ts
			WHERE ts.company_id = s.company_id
			  AND COALESCE(ts.land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
			      = COALESCE(s.land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
			  AND LOWER(TRIM(ts.scheme_code)) = LOWER(TRIM(s.scheme_code))
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		INSERT INTO tariff_scheme_rules (
			id,
			scheme_id,
			tarif_code,
			perlakuan,
			keterangan,
			bjr_min_kg,
			bjr_max_kg,
			basis,
			tarif_upah,
			premi,
			target_lebih_kg,
			tarif_premi1,
			tarif_premi2,
			sort_order,
			is_active,
			created_at,
			updated_at
		)
		SELECT
			tb.id,
			ts.id,
			COALESCE(
				NULLIF(TRIM(tb.tarif_code), ''),
				'LEGACY_' || SUBSTRING(REPLACE(tb.id::text, '-', '') FOR 8)
			) AS tarif_code,
			tb.perlakuan,
			tb.keterangan,
			tb.bjr_min_kg,
			tb.bjr_max_kg,
			tb.basis,
			tb.tarif_upah,
			tb.premi,
			tb.target_lebih_kg,
			tb.tarif_premi1,
			tb.tarif_premi2,
			tb.sort_order,
			COALESCE(tb.is_active, TRUE),
			COALESCE(tb.created_at, NOW()),
			COALESCE(tb.updated_at, NOW())
		FROM tarif_blok tb
		JOIN tariff_schemes ts
		  ON ts.company_id = tb.company_id
		 AND COALESCE(ts.land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
		     = COALESCE(tb.land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
		 AND LOWER(TRIM(ts.scheme_code)) = LOWER(TRIM(COALESCE(NULLIF(tb.scheme_type, ''), 'GENERAL')))
		WHERE NOT EXISTS (
			SELECT 1
			FROM tariff_scheme_rules r
			WHERE r.id = tb.id
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		INSERT INTO tariff_rule_overrides (
			rule_id,
			override_type,
			effective_from,
			effective_to,
			tarif_upah,
			premi,
			tarif_premi1,
			tarif_premi2,
			notes,
			is_active,
			created_at,
			updated_at
		)
		SELECT
			r.id,
			'NORMAL',
			NULL,
			NULL,
			r.tarif_upah,
			r.premi,
			r.tarif_premi1,
			r.tarif_premi2,
			'Default rate (migrated from tarif_blok)',
			r.is_active,
			NOW(),
			NOW()
		FROM tariff_scheme_rules r
		WHERE NOT EXISTS (
			SELECT 1
			FROM tariff_rule_overrides o
			WHERE o.rule_id = r.id
			  AND o.override_type = 'NORMAL'
			  AND o.effective_from IS NULL
			  AND o.effective_to IS NULL
		);

		INSERT INTO tariff_rule_overrides (
			rule_id,
			override_type,
			effective_from,
			effective_to,
			tarif_upah,
			notes,
			is_active,
			created_at,
			updated_at
		)
		SELECT
			tb.id,
			'HOLIDAY',
			NULL,
			NULL,
			tb.tarif_libur,
			'Holiday override (migrated from tarif_blok.tarif_libur)',
			COALESCE(tb.is_active, TRUE),
			NOW(),
			NOW()
		FROM tarif_blok tb
		WHERE tb.tarif_libur IS NOT NULL
		  AND NOT EXISTS (
			SELECT 1
			FROM tariff_rule_overrides o
			WHERE o.rule_id = tb.id
			  AND o.override_type = 'HOLIDAY'
			  AND o.effective_from IS NULL
			  AND o.effective_to IS NULL
		);

		INSERT INTO tariff_rule_overrides (
			rule_id,
			override_type,
			effective_from,
			effective_to,
			tarif_upah,
			notes,
			is_active,
			created_at,
			updated_at
		)
		SELECT
			tb.id,
			'LEBARAN',
			NULL,
			NULL,
			tb.tarif_lebaran,
			'Lebaran override (migrated from tarif_blok.tarif_lebaran)',
			COALESCE(tb.is_active, TRUE),
			NOW(),
			NOW()
		FROM tarif_blok tb
		WHERE tb.tarif_lebaran IS NOT NULL
		  AND NOT EXISTS (
			SELECT 1
			FROM tariff_rule_overrides o
			WHERE o.rule_id = tb.id
			  AND o.override_type = 'LEBARAN'
			  AND o.effective_from IS NULL
			  AND o.effective_to IS NULL
		);
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000050 completed: tariff scheme tables created and backfilled")
	return nil
}

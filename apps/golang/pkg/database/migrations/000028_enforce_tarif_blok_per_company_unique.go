package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000028EnforceTarifBlokPerCompanyUnique ensures perlakuan uniqueness
// is scoped per company (company_id + lower(perlakuan)), not global.
func Migration000028EnforceTarifBlokPerCompanyUnique(db *gorm.DB) error {
	log.Println("Running migration: 000028_enforce_tarif_blok_per_company_unique")

	if err := db.Exec(`
		-- Normalize whitespace to reduce false duplicates.
		UPDATE tarif_blok
		SET perlakuan = TRIM(perlakuan)
		WHERE perlakuan IS NOT NULL;

		-- Remap blocks to canonical tarif_blok row per (company_id, lower(perlakuan)).
		WITH ranked AS (
			SELECT
				id,
				company_id,
				LOWER(TRIM(perlakuan)) AS perlakuan_key,
				ROW_NUMBER() OVER (
					PARTITION BY company_id, LOWER(TRIM(perlakuan))
					ORDER BY created_at NULLS LAST, id
				) AS rn
			FROM tarif_blok
			WHERE company_id IS NOT NULL
				AND perlakuan IS NOT NULL
				AND TRIM(perlakuan) <> ''
		),
		dups AS (
			SELECT
				r.id AS duplicate_id,
				k.id AS canonical_id
			FROM ranked r
			JOIN ranked k
				ON k.company_id = r.company_id
				AND k.perlakuan_key = r.perlakuan_key
				AND k.rn = 1
			WHERE r.rn > 1
		)
		UPDATE blocks b
		SET tarif_blok_id = d.canonical_id
		FROM dups d
		WHERE b.tarif_blok_id = d.duplicate_id;

		-- Delete duplicate tarif_blok rows after remapping.
		WITH ranked AS (
			SELECT
				id,
				ROW_NUMBER() OVER (
					PARTITION BY company_id, LOWER(TRIM(perlakuan))
					ORDER BY created_at NULLS LAST, id
				) AS rn
			FROM tarif_blok
			WHERE company_id IS NOT NULL
				AND perlakuan IS NOT NULL
				AND TRIM(perlakuan) <> ''
		)
		DELETE FROM tarif_blok tb
		USING ranked r
		WHERE tb.id = r.id
			AND r.rn > 1;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DO $$
		DECLARE
			idx RECORD;
		BEGIN
			-- Drop legacy global unique constraint if present.
			IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tarif_blok_perlakuan_key') THEN
				ALTER TABLE tarif_blok DROP CONSTRAINT tarif_blok_perlakuan_key;
			END IF;

			-- Drop legacy unique indexes that only constrain perlakuan globally.
			FOR idx IN
				SELECT indexname
				FROM pg_indexes
				WHERE schemaname = current_schema()
					AND tablename = 'tarif_blok'
					AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
					AND indexdef ILIKE '%(perlakuan%'
					AND indexdef NOT ILIKE '%company_id%'
			LOOP
				EXECUTE format('DROP INDEX IF EXISTS %I', idx.indexname);
			END LOOP;

			-- Recreate scoped unique index safely.
			IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'uq_tarif_blok_company_perlakuan') THEN
				DROP INDEX uq_tarif_blok_company_perlakuan;
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_tarif_blok_company_perlakuan
			ON tarif_blok(company_id, LOWER(TRIM(perlakuan)));
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000028 completed: tarif_blok uniqueness is now scoped by company")
	return nil
}

package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000023AddBlockTarifMetadata adds block status/istm/perlakuan fields
// and creates the tarif_blok master table with 1-to-many relation to blocks.
func Migration000023AddBlockTarifMetadata(db *gorm.DB) error {
	log.Println("Running migration: 000023_add_block_tarif_metadata")

	isBaseTable, err := isTarifBlokBaseTable(db)
	if err != nil {
		return err
	}
	if !isBaseTable {
		log.Println("Migration 000023 skipped: tarif_blok is not a base table")
		return nil
	}

	if err := db.Exec(`
		DO $$
		BEGIN
			-- Master table for block treatment data
			IF NOT EXISTS (
				SELECT 1
				FROM information_schema.tables
				WHERE table_name = 'tarif_blok'
			) THEN
				CREATE TABLE tarif_blok (
					id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
					company_id UUID NOT NULL,
					perlakuan VARCHAR(100) NOT NULL,
					keterangan TEXT,
					tarif_code VARCHAR(20),
					scheme_type VARCHAR(30),
					bjr_min_kg NUMERIC(10,2),
					bjr_max_kg NUMERIC(10,2),
					target_lebih_kg NUMERIC(14,2),
					sort_order INTEGER,
					basis NUMERIC(14,2),
					tarif_upah NUMERIC(14,2),
					premi NUMERIC(14,2),
					tarif_premi1 NUMERIC(14,2),
					tarif_premi2 NUMERIC(14,2),
					tarif_libur NUMERIC(14,2),
					tarif_lebaran NUMERIC(14,2),
					is_active BOOLEAN NOT NULL DEFAULT true,
					created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
					updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
				);
			END IF;

			-- Ensure required columns exist in tarif_blok for legacy databases
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'company_id') THEN
				ALTER TABLE tarif_blok ADD COLUMN company_id UUID;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'is_active') THEN
				ALTER TABLE tarif_blok ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'created_at') THEN
				ALTER TABLE tarif_blok ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'updated_at') THEN
				ALTER TABLE tarif_blok ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'basis') THEN
				ALTER TABLE tarif_blok ADD COLUMN basis NUMERIC(14,2);
			END IF;
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
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'tarif_upah') THEN
				ALTER TABLE tarif_blok ADD COLUMN tarif_upah NUMERIC(14,2);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'premi') THEN
				ALTER TABLE tarif_blok ADD COLUMN premi NUMERIC(14,2);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'tarif_premi1') THEN
				ALTER TABLE tarif_blok ADD COLUMN tarif_premi1 NUMERIC(14,2);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'tarif_premi2') THEN
				ALTER TABLE tarif_blok ADD COLUMN tarif_premi2 NUMERIC(14,2);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'tarif_libur') THEN
				ALTER TABLE tarif_blok ADD COLUMN tarif_libur NUMERIC(14,2);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_blok' AND column_name = 'tarif_lebaran') THEN
				ALTER TABLE tarif_blok ADD COLUMN tarif_lebaran NUMERIC(14,2);
			END IF;

			-- Ensure required columns exist in blocks
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'status') THEN
				ALTER TABLE blocks ADD COLUMN status VARCHAR(10);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'istm') THEN
				ALTER TABLE blocks ADD COLUMN istm CHAR(1);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'perlakuan') THEN
				ALTER TABLE blocks ADD COLUMN perlakuan VARCHAR(100);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'tarif_blok_id') THEN
				ALTER TABLE blocks ADD COLUMN tarif_blok_id UUID;
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		-- Normalize legacy values and enforce defaults
		UPDATE blocks
		SET status = 'INTI'
		WHERE status IS NULL OR UPPER(status) NOT IN ('INTI', 'KKPA');

		UPDATE blocks
		SET status = UPPER(status)
		WHERE status IS NOT NULL;

		UPDATE blocks
		SET istm = 'N'
		WHERE istm IS NULL OR UPPER(istm) NOT IN ('Y', 'N');

		UPDATE blocks
		SET istm = UPPER(istm)
		WHERE istm IS NOT NULL;

		ALTER TABLE blocks ALTER COLUMN status SET DEFAULT 'INTI';
		ALTER TABLE blocks ALTER COLUMN status SET NOT NULL;
		ALTER TABLE blocks ALTER COLUMN istm SET DEFAULT 'N';
		ALTER TABLE blocks ALTER COLUMN istm SET NOT NULL;

		-- Backfill tarif_blok.company_id from existing block usage
		UPDATE tarif_blok tb
		SET company_id = usage.company_id
		FROM (
			SELECT b.tarif_blok_id, MIN(e.company_id::text)::uuid AS company_id
			FROM blocks b
			JOIN divisions d ON d.id = b.division_id
			JOIN estates e ON e.id = d.estate_id
			WHERE b.tarif_blok_id IS NOT NULL
			GROUP BY b.tarif_blok_id
		) usage
		WHERE tb.id = usage.tarif_blok_id
		  AND tb.company_id IS NULL;

		-- Ensure one tarif_blok row exists per (company, perlakuan) used by blocks
		WITH usage AS (
			SELECT DISTINCT
				e.company_id,
				tb.perlakuan,
				tb.is_active,
				tb.created_at,
				tb.updated_at
			FROM blocks b
			JOIN tarif_blok tb ON tb.id = b.tarif_blok_id
			JOIN divisions d ON d.id = b.division_id
			JOIN estates e ON e.id = d.estate_id
			WHERE b.tarif_blok_id IS NOT NULL
		)
		INSERT INTO tarif_blok (id, company_id, perlakuan, is_active, created_at, updated_at)
		SELECT
			gen_random_uuid(),
			u.company_id,
			u.perlakuan,
			u.is_active,
			COALESCE(u.created_at, NOW()),
			COALESCE(u.updated_at, NOW())
		FROM usage u
		LEFT JOIN tarif_blok existing
			ON existing.company_id = u.company_id
			AND LOWER(existing.perlakuan) = LOWER(u.perlakuan)
		WHERE existing.id IS NULL;

		-- Remap blocks to tarif_blok row that matches block company and perlakuan
		WITH remap AS (
			SELECT
				b.id AS block_id,
				mapped.id AS mapped_tarif_id
			FROM blocks b
			JOIN divisions d ON d.id = b.division_id
			JOIN estates e ON e.id = d.estate_id
			JOIN tarif_blok old_tb ON old_tb.id = b.tarif_blok_id
			JOIN tarif_blok mapped
				ON mapped.company_id = e.company_id
				AND LOWER(mapped.perlakuan) = LOWER(old_tb.perlakuan)
			WHERE b.tarif_blok_id IS NOT NULL
			  AND b.tarif_blok_id <> mapped.id
		)
		UPDATE blocks b
		SET tarif_blok_id = remap.mapped_tarif_id
		FROM remap
		WHERE b.id = remap.block_id;

		-- Sync denormalized perlakuan on blocks
		UPDATE blocks b
		SET perlakuan = tb.perlakuan
		FROM tarif_blok tb
		WHERE b.tarif_blok_id = tb.id
		  AND (b.perlakuan IS NULL OR b.perlakuan <> tb.perlakuan);

		-- Remove unusable tariff rows without company
		DELETE FROM tarif_blok tb
		WHERE tb.company_id IS NULL
		  AND NOT EXISTS (
			SELECT 1
			FROM blocks b
			WHERE b.tarif_blok_id = tb.id
		);

		-- Fallback assign remaining NULL company rows to first company (legacy safety)
		UPDATE tarif_blok tb
		SET company_id = c.id
		FROM (
			SELECT id
			FROM companies
			ORDER BY created_at NULLS LAST, id
			LIMIT 1
		) c
		WHERE tb.company_id IS NULL;

		-- Any unresolved row is removed to satisfy NOT NULL requirement
		DELETE FROM tarif_blok
		WHERE company_id IS NULL;

		ALTER TABLE tarif_blok ALTER COLUMN company_id SET NOT NULL;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DO $$
		DECLARE
			idx RECORD;
		BEGIN
			IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tarif_blok_perlakuan_key') THEN
				ALTER TABLE tarif_blok DROP CONSTRAINT tarif_blok_perlakuan_key;
			END IF;

			IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_tarif_blok_company_perlakuan') THEN
				DROP INDEX uq_tarif_blok_company_perlakuan;
			END IF;

			-- Drop legacy UNIQUE indexes that only enforce perlakuan globally.
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

			-- Check constraints
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_blocks_status_inti_kkpa') THEN
				ALTER TABLE blocks
				ADD CONSTRAINT check_blocks_status_inti_kkpa
				CHECK (status IN ('INTI', 'KKPA'));
			END IF;

			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_blocks_istm_yn') THEN
				ALTER TABLE blocks
				ADD CONSTRAINT check_blocks_istm_yn
				CHECK (istm IN ('Y', 'N'));
			END IF;

			-- FK blocks.tarif_blok_id -> tarif_blok.id
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_blocks_tarif_blok') THEN
				ALTER TABLE blocks
				ADD CONSTRAINT fk_blocks_tarif_blok
				FOREIGN KEY (tarif_blok_id) REFERENCES tarif_blok(id)
				ON UPDATE CASCADE ON DELETE SET NULL;
			END IF;

			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tarif_blok_company') THEN
				ALTER TABLE tarif_blok
				ADD CONSTRAINT fk_tarif_blok_company
				FOREIGN KEY (company_id) REFERENCES companies(id)
				ON UPDATE CASCADE ON DELETE CASCADE;
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_tarif_blok_company_perlakuan ON tarif_blok(company_id, LOWER(perlakuan));
		CREATE INDEX IF NOT EXISTS idx_tarif_blok_company_id ON tarif_blok(company_id);
		CREATE INDEX IF NOT EXISTS idx_tarif_blok_perlakuan ON tarif_blok(LOWER(perlakuan));
		CREATE INDEX IF NOT EXISTS idx_blocks_tarif_blok_id ON blocks(tarif_blok_id);
		CREATE INDEX IF NOT EXISTS idx_blocks_status ON blocks(status);
		CREATE INDEX IF NOT EXISTS idx_blocks_istm ON blocks(istm);
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000023 completed: block tarif metadata is available")
	return nil
}

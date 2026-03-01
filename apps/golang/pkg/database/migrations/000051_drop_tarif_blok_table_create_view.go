package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000051DropTarifBlokTableCreateView removes tarif_blok as a physical
// table and replaces it with a compatibility view backed by:
// - tariff_schemes
// - tariff_scheme_rules
// - tariff_rule_overrides
func Migration000051DropTarifBlokTableCreateView(db *gorm.DB) error {
	log.Println("Running migration: 000051_drop_tarif_blok_table_create_view")

	if err := db.Exec(`
		DO $$
		DECLARE
			relkind "char";
		BEGIN
			SELECT c.relkind
			INTO relkind
			FROM pg_class c
			JOIN pg_namespace n ON n.oid = c.relnamespace
			WHERE n.nspname = current_schema()
			  AND c.relname = 'tarif_blok'
			LIMIT 1;

			IF relkind = 'r' THEN
				IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_blocks_tarif_blok') THEN
					ALTER TABLE blocks DROP CONSTRAINT fk_blocks_tarif_blok;
				END IF;
				DROP TABLE tarif_blok CASCADE;
			ELSIF relkind = 'v' THEN
				DROP VIEW tarif_blok CASCADE;
			ELSIF relkind = 'm' THEN
				DROP MATERIALIZED VIEW tarif_blok CASCADE;
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE OR REPLACE VIEW tarif_blok AS
		SELECT
			r.id AS id,
			s.company_id AS company_id,
			r.perlakuan AS perlakuan,
			r.keterangan AS keterangan,
			s.land_type_id AS land_type_id,
			r.tarif_code AS tarif_code,
			s.scheme_code AS scheme_type,
			r.bjr_min_kg AS bjr_min_kg,
			r.bjr_max_kg AS bjr_max_kg,
			r.target_lebih_kg AS target_lebih_kg,
			r.sort_order AS sort_order,
			r.basis AS basis,
			n.tarif_upah AS tarif_upah,
			n.premi AS premi,
			n.tarif_premi1 AS tarif_premi1,
			n.tarif_premi2 AS tarif_premi2,
			h.tarif_upah AS tarif_libur,
			l.tarif_upah AS tarif_lebaran,
			r.is_active AS is_active,
			r.created_at AS created_at,
			r.updated_at AS updated_at
		FROM tariff_scheme_rules r
		JOIN tariff_schemes s
		  ON s.id = r.scheme_id
		LEFT JOIN tariff_rule_overrides n
		  ON n.rule_id = r.id
		 AND n.override_type = 'NORMAL'
		 AND n.is_active = TRUE
		 AND n.effective_from IS NULL
		 AND n.effective_to IS NULL
		LEFT JOIN tariff_rule_overrides h
		  ON h.rule_id = r.id
		 AND h.override_type = 'HOLIDAY'
		 AND h.is_active = TRUE
		 AND h.effective_from IS NULL
		 AND h.effective_to IS NULL
		LEFT JOIN tariff_rule_overrides l
		  ON l.rule_id = r.id
		 AND l.override_type = 'LEBARAN'
		 AND l.is_active = TRUE
		 AND l.effective_from IS NULL
		 AND l.effective_to IS NULL;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE OR REPLACE FUNCTION trg_fn_tarif_blok_view_insert()
		RETURNS trigger
		LANGUAGE plpgsql
		AS $$
		DECLARE
			v_scheme_id UUID;
			v_scheme_code TEXT;
			v_scheme_name TEXT;
			v_rule_id UUID;
			v_tarif_code TEXT;
		BEGIN
			IF NEW.company_id IS NULL THEN
				RAISE EXCEPTION 'company_id is required';
			END IF;
			IF NEW.perlakuan IS NULL OR BTRIM(NEW.perlakuan) = '' THEN
				RAISE EXCEPTION 'perlakuan is required';
			END IF;

			v_scheme_code := UPPER(BTRIM(COALESCE(NULLIF(NEW.scheme_type, ''), 'GENERAL')));
			v_scheme_name := CASE
				WHEN v_scheme_code = 'KATEGORI_BJR' THEN 'Kategori BJR'
				WHEN v_scheme_code = 'BEDA_LAHAN' THEN 'Beda Lahan'
				WHEN v_scheme_code = 'GENERAL' THEN 'General'
				ELSE INITCAP(REPLACE(LOWER(v_scheme_code), '_', ' '))
			END;

			SELECT id INTO v_scheme_id
			FROM tariff_schemes
			WHERE company_id = NEW.company_id
			  AND COALESCE(land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
			      = COALESCE(NEW.land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
			  AND LOWER(TRIM(scheme_code)) = LOWER(TRIM(v_scheme_code))
			LIMIT 1;

			IF v_scheme_id IS NULL THEN
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
				) VALUES (
					gen_random_uuid(),
					NEW.company_id,
					NEW.land_type_id,
					v_scheme_code,
					v_scheme_name,
					'Created via tarif_blok compatibility view',
					COALESCE(NEW.is_active, TRUE),
					NOW(),
					NOW()
				)
				RETURNING id INTO v_scheme_id;
			END IF;

			v_rule_id := COALESCE(NEW.id, gen_random_uuid());
			v_tarif_code := COALESCE(
				NULLIF(UPPER(BTRIM(COALESCE(NEW.tarif_code, ''))), ''),
				'LEGACY_' || SUBSTRING(REPLACE(v_rule_id::text, '-', '') FOR 8)
			);

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
			) VALUES (
				v_rule_id,
				v_scheme_id,
				v_tarif_code,
				NEW.perlakuan,
				NEW.keterangan,
				NEW.bjr_min_kg,
				NEW.bjr_max_kg,
				NEW.basis,
				NEW.tarif_upah,
				NEW.premi,
				NEW.target_lebih_kg,
				NEW.tarif_premi1,
				NEW.tarif_premi2,
				NEW.sort_order,
				COALESCE(NEW.is_active, TRUE),
				COALESCE(NEW.created_at, NOW()),
				NOW()
			)
			ON CONFLICT (id) DO UPDATE SET
				scheme_id = EXCLUDED.scheme_id,
				tarif_code = EXCLUDED.tarif_code,
				perlakuan = EXCLUDED.perlakuan,
				keterangan = EXCLUDED.keterangan,
				bjr_min_kg = EXCLUDED.bjr_min_kg,
				bjr_max_kg = EXCLUDED.bjr_max_kg,
				basis = EXCLUDED.basis,
				tarif_upah = EXCLUDED.tarif_upah,
				premi = EXCLUDED.premi,
				target_lebih_kg = EXCLUDED.target_lebih_kg,
				tarif_premi1 = EXCLUDED.tarif_premi1,
				tarif_premi2 = EXCLUDED.tarif_premi2,
				sort_order = EXCLUDED.sort_order,
				is_active = EXCLUDED.is_active,
				updated_at = NOW();

			DELETE FROM tariff_rule_overrides
			WHERE rule_id = v_rule_id
			  AND effective_from IS NULL
			  AND effective_to IS NULL
			  AND override_type IN ('NORMAL', 'HOLIDAY', 'LEBARAN');

			INSERT INTO tariff_rule_overrides (
				id,
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
			) VALUES (
				gen_random_uuid(),
				v_rule_id,
				'NORMAL',
				NULL,
				NULL,
				NEW.tarif_upah,
				NEW.premi,
				NEW.tarif_premi1,
				NEW.tarif_premi2,
				'Default rate via tarif_blok compatibility view',
				COALESCE(NEW.is_active, TRUE),
				NOW(),
				NOW()
			);

			IF NEW.tarif_libur IS NOT NULL THEN
				INSERT INTO tariff_rule_overrides (
					id,
					rule_id,
					override_type,
					effective_from,
					effective_to,
					tarif_upah,
					notes,
					is_active,
					created_at,
					updated_at
				) VALUES (
					gen_random_uuid(),
					v_rule_id,
					'HOLIDAY',
					NULL,
					NULL,
					NEW.tarif_libur,
					'Holiday override via tarif_blok compatibility view',
					COALESCE(NEW.is_active, TRUE),
					NOW(),
					NOW()
				);
			END IF;

			IF NEW.tarif_lebaran IS NOT NULL THEN
				INSERT INTO tariff_rule_overrides (
					id,
					rule_id,
					override_type,
					effective_from,
					effective_to,
					tarif_upah,
					notes,
					is_active,
					created_at,
					updated_at
				) VALUES (
					gen_random_uuid(),
					v_rule_id,
					'LEBARAN',
					NULL,
					NULL,
					NEW.tarif_lebaran,
					'Lebaran override via tarif_blok compatibility view',
					COALESCE(NEW.is_active, TRUE),
					NOW(),
					NOW()
				);
			END IF;

			NEW.id := v_rule_id;
			NEW.tarif_code := v_tarif_code;
			NEW.scheme_type := v_scheme_code;
			NEW.created_at := COALESCE(NEW.created_at, NOW());
			NEW.updated_at := NOW();
			RETURN NEW;
		END;
		$$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE OR REPLACE FUNCTION trg_fn_tarif_blok_view_update()
		RETURNS trigger
		LANGUAGE plpgsql
		AS $$
		DECLARE
			v_scheme_id UUID;
			v_scheme_code TEXT;
			v_scheme_name TEXT;
			v_rule_id UUID;
			v_tarif_code TEXT;
		BEGIN
			IF OLD.id IS NULL THEN
				RAISE EXCEPTION 'id is required';
			END IF;
			IF NEW.company_id IS NULL THEN
				RAISE EXCEPTION 'company_id is required';
			END IF;
			IF NEW.perlakuan IS NULL OR BTRIM(NEW.perlakuan) = '' THEN
				RAISE EXCEPTION 'perlakuan is required';
			END IF;

			v_rule_id := OLD.id;
			v_scheme_code := UPPER(BTRIM(COALESCE(NULLIF(NEW.scheme_type, ''), 'GENERAL')));
			v_scheme_name := CASE
				WHEN v_scheme_code = 'KATEGORI_BJR' THEN 'Kategori BJR'
				WHEN v_scheme_code = 'BEDA_LAHAN' THEN 'Beda Lahan'
				WHEN v_scheme_code = 'GENERAL' THEN 'General'
				ELSE INITCAP(REPLACE(LOWER(v_scheme_code), '_', ' '))
			END;

			SELECT id INTO v_scheme_id
			FROM tariff_schemes
			WHERE company_id = NEW.company_id
			  AND COALESCE(land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
			      = COALESCE(NEW.land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
			  AND LOWER(TRIM(scheme_code)) = LOWER(TRIM(v_scheme_code))
			LIMIT 1;

			IF v_scheme_id IS NULL THEN
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
				) VALUES (
					gen_random_uuid(),
					NEW.company_id,
					NEW.land_type_id,
					v_scheme_code,
					v_scheme_name,
					'Created via tarif_blok compatibility view',
					COALESCE(NEW.is_active, TRUE),
					NOW(),
					NOW()
				)
				RETURNING id INTO v_scheme_id;
			END IF;

			v_tarif_code := COALESCE(
				NULLIF(UPPER(BTRIM(COALESCE(NEW.tarif_code, ''))), ''),
				'LEGACY_' || SUBSTRING(REPLACE(v_rule_id::text, '-', '') FOR 8)
			);

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
			) VALUES (
				v_rule_id,
				v_scheme_id,
				v_tarif_code,
				NEW.perlakuan,
				NEW.keterangan,
				NEW.bjr_min_kg,
				NEW.bjr_max_kg,
				NEW.basis,
				NEW.tarif_upah,
				NEW.premi,
				NEW.target_lebih_kg,
				NEW.tarif_premi1,
				NEW.tarif_premi2,
				NEW.sort_order,
				COALESCE(NEW.is_active, TRUE),
				COALESCE(OLD.created_at, NOW()),
				NOW()
			)
			ON CONFLICT (id) DO UPDATE SET
				scheme_id = EXCLUDED.scheme_id,
				tarif_code = EXCLUDED.tarif_code,
				perlakuan = EXCLUDED.perlakuan,
				keterangan = EXCLUDED.keterangan,
				bjr_min_kg = EXCLUDED.bjr_min_kg,
				bjr_max_kg = EXCLUDED.bjr_max_kg,
				basis = EXCLUDED.basis,
				tarif_upah = EXCLUDED.tarif_upah,
				premi = EXCLUDED.premi,
				target_lebih_kg = EXCLUDED.target_lebih_kg,
				tarif_premi1 = EXCLUDED.tarif_premi1,
				tarif_premi2 = EXCLUDED.tarif_premi2,
				sort_order = EXCLUDED.sort_order,
				is_active = EXCLUDED.is_active,
				updated_at = NOW();

			DELETE FROM tariff_rule_overrides
			WHERE rule_id = v_rule_id
			  AND effective_from IS NULL
			  AND effective_to IS NULL
			  AND override_type IN ('NORMAL', 'HOLIDAY', 'LEBARAN');

			INSERT INTO tariff_rule_overrides (
				id,
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
			) VALUES (
				gen_random_uuid(),
				v_rule_id,
				'NORMAL',
				NULL,
				NULL,
				NEW.tarif_upah,
				NEW.premi,
				NEW.tarif_premi1,
				NEW.tarif_premi2,
				'Default rate via tarif_blok compatibility view',
				COALESCE(NEW.is_active, TRUE),
				NOW(),
				NOW()
			);

			IF NEW.tarif_libur IS NOT NULL THEN
				INSERT INTO tariff_rule_overrides (
					id,
					rule_id,
					override_type,
					effective_from,
					effective_to,
					tarif_upah,
					notes,
					is_active,
					created_at,
					updated_at
				) VALUES (
					gen_random_uuid(),
					v_rule_id,
					'HOLIDAY',
					NULL,
					NULL,
					NEW.tarif_libur,
					'Holiday override via tarif_blok compatibility view',
					COALESCE(NEW.is_active, TRUE),
					NOW(),
					NOW()
				);
			END IF;

			IF NEW.tarif_lebaran IS NOT NULL THEN
				INSERT INTO tariff_rule_overrides (
					id,
					rule_id,
					override_type,
					effective_from,
					effective_to,
					tarif_upah,
					notes,
					is_active,
					created_at,
					updated_at
				) VALUES (
					gen_random_uuid(),
					v_rule_id,
					'LEBARAN',
					NULL,
					NULL,
					NEW.tarif_lebaran,
					'Lebaran override via tarif_blok compatibility view',
					COALESCE(NEW.is_active, TRUE),
					NOW(),
					NOW()
				);
			END IF;

			NEW.id := v_rule_id;
			NEW.tarif_code := v_tarif_code;
			NEW.scheme_type := v_scheme_code;
			NEW.created_at := COALESCE(OLD.created_at, NOW());
			NEW.updated_at := NOW();
			RETURN NEW;
		END;
		$$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE OR REPLACE FUNCTION trg_fn_tarif_blok_view_delete()
		RETURNS trigger
		LANGUAGE plpgsql
		AS $$
		BEGIN
			DELETE FROM tariff_scheme_rules
			WHERE id = OLD.id;

			DELETE FROM tariff_schemes s
			WHERE NOT EXISTS (
				SELECT 1
				FROM tariff_scheme_rules r
				WHERE r.scheme_id = s.id
			);

			RETURN OLD;
		END;
		$$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DROP TRIGGER IF EXISTS trg_tarif_blok_view_insert ON tarif_blok;
		DROP TRIGGER IF EXISTS trg_tarif_blok_view_update ON tarif_blok;
		DROP TRIGGER IF EXISTS trg_tarif_blok_view_delete ON tarif_blok;

		CREATE TRIGGER trg_tarif_blok_view_insert
		INSTEAD OF INSERT ON tarif_blok
		FOR EACH ROW
		EXECUTE FUNCTION trg_fn_tarif_blok_view_insert();

		CREATE TRIGGER trg_tarif_blok_view_update
		INSTEAD OF UPDATE ON tarif_blok
		FOR EACH ROW
		EXECUTE FUNCTION trg_fn_tarif_blok_view_update();

		CREATE TRIGGER trg_tarif_blok_view_delete
		INSTEAD OF DELETE ON tarif_blok
		FOR EACH ROW
		EXECUTE FUNCTION trg_fn_tarif_blok_view_delete();
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DO $$
		BEGIN
			IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_blocks_tarif_blok') THEN
				ALTER TABLE blocks DROP CONSTRAINT fk_blocks_tarif_blok;
			END IF;

			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_blocks_tariff_scheme_rule') THEN
				ALTER TABLE blocks
				ADD CONSTRAINT fk_blocks_tariff_scheme_rule
				FOREIGN KEY (tarif_blok_id) REFERENCES tariff_scheme_rules(id)
				ON UPDATE CASCADE ON DELETE SET NULL;
			END IF;
		END $$;

		CREATE INDEX IF NOT EXISTS idx_blocks_tarif_blok_id ON blocks(tarif_blok_id);
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000051 completed: tarif_blok table dropped and replaced by compatibility view")
	return nil
}

package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000052CreateBlockTariffChangeLogs creates audit logs and reporting
// views to track tariff changes affecting each block.
func Migration000052CreateBlockTariffChangeLogs(db *gorm.DB) error {
	log.Println("Running migration: 000052_create_block_tariff_change_logs")

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS block_tariff_change_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			event_type VARCHAR(40) NOT NULL,
			company_id UUID,
			block_id UUID,
			rule_id UUID,
			override_id UUID,
			override_type VARCHAR(20),
			effective_from DATE,
			effective_to DATE,
			old_tarif_blok_id UUID,
			new_tarif_blok_id UUID,
			old_values JSONB,
			new_values JSONB,
			changed_by TEXT,
			changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_block_tariff_change_logs_block
			ON block_tariff_change_logs(block_id);
		CREATE INDEX IF NOT EXISTS idx_block_tariff_change_logs_rule
			ON block_tariff_change_logs(rule_id);
		CREATE INDEX IF NOT EXISTS idx_block_tariff_change_logs_company
			ON block_tariff_change_logs(company_id);
		CREATE INDEX IF NOT EXISTS idx_block_tariff_change_logs_event
			ON block_tariff_change_logs(event_type);
		CREATE INDEX IF NOT EXISTS idx_block_tariff_change_logs_changed_at
			ON block_tariff_change_logs(changed_at DESC);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE OR REPLACE FUNCTION trg_fn_block_tariff_current_actor()
		RETURNS TEXT
		LANGUAGE plpgsql
		AS $$
		BEGIN
			RETURN COALESCE(NULLIF(current_setting('app.user_id', true), ''), current_user);
		END;
		$$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE OR REPLACE FUNCTION trg_fn_log_block_tariff_assignment_change()
		RETURNS trigger
		LANGUAGE plpgsql
		AS $$
		DECLARE
			v_company_id UUID;
		BEGIN
			IF NEW.tarif_blok_id IS NOT DISTINCT FROM OLD.tarif_blok_id THEN
				RETURN NEW;
			END IF;

			SELECT e.company_id
			INTO v_company_id
			FROM divisions d
			JOIN estates e ON e.id = d.estate_id
			WHERE d.id = COALESCE(NEW.division_id, OLD.division_id)
			LIMIT 1;

			INSERT INTO block_tariff_change_logs (
				event_type,
				company_id,
				block_id,
				rule_id,
				old_tarif_blok_id,
				new_tarif_blok_id,
				old_values,
				new_values,
				changed_by,
				changed_at
			) VALUES (
				'BLOCK_ASSIGNMENT_CHANGED',
				v_company_id,
				NEW.id,
				NEW.tarif_blok_id,
				OLD.tarif_blok_id,
				NEW.tarif_blok_id,
				jsonb_build_object(
					'tarif_blok_id', OLD.tarif_blok_id,
					'perlakuan', OLD.perlakuan
				),
				jsonb_build_object(
					'tarif_blok_id', NEW.tarif_blok_id,
					'perlakuan', NEW.perlakuan
				),
				trg_fn_block_tariff_current_actor(),
				NOW()
			);

			RETURN NEW;
		END;
		$$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE OR REPLACE FUNCTION trg_fn_log_tariff_rule_change_by_block()
		RETURNS trigger
		LANGUAGE plpgsql
		AS $$
		BEGIN
			IF ROW(
				OLD.scheme_id,
				OLD.tarif_code,
				OLD.perlakuan,
				OLD.keterangan,
				OLD.bjr_min_kg,
				OLD.bjr_max_kg,
				OLD.basis,
				OLD.tarif_upah,
				OLD.premi,
				OLD.target_lebih_kg,
				OLD.tarif_premi1,
				OLD.tarif_premi2,
				OLD.sort_order,
				OLD.is_active
			) IS NOT DISTINCT FROM ROW(
				NEW.scheme_id,
				NEW.tarif_code,
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
				NEW.is_active
			) THEN
				RETURN NEW;
			END IF;

			INSERT INTO block_tariff_change_logs (
				event_type,
				company_id,
				block_id,
				rule_id,
				old_tarif_blok_id,
				new_tarif_blok_id,
				old_values,
				new_values,
				changed_by,
				changed_at
			)
			SELECT
				'RULE_VALUES_UPDATED',
				e.company_id,
				b.id,
				NEW.id,
				OLD.id,
				NEW.id,
				row_to_json(OLD)::jsonb,
				row_to_json(NEW)::jsonb,
				trg_fn_block_tariff_current_actor(),
				NOW()
			FROM blocks b
			JOIN divisions d ON d.id = b.division_id
			JOIN estates e ON e.id = d.estate_id
			WHERE b.tarif_blok_id = NEW.id;

			RETURN NEW;
		END;
		$$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE OR REPLACE FUNCTION trg_fn_log_tariff_override_insert_by_block()
		RETURNS trigger
		LANGUAGE plpgsql
		AS $$
		BEGIN
			INSERT INTO block_tariff_change_logs (
				event_type,
				company_id,
				block_id,
				rule_id,
				override_id,
				override_type,
				effective_from,
				effective_to,
				old_tarif_blok_id,
				new_tarif_blok_id,
				old_values,
				new_values,
				changed_by,
				changed_at
			)
			SELECT
				'OVERRIDE_CREATED',
				e.company_id,
				b.id,
				NEW.rule_id,
				NEW.id,
				NEW.override_type,
				NEW.effective_from,
				NEW.effective_to,
				NEW.rule_id,
				NEW.rule_id,
				NULL,
				row_to_json(NEW)::jsonb,
				trg_fn_block_tariff_current_actor(),
				NOW()
			FROM blocks b
			JOIN divisions d ON d.id = b.division_id
			JOIN estates e ON e.id = d.estate_id
			WHERE b.tarif_blok_id = NEW.rule_id;

			RETURN NEW;
		END;
		$$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE OR REPLACE FUNCTION trg_fn_log_tariff_override_update_by_block()
		RETURNS trigger
		LANGUAGE plpgsql
		AS $$
		BEGIN
			IF ROW(
				OLD.rule_id,
				OLD.override_type,
				OLD.effective_from,
				OLD.effective_to,
				OLD.tarif_upah,
				OLD.premi,
				OLD.tarif_premi1,
				OLD.tarif_premi2,
				OLD.notes,
				OLD.is_active
			) IS NOT DISTINCT FROM ROW(
				NEW.rule_id,
				NEW.override_type,
				NEW.effective_from,
				NEW.effective_to,
				NEW.tarif_upah,
				NEW.premi,
				NEW.tarif_premi1,
				NEW.tarif_premi2,
				NEW.notes,
				NEW.is_active
			) THEN
				RETURN NEW;
			END IF;

			INSERT INTO block_tariff_change_logs (
				event_type,
				company_id,
				block_id,
				rule_id,
				override_id,
				override_type,
				effective_from,
				effective_to,
				old_tarif_blok_id,
				new_tarif_blok_id,
				old_values,
				new_values,
				changed_by,
				changed_at
			)
			SELECT
				'OVERRIDE_UPDATED',
				affected.company_id,
				affected.block_id,
				NEW.rule_id,
				NEW.id,
				NEW.override_type,
				NEW.effective_from,
				NEW.effective_to,
				OLD.rule_id,
				NEW.rule_id,
				row_to_json(OLD)::jsonb,
				row_to_json(NEW)::jsonb,
				trg_fn_block_tariff_current_actor(),
				NOW()
			FROM (
				SELECT b.id AS block_id, e.company_id
				FROM blocks b
				JOIN divisions d ON d.id = b.division_id
				JOIN estates e ON e.id = d.estate_id
				WHERE b.tarif_blok_id = OLD.rule_id
				UNION
				SELECT b.id AS block_id, e.company_id
				FROM blocks b
				JOIN divisions d ON d.id = b.division_id
				JOIN estates e ON e.id = d.estate_id
				WHERE b.tarif_blok_id = NEW.rule_id
			) AS affected;

			RETURN NEW;
		END;
		$$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE OR REPLACE FUNCTION trg_fn_log_tariff_override_delete_by_block()
		RETURNS trigger
		LANGUAGE plpgsql
		AS $$
		BEGIN
			INSERT INTO block_tariff_change_logs (
				event_type,
				company_id,
				block_id,
				rule_id,
				override_id,
				override_type,
				effective_from,
				effective_to,
				old_tarif_blok_id,
				new_tarif_blok_id,
				old_values,
				new_values,
				changed_by,
				changed_at
			)
			SELECT
				'OVERRIDE_DELETED',
				e.company_id,
				b.id,
				OLD.rule_id,
				OLD.id,
				OLD.override_type,
				OLD.effective_from,
				OLD.effective_to,
				OLD.rule_id,
				OLD.rule_id,
				row_to_json(OLD)::jsonb,
				NULL,
				trg_fn_block_tariff_current_actor(),
				NOW()
			FROM blocks b
			JOIN divisions d ON d.id = b.division_id
			JOIN estates e ON e.id = d.estate_id
			WHERE b.tarif_blok_id = OLD.rule_id;

			RETURN OLD;
		END;
		$$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DROP TRIGGER IF EXISTS trg_block_tariff_assignment_change ON blocks;
		CREATE TRIGGER trg_block_tariff_assignment_change
		AFTER UPDATE OF tarif_blok_id ON blocks
		FOR EACH ROW
		EXECUTE FUNCTION trg_fn_log_block_tariff_assignment_change();

		DROP TRIGGER IF EXISTS trg_tariff_scheme_rule_change_log ON tariff_scheme_rules;
		CREATE TRIGGER trg_tariff_scheme_rule_change_log
		AFTER UPDATE OF
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
			is_active
		ON tariff_scheme_rules
		FOR EACH ROW
		EXECUTE FUNCTION trg_fn_log_tariff_rule_change_by_block();

		DROP TRIGGER IF EXISTS trg_tariff_override_insert_log ON tariff_rule_overrides;
		CREATE TRIGGER trg_tariff_override_insert_log
		AFTER INSERT ON tariff_rule_overrides
		FOR EACH ROW
		EXECUTE FUNCTION trg_fn_log_tariff_override_insert_by_block();

		DROP TRIGGER IF EXISTS trg_tariff_override_update_log ON tariff_rule_overrides;
		CREATE TRIGGER trg_tariff_override_update_log
		AFTER UPDATE OF
			rule_id,
			override_type,
			effective_from,
			effective_to,
			tarif_upah,
			premi,
			tarif_premi1,
			tarif_premi2,
			notes,
			is_active
		ON tariff_rule_overrides
		FOR EACH ROW
		EXECUTE FUNCTION trg_fn_log_tariff_override_update_by_block();

		DROP TRIGGER IF EXISTS trg_tariff_override_delete_log ON tariff_rule_overrides;
		CREATE TRIGGER trg_tariff_override_delete_log
		AFTER DELETE ON tariff_rule_overrides
		FOR EACH ROW
		EXECUTE FUNCTION trg_fn_log_tariff_override_delete_by_block();
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE OR REPLACE VIEW v_block_tariff_changes AS
		SELECT
			l.id,
			l.changed_at,
			l.event_type,
			l.changed_by,
			l.company_id,
			c.name AS company_name,
			l.block_id,
			b.block_code,
			b.name AS block_name,
			d.id AS division_id,
			d.name AS division_name,
			e.id AS estate_id,
			e.name AS estate_name,
			l.rule_id,
			r.tarif_code,
			r.perlakuan AS rule_perlakuan,
			l.override_id,
			l.override_type,
			l.effective_from,
			l.effective_to,
			l.old_tarif_blok_id,
			l.new_tarif_blok_id,
			l.old_values,
			l.new_values
		FROM block_tariff_change_logs l
		LEFT JOIN blocks b ON b.id = l.block_id
		LEFT JOIN divisions d ON d.id = b.division_id
		LEFT JOIN estates e ON e.id = d.estate_id
		LEFT JOIN companies c ON c.id = COALESCE(l.company_id, e.company_id)
		LEFT JOIN tariff_scheme_rules r ON r.id = l.rule_id;

		CREATE OR REPLACE VIEW v_block_tariff_latest_change AS
		SELECT
			s.id,
			s.changed_at,
			s.event_type,
			s.changed_by,
			s.company_id,
			s.company_name,
			s.block_id,
			s.block_code,
			s.block_name,
			s.division_id,
			s.division_name,
			s.estate_id,
			s.estate_name,
			s.rule_id,
			s.tarif_code,
			s.rule_perlakuan,
			s.override_id,
			s.override_type,
			s.effective_from,
			s.effective_to,
			s.old_tarif_blok_id,
			s.new_tarif_blok_id,
			s.old_values,
			s.new_values
		FROM (
			SELECT
				v.*,
				ROW_NUMBER() OVER (
					PARTITION BY v.block_id
					ORDER BY v.changed_at DESC, v.id DESC
				) AS row_num
			FROM v_block_tariff_changes v
			WHERE v.block_id IS NOT NULL
		) s
		WHERE s.row_num = 1;
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000052 completed: block tariff change logging and reporting views created")
	return nil
}

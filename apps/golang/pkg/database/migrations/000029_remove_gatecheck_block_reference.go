package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000029RemoveGateCheckBlockReference removes FK references from
// gate_check_records to blocks while keeping block_id as a plain UUID column.
func Migration000029RemoveGateCheckBlockReference(db *gorm.DB) error {
	log.Println("Running migration: 000029_remove_gatecheck_block_reference")

	if err := db.Exec(`
		DO $$
		DECLARE
			fk RECORD;
		BEGIN
			FOR fk IN
				SELECT c.conname
				FROM pg_constraint c
				JOIN pg_class src ON src.oid = c.conrelid
				JOIN pg_namespace nsp ON nsp.oid = src.relnamespace
				JOIN pg_class ref ON ref.oid = c.confrelid
				WHERE c.contype = 'f'
					AND nsp.nspname = current_schema()
					AND src.relname = 'gate_check_records'
					AND ref.relname = 'blocks'
			LOOP
				EXECUTE format(
					'ALTER TABLE gate_check_records DROP CONSTRAINT IF EXISTS %I',
					fk.conname
				);
			END LOOP;
		END $$;
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000029 completed: gate_check_records no longer references blocks")
	return nil
}

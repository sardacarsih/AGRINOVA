package migrations

import (
	"fmt"

	"gorm.io/gorm"
)

// Migration000012RemoveGuestColumns removes guest* prefixed columns from gate_guest_logs table
func Migration000012RemoveGuestColumns(db *gorm.DB) error {
	fmt.Println("[Migration 000012] Removing guest* columns from gate_guest_logs table...")

	// List of columns to drop
	columns := []string{
		"guest_id",
		"guest_name",
		"guest_company",
		"guest_purpose",
		"guest_phone",
		"guest_email",
	}

	// Drop each column if it exists
	for _, column := range columns {
		sql := fmt.Sprintf(`
			DO $$
			BEGIN
				IF EXISTS (
					SELECT 1 FROM information_schema.columns
					WHERE table_name = 'gate_guest_logs' AND column_name = '%s'
				) THEN
					ALTER TABLE gate_guest_logs DROP COLUMN %s;
					RAISE NOTICE 'Dropped column %s from gate_guest_logs';
				ELSE
					RAISE NOTICE 'Column %s does not exist in gate_guest_logs, skipping';
				END IF;
			END $$;
		`, column, column, column, column)

		if err := db.Exec(sql).Error; err != nil {
			return fmt.Errorf("failed to drop column %s: %w", column, err)
		}
		fmt.Printf("  - Dropped column: %s\n", column)
	}

	fmt.Println("[Migration 000012] Completed removing guest* columns")
	return nil
}

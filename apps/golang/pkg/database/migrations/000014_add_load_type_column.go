package migrations

import (
	"fmt"

	"gorm.io/gorm"
)

// Migration000014AddLoadTypeColumn adds load_type column to the gate_guest_logs table.
func Migration000014AddLoadTypeColumn(db *gorm.DB) error {
	fmt.Println("[Migration 000014] Adding load_type column to gate_guest_logs table...")

	// SQL to check and add column
	sql := `
		DO $$
		BEGIN
			-- Add load_type column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='load_type') THEN
				ALTER TABLE gate_guest_logs ADD COLUMN load_type VARCHAR(100);
				RAISE NOTICE 'Added column load_type to gate_guest_logs';
			END IF;
		END $$;
	`

	if err := db.Exec(sql).Error; err != nil {
		return fmt.Errorf("failed to add load_type column: %w", err)
	}

	fmt.Println("[Migration 000014] Completed adding load_type column")
	return nil
}

package migrations

import (
	"fmt"

	"gorm.io/gorm"
)

// Migration000015AddSecondCargoColumn adds second_cargo column to the gate_guest_logs table.
func Migration000015AddSecondCargoColumn(db *gorm.DB) error {
	fmt.Println("[Migration 000015] Adding second_cargo column to gate_guest_logs table...")

	// Add second_cargo column for additional cargo information
	sql := `
		DO $$ 
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='second_cargo') THEN
				ALTER TABLE gate_guest_logs ADD COLUMN second_cargo VARCHAR(255);
				RAISE NOTICE 'Added column second_cargo to gate_guest_logs';
			ELSE
				RAISE NOTICE 'Column second_cargo already exists in gate_guest_logs, skipping';
			END IF;
		END $$;
	`

	if err := db.Exec(sql).Error; err != nil {
		return fmt.Errorf("failed to add second_cargo column: %w", err)
	}

	fmt.Println("[Migration 000015] Successfully added second_cargo column")
	return nil
}

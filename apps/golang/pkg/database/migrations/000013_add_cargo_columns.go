package migrations

import (
	"fmt"

	"gorm.io/gorm"
)

// Migration000013AddCargoColumns adds cargo-related columns to the gate_guest_logs table.
func Migration000013AddCargoColumns(db *gorm.DB) error {
	fmt.Println("[Migration 000013] Adding cargo columns to gate_guest_logs table...")

	// SQL to check and add columns
	sql := `
		DO $$
		BEGIN
			-- Remove cargo_type column if likely exists from previous failed migration or if incorrect
			IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='cargo_type') THEN
				ALTER TABLE gate_guest_logs DROP COLUMN cargo_type;
				RAISE NOTICE 'Dropped column cargo_type from gate_guest_logs';
			END IF;

			-- Add cargo_volume column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='cargo_volume') THEN
				ALTER TABLE gate_guest_logs ADD COLUMN cargo_volume DOUBLE PRECISION;
				RAISE NOTICE 'Added column cargo_volume to gate_guest_logs';
			END IF;

			-- Add cargo_owner column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='cargo_owner') THEN
				ALTER TABLE gate_guest_logs ADD COLUMN cargo_owner VARCHAR(255);
				RAISE NOTICE 'Added column cargo_owner to gate_guest_logs';
			END IF;

			-- Add estimated_weight column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='estimated_weight') THEN
				ALTER TABLE gate_guest_logs ADD COLUMN estimated_weight DOUBLE PRECISION;
				RAISE NOTICE 'Added column estimated_weight to gate_guest_logs';
			END IF;

			-- Add delivery_order_number column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='delivery_order_number') THEN
				ALTER TABLE gate_guest_logs ADD COLUMN delivery_order_number VARCHAR(255);
				RAISE NOTICE 'Added column delivery_order_number to gate_guest_logs';
			END IF;
		END $$;
	`

	if err := db.Exec(sql).Error; err != nil {
		return fmt.Errorf("failed to add cargo columns: %w", err)
	}

	fmt.Println("[Migration 000013] Completed adding cargo columns")
	return nil
}

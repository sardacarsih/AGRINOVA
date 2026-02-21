package migrations

import (
	"fmt"

	"gorm.io/gorm"
)

// Migration000016RemoveGuestLogPhotoPath removes photo_path column from gate_guest_logs table
func Migration000016RemoveGuestLogPhotoPath(db *gorm.DB) error {
	fmt.Println("[Migration 000016] Removing photo_path column from gate_guest_logs table...")

	sql := `
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'gate_guest_logs' AND column_name = 'photo_path'
			) THEN
				ALTER TABLE gate_guest_logs DROP COLUMN photo_path;
				RAISE NOTICE 'Dropped column photo_path from gate_guest_logs';
			ELSE
				RAISE NOTICE 'Column photo_path does not exist in gate_guest_logs, skipping';
			END IF;
		END $$;
	`

	if err := db.Exec(sql).Error; err != nil {
		return fmt.Errorf("failed to drop column photo_path: %w", err)
	}

	fmt.Println("[Migration 000016] Completed removing photo_path column")
	return nil
}

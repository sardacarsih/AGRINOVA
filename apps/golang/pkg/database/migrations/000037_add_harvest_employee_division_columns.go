package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000037AddHarvestEmployeeDivisionColumns adds employee division snapshot columns to harvest_records.
func Migration000037AddHarvestEmployeeDivisionColumns(db *gorm.DB) error {
	log.Println("Running migration: 000037_add_harvest_employee_division_columns")

	if err := db.Exec(`
		ALTER TABLE harvest_records
		ADD COLUMN IF NOT EXISTS employee_division_id UUID,
		ADD COLUMN IF NOT EXISTS employee_division_name TEXT;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_harvest_records_employee_division_id
		ON harvest_records(employee_division_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		UPDATE harvest_records hr
		SET employee_division_id = e.division_id
		FROM employees e
		WHERE hr.karyawan_id = e.id
		  AND hr.karyawan_id IS NOT NULL
		  AND hr.employee_division_id IS NULL;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		UPDATE harvest_records hr
		SET employee_division_name = (
			SELECT d.name
			FROM employees e
			LEFT JOIN divisions d ON d.id = e.division_id
			WHERE e.id = hr.karyawan_id
			LIMIT 1
		)
		WHERE hr.karyawan_id IS NOT NULL
		  AND (hr.employee_division_name IS NULL OR BTRIM(hr.employee_division_name) = '');
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000037 completed: harvest_records employee division snapshot columns are available")
	return nil
}

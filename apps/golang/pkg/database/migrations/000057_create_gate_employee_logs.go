package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000057CreateGateEmployeeLogs creates the employee access sync table
// used by the active satpam syncEmployeeLog service path.
func Migration000057CreateGateEmployeeLogs(db *gorm.DB) error {
	log.Println("Running migration: 000057_create_gate_employee_logs")

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS gate_employee_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			local_id VARCHAR(255) NOT NULL,
			company_id VARCHAR(255),
			nik VARCHAR(50),
			nama VARCHAR(255),
			department VARCHAR(255),
			action VARCHAR(20) NOT NULL,
			gate_position VARCHAR(50) NOT NULL,
			scanned_at TIMESTAMP,
			scanned_by_id VARCHAR(255),
			device_id VARCHAR(255),
			notes TEXT,
			qr_code_data TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			deleted_at TIMESTAMP
		);
	`).Error; err != nil {
		return err
	}

	indexes := []string{
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_gate_employee_logs_local_id ON gate_employee_logs(local_id)",
		"CREATE INDEX IF NOT EXISTS idx_gate_employee_logs_company_id ON gate_employee_logs(company_id)",
		"CREATE INDEX IF NOT EXISTS idx_gate_employee_logs_device_id ON gate_employee_logs(device_id)",
		"CREATE INDEX IF NOT EXISTS idx_gate_employee_logs_scanned_at ON gate_employee_logs(scanned_at)",
		"CREATE INDEX IF NOT EXISTS idx_gate_employee_logs_deleted_at ON gate_employee_logs(deleted_at)",
	}

	for _, stmt := range indexes {
		if err := db.Exec(stmt).Error; err != nil {
			return err
		}
	}

	log.Println("Migration 000057 completed: gate_employee_logs created")
	return nil
}

package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000030CreateVehicleMasterTable creates company-scoped vehicles table.
func Migration000030CreateVehicleMasterTable(db *gorm.DB) error {
	log.Println("Running migration: 000030_create_vehicle_master_table")

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS vehicles (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
			plate_number VARCHAR(20) NOT NULL,
			driver_name VARCHAR(255) NOT NULL,
			vehicle_type VARCHAR(50) NOT NULL,
			destination VARCHAR(255),
			load_type VARCHAR(100),
			load_owner VARCHAR(255),
			notes TEXT,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);
	`).Error; err != nil {
		return err
	}

	// Legacy index only applies while plate_number still exists.
	// In finalized schema (000031), plate_number may already be dropped.
	if err := db.Exec(`
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1
				FROM information_schema.columns
				WHERE table_name = 'vehicles' AND column_name = 'plate_number'
			) THEN
				EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicles_company_plate ON vehicles (company_id, plate_number)';
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_vehicles_company_id
		ON vehicles (company_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1
				FROM information_schema.columns
				WHERE table_name = 'vehicles' AND column_name = 'plate_number'
			) THEN
				EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON vehicles (plate_number)';
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000030 completed: vehicles table ready")
	return nil
}

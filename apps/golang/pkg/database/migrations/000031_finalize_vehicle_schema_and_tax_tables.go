package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000031FinalizeVehicleSchemaAndTaxTables finalizes vehicles schema and adds tax audit tables.
func Migration000031FinalizeVehicleSchemaAndTaxTables(db *gorm.DB) error {
	log.Println("Running migration: 000031_finalize_vehicle_schema_and_tax_tables")

	if err := db.Exec(`
		ALTER TABLE vehicles
			ADD COLUMN IF NOT EXISTS registration_plate VARCHAR(20),
			ADD COLUMN IF NOT EXISTS chassis_number VARCHAR(100),
			ADD COLUMN IF NOT EXISTS engine_number VARCHAR(100),
			ADD COLUMN IF NOT EXISTS manufacture_year INT,
			ADD COLUMN IF NOT EXISTS vehicle_category VARCHAR(30),
			ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
			ADD COLUMN IF NOT EXISTS model VARCHAR(100),
			ADD COLUMN IF NOT EXISTS registration_region VARCHAR(100),
			ADD COLUMN IF NOT EXISTS assigned_driver_name VARCHAR(255),
			ADD COLUMN IF NOT EXISTS status VARCHAR(20),
			ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
			ADD COLUMN IF NOT EXISTS stnk_expiry_date DATE,
			ADD COLUMN IF NOT EXISTS kir_expiry_date DATE;
	`).Error; err != nil {
		return err
	}

	// Backfill from legacy columns if they still exist.
	if err := db.Exec(`
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'vehicles' AND column_name = 'plate_number'
			) THEN
				EXECUTE '
					UPDATE vehicles
					SET registration_plate = COALESCE(NULLIF(registration_plate, ''''), UPPER(TRIM(plate_number)))
					WHERE plate_number IS NOT NULL
				';
			END IF;

			IF EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'vehicles' AND column_name = 'driver_name'
			) THEN
				EXECUTE '
					UPDATE vehicles
					SET assigned_driver_name = COALESCE(NULLIF(assigned_driver_name, ''''), NULLIF(TRIM(driver_name), ''''))
					WHERE driver_name IS NOT NULL
				';
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	// Normalize and ensure required values.
	if err := db.Exec(`
		UPDATE vehicles
		SET
			registration_plate = COALESCE(NULLIF(TRIM(registration_plate), ''), 'UNKNOWN-' || SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 8)),
			chassis_number = COALESCE(NULLIF(TRIM(chassis_number), ''), 'MIGRATED-CH-' || SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 16)),
			engine_number = COALESCE(NULLIF(TRIM(engine_number), ''), 'MIGRATED-EN-' || SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 16)),
			manufacture_year = COALESCE(manufacture_year, EXTRACT(YEAR FROM NOW())::INT),
			vehicle_category = COALESCE(
				NULLIF(UPPER(TRIM(vehicle_category)), ''),
				CASE UPPER(COALESCE(vehicle_type, ''))
					WHEN 'MOTORCYCLE' THEN 'MOTORCYCLE'
					WHEN 'TRUCK' THEN 'TRUCK'
					WHEN 'BUS' THEN 'TRUCK'
					WHEN 'HEAVY_EQUIPMENT' THEN 'HEAVY_EQUIPMENT'
					ELSE 'CAR'
				END
			),
			brand = COALESCE(NULLIF(TRIM(brand), ''), 'UNKNOWN'),
			model = COALESCE(NULLIF(TRIM(model), ''), 'UNKNOWN'),
			vehicle_type = COALESCE(NULLIF(TRIM(vehicle_type), ''), vehicle_category),
			status = COALESCE(
				NULLIF(UPPER(TRIM(status)), ''),
				CASE WHEN is_active THEN 'ACTIVE' ELSE 'INACTIVE' END
			)
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		UPDATE vehicles
		SET status = 'INACTIVE'
		WHERE status NOT IN ('ACTIVE', 'INACTIVE', 'SOLD', 'SCRAPPED', 'TRANSFERRED')
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		UPDATE vehicles
		SET
			is_active = CASE WHEN status = 'ACTIVE' THEN TRUE ELSE FALSE END,
			deactivated_at = CASE
				WHEN status = 'ACTIVE' THEN NULL
				WHEN deactivated_at IS NULL THEN NOW()
				ELSE deactivated_at
			END
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		ALTER TABLE vehicles
			ALTER COLUMN registration_plate SET NOT NULL,
			ALTER COLUMN chassis_number SET NOT NULL,
			ALTER COLUMN engine_number SET NOT NULL,
			ALTER COLUMN manufacture_year SET NOT NULL,
			ALTER COLUMN vehicle_category SET NOT NULL,
			ALTER COLUMN brand SET NOT NULL,
			ALTER COLUMN model SET NOT NULL,
			ALTER COLUMN vehicle_type SET NOT NULL,
			ALTER COLUMN status SET NOT NULL,
			ALTER COLUMN is_active SET NOT NULL;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_vehicles_vehicle_category') THEN
				ALTER TABLE vehicles
				ADD CONSTRAINT chk_vehicles_vehicle_category
				CHECK (vehicle_category IN ('CAR', 'MOTORCYCLE', 'TRUCK', 'HEAVY_EQUIPMENT'));
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_vehicles_status') THEN
				ALTER TABLE vehicles
				ADD CONSTRAINT chk_vehicles_status
				CHECK (status IN ('ACTIVE', 'INACTIVE', 'SOLD', 'SCRAPPED', 'TRANSFERRED'));
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	// Replace legacy uniqueness/index with final registration plate index.
	if err := db.Exec(`DROP INDEX IF EXISTS uq_vehicles_company_plate;`).Error; err != nil {
		return err
	}
	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicles_company_registration_plate
		ON vehicles (company_id, registration_plate);
	`).Error; err != nil {
		return err
	}
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_vehicles_status
		ON vehicles (status);
	`).Error; err != nil {
		return err
	}

	// Drop legacy columns after backfill.
	if err := db.Exec(`
		ALTER TABLE vehicles
			DROP COLUMN IF EXISTS plate_number,
			DROP COLUMN IF EXISTS driver_name,
			DROP COLUMN IF EXISTS destination,
			DROP COLUMN IF EXISTS load_type,
			DROP COLUMN IF EXISTS load_owner;
	`).Error; err != nil {
		return err
	}

	// Annual tax table.
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS vehicle_taxes (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
			tax_year INT NOT NULL,
			due_date DATE NOT NULL,
			pkb_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
			swdkllj_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
			admin_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
			penalty_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
			total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
			payment_date DATE,
			payment_method VARCHAR(50),
			payment_reference VARCHAR(100),
			tax_status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
			notes TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT uq_vehicle_taxes_vehicle_year UNIQUE (vehicle_id, tax_year),
			CONSTRAINT chk_vehicle_taxes_status CHECK (tax_status IN ('OPEN', 'PAID', 'OVERDUE', 'VOID'))
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`CREATE INDEX IF NOT EXISTS idx_vehicle_taxes_due_date ON vehicle_taxes(due_date);`).Error; err != nil {
		return err
	}
	if err := db.Exec(`CREATE INDEX IF NOT EXISTS idx_vehicle_taxes_status_due_date ON vehicle_taxes(tax_status, due_date);`).Error; err != nil {
		return err
	}

	// Tax document table.
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS vehicle_tax_documents (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			vehicle_tax_id UUID NOT NULL REFERENCES vehicle_taxes(id) ON DELETE CASCADE,
			document_type VARCHAR(30) NOT NULL,
			file_path TEXT NOT NULL,
			uploaded_by BIGINT,
			uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`).Error; err != nil {
		return err
	}
	if err := db.Exec(`CREATE INDEX IF NOT EXISTS idx_vehicle_tax_documents_vehicle_tax_id ON vehicle_tax_documents(vehicle_tax_id);`).Error; err != nil {
		return err
	}

	// Reminder/audit notification table (recommended).
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS vehicle_tax_notifications (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			vehicle_tax_id UUID NOT NULL REFERENCES vehicle_taxes(id) ON DELETE CASCADE,
			reminder_type VARCHAR(20) NOT NULL,
			channel VARCHAR(20) NOT NULL,
			sent_to TEXT,
			sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`).Error; err != nil {
		return err
	}
	if err := db.Exec(`CREATE INDEX IF NOT EXISTS idx_vehicle_tax_notifications_vehicle_tax_id ON vehicle_tax_notifications(vehicle_tax_id);`).Error; err != nil {
		return err
	}
	if err := db.Exec(`CREATE INDEX IF NOT EXISTS idx_vehicle_tax_notifications_type_sent_at ON vehicle_tax_notifications(reminder_type, sent_at);`).Error; err != nil {
		return err
	}

	log.Println("Migration 000031 completed: vehicles finalized + tax tables ready")
	return nil
}

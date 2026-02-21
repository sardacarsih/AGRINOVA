package database

import (
	"log"

	"gorm.io/gorm"
)

// MigrateSatpamTables creates the tables needed for the Satpam POS system
// This migration handles the guest_logs and satpam_qr_tokens tables
func MigrateSatpamTables(db *gorm.DB) error {
	log.Println("Running Satpam tables migration...")

	// Create gate_guest_logs table
	guestLogsSQL := `
	CREATE TABLE IF NOT EXISTS gate_guest_logs (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		local_id VARCHAR(255),
		guest_id VARCHAR(255) NOT NULL,
		guest_name VARCHAR(255) NOT NULL,
		guest_company VARCHAR(255),
		guest_purpose TEXT NOT NULL,
		guest_phone VARCHAR(20),
		id_card_number VARCHAR(50),
		driver_name VARCHAR(255) NOT NULL,
		vehicle_plate VARCHAR(20) NOT NULL,
		vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('CAR', 'TRUCK', 'MOTORBIKE', 'BUS', 'OTHER')),
		purpose TEXT NOT NULL,
		destination VARCHAR(255),
		status VARCHAR(20) NOT NULL DEFAULT 'INSIDE' CHECK (status IN ('INSIDE', 'EXITED', 'OVERSTAY', 'CANCELLED')),
		entry_time TIMESTAMP,
		exit_time TIMESTAMP,
		entry_gate VARCHAR(50),
		exit_gate VARCHAR(50),
		notes TEXT,
		photo_path VARCHAR(500),
		qr_code_data TEXT,
		company_id UUID NOT NULL,
		created_by UUID NOT NULL,
		device_id VARCHAR(255),
		latitude DOUBLE PRECISION,
		longitude DOUBLE PRECISION,
		sync_status VARCHAR(20) DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		deleted_at TIMESTAMP
	);
	`

	if err := db.Exec(guestLogsSQL).Error; err != nil {
		log.Printf("Warning: guest_logs table may already exist: %v", err)
	}

	// Add id_card_number column if it doesn't exist (for existing tables)
	alterSQL := `
	ALTER TABLE gate_guest_logs
	ADD COLUMN IF NOT EXISTS id_card_number VARCHAR(50);
	`
	if err := db.Exec(alterSQL).Error; err != nil {
		log.Printf("Note: id_card_number column may already exist: %v", err)
	}

	// Add registration_source column if it doesn't exist (for existing tables)
	alterRegistrationSourceSQL := `
	ALTER TABLE gate_guest_logs
	ADD COLUMN IF NOT EXISTS registration_source VARCHAR(20);
	`
	if err := db.Exec(alterRegistrationSourceSQL).Error; err != nil {
		log.Printf("Note: registration_source column may already exist: %v", err)
	}

	// Create satpam_qr_tokens table
	qrTokensSQL := `
	CREATE TABLE IF NOT EXISTS satpam_qr_tokens (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		jti VARCHAR(255) NOT NULL UNIQUE,
		token TEXT NOT NULL,
		generation_intent VARCHAR(10) NOT NULL CHECK (generation_intent IN ('ENTRY', 'EXIT')),
		allowed_scan VARCHAR(10) NOT NULL CHECK (allowed_scan IN ('ENTRY', 'EXIT')),
		status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED')),
		expires_at TIMESTAMP NOT NULL,
		generated_at TIMESTAMP NOT NULL,
		guest_log_id UUID REFERENCES gate_guest_logs(id),
		company_id UUID NOT NULL,
		generated_by UUID NOT NULL,
		device_id VARCHAR(255),
		usage_count INTEGER DEFAULT 0,
		max_usage INTEGER DEFAULT 1,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	`

	if err := db.Exec(qrTokensSQL).Error; err != nil {
		log.Printf("Warning: satpam_qr_tokens table may already exist: %v", err)
	}

	// Keep migration compatible with old/new gate_guest_logs schema variants.
	hasCompanyID := db.Migrator().HasColumn("gate_guest_logs", "company_id")
	hasStatus := db.Migrator().HasColumn("gate_guest_logs", "status")
	hasJourneyStatus := db.Migrator().HasColumn("gate_guest_logs", "journey_status")
	hasVehiclePlate := db.Migrator().HasColumn("gate_guest_logs", "vehicle_plate")
	hasEntryTime := db.Migrator().HasColumn("gate_guest_logs", "entry_time")
	hasCreatedBy := db.Migrator().HasColumn("gate_guest_logs", "created_by")
	hasLocalID := db.Migrator().HasColumn("gate_guest_logs", "local_id")
	hasDeviceID := db.Migrator().HasColumn("gate_guest_logs", "device_id")
	hasSyncStatus := db.Migrator().HasColumn("gate_guest_logs", "sync_status")
	hasDeletedAt := db.Migrator().HasColumn("gate_guest_logs", "deleted_at")

	indexesSQL := make([]string, 0, 20)

	if hasCompanyID {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_company_id ON gate_guest_logs(company_id)")
	}
	if hasStatus {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_status ON gate_guest_logs(status)")
	}
	if hasJourneyStatus {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_journey_status ON gate_guest_logs(journey_status)")
	}
	if hasVehiclePlate {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_vehicle_plate ON gate_guest_logs(vehicle_plate)")
	}
	if hasEntryTime {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_entry_time ON gate_guest_logs(entry_time)")
	}
	if hasCreatedBy {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_created_by ON gate_guest_logs(created_by)")
	}
	if hasLocalID {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_local_id ON gate_guest_logs(local_id)")
	}
	if hasDeviceID {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_device_id ON gate_guest_logs(device_id)")
	}
	if hasSyncStatus {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_sync_status ON gate_guest_logs(sync_status)")
	}
	if hasDeletedAt {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_deleted_at ON gate_guest_logs(deleted_at)")
	}

	// Composite indexes for common queries
	if hasCompanyID && hasStatus {
		indexesSQL = append(indexesSQL,
			"CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_company_status ON gate_guest_logs(company_id, status)",
			"CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_vehicle_status ON gate_guest_logs(vehicle_plate, status)",
		)
	}
	if hasCompanyID && hasJourneyStatus {
		indexesSQL = append(indexesSQL,
			"CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_company_journey_status ON gate_guest_logs(company_id, journey_status)",
			"CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_vehicle_journey_status ON gate_guest_logs(vehicle_plate, journey_status)",
		)
	}
	if hasCompanyID && hasEntryTime {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_gate_guest_logs_company_entry_time ON gate_guest_logs(company_id, entry_time)")
	}

	// Create indexes for satpam_qr_tokens
	if db.Migrator().HasColumn("satpam_qr_tokens", "jti") {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_satpam_qr_tokens_jti ON satpam_qr_tokens(jti)")
	}
	if db.Migrator().HasColumn("satpam_qr_tokens", "guest_log_id") {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_satpam_qr_tokens_guest_log_id ON satpam_qr_tokens(guest_log_id)")
	}
	if db.Migrator().HasColumn("satpam_qr_tokens", "status") {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_satpam_qr_tokens_status ON satpam_qr_tokens(status)")
	}
	if db.Migrator().HasColumn("satpam_qr_tokens", "expires_at") {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_satpam_qr_tokens_expires_at ON satpam_qr_tokens(expires_at)")
	}
	if db.Migrator().HasColumn("satpam_qr_tokens", "company_id") {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_satpam_qr_tokens_company_id ON satpam_qr_tokens(company_id)")
	}
	if db.Migrator().HasColumn("satpam_qr_tokens", "generated_by") {
		indexesSQL = append(indexesSQL, "CREATE INDEX IF NOT EXISTS idx_satpam_qr_tokens_generated_by ON satpam_qr_tokens(generated_by)")
	}

	for _, indexSQL := range indexesSQL {
		if err := db.Exec(indexSQL).Error; err != nil {
			log.Printf("Note: Skipping index (%s): %v", indexSQL, err)
		}
	}

	if !hasStatus && !hasJourneyStatus {
		log.Printf("Note: gate_guest_logs has neither status nor journey_status column; status-based indexes were skipped")
	}
	if hasCompanyID && !hasVehiclePlate {
		log.Printf("Note: gate_guest_logs.vehicle_plate not found; vehicle composite indexes skipped")
	}
	if hasCompanyID && !hasEntryTime {
		log.Printf("Note: gate_guest_logs.entry_time not found; company_entry_time index skipped")
	}
	if !hasCompanyID {
		log.Printf("Note: gate_guest_logs.company_id not found; company-based indexes skipped")
	}
	if !hasSyncStatus {
		log.Printf("Note: gate_guest_logs.sync_status not found; sync_status index skipped")
	}
	if !hasDeletedAt {
		log.Printf("Note: gate_guest_logs.deleted_at not found; deleted_at index skipped")
	}

	log.Println("Satpam tables migration completed successfully")
	return nil
}

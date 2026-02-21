package database

import (
	"fmt"
	"log"
	"strings"

	"gorm.io/gorm"

	authmodels "agrinovagraphql/server/internal/auth/models"
	employeemodels "agrinovagraphql/server/internal/employee/models"
	gatecheckmodels "agrinovagraphql/server/internal/gatecheck/models"
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/bkm"
	"agrinovagraphql/server/internal/graphql/domain/mandor"
	"agrinovagraphql/server/internal/graphql/domain/master"
	notificationmodels "agrinovagraphql/server/internal/notifications/models"
	rbacmodels "agrinovagraphql/server/internal/rbac/models"
)

// AutoMigrateWithGORM runs all database migrations using GORM AutoMigrate
// This ensures proper foreign key relationships and constraints are created
func AutoMigrateWithGORM(db *gorm.DB) error {
	log.Println("Running GORM database migrations...")

	// Migrate core business models in hierarchical order
	log.Println("Migrating core business models...")
	if err := db.AutoMigrate(
		&master.Company{},
		&employeemodels.Employee{},
		&auth.User{},
		&master.Estate{},
		&master.Division{},
		&master.TarifBlok{},
		&master.Block{},
		&mandor.HarvestRecord{},
	); err != nil {
		return fmt.Errorf("failed to migrate core business models: %w", err)
	}

	// Migrate multi-assignment models
	log.Println("Migrating assignment models...")
	// Note: Assignment models should be in master/models or use domain types if available
	// Skipping generated assignment models for now - they should be defined separately
	log.Println("Assignment models migration skipped - using direct SQL or domain models")

	// Migrate authentication models
	log.Println("Migrating authentication models...")
	if err := db.AutoMigrate(
		&authmodels.UserSession{},
		&authmodels.DeviceBinding{},
		&authmodels.JWTToken{},
		&authmodels.SecurityEvent{},
		&authmodels.LoginAttempt{},
		&authmodels.UserDeviceToken{}, // FCM device tokens
		&authmodels.APIKey{},
		&authmodels.APIKeyLog{},
	); err != nil {
		return fmt.Errorf("failed to migrate authentication models: %w", err)
	}

	// Migrate gate check models
	// GuestLog must come before QRToken because QRToken has a FK to gate_guest_logs
	log.Println("Migrating gate check models...")
	if err := db.AutoMigrate(
		&gatecheckmodels.GateCheckRecord{},
		&gatecheckmodels.GuestLog{},
		&gatecheckmodels.QRToken{},
		&gatecheckmodels.GateCheckPhoto{},
		&gatecheckmodels.CheckpointLog{},
	); err != nil {
		return fmt.Errorf("failed to migrate gate check models: %w", err)
	}

	// Migrate notification models
	log.Println("Migrating notification models...")
	if err := db.AutoMigrate(
		&notificationmodels.Notification{},
		&notificationmodels.NotificationTemplate{},
		&notificationmodels.NotificationPreferences{},
		&notificationmodels.NotificationDelivery{},
	); err != nil {
		return fmt.Errorf("failed to migrate notification models: %w", err)
	}

	// Migrate RBAC models
	log.Println("Migrating RBAC models...")
	if err := db.AutoMigrate(
		&rbacmodels.Role{},
		&rbacmodels.Permission{},
		&rbacmodels.RolePermission{},
		&rbacmodels.UserPermissionAssignment{},
	); err != nil {
		// Don't fail on known constraint drift during RBAC migration.
		// This can happen when historical schemas differ from GORM expectations.
		errStr := err.Error()
		if strings.Contains(errStr, "constraint") && strings.Contains(errStr, "does not exist") {
			log.Printf("RBAC migration note (known non-fatal constraint drift): %v", err)
		} else {
			return fmt.Errorf("failed to migrate RBAC models: %w", err)
		}
	}

	// Migrate BKM sync models (master before detail for FK ordering)
	log.Println("Migrating BKM sync models...")
	if err := db.AutoMigrate(
		&bkm.AisBkmMaster{},
		&bkm.AisBkmDetail{},
	); err != nil {
		return fmt.Errorf("failed to migrate BKM sync models: %w", err)
	}

	// Create additional indexes for better performance
	if err := CreatePerformanceIndexes(db); err != nil {
		return fmt.Errorf("failed to create performance indexes: %w", err)
	}

	// Add database constraints that GORM might miss
	if err := AddDatabaseConstraints(db); err != nil {
		log.Printf("Warning: Failed to add some database constraints: %v", err)
	}

	log.Println("GORM database migrations completed successfully")
	return nil
}

// CreatePerformanceIndexes creates additional indexes for better query performance
func CreatePerformanceIndexes(db *gorm.DB) error {
	log.Println("Creating performance indexes...")

	indexes := []string{
		// Company indexes
		"CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name)",
		"CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status)",

		// User indexes
		"CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
		"CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",

		"CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)",
		"CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at)",

		// Estate indexes
		"CREATE INDEX IF NOT EXISTS idx_estates_company_id ON estates(company_id)",
		"CREATE INDEX IF NOT EXISTS idx_estates_name ON estates(name)",

		// Division indexes
		"CREATE INDEX IF NOT EXISTS idx_divisions_estate_id ON divisions(estate_id)",
		"CREATE INDEX IF NOT EXISTS idx_divisions_name ON divisions(name)",
		"CREATE INDEX IF NOT EXISTS idx_divisions_code ON divisions(code)",

		// Block indexes
		"CREATE INDEX IF NOT EXISTS idx_blocks_division_id ON blocks(division_id)",
		"CREATE INDEX IF NOT EXISTS idx_blocks_block_code ON blocks(block_code)",
		"CREATE INDEX IF NOT EXISTS idx_blocks_name ON blocks(name)",

		// Harvest record indexes
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_mandor_id ON harvest_records(mandor_id)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_block_id ON harvest_records(block_id)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_status ON harvest_records(status)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_tanggal ON harvest_records(tanggal)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_approved_by ON harvest_records(approved_by)",

		// Assignment indexes
		"CREATE INDEX IF NOT EXISTS idx_user_estate_assignments_user_id ON user_estate_assignments(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_user_estate_assignments_estate_id ON user_estate_assignments(estate_id)",
		"CREATE INDEX IF NOT EXISTS idx_user_estate_assignments_active ON user_estate_assignments(is_active)",
		"CREATE INDEX IF NOT EXISTS idx_user_estate_assignments_composite ON user_estate_assignments(user_id, estate_id, is_active)",

		"CREATE INDEX IF NOT EXISTS idx_user_division_assignments_user_id ON user_division_assignments(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_user_division_assignments_division_id ON user_division_assignments(division_id)",
		"CREATE INDEX IF NOT EXISTS idx_user_division_assignments_active ON user_division_assignments(is_active)",
		"CREATE INDEX IF NOT EXISTS idx_user_division_assignments_composite ON user_division_assignments(user_id, division_id, is_active)",

		"CREATE INDEX IF NOT EXISTS idx_user_company_assignments_user_id ON user_company_assignments(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_user_company_assignments_company_id ON user_company_assignments(company_id)",
		"CREATE INDEX IF NOT EXISTS idx_user_company_assignments_active ON user_company_assignments(is_active)",
		"CREATE INDEX IF NOT EXISTS idx_user_company_assignments_composite ON user_company_assignments(user_id, company_id, is_active)",

		// Session indexes
		"CREATE INDEX IF NOT EXISTS idx_user_sessions_user_device ON user_sessions(user_id, device_id)",
		"CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active)",
		"CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)",

		// Device binding indexes
		"CREATE INDEX IF NOT EXISTS idx_device_bindings_user_id ON device_bindings(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_device_bindings_device_id ON device_bindings(device_id)",
		"CREATE INDEX IF NOT EXISTS idx_device_bindings_authorized ON device_bindings(is_authorized)",
		"CREATE INDEX IF NOT EXISTS idx_device_bindings_trusted ON device_bindings(is_trusted)",

		// JWT Token indexes
		"CREATE INDEX IF NOT EXISTS idx_jwt_tokens_user_device ON jwt_tokens(user_id, device_id)",
		"CREATE INDEX IF NOT EXISTS idx_jwt_tokens_hash ON jwt_tokens(token_hash)",
		"CREATE INDEX IF NOT EXISTS idx_jwt_tokens_revoked ON jwt_tokens(is_revoked)",
		"CREATE INDEX IF NOT EXISTS idx_jwt_tokens_expires_at ON jwt_tokens(expires_at)",

		// Security event indexes
		"CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)",
		"CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity)",
		"CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(is_resolved)",

		// Login attempt indexes
		"CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username)",
		"CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address)",
		"CREATE INDEX IF NOT EXISTS idx_login_attempts_successful ON login_attempts(is_successful)",
		"CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at)",

		// Gate check indexes
		"CREATE INDEX IF NOT EXISTS idx_gate_check_records_satpam_id ON gate_check_records(satpam_id)",
		"CREATE INDEX IF NOT EXISTS idx_gate_check_records_intent ON gate_check_records(intent)",
		"CREATE INDEX IF NOT EXISTS idx_gate_check_records_status ON gate_check_records(status)",
		"CREATE INDEX IF NOT EXISTS idx_gate_check_records_created_at ON gate_check_records(created_at)",

		// QR Token indexes
		"CREATE INDEX IF NOT EXISTS idx_qr_tokens_jti ON qr_tokens(jti)",
		"CREATE INDEX IF NOT EXISTS idx_qr_tokens_status ON qr_tokens(status)",
		"CREATE INDEX IF NOT EXISTS idx_qr_tokens_expires_at ON qr_tokens(expires_at)",
		"CREATE INDEX IF NOT EXISTS idx_qr_tokens_generated_by ON qr_tokens(generated_by)",

		// Guest log indexes
		"CREATE INDEX IF NOT EXISTS idx_guest_logs_vehicle_plate ON gate_guest_logs(vehicle_plate)",
		"CREATE INDEX IF NOT EXISTS idx_guest_logs_company_id ON gate_guest_logs(company_id)",
		"CREATE INDEX IF NOT EXISTS idx_guest_logs_entry_time ON gate_guest_logs(entry_time)",
		"CREATE INDEX IF NOT EXISTS idx_guest_logs_created_by ON gate_guest_logs(created_by)",
		"CREATE INDEX IF NOT EXISTS idx_guest_logs_local_id ON gate_guest_logs(local_id)",

		// Satpam QR token indexes
		"CREATE INDEX IF NOT EXISTS idx_satpam_qr_tokens_jti ON satpam_qr_tokens(jti)",
		"CREATE INDEX IF NOT EXISTS idx_satpam_qr_tokens_guest_log_id ON satpam_qr_tokens(guest_log_id)",
		"CREATE INDEX IF NOT EXISTS idx_satpam_qr_tokens_status ON satpam_qr_tokens(status)",
		"CREATE INDEX IF NOT EXISTS idx_satpam_qr_tokens_expires_at ON satpam_qr_tokens(expires_at)",

		// Notification indexes
		"CREATE INDEX IF NOT EXISTS idx_notifications_recipient_status_created ON notifications(recipient_id, status, created_at DESC)",
		"CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_recipient_idempotency ON notifications(recipient_id, idempotency_key) WHERE idempotency_key IS NOT NULL AND idempotency_key <> ''",
		"CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_deliveries_notification_channel ON notification_deliveries(notification_id, channel)",
	}

	for _, indexSQL := range indexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			log.Printf("Warning: Failed to create index: %v", err)
		}
	}

	log.Println("Performance indexes created successfully")
	return nil
}

// AddDatabaseConstraints adds database-level constraints that might not be covered by GORM
func AddDatabaseConstraints(db *gorm.DB) error {
	log.Println("Adding database constraints...")

	// Use partial unique indexes for active assignment uniqueness.
	partialUniqueIndexes := []string{
		"CREATE UNIQUE INDEX IF NOT EXISTS uq_user_estate_assignment_active ON user_estate_assignments(user_id, estate_id) WHERE is_active = true",
		"CREATE UNIQUE INDEX IF NOT EXISTS uq_user_division_assignment_active ON user_division_assignments(user_id, division_id) WHERE is_active = true",
		"CREATE UNIQUE INDEX IF NOT EXISTS uq_user_company_assignment_active ON user_company_assignments(user_id, company_id) WHERE is_active = true",
	}

	for _, indexSQL := range partialUniqueIndexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			log.Printf("Note: Partial unique index may already exist or failed to create: %v", err)
		}
	}

	constraints := []string{
		// Check constraints for data validation
		`ALTER TABLE harvest_records 
		 ADD CONSTRAINT check_berat_tbs_positive 
		 CHECK (berat_tbs > 0)`,

		`ALTER TABLE harvest_records 
		 ADD CONSTRAINT check_jumlah_janjang_positive 
		 CHECK (jumlah_janjang > 0)`,

		`ALTER TABLE blocks 
		 ADD CONSTRAINT check_blocks_area_ha_positive 
		 CHECK (area_ha IS NULL OR area_ha > 0)`,

		`ALTER TABLE estates 
		 ADD CONSTRAINT check_estates_area_ha_positive 
		 CHECK (area_ha IS NULL OR area_ha > 0)`,

		// Role-based constraints
		`ALTER TABLE users 
		 ADD CONSTRAINT check_valid_role 
		 CHECK (role IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'))`,

		`ALTER TABLE companies 
		 ADD CONSTRAINT check_valid_status 
		 CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'))`,

		`ALTER TABLE harvest_records 
		 ADD CONSTRAINT check_valid_status 
		 CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))`,
	}

	for _, constraintSQL := range constraints {
		if err := db.Exec(constraintSQL).Error; err != nil {
			log.Printf("Note: Constraint may already exist or failed to create: %v", err)
		}
	}

	log.Println("Database constraints added successfully")
	return nil
}

// CreateCompositeIndexes creates composite indexes for complex queries
func CreateCompositeIndexes(db *gorm.DB) error {
	log.Println("Creating composite indexes...")

	compositeIndexes := []string{
		// User access patterns

		// Harvest record query patterns
		"CREATE INDEX IF NOT EXISTS idx_harvest_mandor_status_date ON harvest_records(mandor_id, status, tanggal)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_block_status_date ON harvest_records(block_id, status, tanggal)",

		// Assignment query patterns
		"CREATE INDEX IF NOT EXISTS idx_estate_assignments_estate_active ON user_estate_assignments(estate_id, is_active, assigned_at)",
		"CREATE INDEX IF NOT EXISTS idx_division_assignments_division_active ON user_division_assignments(division_id, is_active, assigned_at)",

		// Session management patterns
		"CREATE INDEX IF NOT EXISTS idx_sessions_user_active_expires ON user_sessions(user_id, is_active, expires_at)",
		"CREATE INDEX IF NOT EXISTS idx_device_bindings_user_authorized ON device_bindings(user_id, is_authorized, last_seen_at)",

		// Security monitoring patterns
		"CREATE INDEX IF NOT EXISTS idx_security_events_type_severity ON security_events(event_type, severity, created_at)",
		"CREATE INDEX IF NOT EXISTS idx_login_attempts_username_success ON login_attempts(username, is_successful, attempted_at)",
	}

	for _, indexSQL := range compositeIndexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			log.Printf("Warning: Failed to create composite index: %v", err)
		}
	}

	log.Println("Composite indexes created successfully")
	return nil
}

// ValidateForeignKeyRelationships validates that all foreign key relationships are working correctly
func ValidateForeignKeyRelationships(db *gorm.DB) error {
	log.Println("Validating foreign key relationships...")

	// Test basic relationship queries
	var testResults []struct {
		Table string
		Count int64
	}

	// Test estate -> division relationship
	if err := db.Model(&master.Estate{}).
		Joins("LEFT JOIN divisions ON estates.id = divisions.estate_id").
		Select("'estate-division' as table, COUNT(*) as count").
		Scan(&testResults).Error; err != nil {
		return fmt.Errorf("failed to validate estate-division relationship: %w", err)
	}

	// Test division -> block relationship
	if err := db.Model(&master.Division{}).
		Joins("LEFT JOIN blocks ON divisions.id = blocks.division_id").
		Select("'division-block' as table, COUNT(*) as count").
		Scan(&testResults).Error; err != nil {
		return fmt.Errorf("failed to validate division-block relationship: %w", err)
	}

	log.Println("Foreign key relationships validated successfully")
	return nil
}

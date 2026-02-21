package database

import (
	"log"

	"gorm.io/gorm"
)

// AddIndexesMigration handles the creation of database indexes
type AddIndexesMigration struct{}

func (m *AddIndexesMigration) Migrate(db *gorm.DB) error {
	log.Println("Running migration: 0002_add_indexes")

	indexes := []string{
		// Company indexes
		"CREATE INDEX IF NOT EXISTS idx_companies_nama ON companies(nama)",
		"CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status)",
		"CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at)",

		// User indexes
		"CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
		"CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
		"CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role)",
		"CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)",
		"CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at)",
		"CREATE INDEX IF NOT EXISTS idx_users_company_role_active ON users(company_id, role, is_active)",

		// Estate indexes
		"CREATE INDEX IF NOT EXISTS idx_estates_company_id ON estates(company_id)",
		"CREATE INDEX IF NOT EXISTS idx_estates_nama ON estates(nama)",
		"CREATE INDEX IF NOT EXISTS idx_estates_deleted_at ON estates(deleted_at)",

		// Division indexes
		"CREATE INDEX IF NOT EXISTS idx_divisions_estate_id ON divisions(estate_id)",
		"CREATE INDEX IF NOT EXISTS idx_divisions_nama ON divisions(nama)",
		"CREATE INDEX IF NOT EXISTS idx_divisions_kode ON divisions(kode)",
		"CREATE INDEX IF NOT EXISTS idx_divisions_deleted_at ON divisions(deleted_at)",
		"CREATE INDEX IF NOT EXISTS idx_divisions_estate_access ON divisions(estate_id, deleted_at)",

		// Block indexes
		"CREATE INDEX IF NOT EXISTS idx_blocks_division_id ON blocks(division_id)",
		"CREATE INDEX IF NOT EXISTS idx_blocks_kode_blok ON blocks(kode_blok)",
		"CREATE INDEX IF NOT EXISTS idx_blocks_nama ON blocks(nama)",
		"CREATE INDEX IF NOT EXISTS idx_blocks_deleted_at ON blocks(deleted_at)",
		"CREATE INDEX IF NOT EXISTS idx_blocks_status ON blocks(status)",
		"CREATE INDEX IF NOT EXISTS idx_blocks_division_status ON blocks(division_id, status)",
		"CREATE INDEX IF NOT EXISTS idx_blocks_division_updated ON blocks(division_id, updated_at DESC)",
		"CREATE INDEX IF NOT EXISTS idx_blocks_division_active ON blocks(division_id, status) WHERE deleted_at IS NULL",
		"CREATE INDEX IF NOT EXISTS idx_blocks_pagination ON blocks(division_id, kode_blok ASC) WHERE deleted_at IS NULL AND status = 'ACTIVE'",
		"CREATE INDEX IF NOT EXISTS idx_blocks_search ON blocks USING gin(to_tsvector('english', kode_blok || ' ' || nama)) WHERE deleted_at IS NULL",

		// Harvest record indexes
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_mandor_id ON harvest_records(mandor_id)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_block_id ON harvest_records(block_id)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_status ON harvest_records(status)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_tanggal ON harvest_records(tanggal)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_approved_by ON harvest_records(approved_by)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_status_tanggal ON harvest_records(status, tanggal DESC)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_mandor_tanggal ON harvest_records(mandor_id, tanggal DESC)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_block_status ON harvest_records(block_id, status)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_mandor_status ON harvest_records(mandor_id, status)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_block_tanggal ON harvest_records(block_id, tanggal DESC)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_berat_tbs ON harvest_records(berat_tbs) WHERE berat_tbs IS NOT NULL",
		"CREATE INDEX IF NOT EXISTS idx_harvest_records_jumlah_janjang ON harvest_records(jumlah_janjang) WHERE jumlah_janjang IS NOT NULL",
		"CREATE INDEX IF NOT EXISTS idx_harvest_mandor_status_date ON harvest_records(mandor_id, status, tanggal)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_block_status_date ON harvest_records(block_id, status, tanggal)",
		"CREATE INDEX IF NOT EXISTS idx_harvest_statistics ON harvest_records(status, berat_tbs, jumlah_janjang) WHERE deleted_at IS NULL",
		"CREATE INDEX IF NOT EXISTS idx_harvest_mandor_statistics ON harvest_records(mandor_id, status, berat_tbs, jumlah_janjang) WHERE deleted_at IS NULL",

		// Assignment indexes
		"CREATE INDEX IF NOT EXISTS idx_user_estate_assignments_user_id ON user_estate_assignments(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_user_estate_assignments_estate_id ON user_estate_assignments(estate_id)",
		"CREATE INDEX IF NOT EXISTS idx_user_estate_assignments_active ON user_estate_assignments(is_active)",
		"CREATE INDEX IF NOT EXISTS idx_user_estate_assignments_composite ON user_estate_assignments(user_id, estate_id, is_active)",
		"CREATE INDEX IF NOT EXISTS idx_user_estate_assignments_access ON user_estate_assignments(user_id, estate_id, is_active)",
		"CREATE INDEX IF NOT EXISTS idx_estate_assignments_estate_active ON user_estate_assignments(estate_id, is_active, assigned_at)",

		"CREATE INDEX IF NOT EXISTS idx_user_division_assignments_user_id ON user_division_assignments(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_user_division_assignments_division_id ON user_division_assignments(division_id)",
		"CREATE INDEX IF NOT EXISTS idx_user_division_assignments_active ON user_division_assignments(is_active)",
		"CREATE INDEX IF NOT EXISTS idx_user_division_assignments_composite ON user_division_assignments(user_id, division_id, is_active)",
		"CREATE INDEX IF NOT EXISTS idx_user_division_assignments_access ON user_division_assignments(user_id, is_active)",
		"CREATE INDEX IF NOT EXISTS idx_division_access_composite ON user_division_assignments(user_id, is_active) INCLUDE (division_id)",
		"CREATE INDEX IF NOT EXISTS idx_division_assignments_division_active ON user_division_assignments(division_id, is_active, assigned_at)",

		"CREATE INDEX IF NOT EXISTS idx_user_company_assignments_user_id ON user_company_assignments(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_user_company_assignments_company_id ON user_company_assignments(company_id)",
		"CREATE INDEX IF NOT EXISTS idx_user_company_assignments_active ON user_company_assignments(is_active)",
		"CREATE INDEX IF NOT EXISTS idx_user_company_assignments_composite ON user_company_assignments(user_id, company_id, is_active)",
		"CREATE INDEX IF NOT EXISTS idx_user_company_assignments_access ON user_company_assignments(user_id, company_id, is_active)",

		// Session indexes
		"CREATE INDEX IF NOT EXISTS idx_user_sessions_user_device ON user_sessions(user_id, device_id)",
		"CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active)",
		"CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)",
		"CREATE INDEX IF NOT EXISTS idx_sessions_user_active_expires ON user_sessions(user_id, is_active, expires_at)",

		// Device binding indexes
		"CREATE INDEX IF NOT EXISTS idx_device_bindings_user_id ON device_bindings(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_device_bindings_device_id ON device_bindings(device_id)",
		"CREATE INDEX IF NOT EXISTS idx_device_bindings_authorized ON device_bindings(is_authorized)",
		"CREATE INDEX IF NOT EXISTS idx_device_bindings_trusted ON device_bindings(is_trusted)",
		"CREATE INDEX IF NOT EXISTS idx_device_bindings_user_authorized ON device_bindings(user_id, is_authorized, last_seen_at)",

		// JWT Token indexes
		"CREATE INDEX IF NOT EXISTS idx_jwt_tokens_user_device ON jwt_tokens(user_id, device_id)",
		"CREATE INDEX IF NOT EXISTS idx_jwt_tokens_hash ON jwt_tokens(token_hash)",
		"CREATE INDEX IF NOT EXISTS idx_jwt_tokens_revoked ON jwt_tokens(is_revoked)",
		"CREATE INDEX IF NOT EXISTS idx_jwt_tokens_expires_at ON jwt_tokens(expires_at)",
		"CREATE INDEX IF NOT EXISTS idx_jwt_tokens_refresh_hash ON jwt_tokens(refresh_hash)",
		"CREATE INDEX IF NOT EXISTS idx_jwt_tokens_offline_hash ON jwt_tokens(offline_hash)",
		"CREATE INDEX IF NOT EXISTS idx_jwt_tokens_refresh_expires_at ON jwt_tokens(refresh_expires_at)",
		"CREATE INDEX IF NOT EXISTS idx_jwt_tokens_offline_expires_at ON jwt_tokens(offline_expires_at)",
		"CREATE INDEX IF NOT EXISTS idx_jwt_tokens_deleted_at ON jwt_tokens(deleted_at)",

		// Security event indexes
		"CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)",
		"CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity)",
		"CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(is_resolved)",
		"CREATE INDEX IF NOT EXISTS idx_security_events_type_severity ON security_events(event_type, severity, created_at)",

		// Login attempt indexes
		"CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username)",
		"CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address)",
		"CREATE INDEX IF NOT EXISTS idx_login_attempts_successful ON login_attempts(is_successful)",
		"CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at)",
		"CREATE INDEX IF NOT EXISTS idx_login_attempts_username_success ON login_attempts(username, is_successful, attempted_at)",

		// Logout transaction indexes
		"CREATE INDEX IF NOT EXISTS idx_logout_transactions_user_id ON logout_transactions(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_logout_transactions_session_id ON logout_transactions(session_id)",
		"CREATE INDEX IF NOT EXISTS idx_logout_transactions_complete ON logout_transactions(complete)",
		"CREATE INDEX IF NOT EXISTS idx_logout_transactions_expires_at ON logout_transactions(expires_at)",
		"CREATE INDEX IF NOT EXISTS idx_logout_transactions_platform ON logout_transactions(platform)",

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
		"CREATE INDEX IF NOT EXISTS idx_guest_logs_status ON gate_guest_logs(status)",
		"CREATE INDEX IF NOT EXISTS idx_guest_logs_vehicle_plate ON gate_guest_logs(vehicle_plate)",
		"CREATE INDEX IF NOT EXISTS idx_guest_logs_authorized_user ON gate_guest_logs(authorized_user_id)",
	}

	for _, indexSQL := range indexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			log.Printf("Warning: Failed to create index (might already exist): %v", err)
		}
	}

	return nil
}

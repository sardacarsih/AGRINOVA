package database

import (
	"agrinovagraphql/server/internal/grading/models"
	"gorm.io/gorm"
)

// Migration0006GradingTable creates the grading_records table
func Migration0006GradingTable(db *gorm.DB) error {
	// Check if table already exists
	if db.Migrator().HasTable(&models.GradingRecord{}) {
		return nil
	}

	// Create the grading_records table
	if err := db.AutoMigrate(&models.GradingRecord{}); err != nil {
		return err
	}

	// Add indexes for performance
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_grading_records_harvest_id
		ON grading_records(harvest_record_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_grading_records_grader_id
		ON grading_records(grader_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_grading_records_approval_status
		ON grading_records(is_approved);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_grading_records_date
		ON grading_records(grading_date);
	`).Error; err != nil {
		return err
	}

	// Add RLS (Row Level Security) policies
	if err := db.Exec(`
		ALTER TABLE grading_records ENABLE ROW LEVEL SECURITY;
	`).Error; err != nil {
		return err
	}

	// Create RLS policies for different roles
	// Super Admin can access all records
	if err := db.Exec(`
		CREATE POLICY grading_records_super_admin_policy ON grading_records
		FOR ALL TO super_admin
		USING (true);
	`).Error; err != nil {
		return err
	}

	// Company Admin can access records from their company
	if err := db.Exec(`
		CREATE POLICY grading_records_company_admin_policy ON grading_records
		FOR ALL TO company_admin
		USING (
			EXISTS (
				SELECT 1 FROM users u
				WHERE u.id = current_user_id()
				AND u.company_id = (
					SELECT company_id FROM harvest_records hr
					WHERE hr.id = grading_records.harvest_record_id
				)
			)
		);
	`).Error; err != nil {
		return err
	}

	// Area Manager can access records from their assigned estates
	if err := db.Exec(`
		CREATE POLICY grading_records_area_manager_policy ON grading_records
		FOR ALL TO area_manager
		USING (
			EXISTS (
				SELECT 1 FROM assignments a
				WHERE a.user_id = current_user_id()
				AND a.estate_id = (
					SELECT estate_id FROM harvest_records hr
					WHERE hr.id = grading_records.harvest_record_id
				)
			)
		);
	`).Error; err != nil {
		return err
	}

	// Manager can access records from their assigned estates
	if err := db.Exec(`
		CREATE POLICY grading_records_manager_policy ON grading_records
		FOR ALL TO manager
		USING (
			EXISTS (
				SELECT 1 FROM assignments a
				WHERE a.user_id = current_user_id()
				AND a.estate_id = (
					SELECT estate_id FROM harvest_records hr
					WHERE hr.id = grading_records.harvest_record_id
				)
			)
		);
	`).Error; err != nil {
		return err
	}

	// Asisten can access records from their assigned divisions
	if err := db.Exec(`
		CREATE POLICY grading_records_asisten_policy ON grading_records
		FOR ALL TO asisten
		USING (
			EXISTS (
				SELECT 1 FROM assignments a
				WHERE a.user_id = current_user_id()
				AND a.division_id = (
					SELECT division_id FROM harvest_records hr
					WHERE hr.id = grading_records.harvest_record_id
				)
			)
		);
	`).Error; err != nil {
		return err
	}

	// Mandor can access records from their assigned blocks
	if err := db.Exec(`
		CREATE POLICY grading_records_mandor_policy ON grading_records
		FOR ALL TO mandor
		USING (
			EXISTS (
				SELECT 1 FROM assignments a
				WHERE a.user_id = current_user_id()
				AND a.block_id = (
					SELECT block_id FROM harvest_records hr
					WHERE hr.id = grading_records.harvest_record_id
				)
			)
		);
	`).Error; err != nil {
		return err
	}

	// Timbangan can read all grading records but cannot modify
	if err := db.Exec(`
		CREATE POLICY grading_records_timbangan_read_policy ON grading_records
		FOR SELECT TO timbangan
		USING (true);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE POLICY grading_records_timbangan_modify_policy ON grading_records
		FOR INSERT, UPDATE, DELETE TO timbangan
		USING (false);
	`).Error; err != nil {
		return err
	}

	// Grading role can access and modify grading records
	if err := db.Exec(`
		CREATE POLICY grading_records_grading_policy ON grading_records
		FOR ALL TO grading
		USING (
			EXISTS (
				SELECT 1 FROM assignments a
				WHERE a.user_id = current_user_id()
				AND (
					a.estate_id = (
						SELECT estate_id FROM harvest_records hr
						WHERE hr.id = grading_records.harvest_record_id
					)
					OR a.division_id = (
						SELECT division_id FROM harvest_records hr
						WHERE hr.id = grading_records.harvest_record_id
					)
				)
			)
		);
	`).Error; err != nil {
		return err
	}

	// Satpam can only read grading records for gate check purposes
	if err := db.Exec(`
		CREATE POLICY grading_records_satpam_read_policy ON grading_records
		FOR SELECT TO satpam
		USING (
			EXISTS (
				SELECT 1 FROM assignments a
				WHERE a.user_id = current_user_id()
				AND a.estate_id = (
					SELECT estate_id FROM harvest_records hr
					WHERE hr.id = grading_records.harvest_record_id
				)
			)
		);
	`).Error; err != nil {
		return err
	}

	return nil
}
package database

import (
	"fmt"
	"log"

	"gorm.io/gorm"

	authmodels "agrinovagraphql/server/internal/auth/models"
	gatecheckmodels "agrinovagraphql/server/internal/gatecheck/models"
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/mandor"
	"agrinovagraphql/server/internal/graphql/domain/master"
	notificationmodels "agrinovagraphql/server/internal/notifications/models"
	"agrinovagraphql/server/pkg/database/migrations"
)

// AutoMigrate runs all database migrations with proper GORM models
func AutoMigrate(db *gorm.DB) error {
	log.Println("Running database migrations...")

	// Vehicle schema must be finalized before strict GORM model migration,
	// otherwise non-null columns in the new model can fail on legacy rows.
	if err := migrations.Migration000030CreateVehicleMasterTable(db); err != nil {
		return fmt.Errorf("failed migration 000030 create vehicle master table (pre-auto-migrate): %w", err)
	}
	if err := migrations.Migration000031FinalizeVehicleSchemaAndTaxTables(db); err != nil {
		return fmt.Errorf("failed migration 000031 finalize vehicle schema and tax tables (pre-auto-migrate): %w", err)
	}

	// Import generated models for migration
	// Use GORM AutoMigrate for proper schema generation
	if err := db.AutoMigrate(
		// Core business models (hierarchical order)
		&master.Company{},
		&auth.User{},
		&master.Estate{},
		&master.Division{},
		&master.TarifBlok{},
		&master.Block{},
		&master.Vehicle{},
		&master.VehicleTax{},
		&master.VehicleTaxDocument{},
		&master.VehicleTaxNotification{},
		&mandor.HarvestRecord{},

		// Multi-assignment models (created via SQL below)
		// &master.UserEstateAssignment{},
		// &master.UserDivisionAssignment{},
		// &master.UserCompanyAssignment{},

		// Authentication models
		&authmodels.UserSession{},
		&authmodels.DeviceBinding{},
		&authmodels.JWTToken{},
		&authmodels.SecurityEvent{},
		&authmodels.LoginAttempt{},
		&authmodels.APIKey{},
		&authmodels.APIKeyLog{},

		// Gate check models
		&gatecheckmodels.GateCheckRecord{},
		&gatecheckmodels.GuestLog{},
		&gatecheckmodels.QRToken{},
		&gatecheckmodels.GateCheckPhoto{},

		// Notification models
		&notificationmodels.Notification{},
		&notificationmodels.NotificationTemplate{},
		&notificationmodels.NotificationPreferences{},
		&notificationmodels.NotificationDelivery{},
	); err != nil {
		return fmt.Errorf("failed to auto-migrate tables: %w", err)
	}

	// Ensure id_card_number column exists in gate_guest_logs (fix for sync error)
	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='id_card_number') THEN
				ALTER TABLE gate_guest_logs ADD COLUMN id_card_number VARCHAR(50);
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Note: Adding id_card_number column to gate_guest_logs may have issues: %v", err)
	}

	// Ensure cargo columns exist in gate_guest_logs (fix for sync error)
	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='cargo_volume') THEN
				ALTER TABLE gate_guest_logs ADD COLUMN cargo_volume DOUBLE PRECISION;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='cargo_owner') THEN
				ALTER TABLE gate_guest_logs ADD COLUMN cargo_owner VARCHAR(255);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='estimated_weight') THEN
				ALTER TABLE gate_guest_logs ADD COLUMN estimated_weight DOUBLE PRECISION;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='delivery_order_number') THEN
				ALTER TABLE gate_guest_logs ADD COLUMN delivery_order_number VARCHAR(255);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='second_cargo') THEN
				ALTER TABLE gate_guest_logs ADD COLUMN second_cargo VARCHAR(255);
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Note: Adding cargo columns to gate_guest_logs may have issues: %v", err)
	}

	// Add password column to users table since auth.User doesn't have it
	// This is needed because UserWithPassword and authentication require the password column
	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
				WHERE table_name='users' AND column_name='password') THEN
				ALTER TABLE users ADD COLUMN password TEXT;
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Note: Adding password column may have issues: %v", err)
	}

	// Create legacy table structure for backward compatibility
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS companies (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			nama VARCHAR(255) NOT NULL,
			alamat TEXT,
			telepon VARCHAR(20),
			logo_url TEXT,
			status VARCHAR(20) DEFAULT 'ACTIVE',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			deleted_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create companies table: %w", err)
	}

	if err := db.Exec(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT`).Error; err != nil {
		log.Printf("Note: Adding logo_url column may have issues: %v", err)
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			username TEXT,
			name TEXT,
			email TEXT,
			phone TEXT,
			password TEXT NOT NULL,
			role TEXT,
			manager_id UUID,
			is_active BOOLEAN DEFAULT true,
			created_at TIMESTAMP WITH TIME ZONE,
			updated_at TIMESTAMP WITH TIME ZONE,
			deleted_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create users table: %w", err)
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS estates (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			nama TEXT,
			lokasi TEXT,
			luas_ha DECIMAL,
			company_id UUID NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE,
			updated_at TIMESTAMP WITH TIME ZONE,
			deleted_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create estates table: %w", err)
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS divisions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			nama TEXT,
			kode TEXT,
			estate_id UUID NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE,
			updated_at TIMESTAMP WITH TIME ZONE,
			deleted_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create divisions table: %w", err)
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS tarif_blok (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			perlakuan VARCHAR(100) NOT NULL,
			basis NUMERIC(14,2),
			tarif_upah NUMERIC(14,2),
			premi NUMERIC(14,2),
			tarif_premi1 NUMERIC(14,2),
			tarif_premi2 NUMERIC(14,2),
			tarif_libur NUMERIC(14,2),
			tarif_lebaran NUMERIC(14,2),
			is_active BOOLEAN DEFAULT true,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			CONSTRAINT uq_tarif_blok_company_perlakuan UNIQUE (company_id, perlakuan)
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create tarif_blok table: %w", err)
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS blocks (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			nama TEXT,
			kode TEXT,
			division_id UUID NOT NULL,
			luas_ha DECIMAL,
			status VARCHAR(10) DEFAULT 'INTI',
			istm CHAR(1) DEFAULT 'N',
			perlakuan VARCHAR(100),
			tarif_blok_id UUID,
			created_at TIMESTAMP WITH TIME ZONE,
			updated_at TIMESTAMP WITH TIME ZONE,
			deleted_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create blocks table: %w", err)
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS harvest_records (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			local_id TEXT UNIQUE,
			device_id TEXT,
			tanggal TIMESTAMP WITH TIME ZONE,
			mandor_id UUID NOT NULL,
			company_id UUID,
			estate_id UUID,
			division_id UUID,
			block_id UUID NOT NULL,
			karyawan_id UUID,
			nik TEXT,
			employee_division_id UUID,
			employee_division_name TEXT,
			karyawan TEXT,
			berat_tbs DECIMAL,
			jumlah_janjang INTEGER,
			status TEXT,
			approved_by UUID,
			approved_at TIMESTAMP WITH TIME ZONE,
			rejected_reason TEXT,
			notes TEXT,
			latitude DOUBLE PRECISION,
			longitude DOUBLE PRECISION,
			photo_url TEXT,
			created_at TIMESTAMP WITH TIME ZONE,
			updated_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create harvest_records table: %w", err)
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS gate_check_records (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			tanggal TIMESTAMP WITH TIME ZONE,
			satpam_id UUID NOT NULL,
			nopol_kendaraan TEXT,
			nama_sopir TEXT,
			nama_pks TEXT,
			berat_masuk DECIMAL,
			berat_keluar DECIMAL,
			berat_bersih DECIMAL,
			intent TEXT,
			status TEXT,
			approved_by UUID,
			approved_at TIMESTAMP WITH TIME ZONE,
			rejected_reason TEXT,
			created_at TIMESTAMP WITH TIME ZONE,
			updated_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create gate_check_records table: %w", err)
	}

	// Assignment models
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS user_estate_assignments (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL,
			estate_id UUID NOT NULL,
			is_active BOOLEAN DEFAULT true,
			assigned_by UUID NOT NULL,
			assigned_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE,
			updated_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create user_estate_assignments table: %w", err)
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS user_division_assignments (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL,
			division_id UUID NOT NULL,
			is_active BOOLEAN DEFAULT true,
			assigned_by UUID NOT NULL,
			assigned_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE,
			updated_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create user_division_assignments table: %w", err)
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS user_company_assignments (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL,
			company_id UUID NOT NULL,
			is_active BOOLEAN DEFAULT true,
			assigned_by UUID NOT NULL,
			assigned_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE,
			updated_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create user_company_assignments table: %w", err)
	}

	// Authentication and security models
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS user_sessions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL,
			device_id TEXT,
			session_token TEXT UNIQUE NOT NULL,
			refresh_token TEXT,
			platform VARCHAR(20) NOT NULL,
			device_info JSON,
			ip_address TEXT,
			user_agent TEXT,
			last_activity TIMESTAMP WITH TIME ZONE NOT NULL,
			expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
			is_active BOOLEAN DEFAULT true,
			login_method VARCHAR(20) NOT NULL,
			security_flags JSON,
			created_at TIMESTAMP WITH TIME ZONE,
			updated_at TIMESTAMP WITH TIME ZONE,
			deleted_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create user_sessions table: %w", err)
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS device_bindings (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL,
			device_id TEXT NOT NULL,
			device_fingerprint TEXT NOT NULL,
			platform TEXT NOT NULL,
			trust_level TEXT DEFAULT 'UNTRUSTED',
			is_trusted BOOLEAN DEFAULT false,
			is_authorized BOOLEAN DEFAULT false,
			last_seen_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE,
			updated_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create device_bindings table: %w", err)
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS jwt_tokens (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL,
			device_id TEXT NOT NULL,
			token_type VARCHAR(20) NOT NULL,
			token_hash TEXT UNIQUE NOT NULL,
			refresh_hash TEXT UNIQUE,
			offline_hash TEXT UNIQUE,
			expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
			refresh_expires_at TIMESTAMP WITH TIME ZONE,
			offline_expires_at TIMESTAMP WITH TIME ZONE,
			is_revoked BOOLEAN DEFAULT false,
			revoked_at TIMESTAMP WITH TIME ZONE,
			last_used_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE,
			updated_at TIMESTAMP WITH TIME ZONE,
			deleted_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create jwt_tokens table: %w", err)
	}

	// Add migration for existing user_sessions table to ensure all columns exist
	if err := db.Exec(`
		DO $$
		BEGIN
			-- Add session_token column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_sessions' AND column_name='session_token') THEN
				ALTER TABLE user_sessions ADD COLUMN session_token TEXT UNIQUE;
			END IF;
			
			-- Add refresh_token column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_sessions' AND column_name='refresh_token') THEN
				ALTER TABLE user_sessions ADD COLUMN refresh_token TEXT;
			END IF;
			
			-- Add platform column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_sessions' AND column_name='platform') THEN
				ALTER TABLE user_sessions ADD COLUMN platform VARCHAR(20);
			END IF;
			
			-- Add device_info column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_sessions' AND column_name='device_info') THEN
				ALTER TABLE user_sessions ADD COLUMN device_info JSON;
			END IF;
			
			-- Add last_activity column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_sessions' AND column_name='last_activity') THEN
				ALTER TABLE user_sessions ADD COLUMN last_activity TIMESTAMP WITH TIME ZONE;
			END IF;
			
			-- Add login_method column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_sessions' AND column_name='login_method') THEN
				ALTER TABLE user_sessions ADD COLUMN login_method VARCHAR(20);
			END IF;
			
			-- Add security_flags column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_sessions' AND column_name='security_flags') THEN
				ALTER TABLE user_sessions ADD COLUMN security_flags JSON;
			END IF;
			
			-- Add deleted_at column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_sessions' AND column_name='deleted_at') THEN
				ALTER TABLE user_sessions ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Note: User sessions table migration may have issues: %v", err)
	}

	// Add migration for existing jwt_tokens table to ensure all columns exist
	if err := db.Exec(`
		DO $$
		BEGIN
			-- Add refresh_hash column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jwt_tokens' AND column_name='refresh_hash') THEN
				ALTER TABLE jwt_tokens ADD COLUMN refresh_hash TEXT UNIQUE;
			END IF;
			
			-- Add offline_hash column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jwt_tokens' AND column_name='offline_hash') THEN
				ALTER TABLE jwt_tokens ADD COLUMN offline_hash TEXT UNIQUE;
			END IF;
			
			-- Add refresh_expires_at column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jwt_tokens' AND column_name='refresh_expires_at') THEN
				ALTER TABLE jwt_tokens ADD COLUMN refresh_expires_at TIMESTAMP WITH TIME ZONE;
			END IF;
			
			-- Add offline_expires_at column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jwt_tokens' AND column_name='offline_expires_at') THEN
				ALTER TABLE jwt_tokens ADD COLUMN offline_expires_at TIMESTAMP WITH TIME ZONE;
			END IF;
			
			-- Add revoked_at column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jwt_tokens' AND column_name='revoked_at') THEN
				ALTER TABLE jwt_tokens ADD COLUMN revoked_at TIMESTAMP WITH TIME ZONE;
			END IF;
			
			-- Add last_used_at column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jwt_tokens' AND column_name='last_used_at') THEN
				ALTER TABLE jwt_tokens ADD COLUMN last_used_at TIMESTAMP WITH TIME ZONE;
			END IF;
			
			-- Add deleted_at column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jwt_tokens' AND column_name='deleted_at') THEN
				ALTER TABLE jwt_tokens ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Note: JWT tokens table migration may have issues: %v", err)
	}

	// Add migration for existing security_events table to ensure all columns exist
	if err := db.Exec(`
		DO $$
		BEGIN
			-- Add details column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='security_events' AND column_name='details') THEN
				ALTER TABLE security_events ADD COLUMN details JSON;
			END IF;
			
			-- Add deleted_at column if not exists
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='security_events' AND column_name='deleted_at') THEN
				ALTER TABLE security_events ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Note: Security events table migration may have issues: %v", err)
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS security_events (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL,
			event_type VARCHAR(50) NOT NULL,
			details JSON,
			ip_address TEXT,
			user_agent TEXT,
			device_id VARCHAR(255),
			severity VARCHAR(10) NOT NULL,
			is_resolved BOOLEAN DEFAULT false,
			resolved_by UUID,
			resolved_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE,
			updated_at TIMESTAMP WITH TIME ZONE,
			deleted_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create security_events table: %w", err)
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS login_attempts (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			username TEXT NOT NULL,
			ip_address TEXT,
			user_agent TEXT,
			is_successful BOOLEAN DEFAULT false,
			failure_reason TEXT,
			attempted_at TIMESTAMP WITH TIME ZONE
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create login_attempts table: %w", err)
	}

	// Create RLS audit log table for security monitoring
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS harvest_rls_audit_log (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID,
			user_role VARCHAR(50),
			action VARCHAR(20),
			record_id UUID,
			attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			violation_type VARCHAR(100),
			details JSONB,
			ip_address INET,
			user_agent TEXT
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create harvest_rls_audit_log table: %w", err)
	}

	// Create RLS context functions for PostgreSQL
	if err := db.Exec(`
		-- Function to set current user context (application level)
		CREATE OR REPLACE FUNCTION app_set_user_context(
			p_user_id UUID,
			p_role VARCHAR(50),
			p_company_ids UUID[],
			p_estate_ids UUID[],
			p_division_ids UUID[]
		) RETURNS VOID AS $$
		BEGIN
			PERFORM set_config('app.user_id', p_user_id::TEXT, false);
			PERFORM set_config('app.user_role', p_role, false);
			PERFORM set_config('app.company_ids', array_to_string(p_company_ids, ','), false);
			PERFORM set_config('app.estate_ids', array_to_string(p_estate_ids, ','), false);
			PERFORM set_config('app.division_ids', array_to_string(p_division_ids, ','), false);
		END;
		$$ LANGUAGE plpgsql SECURITY DEFINER;

		-- Function to clear user context
		CREATE OR REPLACE FUNCTION app_clear_user_context() RETURNS VOID AS $$
		BEGIN
			PERFORM set_config('app.user_id', '', false);
			PERFORM set_config('app.user_role', '', false);
			PERFORM set_config('app.company_ids', '', false);
			PERFORM set_config('app.estate_ids', '', false);
			PERFORM set_config('app.division_ids', '', false);
		END;
		$$ LANGUAGE plpgsql SECURITY DEFINER;

		-- Function to get current user ID from context
		CREATE OR REPLACE FUNCTION app_get_user_id() RETURNS UUID AS $$
		BEGIN
			RETURN NULLIF(current_setting('app.user_id', true), '')::UUID;
		EXCEPTION
			WHEN OTHERS THEN RETURN NULL;
		END;
		$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

		-- Function to get current user role from context
		CREATE OR REPLACE FUNCTION app_get_user_role() RETURNS VARCHAR(50) AS $$
		BEGIN
			RETURN NULLIF(current_setting('app.user_role', true), '');
		EXCEPTION
			WHEN OTHERS THEN RETURN NULL;
		END;
		$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
	`).Error; err != nil {
		log.Printf("Note: RLS context functions may already exist: %v", err)
	}

	// Add employees table if not exists
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS employees (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			nik VARCHAR(50) NOT NULL,
			name VARCHAR(100) NOT NULL,
			role VARCHAR(50) NOT NULL,
			company_id UUID NOT NULL,
			division_id UUID,
			photo_url TEXT,
			is_active BOOLEAN DEFAULT true,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to create employees table: %w", err)
	}

	// Add is_active column to blocks table if not exists
	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blocks' AND column_name='is_active') THEN
				ALTER TABLE blocks ADD COLUMN is_active BOOLEAN DEFAULT true;
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Note: Adding is_active column to blocks may have issues: %v", err)
	}

	// Add division_id column to employees table if not exists
	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='division_id') THEN
				ALTER TABLE employees ADD COLUMN division_id UUID;
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Note: Adding division_id column to employees may have issues: %v", err)
	}

	// Add id_card_number column to gate_guest_logs table if not exists
	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='id_card_number') THEN
				ALTER TABLE gate_guest_logs ADD COLUMN id_card_number VARCHAR(50);
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Note: Adding id_card_number column to gate_guest_logs may have issues: %v", err)
	}

	// Create index for employees division_id
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_employees_division_id ON employees(division_id);
		CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
		CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
		CREATE INDEX IF NOT EXISTS idx_blocks_is_active ON blocks(is_active);
	`).Error; err != nil {
		log.Printf("Note: Creating indexes may have issues: %v", err)
	}

	// Add foreign key constraints after all tables are created
	// Company foreign keys
	if err := db.Exec("ALTER TABLE estates ADD CONSTRAINT fk_companies_estates FOREIGN KEY (company_id) REFERENCES companies(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for estates may already exist: %v", err)
	}

	if err := db.Exec("ALTER TABLE tarif_blok ADD CONSTRAINT fk_tarif_blok_company FOREIGN KEY (company_id) REFERENCES companies(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for tarif_blok company may already exist: %v", err)
	}

	// Estate foreign keys
	if err := db.Exec("ALTER TABLE divisions ADD CONSTRAINT fk_estates_divisions FOREIGN KEY (estate_id) REFERENCES estates(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for divisions may already exist: %v", err)
	}

	if err := db.Exec("ALTER TABLE user_estate_assignments ADD CONSTRAINT fk_user_estate_assignments_user FOREIGN KEY (user_id) REFERENCES users(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for user_estate_assignments user may already exist: %v", err)
	}

	if err := db.Exec("ALTER TABLE user_estate_assignments ADD CONSTRAINT fk_user_estate_assignments_estate FOREIGN KEY (estate_id) REFERENCES estates(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for user_estate_assignments estate may already exist: %v", err)
	}

	// Division foreign keys
	if err := db.Exec("ALTER TABLE blocks ADD CONSTRAINT fk_divisions_blocks FOREIGN KEY (division_id) REFERENCES divisions(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for blocks may already exist: %v", err)
	}

	if err := db.Exec("ALTER TABLE user_division_assignments ADD CONSTRAINT fk_user_division_assignments_user FOREIGN KEY (user_id) REFERENCES users(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for user_division_assignments user may already exist: %v", err)
	}

	if err := db.Exec("ALTER TABLE user_division_assignments ADD CONSTRAINT fk_user_division_assignments_division FOREIGN KEY (division_id) REFERENCES divisions(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for user_division_assignments division may already exist: %v", err)
	}

	// Block foreign keys
	if err := db.Exec("ALTER TABLE harvest_records ADD CONSTRAINT fk_harvest_records_block FOREIGN KEY (block_id) REFERENCES blocks(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for harvest_records block may already exist: %v", err)
	}

	// User foreign keys
	if err := db.Exec("ALTER TABLE harvest_records ADD CONSTRAINT fk_harvest_records_mandor FOREIGN KEY (mandor_id) REFERENCES users(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for harvest_records mandor may already exist: %v", err)
	}

	if err := db.Exec("ALTER TABLE gate_check_records ADD CONSTRAINT fk_gate_check_records_satpam FOREIGN KEY (satpam_id) REFERENCES users(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for gate_check_records satpam may already exist: %v", err)
	}

	if err := db.Exec("ALTER TABLE user_company_assignments ADD CONSTRAINT fk_user_company_assignments_user FOREIGN KEY (user_id) REFERENCES users(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for user_company_assignments user may already exist: %v", err)
	}

	if err := db.Exec("ALTER TABLE user_company_assignments ADD CONSTRAINT fk_user_company_assignments_company FOREIGN KEY (company_id) REFERENCES companies(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for user_company_assignments company may already exist: %v", err)
	}

	if err := db.Exec("ALTER TABLE user_sessions ADD CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for user_sessions may already exist: %v", err)
	}

	if err := db.Exec("ALTER TABLE device_bindings ADD CONSTRAINT fk_device_bindings_user FOREIGN KEY (user_id) REFERENCES users(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for device_bindings may already exist: %v", err)
	}

	if err := db.Exec("ALTER TABLE jwt_tokens ADD CONSTRAINT fk_jwt_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for jwt_tokens may already exist: %v", err)
	}

	if err := db.Exec("ALTER TABLE security_events ADD CONSTRAINT fk_security_events_user FOREIGN KEY (user_id) REFERENCES users(id)").Error; err != nil {
		log.Printf("Note: Foreign key constraint for security_events may already exist: %v", err)
	}

	// Create indexes
	log.Println("Creating database indexes...")

	// Company indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at)")

	// User indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at)")

	// Estate indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_estates_company_id ON estates(company_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_estates_deleted_at ON estates(deleted_at)")

	// Division indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_divisions_estate_id ON divisions(estate_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_divisions_deleted_at ON divisions(deleted_at)")

	// Block indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_blocks_division_id ON blocks(division_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_blocks_deleted_at ON blocks(deleted_at)")

	// Harvest record indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_mandor_id ON harvest_records(mandor_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_block_id ON harvest_records(block_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_status ON harvest_records(status)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_tanggal ON harvest_records(tanggal)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_local_id ON harvest_records(local_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_device_id ON harvest_records(device_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_company_id ON harvest_records(company_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_estate_id ON harvest_records(estate_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_division_id ON harvest_records(division_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_karyawan_id ON harvest_records(karyawan_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_nik ON harvest_records(nik)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_employee_division_id ON harvest_records(employee_division_id)")

	// Gate check record indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_gate_check_records_satpam_id ON gate_check_records(satpam_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_gate_check_records_status ON gate_check_records(status)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_gate_check_records_intent ON gate_check_records(intent)")

	// Assignment indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_user_estate_assignments_user_id ON user_estate_assignments(user_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_user_estate_assignments_estate_id ON user_estate_assignments(estate_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_user_division_assignments_user_id ON user_division_assignments(user_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_user_division_assignments_division_id ON user_division_assignments(division_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_user_company_assignments_user_id ON user_company_assignments(user_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_user_company_assignments_company_id ON user_company_assignments(company_id)")

	// Session indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_user_sessions_user_device ON user_sessions(user_id, device_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)")

	// Device binding indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_device_bindings_user_id ON device_bindings(user_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_device_bindings_device_id ON device_bindings(device_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_device_bindings_authorized ON device_bindings(is_authorized)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_device_bindings_trusted ON device_bindings(is_trusted)")

	// JWT Token indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_user_device ON jwt_tokens(user_id, device_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_hash ON jwt_tokens(token_hash)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_revoked ON jwt_tokens(is_revoked)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_expires_at ON jwt_tokens(expires_at)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_refresh_hash ON jwt_tokens(refresh_hash)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_offline_hash ON jwt_tokens(offline_hash)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_refresh_expires_at ON jwt_tokens(refresh_expires_at)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_offline_expires_at ON jwt_tokens(offline_expires_at)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_deleted_at ON jwt_tokens(deleted_at)")

	// Security event indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(is_resolved)")

	// Login attempt indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_login_attempts_successful ON login_attempts(is_successful)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at)")

	// RLS audit log indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_rls_audit_user ON harvest_rls_audit_log(user_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_rls_audit_date ON harvest_rls_audit_log(attempted_at)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_rls_audit_violation ON harvest_rls_audit_log(violation_type)")

	// Create RBAC schema and seed data
	if err := CreateRBACSchema(db); err != nil {
		return fmt.Errorf("failed to create RBAC schema: %w", err)
	}

	if err := SeedRBACData(db); err != nil {
		return fmt.Errorf("failed to seed RBAC data: %w", err)
	}

	if err := MigrateStaticPermissionsToRBAC(db); err != nil {
		return fmt.Errorf("failed to migrate static permissions: %w", err)
	}

	// Run role-specific migrations
	if err := Migration0005_AddNewRoles(db); err != nil {
		return fmt.Errorf("failed to add new roles: %w", err)
	}

	// Run Satpam POS tables migration
	if err := MigrateSatpamTables(db); err != nil {
		return fmt.Errorf("failed to migrate satpam tables: %w", err)
	}

	// Remove guest* columns from gate_guest_logs table
	if err := RemoveGuestColumnsFromGateGuestLogs(db); err != nil {
		return fmt.Errorf("failed to remove guest columns: %w", err)
	}

	// Add cargo columns to gate_guest_logs table
	if err := migrations.Migration000013AddCargoColumns(db); err != nil {
		return fmt.Errorf("failed to add cargo columns: %w", err)
	}

	// Add load_type column to gate_guest_logs table
	if err := migrations.Migration000014AddLoadTypeColumn(db); err != nil {
		return fmt.Errorf("failed to add load_type column: %w", err)
	}

	// Add second_cargo column to gate_guest_logs table
	if err := migrations.Migration000015AddSecondCargoColumn(db); err != nil {
		return fmt.Errorf("failed to add second_cargo column: %w", err)
	}

	// Remove photo_path column from gate_guest_logs table
	if err := migrations.Migration000016RemoveGuestLogPhotoPath(db); err != nil {
		return fmt.Errorf("failed to remove photo_path column: %w", err)
	}

	// Migration 000017 (refactor user schema) has been rolled back.
	// Name/phone columns remain in the users table. See migration 000022.

	// Enforce unique division assignments per user and cleanup historical duplicates.
	if err := migrations.Migration000018EnforceUniqueUserDivisionAssignments(db); err != nil {
		return fmt.Errorf("failed migration 000018 enforce unique user division assignments: %w", err)
	}

	// Enforce unique estate/company assignments per user and cleanup historical duplicates.
	if err := migrations.Migration000019EnforceUniqueEstateCompanyAssignments(db); err != nil {
		return fmt.Errorf("failed migration 000019 enforce unique estate/company assignments: %w", err)
	}

	// Add users.avatar_url for profile avatar persistence.
	if err := migrations.Migration000020AddUserAvatarColumn(db); err != nil {
		return fmt.Errorf("failed migration 000020 add user avatar column: %w", err)
	}

	// Backfill legacy OFFLINE jwt_tokens rows for consistent offline validation.
	if err := migrations.Migration000021BackfillOfflineJWTTokens(db); err != nil {
		return fmt.Errorf("failed migration 000021 backfill offline jwt tokens: %w", err)
	}

	// Rollback migration 000017: restore name/phone to users table.
	if err := migrations.Migration000022RollbackUserSchema(db); err != nil {
		return fmt.Errorf("failed migration 000022 rollback user schema: %w", err)
	}

	// Add block status/istm/perlakuan and tarif_blok master relation.
	if err := migrations.Migration000023AddBlockTarifMetadata(db); err != nil {
		return fmt.Errorf("failed migration 000023 add block tarif metadata: %w", err)
	}

	// Enforce tarif_blok uniqueness per company (company_id + perlakuan).
	if err := migrations.Migration000028EnforceTarifBlokPerCompanyUnique(db); err != nil {
		return fmt.Errorf("failed migration 000028 enforce tarif blok per company uniqueness: %w", err)
	}

	// Remove FK relation from gate_check_records to blocks (keep block_id as plain UUID).
	if err := migrations.Migration000029RemoveGateCheckBlockReference(db); err != nil {
		return fmt.Errorf("failed migration 000029 remove gate check block reference: %w", err)
	}

	// Add nik column to harvest_records and backfill from karyawan.
	if err := migrations.Migration000032AddHarvestRecordsNikColumn(db); err != nil {
		return fmt.Errorf("failed migration 000032 add harvest records nik column: %w", err)
	}

	// Add harvest quality breakdown columns for sync payload compatibility.
	if err := migrations.Migration000033AddHarvestQualityColumns(db); err != nil {
		return fmt.Errorf("failed migration 000033 add harvest quality columns: %w", err)
	}

	// Align harvest_records schema for legacy databases and remove deprecated asisten_id.
	if err := migrations.Migration000034AlignHarvestRecordsSchema(db); err != nil {
		return fmt.Errorf("failed migration 000034 align harvest records schema: %w", err)
	}

	// Drop deprecated harvest_records.karyawan after nik/karyawan_id cutover.
	if err := migrations.Migration000035DropHarvestKaryawanColumn(db); err != nil {
		return fmt.Errorf("failed migration 000035 drop harvest karyawan column: %w", err)
	}

	// Add harvest_records.device_id for sync source tracking.
	if err := migrations.Migration000036AddHarvestDeviceIDColumn(db); err != nil {
		return fmt.Errorf("failed migration 000036 add harvest device_id column: %w", err)
	}

	// Add employee-origin division snapshot columns to harvest_records.
	if err := migrations.Migration000037AddHarvestEmployeeDivisionColumns(db); err != nil {
		return fmt.Errorf("failed migration 000037 add harvest employee division columns: %w", err)
	}

	// Enforce business uniqueness: company + day + block + worker must be unique.
	if err := migrations.Migration000038EnforceUniqueHarvestWorkerScope(db); err != nil {
		return fmt.Errorf("failed migration 000038 enforce unique harvest worker scope: %w", err)
	}

	// Create BKM sync tables (Oracle → PostgreSQL).
	if err := migrations.Migration000039CreateBkmSyncTables(db); err != nil {
		return fmt.Errorf("failed migration 000039 create bkm sync tables: %w", err)
	}

	// Hard cutover: revoke all existing JWT-format OFFLINE tokens so users get
	// new opaque tokens on next login (one-time migration).
	if err := migrations.Migration000040MigrateOfflineTokenToOpaque(db); err != nil {
		return fmt.Errorf("failed migration 000040 migrate offline token to opaque: %w", err)
	}

	// Add per-user unique constraints on local_id for idempotent sync pushes.
	if err := migrations.Migration000041AddSyncIdempotencyConstraints(db); err != nil {
		return fmt.Errorf("failed migration 000041 add sync idempotency constraints: %w", err)
	}

	// Add partial index on jwt_tokens.offline_hash for fast deviceRenew lookups.
	if err := migrations.Migration000042AddOfflineTokenIndex(db); err != nil {
		return fmt.Errorf("failed migration 000042 add offline token index: %w", err)
	}

	// Create manager division production budget table with unique division+period constraint.
	if err := migrations.Migration000043CreateManagerDivisionProductionBudgets(db); err != nil {
		return fmt.Errorf("failed migration 000043 create manager division production budgets: %w", err)
	}

	// Add targeted indexes for BKM report query hot paths.
	if err := migrations.Migration000044OptimizeBkmReportIndexes(db); err != nil {
		return fmt.Errorf("failed migration 000044 optimize bkm report indexes: %w", err)
	}

	// Add notification idempotency and delivery tracking indexes.
	if err := migrations.Migration000045OptimizeNotificationIdempotencyAndDelivery(db); err != nil {
		return fmt.Errorf("failed migration 000045 optimize notification idempotency and delivery: %w", err)
	}

	// Create bridge mapping table for BKM source identifiers to companies.
	if err := migrations.Migration000046CreateBkmCompanyBridge(db); err != nil {
		return fmt.Errorf("failed migration 000046 create bkm company bridge: %w", err)
	}

	legacyMasterColumns, err := hasLegacyMasterColumns(db)
	if err != nil {
		return fmt.Errorf("failed checking legacy master columns: %w", err)
	}
	if legacyMasterColumns {
		// Only run cutover sync when legacy master columns still exist.
		if err := migrations.Migration000024CutoverLegacySchema(db); err != nil {
			return fmt.Errorf("failed migration 000024 cutover legacy schema: %w", err)
		}
	} else {
		log.Println("Migration 000024 skipped: no legacy master columns detected")
	}

	// Finalize legacy schema removal. Includes parity validation internally.
	if err := migrations.Migration000026FinalizeDropLegacySchema(db); err != nil {
		return fmt.Errorf("failed migration 000026 finalize drop legacy schema: %w", err)
	}

	// Finalize legacy users schema removal.
	if err := migrations.Migration000027FinalizeDropLegacyUserSchema(db); err != nil {
		return fmt.Errorf("failed migration 000027 finalize drop legacy user schema: %w", err)
	}

	// Enforce harvest row-level security so Mandor can only access own records.
	// This is idempotent and safe to run on every startup.
	if err := db.Exec(`
		ALTER TABLE harvest_records ENABLE ROW LEVEL SECURITY;

		DROP POLICY IF EXISTS harvest_select_policy ON harvest_records;
		CREATE POLICY harvest_select_policy ON harvest_records
			FOR SELECT
			USING (
				app_get_user_id() IS NOT NULL
				AND (
					app_get_user_role() <> 'MANDOR'
					OR mandor_id = app_get_user_id()
				)
			);

		DROP POLICY IF EXISTS harvest_insert_policy ON harvest_records;
		CREATE POLICY harvest_insert_policy ON harvest_records
			FOR INSERT
			WITH CHECK (
				app_get_user_id() IS NOT NULL
				AND (
					app_get_user_role() <> 'MANDOR'
					OR mandor_id = app_get_user_id()
				)
			);

		DROP POLICY IF EXISTS harvest_update_policy ON harvest_records;
		CREATE POLICY harvest_update_policy ON harvest_records
			FOR UPDATE
			USING (
				app_get_user_id() IS NOT NULL
				AND (
					app_get_user_role() <> 'MANDOR'
					OR mandor_id = app_get_user_id()
				)
			)
			WITH CHECK (
				app_get_user_id() IS NOT NULL
				AND (
					app_get_user_role() <> 'MANDOR'
					OR mandor_id = app_get_user_id()
				)
			);

		DROP POLICY IF EXISTS harvest_delete_policy ON harvest_records;
		CREATE POLICY harvest_delete_policy ON harvest_records
			FOR DELETE
			USING (
				app_get_user_id() IS NOT NULL
				AND (
					app_get_user_role() <> 'MANDOR'
					OR mandor_id = app_get_user_id()
				)
			);
	`).Error; err != nil {
		return fmt.Errorf("failed to configure harvest row-level security policies: %w", err)
	}

	log.Println("Database migrations completed successfully")
	return nil
}

func hasLegacyMasterColumns(db *gorm.DB) (bool, error) {
	var hasLegacy bool
	if err := db.Raw(`
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE
				(table_name = 'companies' AND column_name IN ('nama', 'kode', 'alamat', 'telepon')) OR
				(table_name = 'estates' AND column_name IN ('nama', 'kode', 'lokasi', 'luas_ha')) OR
				(table_name = 'divisions' AND column_name IN ('nama', 'kode')) OR
				(table_name = 'blocks' AND column_name IN ('nama', 'kode_blok', 'kode', 'luas_ha', 'jenis_tanaman', 'tahun_tanam'))
			LIMIT 1
		);
	`).Scan(&hasLegacy).Error; err != nil {
		return false, err
	}

	return hasLegacy, nil
}

// RemoveGuestColumnsFromGateGuestLogs removes all guest* prefixed columns from gate_guest_logs table
func RemoveGuestColumnsFromGateGuestLogs(db *gorm.DB) error {
	log.Println("Removing guest* columns from gate_guest_logs table...")

	columns := []string{
		"guest_id",
		"guest_name",
		"guest_company",
		"guest_purpose",
		"guest_phone",
		"guest_email",
	}

	for _, column := range columns {
		sql := fmt.Sprintf(`
			DO $$
			BEGIN
				IF EXISTS (
					SELECT 1 FROM information_schema.columns
					WHERE table_name = 'gate_guest_logs' AND column_name = '%s'
				) THEN
					ALTER TABLE gate_guest_logs DROP COLUMN %s;
					RAISE NOTICE 'Dropped column %s from gate_guest_logs';
				END IF;
			END $$;
		`, column, column, column)

		if err := db.Exec(sql).Error; err != nil {
			log.Printf("Warning: Failed to drop column %s: %v", column, err)
		}
	}

	log.Println("Guest columns removal completed")
	return nil
}

// CreateIndexes creates additional database indexes for better performance
func CreateIndexes(db *gorm.DB) error {
	log.Println("Creating database indexes...")

	// User indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)")

	// Session indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_user_sessions_user_device ON user_sessions(user_id, device_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)")

	// JWT Token indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_user_device ON jwt_tokens(user_id, device_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_hash ON jwt_tokens(token_hash)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_revoked ON jwt_tokens(is_revoked)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_expires_at ON jwt_tokens(expires_at)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_refresh_hash ON jwt_tokens(refresh_hash)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_offline_hash ON jwt_tokens(offline_hash)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_refresh_expires_at ON jwt_tokens(refresh_expires_at)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_offline_expires_at ON jwt_tokens(offline_expires_at)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_jwt_tokens_deleted_at ON jwt_tokens(deleted_at)")

	// Device binding indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_device_bindings_user_id ON device_bindings(user_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_device_bindings_device_id ON device_bindings(device_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_device_bindings_authorized ON device_bindings(is_authorized)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_device_bindings_trusted ON device_bindings(is_trusted)")

	// Login attempt indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_login_attempts_successful ON login_attempts(is_successful)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at)")

	// Security event indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(is_resolved)")

	// Business data indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_mandor_id ON harvest_records(mandor_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_block_id ON harvest_records(block_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_status ON harvest_records(status)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_tanggal ON harvest_records(tanggal)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_local_id ON harvest_records(local_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_device_id ON harvest_records(device_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_company_id ON harvest_records(company_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_estate_id ON harvest_records(estate_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_division_id ON harvest_records(division_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_karyawan_id ON harvest_records(karyawan_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_nik ON harvest_records(nik)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_harvest_records_employee_division_id ON harvest_records(employee_division_id)")

	db.Exec("CREATE INDEX IF NOT EXISTS idx_gate_check_records_satpam_id ON gate_check_records(satpam_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_gate_check_records_status ON gate_check_records(status)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_gate_check_records_intent ON gate_check_records(intent)")

	log.Println("Database indexes created successfully")
	return nil
}

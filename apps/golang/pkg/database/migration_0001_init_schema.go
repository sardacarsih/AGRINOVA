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
)

// InitSchemaMigration handles the initial database schema creation
type InitSchemaMigration struct{}

func (m *InitSchemaMigration) Migrate(db *gorm.DB) error {
	log.Println("Running migration: 0001_init_schema")

	// 1. Run GORM AutoMigrate for all models
	// This creates tables based on struct definitions
	if err := db.AutoMigrate(
		// Base organizational structure
		&master.Company{},
		&auth.User{},
		&master.Estate{},
		&master.Division{},
		&master.Block{},

		// Operational records
		&mandor.HarvestRecord{},

		// Assignment models (created via SQL migrations below)
		// &master.UserEstateAssignment{},
		// &master.UserDivisionAssignment{},
		// &master.UserCompanyAssignment{},

		// Authentication models
		&authmodels.UserSession{},
		&authmodels.DeviceBinding{},
		&authmodels.JWTToken{},
		&authmodels.SecurityEvent{},
		&authmodels.LoginAttempt{},
		&authmodels.LoginAttempt{},

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
		return fmt.Errorf("failed to auto-migrate GORM models: %w", err)
	}

	// 2. Ensure legacy table structures exist (if not covered by GORM)
	// We use IF NOT EXISTS to be safe
	legacyTables := []string{
		`CREATE TABLE IF NOT EXISTS companies (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			nama VARCHAR(255) NOT NULL,
			alamat TEXT,
			telepon VARCHAR(20),
			logo_url TEXT,
			status VARCHAR(20) DEFAULT 'ACTIVE',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			deleted_at TIMESTAMP WITH TIME ZONE
		)`,
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			username TEXT,
			nama TEXT,
			email TEXT,
			no_telpon TEXT,
			password TEXT NOT NULL,
			role TEXT,
			company_id UUID NOT NULL,
			is_active BOOLEAN DEFAULT true,
			created_at TIMESTAMP WITH TIME ZONE,
			updated_at TIMESTAMP WITH TIME ZONE,
			deleted_at TIMESTAMP WITH TIME ZONE
		)`,
		// Add other legacy tables here if they differ significantly from GORM models
		// For now, assuming GORM models cover most, but keeping these as fallback/verification
	}

	for _, sql := range legacyTables {
		if err := db.Exec(sql).Error; err != nil {
			// Log warning but don't fail, as GORM might have already created them
			log.Printf("Warning: Legacy table creation might have conflicted (safe to ignore if GORM worked): %v", err)
		}
	}

	// 3. Apply specific column alterations that might be needed
	// (Taken from original migrations.go)
	alterations := []string{
		`ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT`,
		`ALTER TABLE estates ADD COLUMN IF NOT EXISTS code VARCHAR(50) NOT NULL DEFAULT ''`,
		`ALTER TABLE estates ADD COLUMN IF NOT EXISTS description TEXT`,
		`ALTER TABLE estates ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`,
	}

	for _, sql := range alterations {
		if err := db.Exec(sql).Error; err != nil {
			log.Printf("Warning: Failed to apply alteration: %v", err)
		}
	}

	// 4. Block table specific migrations (from original code)
	if err := m.migrateBlocks(db); err != nil {
		log.Printf("Warning: Blocks table migration issue: %v", err)
	}

	return nil
}

func (m *InitSchemaMigration) migrateBlocks(db *gorm.DB) error {
	return db.Exec(`
		DO $$
		BEGIN
			-- Add kode_blok column if not exists (rename from kode)
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blocks' AND column_name='kode_blok') THEN
				IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blocks' AND column_name='kode') THEN
					ALTER TABLE blocks RENAME COLUMN kode TO kode_blok;
				ELSE
					ALTER TABLE blocks ADD COLUMN kode_blok VARCHAR(50);
					UPDATE blocks SET kode_blok = COALESCE(kode_blok, 'BLK-' || id::text) WHERE kode_blok IS NULL;
					ALTER TABLE blocks ALTER COLUMN kode_blok SET NOT NULL;
				END IF;
			END IF;

			-- Add other columns
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blocks' AND column_name='jenis_tanaman') THEN
				ALTER TABLE blocks ADD COLUMN jenis_tanaman VARCHAR(100);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blocks' AND column_name='tahun_tanam') THEN
				ALTER TABLE blocks ADD COLUMN tahun_tanam INTEGER;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blocks' AND column_name='status') THEN
				ALTER TABLE blocks ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blocks' AND column_name='bjr_value') THEN
				ALTER TABLE blocks ADD COLUMN bjr_value DECIMAL(5,4) DEFAULT 0.85 NOT NULL;
			END IF;
		END $$;
	`).Error
}

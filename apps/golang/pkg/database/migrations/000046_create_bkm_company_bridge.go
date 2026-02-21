package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000046CreateBkmCompanyBridge creates bridge mapping rules from
// external BKM iddata to internal company IDs.
func Migration000046CreateBkmCompanyBridge(db *gorm.DB) error {
	log.Println("Running migration: 000046_create_bkm_company_bridge")

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS bkm_company_bridge (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			source_system VARCHAR(32) NOT NULL DEFAULT 'BKM',
			iddata_prefix VARCHAR(100) NOT NULL,
			estate_key VARCHAR(100),
			divisi_key VARCHAR(100),
			company_id UUID NOT NULL,
			priority INTEGER NOT NULL DEFAULT 100,
			is_active BOOLEAN NOT NULL DEFAULT true,
			notes TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1
				FROM information_schema.table_constraints
				WHERE table_name = 'bkm_company_bridge'
				  AND constraint_type = 'FOREIGN KEY'
				  AND constraint_name = 'fk_bkm_company_bridge_company'
			) THEN
				ALTER TABLE bkm_company_bridge
				ADD CONSTRAINT fk_bkm_company_bridge_company
				FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
			END IF;
		END $$;
	`).Error; err != nil {
		log.Printf("Note: adding FK fk_bkm_company_bridge_company may have issues: %v", err)
	}

	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_bkm_company_bridge_company_id
			ON bkm_company_bridge (company_id)`,
		`CREATE INDEX IF NOT EXISTS idx_bkm_company_bridge_active_priority
			ON bkm_company_bridge (is_active, source_system, priority, updated_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_bkm_company_bridge_norm_prefix
			ON bkm_company_bridge (
				(UPPER(BTRIM(COALESCE(source_system, '')))),
				(UPPER(BTRIM(COALESCE(iddata_prefix, '')))),
				(UPPER(BTRIM(COALESCE(estate_key, '')))),
				(UPPER(BTRIM(COALESCE(divisi_key, ''))))
			)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS uq_bkm_company_bridge_active_rule
			ON bkm_company_bridge (
				(UPPER(BTRIM(COALESCE(source_system, '')))),
				(UPPER(BTRIM(COALESCE(iddata_prefix, '')))),
				(UPPER(BTRIM(COALESCE(estate_key, '')))),
				(UPPER(BTRIM(COALESCE(divisi_key, '')))),
				company_id
			)
			WHERE is_active = true`,
	}

	for _, indexSQL := range indexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			log.Printf("Warning: failed to create bkm_company_bridge index: %v", err)
		}
	}

	log.Println("Migration 000046 completed: bkm_company_bridge is ready")
	return nil
}

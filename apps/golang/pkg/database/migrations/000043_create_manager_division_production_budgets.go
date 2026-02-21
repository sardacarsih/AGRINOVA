package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000043CreateManagerDivisionProductionBudgets creates manager budget table
// with DB-level uniqueness guard to prevent duplicate division+period budgets.
func Migration000043CreateManagerDivisionProductionBudgets(db *gorm.DB) error {
	log.Println("Running migration: 000043_create_manager_division_production_budgets")

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS manager_division_production_budgets (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			division_id UUID NOT NULL,
			period_month VARCHAR(7) NOT NULL,
			target_ton NUMERIC(14,2) NOT NULL CHECK (target_ton > 0),
			planned_cost NUMERIC(18,2) NOT NULL CHECK (planned_cost > 0),
			actual_cost NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (actual_cost >= 0),
			notes TEXT,
			created_by UUID NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			CONSTRAINT fk_mdpb_division FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE RESTRICT,
			CONSTRAINT fk_mdpb_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
			CONSTRAINT uq_mdpb_division_period UNIQUE (division_id, period_month),
			CONSTRAINT chk_mdpb_period_format CHECK (period_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_mdpb_division_id
			ON manager_division_production_budgets (division_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_mdpb_period_month
			ON manager_division_production_budgets (period_month);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_mdpb_created_by
			ON manager_division_production_budgets (created_by);
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000043 completed: manager division production budgets table created")
	return nil
}

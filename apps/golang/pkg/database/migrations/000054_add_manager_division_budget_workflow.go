package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000054AddManagerDivisionBudgetWorkflow adds workflow and override
// control columns for division budget control tower.
func Migration000054AddManagerDivisionBudgetWorkflow(db *gorm.DB) error {
	log.Println("Running migration: 000054_add_manager_division_budget_workflow")

	if err := db.Exec(`
		ALTER TABLE manager_division_production_budgets
		ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(16) NOT NULL DEFAULT 'DRAFT';
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		ALTER TABLE manager_division_production_budgets
		ADD COLUMN IF NOT EXISTS override_approved BOOLEAN NOT NULL DEFAULT false;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		ALTER TABLE manager_division_production_budgets
		ADD COLUMN IF NOT EXISTS override_approved_by UUID;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		ALTER TABLE manager_division_production_budgets
		ADD COLUMN IF NOT EXISTS override_approved_at TIMESTAMP WITH TIME ZONE;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		ALTER TABLE manager_division_production_budgets
		DROP CONSTRAINT IF EXISTS chk_mdpb_workflow_status;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		ALTER TABLE manager_division_production_budgets
		ADD CONSTRAINT chk_mdpb_workflow_status CHECK (workflow_status IN ('DRAFT', 'REVIEW', 'APPROVED'));
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		ALTER TABLE manager_division_production_budgets
		DROP CONSTRAINT IF EXISTS fk_mdpb_override_approved_by;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		ALTER TABLE manager_division_production_budgets
		ADD CONSTRAINT fk_mdpb_override_approved_by
		FOREIGN KEY (override_approved_by) REFERENCES users(id) ON DELETE SET NULL;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_mdpb_workflow_status
		ON manager_division_production_budgets (workflow_status);
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000054 completed: manager division budget workflow columns added")
	return nil
}

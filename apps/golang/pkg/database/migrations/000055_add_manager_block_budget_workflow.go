package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000055AddManagerBlockBudgetWorkflow adds workflow status controls
// for manager block production budgets.
func Migration000055AddManagerBlockBudgetWorkflow(db *gorm.DB) error {
	log.Println("Running migration: 000055_add_manager_block_budget_workflow")

	if err := db.Exec(`
		ALTER TABLE manager_block_production_budgets
		ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(16) NOT NULL DEFAULT 'DRAFT';
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		ALTER TABLE manager_block_production_budgets
		DROP CONSTRAINT IF EXISTS chk_mbpb_workflow_status;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		ALTER TABLE manager_block_production_budgets
		ADD CONSTRAINT chk_mbpb_workflow_status CHECK (workflow_status IN ('DRAFT', 'REVIEW', 'APPROVED'));
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_mbpb_workflow_status
		ON manager_block_production_budgets (workflow_status);
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000055 completed: manager block budget workflow column added")
	return nil
}

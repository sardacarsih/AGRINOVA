package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000065CreateBlockTreatmentRequestWorkflow creates semester block treatment
// request workflow tables and management decision audit table for direct tariff updates.
func Migration000065CreateBlockTreatmentRequestWorkflow(db *gorm.DB) error {
	log.Println("Running migration: 000065_create_block_treatment_request_workflow")

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS block_treatment_change_requests (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL REFERENCES companies(id),
			semester VARCHAR(16) NOT NULL,
			status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
			notes TEXT,
			revision_no INTEGER NOT NULL DEFAULT 1,
			submitted_at TIMESTAMPTZ,
			reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
			reviewed_at TIMESTAMPTZ,
			approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
			approved_at TIMESTAMPTZ,
			rejected_reason TEXT,
			applied_by UUID REFERENCES users(id) ON DELETE SET NULL,
			applied_at TIMESTAMPTZ,
			created_by UUID NOT NULL REFERENCES users(id),
			updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT chk_block_treatment_change_requests_status
				CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'APPLIED', 'CANCELLED')),
			CONSTRAINT chk_block_treatment_change_requests_revision
				CHECK (revision_no > 0)
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_block_treatment_change_requests_revision
		ON block_treatment_change_requests (company_id, semester, created_by, revision_no);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_block_treatment_change_requests_status
		ON block_treatment_change_requests (status);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_block_treatment_change_requests_company_semester
		ON block_treatment_change_requests (company_id, semester);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_block_treatment_change_requests_created_by
		ON block_treatment_change_requests (created_by);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS block_treatment_change_request_items (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			request_id UUID NOT NULL REFERENCES block_treatment_change_requests(id) ON DELETE CASCADE,
			block_id UUID NOT NULL REFERENCES blocks(id),
			current_tarif_blok_id UUID,
			current_perlakuan VARCHAR(100),
			proposed_tarif_blok_id UUID NOT NULL,
			proposed_perlakuan VARCHAR(100),
			impact_summary TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_block_treatment_change_request_items_request_block
		ON block_treatment_change_request_items (request_id, block_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_block_treatment_change_request_items_block
		ON block_treatment_change_request_items (block_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_block_treatment_change_request_items_proposed_tarif
		ON block_treatment_change_request_items (proposed_tarif_blok_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS block_treatment_request_status_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			request_id UUID NOT NULL REFERENCES block_treatment_change_requests(id) ON DELETE CASCADE,
			from_status VARCHAR(32),
			to_status VARCHAR(32) NOT NULL,
			action VARCHAR(64) NOT NULL,
			notes TEXT,
			acted_by UUID REFERENCES users(id) ON DELETE SET NULL,
			acted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_block_treatment_request_status_logs_request
		ON block_treatment_request_status_logs (request_id, acted_at DESC);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS tariff_management_decisions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			entity_type VARCHAR(32) NOT NULL,
			entity_id UUID NOT NULL,
			action_type VARCHAR(16) NOT NULL,
			company_id UUID NOT NULL REFERENCES companies(id),
			decision_no VARCHAR(100) NOT NULL,
			decision_reason TEXT NOT NULL,
			effective_note TEXT NOT NULL,
			decided_by UUID NOT NULL REFERENCES users(id),
			decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			metadata JSONB,
			CONSTRAINT chk_tariff_management_decisions_action_type
				CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE'))
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_tariff_management_decisions_company
		ON tariff_management_decisions (company_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_tariff_management_decisions_entity
		ON tariff_management_decisions (entity_type, entity_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_tariff_management_decisions_decided_at
		ON tariff_management_decisions (decided_at DESC);
	`).Error; err != nil {
		return err
	}

	return nil
}

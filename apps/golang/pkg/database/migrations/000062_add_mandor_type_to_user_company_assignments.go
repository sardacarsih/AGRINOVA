package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000062AddMandorTypeToUserCompanyAssignments adds an explicit mandor subtype
// so the mobile app can branch between harvest and maintenance supervisors.
func Migration000062AddMandorTypeToUserCompanyAssignments(db *gorm.DB) error {
	log.Println("Running migration: 000062_add_mandor_type_to_user_company_assignments")

	if err := db.Exec(`
		ALTER TABLE user_company_assignments
		ADD COLUMN IF NOT EXISTS mandor_type VARCHAR(20);
	`).Error; err != nil {
		return err
	}

	// Existing mandor users currently operate through the harvest workflow,
	// so default legacy active assignments to PANEN until an explicit subtype is set.
	if err := db.Exec(`
		UPDATE user_company_assignments AS uca
		SET mandor_type = 'PANEN'
		FROM users AS u
		WHERE u.id = uca.user_id
		  AND u.role = 'MANDOR'
		  AND (uca.mandor_type IS NULL OR TRIM(uca.mandor_type) = '');
	`).Error; err != nil {
		return err
	}

	// Non-mandor assignments should never carry a mandor subtype.
	if err := db.Exec(`
		UPDATE user_company_assignments AS uca
		SET mandor_type = NULL
		FROM users AS u
		WHERE u.id = uca.user_id
		  AND u.role <> 'MANDOR'
		  AND uca.mandor_type IS NOT NULL;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		ALTER TABLE user_company_assignments
		DROP CONSTRAINT IF EXISTS chk_user_company_assignments_mandor_type;

		ALTER TABLE user_company_assignments
		ADD CONSTRAINT chk_user_company_assignments_mandor_type
		CHECK (
			mandor_type IS NULL OR mandor_type IN ('PANEN', 'PERAWATAN')
		);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_user_company_assignments_mandor_type
		ON user_company_assignments (mandor_type)
		WHERE mandor_type IS NOT NULL;
	`).Error; err != nil {
		return err
	}

	return nil
}

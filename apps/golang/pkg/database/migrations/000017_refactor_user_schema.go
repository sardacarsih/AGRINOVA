package migrations

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// Migration000017RefactorUserSchema moves name/phone from users to assignments and removes company_id
type Migration000017RefactorUserSchema struct{}

func (m *Migration000017RefactorUserSchema) Version() string {
	return "000017"
}

func (m *Migration000017RefactorUserSchema) Name() string {
	return "refactor_user_schema"
}

func (m *Migration000017RefactorUserSchema) Up(ctx context.Context, db *gorm.DB) error {
	// 1. Add columns to user_company_assignments
	if err := db.WithContext(ctx).Exec(`
		ALTER TABLE user_company_assignments 
		ADD COLUMN IF NOT EXISTS name VARCHAR(255),
		ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
	`).Error; err != nil {
		return fmt.Errorf("failed to add columns to user_company_assignments: %w", err)
	}

	// 2. Migrate data from users to assignments
	// specific case: populate name/phone in assignments from the user table
	// Works with either modern (name/phone) or legacy (nama/no_telpon) schemas.
	if err := db.WithContext(ctx).Exec(`
		DO $$
		DECLARE
			has_name BOOLEAN;
			has_phone BOOLEAN;
			has_nama BOOLEAN;
			has_no_telpon BOOLEAN;
			name_expr TEXT;
			phone_expr TEXT;
		BEGIN
			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'users' AND column_name = 'name'
			) INTO has_name;

			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'users' AND column_name = 'phone'
			) INTO has_phone;

			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'users' AND column_name = 'nama'
			) INTO has_nama;

			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'users' AND column_name = 'no_telpon'
			) INTO has_no_telpon;

			name_expr := CASE
				WHEN has_name THEN 'u.name'
				WHEN has_nama THEN 'u.nama'
				ELSE 'NULL'
			END;

			phone_expr := CASE
				WHEN has_phone THEN 'u.phone'
				WHEN has_no_telpon THEN 'u.no_telpon'
				ELSE 'NULL'
			END;

			-- On repeated startups this migration can be called again from legacy migration flow.
			-- Keep existing assignment profile data when source columns no longer exist.
			IF has_name OR has_phone OR has_nama OR has_no_telpon THEN
				EXECUTE format(
					'UPDATE user_company_assignments uca
					 SET name = COALESCE(%s, uca.name),
					     phone = COALESCE(%s, uca.phone)
					 FROM users u
					 WHERE uca.user_id = u.id',
					name_expr,
					phone_expr
				);
			END IF;
		END $$;
	`).Error; err != nil {
		return fmt.Errorf("failed to migrate user data to assignments: %w", err)
	}

	// 3. Make name not null after migration (optional, but good for integrity if name is required)
	// We only do this if we are sure all assignments got a name.
	// For saftey, we might skip NOT NULL for now or set a default.

	// 4. Drop columns from users
	// Note: We are dropping name, phone, and company_id
	// We need to check if distinct names exist that are lost?
	// The migration above copies to ALL assignments of that user.
	if err := db.WithContext(ctx).Exec(`
		ALTER TABLE users
		DROP COLUMN IF EXISTS company_id,
		DROP COLUMN IF EXISTS name,
		DROP COLUMN IF EXISTS phone,
		DROP COLUMN IF EXISTS nama,     -- covering potential alias mentioned by user
		DROP COLUMN IF EXISTS no_telpon; -- covering potential alias mentioned by user
	`).Error; err != nil {
		return fmt.Errorf("failed to drop columns from users: %w", err)
	}

	return nil
}

func (m *Migration000017RefactorUserSchema) Down(ctx context.Context, db *gorm.DB) error {
	// 1. Add columns back to users
	if err := db.WithContext(ctx).Exec(`
		ALTER TABLE users 
		ADD COLUMN IF NOT EXISTS name VARCHAR(255),
		ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
		ADD COLUMN IF NOT EXISTS company_id UUID;
	`).Error; err != nil {
		return fmt.Errorf("failed to add columns back to users: %w", err)
	}

	// 2. Reverse migration (Best effort: take from latest active assignment)
	if err := db.WithContext(ctx).Exec(`
		UPDATE users u
		SET 
			name = uca.name,
			phone = uca.phone,
			company_id = uca.company_id
		FROM user_company_assignments uca
		WHERE u.id = uca.user_id AND uca.is_active = true
		AND uca.updated_at = (
			SELECT MAX(updated_at) 
			FROM user_company_assignments 
			WHERE user_id = u.id AND is_active = true
		);
	`).Error; err != nil {
		return fmt.Errorf("failed to reverse migrate user data: %w", err)
	}

	// 3. Drop columns from user_company_assignments
	if err := db.WithContext(ctx).Exec(`
		ALTER TABLE user_company_assignments
		DROP COLUMN IF EXISTS name,
		DROP COLUMN IF EXISTS phone;
	`).Error; err != nil {
		return fmt.Errorf("failed to drop columns from user_company_assignments: %w", err)
	}

	return nil
}

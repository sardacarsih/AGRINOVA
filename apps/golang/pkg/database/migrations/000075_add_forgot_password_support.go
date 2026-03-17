package migrations

import (
	"fmt"
	"log"

	"gorm.io/gorm"
)

// Migration000075AddForgotPasswordSupport adds the schema required for forgot-password flow.
func Migration000075AddForgotPasswordSupport(db *gorm.DB) error {
	log.Println("Running migration: 000075_add_forgot_password_support")

	tx := db.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	if err := tx.Exec(`
		ALTER TABLE users
		ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE;
	`).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("migration 000075 failed to add users.email_verified: %w", err)
	}

	if err := tx.Exec(`
		CREATE TABLE IF NOT EXISTS password_resets (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL,
			token_hash CHAR(64) NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL,
			used_at TIMESTAMPTZ NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		);
	`).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("migration 000075 failed to create password_resets table: %w", err)
	}

	if err := tx.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_password_resets_token_hash
		ON password_resets(token_hash);
	`).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("migration 000075 failed to create unique token_hash index: %w", err)
	}

	if err := tx.Exec(`
		CREATE INDEX IF NOT EXISTS idx_password_resets_user_id
		ON password_resets(user_id);
	`).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("migration 000075 failed to create user_id index: %w", err)
	}

	if err := tx.Exec(`
		CREATE INDEX IF NOT EXISTS idx_password_resets_lookup_valid
		ON password_resets(token_hash, used_at, expires_at);
	`).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("migration 000075 failed to create lookup_valid index: %w", err)
	}

	if err := tx.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_users_lower_email
		ON users ((lower(email)))
		WHERE email IS NOT NULL;
	`).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("migration 000075 failed to create users lower(email) unique partial index: %w", err)
	}

	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("migration 000075 commit failed: %w", err)
	}

	log.Println("Migration 000075 completed successfully")
	return nil
}

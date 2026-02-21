package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000020AddUserAvatarColumn adds avatar_url column to users table.
func Migration000020AddUserAvatarColumn(db *gorm.DB) error {
	log.Println("Running migration: 000020_add_user_avatar_column")

	if err := db.Exec(`
		ALTER TABLE users
		ADD COLUMN IF NOT EXISTS avatar_url TEXT;
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000020 completed: users.avatar_url is available")
	return nil
}

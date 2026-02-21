package database

import (
	"fmt"
	"log"

	authmodels "agrinovagraphql/server/internal/auth/models"

	"gorm.io/gorm"
)

// APIKeysMigration handles the creation of API key related tables
type APIKeysMigration struct{}

func (m *APIKeysMigration) Migrate(db *gorm.DB) error {
	log.Println("Running migration: 0004_api_keys")

	// AutoMigrate the new models
	if err := db.AutoMigrate(
		&authmodels.APIKey{},
		&authmodels.APIKeyLog{},
	); err != nil {
		return fmt.Errorf("failed to auto-migrate API key models: %w", err)
	}

	// Add specific indexes if GORM didn't create them (GORM usually handles basic indexes defined in tags)
	// But for complex ones or specific partial indexes, we might need raw SQL.
	// The struct tags `index` should cover most needs.

	return nil
}

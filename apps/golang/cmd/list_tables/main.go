package main

import (
	"log"

	"agrinovagraphql/server/pkg/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Connect to database
	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// List all tables
	type TableInfo struct {
		TableName string
	}
	var tables []TableInfo

	query := `
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = 'public' 
		ORDER BY table_name
	`

	if err := db.Raw(query).Scan(&tables).Error; err != nil {
		log.Fatalf("Error listing tables: %v", err)
	}

	log.Println("Available tables:")
	for _, t := range tables {
		log.Printf("  - %s", t.TableName)
	}
}

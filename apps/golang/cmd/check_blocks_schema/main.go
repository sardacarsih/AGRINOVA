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

	// List columns in employees table
	type ColumnInfo struct {
		ColumnName string
		DataType   string
	}
	var columns []ColumnInfo

	query := `
		SELECT column_name, data_type 
		FROM information_schema.columns 
		WHERE table_name = 'employees' 
		ORDER BY ordinal_position
	`

	if err := db.Raw(query).Scan(&columns).Error; err != nil {
		log.Fatalf("Error listing columns: %v", err)
	}

	log.Println("Columns in 'employees' table:")
	for _, c := range columns {
		log.Printf("  - %s (%s)", c.ColumnName, c.DataType)
	}
}

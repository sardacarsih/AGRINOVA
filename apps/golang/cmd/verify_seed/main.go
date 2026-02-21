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

	// List all employees
	type Employee struct {
		ID   string
		Name string
		Nik  string // map from nik column
	}
	var employees []Employee
	if err := db.Table("employees").Find(&employees).Error; err != nil {
		log.Printf("Error listing employees: %v", err)
	} else {
		log.Printf("Total employees in table: %d", len(employees))
		for _, e := range employees {
			log.Printf(" - %s (%s)", e.Name, e.Nik)
		}
	}

	// List all blocks
	type Block struct {
		ID        string
		Name      string
		BlockCode string `gorm:"column:block_code"`
	}
	var blocks []Block
	if err := db.Table("blocks").Select("id, name, block_code").Find(&blocks).Error; err != nil {
		log.Printf("Error listing blocks: %v", err)
	}

	log.Printf("Found blocks:")
	for _, b := range blocks {
		log.Printf(" - %s (Code: %s)", b.Name, b.BlockCode)
	}
}

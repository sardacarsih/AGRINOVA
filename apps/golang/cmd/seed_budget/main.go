package main

import (
	"log"

	"agrinovagraphql/server/pkg/config"
	"agrinovagraphql/server/pkg/database/migrations"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	log.Println("Running migration 000061: seed dummy budget data...")
	if err := migrations.Migration000061SeedDummyBudgetData(db); err != nil {
		log.Fatalf("migration failed: %v", err)
	}

	log.Println("Updating all budgets to 700 ton per division...")
	result := db.Exec(`
		UPDATE manager_division_production_budgets
		SET target_ton = 700, planned_cost = 700 * 1500000, updated_at = NOW()
	`)
	if result.Error != nil {
		log.Fatalf("update failed: %v", result.Error)
	}
	log.Printf("Updated %d budget records to 700 ton", result.RowsAffected)

	log.Println("Done!")
}

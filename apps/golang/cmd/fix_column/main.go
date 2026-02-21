package main

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := "host=localhost user=agrinova password=itBOSS dbname=agrinova_go port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Connected to database successfully")

	// Add id_card_number column if not exists
	sql := `
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='id_card_number') THEN
				ALTER TABLE gate_guest_logs ADD COLUMN id_card_number VARCHAR(50);
				RAISE NOTICE 'Column id_card_number added successfully';
			ELSE
				RAISE NOTICE 'Column id_card_number already exists';
			END IF;
		END $$;
	`

	if err := db.Exec(sql).Error; err != nil {
		log.Fatalf("Failed to add column: %v", err)
	}

	// Verify column exists
	var count int64
	db.Raw("SELECT COUNT(*) FROM information_schema.columns WHERE table_name='gate_guest_logs' AND column_name='id_card_number'").Scan(&count)

	if count > 0 {
		fmt.Println("SUCCESS: Column id_card_number exists in gate_guest_logs table")
	} else {
		fmt.Println("ERROR: Column id_card_number was not created")
	}
}

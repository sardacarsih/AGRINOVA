package main

import (
	"log"

	"agrinovagraphql/server/pkg/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}

	// Add the column manually
	err = db.Exec("ALTER TABLE companies ADD COLUMN IF NOT EXISTS kode_perusahaan text").Error
	if err != nil {
		log.Fatalf("Failed to add column: %v", err)
	}
	log.Println("Successfully added kode_perusahaan column")

	// Update using IDs to be sure
	// PT Agrinova Sawit
	res := db.Exec("UPDATE companies SET kode_perusahaan = 'ASU' WHERE id = '01234567-89ab-cdef-0123-456789abcdef'")
	if res.Error != nil {
		log.Printf("Failed to update ASU: %v", res.Error)
	} else {
		log.Printf("Updated ASU: %d rows", res.RowsAffected)
	}

	// PT Sawit Nusantara
	res = db.Exec("UPDATE companies SET kode_perusahaan = 'PSN' WHERE id = '12345678-9abc-def0-1234-56789abcdef0'")
	if res.Error != nil {
		log.Printf("Failed to update PSN: %v", res.Error)
	} else {
		log.Printf("Updated PSN: %d rows", res.RowsAffected)
	}

	// PT Kelapa Sawit Riau
	res = db.Exec("UPDATE companies SET kode_perusahaan = 'KSR' WHERE id = '23456789-abcd-ef01-2345-6789abcdef01'")
	if res.Error != nil {
		log.Printf("Failed to update KSR: %v", res.Error)
	} else {
		log.Printf("Updated KSR: %d rows", res.RowsAffected)
	}

	log.Println("Done")
}

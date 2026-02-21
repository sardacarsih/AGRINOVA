package main

import (
	"log"
	"time"

	empmodels "agrinovagraphql/server/internal/employee/models"
	"agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/pkg/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	log.Println("Agrinova Harvest Sample Data Seeder")
	log.Println("====================================")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Connect to database
	log.Printf("Connecting to database: %s", cfg.Database.Host)
	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Get underlying SQL DB for ping test
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get underlying SQL DB: %v", err)
	}
	defer sqlDB.Close()

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("Database connection established successfully")

	// Ensure tables exist and schema is correct
	log.Println("Migrating schema for Employee and Block...")
	if err := db.AutoMigrate(&empmodels.Employee{}, &master.Block{}); err != nil {
		log.Fatalf("Failed to duplicate schema: %v", err)
	}

	// Use the Division A ID from the seeded data
	divisionAID := "78901234-f012-3456-7890-bcdef0123456" // Divisi A from seed.go
	companyID := "01234567-89ab-cdef-0123-456789abcdef"   // PT Agrinova Sawit Utama
	log.Printf("Using Divisi A ID: %s", divisionAID)
	log.Printf("Using Company ID: %s", companyID)

	// Seed 5 Employees (Karyawan)
	log.Println("\nSeeding 5 employees...")
	employees := []empmodels.Employee{
		{
			ID:        "e0000000-0000-0000-0000-000000000001",
			NIK:       "KRY001",
			Name:      "Budi Santoso",
			Role:      "Pemanen",
			CompanyID: companyID,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:        "e0000000-0000-0000-0000-000000000002",
			NIK:       "KRY002",
			Name:      "Ahmad Wijaya",
			Role:      "Pemanen",
			CompanyID: companyID,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:        "e0000000-0000-0000-0000-000000000003",
			NIK:       "KRY003",
			Name:      "Siti Nurhaliza",
			Role:      "Pemanen",
			CompanyID: companyID,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:        "e0000000-0000-0000-0000-000000000004",
			NIK:       "KRY004",
			Name:      "Joko Susilo",
			Role:      "Pemanen",
			CompanyID: companyID,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:        "e0000000-0000-0000-0000-000000000005",
			NIK:       "KRY005",
			Name:      "Dewi Lestari",
			Role:      "Pemanen",
			CompanyID: companyID,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	for _, emp := range employees {
		var existing empmodels.Employee
		if err := db.Where("nik = ?", emp.NIK).First(&existing).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				if err := db.Create(&emp).Error; err != nil {
					log.Printf("Warning: failed to create employee %s: %v", emp.Name, err)
					continue
				}
				log.Printf("✓ Created employee: %s (NIK: %s)", emp.Name, emp.NIK)
			} else {
				log.Printf("Warning: error checking employee %s: %v", emp.NIK, err)
			}
		} else {
			log.Printf("  Employee already exists: %s (NIK: %s)", emp.Name, emp.NIK)
		}
	}

	// Seed 5 Blocks
	log.Println("\nSeeding 5 blocks...")
	cropType := "Kelapa Sawit"
	plantingYear2015 := int32(2015)
	plantingYear2016 := int32(2016)
	plantingYear2017 := int32(2017)
	luasHa1 := 25.5
	luasHa2 := 30.0
	luasHa3 := 28.3
	luasHa4 := 22.7
	luasHa5 := 27.2

	blocks := []master.Block{
		{
			ID:           "blk00000-0000-0000-0000-000000000001",
			BlockCode:    "A01",
			Name:         "Blok A-01",
			LuasHa:       &luasHa1,
			CropType:     &cropType,
			PlantingYear: &plantingYear2015,
			DivisionID:   divisionAID,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           "blk00000-0000-0000-0000-000000000002",
			BlockCode:    "A02",
			Name:         "Blok A-02",
			LuasHa:       &luasHa2,
			CropType:     &cropType,
			PlantingYear: &plantingYear2015,
			DivisionID:   divisionAID,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           "blk00000-0000-0000-0000-000000000003",
			BlockCode:    "A03",
			Name:         "Blok A-03",
			LuasHa:       &luasHa3,
			CropType:     &cropType,
			PlantingYear: &plantingYear2016,
			DivisionID:   divisionAID,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           "blk00000-0000-0000-0000-000000000004",
			BlockCode:    "A04",
			Name:         "Blok A-04",
			LuasHa:       &luasHa4,
			CropType:     &cropType,
			PlantingYear: &plantingYear2016,
			DivisionID:   divisionAID,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           "blk00000-0000-0000-0000-000000000005",
			BlockCode:    "A05",
			Name:         "Blok A-05",
			LuasHa:       &luasHa5,
			CropType:     &cropType,
			PlantingYear: &plantingYear2017,
			DivisionID:   divisionAID,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}

	for _, blk := range blocks {
		var existing master.Block
		if err := db.Where("block_code = ? AND division_id = ?", blk.BlockCode, blk.DivisionID).First(&existing).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				if err := db.Create(&blk).Error; err != nil {
					log.Printf("Warning: failed to create block %s: %v", blk.Name, err)
					continue
				}
				log.Printf("✓ Created block: %s (Code: %s, %.1f ha)", blk.Name, blk.BlockCode, *blk.LuasHa)
			} else {
				log.Printf("Warning: error checking block %s: %v", blk.BlockCode, err)
			}
		} else {
			log.Printf("  Block already exists: %s (Code: %s)", blk.Name, blk.BlockCode)
		}
	}

	// Print summary
	log.Println("")
	log.Println("🎉 Harvest sample data seeding completed successfully!")
	log.Println("")
	log.Println("Summary:")
	log.Println("  ✓ 5 Employees (Karyawan) created")
	log.Println("  ✓ 5 Blocks created in Divisi A")
	log.Println("")
	log.Println("Sample Employees (NIK):")
	log.Println("  - KRY001: Budi Santoso")
	log.Println("  - KRY002: Ahmad Wijaya")
	log.Println("  - KRY003: Siti Nurhaliza")
	log.Println("  - KRY004: Joko Susilo")
	log.Println("  - KRY005: Dewi Lestari")
	log.Println("")
	log.Println("Sample Blocks:")
	log.Println("  - A01: Blok A-01 (25.5 ha)")
	log.Println("  - A02: Blok A-02 (30.0 ha)")
	log.Println("  - A03: Blok A-03 (28.3 ha)")
	log.Println("  - A04: Blok A-04 (22.7 ha)")
	log.Println("  - A05: Blok A-05 (27.2 ha)")
	log.Println("")
	log.Println("These blocks and employees are now available for harvest input testing!")
	log.Println("You can use them with the Mandor role to create harvest records.")
}

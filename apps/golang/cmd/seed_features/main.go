package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"agrinovagraphql/server/pkg/database"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: Could not load .env file")
	}

	// Get database URL
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:password@localhost:5432/agrinova_go?sslmode=disable"
	}

	// Connect to database
	db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Get underlying SQL DB
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get underlying SQL DB: %v", err)
	}
	defer sqlDB.Close()

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("✅ Database connection established")

	// Create RBAC schema directly
	if err := database.CreateRBACSchema(db); err != nil {
		log.Fatalf("❌ Failed to create RBAC schema: %v", err)
	}

	log.Println("✅ RBAC schema created successfully")

	// Seed RBAC data directly
	if err := database.SeedRBACData(db); err != nil {
		log.Fatalf("❌ Failed to seed RBAC data: %v", err)
	}

	log.Println("✅ RBAC data seeded successfully")
}
package main

import (
	"fmt"
	"log"
	"strconv"

	"agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/pkg/config"
	"agrinovagraphql/server/pkg/database"

	"gorm.io/gorm/logger"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	dbConfig := &database.DatabaseConfig{
		Host:     cfg.Database.Host,
		Port:     strconv.Itoa(cfg.Database.Port),
		User:     cfg.Database.User,
		Password: cfg.Database.Password,
		DBName:   cfg.Database.Name,
		SSLMode:  "disable",
	}

	_, err = database.Connect(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	db := database.GetDB()
	db.Logger = db.Logger.LogMode(logger.Info) // Enable SQL logging

	fmt.Println("🔄 Attempting to migrate LogoutTransaction ONLY...")
	if err := db.AutoMigrate(&models.LogoutTransaction{}); err != nil {
		log.Printf("❌ Migration failed: %v", err)
	} else {
		fmt.Println("✅ Migration function completed.")
	}

	// Check if table exists
	var exists bool
	query := "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'logout_transactions')"
	if err := db.Raw(query).Scan(&exists).Error; err != nil {
		log.Fatalf("Failed to check table existence: %v", err)
	}

	if exists {
		fmt.Println("✅ Table 'logout_transactions' exists.")
	} else {
		fmt.Println("❌ Table 'logout_transactions' DOES NOT exist.")
	}
}

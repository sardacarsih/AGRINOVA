package main

import (
	"log"
	"strconv"

	"agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/pkg/config"
	"agrinovagraphql/server/pkg/database"
)

func main() {
	log.Println("🚀 FCM Device Token Migration Tool")
	log.Println("==================================")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("❌ Failed to load configuration: %v", err)
	}

	// Connect to database
	dbConfig := &database.DatabaseConfig{
		Host:     cfg.Database.Host,
		Port:     strconv.Itoa(cfg.Database.Port),
		User:     cfg.Database.User,
		Password: cfg.Database.Password,
		DBName:   cfg.Database.Name,
		SSLMode:  "disable",
	}

	log.Println("🔌 Connecting to database...")
	_, err = database.Connect(dbConfig)
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}

	log.Println("✅ Database connection established")

	db := database.GetDB()

	// Migrate only UserDeviceToken
	log.Println("📦 Creating user_device_tokens table...")
	if err := db.AutoMigrate(&models.UserDeviceToken{}); err != nil {
		log.Fatalf("❌ Migration failed: %v", err)
	}

	// Create additional indexes
	log.Println("📊 Creating indexes...")
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_device_token_user ON user_device_tokens(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_device_token_active ON user_device_tokens(user_id, is_active) WHERE deleted_at IS NULL",
	}

	for _, indexSQL := range indexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			log.Printf("Warning: Index creation: %v", err)
		}
	}

	log.Println("✅ FCM Device Token table migration completed successfully!")
}

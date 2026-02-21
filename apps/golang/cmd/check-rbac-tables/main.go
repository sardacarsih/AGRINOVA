package main

import (
	"fmt"
	"log"
	"os"

	"agrinovagraphql/server/pkg/database"
)

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	fmt.Println("🔍 Checking RBAC tables structure...")

	// Load database configuration
	config := &database.DatabaseConfig{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "5432"),
		User:     getEnv("DB_USER", "postgres"),
		Password: getEnv("DB_PASSWORD", "postgres"),
		DBName:   getEnv("DB_NAME", "agrinova_go"),
		SSLMode:  getEnv("DB_SSLMODE", "disable"),
	}

	// Get database connection
	_, err := database.Connect(config)
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}

	// Get raw GORM DB instance
	db := database.GetDB()

	fmt.Println("✅ Connected to database")

	// Check user_permission_assignments table structure
	fmt.Println("\n📋 Checking user_permission_assignments table...")
	var columns []struct {
		ColumnName    string `db:"column_name"`
		DataType      string `db:"data_type"`
		IsNullable    string `db:"is_nullable"`
		ColumnDefault string `db:"column_default"`
	}

	if err := db.Raw(`
		SELECT column_name, data_type, is_nullable, column_default
		FROM information_schema.columns
		WHERE table_name = 'user_permission_assignments'
		ORDER BY ordinal_position
	`).Scan(&columns).Error; err != nil {
		log.Printf("⚠️ Warning: Failed to get user_permission_assignments structure: %v", err)
	} else {
		fmt.Println("📋 Current user_permission_assignments table structure:")
		hasExpiresAt := false
		for _, col := range columns {
			fmt.Printf("  - %s: %s (nullable: %s, default: %s)\n", col.ColumnName, col.DataType, col.IsNullable, col.ColumnDefault)
			if col.ColumnName == "expires_at" {
				hasExpiresAt = true
			}
		}

		if !hasExpiresAt {
			fmt.Println("❌ Missing expires_at column!")
		} else {
			fmt.Println("✅ expires_at column exists")
		}
	}

	// Also check role_features table as it might be related
	fmt.Println("\n📋 Checking role_features table...")
	if err := db.Raw(`
		SELECT column_name, data_type, is_nullable, column_default
		FROM information_schema.columns
		WHERE table_name = 'role_features'
		ORDER BY ordinal_position
	`).Scan(&columns).Error; err != nil {
		log.Printf("⚠️ Warning: Failed to get role_features structure: %v", err)
	} else {
		fmt.Println("📋 Current role_features table structure:")
		hasExpiresAt := false
		for _, col := range columns {
			fmt.Printf("  - %s: %s (nullable: %s, default: %s)\n", col.ColumnName, col.DataType, col.IsNullable, col.ColumnDefault)
			if col.ColumnName == "expires_at" {
				hasExpiresAt = true
			}
		}

		if !hasExpiresAt {
			fmt.Println("❌ Missing expires_at column!")
		} else {
			fmt.Println("✅ expires_at column exists")
		}
	}

	fmt.Println("\n🎉 Table structure check completed!")
}
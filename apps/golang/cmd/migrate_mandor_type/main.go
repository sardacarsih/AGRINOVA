package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"agrinovagraphql/server/pkg/database/migrations"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	log.Println("Agrinova migration runner: 000062_add_mandor_type_to_user_company_assignments")

	loadLocalEnv()

	dsn, err := resolveDSN()
	if err != nil {
		log.Fatalf("Failed to resolve database DSN: %v", err)
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	hasColumnBefore := db.Migrator().HasColumn("user_company_assignments", "mandor_type")
	log.Printf("Column check before migration: mandor_type exists = %v", hasColumnBefore)

	if err := migrations.Migration000062AddMandorTypeToUserCompanyAssignments(db); err != nil {
		log.Fatalf("Migration 000062 failed: %v", err)
	}

	hasColumnAfter := db.Migrator().HasColumn("user_company_assignments", "mandor_type")
	if !hasColumnAfter {
		log.Fatal("Migration finished but column mandor_type is still missing")
	}

	log.Println("Migration 000062 completed successfully")
}

func loadLocalEnv() {
	candidates := []string{
		".env",
		filepath.Join("..", ".env"),
		filepath.Join("..", "..", ".env"),
	}

	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			if err := godotenv.Load(candidate); err == nil {
				log.Printf("Loaded environment from %s", candidate)
				return
			}
		}
	}

	log.Println("No local .env file loaded, using current process environment only")
}

func resolveDSN() (string, error) {
	if rawURL := strings.TrimSpace(os.Getenv("DATABASE_URL")); rawURL != "" {
		return strings.Trim(rawURL, `"`), nil
	}

	dbName := strings.TrimSpace(os.Getenv("POSTGRES_DB"))
	dbUser := strings.TrimSpace(os.Getenv("POSTGRES_USER"))
	dbPassword := strings.TrimSpace(os.Getenv("POSTGRES_PASSWORD"))
	dbHost := strings.TrimSpace(os.Getenv("POSTGRES_HOST"))
	dbPort := strings.TrimSpace(os.Getenv("POSTGRES_PORT"))

	if dbName == "" {
		dbName = strings.TrimSpace(os.Getenv("AGRINOVA_DATABASE_NAME"))
	}
	if dbUser == "" {
		dbUser = strings.TrimSpace(os.Getenv("AGRINOVA_DATABASE_USER"))
	}
	if dbPassword == "" {
		dbPassword = strings.TrimSpace(os.Getenv("AGRINOVA_DATABASE_PASSWORD"))
	}
	if dbHost == "" {
		dbHost = strings.TrimSpace(os.Getenv("AGRINOVA_DATABASE_HOST"))
	}
	if dbPort == "" {
		dbPort = strings.TrimSpace(os.Getenv("AGRINOVA_DATABASE_PORT"))
	}

	if dbHost == "" {
		dbHost = "localhost"
	}
	if dbPort == "" {
		dbPort = "5432"
	}

	if dbName == "" || dbUser == "" {
		return "", fmt.Errorf("DATABASE_URL or POSTGRES_DB/POSTGRES_USER must be set")
	}

	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost,
		dbPort,
		dbUser,
		dbPassword,
		dbName,
	), nil
}

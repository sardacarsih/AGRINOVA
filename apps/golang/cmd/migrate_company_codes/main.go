package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Company struct {
	ID          string `gorm:"column:id;primaryKey"`
	CompanyCode string `gorm:"column:company_code"`
	Name        string `gorm:"column:name"`
	Status      string `gorm:"column:status"`
}

func (Company) TableName() string {
	return "companies"
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	host := getEnvOrDefault("DB_HOST", "localhost")
	port := getEnvOrDefault("DB_PORT", "5432")
	user := getEnvOrDefault("DB_USER", "agrinova")
	password := getEnvOrDefault("DB_PASSWORD", "postgres")
	dbname := getEnvOrDefault("DB_NAME", "agrinova_go")
	sslmode := getEnvOrDefault("DB_SSLMODE", "disable")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Jakarta",
		host, user, password, dbname, port, sslmode)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	ctx := context.Background()

	fmt.Println()
	fmt.Println("=== Company Code Migration Tool ===")
	fmt.Printf("Database: %s@%s:%s/%s\n\n", user, host, port, dbname)

	var companies []Company
	if err := db.WithContext(ctx).Order("id ASC").Find(&companies).Error; err != nil {
		log.Fatalf("Failed to query companies: %v", err)
	}

	fmt.Printf("Total companies found: %d\n\n", len(companies))

	emptyCodeCount := 0
	companiesNeedingCodes := make([]Company, 0)
	for _, company := range companies {
		if company.CompanyCode == "" {
			emptyCodeCount++
			companiesNeedingCodes = append(companiesNeedingCodes, company)
		}
	}

	if emptyCodeCount == 0 {
		fmt.Println("All companies already have codes")
		fmt.Println()
		fmt.Println("Current companies:")
		printCompanies(companies)
		return
	}

	fmt.Printf("Found %d companies without codes:\n\n", emptyCodeCount)
	for i, company := range companiesNeedingCodes {
		fmt.Printf("  %d. %s (ID: %s)\n", i+1, company.Name, company.ID)
	}

	fmt.Println()
	fmt.Printf("Generating codes for %d companies...\n\n", emptyCodeCount)

	codeCounter := 1
	for i := range companiesNeedingCodes {
		newCode := fmt.Sprintf("COMP-%03d", codeCounter)
		result := db.WithContext(ctx).
			Model(&Company{}).
			Where("id = ?", companiesNeedingCodes[i].ID).
			Update("company_code", newCode)

		if result.Error != nil {
			log.Printf("Failed to update company %s: %v", companiesNeedingCodes[i].Name, result.Error)
			continue
		}

		fmt.Printf("  Updated '%s' with code: %s\n", companiesNeedingCodes[i].Name, newCode)
		companiesNeedingCodes[i].CompanyCode = newCode
		codeCounter++
	}

	fmt.Println()
	fmt.Println("Verifying migration...")
	fmt.Println()

	var updatedCompanies []Company
	if err := db.WithContext(ctx).Order("id ASC").Find(&updatedCompanies).Error; err != nil {
		log.Fatalf("Failed to verify companies: %v", err)
	}

	stillEmpty := 0
	for _, company := range updatedCompanies {
		if company.CompanyCode == "" {
			stillEmpty++
		}
	}

	if stillEmpty > 0 {
		fmt.Printf("Warning: %d companies still have empty codes\n", stillEmpty)
	} else {
		fmt.Println("Migration successful. All companies now have codes.")
		fmt.Println("Updated companies:")
		printCompanies(updatedCompanies)
	}

	fmt.Println()
	fmt.Println("=== Migration Complete ===")
}

func printCompanies(companies []Company) {
	fmt.Printf("\n%-12s %-50s %-20s\n", "Code", "Name", "Status")
	fmt.Println("--------------------------------------------------------------------------------")
	for _, company := range companies {
		codeDisplay := company.CompanyCode
		if codeDisplay == "" {
			codeDisplay = "<EMPTY>"
		}
		fmt.Printf("%-12s %-50s %-20s\n", codeDisplay, truncate(company.Name, 50), company.Status)
	}
	fmt.Println()
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

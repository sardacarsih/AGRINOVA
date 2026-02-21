package main

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	fmt.Println("=== Create Sample Users Script ===")
	fmt.Println("Creating TIMBANGAN and GRADING sample users")
	fmt.Println()

	// Get database URL from environment
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:password@localhost:5432/agrinova_dev?sslmode=disable"
	}

	// Connect to database
	sqlDB, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}

	fmt.Println("✅ Connected to database successfully")

	// Check if sample users already exist
	var timbanganCount, gradingCount int64
	sqlDB.Raw("SELECT COUNT(*) FROM users WHERE username = 'timbangan'").Scan(&timbanganCount)
	sqlDB.Raw("SELECT COUNT(*) FROM users WHERE username = 'grading'").Scan(&gradingCount)

	fmt.Printf("Current sample users:\n")
	fmt.Printf("  timbangan: %d\n", timbanganCount)
	fmt.Printf("  grading: %d\n", gradingCount)

	if timbanganCount > 0 && gradingCount > 0 {
		fmt.Println("✅ Sample users already exist")
		return
	}

	// Get a company ID
	var companyID string
	if err := sqlDB.Raw("SELECT id FROM companies LIMIT 1").Scan(&companyID).Error; err != nil {
		log.Fatalf("❌ No companies found in database: %v", err)
	}

	fmt.Printf("Using company ID: %s\n", companyID)

	// Password hash for "admin123"
	passwordHash := "$2a$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ"

	// Create TIMBANGAN user if doesn't exist
	if timbanganCount == 0 {
		fmt.Println("Creating TIMBANGAN user...")

		if err := sqlDB.Exec(`
			INSERT INTO users (
				id, username, email, full_name, role, company_id, employee_id,
				password_hash, created_at, updated_at
			) VALUES (
				gen_random_uuid(),
				'timbangan',
				'timbangan@agrinova.com',
				'Timbangan Operator',
				'TIMBANGAN',
				?,
				'TBG001',
				?,
				NOW(),
				NOW()
			)
		`, companyID, passwordHash).Error; err != nil {
			log.Printf("❌ Failed to create TIMBANGAN user: %v", err)
		} else {
			fmt.Println("✅ Created TIMBANGAN user (username: timbangan, password: admin123)")
		}
	}

	// Create GRADING user if doesn't exist
	if gradingCount == 0 {
		fmt.Println("Creating GRADING user...")

		if err := sqlDB.Exec(`
			INSERT INTO users (
				id, username, email, full_name, role, company_id, employee_id,
				password_hash, created_at, updated_at
			) VALUES (
				gen_random_uuid(),
				'grading',
				'grading@agrinova.com',
				'Grading Staff',
				'GRADING',
				?,
				'GRD001',
				?,
				NOW(),
				NOW()
			)
		`, companyID, passwordHash).Error; err != nil {
			log.Printf("❌ Failed to create GRADING user: %v", err)
		} else {
			fmt.Println("✅ Created GRADING user (username: grading, password: admin123)")
		}
	}

	// Verify creation
	fmt.Println("\n=== Verification ===")

	var finalRoles []struct {
		Role  string
		Count int64
	}

	if err := sqlDB.Raw(`
		SELECT role, COUNT(*) as count
		FROM users
		WHERE role IN ('TIMBANGAN', 'GRADING')
		GROUP BY role
		ORDER BY role
	`).Scan(&finalRoles).Error; err != nil {
		log.Printf("Warning: Could not verify roles: %v", err)
	} else {
		for _, fr := range finalRoles {
			fmt.Printf("  %s: %d users\n", fr.Role, fr.Count)
		}
	}

	fmt.Println("\n🎉 Sample user creation completed!")
	fmt.Println("\n=== Login Credentials ===")
	fmt.Println("TIMBANGAN User:")
	fmt.Println("  Username: timbangan")
	fmt.Println("  Password: admin123")
	fmt.Println("  Role: Weighing Station Operator")
	fmt.Println()
	fmt.Println("GRADING User:")
	fmt.Println("  Username: grading")
	fmt.Println("  Password: admin123")
	fmt.Println("  Role: Quality Control Staff")
}
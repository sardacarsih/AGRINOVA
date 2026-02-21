package main

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type User struct {
	ID        string `gorm:"primaryKey"`
	Username  string
	CompanyID *string
	Role      string
	IsActive  bool
	Password  string
}

type Company struct {
	ID   string `gorm:"primaryKey"`
	Nama string
}

func main() {
	dsn := "host=localhost user=agrinova password=itBOSS dbname=agrinova_go port=5432 sslmode=disable TimeZone=Asia/Jakarta"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	log.Println("✅ Connected to database")

	// Check mobile users and their company assignments
	var users []User
	mobileRoles := []string{"ASISTEN"}

	result := db.Where("role IN ? AND is_active = true", mobileRoles).Find(&users)
	if result.Error != nil {
		log.Fatalf("❌ Failed to fetch users: %v", result.Error)
	}

	fmt.Printf("\n📋 Mobile Users Status:\n")

	for _, user := range users {
		companyID := "<NULL>"
		if user.CompanyID != nil {
			companyID = *user.CompanyID
		}

		// Check active assignments
		var companyCount, estateCount, divisionCount int64

		db.Table("user_company_assignments").Where("user_id = ? AND is_active = true", user.ID).Count(&companyCount)
		db.Table("user_estate_assignments").Where("user_id = ? AND is_active = true", user.ID).Count(&estateCount)
		db.Table("user_division_assignments").Where("user_id = ? AND is_active = true", user.ID).Count(&divisionCount)

		totalAssignments := companyCount + estateCount + divisionCount
		assignmentStatus := fmt.Sprintf("✅ %d Active (C:%d, E:%d, D:%d)", totalAssignments, companyCount, estateCount, divisionCount)
		if totalAssignments == 0 {
			assignmentStatus = "❌ NONE"
		}

		hashPrefix := "UNKNOWN"
		if len(user.Password) >= 3 {
			hashPrefix = user.Password[:3]
		}

		fmt.Printf("User: %s | Role: %s | Hash: %s... | Comp: %s | Assign: %s\n", user.Username, user.Role, hashPrefix, companyID, assignmentStatus)
	}

	// Get existing companies
	var companies []Company
	db.Find(&companies)

	fmt.Printf("\n📦 Available Companies:\n")
	for _, c := range companies {
		fmt.Printf("  - %s: %s\n", c.ID, c.Nama)
	}

	// Check for users without company
	var usersWithoutCompany int64
	db.Model(&User{}).Where("role IN ? AND is_active = true AND company_id IS NULL", mobileRoles).Count(&usersWithoutCompany)

	if usersWithoutCompany > 0 {
		fmt.Printf("\n⚠️ Found %d mobile users without a company!\n", usersWithoutCompany)

		// Get the first company to assign
		var firstCompany Company
		if err := db.First(&firstCompany).Error; err != nil {
			log.Printf("No companies found: %v", err)
			return
		}

		fmt.Printf("🔧 Assigning company '%s' to users without company...\n", firstCompany.Nama)

		result := db.Model(&User{}).Where("role IN ? AND is_active = true AND company_id IS NULL", mobileRoles).Update("company_id", firstCompany.ID)
		if result.Error != nil {
			log.Printf("Failed to update: %v", result.Error)
		} else {
			fmt.Printf("✅ Updated %d users\n", result.RowsAffected)
		}
	} else {
		fmt.Println("\n✅ All mobile users have a company assigned")
	}

	// Auto-fix missing assignments for ASISTEN
	fmt.Println("\n🔧 Checking for Asisten/Mandor without assignments...")
	for _, user := range users {
		// Re-check counts
		var companyCount, estateCount, divisionCount int64
		db.Table("user_company_assignments").Where("user_id = ? AND is_active = true", user.ID).Count(&companyCount)
		db.Table("user_estate_assignments").Where("user_id = ? AND is_active = true", user.ID).Count(&estateCount)
		db.Table("user_division_assignments").Where("user_id = ? AND is_active = true", user.ID).Count(&divisionCount)

		total := companyCount + estateCount + divisionCount

		if total == 0 && user.CompanyID != nil {
			fmt.Printf("  -> Fixing user %s (%s)...\n", user.Username, user.Role)

			// Insert dummy company assignment
			err := db.Exec(`
                INSERT INTO user_company_assignments (id, user_id, company_id, is_active, created_at, updated_at)
                VALUES (gen_random_uuid(), ?, ?, true, NOW(), NOW())
            `, user.ID, *user.CompanyID).Error

			if err != nil {
				fmt.Printf("     ❌ Failed to insert company assignment: %v\n", err)
			} else {
				fmt.Printf("     ✅ Added company assignment for %s\n", user.Username)
			}
		}
	}
}

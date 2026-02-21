package main

import (
	"log"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type User struct {
	ID        string
	Username  string
	CompanyID string
}

func (User) TableName() string {
	return "users"
}

type UserCompanyAssignment struct {
	ID         string
	UserID     string
	CompanyID  string
	IsActive   bool
	AssignedBy string
	AssignedAt time.Time
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func (UserCompanyAssignment) TableName() string {
	return "user_company_assignments"
}

func main() {
	dsn := "host=localhost user=agrinova password=itBOSS dbname=agrinova_go port=5432 sslmode=disable TimeZone=Asia/Jakarta"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	var user User
	// Find user satpam
	result := db.Where("username = ?", "satpam").First(&user)
	if result.Error != nil {
		log.Fatalf("User satpam not found: %v", result.Error)
	}
	log.Printf("User found: %s (%s) CompanyID: %s", user.Username, user.ID, user.CompanyID)

	// Create assignment
	assignment := UserCompanyAssignment{
		ID:         uuid.New().String(),
		UserID:     user.ID,
		CompanyID:  user.CompanyID,
		IsActive:   true,
		AssignedBy: user.ID, // Self-assigned for seeding
		AssignedAt: time.Now(),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	result = db.Create(&assignment)
	if result.Error != nil {
		log.Fatalf("Error creating assignment: %v", result.Error)
	}

	log.Printf("Successfully created assignment: %s", assignment.ID)
}

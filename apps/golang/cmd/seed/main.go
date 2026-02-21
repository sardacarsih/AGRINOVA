package main

import (
	"flag"
	"log"

	"agrinovagraphql/server/pkg/config"
	"agrinovagraphql/server/pkg/database"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	username := flag.String("username", "superadmin", "username for super admin bootstrap account")
	name := flag.String("name", "Super Administrator", "full name for super admin bootstrap account")
	email := flag.String("email", "superadmin@agrinova.com", "email for super admin bootstrap account")
	password := flag.String("password", "demo123", "password for super admin bootstrap account")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	log.Println("Ensuring RBAC schema...")
	if err := database.CreateRBACSchema(db); err != nil {
		log.Fatalf("failed to create RBAC schema: %v", err)
	}

	log.Println("Seeding RBAC data...")
	if err := database.SeedRBACData(db); err != nil {
		log.Fatalf("failed to seed RBAC data: %v", err)
	}

	log.Println("Seeding super admin account...")
	userID, companyID, err := database.SeedBaselineAdmin(db, database.AdminSeedOptions{
		Username: *username,
		Name:     *name,
		Email:    *email,
		Password: *password,
	})
	if err != nil {
		log.Fatalf("failed to seed super admin: %v", err)
	}

	log.Println("Seed completed successfully")
	log.Printf("Super admin username: %s", *username)
	log.Printf("Super admin user ID: %s", userID)
	log.Printf("Assigned company ID: %s", companyID)
}

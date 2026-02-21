package main

import (
	"log"

	"agrinovagraphql/server/pkg/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type User struct {
	ID       string
	Username string
	Password string
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to db: %v", err)
	}

	var user User
	if err := db.Table("users").Where("username = ?", "superadmin").First(&user).Error; err != nil {
		log.Fatalf("Failed to find user: %v", err)
	}

	log.Printf("User: %s", user.Username)
	log.Printf("Password Hash: %s", user.Password)

	if len(user.Password) > 9 && user.Password[:10] == "$argon2id$" {
		log.Println("SUCCESS: Password is hashed with Argon2id")
	} else {
		log.Println("FAILURE: Password is NOT hashed with Argon2id")
	}
}

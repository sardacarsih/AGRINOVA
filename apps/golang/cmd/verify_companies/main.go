package main

import (
	"log"

	"agrinovagraphql/server/pkg/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Company struct {
	ID          string
	Name        string
	CompanyCode string `gorm:"column:company_code"`
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}

	var companies []Company
	if err := db.Table("companies").Find(&companies).Error; err != nil {
		log.Fatalf("Failed to list companies: %v", err)
	}

	log.Println("Companies:")
	for _, c := range companies {
		log.Printf("- %s [%s]", c.Name, c.CompanyCode)
	}
}

package main

import (
	"fmt"
	"log"

	"agrinovagraphql/server/pkg/config"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	fmt.Println("\n=== Database Configuration ===")
	fmt.Printf("Host:     %s\n", cfg.Database.Host)
	fmt.Printf("Port:     %d\n", cfg.Database.Port)
	fmt.Printf("User:     %s\n", cfg.Database.User)
	fmt.Printf("Database: %s\n", cfg.Database.Name)
	fmt.Printf("SSLMode:  disable\n")
	fmt.Println("==============================\n")
}

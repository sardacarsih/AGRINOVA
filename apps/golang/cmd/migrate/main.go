package main

import (
	"context"
	"flag"
	"log"
	"os"
	"strconv"

	"agrinovagraphql/server/pkg/config"
	"agrinovagraphql/server/pkg/database"
)

func main() {
	dryRun := flag.Bool("dry-run", false, "Show what would be migrated without actually running migrations")
	verbose := flag.Bool("verbose", false, "Enable verbose logging")
	flag.Parse()

	log.SetFlags(log.LstdFlags | log.Lshortfile)
	if *verbose {
		log.Println("Verbose mode enabled")
	}

	log.Println("Agrinova Database Migration Tool")
	log.Println("====================================")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	if *verbose {
		log.Printf("Database: %s@%s:%d/%s", cfg.Database.User, cfg.Database.Host, cfg.Database.Port, cfg.Database.Name)
	}

	dbConfig := &database.DatabaseConfig{
		Host:     cfg.Database.Host,
		Port:     strconv.Itoa(cfg.Database.Port),
		User:     cfg.Database.User,
		Password: cfg.Database.Password,
		DBName:   cfg.Database.Name,
		SSLMode:  "disable",
	}

	log.Println("Connecting to database...")
	dbService, err := database.Connect(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer func() {
		log.Println("Migration completed")
	}()

	log.Println("Database connection established")

	if *dryRun {
		log.Println("DRY RUN MODE - No changes will be made")
		log.Println("The following migrations would be executed:")
		log.Println("   1. Core/GORM migrations (base schema + indexes + constraints)")
		log.Println("   2. 000023_add_block_tarif_metadata")
		log.Println("   3. 000038_enforce_unique_harvest_worker_scope")
		log.Println("   4. 000024_cutover_legacy_schema (only if legacy master columns exist)")
		log.Println("   5. 000026_finalize_drop_legacy_schema (includes 000025 readiness validation)")
		log.Println("   6. 000027_finalize_drop_legacy_user_schema")
		log.Println("")
		log.Println("Run without --dry-run flag to apply migrations")
		return
	}

	log.Println("Running database initialization and migrations...")
	log.Println("")

	if err := dbService.Initialize(context.Background()); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	log.Println("")
	log.Println("All migrations completed successfully")
	log.Println("")

	log.Println("Running post-migration validation...")
	ctx := context.Background()

	if err := dbService.Health(ctx); err != nil {
		log.Printf("Warning: Post-migration health check failed: %v", err)
		log.Println("The migrations were applied, but there may be issues with the database.")
		os.Exit(1)
	}

	log.Println("Post-migration validation passed")
	log.Println("")
	log.Println("Database is ready for use")
	log.Println("You can now start the server with: go run cmd/server/main.go")
}

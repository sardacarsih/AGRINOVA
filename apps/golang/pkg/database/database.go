package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/mandor"
	"agrinovagraphql/server/internal/graphql/domain/master"
)

var (
	db                  *gorm.DB
	relationshipService *RelationshipService
)

// DatabaseConfig holds database connection configuration
type DatabaseConfig struct {
	Host           string
	Port           string
	User           string
	Password       string
	DBName         string
	SSLMode        string
	ConnectTimeout time.Duration
}

// DatabaseService provides comprehensive database operations
type DatabaseService struct {
	db                  *gorm.DB
	relationshipService *RelationshipService
}

// Connect initializes the database connection with proper configuration
func Connect(config *DatabaseConfig) (*DatabaseService, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Jakarta",
		config.Host, config.User, config.Password, config.DBName, config.Port, config.SSLMode)

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		// Enable foreign key constraints
		DisableForeignKeyConstraintWhenMigrating: false,
		// Improve query performance - DISABLED to prevent "cached plan must not change result type" errors
		PrepareStmt: false,
		// Batch size for bulk operations
		CreateBatchSize: 1000,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Configure connection pool
	if sqlDB, err := db.DB(); err == nil {
		sqlDB.SetMaxOpenConns(100)
		sqlDB.SetMaxIdleConns(10)
	}

	// Initialize relationship service
	relationshipService = NewRelationshipService(db)

	service := &DatabaseService{
		db:                  db,
		relationshipService: relationshipService,
	}

	log.Println("Database connected successfully with relationship management")
	return service, nil
}

// Close closes the database connection
func (ds *DatabaseService) Close() error {
	sqlDB, err := ds.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// GetDB returns the database instance (for backward compatibility)
func GetDB() *gorm.DB {
	return db
}

// GetRelationshipService returns the relationship service
func GetRelationshipService() *RelationshipService {
	return relationshipService
}

// Initialize runs all database setup including migrations and relationship validation
func (ds *DatabaseService) Initialize(ctx context.Context) error {
	log.Println("Initializing database with GORM migrations...")

	// Run GORM migrations
	if err := AutoMigrateWithGORM(ds.db); err != nil {
		return fmt.Errorf("failed to run GORM migrations: %w", err)
	}

	// Run legacy migrations for backward compatibility
	if err := AutoMigrate(ds.db); err != nil {
		log.Printf("Warning: Legacy migrations failed: %v", err)
	}

	// Validate and fix relationships
	if err := ds.relationshipService.ValidateAndFixRelationships(ctx); err != nil {
		log.Printf("Warning: Relationship validation failed: %v", err)
	}

	// Create composite indexes
	if err := CreateCompositeIndexes(ds.db); err != nil {
		log.Printf("Warning: Failed to create composite indexes: %v", err)
	}

	// Optimize queries
	if err := ds.relationshipService.OptimizeRelationshipQueries(ctx); err != nil {
		log.Printf("Warning: Query optimization failed: %v", err)
	}

	log.Println("Database initialization completed successfully")
	return nil
}

// GetStatistics returns database relationship statistics
func (ds *DatabaseService) GetStatistics(ctx context.Context) (*RelationshipStatistics, error) {
	return ds.relationshipService.GetRelationshipStatistics(ctx)
}

// ValidateUserAssignments validates user role assignments
func (ds *DatabaseService) ValidateUserAssignments(ctx context.Context, userID string) ([]string, error) {
	return ds.relationshipService.ValidateUserAssignments(ctx, userID)
}

// GetUserWithRelationships retrieves user with all relationships
func (ds *DatabaseService) GetUserWithRelationships(ctx context.Context, userID string) (*UserWithRelationships, error) {
	user, err := ds.relationshipService.GetUserWithRelationships(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Convert to response format
	// TODO: Implement these methods properly in the User model or create helper functions
	estateIDs := []string{}   // Stub: user.GetActiveEstateIDs()
	divisionIDs := []string{} // Stub: user.GetActiveDivisionIDs()
	canApprove := false       // Stub: user.CanApproveHarvest()

	result := &UserWithRelationships{
		User:        user,
		EstateIDs:   estateIDs,
		DivisionIDs: divisionIDs,
		CanApprove:  canApprove,
	}

	return result, nil
}

// GetCompanyHierarchy retrieves complete company hierarchy
func (ds *DatabaseService) GetCompanyHierarchy(ctx context.Context, companyID string) (*CompanyHierarchy, error) {
	company, err := ds.relationshipService.GetCompanyHierarchy(ctx, companyID)
	if err != nil {
		return nil, err
	}

	// Convert to response format
	result := &CompanyHierarchy{
		Company: company,
	}

	// Calculate hierarchy statistics
	for _, estate := range company.Estates {
		result.TotalEstates++
		for _, division := range estate.Divisions {
			result.TotalDivisions++
			for range division.Blocks {
				result.TotalBlocks++
			}
		}
	}

	return result, nil
}

// Health checks database connectivity and relationship integrity
func (ds *DatabaseService) Health(ctx context.Context) error {
	// Test basic connectivity
	if err := ds.db.WithContext(ctx).Exec("SELECT 1").Error; err != nil {
		return fmt.Errorf("database connectivity failed: %w", err)
	}

	// Test foreign key integrity (sample)
	if err := ValidateForeignKeyRelationships(ds.db); err != nil {
		return fmt.Errorf("foreign key validation failed: %w", err)
	}

	return nil
}

// Response types for API layer

// UserWithRelationships represents a user with their relationship context
type UserWithRelationships struct {
	User        *UserWithGORM `json:"user"`
	EstateIDs   []string      `json:"estate_ids"`
	DivisionIDs []string      `json:"division_ids"`
	CanApprove  bool          `json:"can_approve"`
}

// CompanyHierarchy represents a company with its complete hierarchy
type CompanyHierarchy struct {
	Company        *CompanyWithGORM `json:"company"`
	TotalEstates   int              `json:"total_estates"`
	TotalDivisions int              `json:"total_divisions"`
	TotalBlocks    int              `json:"total_blocks"`
}

// Import from domain models (alias for easier use)
type (
	CompanyWithGORM       = master.Company
	UserWithGORM          = auth.User
	EstateWithGORM        = master.Estate
	DivisionWithGORM      = master.Division
	BlockWithGORM         = master.Block
	HarvestRecordWithGORM = mandor.HarvestRecord
)

// PoolType defines the type of database connection pool
type PoolType string

const (
	// PrimaryPool is the main read-write connection pool
	PrimaryPool PoolType = "primary"
	// ReadReplicaPool is the read-only connection pool
	ReadReplicaPool PoolType = "read_replica"
	// AnalyticsPool is the pool for heavy analytical queries
	AnalyticsPool PoolType = "analytics"
)

// GetPoolStatistics returns statistics for the connection pool
func (ds *DatabaseService) GetPoolStatistics() map[PoolType]interface{} {
	sqlDB, err := ds.db.DB()
	if err != nil {
		return map[PoolType]interface{}{
			PrimaryPool: map[string]interface{}{"error": err.Error()},
		}
	}

	stats := sqlDB.Stats()
	primaryStats := map[string]interface{}{
		"OpenConnections": stats.OpenConnections,
		"InUse":           stats.InUse,
		"Idle":            stats.Idle,
		"WaitCount":       stats.WaitCount,
		"WaitDuration":    stats.WaitDuration.String(),
		"MaxOpenConns":    stats.MaxOpenConnections,
	}

	return map[PoolType]interface{}{
		PrimaryPool: primaryStats,
	}
}

// GetCircuitBreakerMetrics returns metrics for the circuit breaker
func (ds *DatabaseService) GetCircuitBreakerMetrics() map[string]interface{} {
	// Placeholder for circuit breaker metrics
	// In a real implementation, this would return metrics from the circuit breaker
	return map[string]interface{}{
		"status":   "closed",
		"failures": 0,
	}
}

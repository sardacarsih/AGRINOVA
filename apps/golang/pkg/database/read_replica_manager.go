package database

import (
	"context"

	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// ReplicaConfig holds configuration for a read replica
type ReplicaConfig struct {
	Host            string        `mapstructure:"host"`
	Port            int           `mapstructure:"port"`
	User            string        `mapstructure:"user"`
	Password        string        `mapstructure:"password"`
	DBName          string        `mapstructure:"dbname"`
	SSLMode         string        `mapstructure:"ssl_mode"`
	Weight          int           `mapstructure:"weight"`         // Load balancing weight
	MaxOpenConns    int           `mapstructure:"max_open_conns"` // Pool settings
	MaxIdleConns    int           `mapstructure:"max_idle_conns"`
	ConnMaxLifetime time.Duration `mapstructure:"conn_max_lifetime"`
	ConnMaxIdleTime time.Duration `mapstructure:"conn_max_idle_time"`
	Priority        int           `mapstructure:"priority"` // Primary/secondary priority
}

// ReplicaStatus represents the health status of a replica
type ReplicaStatus int

const (
	ReplicaStatusHealthy ReplicaStatus = iota
	ReplicaStatusUnhealthy
	ReplicaStatusDegraded
)

// ReadReplica represents a database read replica
type ReadReplica struct {
	ID        string
	Config    ReplicaConfig
	DB        *gorm.DB
	Status    ReplicaStatus
	LastCheck time.Time
	Error     string
	Weight    int
	Priority  int
}

// ReadReplicaManager manages multiple read replicas with health checking and load balancing
type ReadReplicaManager struct {
	replicas     []*ReadReplica
	currentIndex int
	mutex        sync.RWMutex
	healthCheck  *HealthChecker
	config       *ReadReplicaManagerConfig
}

// ReadReplicaManagerConfig holds configuration for the replica manager
type ReadReplicaManagerConfig struct {
	HealthCheckInterval time.Duration `mapstructure:"health_check_interval"`
	HealthCheckTimeout  time.Duration `mapstructure:"health_check_timeout"`
	MaxUnhealthyTime    time.Duration `mapstructure:"max_unhealthy_time"`
	FailoverThreshold   int           `mapstructure:"failover_threshold"`
	EnableSlowQueryLog  bool          `mapstructure:"enable_slow_query_log"`
	SlowQueryThreshold  time.Duration `mapstructure:"slow_query_threshold"`
}

// DatabaseOperationType represents the type of database operation
type DatabaseOperationType int

const (
	OperationTypeRead DatabaseOperationType = iota
	OperationTypeWrite
	OperationTypeTransactional
)

// DatabaseContext represents database operation context
type DatabaseContext struct {
	Type        DatabaseOperationType
	Query       string
	Parameters  []interface{}
	Timeout     time.Duration
	Retryable   bool
	Criticality string // "low", "medium", "high", "critical"
}

// EnhancedDatabaseService provides read-write splitting and replica management
type EnhancedDatabaseService struct {
	primaryDB    *gorm.DB
	replicaMgr   *ReadReplicaManager
	config       *DatabaseConfig
	metrics      *DatabaseMetrics
	healthCheck  *HealthChecker
	circuitBreak *CircuitBreakerManager
}

// NewReadReplicaManager creates a new read replica manager
func NewReadReplicaManager(config *ReadReplicaManagerConfig) *ReadReplicaManager {
	if config == nil {
		config = DefaultReadReplicaManagerConfig()
	}

	rrm := &ReadReplicaManager{
		replicas: make([]*ReadReplica, 0),
		config:   config,
	}

	// Initialize health checker
	// Initialize health checker
	healthConfig := &HealthCheckerConfig{
		CheckInterval:    config.HealthCheckInterval,
		CheckTimeout:     config.HealthCheckTimeout,
		FailureThreshold: config.FailoverThreshold,
		SuccessThreshold: 2,
		EnableMetrics:    true,
		LogFailures:      true,
	}
	rrm.healthCheck = NewHealthChecker(healthConfig)

	return rrm
}

// DefaultReadReplicaManagerConfig returns default configuration
func DefaultReadReplicaManagerConfig() *ReadReplicaManagerConfig {
	return &ReadReplicaManagerConfig{
		HealthCheckInterval: 30 * time.Second,
		HealthCheckTimeout:  5 * time.Second,
		MaxUnhealthyTime:    2 * time.Minute,
		FailoverThreshold:   3,
		EnableSlowQueryLog:  true,
		SlowQueryThreshold:  1 * time.Second,
	}
}

// AddReplica adds a new read replica
func (rrm *ReadReplicaManager) AddReplica(id string, config ReplicaConfig) error {
	rrm.mutex.Lock()
	defer rrm.mutex.Unlock()

	// Check if replica already exists
	for _, replica := range rrm.replicas {
		if replica.ID == id {
			return fmt.Errorf("replica with ID %s already exists", id)
		}
	}

	// Create database connection for replica
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s TimeZone=Asia/Jakarta",
		config.Host, config.Port, config.User, config.Password, config.DBName, config.SSLMode)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Warn),
		DisableForeignKeyConstraintWhenMigrating: false,
		PrepareStmt:                              true,
		CreateBatchSize:                          1000,
	})

	if err != nil {
		return fmt.Errorf("failed to connect to replica %s: %w", id, err)
	}

	// Configure connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB for replica %s: %w", id, err)
	}

	// Set pool configuration with defaults if not specified
	if config.MaxOpenConns == 0 {
		config.MaxOpenConns = 50
	}
	if config.MaxIdleConns == 0 {
		config.MaxIdleConns = 10
	}
	if config.ConnMaxLifetime == 0 {
		config.ConnMaxLifetime = 30 * time.Minute
	}
	if config.ConnMaxIdleTime == 0 {
		config.ConnMaxIdleTime = 5 * time.Minute
	}

	sqlDB.SetMaxOpenConns(config.MaxOpenConns)
	sqlDB.SetMaxIdleConns(config.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(config.ConnMaxLifetime)
	sqlDB.SetConnMaxIdleTime(config.ConnMaxIdleTime)

	replica := &ReadReplica{
		ID:        id,
		Config:    config,
		DB:        db,
		Status:    ReplicaStatusHealthy,
		LastCheck: time.Now(),
		Weight:    config.Weight,
		Priority:  config.Priority,
	}

	rrm.replicas = append(rrm.replicas, replica)
	log.Printf("Added read replica %s at %s:%d (weight: %d, priority: %d)",
		id, config.Host, config.Port, config.Weight, config.Priority)

	return nil
}

// GetReplica returns a healthy replica using weighted round-robin
func (rrm *ReadReplicaManager) GetReplica() (*gorm.DB, error) {
	rrm.mutex.RLock()
	defer rrm.mutex.RUnlock()

	if len(rrm.replicas) == 0 {
		return nil, fmt.Errorf("no read replicas available")
	}

	// Filter healthy replicas
	healthyReplicas := make([]*ReadReplica, 0)
	for _, replica := range rrm.replicas {
		if replica.Status == ReplicaStatusHealthy {
			healthyReplicas = append(healthyReplicas, replica)
		}
	}

	if len(healthyReplicas) == 0 {
		return nil, fmt.Errorf("no healthy read replicas available")
	}

	// Sort by priority (lower number = higher priority)
	for i := 0; i < len(healthyReplicas)-1; i++ {
		for j := i + 1; j < len(healthyReplicas); j++ {
			if healthyReplicas[i].Priority > healthyReplicas[j].Priority {
				healthyReplicas[i], healthyReplicas[j] = healthyReplicas[j], healthyReplicas[i]
			}
		}
	}

	// Use weighted round-robin selection
	return rrm.selectReplicaByWeight(healthyReplicas)
}

// selectReplicaByWeight selects a replica based on weights
func (rrm *ReadReplicaManager) selectReplicaByWeight(replicas []*ReadReplica) (*gorm.DB, error) {
	// Calculate total weight
	totalWeight := 0
	for _, replica := range replicas {
		if replica.Weight == 0 {
			totalWeight += 1 // Default weight
		} else {
			totalWeight += replica.Weight
		}
	}

	// Select random number
	rand.Seed(time.Now().UnixNano())
	random := rand.Intn(totalWeight)

	// Find replica based on weight
	currentWeight := 0
	for _, replica := range replicas {
		weight := replica.Weight
		if weight == 0 {
			weight = 1
		}
		currentWeight += weight
		if random < currentWeight {
			return replica.DB, nil
		}
	}

	// Fallback to first replica
	return replicas[0].DB, nil
}

// GetAllReplicas returns all replicas with their status
func (rrm *ReadReplicaManager) GetAllReplicas() map[string]*ReadReplica {
	rrm.mutex.RLock()
	defer rrm.mutex.RUnlock()

	result := make(map[string]*ReadReplica)
	for _, replica := range rrm.replicas {
		// Create a copy to avoid race conditions
		replicaCopy := &ReadReplica{
			ID:        replica.ID,
			Config:    replica.Config,
			Status:    replica.Status,
			LastCheck: replica.LastCheck,
			Error:     replica.Error,
			Weight:    replica.Weight,
			Priority:  replica.Priority,
		}
		result[replica.ID] = replicaCopy
	}
	return result
}

// StartHealthChecking starts the background health checking process
func (rrm *ReadReplicaManager) StartHealthChecking() {
	go func() {
		ticker := time.NewTicker(rrm.config.HealthCheckInterval)
		defer ticker.Stop()

		for range ticker.C {
			rrm.performHealthCheck()
		}
	}()
	log.Printf("Started read replica health checking with interval %v", rrm.config.HealthCheckInterval)
}

// performHealthCheck checks the health of all replicas
func (rrm *ReadReplicaManager) performHealthCheck() {
	rrm.mutex.Lock()
	defer rrm.mutex.Unlock()

	for _, replica := range rrm.replicas {
		ctx, cancel := context.WithTimeout(context.Background(), rrm.config.HealthCheckTimeout)

		// Perform health check
		err := replica.DB.WithContext(ctx).Exec("SELECT 1").Error
		cancel()

		replica.LastCheck = time.Now()

		if err != nil {
			replica.Status = ReplicaStatusUnhealthy
			replica.Error = err.Error()
			log.Printf("Replica %s is unhealthy: %v", replica.ID, err)
		} else {
			// Check if replica was previously unhealthy
			if replica.Status == ReplicaStatusUnhealthy {
				replica.Status = ReplicaStatusDegraded
				log.Printf("Replica %s is recovering from unhealthy state", replica.ID)
			} else {
				replica.Status = ReplicaStatusHealthy
				replica.Error = ""
			}
		}
	}
}

// GetHealthyReplicaCount returns the number of healthy replicas
func (rrm *ReadReplicaManager) GetHealthyReplicaCount() int {
	rrm.mutex.RLock()
	defer rrm.mutex.RUnlock()

	count := 0
	for _, replica := range rrm.replicas {
		if replica.Status == ReplicaStatusHealthy {
			count++
		}
	}
	return count
}

// Close all replica connections
func (rrm *ReadReplicaManager) Close() error {
	rrm.mutex.Lock()
	defer rrm.mutex.Unlock()

	var errors []error
	for _, replica := range rrm.replicas {
		if sqlDB, err := replica.DB.DB(); err == nil {
			if err := sqlDB.Close(); err != nil {
				errors = append(errors, fmt.Errorf("failed to close replica %s: %w", replica.ID, err))
			} else {
				log.Printf("Closed read replica %s", replica.ID)
			}
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("errors closing read replicas: %v", errors)
	}
	return nil
}

// NewEnhancedDatabaseService creates a new enhanced database service with read replica support
func NewEnhancedDatabaseService(primaryDB *gorm.DB, config *DatabaseConfig) *EnhancedDatabaseService {
	return &EnhancedDatabaseService{
		primaryDB:    primaryDB,
		replicaMgr:   NewReadReplicaManager(nil),
		config:       config,
		metrics:      NewDatabaseMetrics(),
		healthCheck:  NewHealthChecker(nil),
		circuitBreak: NewCircuitBreakerManager(),
	}
}

// GetDB returns the appropriate database connection based on operation type
func (eds *EnhancedDatabaseService) GetDB(ctx context.Context, dbCtx DatabaseContext) *gorm.DB {
	switch dbCtx.Type {
	case OperationTypeRead:
		// Try to get a replica for read operations
		if replica, err := eds.replicaMgr.GetReplica(); err == nil {
			return replica.WithContext(ctx)
		}
		// Fallback to primary if no healthy replicas
		log.Printf("No healthy replicas available, falling back to primary for read operation")
		return eds.primaryDB.WithContext(ctx)
	case OperationTypeWrite, OperationTypeTransactional:
		// Always use primary for write and transactional operations
		return eds.primaryDB.WithContext(ctx)
	default:
		return eds.primaryDB.WithContext(ctx)
	}
}

// ExecuteQuery executes a database query with the appropriate connection
func (eds *EnhancedDatabaseService) ExecuteQuery(ctx context.Context, dbCtx DatabaseContext, queryFunc func(*gorm.DB) error) error {
	startTime := time.Now()

	// Set timeout if specified
	if dbCtx.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, dbCtx.Timeout)
		defer cancel()
	}

	// Get appropriate database connection
	db := eds.GetDB(ctx, dbCtx)

	// Execute query
	err := queryFunc(db)

	// Record metrics
	duration := time.Since(startTime)
	eds.metrics.RecordQuery(dbCtx, duration, err)

	// Log slow queries
	if eds.metrics.config.EnableSlowQueryLog && duration > eds.metrics.config.SlowQueryThreshold {
		log.Printf("SLOW QUERY [%v]: %s (type: %v)", duration, dbCtx.Query, dbCtx.Type)
	}

	return err
}

// GetReplicaManager returns the read replica manager
func (eds *EnhancedDatabaseService) GetReplicaManager() *ReadReplicaManager {
	return eds.replicaMgr
}

// GetMetrics returns database metrics
func (eds *EnhancedDatabaseService) GetMetrics() *DatabaseMetrics {
	return eds.metrics
}

// Close closes the enhanced database service
func (eds *EnhancedDatabaseService) Close() error {
	if eds.replicaMgr != nil {
		return eds.replicaMgr.Close()
	}
	return nil
}

package database

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// PoolType defines different connection pool types
// type PoolType string (defined in database.go)

const (
	PoolTypeHTTP       PoolType = "HTTP"
	PoolTypeWebSocket  PoolType = "WEBSOCKET"
	PoolTypeBackground PoolType = "BACKGROUND"
)

// ConnectionPoolManager manages segregated connection pools
type ConnectionPoolManager struct {
	pools  map[PoolType]*gorm.DB
	mutex  sync.RWMutex
	config *DatabaseConfig
}

// PoolConfiguration defines settings for each pool type
type PoolConfiguration struct {
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

// GetPoolConfiguration returns optimal settings for each pool type
func GetPoolConfiguration(poolType PoolType) PoolConfiguration {
	switch poolType {
	case PoolTypeHTTP:
		return PoolConfiguration{
			MaxOpenConns:    150, // HTTP operations need more connections
			MaxIdleConns:    30,
			ConnMaxLifetime: 30 * time.Minute,
			ConnMaxIdleTime: 5 * time.Minute,
		}
	case PoolTypeWebSocket:
		return PoolConfiguration{
			MaxOpenConns:    30, // WebSocket operations are mostly lightweight
			MaxIdleConns:    10,
			ConnMaxLifetime: 15 * time.Minute,
			ConnMaxIdleTime: 3 * time.Minute,
		}
	case PoolTypeBackground:
		return PoolConfiguration{
			MaxOpenConns:    20, // Background jobs don't need many connections
			MaxIdleConns:    5,
			ConnMaxLifetime: 45 * time.Minute,
			ConnMaxIdleTime: 10 * time.Minute,
		}
	default:
		return GetPoolConfiguration(PoolTypeHTTP)
	}
}

// NewConnectionPoolManager creates a new connection pool manager
func NewConnectionPoolManager(config *DatabaseConfig) *ConnectionPoolManager {
	return &ConnectionPoolManager{
		pools:  make(map[PoolType]*gorm.DB),
		config: config,
	}
}

// GetPool returns a database connection for the specified pool type
func (cpm *ConnectionPoolManager) GetPool(poolType PoolType) (*gorm.DB, error) {
	cpm.mutex.RLock()
	if db, exists := cpm.pools[poolType]; exists {
		cpm.mutex.RUnlock()
		return db, nil
	}
	cpm.mutex.RUnlock()

	// Create new connection pool for this type
	cpm.mutex.Lock()
	defer cpm.mutex.Unlock()

	// Double-check after acquiring write lock
	if db, exists := cpm.pools[poolType]; exists {
		return db, nil
	}

	db, err := cpm.createPool(poolType)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool for %s: %w", poolType, err)
	}

	cpm.pools[poolType] = db
	log.Printf("Created new connection pool for %s operations", poolType)
	return db, nil
}

// createPool creates a new database connection pool for the specified type
func (cpm *ConnectionPoolManager) createPool(poolType PoolType) (*gorm.DB, error) {
	config := GetPoolConfiguration(poolType)

	// Set default timeouts if not specified
	connectTimeout := cpm.config.ConnectTimeout
	if connectTimeout == 0 {
		connectTimeout = 10 * time.Second
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Jakarta connect_timeout=%d",
		cpm.config.Host, cpm.config.User, cpm.config.Password, cpm.config.DBName,
		cpm.config.Port, cpm.config.SSLMode, int(connectTimeout.Seconds()))

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Warn), // Reduce log noise for connection pools
		DisableForeignKeyConstraintWhenMigrating: false,
		PrepareStmt:                              true,
		CreateBatchSize:                          1000,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Configure pool-specific settings
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	sqlDB.SetMaxOpenConns(config.MaxOpenConns)
	sqlDB.SetMaxIdleConns(config.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(config.ConnMaxLifetime)
	sqlDB.SetConnMaxIdleTime(config.ConnMaxIdleTime)

	// Note: Read/Write timeouts are handled at the context level in individual operations
	// Connection pool focuses on connection lifecycle management

	log.Printf("Connection pool %s configured: MaxOpen=%d, MaxIdle=%d, MaxLifetime=%v, MaxIdleTime=%v",
		poolType, config.MaxOpenConns, config.MaxIdleConns, config.ConnMaxLifetime, config.ConnMaxIdleTime)

	return db, nil
}

// Close all connection pools
func (cpm *ConnectionPoolManager) Close() error {
	cpm.mutex.Lock()
	defer cpm.mutex.Unlock()

	var errors []error
	for poolType, db := range cpm.pools {
		if sqlDB, err := db.DB(); err == nil {
			if err := sqlDB.Close(); err != nil {
				errors = append(errors, fmt.Errorf("failed to close pool %s: %w", poolType, err))
			} else {
				log.Printf("Closed connection pool for %s operations", poolType)
			}
		}
		cpm.pools[poolType] = nil
	}

	if len(errors) > 0 {
		return fmt.Errorf("errors closing connection pools: %v", errors)
	}
	return nil
}

// GetPoolStats returns statistics for all connection pools
func (cpm *ConnectionPoolManager) GetPoolStats() map[PoolType]interface{} {
	cpm.mutex.RLock()
	defer cpm.mutex.RUnlock()

	stats := make(map[PoolType]interface{})
	for poolType, db := range cpm.pools {
		if sqlDB, err := db.DB(); err == nil {
			poolStats := sqlDB.Stats()
			stats[poolType] = struct {
				OpenConnections int
				InUse           int
				Idle            int
				WaitCount       int64
				WaitDuration    time.Duration
				MaxOpenConns    int
			}{
				OpenConnections: poolStats.OpenConnections,
				InUse:           poolStats.InUse,
				Idle:            poolStats.Idle,
				WaitCount:       poolStats.WaitCount,
				WaitDuration:    poolStats.WaitDuration,
				MaxOpenConns:    poolStats.MaxOpenConnections,
			}
		}
	}
	return stats
}

// Health checks all connection pools
func (cpm *ConnectionPoolManager) Health(ctx context.Context) error {
	cpm.mutex.RLock()
	defer cpm.mutex.RUnlock()

	for poolType, db := range cpm.pools {
		healthCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()

		if err := db.WithContext(healthCtx).Exec("SELECT 1").Error; err != nil {
			return fmt.Errorf("pool %s health check failed: %w", poolType, err)
		}
	}
	return nil
}

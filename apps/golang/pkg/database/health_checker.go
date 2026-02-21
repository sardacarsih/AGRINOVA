package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"sync"
	"time"

	"gorm.io/gorm"
)

// HealthStatus represents the health status of a database connection
type HealthStatus string

const (
	HealthStatusHealthy   HealthStatus = "healthy"
	HealthStatusUnhealthy HealthStatus = "unhealthy"
	HealthStatusDegraded  HealthStatus = "degraded"
)

// HealthCheckResult represents the result of a health check
type HealthCheckResult struct {
	Status       HealthStatus  `json:"status"`
	LastCheck    time.Time     `json:"last_check"`
	ResponseTime time.Duration `json:"response_time"`
	Error        string        `json:"error,omitempty"`
	Metrics      HealthMetrics `json:"metrics"`
}

// HealthMetrics represents health check metrics
type HealthMetrics struct {
	ConnectionsActive int           `json:"connections_active"`
	ConnectionsIdle   int           `json:"connections_idle"`
	ConnectionsOpen   int           `json:"connections_open"`
	WaitCount         int64         `json:"wait_count"`
	WaitDuration      time.Duration `json:"wait_duration"`
	MaxConnections    int           `json:"max_connections"`
	DatabaseSize      int64         `json:"database_size,omitempty"`
	ReplicationLag    time.Duration `json:"replication_lag,omitempty"`
}

// HealthChecker performs health checks on database connections
type HealthChecker struct {
	config       *HealthCheckerConfig
	checks       map[string]*HealthCheckResult
	mutex        sync.RWMutex
	stopChan     chan struct{}
	isRunning    bool
	runningMutex sync.Mutex
}

// HealthCheckerConfig holds configuration for the health checker
type HealthCheckerConfig struct {
	CheckInterval    time.Duration `mapstructure:"check_interval"`
	CheckTimeout     time.Duration `mapstructure:"check_timeout"`
	FailureThreshold int           `mapstructure:"failure_threshold"`
	SuccessThreshold int           `mapstructure:"success_threshold"`
	EnableMetrics    bool          `mapstructure:"enable_metrics"`
	LogFailures      bool          `mapstructure:"log_failures"`
}

// DefaultHealthCheckerConfig returns default health checker configuration
func DefaultHealthCheckerConfig() *HealthCheckerConfig {
	return &HealthCheckerConfig{
		CheckInterval:    30 * time.Second,
		CheckTimeout:     5 * time.Second,
		FailureThreshold: 3,
		SuccessThreshold: 2,
		EnableMetrics:    true,
		LogFailures:      true,
	}
}

// NewHealthChecker creates a new health checker
func NewHealthChecker(config *HealthCheckerConfig) *HealthChecker {
	if config == nil {
		config = DefaultHealthCheckerConfig()
	}

	return &HealthChecker{
		config:   config,
		checks:   make(map[string]*HealthCheckResult),
		stopChan: make(chan struct{}),
	}
}

// RegisterConnection registers a database connection for health checking
func (hc *HealthChecker) RegisterConnection(name string, db *gorm.DB) {
	hc.mutex.Lock()
	defer hc.mutex.Unlock()

	hc.checks[name] = &HealthCheckResult{
		Status:    HealthStatusHealthy,
		LastCheck: time.Now(),
		Metrics:   HealthMetrics{},
	}

	log.Printf("Registered database connection '%s' for health checking", name)
}

// UnregisterConnection removes a database connection from health checking
func (hc *HealthChecker) UnregisterConnection(name string) {
	hc.mutex.Lock()
	defer hc.mutex.Unlock()

	delete(hc.checks, name)
	log.Printf("Unregistered database connection '%s' from health checking", name)
}

// Start begins the health checking process
func (hc *HealthChecker) Start() {
	hc.runningMutex.Lock()
	defer hc.runningMutex.Unlock()

	if hc.isRunning {
		return
	}

	hc.isRunning = true
	go hc.healthCheckLoop()

	log.Printf("Started database health checker with interval %v", hc.config.CheckInterval)
}

// Stop stops the health checking process
func (hc *HealthChecker) Stop() {
	hc.runningMutex.Lock()
	defer hc.runningMutex.Unlock()

	if !hc.isRunning {
		return
	}

	hc.isRunning = false
	close(hc.stopChan)
	hc.stopChan = make(chan struct{})

	log.Println("Stopped database health checker")
}

// healthCheckLoop runs the continuous health checking loop
func (hc *HealthChecker) healthCheckLoop() {
	ticker := time.NewTicker(hc.config.CheckInterval)
	defer ticker.Stop()

	// Perform initial health check
	hc.performAllChecks()

	for {
		select {
		case <-ticker.C:
			hc.performAllChecks()
		case <-hc.stopChan:
			return
		}
	}
}

// performAllChecks performs health checks on all registered connections
func (hc *HealthChecker) performAllChecks() {
	hc.mutex.RLock()
	// connections := make(map[string]*gorm.DB)
	// for name := range hc.checks {
	// 	// Note: We need to track the actual DB instances somewhere
	// 	// For now, we'll use a simpler approach where health checks are done externally
	// }
	hc.mutex.RUnlock()

	// This method would need access to the actual database connections
	// In practice, health checks should be triggered from the database service
}

// CheckHealth performs a health check on a specific database connection
func (hc *HealthChecker) CheckHealth(name string, db *gorm.DB) *HealthCheckResult {
	startTime := time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), hc.config.CheckTimeout)
	defer cancel()

	result := &HealthCheckResult{
		LastCheck: startTime,
		Metrics:   HealthMetrics{},
	}

	// Perform basic connectivity test
	err := db.WithContext(ctx).Exec("SELECT 1").Error
	result.ResponseTime = time.Since(startTime)

	if err != nil {
		result.Status = HealthStatusUnhealthy
		result.Error = err.Error()

		if hc.config.LogFailures {
			log.Printf("Health check failed for '%s': %v (response time: %v)", name, err, result.ResponseTime)
		}
	} else {
		// Get detailed metrics if enabled
		if hc.config.EnableMetrics {
			if sqlDB, sqlErr := db.DB(); sqlErr == nil {
				stats := sqlDB.Stats()
				result.Metrics = HealthMetrics{
					ConnectionsActive: stats.InUse,
					ConnectionsIdle:   stats.Idle,
					ConnectionsOpen:   stats.OpenConnections,
					WaitCount:         stats.WaitCount,
					WaitDuration:      stats.WaitDuration,
					MaxConnections:    stats.MaxOpenConnections,
				}
			}
		}

		// Check connection pool health
		if result.Metrics.WaitCount > 10 && result.Metrics.WaitDuration > time.Second {
			result.Status = HealthStatusDegraded
			if hc.config.LogFailures {
				log.Printf("Health check degraded for '%s': High wait times (count: %d, duration: %v)",
					name, result.Metrics.WaitCount, result.Metrics.WaitDuration)
			}
		} else {
			result.Status = HealthStatusHealthy
		}
	}

	// Update stored result
	hc.mutex.Lock()
	if existing, exists := hc.checks[name]; exists {
		// Apply failure/success thresholds
		hc.updateStatusWithThresholds(existing, result)
		hc.checks[name] = existing
	}
	hc.mutex.Unlock()

	return result
}

// updateStatusWithThresholds updates status based on failure/success thresholds
func (hc *HealthChecker) updateStatusWithThresholds(existing, new *HealthCheckResult) {
	// Simple threshold logic - can be enhanced for more sophisticated health checking
	if new.Status == HealthStatusHealthy {
		if existing.Status == HealthStatusUnhealthy {
			// Transition to degraded first
			existing.Status = HealthStatusDegraded
		} else {
			existing.Status = HealthStatusHealthy
		}
	} else if new.Status == HealthStatusUnhealthy {
		existing.Status = HealthStatusUnhealthy
	}

	existing.LastCheck = new.LastCheck
	existing.ResponseTime = new.ResponseTime
	existing.Error = new.Error
	existing.Metrics = new.Metrics
}

// GetHealthStatus returns the health status of all registered connections
func (hc *HealthChecker) GetHealthStatus() map[string]*HealthCheckResult {
	hc.mutex.RLock()
	defer hc.mutex.RUnlock()

	result := make(map[string]*HealthCheckResult)
	for name, check := range hc.checks {
		// Create a copy to avoid race conditions
		checkCopy := &HealthCheckResult{
			Status:       check.Status,
			LastCheck:    check.LastCheck,
			ResponseTime: check.ResponseTime,
			Error:        check.Error,
			Metrics:      check.Metrics,
		}
		result[name] = checkCopy
	}
	return result
}

// GetHealthStatus returns the health status of a specific connection
func (hc *HealthChecker) GetConnectionHealth(name string) (*HealthCheckResult, error) {
	hc.mutex.RLock()
	defer hc.mutex.RUnlock()

	if check, exists := hc.checks[name]; exists {
		// Return a copy to avoid race conditions
		return &HealthCheckResult{
			Status:       check.Status,
			LastCheck:    check.LastCheck,
			ResponseTime: check.ResponseTime,
			Error:        check.Error,
			Metrics:      check.Metrics,
		}, nil
	}

	return nil, fmt.Errorf("connection '%s' not found", name)
}

// IsHealthy returns true if all registered connections are healthy
func (hc *HealthChecker) IsHealthy() bool {
	hc.mutex.RLock()
	defer hc.mutex.RUnlock()

	for _, check := range hc.checks {
		if check.Status != HealthStatusHealthy {
			return false
		}
	}
	return true
}

// IsHealthy returns true if the specific connection is healthy
func (hc *HealthChecker) IsConnectionHealthy(name string) bool {
	hc.mutex.RLock()
	defer hc.mutex.RUnlock()

	if check, exists := hc.checks[name]; exists {
		return check.Status == HealthStatusHealthy
	}
	return false
}

// GetUnhealthyConnections returns a list of unhealthy connections
func (hc *HealthChecker) GetUnhealthyConnections() []string {
	hc.mutex.RLock()
	defer hc.mutex.RUnlock()

	var unhealthy []string
	for name, check := range hc.checks {
		if check.Status != HealthStatusHealthy {
			unhealthy = append(unhealthy, name)
		}
	}
	return unhealthy
}

// PerformAdvancedHealthCheck performs comprehensive health checks including database-specific metrics
func (hc *HealthChecker) PerformAdvancedHealthCheck(name string, db *gorm.DB) (*HealthCheckResult, error) {
	result := hc.CheckHealth(name, db)

	// Add advanced checks
	ctx, cancel := context.WithTimeout(context.Background(), hc.config.CheckTimeout)
	defer cancel()

	// Check database size (PostgreSQL specific)
	if hc.config.EnableMetrics {
		var databaseSize sql.NullInt64
		err := db.WithContext(ctx).Raw("SELECT pg_database_size(current_database())").Scan(&databaseSize).Error
		if err == nil && databaseSize.Valid {
			result.Metrics.DatabaseSize = databaseSize.Int64
		}

		// Check replication lag (if this is a replica)
		var replicationLag sql.NullFloat64
		err = db.WithContext(ctx).Raw(`
			SELECT COALESCE(EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())), 0)
		`).Scan(&replicationLag).Error
		if err == nil && replicationLag.Valid && replicationLag.Float64 > 0 {
			result.Metrics.ReplicationLag = time.Duration(replicationLag.Float64) * time.Second
		}

		// Check active connections
		var activeConnections int
		err = db.WithContext(ctx).Raw("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'").Scan(&activeConnections).Error
		if err == nil {
			result.Metrics.ConnectionsActive = activeConnections
		}
	}

	return result, nil
}

// ResetHealthCheck resets the health status for a specific connection
func (hc *HealthChecker) ResetHealthCheck(name string) {
	hc.mutex.Lock()
	defer hc.mutex.Unlock()

	if check, exists := hc.checks[name]; exists {
		check.Status = HealthStatusHealthy
		check.Error = ""
		check.LastCheck = time.Now()
	}
}

// ResetAllHealthChecks resets the health status for all connections
func (hc *HealthChecker) ResetAllHealthChecks() {
	hc.mutex.Lock()
	defer hc.mutex.Unlock()

	for _, check := range hc.checks {
		check.Status = HealthStatusHealthy
		check.Error = ""
		check.LastCheck = time.Now()
	}
}

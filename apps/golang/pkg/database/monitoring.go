package database

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"
)

// AlertSeverity defines the severity level of alerts
type AlertSeverity string

const (
	SeverityInfo    AlertSeverity = "INFO"
	SeverityWarning AlertSeverity = "WARNING"
	SeverityError   AlertSeverity = "ERROR"
	SeverityCritical AlertSeverity = "CRITICAL"
)

// Alert represents a database monitoring alert
type Alert struct {
	Timestamp   time.Time     `json:"timestamp"`
	Severity    AlertSeverity `json:"severity"`
	Component   string        `json:"component"`
	Message     string        `json:"message"`
	Metrics     interface{}   `json:"metrics,omitempty"`
	Suggestion  string        `json:"suggestion,omitempty"`
}

// AlertHandler defines the interface for handling alerts
type AlertHandler interface {
	Handle(alert Alert) error
}

// LoggingAlertHandler handles alerts by logging them
type LoggingAlertHandler struct{}

func (h *LoggingAlertHandler) Handle(alert Alert) error {
	logMessage := fmt.Sprintf("[%s] %s: %s", alert.Severity, alert.Component, alert.Message)
	if alert.Suggestion != "" {
		logMessage += fmt.Sprintf(" (Suggestion: %s)", alert.Suggestion)
	}

	switch alert.Severity {
	case SeverityCritical, SeverityError:
		log.Printf("🚨 %s", logMessage)
	case SeverityWarning:
		log.Printf("⚠️ %s", logMessage)
	default:
		log.Printf("ℹ️ %s", logMessage)
	}

	return nil
}

// MonitoringConfig holds configuration for database monitoring
type MonitoringConfig struct {
	// Health check intervals
	HealthCheckInterval    time.Duration
	PoolStatsInterval      time.Duration
	CircuitBreakerInterval time.Duration

	// Alert thresholds
	MaxConnectionWaitTime    time.Duration
	MaxOpenCircuitBreakers   int
	MaxPoolUtilization       float64 // 0.0 to 1.0

	// Enable/disable monitoring features
	EnablePoolMonitoring    bool
	EnableCircuitBreakerMonitoring bool
	EnableHealthCheckMonitoring   bool
}

// DefaultMonitoringConfig returns sensible defaults
func DefaultMonitoringConfig() MonitoringConfig {
	return MonitoringConfig{
		HealthCheckInterval:           30 * time.Second,
		PoolStatsInterval:             15 * time.Second,
		CircuitBreakerInterval:        10 * time.Second,
		MaxConnectionWaitTime:         5 * time.Second,
		MaxOpenCircuitBreakers:        2,
		MaxPoolUtilization:           0.8, // 80%
		EnablePoolMonitoring:          true,
		EnableCircuitBreakerMonitoring: true,
		EnableHealthCheckMonitoring:    true,
	}
}

// DatabaseMonitor monitors database health and performance
type DatabaseMonitor struct {
	service       *DatabaseService
	config        MonitoringConfig
	alertHandlers []AlertHandler
	ctx           context.Context
	cancel        context.CancelFunc
	wg            sync.WaitGroup
	mutex         sync.RWMutex

	// Metrics storage
	lastHealthCheck   time.Time
	lastPoolStats     map[PoolType]interface{}
	lastCBMetrics     map[string]interface{}
	alertHistory      []Alert
	maxAlertHistory   int
}

// NewDatabaseMonitor creates a new database monitor
func NewDatabaseMonitor(service *DatabaseService, config MonitoringConfig) *DatabaseMonitor {
	ctx, cancel := context.WithCancel(context.Background())

	return &DatabaseMonitor{
		service:          service,
		config:           config,
		alertHandlers:    []AlertHandler{&LoggingAlertHandler{}},
		ctx:              ctx,
		cancel:           cancel,
		lastPoolStats:    make(map[PoolType]interface{}),
		lastCBMetrics:    make(map[string]interface{}),
		alertHistory:     make([]Alert, 0),
		maxAlertHistory:  100,
	}
}

// AddAlertHandler adds a new alert handler
func (dm *DatabaseMonitor) AddAlertHandler(handler AlertHandler) {
	dm.mutex.Lock()
	defer dm.mutex.Unlock()
	dm.alertHandlers = append(dm.alertHandlers, handler)
}

// Start begins the monitoring process
func (dm *DatabaseMonitor) Start() {
	log.Println("Starting database monitoring...")

	if dm.config.EnableHealthCheckMonitoring {
		dm.wg.Add(1)
		go dm.healthCheckMonitor()
	}

	if dm.config.EnablePoolMonitoring {
		dm.wg.Add(1)
		go dm.poolStatsMonitor()
	}

	if dm.config.EnableCircuitBreakerMonitoring {
		dm.wg.Add(1)
		go dm.circuitBreakerMonitor()
	}

	log.Println("Database monitoring started")
}

// Stop stops the monitoring process
func (dm *DatabaseMonitor) Stop() {
	log.Println("Stopping database monitoring...")
	dm.cancel()
	dm.wg.Wait()
	log.Println("Database monitoring stopped")
}

// healthCheckMonitor runs periodic health checks
func (dm *DatabaseMonitor) healthCheckMonitor() {
	defer dm.wg.Done()

	ticker := time.NewTicker(dm.config.HealthCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-dm.ctx.Done():
			return
		case <-ticker.C:
			dm.performHealthCheck()
		}
	}
}

// poolStatsMonitor monitors connection pool statistics
func (dm *DatabaseMonitor) poolStatsMonitor() {
	defer dm.wg.Done()

	ticker := time.NewTicker(dm.config.PoolStatsInterval)
	defer ticker.Stop()

	for {
		select {
		case <-dm.ctx.Done():
			return
		case <-ticker.C:
			dm.monitorPoolStats()
		}
	}
}

// circuitBreakerMonitor monitors circuit breaker status
func (dm *DatabaseMonitor) circuitBreakerMonitor() {
	defer dm.wg.Done()

	ticker := time.NewTicker(dm.config.CircuitBreakerInterval)
	defer ticker.Stop()

	for {
		select {
		case <-dm.ctx.Done():
			return
		case <-ticker.C:
			dm.monitorCircuitBreakers()
		}
	}
}

// performHealthCheck performs a health check and alerts on failures
func (dm *DatabaseMonitor) performHealthCheck() {
	healthCtx, cancel := context.WithTimeout(dm.ctx, 10*time.Second)
	defer cancel()

	if err := dm.service.Health(healthCtx); err != nil {
		dm.sendAlert(Alert{
			Timestamp:  time.Now(),
			Severity:   SeverityCritical,
			Component:  "HealthCheck",
			Message:    fmt.Sprintf("Database health check failed: %v", err),
			Suggestion: "Check database connectivity and configuration",
		})
	} else {
		dm.lastHealthCheck = time.Now()
	}
}

// monitorPoolStats monitors connection pool statistics
func (dm *DatabaseMonitor) monitorPoolStats() {
	poolStats := dm.service.GetPoolStatistics()
	dm.mutex.Lock()
	dm.lastPoolStats = poolStats
	dm.mutex.Unlock()

	for poolType, stats := range poolStats {
		if statsData, ok := stats.(map[string]interface{}); ok {
			// Check pool utilization
			if maxOpen, exists := statsData["MaxOpenConns"]; exists {
				if open, exists := statsData["OpenConnections"]; exists {
					maxOpenFloat := float64(maxOpen.(int))
					openFloat := float64(open.(int))

					if maxOpenFloat > 0 {
						utilization := openFloat / maxOpenFloat
						if utilization > dm.config.MaxPoolUtilization {
							dm.sendAlert(Alert{
								Timestamp: time.Now(),
								Severity:  SeverityWarning,
								Component: fmt.Sprintf("ConnectionPool-%s", poolType),
								Message:   fmt.Sprintf("Pool utilization high: %.1f%%", utilization*100),
								Metrics:   statsData,
								Suggestion: "Consider increasing MaxOpenConns for this pool type",
							})
						}
					}
				}
			}

			// Check wait times
			if waitDuration, exists := statsData["WaitDuration"]; exists {
				if waitTime, ok := waitDuration.(time.Duration); ok {
					if waitTime > dm.config.MaxConnectionWaitTime {
						dm.sendAlert(Alert{
							Timestamp: time.Now(),
							Severity:  SeverityWarning,
							Component: fmt.Sprintf("ConnectionPool-%s", poolType),
							Message:   fmt.Sprintf("Connection wait time high: %v", waitTime),
							Metrics:   statsData,
							Suggestion: "Consider increasing pool size or optimizing queries",
						})
					}
				}
			}
		}
	}
}

// monitorCircuitBreakers monitors circuit breaker status
func (dm *DatabaseMonitor) monitorCircuitBreakers() {
	cbMetrics := dm.service.GetCircuitBreakerMetrics()
	dm.mutex.Lock()
	dm.lastCBMetrics = cbMetrics
	dm.mutex.Unlock()

	openCircuitBreakers := 0
	for name, metrics := range cbMetrics {
		if cbData, ok := metrics.(map[string]interface{}); ok {
			if state, exists := cbData["state"]; exists && state == "OPEN" {
				openCircuitBreakers++
				dm.sendAlert(Alert{
					Timestamp: time.Now(),
					Severity:  SeverityError,
					Component: fmt.Sprintf("CircuitBreaker-%s", name),
					Message:   "Circuit breaker is OPEN - operations are being throttled",
					Metrics:   cbData,
					Suggestion: "Investigate underlying issues and consider manual reset if needed",
				})
			}
		}
	}

	if openCircuitBreakers > dm.config.MaxOpenCircuitBreakers {
		dm.sendAlert(Alert{
			Timestamp: time.Now(),
			Severity:  SeverityCritical,
			Component: "CircuitBreakerManager",
			Message:   fmt.Sprintf("Too many open circuit breakers: %d", openCircuitBreakers),
			Suggestion: "System under heavy stress - investigate immediately",
		})
	}
}

// sendAlert sends an alert to all registered handlers
func (dm *DatabaseMonitor) sendAlert(alert Alert) {
	dm.mutex.Lock()
	dm.alertHistory = append(dm.alertHistory, alert)
	if len(dm.alertHistory) > dm.maxAlertHistory {
		dm.alertHistory = dm.alertHistory[1:]
	}
	dm.mutex.Unlock()

	for _, handler := range dm.alertHandlers {
		if err := handler.Handle(alert); err != nil {
			log.Printf("Alert handler failed: %v", err)
		}
	}
}

// GetMonitoringSummary returns a summary of monitoring data
func (dm *DatabaseMonitor) GetMonitoringSummary() map[string]interface{} {
	dm.mutex.RLock()
	defer dm.mutex.RUnlock()

	return map[string]interface{}{
		"last_health_check":    dm.lastHealthCheck,
		"pool_stats":          dm.lastPoolStats,
		"circuit_breaker_metrics": dm.lastCBMetrics,
		"recent_alerts":       dm.getRecentAlerts(10),
		"total_alerts":        len(dm.alertHistory),
		"monitoring_active":   dm.ctx.Err() == nil,
	}
}

// getRecentAlerts returns the most recent alerts
func (dm *DatabaseMonitor) getRecentAlerts(count int) []Alert {
	if len(dm.alertHistory) <= count {
		return dm.alertHistory
	}
	return dm.alertHistory[len(dm.alertHistory)-count:]
}

// GetMonitoringJSON returns monitoring data as JSON
func (dm *DatabaseMonitor) GetMonitoringJSON() ([]byte, error) {
	summary := dm.GetMonitoringSummary()
	return json.MarshalIndent(summary, "", "  ")
}
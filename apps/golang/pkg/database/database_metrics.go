package database

import (
	"fmt"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// DatabaseMetrics tracks database operation metrics
type DatabaseMetrics struct {
	// Counters
	totalQueries       int64
	readQueries        int64
	writeQueries       int64
	transactionQueries int64
	slowQueries        int64
	failedQueries      int64

	// Timers
	totalQueryTime       int64 // nanoseconds
	readQueryTime        int64
	writeQueryTime       int64
	transactionQueryTime int64

	// Gauges
	activeConnections   int64
	maxConnections      int64
	connectionPoolUsage int64

	// Additional metrics
	averageResponseTime time.Duration
	p95ResponseTime     time.Duration
	p99ResponseTime     time.Duration

	// Thread safety
	mutex sync.RWMutex

	// Prometheus metrics (if enabled)
	prometheusMetrics *PrometheusMetrics

	// Configuration
	config *MetricsConfig
}

// MetricsConfig holds configuration for database metrics
type MetricsConfig struct {
	EnablePrometheus     bool          `mapstructure:"enable_prometheus"`
	EnableSlowQueryLog   bool          `mapstructure:"enable_slow_query_log"`
	SlowQueryThreshold   time.Duration `mapstructure:"slow_query_threshold"`
	MetricsFlushInterval time.Duration `mapstructure:"metrics_flush_interval"`
	MaxResponseTimes     int           `mapstructure:"max_response_times"`
	PrometheusNamespace  string        `mapstructure:"prometheus_namespace"`
	PrometheusSubsystem  string        `mapstructure:"prometheus_subsystem"`
}

// PrometheusMetrics holds Prometheus metric collectors
type PrometheusMetrics struct {
	// Counters
	queryTotal        *prometheus.CounterVec
	queryDuration     *prometheus.HistogramVec
	slowQueries       *prometheus.CounterVec
	connectionPool    *prometheus.GaugeVec
	activeConnections *prometheus.GaugeVec

	// Histogram buckets
	responseTimeBuckets []float64
}

// ResponseTimeEntry represents a response time entry for percentile calculation
type ResponseTimeEntry struct {
	Timestamp time.Time
	Duration  time.Duration
	Type      DatabaseOperationType
}

// DefaultMetricsConfig returns default metrics configuration
func DefaultMetricsConfig() *MetricsConfig {
	return &MetricsConfig{
		EnablePrometheus:     true,
		EnableSlowQueryLog:   true,
		SlowQueryThreshold:   1 * time.Second,
		MetricsFlushInterval: 30 * time.Second,
		MaxResponseTimes:     1000,
		PrometheusNamespace:  "agrinova",
		PrometheusSubsystem:  "database",
	}
}

// NewDatabaseMetrics creates a new database metrics collector
func NewDatabaseMetrics() *DatabaseMetrics {
	config := DefaultMetricsConfig()
	return NewDatabaseMetricsWithConfig(config)
}

// NewDatabaseMetricsWithConfig creates a new database metrics collector with custom configuration
func NewDatabaseMetricsWithConfig(config *MetricsConfig) *DatabaseMetrics {
	dm := &DatabaseMetrics{
		config: config,
	}

	// Initialize Prometheus metrics if enabled
	if config != nil && config.EnablePrometheus {
		dm.initPrometheusMetrics()
	}

	return dm
}

// initPrometheusMetrics initializes Prometheus metric collectors
func (dm *DatabaseMetrics) initPrometheusMetrics() {
	if dm.config == nil {
		return
	}
	namespace := dm.config.PrometheusNamespace
	subsystem := dm.config.PrometheusSubsystem

	// Define buckets first
	responseTimeBuckets := []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30}

	dm.prometheusMetrics = &PrometheusMetrics{
		responseTimeBuckets: responseTimeBuckets,

		queryTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Subsystem: subsystem,
				Name:      "queries_total",
				Help:      "Total number of database queries",
			},
			[]string{"type", "status"},
		),

		queryDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: namespace,
				Subsystem: subsystem,
				Name:      "query_duration_seconds",
				Help:      "Database query duration in seconds",
				Buckets:   responseTimeBuckets,
			},
			[]string{"type"},
		),

		slowQueries: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Subsystem: subsystem,
				Name:      "slow_queries_total",
				Help:      "Total number of slow database queries",
			},
			[]string{"type"},
		),

		connectionPool: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Namespace: namespace,
				Subsystem: subsystem,
				Name:      "connection_pool_usage",
				Help:      "Database connection pool usage",
			},
			[]string{"pool_type", "metric"},
		),

		activeConnections: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Namespace: namespace,
				Subsystem: subsystem,
				Name:      "active_connections",
				Help:      "Number of active database connections",
			},
			[]string{"connection_type"},
		),
	}

	log.Printf("Initialized Prometheus database metrics with namespace: %s.%s", namespace, subsystem)
}

// RecordQuery records a database query metric
func (dm *DatabaseMetrics) RecordQuery(dbCtx DatabaseContext, duration time.Duration, err error) {
	// Update counters
	atomic.AddInt64(&dm.totalQueries, 1)

	var opType string
	switch dbCtx.Type {
	case OperationTypeRead:
		atomic.AddInt64(&dm.readQueries, 1)
		opType = "read"
	case OperationTypeWrite:
		atomic.AddInt64(&dm.writeQueries, 1)
		opType = "write"
	case OperationTypeTransactional:
		atomic.AddInt64(&dm.transactionQueries, 1)
		opType = "transactional"
	default:
		opType = "unknown"
	}

	// Update timers
	durationNanos := duration.Nanoseconds()
	atomic.AddInt64(&dm.totalQueryTime, durationNanos)

	switch dbCtx.Type {
	case OperationTypeRead:
		atomic.AddInt64(&dm.readQueryTime, durationNanos)
	case OperationTypeWrite:
		atomic.AddInt64(&dm.writeQueryTime, durationNanos)
	case OperationTypeTransactional:
		atomic.AddInt64(&dm.transactionQueryTime, durationNanos)
	}

	// Record slow queries
	if dm.config != nil && duration > dm.config.SlowQueryThreshold {
		atomic.AddInt64(&dm.slowQueries, 1)

		if dm.config.EnableSlowQueryLog {
			log.Printf("SLOW QUERY: Type=%s, Duration=%v, Query=%s, Criticality=%s",
				opType, duration, dbCtx.Query, dbCtx.Criticality)
		}
	}

	// Record failed queries
	if err != nil {
		atomic.AddInt64(&dm.failedQueries, 1)
	}

	// Update Prometheus metrics
	if dm.prometheusMetrics != nil {
		status := "success"
		if err != nil {
			status = "error"
		}

		dm.prometheusMetrics.queryTotal.WithLabelValues(opType, status).Inc()
		dm.prometheusMetrics.queryDuration.WithLabelValues(opType).Observe(duration.Seconds())

		if dm.config != nil && duration > dm.config.SlowQueryThreshold {
			dm.prometheusMetrics.slowQueries.WithLabelValues(opType).Inc()
		}
	}
}

// RecordConnectionMetrics records connection pool metrics
func (dm *DatabaseMetrics) RecordConnectionMetrics(poolType string, open, idle, inUse, maxConn int) {
	// Update atomic counters
	atomic.StoreInt64(&dm.activeConnections, int64(inUse))
	atomic.StoreInt64(&dm.maxConnections, int64(maxConn))

	// Calculate pool usage percentage
	if maxConn > 0 {
		usage := float64(open) / float64(maxConn)
		atomic.StoreInt64(&dm.connectionPoolUsage, int64(usage*100))
	}

	// Update Prometheus metrics
	if dm.prometheusMetrics != nil {
		dm.prometheusMetrics.connectionPool.WithLabelValues(poolType, "open").Set(float64(open))
		dm.prometheusMetrics.connectionPool.WithLabelValues(poolType, "idle").Set(float64(idle))
		dm.prometheusMetrics.connectionPool.WithLabelValues(poolType, "in_use").Set(float64(inUse))
		dm.prometheusMetrics.connectionPool.WithLabelValues(poolType, "max").Set(float64(maxConn))
		dm.prometheusMetrics.activeConnections.WithLabelValues(poolType).Set(float64(inUse))
	}
}

// GetMetrics returns current metrics
func (dm *DatabaseMetrics) GetMetrics() map[string]interface{} {
	dm.mutex.RLock()
	defer dm.mutex.RUnlock()

	totalQueries := atomic.LoadInt64(&dm.totalQueries)
	readQueries := atomic.LoadInt64(&dm.readQueries)
	writeQueries := atomic.LoadInt64(&dm.writeQueries)
	transactionQueries := atomic.LoadInt64(&dm.transactionQueries)
	slowQueries := atomic.LoadInt64(&dm.slowQueries)
	failedQueries := atomic.LoadInt64(&dm.failedQueries)

	totalQueryTime := atomic.LoadInt64(&dm.totalQueryTime)
	readQueryTime := atomic.LoadInt64(&dm.readQueryTime)
	writeQueryTime := atomic.LoadInt64(&dm.writeQueryTime)
	transactionQueryTime := atomic.LoadInt64(&dm.transactionQueryTime)

	activeConnections := atomic.LoadInt64(&dm.activeConnections)
	maxConnections := atomic.LoadInt64(&dm.maxConnections)

	metrics := map[string]interface{}{
		"counters": map[string]interface{}{
			"total_queries":       totalQueries,
			"read_queries":        readQueries,
			"write_queries":       writeQueries,
			"transaction_queries": transactionQueries,
			"slow_queries":        slowQueries,
			"failed_queries":      failedQueries,
		},
		"timers": map[string]interface{}{
			"total_query_time_ms":       totalQueryTime / 1000000,
			"read_query_time_ms":        readQueryTime / 1000000,
			"write_query_time_ms":       writeQueryTime / 1000000,
			"transaction_query_time_ms": transactionQueryTime / 1000000,
		},
		"gauges": map[string]interface{}{
			"active_connections":    activeConnections,
			"max_connections":       maxConnections,
			"connection_pool_usage": atomic.LoadInt64(&dm.connectionPoolUsage),
		},
		"averages": dm.calculateAverages(totalQueries, totalQueryTime, readQueries, readQueryTime,
			writeQueries, writeQueryTime, transactionQueries, transactionQueryTime),
	}

	return metrics
}

// calculateAverages calculates average response times for different query types
func (dm *DatabaseMetrics) calculateAverages(totalQueries, totalQueryTime, readQueries, readQueryTime,
	writeQueries, writeQueryTime, transactionQueries, transactionQueryTime int64) map[string]interface{} {

	averages := make(map[string]interface{})

	if totalQueries > 0 {
		averages["average_response_time_ms"] = float64(totalQueryTime) / float64(totalQueries) / 1000000
	}

	if readQueries > 0 {
		averages["average_read_time_ms"] = float64(readQueryTime) / float64(readQueries) / 1000000
	}

	if writeQueries > 0 {
		averages["average_write_time_ms"] = float64(writeQueryTime) / float64(writeQueries) / 1000000
	}

	if transactionQueries > 0 {
		averages["average_transaction_time_ms"] = float64(transactionQueryTime) / float64(transactionQueries) / 1000000
	}

	return averages
}

// Reset resets all metrics to zero
func (dm *DatabaseMetrics) Reset() {
	dm.mutex.Lock()
	defer dm.mutex.Unlock()

	atomic.StoreInt64(&dm.totalQueries, 0)
	atomic.StoreInt64(&dm.readQueries, 0)
	atomic.StoreInt64(&dm.writeQueries, 0)
	atomic.StoreInt64(&dm.transactionQueries, 0)
	atomic.StoreInt64(&dm.slowQueries, 0)
	atomic.StoreInt64(&dm.failedQueries, 0)

	atomic.StoreInt64(&dm.totalQueryTime, 0)
	atomic.StoreInt64(&dm.readQueryTime, 0)
	atomic.StoreInt64(&dm.writeQueryTime, 0)
	atomic.StoreInt64(&dm.transactionQueryTime, 0)

	atomic.StoreInt64(&dm.activeConnections, 0)
	atomic.StoreInt64(&dm.maxConnections, 0)
	atomic.StoreInt64(&dm.connectionPoolUsage, 0)

	log.Println("Reset database metrics")
}

// GetSlowQueries returns the number of slow queries
func (dm *DatabaseMetrics) GetSlowQueries() int64 {
	return atomic.LoadInt64(&dm.slowQueries)
}

// GetFailedQueries returns the number of failed queries
func (dm *DatabaseMetrics) GetFailedQueries() int64 {
	return atomic.LoadInt64(&dm.failedQueries)
}

// GetTotalQueries returns the total number of queries
func (dm *DatabaseMetrics) GetTotalQueries() int64 {
	return atomic.LoadInt64(&dm.totalQueries)
}

// GetQueryStats returns detailed query statistics
func (dm *DatabaseMetrics) GetQueryStats() map[string]interface{} {
	totalQueries := atomic.LoadInt64(&dm.totalQueries)
	readQueries := atomic.LoadInt64(&dm.readQueries)
	writeQueries := atomic.LoadInt64(&dm.writeQueries)
	transactionQueries := atomic.LoadInt64(&dm.transactionQueries)
	slowQueries := atomic.LoadInt64(&dm.slowQueries)
	failedQueries := atomic.LoadInt64(&dm.failedQueries)

	if totalQueries == 0 {
		return map[string]interface{}{
			"total":           0,
			"read":            0,
			"write":           0,
			"transactional":   0,
			"slow":            0,
			"failed":          0,
			"success_rate":    0.0,
			"slow_query_rate": 0.0,
		}
	}

	successRate := float64(totalQueries-failedQueries) / float64(totalQueries) * 100
	slowQueryRate := float64(slowQueries) / float64(totalQueries) * 100

	return map[string]interface{}{
		"total":           totalQueries,
		"read":            readQueries,
		"write":           writeQueries,
		"transactional":   transactionQueries,
		"slow":            slowQueries,
		"failed":          failedQueries,
		"success_rate":    successRate,
		"slow_query_rate": slowQueryRate,
	}
}

// ExportPrometheusMetrics returns a map of Prometheus metrics for exporting
func (dm *DatabaseMetrics) ExportPrometheusMetrics() (map[string]float64, error) {
	if dm.prometheusMetrics == nil {
		return nil, fmt.Errorf("Prometheus metrics not enabled")
	}

	// This would typically be handled by the Prometheus HTTP handler
	// For now, return the current metric values
	metrics := dm.GetMetrics()
	result := make(map[string]float64)

	// Convert counters
	if counters, ok := metrics["counters"].(map[string]interface{}); ok {
		for key, value := range counters {
			if floatVal, ok := value.(int64); ok {
				result["counter_"+key] = float64(floatVal)
			}
		}
	}

	return result, nil
}

// StartMetricsCollection starts background metrics collection (if needed)
func (dm *DatabaseMetrics) StartMetricsCollection() {
	// This could be used for periodic metric collection or cleanup
	// For now, metrics are collected synchronously
	log.Println("Database metrics collection started")
}

// StopMetricsCollection stops background metrics collection
func (dm *DatabaseMetrics) StopMetricsCollection() {
	log.Println("Database metrics collection stopped")
}

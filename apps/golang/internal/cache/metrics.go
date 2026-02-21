package cache

import (
	"sync"
	"time"
)

// MetricsCollector collects cache performance metrics
type MetricsCollector struct {
	mu sync.RWMutex

	// Hit/Miss statistics
	hits   int64
	misses int64

	// Operation statistics
	operations map[string]*OperationStats

	// Timing statistics
	totalLatencyMs  float64
	minLatencyMs    float64
	maxLatencyMs    float64
	avgLatencyMs    float64

	// Metadata
	startTime time.Time
}

// OperationStats holds statistics for a specific operation type
type OperationStats struct {
	Count          int64
	TotalLatencyMs float64
	MinLatencyMs   float64
	MaxLatencyMs   float64
	AvgLatencyMs   float64
	LastOperation  time.Time
}

// CacheMetrics represents cache performance metrics
type CacheMetrics struct {
	Hits            int64                      `json:"hits"`
	Misses          int64                      `json:"misses"`
	TotalRequests   int64                      `json:"total_requests"`
	HitRate         float64                    `json:"hit_rate"`
	MissRate        float64                    `json:"miss_rate"`
	AvgLatencyMs    float64                    `json:"avg_latency_ms"`
	MinLatencyMs    float64                    `json:"min_latency_ms"`
	MaxLatencyMs    float64                    `json:"max_latency_ms"`
	Operations      map[string]*OperationStats `json:"operations"`
	UptimeSeconds   int64                      `json:"uptime_seconds"`
	LastUpdated     time.Time                  `json:"last_updated"`
}

// NewMetricsCollector creates a new metrics collector
func NewMetricsCollector() *MetricsCollector {
	return &MetricsCollector{
		operations: make(map[string]*OperationStats),
		startTime:  time.Now(),
	}
}

// RecordCacheHit records a cache hit
func (m *MetricsCollector) RecordCacheHit() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.hits++
}

// RecordCacheMiss records a cache miss
func (m *MetricsCollector) RecordCacheMiss() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.misses++
}

// RecordOperation records an operation with its duration
func (m *MetricsCollector) RecordOperation(operation string, duration time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()

	latencyMs := float64(duration.Microseconds()) / 1000.0

	// Update total statistics
	m.totalLatencyMs += latencyMs

	if m.minLatencyMs == 0 || latencyMs < m.minLatencyMs {
		m.minLatencyMs = latencyMs
	}

	if latencyMs > m.maxLatencyMs {
		m.maxLatencyMs = latencyMs
	}

	totalOps := m.hits + m.misses
	if totalOps > 0 {
		m.avgLatencyMs = m.totalLatencyMs / float64(totalOps)
	}

	// Update operation-specific statistics
	stats, exists := m.operations[operation]
	if !exists {
		stats = &OperationStats{
			MinLatencyMs: latencyMs,
		}
		m.operations[operation] = stats
	}

	stats.Count++
	stats.TotalLatencyMs += latencyMs
	stats.LastOperation = time.Now()

	if latencyMs < stats.MinLatencyMs {
		stats.MinLatencyMs = latencyMs
	}

	if latencyMs > stats.MaxLatencyMs {
		stats.MaxLatencyMs = latencyMs
	}

	stats.AvgLatencyMs = stats.TotalLatencyMs / float64(stats.Count)
}

// GetMetrics returns current cache metrics
func (m *MetricsCollector) GetMetrics() CacheMetrics {
	m.mu.RLock()
	defer m.mu.RUnlock()

	totalRequests := m.hits + m.misses
	var hitRate, missRate float64

	if totalRequests > 0 {
		hitRate = float64(m.hits) / float64(totalRequests) * 100
		missRate = float64(m.misses) / float64(totalRequests) * 100
	}

	uptime := time.Since(m.startTime).Seconds()

	// Create a copy of operations map
	operationsCopy := make(map[string]*OperationStats)
	for op, stats := range m.operations {
		statsCopy := *stats
		operationsCopy[op] = &statsCopy
	}

	return CacheMetrics{
		Hits:          m.hits,
		Misses:        m.misses,
		TotalRequests: totalRequests,
		HitRate:       hitRate,
		MissRate:      missRate,
		AvgLatencyMs:  m.avgLatencyMs,
		MinLatencyMs:  m.minLatencyMs,
		MaxLatencyMs:  m.maxLatencyMs,
		Operations:    operationsCopy,
		UptimeSeconds: int64(uptime),
		LastUpdated:   time.Now(),
	}
}

// Reset resets all metrics
func (m *MetricsCollector) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.hits = 0
	m.misses = 0
	m.totalLatencyMs = 0
	m.minLatencyMs = 0
	m.maxLatencyMs = 0
	m.avgLatencyMs = 0
	m.operations = make(map[string]*OperationStats)
	m.startTime = time.Now()
}

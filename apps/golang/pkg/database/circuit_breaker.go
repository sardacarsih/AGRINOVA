package database

import (
	"context"
	"fmt"
	"log"
	"sync"
	"sync/atomic"
	"time"
)

// CircuitState represents the state of the circuit breaker
type CircuitState int

const (
	StateClosed CircuitState = iota
	StateOpen
	StateHalfOpen
)

// String returns string representation of circuit state
func (s CircuitState) String() string {
	switch s {
	case StateClosed:
		return "CLOSED"
	case StateOpen:
		return "OPEN"
	case StateHalfOpen:
		return "HALF_OPEN"
	default:
		return "UNKNOWN"
	}
}

// CircuitBreakerConfig holds configuration for the circuit breaker
type CircuitBreakerConfig struct {
	// Maximum number of failures before opening the circuit
	MaxFailures int

	// Duration to wait before transitioning from OPEN to HALF_OPEN
	RecoveryTimeout time.Duration

	// Number of successful operations required in HALF_OPEN to close the circuit
	RequiredSuccesses int

	// Maximum number of operations allowed in HALF_OPEN state
	MaxHalfOpenRequests int
}

// DefaultCircuitBreakerConfig returns sensible defaults
func DefaultCircuitBreakerConfig() CircuitBreakerConfig {
	return CircuitBreakerConfig{
		MaxFailures:         5,
		RecoveryTimeout:     30 * time.Second,
		RequiredSuccesses:   3,
		MaxHalfOpenRequests: 5,
	}
}

// CircuitBreaker implements the circuit breaker pattern for database operations
type CircuitBreaker struct {
	name           string
	config         CircuitBreakerConfig
	state          CircuitState
	failures       int64
	successes      int64
	lastFailTime   time.Time
	halfOpenCount  int64
	mutex          sync.RWMutex

	// Metrics
	requestCount    int64
	successCount    int64
	errorCount      int64
	circuitOpenTime time.Time
}

// NewCircuitBreaker creates a new circuit breaker
func NewCircuitBreaker(name string, config CircuitBreakerConfig) *CircuitBreaker {
	return &CircuitBreaker{
		name:   name,
		config: config,
		state:  StateClosed,
	}
}

// Execute runs the operation if the circuit allows it
func (cb *CircuitBreaker) Execute(ctx context.Context, operation func() error) error {
	atomic.AddInt64(&cb.requestCount, 1)

	if !cb.canExecute() {
		atomic.AddInt64(&cb.errorCount, 1)
		return fmt.Errorf("circuit breaker %s is OPEN", cb.name)
	}

	err := operation()
	cb.recordResult(err)

	if err != nil {
		atomic.AddInt64(&cb.errorCount, 1)
	} else {
		atomic.AddInt64(&cb.successCount, 1)
	}

	return err
}

// canExecute determines if an operation should be allowed
func (cb *CircuitBreaker) canExecute() bool {
	cb.mutex.RLock()
	defer cb.mutex.RUnlock()

	switch cb.state {
	case StateClosed:
		return true
	case StateOpen:
		// Check if recovery timeout has passed
		if time.Since(cb.lastFailTime) >= cb.config.RecoveryTimeout {
			cb.mutex.RUnlock()
			cb.mutex.Lock()
			// Double-check after acquiring write lock
			if cb.state == StateOpen && time.Since(cb.lastFailTime) >= cb.config.RecoveryTimeout {
				cb.state = StateHalfOpen
				cb.halfOpenCount = 0
				log.Printf("Circuit breaker %s transitioning from OPEN to HALF_OPEN", cb.name)
			}
			cb.mutex.Unlock()
			cb.mutex.RLock()
			return cb.state == StateHalfOpen
		}
		return false
	case StateHalfOpen:
		// Allow limited number of requests in HALF_OPEN state
		return atomic.LoadInt64(&cb.halfOpenCount) < int64(cb.config.MaxHalfOpenRequests)
	default:
		return false
	}
}

// recordResult records the result of an operation
func (cb *CircuitBreaker) recordResult(err error) {
	cb.mutex.Lock()
	defer cb.mutex.Unlock()

	if err != nil {
		cb.onFailure()
	} else {
		cb.onSuccess()
	}
}

// onFailure handles operation failure
func (cb *CircuitBreaker) onFailure() {
	atomic.AddInt64(&cb.failures, 1)
	cb.lastFailTime = time.Now()

	switch cb.state {
	case StateClosed:
		if atomic.LoadInt64(&cb.failures) >= int64(cb.config.MaxFailures) {
			cb.state = StateOpen
			cb.circuitOpenTime = time.Now()
			log.Printf("Circuit breaker %s OPENED after %d failures", cb.name, cb.config.MaxFailures)
		}
	case StateHalfOpen:
		cb.state = StateOpen
		cb.circuitOpenTime = time.Now()
		log.Printf("Circuit breaker %s re-OPENED during HALF_OPEN testing", cb.name)
	}
}

// onSuccess handles operation success
func (cb *CircuitBreaker) onSuccess() {
	atomic.AddInt64(&cb.successes, 1)

	switch cb.state {
	case StateHalfOpen:
		if atomic.LoadInt64(&cb.successes) >= int64(cb.config.RequiredSuccesses) {
			cb.state = StateClosed
			atomic.StoreInt64(&cb.failures, 0)
			atomic.StoreInt64(&cb.successes, 0)
			log.Printf("Circuit breaker %s CLOSED after %d successful operations", cb.name, cb.config.RequiredSuccesses)
		}
	}
}

// GetState returns the current circuit breaker state
func (cb *CircuitBreaker) GetState() CircuitState {
	cb.mutex.RLock()
	defer cb.mutex.RUnlock()
	return cb.state
}

// GetMetrics returns circuit breaker metrics
func (cb *CircuitBreaker) GetMetrics() map[string]interface{} {
	cb.mutex.RLock()
	defer cb.mutex.RUnlock()

	return map[string]interface{}{
		"name":                cb.name,
		"state":               cb.state.String(),
		"failures":            atomic.LoadInt64(&cb.failures),
		"successes":           atomic.LoadInt64(&cb.successes),
		"half_open_requests":  atomic.LoadInt64(&cb.halfOpenCount),
		"total_requests":      atomic.LoadInt64(&cb.requestCount),
		"total_successes":     atomic.LoadInt64(&cb.successCount),
		"total_errors":        atomic.LoadInt64(&cb.errorCount),
		"last_failure_time":   cb.lastFailTime,
		"circuit_open_time":   cb.circuitOpenTime,
	}
}

// Reset resets the circuit breaker to CLOSED state
func (cb *CircuitBreaker) Reset() {
	cb.mutex.Lock()
	defer cb.mutex.Unlock()

	cb.state = StateClosed
	atomic.StoreInt64(&cb.failures, 0)
	atomic.StoreInt64(&cb.successes, 0)
	atomic.StoreInt64(&cb.halfOpenCount, 0)
	cb.lastFailTime = time.Time{}

	log.Printf("Circuit breaker %s manually reset to CLOSED state", cb.name)
}

// CircuitBreakerManager manages multiple circuit breakers
type CircuitBreakerManager struct {
	breakers map[string]*CircuitBreaker
	mutex    sync.RWMutex
}

// NewCircuitBreakerManager creates a new circuit breaker manager
func NewCircuitBreakerManager() *CircuitBreakerManager {
	return &CircuitBreakerManager{
		breakers: make(map[string]*CircuitBreaker),
	}
}

// GetBreaker returns a circuit breaker by name, creating one if it doesn't exist
func (cbm *CircuitBreakerManager) GetBreaker(name string, config CircuitBreakerConfig) *CircuitBreaker {
	cbm.mutex.RLock()
	if breaker, exists := cbm.breakers[name]; exists {
		cbm.mutex.RUnlock()
		return breaker
	}
	cbm.mutex.RUnlock()

	cbm.mutex.Lock()
	defer cbm.mutex.Unlock()

	// Double-check after acquiring write lock
	if breaker, exists := cbm.breakers[name]; exists {
		return breaker
	}

	breaker := NewCircuitBreaker(name, config)
	cbm.breakers[name] = breaker
	log.Printf("Created circuit breaker %s", name)

	return breaker
}

// GetAllMetrics returns metrics for all circuit breakers
func (cbm *CircuitBreakerManager) GetAllMetrics() map[string]interface{} {
	cbm.mutex.RLock()
	defer cbm.mutex.RUnlock()

	metrics := make(map[string]interface{})
	for name, breaker := range cbm.breakers {
		metrics[name] = breaker.GetMetrics()
	}

	return metrics
}

// ResetAll resets all circuit breakers to CLOSED state
func (cbm *CircuitBreakerManager) ResetAll() {
	cbm.mutex.RLock()
	defer cbm.mutex.RUnlock()

	for name, breaker := range cbm.breakers {
		breaker.Reset()
		log.Printf("Reset circuit breaker %s", name)
	}
}
package logging

import (
	"io"
	"os"
)

// =============================================================================
// Configuration Types
// =============================================================================

// LogFormat represents the log output format
type LogFormat string

const (
	LogFormatJSON LogFormat = "json"
	LogFormatText LogFormat = "text"
)

// LoggerConfig holds configuration for the logger
type LoggerConfig struct {
	// Log level (0=DEBUG, 1=INFO, 2=WARN, 3=ERROR, 4=FATAL)
	Level int `json:"level" yaml:"level" mapstructure:"level"`

	// Output format (json or text)
	Format LogFormat `json:"format" yaml:"format" mapstructure:"format"`

	// Output destination (default: os.Stdout)
	Output io.Writer `json:"-" yaml:"-" mapstructure:"-"`

	// Enable caller information in logs
	EnableCaller bool `json:"enable_caller" yaml:"enable_caller" mapstructure:"enable_caller"`

	// Additional metadata to include in all logs
	Metadata map[string]interface{} `json:"metadata" yaml:"metadata" mapstructure:"metadata"`

	// Rate limiting configuration
	RateLimit *RateLimitConfig `json:"rate_limit" yaml:"rate_limit" mapstructure:"rate_limit"`

	// Sampling configuration
	Sampling *SamplingConfig `json:"sampling" yaml:"sampling" mapstructure:"sampling"`
}

// RateLimitConfig controls rate limiting of log messages
type RateLimitConfig struct {
	// Maximum number of log messages per second
	MaxMessagesPerSecond int `json:"max_messages_per_second" yaml:"max_messages_per_second" mapstructure:"max_messages_per_second"`

	// Maximum number of log messages per minute
	MaxMessagesPerMinute int `json:"max_messages_per_minute" yaml:"max_messages_per_minute" mapstructure:"max_messages_per_minute"`

	// Burst size for rate limiting
	BurstSize int `json:"burst_size" yaml:"burst_size" mapstructure:"burst_size"`

	// Enable rate limiting for error messages
	LimitErrors bool `json:"limit_errors" yaml:"limit_errors" mapstructure:"limit_errors"`

	// Enable rate limiting for warning messages
	LimitWarnings bool `json:"limit_warnings" yaml:"limit_warnings" mapstructure:"limit_warnings"`
}

// SamplingConfig controls sampling of high-frequency log messages
type SamplingConfig struct {
	// Enable sampling
	Enabled bool `json:"enabled" yaml:"enabled" mapstructure:"enabled"`

	// Sample rate (0.0 to 1.0)
	// 0.1 = log 10% of messages
	// 1.0 = log all messages
	Rate float64 `json:"rate" yaml:"rate" mapstructure:"rate"`

	// Sample rate by level
	ByLevel map[string]float64 `json:"by_level" yaml:"by_level" mapstructure:"by_level"`

	// Sample rate by message prefix
	ByPrefix map[string]float64 `json:"by_prefix" yaml:"by_prefix" mapstructure:"by_prefix"`

	// Maximum number of unique samples to track
	MaxSamples int `json:"max_samples" yaml:"max_samples" mapstructure:"max_samples"`
}

// =============================================================================
// Default Configurations
// =============================================================================

// DefaultLoggerConfig returns a default logger configuration
func DefaultLoggerConfig() LoggerConfig {
	return LoggerConfig{
		Level:        int(LogLevelInfo),
		Format:       LogFormatJSON,
		Output:       os.Stdout,
		EnableCaller: false,
		Metadata: map[string]interface{}{
			"service": "agrinova-auth",
			"version": "1.0.0",
		},
		RateLimit: &RateLimitConfig{
			MaxMessagesPerSecond: 1000,
			MaxMessagesPerMinute: 10000,
			BurstSize:            100,
			LimitErrors:          false,
			LimitWarnings:        true,
		},
		Sampling: &SamplingConfig{
			Enabled:   false,
			Rate:      1.0,
			ByLevel:   make(map[string]float64),
			ByPrefix:  make(map[string]float64),
			MaxSamples: 1000,
		},
	}
}

// DevelopmentLoggerConfig returns a configuration suitable for development
func DevelopmentLoggerConfig() LoggerConfig {
	config := DefaultLoggerConfig()
	config.Level = int(LogLevelDebug)
	config.Format = LogFormatText
	config.EnableCaller = true
	config.Metadata["environment"] = "development"

	// Disable rate limiting in development
	config.RateLimit = nil
	config.Sampling = nil

	return config
}

// ProductionLoggerConfig returns a configuration suitable for production
func ProductionLoggerConfig() LoggerConfig {
	config := DefaultLoggerConfig()
	config.Level = int(LogLevelInfo)
	config.Format = LogFormatJSON
	config.EnableCaller = false
	config.Metadata["environment"] = "production"

	// Enable sampling for high-frequency events
	config.Sampling = &SamplingConfig{
		Enabled: true,
		Rate:    0.1, // Sample 10% of messages
		ByLevel: map[string]float64{
			"DEBUG": 0.01,  // 1% of debug messages
			"INFO":  0.1,   // 10% of info messages
			"WARN":  0.5,   // 50% of warning messages
			"ERROR": 1.0,   // 100% of error messages
		},
		ByPrefix: map[string]float64{
			"HTTP request":     0.01,  // Sample only 1% of HTTP requests
			"Database query":   0.001, // Sample only 0.1% of DB queries
			"Cache hit":        0.001, // Sample only 0.1% of cache hits
		},
		MaxSamples: 10000,
	}

	return config
}

// TestLoggerConfig returns a configuration suitable for testing
func TestLoggerConfig() LoggerConfig {
	config := DefaultLoggerConfig()
	config.Level = int(LogLevelWarn)
	config.Format = LogFormatText
	config.EnableCaller = false
	config.Metadata["environment"] = "test"

	// Minimal logging for tests
	config.RateLimit = nil
	config.Sampling = nil

	return config
}

// =============================================================================
// Environment-specific Configuration Loading
// =============================================================================

// LoadConfigFromEnv loads configuration from environment variables
func LoadConfigFromEnv() LoggerConfig {
	config := DefaultLoggerConfig()

	// Override with environment variables if present
	if level := os.Getenv("LOG_LEVEL"); level != "" {
		switch level {
		case "DEBUG":
			config.Level = int(LogLevelDebug)
		case "INFO":
			config.Level = int(LogLevelInfo)
		case "WARN":
			config.Level = int(LogLevelWarn)
		case "ERROR":
			config.Level = int(LogLevelError)
		case "FATAL":
			config.Level = int(LogLevelFatal)
		}
	}

	if format := os.Getenv("LOG_FORMAT"); format != "" {
		switch format {
		case "json":
			config.Format = LogFormatJSON
		case "text":
			config.Format = LogFormatText
		}
	}

	if env := os.Getenv("APP_ENV"); env != "" {
		config.Metadata["environment"] = env

		// Adjust configuration based on environment
		switch env {
		case "development":
			config.EnableCaller = true
		case "production":
			config.EnableCaller = false
		}
	}

	if service := os.Getenv("SERVICE_NAME"); service != "" {
		config.Metadata["service"] = service
	}

	if version := os.Getenv("APP_VERSION"); version != "" {
		config.Metadata["version"] = version
	}

	return config
}

// =============================================================================
// Validation
// =============================================================================

// Validate validates the logger configuration
func (c *LoggerConfig) Validate() error {
	// Validate log level
	if c.Level < int(LogLevelDebug) || c.Level > int(LogLevelFatal) {
		c.Level = int(LogLevelInfo)
	}

	// Validate format
	if c.Format != LogFormatJSON && c.Format != LogFormatText {
		c.Format = LogFormatJSON
	}

	// Validate rate limit config
	if c.RateLimit != nil {
		if c.RateLimit.MaxMessagesPerSecond <= 0 {
			c.RateLimit.MaxMessagesPerSecond = 1000
		}
		if c.RateLimit.MaxMessagesPerMinute <= 0 {
			c.RateLimit.MaxMessagesPerMinute = 10000
		}
		if c.RateLimit.BurstSize <= 0 {
			c.RateLimit.BurstSize = 100
		}
	}

	// Validate sampling config
	if c.Sampling != nil {
		if c.Sampling.Rate < 0.0 || c.Sampling.Rate > 1.0 {
			c.Sampling.Rate = 1.0
		}
		if c.Sampling.MaxSamples <= 0 {
			c.Sampling.MaxSamples = 1000
		}
	}

	// Ensure output is set
	if c.Output == nil {
		c.Output = os.Stdout
	}

	return nil
}
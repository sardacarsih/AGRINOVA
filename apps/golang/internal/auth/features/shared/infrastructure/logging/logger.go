package logging

import (
	"context"
	"fmt"
	"os"
	"runtime"
	"time"

	"github.com/sirupsen/logrus"
)

// =============================================================================
// Logger Interface
// =============================================================================

// Logger defines the logging interface used throughout the auth module
type Logger interface {
	// Standard logging methods
	Debug(msg string, fields ...Field)
	Info(msg string, fields ...Field)
	Warn(msg string, fields ...Field)
	Error(msg string, err error, fields ...Field)
	Fatal(msg string, err error, fields ...Field)

	// Context-aware logging
	WithContext(ctx context.Context) Logger
	WithFields(fields ...Field) Logger
	WithError(err error) Logger

	// Configuration
	SetLevel(level LogLevel)
	GetLevel() LogLevel

	// Security logging
	Security(event string, fields ...Field)

	// Performance logging
	Performance(operation string, duration time.Duration, fields ...Field)

	// Request logging
	Request(method, path string, statusCode int, duration time.Duration, fields ...Field)
}

// LogLevel represents the logging level
type LogLevel int

const (
	LogLevelDebug LogLevel = iota
	LogLevelInfo
	LogLevelWarn
	LogLevelError
	LogLevelFatal
)

// String returns the string representation of the log level
func (l LogLevel) String() string {
	switch l {
	case LogLevelDebug:
		return "DEBUG"
	case LogLevelInfo:
		return "INFO"
	case LogLevelWarn:
		return "WARN"
	case LogLevelError:
		return "ERROR"
	case LogLevelFatal:
		return "FATAL"
	default:
		return "UNKNOWN"
	}
}

// =============================================================================
// Field Implementation
// =============================================================================

// Field represents a key-value pair for structured logging
type Field struct {
	Key   string
	Value interface{}
}

// Field constructors
func String(key, value string) Field {
	return Field{Key: key, Value: value}
}

func Int(key string, value int) Field {
	return Field{Key: key, Value: value}
}

func Int64(key string, value int64) Field {
	return Field{Key: key, Value: value}
}

func Float64(key string, value float64) Field {
	return Field{Key: key, Value: value}
}

func Bool(key string, value bool) Field {
	return Field{Key: key, Value: value}
}

func Duration(key string, value time.Duration) Field {
	return Field{Key: key, Value: value}
}

func Time(key string, value time.Time) Field {
	return Field{Key: key, Value: value}
}

func Any(key string, value interface{}) Field {
	return Field{Key: key, Value: value}
}

func Err(err error) Field {
	return Field{Key: "error", Value: err}
}

// =============================================================================
// Structured Logger Implementation
// =============================================================================

// structuredLogger implements the Logger interface using logrus
type structuredLogger struct {
	logger   *logrus.Logger
	level    LogLevel
	context  context.Context
	fields   logrus.Fields
	metadata map[string]interface{}
}

// NewStructuredLogger creates a new structured logger
func NewStructuredLogger(config LoggerConfig) Logger {
	logger := logrus.New()

	// Set output
	if config.Output != nil {
		logger.SetOutput(config.Output)
	}

	// Set formatter
	switch config.Format {
	case LogFormatJSON:
		logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: time.RFC3339,
			FieldMap: logrus.FieldMap{
				logrus.FieldKeyTime:  "timestamp",
				logrus.FieldKeyLevel: "level",
				logrus.FieldKeyMsg:   "message",
				logrus.FieldKeyFunc:  "function",
				logrus.FieldKeyFile:  "file",
			},
		})
	case LogFormatText:
		logger.SetFormatter(&logrus.TextFormatter{
			FullTimestamp:   true,
			TimestampFormat: time.RFC3339,
		})
	}

	// Set level
	logger.SetLevel(logrus.Level(config.Level))

	// Enable caller reporting
	logger.SetReportCaller(config.EnableCaller)

	return &structuredLogger{
		logger:   logger,
		level:    LogLevel(config.Level),
		fields:   make(logrus.Fields),
		metadata: config.Metadata,
	}
}

// Debug logs a debug message
func (l *structuredLogger) Debug(msg string, fields ...Field) {
	if l.level > LogLevelDebug {
		return
	}

	entry := l.createEntry(fields...)
	entry.Debug(msg)
}

// Info logs an info message
func (l *structuredLogger) Info(msg string, fields ...Field) {
	if l.level > LogLevelInfo {
		return
	}

	entry := l.createEntry(fields...)
	entry.Info(msg)
}

// Warn logs a warning message
func (l *structuredLogger) Warn(msg string, fields ...Field) {
	if l.level > LogLevelWarn {
		return
	}

	entry := l.createEntry(fields...)
	entry.Warn(msg)
}

// Error logs an error message
func (l *structuredLogger) Error(msg string, err error, fields ...Field) {
	if l.level > LogLevelError {
		return
	}

	entry := l.createEntry(fields...)
	if err != nil {
		entry = entry.WithError(err)
	}
	entry.Error(msg)
}

// Fatal logs a fatal message and exits
func (l *structuredLogger) Fatal(msg string, err error, fields ...Field) {
	entry := l.createEntry(fields...)
	if err != nil {
		entry = entry.WithError(err)
	}
	entry.Fatal(msg)
}

// WithContext adds context to the logger
func (l *structuredLogger) WithContext(ctx context.Context) Logger {
	return &structuredLogger{
		logger:   l.logger,
		level:    l.level,
		context:  ctx,
		fields:   l.fields,
		metadata: l.metadata,
	}
}

// WithFields adds fields to the logger
func (l *structuredLogger) WithFields(fields ...Field) Logger {
	newLogger := &structuredLogger{
		logger:   l.logger,
		level:    l.level,
		context:  l.context,
		fields:   make(logrus.Fields),
		metadata: l.metadata,
	}

	// Copy existing fields
	for k, v := range l.fields {
		newLogger.fields[k] = v
	}

	// Add new fields
	for _, field := range fields {
		newLogger.fields[field.Key] = field.Value
	}

	return newLogger
}

// WithError adds an error field to the logger
func (l *structuredLogger) WithError(err error) Logger {
	return l.WithFields(Err(err))
}

// SetLevel sets the logging level
func (l *structuredLogger) SetLevel(level LogLevel) {
	l.level = level
	l.logger.SetLevel(logrus.Level(level))
}

// GetLevel returns the current logging level
func (l *structuredLogger) GetLevel() LogLevel {
	return l.level
}

// Security logs security events
func (l *structuredLogger) Security(event string, fields ...Field) {
	logFields := []Field{
		String("event_type", "security"),
		String("security_event", event),
		Time("timestamp", time.Now()),
	}
	logFields = append(logFields, fields...)

	entry := l.createEntry(logFields...)
	entry.Info("Security event")
}

// Performance logs performance metrics
func (l *structuredLogger) Performance(operation string, duration time.Duration, fields ...Field) {
	logFields := []Field{
		String("event_type", "performance"),
		String("operation", operation),
		Duration("duration", duration),
		Float64("duration_ms", float64(duration.Nanoseconds())/1e6),
	}
	logFields = append(logFields, fields...)

	entry := l.createEntry(logFields...)
	entry.Info("Performance metric")
}

// Request logs HTTP request information
func (l *structuredLogger) Request(method, path string, statusCode int, duration time.Duration, fields ...Field) {
	logFields := []Field{
		String("event_type", "request"),
		String("method", method),
		String("path", path),
		Int("status_code", statusCode),
		Duration("duration", duration),
		Float64("duration_ms", float64(duration.Nanoseconds())/1e6),
	}
	logFields = append(logFields, fields...)

	entry := l.createEntry(logFields...)
	if statusCode >= 400 {
		entry.Warn("HTTP request")
	} else {
		entry.Info("HTTP request")
	}
}

// createEntry creates a logrus entry with all fields and context
func (l *structuredLogger) createEntry(fields ...Field) *logrus.Entry {
	entry := l.logger.WithFields(l.fields)

	// Add metadata
	for k, v := range l.metadata {
		entry = entry.WithField(k, v)
	}

	// Add context information
	if l.context != nil {
		// Add correlation ID if present
		if corrID := l.context.Value("correlation_id"); corrID != nil {
			entry = entry.WithField("correlation_id", corrID)
		}

		// Add user ID if present
		if userID := l.context.Value("user_id"); userID != nil {
			entry = entry.WithField("user_id", userID)
		}

		// Add request ID if present
		if requestID := l.context.Value("request_id"); requestID != nil {
			entry = entry.WithField("request_id", requestID)
		}

		// Add IP address if present
		if ip := l.context.Value("client_ip"); ip != nil {
			entry = entry.WithField("client_ip", ip)
		}
	}

	// Add additional fields
	for _, field := range fields {
		entry = entry.WithField(field.Key, field.Value)
	}

	// Add caller information
	if l.logger.ReportCaller {
		if pc, file, line, ok := runtime.Caller(2); ok {
			entry = entry.WithField("function", runtime.FuncForPC(pc).Name())
			entry = entry.WithField("file", fmt.Sprintf("%s:%d", file, line))
		}
	}

	return entry
}

// =============================================================================
// Global Logger Instance
// =============================================================================

var globalLogger Logger

// InitializeGlobalLogger initializes the global logger instance
func InitializeGlobalLogger(config LoggerConfig) {
	globalLogger = NewStructuredLogger(config)
}

// GetGlobalLogger returns the global logger instance
func GetGlobalLogger() Logger {
	if globalLogger == nil {
		// Create a default logger if none is initialized
		globalLogger = NewStructuredLogger(LoggerConfig{
			Level:        int(LogLevelInfo),
			Format:       LogFormatText,
			EnableCaller: false,
			Output:       os.Stdout,
		})
	}
	return globalLogger
}

// Convenience functions that use the global logger
func Debug(msg string, fields ...Field) {
	GetGlobalLogger().Debug(msg, fields...)
}

func Info(msg string, fields ...Field) {
	GetGlobalLogger().Info(msg, fields...)
}

func Warn(msg string, fields ...Field) {
	GetGlobalLogger().Warn(msg, fields...)
}

func Error(msg string, err error, fields ...Field) {
	GetGlobalLogger().Error(msg, err, fields...)
}

func Fatal(msg string, err error, fields ...Field) {
	GetGlobalLogger().Fatal(msg, err, fields...)
}

func WithContext(ctx context.Context) Logger {
	return GetGlobalLogger().WithContext(ctx)
}

func WithFields(fields ...Field) Logger {
	return GetGlobalLogger().WithFields(fields...)
}

func WithError(err error) Logger {
	return GetGlobalLogger().WithError(err)
}

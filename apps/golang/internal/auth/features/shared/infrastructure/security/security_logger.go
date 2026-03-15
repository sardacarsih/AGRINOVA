package security

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"agrinovagraphql/server/internal/auth/features/shared/domain"
)

// SecurityLogger handles security event logging
type SecurityLogger struct {
	logEvents bool
	async     bool
	logQueue  chan string
}

// NewSecurityLogger creates new security logger
func NewSecurityLogger(logEvents bool) *SecurityLogger {
	if configured, ok := envBool("AGRINOVA_SECURITY_LOG_EVENTS"); ok {
		logEvents = configured
	}

	async := true
	if configured, ok := envBool("AGRINOVA_SECURITY_LOG_ASYNC"); ok {
		async = configured
	}

	logger := &SecurityLogger{
		logEvents: logEvents,
		async:     async,
	}
	if logger.logEvents && logger.async {
		logger.logQueue = make(chan string, 1024)
		go logger.run()
	}

	return logger
}

// LogSecurityEvent logs a security event
func (s *SecurityLogger) LogSecurityEvent(ctx context.Context, event *domain.SecurityEvent) error {
	if !s.logEvents {
		return nil
	}
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now()
	}

	// Format the log message
	message := fmt.Sprintf("[SECURITY] %s - User: %s, IP: %s, UA: %s, Details: %v",
		event.Event,
		s.formatUserID(event.UserID),
		event.IPAddress,
		event.UserAgent,
		event.Details,
	)

	// Log with timestamp
	logMsg := fmt.Sprintf("%s %s", event.CreatedAt.Format(time.RFC3339), message)

	if s.async && s.logQueue != nil {
		select {
		case s.logQueue <- logMsg:
			return nil
		default:
			// Fall back to direct logging when the queue is saturated.
		}
	}

	// Log to standard output (in production, you might want to use a proper logging service)
	log.Println(logMsg)

	// In a real implementation, you would also:
	// 1. Store in database for audit trail
	// 2. Send to security monitoring system
	// 3. Trigger alerts for suspicious activities
	// 4. Implement rate limiting for log generation

	return nil
}

func (s *SecurityLogger) run() {
	for message := range s.logQueue {
		log.Println(message)
	}
}

// Helper functions

func (s *SecurityLogger) formatUserID(userID *string) string {
	if userID == nil {
		return "anonymous"
	}
	return *userID
}

func envBool(key string) (bool, bool) {
	value, ok := os.LookupEnv(key)
	if !ok {
		return false, false
	}

	switch strings.TrimSpace(strings.ToLower(value)) {
	case "1", "true", "yes", "on":
		return true, true
	case "0", "false", "no", "off":
		return false, true
	default:
		return false, false
	}
}

// DatabaseSecurityLogger implements database-based security logging
type DatabaseSecurityLogger struct {
	repo domain.SecurityEventRepository
}

// NewDatabaseSecurityLogger creates new database security logger
func NewDatabaseSecurityLogger(repo domain.SecurityEventRepository) *DatabaseSecurityLogger {
	return &DatabaseSecurityLogger{
		repo: repo,
	}
}

// LogSecurityEvent logs a security event to database
func (s *DatabaseSecurityLogger) LogSecurityEvent(ctx context.Context, event *domain.SecurityEvent) error {
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now()
	}

	return s.repo.LogSecurityEvent(ctx, event)
}

// CompositeSecurityLogger combines multiple security loggers
type CompositeSecurityLogger struct {
	loggers []domain.SecurityEventLogger
}

// NewCompositeSecurityLogger creates new composite security logger
func NewCompositeSecurityLogger(loggers ...domain.SecurityEventLogger) *CompositeSecurityLogger {
	return &CompositeSecurityLogger{
		loggers: loggers,
	}
}

// LogSecurityEvent logs to all configured loggers
func (s *CompositeSecurityLogger) LogSecurityEvent(ctx context.Context, event *domain.SecurityEvent) error {
	for _, logger := range s.loggers {
		if err := logger.LogSecurityEvent(ctx, event); err != nil {
			// Log error but continue with other loggers
			log.Printf("Failed to log security event: %v", err)
		}
	}
	return nil
}

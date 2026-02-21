package domain

import "context"

// PasswordService defines interface for password operations
type PasswordService interface {
	VerifyPassword(hashedPassword, password string) error
	HashPassword(password string) (string, error)
}

// SecurityEventLogger defines interface for security logging
type SecurityEventLogger interface {
	LogSecurityEvent(ctx context.Context, event *SecurityEvent) error
}

package domain

import (
	"context"
	"time"
)

// UserRepository defines interface for user data operations
type UserRepository interface {
	// Find operations
	FindByID(ctx context.Context, id string) (*User, error)
	FindByUsername(ctx context.Context, username string) (*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindByIdentifier(ctx context.Context, identifier string) (*User, error) // username or email

	// Filtered queries
	FindByCompany(ctx context.Context, companyID string) ([]*User, error)
	FindByRole(ctx context.Context, role Role) ([]*User, error)
	FindWithFilters(ctx context.Context, filters UserFilters) ([]*User, int64, error)

	// CUD operations
	Create(ctx context.Context, user *User) error
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id string) error
}

// SessionRepository defines interface for session data operations
type SessionRepository interface {
	// Session operations
	CreateSession(ctx context.Context, session *UserSession) error
	FindSessionByToken(ctx context.Context, token string) (*UserSession, error)
	FindSessionByID(ctx context.Context, id string) (*UserSession, error)
	FindActiveSessionsByUser(ctx context.Context, userID string) ([]*UserSession, error)

	// Session management
	UpdateSession(ctx context.Context, session *UserSession) error
	RevokeSession(ctx context.Context, sessionID string) error
	RevokeAllUserSessions(ctx context.Context, userID string) error
	RevokeExpiredSessions(ctx context.Context) error

	// Cleanup
	CleanupOldSessions(ctx context.Context, olderThan time.Duration) error
}

// DeviceRepository defines interface for device binding operations
type DeviceRepository interface {
	// Device operations
	FindDeviceByID(ctx context.Context, deviceID string) (*DeviceBinding, error)
	FindDeviceByUser(ctx context.Context, userID, deviceID string) (*DeviceBinding, error)
	FindDevicesByUser(ctx context.Context, userID string) ([]*DeviceBinding, error)

	// Device management
	CreateDevice(ctx context.Context, device *DeviceBinding) error
	UpdateDevice(ctx context.Context, device *DeviceBinding) error
	RevokeDevice(ctx context.Context, deviceID string) error
	RevokeAllUserDevices(ctx context.Context, userID string) error

	// Device validation
	ValidateDeviceFingerprint(ctx context.Context, userID, fingerprint string) (*DeviceBinding, error)
}

// AssignmentRepository defines interface for user assignment operations
type AssignmentRepository interface {
	// Assignment operations
	FindByUserID(ctx context.Context, userID string) ([]*Assignment, error)
	FindByUserAndCompany(ctx context.Context, userID, companyID string) ([]*Assignment, error)
	FindByUserAndEstate(ctx context.Context, userID, estateID string) ([]*Assignment, error)

	// Assignment management
	CreateAssignment(ctx context.Context, assignment *Assignment) error
	UpdateAssignment(ctx context.Context, assignment *Assignment) error
	RevokeAssignment(ctx context.Context, assignmentID string) error

	// Queries with joins
	FindWithDetails(ctx context.Context, userID string) ([]*Assignment, error)
	FindActiveAssignments(ctx context.Context, userID string) ([]*Assignment, error)
}

// CompanyRepository defines interface for company data operations
type CompanyRepository interface {
	FindByID(ctx context.Context, id string) (*Company, error)
	FindByKode(ctx context.Context, kode string) (*Company, error)
	FindAll(ctx context.Context) ([]*Company, error)
	FindActive(ctx context.Context) ([]*Company, error)
}

// EstateRepository defines interface for estate data operations
type EstateRepository interface {
	FindByID(ctx context.Context, id string) (*Estate, error)
	FindByCompany(ctx context.Context, companyID string) ([]*Estate, error)
	FindByKode(ctx context.Context, kode string) (*Estate, error)
	FindActive(ctx context.Context, companyID string) ([]*Estate, error)
}

// DivisionRepository defines interface for division data operations
type DivisionRepository interface {
	FindByID(ctx context.Context, id string) (*Division, error)
	FindByEstate(ctx context.Context, estateID string) ([]*Division, error)
	FindByCompany(ctx context.Context, companyID string) ([]*Division, error)
	FindByKode(ctx context.Context, kode string) (*Division, error)
	FindActive(ctx context.Context, estateID string) ([]*Division, error)
}

// SecurityEventRepository defines interface for security logging
type SecurityEventRepository interface {
	LogSecurityEvent(ctx context.Context, event *SecurityEvent) error
	FindRecentEvents(ctx context.Context, userID string, limit int) ([]*SecurityEvent, error)
	FindFailedLogins(ctx context.Context, identifier string, since time.Time) ([]*SecurityEvent, error)
}

// SecurityEvent represents security events for audit
type SecurityEvent struct {
	ID        string
	UserID    *string
	Event     SecurityEventType
	Severity  SecurityEventSeverity
	IPAddress string
	UserAgent string
	Details   map[string]interface{}
	CreatedAt time.Time
}

// SecurityEventType represents types of security events
type SecurityEventType string

const (
	EventLoginSuccess       SecurityEventType = "LOGIN_SUCCESS"
	EventLoginFailure       SecurityEventType = "LOGIN_FAILURE"
	EventLogout             SecurityEventType = "LOGOUT"
	EventPasswordChange     SecurityEventType = "PASSWORD_CHANGE"
	EventDeviceBind         SecurityEventType = "DEVICE_BIND"
	EventDeviceUnbind       SecurityEventType = "DEVICE_UNBIND"
	EventSuspiciousActivity SecurityEventType = "SUSPICIOUS_ACTIVITY"
)

// SecurityEventSeverity represents severity of security events
type SecurityEventSeverity string

const (
	SeverityInfo     SecurityEventSeverity = "INFO"
	SeverityWarning  SecurityEventSeverity = "WARNING"
	SeverityCritical SecurityEventSeverity = "CRITICAL"
)

// UserFilters represents filter criteria for user queries
type UserFilters struct {
	CompanyID *string
	Role      *Role
	IsActive  *bool
	Search    *string // searches in username, name, email
	Limit     int
	Offset    int
	SortBy    string // field name
	SortDesc  bool   // sort direction
}

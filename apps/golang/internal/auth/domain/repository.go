package domain

import (
	"context"
)

// AuthRepository defines the interface for authentication-related persistence
type AuthRepository interface {
	// User operations
	FindUserByUsername(ctx context.Context, username string) (*User, error)
	FindUserByID(ctx context.Context, id string) (*User, error)

	// Session operations
	CreateSession(ctx context.Context, session *UserSession) error
	FindSessionByToken(ctx context.Context, token string) (*UserSession, error)
	RevokeSession(ctx context.Context, sessionID string) error
	RevokeAllUserSessions(ctx context.Context, userID string) error

	// Device operations
	FindDeviceBinding(ctx context.Context, deviceID string) (*DeviceBinding, error)
	CreateDeviceBinding(ctx context.Context, binding *DeviceBinding) error
	UpdateDeviceBinding(ctx context.Context, binding *DeviceBinding) error

	// Token operations
	CreateJWTToken(ctx context.Context, token *JWTToken) error
	FindJWTToken(ctx context.Context, tokenHash string) (*JWTToken, error)
	RevokeJWTToken(ctx context.Context, tokenID string) error
}

// UserRepository defines the interface for user persistence.
// This allows us to swap implementations (Postgres, Mock, Memory) easily.
type UserRepository interface {
	FindByID(ctx context.Context, id string) (*User, error)
	FindByUsername(ctx context.Context, username string) (*User, error)
	FindByIdentifier(ctx context.Context, identifier string) (*User, error)
	FindByCompany(ctx context.Context, companyID string) ([]*User, error)
	FindByRole(ctx context.Context, role string) ([]*User, error)

	Create(ctx context.Context, user *User) error
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id string) error

	// Advanced queries can be added here
	FindWithFilters(ctx context.Context, filters UserFilters) ([]*User, int64, error)
}

// UserFilters represents filter criteria for user queries
type UserFilters struct {
	CompanyID *string
	Role      *string
	IsActive  *bool
	Search    *string
	Limit     int
	Offset    int
}

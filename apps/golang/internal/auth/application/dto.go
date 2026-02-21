package application

import (
	"time"

	"agrinovagraphql/server/internal/auth/domain"
)

// LoginInput represents the input for login
type LoginInput struct {
	Username    string
	Password    string
	Platform    domain.PlatformType
	DeviceInfo  *domain.DeviceInfo
	IPAddress   string
	UserAgent   string
	LoginMethod domain.LoginMethod
}

// LoginResult represents the result of a successful login
type LoginResult struct {
	Token        string
	RefreshToken string
	User         UserDTO
	Scope        ScopeDTO
	ExpiresAt    time.Time
}

// UserDTO represents user data for clients
type UserDTO struct {
	ID   string      `json:"id"`
	Name string      `json:"name"`
	Role domain.Role `json:"role"`
}

// ScopeDTO represents the user's access scope
type ScopeDTO struct {
	Perusahaan []CompanyDTO  `json:"perusahaan"`
	Estates    []EstateDTO   `json:"estates"`
	Divisis    []DivisionDTO `json:"divisis"`
}

type CompanyDTO struct {
	ID   string `json:"id"`
	Nama string `json:"nama"`
}

type EstateDTO struct {
	ID   string `json:"id"`
	Nama string `json:"nama"`
}

type DivisionDTO struct {
	ID   string `json:"id"`
	Nama string `json:"nama"`
}

// SessionDTO represents session details
type SessionDTO struct {
	ID           string
	UserID       string
	DeviceID     *string
	Platform     domain.PlatformType
	LastActivity time.Time
	ExpiresAt    time.Time
	IsActive     bool
}

// ToUserDTO converts domain User to UserDTO
func ToUserDTO(user *domain.User) UserDTO {
	return UserDTO{
		ID:   user.ID,
		Name: user.Name,
		Role: domain.Role(user.Role),
	}
}

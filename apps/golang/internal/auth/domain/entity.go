package domain

import (
	"time"
)

// User represents the core user entity
type User struct {
	ID                 string
	Username           string
	Name               string
	Email              *string
	PhoneNumber        *string
	Password           string
	Role               string // Using string for flexibility and to avoid circular deps
	IsActive           bool
	LanguagePreference *string // User's preferred language (en, id)

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time

	// Relations
	Assignments []UserCompanyAssignment
}

// UserCompanyAssignment represents the many-to-many relationship between users and companies
type UserCompanyAssignment struct {
	ID                string
	UserID            string
	CompanyID         string
	Company           *Company
	EstateAssignments []UserEstateAssignment
	IsActive          bool
	AssignedAt        time.Time
	AssignedBy        *string
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// UserEstateAssignment represents assignment to a specific estate
type UserEstateAssignment struct {
	ID                  string
	AssignmentID        string
	EstateID            string
	Estate              *Estate
	DivisionAssignments []UserDivisionAssignment
	IsActive            bool
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

// UserDivisionAssignment represents assignment to a specific division
type UserDivisionAssignment struct {
	ID                 string
	EstateAssignmentID string
	DivisionID         string
	Division           *Division
	IsActive           bool
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

// Estate represents an estate entity
type Estate struct {
	ID   string
	Nama string
}

// Division represents a division entity
type Division struct {
	ID   string
	Nama string
}

// Company represents the company entity in the business domain.
type Company struct {
	ID      string
	Nama    string
	Status  string
	Address *string
	Phone   *string
}

// Role represents user roles in the system
// Kept for reference and constants, even if User struct uses string
type Role string

const (
	RoleAdmin        Role = "SUPER_ADMIN"
	RoleCompanyAdmin Role = "COMPANY_ADMIN"
	RoleAreaManager  Role = "AREA_MANAGER"
	RoleManager      Role = "MANAGER"
	RoleAsisten      Role = "ASISTEN"
	RoleMandor       Role = "MANDOR"
	RoleSatpam       Role = "SATPAM"
)

// UserSession represents user authentication sessions
type UserSession struct {
	ID            string
	UserID        string
	DeviceID      *string
	SessionToken  string
	RefreshToken  *string
	Platform      PlatformType
	DeviceInfo    *DeviceInfo
	IPAddress     string
	UserAgent     string
	LastActivity  time.Time
	ExpiresAt     time.Time
	IsActive      bool
	LoginMethod   LoginMethod
	SecurityFlags SecurityFlags
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// DeviceBinding represents mobile device bindings
type DeviceBinding struct {
	ID                string
	UserID            string
	DeviceID          string
	DeviceFingerprint string
	Platform          PlatformType
	DeviceInfo        DeviceInfo
	BiometricHash     *string
	IsTrusted         bool
	IsAuthorized      bool
	LastSeenAt        time.Time
	AuthorizedBy      *string
	AuthorizedAt      *time.Time
	RevokedAt         *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// JWTToken represents JWT tokens for mobile authentication
type JWTToken struct {
	ID               string
	UserID           string
	DeviceID         string
	TokenType        TokenType
	TokenHash        string
	RefreshHash      *string
	OfflineHash      *string
	ExpiresAt        time.Time
	RefreshExpiresAt *time.Time
	OfflineExpiresAt *time.Time
	IsRevoked        bool
	RevokedAt        *time.Time
	LastUsedAt       *time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

// Enums and Value Objects

type PlatformType string

const (
	PlatformWeb     PlatformType = "WEB"
	PlatformAndroid PlatformType = "ANDROID"
	PlatformIOS     PlatformType = "IOS"
)

type LoginMethod string

const (
	LoginPassword  LoginMethod = "PASSWORD"
	LoginBiometric LoginMethod = "BIOMETRIC"
	LoginTwoFactor LoginMethod = "TWO_FACTOR"
	LoginSSO       LoginMethod = "SSO"
)

type TokenType string

const (
	TokenTypeJWT     TokenType = "JWT"
	TokenTypeBearer  TokenType = "BEARER"
	TokenTypeRefresh TokenType = "REFRESH"
	TokenTypeOffline TokenType = "OFFLINE"
)

type DeviceInfo struct {
	Model       string `json:"model,omitempty"`
	Brand       string `json:"brand,omitempty"`
	OSVersion   string `json:"os_version,omitempty"`
	AppVersion  string `json:"app_version,omitempty"`
	BuildNumber string `json:"build_number,omitempty"`
	DeviceName  string `json:"device_name,omitempty"`
}

type SecurityFlags struct {
	RequireReauth      bool `json:"require_reauth,omitempty"`
	SuspiciousActivity bool `json:"suspicious_activity,omitempty"`
	NewDevice          bool `json:"new_device,omitempty"`
	LocationChange     bool `json:"location_change,omitempty"`
}

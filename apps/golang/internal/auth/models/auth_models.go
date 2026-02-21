// Package models provides authentication-related data models for the Agrinova Go GraphQL API server.
// This package includes session management models, device binding models, security event tracking,
// and authentication response models for role-based access control with hierarchical scope data.
//
// Key Components:
// - Session Management: UserSession, DeviceBinding, JWTToken models for secure authentication
// - Security Tracking: SecurityEvent, LoginAttempt models for audit and monitoring
// - Auth Responses: Role-based authentication with hierarchical scope (Company → Estate → Division)
// - Platform Support: Web (cookies) and Mobile (JWT) authentication flows
//
// The authentication system supports multi-assignment roles:
// - Area Manager: Multiple companies (Super Admin assignment)
// - Manager: Multiple estates per company
// - Asisten: Multiple divisions across estates

package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	authDomain "agrinovagraphql/server/internal/graphql/domain/auth"

	"gorm.io/gorm"
)

// UserSession represents user authentication sessions
type UserSession struct {
	ID            string          `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID        string          `json:"user_id" gorm:"type:uuid;not null;index"`
	User          authDomain.User `json:"user" gorm:"foreignKey:UserID;references:ID"`
	DeviceID      *string         `json:"device_id" gorm:"type:varchar(255);index"`
	SessionToken  string          `json:"session_token" gorm:"type:text;unique;not null"`
	RefreshToken  *string         `json:"refresh_token" gorm:"type:text"`
	Platform      PlatformType    `json:"platform" gorm:"type:varchar(20);not null"`
	DeviceInfo    *DeviceInfo     `json:"device_info" gorm:"type:json"`
	IPAddress     string          `json:"ip_address" gorm:"type:inet"`
	UserAgent     string          `json:"user_agent" gorm:"type:text"`
	LastActivity  time.Time       `json:"last_activity" gorm:"not null"`
	ExpiresAt     time.Time       `json:"expires_at" gorm:"not null;index"`
	IsActive      bool            `json:"is_active" gorm:"default:true;index"`
	LoginMethod   LoginMethod     `json:"login_method" gorm:"type:varchar(20);not null"`
	SecurityFlags SecurityFlags   `json:"security_flags" gorm:"type:json"`
	Revoked       bool            `json:"revoked" gorm:"default:false"`
	RevokedBy     *string         `json:"revoked_by" gorm:"type:uuid"`
	RevokedReason *string         `json:"revoked_reason" gorm:"type:text"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
	DeletedAt     gorm.DeletedAt  `gorm:"index"`
}

// DeviceBinding represents mobile device bindings for enhanced security
type DeviceBinding struct {
	ID                string          `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID            string          `json:"user_id" gorm:"type:uuid;not null;index"`
	User              authDomain.User `json:"user" gorm:"foreignKey:UserID;references:ID"`
	DeviceID          string          `json:"device_id" gorm:"type:varchar(255);not null;index"`
	DeviceFingerprint string          `json:"device_fingerprint" gorm:"type:text;not null"`
	Platform          PlatformType    `json:"platform" gorm:"type:varchar(20);not null"`
	DeviceInfo        DeviceInfo      `json:"device_info" gorm:"type:json"`
	BiometricHash     *string         `json:"biometric_hash" gorm:"type:text"`
	IsTrusted         bool            `json:"is_trusted" gorm:"default:false"`
	IsAuthorized      bool            `json:"is_authorized" gorm:"default:false"`
	LastSeenAt        time.Time       `json:"last_seen_at" gorm:"not null"`
	AuthorizedBy      *string         `json:"authorized_by" gorm:"type:uuid"`
	AuthorizedAt      *time.Time      `json:"authorized_at"`
	RevokedAt         *time.Time      `json:"revoked_at"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
	DeletedAt         gorm.DeletedAt  `gorm:"index"`
}

// JWTToken represents JWT tokens for mobile authentication
type JWTToken struct {
	ID               string          `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID           string          `json:"user_id" gorm:"type:uuid;not null;index"`
	User             authDomain.User `json:"user" gorm:"foreignKey:UserID;references:ID"`
	DeviceID         string          `json:"device_id" gorm:"type:varchar(255);not null;index"`
	TokenType        TokenType       `json:"token_type" gorm:"type:varchar(20);not null"`
	TokenHash        string          `json:"token_hash" gorm:"type:text;unique;not null"`
	RefreshHash      *string         `json:"refresh_hash" gorm:"type:text;unique"`
	OfflineHash      *string         `json:"offline_hash" gorm:"type:text;unique"`
	ExpiresAt        time.Time       `json:"expires_at" gorm:"not null;index"`
	RefreshExpiresAt *time.Time      `json:"refresh_expires_at" gorm:"index"`
	OfflineExpiresAt *time.Time      `json:"offline_expires_at" gorm:"index"`
	IsRevoked        bool            `json:"is_revoked" gorm:"default:false;index"`
	RevokedAt        *time.Time      `json:"revoked_at"`
	LastUsedAt       *time.Time      `json:"last_used_at"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
	DeletedAt        gorm.DeletedAt  `gorm:"index"`
}

// SecurityEvent represents security-related events
type SecurityEvent struct {
	ID         string               `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID     string               `json:"user_id" gorm:"type:uuid;not null;index"`
	User       authDomain.User      `json:"user" gorm:"foreignKey:UserID;references:ID"`
	EventType  SecurityEventType    `json:"event_type" gorm:"type:varchar(50);not null"`
	Details    SecurityEventDetails `json:"details" gorm:"type:json"`
	IPAddress  string               `json:"ip_address" gorm:"type:inet"`
	UserAgent  string               `json:"user_agent" gorm:"type:text"`
	DeviceID   *string              `json:"device_id" gorm:"type:varchar(255)"`
	Severity   EventSeverity        `json:"severity" gorm:"type:varchar(10);not null"`
	IsResolved bool                 `json:"is_resolved" gorm:"default:false"`
	ResolvedBy *string              `json:"resolved_by" gorm:"type:uuid"`
	ResolvedAt *time.Time           `json:"resolved_at"`
	CreatedAt  time.Time            `json:"created_at"`
	UpdatedAt  time.Time            `json:"updated_at"`
	DeletedAt  gorm.DeletedAt       `gorm:"index"`
}

// LoginAttempt represents login attempt records
type LoginAttempt struct {
	ID            string       `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	Username      string       `json:"username" gorm:"not null;index"`
	UserID        *string      `json:"user_id" gorm:"type:uuid;index"`
	IPAddress     string       `json:"ip_address" gorm:"type:inet;index"`
	UserAgent     string       `json:"user_agent" gorm:"type:text"`
	Platform      PlatformType `json:"platform" gorm:"type:varchar(20);not null"`
	DeviceID      *string      `json:"device_id" gorm:"type:varchar(255)"`
	IsSuccessful  bool         `json:"is_successful" gorm:"not null;index"`
	FailureReason *string      `json:"failure_reason" gorm:"type:text"`
	LoginMethod   LoginMethod  `json:"login_method" gorm:"type:varchar(20);not null"`
	Location      *string      `json:"location" gorm:"type:text"`
	AttemptedAt   time.Time    `json:"attempted_at" gorm:"not null;index"`
	CreatedAt     time.Time    `json:"created_at"`
}

// Enums and Types

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

type SecurityEventType string

const (
	EventLogin              SecurityEventType = "LOGIN"
	EventLogout             SecurityEventType = "LOGOUT"
	EventPasswordChange     SecurityEventType = "PASSWORD_CHANGE"
	EventDeviceRegistered   SecurityEventType = "DEVICE_REGISTERED"
	EventDeviceRevoked      SecurityEventType = "DEVICE_REVOKED"
	EventTokenRefresh       SecurityEventType = "TOKEN_REFRESH"
	EventSuspiciousActivity SecurityEventType = "SUSPICIOUS_ACTIVITY"
	EventSecurityViolation  SecurityEventType = "SECURITY_VIOLATION"
)

type EventSeverity string

const (
	SeverityLow      EventSeverity = "LOW"
	SeverityMedium   EventSeverity = "MEDIUM"
	SeverityHigh     EventSeverity = "HIGH"
	SeverityCritical EventSeverity = "CRITICAL"
)

// JSON Types

type DeviceInfo struct {
	Model       string `json:"model,omitempty"`
	Brand       string `json:"brand,omitempty"`
	OSVersion   string `json:"os_version,omitempty"`
	AppVersion  string `json:"app_version,omitempty"`
	BuildNumber string `json:"build_number,omitempty"`
	DeviceName  string `json:"device_name,omitempty"`
}

// Scan implements sql.Scanner interface for DeviceInfo
func (d *DeviceInfo) Scan(value interface{}) error {
	if value == nil {
		*d = DeviceInfo{}
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("failed to scan DeviceInfo: unsupported type %T", value)
	}

	if len(bytes) == 0 {
		*d = DeviceInfo{}
		return nil
	}

	return json.Unmarshal(bytes, d)
}

// Value implements driver.Valuer interface for DeviceInfo
func (d DeviceInfo) Value() (driver.Value, error) {
	return json.Marshal(d)
}

type SecurityFlags struct {
	RequireReauth      bool `json:"require_reauth,omitempty"`
	SuspiciousActivity bool `json:"suspicious_activity,omitempty"`
	NewDevice          bool `json:"new_device,omitempty"`
	LocationChange     bool `json:"location_change,omitempty"`
}

// Scan implements sql.Scanner interface for SecurityFlags
func (s *SecurityFlags) Scan(value interface{}) error {
	if value == nil {
		*s = SecurityFlags{}
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("failed to scan SecurityFlags: unsupported type %T", value)
	}

	if len(bytes) == 0 {
		*s = SecurityFlags{}
		return nil
	}

	return json.Unmarshal(bytes, s)
}

// Value implements driver.Valuer interface for SecurityFlags
func (s SecurityFlags) Value() (driver.Value, error) {
	return json.Marshal(s)
}

type SecurityEventDetails struct {
	Action       string            `json:"action,omitempty"`
	Resource     string            `json:"resource,omitempty"`
	OldValue     interface{}       `json:"old_value,omitempty"`
	NewValue     interface{}       `json:"new_value,omitempty"`
	Metadata     map[string]string `json:"metadata,omitempty"`
	ErrorMessage string            `json:"error_message,omitempty"`
}

// Scan implements sql.Scanner interface for SecurityEventDetails
func (s *SecurityEventDetails) Scan(value interface{}) error {
	if value == nil {
		*s = SecurityEventDetails{}
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("failed to scan SecurityEventDetails: unsupported type %T", value)
	}

	if len(bytes) == 0 {
		*s = SecurityEventDetails{}
		return nil
	}

	return json.Unmarshal(bytes, s)
}

// Value implements driver.Valuer interface for SecurityEventDetails
func (s SecurityEventDetails) Value() (driver.Value, error) {
	return json.Marshal(s)
}

// Authentication Response Models

// Role represents user roles in the system
type Role string

const (
	RoleAdmin        Role = "SUPER_ADMIN"
	RoleCompanyAdmin Role = "COMPANY_ADMIN"
	RoleAreaManager  Role = "AREA_MANAGER"
	RoleManager      Role = "MANAGER"
	RoleAsisten      Role = "ASISTEN"
	RoleMandor       Role = "MANDOR"
	RoleSatpam       Role = "SATPAM"
	RoleTimbangan    Role = "TIMBANGAN"
	RoleGrading      Role = "GRADING"
)

// AuthUser represents user data in authentication responses
type AuthUser struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role Role   `json:"role"`
}

// Perusahaan represents company data in scope responses
type Perusahaan struct {
	ID   string `json:"id"`
	Nama string `json:"nama"`
}

// AuthEstate represents estate data in scope responses
type AuthEstate struct {
	ID   string `json:"id"`
	Nama string `json:"nama"`
}

// Divisi represents division data in scope responses
type Divisi struct {
	ID   string `json:"id"`
	Nama string `json:"nama"`
}

// ScopeData represents hierarchical access scope for authenticated users
type ScopeData struct {
	Perusahaan []Perusahaan `json:"perusahaan"`
	Estates    []AuthEstate `json:"estates"`
	Divisis    []Divisi     `json:"divisis"`
}

// LoginResponse represents the complete authentication response
type LoginResponse struct {
	Token string    `json:"token"`
	User  AuthUser  `json:"user"`
	Scope ScopeData `json:"scope"`
}

// Helper methods for Role

// String returns the string representation of the role
func (r Role) String() string {
	return string(r)
}

// IsValid checks if the role is a valid role
func (r Role) IsValid() bool {
	switch r {
	case RoleAdmin, RoleCompanyAdmin, RoleAreaManager, RoleManager, RoleAsisten, RoleMandor, RoleSatpam, RoleTimbangan, RoleGrading:
		return true
	default:
		return false
	}
}

// Role String Constants for Frontend Compatibility
// These constants match the frontend role format and ensure consistency

const (
	// Standardized role string constants
	RoleStringAdmin        = "SUPER_ADMIN"
	RoleStringCompanyAdmin = "COMPANY_ADMIN"
	RoleStringAreaManager  = "AREA_MANAGER"
	RoleStringManager      = "MANAGER"
	RoleStringAsisten      = "ASISTEN"
	RoleStringMandor       = "MANDOR"
	RoleStringSatpam       = "SATPAM"
	RoleStringTimbangan    = "TIMBANGAN"
	RoleStringGrading      = "GRADING"
)

// RoleStringMap maps enum roles to string constants
var RoleStringMap = map[Role]string{
	RoleAdmin:        RoleStringAdmin,
	RoleCompanyAdmin: RoleStringCompanyAdmin,
	RoleAreaManager:  RoleStringAreaManager,
	RoleManager:      RoleStringManager,
	RoleAsisten:      RoleStringAsisten,
	RoleMandor:       RoleStringMandor,
	RoleSatpam:       RoleStringSatpam,
	RoleTimbangan:    RoleStringTimbangan,
	RoleGrading:      RoleStringGrading,
}

// StringToRoleMap maps string constants to enum roles
var StringToRoleMap = map[string]Role{
	RoleStringAdmin:        RoleAdmin,
	RoleStringCompanyAdmin: RoleCompanyAdmin,
	RoleStringAreaManager:  RoleAreaManager,
	RoleStringManager:      RoleManager,
	RoleStringAsisten:      RoleAsisten,
	RoleStringMandor:       RoleMandor,
	RoleStringSatpam:       RoleSatpam,
	RoleStringTimbangan:    RoleTimbangan,
	RoleStringGrading:      RoleGrading,
}

// Role conversion functions

// ToStandardString converts Role to standard string format
func (r Role) ToStandardString() string {
	if str, exists := RoleStringMap[r]; exists {
		return str
	}
	return string(r) // Fallback to raw string
}

// IsValidRoleString checks if a string is a valid role string
func IsValidRoleString(roleStr string) bool {
	_, exists := StringToRoleMap[roleStr]
	return exists
}

// StringToRole converts standard string to Role enum
func StringToRole(roleStr string) (Role, error) {
	if role, exists := StringToRoleMap[roleStr]; exists {
		return role, nil
	}
	return "", fmt.Errorf("invalid role string: %s. Valid roles are: %s", roleStr, GetAllValidRoleStrings())
}

// GetAllValidRoleStrings returns list of all valid role strings
func GetAllValidRoleStrings() []string {
	return []string{
		RoleStringAdmin,
		RoleStringCompanyAdmin,
		RoleStringAreaManager,
		RoleStringManager,
		RoleStringAsisten,
		RoleStringMandor,
		RoleStringSatpam,
		RoleStringTimbangan,
		RoleStringGrading,
	}
}

// STRICT: ValidateRoleFormat ensures role is in correct format and valid
// No fallbacks allowed - throws detailed error for debugging
func ValidateRoleFormat(role interface{}) (Role, error) {
	switch v := role.(type) {
	case Role:
		if v.IsValid() {
			return v, nil
		}
		return "", fmt.Errorf("invalid role enum: %v. Valid roles are: %s", v, GetAllValidRoleStrings())
	case string:
		if IsValidRoleString(v) {
			return StringToRole(v)
		}
		return "", fmt.Errorf("invalid role string: '%s'. Valid roles are: %s. No legacy roles are supported.", v, GetAllValidRoleStrings())
	default:
		return "", fmt.Errorf("invalid role type: %T. Role must be Role enum or string", v)
	}
}

// HasWebAccess checks if the role has web dashboard access
func (r Role) HasWebAccess() bool {
	switch r {
	case RoleAdmin, RoleCompanyAdmin, RoleAreaManager, RoleManager, RoleAsisten, RoleSatpam:
		return true
	case RoleMandor, RoleTimbangan, RoleGrading:
		return false
	default:
		return false
	}
}

// HasMobileAccess checks if the role has mobile access
func (r Role) HasMobileAccess() bool {
	switch r {
	case RoleAreaManager, RoleManager, RoleAsisten, RoleMandor, RoleSatpam, RoleTimbangan, RoleGrading:
		return true
	case RoleAdmin, RoleCompanyAdmin:
		return false
	default:
		return false
	}
}

// Helper methods for ScopeData

// IsEmpty checks if the scope has no data
func (s *ScopeData) IsEmpty() bool {
	return len(s.Perusahaan) == 0 && len(s.Estates) == 0 && len(s.Divisis) == 0
}

// HasCompanyAccess checks if the scope includes a specific company
func (s *ScopeData) HasCompanyAccess(companyID string) bool {
	for _, company := range s.Perusahaan {
		if company.ID == companyID {
			return true
		}
	}
	return false
}

// HasEstateAccess checks if the scope includes a specific estate
func (s *ScopeData) HasEstateAccess(estateID string) bool {
	for _, estate := range s.Estates {
		if estate.ID == estateID {
			return true
		}
	}
	return false
}

// HasDivisionAccess checks if the scope includes a specific division
func (s *ScopeData) HasDivisionAccess(divisionID string) bool {
	for _, division := range s.Divisis {
		if division.ID == divisionID {
			return true
		}
	}
	return false
}

// TableName methods for GORM

// TableName returns the table name for UserSession
func (UserSession) TableName() string {
	return "user_sessions"
}

// TableName returns the table name for DeviceBinding
func (DeviceBinding) TableName() string {
	return "device_bindings"
}

// TableName returns the table name for JWTToken
func (JWTToken) TableName() string {
	return "jwt_tokens"
}

// TableName returns the table name for SecurityEvent
func (SecurityEvent) TableName() string {
	return "security_events"
}

// TableName returns the table name for LoginAttempt
func (LoginAttempt) TableName() string {
	return "login_attempts"
}

// Helper methods

// IsExpired checks if a session has expired
func (s *UserSession) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}

// IsValidForPlatform checks if session is valid for the given platform
func (s *UserSession) IsValidForPlatform(platform PlatformType) bool {
	return s.IsActive && !s.IsExpired() && s.Platform == platform
}

// IsExpired checks if a JWT token has expired
func (j *JWTToken) IsExpired() bool {
	return j.IsRevoked || time.Now().After(j.ExpiresAt)
}

// IsOfflineValid checks if offline token is still valid
func (j *JWTToken) IsOfflineValid() bool {
	return !j.IsRevoked &&
		j.OfflineExpiresAt != nil &&
		time.Now().Before(*j.OfflineExpiresAt)
}

// IsDeviceTrusted checks if device binding is trusted
func (d *DeviceBinding) IsDeviceTrusted() bool {
	return d.IsAuthorized && d.IsTrusted && d.RevokedAt == nil
}

// CanRefresh checks if device can refresh tokens
func (d *DeviceBinding) CanRefresh() bool {
	return d.IsAuthorized && d.RevokedAt == nil
}

// LogoutTransaction represents a record of a user logout
type LogoutTransaction struct {
	ID        string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID    string    `json:"user_id" gorm:"type:uuid;not null;index"`
	Token     string    `json:"token" gorm:"type:text"`
	Reason    string    `json:"reason" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName returns the table name for LogoutTransaction
func (LogoutTransaction) TableName() string {
	return "logout_transactions"
}

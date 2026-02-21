// Package auth contains authentication-related GraphQL types.
package auth

import (
	"bytes"
	"fmt"
	"io"
	"strconv"
	"time"

	"agrinovagraphql/server/internal/graphql/domain/master"

	"gorm.io/gorm"
)

// ============================================================================
// USER TYPES
// ============================================================================

// User represents a system user.
type User struct {
	ID          string                  `json:"id" gorm:"primaryKey;column:id;type:uuid;default:gen_random_uuid()"`
	Username    string                  `json:"username" gorm:"column:username;uniqueIndex"`
	Name        string                  `json:"name" gorm:"column:name"`
	Email       *string                 `json:"email,omitempty" gorm:"column:email"`
	PhoneNumber *string                 `json:"phoneNumber,omitempty" gorm:"column:phone"`
	Avatar      *string                 `json:"avatar,omitempty" gorm:"column:avatar_url"`
	Role        UserRole                `json:"role" gorm:"column:role;type:varchar(50)"`
	Assignments []UserCompanyAssignment `json:"assignments,omitempty" gorm:"foreignKey:UserID;references:ID"`
	ManagerID   *string                 `json:"managerId,omitempty" gorm:"column:manager_id;type:uuid"`
	Manager     *User                   `json:"manager,omitempty" gorm:"foreignKey:ManagerID;references:ID"`
	Estates     []*master.Estate        `json:"estates,omitempty" gorm:"-"`
	Divisions   []*master.Division      `json:"divisions,omitempty" gorm:"-"`
	IsActive    bool                    `json:"isActive" gorm:"column:is_active;default:true"`
	CreatedAt   time.Time               `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   time.Time               `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt   gorm.DeletedAt          `json:"-" gorm:"index"`
}

// UserCompanyAssignment represents the join table for user-company many-to-many relationship
type UserCompanyAssignment struct {
	ID                string                 `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID            string                 `json:"userId" gorm:"column:user_id;type:uuid"`
	CompanyID         string                 `json:"companyId" gorm:"column:company_id;type:uuid"`
	Company           *master.Company        `json:"company,omitempty" gorm:"foreignKey:CompanyID;references:ID"`
	EstateAssignments []UserEstateAssignment `json:"estateAssignments,omitempty" gorm:"foreignKey:AssignmentID;references:ID"`
	IsActive          bool                   `json:"isActive" gorm:"column:is_active;default:true"`
	AssignedAt        time.Time              `json:"assignedAt" gorm:"column:assigned_at;autoCreateTime"`
	AssignedBy        *string                `json:"assignedBy,omitempty" gorm:"column:assigned_by;type:uuid"`
	CreatedAt         time.Time              `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt         time.Time              `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

// UserEstateAssignment represents assignment to a specific estate within a company context
type UserEstateAssignment struct {
	ID                  string                   `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	AssignmentID        string                   `json:"assignmentId" gorm:"column:assignment_id;type:uuid"` // Link to UserCompanyAssignment
	EstateID            string                   `json:"estateId" gorm:"column:estate_id;type:uuid"`
	Estate              *master.Estate           `json:"estate,omitempty" gorm:"foreignKey:EstateID;references:ID"`
	DivisionAssignments []UserDivisionAssignment `json:"divisionAssignments,omitempty" gorm:"foreignKey:EstateAssignmentID;references:ID"`
	IsActive            bool                     `json:"isActive" gorm:"column:is_active;default:true"`
	CreatedAt           time.Time                `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt           time.Time                `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

// UserDivisionAssignment represents assignment to a specific division within an estate context
type UserDivisionAssignment struct {
	ID                 string           `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	EstateAssignmentID string           `json:"estateAssignmentId" gorm:"column:estate_assignment_id;type:uuid"`
	DivisionID         string           `json:"divisionId" gorm:"column:division_id;type:uuid"`
	Division           *master.Division `json:"division,omitempty" gorm:"foreignKey:DivisionID;references:ID"`
	IsActive           bool             `json:"isActive" gorm:"column:is_active;default:true"`
	CreatedAt          time.Time        `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt          time.Time        `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

// TableName mapping
func (UserEstateAssignment) TableName() string {
	return "user_estate_assignments"
}

func (UserDivisionAssignment) TableName() string {
	return "user_division_assignments"
}

// TableName specifies the table name for GORM
func (UserCompanyAssignment) TableName() string {
	return "user_company_assignments"
}

// TableName specifies the table name for GORM
func (User) TableName() string {
	return "users"
}

// UserAssignments contains hierarchical assignments for RBAC.
type UserAssignments struct {
	Companies []*master.Company  `json:"companies,omitempty"`
	Estates   []*master.Estate   `json:"estates,omitempty"`
	Divisions []*master.Division `json:"divisions,omitempty"`
	Blocks    []*master.Block    `json:"blocks,omitempty"`
}

// UserAssignmentSummary for displaying user assignments.
type UserAssignmentSummary struct {
	EstateNames   []string `json:"estateNames,omitempty"`
	DivisionNames []string `json:"divisionNames,omitempty"`
	PksName       *string  `json:"pksName,omitempty"`
}

// ============================================================================
// AUTH PAYLOAD
// ============================================================================

// AuthPayload represents the response from authentication operations.
type AuthPayload struct {
	AccessToken      string           `json:"accessToken"`
	RefreshToken     string           `json:"refreshToken"`
	OfflineToken     *string          `json:"offlineToken,omitempty"`
	TokenType        string           `json:"tokenType"`
	ExpiresIn        int32            `json:"expiresIn"`
	ExpiresAt        time.Time        `json:"expiresAt"`
	RefreshExpiresAt *time.Time       `json:"refreshExpiresAt,omitempty"`
	OfflineExpiresAt *time.Time       `json:"offlineExpiresAt,omitempty"`
	User             *User            `json:"user"`
	Assignments      *UserAssignments `json:"assignments"`
}

// ============================================================================
// LOGIN INPUTS
// ============================================================================

// MobileLoginInput for mobile authentication.
type MobileLoginInput struct {
	Identifier        string       `json:"identifier"`
	Password          string       `json:"password"`
	Platform          PlatformType `json:"platform"`
	DeviceID          *string      `json:"deviceId,omitempty"`
	DeviceFingerprint *string      `json:"deviceFingerprint,omitempty"`
}

// WebLoginInput for web authentication.
type WebLoginInput struct {
	Identifier  string  `json:"identifier"`
	Password    string  `json:"password"`
	RememberMe  *bool   `json:"rememberMe,omitempty"`
	CsrfToken   *string `json:"csrfToken,omitempty"`
	Fingerprint *string `json:"fingerprint,omitempty"`
}

// WebLoginPayload response for web login.
type WebLoginPayload struct {
	Success     bool             `json:"success"`
	User        *User            `json:"user,omitempty"`
	SessionID   *string          `json:"sessionId,omitempty"`
	CsrfToken   string           `json:"csrfToken"`
	Message     string           `json:"message"`
	Assignments *UserAssignments `json:"assignments,omitempty"`
}

// RefreshTokenInput for token refresh.
type RefreshTokenInput struct {
	RefreshToken      string  `json:"refreshToken"`
	DeviceID          *string `json:"deviceId,omitempty"`
	DeviceFingerprint *string `json:"deviceFingerprint,omitempty"`
}

// DeviceRenewInput for exchanging an offline/session token for a new access+refresh pair.
// Used when the refresh token is expired/revoked but the offline token is still valid.
type DeviceRenewInput struct {
	OfflineToken      string  `json:"offlineToken"`
	DeviceID          string  `json:"deviceId"`
	DeviceFingerprint *string `json:"deviceFingerprint,omitempty"`
}

// ============================================================================
// USER INPUTS
// ============================================================================

// CreateUserInput for creating new users.
type CreateUserInput struct {
	Username    string   `json:"username"`
	Name        string   `json:"name"`
	Email       *string  `json:"email,omitempty"`
	PhoneNumber *string  `json:"phoneNumber,omitempty"`
	Role        UserRole `json:"role"`
	CompanyIDs  []string `json:"companyIds"`
	EstateIDs   []string `json:"estateIds,omitempty"`
	DivisionIDs []string `json:"divisionIds,omitempty"`
	ManagerID   *string  `json:"managerId,omitempty"`
	Password    string   `json:"password"`
	IsActive    *bool    `json:"isActive,omitempty"`
}

// ChangePasswordInput for password changes.
type ChangePasswordInput struct {
	CurrentPassword    string `json:"currentPassword"`
	NewPassword        string `json:"newPassword"`
	ConfirmPassword    string `json:"confirmPassword"`
	LogoutOtherDevices *bool  `json:"logoutOtherDevices,omitempty"`
}

// ResetPasswordInput for admin password reset.
type ResetPasswordInput struct {
	UserID                string `json:"userId"`
	NewPassword           string `json:"newPassword"`
	RequirePasswordChange *bool  `json:"requirePasswordChange,omitempty"`
	LogoutOtherDevices    *bool  `json:"logoutOtherDevices,omitempty"`
}

// UpdateUserInput for updating users.
type UpdateUserInput struct {
	ID          string    `json:"id"`
	Username    *string   `json:"username,omitempty"`
	Name        *string   `json:"name,omitempty"`
	Email       *string   `json:"email,omitempty"`
	PhoneNumber *string   `json:"phoneNumber,omitempty"`
	Avatar      *string   `json:"avatar,omitempty"`
	Role        *UserRole `json:"role,omitempty"`
	CompanyIDs  []string  `json:"companyIds,omitempty"`
	EstateIDs   []string  `json:"estateIds,omitempty"`
	DivisionIDs []string  `json:"divisionIds,omitempty"`
	ManagerID   *string   `json:"managerId,omitempty"`
	Password    *string   `json:"password,omitempty"`
	IsActive    *bool     `json:"isActive,omitempty"`
}

// UserMutationResponse for mutations returning User.
type UserMutationResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	User    *User  `json:"user,omitempty"`
}

// ============================================================================
// DEVICE TYPES
// ============================================================================

// Device represents a bound mobile device.
type Device struct {
	ID                string       `json:"id"`
	DeviceID          string       `json:"deviceId"`
	DeviceFingerprint string       `json:"deviceFingerprint"`
	Platform          PlatformType `json:"platform"`
	DeviceInfo        *DeviceInfo  `json:"deviceInfo"`
	TrustLevel        string       `json:"trustLevel"`
	IsTrusted         bool         `json:"isTrusted"`
	IsAuthorized      bool         `json:"isAuthorized"`
	LastSeenAt        time.Time    `json:"lastSeenAt"`
	CreatedAt         time.Time    `json:"createdAt"`
	UpdatedAt         time.Time    `json:"updatedAt"`
}

// DeviceInfo contains device details.
type DeviceInfo struct {
	Model            string  `json:"model"`
	OsVersion        string  `json:"osVersion"`
	AppVersion       string  `json:"appVersion"`
	DeviceName       *string `json:"deviceName,omitempty"`
	ScreenResolution *string `json:"screenResolution,omitempty"`
	DeviceLanguage   *string `json:"deviceLanguage,omitempty"`
}

// DeviceInfoInput for device registration.
type DeviceInfoInput struct {
	Model            string  `json:"model"`
	OsVersion        string  `json:"osVersion"`
	AppVersion       string  `json:"appVersion"`
	DeviceName       *string `json:"deviceName,omitempty"`
	ScreenResolution *string `json:"screenResolution,omitempty"`
	DeviceLanguage   *string `json:"deviceLanguage,omitempty"`
}

// DeviceBindInput for binding a device.
type DeviceBindInput struct {
	DeviceID          string           `json:"deviceId"`
	DeviceFingerprint string           `json:"deviceFingerprint"`
	Platform          PlatformType     `json:"platform"`
	DeviceInfo        *DeviceInfoInput `json:"deviceInfo"`
	BiometricHash     *string          `json:"biometricHash,omitempty"`
}

// DeviceResponse for device operations.
type DeviceResponse struct {
	Success    bool    `json:"success"`
	Message    string  `json:"message"`
	Device     *Device `json:"device,omitempty"`
	TrustLevel *string `json:"trustLevel,omitempty"`
}

// ============================================================================
// ENUMS
// ============================================================================

// UserRole represents the role of a user.
type UserRole string

const (
	UserRoleSuperAdmin   UserRole = "SUPER_ADMIN"
	UserRoleCompanyAdmin UserRole = "COMPANY_ADMIN"
	UserRoleAreaManager  UserRole = "AREA_MANAGER"
	UserRoleManager      UserRole = "MANAGER"
	UserRoleAsisten      UserRole = "ASISTEN"
	UserRoleMandor       UserRole = "MANDOR"
	UserRoleSatpam       UserRole = "SATPAM"
	UserRoleTimbangan    UserRole = "TIMBANGAN"
	UserRoleGrading      UserRole = "GRADING"
)

var AllUserRole = []UserRole{
	UserRoleSuperAdmin,
	UserRoleCompanyAdmin,
	UserRoleAreaManager,
	UserRoleManager,
	UserRoleAsisten,
	UserRoleMandor,
	UserRoleSatpam,
	UserRoleTimbangan,
	UserRoleGrading,
}

func (e UserRole) IsValid() bool {
	switch e {
	case UserRoleSuperAdmin, UserRoleCompanyAdmin, UserRoleAreaManager, UserRoleManager, UserRoleAsisten, UserRoleMandor, UserRoleSatpam, UserRoleTimbangan, UserRoleGrading:
		return true
	}
	return false
}

func (e UserRole) String() string {
	return string(e)
}

func (e *UserRole) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = UserRole(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid UserRole", str)
	}
	return nil
}

func (e UserRole) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *UserRole) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e UserRole) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// PlatformType represents client platform.
type PlatformType string

const (
	PlatformTypeWeb     PlatformType = "WEB"
	PlatformTypeAndroid PlatformType = "ANDROID"
	PlatformTypeIos     PlatformType = "IOS"
)

var AllPlatformType = []PlatformType{
	PlatformTypeWeb,
	PlatformTypeAndroid,
	PlatformTypeIos,
}

func (e PlatformType) IsValid() bool {
	switch e {
	case PlatformTypeWeb, PlatformTypeAndroid, PlatformTypeIos:
		return true
	}
	return false
}

func (e PlatformType) String() string {
	return string(e)
}

func (e *PlatformType) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = PlatformType(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid PlatformType", str)
	}
	return nil
}

func (e PlatformType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *PlatformType) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e PlatformType) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// PageInfo for pagination.
type PageInfo struct {
	CurrentPage     int32 `json:"currentPage"`
	TotalPages      int32 `json:"totalPages"`
	HasNextPage     bool  `json:"hasNextPage"`
	HasPreviousPage bool  `json:"hasPreviousPage"`
}

// UserListResponse for paginated user list.
type UserListResponse struct {
	Users       []*User   `json:"users"`
	TotalCount  int32     `json:"totalCount"`
	HasMore     bool      `json:"hasMore"`
	HasNextPage bool      `json:"hasNextPage"`
	PageInfo    *PageInfo `json:"pageInfo,omitempty"`
}

// ============================================================================
// PROFILE INTERFACES
// ============================================================================

// UserProfile interface for role-specific profiles.
type UserProfile interface {
	IsUserProfile()
}

// ForceLogoutResponse for force logout operations.
type ForceLogoutResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Count   *int32 `json:"count,omitempty"`
}

// SessionFilterInput for filtering user sessions.
type SessionFilterInput struct {
	UserID       *string    `json:"userId,omitempty"`
	DeviceType   *string    `json:"deviceType,omitempty"`
	IsActive     *bool      `json:"isActive,omitempty"`
	CreatedAfter *time.Time `json:"createdAfter,omitempty"`
}

// UserSession represents an active user session.
type UserSession struct {
	ID           string     `json:"id"`
	UserID       string     `json:"userId"`
	DeviceID     *string    `json:"deviceId,omitempty"`
	DeviceType   *string    `json:"deviceType,omitempty"`
	IPAddress    *string    `json:"ipAddress,omitempty"`
	UserAgent    *string    `json:"userAgent,omitempty"`
	IsActive     bool       `json:"isActive"`
	LastActiveAt *time.Time `json:"lastActiveAt,omitempty"`
	ExpiresAt    *time.Time `json:"expiresAt,omitempty"`
	CreatedAt    time.Time  `json:"createdAt"`
}

// ============================================================================
// ROLE AUTHORIZATION TYPES
// ============================================================================

// RoleInfo contains detailed information about a role.
type RoleInfo struct {
	Role         UserRole `json:"role"`
	Level        int32    `json:"level"`
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Permissions  []string `json:"permissions"`
	WebAccess    bool     `json:"webAccess"`
	MobileAccess bool     `json:"mobileAccess"`
}

// RoleAccessCheck represents the result of a role access check.
type RoleAccessCheck struct {
	CanAccess     bool     `json:"canAccess"`
	CanManage     bool     `json:"canManage"`
	CanAssignRole bool     `json:"canAssignRole"`
	RequesterRole UserRole `json:"requesterRole"`
	TargetRole    UserRole `json:"targetRole"`
	Explanation   *string  `json:"explanation,omitempty"`
}

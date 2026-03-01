package domain

import (
	"time"
)

// User represents the core user entity shared across all features
type User struct {
	ID                 string
	Username           string
	Name               string
	Email              *string
	Phone              *string
	Avatar             *string
	Password           string // hashed
	Role               Role
	IsActive           bool
	ManagerID          *string // Explicit hierarchy
	LanguagePreference *string // en, id
	CreatedAt          time.Time
	UpdatedAt          time.Time

	// Relations
	Assignments []Assignment
	Manager     *User
}

// UserDTO represents user data transfer object for API responses
type UserDTO struct {
	ID                 string      `json:"id"`
	Username           string      `json:"username"`
	Name               string      `json:"name"`
	Email              *string     `json:"email"`
	Phone              *string     `json:"phone"`
	Avatar             *string     `json:"avatar,omitempty"`
	Role               Role        `json:"role"`
	IsActive           bool        `json:"isActive"`
	CompanyID          string      `json:"companyId"`
	CompanyIDs         []string    `json:"companyIds,omitempty"`
	Company            *CompanyDTO `json:"company,omitempty"`
	EstateIDs          []string    `json:"estateIds,omitempty"`
	DivisionIDs        []string    `json:"divisionIds,omitempty"`
	ManagerID          *string     `json:"managerId"`
	Manager            *UserDTO    `json:"manager,omitempty"`
	LanguagePreference *string     `json:"languagePreference"`
}

// Company represents company entity
type Company struct {
	ID      string
	Name    string
	LogoURL *string
	Status  string
	Address *string
	Phone   *string
}

// CompanyDTO represents company data transfer object
type CompanyDTO struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	LogoURL *string `json:"logoUrl,omitempty"`
	Status  string  `json:"status"`
	Address *string `json:"address"`
	Phone   *string `json:"phone"`
}

// Assignment represents user assignments to estates/divisions
type Assignment struct {
	ID         string
	UserID     string
	CompanyID  string
	EstateID   *string
	DivisionID *string
	AssignedBy string
	Role       Role
	IsActive   bool
	CreatedAt  time.Time
	UpdatedAt  time.Time

	// Relations
	Company  *Company
	Estate   *Estate
	Division *Division
}

type AssignmentDTO struct {
	ID         string       `json:"id"`
	CompanyID  string       `json:"companyId"`
	EstateID   *string      `json:"estateId"`
	DivisionID *string      `json:"divisionId"`
	Role       Role         `json:"role"`
	IsActive   bool         `json:"isActive"`
	Company    *CompanyDTO  `json:"company,omitempty"`
	Estate     *EstateDTO   `json:"estate,omitempty"`
	Division   *DivisionDTO `json:"division,omitempty"`
}

// Estate represents estate entity
type Estate struct {
	ID        string
	CompanyID string
	Name      string
	Code      *string
	IsActive  bool
}

// EstateDTO represents estate data transfer object
type EstateDTO struct {
	ID        string  `json:"id"`
	CompanyID string  `json:"companyId"`
	Name      string  `json:"name"`
	Code      *string `json:"code"`
	IsActive  bool    `json:"isActive"`
}

// Division represents division entity
type Division struct {
	ID        string
	CompanyID string
	EstateID  *string
	Name      string
	Code      *string
	IsActive  bool
}

// DivisionDTO represents division data transfer object
type DivisionDTO struct {
	ID        string  `json:"id"`
	CompanyID string  `json:"companyId"`
	EstateID  *string `json:"estateId"`
	Name      string  `json:"name"`
	Code      *string `json:"code"`
	IsActive  bool    `json:"isActive"`
}

// Role represents user roles with hierarchy
type Role string

const (
	RoleSuperAdmin   Role = "SUPER_ADMIN"
	RoleCompanyAdmin Role = "COMPANY_ADMIN"
	RoleAreaManager  Role = "AREA_MANAGER"
	RoleManager      Role = "MANAGER"
	RoleAsisten      Role = "ASISTEN"
	RoleMandor       Role = "MANDOR"
	RoleSatpam       Role = "SATPAM"
	RoleTimbangan    Role = "TIMBANGAN"
	RoleGrading      Role = "GRADING"
)

// HasMobileAccess returns true if the role is allowed to login via mobile
func (r Role) HasMobileAccess() bool {
	switch r {
	case RoleSuperAdmin, RoleCompanyAdmin:
		return false
	default:
		return true
	}
}

// PlatformType represents authentication platforms
type PlatformType string

const (
	PlatformWeb     PlatformType = "WEB"
	PlatformAndroid PlatformType = "ANDROID"
	PlatformIOS     PlatformType = "IOS"
)

// UserSession represents user authentication sessions
type UserSession struct {
	ID            string
	UserID        string
	DeviceID      *string
	SessionToken  string
	RefreshToken  *string
	Platform      PlatformType
	IPAddress     string
	UserAgent     string
	LastActivity  time.Time
	ExpiresAt     time.Time
	IsActive      bool
	LoginMethod   string
	Revoked       bool
	RevokedBy     *string
	RevokedReason *string
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

// DeviceInfo represents device information
type DeviceInfo struct {
	Model       string `json:"model,omitempty"`
	Brand       string `json:"brand,omitempty"`
	OSVersion   string `json:"os_version,omitempty"`
	AppVersion  string `json:"app_version,omitempty"`
	BuildNumber string `json:"build_number,omitempty"`
	DeviceName  string `json:"device_name,omitempty"`
}

// ToUserDTO converts domain User to UserDTO
func ToUserDTO(user *User) UserDTO {
	dto := UserDTO{
		ID:                 user.ID,
		Username:           user.Username,
		Name:               user.Name,
		Email:              user.Email,
		Phone:              user.Phone,
		Avatar:             user.Avatar,
		Role:               user.Role,
		IsActive:           user.IsActive,
		LanguagePreference: user.LanguagePreference,
		ManagerID:          user.ManagerID,
	}

	// Derive CompanyID and Company from Assignments if available
	// We pick the first active assignment for legacy compatibility
	if len(user.Assignments) > 0 {
		// Try to find a company assignment first
		for _, assignment := range user.Assignments {
			if assignment.IsActive {
				dto.CompanyID = assignment.CompanyID
				if assignment.Company != nil {
					company := ToCompanyDTO(assignment.Company)
					dto.Company = &company
				}
				break
			}
		}
	}

	if user.Manager != nil {
		manager := ToUserDTO(user.Manager)
		dto.Manager = &manager
	}

	return dto
}

// ToCompanyDTO converts domain Company to CompanyDTO
func ToCompanyDTO(company *Company) CompanyDTO {
	return CompanyDTO{
		ID:      company.ID,
		Name:    company.Name,
		LogoURL: company.LogoURL,
		Status:  company.Status,
		Address: company.Address,
		Phone:   company.Phone,
	}
}

// ToAssignmentDTO converts domain Assignment to AssignmentDTO
func ToAssignmentDTO(assignment *Assignment) AssignmentDTO {
	dto := AssignmentDTO{
		ID:         assignment.ID,
		CompanyID:  assignment.CompanyID,
		EstateID:   assignment.EstateID,
		DivisionID: assignment.DivisionID,
		Role:       assignment.Role,
		IsActive:   assignment.IsActive,
	}

	if assignment.Company != nil {
		company := ToCompanyDTO(assignment.Company)
		dto.Company = &company
	}

	if assignment.Estate != nil {
		estate := &EstateDTO{
			ID:        assignment.Estate.ID,
			CompanyID: assignment.Estate.CompanyID,
			Name:      assignment.Estate.Name,
			Code:      assignment.Estate.Code,
			IsActive:  assignment.Estate.IsActive,
		}
		dto.Estate = estate
	}

	if assignment.Division != nil {
		division := &DivisionDTO{
			ID:        assignment.Division.ID,
			CompanyID: assignment.Division.CompanyID,
			EstateID:  assignment.Division.EstateID,
			Name:      assignment.Division.Name,
			Code:      assignment.Division.Code,
			IsActive:  assignment.Division.IsActive,
		}
		dto.Division = division
	}

	return dto
}

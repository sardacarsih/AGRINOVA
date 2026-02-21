package models

import (
	"time"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/master"
)

// Import shared entities
type Company = master.Company
type CompanyStatus = master.CompanyStatus
type Estate = master.Estate
type Block = master.Block
type Division = master.Division
type TarifBlok = master.TarifBlok
type Vehicle = master.Vehicle
type VehicleTax = master.VehicleTax
type VehicleTaxDocument = master.VehicleTaxDocument
type VehicleTaxNotification = master.VehicleTaxNotification
type User = auth.User
type UserRole = auth.UserRole
type UserCompanyAssignment = auth.UserCompanyAssignment

// Assignment types (locally defined since not in domain packages)
type UserEstateAssignment struct {
	ID         string         `json:"id"`
	UserID     string         `json:"user_id"`
	User       *User          `json:"user,omitempty"`
	EstateID   string         `json:"estate_id"`
	Estate     *master.Estate `json:"estate,omitempty"`
	IsActive   bool           `json:"is_active"`
	AssignedAt time.Time      `json:"assigned_at"`
	AssignedBy *string        `json:"assigned_by,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
}

type UserDivisionAssignment struct {
	ID         string           `json:"id"`
	UserID     string           `json:"user_id"`
	User       *User            `json:"user,omitempty"`
	DivisionID string           `json:"division_id"`
	Division   *master.Division `json:"division,omitempty"`
	IsActive   bool             `json:"is_active"`
	AssignedAt time.Time        `json:"assigned_at"`
	AssignedBy *string          `json:"assigned_by,omitempty"`
	CreatedAt  time.Time        `json:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at"`
}

// Constants from shared models
const (
	CompanyActive    = master.CompanyStatusActive
	CompanyInactive  = master.CompanyStatusInactive
	CompanySuspended = master.CompanyStatusSuspended
)

// Assignment request types
type AssignUserToEstateRequest struct {
	UserID   string `json:"user_id" validate:"required,uuid"`
	EstateID string `json:"estate_id" validate:"required,uuid"`
}

type AssignUserToDivisionRequest struct {
	UserID     string `json:"user_id" validate:"required,uuid"`
	DivisionID string `json:"division_id" validate:"required,uuid"`
}

type AssignUserToCompanyRequest struct {
	UserID    string `json:"user_id" validate:"required,uuid"`
	CompanyID string `json:"company_id" validate:"required,uuid"`
}
type UserAssignmentsResponse struct {
	Estates   []master.Estate
	Divisions []master.Division
	Companies []master.Company
}
type MasterDataStatistics struct {
	TotalCompanies           int64
	ActiveCompanies          int64
	TotalEstates             int64
	TotalBlocks              int64
	TotalDivisions           int64
	TotalEstateAssignments   int64
	TotalDivisionAssignments int64
	TotalCompanyAssignments  int64
	LastUpdated              time.Time
}

// CreateCompanyRequest represents the input for creating a company
type CreateCompanyRequest struct {
	Name        string         `json:"name" validate:"required,min=2,max=255"`
	CompanyCode string         `json:"company_code" validate:"required,min=2,max=50"`
	Description string         `json:"description" validate:"max=1000"`
	LogoURL     string         `json:"logo_url" validate:"max=10485760"`
	Address     string         `json:"address" validate:"max=500"`
	Phone       string         `json:"phone" validate:"max=20"`
	Status      *CompanyStatus `json:"status,omitempty"`
	IsActive    *bool          `json:"is_active,omitempty"`
}

// UpdateCompanyRequest represents the input for updating a company
type UpdateCompanyRequest struct {
	ID          string         `json:"id" validate:"required"`
	Name        *string        `json:"name,omitempty" validate:"omitempty,min=2,max=255"`
	CompanyCode *string        `json:"company_code,omitempty" validate:"omitempty,min=2,max=50"`
	Description *string        `json:"description,omitempty" validate:"omitempty,max=1000"`
	LogoURL     *string        `json:"logo_url,omitempty" validate:"omitempty,max=10485760"`
	Address     *string        `json:"address,omitempty" validate:"omitempty,max=500"`
	Phone       *string        `json:"phone,omitempty" validate:"omitempty,max=20"`
	Status      *CompanyStatus `json:"status,omitempty"`
	IsActive    *bool          `json:"is_active,omitempty"`
}

// CreateEstateRequest represents the input for creating an estate
type CreateEstateRequest struct {
	Name      string   `json:"name" validate:"required,min=2,max=255"`
	Code      string   `json:"code" validate:"required,min=1,max=50"`
	Location  string   `json:"location" validate:"max=500"`
	LuasHa    *float64 `json:"luas_ha,omitempty" validate:"omitempty,gte=0"`
	CompanyID string   `json:"company_id" validate:"required,uuid"`
}

// UpdateEstateRequest represents the input for updating an estate
type UpdateEstateRequest struct {
	ID       string   `json:"id" validate:"required"`
	Name     *string  `json:"name,omitempty" validate:"omitempty,min=2,max=255"`
	Code     *string  `json:"code,omitempty" validate:"omitempty,min=1,max=50"`
	Location *string  `json:"location,omitempty" validate:"omitempty,max=500"`
	LuasHa   *float64 `json:"luas_ha,omitempty" validate:"omitempty,gte=0"`
}

// CreateBlockRequest represents the input for creating a block
type CreateBlockRequest struct {
	BlockCode    string   `json:"block_code" validate:"omitempty,max=50"`
	Name         string   `json:"name" validate:"required,min=2,max=255"`
	LuasHa       *float64 `json:"luas_ha,omitempty" validate:"omitempty,gte=0"`
	CropType     string   `json:"crop_type" validate:"max=100"`
	PlantingYear *int     `json:"planting_year,omitempty" validate:"omitempty,gte=1900,lte=2100"`
	Status       string   `json:"status,omitempty" validate:"omitempty,oneof=INTI KKPA"`
	ISTM         string   `json:"istm,omitempty" validate:"omitempty,oneof=Y N"`
	TarifBlokID  *string  `json:"tarif_blok_id,omitempty" validate:"omitempty,uuid"`
	DivisionID   string   `json:"division_id" validate:"required,uuid"`
}

// UpdateBlockRequest represents the input for updating a block
type UpdateBlockRequest struct {
	ID           string   `json:"id" validate:"required"`
	BlockCode    *string  `json:"block_code,omitempty" validate:"omitempty,min=1,max=50"`
	Name         *string  `json:"name,omitempty" validate:"omitempty,min=2,max=255"`
	LuasHa       *float64 `json:"luas_ha,omitempty" validate:"omitempty,gte=0"`
	CropType     *string  `json:"crop_type,omitempty" validate:"omitempty,max=100"`
	PlantingYear *int     `json:"planting_year,omitempty" validate:"omitempty,gte=1900,lte=2100"`
	Status       *string  `json:"status,omitempty" validate:"omitempty,oneof=INTI KKPA"`
	ISTM         *string  `json:"istm,omitempty" validate:"omitempty,oneof=Y N"`
	TarifBlokID  *string  `json:"tarif_blok_id,omitempty" validate:"omitempty,uuid"`
}

// CreateTarifBlokRequest represents the input for creating a tarif blok.
type CreateTarifBlokRequest struct {
	CompanyID    string   `json:"company_id" validate:"required,uuid"`
	Perlakuan    string   `json:"perlakuan" validate:"required,min=1,max=100"`
	Basis        *float64 `json:"basis,omitempty" validate:"omitempty,gte=0"`
	TarifUpah    *float64 `json:"tarif_upah,omitempty" validate:"omitempty,gte=0"`
	Premi        *float64 `json:"premi,omitempty" validate:"omitempty,gte=0"`
	TarifPremi1  *float64 `json:"tarif_premi1,omitempty" validate:"omitempty,gte=0"`
	TarifPremi2  *float64 `json:"tarif_premi2,omitempty" validate:"omitempty,gte=0"`
	TarifLibur   *float64 `json:"tarif_libur,omitempty" validate:"omitempty,gte=0"`
	TarifLebaran *float64 `json:"tarif_lebaran,omitempty" validate:"omitempty,gte=0"`
	IsActive     *bool    `json:"is_active,omitempty"`
}

// UpdateTarifBlokRequest represents the input for updating a tarif blok.
type UpdateTarifBlokRequest struct {
	ID           string   `json:"id" validate:"required,uuid"`
	CompanyID    *string  `json:"company_id,omitempty" validate:"omitempty,uuid"`
	Perlakuan    *string  `json:"perlakuan,omitempty" validate:"omitempty,min=1,max=100"`
	Basis        *float64 `json:"basis,omitempty" validate:"omitempty,gte=0"`
	TarifUpah    *float64 `json:"tarif_upah,omitempty" validate:"omitempty,gte=0"`
	Premi        *float64 `json:"premi,omitempty" validate:"omitempty,gte=0"`
	TarifPremi1  *float64 `json:"tarif_premi1,omitempty" validate:"omitempty,gte=0"`
	TarifPremi2  *float64 `json:"tarif_premi2,omitempty" validate:"omitempty,gte=0"`
	TarifLibur   *float64 `json:"tarif_libur,omitempty" validate:"omitempty,gte=0"`
	TarifLebaran *float64 `json:"tarif_lebaran,omitempty" validate:"omitempty,gte=0"`
	IsActive     *bool    `json:"is_active,omitempty"`
}

// CreateDivisionRequest represents the input for creating a division
type CreateDivisionRequest struct {
	Name     string `json:"name" validate:"required,min=2,max=255"`
	Code     string `json:"code" validate:"required,min=1,max=50"`
	EstateID string `json:"estate_id" validate:"required,uuid"`
}

// UpdateDivisionRequest represents the input for updating a division
type UpdateDivisionRequest struct {
	ID   string  `json:"id" validate:"required"`
	Name *string `json:"name,omitempty" validate:"omitempty,min=2,max=255"`
	Code *string `json:"code,omitempty" validate:"omitempty,min=1,max=50"`
}

// MasterFilters contains common filters for querying master data
type MasterFilters struct {
	CompanyID  *string `json:"company_id,omitempty"`
	EstateID   *string `json:"estate_id,omitempty"`
	DivisionID *string `json:"division_id,omitempty"`
	IsActive   *bool   `json:"is_active,omitempty"`
	Search     *string `json:"search,omitempty"`
	Limit      *int    `json:"limit,omitempty"`
	Offset     *int    `json:"offset,omitempty"`
	OrderBy    *string `json:"order_by,omitempty"`
	OrderDir   *string `json:"order_dir,omitempty"`
}

// Validation helpers and constants
const (
	DefaultLimit    = 50
	MaxLimit        = 1000
	DefaultOrderBy  = "created_at"
	DefaultOrderDir = "DESC"
)

// AssignmentValidationOptions holds validation options for assignments
type AssignmentValidationOptions struct {
	ValidateUserExists    bool
	ValidateTargetExists  bool
	ValidateUserRole      bool
	ValidateAssignerRole  bool
	ValidateCompanyAccess bool
}

// DefaultAssignmentValidationOptions returns default validation options
func DefaultAssignmentValidationOptions() AssignmentValidationOptions {
	return AssignmentValidationOptions{
		ValidateUserExists:    true,
		ValidateTargetExists:  true,
		ValidateUserRole:      true,
		ValidateAssignerRole:  true,
		ValidateCompanyAccess: true,
	}
}

// BulkOperationResult represents the result of a bulk operation
type BulkOperationResult struct {
	Success    int      `json:"success"`
	Failed     int      `json:"failed"`
	Errors     []string `json:"errors,omitempty"`
	CreatedIDs []string `json:"created_ids,omitempty"`
	UpdatedIDs []string `json:"updated_ids,omitempty"`
}

// MasterDataError represents custom errors for master data operations
type MasterDataError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Field   string `json:"field,omitempty"`
}

func (e *MasterDataError) Error() string {
	return e.Message
}

// Common error codes
const (
	ErrCodeNotFound              = "NOT_FOUND"
	ErrCodeDuplicateEntry        = "DUPLICATE_ENTRY"
	ErrCodeInvalidInput          = "INVALID_INPUT"
	ErrCodePermissionDenied      = "PERMISSION_DENIED"
	ErrCodeAssignmentConflict    = "ASSIGNMENT_CONFLICT"
	ErrCodeInactiveEntity        = "INACTIVE_ENTITY"
	ErrCodeDependencyExists      = "DEPENDENCY_EXISTS"
	ErrCodeBusinessRuleViolation = "BUSINESS_RULE_VIOLATION"
)

// NewMasterDataError creates a new master data error
func NewMasterDataError(code, message, field string) *MasterDataError {
	return &MasterDataError{
		Code:    code,
		Message: message,
		Field:   field,
	}
}

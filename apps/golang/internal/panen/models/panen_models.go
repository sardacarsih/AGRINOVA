package models

import (
	"time"

	"agrinovagraphql/server/internal/graphql/domain/mandor"
)

// Import domain-specific entities (no re-export)
type HarvestRecord = mandor.HarvestRecord
type HarvestStatus = mandor.HarvestStatus

// HarvestStatus constants
const (
	HarvestPending  = mandor.HarvestStatusPending
	HarvestApproved = mandor.HarvestStatusApproved
	HarvestRejected = mandor.HarvestStatusRejected
)

// CreateHarvestRecordRequest represents the input for creating a harvest record
type CreateHarvestRecordRequest struct {
	Tanggal       time.Time `json:"tanggal" validate:"required"`
	MandorID      string    `json:"mandor_id" validate:"required,uuid"`
	BlockID       string    `json:"block_id" validate:"required,uuid"`
	Karyawan      string    `json:"karyawan" validate:"required,min=2,max=255"`
	BeratTbs      float64   `json:"berat_tbs" validate:"required,min=0"`
	JumlahJanjang int       `json:"jumlah_janjang" validate:"required,min=1"`
}

// UpdateHarvestRecordRequest represents the input for updating a harvest record
type UpdateHarvestRecordRequest struct {
	ID            string   `json:"id" validate:"required,uuid"`
	BeratTbs      *float64 `json:"berat_tbs,omitempty" validate:"omitempty,min=0"`
	JumlahJanjang *int     `json:"jumlah_janjang,omitempty" validate:"omitempty,min=1"`
	Karyawan      *string  `json:"karyawan,omitempty" validate:"omitempty,min=2,max=255"`
}

// ApproveHarvestRequest represents the input for approving a harvest record
type ApproveHarvestRequest struct {
	ID         string `json:"id" validate:"required,uuid"`
	ApprovedBy string `json:"approved_by" validate:"required,uuid"`
}

// RejectHarvestRequest represents the input for rejecting a harvest record
type RejectHarvestRequest struct {
	ID             string `json:"id" validate:"required,uuid"`
	RejectedReason string `json:"rejected_reason" validate:"required,min=5,max=500"`
}

// HarvestFilters contains common filters for querying harvest records
type HarvestFilters struct {
	MandorID    *string        `json:"mandor_id,omitempty"`
	BlockID     *string        `json:"block_id,omitempty"`
	DivisionIDs []string       `json:"division_ids,omitempty"`
	EstateIDs   []string       `json:"estate_ids,omitempty"`
	CompanyIDs  []string       `json:"company_ids,omitempty"`
	Status      *HarvestStatus `json:"status,omitempty"`
	DateFrom    *time.Time     `json:"date_from,omitempty"`
	DateTo      *time.Time     `json:"date_to,omitempty"`
	Search      *string        `json:"search,omitempty"`
	Limit       *int           `json:"limit,omitempty"`
	Offset      *int           `json:"offset,omitempty"`
	OrderBy     *string        `json:"order_by,omitempty"`
	OrderDir    *string        `json:"order_dir,omitempty"`
}

// Validation helpers and constants
const (
	DefaultHarvestLimit   = 50
	MaxHarvestLimit       = 1000
	DefaultHarvestOrderBy = "tanggal"
	DefaultOrderDir       = "DESC"
)

// HarvestStatistics represents statistics for harvest data
type HarvestStatistics struct {
	TotalRecords     int64     `json:"total_records"`
	PendingRecords   int64     `json:"pending_records"`
	ApprovedRecords  int64     `json:"approved_records"`
	RejectedRecords  int64     `json:"rejected_records"`
	TotalBeratTbs    float64   `json:"total_berat_tbs"`
	TotalJanjang     int64     `json:"total_janjang"`
	AveragePerRecord float64   `json:"average_per_record"`
	LastUpdated      time.Time `json:"last_updated"`
}

// HarvestError represents custom errors for harvest operations
type HarvestError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Field   string `json:"field,omitempty"`
}

func (e *HarvestError) Error() string {
	return e.Message
}

// Common harvest error codes
const (
	ErrHarvestNotFound        = "HARVEST_NOT_FOUND"
	ErrInvalidMandor          = "INVALID_MANDOR"
	ErrInvalidBlock           = "INVALID_BLOCK"
	ErrHarvestAlreadyApproved = "HARVEST_ALREADY_APPROVED"
	ErrHarvestAlreadyRejected = "HARVEST_ALREADY_REJECTED"
	ErrInvalidApprover        = "INVALID_APPROVER"
	ErrCannotModifyApproved   = "CANNOT_MODIFY_APPROVED"
)

// NewHarvestError creates a new harvest error
func NewHarvestError(code, message, field string) *HarvestError {
	return &HarvestError{
		Code:    code,
		Message: message,
		Field:   field,
	}
}

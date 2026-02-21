package domain

import (
	"time"
)

// HarvestStatus represents the status of a harvest record
type HarvestStatus string

const (
	HarvestStatusPending  HarvestStatus = "PENDING"
	HarvestStatusApproved HarvestStatus = "APPROVED"
	HarvestStatusRejected HarvestStatus = "REJECTED"
)

// HarvestRecord represents the core domain entity for a harvest
type HarvestRecord struct {
	ID             string        `json:"id"`
	LocalID        *string       `json:"local_id,omitempty"`
	Tanggal        time.Time     `json:"tanggal"`
	MandorID       string        `json:"mandor_id"`
	AsistenID      *string       `json:"asisten_id,omitempty"`
	CompanyID      *string       `json:"company_id,omitempty"`
	EstateID       *string       `json:"estate_id,omitempty"`
	DivisionID     *string       `json:"division_id,omitempty"`
	BlockID        string        `json:"block_id"`
	KaryawanID     *string       `json:"karyawan_id,omitempty"`
	Karyawan       string        `json:"karyawan"`
	BeratTbs       float64       `json:"berat_tbs"`
	JumlahJanjang  int           `json:"jumlah_janjang"`
	Status         HarvestStatus `json:"status"`
	ApprovedBy     *string       `json:"approved_by,omitempty"`
	RejectedReason *string       `json:"rejected_reason,omitempty"`
	Notes          *string       `json:"notes,omitempty"`
	Latitude       *float64      `json:"latitude,omitempty"`
	Longitude      *float64      `json:"longitude,omitempty"`
	PhotoURL       *string       `json:"photo_url,omitempty"`
	CreatedAt      time.Time     `json:"created_at"`
	UpdatedAt      time.Time     `json:"updated_at"`
}

// HarvestStatistics represents aggregated statistics for harvest data
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

// HarvestFilters contains criteria for querying harvest records
type HarvestFilters struct {
	MandorID    *string
	BlockID     *string
	DivisionIDs []string
	EstateIDs   []string
	CompanyIDs  []string
	Status      *HarvestStatus
	DateFrom    *time.Time
	DateTo      *time.Time
	Search      *string
	Limit       *int
	Offset      *int
	OrderBy     *string
	OrderDir    *string
}

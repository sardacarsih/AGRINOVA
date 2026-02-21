package application

import (
	"time"

	"agrinovagraphql/server/internal/panen/domain"
)

// CreateHarvestRequest represents the input for creating a harvest record
type CreateHarvestRequest struct {
	LocalID       *string   `json:"local_id,omitempty"`
	Tanggal       time.Time `json:"tanggal" validate:"required"`
	MandorID      string    `json:"mandor_id" validate:"required,uuid"`
	BlockID       string    `json:"block_id" validate:"required,uuid"`
	Karyawan      string    `json:"karyawan" validate:"required,min=2,max=255"`
	BeratTbs      float64   `json:"berat_tbs" validate:"required,min=0"`
	JumlahJanjang int       `json:"jumlah_janjang" validate:"required,min=1"`
}

// UpdateHarvestRequest represents the input for updating a harvest record
type UpdateHarvestRequest struct {
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

// HarvestResponse represents the output for a harvest record
type HarvestResponse struct {
	ID             string               `json:"id"`
	LocalID        *string              `json:"local_id,omitempty"`
	Tanggal        time.Time            `json:"tanggal"`
	MandorID       string               `json:"mandor_id"`
	BlockID        string               `json:"block_id"`
	Karyawan       string               `json:"karyawan"`
	BeratTbs       float64              `json:"berat_tbs"`
	JumlahJanjang  int                  `json:"jumlah_janjang"`
	Status         domain.HarvestStatus `json:"status"`
	ApprovedBy     *string              `json:"approved_by,omitempty"`
	RejectedReason *string              `json:"rejected_reason,omitempty"`
	CreatedAt      time.Time            `json:"created_at"`
	UpdatedAt      time.Time            `json:"updated_at"`
}

// FromDomain converts a domain entity to a response DTO
func FromDomain(h *domain.HarvestRecord) *HarvestResponse {
	return &HarvestResponse{
		ID:             h.ID,
		LocalID:        h.LocalID,
		Tanggal:        h.Tanggal,
		MandorID:       h.MandorID,
		BlockID:        h.BlockID,
		Karyawan:       h.Karyawan,
		BeratTbs:       h.BeratTbs,
		JumlahJanjang:  h.JumlahJanjang,
		Status:         h.Status,
		ApprovedBy:     h.ApprovedBy,
		RejectedReason: h.RejectedReason,
		CreatedAt:      h.CreatedAt,
		UpdatedAt:      h.UpdatedAt,
	}
}

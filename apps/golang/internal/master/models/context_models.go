package models

import (
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"time"
)

// HarvestContext represents the context for harvest operations
type HarvestContext struct {
	UserID                string             `json:"user_id"`
	UserRole              auth.UserRole      `json:"user_role"`
	ActiveCompanyIDs      []string           `json:"active_company_ids"`
	ActiveEstateIDs       []string           `json:"active_estate_ids"`
	ActiveDivisionIDs     []string           `json:"active_division_ids"`
	AssignmentSummary     *AssignmentSummary `json:"assignment_summary"`
	RecentBlocks          []*BlockWithStats  `json:"recent_blocks"`
	DefaultDivisionBlocks []*Block           `json:"default_division_blocks"`
	LastUpdated           time.Time          `json:"last_updated"`
}

// AssignmentSummary provides a summary of user assignments
type AssignmentSummary struct {
	TotalEstates      int32    `json:"total_estates"`
	TotalDivisions    int32    `json:"total_divisions"`
	TotalBlocks       int32    `json:"total_blocks"`
	PrimaryDivisionID *string  `json:"primary_division_id,omitempty"`
	EstateNames       []string `json:"estate_names"`
	DivisionNames     []string `json:"division_names"`
}

// BlockWithStats extends Block with harvest statistics
type BlockWithStats struct {
	ID               string     `json:"id"`
	KodeBlok         string     `json:"kode_blok"`
	Nama             string     `json:"nama"`
	Division         *Division  `json:"division"`
	TotalHarvests    int64      `json:"total_harvests"`
	TotalTonnage     float64    `json:"total_tonnage"`
	LastHarvestDate  *time.Time `json:"last_harvest_date"`
	HarvestCount     int32      `json:"harvest_count"`
	HarvestStatus    string     `json:"harvest_status"`
	RotationProgress float64    `json:"rotation_progress"`
}

// BlockFilters contains filters for querying blocks
type BlockFilters struct {
	CompanyID       string `json:"company_id,omitempty"`
	EstateID        string `json:"estate_id,omitempty"`
	DivisionID      string `json:"division_id,omitempty"`
	IncludeInactive bool   `json:"include_inactive,omitempty"`
	Search          string `json:"search,omitempty"`
	Limit           int32  `json:"limit,omitempty"`
	Offset          int32  `json:"offset,omitempty"`
	SortBy          string `json:"sort_by,omitempty"`
}

// BlocksPage represents a paginated list of blocks
type BlocksPage struct {
	Blocks     []*Block `json:"blocks"`
	TotalCount int32    `json:"total_count"`
	HasMore    bool     `json:"has_more"`
}

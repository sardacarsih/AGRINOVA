package models

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// GradingRecord represents a quality grading record for harvest
type GradingRecord struct {
	ID                   string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	HarvestRecordID      string    `gorm:"type:uuid;not null;index" json:"harvestRecordId"`
	GraderID             string    `gorm:"type:uuid;not null" json:"graderId"`
	QualityScore         int       `gorm:"not null;check:quality_score >= 0 AND quality_score <= 100" json:"qualityScore"`
	MaturityLevel        string    `gorm:"not null" json:"maturityLevel"`
	BrondolanPercentage  float64   `gorm:"not null;check:brondolan_percentage >= 0 AND brondolan_percentage <= 100" json:"brondolanPercentage"`
	LooseFruitPercentage float64   `gorm:"not null;check:loose_fruit_percentage >= 0 AND loose_fruit_percentage <= 100" json:"looseFruitPercentage"`
	DirtPercentage       float64   `gorm:"not null;check:dirt_percentage >= 0 AND dirt_percentage <= 100" json:"dirtPercentage"`
	GradingNotes         *string   `json:"gradingNotes"`
	GradingDate          time.Time `gorm:"not null" json:"gradingDate"`
	IsApproved           bool      `gorm:"default:false" json:"isApproved"`
	ApprovedBy           *string   `gorm:"type:uuid" json:"approvedBy"`
	ApprovedAt           *time.Time `json:"approvedAt"`
	RejectionReason      *string   `json:"rejectionReason"`
	CreatedAt            time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt            time.Time `gorm:"autoUpdateTime" json:"updatedAt"`

	// Relationships - will be loaded manually to avoid circular imports
	// HarvestRecord and Grader should be loaded via service methods
}

// TableName returns the table name for GradingRecord
func (GradingRecord) TableName() string {
	return "grading_records"
}

// BeforeCreate validates the grading record before creation
func (g *GradingRecord) BeforeCreate(tx *gorm.DB) error {
	// Validate percentage totals
	totalPercentage := g.BrondolanPercentage + g.LooseFruitPercentage + g.DirtPercentage
	if totalPercentage > 100 {
		return fmt.Errorf("total percentage cannot exceed 100%%")
	}

	// Validate maturity level
	validMaturityLevels := []string{"MENTAH", "MASAK", "TERLALU_MASAK", "BUSUK"}
	isValidMaturity := false
	for _, level := range validMaturityLevels {
		if g.MaturityLevel == level {
			isValidMaturity = true
			break
		}
	}
	if !isValidMaturity {
		return fmt.Errorf("invalid maturity level: %s", g.MaturityLevel)
	}

	return nil
}

// CanBeUpdated checks if the grading record can be updated
func (g *GradingRecord) CanBeUpdated() bool {
	return !g.IsApproved
}

// CanBeApproved checks if the grading record can be approved
func (g *GradingRecord) CanBeApproved() bool {
	return !g.IsApproved
}

// GetQualityCategory returns the quality category based on score
func (g *GradingRecord) GetQualityCategory() string {
	switch {
	case g.QualityScore >= 90:
		return "EXCELLENT"
	case g.QualityScore >= 80:
		return "GOOD"
	case g.QualityScore >= 70:
		return "FAIR"
	case g.QualityScore >= 60:
		return "POOR"
	default:
		return "VERY_POOR"
	}
}

// GetOverallGrade returns the overall grade based on multiple factors
func (g *GradingRecord) GetOverallGrade() string {
	qualityScore := float64(g.QualityScore)
	dirtPenalty := g.DirtPercentage * 0.5
	looseFruitPenalty := g.LooseFruitPercentage * 0.3

	finalScore := qualityScore - dirtPenalty - looseFruitPenalty

	switch {
	case finalScore >= 90:
		return "A"
	case finalScore >= 80:
		return "B"
	case finalScore >= 70:
		return "C"
	case finalScore >= 60:
		return "D"
	default:
		return "E"
	}
}

// GradingStatistics represents grading statistics for reporting
type GradingStatistics struct {
	TotalRecords     int     `json:"totalRecords"`
	PendingApproval  int     `json:"pendingApproval"`
	ApprovedRecords  int     `json:"approvedRecords"`
	RejectedRecords  int     `json:"rejectedRecords"`
	AverageQuality   float64 `json:"averageQuality"`
	AverageGrade     string  `json:"averageGrade"`
	TopMaturityLevel string  `json:"topMaturityLevel"`
}

// GradingFilterOptions represents filter options for grading queries
type GradingFilterOptions struct {
	HarvestRecordID *string     `json:"harvestRecordId,omitempty"`
	GraderID        *string     `json:"graderId,omitempty"`
	IsApproved      *bool       `json:"isApproved,omitempty"`
	DateRange       *DateRange  `json:"dateRange,omitempty"`
	QualityScoreMin *int        `json:"qualityScoreMin,omitempty"`
	QualityScoreMax *int        `json:"qualityScoreMax,omitempty"`
	MaturityLevel   *string     `json:"maturityLevel,omitempty"`
}

// DateRange represents a date range filter
type DateRange struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}
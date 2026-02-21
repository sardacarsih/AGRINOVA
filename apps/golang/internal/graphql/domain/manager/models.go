// Package manager contains Manager-specific GraphQL types.
package manager

import (
	"bytes"
	"fmt"
	"io"
	"strconv"
	"time"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/common"
	"agrinovagraphql/server/internal/graphql/domain/master"
)

// ============================================================================
// MANAGER DASHBOARD
// ============================================================================

// ManagerDashboardData for manager dashboard.
type ManagerDashboardData struct {
	User            *auth.User              `json:"user"`
	Estates         []*master.Estate        `json:"estates"`
	Stats           *ManagerDashboardStats  `json:"stats"`
	ActionItems     []*ManagerActionItem    `json:"actionItems"`
	TeamSummary     *ManagerTeamSummary     `json:"teamSummary"`
	TodayHighlights *ManagerTodayHighlights `json:"todayHighlights"`
}

// ManagerDashboardStats for KPIs.
type ManagerDashboardStats struct {
	TotalEstates      int32   `json:"totalEstates"`
	TotalDivisions    int32   `json:"totalDivisions"`
	TotalBlocks       int32   `json:"totalBlocks"`
	TotalEmployees    int32   `json:"totalEmployees"`
	TodayProduction   float64 `json:"todayProduction"`
	WeeklyProduction  float64 `json:"weeklyProduction"`
	MonthlyProduction float64 `json:"monthlyProduction"`
	MonthlyTarget     float64 `json:"monthlyTarget"`
	TargetAchievement float64 `json:"targetAchievement"`
	PendingApprovals  int32   `json:"pendingApprovals"`
	ActiveHarvests    int32   `json:"activeHarvests"`
}

// ManagerActionItem for quick actions.
type ManagerActionItem struct {
	ID          string                `json:"id"`
	Type        ManagerActionType     `json:"type"`
	Title       string                `json:"title"`
	Description *string               `json:"description,omitempty"`
	EntityID    *string               `json:"entityId,omitempty"`
	Priority    common.ActionPriority `json:"priority"`
	DueAt       *time.Time            `json:"dueAt,omitempty"`
	CreatedAt   time.Time             `json:"createdAt"`
}

// ManagerTeamSummary for team performance.
type ManagerTeamSummary struct {
	TotalMandors       int32                    `json:"totalMandors"`
	ActiveMandorsToday int32                    `json:"activeMandorsToday"`
	TotalAsistens      int32                    `json:"totalAsistens"`
	TopPerformers      []*TeamMemberPerformance `json:"topPerformers"`
	NeedsAttention     []*TeamMemberPerformance `json:"needsAttention"`
}

// TeamMemberPerformance for team member.
type TeamMemberPerformance struct {
	UserID            string                `json:"userId"`
	Name              string                `json:"name"`
	Role              string                `json:"role"`
	AssignmentName    string                `json:"assignmentName"` // division/estate assignment name
	TodayProduction   float64               `json:"todayProduction"`
	WeeklyProduction  float64               `json:"weeklyProduction"`
	TargetAchievement float64               `json:"targetAchievement"`
	Trend             common.TrendDirection `json:"trend"`
}

// ManagerTodayHighlights for notable events.
type ManagerTodayHighlights struct {
	TotalHarvestsToday    int32           `json:"totalHarvestsToday"`
	PendingApprovals      int32           `json:"pendingApprovals"`
	ApprovedToday         int32           `json:"approvedToday"`
	RejectedToday         int32           `json:"rejectedToday"`
	ProductionVsYesterday float64         `json:"productionVsYesterday"`
	Events                []*ManagerEvent `json:"events"`
}

// ManagerEvent for events.
type ManagerEvent struct {
	ID         string               `json:"id"`
	Type       string               `json:"type"`
	Message    string               `json:"message"`
	EntityType *string              `json:"entityType,omitempty"`
	EntityID   *string              `json:"entityId,omitempty"`
	Severity   common.EventSeverity `json:"severity"`
	OccurredAt time.Time            `json:"occurredAt"`
}

// ============================================================================
// MONITORING
// ============================================================================

// ManagerMonitorData for monitoring.
type ManagerMonitorData struct {
	OverallStatus    common.MonitorStatus      `json:"overallStatus"`
	EstateMonitors   []*EstateMonitorSummary   `json:"estateMonitors"`
	DivisionMonitors []*DivisionMonitorSummary `json:"divisionMonitors"`
	ActiveActivities []*HarvestActivity        `json:"activeActivities"`
	RealtimeStats    *RealtimeStats            `json:"realtimeStats"`
	LastUpdated      time.Time                 `json:"lastUpdated"`
}

// EstateMonitorSummary for estate monitoring.
type EstateMonitorSummary struct {
	EstateID        string               `json:"estateId"`
	EstateName      string               `json:"estateName"`
	Status          common.MonitorStatus `json:"status"`
	ActiveDivisions int32                `json:"activeDivisions"`
	TotalDivisions  int32                `json:"totalDivisions"`
	TodayProduction float64              `json:"todayProduction"`
	DailyTarget     float64              `json:"dailyTarget"`
	Achievement     float64              `json:"achievement"`
	ActiveWorkers   int32                `json:"activeWorkers"`
}

// DivisionMonitorSummary for division monitoring.
type DivisionMonitorSummary struct {
	DivisionID      string               `json:"divisionId"`
	DivisionName    string               `json:"divisionName"`
	EstateID        string               `json:"estateId"`
	Status          common.MonitorStatus `json:"status"`
	MandorName      *string              `json:"mandorName,omitempty"`
	ActiveBlocks    int32                `json:"activeBlocks"`
	TotalBlocks     int32                `json:"totalBlocks"`
	TodayProduction float64              `json:"todayProduction"`
	Progress        float64              `json:"progress"`
	LastActivity    *time.Time           `json:"lastActivity,omitempty"`
}

// HarvestActivity for active harvest.
type HarvestActivity struct {
	ID            string    `json:"id"`
	BlockName     string    `json:"blockName"`
	DivisionName  string    `json:"divisionName"`
	MandorName    string    `json:"mandorName"`
	StartTime     time.Time `json:"startTime"`
	CurrentTbs    int32     `json:"currentTbs"`
	CurrentWeight float64   `json:"currentWeight"`
	WorkersCount  int32     `json:"workersCount"`
	Status        string    `json:"status"`
}

// RealtimeStats for realtime.
type RealtimeStats struct {
	TotalTbsToday       int32      `json:"totalTbsToday"`
	TotalWeightToday    float64    `json:"totalWeightToday"`
	ActiveWorkers       int32      `json:"activeWorkers"`
	ActiveBlocks        int32      `json:"activeBlocks"`
	ProductivityRate    float64    `json:"productivityRate"`
	EstimatedCompletion *time.Time `json:"estimatedCompletion,omitempty"`
}

// ============================================================================
// ANALYTICS
// ============================================================================

// ManagerAnalyticsData for analytics.
type ManagerAnalyticsData struct {
	Period              AnalyticsPeriod            `json:"period"`
	ProductionTrend     *ProductionTrendData       `json:"productionTrend"`
	Comparison          *ComparisonMetrics         `json:"comparison"`
	DivisionPerformance []*DivisionPerformanceData `json:"divisionPerformance"`
	QualityAnalysis     *QualityAnalysisData       `json:"qualityAnalysis"`
	EfficiencyMetrics   *EfficiencyMetrics         `json:"efficiencyMetrics"`
}

// ProductionTrendData for trends.
type ProductionTrendData struct {
	DataPoints      []*common.TrendDataPoint `json:"dataPoints"`
	Average         float64                  `json:"average"`
	Maximum         float64                  `json:"maximum"`
	Minimum         float64                  `json:"minimum"`
	TrendDirection  common.TrendDirection    `json:"trendDirection"`
	TrendPercentage float64                  `json:"trendPercentage"`
}

// ComparisonMetrics for comparisons.
type ComparisonMetrics struct {
	CurrentValue      float64  `json:"currentValue"`
	PreviousValue     float64  `json:"previousValue"`
	ChangePercentage  float64  `json:"changePercentage"`
	TargetValue       float64  `json:"targetValue"`
	TargetAchievement float64  `json:"targetAchievement"`
	VsLastYear        *float64 `json:"vsLastYear,omitempty"`
}

// DivisionPerformanceData for division.
type DivisionPerformanceData struct {
	DivisionID   string  `json:"divisionId"`
	DivisionName string  `json:"divisionName"`
	Production   float64 `json:"production"`
	Target       float64 `json:"target"`
	Achievement  float64 `json:"achievement"`
	Rank         int32   `json:"rank"`
}

// QualityAnalysisData for quality.
type QualityAnalysisData struct {
	Distribution []*QualityDistribution `json:"distribution"`
	AverageScore float64                `json:"averageScore"`
	Trend        common.TrendDirection  `json:"trend"`
}

// QualityDistribution for quality breakdown.
type QualityDistribution struct {
	Grade      string  `json:"grade"`
	Count      int32   `json:"count"`
	Percentage float64 `json:"percentage"`
	ColorCode  string  `json:"colorCode"`
}

// EfficiencyMetrics for efficiency.
type EfficiencyMetrics struct {
	OverallScore          float64  `json:"overallScore"`
	LaborEfficiency       float64  `json:"laborEfficiency"`
	TimeEfficiency        float64  `json:"timeEfficiency"`
	ResourceUtilization   float64  `json:"resourceUtilization"`
	ProductivityPerWorker float64  `json:"productivityPerWorker"`
	CostEfficiency        *float64 `json:"costEfficiency,omitempty"`
}

// ============================================================================
// DAILY SUMMARY
// ============================================================================

// ManagerDailySummaryData for daily summary notification.
type ManagerDailySummaryData struct {
	DateLabel              string    `json:"dateLabel"`
	SummaryDate            time.Time `json:"summaryDate"`
	YesterdayProduction    float64   `json:"yesterdayProduction"`
	WeeklyProduction       float64   `json:"weeklyProduction"`
	MonthlyTarget          float64   `json:"monthlyTarget"`
	TargetAchievement      float64   `json:"targetAchievement"`
	PendingApprovals       int32     `json:"pendingApprovals"`
	ActiveMandors          int32     `json:"activeMandors"`
	TotalMandors           int32     `json:"totalMandors"`
	TopPerformerName       *string   `json:"topPerformerName,omitempty"`
	TopPerformerProduction *float64  `json:"topPerformerProduction,omitempty"`
	AlertCount             int32     `json:"alertCount"`
	Alerts                 []string  `json:"alerts"`
}

// ManagerDailySummaryResult for summary result.
type ManagerDailySummaryResult struct {
	Success           bool                     `json:"success"`
	SummaryData       *ManagerDailySummaryData `json:"summaryData,omitempty"`
	NotificationsSent int32                    `json:"notificationsSent"`
	ErrorMessage      *string                  `json:"errorMessage,omitempty"`
}

// ============================================================================
// PROFILE
// ============================================================================

// ManagerProfile for manager user profile.
type ManagerProfile struct {
	User         *auth.User       `json:"user"`
	Company      *master.Company  `json:"company"`
	Estates      []*master.Estate `json:"estates"`
	ManagerStats *ManagerStats    `json:"managerStats,omitempty"`
}

func (ManagerProfile) IsUserProfile() {}

// ManagerStats for metrics.
type ManagerStats struct {
	EstatesManaged    int32              `json:"estatesManaged"`
	TotalDivisions    int32              `json:"totalDivisions"`
	EstatePerformance *EstatePerformance `json:"estatePerformance,omitempty"`
}

// EstatePerformance for estate metrics.
type EstatePerformance struct {
	MonthlyTarget    float64 `json:"monthlyTarget"`
	ActualProduction float64 `json:"actualProduction"`
	Efficiency       float64 `json:"efficiency"`
}

// ============================================================================
// ENUMS
// ============================================================================

// ManagerActionType enum.
type ManagerActionType string

const (
	ManagerActionTypeReviewPending   ManagerActionType = "REVIEW_PENDING"
	ManagerActionTypeViewAlert       ManagerActionType = "VIEW_ALERT"
	ManagerActionTypeCheckProduction ManagerActionType = "CHECK_PRODUCTION"
	ManagerActionTypeViewReports     ManagerActionType = "VIEW_REPORTS"
)

var AllManagerActionType = []ManagerActionType{
	ManagerActionTypeReviewPending,
	ManagerActionTypeViewAlert,
	ManagerActionTypeCheckProduction,
	ManagerActionTypeViewReports,
}

func (e ManagerActionType) IsValid() bool {
	switch e {
	case ManagerActionTypeReviewPending, ManagerActionTypeViewAlert, ManagerActionTypeCheckProduction, ManagerActionTypeViewReports:
		return true
	}
	return false
}

func (e ManagerActionType) String() string {
	return string(e)
}

func (e *ManagerActionType) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = ManagerActionType(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid ManagerActionType", str)
	}
	return nil
}

func (e ManagerActionType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *ManagerActionType) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e ManagerActionType) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// AnalyticsPeriod enum.
type AnalyticsPeriod string

const (
	AnalyticsPeriodDaily     AnalyticsPeriod = "DAILY"
	AnalyticsPeriodWeekly    AnalyticsPeriod = "WEEKLY"
	AnalyticsPeriodMonthly   AnalyticsPeriod = "MONTHLY"
	AnalyticsPeriodQuarterly AnalyticsPeriod = "QUARTERLY"
	AnalyticsPeriodYearly    AnalyticsPeriod = "YEARLY"
)

var AllAnalyticsPeriod = []AnalyticsPeriod{
	AnalyticsPeriodDaily,
	AnalyticsPeriodWeekly,
	AnalyticsPeriodMonthly,
	AnalyticsPeriodQuarterly,
	AnalyticsPeriodYearly,
}

func (e AnalyticsPeriod) IsValid() bool {
	switch e {
	case AnalyticsPeriodDaily, AnalyticsPeriodWeekly, AnalyticsPeriodMonthly, AnalyticsPeriodQuarterly, AnalyticsPeriodYearly:
		return true
	}
	return false
}

func (e AnalyticsPeriod) String() string {
	return string(e)
}

func (e *AnalyticsPeriod) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = AnalyticsPeriod(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid AnalyticsPeriod", str)
	}
	return nil
}

func (e AnalyticsPeriod) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *AnalyticsPeriod) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e AnalyticsPeriod) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

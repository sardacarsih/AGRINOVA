// Package asisten contains Asisten-specific GraphQL types.
package asisten

import (
	"bytes"
	"fmt"
	"io"
	"strconv"
	"time"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/common"
	"agrinovagraphql/server/internal/graphql/domain/mandor"
	"agrinovagraphql/server/internal/graphql/domain/master"
)

// ============================================================================
// ASISTEN DASHBOARD
// ============================================================================

// AsistenDashboardData for asisten dashboard.
type AsistenDashboardData struct {
	User         *auth.User             `json:"user"`
	Divisions    []*master.Division     `json:"divisions"`
	Stats        *AsistenDashboardStats `json:"stats"`
	PendingItems []*ApprovalItem        `json:"pendingItems"`
	TodaySummary *AsistenTodaySummary   `json:"todaySummary"`
	QuickActions []*AsistenQuickAction  `json:"quickActions"`
}

// AsistenDashboardStats for metrics.
type AsistenDashboardStats struct {
	TotalDivisions     int32   `json:"totalDivisions"`
	TotalBlocks        int32   `json:"totalBlocks"`
	PendingApprovals   int32   `json:"pendingApprovals"`
	ApprovedToday      int32   `json:"approvedToday"`
	RejectedToday      int32   `json:"rejectedToday"`
	AvgApprovalTime    float64 `json:"avgApprovalTime"`
	TotalMandors       int32   `json:"totalMandors"`
	ActiveMandorsToday int32   `json:"activeMandorsToday"`
	TodayProduction    float64 `json:"todayProduction"`
}

// AsistenTodaySummary for today's work.
type AsistenTodaySummary struct {
	TotalSubmissions int32   `json:"totalSubmissions"`
	Pending          int32   `json:"pending"`
	Approved         int32   `json:"approved"`
	Rejected         int32   `json:"rejected"`
	TotalTbs         int32   `json:"totalTbs"`
	TotalWeight      float64 `json:"totalWeight"`
	ActiveWorkers    int32   `json:"activeWorkers"`
	BusiestBlock     *string `json:"busiestBlock,omitempty"`
}

// AsistenQuickAction for quick actions.
type AsistenQuickAction struct {
	ID       string            `json:"id"`
	Type     AsistenActionType `json:"type"`
	Title    string            `json:"title"`
	Count    *int32            `json:"count,omitempty"`
	IsUrgent bool              `json:"isUrgent"`
}

// ============================================================================
// APPROVAL TYPES
// ============================================================================

// ApprovalItem for pending approvals.
type ApprovalItem struct {
	ID               string               `json:"id"`
	Mandor           *auth.User           `json:"mandor"`
	Block            *master.Block        `json:"block"`
	Division         *master.Division     `json:"division"`
	HarvestDate      time.Time            `json:"harvestDate"`
	EmployeeCount    int32                `json:"employeeCount"`
	Employees        string               `json:"employees"`
	TbsCount         int32                `json:"tbsCount"`
	Weight           float64              `json:"weight"`
	SubmittedAt      time.Time            `json:"submittedAt"`
	ElapsedTime      string               `json:"elapsedTime"`
	Status           mandor.HarvestStatus `json:"status"`
	HasPhoto         bool                 `json:"hasPhoto"`
	PhotoUrls        []string             `json:"photoUrls,omitempty"`
	Coordinates      *common.Coordinates  `json:"coordinates,omitempty"`
	Notes            *string              `json:"notes,omitempty"`
	Priority         ApprovalPriority     `json:"priority"`
	ValidationStatus ValidationStatus     `json:"validationStatus"`
	ValidationIssues []string             `json:"validationIssues,omitempty"`
}

// ApprovalFilterInput for filtering approvals.
type ApprovalFilterInput struct {
	Status        *mandor.HarvestStatus `json:"status,omitempty"`
	DivisionID    *string               `json:"divisionId,omitempty"`
	BlockID       *string               `json:"blockId,omitempty"`
	MandorID      *string               `json:"mandorId,omitempty"`
	DateFrom      *time.Time            `json:"dateFrom,omitempty"`
	DateTo        *time.Time            `json:"dateTo,omitempty"`
	Priority      *ApprovalPriority     `json:"priority,omitempty"`
	Search        *string               `json:"search,omitempty"`
	SortBy        *ApprovalSortField    `json:"sortBy,omitempty"`
	SortDirection *common.SortDirection `json:"sortDirection,omitempty"`
	Page          *int32                `json:"page,omitempty"`
	PageSize      *int32                `json:"pageSize,omitempty"`
}

// ApprovalListResponse for paginated list.
type ApprovalListResponse struct {
	Items      []*ApprovalItem   `json:"items"`
	TotalCount int32             `json:"totalCount"`
	HasMore    bool              `json:"hasMore"`
	PageInfo   *ApprovalPageInfo `json:"pageInfo"`
}

// ApprovalPageInfo for pagination.
type ApprovalPageInfo struct {
	CurrentPage int32 `json:"currentPage"`
	TotalPages  int32 `json:"totalPages"`
	PageSize    int32 `json:"pageSize"`
}

// ApproveHarvestInput for approving harvests.
type ApproveHarvestInput struct {
	ID         string `json:"id"`
	ApprovedBy string `json:"approvedBy"`
}

// RejectHarvestInput for rejecting harvests.
type RejectHarvestInput struct {
	ID             string `json:"id"`
	RejectedReason string `json:"rejectedReason"`
}

// ApproveHarvestResult for approval result.
type ApproveHarvestResult struct {
	Success       bool                  `json:"success"`
	Message       string                `json:"message"`
	HarvestRecord *mandor.HarvestRecord `json:"harvestRecord,omitempty"`
	Errors        []string              `json:"errors,omitempty"`
}

// BatchApprovalInput for batch operations.
type BatchApprovalInput struct {
	Ids             []string            `json:"ids"`
	Action          BatchApprovalAction `json:"action"`
	RejectionReason *string             `json:"rejectionReason,omitempty"`
	Notes           *string             `json:"notes,omitempty"`
}

// BatchApprovalResult for batch result.
type BatchApprovalResult struct {
	Success        bool               `json:"success"`
	TotalProcessed int32              `json:"totalProcessed"`
	SuccessCount   int32              `json:"successCount"`
	FailedCount    int32              `json:"failedCount"`
	Results        []*BatchItemResult `json:"results"`
	Message        string             `json:"message"`
}

// BatchItemResult for individual item.
type BatchItemResult struct {
	ID      string  `json:"id"`
	Success bool    `json:"success"`
	Error   *string `json:"error,omitempty"`
}

// ============================================================================
// MONITORING
// ============================================================================

// AsistenMonitoringData for monitoring.
type AsistenMonitoringData struct {
	OverallStatus     common.MonitorStatus      `json:"overallStatus"`
	DivisionSummaries []*AsistenDivisionSummary `json:"divisionSummaries"`
	BlockActivities   []*BlockActivity          `json:"blockActivities"`
	MandorStatuses    []*mandor.MandorStatus    `json:"mandorStatuses"`
	RealtimeStats     *AsistenRealtimeStats     `json:"realtimeStats"`
	ActivityTimeline  []*ActivityTimelineItem   `json:"activityTimeline"`
	LastUpdated       time.Time                 `json:"lastUpdated"`
}

// AsistenDivisionSummary for division monitoring.
type AsistenDivisionSummary struct {
	DivisionID       string               `json:"divisionId"`
	DivisionName     string               `json:"divisionName"`
	DivisionCode     string               `json:"divisionCode"`
	Status           common.MonitorStatus `json:"status"`
	ActiveBlocks     int32                `json:"activeBlocks"`
	TotalBlocks      int32                `json:"totalBlocks"`
	ActiveMandors    int32                `json:"activeMandors"`
	TotalMandors     int32                `json:"totalMandors"`
	TodayProduction  float64              `json:"todayProduction"`
	DailyTarget      float64              `json:"dailyTarget"`
	Progress         float64              `json:"progress"`
	PendingApprovals int32                `json:"pendingApprovals"`
	LastActivity     *time.Time           `json:"lastActivity,omitempty"`
}

// BlockActivity for block activities.
type BlockActivity struct {
	BlockID       string              `json:"blockId"`
	BlockName     string              `json:"blockName"`
	BlockCode     string              `json:"blockCode"`
	DivisionName  string              `json:"divisionName"`
	Status        BlockActivityStatus `json:"status"`
	MandorName    *string             `json:"mandorName,omitempty"`
	CurrentTbs    int32               `json:"currentTbs"`
	CurrentWeight float64             `json:"currentWeight"`
	WorkersCount  int32               `json:"workersCount"`
	StartTime     *time.Time          `json:"startTime,omitempty"`
	LastUpdate    *time.Time          `json:"lastUpdate,omitempty"`
}

// AsistenRealtimeStats for realtime stats.
type AsistenRealtimeStats struct {
	TotalSubmissionsToday int32   `json:"totalSubmissionsToday"`
	PendingCount          int32   `json:"pendingCount"`
	ActiveMandors         int32   `json:"activeMandors"`
	ActiveBlocks          int32   `json:"activeBlocks"`
	TotalTbsToday         int32   `json:"totalTbsToday"`
	TotalWeightToday      float64 `json:"totalWeightToday"`
	AvgTbsPerSubmission   float64 `json:"avgTbsPerSubmission"`
	ProductivityRate      float64 `json:"productivityRate"`
}

// ActivityTimelineItem for timeline.
type ActivityTimelineItem struct {
	ID          string       `json:"id"`
	Type        ActivityType `json:"type"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	EntityType  *string      `json:"entityType,omitempty"`
	EntityID    *string      `json:"entityId,omitempty"`
	ActorName   string       `json:"actorName"`
	Timestamp   time.Time    `json:"timestamp"`
}

// ============================================================================
// STATISTICS
// ============================================================================

// ApprovalStatsData for statistics.
type ApprovalStatsData struct {
	TotalSubmissions int32                 `json:"totalSubmissions"`
	TotalApproved    int32                 `json:"totalApproved"`
	TotalRejected    int32                 `json:"totalRejected"`
	ApprovalRate     float64               `json:"approvalRate"`
	AvgApprovalTime  float64               `json:"avgApprovalTime"`
	FastestApproval  float64               `json:"fastestApproval"`
	SlowestApproval  float64               `json:"slowestApproval"`
	DailyStats       []*DailyApprovalStats `json:"dailyStats"`
}

// DailyApprovalStats for daily breakdown.
type DailyApprovalStats struct {
	Date        time.Time `json:"date"`
	Submissions int32     `json:"submissions"`
	Approved    int32     `json:"approved"`
	Rejected    int32     `json:"rejected"`
	TotalTbs    int32     `json:"totalTbs"`
	TotalWeight float64   `json:"totalWeight"`
}

// ============================================================================
// PROFILE
// ============================================================================

// AsistenProfile for asisten user profile.
type AsistenProfile struct {
	User         *auth.User         `json:"user"`
	Company      *master.Company    `json:"company"`
	Estate       *master.Estate     `json:"estate"`
	Divisions    []*master.Division `json:"divisions"`
	AsistenStats *AsistenStats      `json:"asistenStats,omitempty"`
}

func (AsistenProfile) IsUserProfile() {}

// AsistenStats for workload metrics.
type AsistenStats struct {
	DivisionsAssigned int32            `json:"divisionsAssigned"`
	PendingApprovals  int32            `json:"pendingApprovals"`
	DailyWorkload     *AsistenWorkload `json:"dailyWorkload,omitempty"`
}

// AsistenWorkload for daily metrics.
type AsistenWorkload struct {
	ApprovalsCompleted  int32   `json:"approvalsCompleted"`
	RejectionsToday     int32   `json:"rejectionsToday"`
	AverageApprovalTime float64 `json:"averageApprovalTime"`
}

// ============================================================================
// ENUMS
// ============================================================================

// AsistenActionType enum.
type AsistenActionType string

const (
	AsistenActionTypePendingApprovals AsistenActionType = "PENDING_APPROVALS"
	AsistenActionTypeViewMonitoring   AsistenActionType = "VIEW_MONITORING"
	AsistenActionTypeViewReports      AsistenActionType = "VIEW_REPORTS"
	AsistenActionTypeManageMandors    AsistenActionType = "MANAGE_MANDORS"
	AsistenActionTypeViewPending      AsistenActionType = "VIEW_PENDING"
	AsistenActionTypeBatchApprove     AsistenActionType = "BATCH_APPROVE"
	AsistenActionTypeViewHistory      AsistenActionType = "VIEW_HISTORY"
)

var AllAsistenActionType = []AsistenActionType{
	AsistenActionTypePendingApprovals,
	AsistenActionTypeViewMonitoring,
	AsistenActionTypeViewReports,
	AsistenActionTypeManageMandors,
	AsistenActionTypeViewPending,
	AsistenActionTypeBatchApprove,
	AsistenActionTypeViewHistory,
}

func (e AsistenActionType) IsValid() bool {
	switch e {
	case AsistenActionTypePendingApprovals, AsistenActionTypeViewMonitoring, AsistenActionTypeViewReports, AsistenActionTypeManageMandors,
		AsistenActionTypeViewPending, AsistenActionTypeBatchApprove, AsistenActionTypeViewHistory:
		return true
	}
	return false
}

func (e AsistenActionType) String() string {
	return string(e)
}

func (e *AsistenActionType) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = AsistenActionType(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid AsistenActionType", str)
	}
	return nil
}

func (e AsistenActionType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *AsistenActionType) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e AsistenActionType) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// ApprovalPriority enum.
type ApprovalPriority string

const (
	ApprovalPriorityLow    ApprovalPriority = "LOW"
	ApprovalPriorityNormal ApprovalPriority = "NORMAL"
	ApprovalPriorityHigh   ApprovalPriority = "HIGH"
	ApprovalPriorityUrgent ApprovalPriority = "URGENT"
)

var AllApprovalPriority = []ApprovalPriority{
	ApprovalPriorityLow,
	ApprovalPriorityNormal,
	ApprovalPriorityHigh,
	ApprovalPriorityUrgent,
}

func (e ApprovalPriority) IsValid() bool {
	switch e {
	case ApprovalPriorityLow, ApprovalPriorityNormal, ApprovalPriorityHigh, ApprovalPriorityUrgent:
		return true
	}
	return false
}

func (e ApprovalPriority) String() string {
	return string(e)
}

func (e *ApprovalPriority) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = ApprovalPriority(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid ApprovalPriority", str)
	}
	return nil
}

func (e ApprovalPriority) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *ApprovalPriority) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e ApprovalPriority) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// ValidationStatus enum.
type ValidationStatus string

const (
	ValidationStatusValid   ValidationStatus = "VALID"
	ValidationStatusWarning ValidationStatus = "WARNING"
	ValidationStatusInvalid ValidationStatus = "INVALID"
)

var AllValidationStatus = []ValidationStatus{
	ValidationStatusValid,
	ValidationStatusWarning,
	ValidationStatusInvalid,
}

func (e ValidationStatus) IsValid() bool {
	switch e {
	case ValidationStatusValid, ValidationStatusWarning, ValidationStatusInvalid:
		return true
	}
	return false
}

func (e ValidationStatus) String() string {
	return string(e)
}

func (e *ValidationStatus) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = ValidationStatus(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid ValidationStatus", str)
	}
	return nil
}

func (e ValidationStatus) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *ValidationStatus) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e ValidationStatus) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// BatchApprovalAction enum.
type BatchApprovalAction string

const (
	BatchApprovalActionApprove BatchApprovalAction = "APPROVE"
	BatchApprovalActionReject  BatchApprovalAction = "REJECT"
)

var AllBatchApprovalAction = []BatchApprovalAction{
	BatchApprovalActionApprove,
	BatchApprovalActionReject,
}

func (e BatchApprovalAction) IsValid() bool {
	switch e {
	case BatchApprovalActionApprove, BatchApprovalActionReject:
		return true
	}
	return false
}

func (e BatchApprovalAction) String() string {
	return string(e)
}

func (e *BatchApprovalAction) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = BatchApprovalAction(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid BatchApprovalAction", str)
	}
	return nil
}

func (e BatchApprovalAction) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *BatchApprovalAction) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e BatchApprovalAction) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// ApprovalSortField enum.
type ApprovalSortField string

const (
	ApprovalSortFieldSubmittedAt ApprovalSortField = "SUBMITTED_AT"
	ApprovalSortFieldHarvestDate ApprovalSortField = "HARVEST_DATE"
	ApprovalSortFieldWeight      ApprovalSortField = "WEIGHT"
	ApprovalSortFieldTbsCount    ApprovalSortField = "TBS_COUNT"
	ApprovalSortFieldPriority    ApprovalSortField = "PRIORITY"
)

var AllApprovalSortField = []ApprovalSortField{
	ApprovalSortFieldSubmittedAt,
	ApprovalSortFieldHarvestDate,
	ApprovalSortFieldWeight,
	ApprovalSortFieldTbsCount,
	ApprovalSortFieldPriority,
}

func (e ApprovalSortField) IsValid() bool {
	switch e {
	case ApprovalSortFieldSubmittedAt, ApprovalSortFieldHarvestDate, ApprovalSortFieldWeight, ApprovalSortFieldTbsCount, ApprovalSortFieldPriority:
		return true
	}
	return false
}

func (e ApprovalSortField) String() string {
	return string(e)
}

func (e *ApprovalSortField) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = ApprovalSortField(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid ApprovalSortField", str)
	}
	return nil
}

func (e ApprovalSortField) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *ApprovalSortField) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e ApprovalSortField) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// BlockActivityStatus enum.
type BlockActivityStatus string

const (
	BlockActivityStatusIdle      BlockActivityStatus = "IDLE"
	BlockActivityStatusActive    BlockActivityStatus = "ACTIVE"
	BlockActivityStatusCompleted BlockActivityStatus = "COMPLETED"
)

var AllBlockActivityStatus = []BlockActivityStatus{
	BlockActivityStatusIdle,
	BlockActivityStatusActive,
	BlockActivityStatusCompleted,
}

func (e BlockActivityStatus) IsValid() bool {
	switch e {
	case BlockActivityStatusIdle, BlockActivityStatusActive, BlockActivityStatusCompleted:
		return true
	}
	return false
}

func (e BlockActivityStatus) String() string {
	return string(e)
}

func (e *BlockActivityStatus) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = BlockActivityStatus(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid BlockActivityStatus", str)
	}
	return nil
}

func (e BlockActivityStatus) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *BlockActivityStatus) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e BlockActivityStatus) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// ActivityType enum.
type ActivityType string

const (
	ActivityTypeHarvestSubmitted ActivityType = "HARVEST_SUBMITTED"
	ActivityTypeHarvestApproved  ActivityType = "HARVEST_APPROVED"
	ActivityTypeHarvestRejected  ActivityType = "HARVEST_REJECTED"
	ActivityTypeMandorOnline     ActivityType = "MANDOR_ONLINE"
	ActivityTypeMandorOffline    ActivityType = "MANDOR_OFFLINE"
	ActivityTypeBlockStarted     ActivityType = "BLOCK_STARTED"
	ActivityTypeBlockCompleted   ActivityType = "BLOCK_COMPLETED"
)

var AllActivityType = []ActivityType{
	ActivityTypeHarvestSubmitted,
	ActivityTypeHarvestApproved,
	ActivityTypeHarvestRejected,
	ActivityTypeMandorOnline,
	ActivityTypeMandorOffline,
	ActivityTypeBlockStarted,
	ActivityTypeBlockCompleted,
}

func (e ActivityType) IsValid() bool {
	switch e {
	case ActivityTypeHarvestSubmitted, ActivityTypeHarvestApproved, ActivityTypeHarvestRejected, ActivityTypeMandorOnline, ActivityTypeMandorOffline, ActivityTypeBlockStarted, ActivityTypeBlockCompleted:
		return true
	}
	return false
}

func (e ActivityType) String() string {
	return string(e)
}

func (e *ActivityType) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = ActivityType(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid ActivityType", str)
	}
	return nil
}

func (e ActivityType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *ActivityType) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e ActivityType) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

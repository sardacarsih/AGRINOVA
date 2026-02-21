// Package timbangan contains Timbangan/weighing-related GraphQL types.
package timbangan

import (
	"bytes"
	"fmt"
	"io"
	"strconv"
	"time"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/master"
)

// ============================================================================
// WEIGHING TYPES
// ============================================================================

// WeighingRecord for weighing data (referencing existing models).
type WeighingRecord struct {
	ID            string         `json:"id"`
	TicketNumber  string         `json:"ticketNumber"`
	VehicleNumber string         `json:"vehicleNumber"`
	DriverName    *string        `json:"driverName,omitempty"`
	VendorName    *string        `json:"vendorName,omitempty"`
	CargoType     *string        `json:"cargoType,omitempty"`
	GrossWeight   float64        `json:"grossWeight"`
	TareWeight    float64        `json:"tareWeight"`
	NetWeight     float64        `json:"netWeight"`
	WeighingTime  time.Time      `json:"weighingTime"`
	CompanyID     string         `json:"companyId"`
	Status        WeighingStatus `json:"status"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
}

// CreateWeighingRecordInput for creating.
type CreateWeighingRecordInput struct {
	TicketNumber  string    `json:"ticketNumber"`
	VehicleNumber string    `json:"vehicleNumber"`
	GrossWeight   float64   `json:"grossWeight"`
	TareWeight    float64   `json:"tareWeight"`
	NetWeight     float64   `json:"netWeight"`
	WeighingTime  time.Time `json:"weighingTime"`
	CompanyID     string    `json:"companyId"`
	DriverName    *string   `json:"driverName,omitempty"`
	VendorName    *string   `json:"vendorName,omitempty"`
	CargoType     *string   `json:"cargoType,omitempty"`
}

// UpdateWeighingRecordInput for updating.
type UpdateWeighingRecordInput struct {
	TicketNumber  *string         `json:"ticketNumber,omitempty"`
	VehicleNumber *string         `json:"vehicleNumber,omitempty"`
	WeighingTime  *time.Time      `json:"weighingTime,omitempty"`
	GrossWeight   *float64        `json:"grossWeight,omitempty"`
	TareWeight    *float64        `json:"tareWeight,omitempty"`
	NetWeight     *float64        `json:"netWeight,omitempty"`
	DriverName    *string         `json:"driverName,omitempty"`
	VendorName    *string         `json:"vendorName,omitempty"`
	CargoType     *string         `json:"cargoType,omitempty"`
	Status        *WeighingStatus `json:"status,omitempty"`
}

// ============================================================================
// TIMBANGAN DASHBOARD
// ============================================================================

// TimbanganDashboardData for timbangan dashboard.
type TimbanganDashboardData struct {
	User         *auth.User               `json:"user"`
	PksInfo      *PKSInfo                 `json:"pksInfo"`
	Stats        *TimbanganDashboardStats `json:"stats"`
	Queue        []*WeighingQueueItem     `json:"queue"`
	TodaySummary *WeighingSummary         `json:"todaySummary"`
}

// TimbanganDashboardStats for stats.
type TimbanganDashboardStats struct {
	TotalWeighingsToday int32   `json:"totalWeighingsToday"`
	TotalWeightToday    float64 `json:"totalWeightToday"`
	AvgWeightPerVehicle float64 `json:"avgWeightPerVehicle"`
	QueueLength         int32   `json:"queueLength"`
	AvgProcessingTime   float64 `json:"avgProcessingTime"`
}

// PKSInfo for PKS info.
type PKSInfo struct {
	PksID         string  `json:"pksId"`
	PksName       string  `json:"pksName"`
	PksCode       string  `json:"pksCode"`
	CompanyID     string  `json:"companyId"`
	CompanyName   string  `json:"companyName"`
	ScaleType     string  `json:"scaleType"`
	ScaleCapacity float64 `json:"scaleCapacity"`
	IsOperational bool    `json:"isOperational"`
}

// WeighingQueueItem for queue.
type WeighingQueueItem struct {
	ID            string        `json:"id"`
	QueueNumber   int32         `json:"queueNumber"`
	VehicleNumber string        `json:"vehicleNumber"`
	DriverName    string        `json:"driverName"`
	EstateName    string        `json:"estateName"`
	DoNumber      *string       `json:"doNumber,omitempty"`
	ArrivalTime   time.Time     `json:"arrivalTime"`
	WaitingTime   int32         `json:"waitingTime"`
	Priority      QueuePriority `json:"priority"`
	Status        QueueStatus   `json:"status"`
}

// WeighingSummary for summary.
type WeighingSummary struct {
	TotalVehicles int32                    `json:"totalVehicles"`
	TotalWeight   float64                  `json:"totalWeight"`
	AvgWeight     float64                  `json:"avgWeight"`
	ByEstate      []*EstateWeighingSummary `json:"byEstate"`
}

// EstateWeighingSummary for per-estate.
type EstateWeighingSummary struct {
	EstateName  string  `json:"estateName"`
	TotalWeight float64 `json:"totalWeight"`
	Count       int32   `json:"count"`
	AvgBjr      float64 `json:"avgBjr"`
}

// ============================================================================
// WEIGHING OPERATIONS
// ============================================================================

// PerformFirstWeighingInput for first weighing.
type PerformFirstWeighingInput struct {
	QueueItemID string  `json:"queueItemId"`
	Weight      float64 `json:"weight"`
	DoNumber    *string `json:"doNumber,omitempty"`
	PhotoPath   *string `json:"photoPath,omitempty"`
	Notes       *string `json:"notes,omitempty"`
	DeviceID    string  `json:"deviceId"`
}

// PerformSecondWeighingInput for second weighing.
type PerformSecondWeighingInput struct {
	WeighingRecordID string   `json:"weighingRecordId"`
	Weight           float64  `json:"weight"`
	TbsCount         *int32   `json:"tbsCount,omitempty"`
	BrondolanWeight  *float64 `json:"brondolanWeight,omitempty"`
	QualityGrade     *string  `json:"qualityGrade,omitempty"`
	GradingNotes     *string  `json:"gradingNotes,omitempty"`
	PhotoPath        *string  `json:"photoPath,omitempty"`
	Notes            *string  `json:"notes,omitempty"`
	DeviceID         string   `json:"deviceId"`
}

// WeighingResult for operation result.
type WeighingResult struct {
	Success        bool            `json:"success"`
	Message        string          `json:"message"`
	WeighingRecord *WeighingRecord `json:"weighingRecord,omitempty"`
	Errors         []string        `json:"errors,omitempty"`
}

// DoValidationResult for DO validation.
type DoValidationResult struct {
	IsValid   bool       `json:"isValid"`
	Message   string     `json:"message"`
	DoDetails *DoDetails `json:"doDetails,omitempty"`
}

// DoDetails for DO info.
type DoDetails struct {
	DoNumber       string     `json:"doNumber"`
	SourceEstate   string     `json:"sourceEstate"`
	SourceDivision *string    `json:"sourceDivision,omitempty"`
	ExpectedWeight *float64   `json:"expectedWeight,omitempty"`
	HarvestDate    *time.Time `json:"harvestDate,omitempty"`
	MandorName     *string    `json:"mandorName,omitempty"`
}

// ============================================================================
// PROFILE
// ============================================================================

// TimbanganProfile for timbangan user profile.
type TimbanganProfile struct {
	User           *auth.User      `json:"user"`
	Company        *master.Company `json:"company"`
	PksInfo        *PKSInfo        `json:"pksInfo,omitempty"`
	TimbanganStats *TimbanganStats `json:"timbanganStats,omitempty"`
}

func (TimbanganProfile) IsUserProfile() {}

// TimbanganStats for metrics.
type TimbanganStats struct {
	DailyWeighings        int32   `json:"dailyWeighings"`
	TotalWeightProcessed  float64 `json:"totalWeightProcessed"`
	AverageProcessingTime float64 `json:"averageProcessingTime"`
}

// ============================================================================
// ENUMS
// ============================================================================

// WeighingStatus enum.
type WeighingStatus string

const (
	WeighingStatusPending   WeighingStatus = "PENDING"
	WeighingStatusFirst     WeighingStatus = "FIRST_WEIGHING"
	WeighingStatusSecond    WeighingStatus = "SECOND_WEIGHING"
	WeighingStatusCompleted WeighingStatus = "COMPLETED"
	WeighingStatusCancelled WeighingStatus = "CANCELLED"
)

var AllWeighingStatus = []WeighingStatus{
	WeighingStatusPending,
	WeighingStatusFirst,
	WeighingStatusSecond,
	WeighingStatusCompleted,
	WeighingStatusCancelled,
}

func (e WeighingStatus) IsValid() bool {
	switch e {
	case WeighingStatusPending, WeighingStatusFirst, WeighingStatusSecond, WeighingStatusCompleted, WeighingStatusCancelled:
		return true
	}
	return false
}

func (e WeighingStatus) String() string {
	return string(e)
}

func (e *WeighingStatus) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = WeighingStatus(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid WeighingStatus", str)
	}
	return nil
}

func (e WeighingStatus) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *WeighingStatus) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e WeighingStatus) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// QueuePriority enum.
type QueuePriority string

const (
	QueuePriorityNormal QueuePriority = "NORMAL"
	QueuePriorityHigh   QueuePriority = "HIGH"
	QueuePriorityUrgent QueuePriority = "URGENT"
)

var AllQueuePriority = []QueuePriority{
	QueuePriorityNormal,
	QueuePriorityHigh,
	QueuePriorityUrgent,
}

func (e QueuePriority) IsValid() bool {
	switch e {
	case QueuePriorityNormal, QueuePriorityHigh, QueuePriorityUrgent:
		return true
	}
	return false
}

func (e QueuePriority) String() string {
	return string(e)
}

func (e *QueuePriority) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = QueuePriority(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid QueuePriority", str)
	}
	return nil
}

func (e QueuePriority) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *QueuePriority) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e QueuePriority) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// QueueStatus enum.
type QueueStatus string

const (
	QueueStatusWaiting    QueueStatus = "WAITING"
	QueueStatusCalled     QueueStatus = "CALLED"
	QueueStatusProcessing QueueStatus = "PROCESSING"
	QueueStatusCompleted  QueueStatus = "COMPLETED"
	QueueStatusSkipped    QueueStatus = "SKIPPED"
)

var AllQueueStatus = []QueueStatus{
	QueueStatusWaiting,
	QueueStatusCalled,
	QueueStatusProcessing,
	QueueStatusCompleted,
	QueueStatusSkipped,
}

func (e QueueStatus) IsValid() bool {
	switch e {
	case QueueStatusWaiting, QueueStatusCalled, QueueStatusProcessing, QueueStatusCompleted, QueueStatusSkipped:
		return true
	}
	return false
}

func (e QueueStatus) String() string {
	return string(e)
}

func (e *QueueStatus) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = QueueStatus(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid QueueStatus", str)
	}
	return nil
}

func (e QueueStatus) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *QueueStatus) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e QueueStatus) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// WeighingQueueType enum.
type WeighingQueueType string

const (
	WeighingQueueTypeFirstWeighing  WeighingQueueType = "FIRST_WEIGHING"
	WeighingQueueTypeSecondWeighing WeighingQueueType = "SECOND_WEIGHING"
	WeighingQueueTypeReweighing     WeighingQueueType = "REWEIGHING"
)

var AllWeighingQueueType = []WeighingQueueType{
	WeighingQueueTypeFirstWeighing,
	WeighingQueueTypeSecondWeighing,
	WeighingQueueTypeReweighing,
}

func (e WeighingQueueType) IsValid() bool {
	switch e {
	case WeighingQueueTypeFirstWeighing, WeighingQueueTypeSecondWeighing, WeighingQueueTypeReweighing:
		return true
	}
	return false
}

func (e WeighingQueueType) String() string {
	return string(e)
}

func (e *WeighingQueueType) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = WeighingQueueType(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid WeighingQueueType", str)
	}
	return nil
}

func (e WeighingQueueType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

// TimbanganHistoryFilter for filtering.
type TimbanganHistoryFilter struct {
	DateFrom     *time.Time      `json:"dateFrom,omitempty"`
	DateTo       *time.Time      `json:"dateTo,omitempty"`
	SourceEstate *string         `json:"sourceEstate,omitempty"`
	VehiclePlate *string         `json:"vehiclePlate,omitempty"`
	Status       *WeighingStatus `json:"status,omitempty"`
	Page         int32           `json:"page"`
	PageSize     int32           `json:"pageSize"`
}

// TimbanganHistoryResponse item list.
type TimbanganHistoryResponse struct {
	Items      []*WeighingRecord        `json:"items"`
	TotalCount int32                    `json:"totalCount"`
	HasMore    bool                     `json:"hasMore"`
	Summary    *TimbanganHistorySummary `json:"summary"`
}

// TimbanganHistorySummary stats.
type TimbanganHistorySummary struct {
	TotalWeighings int32                    `json:"totalWeighings"`
	TotalNetWeight float64                  `json:"totalNetWeight"`
	AvgBjr         float64                  `json:"avgBjr"`
	ByEstate       []*EstateWeighingSummary `json:"byEstate"`
}

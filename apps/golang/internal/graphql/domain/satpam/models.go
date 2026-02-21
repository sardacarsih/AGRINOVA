// Package satpam contains Satpam-specific GraphQL types.
package satpam

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
// SATPAM DASHBOARD
// ============================================================================

// SatpamDashboardData for satpam dashboard.
type SatpamDashboardData struct {
	User              *auth.User              `json:"user"`
	PosInfo           *POSInfo                `json:"posInfo"`
	Stats             *SatpamDashboardStats   `json:"stats"`
	VehiclesInside    []*VehicleInsideInfo    `json:"vehiclesInside"`
	VehiclesOutside   []*VehicleOutsideInfo   `json:"vehiclesOutside"`
	VehiclesCompleted []*VehicleCompletedInfo `json:"vehiclesCompleted"`
	RecentActivities  []*SatpamActivity       `json:"recentActivities"`
	SyncStatus        *SatpamSyncStatus       `json:"syncStatus"`
	ShiftInfo         *ShiftInfo              `json:"shiftInfo"`
}

// SatpamDashboardStats for metrics.
type SatpamDashboardStats struct {
	VehiclesInside    int32   `json:"vehiclesInside"`
	VehiclesOutside   int32   `json:"vehiclesOutside"`
	TodayEntries      int32   `json:"todayEntries"`
	TodayExits        int32   `json:"todayExits"`
	PendingExits      int32   `json:"pendingExits"`
	GuestsToday       int32   `json:"guestsToday"`
	QRScansToday      int32   `json:"qrScansToday"`
	AvgProcessingTime float64 `json:"avgProcessingTime"`
	OverstayCount     int32   `json:"overstayCount"`
	MissingExitCount  int32   `json:"missingExitCount"`
	MissingEntryCount int32   `json:"missingEntryCount"`
}

// POSInfo for gate position.
type POSInfo struct {
	PosNumber   string `json:"posNumber"`
	PosName     string `json:"posName"`
	CompanyID   string `json:"companyId"`
	CompanyName string `json:"companyName"`
	IsActive    bool   `json:"isActive"`
}

// VehicleInsideInfo for vehicles currently inside.
type VehicleInsideInfo struct {
	GuestLogID          string         `json:"guestLogId"`
	CompanyID           string         `json:"companyId"`
	VehiclePlate        string         `json:"vehiclePlate"`
	VehicleType         VehicleType    `json:"vehicleType"`
	DriverName          string         `json:"driverName"`
	EntryTime           time.Time      `json:"entryTime"`
	Duration            int32          `json:"duration"`
	IsOverstay          bool           `json:"isOverstay"`
	Destination         *string        `json:"destination,omitempty"`
	QRCode              *string        `json:"qrCode,omitempty"`
	LoadType            *string        `json:"loadType,omitempty"`
	CargoVolume         *string        `json:"cargoVolume,omitempty"`
	CargoOwner          *string        `json:"cargoOwner,omitempty"`
	EstimatedWeight     *float64       `json:"estimatedWeight,omitempty"`
	DeliveryOrderNumber *string        `json:"deliveryOrderNumber,omitempty"`
	IDCardNumber        *string        `json:"idCardNumber,omitempty"`
	SecondCargo         *string        `json:"secondCargo,omitempty"`
	EntryGate           *string        `json:"entryGate,omitempty"`
	Photos              []*SatpamPhoto `json:"photos,omitempty"`
}

func (v *VehicleInsideInfo) ID() string {
	return v.GuestLogID
}

func (v *VehicleInsideInfo) DurationMinutes() int32 {
	return v.Duration
}

// VehicleOutsideInfo for vehicles that exited the estate today
// with no matching entry on the same calendar day.
type VehicleOutsideInfo struct {
	GuestLogID          string         `json:"guestLogId"`
	CompanyID           string         `json:"companyId"`
	VehiclePlate        string         `json:"vehiclePlate"`
	VehicleType         VehicleType    `json:"vehicleType"`
	DriverName          string         `json:"driverName"`
	ExitTime            time.Time      `json:"exitTime"`
	ExitGate            *string        `json:"exitGate,omitempty"`
	Duration            int32          `json:"duration"`
	Destination         *string        `json:"destination,omitempty"`
	LoadType            *string        `json:"loadType,omitempty"`
	CargoVolume         *string        `json:"cargoVolume,omitempty"`
	CargoOwner          *string        `json:"cargoOwner,omitempty"`
	EstimatedWeight     *float64       `json:"estimatedWeight,omitempty"`
	DeliveryOrderNumber *string        `json:"deliveryOrderNumber,omitempty"`
	IDCardNumber        *string        `json:"idCardNumber,omitempty"`
	SecondCargo         *string        `json:"secondCargo,omitempty"`
	Photos              []*SatpamPhoto `json:"photos,omitempty"`
}

func (v *VehicleOutsideInfo) ID() string {
	return v.GuestLogID
}

func (v *VehicleOutsideInfo) DurationMinutes() int32 {
	return v.Duration
}

// VehicleCompletedInfo for vehicles that have completed both entry and exit today.
type VehicleCompletedInfo struct {
	GuestLogID          string         `json:"guestLogId"`
	CompanyID           string         `json:"companyId"`
	VehiclePlate        string         `json:"vehiclePlate"`
	VehicleType         VehicleType    `json:"vehicleType"`
	DriverName          string         `json:"driverName"`
	EntryTime           time.Time      `json:"entryTime"`
	ExitTime            time.Time      `json:"exitTime"`
	EntryGate           *string        `json:"entryGate,omitempty"`
	ExitGate            *string        `json:"exitGate,omitempty"`
	DurationInside      int32          `json:"durationInsideMinutes"`
	Destination         *string        `json:"destination,omitempty"`
	LoadType            *string        `json:"loadType,omitempty"`
	CargoVolume         *string        `json:"cargoVolume,omitempty"`
	CargoOwner          *string        `json:"cargoOwner,omitempty"`
	EstimatedWeight     *float64       `json:"estimatedWeight,omitempty"`
	DeliveryOrderNumber *string        `json:"deliveryOrderNumber,omitempty"`
	IDCardNumber        *string        `json:"idCardNumber,omitempty"`
	SecondCargo         *string        `json:"secondCargo,omitempty"`
	Photos              []*SatpamPhoto `json:"photos,omitempty"`
}

func (v *VehicleCompletedInfo) ID() string {
	return v.GuestLogID
}

func (v *VehicleCompletedInfo) DurationInsideMinutes() int32 {
	return v.DurationInside
}

// SatpamActivity for recent activities.
type SatpamActivity struct {
	ID               string             `json:"id"`
	Type             SatpamActivityType `json:"type"`
	Title            string             `json:"title"`
	Description      string             `json:"description"`
	Gate             *string            `json:"gate,omitempty"`
	GenerationIntent *GateIntent        `json:"generationIntent,omitempty"`
	EntityID         *string            `json:"entityId,omitempty"`
	Timestamp        time.Time          `json:"timestamp"`
}

// SatpamSyncStatus for offline sync.
type SatpamSyncStatus struct {
	IsOnline            bool       `json:"isOnline"`
	LastSyncAt          *time.Time `json:"lastSyncAt,omitempty"`
	PendingSyncCount    int32      `json:"pendingSyncCount"`
	FailedSyncCount     int32      `json:"failedSyncCount"`
	LastSyncResult      *string    `json:"lastSyncResult,omitempty"`
	PhotosPendingUpload int32      `json:"photosPendingUpload"`
	UniqueDeviceCount   int32      `json:"uniqueDeviceCount"`
}

// ShiftInfo for shift information.
type ShiftInfo struct {
	ShiftName string     `json:"shiftName"`
	StartTime time.Time  `json:"startTime"`
	EndTime   *time.Time `json:"endTime,omitempty"`
	IsActive  bool       `json:"isActive"`
}

// ============================================================================
// GUEST LOG
// ============================================================================

// SatpamGuestLog for guest log entries.
type SatpamGuestLog struct {
	ID                  string              `json:"id"`
	CompanyID           string              `json:"companyId"`
	LocalID             *string             `json:"localId,omitempty"`
	IDCardNumber        *string             `json:"idCardNumber,omitempty"`
	DriverName          string              `json:"driverName"`
	VehiclePlate        string              `json:"vehiclePlate"`
	VehicleType         VehicleType         `json:"vehicleType"`
	Destination         *string             `json:"destination,omitempty"`
	GatePosition        *string             `json:"gatePosition,omitempty"`
	GenerationIntent    *GateIntent         `json:"generationIntent,omitempty"`
	EntryTime           *time.Time          `json:"entryTime,omitempty"`
	ExitTime            *time.Time          `json:"exitTime,omitempty"`
	EntryGate           *string             `json:"entryGate,omitempty"`
	ExitGate            *string             `json:"exitGate,omitempty"`
	Notes               *string             `json:"notes,omitempty"`
	Latitude            *float64            `json:"latitude,omitempty"`
	Longitude           *float64            `json:"longitude,omitempty"`
	QRCodeData          *string             `json:"qrCodeData,omitempty"`
	LoadType            *string             `json:"loadType,omitempty"`
	CargoVolume         *string             `json:"cargoVolume,omitempty"`
	CargoOwner          *string             `json:"cargoOwner,omitempty"`
	EstimatedWeight     *float64            `json:"estimatedWeight,omitempty"`
	DeliveryOrderNumber *string             `json:"deliveryOrderNumber,omitempty"`
	SecondCargo         *string             `json:"secondCargo,omitempty"`
	CreatedBy           string              `json:"createdBy"`
	CreatedAt           time.Time           `json:"createdAt"`
	SyncStatus          common.SyncStatus   `json:"syncStatus"`
	DeviceID            *string             `json:"deviceId,omitempty"`
	RegistrationSource  *RegistrationSource `json:"registrationSource,omitempty"`
	PhotoURL            *string             `json:"photoUrl,omitempty"`
	Photos              []*SatpamPhoto      `json:"photos,omitempty"`
}

// SatpamPhoto represents a photo attached to a guest log.
type SatpamPhoto struct {
	ID        string    `json:"id"`
	PhotoID   string    `json:"photoId"`
	PhotoType PhotoType `json:"photoType"`
	PhotoURL  string    `json:"photoUrl"`
	TakenAt   time.Time `json:"takenAt"`
}

// CreateGuestRegistrationInput for guest registration.
type CreateGuestRegistrationInput struct {
	IDCardNumber        *string             `json:"idCardNumber,omitempty"`
	DriverName          string              `json:"driverName"`
	VehiclePlate        string              `json:"vehiclePlate"`
	VehicleType         VehicleType         `json:"vehicleType"`
	Destination         *string             `json:"destination,omitempty"`
	GatePosition        string              `json:"gatePosition"`
	Notes               *string             `json:"notes,omitempty"`
	DeviceID            string              `json:"deviceId"`
	ClientTimestamp     time.Time           `json:"clientTimestamp"`
	LocalID             string              `json:"localId"`
	Latitude            *float64            `json:"latitude,omitempty"`
	Longitude           *float64            `json:"longitude,omitempty"`
	LoadType            *string             `json:"loadType,omitempty"`
	CargoVolume         *string             `json:"cargoVolume,omitempty"`
	CargoOwner          *string             `json:"cargoOwner,omitempty"`
	EstimatedWeight     *float64            `json:"estimatedWeight,omitempty"`
	DeliveryOrderNumber *string             `json:"deliveryOrderNumber,omitempty"`
	SecondCargo         *string             `json:"secondCargo,omitempty"`
	RegistrationSource  *RegistrationSource `json:"registrationSource,omitempty"`
}

// GuestRegistrationResult for registration result.
type GuestRegistrationResult struct {
	Success  bool            `json:"success"`
	Message  string          `json:"message"`
	GuestLog *SatpamGuestLog `json:"guestLog,omitempty"`
	QRToken  *SatpamQRToken  `json:"qrToken,omitempty"`
	Errors   []string        `json:"errors,omitempty"`
}

// ============================================================================
// QR TOKEN
// ============================================================================

// SatpamQRToken for QR tokens.
type SatpamQRToken struct {
	ID               string        `json:"id"`
	Token            string        `json:"token"`
	Jti              string        `json:"jti"`
	GenerationIntent GateIntent    `json:"generationIntent"`
	AllowedScan      GateIntent    `json:"allowedScan"`
	Status           QRTokenStatus `json:"status"`
	ExpiresAt        time.Time     `json:"expiresAt"`
	GeneratedAt      time.Time     `json:"generatedAt"`
	GuestLogID       *string       `json:"guestLogId,omitempty"`
}

// QRValidationResult for QR validation.
type QRValidationResult struct {
	IsValid           bool            `json:"isValid"`
	Message           string          `json:"message"`
	TokenInfo         *SatpamQRToken  `json:"tokenInfo,omitempty"`
	GuestLog          *SatpamGuestLog `json:"guestLog,omitempty"`
	AllowedOperations []GateIntent    `json:"allowedOperations"`
	Errors            []string        `json:"errors,omitempty"`
}

// ============================================================================
// EXIT PROCESSING
// ============================================================================

// ProcessExitInput for exit processing.
type ProcessExitInput struct {
	Identifier      string             `json:"identifier"`
	IdentifierType  ExitIdentifierType `json:"identifierType"`
	ExitGate        string             `json:"exitGate"`
	Notes           *string            `json:"notes,omitempty"`
	DeviceID        string             `json:"deviceId"`
	ClientTimestamp time.Time          `json:"clientTimestamp"`
	SecondCargo     *string            `json:"secondCargo,omitempty"`
}

// ProcessExitResult for exit result.
type ProcessExitResult struct {
	Success     bool            `json:"success"`
	Message     string          `json:"message"`
	GuestLog    *SatpamGuestLog `json:"guestLog,omitempty"`
	WasOverstay bool            `json:"wasOverstay"`
	Errors      []string        `json:"errors,omitempty"`
}

// ============================================================================
// SYNC
// ============================================================================

// SatpamSyncInput for syncing records.
type SatpamSyncInput struct {
	DeviceID           string                      `json:"deviceId"`
	GuestLogs          []*SatpamGuestLogSyncRecord `json:"guestLogs"`
	ClientTimestamp    time.Time                   `json:"clientTimestamp"`
	BatchID            *string                     `json:"batchId,omitempty"`
	ConflictResolution *common.ConflictResolution  `json:"conflictResolution,omitempty"`
}

// SatpamGuestLogSyncRecord for sync.
type SatpamGuestLogSyncRecord struct {
	LocalID      string                  `json:"localId"`
	ServerID     *string                 `json:"serverId,omitempty"`
	Operation    common.SyncOperation    `json:"operation"`
	Data         *SatpamGuestLogSyncData `json:"data"`
	LocalVersion int32                   `json:"localVersion"`
	LastUpdated  time.Time               `json:"lastUpdated"`
	PhotoIds     []string                `json:"photoIds,omitempty"`
}

// SatpamGuestLogSyncData for sync payload.
type SatpamGuestLogSyncData struct {
	DriverName          string              `json:"driverName"`
	VehiclePlate        string              `json:"vehiclePlate"`
	VehicleType         VehicleType         `json:"vehicleType"`
	Destination         *string             `json:"destination,omitempty"`
	GatePosition        string              `json:"gatePosition"`
	SecondCargo         *string             `json:"secondCargo,omitempty"`
	QrToken             *string             `json:"qrToken,omitempty"`
	IDCardNumber        *string             `json:"idCardNumber,omitempty"`
	Notes               *string             `json:"notes,omitempty"`
	LocalID             string              `json:"localId"`
	LoadType            *string             `json:"loadType,omitempty"`
	CargoVolume         *string             `json:"cargoVolume,omitempty"`
	CargoOwner          *string             `json:"cargoOwner,omitempty"`
	EstimatedWeight     *float64            `json:"estimatedWeight,omitempty"`
	DeliveryOrderNumber *string             `json:"deliveryOrderNumber,omitempty"`
	Latitude            *float64            `json:"latitude,omitempty"`
	Longitude           *float64            `json:"longitude,omitempty"`
	EntryTime           *time.Time          `json:"entryTime,omitempty"`
	ExitTime            *time.Time          `json:"exitTime,omitempty"`
	EntryGate           *string             `json:"entryGate,omitempty"`
	ExitGate            *string             `json:"exitGate,omitempty"`
	GenerationIntent    GateIntent          `json:"generationIntent"`
	Status              *GuestLogStatus     `json:"status,omitempty"`
	RegistrationSource  *RegistrationSource `json:"registrationSource,omitempty"`
}

// SatpamSyncResult for sync result.
type SatpamSyncResult struct {
	Success           bool                    `json:"success"`
	TransactionID     string                  `json:"transactionId"`
	RecordsProcessed  int32                   `json:"recordsProcessed"`
	RecordsSuccessful int32                   `json:"recordsSuccessful"`
	RecordsFailed     int32                   `json:"recordsFailed"`
	ConflictsDetected int32                   `json:"conflictsDetected"`
	Results           []*SatpamSyncItemResult `json:"results"`
	ServerTimestamp   time.Time               `json:"serverTimestamp"`
	Message           string                  `json:"message"`
}

// SatpamSyncItemResult for individual sync result.
type SatpamSyncItemResult struct {
	LocalID       string                `json:"localId"`
	RecordType    string                `json:"recordType"`
	ServerID      *string               `json:"serverId,omitempty"`
	Success       bool                  `json:"success"`
	Status        common.SyncItemStatus `json:"status"`
	Reason        *string               `json:"reason,omitempty"`
	ServerVersion *int32                `json:"serverVersion,omitempty"`
	Error         *string               `json:"error,omitempty"`
	HasConflict   bool                  `json:"hasConflict"`
	ConflictData  *string               `json:"conflictData,omitempty"`
}

// ============================================================================
// HISTORY
// ============================================================================

// SatpamHistoryFilter for filtering.
type SatpamHistoryFilter struct {
	Status        *GuestLogStatus         `json:"status,omitempty"`
	VehicleType   *VehicleType            `json:"vehicleType,omitempty"`
	DateFrom      *time.Time              `json:"dateFrom,omitempty"`
	DateTo        *time.Time              `json:"dateTo,omitempty"`
	Search        *string                 `json:"search,omitempty"`
	SortBy        *SatpamHistorySortField `json:"sortBy,omitempty"`
	SortDirection *common.SortDirection   `json:"sortDirection,omitempty"`
	Page          *int32                  `json:"page,omitempty"`
	PageSize      *int32                  `json:"pageSize,omitempty"`
}

// SatpamHistoryResponse for paginated history.
type SatpamHistoryResponse struct {
	Items      []*SatpamGuestLog     `json:"items"`
	TotalCount int32                 `json:"totalCount"`
	HasMore    bool                  `json:"hasMore"`
	Summary    *SatpamHistorySummary `json:"summary"`
	SyncStats  *SyncStatusStats      `json:"syncStats"`
}

// SatpamHistorySummary for statistics.
type SatpamHistorySummary struct {
	TotalEntries    int32   `json:"totalEntries"`
	TotalExits      int32   `json:"totalExits"`
	CurrentlyInside int32   `json:"currentlyInside"`
	AvgDuration     float64 `json:"avgDuration"`
	OverstayCount   int32   `json:"overstayCount"`
}

// SyncStatusStats for sync status aggregate counts (across all data).
type SyncStatusStats struct {
	TotalSynced   int32 `json:"totalSynced"`
	TotalPending  int32 `json:"totalPending"`
	TotalFailed   int32 `json:"totalFailed"`
	TotalConflict int32 `json:"totalConflict"`
}

// ============================================================================
// PROFILE
// ============================================================================

// SatpamProfile for satpam user profile.
type SatpamProfile struct {
	User      *auth.User      `json:"user"`
	Company   *master.Company `json:"company"`
	GateStats *GateStats      `json:"gateStats,omitempty"`
}

func (SatpamProfile) IsUserProfile() {}

// GateStats for gate metrics.
type GateStats struct {
	DailyGateChecks  int32                `json:"dailyGateChecks"`
	PendingApprovals int32                `json:"pendingApprovals"`
	SecuritySummary  *GateSecuritySummary `json:"securitySummary,omitempty"`
}

// GateSecuritySummary for security metrics.
type GateSecuritySummary struct {
	VehiclesProcessed     int32   `json:"vehiclesProcessed"`
	SecurityIncidents     int32   `json:"securityIncidents"`
	AverageProcessingTime float64 `json:"averageProcessingTime"`
}

// ============================================================================
// ENUMS
// ============================================================================

// VehicleType enum.
type VehicleType string

const (
	VehicleTypeCar       VehicleType = "CAR"
	VehicleTypeTruck     VehicleType = "TRUCK"
	VehicleTypePickup    VehicleType = "PICKUP"
	VehicleTypeVan       VehicleType = "VAN"
	VehicleTypeMotorbike VehicleType = "MOTORBIKE"
	VehicleTypeBus       VehicleType = "BUS"
	VehicleTypeOther     VehicleType = "OTHER"
)

var AllVehicleType = []VehicleType{
	VehicleTypeCar,
	VehicleTypeTruck,
	VehicleTypePickup,
	VehicleTypeVan,
	VehicleTypeMotorbike,
	VehicleTypeBus,
	VehicleTypeOther,
}

func (e VehicleType) IsValid() bool {
	switch e {
	case VehicleTypeCar, VehicleTypeTruck, VehicleTypePickup, VehicleTypeVan, VehicleTypeMotorbike, VehicleTypeBus, VehicleTypeOther:
		return true
	}
	return false
}

func (e VehicleType) String() string {
	return string(e)
}

func (e *VehicleType) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = VehicleType(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid VehicleType", str)
	}
	return nil
}

func (e VehicleType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *VehicleType) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e VehicleType) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// GuestLogStatus enum.
type GuestLogStatus string

const (
	GuestLogStatusEntry GuestLogStatus = "ENTRY"
	GuestLogStatusExit  GuestLogStatus = "EXIT"
)

var AllGuestLogStatus = []GuestLogStatus{
	GuestLogStatusEntry,
	GuestLogStatusExit,
}

func (e GuestLogStatus) IsValid() bool {
	switch e {
	case GuestLogStatusEntry, GuestLogStatusExit:
		return true
	}
	return false
}

func (e GuestLogStatus) String() string {
	return string(e)
}

func (e *GuestLogStatus) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = GuestLogStatus(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid GuestLogStatus", str)
	}
	return nil
}

func (e GuestLogStatus) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *GuestLogStatus) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e GuestLogStatus) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// GateIntent enum.
type GateIntent string

const (
	GateIntentEntry GateIntent = "ENTRY"
	GateIntentExit  GateIntent = "EXIT"
)

var AllGateIntent = []GateIntent{
	GateIntentEntry,
	GateIntentExit,
}

func (e GateIntent) IsValid() bool {
	switch e {
	case GateIntentEntry, GateIntentExit:
		return true
	}
	return false
}

func (e GateIntent) String() string {
	return string(e)
}

func (e *GateIntent) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = GateIntent(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid GateIntent", str)
	}
	return nil
}

func (e GateIntent) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *GateIntent) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e GateIntent) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// QRTokenStatus enum.
type QRTokenStatus string

const (
	QRTokenStatusActive    QRTokenStatus = "ACTIVE"
	QRTokenStatusUsed      QRTokenStatus = "USED"
	QRTokenStatusExpired   QRTokenStatus = "EXPIRED"
	QRTokenStatusCancelled QRTokenStatus = "CANCELLED"
	QRTokenStatusInvalid   QRTokenStatus = "INVALID"
)

var AllQRTokenStatus = []QRTokenStatus{
	QRTokenStatusActive,
	QRTokenStatusUsed,
	QRTokenStatusExpired,
	QRTokenStatusCancelled,
	QRTokenStatusInvalid,
}

func (e QRTokenStatus) IsValid() bool {
	switch e {
	case QRTokenStatusActive, QRTokenStatusUsed, QRTokenStatusExpired, QRTokenStatusCancelled, QRTokenStatusInvalid:
		return true
	}
	return false
}

func (e QRTokenStatus) String() string {
	return string(e)
}

func (e *QRTokenStatus) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = QRTokenStatus(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid QRTokenStatus", str)
	}
	return nil
}

func (e QRTokenStatus) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *QRTokenStatus) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e QRTokenStatus) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// ExitIdentifierType enum.
type ExitIdentifierType string

const (
	ExitIdentifierTypeGuestLogID ExitIdentifierType = "GUEST_LOG_ID"
	ExitIdentifierTypeQRToken    ExitIdentifierType = "QR_TOKEN"
	ExitIdentifierTypePlate      ExitIdentifierType = "PLATE"
)

var AllExitIdentifierType = []ExitIdentifierType{
	ExitIdentifierTypeGuestLogID,
	ExitIdentifierTypeQRToken,
	ExitIdentifierTypePlate,
}

func (e ExitIdentifierType) IsValid() bool {
	switch e {
	case ExitIdentifierTypeGuestLogID, ExitIdentifierTypeQRToken, ExitIdentifierTypePlate:
		return true
	}
	return false
}

func (e ExitIdentifierType) String() string {
	return string(e)
}

func (e *ExitIdentifierType) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = ExitIdentifierType(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid ExitIdentifierType", str)
	}
	return nil
}

func (e ExitIdentifierType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *ExitIdentifierType) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e ExitIdentifierType) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// SatpamActivityType enum.
type SatpamActivityType string

const (
	SatpamActivityTypeVehicleEntry    SatpamActivityType = "VEHICLE_ENTRY"
	SatpamActivityTypeVehicleExit     SatpamActivityType = "VEHICLE_EXIT"
	SatpamActivityTypeGuestRegistered SatpamActivityType = "GUEST_REGISTERED"
	SatpamActivityTypeQRScanned       SatpamActivityType = "QR_SCANNED"
	SatpamActivityTypeOverstayAlert   SatpamActivityType = "OVERSTAY_ALERT"
	SatpamActivityTypeDataSynced      SatpamActivityType = "DATA_SYNCED"
)

var AllSatpamActivityType = []SatpamActivityType{
	SatpamActivityTypeVehicleEntry,
	SatpamActivityTypeVehicleExit,
	SatpamActivityTypeGuestRegistered,
	SatpamActivityTypeQRScanned,
	SatpamActivityTypeOverstayAlert,
	SatpamActivityTypeDataSynced,
}

func (e SatpamActivityType) IsValid() bool {
	switch e {
	case SatpamActivityTypeVehicleEntry, SatpamActivityTypeVehicleExit, SatpamActivityTypeGuestRegistered, SatpamActivityTypeQRScanned, SatpamActivityTypeOverstayAlert, SatpamActivityTypeDataSynced:
		return true
	}
	return false
}

func (e SatpamActivityType) String() string {
	return string(e)
}

func (e *SatpamActivityType) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = SatpamActivityType(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid SatpamActivityType", str)
	}
	return nil
}

func (e SatpamActivityType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *SatpamActivityType) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e SatpamActivityType) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// SatpamHistorySortField enum.
type SatpamHistorySortField string

const (
	SatpamHistorySortFieldEntryTime    SatpamHistorySortField = "ENTRY_TIME"
	SatpamHistorySortFieldExitTime     SatpamHistorySortField = "EXIT_TIME"
	SatpamHistorySortFieldDuration     SatpamHistorySortField = "DURATION"
	SatpamHistorySortFieldVehiclePlate SatpamHistorySortField = "VEHICLE_PLATE"
	SatpamHistorySortFieldDriverName   SatpamHistorySortField = "DRIVER_NAME"
)

var AllSatpamHistorySortField = []SatpamHistorySortField{
	SatpamHistorySortFieldEntryTime,
	SatpamHistorySortFieldExitTime,
	SatpamHistorySortFieldDuration,
	SatpamHistorySortFieldVehiclePlate,
	SatpamHistorySortFieldDriverName,
}

func (e SatpamHistorySortField) IsValid() bool {
	switch e {
	case SatpamHistorySortFieldEntryTime, SatpamHistorySortFieldExitTime, SatpamHistorySortFieldDuration, SatpamHistorySortFieldVehiclePlate, SatpamHistorySortFieldDriverName:
		return true
	}
	return false
}

func (e SatpamHistorySortField) String() string {
	return string(e)
}

func (e *SatpamHistorySortField) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = SatpamHistorySortField(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid SatpamHistorySortField", str)
	}
	return nil
}

func (e SatpamHistorySortField) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *SatpamHistorySortField) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e SatpamHistorySortField) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// PhotoType enum.
type PhotoType string

const (
	PhotoTypeEntry PhotoType = "ENTRY"
	PhotoTypeExit  PhotoType = "EXIT"
	PhotoTypeFront PhotoType = "FRONT"
	PhotoTypeBack  PhotoType = "BACK"
)

// RegistrationSource represents the source of data for a guest log.
type RegistrationSource string

const (
	RegistrationSourceManual RegistrationSource = "MANUAL"
	RegistrationSourceQRScan RegistrationSource = "QR_SCAN"
)

var AllRegistrationSource = []RegistrationSource{
	RegistrationSourceManual,
	RegistrationSourceQRScan,
}

func (e RegistrationSource) IsValid() bool {
	switch e {
	case RegistrationSourceManual, RegistrationSourceQRScan:
		return true
	}
	return false
}

func (e RegistrationSource) String() string {
	return string(e)
}

func (e *RegistrationSource) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = RegistrationSource(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid RegistrationSource", str)
	}
	return nil
}

func (e RegistrationSource) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *RegistrationSource) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e RegistrationSource) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

const (
	PhotoTypeVehicle  PhotoType = "VEHICLE"
	PhotoTypeDocument PhotoType = "DOCUMENT"
	PhotoTypeGeneral  PhotoType = "GENERAL"
)

var AllPhotoType = []PhotoType{
	PhotoTypeEntry,
	PhotoTypeExit,
	PhotoTypeFront,
	PhotoTypeBack,
	PhotoTypeVehicle,
	PhotoTypeDocument,
	PhotoTypeGeneral,
}

func (e PhotoType) IsValid() bool {
	switch e {
	case PhotoTypeEntry, PhotoTypeExit, PhotoTypeFront, PhotoTypeBack, PhotoTypeVehicle, PhotoTypeDocument, PhotoTypeGeneral:
		return true
	}
	return false
}

func (e PhotoType) String() string {
	return string(e)
}

func (e *PhotoType) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = PhotoType(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid PhotoType", str)
	}
	return nil
}

func (e PhotoType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *PhotoType) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e PhotoType) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

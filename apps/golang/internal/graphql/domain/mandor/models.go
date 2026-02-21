// Package mandor contains Mandor-specific GraphQL types including HarvestRecord.
package mandor

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
// HARVEST RECORD (Core type used by multiple domains)
// ============================================================================

// HarvestRecord represents a harvest entry made by Mandor.
type HarvestRecord struct {
	ID                   string        `json:"id" gorm:"primaryKey;column:id;type:uuid;default:gen_random_uuid()"`
	LocalID              *string       `json:"localId,omitempty"`
	DeviceID             *string       `json:"deviceId,omitempty" gorm:"column:device_id;type:text"`
	Tanggal              time.Time     `json:"tanggal"`
	MandorID             string        `json:"mandorId" gorm:"column:mandor_id;type:uuid"`
	AsistenID            *string       `json:"asistenId,omitempty" gorm:"-"`
	CompanyID            *string       `json:"companyId,omitempty" gorm:"column:company_id;type:uuid"`
	EstateID             *string       `json:"estateId,omitempty" gorm:"column:estate_id;type:uuid"`
	DivisionID           *string       `json:"divisionId,omitempty" gorm:"column:division_id;type:uuid"`
	Mandor               *auth.User    `json:"mandor"`
	BlockID              string        `json:"blockId" gorm:"column:block_id;type:uuid"`
	Block                *master.Block `json:"block"`
	Nik                  *string       `json:"nik,omitempty" gorm:"column:nik;type:text"`
	KaryawanID           *string       `json:"karyawanId,omitempty" gorm:"column:karyawan_id;type:uuid"`
	EmployeeDivisionID   *string       `json:"employeeDivisionId,omitempty" gorm:"column:employee_division_id;type:uuid"`
	EmployeeDivisionName *string       `json:"employeeDivisionName,omitempty" gorm:"column:employee_division_name;type:text"`
	Karyawan             string        `json:"karyawan" gorm:"column:karyawan;type:text"`
	BeratTbs             float64       `json:"beratTbs"`
	JumlahJanjang        int32         `json:"jumlahJanjang"`
	JjgMatang            int32         `json:"jjgMatang" gorm:"column:jjg_matang;type:integer;default:0"`
	JjgMentah            int32         `json:"jjgMentah" gorm:"column:jjg_mentah;type:integer;default:0"`
	JjgLewatMatang       int32         `json:"jjgLewatMatang" gorm:"column:jjg_lewat_matang;type:integer;default:0"`
	JjgBusukAbnormal     int32         `json:"jjgBusukAbnormal" gorm:"column:jjg_busuk_abnormal;type:integer;default:0"`
	JjgTangkaiPanjang    int32         `json:"jjgTangkaiPanjang" gorm:"column:jjg_tangkai_panjang;type:integer;default:0"`
	TotalBrondolan       float64       `json:"totalBrondolan" gorm:"column:total_brondolan;type:double precision;default:0"`
	Status               HarvestStatus `json:"status"`
	ApprovedBy           *string       `json:"approvedBy,omitempty"`
	ApprovedAt           *time.Time    `json:"approvedAt,omitempty"`
	RejectedReason       *string       `json:"rejectedReason,omitempty"`
	Notes                *string       `json:"notes,omitempty" gorm:"column:notes;type:text"`
	Latitude             *float64      `json:"latitude,omitempty" gorm:"column:latitude;type:double precision"`
	Longitude            *float64      `json:"longitude,omitempty" gorm:"column:longitude;type:double precision"`
	PhotoURL             *string       `json:"photoUrl,omitempty" gorm:"column:photo_url;type:text"`
	CreatedAt            time.Time     `json:"createdAt"`
	UpdatedAt            time.Time     `json:"updatedAt"`
}

// CreateHarvestRecordInput for creating harvest records.
type CreateHarvestRecordInput struct {
	LocalID              *string   `json:"localId,omitempty"`
	DeviceID             *string   `json:"deviceId,omitempty"`
	Tanggal              time.Time `json:"tanggal"`
	MandorID             string    `json:"mandorId"`
	AsistenID            *string   `json:"asistenId,omitempty"`
	CompanyID            *string   `json:"companyId,omitempty"`
	EstateID             *string   `json:"estateId,omitempty"`
	DivisionID           *string   `json:"divisionId,omitempty"`
	BlockID              string    `json:"blockId"`
	KaryawanID           *string   `json:"karyawanId,omitempty"`
	EmployeeDivisionID   *string   `json:"employeeDivisionId,omitempty"`
	EmployeeDivisionName *string   `json:"employeeDivisionName,omitempty"`
	Karyawan             string    `json:"karyawan"`
	BeratTbs             float64   `json:"beratTbs"`
	JumlahJanjang        int32     `json:"jumlahJanjang"`
	JjgMatang            *int32    `json:"jjgMatang,omitempty"`
	JjgMentah            *int32    `json:"jjgMentah,omitempty"`
	JjgLewatMatang       *int32    `json:"jjgLewatMatang,omitempty"`
	JjgBusukAbnormal     *int32    `json:"jjgBusukAbnormal,omitempty"`
	JjgTangkaiPanjang    *int32    `json:"jjgTangkaiPanjang,omitempty"`
	TotalBrondolan       *float64  `json:"totalBrondolan,omitempty"`
	Notes                *string   `json:"notes,omitempty"`
	Latitude             *float64  `json:"latitude,omitempty"`
	Longitude            *float64  `json:"longitude,omitempty"`
	PhotoURL             *string   `json:"photoUrl,omitempty"`
}

// HarvestStatus enum.
type HarvestStatus string

const (
	HarvestStatusPending  HarvestStatus = "PENDING"
	HarvestStatusApproved HarvestStatus = "APPROVED"
	HarvestStatusRejected HarvestStatus = "REJECTED"
	HarvestStatusSynced   HarvestStatus = "SYNCED"
)

var AllHarvestStatus = []HarvestStatus{
	HarvestStatusPending,
	HarvestStatusApproved,
	HarvestStatusRejected,
	HarvestStatusSynced,
}

func (e HarvestStatus) IsValid() bool {
	switch e {
	case HarvestStatusPending, HarvestStatusApproved, HarvestStatusRejected, HarvestStatusSynced:
		return true
	}
	return false
}

func (e HarvestStatus) String() string {
	return string(e)
}

func (e *HarvestStatus) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = HarvestStatus(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid HarvestStatus", str)
	}
	return nil
}

func (e HarvestStatus) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *HarvestStatus) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e HarvestStatus) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// ============================================================================
// MANDOR DASHBOARD
// ============================================================================

// MandorDashboardData represents aggregated dashboard data for Mandor.
type MandorDashboardData struct {
	User               *auth.User              `json:"user"`
	Divisions          []*master.Division      `json:"divisions"`
	Stats              *MandorDashboardStats   `json:"stats"`
	RecentActivities   []*MandorActivity       `json:"recentActivities"`
	PendingSubmissions []*MandorHarvestSummary `json:"pendingSubmissions"`
	TodayWork          *MandorTodayWork        `json:"todayWork"`
	SyncStatus         *MandorSyncStatus       `json:"syncStatus"`
}

// MandorDashboardStats for dashboard metrics.
type MandorDashboardStats struct {
	TodayHarvestCount int32   `json:"todayHarvestCount"`
	TodayTbsCount     int32   `json:"todayTbsCount"`
	TodayWeight       float64 `json:"todayWeight"`
	PendingCount      int32   `json:"pendingCount"`
	ApprovedToday     int32   `json:"approvedToday"`
	RejectedToday     int32   `json:"rejectedToday"`
	ActiveWorkers     int32   `json:"activeWorkers"`
	BlocksWorkedToday int32   `json:"blocksWorkedToday"`
	WeeklyTbs         int32   `json:"weeklyTbs"`
	WeeklyWeight      float64 `json:"weeklyWeight"`
}

// MandorActivity represents a recent activity.
type MandorActivity struct {
	ID          string             `json:"id"`
	Type        MandorActivityType `json:"type"`
	Title       string             `json:"title"`
	Description string             `json:"description"`
	HarvestID   *string            `json:"harvestId,omitempty"`
	BlockName   *string            `json:"blockName,omitempty"`
	Timestamp   time.Time          `json:"timestamp"`
	Status      string             `json:"status"`
}

// MandorTodayWork for today's work summary.
type MandorTodayWork struct {
	StartTime       *time.Time `json:"startTime,omitempty"`
	CurrentBlock    *string    `json:"currentBlock,omitempty"`
	HarvestsCreated int32      `json:"harvestsCreated"`
	TotalTbs        int32      `json:"totalTbs"`
	TotalWeight     float64    `json:"totalWeight"`
	WorkersInvolved int32      `json:"workersInvolved"`
	BlocksCompleted int32      `json:"blocksCompleted"`
}

// MandorSyncStatus for offline sync.
type MandorSyncStatus struct {
	IsOnline            bool       `json:"isOnline"`
	LastSyncAt          *time.Time `json:"lastSyncAt,omitempty"`
	PendingSyncCount    int32      `json:"pendingSyncCount"`
	FailedSyncCount     int32      `json:"failedSyncCount"`
	LastSyncResult      *string    `json:"lastSyncResult,omitempty"`
	PhotosPendingUpload int32      `json:"photosPendingUpload"`
}

// MandorHarvestSummary for harvest list items.
type MandorHarvestSummary struct {
	ID           string        `json:"id"`
	BlockName    string        `json:"blockName"`
	DivisionName string        `json:"divisionName"`
	HarvestDate  time.Time     `json:"harvestDate"`
	TbsCount     int32         `json:"tbsCount"`
	Weight       float64       `json:"weight"`
	Status       HarvestStatus `json:"status"`
	SubmittedAt  time.Time     `json:"submittedAt"`
	HasPhoto     bool          `json:"hasPhoto"`
}

// ============================================================================
// MANDOR HARVEST RECORD (Extended)
// ============================================================================

// MandorHarvestRecord for full harvest record display.
type MandorHarvestRecord struct {
	ID                string              `json:"id"`
	LocalID           *string             `json:"localId,omitempty"`
	PanenNumber       *string             `json:"panenNumber,omitempty"`
	Tanggal           time.Time           `json:"tanggal"`
	MandorID          string              `json:"mandorId"`
	MandorName        string              `json:"mandorName"`
	BlockID           string              `json:"blockId"`
	BlockName         string              `json:"blockName"`
	DivisionID        string              `json:"divisionId"`
	DivisionName      string              `json:"divisionName"`
	EstateID          string              `json:"estateId"`
	EstateName        string              `json:"estateName"`
	CompanyID         *string             `json:"companyId,omitempty"`
	ManagerID         *string             `json:"managerId,omitempty"`
	AsistenID         *string             `json:"asistenId,omitempty"`
	Karyawan          string              `json:"karyawan"`
	JumlahJanjang     int32               `json:"jumlahJanjang"`
	JjgMatang         int32               `json:"jjgMatang"`
	JjgMentah         int32               `json:"jjgMentah"`
	JjgLewatMatang    int32               `json:"jjgLewatMatang"`
	JjgBusukAbnormal  int32               `json:"jjgBusukAbnormal"`
	JjgTangkaiPanjang int32               `json:"jjgTangkaiPanjang"`
	TotalBrondolan    float64             `json:"totalBrondolan"`
	BeratTbs          float64             `json:"beratTbs"`
	Status            HarvestStatus       `json:"status"`
	ApprovedBy        *string             `json:"approvedBy,omitempty"`
	ApprovedByName    *string             `json:"approvedByName,omitempty"`
	ApprovedAt        *time.Time          `json:"approvedAt,omitempty"`
	RejectedReason    *string             `json:"rejectedReason,omitempty"`
	Notes             *string             `json:"notes,omitempty"`
	Coordinates       *common.Coordinates `json:"coordinates,omitempty"`
	Photos            []*HarvestPhoto     `json:"photos,omitempty"`
	CreatedAt         time.Time           `json:"createdAt"`
	UpdatedAt         time.Time           `json:"updatedAt"`
	SyncStatus        common.SyncStatus   `json:"syncStatus"`
	ServerVersion     int32               `json:"serverVersion"`
}

// HarvestPhoto for photos.
type HarvestPhoto struct {
	ID         string            `json:"id"`
	LocalPath  *string           `json:"localPath,omitempty"`
	ServerURL  *string           `json:"serverUrl,omitempty"`
	SyncStatus common.SyncStatus `json:"syncStatus"`
	TakenAt    time.Time         `json:"takenAt"`
}

// MandorHarvestResult for operation results.
type MandorHarvestResult struct {
	Success       bool                 `json:"success"`
	Message       string               `json:"message"`
	HarvestRecord *MandorHarvestRecord `json:"harvestRecord,omitempty"`
	ServerID      *string              `json:"serverId,omitempty"`
	ServerVersion *int32               `json:"serverVersion,omitempty"`
	Errors        []string             `json:"errors,omitempty"`
}

// ============================================================================
// MANDOR SYNC
// ============================================================================

// CreateMandorHarvestInput for creating harvest via mandor flow.
type CreateMandorHarvestInput struct {
	Tanggal         time.Time `json:"tanggal"`
	BlockID         string    `json:"blockId"`
	Karyawan        string    `json:"karyawan"`
	JumlahJanjang   int32     `json:"jumlahJanjang"`
	BeratTbs        *float64  `json:"beratTbs,omitempty"`
	Notes           *string   `json:"notes,omitempty"`
	Latitude        *float64  `json:"latitude,omitempty"`
	Longitude       *float64  `json:"longitude,omitempty"`
	CompanyID       *string   `json:"companyId,omitempty"`
	ManagerID       *string   `json:"managerId,omitempty"`
	AsistenID       *string   `json:"asistenId,omitempty"`
	PhotoPaths      []string  `json:"photoPaths,omitempty"`
	DeviceID        string    `json:"deviceId"`
	ClientTimestamp time.Time `json:"clientTimestamp"`
	LocalID         string    `json:"localId"`
}

// MandorSyncInput for syncing harvest records.
type MandorSyncInput struct {
	DeviceID           string                     `json:"deviceId"`
	Harvests           []*MandorHarvestSyncRecord `json:"harvests"`
	ClientTimestamp    time.Time                  `json:"clientTimestamp"`
	BatchID            *string                    `json:"batchId,omitempty"`
	ConflictResolution *common.ConflictResolution `json:"conflictResolution,omitempty"`
}

// MandorHarvestSyncRecord for individual sync item.
type MandorHarvestSyncRecord struct {
	LocalID      string                 `json:"localId"`
	ServerID     *string                `json:"serverId,omitempty"`
	Operation    common.SyncOperation   `json:"operation"`
	Data         *MandorHarvestSyncData `json:"data"`
	LocalVersion int32                  `json:"localVersion"`
	LastUpdated  time.Time              `json:"lastUpdated"`
	PhotoIds     []string               `json:"photoIds,omitempty"`
}

// MandorHarvestSyncData for sync payload.
type MandorHarvestSyncData struct {
	Tanggal       time.Time     `json:"tanggal"`
	BlockID       string        `json:"blockId"`
	Karyawan      string        `json:"karyawan"`
	JumlahJanjang int32         `json:"jumlahJanjang"`
	BeratTbs      float64       `json:"beratTbs"`
	Notes         *string       `json:"notes,omitempty"`
	Status        HarvestStatus `json:"status"`
	Latitude      *float64      `json:"latitude,omitempty"`
	Longitude     *float64      `json:"longitude,omitempty"`
}

// MandorSyncResult for sync operation result.
type MandorSyncResult struct {
	Success           bool                    `json:"success"`
	TransactionID     string                  `json:"transactionId"`
	RecordsProcessed  int32                   `json:"recordsProcessed"`
	RecordsSuccessful int32                   `json:"recordsSuccessful"`
	RecordsFailed     int32                   `json:"recordsFailed"`
	ConflictsDetected int32                   `json:"conflictsDetected"`
	Results           []*MandorSyncItemResult `json:"results"`
	ServerTimestamp   time.Time               `json:"serverTimestamp"`
	Message           string                  `json:"message"`
}

// MandorSyncItemResult for individual sync result.
type MandorSyncItemResult struct {
	LocalID       string          `json:"localId"`
	ServerID      *string         `json:"serverId,omitempty"`
	Success       bool            `json:"success"`
	Status        common.SyncItemStatus `json:"status"`
	Reason        *string         `json:"reason,omitempty"`
	ServerVersion *int32          `json:"serverVersion,omitempty"`
	Error         *string         `json:"error,omitempty"`
	HasConflict   bool            `json:"hasConflict"`
	ConflictData  *string         `json:"conflictData,omitempty"`
}

// ============================================================================
// MANDOR HISTORY
// ============================================================================

// MandorHistoryFilter for filtering history.
type MandorHistoryFilter struct {
	Status        *HarvestStatus          `json:"status,omitempty"`
	DateFrom      *time.Time              `json:"dateFrom,omitempty"`
	DateTo        *time.Time              `json:"dateTo,omitempty"`
	BlockID       *string                 `json:"blockId,omitempty"`
	DivisionID    *string                 `json:"divisionId,omitempty"`
	Search        *string                 `json:"search,omitempty"`
	SortBy        *MandorHistorySortField `json:"sortBy,omitempty"`
	SortDirection *common.SortDirection   `json:"sortDirection,omitempty"`
	Page          *int32                  `json:"page,omitempty"`
	PageSize      *int32                  `json:"pageSize,omitempty"`
}

// MandorHistoryResponse for paginated history.
type MandorHistoryResponse struct {
	Items      []*MandorHarvestRecord `json:"items"`
	TotalCount int32                  `json:"totalCount"`
	HasMore    bool                   `json:"hasMore"`
	Summary    *MandorHistorySummary  `json:"summary"`
}

// MandorHistorySummary for statistics.
type MandorHistorySummary struct {
	TotalHarvests int32   `json:"totalHarvests"`
	TotalTbs      int32   `json:"totalTbs"`
	TotalWeight   float64 `json:"totalWeight"`
	Approved      int32   `json:"approved"`
	Pending       int32   `json:"pending"`
	Rejected      int32   `json:"rejected"`
}

// ============================================================================
// MANDOR PROFILE
// ============================================================================

// MandorProfile for mandor user profile.
type MandorProfile struct {
	User        *auth.User         `json:"user"`
	Company     *master.Company    `json:"company"`
	Estate      *master.Estate     `json:"estate"`
	Divisions   []*master.Division `json:"divisions"`
	MandorStats *MandorStats       `json:"mandorStats,omitempty"`
}

func (MandorProfile) IsUserProfile() {}

// MandorStats for mandor metrics.
type MandorStats struct {
	DivisionsSupervised int32           `json:"divisionsSupervised"`
	DailyHarvestRecords int32           `json:"dailyHarvestRecords"`
	FieldWorkSummary    *MandorWorkload `json:"fieldWorkSummary,omitempty"`
}

// MandorWorkload for field work metrics.
type MandorWorkload struct {
	RecordsCreated      int32   `json:"recordsCreated"`
	BlocksSupervised    int32   `json:"blocksSupervised"`
	QualityScoreAverage float64 `json:"qualityScoreAverage"`
}

// MandorStatus for mandor activity status.
type MandorStatus struct {
	MandorID            string    `json:"mandorId"`
	MandorName          string    `json:"mandorName"`
	IsOnline            bool      `json:"isOnline"`
	LastSeen            time.Time `json:"lastSeen"`
	CurrentBlock        *string   `json:"currentBlock,omitempty"`
	TodaySubmissions    int32     `json:"todaySubmissions"`
	PendingSubmissions  int32     `json:"pendingSubmissions"`
	ApprovedSubmissions int32     `json:"approvedSubmissions"`
	TodayTbs            int32     `json:"todayTbs"`
	TodayWeight         float64   `json:"todayWeight"`
}

// ============================================================================
// ENUMS
// ============================================================================

// MandorActivityType enum.
type MandorActivityType string

const (
	MandorActivityTypeHarvestCreated  MandorActivityType = "HARVEST_CREATED"
	MandorActivityTypeHarvestApproved MandorActivityType = "HARVEST_APPROVED"
	MandorActivityTypeHarvestRejected MandorActivityType = "HARVEST_REJECTED"
	MandorActivityTypeHarvestSynced   MandorActivityType = "HARVEST_SYNCED"
	MandorActivityTypePhotoUploaded   MandorActivityType = "PHOTO_UPLOADED"
)

var AllMandorActivityType = []MandorActivityType{
	MandorActivityTypeHarvestCreated,
	MandorActivityTypeHarvestApproved,
	MandorActivityTypeHarvestRejected,
	MandorActivityTypeHarvestSynced,
	MandorActivityTypePhotoUploaded,
}

func (e MandorActivityType) IsValid() bool {
	switch e {
	case MandorActivityTypeHarvestCreated, MandorActivityTypeHarvestApproved, MandorActivityTypeHarvestRejected, MandorActivityTypeHarvestSynced, MandorActivityTypePhotoUploaded:
		return true
	}
	return false
}

func (e MandorActivityType) String() string {
	return string(e)
}

func (e *MandorActivityType) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = MandorActivityType(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid MandorActivityType", str)
	}
	return nil
}

func (e MandorActivityType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *MandorActivityType) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e MandorActivityType) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// MandorHistorySortField enum.
type MandorHistorySortField string

const (
	MandorHistorySortFieldHarvestDate MandorHistorySortField = "HARVEST_DATE"
	MandorHistorySortFieldCreatedAt   MandorHistorySortField = "CREATED_AT"
	MandorHistorySortFieldWeight      MandorHistorySortField = "WEIGHT"
	MandorHistorySortFieldTbsCount    MandorHistorySortField = "TBS_COUNT"
	MandorHistorySortFieldStatus      MandorHistorySortField = "STATUS"
)

var AllMandorHistorySortField = []MandorHistorySortField{
	MandorHistorySortFieldHarvestDate,
	MandorHistorySortFieldCreatedAt,
	MandorHistorySortFieldWeight,
	MandorHistorySortFieldTbsCount,
	MandorHistorySortFieldStatus,
}

func (e MandorHistorySortField) IsValid() bool {
	switch e {
	case MandorHistorySortFieldHarvestDate, MandorHistorySortFieldCreatedAt, MandorHistorySortFieldWeight, MandorHistorySortFieldTbsCount, MandorHistorySortFieldStatus:
		return true
	}
	return false
}

func (e MandorHistorySortField) String() string {
	return string(e)
}

func (e *MandorHistorySortField) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = MandorHistorySortField(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid MandorHistorySortField", str)
	}
	return nil
}

func (e MandorHistorySortField) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *MandorHistorySortField) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e MandorHistorySortField) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// ============================================================================
// ADDITIONAL TYPES (Required by gqlgen mappings)
// ============================================================================

// UpdateHarvestRecordInput for updating harvest records.
type UpdateHarvestRecordInput struct {
	ID                   string     `json:"id"`
	DeviceID             *string    `json:"deviceId,omitempty"`
	Tanggal              *time.Time `json:"tanggal,omitempty"`
	BlockID              *string    `json:"blockId,omitempty"`
	KaryawanID           *string    `json:"karyawanId,omitempty"`
	EmployeeDivisionID   *string    `json:"employeeDivisionId,omitempty"`
	EmployeeDivisionName *string    `json:"employeeDivisionName,omitempty"`
	Karyawan             *string    `json:"karyawan,omitempty"`
	BeratTbs             *float64   `json:"beratTbs,omitempty"`
	JumlahJanjang        *int32     `json:"jumlahJanjang,omitempty"`
	JjgMatang            *int32     `json:"jjgMatang,omitempty"`
	JjgMentah            *int32     `json:"jjgMentah,omitempty"`
	JjgLewatMatang       *int32     `json:"jjgLewatMatang,omitempty"`
	JjgBusukAbnormal     *int32     `json:"jjgBusukAbnormal,omitempty"`
	JjgTangkaiPanjang    *int32     `json:"jjgTangkaiPanjang,omitempty"`
	TotalBrondolan       *float64   `json:"totalBrondolan,omitempty"`
	Notes                *string    `json:"notes,omitempty"`
}

// UpdateMandorHarvestInput for updating harvest via mandor flow.
type UpdateMandorHarvestInput struct {
	ID              string     `json:"id"`
	LocalID         *string    `json:"localId,omitempty"`
	Tanggal         *time.Time `json:"tanggal,omitempty"`
	BlockID         *string    `json:"blockId,omitempty"`
	Karyawan        *string    `json:"karyawan,omitempty"`
	JumlahJanjang   *int32     `json:"jumlahJanjang,omitempty"`
	BeratTbs        *float64   `json:"beratTbs,omitempty"`
	Notes           *string    `json:"notes,omitempty"`
	DeviceID        string     `json:"deviceId"`
	ClientTimestamp time.Time  `json:"clientTimestamp"`
}

// HarvestSyncInput for syncing harvest records.
type HarvestSyncInput struct {
	DeviceID        string                    `json:"deviceId"`
	Records         []*HarvestRecordSyncInput `json:"records"`
	ClientTimestamp time.Time                 `json:"clientTimestamp"`
	BatchID         *string                   `json:"batchId,omitempty"`
}

// HarvestRecordSyncInput for individual sync record.
type HarvestRecordSyncInput struct {
	LocalID              string     `json:"localId"`
	ServerID             *string    `json:"serverId,omitempty"` // Server ID for updates (null for new records)
	Tanggal              time.Time  `json:"tanggal"`
	MandorID             string     `json:"mandorId"`
	AsistenID            *string    `json:"asistenId,omitempty"`
	CompanyID            *string    `json:"companyId,omitempty"`
	EstateID             *string    `json:"estateId,omitempty"`
	DivisionID           *string    `json:"divisionId,omitempty"`
	BlockID              string     `json:"blockId"`
	KaryawanID           string     `json:"karyawanId"`
	Nik                  string     `json:"nik"`
	EmployeeDivisionID   *string    `json:"employeeDivisionId,omitempty"`
	EmployeeDivisionName *string    `json:"employeeDivisionName,omitempty"`
	JumlahJanjang        int32      `json:"jumlahJanjang"`
	BeratTbs             float64    `json:"beratTbs"`
	JjgMatang            *int32     `json:"jjgMatang,omitempty"`
	JjgMentah            *int32     `json:"jjgMentah,omitempty"`
	JjgLewatMatang       *int32     `json:"jjgLewatMatang,omitempty"`
	JjgBusukAbnormal     *int32     `json:"jjgBusukAbnormal,omitempty"`
	JjgTangkaiPanjang    *int32     `json:"jjgTangkaiPanjang,omitempty"`
	TotalBrondolan       *float64   `json:"totalBrondolan,omitempty"`
	Notes                *string    `json:"notes,omitempty"`
	Status               *string    `json:"status,omitempty"`       // PENDING, APPROVED, REJECTED
	LocalVersion         *int32     `json:"localVersion,omitempty"` // For conflict detection
	LastUpdated          *time.Time `json:"lastUpdated,omitempty"`  // Client's last updated timestamp
	Latitude             *float64   `json:"latitude,omitempty"`     // GPS latitude coordinate
	Longitude            *float64   `json:"longitude,omitempty"`    // GPS longitude coordinate
	PhotoURL             *string    `json:"photoUrl,omitempty"`     // Photo URL or path
}

// MandorPhotoSyncInput for syncing photos.
type MandorPhotoSyncInput struct {
	DeviceID        string    `json:"deviceId"`
	PhotoIDs        []string  `json:"photoIds"`
	LocalHarvestID  string    `json:"localHarvestId"`
	ClientTimestamp time.Time `json:"clientTimestamp"`
}

// MandorPhotoSyncResult for photo sync result.
type MandorPhotoSyncResult struct {
	Success      bool     `json:"success"`
	Message      string   `json:"message"`
	UploadedURLs []string `json:"uploadedUrls,omitempty"`
	Errors       []string `json:"errors,omitempty"`
}

// MandorPendingSyncItem for pending sync items.
type MandorPendingSyncItem struct {
	LocalID   string               `json:"localId"`
	ServerID  *string              `json:"serverId,omitempty"`
	Type      string               `json:"type"`
	Operation common.SyncOperation `json:"operation"`
	Status    common.SyncStatus    `json:"status"`
	LastTried *time.Time           `json:"lastTried,omitempty"`
	Error     *string              `json:"error,omitempty"`
}

// HarvestStatusDraft constant if needed
const HarvestStatusDraft HarvestStatus = "DRAFT"

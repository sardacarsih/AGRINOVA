package models

import (
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/master"
	"database/sql/driver"
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// StringArray is a custom type for JSONB array of strings
type StringArray []string

// Value implements driver.Valuer for database serialization
func (s StringArray) Value() (driver.Value, error) {
	if s == nil {
		return "[]", nil
	}
	return json.Marshal(s)
}

// Scan implements sql.Scanner for database deserialization
func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		str, ok := value.(string)
		if !ok {
			*s = []string{}
			return nil
		}
		bytes = []byte(str)
	}

	return json.Unmarshal(bytes, s)
}

// GateCheckRecord represents a gate check entry
type GateCheckRecord struct {
	ID          string         `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	SatpamID    string         `json:"satpam_id" gorm:"type:uuid;not null"`
	Satpam      auth.User      `json:"satpam" gorm:"foreignKey:SatpamID"`
	NomorPolisi string         `json:"nomor_polisi" gorm:"not null"`
	NamaSupir   string         `json:"nama_supir" gorm:"not null"`
	BlockID     *string        `json:"block_id" gorm:"type:uuid"`
	Intent      GateIntent     `json:"intent" gorm:"type:varchar(10);not null"`
	Status      GateStatus     `json:"status" gorm:"type:varchar(20);default:'PENDING'"`
	WaktuMasuk  *time.Time     `json:"waktu_masuk"`
	WaktuKeluar *time.Time     `json:"waktu_keluar"`
	Muatan      *string        `json:"muatan"`
	NomorDo     *string        `json:"nomor_do"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index"`
}

// GateIntent enum
type GateIntent string

const (
	GateEntry GateIntent = "ENTRY"
	GateExit  GateIntent = "EXIT"
)

// GateStatus enum
type GateStatus string

const (
	GatePending   GateStatus = "PENDING"
	GateApproved  GateStatus = "APPROVED"
	GateCompleted GateStatus = "COMPLETED"
)

// Business methods for GateCheckRecord entity

// IsEntry checks if this is an entry record
func (g *GateCheckRecord) IsEntry() bool {
	return g.Intent == GateEntry
}

// IsExit checks if this is an exit record
func (g *GateCheckRecord) IsExit() bool {
	return g.Intent == GateExit
}

// IsPending checks if gate check is pending
func (g *GateCheckRecord) IsPending() bool {
	return g.Status == GatePending
}

// IsCompleted checks if gate check is completed
func (g *GateCheckRecord) IsCompleted() bool {
	return g.Status == GateCompleted
}

// CanBeCompleted checks if gate check can be completed
func (g *GateCheckRecord) CanBeCompleted() bool {
	return g.Status == GateApproved || g.Status == GatePending
}

// MarkEntry marks the entry time
func (g *GateCheckRecord) MarkEntry() {
	if g.Intent == GateEntry {
		now := time.Now()
		g.WaktuMasuk = &now
		g.Status = GateApproved
		g.UpdatedAt = now
	}
}

// MarkExit marks the exit time and completes the record
func (g *GateCheckRecord) MarkExit() {
	if g.Intent == GateExit {
		now := time.Now()
		g.WaktuKeluar = &now
		g.Status = GateCompleted
		g.UpdatedAt = now
	}
}

// Complete completes the gate check record
func (g *GateCheckRecord) Complete() {
	g.Status = GateCompleted
	g.UpdatedAt = time.Now()
}

// GetDuration calculates the duration between entry and exit
func (g *GateCheckRecord) GetDuration() *time.Duration {
	if g.WaktuMasuk != nil && g.WaktuKeluar != nil {
		duration := g.WaktuKeluar.Sub(*g.WaktuMasuk)
		return &duration
	}
	return nil
}

// IsOverstay checks if vehicle has overstayed (more than 8 hours)
func (g *GateCheckRecord) IsOverstay() bool {
	if g.WaktuMasuk != nil && g.Status != GateCompleted {
		duration := time.Since(*g.WaktuMasuk)
		return duration.Hours() > 8
	}
	return false
}

// QRToken represents a JWT-signed QR code for gate check operations
type QRToken struct {
	ID                string           `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	JTI               string           `json:"jti" gorm:"not null;unique;index"`      // JWT ID for validation
	TokenID           string           `json:"token_id" gorm:"not null;unique;index"` // Alternative token identifier
	GenerationIntent  GateIntent       `json:"generation_intent" gorm:"type:varchar(10);not null"`
	AllowedScan       GateIntent       `json:"allowed_scan" gorm:"type:varchar(10);not null"`
	AllowedAction     GateIntent       `json:"allowed_action" gorm:"type:varchar(10);not null"`
	GeneratedDevice   *string          `json:"generated_device" gorm:"type:varchar(255)"`
	ScannedDevice     *string          `json:"scanned_device" gorm:"type:varchar(255)"`
	GenerationDevice  string           `json:"generation_device" gorm:"type:varchar(255);not null"`
	CurrentUsage      int              `json:"current_usage" gorm:"default:0"`
	MaxUsage          int              `json:"max_usage" gorm:"default:1"`
	UsageCount        int              `json:"usage_count" gorm:"default:0"`
	Status            QRTokenStatus    `json:"status" gorm:"type:varchar(20);default:'ACTIVE'"`
	IsUsed            bool             `json:"is_used" gorm:"default:false"`
	ExpiresAt         time.Time        `json:"expires_at" gorm:"not null;index"`
	GeneratedAt       time.Time        `json:"generated_at" gorm:"not null"`
	FirstUsedAt       *time.Time       `json:"first_used_at"`
	LastUsedAt        *time.Time       `json:"last_used_at"`
	GuestLogID        *string          `json:"guest_log_id" gorm:"type:uuid"`
	GeneratedBy       string           `json:"generated_by" gorm:"type:uuid;not null"`
	GeneratedUserID   string           `json:"generated_user_id" gorm:"type:uuid;not null"`
	GeneratedUser     auth.User        `json:"generated_user" gorm:"foreignKey:GeneratedUserID"`
	CompanyID         string           `json:"company_id" gorm:"type:uuid;not null"`
	JWTToken          string           `json:"jwt_token" gorm:"type:text;not null"`
	TokenHash         string           `json:"token_hash" gorm:"type:varchar(128);not null"`
	Intent            GateIntent       `json:"intent" gorm:"type:varchar(10);not null"`
	DeviceFingerprint *string          `json:"device_fingerprint" gorm:"type:text"`
	ValidationMethod  ValidationMethod `json:"validation_method" gorm:"type:varchar(20);default:'QR_SCAN'"`
	UsageHistory      *string          `json:"usage_history" gorm:"type:jsonb"`
	SyncStatus        SyncStatus       `json:"sync_status" gorm:"type:varchar(20);default:'PENDING'"`

	Checkpoints   StringArray   `json:"checkpoints" gorm:"type:jsonb;default:'[]'"`
	Passed        StringArray   `json:"passed" gorm:"type:jsonb;default:'[]'"`
	CurrentStep   int           `json:"current_step" gorm:"default:0"`
	TotalSteps    int           `json:"total_steps" gorm:"default:2"`
	JourneyStatus JourneyStatus `json:"journey_status" gorm:"type:varchar(20);default:'ACTIVE'"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// QRTokenStatus enum
type QRTokenStatus string

const (
	QRTokenActive    QRTokenStatus = "ACTIVE"
	QRTokenUsed      QRTokenStatus = "USED"
	QRTokenExpired   QRTokenStatus = "EXPIRED"
	QRTokenCancelled QRTokenStatus = "CANCELLED"
	QRTokenInvalid   QRTokenStatus = "INVALID"
)

// Business methods for QRToken

// MarkUsed marks the QR token as used by a specific user and device
func (q *QRToken) MarkUsed(userID, deviceID string) {
	now := time.Now()
	q.IsUsed = true
	q.UsageCount++
	q.CurrentUsage++
	q.Status = QRTokenUsed
	q.ScannedDevice = &deviceID

	// Set first usage time if not already set
	if q.FirstUsedAt == nil {
		q.FirstUsedAt = &now
	}
	q.LastUsedAt = &now
	q.UpdatedAt = now

	// Mark for sync
	q.SyncStatus = SyncPending
}

// IsExpired checks if the QR token has expired
func (q *QRToken) IsExpired() bool {
	return time.Now().After(q.ExpiresAt)
}

// CanBeUsed checks if the QR token can still be used
func (q *QRToken) CanBeUsed() bool {
	return !q.IsUsed && !q.IsExpired() && q.Status == QRTokenActive && q.UsageCount < q.MaxUsage
}

// HasReachedMaxUsage checks if the token has reached its maximum usage limit
func (q *QRToken) HasReachedMaxUsage() bool {
	return q.UsageCount >= q.MaxUsage
}

// GuestQRToken is an alias for QRToken to maintain compatibility with the service layer
type GuestQRToken = QRToken

// GuestLog represents a comprehensive guest entry/exit record
type GuestLog struct {
	ID               string           `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	LocalID          *string          `json:"local_id" gorm:"type:varchar(255);index"`
	IDCardNumber     *string          `json:"id_card_number" gorm:"type:varchar(50)"`
	DriverName       string           `json:"driver_name" gorm:"not null"`
	VehiclePlate     string           `json:"vehicle_plate" gorm:"not null"`
	VehicleType      VehicleType      `json:"vehicle_type" gorm:"type:varchar(20);not null"`
	Destination      *string          `json:"destination" gorm:"type:varchar(255)"`
	GatePosition     string           `json:"gate_position" gorm:"type:varchar(50);not null;default:'MAIN_GATE'"`
	EntryTime        *time.Time       `json:"entry_time" gorm:"index"`
	ExitTime         *time.Time       `json:"exit_time"`
	EntryGate        *string          `json:"entry_gate" gorm:"type:varchar(50)"`
	ExitGate         *string          `json:"exit_gate" gorm:"type:varchar(50)"`
	GenerationIntent string           `json:"generation_intent" gorm:"type:varchar(10)"`
	Notes            *string          `json:"notes"`
	QRCodeData       *string          `json:"qr_code_data"`
	AuthorizedUserID string           `json:"authorized_user_id" gorm:"type:uuid;not null"`
	AuthorizedUser   auth.User        `json:"authorized_user" gorm:"foreignKey:AuthorizedUserID"`
	CreatedBy        string           `json:"created_by" gorm:"type:uuid;not null;index"`
	CreatedUser      auth.User        `json:"created_user" gorm:"foreignKey:CreatedBy"`
	CreatedUserID    string           `json:"created_user_id" gorm:"type:uuid"`
	CompanyID        string           `json:"company_id" gorm:"type:uuid;not null"`
	Company          master.Company   `json:"company" gorm:"foreignKey:CompanyID"`
	DeviceID         string           `json:"device_id" gorm:"not null"`
	Latitude         *float64         `json:"latitude"`
	Longitude        *float64         `json:"longitude"`
	QRTokens         []QRToken        `json:"qr_tokens" gorm:"foreignKey:GuestLogID"`
	Photos           []GateCheckPhoto `json:"photos" gorm:"foreignKey:RelatedRecordID"`
	SyncStatus       SyncStatus       `json:"sync_status" gorm:"type:varchar(20);default:'PENDING'"`

	// Cargo fields
	LoadType            *string  `json:"load_type" gorm:"type:varchar(100)"`
	CargoVolume         *string  `json:"cargo_volume" gorm:"type:varchar(50)"`
	CargoOwner          *string  `json:"cargo_owner" gorm:"type:varchar(255)"`
	EstimatedWeight     *float64 `json:"estimated_weight"`
	DeliveryOrderNumber *string  `json:"delivery_order_number" gorm:"type:varchar(255)"`
	SecondCargo         *string  `json:"second_cargo" gorm:"type:varchar(255)"` // Muatan 2nd from Satpam validation

	JourneyStatus      JourneyStatus       `json:"journey_status" gorm:"type:varchar(20);default:'ACTIVE'"`
	RegistrationSource *RegistrationSource `json:"registration_source" gorm:"type:varchar(20)"`
	CheckpointLogs     []CheckpointLog     `json:"checkpoint_logs" gorm:"foreignKey:GuestLogID"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}

// TableName specifies the table name for GuestLog
func (GuestLog) TableName() string {
	return "gate_guest_logs"
}

// GuestLogStatus enum
type GuestLogStatus string

const (
	GuestEntry GuestLogStatus = "ENTRY"
	GuestExit  GuestLogStatus = "EXIT"
)

// VehicleType enum
type VehicleType string

const (
	VehicleCar       VehicleType = "CAR"
	VehicleTruck     VehicleType = "TRUCK"
	VehicleMotorbike VehicleType = "MOTORBIKE"
	VehicleBus       VehicleType = "BUS"
	VehicleOther     VehicleType = "OTHER"
)

// GateCheckPhoto represents photos associated with gate check records
type GateCheckPhoto struct {
	ID                 string       `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	PhotoID            string       `json:"photo_id" gorm:"not null"`
	RelatedRecordType  RecordType   `json:"related_record_type" gorm:"type:varchar(50);not null"`
	RelatedRecordID    string       `json:"related_record_id" gorm:"type:uuid;not null"`
	FilePath           string       `json:"file_path" gorm:"not null"`
	FileName           string       `json:"file_name" gorm:"not null"`
	FileSize           int64        `json:"file_size" gorm:"not null"`
	FileExtension      string       `json:"file_extension" gorm:"not null"`
	MimeType           string       `json:"mime_type" gorm:"not null"`
	PhotoType          PhotoType    `json:"photo_type" gorm:"type:varchar(20);not null"`
	PhotoQuality       PhotoQuality `json:"photo_quality" gorm:"type:varchar(20);not null"`
	CompressionApplied bool         `json:"compression_applied" gorm:"default:false"`
	Latitude           *float64     `json:"latitude"`
	Longitude          *float64     `json:"longitude"`
	TakenAt            time.Time    `json:"taken_at" gorm:"not null"`
	CameraUsed         *string      `json:"camera_used"`
	Description        *string      `json:"description"`
	Metadata           *string      `json:"metadata" gorm:"type:jsonb"`
	CreatedUserID      string       `json:"created_user_id" gorm:"type:uuid;not null"`
	CreatedUser        auth.User    `json:"created_user" gorm:"foreignKey:CreatedUserID"`
	DeviceID           string       `json:"device_id" gorm:"not null"`
	LocalPath          string       `json:"local_path" gorm:"not null"`
	CloudPath          *string      `json:"cloud_path"`
	FileHash           string       `json:"file_hash" gorm:"not null"`
	SyncStatus         SyncStatus   `json:"sync_status" gorm:"type:varchar(20);default:'PENDING'"`
	CreatedAt          time.Time    `json:"created_at"`
	UpdatedAt          time.Time    `json:"updated_at"`
}

// PhotoType enum
type PhotoType string

const (
	PhotoEntry    PhotoType = "ENTRY"
	PhotoExit     PhotoType = "EXIT"
	PhotoVehicle  PhotoType = "VEHICLE"
	PhotoFront    PhotoType = "FRONT"
	PhotoBack     PhotoType = "BACK"
	PhotoDocument PhotoType = "DOCUMENT"
	PhotoGeneral  PhotoType = "GENERAL"
)

// PhotoQuality enum
type PhotoQuality string

const (
	PhotoQualityLow    PhotoQuality = "LOW"
	PhotoQualityMedium PhotoQuality = "MEDIUM"
	PhotoQualityHigh   PhotoQuality = "HIGH"
	PhotoQualityUltra  PhotoQuality = "ULTRA"
)

// RecordType enum
type RecordType string

const (
	RecordTypeGuestLog         RecordType = "GUEST_LOG"
	RecordTypeGateCheckRecord  RecordType = "GATE_CHECK_RECORD"
	RecordTypeQRScan           RecordType = "QR_SCAN"
	RecordTypeSecurityIncident RecordType = "SECURITY_INCIDENT"
	RecordTypeEquipmentCheck   RecordType = "EQUIPMENT_CHECK"
)

// SyncStatus enum
type SyncStatus string

const (
	SyncPending    SyncStatus = "PENDING"
	SyncInProgress SyncStatus = "IN_PROGRESS"
	SyncCompleted  SyncStatus = "COMPLETED"
	SyncFailed     SyncStatus = "FAILED"
)

// JourneyStatus enum for multi-POS journey tracking
type JourneyStatus string

const (
	JourneyActive     JourneyStatus = "ACTIVE"
	JourneyInProgress JourneyStatus = "IN_PROGRESS"
	JourneyCompleted  JourneyStatus = "COMPLETED"
	JourneyExpired    JourneyStatus = "EXPIRED"
	JourneyCancelled  JourneyStatus = "CANCELLED"
)

// RegistrationSource enum for identifying how a guest log was created
type RegistrationSource string

const (
	RegistrationSourceManual RegistrationSource = "MANUAL"
	RegistrationSourceQRScan RegistrationSource = "QR_SCAN"
)

// POSRole enum for checkpoint roles
type POSRole string

const (
	POSRoleEntry      POSRole = "ENTRY"
	POSRoleCheckpoint POSRole = "CHECKPOINT"
	POSRoleExit       POSRole = "EXIT"
)

// CheckpointLog represents a checkpoint scan record in multi-POS journeys
type CheckpointLog struct {
	ID         string     `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	LocalID    string     `json:"local_id" gorm:"not null"`
	GuestLogID *string    `json:"guest_log_id" gorm:"type:uuid"`
	GuestLog   *GuestLog  `json:"guest_log" gorm:"foreignKey:GuestLogID"`
	JTI        string     `json:"jti" gorm:"not null;index"`
	POSID      string     `json:"pos_id" gorm:"type:varchar(50);not null"`
	POSName    *string    `json:"pos_name" gorm:"type:varchar(255)"`
	POSRole    POSRole    `json:"pos_role" gorm:"type:varchar(20);not null"`
	StepNumber int        `json:"step_number" gorm:"not null"`
	ScannedAt  time.Time  `json:"scanned_at" gorm:"not null"`
	ScannedBy  string     `json:"scanned_by" gorm:"type:uuid;not null"`
	Scanner    auth.User  `json:"scanner" gorm:"foreignKey:ScannedBy"`
	DeviceID   string     `json:"device_id" gorm:"type:varchar(255);not null"`
	Latitude   *float64   `json:"latitude"`
	Longitude  *float64   `json:"longitude"`
	SyncStatus SyncStatus `json:"sync_status" gorm:"type:varchar(20);default:'PENDING'"`
	SyncedAt   *time.Time `json:"synced_at"`
	CompanyID  string     `json:"company_id" gorm:"type:uuid;not null"`
	CreatedAt  time.Time  `json:"created_at"`
}

// TableName specifies the table name for CheckpointLog
func (CheckpointLog) TableName() string {
	return "gate_checkpoint_logs"
}

// CheckpointLog business methods

// IsSynced checks if checkpoint log has been synced
func (c *CheckpointLog) IsSynced() bool {
	return c.SyncStatus == SyncCompleted
}

// MarkSynced marks the checkpoint log as synced
func (c *CheckpointLog) MarkSynced() {
	now := time.Now()
	c.SyncStatus = SyncCompleted
	c.SyncedAt = &now
}

// IsEntry checks if this is an entry checkpoint
func (c *CheckpointLog) IsEntry() bool {
	return c.POSRole == POSRoleEntry
}

// IsExit checks if this is an exit checkpoint
func (c *CheckpointLog) IsExit() bool {
	return c.POSRole == POSRoleExit
}

// IsCheckpoint checks if this is a middle checkpoint
func (c *CheckpointLog) IsCheckpoint() bool {
	return c.POSRole == POSRoleCheckpoint
}

// ValidationMethod enum for QR token validation methods
type ValidationMethod string

const (
	ValidationQRScan ValidationMethod = "QR_SCAN"
	ValidationManual ValidationMethod = "MANUAL"
	ValidationBatch  ValidationMethod = "BATCH"
)

// Request/Response models

// CreateGateCheckRequest represents input for creating gate check records
type CreateGateCheckRequest struct {
	SatpamID    string     `json:"satpam_id" validate:"required,uuid"`
	NomorPolisi string     `json:"nomor_polisi" validate:"required,min=5,max=8"`
	NamaSupir   string     `json:"nama_supir" validate:"required,min=2,max=255"`
	BlockID     *string    `json:"block_id,omitempty" validate:"omitempty,uuid"`
	Intent      GateIntent `json:"intent" validate:"required"`
	Muatan      *string    `json:"muatan,omitempty" validate:"omitempty,max=500"`
	NomorDo     *string    `json:"nomor_do,omitempty" validate:"omitempty,max=50"`
}

// UpdateGateCheckRequest represents input for updating gate check records
type UpdateGateCheckRequest struct {
	ID          string  `json:"id" validate:"required,uuid"`
	NomorPolisi *string `json:"nomor_polisi,omitempty" validate:"omitempty,min=5,max=8"`
	NamaSupir   *string `json:"nama_supir,omitempty" validate:"omitempty,min=2,max=255"`
	BlockID     *string `json:"block_id,omitempty" validate:"omitempty,uuid"`
	Muatan      *string `json:"muatan,omitempty" validate:"omitempty,max=500"`
	NomorDo     *string `json:"nomor_do,omitempty" validate:"omitempty,max=50"`
}

// GenerateQRTokenRequest represents input for generating QR tokens
type GenerateQRTokenRequest struct {
	Intent        GateIntent `json:"intent" validate:"required"`
	GuestLogID    *string    `json:"guest_log_id,omitempty" validate:"omitempty,uuid"`
	DeviceID      string     `json:"device_id" validate:"required"`
	ExpiryMinutes int        `json:"expiry_minutes" validate:"min=5,max=1440"` // 5 minutes to 24 hours
	Metadata      *string    `json:"metadata,omitempty"`
}

// UseQRTokenRequest represents input for using QR tokens
type UseQRTokenRequest struct {
	Token     string     `json:"token" validate:"required"`
	Intent    GateIntent `json:"intent" validate:"required"`
	DeviceID  string     `json:"device_id" validate:"required"`
	Latitude  *float64   `json:"latitude,omitempty"`
	Longitude *float64   `json:"longitude,omitempty"`
	Context   *string    `json:"context,omitempty"`
}

// QRTokenUsage represents the result of QR token usage
type QRTokenUsage struct {
	Success  bool      `json:"success"`
	Token    *QRToken  `json:"token,omitempty"`
	GuestLog *GuestLog `json:"guest_log,omitempty"`
	Message  string    `json:"message"`
	Error    *string   `json:"error,omitempty"`
	UsedAt   time.Time `json:"used_at"`
}

// QRTokenValidation represents QR token validation result
type QRTokenValidation struct {
	IsValid           bool         `json:"is_valid"`
	Token             *QRToken     `json:"token,omitempty"`
	Message           string       `json:"message"`
	AllowedOperations []GateIntent `json:"allowed_operations"`
}

// CreateGuestLogRequest represents input for creating guest logs
type CreateGuestLogRequest struct {
	GuestName    string      `json:"guest_name" validate:"required,min=2,max=255"`
	GuestCompany *string     `json:"guest_company,omitempty" validate:"omitempty,max=255"`
	GuestPhone   *string     `json:"guest_phone,omitempty" validate:"omitempty,max=20"`
	DriverName   string      `json:"driver_name" validate:"required,min=2,max=255"`
	VehiclePlate string      `json:"vehicle_plate" validate:"required,min=5,max=8"`
	VehicleType  VehicleType `json:"vehicle_type" validate:"required"`
	GatePosition string      `json:"gate_position" validate:"required,max=50"`
	DeviceID     string      `json:"device_id" validate:"required"`
	Notes        *string     `json:"notes,omitempty" validate:"omitempty,max=1000"`
	QRTokenID    *string     `json:"qr_token_id,omitempty" validate:"omitempty,uuid"`
}

// CompleteGuestVisitRequest represents input for completing guest visits
type CompleteGuestVisitRequest struct {
	GuestLogID string  `json:"guest_log_id" validate:"required,uuid"`
	ExitGate   string  `json:"exit_gate" validate:"required,max=50"`
	DeviceID   string  `json:"device_id" validate:"required"`
	Notes      *string `json:"notes,omitempty" validate:"omitempty,max=1000"`
	QRTokenID  *string `json:"qr_token_id,omitempty" validate:"omitempty,uuid"`
}

// QRTokenQuery represents query parameters for QR tokens
type QRTokenQuery struct {
	DeviceID       *string        `json:"device_id,omitempty"`
	Status         *QRTokenStatus `json:"status,omitempty"`
	Intent         *GateIntent    `json:"intent,omitempty"`
	IncludeExpired bool           `json:"include_expired"`
	Limit          int            `json:"limit" validate:"min=1,max=1000"`
}

// Error types
type GateCheckError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Field   string `json:"field,omitempty"`
}

func (e *GateCheckError) Error() string {
	return e.Message
}

// Error codes
const (
	ErrGateCheckNotFound   = "GATE_CHECK_NOT_FOUND"
	ErrInvalidSatpam       = "INVALID_SATPAM"
	ErrQRTokenNotFound     = "QR_TOKEN_NOT_FOUND"
	ErrQRTokenExpired      = "QR_TOKEN_EXPIRED"
	ErrQRTokenUsed         = "QR_TOKEN_USED"
	ErrInvalidIntent       = "INVALID_INTENT"
	ErrIntentMismatch      = "INTENT_MISMATCH"
	ErrGuestLogNotFound    = "GUEST_LOG_NOT_FOUND"
	ErrGuestAlreadyExited  = "GUEST_ALREADY_EXITED"
	ErrInvalidQRToken      = "INVALID_QR_TOKEN"
	ErrDeviceNotAuthorized = "DEVICE_NOT_AUTHORIZED"
)

func NewGateCheckError(code, message, field string) *GateCheckError {
	return &GateCheckError{
		Code:    code,
		Message: message,
		Field:   field,
	}
}

// Multi-POS Request/Response models

// GenerateMultiPOSQRRequest represents input for generating multi-POS QR codes
type GenerateMultiPOSQRRequest struct {
	GuestName     string      `json:"guest_name" validate:"required,min=2,max=255"`
	VehiclePlate  string      `json:"vehicle_plate" validate:"required,min=5,max=8"`
	Purpose       string      `json:"purpose" validate:"required,min=2,max=500"`
	VehicleType   VehicleType `json:"vehicle_type" validate:"required"`
	Checkpoints   []string    `json:"checkpoints" validate:"dive,max=50"`
	DeviceID      string      `json:"device_id" validate:"required"`
	ExpiryMinutes int         `json:"expiry_minutes" validate:"min=5,max=1440"`
}

// ScanMultiPOSQRInput represents input for scanning QR at a checkpoint
type ScanMultiPOSQRInput struct {
	QRData       string   `json:"qr_data" validate:"required"`
	CurrentPOSID string   `json:"current_pos_id" validate:"required,max=50"`
	DeviceID     string   `json:"device_id" validate:"required"`
	Latitude     *float64 `json:"latitude,omitempty"`
	Longitude    *float64 `json:"longitude,omitempty"`
}

// SyncCheckpointLogRequest represents input for syncing checkpoint logs
type SyncCheckpointLogRequest struct {
	LocalID    string    `json:"local_id" validate:"required"`
	JTI        string    `json:"jti" validate:"required"`
	POSID      string    `json:"pos_id" validate:"required,max=50"`
	POSRole    POSRole   `json:"pos_role" validate:"required"`
	StepNumber int       `json:"step_number" validate:"required,min=1"`
	ScannedAt  time.Time `json:"scanned_at" validate:"required"`
	ScannedBy  string    `json:"scanned_by" validate:"required,uuid"`
	DeviceID   string    `json:"device_id" validate:"required"`
	Latitude   *float64  `json:"latitude,omitempty"`
	Longitude  *float64  `json:"longitude,omitempty"`
}

// MultiPOSScanResult represents the result of scanning QR at a checkpoint
type MultiPOSScanResult struct {
	IsValid           bool     `json:"is_valid"`
	Message           string   `json:"message"`
	GuestName         *string  `json:"guest_name,omitempty"`
	VehiclePlate      *string  `json:"vehicle_plate,omitempty"`
	CurrentPOS        *string  `json:"current_pos,omitempty"`
	POSRole           *POSRole `json:"pos_role,omitempty"`
	StepNumber        *int32   `json:"step_number,omitempty"`
	TotalSteps        *int32   `json:"total_steps,omitempty"`
	NextPOS           *string  `json:"next_pos,omitempty"`
	IsComplete        bool     `json:"is_complete"`
	PassedCheckpoints []string `json:"passed_checkpoints,omitempty"`
	UpdatedQRData     *string  `json:"updated_qr_data,omitempty"`
}

// CheckpointDetail represents a checkpoint scan detail for journey status
type CheckpointDetail struct {
	POSID      string    `json:"pos_id"`
	POSRole    POSRole   `json:"pos_role"`
	StepNumber int       `json:"step_number"`
	ScannedAt  time.Time `json:"scanned_at"`
	DeviceID   string    `json:"device_id"`
}

// JourneyStatusResponse represents the full journey status
type JourneyStatusResponse struct {
	JTI               string             `json:"jti"`
	GuestName         string             `json:"guest_name"`
	VehiclePlate      string             `json:"vehicle_plate"`
	Checkpoints       []string           `json:"checkpoints"`
	PassedCheckpoints []CheckpointDetail `json:"passed_checkpoints"`
	JourneyStatus     JourneyStatus      `json:"journey_status"`
	CurrentStep       int                `json:"current_step"`
	TotalSteps        int                `json:"total_steps"`
	Passed            []string           `json:"passed"`
	StartedAt         *time.Time         `json:"started_at,omitempty"`
	CompletedAt       *time.Time         `json:"completed_at,omitempty"`
	Duration          *int               `json:"duration,omitempty"` // in minutes
}

// GetAllSteps returns all POS steps in order (checkpoints)
func (r *GenerateMultiPOSQRRequest) GetAllSteps() []string {
	return r.Checkpoints
}

// GetTotalSteps returns the total number of steps
func (r *GenerateMultiPOSQRRequest) GetTotalSteps() int {
	return len(r.Checkpoints)
}

// QRToken multi-POS business methods

// GetAllSteps returns all POS steps in order for QRToken
func (q *QRToken) GetAllSteps() []string {
	return q.Checkpoints
}

// GetNextExpectedPOS returns the next expected POS to scan
func (q *QRToken) GetNextExpectedPOS() *string {
	steps := q.GetAllSteps()
	if steps == nil || q.CurrentStep >= len(steps) {
		return nil
	}
	return &steps[q.CurrentStep]
}

// IsJourneyComplete checks if the journey is complete
func (q *QRToken) IsJourneyComplete() bool {
	return q.JourneyStatus == JourneyCompleted || q.CurrentStep >= q.TotalSteps
}

// GetPOSRole returns the role of a POS in this journey
func (q *QRToken) GetPOSRole(posID string) POSRole {
	for _, cp := range q.Checkpoints {
		if cp == posID {
			return POSRoleCheckpoint
		}
	}
	return ""
}

// AdvanceStep advances to the next checkpoint
func (q *QRToken) AdvanceStep(posID string) {
	q.Passed = append(q.Passed, posID)
	q.CurrentStep++
	now := time.Now()
	q.LastUsedAt = &now
	q.UpdatedAt = now

	if q.CurrentStep >= q.TotalSteps {
		q.JourneyStatus = JourneyCompleted
		q.Status = QRTokenUsed
		q.IsUsed = true
	} else {
		q.JourneyStatus = JourneyInProgress
	}
}

// IsPOSInJourney checks if a POS is part of this journey
func (q *QRToken) IsPOSInJourney(posID string) bool {
	steps := q.GetAllSteps()
	for _, s := range steps {
		if s == posID {
			return true
		}
	}
	return false
}

// HasPassedPOS checks if a POS has already been passed
func (q *QRToken) HasPassedPOS(posID string) bool {
	for _, p := range q.Passed {
		if p == posID {
			return true
		}
	}
	return false
}

// Multi-POS error codes
const (
	ErrPOSNotInJourney      = "POS_NOT_IN_JOURNEY"
	ErrWrongSequence        = "WRONG_SEQUENCE"
	ErrAlreadyScanned       = "ALREADY_SCANNED"
	ErrJourneyCompleted     = "JOURNEY_COMPLETED"
	ErrJourneyExpired       = "JOURNEY_EXPIRED"
	ErrInvalidMultiPOSToken = "INVALID_MULTI_POS_TOKEN"
)

package models

import (
	"time"

	"agrinovagraphql/server/internal/graphql/domain/auth"
)

// =============================================================================
// Employee Log Model - Based on EMPLOYEE_ACCESS QR Code format
// =============================================================================

// EmployeeLog represents an employee entry/exit access record
// Input hanya melalui scan QR karyawan dengan format HRIS
type EmployeeLog struct {
	ID        string `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	LogID     string `json:"log_id" gorm:"not null;uniqueIndex"` // Local ID from mobile
	CompanyID string `json:"company_id" gorm:"type:uuid;not null"`

	// Fields dari QR Code EMPLOYEE_ACCESS
	IDData      string `json:"iddata" gorm:"not null"`                     // Format: company_nik
	NIK         string `json:"nik" gorm:"type:varchar(50);not null;index"` // NIK karyawan
	Nama        string `json:"nama" gorm:"not null"`                       // Nama lengkap
	Departement string `json:"departement"`                                // Departemen

	// Gate Check Info
	Action       EmployeeLogAction `json:"action" gorm:"type:varchar(10);not null"` // ENTRY or EXIT
	GatePosition string            `json:"gate_position" gorm:"not null"`

	// Timestamps
	ScannedAt   time.Time `json:"scanned_at" gorm:"not null;index"`
	QRTimestamp int64     `json:"qr_timestamp" gorm:"not null"` // Timestamp from QR code

	// Scan Info
	ScannedByID string    `json:"scanned_by_id" gorm:"type:uuid;not null"`
	ScannedBy   auth.User `json:"scanned_by" gorm:"foreignKey:ScannedByID"`
	DeviceID    string    `json:"device_id" gorm:"not null;index"`

	// Optional
	PhotoPath *string  `json:"photo_path"`
	Notes     *string  `json:"notes"`
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`

	// Sync
	ServerRecordID    *string    `json:"server_record_id" gorm:"type:uuid;index"`
	SyncTransactionID *string    `json:"sync_transaction_id"`
	LocalVersion      int        `json:"local_version" gorm:"default:1"`
	SyncStatus        SyncStatus `json:"sync_status" gorm:"type:varchar(20);default:'PENDING'"`
	SyncedAt          *time.Time `json:"synced_at"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// TableName overrides the table name
func (EmployeeLog) TableName() string {
	return "employee_logs"
}

// EmployeeLogAction enum
type EmployeeLogAction string

const (
	EmployeeActionEntry EmployeeLogAction = "ENTRY"
	EmployeeActionExit  EmployeeLogAction = "EXIT"
)

// EmployeeLogStatus enum
type EmployeeLogStatus string

const (
	EmployeeLogPending  EmployeeLogStatus = "PENDING"
	EmployeeLogSynced   EmployeeLogStatus = "SYNCED"
	EmployeeLogFailed   EmployeeLogStatus = "FAILED"
	EmployeeLogConflict EmployeeLogStatus = "CONFLICT"
)

// =============================================================================
// Business Methods
// =============================================================================

// IsEntry checks if this is an entry record
func (e *EmployeeLog) IsEntry() bool {
	return e.Action == EmployeeActionEntry
}

// IsExit checks if this is an exit record
func (e *EmployeeLog) IsExit() bool {
	return e.Action == EmployeeActionExit
}

// IsSynced checks if the record is synced
func (e *EmployeeLog) IsSynced() bool {
	return e.SyncStatus == SyncCompleted
}

// MarkSynced marks the record as synced
func (e *EmployeeLog) MarkSynced(serverRecordID, transactionID string) {
	now := time.Now()
	e.SyncStatus = SyncCompleted
	e.ServerRecordID = &serverRecordID
	e.SyncTransactionID = &transactionID
	e.SyncedAt = &now
	e.UpdatedAt = now
}

// MarkFailed marks the record as failed to sync
func (e *EmployeeLog) MarkFailed() {
	e.SyncStatus = SyncFailed
	e.UpdatedAt = time.Now()
}

// =============================================================================
// Request/Response Types
// =============================================================================

// EmployeeLogSyncRequest represents input for syncing employee logs
type EmployeeLogSyncRequest struct {
	DeviceID         string                  `json:"device_id" validate:"required"`
	Records          []EmployeeLogSyncRecord `json:"records" validate:"required"`
	ClientTimestamp  time.Time               `json:"client_timestamp" validate:"required"`
	BatchID          string                  `json:"batch_id"`
	ConflictStrategy ResolutionStrategy      `json:"conflict_strategy"`
}

// EmployeeLogSyncRecord represents a single employee log record for sync
type EmployeeLogSyncRecord struct {
	LocalID      string            `json:"local_id" validate:"required"`
	ServerID     *string           `json:"server_id"`
	IDData       string            `json:"iddata"` // HRIS ID
	EmployeeID   string            `json:"employee_id" validate:"required"`
	NIK          string            `json:"nik" validate:"required"`
	EmployeeName string            `json:"employee_name" validate:"required"`
	Department   string            `json:"department" validate:"required"`
	Action       EmployeeLogAction `json:"action" validate:"required"`
	GatePosition string            `json:"gate_position" validate:"required"`
	Timestamp    time.Time         `json:"timestamp" validate:"required"`
	ScannedAt    time.Time         `json:"scanned_at" validate:"required"`
	QRData       *string           `json:"qr_data"`
	Notes        *string           `json:"notes"`
	Latitude     *float64          `json:"latitude"`
	Longitude    *float64          `json:"longitude"`
	PhotoPath    *string           `json:"photo_path"`
	LocalVersion int               `json:"local_version"`
	LastUpdated  time.Time         `json:"last_updated"`
}

// EmployeeLogSyncResult represents the result of syncing employee logs
type EmployeeLogSyncResult struct {
	Success           bool      `json:"success"`
	RecordsProcessed  int       `json:"records_processed"`
	RecordsSynced     int       `json:"records_synced"`
	ConflictsDetected int       `json:"conflicts_detected"`
	TransactionID     string    `json:"transaction_id"`
	Message           string    `json:"message"`
	Errors            []string  `json:"errors"`
	SyncedAt          time.Time `json:"synced_at"`
}

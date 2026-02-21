package models

import (
	"time"

	"gorm.io/gorm"
)

// SyncPriority enum
type SyncPriority string

const (
	PriorityHigh   SyncPriority = "HIGH"
	PriorityMedium SyncPriority = "MEDIUM"
	PriorityLow    SyncPriority = "LOW"
)

// ConflictType enum
type ConflictType string

const (
	ConflictDataMismatch ConflictType = "DATA_MISMATCH"
	ConflictTimestamp    ConflictType = "TIMESTAMP_CONFLICT"
	ConflictDuplicate    ConflictType = "DUPLICATE_ENTRY"
	ConflictDependency   ConflictType = "DEPENDENCY_MISSING"
)

// ConflictPriority enum
type ConflictPriority string

// ConflictStatus enum
type ConflictStatus string

const (
	ConflictPending  ConflictStatus = "PENDING"
	ConflictResolved ConflictStatus = "RESOLVED"
	ConflictIgnored  ConflictStatus = "IGNORED"
)

// ResolutionStrategy enum
type ResolutionStrategy string

const (
	ResolutionManual     ResolutionStrategy = "MANUAL"
	ResolutionServerWins ResolutionStrategy = "SERVER_WINS"
	ResolutionClientWins ResolutionStrategy = "CLIENT_WINS"
	ResolutionMerge      ResolutionStrategy = "MERGE"
)

// SyncQueueStatus enum
type SyncQueueStatus string

const (
	SyncQueuePending    SyncQueueStatus = "PENDING"
	SyncQueueProcessing SyncQueueStatus = "PROCESSING"
	SyncQueueCompleted  SyncQueueStatus = "COMPLETED"
	SyncQueueFailed     SyncQueueStatus = "FAILED"
)

// SyncQueue represents a queued synchronization item
type SyncQueue struct {
	ID             string            `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID         string            `json:"user_id" gorm:"type:uuid;not null;index"`
	DeviceID       string            `json:"device_id" gorm:"not null;index"`
	EntityType     string            `json:"entity_type" gorm:"not null"`
	EntityID       string            `json:"entity_id" gorm:"not null"`
	Operation      string            `json:"operation" gorm:"not null"` // CREATE, UPDATE, DELETE, BATCH
	Payload        string            `json:"payload" gorm:"type:jsonb"`
	Priority       SyncPriority      `json:"priority" gorm:"default:'MEDIUM'"`
	Status         SyncQueueStatus   `json:"status" gorm:"default:'PENDING'"`
	RetryCount     int               `json:"retry_count" gorm:"default:0"`
	Attempts       int               `json:"attempts" gorm:"default:0"`
	MaxAttempts    int               `json:"max_attempts" gorm:"default:3"`
	RetryDelayBase int               `json:"retry_delay_base" gorm:"default:1000"` // Base delay in ms
	ErrorMessage   *string           `json:"error_message"`
	ResultStatus   *SyncResultStatus `json:"result_status"`
	LastAttemptAt  *time.Time        `json:"last_attempt_at"`
	NextAttemptAt  *time.Time        `json:"next_attempt_at"`
	ProcessedAt    *time.Time        `json:"processed_at"`
	CompletedAt    *time.Time        `json:"completed_at"`
	CreatedAt      time.Time         `json:"created_at"`
	UpdatedAt      time.Time         `json:"updated_at"`
}

// SyncConflict represents a synchronization conflict
type SyncConflict struct {
	ID           string              `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	SyncQueueID  string              `json:"sync_queue_id" gorm:"type:uuid;not null"`
	EntityType   string              `json:"entity_type" gorm:"not null"`
	EntityID     string              `json:"entity_id" gorm:"not null"`
	ConflictType ConflictType        `json:"conflict_type" gorm:"not null"`
	ServerData   string              `json:"server_data" gorm:"type:jsonb"`
	ClientData   string              `json:"client_data" gorm:"type:jsonb"`
	Status       ConflictStatus      `json:"status" gorm:"default:'PENDING'"`
	Resolution   *ResolutionStrategy `json:"resolution"`
	ResolvedBy   *string             `json:"resolved_by" gorm:"type:uuid"`
	ResolvedAt   *time.Time          `json:"resolved_at"`
	CreatedAt    time.Time           `json:"created_at"`
	UpdatedAt    time.Time           `json:"updated_at"`
	DeletedAt    gorm.DeletedAt      `gorm:"index"`
}

// Sync Action constants
const (
	SyncCreate = "CREATE"
	SyncUpdate = "UPDATE"
	SyncDelete = "DELETE"
	SyncBatch  = "BATCH"
)

// SyncResultStatus enum
type SyncResultStatus string

const (
	ResultSuccess SyncResultStatus = "SUCCESS"
	ResultFailed  SyncResultStatus = "FAILED"
)

// SyncTransaction represents a sync transaction
type SyncTransaction struct {
	ID        string           `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID    string           `json:"user_id" gorm:"type:uuid;not null"`
	DeviceID  string           `json:"device_id" gorm:"not null"`
	Status    SyncResultStatus `json:"status" gorm:"type:varchar(20)"`
	StartedAt time.Time        `json:"started_at"`
	EndedAt   *time.Time       `json:"ended_at"`
}

const (
	SyncTransactionCompleted = "COMPLETED"
)

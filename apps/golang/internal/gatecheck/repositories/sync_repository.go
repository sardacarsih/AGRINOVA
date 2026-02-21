package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"agrinovagraphql/server/internal/gatecheck/models"
)

// =============================================================================
// Repository Interfaces - For dependency injection and testability
// =============================================================================

// SyncRepository defines the interface for sync operations
type SyncRepository interface {
	// Guest Log operations
	CreateGuestLog(ctx context.Context, guestLog *models.GuestLog) error
	UpdateGuestLog(ctx context.Context, id string, updates map[string]interface{}) error
	GetGuestLogByLocalID(ctx context.Context, localID string) (*models.GuestLog, error)
	GetGuestLogByID(ctx context.Context, id string) (*models.GuestLog, error)
	GetPendingSyncGuestLogs(ctx context.Context, deviceID string, limit int) ([]*models.GuestLog, error)
	BatchUpsertGuestLogs(ctx context.Context, logs []models.GuestLog) (int, error)

	// Employee Log operations
	CreateEmployeeLog(ctx context.Context, log *models.EmployeeLog) error
	UpdateEmployeeLog(ctx context.Context, id string, updates map[string]interface{}) error
	GetEmployeeLogByLocalID(ctx context.Context, localID string) (*models.EmployeeLog, error)
	GetEmployeeLogByID(ctx context.Context, id string) (*models.EmployeeLog, error)
	GetPendingSyncEmployeeLogs(ctx context.Context, deviceID string, limit int) ([]*models.EmployeeLog, error)
	BatchUpsertEmployeeLogs(ctx context.Context, logs []models.EmployeeLog) (int, error)

	// QR Token operations
	CreateQRToken(ctx context.Context, token *models.QRToken) error
	UpdateQRToken(ctx context.Context, id string, updates map[string]interface{}) error
	GetQRTokenByJTI(ctx context.Context, jti string) (*models.QRToken, error)
	BatchUpsertQRTokens(ctx context.Context, tokens []models.QRToken) (int, error)

	// Photo operations
	CreatePhoto(ctx context.Context, photo *models.GateCheckPhoto) error
	BatchCreatePhotos(ctx context.Context, photos []models.GateCheckPhoto) (int, error)
	GetPhotosByRecordID(ctx context.Context, recordID string) ([]*models.GateCheckPhoto, error)

	// Sync Queue operations
	EnqueueSync(ctx context.Context, item *models.SyncQueue) error
	DequeueSync(ctx context.Context, limit int) ([]*models.SyncQueue, error)
	UpdateSyncQueueStatus(ctx context.Context, id string, status models.SyncQueueStatus, errorMsg *string) error

	// Conflict operations
	CreateConflict(ctx context.Context, conflict *models.SyncConflict) error
	GetPendingConflicts(ctx context.Context, limit int) ([]*models.SyncConflict, error)
	ResolveConflict(ctx context.Context, id string, resolution models.ResolutionStrategy, resolvedBy string) error

	// Transaction operations
	CreateSyncTransaction(ctx context.Context, tx *models.SyncTransaction) error
	CompleteSyncTransaction(ctx context.Context, id string, status models.SyncResultStatus) error
	WithTransaction(ctx context.Context, fn func(repo SyncRepository) error) error
}

// =============================================================================
// Repository Implementation
// =============================================================================

// syncRepository implements SyncRepository interface
type syncRepository struct {
	db *gorm.DB
}

// NewSyncRepository creates a new sync repository
func NewSyncRepository(db *gorm.DB) SyncRepository {
	return &syncRepository{db: db}
}

// =============================================================================
// Guest Log Operations
// =============================================================================

// CreateGuestLog creates a new guest log record
func (r *syncRepository) CreateGuestLog(ctx context.Context, guestLog *models.GuestLog) error {
	if guestLog.ID == "" {
		guestLog.ID = uuid.New().String()
	}
	guestLog.CreatedAt = time.Now()
	guestLog.UpdatedAt = time.Now()

	return r.db.WithContext(ctx).Create(guestLog).Error
}

// UpdateGuestLog updates an existing guest log
func (r *syncRepository) UpdateGuestLog(ctx context.Context, id string, updates map[string]interface{}) error {
	updates["updated_at"] = time.Now()
	return r.db.WithContext(ctx).Model(&models.GuestLog{}).Where("id = ?", id).Updates(updates).Error
}

// GetGuestLogByLocalID retrieves a guest log by local ID (from mobile device)
func (r *syncRepository) GetGuestLogByLocalID(ctx context.Context, localID string) (*models.GuestLog, error) {
	var guestLog models.GuestLog
	err := r.db.WithContext(ctx).
		Where("local_id = ?", localID).
		First(&guestLog).Error
	if err != nil {
		return nil, err
	}
	return &guestLog, nil
}

// GetGuestLogByID retrieves a guest log by server ID
func (r *syncRepository) GetGuestLogByID(ctx context.Context, id string) (*models.GuestLog, error) {
	var guestLog models.GuestLog
	err := r.db.WithContext(ctx).
		Preload("QRTokens").
		Preload("Photos").
		Where("id = ?", id).
		First(&guestLog).Error
	if err != nil {
		return nil, err
	}
	return &guestLog, nil
}

// GetPendingSyncGuestLogs retrieves guest logs pending sync for a device
func (r *syncRepository) GetPendingSyncGuestLogs(ctx context.Context, deviceID string, limit int) ([]*models.GuestLog, error) {
	var logs []*models.GuestLog
	err := r.db.WithContext(ctx).
		Where("device_id = ? AND sync_status IN ?", deviceID, []string{"PENDING", "FAILED"}).
		Order("created_at ASC").
		Limit(limit).
		Find(&logs).Error
	return logs, err
}

// BatchUpsertGuestLogs performs batch upsert of guest logs
func (r *syncRepository) BatchUpsertGuestLogs(ctx context.Context, logs []models.GuestLog) (int, error) {
	if len(logs) == 0 {
		return 0, nil
	}

	processed := 0
	for i := range logs {
		logs[i].UpdatedAt = time.Now()
		if logs[i].ID == "" {
			logs[i].ID = uuid.New().String()
			logs[i].CreatedAt = time.Now()
		}

		// Upsert using ON CONFLICT - use LocalID as the unique identifier from mobile
		var localIDValue string
		if logs[i].LocalID != nil {
			localIDValue = *logs[i].LocalID
		}
		result := r.db.WithContext(ctx).
			Where("local_id = ?", localIDValue).
			Assign(logs[i]).
			FirstOrCreate(&logs[i])

		if result.Error != nil {
			return processed, result.Error
		}
		processed++
	}

	return processed, nil
}

// =============================================================================
// Employee Log Operations
// =============================================================================

// CreateEmployeeLog creates a new employee log record
func (r *syncRepository) CreateEmployeeLog(ctx context.Context, log *models.EmployeeLog) error {
	if log.ID == "" {
		log.ID = uuid.New().String()
	}
	log.CreatedAt = time.Now()
	log.UpdatedAt = time.Now()

	return r.db.WithContext(ctx).Create(log).Error
}

// UpdateEmployeeLog updates an existing employee log
func (r *syncRepository) UpdateEmployeeLog(ctx context.Context, id string, updates map[string]interface{}) error {
	updates["updated_at"] = time.Now()
	return r.db.WithContext(ctx).Model(&models.EmployeeLog{}).Where("id = ?", id).Updates(updates).Error
}

// GetEmployeeLogByLogID retrieves an employee log by log ID
func (r *syncRepository) GetEmployeeLogByLocalID(ctx context.Context, logID string) (*models.EmployeeLog, error) {
	var log models.EmployeeLog
	err := r.db.WithContext(ctx).
		Where("log_id = ?", logID).
		First(&log).Error
	if err != nil {
		return nil, err
	}
	return &log, nil
}

// GetEmployeeLogByID retrieves an employee log by server ID
func (r *syncRepository) GetEmployeeLogByID(ctx context.Context, id string) (*models.EmployeeLog, error) {
	var log models.EmployeeLog
	err := r.db.WithContext(ctx).
		Where("id = ?", id).
		First(&log).Error
	if err != nil {
		return nil, err
	}
	return &log, nil
}

// GetPendingSyncEmployeeLogs retrieves employee logs pending sync for a device
func (r *syncRepository) GetPendingSyncEmployeeLogs(ctx context.Context, deviceID string, limit int) ([]*models.EmployeeLog, error) {
	var logs []*models.EmployeeLog
	err := r.db.WithContext(ctx).
		Where("device_id = ? AND sync_status IN ?", deviceID, []string{"PENDING", "FAILED"}).
		Order("created_at ASC").
		Limit(limit).
		Find(&logs).Error
	return logs, err
}

// BatchUpsertEmployeeLogs performs batch upsert of employee logs
func (r *syncRepository) BatchUpsertEmployeeLogs(ctx context.Context, logs []models.EmployeeLog) (int, error) {
	if len(logs) == 0 {
		return 0, nil
	}

	processed := 0
	for i := range logs {
		logs[i].UpdatedAt = time.Now()
		if logs[i].ID == "" {
			logs[i].ID = uuid.New().String()
			logs[i].CreatedAt = time.Now()
		}

		// Upsert using log_id as unique identifier
		result := r.db.WithContext(ctx).
			Where("log_id = ?", logs[i].LogID).
			Assign(logs[i]).
			FirstOrCreate(&logs[i])

		if result.Error != nil {
			return processed, result.Error
		}
		processed++
	}

	return processed, nil
}

// =============================================================================
// QR Token Operations
// =============================================================================

// CreateQRToken creates a new QR token
func (r *syncRepository) CreateQRToken(ctx context.Context, token *models.QRToken) error {
	if token.ID == "" {
		token.ID = uuid.New().String()
	}
	token.CreatedAt = time.Now()
	token.UpdatedAt = time.Now()

	return r.db.WithContext(ctx).Create(token).Error
}

// UpdateQRToken updates an existing QR token
func (r *syncRepository) UpdateQRToken(ctx context.Context, id string, updates map[string]interface{}) error {
	updates["updated_at"] = time.Now()
	return r.db.WithContext(ctx).Model(&models.QRToken{}).Where("id = ?", id).Updates(updates).Error
}

// GetQRTokenByJTI retrieves a QR token by JWT ID
func (r *syncRepository) GetQRTokenByJTI(ctx context.Context, jti string) (*models.QRToken, error) {
	var token models.QRToken
	err := r.db.WithContext(ctx).Where("jti = ?", jti).First(&token).Error
	if err != nil {
		return nil, err
	}
	return &token, nil
}

// BatchUpsertQRTokens performs batch upsert of QR tokens
func (r *syncRepository) BatchUpsertQRTokens(ctx context.Context, tokens []models.QRToken) (int, error) {
	if len(tokens) == 0 {
		return 0, nil
	}

	processed := 0
	for i := range tokens {
		tokens[i].UpdatedAt = time.Now()
		if tokens[i].ID == "" {
			tokens[i].ID = uuid.New().String()
			tokens[i].CreatedAt = time.Now()
		}

		result := r.db.WithContext(ctx).
			Where("jti = ?", tokens[i].JTI).
			Assign(tokens[i]).
			FirstOrCreate(&tokens[i])

		if result.Error != nil {
			return processed, result.Error
		}
		processed++
	}

	return processed, nil
}

// =============================================================================
// Photo Operations
// =============================================================================

// CreatePhoto creates a new photo record
func (r *syncRepository) CreatePhoto(ctx context.Context, photo *models.GateCheckPhoto) error {
	if photo.ID == "" {
		photo.ID = uuid.New().String()
	}
	photo.CreatedAt = time.Now()
	photo.UpdatedAt = time.Now()

	return r.db.WithContext(ctx).Create(photo).Error
}

// BatchCreatePhotos creates multiple photos in batch
func (r *syncRepository) BatchCreatePhotos(ctx context.Context, photos []models.GateCheckPhoto) (int, error) {
	if len(photos) == 0 {
		return 0, nil
	}

	now := time.Now()
	for i := range photos {
		if photos[i].ID == "" {
			photos[i].ID = uuid.New().String()
		}
		photos[i].CreatedAt = now
		photos[i].UpdatedAt = now
	}

	result := r.db.WithContext(ctx).Create(&photos)
	return int(result.RowsAffected), result.Error
}

// GetPhotosByRecordID retrieves photos by related record ID
func (r *syncRepository) GetPhotosByRecordID(ctx context.Context, recordID string) ([]*models.GateCheckPhoto, error) {
	var photos []*models.GateCheckPhoto
	err := r.db.WithContext(ctx).
		Where("related_record_id = ?", recordID).
		Find(&photos).Error
	return photos, err
}

// =============================================================================
// Sync Queue Operations
// =============================================================================

// EnqueueSync adds an item to the sync queue
func (r *syncRepository) EnqueueSync(ctx context.Context, item *models.SyncQueue) error {
	if item.ID == "" {
		item.ID = uuid.New().String()
	}
	item.Status = models.SyncQueuePending
	item.CreatedAt = time.Now()
	item.UpdatedAt = time.Now()

	return r.db.WithContext(ctx).Create(item).Error
}

// DequeueSync retrieves items from sync queue for processing
func (r *syncRepository) DequeueSync(ctx context.Context, limit int) ([]*models.SyncQueue, error) {
	var items []*models.SyncQueue

	err := r.db.WithContext(ctx).
		Where("status = ? AND (next_attempt_at IS NULL OR next_attempt_at <= ?)",
			models.SyncQueuePending, time.Now()).
		Order("priority DESC, created_at ASC").
		Limit(limit).
		Find(&items).Error

	if err != nil {
		return nil, err
	}

	// Mark items as processing
	for _, item := range items {
		now := time.Now()
		item.Status = models.SyncQueueProcessing
		item.LastAttemptAt = &now
		item.Attempts++
		r.db.WithContext(ctx).Save(item)
	}

	return items, nil
}

// UpdateSyncQueueStatus updates the status of a sync queue item
func (r *syncRepository) UpdateSyncQueueStatus(ctx context.Context, id string, status models.SyncQueueStatus, errorMsg *string) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}

	if errorMsg != nil {
		updates["error_message"] = *errorMsg
	}

	if status == models.SyncQueueCompleted {
		now := time.Now()
		updates["completed_at"] = now
		updates["processed_at"] = now
	} else if status == models.SyncQueueFailed {
		// Calculate next retry time with exponential backoff
		var item models.SyncQueue
		if err := r.db.WithContext(ctx).Where("id = ?", id).First(&item).Error; err == nil {
			if item.Attempts < item.MaxAttempts {
				delay := time.Duration(item.RetryDelayBase*(1<<item.Attempts)) * time.Millisecond
				nextAttempt := time.Now().Add(delay)
				updates["next_attempt_at"] = nextAttempt
				updates["status"] = models.SyncQueuePending // Reset to pending for retry
			}
		}
	}

	return r.db.WithContext(ctx).Model(&models.SyncQueue{}).Where("id = ?", id).Updates(updates).Error
}

// =============================================================================
// Conflict Operations
// =============================================================================

// CreateConflict creates a new sync conflict record
func (r *syncRepository) CreateConflict(ctx context.Context, conflict *models.SyncConflict) error {
	if conflict.ID == "" {
		conflict.ID = uuid.New().String()
	}
	conflict.Status = models.ConflictPending
	conflict.CreatedAt = time.Now()
	conflict.UpdatedAt = time.Now()

	return r.db.WithContext(ctx).Create(conflict).Error
}

// GetPendingConflicts retrieves pending conflicts
func (r *syncRepository) GetPendingConflicts(ctx context.Context, limit int) ([]*models.SyncConflict, error) {
	var conflicts []*models.SyncConflict
	err := r.db.WithContext(ctx).
		Where("status = ?", models.ConflictPending).
		Order("created_at ASC").
		Limit(limit).
		Find(&conflicts).Error
	return conflicts, err
}

// ResolveConflict marks a conflict as resolved
func (r *syncRepository) ResolveConflict(ctx context.Context, id string, resolution models.ResolutionStrategy, resolvedBy string) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&models.SyncConflict{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":      models.ConflictResolved,
			"resolution":  resolution,
			"resolved_by": resolvedBy,
			"resolved_at": now,
			"updated_at":  now,
		}).Error
}

// =============================================================================
// Transaction Operations
// =============================================================================

// CreateSyncTransaction creates a new sync transaction
func (r *syncRepository) CreateSyncTransaction(ctx context.Context, tx *models.SyncTransaction) error {
	if tx.ID == "" {
		tx.ID = uuid.New().String()
	}
	tx.StartedAt = time.Now()
	return r.db.WithContext(ctx).Create(tx).Error
}

// CompleteSyncTransaction marks a sync transaction as complete
func (r *syncRepository) CompleteSyncTransaction(ctx context.Context, id string, status models.SyncResultStatus) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&models.SyncTransaction{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":   status,
			"ended_at": now,
		}).Error
}

// WithTransaction executes a function within a database transaction
func (r *syncRepository) WithTransaction(ctx context.Context, fn func(repo SyncRepository) error) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		txRepo := &syncRepository{db: tx}
		return fn(txRepo)
	})
}

// =============================================================================
// Helper Functions
// =============================================================================

// ConvertToJSON converts any object to JSON string
func ConvertToJSON(data interface{}) (string, error) {
	bytes, err := json.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("failed to marshal data: %w", err)
	}
	return string(bytes), nil
}

// ParseFromJSON parses JSON string to target object
func ParseFromJSON(jsonStr string, target interface{}) error {
	return json.Unmarshal([]byte(jsonStr), target)
}

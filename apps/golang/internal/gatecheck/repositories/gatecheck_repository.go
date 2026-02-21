package repositories

import (
	"context"
	"time"

	"gorm.io/gorm"

	"agrinovagraphql/server/internal/gatecheck/models"
	"agrinovagraphql/server/internal/graphql/domain/auth"
)

type GateCheckRepository struct {
	db *gorm.DB
}

func NewGateCheckRepository(db *gorm.DB) *GateCheckRepository {
	return &GateCheckRepository{db: db}
}

// CreateGateCheck creates a new gate check record
func (r *GateCheckRepository) CreateGateCheck(ctx context.Context, record *models.GateCheckRecord) error {
	return r.db.WithContext(ctx).Create(record).Error
}

// GetGateCheckByID retrieves a gate check record by ID
func (r *GateCheckRepository) GetGateCheckByID(ctx context.Context, id string) (*models.GateCheckRecord, error) {
	var record models.GateCheckRecord
	err := r.db.WithContext(ctx).
		Preload("Satpam").
		Where("id = ?", id).
		First(&record).Error

	if err != nil {
		return nil, err
	}
	return &record, nil
}

// GetGateCheckRecords retrieves all gate check records
func (r *GateCheckRepository) GetGateCheckRecords(ctx context.Context) ([]*models.GateCheckRecord, error) {
	var records []*models.GateCheckRecord
	err := r.db.WithContext(ctx).
		Preload("Satpam").
		Order("created_at DESC").
		Find(&records).Error

	return records, err
}

// GetGateCheckRecordsByStatus retrieves gate check records by status
func (r *GateCheckRepository) GetGateCheckRecordsByStatus(ctx context.Context, status models.GateStatus) ([]*models.GateCheckRecord, error) {
	var records []*models.GateCheckRecord
	err := r.db.WithContext(ctx).
		Preload("Satpam").
		Where("status = ?", status).
		Order("created_at DESC").
		Find(&records).Error

	return records, err
}

// UpdateGateCheck updates an existing gate check record
func (r *GateCheckRepository) UpdateGateCheck(ctx context.Context, id string, updates map[string]interface{}) (*models.GateCheckRecord, error) {
	var record models.GateCheckRecord

	// Start transaction
	tx := r.db.WithContext(ctx).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update the record
	err := tx.Model(&record).Where("id = ?", id).Updates(updates).Error
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	// Fetch updated record with associations
	err = tx.Preload("Satpam").
		Where("id = ?", id).
		First(&record).Error

	if err != nil {
		tx.Rollback()
		return nil, err
	}

	return &record, tx.Commit().Error
}

// CompleteGateCheck completes a gate check record
func (r *GateCheckRepository) CompleteGateCheck(ctx context.Context, id string) (*models.GateCheckRecord, error) {
	updates := map[string]interface{}{
		"status": models.GateCompleted,
	}

	return r.UpdateGateCheck(ctx, id, updates)
}

// DeleteGateCheck soft deletes a gate check record
func (r *GateCheckRepository) DeleteGateCheck(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.GateCheckRecord{}).Error
}

// ValidateGateCheck validates business rules for gate check
func (r *GateCheckRepository) ValidateGateCheck(ctx context.Context, record *models.GateCheckRecord) error {
	// Check if satpam exists and has correct role
	var satpam auth.User
	err := r.db.WithContext(ctx).Where("id = ? AND role = ? AND is_active = true",
		record.SatpamID, auth.UserRoleSatpam).First(&satpam).Error
	if err != nil {
		return err
	}

	return nil
}

// GetQRTokens retrieves QR tokens based on query filters
func (r *GateCheckRepository) GetQRTokens(ctx context.Context, query models.QRTokenQuery) ([]*models.QRToken, error) {
	var tokens []*models.QRToken
	db := r.db.WithContext(ctx)

	if query.DeviceID != nil {
		db = db.Where("generated_device = ? OR scanned_device = ?", *query.DeviceID, *query.DeviceID)
	}

	if query.Status != nil {
		db = db.Where("status = ?", *query.Status)
	}

	if query.Intent != nil {
		db = db.Where("intent = ?", *query.Intent)
	}

	if !query.IncludeExpired {
		db = db.Where("expires_at > ?", time.Now())
	}

	if query.Limit > 0 {
		db = db.Limit(query.Limit)
	} else {
		db = db.Limit(50)
	}

	err := db.Order("created_at DESC").Find(&tokens).Error
	return tokens, err
}

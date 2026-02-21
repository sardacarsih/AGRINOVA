package repositories

import (
	"context"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/mandor"
	"agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/internal/panen/models"
)

type PanenRepository struct {
	db *gorm.DB
}

func NewPanenRepository(db *gorm.DB) *PanenRepository {
	return &PanenRepository{db: db}
}

// CreateHarvestRecord creates a new harvest record
func (r *PanenRepository) CreateHarvestRecord(ctx context.Context, record *mandor.HarvestRecord) error {
	payload := map[string]interface{}{
		"id":                     record.ID,
		"local_id":               record.LocalID,
		"device_id":              record.DeviceID,
		"tanggal":                record.Tanggal,
		"mandor_id":              record.MandorID,
		"asisten_id":             record.AsistenID,
		"company_id":             record.CompanyID,
		"estate_id":              record.EstateID,
		"division_id":            record.DivisionID,
		"block_id":               record.BlockID,
		"karyawan_id":            record.KaryawanID,
		"employee_division_id":   record.EmployeeDivisionID,
		"employee_division_name": record.EmployeeDivisionName,
		"nik":                    record.Nik,
		"karyawan":               record.Karyawan,
		"berat_tbs":              record.BeratTbs,
		"jumlah_janjang":         record.JumlahJanjang,
		"jjg_matang":             record.JjgMatang,
		"jjg_mentah":             record.JjgMentah,
		"jjg_lewat_matang":       record.JjgLewatMatang,
		"jjg_busuk_abnormal":     record.JjgBusukAbnormal,
		"jjg_tangkai_panjang":    record.JjgTangkaiPanjang,
		"total_brondolan":        record.TotalBrondolan,
		"status":                 record.Status,
		"approved_by":            record.ApprovedBy,
		"approved_at":            record.ApprovedAt,
		"rejected_reason":        record.RejectedReason,
		"notes":                  record.Notes,
		"latitude":               record.Latitude,
		"longitude":              record.Longitude,
		"photo_url":              record.PhotoURL,
		"created_at":             record.CreatedAt,
		"updated_at":             record.UpdatedAt,
	}

	filteredPayload, err := r.filterHarvestRecordColumns(ctx, payload)
	if err != nil {
		return err
	}
	if len(filteredPayload) == 0 {
		return fmt.Errorf("no compatible columns found for harvest_records insert")
	}

	return r.db.WithContext(ctx).Table("harvest_records").Create(filteredPayload).Error
}

// GetHarvestRecordByID retrieves a harvest record by ID with associations
func (r *PanenRepository) GetHarvestRecordByID(ctx context.Context, id string) (*mandor.HarvestRecord, error) {
	var record mandor.HarvestRecord
	err := r.db.WithContext(ctx).
		Preload("Mandor").
		Preload("Block").
		Preload("Block.Division").
		Preload("Block.Division.Estate").
		Preload("Block.Division.Estate.Company").
		Where("id = ?", id).
		First(&record).Error

	if err != nil {
		return nil, err
	}
	return &record, nil
}

// GetByLocalID retrieves a harvest record by local ID and mandor ID
func (r *PanenRepository) GetByLocalID(ctx context.Context, localID, mandorID string) (*models.HarvestRecord, error) {
	var record models.HarvestRecord
	err := r.db.WithContext(ctx).
		Preload("Mandor").
		Preload("Block").
		Preload("Block.Division").
		Preload("Block.Division.Estate").
		Preload("Block.Division.Estate.Company").
		Where("local_id = ? AND mandor_id = ?", localID, mandorID).
		First(&record).Error

	if err != nil {
		return nil, err
	}
	return &record, nil
}

// GetHarvestRecords retrieves harvest records with optional filters
func (r *PanenRepository) GetHarvestRecords(ctx context.Context, filters *models.HarvestFilters) ([]*mandor.HarvestRecord, error) {
	query := r.db.WithContext(ctx).
		Preload("Mandor").
		Preload("Block").
		Preload("Block.Division").
		Preload("Block.Division.Estate").
		Preload("Block.Division.Estate.Company")

	// Apply filters
	query = r.applyHarvestFilters(query, filters)
	query = r.applyEmployeeWorkerNameJoin(query)

	var records []*mandor.HarvestRecord
	err := query.Find(&records).Error
	return records, err
}

// GetHarvestRecordsByStatus retrieves harvest records filtered by status
func (r *PanenRepository) GetHarvestRecordsByStatus(ctx context.Context, status mandor.HarvestStatus) ([]*mandor.HarvestRecord, error) {
	var records []*mandor.HarvestRecord
	query := r.db.WithContext(ctx).
		Preload("Mandor").
		Preload("Block").
		Preload("Block.Division").
		Preload("Block.Division.Estate").
		Preload("Block.Division.Estate.Company").
		Where("harvest_records.status = ?", status).
		Order("harvest_records.tanggal DESC")
	query = r.applyEmployeeWorkerNameJoin(query)
	err := query.Find(&records).Error

	return records, err
}

// GetHarvestRecordsByManager retrieves harvest records that are under manager hierarchy:
// manager -> (direct mandor) and manager -> asisten -> mandor.
func (r *PanenRepository) GetHarvestRecordsByManager(ctx context.Context, managerID string, filters *models.HarvestFilters) ([]*models.HarvestRecord, error) {
	var records []*models.HarvestRecord
	query := r.db.WithContext(ctx).
		Preload("Mandor").
		Preload("Block").
		Preload("Block.Division").
		Preload("Block.Division.Estate")

	query = r.applyManagerScopeToHarvestQuery(query, managerID)
	// Apply filters (excluding MandorID since we are scoped by manager)
	query = r.applyHarvestFilters(query, filters)
	query = r.applyEmployeeWorkerNameJoin(query)

	err := query.Find(&records).Error
	return records, err
}

// GetHarvestRecordsByManagerAndStatus retrieves manager scoped harvest records by status.
func (r *PanenRepository) GetHarvestRecordsByManagerAndStatus(ctx context.Context, managerID string, status mandor.HarvestStatus) ([]*models.HarvestRecord, error) {
	var records []*models.HarvestRecord
	query := r.db.WithContext(ctx).
		Preload("Mandor").
		Preload("Block").
		Preload("Block.Division").
		Preload("Block.Division.Estate").
		Where("harvest_records.status = ?", status).
		Order("harvest_records.tanggal DESC")
	query = r.applyManagerScopeToHarvestQuery(query, managerID)
	query = r.applyEmployeeWorkerNameJoin(query)

	err := query.Find(&records).Error
	return records, err
}

// GetHarvestRecordByIDForManager retrieves one harvest record if it belongs to manager hierarchy.
func (r *PanenRepository) GetHarvestRecordByIDForManager(ctx context.Context, id, managerID string) (*models.HarvestRecord, error) {
	var record models.HarvestRecord
	query := r.db.WithContext(ctx).
		Preload("Mandor").
		Preload("Block").
		Preload("Block.Division").
		Preload("Block.Division.Estate").
		Preload("Block.Division.Estate.Company").
		Where("harvest_records.id = ?", id)
	query = r.applyManagerScopeToHarvestQuery(query, managerID)
	query = r.applyEmployeeWorkerNameJoin(query)

	if err := query.First(&record).Error; err != nil {
		return nil, err
	}
	return &record, nil
}

// UpdateHarvestRecord updates an existing harvest record
func (r *PanenRepository) UpdateHarvestRecord(ctx context.Context, id string, updates map[string]interface{}) (*models.HarvestRecord, error) {
	var record models.HarvestRecord

	// Start transaction
	tx := r.db.WithContext(ctx).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	filteredUpdates, err := r.filterHarvestRecordColumns(ctx, updates)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	if len(filteredUpdates) == 0 {
		filteredUpdates = map[string]interface{}{"updated_at": time.Now()}
	}

	// Update the record
	err = tx.Model(&record).Where("id = ?", id).Updates(filteredUpdates).Error
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	// Fetch updated record with associations
	err = tx.Preload("Mandor").
		Preload("Block").
		Preload("Block.Division").
		Preload("Block.Division.Estate").
		Preload("Block.Division.Estate.Company").
		Where("id = ?", id).
		First(&record).Error

	if err != nil {
		tx.Rollback()
		return nil, err
	}

	return &record, tx.Commit().Error
}

// ApproveHarvestRecord approves a harvest record
func (r *PanenRepository) ApproveHarvestRecord(ctx context.Context, id, approvedBy string) (*models.HarvestRecord, error) {
	now := time.Now()
	updates := map[string]interface{}{
		"status":      models.HarvestApproved,
		"approved_by": approvedBy,
		"approved_at": now,
		"updated_at":  now,
	}

	return r.UpdateHarvestRecord(ctx, id, updates)
}

// RejectHarvestRecord rejects a harvest record with reason
func (r *PanenRepository) RejectHarvestRecord(ctx context.Context, id, rejectedReason string) (*models.HarvestRecord, error) {
	now := time.Now()
	updates := map[string]interface{}{
		"status":          models.HarvestRejected,
		"rejected_reason": rejectedReason,
		"updated_at":      now,
	}

	return r.UpdateHarvestRecord(ctx, id, updates)
}

// DeleteHarvestRecord soft deletes a harvest record
func (r *PanenRepository) DeleteHarvestRecord(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.HarvestRecord{}).Error
}

// GetHarvestRecordsByMandor retrieves harvest records by mandor ID
func (r *PanenRepository) GetHarvestRecordsByMandor(ctx context.Context, mandorID string, filters *models.HarvestFilters) ([]*models.HarvestRecord, error) {
	var records []*models.HarvestRecord
	query := r.db.WithContext(ctx).
		Preload("Mandor").
		Preload("Block").
		Preload("Block.Division").
		Preload("Block.Division.Estate").
		Preload("Block.Division.Estate.Company")

	// Apply mandatory mandor filter
	if filters == nil {
		filters = &models.HarvestFilters{}
	}
	// Create a copy to avoid mutating the original filters if reused
	repoFilters := *filters
	repoFilters.MandorID = &mandorID

	// Apply all filters through the centralized helper
	query = r.applyHarvestFilters(query, &repoFilters)
	query = r.applyEmployeeWorkerNameJoin(query)

	err := query.Find(&records).Error

	return records, err
}

// GetHarvestRecordsByBlock retrieves harvest records by block ID
func (r *PanenRepository) GetHarvestRecordsByBlock(ctx context.Context, blockID string) ([]*models.HarvestRecord, error) {
	var records []*models.HarvestRecord
	query := r.db.WithContext(ctx).
		Preload("Mandor").
		Preload("Block").
		Where("harvest_records.block_id = ?", blockID).
		Order("harvest_records.tanggal DESC")
	query = r.applyEmployeeWorkerNameJoin(query)
	err := query.Find(&records).Error

	return records, err
}

// GetHarvestStatistics calculates harvest statistics
func (r *PanenRepository) GetHarvestStatistics(ctx context.Context, filters *models.HarvestFilters) (*models.HarvestStatistics, error) {
	query := r.db.WithContext(ctx).Model(&models.HarvestRecord{})

	// Apply filters (excluding pagination)
	if filters != nil {
		if filters.MandorID != nil {
			query = query.Where("mandor_id = ?", *filters.MandorID)
		}
		if filters.BlockID != nil {
			query = query.Where("block_id = ?", *filters.BlockID)
		}
		if filters.Status != nil {
			query = query.Where("status = ?", *filters.Status)
		}
		if filters.DateFrom != nil {
			query = query.Where("tanggal >= ?", *filters.DateFrom)
		}
		if filters.DateTo != nil {
			query = query.Where("tanggal <= ?", *filters.DateTo)
		}
	}

	stats := &models.HarvestStatistics{
		LastUpdated: time.Now(),
	}

	// Get total records
	query.Count(&stats.TotalRecords)

	// Get status counts
	r.db.WithContext(ctx).Model(&models.HarvestRecord{}).
		Where("status = ?", models.HarvestPending).
		Count(&stats.PendingRecords)

	r.db.WithContext(ctx).Model(&models.HarvestRecord{}).
		Where("status = ?", models.HarvestApproved).
		Count(&stats.ApprovedRecords)

	r.db.WithContext(ctx).Model(&models.HarvestRecord{}).
		Where("status = ?", models.HarvestRejected).
		Count(&stats.RejectedRecords)

	// Get sums
	var totals struct {
		TotalBeratTbs float64
		TotalJanjang  int64
	}

	query.Select("SUM(berat_tbs) as total_berat_tbs, SUM(jumlah_janjang) as total_janjang").
		Scan(&totals)

	stats.TotalBeratTbs = totals.TotalBeratTbs
	stats.TotalJanjang = totals.TotalJanjang

	// Calculate average
	if stats.TotalRecords > 0 {
		stats.AveragePerRecord = stats.TotalBeratTbs / float64(stats.TotalRecords)
	}

	return stats, nil
}

// ValidateHarvestRecord validates business rules for harvest record
func (r *PanenRepository) ValidateHarvestRecord(ctx context.Context, record *mandor.HarvestRecord) error {
	// Check if mandor exists and has correct role
	var mandor auth.User
	err := r.db.WithContext(ctx).Where("id = ? AND role = ? AND is_active = true",
		record.MandorID, auth.UserRoleMandor).First(&mandor).Error
	if err != nil {
		return models.NewHarvestError(models.ErrInvalidMandor, "Mandor tidak valid atau tidak aktif", "mandor_id")
	}

	// Check if block exists
	var block master.Block
	err = r.db.WithContext(ctx).Where("id = ?", record.BlockID).First(&block).Error
	if err != nil {
		return models.NewHarvestError(models.ErrInvalidBlock, "Block tidak ditemukan", "block_id")
	}

	return nil
}

// CanModifyHarvestRecord checks if harvest record can be modified
func (r *PanenRepository) CanModifyHarvestRecord(ctx context.Context, id string) error {
	var record models.HarvestRecord
	err := r.db.WithContext(ctx).Select("status").Where("id = ?", id).First(&record).Error
	if err != nil {
		return models.NewHarvestError(models.ErrHarvestNotFound, "Record panen tidak ditemukan", "id")
	}

	if record.Status == models.HarvestApproved {
		return models.NewHarvestError(models.ErrCannotModifyApproved, "Record yang sudah disetujui tidak dapat dimodifikasi", "status")
	}

	return nil
}

// GetHarvestRecordsByMandorSince retrieves harvest records by mandor ID updated since a given time
// This is used for mobile sync to pull approval status updates from the server
func (r *PanenRepository) GetHarvestRecordsByMandorSince(ctx context.Context, mandorID string, since time.Time) ([]*mandor.HarvestRecord, error) {
	var records []*mandor.HarvestRecord
	query := r.db.WithContext(ctx).
		Preload("Mandor").
		Preload("Block").
		Preload("Block.Division").
		Preload("Block.Division.Estate").
		Preload("Block.Division.Estate.Company").
		Where("harvest_records.mandor_id = ? AND harvest_records.updated_at > ?", mandorID, since).
		Order("harvest_records.updated_at DESC")
	query = r.applyEmployeeWorkerNameJoin(query)
	err := query.Find(&records).Error

	return records, err
}

// applyEmployeeWorkerNameJoin joins employees to enrich karyawan display name.
// Rule: harvest_records.karyawan_id = employees.id, prefer employees.name when available.
func (r *PanenRepository) applyEmployeeWorkerNameJoin(query *gorm.DB) *gorm.DB {
	return query.
		Model(&mandor.HarvestRecord{}).
		Joins("LEFT JOIN employees ON harvest_records.karyawan_id = employees.id").
		Select(`
			harvest_records.*,
			COALESCE(
				NULLIF(BTRIM(employees.name), ''),
				NULLIF(BTRIM(employees.nik), ''),
				NULLIF(BTRIM(harvest_records.nik), ''),
				CASE
					WHEN harvest_records.karyawan_id IS NOT NULL THEN harvest_records.karyawan_id::text
					ELSE ''
				END
			) AS karyawan
		`)
}

func (r *PanenRepository) applyManagerScopeToHarvestQuery(query *gorm.DB, managerID string) *gorm.DB {
	return query.
		Joins("JOIN users AS mandors ON mandors.id = harvest_records.mandor_id").
		Joins("LEFT JOIN users AS asistens ON asistens.id = mandors.manager_id").
		Where("mandors.role = ?", auth.UserRoleMandor).
		Where("mandors.is_active = ?", true).
		Where("mandors.deleted_at IS NULL").
		Where(`(
			mandors.manager_id = ?
			OR (
				asistens.role = ?
				AND asistens.manager_id = ?
				AND asistens.is_active = ?
				AND asistens.deleted_at IS NULL
			)
		)`, managerID, auth.UserRoleAsisten, managerID, true)
}

// SaveHarvestRecord saves an existing harvest record (for conflict resolution updates)
func (r *PanenRepository) SaveHarvestRecord(ctx context.Context, record *models.HarvestRecord) error {
	if record == nil {
		return fmt.Errorf("harvest record is nil")
	}

	updates := map[string]interface{}{
		"local_id":               record.LocalID,
		"device_id":              record.DeviceID,
		"tanggal":                record.Tanggal,
		"mandor_id":              record.MandorID,
		"asisten_id":             record.AsistenID,
		"company_id":             record.CompanyID,
		"estate_id":              record.EstateID,
		"division_id":            record.DivisionID,
		"block_id":               record.BlockID,
		"karyawan_id":            record.KaryawanID,
		"employee_division_id":   record.EmployeeDivisionID,
		"employee_division_name": record.EmployeeDivisionName,
		"nik":                    record.Nik,
		"karyawan":               record.Karyawan,
		"berat_tbs":              record.BeratTbs,
		"jumlah_janjang":         record.JumlahJanjang,
		"jjg_matang":             record.JjgMatang,
		"jjg_mentah":             record.JjgMentah,
		"jjg_lewat_matang":       record.JjgLewatMatang,
		"jjg_busuk_abnormal":     record.JjgBusukAbnormal,
		"jjg_tangkai_panjang":    record.JjgTangkaiPanjang,
		"total_brondolan":        record.TotalBrondolan,
		"status":                 record.Status,
		"approved_by":            record.ApprovedBy,
		"approved_at":            record.ApprovedAt,
		"rejected_reason":        record.RejectedReason,
		"notes":                  record.Notes,
		"latitude":               record.Latitude,
		"longitude":              record.Longitude,
		"photo_url":              record.PhotoURL,
		"updated_at":             time.Now(),
	}

	filteredUpdates, err := r.filterHarvestRecordColumns(ctx, updates)
	if err != nil {
		return err
	}
	if len(filteredUpdates) == 0 {
		return nil
	}

	return r.db.WithContext(ctx).Table("harvest_records").Where("id = ?", record.ID).Updates(filteredUpdates).Error
}

func (r *PanenRepository) filterHarvestRecordColumns(ctx context.Context, values map[string]interface{}) (map[string]interface{}, error) {
	columns, err := r.getHarvestRecordColumns(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load harvest_records columns: %w", err)
	}

	filtered := make(map[string]interface{}, len(values))
	for key, value := range values {
		if _, exists := columns[key]; exists {
			filtered[key] = value
		}
	}

	return filtered, nil
}

func (r *PanenRepository) getHarvestRecordColumns(ctx context.Context) (map[string]struct{}, error) {
	var columnNames []string
	err := r.db.WithContext(ctx).Raw(`
		SELECT column_name
		FROM information_schema.columns
		WHERE table_schema = current_schema()
		  AND table_name = 'harvest_records'
	`).Scan(&columnNames).Error
	if err != nil {
		return nil, err
	}

	columns := make(map[string]struct{}, len(columnNames))
	for _, column := range columnNames {
		columns[column] = struct{}{}
	}

	return columns, nil
}

// applyHarvestFilters applies filtering, searching, sorting, and pagination to query
func (r *PanenRepository) applyHarvestFilters(query *gorm.DB, filters *models.HarvestFilters) *gorm.DB {
	if filters == nil {
		return query.Order("harvest_records.tanggal DESC").Limit(models.DefaultHarvestLimit)
	}

	// Apply filters
	if filters.MandorID != nil {
		query = query.Where("harvest_records.mandor_id = ?", *filters.MandorID)
	}
	if filters.BlockID != nil {
		query = query.Where("harvest_records.block_id = ?", *filters.BlockID)
	}
	if filters.Status != nil {
		query = query.Where("harvest_records.status = ?", *filters.Status)
	}
	if filters.DateFrom != nil {
		query = query.Where("harvest_records.tanggal >= ?", *filters.DateFrom)
	}
	if filters.DateTo != nil {
		query = query.Where("harvest_records.tanggal <= ?", *filters.DateTo)
	}

	// Apply search
	if filters.Search != nil && *filters.Search != "" {
		searchTerm := "%" + strings.ToLower(*filters.Search) + "%"
		query = query.Where(
			"LOWER(COALESCE(harvest_records.nik, '')) LIKE ? OR LOWER(COALESCE(harvest_records.notes, '')) LIKE ?",
			searchTerm,
			searchTerm,
		)
	}

	// Apply sorting
	orderBy := models.DefaultHarvestOrderBy
	if filters.OrderBy != nil && *filters.OrderBy != "" {
		orderBy = *filters.OrderBy
	}
	orderBy = normalizeHarvestOrderBy(orderBy)

	orderDir := models.DefaultOrderDir
	if filters.OrderDir != nil && *filters.OrderDir != "" {
		orderDir = strings.ToUpper(*filters.OrderDir)
	}
	if orderDir != "ASC" && orderDir != "DESC" {
		orderDir = models.DefaultOrderDir
	}

	query = query.Order(fmt.Sprintf("%s %s", orderBy, orderDir))

	// Apply pagination
	limit := models.DefaultHarvestLimit
	if filters.Limit != nil && *filters.Limit > 0 {
		if *filters.Limit > models.MaxHarvestLimit {
			limit = models.MaxHarvestLimit
		} else {
			limit = *filters.Limit
		}
	}
	query = query.Limit(limit)

	if filters.Offset != nil && *filters.Offset > 0 {
		query = query.Offset(*filters.Offset)
	}

	return query
}

func normalizeHarvestOrderBy(orderBy string) string {
	switch strings.ToLower(strings.TrimSpace(orderBy)) {
	case "id":
		return "harvest_records.id"
	case "tanggal":
		return "harvest_records.tanggal"
	case "created_at":
		return "harvest_records.created_at"
	case "updated_at":
		return "harvest_records.updated_at"
	case "mandor_id":
		return "harvest_records.mandor_id"
	case "block_id":
		return "harvest_records.block_id"
	case "status":
		return "harvest_records.status"
	case "berat_tbs":
		return "harvest_records.berat_tbs"
	case "jumlah_janjang":
		return "harvest_records.jumlah_janjang"
	default:
		return "harvest_records.tanggal"
	}
}

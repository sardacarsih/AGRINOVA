package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"agrinovagraphql/server/internal/panen/domain"
)

// HarvestRecordModel is the GORM model for harvest records
// It mirrors the database schema and maps to domain.HarvestRecord
type HarvestRecordModel struct {
	ID             string    `gorm:"primaryKey;type:uuid;default:uuid_generate_v4()"`
	LocalID        *string   `gorm:"type:text;uniqueIndex"`
	Tanggal        time.Time `gorm:"not null"`
	MandorID       string    `gorm:"type:uuid;not null"`
	AsistenID      *string   `gorm:"-"`
	CompanyID      *string   `gorm:"type:uuid"`
	EstateID       *string   `gorm:"type:uuid"`
	DivisionID     *string   `gorm:"type:uuid"`
	BlockID        string    `gorm:"type:uuid;not null"`
	KaryawanID     *string   `gorm:"type:uuid"`
	Karyawan       string    `gorm:"not null"`
	BeratTbs       float64   `gorm:"not null"`
	JumlahJanjang  int       `gorm:"not null"`
	Status         string    `gorm:"not null;default:'PENDING'"`
	ApprovedBy     *string   `gorm:"type:uuid"`
	RejectedReason *string
	Notes          *string  `gorm:"type:text"`
	Latitude       *float64 `gorm:"type:double precision"`
	Longitude      *float64 `gorm:"type:double precision"`
	PhotoURL       *string  `gorm:"type:text"`
	CreatedAt      time.Time
	UpdatedAt      time.Time

	// Associations (if needed for Preload, though we might handle this differently in strict DDD)
	// For now, we keep them to match existing logic but they won't be exposed to domain directly
	// Mandor   User   `gorm:"foreignKey:MandorID"`
	// Block    Block  `gorm:"foreignKey:BlockID"`
}

// TableName overrides the table name
func (HarvestRecordModel) TableName() string {
	return "harvest_records"
}

// PostgresRepository implements domain.HarvestRepository
type PostgresRepository struct {
	db *gorm.DB
}

// NewPostgresRepository creates a new PostgresRepository
func NewPostgresRepository(db *gorm.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

// toDomain converts GORM model to domain entity
func (m *HarvestRecordModel) toDomain() *domain.HarvestRecord {
	return &domain.HarvestRecord{
		ID:             m.ID,
		LocalID:        m.LocalID,
		Tanggal:        m.Tanggal,
		MandorID:       m.MandorID,
		AsistenID:      m.AsistenID,
		CompanyID:      m.CompanyID,
		EstateID:       m.EstateID,
		DivisionID:     m.DivisionID,
		BlockID:        m.BlockID,
		KaryawanID:     m.KaryawanID,
		Karyawan:       m.Karyawan,
		BeratTbs:       m.BeratTbs,
		JumlahJanjang:  m.JumlahJanjang,
		Status:         domain.HarvestStatus(m.Status),
		ApprovedBy:     m.ApprovedBy,
		RejectedReason: m.RejectedReason,
		Notes:          m.Notes,
		Latitude:       m.Latitude,
		Longitude:      m.Longitude,
		PhotoURL:       m.PhotoURL,
		CreatedAt:      m.CreatedAt,
		UpdatedAt:      m.UpdatedAt,
	}
}

// fromDomain converts domain entity to GORM model
func fromDomain(d *domain.HarvestRecord) *HarvestRecordModel {
	return &HarvestRecordModel{
		ID:             d.ID,
		LocalID:        d.LocalID,
		Tanggal:        d.Tanggal,
		MandorID:       d.MandorID,
		AsistenID:      d.AsistenID,
		CompanyID:      d.CompanyID,
		EstateID:       d.EstateID,
		DivisionID:     d.DivisionID,
		BlockID:        d.BlockID,
		KaryawanID:     d.KaryawanID,
		Karyawan:       d.Karyawan,
		BeratTbs:       d.BeratTbs,
		JumlahJanjang:  d.JumlahJanjang,
		Status:         string(d.Status),
		ApprovedBy:     d.ApprovedBy,
		RejectedReason: d.RejectedReason,
		Notes:          d.Notes,
		Latitude:       d.Latitude,
		Longitude:      d.Longitude,
		PhotoURL:       d.PhotoURL,
		CreatedAt:      d.CreatedAt,
		UpdatedAt:      d.UpdatedAt,
	}
}

func (r *PostgresRepository) Create(ctx context.Context, record *domain.HarvestRecord) error {
	model := fromDomain(record)
	if err := r.db.WithContext(ctx).Create(model).Error; err != nil {
		return err
	}
	// Update ID and timestamps back to domain
	record.ID = model.ID
	record.CreatedAt = model.CreatedAt
	record.UpdatedAt = model.UpdatedAt
	return nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*domain.HarvestRecord, error) {
	var model HarvestRecordModel
	if err := r.db.WithContext(ctx).First(&model, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, domain.NewAppError(domain.ErrHarvestNotFound, "Harvest record not found", "id")
		}
		return nil, err
	}
	return model.toDomain(), nil
}

func (r *PostgresRepository) Update(ctx context.Context, record *domain.HarvestRecord) error {
	model := fromDomain(record)
	return r.db.WithContext(ctx).Save(model).Error
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&HarvestRecordModel{}, "id = ?", id).Error
}

func (r *PostgresRepository) List(ctx context.Context, filters domain.HarvestFilters) ([]*domain.HarvestRecord, int64, error) {
	var models []HarvestRecordModel
	var total int64

	query := r.db.WithContext(ctx).Model(&HarvestRecordModel{})

	// Apply filters
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
	if filters.Search != nil && *filters.Search != "" {
		searchTerm := "%" + strings.ToLower(*filters.Search) + "%"
		query = query.Where("LOWER(karyawan) LIKE ?", searchTerm)
	}

	// Role-based filtering (simplified for now, assumes joins are handled if needed or IDs passed)
	if len(filters.DivisionIDs) > 0 {
		query = query.Joins("JOIN blocks ON harvest_records.block_id = blocks.id").
			Where("blocks.division_id IN ?", filters.DivisionIDs)
	}
	if len(filters.EstateIDs) > 0 {
		query = query.Joins("JOIN blocks ON harvest_records.block_id = blocks.id").
			Joins("JOIN divisions ON blocks.division_id = divisions.id").
			Where("divisions.estate_id IN ?", filters.EstateIDs)
	}
	if len(filters.CompanyIDs) > 0 {
		query = query.Joins("JOIN blocks ON harvest_records.block_id = blocks.id").
			Joins("JOIN divisions ON blocks.division_id = divisions.id").
			Joins("JOIN estates ON divisions.estate_id = estates.id").
			Where("estates.company_id IN ?", filters.CompanyIDs)
	}

	// Count total before pagination
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Sorting
	orderBy := "tanggal"
	if filters.OrderBy != nil && *filters.OrderBy != "" {
		orderBy = *filters.OrderBy
	}
	orderDir := "DESC"
	if filters.OrderDir != nil && *filters.OrderDir != "" {
		orderDir = *filters.OrderDir
	}
	query = query.Order(fmt.Sprintf("%s %s", orderBy, orderDir))

	// Pagination
	if filters.Limit != nil {
		query = query.Limit(*filters.Limit)
	}
	if filters.Offset != nil {
		query = query.Offset(*filters.Offset)
	}

	if err := query.Find(&models).Error; err != nil {
		return nil, 0, err
	}

	records := make([]*domain.HarvestRecord, len(models))
	for i, m := range models {
		records[i] = m.toDomain()
	}

	return records, total, nil
}

func (r *PostgresRepository) GetStatistics(ctx context.Context, filters domain.HarvestFilters) (*domain.HarvestStatistics, error) {
	query := r.db.WithContext(ctx).Model(&HarvestRecordModel{})

	// Apply filters (copy-paste from List, should refactor if possible but keeping simple for now)
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

	var result struct {
		TotalRecords    int64
		TotalBeratTbs   float64
		TotalJanjang    int64
		PendingRecords  int64
		ApprovedRecords int64
		RejectedRecords int64
	}

	err := query.Select(`
		COUNT(*) as total_records,
		COALESCE(SUM(berat_tbs), 0) as total_berat_tbs,
		COALESCE(SUM(jumlah_janjang), 0) as total_janjang,
		COALESCE(COUNT(*) FILTER (WHERE status = 'PENDING'), 0) as pending_records,
		COALESCE(COUNT(*) FILTER (WHERE status = 'APPROVED'), 0) as approved_records,
		COALESCE(COUNT(*) FILTER (WHERE status = 'REJECTED'), 0) as rejected_records
	`).Scan(&result).Error

	if err != nil {
		return nil, err
	}

	stats := &domain.HarvestStatistics{
		TotalRecords:    result.TotalRecords,
		TotalBeratTbs:   result.TotalBeratTbs,
		TotalJanjang:    result.TotalJanjang,
		PendingRecords:  result.PendingRecords,
		ApprovedRecords: result.ApprovedRecords,
		RejectedRecords: result.RejectedRecords,
		LastUpdated:     time.Now(),
	}

	if stats.TotalRecords > 0 {
		stats.AveragePerRecord = stats.TotalBeratTbs / float64(stats.TotalRecords)
	}

	return stats, nil
}

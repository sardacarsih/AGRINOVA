package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"

	"agrinovagraphql/server/internal/graphql/domain/asisten"
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/common"
	"agrinovagraphql/server/internal/graphql/domain/mandor"
	"agrinovagraphql/server/internal/panen/models"
	panenRepos "agrinovagraphql/server/internal/panen/repositories"
)

type PanenService struct {
	db   *gorm.DB
	repo *panenRepos.PanenRepository
}

func NewPanenService(db *gorm.DB) *PanenService {
	return &PanenService{
		db:   db,
		repo: panenRepos.NewPanenRepository(db),
	}
}

// CreateHarvestRecord creates a new harvest record
func (s *PanenService) CreateHarvestRecord(ctx context.Context, input mandor.CreateHarvestRecordInput) (*models.HarvestRecord, error) {
	karyawanID := normalizeOptionalUUID(input.KaryawanID)
	employeeDivisionID := normalizeOptionalUUID(input.EmployeeDivisionID)
	employeeDivisionName := normalizeOptionalText(input.EmployeeDivisionName)
	companyID := normalizeOptionalUUID(input.CompanyID)
	estateID := normalizeOptionalUUID(input.EstateID)
	divisionID := normalizeOptionalUUID(input.DivisionID)
	deviceID := normalizeOptionalText(input.DeviceID)
	scope, err := s.resolveHarvestScopeFromBlock(ctx, input.BlockID)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve block hierarchy: %w", err)
	}
	if divisionID == nil && scope.DivisionID != nil {
		divisionID = scope.DivisionID
	}
	if estateID == nil && scope.EstateID != nil {
		estateID = scope.EstateID
	}
	if companyID == nil && scope.CompanyID != nil {
		companyID = scope.CompanyID
	}
	if companyID == nil {
		companyID = s.resolveCompanyFromAssignment(ctx, input.MandorID)
	}
	if estateID == nil {
		estateID = s.resolveEstateFromAssignment(ctx, input.MandorID)
	}
	resolvedNik, resolvedKaryawan := s.resolveHarvestIdentity(ctx, karyawanID, input.Karyawan)
	employeeDivisionID, employeeDivisionName = s.resolveEmployeeDivisionSnapshot(
		ctx,
		karyawanID,
		employeeDivisionID,
		employeeDivisionName,
	)

	// Create harvest record
	record := &models.HarvestRecord{
		ID:                   uuid.New().String(),
		LocalID:              input.LocalID,
		DeviceID:             deviceID,
		Tanggal:              input.Tanggal,
		MandorID:             input.MandorID,
		CompanyID:            companyID,
		EstateID:             estateID,
		DivisionID:           divisionID,
		BlockID:              input.BlockID,
		KaryawanID:           karyawanID,
		EmployeeDivisionID:   employeeDivisionID,
		EmployeeDivisionName: employeeDivisionName,
		Nik:                  resolvedNik,
		Karyawan:             resolvedKaryawan,
		BeratTbs:             input.BeratTbs,
		JumlahJanjang:        int32(input.JumlahJanjang),
		JjgMatang:            valueOrZeroInt32(input.JjgMatang),
		JjgMentah:            valueOrZeroInt32(input.JjgMentah),
		JjgLewatMatang:       valueOrZeroInt32(input.JjgLewatMatang),
		JjgBusukAbnormal:     valueOrZeroInt32(input.JjgBusukAbnormal),
		JjgTangkaiPanjang:    valueOrZeroInt32(input.JjgTangkaiPanjang),
		TotalBrondolan:       valueOrZeroFloat64(input.TotalBrondolan),
		Notes:                input.Notes,
		Latitude:             input.Latitude,
		Longitude:            input.Longitude,
		PhotoURL:             input.PhotoURL,
		Status:               models.HarvestPending,
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}

	// Validate business rules
	if err := s.repo.ValidateHarvestRecord(ctx, record); err != nil {
		return nil, err
	}

	// Create record in database
	if err := s.repo.CreateHarvestRecord(ctx, record); err != nil {
		if mappedErr := mapHarvestWriteError(err); mappedErr != nil {
			return nil, mappedErr
		}
		return nil, fmt.Errorf("failed to create harvest record: %w", err)
	}

	// Fetch created record with associations
	createdRecord, err := s.repo.GetHarvestRecordByID(ctx, record.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch created harvest record: %w", err)
	}
	createdRecord.Karyawan = displayHarvestWorker(createdRecord.Karyawan, createdRecord.Nik, createdRecord.KaryawanID)

	return createdRecord, nil
}

// GetByLocalID retrieves a harvest record by local ID
func (s *PanenService) GetByLocalID(ctx context.Context, localID, mandorID string) (*models.HarvestRecord, error) {
	if localID == "" || mandorID == "" {
		return nil, fmt.Errorf("localID and mandorID are required")
	}
	return s.repo.GetByLocalID(ctx, localID, mandorID)
}

// GetHarvestRecords retrieves harvest records with optional filters
func (s *PanenService) GetHarvestRecords(ctx context.Context, filters *models.HarvestFilters) ([]*models.HarvestRecord, error) {
	return s.repo.GetHarvestRecords(ctx, filters)
}

// GetHarvestRecord retrieves a specific harvest record by ID
func (s *PanenService) GetHarvestRecord(ctx context.Context, id string) (*models.HarvestRecord, error) {
	if id == "" {
		return nil, models.NewHarvestError(models.ErrHarvestNotFound, "ID harvest record tidak boleh kosong", "id")
	}

	record, err := s.repo.GetHarvestRecordByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewHarvestError(models.ErrHarvestNotFound, "Record panen tidak ditemukan", "id")
		}
		return nil, fmt.Errorf("failed to fetch harvest record: %w", err)
	}

	return record, nil
}

// GetHarvestRecordsByStatus retrieves harvest records filtered by status
func (s *PanenService) GetHarvestRecordsByStatus(ctx context.Context, status mandor.HarvestStatus) ([]*models.HarvestRecord, error) {
	var modelStatus models.HarvestStatus
	switch status {
	case mandor.HarvestStatusPending:
		modelStatus = models.HarvestPending
	case mandor.HarvestStatusApproved:
		modelStatus = models.HarvestApproved
	case mandor.HarvestStatusRejected:
		modelStatus = models.HarvestRejected
	default:
		return nil, models.NewHarvestError("INVALID_STATUS", "Status tidak valid", "status")
	}

	return s.repo.GetHarvestRecordsByStatus(ctx, modelStatus)
}

// UpdateHarvestRecord updates an existing harvest record
func (s *PanenService) UpdateHarvestRecord(ctx context.Context, input mandor.UpdateHarvestRecordInput) (*models.HarvestRecord, error) {
	// Check if record can be modified
	if err := s.repo.CanModifyHarvestRecord(ctx, input.ID); err != nil {
		return nil, err
	}

	// Build updates map
	updates := map[string]interface{}{
		"updated_at": time.Now(),
	}

	normalizedKaryawanID := normalizeOptionalUUID(input.KaryawanID)
	resolvedEmployeeDivisionID, resolvedEmployeeDivisionName := s.resolveEmployeeDivisionSnapshot(
		ctx,
		normalizedKaryawanID,
		input.EmployeeDivisionID,
		input.EmployeeDivisionName,
	)
	if input.KaryawanID != nil {
		updates["karyawan_id"] = normalizedKaryawanID
		if normalizedKaryawanID != nil {
			if nik := s.lookupEmployeeNik(ctx, *normalizedKaryawanID); nik != nil {
				updates["nik"] = *nik
				updates["karyawan"] = *nik
			}
		}
	}
	if input.EmployeeDivisionID != nil ||
		(input.KaryawanID != nil && resolvedEmployeeDivisionID != nil) {
		updates["employee_division_id"] = resolvedEmployeeDivisionID
	}
	if input.EmployeeDivisionName != nil ||
		(input.KaryawanID != nil && resolvedEmployeeDivisionName != nil) {
		updates["employee_division_name"] = resolvedEmployeeDivisionName
	}
	if input.DeviceID != nil {
		updates["device_id"] = normalizeOptionalText(input.DeviceID)
	}

	if input.BeratTbs != nil {
		updates["berat_tbs"] = *input.BeratTbs
	}
	if input.JumlahJanjang != nil {
		updates["jumlah_janjang"] = *input.JumlahJanjang
	}
	if input.Karyawan != nil {
		resolvedNik, resolvedKaryawan := s.resolveHarvestIdentity(ctx, normalizedKaryawanID, *input.Karyawan)
		updates["karyawan"] = resolvedKaryawan
		if resolvedNik != nil {
			updates["nik"] = *resolvedNik
		} else if nik := normalizeHarvestNik(*input.Karyawan); nik != nil {
			updates["nik"] = *nik
		} else {
			updates["nik"] = nil
		}
	}
	if input.JjgMatang != nil {
		updates["jjg_matang"] = *input.JjgMatang
	}
	if input.JjgMentah != nil {
		updates["jjg_mentah"] = *input.JjgMentah
	}
	if input.JjgLewatMatang != nil {
		updates["jjg_lewat_matang"] = *input.JjgLewatMatang
	}
	if input.JjgBusukAbnormal != nil {
		updates["jjg_busuk_abnormal"] = *input.JjgBusukAbnormal
	}
	if input.JjgTangkaiPanjang != nil {
		updates["jjg_tangkai_panjang"] = *input.JjgTangkaiPanjang
	}
	if input.TotalBrondolan != nil {
		updates["total_brondolan"] = *input.TotalBrondolan
	}

	// Update record
	updatedRecord, err := s.repo.UpdateHarvestRecord(ctx, input.ID, updates)
	if err != nil {
		if mappedErr := mapHarvestWriteError(err); mappedErr != nil {
			return nil, mappedErr
		}
		return nil, fmt.Errorf("failed to update harvest record: %w", err)
	}
	updatedRecord.Karyawan = displayHarvestWorker(updatedRecord.Karyawan, updatedRecord.Nik, updatedRecord.KaryawanID)

	return updatedRecord, nil
}

// ApproveHarvestRecord approves a harvest record
func (s *PanenService) ApproveHarvestRecord(ctx context.Context, input asisten.ApproveHarvestInput) (*models.HarvestRecord, error) {
	// Check if record exists and is pending
	existingRecord, err := s.repo.GetHarvestRecordByID(ctx, input.ID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewHarvestError(models.ErrHarvestNotFound, "Record panen tidak ditemukan", "id")
		}
		return nil, fmt.Errorf("failed to fetch harvest record: %w", err)
	}

	if existingRecord.Status == models.HarvestApproved {
		return nil, models.NewHarvestError(models.ErrHarvestAlreadyApproved, "Record sudah disetujui", "status")
	}

	if existingRecord.Status == models.HarvestRejected {
		// Allow re-approval of rejected records
	}

	approverID := strings.TrimSpace(input.ApprovedBy)
	if approverID == "" {
		return nil, models.NewHarvestError(models.ErrInvalidApprover, "Approver tidak valid", "approved_by")
	}

	// Check if user has permission to approve harvest records
	allowedApproverRoles := []auth.UserRole{
		auth.UserRoleAsisten,
		auth.UserRoleManager,
		auth.UserRoleAreaManager,
		auth.UserRoleCompanyAdmin,
		auth.UserRoleSuperAdmin,
	}

	var approver auth.User
	err = s.db.WithContext(ctx).Where("id = ? AND role IN ? AND is_active = true",
		approverID, allowedApproverRoles).First(&approver).Error
	if err != nil {
		return nil, models.NewHarvestError(
			models.ErrInvalidApprover,
			"Approver harus aktif dengan role Asisten/Manager/Area Manager/Company Admin/Super Admin",
			"approved_by",
		)
	}

	// Approve the record
	approvedRecord, err := s.repo.ApproveHarvestRecord(ctx, input.ID, approverID)
	if err != nil {
		return nil, fmt.Errorf("failed to approve harvest record: %w", err)
	}

	return approvedRecord, nil
}

func mapHarvestWriteError(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		switch strings.TrimSpace(pgErr.ConstraintName) {
		case "uq_harvest_records_company_date_block_worker":
			return models.NewHarvestError(
				"HARVEST_DUPLICATE_SCOPE",
				"Duplikat data panen: pekerja pada tanggal dan blok yang sama sudah ada di company ini",
				"tanggal",
			)
		case "harvest_records_local_id_key":
			return models.NewHarvestError(
				"HARVEST_DUPLICATE_LOCAL_ID",
				"Data panen dengan localId yang sama sudah ada",
				"local_id",
			)
		}
	}

	lowerErr := strings.ToLower(err.Error())
	if strings.Contains(lowerErr, "uq_harvest_records_company_date_block_worker") {
		return models.NewHarvestError(
			"HARVEST_DUPLICATE_SCOPE",
			"Duplikat data panen: pekerja pada tanggal dan blok yang sama sudah ada di company ini",
			"tanggal",
		)
	}
	if strings.Contains(lowerErr, "harvest_records_local_id_key") {
		return models.NewHarvestError(
			"HARVEST_DUPLICATE_LOCAL_ID",
			"Data panen dengan localId yang sama sudah ada",
			"local_id",
		)
	}

	return nil
}

// RejectHarvestRecord rejects a harvest record with reason
func (s *PanenService) RejectHarvestRecord(ctx context.Context, input asisten.RejectHarvestInput) (*models.HarvestRecord, error) {
	// Check if record exists and is not already rejected
	existingRecord, err := s.repo.GetHarvestRecordByID(ctx, input.ID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewHarvestError(models.ErrHarvestNotFound, "Record panen tidak ditemukan", "id")
		}
		return nil, fmt.Errorf("failed to fetch harvest record: %w", err)
	}

	if existingRecord.Status == models.HarvestRejected {
		return nil, models.NewHarvestError(models.ErrHarvestAlreadyRejected, "Record sudah ditolak", "status")
	}

	// Reject the record
	rejectedRecord, err := s.repo.RejectHarvestRecord(ctx, input.ID, input.RejectedReason)
	if err != nil {
		return nil, fmt.Errorf("failed to reject harvest record: %w", err)
	}

	return rejectedRecord, nil
}

// DeleteHarvestRecord deletes a harvest record (soft delete)
func (s *PanenService) DeleteHarvestRecord(ctx context.Context, id string) (bool, error) {
	// Check if record can be modified (only pending records can be deleted)
	if err := s.repo.CanModifyHarvestRecord(ctx, id); err != nil {
		return false, err
	}

	// Delete the record
	if err := s.repo.DeleteHarvestRecord(ctx, id); err != nil {
		return false, fmt.Errorf("failed to delete harvest record: %w", err)
	}

	return true, nil
}

// GetHarvestRecordsByMandor retrieves harvest records by mandor ID
func (s *PanenService) GetHarvestRecordsByMandor(ctx context.Context, mandorID string, filters *models.HarvestFilters) ([]*models.HarvestRecord, error) {
	return s.repo.GetHarvestRecordsByMandor(ctx, mandorID, filters)
}

// GetHarvestRecordsByManager retrieves harvest records that belong to manager hierarchy.
func (s *PanenService) GetHarvestRecordsByManager(ctx context.Context, managerID string, filters *models.HarvestFilters) ([]*models.HarvestRecord, error) {
	return s.repo.GetHarvestRecordsByManager(ctx, managerID, filters)
}

// GetHarvestRecordsByManagerAndStatus retrieves manager-scoped harvest records by status.
func (s *PanenService) GetHarvestRecordsByManagerAndStatus(ctx context.Context, managerID string, status mandor.HarvestStatus) ([]*models.HarvestRecord, error) {
	var modelStatus models.HarvestStatus
	switch status {
	case mandor.HarvestStatusPending:
		modelStatus = models.HarvestPending
	case mandor.HarvestStatusApproved:
		modelStatus = models.HarvestApproved
	case mandor.HarvestStatusRejected:
		modelStatus = models.HarvestRejected
	default:
		return nil, models.NewHarvestError("INVALID_STATUS", "Status tidak valid", "status")
	}

	return s.repo.GetHarvestRecordsByManagerAndStatus(ctx, managerID, modelStatus)
}

// GetHarvestRecordByIDForManager retrieves one harvest record if it belongs to manager hierarchy.
func (s *PanenService) GetHarvestRecordByIDForManager(ctx context.Context, id, managerID string) (*models.HarvestRecord, error) {
	if id == "" {
		return nil, models.NewHarvestError(models.ErrHarvestNotFound, "ID harvest record tidak boleh kosong", "id")
	}

	record, err := s.repo.GetHarvestRecordByIDForManager(ctx, id, managerID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.NewHarvestError(models.ErrHarvestNotFound, "Record panen tidak ditemukan", "id")
		}
		return nil, fmt.Errorf("failed to fetch harvest record: %w", err)
	}
	return record, nil
}

// GetHarvestRecordsByBlock retrieves harvest records by block ID
func (s *PanenService) GetHarvestRecordsByBlock(ctx context.Context, blockID string) ([]*models.HarvestRecord, error) {
	return s.repo.GetHarvestRecordsByBlock(ctx, blockID)
}

// GetHarvestStatistics calculates harvest statistics
func (s *PanenService) GetHarvestStatistics(ctx context.Context, filters *models.HarvestFilters) (*models.HarvestStatistics, error) {
	return s.repo.GetHarvestStatistics(ctx, filters)
}

// GetHarvestRecordsByMandorSince retrieves harvest records by mandor ID updated since a given time
// This is used for mobile sync to pull approval status updates from the server
func (s *PanenService) GetHarvestRecordsByMandorSince(ctx context.Context, mandorID string, since time.Time) ([]*mandor.HarvestRecord, error) {
	return s.repo.GetHarvestRecordsByMandorSince(ctx, mandorID, since)
}

// SaveHarvestRecord saves an existing harvest record (for conflict resolution updates)
func (s *PanenService) SaveHarvestRecord(ctx context.Context, record *models.HarvestRecord) error {
	return s.repo.SaveHarvestRecord(ctx, record)
}

func normalizeHarvestNik(karyawan string) *string {
	nik := strings.TrimSpace(karyawan)
	if nik == "" {
		return nil
	}

	return &nik
}

func valueOrZeroInt32(value *int32) int32 {
	if value == nil {
		return 0
	}
	return *value
}

func valueOrZeroFloat64(value *float64) float64 {
	if value == nil {
		return 0
	}
	return *value
}

func normalizeOptionalUUID(value *string) *string {
	if value == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}

	if _, err := uuid.Parse(trimmed); err != nil {
		return nil
	}

	return &trimmed
}

func normalizeOptionalText(value *string) *string {
	if value == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}

func (s *PanenService) resolveHarvestIdentity(ctx context.Context, karyawanID *string, karyawan string) (*string, string) {
	if karyawanID != nil {
		if nik := s.lookupEmployeeNik(ctx, *karyawanID); nik != nil {
			return nik, *nik
		}
	}

	candidate := strings.TrimSpace(karyawan)
	if candidate == "" {
		return nil, ""
	}

	if parsed, err := uuid.Parse(candidate); err == nil {
		if nik := s.lookupEmployeeNik(ctx, parsed.String()); nik != nil {
			return nik, *nik
		}
		return nil, candidate
	}

	return &candidate, candidate
}

func (s *PanenService) lookupEmployeeNik(ctx context.Context, employeeID string) *string {
	trimmed := strings.TrimSpace(employeeID)
	if trimmed == "" {
		return nil
	}
	if _, err := uuid.Parse(trimmed); err != nil {
		return nil
	}

	var nik string
	err := s.db.WithContext(ctx).
		Table("employees").
		Select("nik").
		Where("id = ?", trimmed).
		Limit(1).
		Scan(&nik).Error
	if err != nil {
		return nil
	}

	nik = strings.TrimSpace(nik)
	if nik == "" {
		return nil
	}
	return &nik
}

func (s *PanenService) resolveEmployeeDivisionSnapshot(
	ctx context.Context,
	karyawanID *string,
	employeeDivisionID *string,
	employeeDivisionName *string,
) (*string, *string) {
	resolvedDivisionID := normalizeOptionalUUID(employeeDivisionID)
	resolvedDivisionName := normalizeOptionalText(employeeDivisionName)

	if karyawanID == nil {
		return resolvedDivisionID, resolvedDivisionName
	}
	if resolvedDivisionID != nil && resolvedDivisionName != nil {
		return resolvedDivisionID, resolvedDivisionName
	}

	trimmedKaryawanID := strings.TrimSpace(*karyawanID)
	if _, err := uuid.Parse(trimmedKaryawanID); err != nil {
		return resolvedDivisionID, resolvedDivisionName
	}

	var row struct {
		DivisionID   *string `gorm:"column:division_id"`
		DivisionName *string `gorm:"column:division_name"`
	}
	if err := s.db.WithContext(ctx).Raw(`
		SELECT
			CAST(d.id AS TEXT) AS division_id,
			NULLIF(BTRIM(d.name), '') AS division_name
		FROM employees e
		LEFT JOIN divisions d ON d.id = e.division_id
		WHERE e.id = ?
		LIMIT 1
	`, trimmedKaryawanID).Scan(&row).Error; err != nil {
		return resolvedDivisionID, resolvedDivisionName
	}

	if resolvedDivisionID == nil {
		resolvedDivisionID = normalizeOptionalUUID(row.DivisionID)
	}
	if resolvedDivisionName == nil {
		resolvedDivisionName = normalizeOptionalText(row.DivisionName)
	}

	return resolvedDivisionID, resolvedDivisionName
}

type harvestScope struct {
	CompanyID  *string
	EstateID   *string
	DivisionID *string
}

func (s *PanenService) resolveHarvestScopeFromBlock(ctx context.Context, blockID string) (*harvestScope, error) {
	scope := &harvestScope{}
	trimmed := strings.TrimSpace(blockID)
	if trimmed == "" {
		return scope, nil
	}
	if _, err := uuid.Parse(trimmed); err != nil {
		return scope, nil
	}

	var row struct {
		CompanyID  *string `gorm:"column:company_id"`
		EstateID   *string `gorm:"column:estate_id"`
		DivisionID *string `gorm:"column:division_id"`
	}
	err := s.db.WithContext(ctx).Raw(`
		SELECT
			CAST(e.company_id AS TEXT) AS company_id,
			CAST(d.estate_id AS TEXT) AS estate_id,
			CAST(b.division_id AS TEXT) AS division_id
		FROM blocks b
		JOIN divisions d ON d.id = b.division_id
		JOIN estates e ON e.id = d.estate_id
		WHERE b.id = ?
		LIMIT 1
	`, trimmed).Scan(&row).Error
	if err != nil {
		return nil, err
	}

	scope.CompanyID = normalizeOptionalUUID(row.CompanyID)
	scope.EstateID = normalizeOptionalUUID(row.EstateID)
	scope.DivisionID = normalizeOptionalUUID(row.DivisionID)
	return scope, nil
}

func (s *PanenService) resolveCompanyFromAssignment(ctx context.Context, userID string) *string {
	trimmed := strings.TrimSpace(userID)
	if trimmed == "" {
		return nil
	}

	var companyID *string
	_ = s.db.WithContext(ctx).
		Table("user_company_assignments").
		Select("CAST(company_id AS TEXT)").
		Where("user_id = ? AND is_active = true", trimmed).
		Order("updated_at DESC").
		Limit(1).
		Scan(&companyID).Error

	return normalizeOptionalUUID(companyID)
}

func (s *PanenService) resolveEstateFromAssignment(ctx context.Context, userID string) *string {
	trimmed := strings.TrimSpace(userID)
	if trimmed == "" {
		return nil
	}

	var estateID *string
	_ = s.db.WithContext(ctx).
		Table("user_estate_assignments").
		Select("CAST(estate_id AS TEXT)").
		Where("user_id = ? AND is_active = true", trimmed).
		Order("updated_at DESC").
		Limit(1).
		Scan(&estateID).Error

	return normalizeOptionalUUID(estateID)
}

func displayHarvestWorker(karyawan string, nik *string, karyawanID *string) string {
	trimmedKaryawan := strings.TrimSpace(karyawan)
	if trimmedKaryawan != "" {
		return trimmedKaryawan
	}

	if nik != nil {
		trimmedNik := strings.TrimSpace(*nik)
		if trimmedNik != "" {
			return trimmedNik
		}
	}

	if karyawanID != nil {
		trimmedKaryawanID := strings.TrimSpace(*karyawanID)
		if trimmedKaryawanID != "" {
			return trimmedKaryawanID
		}
	}

	return ""
}

// GetMandorDashboardStats returns aggregated statistics for a mandor's dashboard
func (s *PanenService) GetMandorDashboardStats(ctx context.Context, mandorID string) (*mandor.MandorDashboardStats, error) {
	today := time.Now().Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)
	weekAgo := today.Add(-7 * 24 * time.Hour)

	// Query today's stats
	var todayStats struct {
		HarvestCount  int32   `gorm:"column:harvest_count"`
		TbsCount      int32   `gorm:"column:tbs_count"`
		TotalWeight   float64 `gorm:"column:total_weight"`
		PendingCount  int32   `gorm:"column:pending_count"`
		ApprovedCount int32   `gorm:"column:approved_count"`
		RejectedCount int32   `gorm:"column:rejected_count"`
		BlocksWorked  int32   `gorm:"column:blocks_worked"`
	}

	err := s.db.WithContext(ctx).Raw(`
		SELECT 
			COUNT(*) as harvest_count,
			COALESCE(SUM(jumlah_janjang), 0) as tbs_count,
			COALESCE(SUM(berat_tbs), 0) as total_weight,
			COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) as pending_count,
			COALESCE(SUM(CASE WHEN status = 'APPROVED' AND approved_at >= ? THEN 1 ELSE 0 END), 0) as approved_count,
			COALESCE(SUM(CASE WHEN status = 'REJECTED' AND updated_at >= ? THEN 1 ELSE 0 END), 0) as rejected_count,
			COUNT(DISTINCT block_id) as blocks_worked
		FROM harvest_records
		WHERE mandor_id = ? AND tanggal >= ? AND tanggal < ? AND deleted_at IS NULL
	`, today, today, mandorID, today, tomorrow).Scan(&todayStats).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get today's stats: %w", err)
	}

	// Query weekly stats
	var weeklyStats struct {
		TbsCount    int32   `gorm:"column:tbs_count"`
		TotalWeight float64 `gorm:"column:total_weight"`
	}

	err = s.db.WithContext(ctx).Raw(`
		SELECT 
			COALESCE(SUM(jumlah_janjang), 0) as tbs_count,
			COALESCE(SUM(berat_tbs), 0) as total_weight
		FROM harvest_records
		WHERE mandor_id = ? AND tanggal >= ? AND deleted_at IS NULL
	`, mandorID, weekAgo).Scan(&weeklyStats).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get weekly stats: %w", err)
	}

	var activeWorkers int32 = 0
	s.db.WithContext(ctx).Raw(`
		SELECT COUNT(DISTINCT worker_key) AS active_workers
		FROM (
			SELECT COALESCE(
				NULLIF(karyawan_id::text, ''),
				NULLIF(TRIM(nik), '')
			) AS worker_key
			FROM harvest_records
			WHERE mandor_id = ? AND tanggal >= ? AND tanggal < ? AND deleted_at IS NULL
		) worker_refs
		WHERE worker_key IS NOT NULL
	`, mandorID, today, tomorrow).Scan(&activeWorkers)

	return &mandor.MandorDashboardStats{
		TodayHarvestCount: todayStats.HarvestCount,
		TodayTbsCount:     todayStats.TbsCount,
		TodayWeight:       todayStats.TotalWeight,
		PendingCount:      todayStats.PendingCount,
		ApprovedToday:     todayStats.ApprovedCount,
		RejectedToday:     todayStats.RejectedCount,
		ActiveWorkers:     activeWorkers,
		BlocksWorkedToday: todayStats.BlocksWorked,
		WeeklyTbs:         weeklyStats.TbsCount,
		WeeklyWeight:      weeklyStats.TotalWeight,
	}, nil
}

// GetMandorActivities returns recent activities for a mandor
func (s *PanenService) GetMandorActivities(ctx context.Context, mandorID string, limit int) ([]*mandor.MandorActivity, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	var records []models.HarvestRecord
	err := s.db.WithContext(ctx).
		Where("mandor_id = ?", mandorID).
		Order("updated_at DESC").
		Limit(limit).
		Find(&records).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get recent harvests: %w", err)
	}

	activities := make([]*mandor.MandorActivity, 0, len(records))
	for i, rec := range records {
		activityType := mandor.MandorActivityTypeHarvestCreated
		title := "Input Panen"
		description := fmt.Sprintf("Input %d janjang, %.1f kg", rec.JumlahJanjang, rec.BeratTbs)

		switch rec.Status {
		case models.HarvestApproved:
			activityType = mandor.MandorActivityTypeHarvestApproved
			title = "Panen Disetujui"
			description = fmt.Sprintf("Panen %d janjang disetujui", rec.JumlahJanjang)
		case models.HarvestRejected:
			activityType = mandor.MandorActivityTypeHarvestRejected
			title = "Panen Ditolak"
			if rec.RejectedReason != nil {
				description = *rec.RejectedReason
			} else {
				description = "Panen ditolak"
			}
		}

		// Get block name
		blockName := ""
		if rec.Block != nil {
			blockName = rec.Block.Name
		}

		activities = append(activities, &mandor.MandorActivity{
			ID:          fmt.Sprintf("activity-%d", i+1),
			Type:        activityType,
			Title:       title,
			Description: description,
			HarvestID:   &rec.ID,
			BlockName:   &blockName,
			Timestamp:   rec.UpdatedAt,
			Status:      string(rec.Status),
		})
	}

	return activities, nil
}

// GetMandorHistory returns paginated harvest history for a mandor
func (s *PanenService) GetMandorHistory(ctx context.Context, mandorID string, filter *mandor.MandorHistoryFilter) (*mandor.MandorHistoryResponse, error) {
	page := 1
	pageSize := 20

	if filter != nil {
		if filter.Page != nil && *filter.Page > 0 {
			page = int(*filter.Page)
		}
		if filter.PageSize != nil && *filter.PageSize > 0 && *filter.PageSize <= 100 {
			pageSize = int(*filter.PageSize)
		}
	}

	offset := (page - 1) * pageSize

	// Build query
	query := s.db.WithContext(ctx).Model(&models.HarvestRecord{}).Where("mandor_id = ?", mandorID)

	if filter != nil {
		if filter.Status != nil {
			query = query.Where("status = ?", string(*filter.Status))
		}
		if filter.DateFrom != nil {
			query = query.Where("tanggal >= ?", *filter.DateFrom)
		}
		if filter.DateTo != nil {
			query = query.Where("tanggal <= ?", *filter.DateTo)
		}
		if filter.BlockID != nil {
			query = query.Where("block_id = ?", *filter.BlockID)
		}
	}

	// Get total count
	var totalCount int64
	if err := query.Count(&totalCount).Error; err != nil {
		return nil, fmt.Errorf("failed to count history: %w", err)
	}

	// Get summary stats
	var summary struct {
		TotalHarvests int32   `gorm:"column:total_harvests"`
		TotalTbs      int32   `gorm:"column:total_tbs"`
		TotalWeight   float64 `gorm:"column:total_weight"`
		Approved      int32   `gorm:"column:approved"`
		Pending       int32   `gorm:"column:pending"`
		Rejected      int32   `gorm:"column:rejected"`
	}

	s.db.WithContext(ctx).Raw(`
		SELECT 
			COUNT(*) as total_harvests,
			COALESCE(SUM(jumlah_janjang), 0) as total_tbs,
			COALESCE(SUM(berat_tbs), 0) as total_weight,
			COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END), 0) as approved,
			COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) as pending,
			COALESCE(SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END), 0) as rejected
		FROM harvest_records
		WHERE mandor_id = ? AND deleted_at IS NULL
	`, mandorID).Scan(&summary)

	// Get paginated records
	var records []models.HarvestRecord
	orderBy := "tanggal DESC"
	if filter != nil && filter.SortBy != nil {
		switch *filter.SortBy {
		case mandor.MandorHistorySortFieldHarvestDate:
			orderBy = "tanggal"
		case mandor.MandorHistorySortFieldCreatedAt:
			orderBy = "created_at"
		case mandor.MandorHistorySortFieldWeight:
			orderBy = "berat_tbs"
		case mandor.MandorHistorySortFieldTbsCount:
			orderBy = "jumlah_janjang"
		case mandor.MandorHistorySortFieldStatus:
			orderBy = "status"
		}
		if filter.SortDirection != nil && *filter.SortDirection == common.SortDirectionAsc {
			orderBy += " ASC"
		} else {
			orderBy += " DESC"
		}
	}

	err := query.
		Preload("Block").
		Preload("Block.Division").
		Preload("Block.Division.Estate").
		Preload("Mandor").
		Order(orderBy).
		Offset(offset).
		Limit(pageSize).
		Find(&records).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get history: %w", err)
	}

	// Convert to GraphQL types
	items := make([]*mandor.MandorHarvestRecord, 0, len(records))
	for _, rec := range records {
		item := convertHarvestToMandorRecord(&rec)
		items = append(items, item)
	}

	hasMore := int64(offset+len(records)) < totalCount

	return &mandor.MandorHistoryResponse{
		Items:      items,
		TotalCount: int32(totalCount),
		HasMore:    hasMore,
		Summary: &mandor.MandorHistorySummary{
			TotalHarvests: summary.TotalHarvests,
			TotalTbs:      summary.TotalTbs,
			TotalWeight:   summary.TotalWeight,
			Approved:      summary.Approved,
			Pending:       summary.Pending,
			Rejected:      summary.Rejected,
		},
	}, nil
}

// convertHarvestToMandorRecord converts internal HarvestRecord to GraphQL MandorHarvestRecord
func convertHarvestToMandorRecord(rec *models.HarvestRecord) *mandor.MandorHarvestRecord {
	mandorName := ""
	if rec.Mandor != nil {
		mandorName = rec.Mandor.Name
	}

	blockName := ""
	divisionID := ""
	divisionName := ""
	estateID := ""
	estateName := ""

	if rec.Block != nil {
		blockName = rec.Block.Name
		if rec.Block.Division != nil {
			divisionID = rec.Block.Division.ID
			divisionName = rec.Block.Division.Name
			if rec.Block.Division.Estate != nil {
				estateID = rec.Block.Division.Estate.ID
				estateName = rec.Block.Division.Estate.Name
			}
		}
	}

	return &mandor.MandorHarvestRecord{
		ID:                rec.ID,
		LocalID:           rec.LocalID,
		Tanggal:           rec.Tanggal,
		MandorID:          rec.MandorID,
		MandorName:        mandorName,
		BlockID:           rec.BlockID,
		BlockName:         blockName,
		DivisionID:        divisionID,
		DivisionName:      divisionName,
		EstateID:          estateID,
		EstateName:        estateName,
		Karyawan:          displayHarvestWorker(rec.Karyawan, rec.Nik, rec.KaryawanID),
		JumlahJanjang:     rec.JumlahJanjang,
		JjgMatang:         rec.JjgMatang,
		JjgMentah:         rec.JjgMentah,
		JjgLewatMatang:    rec.JjgLewatMatang,
		JjgBusukAbnormal:  rec.JjgBusukAbnormal,
		JjgTangkaiPanjang: rec.JjgTangkaiPanjang,
		TotalBrondolan:    rec.TotalBrondolan,
		BeratTbs:          rec.BeratTbs,
		Status:            rec.Status,
		ApprovedBy:        rec.ApprovedBy,
		ApprovedAt:        rec.ApprovedAt,
		RejectedReason:    rec.RejectedReason,
		CreatedAt:         rec.CreatedAt,
		UpdatedAt:         rec.UpdatedAt,
		SyncStatus:        common.SyncStatusSynced,
		ServerVersion:     1,
	}
}

package resolvers

// This file contains satpam-related resolver implementations.

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"agrinovagraphql/server/internal/gatecheck/services"
	"agrinovagraphql/server/internal/graphql/domain/auth"
	commonDomain "agrinovagraphql/server/internal/graphql/domain/common"
	master "agrinovagraphql/server/internal/graphql/domain/master"
	satpam "agrinovagraphql/server/internal/graphql/domain/satpam"
	"agrinovagraphql/server/internal/graphql/generated"
	"agrinovagraphql/server/internal/middleware"
	notificationModels "agrinovagraphql/server/internal/notifications/models"
	notificationServices "agrinovagraphql/server/internal/notifications/services"

	"gorm.io/gorm"
)

// Mutation resolvers for Satpam

// RegisterGuest is the resolver for the registerGuest field.
func (r *mutationResolver) RegisterGuest(ctx context.Context, input satpam.CreateGuestRegistrationInput) (*satpam.GuestRegistrationResult, error) {
	if r.GateCheckService == nil {
		return &satpam.GuestRegistrationResult{
			Success: false,
			Message: "Gate check service not initialized",
		}, nil
	}

	result, err := r.GateCheckService.RegisterGuest(ctx, input)
	if err != nil {
		return nil, err
	}

	if result != nil && result.Success && result.GuestLog != nil {
		publishSatpamVehicleEntry(result.GuestLog)
		if err := r.persistSatpamVehicleEntryNotification(ctx, result.GuestLog); err != nil {
			fmt.Printf("failed to persist satpam vehicle entry notification: %v\n", err)
		}
		r.emitSatpamSyncUpdate(ctx, input.DeviceID)
	}

	return result, nil
}

// GenerateGuestQR is the resolver for the generateGuestQR field.
func (r *mutationResolver) GenerateGuestQR(ctx context.Context, guestLogID string, intent satpam.GateIntent, deviceID string, expiryMinutes *int32) (*satpam.SatpamQRToken, error) {
	if r.GateCheckService == nil {
		return nil, errors.New("gate check service not initialized")
	}
	return r.GateCheckService.GenerateGuestQR(ctx, guestLogID, intent, deviceID, expiryMinutes)
}

// ProcessGuestExit is the resolver for the processGuestExit field.
func (r *mutationResolver) ProcessGuestExit(ctx context.Context, input satpam.ProcessExitInput) (*satpam.ProcessExitResult, error) {
	if r.GateCheckService == nil {
		return &satpam.ProcessExitResult{
			Success:     false,
			Message:     "Gate check service not initialized",
			WasOverstay: false,
		}, nil
	}

	result, err := r.GateCheckService.ProcessGuestExit(ctx, input)
	if err != nil {
		return nil, err
	}

	if result != nil && result.Success && result.GuestLog != nil {
		publishSatpamVehicleExit(result.GuestLog)
		if err := r.persistSatpamVehicleExitNotification(ctx, result.GuestLog); err != nil {
			fmt.Printf("failed to persist satpam vehicle exit notification: %v\n", err)
		}
		if result.WasOverstay {
			publishSatpamOverstayAlert(buildSatpamOverstayAlert(result.GuestLog))
			if err := r.persistSatpamOverstayNotification(ctx, result.GuestLog); err != nil {
				fmt.Printf("failed to persist satpam overstay notification: %v\n", err)
			}
		}
		r.emitSatpamSyncUpdate(ctx, input.DeviceID)
	}

	return result, nil
}

// MarkOverstay is the resolver for the markOverstay field.
func (r *mutationResolver) MarkOverstay(ctx context.Context, guestLogID string, notes *string) (*satpam.SatpamGuestLog, error) {
	if r.GateCheckService == nil {
		return nil, errors.New("gate check service not initialized")
	}

	// Get user from context
	userID := middleware.GetUserFromContext(ctx)
	if userID == "" {
		return nil, errors.New("user tidak terautentikasi")
	}
	companyID := middleware.GetCompanyFromContext(ctx)

	// Find guest log
	var guestLog services.GuestLog
	if err := r.db.Where("id = ? AND company_id = ?", guestLogID, companyID).First(&guestLog).Error; err != nil {
		return nil, errors.New("data tamu tidak ditemukan")
	}

	// Mark overstay notes (overstay is time-based, derived from entry_time)
	if notes != nil {
		guestLog.Notes = notes
	}

	if err := r.db.Save(&guestLog).Error; err != nil {
		return nil, fmt.Errorf("gagal menyimpan status overstay: %w", err)
	}

	result := r.GateCheckService.ConvertToSatpamGuestLog(&guestLog)
	publishSatpamOverstayAlert(buildSatpamOverstayAlert(result))
	if err := r.persistSatpamOverstayNotification(ctx, result); err != nil {
		fmt.Printf("failed to persist satpam overstay notification: %v\n", err)
	}
	return result, nil
}

// SyncSatpamRecords is the resolver for the syncSatpamRecords field.
func (r *mutationResolver) SyncSatpamRecords(ctx context.Context, input satpam.SatpamSyncInput) (*satpam.SatpamSyncResult, error) {
	if r.GateCheckService == nil {
		return &satpam.SatpamSyncResult{
			Success: false,
			Message: "Gate check service not initialized",
		}, nil
	}

	result, err := r.GateCheckService.SyncSatpamRecords(ctx, input)
	if err != nil {
		return nil, err
	}

	if result != nil {
		if result.RecordsSuccessful > 0 {
			r.emitSatpamGuestLogEventsFromSync(ctx, input, result)
		}

		if result.Success {
			r.emitSatpamSyncUpdate(ctx, input.DeviceID)
		}
	}

	return result, nil
}

// SyncSatpamPhotos is the resolver for the syncSatpamPhotos field.
// SyncSatpamPhotos is the resolver for the syncSatpamPhotos field.
func (r *mutationResolver) SyncSatpamPhotos(ctx context.Context, input generated.SatpamPhotoSyncInput) (*generated.SatpamPhotoSyncResult, error) {
	if r.GateCheckService == nil {
		return &generated.SatpamPhotoSyncResult{
			PhotosProcessed: 0,
			Errors: []*commonDomain.PhotoUploadError{{
				PhotoID: "general",
				Error:   "Gate check service not initialized",
			}},
		}, nil
	}
	result, err := r.GateCheckService.SyncSatpamPhotos(ctx, input)
	if err != nil {
		return nil, err
	}

	if result != nil {
		r.emitSatpamSyncUpdate(ctx, input.DeviceID)
	}

	return result, nil
}

// SyncEmployeeLog is the resolver for the syncEmployeeLog field.
func (r *mutationResolver) SyncEmployeeLog(ctx context.Context, input generated.EmployeeLogSyncInput) (*generated.EmployeeLogSyncResult, error) {
	if r.GateCheckService == nil {
		return &generated.EmployeeLogSyncResult{
			Success: false,
			Message: "Gate check service not initialized",
		}, nil
	}
	result, err := r.GateCheckService.SyncEmployeeLog(ctx, input)
	if err != nil {
		return nil, err
	}

	if result != nil && result.Success {
		r.emitSatpamSyncUpdate(ctx, input.DeviceID)
	}

	return result, nil
}

// MarkSatpamSyncCompleted is the resolver for the markSatpamSyncCompleted field.
func (r *mutationResolver) MarkSatpamSyncCompleted(ctx context.Context, deviceID string, transactionID string) (bool, error) {
	// Mark sync completed - update sync status in database
	userID := middleware.GetUserFromContext(ctx)
	if userID == "" {
		return false, errors.New("user tidak terautentikasi")
	}

	// Update all pending sync items for this device/transaction
	result := r.db.Model(&services.GuestLog{}).
		Where("device_id = ? AND created_by = ? AND sync_status = ?", deviceID, userID, "PENDING").
		Update("sync_status", "SYNCED")

	if result.Error != nil {
		return false, result.Error
	}

	r.emitSatpamSyncUpdate(ctx, deviceID)
	return true, nil
}

// Query resolvers for Satpam

// SatpamDashboard is the resolver for the satpamDashboard field.
func (r *queryResolver) SatpamDashboard(ctx context.Context) (*satpam.SatpamDashboardData, error) {
	if r.GateCheckService == nil {
		return nil, errors.New("gate check service not initialized")
	}

	// Get user and company from context
	userID := middleware.GetUserFromContext(ctx)
	companyIDs, err := r.resolveGateCheckCompanyIDs(ctx)
	if err != nil {
		return nil, err
	}
	if len(companyIDs) == 0 {
		return nil, errors.New("company tidak ditemukan")
	}
	companyID := companyIDs[0]

	// Fetch user from database
	var user auth.User
	if err := r.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, errors.New("user tidak ditemukan")
	}

	// Get stats
	stats, err := r.GateCheckService.GetDashboardStats(ctx, []string{companyID})
	if err != nil {
		return nil, err
	}

	// Get vehicles inside
	vehicles, err := r.GateCheckService.GetVehiclesInside(ctx, nil, []string{companyID})
	if err != nil {
		return nil, err
	}

	// Get vehicles outside
	vehiclesOutside, err := r.GateCheckService.GetVehiclesOutside(ctx, nil)
	if err != nil {
		return nil, err
	}

	// Get vehicles completed today
	vehiclesCompleted, err := r.GateCheckService.GetVehiclesCompleted(ctx, nil)
	if err != nil {
		return nil, err
	}

	// Get recent activities (last 10)
	var recentLogs []services.GuestLog
	r.db.Where("company_id = ?", companyID).
		Order("created_at DESC").
		Limit(10).
		Find(&recentLogs)

	// Convert to SatpamActivity
	recentActivities := make([]*satpam.SatpamActivity, len(recentLogs))
	for i, log := range recentLogs {
		activityType := satpam.SatpamActivityTypeGuestRegistered
		intent := satpam.GateIntent(log.GenerationIntent)

		if log.GenerationIntent == "ENTRY" {
			activityType = satpam.SatpamActivityTypeVehicleEntry
		} else if log.GenerationIntent == "EXIT" {
			activityType = satpam.SatpamActivityTypeVehicleExit
		}

		description := ""
		if log.Destination != nil {
			description = *log.Destination
		}

		var gate *string
		if log.GenerationIntent == "ENTRY" {
			gate = log.EntryGate
		} else if log.GenerationIntent == "EXIT" {
			gate = log.ExitGate
		}

		recentActivities[i] = &satpam.SatpamActivity{
			ID:               log.ID,
			Type:             activityType,
			Title:            fmt.Sprintf("%s - %s", log.VehiclePlate, log.DriverName),
			Description:      description,
			Gate:             gate,
			GenerationIntent: &intent,
			EntityID:         &log.ID,
			Timestamp:        log.CreatedAt,
		}
	}

	// Build sync status
	var pendingCount int64
	r.db.Model(&services.GuestLog{}).
		Where("company_id = ? AND sync_status = ?", companyID, "PENDING").
		Count(&pendingCount)

	// Count distinct devices for this company
	var uniqueDeviceCount int64
	r.db.Model(&services.GuestLog{}).
		Where("company_id = ? AND device_id != ''", companyID).
		Distinct("device_id").
		Count(&uniqueDeviceCount)

	syncStatus := &satpam.SatpamSyncStatus{
		IsOnline:            true,
		PendingSyncCount:    int32(pendingCount),
		FailedSyncCount:     0,
		PhotosPendingUpload: 0,
		UniqueDeviceCount:   int32(uniqueDeviceCount),
	}

	// Build shift info with current shift data
	now := time.Now()
	shiftStart := time.Date(now.Year(), now.Month(), now.Day(), 6, 0, 0, 0, now.Location())
	shiftEnd := time.Date(now.Year(), now.Month(), now.Day(), 18, 0, 0, 0, now.Location())
	shiftName := "Shift Pagi"
	if now.Hour() >= 18 || now.Hour() < 6 {
		shiftStart = time.Date(now.Year(), now.Month(), now.Day(), 18, 0, 0, 0, now.Location())
		shiftEnd = time.Date(now.Year(), now.Month(), now.Day()+1, 6, 0, 0, 0, now.Location())
		shiftName = "Shift Malam"
	}

	shiftInfo := &satpam.ShiftInfo{
		ShiftName: shiftName,
		StartTime: shiftStart,
		EndTime:   &shiftEnd,
		IsActive:  true,
	}

	// Fetch company details
	var company master.Company
	if err := r.db.Where("id = ?", companyID).First(&company).Error; err != nil {
		return nil, errors.New("company tidak ditemukan")
	}

	// Build POS info
	posInfo := &satpam.POSInfo{
		PosNumber:   "POS-1",
		PosName:     "Gate Utama",
		CompanyID:   companyID,
		CompanyName: company.Name,
		IsActive:    true,
	}

	return &satpam.SatpamDashboardData{
		User:              &user,
		PosInfo:           posInfo,
		Stats:             stats,
		VehiclesInside:    vehicles,
		VehiclesOutside:   vehiclesOutside,
		VehiclesCompleted: vehiclesCompleted,
		RecentActivities:  recentActivities,
		SyncStatus:        syncStatus,
		ShiftInfo:         shiftInfo,
	}, nil
}

// SatpamDashboardStats is the resolver for the satpamDashboardStats field.
func (r *queryResolver) SatpamDashboardStats(ctx context.Context) (*satpam.SatpamDashboardStats, error) {
	if r.GateCheckService == nil {
		return nil, errors.New("gate check service not initialized")
	}

	companyIDs, err := r.resolveGateCheckCompanyIDs(ctx)
	if err != nil {
		return nil, err
	}

	return r.GateCheckService.GetDashboardStats(ctx, companyIDs)
}

// VehiclesInside is the resolver for the vehiclesInside field.
func (r *queryResolver) VehiclesInside(ctx context.Context, search *string) ([]*satpam.VehicleInsideInfo, error) {
	if r.GateCheckService == nil {
		return nil, errors.New("gate check service not initialized")
	}

	companyIDs, err := r.resolveGateCheckCompanyIDs(ctx)
	if err != nil {
		return nil, err
	}

	return r.GateCheckService.GetVehiclesInside(ctx, search, companyIDs)
}

// VehiclesOutside is the resolver for the vehiclesOutside field.
func (r *queryResolver) VehiclesOutside(ctx context.Context, search *string) ([]*satpam.VehicleOutsideInfo, error) {
	if r.GateCheckService == nil {
		return nil, errors.New("gate check service not initialized")
	}
	return r.GateCheckService.GetVehiclesOutside(ctx, search)
}

// SatpamSyncStatus is the resolver for the satpamSyncStatus field.
func (r *queryResolver) SatpamSyncStatus(ctx context.Context) (*satpam.SatpamSyncStatus, error) {
	userID := middleware.GetUserFromContext(ctx)
	if userID == "" {
		return nil, errors.New("user tidak terautentikasi")
	}

	var pendingCount int64
	r.db.Model(&services.GuestLog{}).
		Where("created_by = ? AND sync_status = ?", userID, "PENDING").
		Count(&pendingCount)

	var lastSyncLog services.GuestLog
	r.db.Where("created_by = ? AND sync_status = ?", userID, "SYNCED").
		Order("updated_at DESC").
		First(&lastSyncLog)

	var lastSyncTime *time.Time
	if lastSyncLog.ID != "" {
		lastSyncTime = &lastSyncLog.UpdatedAt
	}

	// Count distinct devices for this company
	companyID := middleware.GetCompanyFromContext(ctx)

	var uniqueDeviceCount int64
	if companyID != "" {
		// Count distinct devices with non-empty device_id
		r.db.Model(&services.GuestLog{}).
			Where("company_id = ? AND device_id != ''", companyID).
			Distinct("device_id").
			Count(&uniqueDeviceCount)
	}

	return &satpam.SatpamSyncStatus{
		IsOnline:            true,
		LastSyncAt:          lastSyncTime,
		PendingSyncCount:    int32(pendingCount),
		FailedSyncCount:     0,
		PhotosPendingUpload: 0,
		UniqueDeviceCount:   int32(uniqueDeviceCount),
	}, nil
}

// ValidateSatpamQR is the resolver for the validateSatpamQR field.
func (r *queryResolver) ValidateSatpamQR(ctx context.Context, input generated.ValidateQRInput) (*satpam.QRValidationResult, error) {
	if r.GateCheckService == nil {
		return &satpam.QRValidationResult{
			IsValid:           false,
			Message:           "Gate check service not initialized",
			AllowedOperations: []satpam.GateIntent{},
		}, nil
	}
	return r.GateCheckService.ValidateQR(ctx, input.QRData, satpam.GateIntent(input.ExpectedIntent), input.DeviceID)
}

// SearchGuest is the resolver for the searchGuest field.
func (r *queryResolver) SearchGuest(ctx context.Context, query string) ([]*satpam.SatpamGuestLog, error) {
	if r.GateCheckService == nil {
		return nil, errors.New("gate check service not initialized")
	}

	companyID := middleware.GetCompanyFromContext(ctx)
	if companyID == "" {
		return nil, errors.New("company tidak ditemukan")
	}

	var guestLogs []services.GuestLog
	searchTerm := "%" + query + "%"
	if err := r.db.Preload("Photos").Where("company_id = ? AND (vehicle_plate ILIKE ? OR driver_name ILIKE ?)",
		companyID, searchTerm, searchTerm).
		Order("created_at DESC").
		Limit(50).
		Find(&guestLogs).Error; err != nil {
		return nil, err
	}

	result := make([]*satpam.SatpamGuestLog, len(guestLogs))
	for i, log := range guestLogs {
		result[i] = r.GateCheckService.ConvertToSatpamGuestLog(&log)
	}

	return result, nil
}

// SatpamHistory is the resolver for the satpamHistory field.
func (r *queryResolver) SatpamHistory(ctx context.Context, filter *satpam.SatpamHistoryFilter) (*satpam.SatpamHistoryResponse, error) {
	if r.GateCheckService == nil {
		return nil, errors.New("gate check service not initialized")
	}

	companyIDs, err := r.resolveGateCheckCompanyIDs(ctx)
	if err != nil {
		return nil, err
	}

	dbQuery := r.db.Where("company_id IN ?", companyIDs)

	// Apply filters
	if filter != nil {
		// Status filter removed
		if filter.Search != nil && *filter.Search != "" {
			searchTerm := "%" + *filter.Search + "%"
			dbQuery = dbQuery.Where("vehicle_plate ILIKE ? OR driver_name ILIKE ?",
				searchTerm, searchTerm)
		}
		if filter.DateFrom != nil {
			dbQuery = dbQuery.Where("created_at >= ?", *filter.DateFrom)
		}
		if filter.DateTo != nil {
			dbQuery = dbQuery.Where("created_at <= ?", *filter.DateTo)
		}
	}

	// Count total
	var totalCount int64
	dbQuery.Model(&services.GuestLog{}).Count(&totalCount)

	// Apply pagination
	pageSize := int32(20)
	page := int32(1)
	if filter != nil {
		if filter.PageSize != nil {
			pageSize = *filter.PageSize
		}
		if filter.Page != nil {
			page = *filter.Page
		}
	}
	offset := (page - 1) * pageSize

	var guestLogs []services.GuestLog
	if err := dbQuery.Preload("Photos").Order("created_at DESC").
		Limit(int(pageSize)).
		Offset(int(offset)).
		Find(&guestLogs).Error; err != nil {
		return nil, err
	}

	items := make([]*satpam.SatpamGuestLog, len(guestLogs))
	for i, log := range guestLogs {
		items[i] = r.GateCheckService.ConvertToSatpamGuestLog(&log)
	}

	// Calculate summary statistics
	var totalEntries, totalExits, insideCount, overstayCount int64
	eightHoursAgo := time.Now().Add(-8 * time.Hour)

	// Use individual queries to avoid session sharing issues if Session() is problematic
	// Filter by company and search if provided
	getSummaryDB := func() *gorm.DB {
		db := r.db.Model(&services.GuestLog{}).Where("company_id IN ?", companyIDs)
		if filter != nil && filter.Search != nil && *filter.Search != "" {
			searchTerm := "%" + *filter.Search + "%"
			db = db.Where("vehicle_plate ILIKE ? OR driver_name ILIKE ?", searchTerm, searchTerm)
		}
		if filter != nil && filter.DateFrom != nil {
			db = db.Where("created_at >= ?", *filter.DateFrom)
		}
		if filter != nil && filter.DateTo != nil {
			db = db.Where("created_at <= ?", *filter.DateTo)
		}
		return db
	}

	getSummaryDB().Where("generation_intent = ?", "ENTRY").Count(&totalEntries)
	getSummaryDB().Where("generation_intent = ?", "EXIT").Count(&totalExits)
	getSummaryDB().Where("exit_time IS NULL AND entry_time IS NOT NULL").Count(&insideCount)
	getSummaryDB().Where("exit_time IS NULL AND entry_time IS NOT NULL AND entry_time < ?", eightHoursAgo).Count(&overstayCount)

	// Average duration in minutes
	var avgDuration float64
	getSummaryDB().Where("entry_time IS NOT NULL AND exit_time IS NOT NULL").
		Select("COALESCE(AVG(EXTRACT(EPOCH FROM (exit_time - entry_time)) / 60), 0)").
		Scan(&avgDuration)

	summary := &satpam.SatpamHistorySummary{
		TotalEntries:    int32(totalEntries),
		TotalExits:      int32(totalExits),
		CurrentlyInside: int32(insideCount),
		AvgDuration:     avgDuration,
		OverstayCount:   int32(overstayCount),
	}

	// Sync status stats (across ALL company records, not just current page)
	var syncedCount, pendingCount2, failedCount, conflictCount int64
	r.db.Model(&services.GuestLog{}).Where("company_id IN ? AND sync_status = ?", companyIDs, "SYNCED").Count(&syncedCount)
	r.db.Model(&services.GuestLog{}).Where("company_id IN ? AND sync_status = ?", companyIDs, "PENDING").Count(&pendingCount2)
	r.db.Model(&services.GuestLog{}).Where("company_id IN ? AND sync_status = ?", companyIDs, "FAILED").Count(&failedCount)
	r.db.Model(&services.GuestLog{}).Where("company_id IN ? AND sync_status = ?", companyIDs, "CONFLICT").Count(&conflictCount)

	syncStats := &satpam.SyncStatusStats{
		TotalSynced:   int32(syncedCount),
		TotalPending:  int32(pendingCount2),
		TotalFailed:   int32(failedCount),
		TotalConflict: int32(conflictCount),
	}

	return &satpam.SatpamHistoryResponse{
		Items:      items,
		TotalCount: int32(totalCount),
		HasMore:    offset+int32(len(items)) < int32(totalCount),
		Summary:    summary,
		SyncStats:  syncStats,
	}, nil
}

func (r *queryResolver) resolveGateCheckCompanyIDs(ctx context.Context) ([]string, error) {
	userID := middleware.GetUserFromContext(ctx)
	if userID == "" {
		return nil, errors.New("user tidak terautentikasi")
	}

	userRole := middleware.GetUserRoleFromContext(ctx)
	if userRole == auth.UserRoleAreaManager {
		var companyIDs []string
		if err := r.db.WithContext(ctx).
			Table("user_company_assignments").
			Where("user_id = ? AND is_active = ?", userID, true).
			Distinct("company_id").
			Pluck("company_id", &companyIDs).Error; err != nil {
			return nil, fmt.Errorf("gagal mengambil assignment company: %w", err)
		}

		if len(companyIDs) == 0 {
			return nil, errors.New("company assignment tidak ditemukan")
		}

		return companyIDs, nil
	}

	companyID := middleware.GetCompanyFromContext(ctx)
	if companyID != "" {
		return []string{companyID}, nil
	}

	var companyIDs []string
	if err := r.db.WithContext(ctx).
		Table("user_company_assignments").
		Where("user_id = ? AND is_active = ?", userID, true).
		Distinct("company_id").
		Pluck("company_id", &companyIDs).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil assignment company: %w", err)
	}

	if len(companyIDs) == 0 {
		return nil, errors.New("company tidak ditemukan")
	}

	return companyIDs, nil
}

func (r *Resolver) computeSatpamSyncStatus(ctx context.Context, deviceID string) (*satpam.SatpamSyncStatus, error) {
	normalizedDeviceID := strings.TrimSpace(deviceID)
	if normalizedDeviceID == "" {
		return nil, errors.New("deviceID is required")
	}

	var pendingCount int64
	if err := r.db.Model(&services.GuestLog{}).
		Where("device_id = ? AND sync_status = ?", normalizedDeviceID, "PENDING").
		Count(&pendingCount).Error; err != nil {
		return nil, fmt.Errorf("failed to count pending sync records: %w", err)
	}

	var failedCount int64
	if err := r.db.Model(&services.GuestLog{}).
		Where("device_id = ? AND sync_status = ?", normalizedDeviceID, "FAILED").
		Count(&failedCount).Error; err != nil {
		return nil, fmt.Errorf("failed to count failed sync records: %w", err)
	}

	var photosPendingUpload int64
	_ = r.db.Table("gate_check_photos").
		Where("device_id = ? AND sync_status = ?", normalizedDeviceID, "PENDING").
		Count(&photosPendingUpload).Error

	var lastSyncedRecord services.GuestLog
	var lastSyncAt *time.Time
	if err := r.db.Model(&services.GuestLog{}).
		Where("device_id = ? AND sync_status = ?", normalizedDeviceID, "SYNCED").
		Order("updated_at DESC").
		First(&lastSyncedRecord).Error; err == nil {
		lastSyncAt = &lastSyncedRecord.UpdatedAt
	}

	var uniqueDeviceCount int64
	uniqueDeviceQuery := r.db.Model(&services.GuestLog{}).Where("device_id != ''")
	if companyID := middleware.GetCompanyFromContext(ctx); companyID != "" {
		uniqueDeviceQuery = uniqueDeviceQuery.Where("company_id = ?", companyID)
	}
	_ = uniqueDeviceQuery.Distinct("device_id").Count(&uniqueDeviceCount).Error

	lastSyncResult := "SYNCED"
	switch {
	case failedCount > 0:
		lastSyncResult = "FAILED_ITEMS_PENDING"
	case pendingCount > 0:
		lastSyncResult = "PENDING_SYNC"
	}

	return &satpam.SatpamSyncStatus{
		IsOnline:            true,
		LastSyncAt:          lastSyncAt,
		PendingSyncCount:    int32(pendingCount),
		FailedSyncCount:     int32(failedCount),
		LastSyncResult:      &lastSyncResult,
		PhotosPendingUpload: int32(photosPendingUpload),
		UniqueDeviceCount:   int32(uniqueDeviceCount),
	}, nil
}

func (r *mutationResolver) emitSatpamSyncUpdate(ctx context.Context, deviceID string) {
	normalizedDeviceID := strings.TrimSpace(deviceID)
	if normalizedDeviceID == "" {
		return
	}

	status, err := r.computeSatpamSyncStatus(ctx, normalizedDeviceID)
	if err != nil || status == nil {
		return
	}

	publishSatpamSyncUpdate(normalizedDeviceID, status)
}

func (r *mutationResolver) emitSatpamGuestLogEventsFromSync(
	ctx context.Context,
	input satpam.SatpamSyncInput,
	result *satpam.SatpamSyncResult,
) {
	if r.GateCheckService == nil || result == nil {
		return
	}

	syncRecordsByLocalID := make(map[string]*satpam.SatpamGuestLogSyncRecord, len(input.GuestLogs))
	for _, record := range input.GuestLogs {
		if record == nil {
			continue
		}
		syncRecordsByLocalID[strings.TrimSpace(record.LocalID)] = record
	}

	emittedServerIDs := make(map[string]struct{}, len(result.Results))

	for _, item := range result.Results {
		if item == nil || !item.Success || item.ServerID == nil {
			continue
		}

		serverID := strings.TrimSpace(*item.ServerID)
		if serverID == "" {
			continue
		}

		if _, exists := emittedServerIDs[serverID]; exists {
			continue
		}

		sourceRecord := syncRecordsByLocalID[strings.TrimSpace(item.LocalID)]
		if sourceRecord != nil && sourceRecord.Operation == commonDomain.SyncOperationDelete {
			continue
		}

		var guestLog services.GuestLog
		if err := r.db.WithContext(ctx).Preload("Photos").Where("id = ?", serverID).First(&guestLog).Error; err != nil {
			continue
		}

		convertedGuestLog := r.GateCheckService.ConvertToSatpamGuestLog(&guestLog)
		if r.publishSatpamGuestLogEvent(convertedGuestLog) {
			if err := r.persistSatpamNotificationsForRecord(ctx, convertedGuestLog); err != nil {
				fmt.Printf("failed to persist synced satpam notification: %v\n", err)
			}
			emittedServerIDs[serverID] = struct{}{}
		}
	}
}

type satpamNotificationRecipient struct {
	ID   string        `gorm:"column:id"`
	Role auth.UserRole `gorm:"column:role"`
}

func normalizeSatpamNotificationRole(rawRole string) string {
	normalized := strings.TrimSpace(strings.ToUpper(rawRole))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	normalized = strings.ReplaceAll(normalized, " ", "_")
	normalized = strings.TrimPrefix(normalized, "ROLE_")

	if normalized == "AREA_AMANAGER" || normalized == "AREAMANAGER" {
		return string(auth.UserRoleAreaManager)
	}

	return normalized
}

func isSatpamNotificationRecipientRole(role string) bool {
	return role == string(auth.UserRoleManager) || role == string(auth.UserRoleAreaManager)
}

type satpamNotificationOptions struct {
	NotificationType notificationModels.NotificationType
	Priority         notificationModels.NotificationPriority
	Title            string
	Message          string
	IdempotencyKey   string
	Intent           string
}

func getSatpamNotificationIdentity(record *satpam.SatpamGuestLog) (string, string) {
	plate := strings.TrimSpace(record.VehiclePlate)
	if plate == "" {
		plate = "Kendaraan"
	}
	driverName := strings.TrimSpace(record.DriverName)
	return plate, driverName
}

func getSatpamRecordEntityID(record *satpam.SatpamGuestLog) string {
	if record == nil {
		return ""
	}

	entityID := strings.TrimSpace(record.ID)
	if entityID != "" {
		return entityID
	}

	if record.LocalID != nil {
		entityID = strings.TrimSpace(*record.LocalID)
	}
	if entityID != "" {
		return entityID
	}

	plate := strings.TrimSpace(record.VehiclePlate)
	if plate != "" {
		return plate
	}

	return "unknown"
}

func (r *mutationResolver) getExistingSatpamNotificationRecipientIDs(
	ctx context.Context,
	notificationType notificationModels.NotificationType,
	entityID string,
	recipientIDs []string,
) (map[string]struct{}, error) {
	existingRecipientIDs := make(map[string]struct{}, len(recipientIDs))
	if strings.TrimSpace(entityID) == "" || len(recipientIDs) == 0 {
		return existingRecipientIDs, nil
	}

	var existing []string
	if err := r.db.WithContext(ctx).
		Model(&notificationModels.Notification{}).
		Where(
			"type = ? AND related_entity_type = ? AND related_entity_id = ? AND recipient_id IN ?",
			notificationType,
			"GATE_CHECK_RECORD",
			entityID,
			recipientIDs,
		).
		Pluck("recipient_id", &existing).Error; err != nil {
		return nil, fmt.Errorf("failed to check existing notifications: %w", err)
	}

	for _, recipientID := range existing {
		existingRecipientIDs[recipientID] = struct{}{}
	}

	return existingRecipientIDs, nil
}

func (r *mutationResolver) persistSatpamNotification(
	ctx context.Context,
	record *satpam.SatpamGuestLog,
	options satpamNotificationOptions,
) error {
	if r.NotificationService == nil || record == nil {
		return nil
	}

	companyID := strings.TrimSpace(record.CompanyID)
	if companyID == "" {
		return nil
	}

	recipients, err := r.getSatpamNotificationRecipients(ctx, companyID)
	if err != nil {
		return err
	}
	if len(recipients) == 0 {
		return nil
	}

	recipientIDs := make([]string, 0, len(recipients))
	for _, recipient := range recipients {
		recipientIDs = append(recipientIDs, recipient.ID)
	}

	entityID := getSatpamRecordEntityID(record)
	existingRecipientIDs, err := r.getExistingSatpamNotificationRecipientIDs(
		ctx,
		options.NotificationType,
		entityID,
		recipientIDs,
	)
	if err != nil {
		return err
	}

	plate, driverName := getSatpamNotificationIdentity(record)

	for _, recipient := range recipients {
		if _, exists := existingRecipientIDs[recipient.ID]; exists {
			continue
		}

		input := &notificationServices.CreateNotificationInput{
			Type:               options.NotificationType,
			Priority:           options.Priority,
			Title:              options.Title,
			Message:            options.Message,
			IdempotencyKey:     options.IdempotencyKey,
			RecipientID:        recipient.ID,
			RecipientRole:      string(recipient.Role),
			RecipientCompanyID: companyID,
			RelatedEntityType:  "GATE_CHECK_RECORD",
			RelatedEntityID:    entityID,
			ActionURL:          "/dashboard/manager/gate-logs",
			ActionLabel:        "Lihat Log",
			Metadata: map[string]interface{}{
				"gateCheckId":   entityID,
				"vehicleNumber": plate,
				"driverName":    driverName,
				"intent":        options.Intent,
			},
			SenderID:   record.CreatedBy,
			SenderRole: "SATPAM",
		}

		if _, err := r.NotificationService.CreateNotification(ctx, input); err != nil {
			return fmt.Errorf("failed creating %s notification for recipient %s: %w", options.Intent, recipient.ID, err)
		}
	}

	return nil
}

func (r *mutationResolver) persistSatpamNotificationsForRecord(ctx context.Context, record *satpam.SatpamGuestLog) error {
	if record == nil {
		return nil
	}

	if isSatpamVehicleEntry(record) {
		if err := r.persistSatpamVehicleEntryNotification(ctx, record); err != nil {
			return err
		}
	}

	if isSatpamVehicleExit(record) {
		if err := r.persistSatpamVehicleExitNotification(ctx, record); err != nil {
			return err
		}
	}

	if isSatpamOverstayRecord(record) {
		if err := r.persistSatpamOverstayNotification(ctx, record); err != nil {
			return err
		}
	}

	return nil
}

func (r *mutationResolver) persistSatpamVehicleEntryNotification(ctx context.Context, record *satpam.SatpamGuestLog) error {
	if record == nil || !isSatpamVehicleEntry(record) {
		return nil
	}

	entityID := getSatpamRecordEntityID(record)
	plate, driverName := getSatpamNotificationIdentity(record)
	message := fmt.Sprintf("%s tercatat masuk.", plate)
	if driverName != "" {
		message = fmt.Sprintf("%s (%s) tercatat masuk.", plate, driverName)
	}

	return r.persistSatpamNotification(ctx, record, satpamNotificationOptions{
		NotificationType: notificationModels.NotificationTypeGateCheckCreated,
		Priority:         notificationModels.NotificationPriorityMedium,
		Title:            "Kendaraan Masuk",
		Message:          message,
		IdempotencyKey:   fmt.Sprintf("satpam:entry:%s", entityID),
		Intent:           "ENTRY",
	})
}

func (r *mutationResolver) persistSatpamVehicleExitNotification(ctx context.Context, record *satpam.SatpamGuestLog) error {
	if record == nil || !isSatpamVehicleExit(record) {
		return nil
	}

	entityID := getSatpamRecordEntityID(record)
	plate, driverName := getSatpamNotificationIdentity(record)
	message := fmt.Sprintf("%s tercatat keluar.", plate)
	if driverName != "" {
		message = fmt.Sprintf("%s (%s) tercatat keluar.", plate, driverName)
	}

	return r.persistSatpamNotification(ctx, record, satpamNotificationOptions{
		NotificationType: notificationModels.NotificationTypeGateCheckCompleted,
		Priority:         notificationModels.NotificationPriorityMedium,
		Title:            "Kendaraan Keluar",
		Message:          message,
		IdempotencyKey:   fmt.Sprintf("satpam:exit:%s", entityID),
		Intent:           "EXIT",
	})
}

func (r *mutationResolver) persistSatpamOverstayNotification(ctx context.Context, record *satpam.SatpamGuestLog) error {
	if record == nil {
		return nil
	}

	entityID := getSatpamRecordEntityID(record)
	plate, driverName := getSatpamNotificationIdentity(record)
	message := fmt.Sprintf("%s melewati batas waktu di dalam area.", plate)
	if driverName != "" {
		message = fmt.Sprintf("%s (%s) melewati batas waktu di dalam area.", plate, driverName)
	}

	return r.persistSatpamNotification(ctx, record, satpamNotificationOptions{
		NotificationType: notificationModels.NotificationTypeGateCheckAlert,
		Priority:         notificationModels.NotificationPriorityHigh,
		Title:            "Overstay Kendaraan",
		Message:          message,
		IdempotencyKey:   fmt.Sprintf("satpam:overstay:%s", entityID),
		Intent:           "OVERSTAY",
	})
}

func (r *mutationResolver) getSatpamNotificationRecipients(ctx context.Context, companyID string) ([]satpamNotificationRecipient, error) {
	if strings.TrimSpace(companyID) == "" {
		return nil, nil
	}

	var recipients []satpamNotificationRecipient
	if err := r.db.WithContext(ctx).
		Table("users AS u").
		Select("DISTINCT u.id AS id, u.role AS role").
		Joins("JOIN user_company_assignments AS uca ON uca.user_id = u.id AND uca.is_active = ?", true).
		Where("u.is_active = ?", true).
		Where("u.deleted_at IS NULL").
		Where("uca.company_id = ?", companyID).
		Scan(&recipients).Error; err != nil {
		return nil, fmt.Errorf("failed to resolve manager recipients: %w", err)
	}

	filteredRecipients := make([]satpamNotificationRecipient, 0, len(recipients))
	for _, recipient := range recipients {
		normalizedRole := normalizeSatpamNotificationRole(string(recipient.Role))
		if !isSatpamNotificationRecipientRole(normalizedRole) {
			continue
		}

		recipient.Role = auth.UserRole(normalizedRole)
		filteredRecipients = append(filteredRecipients, recipient)
	}

	return filteredRecipients, nil
}

func isSatpamVehicleEntry(record *satpam.SatpamGuestLog) bool {
	if record == nil {
		return false
	}

	if record.GenerationIntent != nil {
		return *record.GenerationIntent == satpam.GateIntentEntry
	}

	return record.EntryTime != nil && record.ExitTime == nil
}

func isSatpamVehicleExit(record *satpam.SatpamGuestLog) bool {
	if record == nil {
		return false
	}

	if record.GenerationIntent != nil {
		return *record.GenerationIntent == satpam.GateIntentExit
	}

	return record.ExitTime != nil
}

func isSatpamOverstayRecord(record *satpam.SatpamGuestLog) bool {
	if record == nil || record.EntryTime == nil || record.ExitTime != nil {
		return false
	}

	return time.Since(*record.EntryTime) > 8*time.Hour
}

func (r *mutationResolver) publishSatpamGuestLogEvent(record *satpam.SatpamGuestLog) bool {
	if record == nil {
		return false
	}

	if record.GenerationIntent != nil {
		switch *record.GenerationIntent {
		case satpam.GateIntentEntry:
			publishSatpamVehicleEntry(record)
			return true
		case satpam.GateIntentExit:
			publishSatpamVehicleExit(record)
			return true
		}
	}

	if record.ExitTime != nil {
		publishSatpamVehicleExit(record)
		return true
	}

	publishSatpamVehicleEntry(record)
	return true
}

func buildSatpamOverstayAlert(guestLog *satpam.SatpamGuestLog) *satpam.VehicleInsideInfo {
	if guestLog == nil {
		return nil
	}

	entryTime := time.Now()
	if guestLog.EntryTime != nil {
		entryTime = *guestLog.EntryTime
	}

	durationMinutes := int32(time.Since(entryTime).Minutes())
	if durationMinutes < 0 {
		durationMinutes = 0
	}

	return &satpam.VehicleInsideInfo{
		GuestLogID:          guestLog.ID,
		CompanyID:           guestLog.CompanyID,
		VehiclePlate:        guestLog.VehiclePlate,
		VehicleType:         guestLog.VehicleType,
		DriverName:          guestLog.DriverName,
		EntryTime:           entryTime,
		Duration:            durationMinutes,
		IsOverstay:          true,
		Destination:         guestLog.Destination,
		LoadType:            guestLog.LoadType,
		CargoVolume:         guestLog.CargoVolume,
		CargoOwner:          guestLog.CargoOwner,
		EstimatedWeight:     guestLog.EstimatedWeight,
		DeliveryOrderNumber: guestLog.DeliveryOrderNumber,
		IDCardNumber:        guestLog.IDCardNumber,
		SecondCargo:         guestLog.SecondCargo,
		EntryGate:           guestLog.EntryGate,
		Photos:              guestLog.Photos,
	}
}

// SatpamGuestLog is the resolver for the satpamGuestLog field.
func (r *queryResolver) SatpamGuestLog(ctx context.Context, id string) (*satpam.SatpamGuestLog, error) {
	if r.GateCheckService == nil {
		return nil, errors.New("gate check service not initialized")
	}

	companyID := middleware.GetCompanyFromContext(ctx)
	if companyID == "" {
		return nil, errors.New("company tidak ditemukan")
	}

	var guestLog services.GuestLog
	if err := r.db.Where("id = ? AND company_id = ?", id, companyID).First(&guestLog).Error; err != nil {
		return nil, errors.New("data tamu tidak ditemukan")
	}

	return r.GateCheckService.ConvertToSatpamGuestLog(&guestLog), nil
}

// SatpamPendingSyncItems is the resolver for the satpamPendingSyncItems field.
func (r *queryResolver) SatpamPendingSyncItems(ctx context.Context, deviceID string) ([]*generated.SatpamPendingSyncItem, error) {
	userID := middleware.GetUserFromContext(ctx)
	if userID == "" {
		return nil, errors.New("user tidak terautentikasi")
	}

	var guestLogs []services.GuestLog
	if err := r.db.Where("device_id = ? AND created_by = ? AND sync_status = ?", deviceID, userID, "PENDING").
		Find(&guestLogs).Error; err != nil {
		return nil, err
	}

	items := make([]*generated.SatpamPendingSyncItem, len(guestLogs))
	for i, log := range guestLogs {
		localID := log.ID
		if log.LocalID != nil {
			localID = *log.LocalID
		}
		items[i] = &generated.SatpamPendingSyncItem{
			ID:           localID,
			ServerID:     &log.ID,
			Operation:    commonDomain.SyncOperationCreate,
			LocalVersion: 1,
			LastUpdated:  log.UpdatedAt,
		}
	}

	return items, nil
}

// SatpamServerUpdates is the resolver for the satpamServerUpdates field.
func (r *queryResolver) SatpamServerUpdates(ctx context.Context, since time.Time, deviceID string) ([]*satpam.SatpamGuestLog, error) {
	if r.GateCheckService == nil {
		return nil, errors.New("gate check service not initialized")
	}

	companyID := middleware.GetCompanyFromContext(ctx)
	if companyID == "" {
		return nil, errors.New("company tidak ditemukan")
	}

	var guestLogs []services.GuestLog
	// STRICT FILTERING: Only return records owned by this device
	if err := r.db.Preload("Photos").Where("company_id = ? AND device_id = ? AND updated_at > ?", companyID, deviceID, since).
		Order("updated_at DESC").
		Find(&guestLogs).Error; err != nil {
		return nil, err
	}

	result := make([]*satpam.SatpamGuestLog, len(guestLogs))
	for i, log := range guestLogs {
		result[i] = r.GateCheckService.ConvertToSatpamGuestLog(&log)
	}

	return result, nil
}

// Subscription resolvers for Satpam

// SatpamVehicleEntry is the resolver for the satpamVehicleEntry subscription field.
func (r *subscriptionResolver) SatpamVehicleEntry(ctx context.Context) (<-chan *satpam.SatpamGuestLog, error) {
	return subscribeSatpamVehicleEntry(ctx)
}

// SatpamVehicleExit is the resolver for the satpamVehicleExit subscription field.
func (r *subscriptionResolver) SatpamVehicleExit(ctx context.Context) (<-chan *satpam.SatpamGuestLog, error) {
	return subscribeSatpamVehicleExit(ctx)
}

// SatpamOverstayAlert is the resolver for the satpamOverstayAlert subscription field.
func (r *subscriptionResolver) SatpamOverstayAlert(ctx context.Context) (<-chan *satpam.VehicleInsideInfo, error) {
	return subscribeSatpamOverstayAlert(ctx)
}

// SatpamSyncUpdate is the resolver for the satpamSyncUpdate subscription field.
func (r *subscriptionResolver) SatpamSyncUpdate(ctx context.Context, deviceID string) (<-chan *satpam.SatpamSyncStatus, error) {
	normalizedDeviceID := strings.TrimSpace(deviceID)
	if normalizedDeviceID == "" {
		return nil, fmt.Errorf("deviceID is required")
	}

	ch, err := subscribeSatpamSyncUpdate(ctx, normalizedDeviceID)
	if err != nil {
		return nil, err
	}

	if initialStatus, statusErr := r.computeSatpamSyncStatus(ctx, normalizedDeviceID); statusErr == nil && initialStatus != nil {
		publishSatpamSyncUpdate(normalizedDeviceID, initialStatus)
	}

	return ch, nil
}

// Type resolvers for Satpam

// satpamSyncItemResultResolver handles field resolvers for SatpamSyncItemResult
type satpamSyncItemResultResolver struct{ *Resolver }

// RecordType returns the record type for a sync item result
func (r *satpamSyncItemResultResolver) RecordType(ctx context.Context, obj *satpam.SatpamSyncItemResult) (string, error) {
	return obj.RecordType, nil
}

// ID returns the local ID for a sync item result
func (r *satpamSyncItemResultResolver) ID(ctx context.Context, obj *satpam.SatpamSyncItemResult) (string, error) {
	return obj.LocalID, nil
}

// satpamSyncResultResolver handles field resolvers for SatpamSyncResult
type satpamSyncResultResolver struct{ *Resolver }

// GuestLogsProcessed returns the number of guest logs processed
func (r *satpamSyncResultResolver) GuestLogsProcessed(ctx context.Context, obj *satpam.SatpamSyncResult) (int32, error) {
	return obj.RecordsProcessed, nil
}

// GuestLogsSuccessful returns the number of successful guest log syncs
func (r *satpamSyncResultResolver) GuestLogsSuccessful(ctx context.Context, obj *satpam.SatpamSyncResult) (int32, error) {
	return obj.RecordsSuccessful, nil
}

// GuestLogsFailed returns the number of failed guest log syncs
func (r *satpamSyncResultResolver) GuestLogsFailed(ctx context.Context, obj *satpam.SatpamSyncResult) (int32, error) {
	return obj.RecordsFailed, nil
}

// QRTokensProcessed returns the number of QR tokens processed (stub - always 0)
func (r *satpamSyncResultResolver) QRTokensProcessed(ctx context.Context, obj *satpam.SatpamSyncResult) (int32, error) {
	return 0, nil
}

// QRTokensSuccessful returns the number of successful QR token syncs (stub - always 0)
func (r *satpamSyncResultResolver) QRTokensSuccessful(ctx context.Context, obj *satpam.SatpamSyncResult) (int32, error) {
	return 0, nil
}

// shiftInfoResolver handles field resolvers for ShiftInfo
type shiftInfoResolver struct{ *Resolver }

// ShiftStart returns the shift start time
func (r *shiftInfoResolver) ShiftStart(ctx context.Context, obj *satpam.ShiftInfo) (*time.Time, error) {
	return &obj.StartTime, nil
}

// ShiftEnd returns the shift end time
func (r *shiftInfoResolver) ShiftEnd(ctx context.Context, obj *satpam.ShiftInfo) (*time.Time, error) {
	return obj.EndTime, nil
}

// EntriesThisShift returns the number of entries this shift
func (r *shiftInfoResolver) EntriesThisShift(ctx context.Context, obj *satpam.ShiftInfo) (int32, error) {
	companyID := middleware.GetCompanyFromContext(ctx)
	if companyID == "" {
		return 0, nil
	}

	var count int64
	// Use current time as upper bound if shift end is in future
	endTime := time.Now()
	if obj.EndTime != nil && obj.EndTime.Before(endTime) {
		endTime = *obj.EndTime
	}

	r.db.Model(&services.GuestLog{}).
		Where("company_id = ? AND created_at >= ? AND created_at <= ?", companyID, obj.StartTime, endTime).
		Count(&count)

	return int32(count), nil
}

// ExitsThisShift returns the number of exits this shift
func (r *shiftInfoResolver) ExitsThisShift(ctx context.Context, obj *satpam.ShiftInfo) (int32, error) {
	return 0, nil
}

// SatpamGuestLogResolver handles field resolvers for SatpamGuestLog
type satpamGuestLogResolver struct{ *Resolver }

// PhotoURL returns a representative photo URL for a guest log
func (r *satpamGuestLogResolver) PhotoURL(ctx context.Context, obj *satpam.SatpamGuestLog) (*string, error) {
	if len(obj.Photos) > 0 {
		return &obj.Photos[0].PhotoURL, nil
	}
	return nil, nil
}

// Photos returns the photos for a guest log
func (r *satpamGuestLogResolver) Photos(ctx context.Context, obj *satpam.SatpamGuestLog) ([]*generated.SatpamPhoto, error) {
	if obj.Photos == nil {
		return []*generated.SatpamPhoto{}, nil
	}

	result := make([]*generated.SatpamPhoto, len(obj.Photos))
	for i, p := range obj.Photos {
		result[i] = &generated.SatpamPhoto{
			ID:        p.ID,
			PhotoID:   p.PhotoID,
			PhotoType: p.PhotoType,
			PhotoURL:  p.PhotoURL,
			TakenAt:   p.TakenAt,
		}
	}
	return result, nil
}

// VehicleInsideInfoResolver handles field resolvers for VehicleInsideInfo
type vehicleInsideInfoResolver struct{ *Resolver }

// PhotoURL returns a representative photo URL for a vehicle inside
func (r *vehicleInsideInfoResolver) PhotoURL(ctx context.Context, obj *satpam.VehicleInsideInfo) (*string, error) {
	if len(obj.Photos) > 0 {
		return &obj.Photos[0].PhotoURL, nil
	}
	return nil, nil
}

// Photos returns the photos for a vehicle inside
func (r *vehicleInsideInfoResolver) Photos(ctx context.Context, obj *satpam.VehicleInsideInfo) ([]*generated.SatpamPhoto, error) {
	if obj.Photos == nil {
		return []*generated.SatpamPhoto{}, nil
	}

	result := make([]*generated.SatpamPhoto, len(obj.Photos))
	for i, p := range obj.Photos {
		result[i] = &generated.SatpamPhoto{
			ID:        p.ID,
			PhotoID:   p.PhotoID,
			PhotoType: p.PhotoType,
			PhotoURL:  p.PhotoURL,
			TakenAt:   p.TakenAt,
		}
	}
	return result, nil
}

// VehicleOutsideInfoResolver handles field resolvers for VehicleOutsideInfo
type vehicleOutsideInfoResolver struct{ *Resolver }

// PhotoURL returns a representative photo URL for a vehicle outside
func (r *vehicleOutsideInfoResolver) PhotoURL(ctx context.Context, obj *satpam.VehicleOutsideInfo) (*string, error) {
	if len(obj.Photos) > 0 {
		return &obj.Photos[0].PhotoURL, nil
	}
	return nil, nil
}

// Photos returns the photos for a vehicle outside
func (r *vehicleOutsideInfoResolver) Photos(ctx context.Context, obj *satpam.VehicleOutsideInfo) ([]*generated.SatpamPhoto, error) {
	if obj.Photos == nil {
		return []*generated.SatpamPhoto{}, nil
	}

	result := make([]*generated.SatpamPhoto, len(obj.Photos))
	for i, p := range obj.Photos {
		result[i] = &generated.SatpamPhoto{
			ID:        p.ID,
			PhotoID:   p.PhotoID,
			PhotoType: p.PhotoType,
			PhotoURL:  p.PhotoURL,
			TakenAt:   p.TakenAt,
		}
	}
	return result, nil
}

// VehicleCompletedInfoResolver handles field resolvers for VehicleCompletedInfo
type vehicleCompletedInfoResolver struct{ *Resolver }

// PhotoURL returns a representative photo URL for a vehicle completed
func (r *vehicleCompletedInfoResolver) PhotoURL(ctx context.Context, obj *satpam.VehicleCompletedInfo) (*string, error) {
	if len(obj.Photos) > 0 {
		return &obj.Photos[0].PhotoURL, nil
	}
	return nil, nil
}

// Photos returns the photos for a vehicle completed
func (r *vehicleCompletedInfoResolver) Photos(ctx context.Context, obj *satpam.VehicleCompletedInfo) ([]*generated.SatpamPhoto, error) {
	if obj.Photos == nil {
		return []*generated.SatpamPhoto{}, nil
	}

	result := make([]*generated.SatpamPhoto, len(obj.Photos))
	for i, p := range obj.Photos {
		result[i] = &generated.SatpamPhoto{
			ID:        p.ID,
			PhotoID:   p.PhotoID,
			PhotoType: p.PhotoType,
			PhotoURL:  p.PhotoURL,
			TakenAt:   p.TakenAt,
		}
	}
	return result, nil
}

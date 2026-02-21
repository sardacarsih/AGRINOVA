package resolvers

import (
	"encoding/json"
	"sort"

	authModels "agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/mandor"
	"agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/internal/graphql/generated"
	"agrinovagraphql/server/internal/master/models"
	"agrinovagraphql/server/internal/middleware"
	"context"
	"fmt"
	"time"
)

// Mutation resolvers for Super Admin

// CreateCompanyAdmin is the resolver for the createCompanyAdmin field.
func (r *mutationResolver) CreateCompanyAdmin(ctx context.Context, input generated.CreateCompanyAdminInput) (*generated.CompanyManagementResult, error) {
	panic(fmt.Errorf("not implemented: CreateCompanyAdmin - createCompanyAdmin"))
}

// UpdateCompanyAdmin is the resolver for the updateCompanyAdmin field.
func (r *mutationResolver) UpdateCompanyAdmin(ctx context.Context, input generated.UpdateCompanyAdminInput) (*generated.CompanyManagementResult, error) {
	panic(fmt.Errorf("not implemented: UpdateCompanyAdmin - updateCompanyAdmin"))
}

// SuspendCompany is the resolver for the suspendCompany field.
func (r *mutationResolver) SuspendCompany(ctx context.Context, companyID string, reason string) (*generated.CompanyManagementResult, error) {
	panic(fmt.Errorf("not implemented: SuspendCompany - suspendCompany"))
}

// ActivateCompany is the resolver for the activateCompany field.
func (r *mutationResolver) ActivateCompany(ctx context.Context, companyID string) (*generated.CompanyManagementResult, error) {
	panic(fmt.Errorf("not implemented: ActivateCompany - activateCompany"))
}

// DeleteCompanyAdmin is the resolver for the deleteCompanyAdmin field.
func (r *mutationResolver) DeleteCompanyAdmin(ctx context.Context, companyID string, confirmPhrase string) (*generated.CompanyManagementResult, error) {
	panic(fmt.Errorf("not implemented: DeleteCompanyAdmin - deleteCompanyAdmin"))
}

// ExtendCompanyTrial is the resolver for the extendCompanyTrial field.
func (r *mutationResolver) ExtendCompanyTrial(ctx context.Context, companyID string, days int32) (*generated.CompanyManagementResult, error) {
	panic(fmt.Errorf("not implemented: ExtendCompanyTrial - extendCompanyTrial"))
}

// UpdateCompanyPlan is the resolver for the updateCompanyPlan field.
func (r *mutationResolver) UpdateCompanyPlan(ctx context.Context, companyID string, planType generated.PlanType, maxUsers *int32, maxEstates *int32, maxStorageGb *float64) (*generated.CompanyManagementResult, error) {
	panic(fmt.Errorf("not implemented: UpdateCompanyPlan - updateCompanyPlan"))
}

// UpdateSystemSettings is the resolver for the updateSystemSettings field.
func (r *mutationResolver) UpdateSystemSettings(ctx context.Context, input generated.UpdateSystemSettingsInput) (*generated.SystemSettings, error) {
	panic(fmt.Errorf("not implemented: UpdateSystemSettings - updateSystemSettings"))
}

// ToggleFeatureFlag is the resolver for the toggleFeatureFlag field.
func (r *mutationResolver) ToggleFeatureFlag(ctx context.Context, key string, enabled bool) (*generated.FeatureFlag, error) {
	panic(fmt.Errorf("not implemented: ToggleFeatureFlag - toggleFeatureFlag"))
}

// SetFeatureForCompanies is the resolver for the setFeatureForCompanies field.
func (r *mutationResolver) SetFeatureForCompanies(ctx context.Context, key string, companyIds []string) (*generated.FeatureFlag, error) {
	panic(fmt.Errorf("not implemented: SetFeatureForCompanies - setFeatureForCompanies"))
}

// AcknowledgeAlert is the resolver for the acknowledgeAlert field.
func (r *mutationResolver) AcknowledgeAlert(ctx context.Context, alertID string) (*generated.SystemAlert, error) {
	panic(fmt.Errorf("not implemented: AcknowledgeAlert - acknowledgeAlert"))
}

// CreateSuperAdmin is the resolver for the createSuperAdmin field.
func (r *mutationResolver) CreateSuperAdmin(ctx context.Context, username string, email string, fullName string, password string) (*auth.User, error) {
	panic(fmt.Errorf("not implemented: CreateSuperAdmin - createSuperAdmin"))
}

// TriggerSystemBackup is the resolver for the triggerSystemBackup field.
func (r *mutationResolver) TriggerSystemBackup(ctx context.Context) (*generated.BackupResult, error) {
	panic(fmt.Errorf("not implemented: TriggerSystemBackup - triggerSystemBackup"))
}

// SetMaintenanceMode is the resolver for the setMaintenanceMode field.
func (r *mutationResolver) SetMaintenanceMode(ctx context.Context, enabled bool, message *string) (bool, error) {
	panic(fmt.Errorf("not implemented: SetMaintenanceMode - setMaintenanceMode"))
}

// Query resolvers for Super Admin

// SuperAdminDashboard is the resolver for the superAdminDashboard field.
func (r *queryResolver) SuperAdminDashboard(ctx context.Context) (*generated.SuperAdminDashboardData, error) {
	panic(fmt.Errorf("not implemented: SuperAdminDashboard - superAdminDashboard"))
}

// AllCompanies is the resolver for the allCompanies field.
func (r *queryResolver) AllCompanies(ctx context.Context, status *master.CompanyStatus, planType *generated.PlanType, search *string, page *int32, pageSize *int32) (*generated.CompanyListResponse, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	filters := &models.MasterFilters{}
	if search != nil {
		filters.Search = search
	}
	if status != nil {
		// Convert master.CompanyStatus to models.CompanyStatus
		// _ = models.CompanyStatus(*status)
		// TODO: Implement status filtering in MasterFilters if needed
	}

	p := 1
	if page != nil && *page > 0 {
		p = int(*page)
	}
	l := models.DefaultLimit
	if pageSize != nil && *pageSize > 0 {
		l = int(*pageSize)
	}
	offset := (p - 1) * l
	filters.Limit = &l
	filters.Offset = &offset

	companies, err := r.MasterResolver.GetMasterService().GetCompanies(ctx, filters, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch companies: %w", err)
	}

	total, err := r.MasterResolver.GetMasterService().CountCompanies(ctx, filters, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to count companies: %w", err)
	}

	resultCompanies := make([]*generated.CompanyDetailAdmin, len(companies))
	for i, c := range companies {
		resultCompanies[i] = r.convertCompanyToDetailAdmin(c)
	}

	return &generated.CompanyListResponse{
		Companies:  resultCompanies,
		TotalCount: int32(total),
		HasMore:    int64(p*l) < total,
	}, nil
}

// CompanyDetail is the resolver for the companyDetail field.
func (r *queryResolver) CompanyDetail(ctx context.Context, companyID string) (*generated.CompanyDetailAdmin, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	company, err := r.MasterResolver.GetMasterService().GetCompanyByID(ctx, companyID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch company detail: %w", err)
	}

	return r.convertCompanyToDetailAdmin(company), nil
}

// Helpers for Super Admin

func (r *queryResolver) convertCompanyToDetailAdmin(c *models.Company) *generated.CompanyDetailAdmin {
	if c == nil {
		return nil
	}

	return &generated.CompanyDetailAdmin{
		ID:        c.ID,
		Name:      c.Name,
		Code:      c.CompanyCode,
		Address:   c.Address,
		Phone:     c.Phone,
		Status:    master.CompanyStatus(c.Status),
		CreatedAt: c.CreatedAt,
		// Stubs for remaining fields
		Subscription: &generated.SubscriptionInfo{
			PlanName: "ENTERPRISE",
			PlanType: generated.PlanTypeEnterprise, // Using a valid enum value
		},
		Usage: &generated.CompanyUsageStats{
			CurrentUsers: 0,
			MaxUsers:     100,
		},
		Statistics: &generated.CompanyStatistics{
			TotalEstates: 0,
			TotalUsers:   0,
		},
	}
}

// SystemSettings is the resolver for the systemSettings field.
func (r *queryResolver) SystemSettings(ctx context.Context) (*generated.SystemSettings, error) {
	panic(fmt.Errorf("not implemented: SystemSettings - systemSettings"))
}

// SystemAlerts is the resolver for the systemAlerts field.
func (r *queryResolver) SystemAlerts(ctx context.Context, severity *generated.AlertSeverity, unacknowledgedOnly *bool, limit *int32) ([]*generated.SystemAlert, error) {
	panic(fmt.Errorf("not implemented: SystemAlerts - systemAlerts"))
}

// SystemActivityLogs is the resolver for the systemActivityLogs field.
func (r *queryResolver) SystemActivityLogs(ctx context.Context, activityType *generated.SystemActivityType, companyID *string, dateFrom *time.Time, dateTo *time.Time, limit *int32) ([]*generated.SystemActivityLog, error) {
	maxItems := 100
	if limit != nil && *limit > 0 && int(*limit) < maxItems {
		maxItems = int(*limit)
	}

	// Per-source limit: fetch more than needed from each source, then merge & sort
	perSourceLimit := maxItems * 2
	if perSourceLimit > 200 {
		perSourceLimit = 200
	}

	var activities []*generated.SystemActivityLog

	// ---- 1. Login Attempts → SECURITY_EVENT ----
	if activityType == nil || *activityType == generated.SystemActivityTypeSecurityEvent {
		var logins []authModels.LoginAttempt
		q := r.db.Order("attempted_at DESC").Limit(perSourceLimit)
		if dateFrom != nil {
			q = q.Where("attempted_at >= ?", *dateFrom)
		}
		if dateTo != nil {
			q = q.Where("attempted_at <= ?", *dateTo)
		}
		if err := q.Find(&logins).Error; err == nil {
			for _, l := range logins {
				desc := fmt.Sprintf("Login berhasil: %s (%s)", l.Username, l.Platform)
				severity := "success"
				if !l.IsSuccessful {
					desc = fmt.Sprintf("Login gagal: %s (%s)", l.Username, l.Platform)
					severity = "warning"
					if l.FailureReason != nil {
						desc += " - " + *l.FailureReason
					}
				}
				actType := generated.SystemActivityTypeSecurityEvent
				actorType := generated.ActorTypeSuperAdmin
				meta, _ := json.Marshal(map[string]string{
					"platform": string(l.Platform),
					"severity": severity,
				})
				metaStr := string(meta)
				entityType := "login_attempt"
				activities = append(activities, &generated.SystemActivityLog{
					ID:          l.ID,
					Type:        actType,
					Actor:       l.Username,
					ActorType:   actorType,
					Description: desc,
					IPAddress:   &l.IPAddress,
					EntityType:  &entityType,
					EntityID:    &l.ID,
					Metadata:    &metaStr,
					Timestamp:   l.AttemptedAt,
				})
			}
		}
	}

	// ---- 2. Security Events → SECURITY_EVENT ----
	if activityType == nil || *activityType == generated.SystemActivityTypeSecurityEvent {
		var events []authModels.SecurityEvent
		q := r.db.Preload("User").Order("created_at DESC").Limit(perSourceLimit)
		if dateFrom != nil {
			q = q.Where("created_at >= ?", *dateFrom)
		}
		if dateTo != nil {
			q = q.Where("created_at <= ?", *dateTo)
		}
		if err := q.Find(&events).Error; err == nil {
			for _, e := range events {
				actorName := e.User.Name
				if actorName == "" {
					actorName = e.User.Username
				}
				desc := fmt.Sprintf("Security event: %s", e.EventType)
				actType := generated.SystemActivityTypeSecurityEvent
				actorType := generated.ActorTypeSuperAdmin
				meta, _ := json.Marshal(map[string]string{
					"severity":  string(e.Severity),
					"eventType": string(e.EventType),
				})
				metaStr := string(meta)
				entityType := "security_event"
				activities = append(activities, &generated.SystemActivityLog{
					ID:          e.ID,
					Type:        actType,
					Actor:       actorName,
					ActorType:   actorType,
					Description: desc,
					IPAddress:   &e.IPAddress,
					EntityType:  &entityType,
					EntityID:    &e.ID,
					Metadata:    &metaStr,
					Timestamp:   e.CreatedAt,
				})
			}
		}
	}

	// ---- 3. New Users → ADMIN_CREATED ----
	if activityType == nil || *activityType == generated.SystemActivityTypeAdminCreated {
		var users []auth.User
		q := r.db.Order("created_at DESC").Limit(perSourceLimit)
		if dateFrom != nil {
			q = q.Where("created_at >= ?", *dateFrom)
		}
		if dateTo != nil {
			q = q.Where("created_at <= ?", *dateTo)
		}
		if err := q.Find(&users).Error; err == nil {
			for _, u := range users {
				name := u.Name
				if name == "" {
					name = u.Username
				}
				desc := fmt.Sprintf("Pengguna baru terdaftar: %s (%s)", name, u.Role)
				actType := generated.SystemActivityTypeAdminCreated
				actorType := generated.ActorTypeSystem
				meta, _ := json.Marshal(map[string]string{
					"severity": "success",
					"role":     string(u.Role),
					"userId":   u.ID,
				})
				metaStr := string(meta)
				entityType := "user"
				activities = append(activities, &generated.SystemActivityLog{
					ID:          "user_" + u.ID,
					Type:        actType,
					Actor:       "System",
					ActorType:   actorType,
					Description: desc,
					EntityType:  &entityType,
					EntityID:    &u.ID,
					Metadata:    &metaStr,
					Timestamp:   u.CreatedAt,
				})
			}
		}
	}

	// ---- 4. Companies → COMPANY_CREATED ----
	if activityType == nil || *activityType == generated.SystemActivityTypeCompanyCreated {
		var companies []master.Company
		q := r.db.Order("created_at DESC").Limit(perSourceLimit)
		if companyID != nil {
			q = q.Where("id = ?", *companyID)
		}
		if dateFrom != nil {
			q = q.Where("created_at >= ?", *dateFrom)
		}
		if dateTo != nil {
			q = q.Where("created_at <= ?", *dateTo)
		}
		if err := q.Find(&companies).Error; err == nil {
			for _, c := range companies {
				desc := fmt.Sprintf("Perusahaan terdaftar: %s (%s)", c.Name, c.CompanyCode)
				actType := generated.SystemActivityTypeCompanyCreated
				actorType := generated.ActorTypeSystem
				companyName := c.Name
				meta, _ := json.Marshal(map[string]string{
					"severity":    "success",
					"companyCode": c.CompanyCode,
				})
				metaStr := string(meta)
				entityType := "company"
				activities = append(activities, &generated.SystemActivityLog{
					ID:          "company_" + c.ID,
					Type:        actType,
					Actor:       "System",
					ActorType:   actorType,
					Description: desc,
					CompanyID:   &c.ID,
					CompanyName: &companyName,
					EntityType:  &entityType,
					EntityID:    &c.ID,
					Metadata:    &metaStr,
					Timestamp:   c.CreatedAt,
				})
			}
		}
	}

	// ---- 5. Harvest Records (APPROVED) → COMPANY_UPDATED ----
	if activityType == nil || *activityType == generated.SystemActivityTypeCompanyUpdated {
		var harvests []mandor.HarvestRecord
		q := r.db.Preload("Mandor").Preload("Block").
			Where("status = ?", "APPROVED").
			Order("updated_at DESC").Limit(perSourceLimit)
		if dateFrom != nil {
			q = q.Where("updated_at >= ?", *dateFrom)
		}
		if dateTo != nil {
			q = q.Where("updated_at <= ?", *dateTo)
		}
		if err := q.Find(&harvests).Error; err == nil {
			for _, h := range harvests {
				mandorName := "Unknown"
				if h.Mandor != nil {
					mandorName = h.Mandor.Name
					if mandorName == "" {
						mandorName = h.Mandor.Username
					}
				}
				blockName := ""
				if h.Block != nil {
					blockName = h.Block.Name
				}
				desc := fmt.Sprintf("Panen disetujui: %s - %.1f kg (%d janjang)", blockName, h.BeratTbs, h.JumlahJanjang)
				actType := generated.SystemActivityTypeCompanyUpdated
				actorType := generated.ActorTypeSuperAdmin
				meta, _ := json.Marshal(map[string]string{
					"severity":  "info",
					"mandor":    mandorName,
					"beratTbs":  fmt.Sprintf("%.1f", h.BeratTbs),
					"janjang":   fmt.Sprintf("%d", h.JumlahJanjang),
					"blockName": blockName,
				})
				metaStr := string(meta)
				entityType := "harvest_record"
				activities = append(activities, &generated.SystemActivityLog{
					ID:          "harvest_" + h.ID,
					Type:        actType,
					Actor:       mandorName,
					ActorType:   actorType,
					Description: desc,
					EntityType:  &entityType,
					EntityID:    &h.ID,
					Metadata:    &metaStr,
					Timestamp:   h.UpdatedAt,
				})
			}
		}
	}

	// Sort all activities by timestamp DESC
	sort.Slice(activities, func(i, j int) bool {
		return activities[i].Timestamp.After(activities[j].Timestamp)
	})

	// Apply limit
	if len(activities) > maxItems {
		activities = activities[:maxItems]
	}

	return activities, nil
}

// FeatureFlags is the resolver for the featureFlags field.
func (r *queryResolver) FeatureFlags(ctx context.Context) ([]*generated.FeatureFlag, error) {
	panic(fmt.Errorf("not implemented: FeatureFlags - featureFlags"))
}

// PlatformStatistics is the resolver for the platformStatistics field.
func (r *queryResolver) PlatformStatistics(ctx context.Context, dateFrom *time.Time, dateTo *time.Time) (*generated.PlatformStats, error) {
	panic(fmt.Errorf("not implemented: PlatformStatistics - platformStatistics"))
}

// SuperAdmins is the resolver for the superAdmins field.
func (r *queryResolver) SuperAdmins(ctx context.Context) ([]*auth.User, error) {
	panic(fmt.Errorf("not implemented: SuperAdmins - superAdmins"))
}

// Subscription resolvers for Super Admin

// NewSystemAlert is the resolver for the newSystemAlert subscription field.
func (r *subscriptionResolver) NewSystemAlert(ctx context.Context) (<-chan *generated.SystemAlert, error) {
	return nil, fmt.Errorf("not implemented")
}

// SystemStatusChange is the resolver for the systemStatusChange subscription field.
func (r *subscriptionResolver) SystemStatusChange(ctx context.Context) (<-chan *generated.SystemOverview, error) {
	return nil, fmt.Errorf("not implemented")
}

// AdminDeviceStats is the resolver for the adminDeviceStats field.
func (r *queryResolver) AdminDeviceStats(ctx context.Context) ([]*generated.CompanyDeviceStat, error) {
	type Result struct {
		CompanyID   string
		CompanyName string
		DeviceCount int32
		LastActive  *time.Time
	}

	var results []Result

	// Query distinct devices per company from guest logs
	// We join with companies table to get company name
	err := r.db.Table("gate_guest_logs").
		Select("gate_guest_logs.company_id, companies.name as company_name, COUNT(DISTINCT gate_guest_logs.device_id) as device_count, MAX(gate_guest_logs.created_at) as last_active").
		Joins("JOIN companies ON companies.id = gate_guest_logs.company_id").
		Where("gate_guest_logs.device_id != ''").
		Group("gate_guest_logs.company_id, companies.name").
		Order("device_count DESC").
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to fetch device stats: %w", err)
	}

	stats := make([]*generated.CompanyDeviceStat, len(results))
	for i, res := range results {
		stats[i] = &generated.CompanyDeviceStat{
			CompanyID:   res.CompanyID,
			CompanyName: res.CompanyName,
			DeviceCount: res.DeviceCount,
			LastActive:  res.LastActive,
		}
	}

	return stats, nil
}

// NewCompanyRegistration is the resolver for the newCompanyRegistration subscription field.
func (r *subscriptionResolver) NewCompanyRegistration(ctx context.Context) (<-chan *generated.CompanyDetailAdmin, error) {
	return nil, fmt.Errorf("not implemented")
}

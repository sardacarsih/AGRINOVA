package resolvers

// This file contains area_manager-related resolver implementations.

import (
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/common"
	"agrinovagraphql/server/internal/graphql/domain/manager"
	"agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/internal/graphql/generated"
	"agrinovagraphql/server/internal/middleware"
	"context"
	"fmt"
	"strings"
	"time"
)

// amEstateAgg is a read-only aggregate projection for one estate.
type amEstateAgg struct {
	ID          string  `gorm:"column:id"`
	Name        string  `gorm:"column:name"`
	TodayProd   float64 `gorm:"column:today_prod"`
	MonthlyProd float64 `gorm:"column:monthly_prod"`
	MonthTarget float64 `gorm:"column:month_target"`
}

// amCompanyAgg is a read-only aggregate projection for one company.
type amCompanyAgg struct {
	ID           string  `gorm:"column:id"`
	Name         string  `gorm:"column:name"`
	EstatesCount int32   `gorm:"column:estates_count"`
	DivsCount    int32   `gorm:"column:divs_count"`
	EmpCount     int32   `gorm:"column:emp_count"`
	TodayProd    float64 `gorm:"column:today_prod"`
	MonthlyProd  float64 `gorm:"column:monthly_prod"`
	MonthTarget  float64 `gorm:"column:month_target"`
}

type amBudgetWorkflowSummaryAgg struct {
	DraftCount    int32 `gorm:"column:draft_count"`
	ReviewCount   int32 `gorm:"column:review_count"`
	ApprovedCount int32 `gorm:"column:approved_count"`
	TotalCount    int32 `gorm:"column:total_count"`
}

// areaManagerCompanyIDs returns company IDs assigned to the area manager.
// This is the primary scope boundary for all AREA_MANAGER data access.
func (r *Resolver) areaManagerCompanyIDs(ctx context.Context, userID string) ([]string, error) {
	var ids []string
	err := r.db.WithContext(ctx).
		Table("user_company_assignments").
		Select("company_id").
		Where("user_id = ? AND is_active = true", userID).
		Scan(&ids).Error
	if err != nil {
		return nil, fmt.Errorf("failed to load company scope: %w", err)
	}
	return ids, nil
}

// computeCompanyStatus maps target achievement percentage to a health status.
func computeCompanyStatus(achievement float64) generated.CompanyHealthStatus {
	switch {
	case achievement >= 90:
		return generated.CompanyHealthStatusExcellent
	case achievement >= 75:
		return generated.CompanyHealthStatusGood
	case achievement >= 50:
		return generated.CompanyHealthStatusWarning
	default:
		return generated.CompanyHealthStatusCritical
	}
}

// computeAmTrend derives trend by comparing today's production to average daily production.
func computeAmTrend(todayProd, periodProd float64, dayCount int) common.TrendDirection {
	if dayCount <= 0 || periodProd <= 0 {
		return common.TrendDirectionStable
	}
	avgDailyRate := periodProd / float64(dayCount)
	if avgDailyRate <= 0 {
		return common.TrendDirectionStable
	}
	ratio := todayProd / avgDailyRate
	switch {
	case ratio >= 1.1:
		return common.TrendDirectionUp
	case ratio < 0.9:
		return common.TrendDirectionDown
	default:
		return common.TrendDirectionStable
	}
}

// containsString checks if a slice contains a string value.
func containsString(slice []string, val string) bool {
	for _, s := range slice {
		if s == val {
			return true
		}
	}
	return false
}

func normalizeDashboardDateRange(dateFrom, dateTo *time.Time) (time.Time, time.Time, int, error) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	end := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, now.Location())

	if dateFrom != nil {
		start = time.Date(dateFrom.Year(), dateFrom.Month(), dateFrom.Day(), 0, 0, 0, 0, dateFrom.Location())
	}
	if dateTo != nil {
		end = time.Date(dateTo.Year(), dateTo.Month(), dateTo.Day(), 23, 59, 59, 0, dateTo.Location())
	}
	if end.Before(start) {
		return time.Time{}, time.Time{}, 0, fmt.Errorf("invalid date range: dateTo must be on or after dateFrom")
	}

	dayCount := int(end.Sub(start).Hours()/24) + 1
	if dayCount < 1 {
		dayCount = 1
	}
	return start, end, dayCount, nil
}

func dateOnlyString(value time.Time) string {
	return value.Format("2006-01-02")
}

func (r *Resolver) areaManagerCompanyAggregates(
	ctx context.Context,
	companyIDs []string,
	todayDate time.Time,
	periodStart time.Time,
	periodEnd time.Time,
	targetPeriod string,
) ([]amCompanyAgg, error) {
	dayStartStr := dateOnlyString(todayDate)
	dayEndStr := dateOnlyString(todayDate.AddDate(0, 0, 1))
	periodStartStr := dateOnlyString(periodStart)
	periodEndExclusiveStr := dateOnlyString(periodEnd.AddDate(0, 0, 1))

	var rows []amCompanyAgg
	err := r.db.WithContext(ctx).Raw(`
		WITH scoped_companies AS (
			SELECT
				c.id,
				c.name
			FROM companies c
			WHERE c.id IN ?
		),
		company_estates AS (
			SELECT
				e.id AS estate_id,
				e.company_id
			FROM estates e
			JOIN scoped_companies sc ON sc.id = e.company_id
		),
		estate_counts AS (
			SELECT
				ce.company_id,
				COUNT(*) AS estates_count
			FROM company_estates ce
			GROUP BY ce.company_id
		),
		division_counts AS (
			SELECT
				ce.company_id,
				COUNT(d.id) AS divs_count
			FROM company_estates ce
			LEFT JOIN divisions d ON d.estate_id = ce.estate_id
			GROUP BY ce.company_id
		),
		employee_counts AS (
			SELECT
				uca.company_id,
				COUNT(DISTINCT uca.user_id) AS emp_count
			FROM user_company_assignments uca
			JOIN scoped_companies sc ON sc.id = uca.company_id
			WHERE uca.is_active = true
			GROUP BY uca.company_id
		),
		production_totals AS (
			SELECT
				ce.company_id,
				COALESCE(SUM(
					CASE
						WHEN hr.tanggal >= ?::date AND hr.tanggal < ?::date THEN hr.berat_tbs
						ELSE 0
					END
				), 0) AS today_prod,
				COALESCE(SUM(hr.berat_tbs), 0) AS monthly_prod
			FROM company_estates ce
			LEFT JOIN harvest_records hr
				ON hr.estate_id = ce.estate_id
			   AND hr.status IN ('APPROVED', 'PENDING')
			   AND hr.tanggal >= ?::date
			   AND hr.tanggal < ?::date
			GROUP BY ce.company_id
		),
		target_totals AS (
			SELECT
				ce.company_id,
				COALESCE(SUM(b.target_ton), 0) AS month_target
			FROM company_estates ce
			LEFT JOIN divisions d ON d.estate_id = ce.estate_id
			LEFT JOIN manager_division_production_budgets b
				ON b.division_id = d.id
			   AND b.period_month = ?
			   AND b.workflow_status = 'APPROVED'
			GROUP BY ce.company_id
		)
		SELECT
			sc.id,
			sc.name,
			COALESCE(ec.estates_count, 0) AS estates_count,
			COALESCE(dc.divs_count, 0) AS divs_count,
			COALESCE(emc.emp_count, 0) AS emp_count,
			COALESCE(pt.today_prod, 0) AS today_prod,
			COALESCE(pt.monthly_prod, 0) AS monthly_prod,
			COALESCE(tt.month_target, 0) AS month_target
		FROM scoped_companies sc
		LEFT JOIN estate_counts ec ON ec.company_id = sc.id
		LEFT JOIN division_counts dc ON dc.company_id = sc.id
		LEFT JOIN employee_counts emc ON emc.company_id = sc.id
		LEFT JOIN production_totals pt ON pt.company_id = sc.id
		LEFT JOIN target_totals tt ON tt.company_id = sc.id
	`, companyIDs, dayStartStr, dayEndStr, periodStartStr, periodEndExclusiveStr, targetPeriod).Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate company stats: %w", err)
	}

	return rows, nil
}

func (r *Resolver) areaManagerEstateAggregates(
	ctx context.Context,
	companyID string,
	todayDate time.Time,
	periodStart time.Time,
	periodEnd time.Time,
	targetPeriod string,
) ([]amEstateAgg, error) {
	dayStartStr := dateOnlyString(todayDate)
	dayEndStr := dateOnlyString(todayDate.AddDate(0, 0, 1))
	periodStartStr := dateOnlyString(periodStart)
	periodEndExclusiveStr := dateOnlyString(periodEnd.AddDate(0, 0, 1))

	var rows []amEstateAgg
	err := r.db.WithContext(ctx).Raw(`
		WITH company_estates AS (
			SELECT
				e.id,
				e.name
			FROM estates e
			WHERE e.company_id = ?
		),
		production_totals AS (
			SELECT
				ce.id AS estate_id,
				COALESCE(SUM(
					CASE
						WHEN hr.tanggal >= ?::date AND hr.tanggal < ?::date THEN hr.berat_tbs
						ELSE 0
					END
				), 0) AS today_prod,
				COALESCE(SUM(hr.berat_tbs), 0) AS monthly_prod
			FROM company_estates ce
			LEFT JOIN harvest_records hr
				ON hr.estate_id = ce.id
			   AND hr.status IN ('APPROVED', 'PENDING')
			   AND hr.tanggal >= ?::date
			   AND hr.tanggal < ?::date
			GROUP BY ce.id
		),
		target_totals AS (
			SELECT
				ce.id AS estate_id,
				COALESCE(SUM(b.target_ton), 0) AS month_target
			FROM company_estates ce
			LEFT JOIN divisions d ON d.estate_id = ce.id
			LEFT JOIN manager_division_production_budgets b
				ON b.division_id = d.id
			   AND b.period_month = ?
			   AND b.workflow_status = 'APPROVED'
			GROUP BY ce.id
		)
		SELECT
			ce.id,
			ce.name,
			COALESCE(pt.today_prod, 0) AS today_prod,
			COALESCE(pt.monthly_prod, 0) AS monthly_prod,
			COALESCE(tt.month_target, 0) AS month_target
		FROM company_estates ce
		LEFT JOIN production_totals pt ON pt.estate_id = ce.id
		LEFT JOIN target_totals tt ON tt.estate_id = ce.id
	`, companyID, dayStartStr, dayEndStr, periodStartStr, periodEndExclusiveStr, targetPeriod).Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to fetch estate details: %w", err)
	}

	return rows, nil
}

// ─── Query Resolvers ─────────────────────────────────────────────────────────

// AreaManagerDashboard is the resolver for the areaManagerDashboard field.
func (r *queryResolver) AreaManagerDashboard(
	ctx context.Context,
	dateFrom *time.Time,
	dateTo *time.Time,
	companyID *string,
) (*generated.AreaManagerDashboardData, error) {
	userID := strings.TrimSpace(middleware.GetCurrentUserID(ctx))
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	rangeStart, rangeEnd, rangeDays, err := normalizeDashboardDateRange(dateFrom, dateTo)
	if err != nil {
		return nil, err
	}
	targetPeriod := rangeEnd.Format("2006-01")

	// 1. Scope: get assigned company IDs
	companyIDs, err := r.areaManagerCompanyIDs(ctx, userID)
	if err != nil {
		return nil, err
	}

	// 2. Fetch current user record
	var user auth.User
	if err := r.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}

	// Empty scope → return minimal valid response (avoids SQL errors on empty IN clause)
	if len(companyIDs) == 0 {
		return &generated.AreaManagerDashboardData{
			User:                  &user,
			Companies:             []*master.Company{},
			Stats:                 &generated.AreaManagerStats{},
			CompanyPerformance:    []*generated.CompanyPerformanceData{},
			BudgetWorkflowSummary: &generated.AreaManagerBudgetWorkflowSummary{},
			Alerts:                []*generated.RegionalAlert{},
			ActionItems:           []*generated.AreaManagerActionItem{},
		}, nil
	}

	// 3. Fetch company master records
	var companies []*master.Company
	if err := r.db.WithContext(ctx).Where("id IN ?", companyIDs).Find(&companies).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch companies: %w", err)
	}

	workflowCompanyIDs := companyIDs
	if companyID != nil {
		targetCompanyID := strings.TrimSpace(*companyID)
		if targetCompanyID != "" {
			if !containsString(companyIDs, targetCompanyID) {
				return nil, fmt.Errorf("company not in scope")
			}
			workflowCompanyIDs = []string{targetCompanyID}
		}
	}

	// 4. Aggregate budget workflow statuses for current target period.
	var workflowSummaryRow amBudgetWorkflowSummaryAgg
	err = r.db.WithContext(ctx).Raw(`
		SELECT
			COALESCE(SUM(CASE WHEN b.workflow_status = 'DRAFT' THEN 1 ELSE 0 END), 0)    AS draft_count,
			COALESCE(SUM(CASE WHEN b.workflow_status = 'REVIEW' THEN 1 ELSE 0 END), 0)   AS review_count,
			COALESCE(SUM(CASE WHEN b.workflow_status = 'APPROVED' THEN 1 ELSE 0 END), 0) AS approved_count,
			COALESCE(COUNT(b.id), 0)                                                      AS total_count
		FROM manager_division_production_budgets b
		JOIN divisions d ON d.id = b.division_id
		JOIN estates e ON e.id = d.estate_id
		WHERE e.company_id IN ?
		  AND b.period_month = ?
	`, workflowCompanyIDs, targetPeriod).Scan(&workflowSummaryRow).Error
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate budget workflow summary: %w", err)
	}

	// 5. Aggregate production and structural stats per company
	rows, err := r.areaManagerCompanyAggregates(ctx, companyIDs, rangeEnd, rangeStart, rangeEnd, targetPeriod)
	if err != nil {
		return nil, err
	}

	// 6. Build company performance list and aggregate totals
	var (
		totalEstates     int32
		totalDivs        int32
		totalEmp         int32
		totalTodayProd   float64
		totalMonthlyProd float64
		totalMonthTarget float64
		topCompanyName   string
		topAchievement   float64
	)

	companyPerf := make([]*generated.CompanyPerformanceData, 0, len(rows))
	for _, row := range rows {
		achievement := float64(0)
		if row.MonthTarget > 0 {
			achievement = row.MonthlyProd / row.MonthTarget * 100
		}

		totalEstates += row.EstatesCount
		totalDivs += row.DivsCount
		totalEmp += row.EmpCount
		totalTodayProd += row.TodayProd
		totalMonthlyProd += row.MonthlyProd
		totalMonthTarget += row.MonthTarget

		if achievement > topAchievement {
			topAchievement = achievement
			topCompanyName = row.Name
		}

		companyPerf = append(companyPerf, &generated.CompanyPerformanceData{
			CompanyID:          row.ID,
			CompanyName:        row.Name,
			EstatesCount:       row.EstatesCount,
			TodayProduction:    row.TodayProd,
			MonthlyProduction:  row.MonthlyProd,
			TargetAchievement:  achievement,
			EfficiencyScore:    achievement, // proxy; real efficiency requires labor data
			QualityScore:       0,           // requires grading data
			Trend:              computeAmTrend(row.TodayProd, row.MonthlyProd, rangeDays),
			Status:             computeCompanyStatus(achievement),
			PendingIssues:      0,
			EstatesPerformance: []*generated.CompanyEstatePerformance{},
		})
	}

	// 7. Compute overall achievement
	overallAchievement := float64(0)
	if totalMonthTarget > 0 {
		overallAchievement = totalMonthlyProd / totalMonthTarget * 100
	}

	var topCompanyPtr *string
	if topCompanyName != "" {
		topCompanyPtr = &topCompanyName
	}

	stats := &generated.AreaManagerStats{
		TotalCompanies:       int32(len(companies)),
		TotalEstates:         totalEstates,
		TotalDivisions:       totalDivs,
		TotalEmployees:       totalEmp,
		TodayProduction:      totalTodayProd,
		MonthlyProduction:    totalMonthlyProd,
		MonthlyTarget:        totalMonthTarget,
		TargetAchievement:    overallAchievement,
		AvgEfficiency:        overallAchievement,
		TopPerformingCompany: topCompanyPtr,
	}

	workflowSummary := &generated.AreaManagerBudgetWorkflowSummary{
		Draft:    workflowSummaryRow.DraftCount,
		Review:   workflowSummaryRow.ReviewCount,
		Approved: workflowSummaryRow.ApprovedCount,
		Total:    workflowSummaryRow.TotalCount,
	}

	return &generated.AreaManagerDashboardData{
		User:                  &user,
		Companies:             companies,
		Stats:                 stats,
		CompanyPerformance:    companyPerf,
		BudgetWorkflowSummary: workflowSummary,
		Alerts:                []*generated.RegionalAlert{},
		ActionItems:           []*generated.AreaManagerActionItem{},
	}, nil
}

// AreaManagerCompanyDetail is the resolver for the areaManagerCompanyDetail field.
func (r *queryResolver) AreaManagerCompanyDetail(ctx context.Context, companyID string) (*generated.CompanyPerformanceData, error) {
	userID := strings.TrimSpace(middleware.GetCurrentUserID(ctx))
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	companyIDs, err := r.areaManagerCompanyIDs(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !containsString(companyIDs, companyID) {
		return nil, fmt.Errorf("company not in scope")
	}

	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	targetPeriod := now.Format("2006-01")

	rows, err := r.areaManagerCompanyAggregates(ctx, []string{companyID}, todayStart, monthStart, todayStart, targetPeriod)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("company not found")
	}

	row := rows[0]
	achievement := float64(0)
	if row.MonthTarget > 0 {
		achievement = row.MonthlyProd / row.MonthTarget * 100
	}

	estateRows, err := r.areaManagerEstateAggregates(ctx, companyID, todayStart, monthStart, todayStart, targetPeriod)
	if err != nil {
		return nil, err
	}

	estatesPerf := make([]*generated.CompanyEstatePerformance, 0, len(estateRows))
	for _, er := range estateRows {
		estAchievement := float64(0)
		if er.MonthTarget > 0 {
			estAchievement = er.MonthlyProd / er.MonthTarget * 100
		}

		estatesPerf = append(estatesPerf, &generated.CompanyEstatePerformance{
			EstateID:          er.ID,
			EstateName:        er.Name,
			TodayProduction:   er.TodayProd,
			MonthlyProduction: er.MonthlyProd,
			MonthlyTarget:     er.MonthTarget,
			TargetAchievement: estAchievement,
			QualityScore:      0,
		})
	}

	return &generated.CompanyPerformanceData{
		CompanyID:          row.ID,
		CompanyName:        row.Name,
		EstatesCount:       row.EstatesCount,
		TodayProduction:    row.TodayProd,
		MonthlyProduction:  row.MonthlyProd,
		TargetAchievement:  achievement,
		EfficiencyScore:    achievement,
		QualityScore:       0,
		Trend:              computeAmTrend(row.TodayProd, row.MonthlyProd, now.Day()),
		Status:             computeCompanyStatus(achievement),
		PendingIssues:      0,
		EstatesPerformance: estatesPerf,
	}, nil
}

// ManagersUnderArea is the resolver for the managersUnderArea field.
func (r *queryResolver) ManagersUnderArea(ctx context.Context, companyID *string) ([]*auth.User, error) {
	userID := strings.TrimSpace(middleware.GetCurrentUserID(ctx))
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	companyIDs, err := r.areaManagerCompanyIDs(ctx, userID)
	if err != nil {
		return nil, err
	}
	if len(companyIDs) == 0 {
		return []*auth.User{}, nil
	}

	// Apply optional single-company filter (with scope validation)
	scopeIDs := companyIDs
	if companyID != nil {
		if !containsString(companyIDs, *companyID) {
			return nil, fmt.Errorf("company not in scope")
		}
		scopeIDs = []string{*companyID}
	}

	var users []*auth.User
	err = r.db.WithContext(ctx).
		Table("users u").
		Joins("JOIN user_company_assignments uca ON uca.user_id = u.id AND uca.is_active = true").
		Where("uca.company_id IN ? AND u.role = ? AND u.is_active = true", scopeIDs, auth.UserRoleManager).
		Order("u.name ASC").
		Find(&users).Error
	if err != nil {
		return nil, fmt.Errorf("failed to fetch managers: %w", err)
	}
	return users, nil
}

// RegionalAlerts is the resolver for the regionalAlerts field.
// Alerts are derived from live production data since no dedicated alerts table exists yet.
func (r *queryResolver) RegionalAlerts(ctx context.Context, companyID *string, severity *generated.AlertSeverity, unreadOnly *bool) ([]*generated.RegionalAlert, error) {
	userID := strings.TrimSpace(middleware.GetCurrentUserID(ctx))
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	companyIDs, err := r.areaManagerCompanyIDs(ctx, userID)
	if err != nil {
		return nil, err
	}
	if len(companyIDs) == 0 {
		return []*generated.RegionalAlert{}, nil
	}

	// Apply optional company filter
	scopeIDs := companyIDs
	if companyID != nil {
		if !containsString(companyIDs, *companyID) {
			return nil, fmt.Errorf("company not in scope")
		}
		scopeIDs = []string{*companyID}
	}

	// Aggregate company production to derive alerts
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	rows, err := r.areaManagerCompanyAggregates(ctx, scopeIDs, todayStart, monthStart, todayStart, now.Format("2006-01"))
	if err != nil {
		return nil, fmt.Errorf("failed to derive alerts: %w", err)
	}

	today := time.Now().Format("2006-01-02")
	var alerts []*generated.RegionalAlert

	for _, row := range rows {
		achievement := float64(0)
		if row.MonthTarget > 0 {
			achievement = row.MonthlyProd / row.MonthTarget * 100
		}

		var alertSeverity generated.AlertSeverity
		var title, message string
		switch {
		case achievement < 60:
			alertSeverity = generated.AlertSeverityCritical
			title = fmt.Sprintf("Produksi Kritis: %s", row.Name)
			message = fmt.Sprintf("Pencapaian target bulan ini hanya %.1f%% dari target.", achievement)
		case achievement < 75:
			alertSeverity = generated.AlertSeverityWarning
			title = fmt.Sprintf("Produksi di Bawah Target: %s", row.Name)
			message = fmt.Sprintf("Pencapaian target bulan ini %.1f%%, perlu perhatian.", achievement)
		default:
			continue // no alert for healthy companies
		}

		// Apply severity filter
		if severity != nil && *severity != alertSeverity {
			continue
		}

		companyIDVal := row.ID
		companyNameVal := row.Name
		alerts = append(alerts, &generated.RegionalAlert{
			ID:          fmt.Sprintf("alert-%s-%s", row.ID, today),
			Type:        generated.RegionalAlertTypeProductionBelowTarget,
			Severity:    alertSeverity,
			Title:       title,
			Message:     message,
			CompanyID:   &companyIDVal,
			CompanyName: &companyNameVal,
			CreatedAt:   time.Now(),
			IsRead:      false,
		})
	}

	// unreadOnly filter: all synthetic alerts are unread, so no-op when true
	// (all alerts already have IsRead = false)

	if alerts == nil {
		return []*generated.RegionalAlert{}, nil
	}
	return alerts, nil
}

// ─── Safe Stubs (not yet implemented, returns error instead of panic) ─────────

// AreaManagerAnalytics is the resolver for the areaManagerAnalytics field.
func (r *queryResolver) AreaManagerAnalytics(ctx context.Context, period manager.AnalyticsPeriod, companyIds []string) (*generated.AreaManagerAnalyticsData, error) {
	return nil, fmt.Errorf("not yet implemented: areaManagerAnalytics")
}

// RegionalReport is the resolver for the regionalReport field.
func (r *queryResolver) RegionalReport(ctx context.Context, period manager.AnalyticsPeriod, month *int32, year *int32) (*generated.RegionalReportData, error) {
	return nil, fmt.Errorf("not yet implemented: regionalReport")
}

// ─── Mutation Resolvers ───────────────────────────────────────────────────────

// CreateAreaManagerActionItem is the resolver for the createAreaManagerActionItem field.
func (r *mutationResolver) CreateAreaManagerActionItem(ctx context.Context, typeArg generated.AreaManagerActionType, title string, description *string, companyID *string, priority common.ActionPriority, dueDate *time.Time) (*generated.AreaManagerActionItem, error) {
	return nil, fmt.Errorf("not yet implemented: createAreaManagerActionItem")
}

// UpdateActionItemStatus is the resolver for the updateActionItemStatus field.
func (r *mutationResolver) UpdateActionItemStatus(ctx context.Context, itemID string, status common.ActionItemStatus, notes *string) (*generated.AreaManagerActionItem, error) {
	return nil, fmt.Errorf("not yet implemented: updateActionItemStatus")
}

// SetCompanyTarget is the resolver for the setCompanyTarget field.
func (r *mutationResolver) SetCompanyTarget(ctx context.Context, companyID string, targetType string, targetValue float64, period string) (bool, error) {
	return false, fmt.Errorf("not yet implemented: setCompanyTarget")
}

// MarkAlertRead is the resolver for the markAlertRead field.
func (r *mutationResolver) MarkAlertRead(ctx context.Context, alertID string) (bool, error) {
	return false, fmt.Errorf("not yet implemented: markAlertRead")
}

// ─── Subscription Resolvers ───────────────────────────────────────────────────

// NewRegionalAlert is the resolver for the newRegionalAlert subscription field.
func (r *subscriptionResolver) NewRegionalAlert(ctx context.Context) (<-chan *generated.RegionalAlert, error) {
	return nil, fmt.Errorf("not implemented: NewRegionalAlert")
}

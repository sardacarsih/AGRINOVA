package resolvers

import (
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/common"
	"agrinovagraphql/server/internal/graphql/domain/manager"
	"agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/internal/graphql/generated"
	"agrinovagraphql/server/internal/middleware"
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var managerBudgetPeriodRegex = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])$`)

type managerDivisionProductionBudgetWrite struct {
	ID          string    `gorm:"column:id"`
	DivisionID  string    `gorm:"column:division_id"`
	PeriodMonth string    `gorm:"column:period_month"`
	TargetTon   float64   `gorm:"column:target_ton"`
	PlannedCost float64   `gorm:"column:planned_cost"`
	ActualCost  float64   `gorm:"column:actual_cost"`
	Notes       *string   `gorm:"column:notes"`
	CreatedBy   string    `gorm:"column:created_by"`
	CreatedAt   time.Time `gorm:"column:created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at"`
}

func (managerDivisionProductionBudgetWrite) TableName() string {
	return "manager_division_production_budgets"
}

type managerDivisionProductionBudgetRead struct {
	ID            string    `gorm:"column:id"`
	DivisionID    string    `gorm:"column:division_id"`
	DivisionName  string    `gorm:"column:division_name"`
	EstateID      string    `gorm:"column:estate_id"`
	EstateName    string    `gorm:"column:estate_name"`
	PeriodMonth   string    `gorm:"column:period_month"`
	TargetTon     float64   `gorm:"column:target_ton"`
	PlannedCost   float64   `gorm:"column:planned_cost"`
	ActualCost    float64   `gorm:"column:actual_cost"`
	Notes         *string   `gorm:"column:notes"`
	CreatedByName string    `gorm:"column:created_by_name"`
	CreatedAt     time.Time `gorm:"column:created_at"`
	UpdatedAt     time.Time `gorm:"column:updated_at"`
}

type managerDivisionOptionRead struct {
	ID         string `gorm:"column:id"`
	Name       string `gorm:"column:name"`
	EstateID   string `gorm:"column:estate_id"`
	EstateName string `gorm:"column:estate_name"`
}

func (r *Resolver) applyManagerDivisionScope(query *gorm.DB, userID string, role auth.UserRole) *gorm.DB {
	trimmedUserID := strings.TrimSpace(userID)
	if trimmedUserID == "" {
		return query.Where("1 = 0")
	}

	// AREA_MANAGER: company-level scope remains valid and may include all estates/divisions under company assignment.
	if role == auth.UserRoleAreaManager {
		return query.Where(`
			(
				EXISTS (
					SELECT 1
					FROM user_division_assignments uda
					WHERE uda.user_id = ?
					  AND uda.division_id = d.id
					  AND uda.is_active = true
				)
				OR EXISTS (
					SELECT 1
					FROM user_estate_assignments uea
					WHERE uea.user_id = ?
					  AND uea.estate_id = d.estate_id
					  AND uea.is_active = true
				)
				OR EXISTS (
					SELECT 1
					FROM user_company_assignments uca
					WHERE uca.user_id = ?
					  AND uca.company_id = e.company_id
					  AND uca.is_active = true
				)
			)
		`, trimmedUserID, trimmedUserID, trimmedUserID)
	}

	// MANAGER and other roles: strictly follow explicit division/estate assignments.
	// No company-assignment fallback for manager scope.
	return query.Where(`
		(
			EXISTS (
				SELECT 1
				FROM user_division_assignments uda
				WHERE uda.user_id = ?
				  AND uda.division_id = d.id
				  AND uda.is_active = true
			)
			OR EXISTS (
				SELECT 1
				FROM user_estate_assignments uea
				WHERE uea.user_id = ?
				  AND uea.estate_id = d.estate_id
				  AND uea.is_active = true
			)
		)
	`, trimmedUserID, trimmedUserID)
}

func (r *Resolver) managerBudgetScopedQuery(ctx context.Context, userID string, role auth.UserRole) *gorm.DB {
	base := r.db.WithContext(ctx).
		Table("manager_division_production_budgets b").
		Select(`
			b.id,
			b.division_id,
			d.name AS division_name,
			d.estate_id,
			e.name AS estate_name,
			b.period_month,
			b.target_ton,
			b.planned_cost,
			b.actual_cost,
			b.notes,
			COALESCE(NULLIF(u.name, ''), u.username, '-') AS created_by_name,
			b.created_at,
			b.updated_at
		`).
		Joins("JOIN divisions d ON d.id = b.division_id").
		Joins("JOIN estates e ON e.id = d.estate_id").
		Joins("LEFT JOIN users u ON u.id = b.created_by")

	return r.applyManagerDivisionScope(base, userID, role)
}

func (r *Resolver) managerCanAccessDivision(ctx context.Context, userID, divisionID string, role auth.UserRole) (bool, error) {
	var count int64
	base := r.db.WithContext(ctx).
		Table("divisions d").
		Joins("JOIN estates e ON e.id = d.estate_id").
		Where("d.id = ?", divisionID)

	err := r.applyManagerDivisionScope(base, userID, role).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func normalizeManagerBudgetPeriod(raw string) (string, error) {
	period := strings.TrimSpace(raw)
	if !managerBudgetPeriodRegex.MatchString(period) {
		return "", fmt.Errorf("periode harus format YYYY-MM")
	}
	return period, nil
}

func normalizeManagerBudgetNotes(raw *string) *string {
	if raw == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func (r *Resolver) managerBudgetDuplicateExists(
	ctx context.Context,
	divisionID string,
	periodMonth string,
	excludeID *string,
) (bool, error) {
	query := r.db.WithContext(ctx).
		Table("manager_division_production_budgets").
		Where("division_id = ? AND period_month = ?", divisionID, periodMonth)

	if excludeID != nil && strings.TrimSpace(*excludeID) != "" {
		query = query.Where("id <> ?", *excludeID)
	}

	var count int64
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}

	return count > 0, nil
}

func (r *Resolver) managerBudgetByID(ctx context.Context, userID, budgetID string) (*managerDivisionProductionBudgetRead, error) {
	role := middleware.GetUserRoleFromContext(ctx)
	var row managerDivisionProductionBudgetRead
	err := r.managerBudgetScopedQuery(ctx, userID, role).
		Where("b.id = ?", budgetID).
		Take(&row).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("budget tidak ditemukan atau tidak dalam scope manager")
		}
		return nil, err
	}
	return &row, nil
}

func convertManagerBudgetToGraphQL(row *managerDivisionProductionBudgetRead) *generated.ManagerDivisionProductionBudget {
	if row == nil {
		return nil
	}
	createdBy := row.CreatedByName
	if strings.TrimSpace(createdBy) == "" {
		createdBy = "-"
	}

	return &generated.ManagerDivisionProductionBudget{
		ID:           row.ID,
		DivisionID:   row.DivisionID,
		DivisionName: row.DivisionName,
		EstateID:     row.EstateID,
		EstateName:   row.EstateName,
		Period:       row.PeriodMonth,
		TargetTon:    row.TargetTon,
		PlannedCost:  row.PlannedCost,
		ActualCost:   row.ActualCost,
		Notes:        row.Notes,
		CreatedBy:    createdBy,
		CreatedAt:    row.CreatedAt,
		UpdatedAt:    row.UpdatedAt,
	}
}

func isManagerBudgetUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	normalized := strings.ToLower(err.Error())
	return strings.Contains(normalized, "uq_mdpb_division_period") ||
		strings.Contains(normalized, "duplicate key value")
}

// ============================================================================
// SCAN ROWS
// ============================================================================

type managerStatsRow struct {
	TotalEstates     int32   `gorm:"column:total_estates"`
	TotalDivisions   int32   `gorm:"column:total_divisions"`
	TotalBlocks      int32   `gorm:"column:total_blocks"`
	TotalEmployees   int32   `gorm:"column:total_employees"`
	TodayProd        float64 `gorm:"column:today_prod"`
	WeeklyProd       float64 `gorm:"column:weekly_prod"`
	MonthlyProd      float64 `gorm:"column:monthly_prod"`
	MonthTarget      float64 `gorm:"column:month_target"`
	PendingApprovals int32   `gorm:"column:pending_approvals"`
	ActiveHarvests   int32   `gorm:"column:active_harvests"`
}

type managerPerformerRow struct {
	UserID         string  `gorm:"column:user_id"`
	Name           string  `gorm:"column:name"`
	Role           string  `gorm:"column:role"`
	AssignmentName string  `gorm:"column:assignment_name"`
	RecordsToday   int32   `gorm:"column:records_today"`
	PerfScore      float64 `gorm:"column:perf_score"`
}

type managerHarvestStatusRow struct {
	TotalToday    int32   `gorm:"column:total_today"`
	PendingCount  int32   `gorm:"column:pending_count"`
	ApprovedCount int32   `gorm:"column:approved_count"`
	RejectedCount int32   `gorm:"column:rejected_count"`
	YesterdayProd float64 `gorm:"column:yesterday_prod"`
}

type managerTrendRow struct {
	PeriodKey time.Time `gorm:"column:period_key"`
	Value     float64   `gorm:"column:value"`
}

type managerDivPerfRow struct {
	DivisionID   string  `gorm:"column:division_id"`
	DivisionName string  `gorm:"column:division_name"`
	Production   float64 `gorm:"column:production"`
	Target       float64 `gorm:"column:target"`
}

type managerQualityRow struct {
	StatusVal string `gorm:"column:status_val"`
	Cnt       int32  `gorm:"column:cnt"`
}

// ============================================================================
// FIELD RESOLVERS
// ============================================================================

// teamMemberPerformanceResolver implements generated.TeamMemberPerformanceResolver.
type teamMemberPerformanceResolver struct{ *Resolver }

func (r *teamMemberPerformanceResolver) Assignment(ctx context.Context, obj *manager.TeamMemberPerformance) (string, error) {
	return obj.AssignmentName, nil
}

func (r *teamMemberPerformanceResolver) PerformanceScore(ctx context.Context, obj *manager.TeamMemberPerformance) (float64, error) {
	return obj.TargetAchievement, nil
}

func (r *teamMemberPerformanceResolver) RecordsToday(ctx context.Context, obj *manager.TeamMemberPerformance) (int32, error) {
	return int32(obj.WeeklyProduction), nil
}

func (r *teamMemberPerformanceResolver) WeeklyTrend(ctx context.Context, obj *manager.TeamMemberPerformance) (float64, error) {
	return obj.TodayProduction, nil
}

// trendDataPointResolver implements generated.TrendDataPointResolver.
type trendDataPointResolver struct{ *Resolver }

func (r *trendDataPointResolver) Target(ctx context.Context, obj *common.TrendDataPoint) (*float64, error) {
	return nil, nil
}

// ============================================================================
// SCOPE HELPERS
// ============================================================================

// managerEstateIDs returns estate IDs for this manager via user_estate_assignments.
func (r *Resolver) managerEstateIDs(ctx context.Context, userID string) ([]string, error) {
	if strings.TrimSpace(userID) == "" {
		return []string{}, nil
	}
	var ids []string
	err := r.db.WithContext(ctx).
		Table("user_estate_assignments").
		Select("estate_id::text").
		Where("user_id = ? AND is_active = true", userID).
		Scan(&ids).Error
	if err != nil {
		return nil, err
	}
	return ids, nil
}

// managerDivisionIDs returns division IDs for this manager via user_division_assignments.
func (r *Resolver) managerDivisionIDs(ctx context.Context, userID string) ([]string, error) {
	if strings.TrimSpace(userID) == "" {
		return []string{}, nil
	}
	var ids []string
	err := r.db.WithContext(ctx).
		Table("user_division_assignments").
		Select("division_id::text").
		Where("user_id = ? AND is_active = true", userID).
		Scan(&ids).Error
	if err != nil {
		return nil, err
	}
	return ids, nil
}

func (r *Resolver) managerDivisionIDsByEstates(ctx context.Context, estateIDs []string) ([]string, error) {
	if len(estateIDs) == 0 {
		return []string{}, nil
	}

	var ids []string
	err := r.db.WithContext(ctx).
		Table("divisions").
		Select("id::text").
		Where("estate_id IN ?", estateIDs).
		Scan(&ids).Error
	if err != nil {
		return nil, err
	}

	return ids, nil
}

func managerAnalyticsRange(period manager.AnalyticsPeriod, now time.Time) (time.Time, time.Time, string, error) {
	location := now.Location()
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, location)

	switch period {
	case manager.AnalyticsPeriodDaily:
		return startOfToday.AddDate(0, 0, -6), now, "date_trunc('day', hr.tanggal)::date", nil
	case manager.AnalyticsPeriodWeekly:
		return startOfToday.AddDate(0, 0, -27), now, "date_trunc('week', hr.tanggal)::date", nil
	case manager.AnalyticsPeriodMonthly:
		firstOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, location)
		return firstOfMonth.AddDate(0, -5, 0), now, "date_trunc('month', hr.tanggal)::date", nil
	case manager.AnalyticsPeriodQuarterly:
		currentQuarterStartMonth := ((int(now.Month())-1)/3)*3 + 1
		currentQuarterStart := time.Date(now.Year(), time.Month(currentQuarterStartMonth), 1, 0, 0, 0, 0, location)
		return currentQuarterStart.AddDate(0, -9, 0), now, "date_trunc('quarter', hr.tanggal)::date", nil
	case manager.AnalyticsPeriodYearly:
		return time.Date(now.Year()-2, 1, 1, 0, 0, 0, 0, location), now, "date_trunc('year', hr.tanggal)::date", nil
	default:
		return time.Time{}, time.Time{}, "", fmt.Errorf("unsupported analytics period: %s", period)
	}
}

func managerTrendLabel(period manager.AnalyticsPeriod, key time.Time, index int) string {
	switch period {
	case manager.AnalyticsPeriodDaily:
		return key.Format("Mon")
	case manager.AnalyticsPeriodWeekly:
		return fmt.Sprintf("Week %d", index+1)
	case manager.AnalyticsPeriodMonthly:
		return key.Format("Jan")
	case manager.AnalyticsPeriodQuarterly:
		quarter := ((int(key.Month()) - 1) / 3) + 1
		return fmt.Sprintf("Q%d", quarter)
	case manager.AnalyticsPeriodYearly:
		return key.Format("2006")
	default:
		return key.Format("2006-01-02")
	}
}

// ============================================================================
// Query resolvers for Manager
// ============================================================================

// ManagerDashboard is the resolver for the managerDashboard field.
func (r *queryResolver) ManagerDashboard(ctx context.Context) (*manager.ManagerDashboardData, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	estateIDs, err := r.managerEstateIDs(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get manager estates: %w", err)
	}

	divisionIDs, err := r.managerDivisionIDs(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get manager divisions: %w", err)
	}
	if len(divisionIDs) == 0 && len(estateIDs) > 0 {
		divisionIDs, err = r.managerDivisionIDsByEstates(ctx, estateIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to derive divisions by estates: %w", err)
		}
	}

	var user auth.User
	if err := r.db.WithContext(ctx).Table("users").
		Select("id, name, username, role, is_active").
		Where("id = ?", userID).Take(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	emptyDashboard := &manager.ManagerDashboardData{
		User:        &user,
		Estates:     []*master.Estate{},
		Stats:       &manager.ManagerDashboardStats{},
		ActionItems: []*manager.ManagerActionItem{},
		TeamSummary: &manager.ManagerTeamSummary{
			TopPerformers:  []*manager.TeamMemberPerformance{},
			NeedsAttention: []*manager.TeamMemberPerformance{},
		},
		TodayHighlights: &manager.ManagerTodayHighlights{
			Events: []*manager.ManagerEvent{},
		},
	}

	if len(estateIDs) == 0 {
		return emptyDashboard, nil
	}

	var estates []*master.Estate
	if err := r.db.WithContext(ctx).Table("estates").
		Where("id IN ?", estateIDs).Order("name ASC").Find(&estates).Error; err != nil {
		return nil, fmt.Errorf("failed to load estates: %w", err)
	}

	var statsRow managerStatsRow
	if err := r.db.WithContext(ctx).Raw(`
		SELECT
			COUNT(DISTINCT e.id)  AS total_estates,
			COUNT(DISTINCT d.id)  AS total_divisions,
			COUNT(DISTINCT b.id)  AS total_blocks,
			COUNT(DISTINCT uda2.user_id) FILTER (WHERE uda2.is_active = true) AS total_employees,
			COALESCE(SUM(hr.berat_tbs) FILTER (WHERE DATE(hr.tanggal)=CURRENT_DATE AND hr.status='APPROVED'), 0) AS today_prod,
			COALESCE(SUM(hr.berat_tbs) FILTER (WHERE date_trunc('week',hr.tanggal)=date_trunc('week',NOW()) AND hr.status='APPROVED'), 0) AS weekly_prod,
			COALESCE(SUM(hr.berat_tbs) FILTER (WHERE date_trunc('month',hr.tanggal)=date_trunc('month',NOW()) AND hr.status='APPROVED'), 0) AS monthly_prod,
			COALESCE(SUM(b2.target_ton) FILTER (WHERE b2.period_month=to_char(NOW(),'YYYY-MM')), 0) AS month_target,
			COUNT(hr.id) FILTER (WHERE hr.status='PENDING') AS pending_approvals,
			COUNT(hr.id) FILTER (WHERE DATE(hr.tanggal)=CURRENT_DATE AND hr.status IN ('APPROVED','PENDING')) AS active_harvests
		FROM estates e
		JOIN user_estate_assignments uea ON uea.estate_id=e.id AND uea.user_id=? AND uea.is_active=true
		JOIN divisions d ON d.estate_id=e.id
		LEFT JOIN blocks b ON b.division_id=d.id
		LEFT JOIN user_division_assignments uda2 ON uda2.division_id=d.id
		LEFT JOIN harvest_records hr ON hr.estate_id=e.id
		LEFT JOIN manager_division_production_budgets b2 ON b2.division_id=d.id
	`, userID).Scan(&statsRow).Error; err != nil {
		return nil, fmt.Errorf("failed to load dashboard stats: %w", err)
	}

	targetAchievement := 0.0
	if statsRow.MonthTarget > 0 {
		targetAchievement = statsRow.MonthlyProd / statsRow.MonthTarget * 100
	}

	stats := &manager.ManagerDashboardStats{
		TotalEstates:      statsRow.TotalEstates,
		TotalDivisions:    statsRow.TotalDivisions,
		TotalBlocks:       statsRow.TotalBlocks,
		TotalEmployees:    statsRow.TotalEmployees,
		TodayProduction:   statsRow.TodayProd,
		WeeklyProduction:  statsRow.WeeklyProd,
		MonthlyProduction: statsRow.MonthlyProd,
		MonthlyTarget:     statsRow.MonthTarget,
		TargetAchievement: targetAchievement,
		PendingApprovals:  statsRow.PendingApprovals,
		ActiveHarvests:    statsRow.ActiveHarvests,
	}

	// Top performers
	var performers []managerPerformerRow
	if len(divisionIDs) > 0 {
		if err := r.db.WithContext(ctx).Raw(`
		SELECT u.id AS user_id, u.name, u.role,
			COALESCE(d.name,'') AS assignment_name,
			COUNT(hr.id) AS records_today,
			COALESCE(SUM(hr.berat_tbs),0) AS perf_score
		FROM users u
		JOIN harvest_records hr ON hr.mandor_id=u.id
			AND DATE(hr.tanggal)=CURRENT_DATE
			AND hr.status='APPROVED'
			AND hr.division_id IN ?
		LEFT JOIN divisions d ON d.id=hr.division_id
		GROUP BY u.id, u.name, u.role, d.name
		ORDER BY perf_score DESC
		LIMIT 5
	`, divisionIDs).Scan(&performers).Error; err != nil {
			return nil, fmt.Errorf("failed to load top performers: %w", err)
		}
	}

	// Mandors with 0 production today (needs attention)
	var inactive []managerPerformerRow
	if len(divisionIDs) > 0 {
		if err := r.db.WithContext(ctx).Raw(`
		SELECT u.id AS user_id,
			COALESCE(NULLIF(u.name,''), u.username, '-') AS name,
			u.role,
			COALESCE(MIN(d.name),'') AS assignment_name,
			0 AS records_today,
			0.0 AS perf_score
		FROM users u
		JOIN user_division_assignments uda ON uda.user_id=u.id AND uda.is_active=true
		JOIN divisions d ON d.id=uda.division_id
		LEFT JOIN harvest_records hr_today ON hr_today.mandor_id=u.id
		  AND DATE(hr_today.tanggal)=CURRENT_DATE
		  AND hr_today.division_id IN ?
		WHERE uda.division_id IN ?
		  AND u.role='MANDOR'
		  AND u.is_active=true
		GROUP BY u.id, u.name, u.username, u.role
		HAVING COUNT(hr_today.id)=0
		ORDER BY COALESCE(NULLIF(u.name,''), u.username, '-') ASC
		LIMIT 5
	`, divisionIDs, divisionIDs).Scan(&inactive).Error; err != nil {
			return nil, fmt.Errorf("failed to load needs-attention performers: %w", err)
		}
	}

	toTeamMember := func(rows []managerPerformerRow, maxPerf float64) []*manager.TeamMemberPerformance {
		result := make([]*manager.TeamMemberPerformance, 0, len(rows))
		for _, p := range rows {
			pct := 0.0
			if maxPerf > 0 {
				pct = p.PerfScore / maxPerf * 100
			}
			result = append(result, &manager.TeamMemberPerformance{
				UserID:            p.UserID,
				Name:              p.Name,
				Role:              p.Role,
				AssignmentName:    p.AssignmentName,
				WeeklyProduction:  float64(p.RecordsToday), // stores record count for RecordsToday resolver
				TargetAchievement: pct,                     // stores performance % for PerformanceScore resolver
				TodayProduction:   p.PerfScore,             // stores raw production for WeeklyTrend resolver
			})
		}
		return result
	}

	maxPerf := 0.0
	if len(performers) > 0 {
		maxPerf = performers[0].PerfScore
	}
	topPerformers := toTeamMember(performers, maxPerf)
	needsAttention := toTeamMember(inactive, 1)

	// Today's highlights
	var hStatus managerHarvestStatusRow
	if err := r.db.WithContext(ctx).Raw(`
		SELECT
			COUNT(*) FILTER (WHERE DATE(tanggal)=CURRENT_DATE) AS total_today,
			COUNT(*) FILTER (WHERE status='PENDING' AND DATE(tanggal)=CURRENT_DATE) AS pending_count,
			COUNT(*) FILTER (WHERE status='APPROVED' AND DATE(tanggal)=CURRENT_DATE) AS approved_count,
			COUNT(*) FILTER (WHERE status='REJECTED' AND DATE(tanggal)=CURRENT_DATE) AS rejected_count,
			COALESCE(SUM(berat_tbs) FILTER (WHERE status='APPROVED' AND DATE(tanggal)=CURRENT_DATE-1),0) AS yesterday_prod
		FROM harvest_records
		WHERE estate_id IN ?
	`, estateIDs).Scan(&hStatus).Error; err != nil {
		return nil, fmt.Errorf("failed to load today highlights: %w", err)
	}

	todayProd := statsRow.TodayProd
	vsYesterday := 0.0
	if hStatus.YesterdayProd > 0 {
		vsYesterday = (todayProd - hStatus.YesterdayProd) / hStatus.YesterdayProd * 100
	}

	// Mandor/asisten counts
	var mandorCount, asistenCount, activeMandorCount int64
	if len(divisionIDs) > 0 {
		if err := r.db.WithContext(ctx).Table("users u").
			Joins("JOIN user_division_assignments uda ON uda.user_id=u.id AND uda.is_active=true").
			Where("uda.division_id IN ? AND u.role='MANDOR' AND u.is_active=true", divisionIDs).
			Distinct("u.id").Count(&mandorCount).Error; err != nil {
			return nil, fmt.Errorf("failed to count mandors: %w", err)
		}

		if err := r.db.WithContext(ctx).Table("users u").
			Joins("JOIN user_division_assignments uda ON uda.user_id=u.id AND uda.is_active=true").
			Where("uda.division_id IN ? AND u.role='ASISTEN' AND u.is_active=true", divisionIDs).
			Distinct("u.id").Count(&asistenCount).Error; err != nil {
			return nil, fmt.Errorf("failed to count asistens: %w", err)
		}

		if err := r.db.WithContext(ctx).Table("harvest_records hr").
			Where("hr.division_id IN ? AND DATE(hr.tanggal)=CURRENT_DATE AND hr.status IN ('APPROVED','PENDING')", divisionIDs).
			Distinct("hr.mandor_id").Count(&activeMandorCount).Error; err != nil {
			return nil, fmt.Errorf("failed to count active mandors: %w", err)
		}
	} else {
		if err := r.db.WithContext(ctx).Table("users u").
			Joins("JOIN user_division_assignments uda ON uda.user_id=u.id AND uda.is_active=true").
			Joins("JOIN divisions d ON d.id=uda.division_id").
			Where("d.estate_id IN ? AND u.role='MANDOR' AND u.is_active=true", estateIDs).
			Distinct("u.id").Count(&mandorCount).Error; err != nil {
			return nil, fmt.Errorf("failed to count mandors: %w", err)
		}

		if err := r.db.WithContext(ctx).Table("users u").
			Joins("JOIN user_division_assignments uda ON uda.user_id=u.id AND uda.is_active=true").
			Joins("JOIN divisions d ON d.id=uda.division_id").
			Where("d.estate_id IN ? AND u.role='ASISTEN' AND u.is_active=true", estateIDs).
			Distinct("u.id").Count(&asistenCount).Error; err != nil {
			return nil, fmt.Errorf("failed to count asistens: %w", err)
		}

		if err := r.db.WithContext(ctx).Table("harvest_records hr").
			Where("hr.estate_id IN ? AND DATE(hr.tanggal)=CURRENT_DATE AND hr.status IN ('APPROVED','PENDING')", estateIDs).
			Distinct("hr.mandor_id").Count(&activeMandorCount).Error; err != nil {
			return nil, fmt.Errorf("failed to count active mandors: %w", err)
		}
	}

	return &manager.ManagerDashboardData{
		User:        &user,
		Estates:     estates,
		Stats:       stats,
		ActionItems: []*manager.ManagerActionItem{},
		TeamSummary: &manager.ManagerTeamSummary{
			TotalMandors:       int32(mandorCount),
			ActiveMandorsToday: int32(activeMandorCount),
			TotalAsistens:      int32(asistenCount),
			TopPerformers:      topPerformers,
			NeedsAttention:     needsAttention,
		},
		TodayHighlights: &manager.ManagerTodayHighlights{
			TotalHarvestsToday:    hStatus.TotalToday,
			PendingApprovals:      hStatus.PendingCount,
			ApprovedToday:         hStatus.ApprovedCount,
			RejectedToday:         hStatus.RejectedCount,
			ProductionVsYesterday: vsYesterday,
			Events:                []*manager.ManagerEvent{},
		},
	}, nil
}

// ManagerDashboardStats is the resolver for the managerDashboardStats field.
func (r *queryResolver) ManagerDashboardStats(ctx context.Context) (*manager.ManagerDashboardStats, error) {
	return nil, fmt.Errorf("not yet implemented: ManagerDashboardStats")
}

// ManagerActionItems is the resolver for the managerActionItems field.
func (r *queryResolver) ManagerActionItems(ctx context.Context, limit *int32) ([]*manager.ManagerActionItem, error) {
	return nil, fmt.Errorf("not yet implemented: ManagerActionItems")
}

// ManagerTeamSummary is the resolver for the managerTeamSummary field.
func (r *queryResolver) ManagerTeamSummary(ctx context.Context) (*manager.ManagerTeamSummary, error) {
	return nil, fmt.Errorf("not yet implemented: ManagerTeamSummary")
}

// ManagerMonitor is the resolver for the managerMonitor field.
func (r *queryResolver) ManagerMonitor(ctx context.Context) (*manager.ManagerMonitorData, error) {
	return nil, fmt.Errorf("not yet implemented: ManagerMonitor")
}

// EstateMonitor is the resolver for the estateMonitor field.
func (r *queryResolver) EstateMonitor(ctx context.Context, estateID string) (*manager.EstateMonitorSummary, error) {
	return nil, fmt.Errorf("not yet implemented: EstateMonitor")
}

// DivisionMonitors is the resolver for the divisionMonitors field.
func (r *queryResolver) DivisionMonitors(ctx context.Context, estateID string) ([]*manager.DivisionMonitorSummary, error) {
	return nil, fmt.Errorf("not yet implemented: DivisionMonitors")
}

// ActiveHarvestActivities is the resolver for the activeHarvestActivities query field.
func (r *queryResolver) ActiveHarvestActivities(ctx context.Context, estateID *string) ([]*manager.HarvestActivity, error) {
	return nil, fmt.Errorf("not yet implemented: ActiveHarvestActivities")
}

// ManagerAnalytics is the resolver for the managerAnalytics field.
func (r *queryResolver) ManagerAnalytics(ctx context.Context, period manager.AnalyticsPeriod, startDate *time.Time, endDate *time.Time, estateID *string) (*manager.ManagerAnalyticsData, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	estateIDs, err := r.managerEstateIDs(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get manager estates: %w", err)
	}

	emptyAnalytics := &manager.ManagerAnalyticsData{
		Period: period,
		ProductionTrend: &manager.ProductionTrendData{
			DataPoints:     []*common.TrendDataPoint{},
			TrendDirection: common.TrendDirectionStable,
		},
		Comparison:          &manager.ComparisonMetrics{},
		DivisionPerformance: []*manager.DivisionPerformanceData{},
		QualityAnalysis: &manager.QualityAnalysisData{
			Distribution: []*manager.QualityDistribution{},
			Trend:        common.TrendDirectionStable,
		},
		EfficiencyMetrics: &manager.EfficiencyMetrics{},
	}

	// Filter to specific estate if provided (scope check)
	if estateID != nil && strings.TrimSpace(*estateID) != "" {
		scopedID := strings.TrimSpace(*estateID)
		found := false
		for _, id := range estateIDs {
			if id == scopedID {
				found = true
				break
			}
		}
		if !found {
			return nil, fmt.Errorf("access denied to requested estate")
		}
		estateIDs = []string{scopedID}
	}

	if len(estateIDs) == 0 {
		return emptyAnalytics, nil
	}

	divisionIDs, err := r.managerDivisionIDs(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get manager divisions: %w", err)
	}
	if len(divisionIDs) == 0 {
		divisionIDs, err = r.managerDivisionIDsByEstates(ctx, estateIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to derive divisions by estates: %w", err)
		}
	}

	now := time.Now()
	fromDate, toDate, groupExpr, err := managerAnalyticsRange(period, now)
	if err != nil {
		return nil, err
	}
	if startDate != nil {
		fromDate = *startDate
	}
	if endDate != nil {
		toDate = *endDate
	}
	if toDate.Before(fromDate) {
		fromDate, toDate = toDate, fromDate
	}

	// Production trend
	var trendRows []managerTrendRow
	if err := r.db.WithContext(ctx).Raw(fmt.Sprintf(`
		SELECT %s AS period_key,
			COALESCE(SUM(hr.berat_tbs) FILTER (WHERE hr.status='APPROVED'), 0) AS value
		FROM harvest_records hr
		WHERE hr.estate_id IN ? AND hr.tanggal >= ? AND hr.tanggal <= ?
		GROUP BY period_key ORDER BY period_key
	`, groupExpr), estateIDs, fromDate, toDate).Scan(&trendRows).Error; err != nil {
		return nil, fmt.Errorf("failed to load production trend: %w", err)
	}

	dataPoints := make([]*common.TrendDataPoint, 0, len(trendRows))
	for i, tr := range trendRows {
		label := managerTrendLabel(period, tr.PeriodKey, i)
		dp := &common.TrendDataPoint{
			Date:  tr.PeriodKey,
			Value: tr.Value,
			Label: &label,
		}
		dataPoints = append(dataPoints, dp)
	}

	var totalVal, maxVal, minVal float64
	if len(trendRows) > 0 {
		minVal = trendRows[0].Value
		for _, tr := range trendRows {
			totalVal += tr.Value
			if tr.Value > maxVal {
				maxVal = tr.Value
			}
			if tr.Value < minVal {
				minVal = tr.Value
			}
		}
	}
	avgVal := 0.0
	if len(trendRows) > 0 {
		avgVal = totalVal / float64(len(trendRows))
	}

	trendDir := common.TrendDirectionStable
	trendPct := 0.0
	if len(trendRows) >= 2 {
		first := trendRows[0].Value
		last := trendRows[len(trendRows)-1].Value
		if last > first {
			trendDir = common.TrendDirectionUp
		} else if last < first {
			trendDir = common.TrendDirectionDown
		}
		if first > 0 {
			trendPct = (last - first) / first * 100
		}
	}

	// Previous period for comparison
	periodDiff := toDate.Sub(fromDate)
	if periodDiff <= 0 {
		periodDiff = 24 * time.Hour
	}
	prevFrom := fromDate.Add(-periodDiff)
	prevTo := fromDate

	var prevProd float64
	if err := r.db.WithContext(ctx).Table("harvest_records").
		Select("COALESCE(SUM(berat_tbs),0)").
		Where("estate_id IN ? AND tanggal >= ? AND tanggal < ? AND status='APPROVED'", estateIDs, prevFrom, prevTo).
		Scan(&prevProd).Error; err != nil {
		return nil, fmt.Errorf("failed to load previous-period production: %w", err)
	}

	currentProd := totalVal
	changePercentage := 0.0
	if prevProd > 0 {
		changePercentage = (currentProd - prevProd) / prevProd * 100
	}

	// Monthly target for comparison
	var monthTarget float64
	if len(divisionIDs) > 0 {
		if err := r.db.WithContext(ctx).
			Table("manager_division_production_budgets").
			Select("COALESCE(SUM(target_ton),0)").
			Where("division_id IN ? AND period_month=to_char(NOW(),'YYYY-MM')", divisionIDs).
			Scan(&monthTarget).Error; err != nil {
			return nil, fmt.Errorf("failed to load target value: %w", err)
		}
	} else {
		if err := r.db.WithContext(ctx).Table("manager_division_production_budgets b").
			Joins("JOIN divisions d ON d.id=b.division_id").
			Where("d.estate_id IN ? AND b.period_month=to_char(NOW(),'YYYY-MM')", estateIDs).
			Select("COALESCE(SUM(b.target_ton),0)").
			Scan(&monthTarget).Error; err != nil {
			return nil, fmt.Errorf("failed to load target value: %w", err)
		}
	}

	targetAchievement := 0.0
	if monthTarget > 0 {
		targetAchievement = currentProd / monthTarget * 100
	}

	// Same-range last year for vsLastYear comparison.
	var lastYearProd float64
	if err := r.db.WithContext(ctx).Table("harvest_records").
		Select("COALESCE(SUM(berat_tbs),0)").
		Where(
			"estate_id IN ? AND tanggal >= ? AND tanggal <= ? AND status='APPROVED'",
			estateIDs,
			fromDate.AddDate(-1, 0, 0),
			toDate.AddDate(-1, 0, 0),
		).
		Scan(&lastYearProd).Error; err != nil {
		return nil, fmt.Errorf("failed to load vsLastYear production: %w", err)
	}
	var vsLastYear *float64
	if lastYearProd > 0 {
		value := (currentProd - lastYearProd) / lastYearProd * 100
		vsLastYear = &value
	}

	// Division performance
	var divPerfRows []managerDivPerfRow
	if len(divisionIDs) > 0 {
		if err := r.db.WithContext(ctx).Raw(`
			SELECT d.id AS division_id, d.name AS division_name,
				COALESCE(SUM(hr.berat_tbs) FILTER (WHERE hr.status='APPROVED'),0) AS production,
				COALESCE(SUM(b.target_ton) FILTER (WHERE b.period_month=to_char(NOW(),'YYYY-MM')),0) AS target
			FROM divisions d 
			LEFT JOIN harvest_records hr ON hr.division_id=d.id AND hr.tanggal >= ? AND hr.tanggal <= ?
			LEFT JOIN manager_division_production_budgets b ON b.division_id=d.id
			WHERE d.id IN ?
			GROUP BY d.id, d.name ORDER BY production DESC
		`, fromDate, toDate, divisionIDs).Scan(&divPerfRows).Error; err != nil {
			return nil, fmt.Errorf("failed to load division performance: %w", err)
		}
	}

	divPerf := make([]*manager.DivisionPerformanceData, 0, len(divPerfRows))
	for i, dp := range divPerfRows {
		ach := 0.0
		if dp.Target > 0 {
			ach = dp.Production / dp.Target * 100
		}
		divPerf = append(divPerf, &manager.DivisionPerformanceData{
			DivisionID:   dp.DivisionID,
			DivisionName: dp.DivisionName,
			Production:   dp.Production,
			Target:       dp.Target,
			Achievement:  ach,
			Rank:         int32(i + 1),
		})
	}

	// Quality analysis derived from harvest record status distribution
	var qualityRows []managerQualityRow
	if err := r.db.WithContext(ctx).Table("harvest_records").
		Select("status AS status_val, COUNT(*) AS cnt").
		Where("estate_id IN ? AND tanggal >= ? AND tanggal <= ?", estateIDs, fromDate, toDate).
		Group("status").Scan(&qualityRows).Error; err != nil {
		return nil, fmt.Errorf("failed to load quality distribution: %w", err)
	}

	totalRecords := int32(0)
	statusMap := map[string]int32{}
	for _, qr := range qualityRows {
		statusMap[strings.ToUpper(qr.StatusVal)] = qr.Cnt
		totalRecords += qr.Cnt
	}

	approvedCnt := statusMap["APPROVED"]
	pendingCnt := statusMap["PENDING"]
	rejectedCnt := statusMap["REJECTED"]

	approvedPct := 0.0
	pendingPct := 0.0
	rejectedPct := 0.0
	if totalRecords > 0 {
		approvedPct = float64(approvedCnt) / float64(totalRecords) * 100
		pendingPct = float64(pendingCnt) / float64(totalRecords) * 100
		rejectedPct = float64(rejectedCnt) / float64(totalRecords) * 100
	}
	qualityDist := []*manager.QualityDistribution{
		{Grade: "Grade A", Count: approvedCnt, Percentage: approvedPct, ColorCode: "#22C55E"},
		{Grade: "Grade B", Count: pendingCnt, Percentage: pendingPct, ColorCode: "#F59E0B"},
		{Grade: "Grade C", Count: rejectedCnt, Percentage: rejectedPct, ColorCode: "#EF4444"},
	}
	avgQuality := 0.0
	if totalRecords > 0 {
		avgQuality = float64(approvedCnt) / float64(totalRecords) * 10
	}

	// Efficiency metrics
	overallScore := 0.0
	if totalRecords > 0 {
		overallScore = float64(approvedCnt) / float64(totalRecords) * 100
	}

	var totalMandors, activeMandorsToday int64
	if len(divisionIDs) > 0 {
		if err := r.db.WithContext(ctx).Table("users u").
			Joins("JOIN user_division_assignments uda ON uda.user_id=u.id AND uda.is_active=true").
			Where("uda.division_id IN ? AND u.role='MANDOR' AND u.is_active=true", divisionIDs).
			Distinct("u.id").Count(&totalMandors).Error; err != nil {
			return nil, fmt.Errorf("failed to load total mandors: %w", err)
		}

		if err := r.db.WithContext(ctx).Table("harvest_records hr").
			Where("hr.division_id IN ? AND DATE(hr.tanggal)=CURRENT_DATE", divisionIDs).
			Distinct("hr.mandor_id").Count(&activeMandorsToday).Error; err != nil {
			return nil, fmt.Errorf("failed to load active mandors today: %w", err)
		}
	} else {
		if err := r.db.WithContext(ctx).Table("users u").
			Joins("JOIN user_division_assignments uda ON uda.user_id=u.id AND uda.is_active=true").
			Joins("JOIN divisions d ON d.id=uda.division_id").
			Where("d.estate_id IN ? AND u.role='MANDOR' AND u.is_active=true", estateIDs).
			Distinct("u.id").Count(&totalMandors).Error; err != nil {
			return nil, fmt.Errorf("failed to load total mandors: %w", err)
		}

		if err := r.db.WithContext(ctx).Table("harvest_records hr").
			Where("hr.estate_id IN ? AND DATE(hr.tanggal)=CURRENT_DATE", estateIDs).
			Distinct("hr.mandor_id").Count(&activeMandorsToday).Error; err != nil {
			return nil, fmt.Errorf("failed to load active mandors today: %w", err)
		}
	}
	laborEfficiency := 0.0
	if totalMandors > 0 {
		laborEfficiency = float64(activeMandorsToday) / float64(totalMandors) * 100
	}

	var activeBlocks, totalBlocks int64
	if err := r.db.WithContext(ctx).Table("harvest_records hr").
		Where("hr.estate_id IN ? AND hr.tanggal >= ? AND hr.tanggal <= ? AND hr.block_id IS NOT NULL", estateIDs, fromDate, toDate).
		Distinct("hr.block_id").Count(&activeBlocks).Error; err != nil {
		return nil, fmt.Errorf("failed to load active blocks: %w", err)
	}
	if err := r.db.WithContext(ctx).Table("blocks b").
		Joins("JOIN divisions d ON d.id=b.division_id").
		Where("d.estate_id IN ?", estateIDs).Count(&totalBlocks).Error; err != nil {
		return nil, fmt.Errorf("failed to load total blocks: %w", err)
	}
	resourceUtil := 0.0
	if totalBlocks > 0 {
		resourceUtil = float64(activeBlocks) / float64(totalBlocks) * 100
	}

	var monthlyProd float64
	if err := r.db.WithContext(ctx).Table("harvest_records").
		Select("COALESCE(SUM(berat_tbs),0)").
		Where("estate_id IN ? AND status='APPROVED' AND date_trunc('month', tanggal)=date_trunc('month', NOW())", estateIDs).
		Scan(&monthlyProd).Error; err != nil {
		return nil, fmt.Errorf("failed to load monthly production: %w", err)
	}

	var totalEmployees int64
	if err := r.db.WithContext(ctx).Table("user_division_assignments uda").
		Joins("JOIN divisions d ON d.id=uda.division_id").
		Where("d.estate_id IN ? AND uda.is_active=true", estateIDs).
		Distinct("uda.user_id").Count(&totalEmployees).Error; err != nil {
		return nil, fmt.Errorf("failed to load total employees: %w", err)
	}
	productivityPerWorker := 0.0
	if totalEmployees > 0 {
		productivityPerWorker = monthlyProd / float64(totalEmployees)
	}

	return &manager.ManagerAnalyticsData{
		Period: period,
		ProductionTrend: &manager.ProductionTrendData{
			DataPoints:      dataPoints,
			Average:         avgVal,
			Maximum:         maxVal,
			Minimum:         minVal,
			TrendDirection:  trendDir,
			TrendPercentage: trendPct,
		},
		Comparison: &manager.ComparisonMetrics{
			CurrentValue:      currentProd,
			PreviousValue:     prevProd,
			ChangePercentage:  changePercentage,
			TargetValue:       monthTarget,
			TargetAchievement: targetAchievement,
			VsLastYear:        vsLastYear,
		},
		DivisionPerformance: divPerf,
		QualityAnalysis: &manager.QualityAnalysisData{
			Distribution: qualityDist,
			AverageScore: avgQuality,
			Trend:        trendDir,
		},
		EfficiencyMetrics: &manager.EfficiencyMetrics{
			OverallScore:          overallScore,
			LaborEfficiency:       laborEfficiency,
			TimeEfficiency:        overallScore,
			ResourceUtilization:   resourceUtil,
			ProductivityPerWorker: productivityPerWorker,
		},
	}, nil
}

// ProductionTrend is the resolver for the productionTrend field.
func (r *queryResolver) ProductionTrend(ctx context.Context, period manager.AnalyticsPeriod, estateID *string) (*manager.ProductionTrendData, error) {
	return nil, fmt.Errorf("not yet implemented: ProductionTrend")
}

// DivisionPerformanceRanking is the resolver for the divisionPerformanceRanking field.
func (r *queryResolver) DivisionPerformanceRanking(ctx context.Context, estateID *string, limit *int32) ([]*manager.DivisionPerformanceData, error) {
	return nil, fmt.Errorf("not yet implemented: DivisionPerformanceRanking")
}

// QualityAnalysis is the resolver for the qualityAnalysis field.
func (r *queryResolver) QualityAnalysis(ctx context.Context, period manager.AnalyticsPeriod, estateID *string) (*manager.QualityAnalysisData, error) {
	return nil, fmt.Errorf("not yet implemented: QualityAnalysis")
}

// ManagerDivisionProductionBudgets is the resolver for the managerDivisionProductionBudgets field.
func (r *queryResolver) ManagerDivisionProductionBudgets(ctx context.Context, divisionID *string, period *string) ([]*generated.ManagerDivisionProductionBudget, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}
	role := middleware.GetUserRoleFromContext(ctx)

	query := r.managerBudgetScopedQuery(ctx, userID, role)

	if divisionID != nil && strings.TrimSpace(*divisionID) != "" {
		targetDivisionID := strings.TrimSpace(*divisionID)
		canAccess, err := r.managerCanAccessDivision(ctx, userID, targetDivisionID, role)
		if err != nil {
			return nil, fmt.Errorf("failed to validate division scope: %w", err)
		}
		if !canAccess {
			return nil, fmt.Errorf("access denied to selected division")
		}
		query = query.Where("b.division_id = ?", targetDivisionID)
	}

	if period != nil && strings.TrimSpace(*period) != "" {
		periodMonth, err := normalizeManagerBudgetPeriod(*period)
		if err != nil {
			return nil, err
		}
		query = query.Where("b.period_month = ?", periodMonth)
	}

	var rows []*managerDivisionProductionBudgetRead
	if err := query.
		Order("b.period_month DESC, b.updated_at DESC").
		Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("failed to load manager division budgets: %w", err)
	}

	result := make([]*generated.ManagerDivisionProductionBudget, 0, len(rows))
	for _, row := range rows {
		result = append(result, convertManagerBudgetToGraphQL(row))
	}

	return result, nil
}

// ManagerDivisionOptions is the resolver for the managerDivisionOptions field.
func (r *queryResolver) ManagerDivisionOptions(ctx context.Context) ([]*generated.ManagerDivisionOption, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}
	role := middleware.GetUserRoleFromContext(ctx)

	base := r.db.WithContext(ctx).
		Table("divisions d").
		Select(`
			d.id,
			d.name,
			d.estate_id,
			e.name AS estate_name
		`).
		Joins("JOIN estates e ON e.id = d.estate_id")

	var rows []*managerDivisionOptionRead
	if err := r.applyManagerDivisionScope(base, userID, role).
		Order("e.name ASC, d.name ASC").
		Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("failed to load manager division options: %w", err)
	}

	result := make([]*generated.ManagerDivisionOption, 0, len(rows))
	for _, row := range rows {
		if row == nil || strings.TrimSpace(row.ID) == "" {
			continue
		}

		result = append(result, &generated.ManagerDivisionOption{
			ID:         row.ID,
			Name:       row.Name,
			EstateID:   row.EstateID,
			EstateName: row.EstateName,
		})
	}

	return result, nil
}

// CreateManagerDivisionProductionBudget is the resolver for the createManagerDivisionProductionBudget field.
func (r *mutationResolver) CreateManagerDivisionProductionBudget(ctx context.Context, input generated.CreateManagerDivisionProductionBudgetInput) (*generated.ManagerDivisionProductionBudget, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	divisionID := strings.TrimSpace(input.DivisionID)
	if divisionID == "" {
		return nil, fmt.Errorf("divisionId wajib diisi")
	}
	periodMonth, err := normalizeManagerBudgetPeriod(input.Period)
	if err != nil {
		return nil, err
	}
	if input.TargetTon <= 0 {
		return nil, fmt.Errorf("targetTon harus lebih dari 0")
	}
	if input.PlannedCost <= 0 {
		return nil, fmt.Errorf("plannedCost harus lebih dari 0")
	}

	actualCost := 0.0
	if input.ActualCost != nil {
		actualCost = *input.ActualCost
	}
	if actualCost < 0 {
		return nil, fmt.Errorf("actualCost tidak boleh negatif")
	}

	role := middleware.GetUserRoleFromContext(ctx)
	canAccess, err := r.managerCanAccessDivision(ctx, userID, divisionID, role)
	if err != nil {
		return nil, fmt.Errorf("failed to validate division scope: %w", err)
	}
	if !canAccess {
		return nil, fmt.Errorf("access denied to selected division")
	}

	duplicateExists, err := r.managerBudgetDuplicateExists(ctx, divisionID, periodMonth, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to validate duplicate budget: %w", err)
	}
	if duplicateExists {
		return nil, fmt.Errorf("budget untuk divisi dan periode tersebut sudah ada")
	}

	now := time.Now()
	record := &managerDivisionProductionBudgetWrite{
		ID:          uuid.NewString(),
		DivisionID:  divisionID,
		PeriodMonth: periodMonth,
		TargetTon:   input.TargetTon,
		PlannedCost: input.PlannedCost,
		ActualCost:  actualCost,
		Notes:       normalizeManagerBudgetNotes(input.Notes),
		CreatedBy:   userID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := r.db.WithContext(ctx).Table(record.TableName()).Create(record).Error; err != nil {
		if isManagerBudgetUniqueViolation(err) {
			return nil, fmt.Errorf("budget untuk divisi dan periode tersebut sudah ada")
		}
		return nil, fmt.Errorf("failed to create manager division budget: %w", err)
	}

	created, err := r.managerBudgetByID(ctx, userID, record.ID)
	if err != nil {
		return nil, fmt.Errorf("budget tersimpan tetapi gagal dimuat ulang: %w", err)
	}

	return convertManagerBudgetToGraphQL(created), nil
}

// UpdateManagerDivisionProductionBudget is the resolver for the updateManagerDivisionProductionBudget field.
func (r *mutationResolver) UpdateManagerDivisionProductionBudget(ctx context.Context, input generated.UpdateManagerDivisionProductionBudgetInput) (*generated.ManagerDivisionProductionBudget, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	budgetID := strings.TrimSpace(input.ID)
	if budgetID == "" {
		return nil, fmt.Errorf("id budget wajib diisi")
	}

	existing, err := r.managerBudgetByID(ctx, userID, budgetID)
	if err != nil {
		return nil, err
	}

	nextDivisionID := existing.DivisionID
	if input.DivisionID != nil && strings.TrimSpace(*input.DivisionID) != "" {
		nextDivisionID = strings.TrimSpace(*input.DivisionID)
	}

	nextPeriod := existing.PeriodMonth
	if input.Period != nil {
		nextPeriod, err = normalizeManagerBudgetPeriod(*input.Period)
		if err != nil {
			return nil, err
		}
	}

	nextTargetTon := existing.TargetTon
	if input.TargetTon != nil {
		nextTargetTon = *input.TargetTon
	}
	if nextTargetTon <= 0 {
		return nil, fmt.Errorf("targetTon harus lebih dari 0")
	}

	nextPlannedCost := existing.PlannedCost
	if input.PlannedCost != nil {
		nextPlannedCost = *input.PlannedCost
	}
	if nextPlannedCost <= 0 {
		return nil, fmt.Errorf("plannedCost harus lebih dari 0")
	}

	nextActualCost := existing.ActualCost
	if input.ActualCost != nil {
		nextActualCost = *input.ActualCost
	}
	if nextActualCost < 0 {
		return nil, fmt.Errorf("actualCost tidak boleh negatif")
	}

	nextNotes := existing.Notes
	if input.Notes != nil {
		nextNotes = normalizeManagerBudgetNotes(input.Notes)
	}

	role := middleware.GetUserRoleFromContext(ctx)
	canAccess, err := r.managerCanAccessDivision(ctx, userID, nextDivisionID, role)
	if err != nil {
		return nil, fmt.Errorf("failed to validate division scope: %w", err)
	}
	if !canAccess {
		return nil, fmt.Errorf("access denied to selected division")
	}

	duplicateExists, err := r.managerBudgetDuplicateExists(ctx, nextDivisionID, nextPeriod, &budgetID)
	if err != nil {
		return nil, fmt.Errorf("failed to validate duplicate budget: %w", err)
	}
	if duplicateExists {
		return nil, fmt.Errorf("budget untuk divisi dan periode tersebut sudah ada")
	}

	updates := map[string]interface{}{
		"division_id":  nextDivisionID,
		"period_month": nextPeriod,
		"target_ton":   nextTargetTon,
		"planned_cost": nextPlannedCost,
		"actual_cost":  nextActualCost,
		"notes":        nextNotes,
		"updated_at":   time.Now(),
	}

	if err := r.db.WithContext(ctx).
		Table((&managerDivisionProductionBudgetWrite{}).TableName()).
		Where("id = ?", budgetID).
		Updates(updates).Error; err != nil {
		if isManagerBudgetUniqueViolation(err) {
			return nil, fmt.Errorf("budget untuk divisi dan periode tersebut sudah ada")
		}
		return nil, fmt.Errorf("failed to update manager division budget: %w", err)
	}

	updated, err := r.managerBudgetByID(ctx, userID, budgetID)
	if err != nil {
		return nil, fmt.Errorf("budget tersimpan tetapi gagal dimuat ulang: %w", err)
	}

	return convertManagerBudgetToGraphQL(updated), nil
}

// DeleteManagerDivisionProductionBudget is the resolver for the deleteManagerDivisionProductionBudget field.
func (r *mutationResolver) DeleteManagerDivisionProductionBudget(ctx context.Context, id string) (bool, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return false, fmt.Errorf("authentication required")
	}

	budgetID := strings.TrimSpace(id)
	if budgetID == "" {
		return false, fmt.Errorf("id budget wajib diisi")
	}

	_, err := r.managerBudgetByID(ctx, userID, budgetID)
	if err != nil {
		return false, err
	}

	if err := r.db.WithContext(ctx).
		Table((&managerDivisionProductionBudgetWrite{}).TableName()).
		Where("id = ?", budgetID).
		Delete(&managerDivisionProductionBudgetWrite{}).Error; err != nil {
		return false, fmt.Errorf("failed to delete manager division budget: %w", err)
	}

	return true, nil
}

// Subscription resolvers for Manager

// ManagerMonitorUpdate is the resolver for the managerMonitorUpdate subscription field.
func (r *subscriptionResolver) ManagerMonitorUpdate(ctx context.Context) (<-chan *manager.ManagerMonitorData, error) {
	return nil, fmt.Errorf("not yet implemented: ManagerMonitorUpdate")
}

// HarvestActivityUpdate is the resolver for the harvestActivityUpdate subscription field.
func (r *subscriptionResolver) HarvestActivityUpdate(ctx context.Context, estateID *string) (<-chan *manager.HarvestActivity, error) {
	return nil, fmt.Errorf("not yet implemented: HarvestActivityUpdate")
}

// ManagerAlert is the resolver for the managerAlert subscription field.
func (r *subscriptionResolver) ManagerAlert(ctx context.Context) (<-chan *manager.ManagerEvent, error) {
	return nil, fmt.Errorf("not yet implemented: ManagerAlert")
}

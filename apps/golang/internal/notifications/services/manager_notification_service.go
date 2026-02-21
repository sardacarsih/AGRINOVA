package services

import (
	"context"
	"fmt"
	"log"
	"time"

	authServices "agrinovagraphql/server/internal/auth/services"
	"agrinovagraphql/server/pkg/fcm"

	"gorm.io/gorm"
)

// ManagerNotificationService handles notifications specific to Manager role
type ManagerNotificationService struct {
	db               *gorm.DB
	fcmProvider      *fcm.FCMProvider
	hierarchyService *authServices.HierarchyService
	payloadBuilder   *fcm.PayloadBuilder
}

// ManagerDailySummaryData contains aggregated data for manager daily summary
type ManagerDailySummaryData struct {
	DateLabel              string
	SummaryDate            time.Time
	YesterdayProduction    float64
	WeeklyProduction       float64
	MonthlyTarget          float64
	TargetAchievement      float64
	PendingApprovals       int
	ActiveMandors          int
	TotalMandors           int
	TopPerformerName       *string
	TopPerformerProduction *float64
	AlertCount             int
	Alerts                 []string
}

// NewManagerNotificationService creates a new manager notification service
func NewManagerNotificationService(
	db *gorm.DB,
	fcmProvider *fcm.FCMProvider,
	hierarchyService *authServices.HierarchyService,
) *ManagerNotificationService {
	return &ManagerNotificationService{
		db:               db,
		fcmProvider:      fcmProvider,
		hierarchyService: hierarchyService,
		payloadBuilder:   fcm.NewPayloadBuilder(),
	}
}

// GenerateDailySummary generates summary data for a specific manager for YESTERDAY
func (s *ManagerNotificationService) GenerateDailySummary(ctx context.Context, managerID string) (*ManagerDailySummaryData, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database connection not available")
	}

	// Calculate yesterday's date range (WIB timezone: UTC+7)
	loc, _ := time.LoadLocation("Asia/Jakarta")
	now := time.Now().In(loc)
	yesterday := now.AddDate(0, 0, -1)
	yesterdayStart := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, loc)
	yesterdayEnd := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 23, 59, 59, 999999999, loc)

	// Format date label in Indonesian
	months := []string{"", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
		"Juli", "Agustus", "September", "Oktober", "November", "Desember"}
	dateLabel := fmt.Sprintf("Kemarin, %d %s %d", yesterday.Day(), months[yesterday.Month()], yesterday.Year())

	summary := &ManagerDailySummaryData{
		DateLabel:   dateLabel,
		SummaryDate: yesterdayStart,
		Alerts:      []string{},
	}

	// Query yesterday's production
	var yesterdayProduction float64
	err := s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(estimated_weight), 0) / 1000.0 as production
		FROM harvest_records 
		WHERE created_at >= ? AND created_at <= ?
		AND deleted_at IS NULL
	`, yesterdayStart, yesterdayEnd).Scan(&yesterdayProduction).Error
	if err != nil {
		log.Printf("Error querying yesterday production: %v", err)
	}
	summary.YesterdayProduction = yesterdayProduction

	// Query weekly production (last 7 days)
	weekStart := yesterdayStart.AddDate(0, 0, -6)
	var weeklyProduction float64
	err = s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(estimated_weight), 0) / 1000.0 as production
		FROM harvest_records 
		WHERE created_at >= ? AND created_at <= ?
		AND deleted_at IS NULL
	`, weekStart, yesterdayEnd).Scan(&weeklyProduction).Error
	if err != nil {
		log.Printf("Error querying weekly production: %v", err)
	}
	summary.WeeklyProduction = weeklyProduction

	// Query pending approvals
	var pendingCount int64
	err = s.db.WithContext(ctx).Raw(`
		SELECT COUNT(*) 
		FROM harvest_records 
		WHERE status = 'PENDING' AND deleted_at IS NULL
	`).Scan(&pendingCount).Error
	if err != nil {
		log.Printf("Error querying pending approvals: %v", err)
	}
	summary.PendingApprovals = int(pendingCount)

	// Query active mandors yesterday (those who submitted harvests)
	var activeMandors int64
	err = s.db.WithContext(ctx).Raw(`
		SELECT COUNT(DISTINCT mandor_id) 
		FROM harvest_records 
		WHERE created_at >= ? AND created_at <= ?
		AND deleted_at IS NULL
	`, yesterdayStart, yesterdayEnd).Scan(&activeMandors).Error
	if err != nil {
		log.Printf("Error querying active mandors: %v", err)
	}
	summary.ActiveMandors = int(activeMandors)

	// Query total mandors
	var totalMandors int64
	err = s.db.WithContext(ctx).Raw(`
		SELECT COUNT(*) 
		FROM users 
		WHERE role = 'MANDOR' AND deleted_at IS NULL
	`).Scan(&totalMandors).Error
	if err != nil {
		log.Printf("Error querying total mandors: %v", err)
	}
	summary.TotalMandors = int(totalMandors)

	// Query top performer yesterday
	type TopPerformer struct {
		Name       string
		Production float64
	}
	var topPerformer TopPerformer
	err = s.db.WithContext(ctx).Raw(`
		SELECT u.display_name as name, SUM(hr.estimated_weight) as production
		FROM harvest_records hr
		JOIN users u ON hr.mandor_id = u.id
		WHERE hr.created_at >= ? AND hr.created_at <= ?
		AND hr.deleted_at IS NULL
		GROUP BY hr.mandor_id, u.display_name
		ORDER BY production DESC
		LIMIT 1
	`, yesterdayStart, yesterdayEnd).Scan(&topPerformer).Error
	if err == nil && topPerformer.Name != "" {
		summary.TopPerformerName = &topPerformer.Name
		summary.TopPerformerProduction = &topPerformer.Production
	}

	// Calculate target achievement (simplified: monthly target / days passed)
	summary.MonthlyTarget = 500.0 // Default target, should come from configuration
	if summary.MonthlyTarget > 0 {
		// Calculate progress based on days passed in month
		daysInMonth := float64(time.Date(now.Year(), now.Month()+1, 0, 0, 0, 0, 0, loc).Day())
		daysPassed := float64(now.Day())
		expectedProgress := summary.MonthlyTarget * (daysPassed / daysInMonth)
		if expectedProgress > 0 {
			summary.TargetAchievement = (summary.WeeklyProduction / expectedProgress) * 100
		}
	}

	// Generate alerts
	if summary.ActiveMandors < summary.TotalMandors/2 {
		summary.Alerts = append(summary.Alerts,
			fmt.Sprintf("Hanya %d dari %d mandor aktif kemarin", summary.ActiveMandors, summary.TotalMandors))
	}
	if summary.PendingApprovals > 10 {
		summary.Alerts = append(summary.Alerts,
			fmt.Sprintf("%d approval pending menunggu", summary.PendingApprovals))
	}
	if summary.TargetAchievement < 70 {
		summary.Alerts = append(summary.Alerts,
			fmt.Sprintf("Target baru %.1f%% tercapai", summary.TargetAchievement))
	}
	summary.AlertCount = len(summary.Alerts)

	return summary, nil
}

// SendDailySummary sends daily summary notification to a specific manager
func (s *ManagerNotificationService) SendDailySummary(ctx context.Context, managerID string) error {
	if s.fcmProvider == nil {
		log.Printf("FCM provider not available, skipping notification for manager %s", managerID)
		return nil
	}

	// Generate summary data
	summaryData, err := s.GenerateDailySummary(ctx, managerID)
	if err != nil {
		return fmt.Errorf("failed to generate summary: %w", err)
	}

	// Get manager's FCM tokens
	tokens, err := s.hierarchyService.GetUserTokens(ctx, managerID)
	if err != nil {
		return fmt.Errorf("failed to get FCM tokens: %w", err)
	}
	if len(tokens) == 0 {
		log.Printf("No FCM tokens for manager %s, skipping notification", managerID)
		return nil
	}

	// Build FCM payload
	payload := s.payloadBuilder.ForManagerDailySummary(fcm.ManagerSummaryData{
		DateLabel:              summaryData.DateLabel,
		YesterdayProduction:    summaryData.YesterdayProduction,
		TargetAchievement:      summaryData.TargetAchievement,
		PendingApprovals:       summaryData.PendingApprovals,
		ActiveMandors:          summaryData.ActiveMandors,
		TotalMandors:           summaryData.TotalMandors,
		TopPerformerName:       stringValue(summaryData.TopPerformerName),
		TopPerformerProduction: floatValue(summaryData.TopPerformerProduction),
		AlertCount:             summaryData.AlertCount,
	})

	// Send notification
	result, err := s.fcmProvider.SendToTokens(ctx, tokens, payload)
	if err != nil {
		return fmt.Errorf("failed to send FCM: %w", err)
	}

	// Cleanup invalid tokens
	if len(result.FailedTokens) > 0 {
		go func() {
			if cleanupErr := s.hierarchyService.CleanupInvalidTokens(context.Background(), result.FailedTokens); cleanupErr != nil {
				log.Printf("Failed to cleanup invalid tokens: %v", cleanupErr)
			}
		}()
	}

	log.Printf("Daily summary sent to manager %s: %d success, %d failed",
		managerID, result.SuccessCount, result.FailureCount)

	return nil
}

// SendDailySummaryToAllManagers sends daily summary to all managers
func (s *ManagerNotificationService) SendDailySummaryToAllManagers(ctx context.Context) (int, error) {
	// Query all managers
	var managerIDs []string
	err := s.db.WithContext(ctx).Raw(`
		SELECT id FROM users WHERE role = 'MANAGER' AND deleted_at IS NULL
	`).Scan(&managerIDs).Error
	if err != nil {
		return 0, fmt.Errorf("failed to query managers: %w", err)
	}

	if len(managerIDs) == 0 {
		log.Printf("No managers found for daily summary")
		return 0, nil
	}

	sentCount := 0
	for _, managerID := range managerIDs {
		if err := s.SendDailySummary(ctx, managerID); err != nil {
			log.Printf("Failed to send summary to manager %s: %v", managerID, err)
			continue
		}
		sentCount++
	}

	log.Printf("Daily summary sent to %d/%d managers", sentCount, len(managerIDs))
	return sentCount, nil
}

// Helper functions
func stringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func floatValue(f *float64) float64 {
	if f == nil {
		return 0
	}
	return *f
}

package services

import (
	"context"
	"fmt"
	"net"
	"time"

	"agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/pkg/database"

	"gorm.io/gorm"
)

// SecurityEvent types
type SecurityEventType string

const (
	EventLoginAttempt             SecurityEventType = "login_attempt"
	EventLoginSuccess             SecurityEventType = "login_success"
	EventLoginFailure             SecurityEventType = "login_failure"
	EventBruteForceDetected       SecurityEventType = "brute_force_detected"
	EventSuspiciousActivity       SecurityEventType = "suspicious_activity"
	EventPasswordChange           SecurityEventType = "password_change"
	EventDeviceBinding            SecurityEventType = "device_binding"
	EventDeviceRevocation         SecurityEventType = "device_revocation"
	EventTokenRefresh             SecurityEventType = "token_refresh"
	EventLogout                   SecurityEventType = "logout"
	EventCSRFAttempt              SecurityEventType = "csrf_attempt"
	EventInputValidationFailure   SecurityEventType = "input_validation_failure"
	EventRateLimitExceeded        SecurityEventType = "rate_limit_exceeded"
	EventDeviceFingerprintAnomaly SecurityEventType = "device_fingerprint_anomaly"
)

// SecurityEventSeverity levels
type SecurityEventSeverity string

const (
	SeverityInfo     SecurityEventSeverity = "info"
	SeverityWarning  SecurityEventSeverity = "warning"
	SeverityError    SecurityEventSeverity = "error"
	SeverityCritical SecurityEventSeverity = "critical"
)

// SecurityLogEntry represents a security event log entry
type SecurityLogEntry struct {
	ID        string                 `json:"id"`
	EventType SecurityEventType      `json:"event_type"`
	Severity  SecurityEventSeverity  `json:"severity"`
	UserID    *string                `json:"user_id,omitempty"`
	Username  *string                `json:"username,omitempty"`
	IPAddress string                 `json:"ip_address"`
	UserAgent string                 `json:"user_agent"`
	DeviceID  *string                `json:"device_id,omitempty"`
	Platform  *models.PlatformType   `json:"platform,omitempty"`
	Details   map[string]interface{} `json:"details"`
	Timestamp time.Time              `json:"timestamp"`
	SessionID *string                `json:"session_id,omitempty"`
	RequestID *string                `json:"request_id,omitempty"`
}

// SecurityLoggingService handles comprehensive security event logging
type SecurityLoggingService struct {
	db              *gorm.DB
	enableDetailed  bool
	retentionDays   int
	asyncLogging    bool
	alertThresholds map[SecurityEventType]int
	logChannel      chan SecurityLogEntry
	alertChannel    chan SecurityAlert
}

// SecurityAlert represents a security alert that needs immediate attention
type SecurityAlert struct {
	EventType     SecurityEventType      `json:"event_type"`
	Severity      SecurityEventSeverity  `json:"severity"`
	Count         int                    `json:"count"`
	TimeWindow    time.Duration          `json:"time_window"`
	IPAddress     string                 `json:"ip_address"`
	UserID        *string                `json:"user_id,omitempty"`
	Details       map[string]interface{} `json:"details"`
	FirstOccurred time.Time              `json:"first_occurred"`
	LastOccurred  time.Time              `json:"last_occurred"`
}

// SecurityLoggingConfig holds configuration for security logging
type SecurityLoggingConfig struct {
	EnableDetailed  bool
	RetentionDays   int
	AsyncLogging    bool
	AlertThresholds map[SecurityEventType]int
}

// NewSecurityLoggingService creates a new security logging service
func NewSecurityLoggingService(config SecurityLoggingConfig) *SecurityLoggingService {
	service := &SecurityLoggingService{
		db:              database.GetDB(),
		enableDetailed:  config.EnableDetailed,
		retentionDays:   config.RetentionDays,
		asyncLogging:    config.AsyncLogging,
		alertThresholds: config.AlertThresholds,
		logChannel:      make(chan SecurityLogEntry, 1000),
		alertChannel:    make(chan SecurityAlert, 100),
	}

	// Start background workers if async logging is enabled
	if config.AsyncLogging {
		go service.logWorker()
		go service.alertWorker()
	}

	return service
}

// LogSecurityEvent logs a security event
func (s *SecurityLoggingService) LogSecurityEvent(ctx context.Context, eventType SecurityEventType, severity SecurityEventSeverity, details map[string]interface{}) {
	entry := SecurityLogEntry{
		EventType: eventType,
		Severity:  severity,
		Details:   details,
		Timestamp: time.Now(),
	}

	// Extract context information
	s.enrichLogEntry(ctx, &entry)

	// Only log events with valid user context
	if entry.UserID == nil || *entry.UserID == "" {
		// Skip logging events without authenticated user context
		return
	}

	// Generate unique ID
	entry.ID = s.generateEventID()

	// Log based on configuration
	if s.asyncLogging {
		select {
		case s.logChannel <- entry:
		default:
			// Channel is full, log synchronously to avoid losing critical events
			s.persistLogEntry(entry)
		}
	} else {
		s.persistLogEntry(entry)
	}

	// Check for alert conditions
	s.checkAlertConditions(entry)
}

// LogLoginAttempt logs a login attempt with comprehensive details
func (s *SecurityLoggingService) LogLoginAttempt(ctx context.Context, username, ipAddress, userAgent string, deviceID *string, platform *models.PlatformType, success bool, failureReason *string) {
	eventType := EventLoginAttempt
	severity := SeverityInfo

	if success {
		eventType = EventLoginSuccess
	} else {
		eventType = EventLoginFailure
		severity = SeverityWarning
	}

	details := map[string]interface{}{
		"username":   username,
		"success":    success,
		"ip_address": ipAddress,
		"user_agent": userAgent,
	}

	if deviceID != nil {
		details["device_id"] = *deviceID
	}
	if platform != nil {
		details["platform"] = *platform
	}
	if failureReason != nil {
		details["failure_reason"] = *failureReason
	}

	s.LogSecurityEvent(ctx, eventType, severity, details)
}

// LogSuspiciousActivity logs suspicious activity detection
func (s *SecurityLoggingService) LogSuspiciousActivity(ctx context.Context, activityType, description string, riskLevel string) {
	severity := SeverityWarning
	if riskLevel == "high" {
		severity = SeverityError
	}

	details := map[string]interface{}{
		"activity_type": activityType,
		"description":   description,
		"risk_level":    riskLevel,
	}

	s.LogSecurityEvent(ctx, EventSuspiciousActivity, severity, details)
}

// LogBruteForceAttempt logs brute force detection
func (s *SecurityLoggingService) LogBruteForceAttempt(ctx context.Context, ipAddress, username string, attemptCount int, timeWindow time.Duration) {
	details := map[string]interface{}{
		"ip_address":    ipAddress,
		"username":      username,
		"attempt_count": attemptCount,
		"time_window":   timeWindow.String(),
		"blocked":       true,
	}

	s.LogSecurityEvent(ctx, EventBruteForceDetected, SeverityCritical, details)
}

// LogPasswordChange logs password change events
func (s *SecurityLoggingService) LogPasswordChange(ctx context.Context, userID, username string, success bool) {
	severity := SeverityInfo
	if !success {
		severity = SeverityWarning
	}

	details := map[string]interface{}{
		"user_id":  userID,
		"username": username,
		"success":  success,
	}

	s.LogSecurityEvent(ctx, EventPasswordChange, severity, details)
}

// LogDeviceEvent logs device-related security events
func (s *SecurityLoggingService) LogDeviceEvent(ctx context.Context, eventType SecurityEventType, deviceID string, userID, username string, details map[string]interface{}) {
	if details == nil {
		details = make(map[string]interface{})
	}

	details["device_id"] = deviceID
	details["user_id"] = userID
	details["username"] = username

	severity := SeverityInfo
	if eventType == EventDeviceRevocation {
		severity = SeverityWarning
	}

	s.LogSecurityEvent(ctx, eventType, severity, details)
}

// LogInputValidationFailure logs input validation failures
func (s *SecurityLoggingService) LogInputValidationFailure(ctx context.Context, fieldName, reason string) {
	details := map[string]interface{}{
		"field_name": fieldName,
		"reason":     reason,
	}

	s.LogSecurityEvent(ctx, EventInputValidationFailure, SeverityWarning, details)
}

// LogRateLimitExceeded logs rate limiting violations
func (s *SecurityLoggingService) LogRateLimitExceeded(ctx context.Context, limitType, identifier string, currentAttempts, maxAttempts int) {
	details := map[string]interface{}{
		"limit_type":       limitType,
		"identifier":       identifier,
		"current_attempts": currentAttempts,
		"max_attempts":     maxAttempts,
	}

	s.LogSecurityEvent(ctx, EventRateLimitExceeded, SeverityError, details)
}

// GetSecurityLogs retrieves security logs with filtering
func (s *SecurityLoggingService) GetSecurityLogs(filters SecurityLogFilters) ([]SecurityLogEntry, error) {
	var logs []models.SecurityEvent
	query := s.db.Model(&models.SecurityEvent{})

	// Apply filters
	if filters.EventType != "" {
		query = query.Where("event_type = ?", filters.EventType)
	}
	if filters.Severity != "" {
		query = query.Where("severity = ?", filters.Severity)
	}
	if filters.UserID != "" {
		query = query.Where("user_id = ?", filters.UserID)
	}
	if filters.IPAddress != "" {
		query = query.Where("ip_address = ?", filters.IPAddress)
	}
	if !filters.StartTime.IsZero() {
		query = query.Where("created_at >= ?", filters.StartTime)
	}
	if !filters.EndTime.IsZero() {
		query = query.Where("created_at <= ?", filters.EndTime)
	}

	// Apply pagination
	if filters.Limit > 0 {
		query = query.Limit(filters.Limit)
	} else {
		query = query.Limit(100) // Default limit
	}

	if filters.Offset > 0 {
		query = query.Offset(filters.Offset)
	}

	err := query.Order("created_at DESC").Find(&logs).Error
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve security logs: %w", err)
	}

	// Convert to SecurityLogEntry
	entries := make([]SecurityLogEntry, len(logs))
	for i, log := range logs {
		entries[i] = s.convertToLogEntry(log)
	}

	return entries, nil
}

// SecurityLogFilters holds filtering criteria for security logs
type SecurityLogFilters struct {
	EventType SecurityEventType     `json:"event_type,omitempty"`
	Severity  SecurityEventSeverity `json:"severity,omitempty"`
	UserID    string                `json:"user_id,omitempty"`
	IPAddress string                `json:"ip_address,omitempty"`
	StartTime time.Time             `json:"start_time,omitempty"`
	EndTime   time.Time             `json:"end_time,omitempty"`
	Limit     int                   `json:"limit,omitempty"`
	Offset    int                   `json:"offset,omitempty"`
}

// Private methods

func (s *SecurityLoggingService) enrichLogEntry(ctx context.Context, entry *SecurityLogEntry) {
	// Extract IP address
	if ip, ok := ctx.Value("client_ip").(string); ok {
		entry.IPAddress = ip
	}

	// Extract user agent
	if ua, ok := ctx.Value("user_agent").(string); ok {
		entry.UserAgent = ua
	}

	// Extract user info from auth context keys
	if userID, ok := ctx.Value("user_id").(string); ok && userID != "" {
		entry.UserID = &userID
	}

	// Username is not directly available in context mostly, rely on caller or skip
	// If caller provides it in Details or if we want to fetch (too slow), for now skip or check "username" key if set
	if username, ok := ctx.Value("username").(string); ok && username != "" {
		entry.Username = &username
	}

	if deviceID, ok := ctx.Value("device_id").(string); ok && deviceID != "" {
		entry.DeviceID = &deviceID
	}

	if platform, ok := ctx.Value("platform").(models.PlatformType); ok {
		entry.Platform = &platform
	} else if platformStr, ok := ctx.Value("platform").(string); ok && platformStr != "" {
		p := models.PlatformType(platformStr)
		entry.Platform = &p
	}

	// Extract session ID
	if sessionID, ok := ctx.Value("session_id").(string); ok {
		entry.SessionID = &sessionID
	}

	// Extract request ID
	if requestID, ok := ctx.Value("request_id").(string); ok {
		entry.RequestID = &requestID
	}
}

func (s *SecurityLoggingService) generateEventID() string {
	return fmt.Sprintf("sec_%d_%s", time.Now().UnixNano(), generateRandomString(8))
}

func (s *SecurityLoggingService) persistLogEntry(entry SecurityLogEntry) {
	// At this point, we know entry.UserID is valid due to conditional logging check
	userID := *entry.UserID // Safe to dereference due to conditional check

	ip := entry.IPAddress
	if net.ParseIP(ip) == nil {
		ip = "0.0.0.0" // Fallback for invalid/non-standard IPs (like 'mobile' or 'unknown')
	}

	securityEvent := &models.SecurityEvent{
		EventType: models.SecurityEventType(entry.EventType),
		Severity:  models.EventSeverity(entry.Severity),
		UserID:    userID,
		IPAddress: ip,
		UserAgent: entry.UserAgent,
		DeviceID:  entry.DeviceID,
		Details: models.SecurityEventDetails{
			Action:   string(entry.EventType),
			Metadata: convertMapStringInterfaceToMapStringString(entry.Details),
		},
		CreatedAt: entry.Timestamp,
	}

	// Save to database
	if err := s.db.Create(securityEvent).Error; err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Failed to persist security log entry: %v\n", err)
	}
}

func (s *SecurityLoggingService) logWorker() {
	for entry := range s.logChannel {
		s.persistLogEntry(entry)
	}
}

func (s *SecurityLoggingService) alertWorker() {
	for alert := range s.alertChannel {
		s.processAlert(alert)
	}
}

func (s *SecurityLoggingService) checkAlertConditions(entry SecurityLogEntry) {
	threshold, exists := s.alertThresholds[entry.EventType]
	if !exists {
		return
	}

	// Count recent events of the same type from the same IP
	var count int64
	err := s.db.Model(&models.SecurityEvent{}).
		Where("event_type = ? AND ip_address = ? AND created_at > ?",
			entry.EventType, entry.IPAddress, time.Now().Add(-15*time.Minute)).
		Count(&count).Error

	if err != nil {
		return
	}

	if int(count) >= threshold {
		alert := SecurityAlert{
			EventType:     entry.EventType,
			Severity:      SeverityCritical,
			Count:         int(count),
			TimeWindow:    15 * time.Minute,
			IPAddress:     entry.IPAddress,
			UserID:        entry.UserID,
			Details:       entry.Details,
			FirstOccurred: time.Now().Add(-15 * time.Minute),
			LastOccurred:  time.Now(),
		}

		select {
		case s.alertChannel <- alert:
		default:
			// Alert channel is full, process immediately
			s.processAlert(alert)
		}
	}
}

func (s *SecurityLoggingService) processAlert(alert SecurityAlert) {
	// In a real implementation, this would send notifications to security team
	// For now, just log the alert
	fmt.Printf("SECURITY ALERT: %s - %d occurrences from %s in %s\n",
		alert.EventType, alert.Count, alert.IPAddress, alert.TimeWindow)
}

func (s *SecurityLoggingService) convertToLogEntry(event models.SecurityEvent) SecurityLogEntry {
	return SecurityLogEntry{
		ID:        fmt.Sprintf("%s", event.ID),
		EventType: SecurityEventType(event.EventType),
		Severity:  SecurityEventSeverity(event.Severity),
		UserID:    &event.UserID,
		IPAddress: event.IPAddress,
		UserAgent: event.UserAgent,
		DeviceID:  event.DeviceID,
		Details:   convertMapStringStringToMapStringInterface(event.Details.Metadata),
		Timestamp: event.CreatedAt,
	}
}

// Helper function to convert map[string]interface{} to map[string]string
func convertMapStringInterfaceToMapStringString(input map[string]interface{}) map[string]string {
	result := make(map[string]string)
	for key, value := range input {
		if str, ok := value.(string); ok {
			result[key] = str
		} else {
			result[key] = fmt.Sprintf("%v", value)
		}
	}
	return result
}

// Helper function to convert map[string]string to map[string]interface{}
func convertMapStringStringToMapStringInterface(input map[string]string) map[string]interface{} {
	result := make(map[string]interface{})
	for key, value := range input {
		result[key] = value
	}
	return result
}

// Helper function to generate random strings
func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	bytes := make([]byte, length)
	for i := range bytes {
		bytes[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(bytes)
}

// Enhanced Logout Security Logging Methods

// LogLogoutEvent logs detailed logout events with platform-specific information
func (s *SecurityLoggingService) LogLogoutEvent(ctx context.Context, userID, username, ipAddress, userAgent, platform string, deviceID *string, logoutAllDevices bool, sessionID *string, logoutDuration time.Duration, success bool, failureReason *string) {
	details := map[string]interface{}{
		"logout_all_devices": logoutAllDevices,
		"logout_duration_ms": logoutDuration.Milliseconds(),
		"success":            success,
	}

	if sessionID != nil {
		details["session_id"] = *sessionID
	}

	if deviceID != nil {
		details["device_id"] = *deviceID
	}

	if !success && failureReason != nil {
		details["failure_reason"] = *failureReason
	}

	// Add platform-specific details
	switch platform {
	case "WEB":
		details["cookies_cleared"] = true // In real implementation, this would be actual status
		details["session_terminated"] = true
	case "MOBILE":
		details["tokens_revoked"] = true
		details["device_binding_revoked"] = true
	}

	severity := SeverityInfo
	if !success {
		severity = SeverityWarning
	}

	s.LogSecurityEvent(ctx, EventLogout, severity, details)
}

// LogBatchLogoutEvent logs batch logout operations (e.g., logout all devices)
func (s *SecurityLoggingService) LogBatchLogoutEvent(ctx context.Context, userID, username string, devicesAffected int, platforms []string, totalDuration time.Duration, success bool) {
	details := map[string]interface{}{
		"batch_operation":   true,
		"devices_affected":  devicesAffected,
		"platforms":         platforms,
		"total_duration_ms": totalDuration.Milliseconds(),
		"success":           success,
	}

	severity := SeverityInfo
	if !success {
		severity = SeverityError
	} else if devicesAffected > 10 {
		severity = SeverityWarning // Large batch operations are worth noting
	}

	s.LogSecurityEvent(ctx, EventLogout, severity, details)
}

// LogLogoutPerformanceMetrics logs performance metrics for logout operations
func (s *SecurityLoggingService) LogLogoutPerformanceMetrics(ctx context.Context, operationType, platform string, duration time.Duration, concurrentUsers int, memoryUsage int64, dbQueries int) {
	details := map[string]interface{}{
		"operation_type":     operationType,
		"platform":           platform,
		"duration_ms":        duration.Milliseconds(),
		"concurrent_users":   concurrentUsers,
		"memory_usage_mb":    memoryUsage / (1024 * 1024),
		"database_queries":   dbQueries,
		"performance_metric": true,
	}

	// Categorize performance
	severity := SeverityInfo
	if duration > 5*time.Second {
		severity = SeverityWarning
	} else if duration > 10*time.Second {
		severity = SeverityError
	}

	s.LogSecurityEvent(ctx, EventLogout, severity, details)
}

// GetLogoutAnalytics returns analytics data for logout operations
func (s *SecurityLoggingService) GetLogoutAnalytics(timeRange time.Duration) (map[string]interface{}, error) {
	cutoff := time.Now().Add(-timeRange)

	var results []struct {
		Platform string `json:"platform"`
		Success  bool   `json:"success"`
		Count    int64  `json:"count"`
	}

	// Query logout events with aggregation
	err := s.db.Raw(`
		SELECT
			COALESCE(details->>'platform', 'unknown') as platform,
			COALESCE((details->>'success')::boolean, true) as success,
			COUNT(*) as count
		FROM security_events
		WHERE event_type = ? AND created_at >= ?
		GROUP BY COALESCE(details->>'platform', 'unknown'), COALESCE((details->>'success')::boolean, true)
		ORDER BY platform, success
	`, EventLogout, cutoff).Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query logout analytics: %w", err)
	}

	// Process results
	analytics := map[string]interface{}{
		"time_range_hours": timeRange.Hours(),
		"total_logouts":    0,
		"success_rate":     0.0,
		"by_platform":      make(map[string]map[string]int64),
	}

	var totalLogouts int64
	var successfulLogouts int64

	for _, result := range results {
		totalLogouts += result.Count
		if result.Success {
			successfulLogouts += result.Count
		}

		platformData, exists := analytics["by_platform"].(map[string]map[string]int64)
		if !exists {
			platformData = make(map[string]map[string]int64)
			analytics["by_platform"] = platformData
		}

		if _, platformExists := platformData[result.Platform]; !platformExists {
			platformData[result.Platform] = map[string]int64{"success": 0, "failure": 0}
		}

		if result.Success {
			platformData[result.Platform]["success"] = result.Count
		} else {
			platformData[result.Platform]["failure"] = result.Count
		}
	}

	analytics["total_logouts"] = totalLogouts
	if totalLogouts > 0 {
		analytics["success_rate"] = float64(successfulLogouts) / float64(totalLogouts) * 100
	}

	return analytics, nil
}

// Cleanup methods

// CleanupOldLogs removes old security logs based on retention policy
func (s *SecurityLoggingService) CleanupOldLogs() error {
	cutoff := time.Now().AddDate(0, 0, -s.retentionDays)

	err := s.db.Where("created_at < ?", cutoff).Delete(&models.SecurityEvent{}).Error
	if err != nil {
		return fmt.Errorf("failed to cleanup old security logs: %w", err)
	}

	return nil
}

package services

import (
	"net/http"
	"regexp"
	"strings"

	"agrinovagraphql/server/internal/auth/models"
)

// PlatformContext holds platform detection results
type PlatformContext struct {
	Platform        models.PlatformType `json:"platform"`
	Confidence      float64             `json:"confidence"`
	DetectionMethod string              `json:"detection_method"`
	DeviceInfo      *models.DeviceInfo  `json:"device_info,omitempty"`
	IsMobile        bool                `json:"is_mobile"`
	UserAgent       string              `json:"user_agent,omitempty"`
	PlatformHint    string              `json:"platform_hint,omitempty"`
	DeviceID        string              `json:"device_id,omitempty"`
}

// ValidationResult holds mobile validation results
type ValidationResult struct {
	Valid         bool     `json:"valid"`
	MissingFields []string `json:"missing_fields,omitempty"`
	Errors        []string `json:"errors,omitempty"`
}

// PlatformDetectionService handles platform detection logic
type PlatformDetectionService struct {
	// Mobile User-Agent patterns
	mobilePatterns  *regexp.Regexp
	androidPatterns *regexp.Regexp
	iosPatterns     *regexp.Regexp
	webPatterns     *regexp.Regexp
}

// NewPlatformDetectionService creates a new platform detection service
func NewPlatformDetectionService() *PlatformDetectionService {
	return &PlatformDetectionService{
		mobilePatterns:  regexp.MustCompile(`(?i)(mobile|android|iphone|ipad|phone|tablet|touch)`),
		androidPatterns: regexp.MustCompile(`(?i)(android|kotlin|java.*android)`),
		iosPatterns:     regexp.MustCompile(`(?i)(iphone|ipad|ios|swift|objective-c.*ios)`),
		webPatterns:     regexp.MustCompile(`(?i)(mozilla|chrome|firefox|safari|edge|opera)`),
	}
}

// DetectPlatform analyzes the request to determine the platform
func (p *PlatformDetectionService) DetectPlatform(r *http.Request, loginData map[string]interface{}) *PlatformContext {
	userAgent := r.Header.Get("User-Agent")
	platformHint := r.Header.Get("X-Platform")
	deviceID := p.getDeviceID(r, loginData)

	context := &PlatformContext{
		UserAgent:    userAgent,
		PlatformHint: platformHint,
		DeviceID:     deviceID,
	}

	// Priority 1: Explicit platform hint header
	if platformHint != "" {
		platform, confidence := p.detectFromPlatformHint(platformHint)
		if confidence > 0 {
			context.Platform = platform
			context.Confidence = confidence
			context.DetectionMethod = "platform_hint"
			context.IsMobile = p.IsMobilePlatform(platform)
			return context
		}
	}

	// Priority 2: Mobile-specific fields presence
	if p.hasMobileFields(loginData) {
		platform, confidence := p.detectFromMobileFields(loginData, userAgent)
		context.Platform = platform
		context.Confidence = confidence
		context.DetectionMethod = "mobile_fields"
		context.IsMobile = true
		context.DeviceInfo = p.extractDeviceInfo(loginData)
		return context
	}

	// Priority 3: User-Agent analysis
	platform, confidence := p.detectFromUserAgent(userAgent)
	context.Platform = platform
	context.Confidence = confidence
	context.DetectionMethod = "user_agent"
	context.IsMobile = p.IsMobilePlatform(platform)

	return context
}

// detectFromPlatformHint detects platform from X-Platform header
func (p *PlatformDetectionService) detectFromPlatformHint(hint string) (models.PlatformType, float64) {
	hint = strings.ToUpper(strings.TrimSpace(hint))

	switch hint {
	case "WEB", "BROWSER":
		return models.PlatformWeb, 1.0
	case "ANDROID", "MOBILE_ANDROID":
		return models.PlatformAndroid, 1.0
	case "IOS", "MOBILE_IOS", "IPHONE", "IPAD":
		return models.PlatformIOS, 1.0
	case "MOBILE":
		return models.PlatformAndroid, 0.8 // Default mobile to Android
	default:
		return models.PlatformWeb, 0.0 // Invalid hint
	}
}

// detectFromMobileFields detects platform based on mobile-specific fields
func (p *PlatformDetectionService) detectFromMobileFields(data map[string]interface{}, userAgent string) (models.PlatformType, float64) {
	// Check device info for platform hints
	if deviceInfo, ok := data["device_info"].(map[string]interface{}); ok {
		if osVersion, exists := deviceInfo["os_version"].(string); exists {
			osVersion = strings.ToLower(osVersion)
			if strings.Contains(osVersion, "android") {
				return models.PlatformAndroid, 0.95
			}
			if strings.Contains(osVersion, "ios") || strings.Contains(osVersion, "iphone") {
				return models.PlatformIOS, 0.95
			}
		}
	}

	// Fallback to user-agent analysis
	if p.androidPatterns.MatchString(userAgent) {
		return models.PlatformAndroid, 0.8
	}
	if p.iosPatterns.MatchString(userAgent) {
		return models.PlatformIOS, 0.8
	}

	// Default mobile platform
	return models.PlatformAndroid, 0.7
}

// detectFromUserAgent detects platform from User-Agent string
func (p *PlatformDetectionService) detectFromUserAgent(userAgent string) (models.PlatformType, float64) {
	if userAgent == "" {
		return models.PlatformWeb, 0.5 // Default to web with low confidence
	}

	userAgent = strings.ToLower(userAgent)

	// Check for mobile patterns first (more specific)
	if p.androidPatterns.MatchString(userAgent) {
		return models.PlatformAndroid, 0.9
	}
	if p.iosPatterns.MatchString(userAgent) {
		return models.PlatformIOS, 0.9
	}
	if p.mobilePatterns.MatchString(userAgent) {
		return models.PlatformAndroid, 0.7 // Default mobile to Android
	}

	// Check for web browser patterns
	if p.webPatterns.MatchString(userAgent) {
		return models.PlatformWeb, 0.9
	}

	// Default fallback
	return models.PlatformWeb, 0.6
}

// IsMobilePlatform checks if the platform is mobile
func (p *PlatformDetectionService) IsMobilePlatform(platform models.PlatformType) bool {
	return platform == models.PlatformAndroid || platform == models.PlatformIOS
}

// ValidateMobileAuthRequirements validates mobile authentication requirements
func (p *PlatformDetectionService) ValidateMobileAuthRequirements(context *PlatformContext, data map[string]interface{}) *ValidationResult {
	if !p.IsMobilePlatform(context.Platform) {
		return &ValidationResult{Valid: true}
	}

	var missingFields []string
	var errors []string

	// Required fields for mobile authentication
	requiredFields := []string{"device_id", "device_fingerprint"}

	for _, field := range requiredFields {
		if value, exists := data[field]; !exists || value == nil || value == "" {
			missingFields = append(missingFields, field)
		}
	}

	// Validate device_id format
	if deviceID, exists := data["device_id"].(string); exists && deviceID != "" {
		if len(deviceID) < 8 {
			errors = append(errors, "device_id too short (minimum 8 characters)")
		}
		if len(deviceID) > 255 {
			errors = append(errors, "device_id too long (maximum 255 characters)")
		}
	}

	// Validate device_fingerprint format
	if fingerprint, exists := data["device_fingerprint"].(string); exists && fingerprint != "" {
		if len(fingerprint) < 16 {
			errors = append(errors, "device_fingerprint too short (minimum 16 characters)")
		}
		if len(fingerprint) > 1024 {
			errors = append(errors, "device_fingerprint too long (maximum 1024 characters)")
		}
	}

	return &ValidationResult{
		Valid:         len(missingFields) == 0 && len(errors) == 0,
		MissingFields: missingFields,
		Errors:        errors,
	}
}

// GetEffectiveDeviceID gets the effective device ID from request
func (p *PlatformDetectionService) GetEffectiveDeviceID(r *http.Request, data map[string]interface{}) string {
	// Priority 1: Request data
	if deviceID, exists := data["device_id"].(string); exists && deviceID != "" {
		return deviceID
	}

	// Priority 2: Header
	if deviceID := r.Header.Get("X-Device-Id"); deviceID != "" {
		return deviceID
	}

	// Priority 3: Generate fallback for web
	return p.generateWebDeviceID(r)
}

// Helper methods

func (p *PlatformDetectionService) getDeviceID(r *http.Request, data map[string]interface{}) string {
	if deviceID, exists := data["device_id"].(string); exists {
		return deviceID
	}
	return r.Header.Get("X-Device-Id")
}

func (p *PlatformDetectionService) hasMobileFields(data map[string]interface{}) bool {
	mobileFields := []string{"device_id", "device_fingerprint", "device_info"}

	for _, field := range mobileFields {
		if value, exists := data[field]; exists && value != nil && value != "" {
			return true
		}
	}

	return false
}

func (p *PlatformDetectionService) extractDeviceInfo(data map[string]interface{}) *models.DeviceInfo {
	deviceInfoData, exists := data["device_info"]
	if !exists {
		return nil
	}

	deviceInfoMap, ok := deviceInfoData.(map[string]interface{})
	if !ok {
		return nil
	}

	deviceInfo := &models.DeviceInfo{}

	if model, ok := deviceInfoMap["model"].(string); ok {
		deviceInfo.Model = model
	}
	if brand, ok := deviceInfoMap["brand"].(string); ok {
		deviceInfo.Brand = brand
	}
	if osVersion, ok := deviceInfoMap["os_version"].(string); ok {
		deviceInfo.OSVersion = osVersion
	}
	if appVersion, ok := deviceInfoMap["app_version"].(string); ok {
		deviceInfo.AppVersion = appVersion
	}
	if buildNumber, ok := deviceInfoMap["build_number"].(string); ok {
		deviceInfo.BuildNumber = buildNumber
	}
	if deviceName, ok := deviceInfoMap["device_name"].(string); ok {
		deviceInfo.DeviceName = deviceName
	}

	return deviceInfo
}

func (p *PlatformDetectionService) generateWebDeviceID(r *http.Request) string {
	// Generate a pseudo-device ID for web clients
	userAgent := r.Header.Get("User-Agent")
	remoteAddr := r.RemoteAddr

	if userAgent == "" && remoteAddr == "" {
		return "web-unknown"
	}

	// Simple hash-based device ID for web
	hash := p.simpleHash(userAgent + ":" + remoteAddr)
	return "web-" + hash[:12]
}

func (p *PlatformDetectionService) simpleHash(input string) string {
	// Simple hash function for device ID generation
	hash := uint32(0)
	for _, char := range input {
		hash = hash*31 + uint32(char)
	}

	return strings.ToLower(strings.ReplaceAll(
		strings.ReplaceAll(
			strings.ReplaceAll(string(rune(hash)), " ", ""),
			"-", ""),
		"_", ""))[:min(len(string(rune(hash))), 16)]
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

const productionBackendEnvPath = `D:\agrinova\backend\config\.env`

// AuthConfig holds all configuration for the authentication module
type AuthConfig struct {
	Web      WebConfig      `json:"web"`
	Mobile   MobileConfig   `json:"mobile"`
	Security SecurityConfig `json:"security"`
}

// WebConfig holds web-specific authentication configuration
type WebConfig struct {
	SessionDuration    time.Duration `json:"session_duration"`
	RememberMeDuration time.Duration `json:"remember_me_duration"`
	CSRFSecret         string        `json:"csrf_secret"`
	Cookie             CookieConfig  `json:"cookie"`
}

// CookieConfig holds web cookie configuration
type CookieConfig struct {
	SessionName  string        `json:"session_name"`
	CSRFName     string        `json:"csrf_name"`
	Domain       string        `json:"domain"`
	Secure       bool          `json:"secure"`
	SameSite     string        `json:"same_site"`
	CSRFDuration time.Duration `json:"csrf_duration"`
}

// MobileConfig holds mobile-specific authentication configuration
type MobileConfig struct {
	AccessTokenDuration  time.Duration `json:"access_token_duration"`
	RefreshTokenDuration time.Duration `json:"refresh_token_duration"`
	OfflineTokenDuration time.Duration `json:"offline_token_duration"`
	MaxDevicesPerUser    int           `json:"max_devices_per_user"`
	DeviceSecret         string        `json:"device_secret"`
	JWT                  JWTConfig     `json:"jwt"`
}

// JWTConfig holds JWT token configuration
type JWTConfig struct {
	AccessSecret  string `json:"access_secret"`
	RefreshSecret string `json:"refresh_secret"`
	OfflineSecret string `json:"offline_secret"`
	Issuer        string `json:"issuer"`
}

// SecurityConfig holds security-related configuration
type SecurityConfig struct {
	PasswordMinLength     int           `json:"password_min_length"`
	MaxLoginAttempts      int           `json:"max_login_attempts"`
	LockoutDuration       time.Duration `json:"lockout_duration"`
	LogSecurityEvents     bool          `json:"log_security_events"`
	SecurityRetentionDays int           `json:"security_retention_days"`
}

// Load loads configuration from environment variables
func Load() (*AuthConfig, error) {
	// Environment loading policy:
	// - development: default .env lookup
	// - production: mandatory fixed env path on Windows production server
	if err := loadRuntimeEnv(); err != nil {
		return nil, err
	}

	config := &AuthConfig{
		Web: WebConfig{
			SessionDuration:    getDurationEnv("WEB_SESSION_DURATION", 24*time.Hour),
			RememberMeDuration: getDurationEnv("WEB_REMEMBER_ME_DURATION", 7*24*time.Hour),
			CSRFSecret:         getStringEnv("CSRF_SECRET", "default-csrf-secret-change-in-production"),
			Cookie: CookieConfig{
				SessionName:  getStringEnv("WEB_COOKIE_SESSION_NAME", "session_id"),
				CSRFName:     getStringEnv("WEB_COOKIE_CSRF_NAME", "csrf_token"),
				Domain:       getStringEnv("WEB_COOKIE_DOMAIN", "localhost"),
				Secure:       getBoolEnv("WEB_COOKIE_SECURE", false),
				SameSite:     getStringEnv("WEB_COOKIE_SAME_SITE", "lax"),
				CSRFDuration: getDurationEnv("WEB_COOKIE_CSRF_DURATION", time.Hour),
			},
		},
		Mobile: MobileConfig{
			AccessTokenDuration:  getDurationEnv("MOBILE_ACCESS_TOKEN_DURATION", 15*time.Minute),
			RefreshTokenDuration: getDurationEnv("MOBILE_REFRESH_TOKEN_DURATION", 7*24*time.Hour),
			OfflineTokenDuration: getDurationEnv("MOBILE_OFFLINE_TOKEN_DURATION", 30*24*time.Hour),
			MaxDevicesPerUser:    getIntEnv("MOBILE_MAX_DEVICES_PER_USER", 5),
			DeviceSecret:         getStringEnv("DEVICE_SECRET", "default-device-secret-change-in-production"),
			JWT: JWTConfig{
				AccessSecret:  getStringEnv("JWT_ACCESS_SECRET", "default-access-secret-change-in-production"),
				RefreshSecret: getStringEnv("JWT_REFRESH_SECRET", "default-refresh-secret-change-in-production"),
				OfflineSecret: getStringEnv("JWT_OFFLINE_SECRET", "default-offline-secret-change-in-production"),
				Issuer:        getStringEnv("MOBILE_JWT_ISSUER", "agrinova"),
			},
		},
		Security: SecurityConfig{
			PasswordMinLength:     getIntEnv("SECURITY_PASSWORD_MIN_LENGTH", 8),
			MaxLoginAttempts:      getIntEnv("SECURITY_MAX_LOGIN_ATTEMPTS", 5),
			LockoutDuration:       getDurationEnv("SECURITY_LOCKOUT_DURATION", 15*time.Minute),
			LogSecurityEvents:     getBoolEnv("SECURITY_LOG_EVENTS", true),
			SecurityRetentionDays: getIntEnv("SECURITY_RETENTION_DAYS", 30),
		},
	}

	return config, nil
}

func loadRuntimeEnv() error {
	customEnvPath := strings.TrimSpace(os.Getenv("AGRINOVA_ENV_FILE"))
	if customEnvPath != "" {
		if err := godotenv.Load(customEnvPath); err != nil {
			return fmt.Errorf("failed to load AGRINOVA_ENV_FILE '%s': %w", customEnvPath, err)
		}
		return nil
	}

	if isProductionRuntime() {
		if err := godotenv.Load(productionBackendEnvPath); err != nil {
			return fmt.Errorf("production env file is required at '%s': %w", productionBackendEnvPath, err)
		}
		return nil
	}

	_ = godotenv.Load()
	return nil
}

func isProductionRuntime() bool {
	productionEnvKeys := []string{
		"APP_ENV",
		"ENVIRONMENT",
		"ENV",
		"GO_ENV",
		"NODE_ENV",
	}

	for _, key := range productionEnvKeys {
		if strings.EqualFold(strings.TrimSpace(os.Getenv(key)), "production") {
			return true
		}
	}

	return strings.EqualFold(strings.TrimSpace(os.Getenv("GIN_MODE")), "release")
}

// Helper functions for reading environment variables with defaults

func getStringEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getBoolEnv(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

// Validate validates the configuration
func (c *AuthConfig) Validate() error {
	// Validate web configuration
	if c.Web.SessionDuration <= 0 {
		return errors.New("web session duration must be positive")
	}
	if c.Web.RememberMeDuration <= c.Web.SessionDuration {
		return errors.New("remember me duration must be longer than session duration")
	}
	if c.Web.CSRFSecret == "" || c.Web.CSRFSecret == "default-csrf-secret-change-in-production" {
		return errors.New("web CSRF secret must be set to a secure value")
	}

	// Validate mobile configuration
	if c.Mobile.AccessTokenDuration <= 0 {
		return errors.New("mobile access token duration must be positive")
	}
	if c.Mobile.RefreshTokenDuration <= c.Mobile.AccessTokenDuration {
		return errors.New("refresh token duration must be longer than access token duration")
	}
	if c.Mobile.OfflineTokenDuration <= c.Mobile.RefreshTokenDuration {
		return errors.New("offline token duration must be longer than refresh token duration")
	}
	if c.Mobile.MaxDevicesPerUser <= 0 {
		return errors.New("max devices per user must be positive")
	}

	// Validate JWT secrets
	if c.Mobile.JWT.AccessSecret == "" || c.Mobile.JWT.AccessSecret == "default-access-secret-change-in-production" {
		return errors.New("mobile JWT access secret must be set to a secure value")
	}
	if c.Mobile.JWT.RefreshSecret == "" || c.Mobile.JWT.RefreshSecret == "default-refresh-secret-change-in-production" {
		return errors.New("mobile JWT refresh secret must be set to a secure value")
	}
	if c.Mobile.JWT.OfflineSecret == "" || c.Mobile.JWT.OfflineSecret == "default-offline-secret-change-in-production" {
		return errors.New("mobile JWT offline secret must be set to a secure value")
	}

	// Validate security configuration
	if c.Security.PasswordMinLength < 8 {
		return errors.New("password minimum length must be at least 8 characters")
	}
	if c.Security.MaxLoginAttempts <= 0 {
		return errors.New("max login attempts must be positive")
	}
	if c.Security.LockoutDuration <= 0 {
		return errors.New("lockout duration must be positive")
	}

	return nil
}

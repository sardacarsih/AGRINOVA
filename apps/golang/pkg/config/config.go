package config

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

const productionBackendEnvPath = `D:\agrinova\backend\config\.env`

// Config holds all application configuration
type Config struct {
	Database   DatabaseConfig  `mapstructure:"database"`
	Server     ServerConfig    `mapstructure:"server"`
	CORS       CORSConfig      `mapstructure:"cors"`
	Auth       AuthConfig      `mapstructure:"auth"`
	Security   SecurityConfig  `mapstructure:"security"`
	Logging    LoggingConfig   `mapstructure:"logging"`
	WebSocket  WebSocketConfig `mapstructure:"websocket"`
	GraphQL    GraphQLConfig   `mapstructure:"graphql"`
	UploadsDir string          `mapstructure:"uploads_dir"`
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	URL      string `mapstructure:"url"`
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	Name     string `mapstructure:"name"`
	SSLMode  string `mapstructure:"ssl_mode"`
}

// DSN returns the PostgreSQL connection string
func (d *DatabaseConfig) DSN() string {
	if d.URL != "" {
		return d.URL
	}
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Password, d.Name, d.SSLMode)
}

// ServerConfig holds server configuration
type ServerConfig struct {
	Port            int           `mapstructure:"port"`
	Host            string        `mapstructure:"host"`
	GinMode         string        `mapstructure:"gin_mode"`
	GraphQLEndpoint string        `mapstructure:"graphql_endpoint"`
	ReadTimeout     time.Duration `mapstructure:"read_timeout"`
	WriteTimeout    time.Duration `mapstructure:"write_timeout"`
	IdleTimeout     time.Duration `mapstructure:"idle_timeout"`
}

// CORSConfig holds CORS configuration
type CORSConfig struct {
	AllowedOrigins []string `mapstructure:"allowed_origins"`
	AllowedMethods []string `mapstructure:"allowed_methods"`
	AllowedHeaders []string `mapstructure:"allowed_headers"`
	MaxAge         int      `mapstructure:"max_age"`
}

// AuthConfig holds authentication configuration
type AuthConfig struct {
	JWTAccessSecret      string        `mapstructure:"jwt_access_secret"`
	JWTRefreshSecret     string        `mapstructure:"jwt_refresh_secret"`
	JWTOfflineSecret     string        `mapstructure:"jwt_offline_secret"`
	DeviceSecret         string        `mapstructure:"device_secret"`
	CSRFSecret           string        `mapstructure:"csrf_secret"`
	JWTIssuer            string        `mapstructure:"jwt_issuer"`
	AccessTokenDuration  time.Duration `mapstructure:"access_token_duration"`
	RefreshTokenDuration time.Duration `mapstructure:"refresh_token_duration"`
	OfflineTokenDuration time.Duration `mapstructure:"offline_token_duration"`
	WebSessionDuration   time.Duration `mapstructure:"web_session_duration"`
	CookieDomain         string        `mapstructure:"cookie_domain"`
	SecureCookies        bool          `mapstructure:"secure_cookies"`
	SameSiteStrict       bool          `mapstructure:"same_site_strict"`
	MaxDevicesPerUser    int           `mapstructure:"max_devices_per_user"`
	RequireManualAuth    bool          `mapstructure:"require_manual_auth"`
	// Note: Using Argon2id for password hashing (more secure than bcrypt)
	// Argon2 parameters are hardcoded for security consistency
}

// SecurityConfig holds security configuration
type SecurityConfig struct {
	RateLimitEnabled        bool `mapstructure:"rate_limit_enabled"`
	RateLimitRequestsPerMin int  `mapstructure:"rate_limit_requests_per_minute"`
	RateLimitBurst          int  `mapstructure:"rate_limit_burst"`
	CSRFEnabled             bool `mapstructure:"csrf_enabled"`
	DeviceBindingEnabled    bool `mapstructure:"device_binding_enabled"`
	MinSecretLength         int  `mapstructure:"min_secret_length"`
}

// LoggingConfig holds logging configuration
type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
}

// WebSocketConfig holds WebSocket configuration
type WebSocketConfig struct {
	Enabled           bool          `mapstructure:"enabled"`
	KeepaliveInterval time.Duration `mapstructure:"keepalive_interval"`
	ReadTimeout       time.Duration `mapstructure:"read_timeout"`
	WriteTimeout      time.Duration `mapstructure:"write_timeout"`
	MaxConnections    int           `mapstructure:"max_connections"`
}

// GraphQLConfig holds GraphQL configuration
type GraphQLConfig struct {
	PlaygroundEnabled    bool          `mapstructure:"playground_enabled"`
	IntrospectionEnabled bool          `mapstructure:"introspection_enabled"`
	MaxQueryDepth        int           `mapstructure:"max_query_depth"`
	MaxQueryFields       int           `mapstructure:"max_query_fields"`
	MaxQueryCost         int           `mapstructure:"max_query_cost"`
	SlowQueryThreshold   time.Duration `mapstructure:"slow_query_threshold"`
}

// Load loads configuration using Viper from environment variables and config files
func Load() (*Config, error) {
	// Environment loading policy:
	// - development: default .env lookup
	// - production: mandatory fixed env path on Windows production server
	if err := loadRuntimeEnv(); err != nil {
		return nil, err
	}

	viper.SetConfigName("config") // name of config file (without extension)
	viper.SetConfigType("yaml")   // REQUIRED if the config file does not have the extension in the name
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")
	viper.AddConfigPath("$HOME/.agrinova")

	// Read environment variables
	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	// Note: Not using SetEnvPrefix to allow both prefixed and direct env vars

	// Set defaults
	setDefaults()

	// Bind specific environment variables that don't use the AGRINOVA prefix
	viper.BindEnv("auth.jwt_access_secret", "JWT_ACCESS_SECRET")
	viper.BindEnv("auth.jwt_refresh_secret", "JWT_REFRESH_SECRET")
	viper.BindEnv("auth.jwt_offline_secret", "JWT_OFFLINE_SECRET")
	viper.BindEnv("auth.device_secret", "DEVICE_SECRET")
	viper.BindEnv("auth.csrf_secret", "CSRF_SECRET")

	// Bind database environment variables
	viper.BindEnv("database.host", "AGRINOVA_DATABASE_HOST")
	viper.BindEnv("database.port", "AGRINOVA_DATABASE_PORT")
	viper.BindEnv("database.user", "AGRINOVA_DATABASE_USER")
	viper.BindEnv("database.password", "AGRINOVA_DATABASE_PASSWORD")
	viper.BindEnv("database.name", "AGRINOVA_DATABASE_NAME")
	viper.BindEnv("database.ssl_mode", "AGRINOVA_DATABASE_SSL_MODE")
	viper.BindEnv("uploads_dir", "AGRINOVA_UPLOADS_DIR")

	// Read in config file if available
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
		// Config file not found; ignore error if desired
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}
	config.UploadsDir = filepath.Clean(strings.TrimSpace(config.UploadsDir))
	if config.UploadsDir == "." || config.UploadsDir == "" {
		config.UploadsDir = "./uploads"
	}

	// Validate configuration
	if err := validateConfig(&config); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	// Generate secure secrets if needed
	if err := ensureSecureSecrets(&config); err != nil {
		return nil, fmt.Errorf("failed to ensure secure secrets: %w", err)
	}

	return &config, nil
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

// setDefaults sets default configuration values
func setDefaults() {
	// Database defaults
	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.user", "postgres")
	viper.SetDefault("database.name", "agrinova_go")
	viper.SetDefault("database.ssl_mode", "disable")

	// Server defaults
	viper.SetDefault("server.port", 8080)
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.gin_mode", "release")
	viper.SetDefault("server.graphql_endpoint", "/graphql")
	viper.SetDefault("server.read_timeout", 30*time.Second)
	viper.SetDefault("server.write_timeout", 30*time.Second)
	viper.SetDefault("server.idle_timeout", 120*time.Second)

	// CORS defaults
	viper.SetDefault("cors.allowed_origins", []string{"http://localhost:3000", "http://localhost:3001"})
	viper.SetDefault("cors.allowed_methods", []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"})
	viper.SetDefault("cors.allowed_headers", []string{"Origin", "Content-Type", "Accept", "Authorization", "X-CSRF-Token"})
	viper.SetDefault("cors.max_age", 86400)

	// Auth defaults
	viper.SetDefault("auth.jwt_issuer", "agrinova-api")
	viper.SetDefault("auth.access_token_duration", 15*time.Minute)
	viper.SetDefault("auth.refresh_token_duration", 7*24*time.Hour)
	viper.SetDefault("auth.offline_token_duration", 30*24*time.Hour)
	viper.SetDefault("auth.web_session_duration", 24*time.Hour)
	viper.SetDefault("auth.cookie_domain", "localhost")
	viper.SetDefault("auth.secure_cookies", false)
	viper.SetDefault("auth.same_site_strict", false)
	viper.SetDefault("auth.max_devices_per_user", 5)
	viper.SetDefault("auth.require_manual_auth", false)
	// Note: Using Argon2id for password hashing with secure hardcoded defaults
	// No need for configurable bcrypt cost

	// Security defaults
	viper.SetDefault("security.rate_limit_enabled", true)
	viper.SetDefault("security.rate_limit_requests_per_minute", 100)
	viper.SetDefault("security.rate_limit_burst", 10)
	viper.SetDefault("security.csrf_enabled", true)
	viper.SetDefault("security.device_binding_enabled", true)
	viper.SetDefault("security.min_secret_length", 32)

	// Logging defaults
	viper.SetDefault("logging.level", "info")
	viper.SetDefault("logging.format", "json")

	// WebSocket defaults
	viper.SetDefault("websocket.enabled", true)
	viper.SetDefault("websocket.keepalive_interval", 10*time.Second)
	viper.SetDefault("websocket.read_timeout", 60*time.Second)
	viper.SetDefault("websocket.write_timeout", 60*time.Second)
	viper.SetDefault("websocket.max_connections", 2000)

	// GraphQL defaults
	viper.SetDefault("graphql.playground_enabled", true)
	viper.SetDefault("graphql.introspection_enabled", true)
	viper.SetDefault("graphql.max_query_depth", 10)
	viper.SetDefault("graphql.max_query_fields", 100)
	viper.SetDefault("graphql.max_query_cost", 1000)
	viper.SetDefault("graphql.slow_query_threshold", 5*time.Second)

	// Storage defaults
	viper.SetDefault("uploads_dir", "./uploads")
}

// validateConfig validates the loaded configuration
func validateConfig(config *Config) error {
	// Validate database configuration
	if config.Database.Host == "" {
		return fmt.Errorf("database host is required")
	}
	if config.Database.Port <= 0 || config.Database.Port > 65535 {
		return fmt.Errorf("database port must be between 1 and 65535")
	}
	if config.Database.User == "" {
		return fmt.Errorf("database user is required")
	}
	if config.Database.Password == "" {
		return fmt.Errorf("database password is required")
	}
	if config.Database.Name == "" {
		return fmt.Errorf("database name is required")
	}

	// Validate server configuration
	if config.Server.Port <= 0 || config.Server.Port > 65535 {
		return fmt.Errorf("server port must be between 1 and 65535")
	}

	// Validate auth configuration
	minSecretLength := config.Security.MinSecretLength
	if len(config.Auth.JWTAccessSecret) < minSecretLength {
		return fmt.Errorf("JWT access secret must be at least %d characters", minSecretLength)
	}
	if len(config.Auth.JWTRefreshSecret) < minSecretLength {
		return fmt.Errorf("JWT refresh secret must be at least %d characters", minSecretLength)
	}
	if len(config.Auth.JWTOfflineSecret) < minSecretLength {
		return fmt.Errorf("JWT offline secret must be at least %d characters", minSecretLength)
	}
	if len(config.Auth.DeviceSecret) < minSecretLength {
		return fmt.Errorf("device secret must be at least %d characters", minSecretLength)
	}
	if len(config.Auth.CSRFSecret) < minSecretLength {
		return fmt.Errorf("CSRF secret must be at least %d characters", minSecretLength)
	}

	// Note: Using Argon2id with hardcoded secure defaults
	// No bcrypt cost validation needed

	return nil
}

// ensureSecureSecrets ensures all secrets are properly set from environment variables
func ensureSecureSecrets(config *Config) error {
	// Override secrets from direct environment variables (no prefix required)
	if secret := os.Getenv("JWT_ACCESS_SECRET"); secret != "" {
		config.Auth.JWTAccessSecret = secret
	}
	if secret := os.Getenv("JWT_REFRESH_SECRET"); secret != "" {
		config.Auth.JWTRefreshSecret = secret
	}
	if secret := os.Getenv("JWT_OFFLINE_SECRET"); secret != "" {
		config.Auth.JWTOfflineSecret = secret
	}
	if secret := os.Getenv("DEVICE_SECRET"); secret != "" {
		config.Auth.DeviceSecret = secret
	}
	if secret := os.Getenv("CSRF_SECRET"); secret != "" {
		config.Auth.CSRFSecret = secret
	}

	// Also try from database password if not set through Viper
	if config.Database.Password == "" {
		if dbPassword := os.Getenv("DATABASE_PASSWORD"); dbPassword != "" {
			config.Database.Password = dbPassword
		}
	}

	// Validate that all required secrets are set and strong
	if isWeakSecret(config.Auth.JWTAccessSecret) {
		return fmt.Errorf("JWT_ACCESS_SECRET environment variable is required and must be at least %d characters", config.Security.MinSecretLength)
	}
	if isWeakSecret(config.Auth.JWTRefreshSecret) {
		return fmt.Errorf("JWT_REFRESH_SECRET environment variable is required and must be at least %d characters", config.Security.MinSecretLength)
	}
	if isWeakSecret(config.Auth.JWTOfflineSecret) {
		return fmt.Errorf("JWT_OFFLINE_SECRET environment variable is required and must be at least %d characters", config.Security.MinSecretLength)
	}
	if isWeakSecret(config.Auth.DeviceSecret) {
		return fmt.Errorf("DEVICE_SECRET environment variable is required and must be at least %d characters", config.Security.MinSecretLength)
	}
	if isWeakSecret(config.Auth.CSRFSecret) {
		return fmt.Errorf("CSRF_SECRET environment variable is required and must be at least %d characters", config.Security.MinSecretLength)
	}

	return nil
}

// isWeakSecret checks if a secret is weak or using default values
func isWeakSecret(secret string) bool {
	weakSecrets := []string{
		"dev-access-secret-key-change-in-production",
		"dev-refresh-secret-key-change-in-production",
		"dev-offline-secret-key-change-in-production",
		"dev-device-secret-change-in-production",
		"dev-csrf-secret-change-in-production",
		"your-access-token-secret-key-here",
		"your-refresh-token-secret-key-here",
		"your-offline-token-secret-key-here",
		"your-device-secret-key-here",
		"your-super-secure-csrf-secret-key-here-change-in-production",
		"",
	}

	for _, weak := range weakSecrets {
		if secret == weak {
			return true
		}
	}

	// Check if secret is too short
	return len(secret) < 32
}

// generateSecureSecret generates a cryptographically secure random secret
func generateSecureSecret(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes)[:length], nil
}

// GetConfigValue returns a configuration value by key
func GetConfigValue(key string) interface{} {
	return viper.Get(key)
}

// GetConfigString returns a string configuration value
func GetConfigString(key string) string {
	return viper.GetString(key)
}

// GetConfigBool returns a boolean configuration value
func GetConfigBool(key string) bool {
	return viper.GetBool(key)
}

// GetConfigInt returns an integer configuration value
func GetConfigInt(key string) int {
	return viper.GetInt(key)
}

// GetConfigDuration returns a duration configuration value
func GetConfigDuration(key string) time.Duration {
	return viper.GetDuration(key)
}

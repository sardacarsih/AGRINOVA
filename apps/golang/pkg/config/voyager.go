package config

import (
	"os"
	"strings"
)

// VoyagerConfig holds configuration for GraphQL Voyager
type VoyagerConfig struct {
	Enabled               bool
	RequireAuthentication bool
	AllowedOrigins        []string
	MaxIntrospectionSize  int
}

// LoadVoyagerConfig loads Voyager-specific configuration
func LoadVoyagerConfig() VoyagerConfig {
	cfg := VoyagerConfig{
		// Default values
		Enabled:               true,
		RequireAuthentication: false,
		AllowedOrigins:        []string{"*"},
		MaxIntrospectionSize:  100000, // 100KB limit for introspection response
	}

	// Environment-based configuration
	env := strings.ToLower(os.Getenv("GO_ENV"))

	switch env {
	case "production", "prod":
		// Production: More restrictive settings
		cfg.Enabled = getBoolEnv("VOYAGER_ENABLED", false)
		cfg.RequireAuthentication = getBoolEnv("VOYAGER_REQUIRE_AUTH", true)
		cfg.AllowedOrigins = getStringSliceEnv("VOYAGER_ALLOWED_ORIGINS", []string{
			"https://agrinova.com",
			"https://admin.agrinova.com",
		})

	case "staging", "stage":
		// Staging: Moderate restrictions
		cfg.Enabled = getBoolEnv("VOYAGER_ENABLED", true)
		cfg.RequireAuthentication = getBoolEnv("VOYAGER_REQUIRE_AUTH", true)
		cfg.AllowedOrigins = getStringSliceEnv("VOYAGER_ALLOWED_ORIGINS", []string{
			"https://staging.agrinova.com",
			"http://localhost:3000",
			"http://localhost:3001",
		})

	case "development", "dev", "":
		// Development: More permissive for development
		cfg.Enabled = getBoolEnv("VOYAGER_ENABLED", true)
		cfg.RequireAuthentication = getBoolEnv("VOYAGER_REQUIRE_AUTH", false)
		cfg.AllowedOrigins = getStringSliceEnv("VOYAGER_ALLOWED_ORIGINS", []string{
			"http://localhost:3000",
			"http://localhost:3001",
			"http://localhost:8080",
			"http://127.0.0.1:3000",
			"http://127.0.0.1:3001",
			"http://127.0.0.1:8080",
		})
	}

	return cfg
}

// getBoolEnv gets a boolean environment variable with default
func getBoolEnv(key string, defaultValue bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return strings.ToLower(value) == "true" || value == "1"
}

// getStringSliceEnv gets a comma-separated string slice from environment
func getStringSliceEnv(key string, defaultValue []string) []string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	parts := strings.Split(value, ",")
	result := make([]string, len(parts))
	for i, part := range parts {
		result[i] = strings.TrimSpace(part)
	}
	return result
}

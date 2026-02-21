package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// APIKeyStatus represents the status of an API key
type APIKeyStatus string

const (
	APIKeyStatusActive  APIKeyStatus = "ACTIVE"
	APIKeyStatusRevoked APIKeyStatus = "REVOKED"
	APIKeyStatusExpired APIKeyStatus = "EXPIRED"
)

// StringArray is a custom type for handling string arrays in GORM/Postgres
type StringArray []string

// Scan implements the Scanner interface
func (a *StringArray) Scan(value interface{}) error {
	if value == nil {
		*a = []string{}
		return nil
	}

	var str string
	switch v := value.(type) {
	case []byte:
		str = string(v)
	case string:
		str = v
	default:
		return errors.New("type assertion to []byte or string failed")
	}

	// Handle empty value
	if len(str) < 2 {
		*a = []string{}
		return nil
	}

	// If it's JSON format ["item1","item2"]
	if str[0] == '[' {
		return json.Unmarshal([]byte(str), a)
	}

	// Postgres array format {item1,item2}
	if str[0] == '{' && str[len(str)-1] == '}' {
		// Remove curly braces
		str = str[1 : len(str)-1]
		if str == "" {
			*a = []string{}
			return nil
		}

		// Split by comma
		// This is a simple implementation that works for basic strings
		// For more complex cases with quoted strings containing commas, use a proper parser
		parts := make([]string, 0)
		for _, part := range splitByComma(str) {
			trimmed := trimQuotes(part)
			if trimmed != "" {
				parts = append(parts, trimmed)
			}
		}
		*a = parts
		return nil
	}

	// Fallback: try JSON unmarshal
	return json.Unmarshal([]byte(str), a)
}

// Helper function to split by comma (handles basic cases)
func splitByComma(s string) []string {
	var result []string
	var current string
	inQuotes := false

	for _, ch := range s {
		if ch == '"' {
			inQuotes = !inQuotes
			current += string(ch)
		} else if ch == ',' && !inQuotes {
			result = append(result, current)
			current = ""
		} else {
			current += string(ch)
		}
	}

	if current != "" {
		result = append(result, current)
	}

	return result
}

// Helper function to trim quotes and whitespace
func trimQuotes(s string) string {
	s = trimSpace(s)
	if len(s) >= 2 && s[0] == '"' && s[len(s)-1] == '"' {
		return s[1 : len(s)-1]
	}
	return s
}

// Helper function to trim whitespace
func trimSpace(s string) string {
	start := 0
	end := len(s)

	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}

	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}

	return s[start:end]
}

// Value implements the driver Valuer interface
func (a StringArray) Value() (driver.Value, error) {
	return json.Marshal(a)
}

// APIKey represents an external application's access credentials
type APIKey struct {
	ID         string       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name       string       `gorm:"type:varchar(255);not null" json:"name"`
	Prefix     string       `gorm:"type:varchar(10);not null;index" json:"prefix"`
	KeyHash    string       `gorm:"type:varchar(255);not null" json:"-"` // Never return hash
	Scopes     StringArray  `gorm:"type:text" json:"scopes"`             // Stored as JSON array for SQLite compatibility
	Status     APIKeyStatus `gorm:"type:varchar(20);not null;default:'ACTIVE';index" json:"status"`
	ExpiresAt  *time.Time   `gorm:"index" json:"expiresAt"`
	LastUsedAt *time.Time   `json:"lastUsedAt"`
	CreatedBy  string       `gorm:"type:uuid;not null" json:"createdBy"`
	CreatedAt  time.Time    `json:"createdAt"`
	UpdatedAt  time.Time    `json:"updatedAt"`
	RevokedAt  *time.Time   `json:"revokedAt"`
	RevokedBy  *string      `gorm:"type:uuid" json:"revokedBy"`
}

// APIKeyLog represents an audit log for API key operations
type APIKeyLog struct {
	ID          string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	APIKeyID    string          `gorm:"type:uuid;index" json:"apiKeyId"`
	Action      string          `gorm:"type:varchar(50);not null" json:"action"` // CREATE, ROTATE, REVOKE, AUTH_FAILURE
	PerformedBy *string         `gorm:"type:uuid" json:"performedBy"`            // NULL if system
	IPAddress   string          `gorm:"type:varchar(45)" json:"ipAddress"`
	UserAgent   string          `gorm:"type:text" json:"userAgent"`
	Details     json.RawMessage `gorm:"type:text" json:"details"` // Stored as JSON text
	CreatedAt   time.Time       `json:"createdAt"`
}

// BeforeCreate hook to set default values
func (k *APIKey) BeforeCreate(tx *gorm.DB) error {
	if k.ID == "" {
		k.ID = uuid.New().String()
	}
	if k.Status == "" {
		k.Status = APIKeyStatusActive
	}
	return nil
}

// BeforeCreate hook for logs
func (l *APIKeyLog) BeforeCreate(tx *gorm.DB) error {
	if l.ID == "" {
		l.ID = uuid.New().String()
	}
	return nil
}

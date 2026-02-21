package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"
)

var (
	wibOnce     sync.Once
	wibLocation *time.Location
)

// getWIBLocation returns Asia/Jakarta timezone, cached
func getWIBLocation() *time.Location {
	wibOnce.Do(func() {
		loc, err := time.LoadLocation("Asia/Jakarta")
		if err != nil {
			loc = time.FixedZone("WIB", 7*60*60)
		}
		wibLocation = loc
	})
	return wibLocation
}

// StringUtils provides string manipulation utilities
type StringUtils struct{}

// GenerateRandomString generates a random string of specified length
func (s StringUtils) GenerateRandomString(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// SanitizeString removes special characters and normalizes string
func (s StringUtils) SanitizeString(input string) string {
	// Remove special characters, keep alphanumeric and spaces
	reg := regexp.MustCompile(`[^a-zA-Z0-9\s]+`)
	sanitized := reg.ReplaceAllString(input, "")

	// Trim and normalize spaces
	return strings.TrimSpace(regexp.MustCompile(`\s+`).ReplaceAllString(sanitized, " "))
}

// TimeUtils provides time manipulation utilities
type TimeUtils struct{}

// ParseTimeString parses common time formats.
// If the string does not contain a timezone offset, it assumes WIB (Asia/Jakarta).
func (t TimeUtils) ParseTimeString(timeStr string) (time.Time, error) {
	// Offset-aware layouts
	awareLayouts := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02T15:04:05.000Z",
		"2006-01-02T15:04:05.000000Z",
	}

	for _, layout := range awareLayouts {
		if parsedTime, err := time.Parse(layout, timeStr); err == nil {
			return parsedTime, nil
		}
	}

	// Layouts that might not have offsets - assume WIB
	naiveLayouts := []string{
		"2006-01-02T15:04:05.000",    // ISO8601 with milliseconds
		"2006-01-02T15:04:05.000000", // ISO8601 with microseconds
		"2006-01-02T15:04:05",        // ISO8601 without timezone
		"2006-01-02 15:04:05",
		"2006-01-02",
	}

	wib := getWIBLocation()
	for _, layout := range naiveLayouts {
		if parsedTime, err := time.ParseInLocation(layout, timeStr, wib); err == nil {
			return parsedTime, nil
		}
	}

	return time.Time{}, fmt.Errorf("unable to parse time string: %s", timeStr)
}

// FormatTimeForDatabase formats time for database storage
func (t TimeUtils) FormatTimeForDatabase(inputTime time.Time) string {
	return inputTime.UTC().Format("2006-01-02T15:04:05.000Z")
}

// ValidationUtils provides validation utilities
type ValidationUtils struct{}

// IsValidEmail checks if email format is valid
func (v ValidationUtils) IsValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// IsValidPhoneNumber checks Indonesian phone number format
func (v ValidationUtils) IsValidPhoneNumber(phone string) bool {
	// Indonesian phone number patterns: 08xx-xxxx-xxxx, +62xxx
	phoneRegex := regexp.MustCompile(`^(\+62|62|0)8[1-9][0-9]{6,9}$`)
	return phoneRegex.MatchString(strings.ReplaceAll(phone, "-", ""))
}

// IsValidPlateNumber checks Indonesian vehicle plate format
func (v ValidationUtils) IsValidPlateNumber(plate string) bool {
	// Format: B 1234 ABC (Jakarta), AA 1234 BB (other regions)
	plateRegex := regexp.MustCompile(`^[A-Z]{1,2}\s\d{1,4}\s[A-Z]{1,3}$`)
	return plateRegex.MatchString(strings.ToUpper(plate))
}

// Global utility instances
var (
	String     = StringUtils{}
	Time       = TimeUtils{}
	Validation = ValidationUtils{}
)

// Helper functions for common operations
func Contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func RemoveDuplicates(slice []string) []string {
	keys := make(map[string]bool)
	var result []string

	for _, item := range slice {
		if !keys[item] {
			keys[item] = true
			result = append(result, item)
		}
	}

	return result
}

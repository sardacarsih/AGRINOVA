package security

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"unicode"

	"golang.org/x/crypto/argon2"
)

var (
	ErrInvalidHash         = errors.New("invalid password hash format")
	ErrIncompatibleVersion = errors.New("incompatible version of argon2")
)

// PasswordService handles secure password hashing and verification using Argon2id
type PasswordService struct {
	// Argon2id parameters
	memory      uint32 // Memory usage in KB
	iterations  uint32 // Number of iterations
	parallelism uint8  // Number of threads
	saltLength  uint32 // Salt length in bytes
	keyLength   uint32 // Key length in bytes
}

// PasswordConfig holds configuration for password hashing
type PasswordConfig struct {
	Memory      uint32 // 64MB
	Iterations  uint32 // 3 iterations
	Parallelism uint8  // 2 threads
	SaltLength  uint32 // 16 bytes
	KeyLength   uint32 // 32 bytes
}

// NewPasswordService creates a new password service with secure defaults
func NewPasswordService() *PasswordService {
	return &PasswordService{
		memory:      64 * 1024, // 64MB
		iterations:  3,         // 3 iterations
		parallelism: 2,         // 2 threads
		saltLength:  16,        // 16 bytes salt
		keyLength:   32,        // 32 bytes key
	}
}

// NewPasswordServiceWithConfig creates a new password service with custom config
func NewPasswordServiceWithConfig(config PasswordConfig) *PasswordService {
	return &PasswordService{
		memory:      config.Memory,
		iterations:  config.Iterations,
		parallelism: config.Parallelism,
		saltLength:  config.SaltLength,
		keyLength:   config.KeyLength,
	}
}

// HashPassword generates a secure hash of the password using Argon2id
func (p *PasswordService) HashPassword(password string) (string, error) {
	// Generate a random salt
	salt, err := p.generateRandomBytes(p.saltLength)
	if err != nil {
		return "", fmt.Errorf("failed to generate salt: %w", err)
	}

	// Generate the hash using Argon2id
	hash := argon2.IDKey([]byte(password), salt, p.iterations, p.memory, p.parallelism, p.keyLength)

	// Encode salt and hash to base64
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	// Return the encoded hash in the format:
	// $argon2id$v=19$m=65536,t=3,p=2$salt$hash
	encodedHash := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, p.memory, p.iterations, p.parallelism, b64Salt, b64Hash)

	return encodedHash, nil
}

// VerifyPassword verifies if a password matches the hash using strict Argon2id
func (p *PasswordService) VerifyPassword(hashedPassword, password string) error {
	// Strict Argon2id verification only
	// NOTE: This creates a breaking change for legacy bcrypt hashes

	isValid, err := p.verifyArgon2(password, hashedPassword)
	if err != nil {
		return err
	}
	if !isValid {
		return errors.New("password verification failed")
	}
	return nil
}

// verifyArgon2 is the internal verification logic
func (p *PasswordService) verifyArgon2(password, encodedHash string) (bool, error) {
	// Extract parameters and hash from the encoded hash
	params, salt, hash, err := p.decodeHash(encodedHash)
	if err != nil {
		return false, fmt.Errorf("failed to decode hash: %w", err)
	}

	// Generate hash with the same parameters
	otherHash := argon2.IDKey([]byte(password), salt, params.iterations, params.memory, params.parallelism, params.keyLength)

	// Compare hashes using constant-time comparison
	if subtle.ConstantTimeCompare(hash, otherHash) == 1 {
		return true, nil
	}
	return false, nil
}

// NeedsRehash checks if the password hash needs to be rehashed
// This is useful when updating password hashing parameters
func (p *PasswordService) NeedsRehash(encodedHash string) (bool, error) {
	params, _, _, err := p.decodeHash(encodedHash)
	if err != nil {
		return false, err
	}

	// Check if current parameters match the hash parameters
	return params.memory != p.memory ||
		params.iterations != p.iterations ||
		params.parallelism != p.parallelism ||
		params.keyLength != p.keyLength, nil
}

// hashParams holds the parameters extracted from an encoded hash
type hashParams struct {
	memory      uint32
	iterations  uint32
	parallelism uint8
	keyLength   uint32
}

// decodeHash extracts parameters, salt, and hash from an encoded hash string
func (p *PasswordService) decodeHash(encodedHash string) (*hashParams, []byte, []byte, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return nil, nil, nil, ErrInvalidHash
	}

	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
		return nil, nil, nil, fmt.Errorf("failed to parse version: %w", err)
	}
	if version != argon2.Version {
		return nil, nil, nil, ErrIncompatibleVersion
	}

	params := &hashParams{}
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &params.memory, &params.iterations, &params.parallelism); err != nil {
		return nil, nil, nil, fmt.Errorf("failed to parse parameters: %w", err)
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to decode salt: %w", err)
	}

	hash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to decode hash: %w", err)
	}
	params.keyLength = uint32(len(hash))

	return params, salt, hash, nil
}

// generateRandomBytes generates cryptographically secure random bytes
func (p *PasswordService) generateRandomBytes(n uint32) ([]byte, error) {
	b := make([]byte, n)
	_, err := rand.Read(b)
	if err != nil {
		return nil, err
	}
	return b, nil
}

// IsValidPassword performs comprehensive password strength validation
func (p *PasswordService) ValidatePassword(password string) error {
	// Re-implementing the simpler validation from the previous shared service to respect interface potentially?
	// The previous one was:
	/*
		func (s *PasswordService) ValidatePassword(password string) error {
			if len(password) < 8 {
				return fmt.Errorf("password must be at least 8 characters long")
			}
			return nil
		}
	*/
	// The new one (from services/password_service.go) `IsValidPassword` has more complex rules.
	// We should probably keep the robust one but maybe alias it to ValidatePassword if that's what's called.
	// Looking at `internal/auth/features/shared/infrastructure/security/password_service.go`, it had `ValidatePassword`.

	// Let's use the robust validation logic here.

	// Length validation
	if len(password) < 12 {
		return errors.New("password must be at least 12 characters long")
	}
	if len(password) > 128 {
		return errors.New("password must be less than 128 characters long")
	}

	// Character type requirements
	hasUpper := false
	hasLower := false
	hasDigit := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if !hasUpper {
		return errors.New("password must contain at least one uppercase letter")
	}
	if !hasLower {
		return errors.New("password must contain at least one lowercase letter")
	}
	if !hasDigit {
		return errors.New("password must contain at least one digit")
	}
	if !hasSpecial {
		return errors.New("password must contain at least one special character")
	}

	// Check for common weak patterns
	if err := p.checkWeakPatterns(password); err != nil {
		return err
	}

	// Check for sequential characters
	if p.hasSequentialCharacters(password) {
		return errors.New("password must not contain sequential characters (e.g., 123, abc)")
	}

	// Check for repeated characters
	if p.hasExcessiveRepeatedCharacters(password) {
		return errors.New("password must not contain excessive repeated characters")
	}

	return nil
}

// checkWeakPatterns checks for common weak password patterns
func (p *PasswordService) checkWeakPatterns(password string) error {
	passwordLower := strings.ToLower(password)

	// Common weak passwords
	weakPasswords := []string{
		"password", "123456", "12345678", "qwerty", "abc123",
		"password123", "admin", "letmein", "welcome", "monkey",
		"1234567890", "password1", "123123", "welcome123",
		"admin123", "root", "toor", "pass", "test", "guest",
	}

	for _, weak := range weakPasswords {
		if strings.Contains(passwordLower, weak) {
			return errors.New("password contains a common weak pattern")
		}
	}

	return nil
}

// hasSequentialCharacters checks for sequential ASCII characters
func (p *PasswordService) hasSequentialCharacters(password string) bool {
	for i := 0; i < len(password)-2; i++ {
		// Check for ascending sequence
		if password[i]+1 == password[i+1] && password[i+1]+1 == password[i+2] {
			return true
		}
		// Check for descending sequence
		if password[i]-1 == password[i+1] && password[i+1]-1 == password[i+2] {
			return true
		}
	}
	return false
}

// hasExcessiveRepeatedCharacters checks for too many repeated characters
func (p *PasswordService) hasExcessiveRepeatedCharacters(password string) bool {
	charCount := make(map[rune]int)

	for _, char := range password {
		charCount[char]++
		// If any character appears more than 3 times, reject
		if charCount[char] > 3 {
			return true
		}
	}

	// Check for consecutive repeated characters
	consecutiveCount := 1
	for i := 1; i < len(password); i++ {
		if password[i] == password[i-1] {
			consecutiveCount++
			if consecutiveCount > 2 { // More than 2 consecutive same characters
				return true
			}
		} else {
			consecutiveCount = 1
		}
	}

	return false
}

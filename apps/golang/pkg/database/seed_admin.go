package database

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
	"gorm.io/gorm"
)

// AdminSeedOptions configures super-admin bootstrap data.
type AdminSeedOptions struct {
	Username string
	Name     string
	Email    string
	Password string
}

// SeedBaselineAdmin ensures a SUPER_ADMIN user exists and is assigned to a company.
func SeedBaselineAdmin(db *gorm.DB, opts AdminSeedOptions) (string, string, error) {
	username := strings.TrimSpace(opts.Username)
	name := strings.TrimSpace(opts.Name)
	email := strings.TrimSpace(opts.Email)
	password := opts.Password

	if username == "" {
		return "", "", fmt.Errorf("username is required")
	}
	if name == "" {
		return "", "", fmt.Errorf("name is required")
	}
	if email == "" {
		return "", "", fmt.Errorf("email is required")
	}
	if password == "" {
		return "", "", fmt.Errorf("password is required")
	}

	hashedPassword, err := hashSeedPassword(password)
	if err != nil {
		return "", "", fmt.Errorf("failed to hash password: %w", err)
	}

	var userID string
	var companyID string

	if err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Raw(`
			INSERT INTO users (id, username, name, email, role, is_active, password, created_at, updated_at)
			VALUES (gen_random_uuid(), ?, ?, ?, 'SUPER_ADMIN', true, ?, NOW(), NOW())
			ON CONFLICT (username) DO UPDATE SET
				name = EXCLUDED.name,
				email = EXCLUDED.email,
				role = 'SUPER_ADMIN',
				is_active = true,
				password = EXCLUDED.password,
				updated_at = NOW()
			RETURNING id
		`, username, name, email, hashedPassword).Scan(&userID).Error; err != nil {
			return fmt.Errorf("failed to upsert super admin user: %w", err)
		}
		if userID == "" {
			return fmt.Errorf("failed to resolve super admin user id")
		}

		if err := tx.Raw(`
			SELECT id
			FROM companies
			ORDER BY created_at ASC NULLS LAST, id ASC
			LIMIT 1
		`).Scan(&companyID).Error; err != nil {
			return fmt.Errorf("failed to lookup company: %w", err)
		}

		if companyID == "" {
			if err := tx.Raw(`
				INSERT INTO companies (id, name, company_code, status, is_active, created_at, updated_at)
				VALUES (gen_random_uuid(), 'PT Agrinova Default', 'AGRI', 'ACTIVE', true, NOW(), NOW())
				RETURNING id
			`).Scan(&companyID).Error; err != nil {
				return fmt.Errorf("failed to create default company: %w", err)
			}
		}
		if companyID == "" {
			return fmt.Errorf("failed to resolve company id")
		}

		var assignmentID string
		if err := tx.Raw(`
			SELECT id
			FROM user_company_assignments
			WHERE user_id = ? AND company_id = ?
			ORDER BY created_at ASC NULLS LAST, id ASC
			LIMIT 1
		`, userID, companyID).Scan(&assignmentID).Error; err != nil {
			return fmt.Errorf("failed to lookup company assignment: %w", err)
		}

		if assignmentID == "" {
			if err := tx.Exec(`
				INSERT INTO user_company_assignments (id, user_id, company_id, is_active, assigned_by, assigned_at, created_at, updated_at)
				VALUES (gen_random_uuid(), ?, ?, true, ?, NOW(), NOW(), NOW())
			`, userID, companyID, userID).Error; err != nil {
				return fmt.Errorf("failed to create company assignment: %w", err)
			}
		} else {
			if err := tx.Exec(`
				UPDATE user_company_assignments
				SET is_active = true,
					assigned_by = ?,
					updated_at = NOW()
				WHERE id = ?
			`, userID, assignmentID).Error; err != nil {
				return fmt.Errorf("failed to update company assignment: %w", err)
			}
		}

		return nil
	}); err != nil {
		return "", "", err
	}

	return userID, companyID, nil
}

func hashSeedPassword(password string) (string, error) {
	// Must match runtime password service defaults.
	const (
		memory      = 64 * 1024
		iterations  = 3
		parallelism = 2
		saltLength  = 16
		keyLength   = 32
	)

	salt := make([]byte, saltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("failed to generate salt: %w", err)
	}

	hash := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, keyLength)
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, memory, iterations, parallelism, b64Salt, b64Hash,
	), nil
}

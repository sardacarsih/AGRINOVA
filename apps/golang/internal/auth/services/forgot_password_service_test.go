package services

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type stubEmailService struct {
	calls int
	to    string
	link  string
	err   error
}

func (s *stubEmailService) SendResetPassword(to string, link string) error {
	s.calls++
	s.to = to
	s.link = link
	return s.err
}

func TestForgotPasswordExistingUserCreatesTokenAndSendsEmail(t *testing.T) {
	db := mustOpenForgotPasswordTestDB(t)
	passwordService := NewPasswordService()
	emailStub := &stubEmailService{}
	service := NewForgotPasswordService(db, passwordService, nil, emailStub)

	mustExec(t, db, `
		INSERT INTO users (id, email, password, is_active, email_verified, updated_at)
		VALUES (?, ?, ?, 1, 1, ?)
	`, "user-1", "user@example.com", "old-hash", time.Now())

	ok, message := service.ForgotPassword(context.Background(), " User@Example.com ")
	if !ok {
		t.Fatalf("expected success response, got false")
	}
	if message != forgotPasswordGenericMessage {
		t.Fatalf("unexpected message: %s", message)
	}
	if emailStub.calls != 1 {
		t.Fatalf("expected exactly one email send, got %d", emailStub.calls)
	}
	if emailStub.to != "user@example.com" {
		t.Fatalf("unexpected email destination: %s", emailStub.to)
	}
	if emailStub.link == "" {
		t.Fatalf("expected reset link to be generated")
	}

	var count int64
	if err := db.Table("password_resets").Count(&count).Error; err != nil {
		t.Fatalf("count password_resets: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one reset token row, got %d", count)
	}
}

func TestForgotPasswordUnknownUserStillGenericSuccess(t *testing.T) {
	db := mustOpenForgotPasswordTestDB(t)
	passwordService := NewPasswordService()
	emailStub := &stubEmailService{}
	service := NewForgotPasswordService(db, passwordService, nil, emailStub)

	ok, message := service.ForgotPassword(context.Background(), "missing@example.com")
	if !ok {
		t.Fatalf("expected success response, got false")
	}
	if message != forgotPasswordGenericMessage {
		t.Fatalf("unexpected message: %s", message)
	}
	if emailStub.calls != 0 {
		t.Fatalf("email should not be sent for unknown user")
	}

	var count int64
	if err := db.Table("password_resets").Count(&count).Error; err != nil {
		t.Fatalf("count password_resets: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected zero reset tokens, got %d", count)
	}
}

func TestForgotPasswordSendGridFailureStillGenericSuccess(t *testing.T) {
	db := mustOpenForgotPasswordTestDB(t)
	passwordService := NewPasswordService()
	emailStub := &stubEmailService{err: context.DeadlineExceeded}
	service := NewForgotPasswordService(db, passwordService, nil, emailStub)

	mustExec(t, db, `
		INSERT INTO users (id, email, password, is_active, email_verified, updated_at)
		VALUES (?, ?, ?, 1, 1, ?)
	`, "user-1", "user@example.com", "old-hash", time.Now())

	ok, message := service.ForgotPassword(context.Background(), "user@example.com")
	if !ok {
		t.Fatalf("expected success response, got false")
	}
	if message != forgotPasswordGenericMessage {
		t.Fatalf("unexpected message: %s", message)
	}

	var count int64
	if err := db.Table("password_resets").Count(&count).Error; err != nil {
		t.Fatalf("count password_resets: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one reset token row, got %d", count)
	}
}

func TestResetPasswordValidTokenUpdatesPasswordMarksUsedAndRevokesTokens(t *testing.T) {
	db := mustOpenForgotPasswordTestDB(t)
	passwordService := NewPasswordService()
	emailStub := &stubEmailService{}
	service := NewForgotPasswordService(db, passwordService, nil, emailStub)

	oldHash, err := passwordService.HashPassword("OldPassword#123")
	if err != nil {
		t.Fatalf("hash old password: %v", err)
	}

	now := time.Now()
	mustExec(t, db, `
		INSERT INTO users (id, email, password, is_active, email_verified, updated_at)
		VALUES (?, ?, ?, 1, 1, ?)
	`, "user-1", "user@example.com", oldHash, now)
	mustExec(t, db, `
		INSERT INTO user_sessions (id, user_id, is_active, revoked, updated_at)
		VALUES (?, ?, 1, 0, ?)
	`, "session-1", "user-1", now)
	mustExec(t, db, `
		INSERT INTO jwt_tokens (id, user_id, is_revoked, updated_at)
		VALUES (?, ?, 0, ?)
	`, "jwt-1", "user-1", now)

	rawToken := "raw-reset-token-123"
	tokenHash := hashTokenSHA256(rawToken)
	mustExec(t, db, `
		INSERT INTO password_resets (id, user_id, token_hash, expires_at, used_at, created_at)
		VALUES (?, ?, ?, ?, NULL, ?)
	`, uuid.NewString(), "user-1", tokenHash, now.Add(15*time.Minute), now)

	ok, message := service.ResetPassword(context.Background(), rawToken, "Qx!7mN$4pLr9T")
	if !ok {
		t.Fatalf("expected reset success, got false")
	}
	if message != resetPasswordSuccessMessage {
		t.Fatalf("unexpected message: %s", message)
	}

	var currentHash string
	if err := db.Table("users").Select("password").Where("id = ?", "user-1").Take(&currentHash).Error; err != nil {
		t.Fatalf("load updated user password: %v", err)
	}
	matched, err := passwordService.VerifyPassword("Qx!7mN$4pLr9T", currentHash)
	if err != nil {
		t.Fatalf("verify updated hash: %v", err)
	}
	if !matched {
		t.Fatalf("expected updated password hash to match new password")
	}

	var usedAt *time.Time
	if err := db.Table("password_resets").Select("used_at").Where("token_hash = ?", tokenHash).Take(&usedAt).Error; err != nil {
		t.Fatalf("load used_at: %v", err)
	}
	if usedAt == nil {
		t.Fatalf("expected token used_at to be set")
	}

	var activeSessions int64
	if err := db.Table("user_sessions").Where("user_id = ? AND is_active = 1", "user-1").Count(&activeSessions).Error; err != nil {
		t.Fatalf("count active sessions: %v", err)
	}
	if activeSessions != 0 {
		t.Fatalf("expected active sessions to be revoked, got %d", activeSessions)
	}

	var activeTokens int64
	if err := db.Table("jwt_tokens").Where("user_id = ? AND is_revoked = 0", "user-1").Count(&activeTokens).Error; err != nil {
		t.Fatalf("count active jwt tokens: %v", err)
	}
	if activeTokens != 0 {
		t.Fatalf("expected jwt tokens to be revoked, got %d", activeTokens)
	}
}

func TestResetPasswordInvalidTokenReturnsFailure(t *testing.T) {
	db := mustOpenForgotPasswordTestDB(t)
	passwordService := NewPasswordService()
	service := NewForgotPasswordService(db, passwordService, nil, &stubEmailService{})

	ok, message := service.ResetPassword(context.Background(), "invalid-token", "NewPassword#1234")
	if ok {
		t.Fatalf("expected reset failure, got success")
	}
	if message != resetPasswordInvalidMessage {
		t.Fatalf("unexpected message: %s", message)
	}
}

func TestResetPasswordTokenRaceOnlyOneSuccess(t *testing.T) {
	db := mustOpenForgotPasswordTestDB(t)
	passwordService := NewPasswordService()
	service := NewForgotPasswordService(db, passwordService, nil, &stubEmailService{})

	now := time.Now()
	oldHash, err := passwordService.HashPassword("OldPassword#123")
	if err != nil {
		t.Fatalf("hash old password: %v", err)
	}

	mustExec(t, db, `
		INSERT INTO users (id, email, password, is_active, email_verified, updated_at)
		VALUES (?, ?, ?, 1, 1, ?)
	`, "user-1", "user@example.com", oldHash, now)

	rawToken := "parallel-reset-token"
	tokenHash := hashTokenSHA256(rawToken)
	mustExec(t, db, `
		INSERT INTO password_resets (id, user_id, token_hash, expires_at, used_at, created_at)
		VALUES (?, ?, ?, ?, NULL, ?)
	`, uuid.NewString(), "user-1", tokenHash, now.Add(15*time.Minute), now)

	var wg sync.WaitGroup
	results := make([]bool, 2)
	wg.Add(2)

	for i := 0; i < 2; i++ {
		go func(idx int) {
			defer wg.Done()
			ok, _ := service.ResetPassword(context.Background(), rawToken, "Qx!7mN$4pLr9T")
			results[idx] = ok
		}(i)
	}
	wg.Wait()

	successCount := 0
	for _, result := range results {
		if result {
			successCount++
		}
	}
	if successCount != 1 {
		t.Fatalf("expected exactly one success in race, got %d", successCount)
	}
}

func mustOpenForgotPasswordTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := "file:" + uuid.NewString() + "?mode=memory&cache=shared"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("get sql db: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)

	mustExec(t, db, `
		CREATE TABLE users (
			id TEXT PRIMARY KEY,
			email TEXT,
			password TEXT NOT NULL,
			is_active BOOLEAN NOT NULL DEFAULT 1,
			email_verified BOOLEAN NOT NULL DEFAULT 1,
			updated_at DATETIME
		);
	`)
	mustExec(t, db, `
		CREATE TABLE password_resets (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			token_hash TEXT NOT NULL,
			expires_at DATETIME NOT NULL,
			used_at DATETIME NULL,
			created_at DATETIME NOT NULL
		);
	`)
	mustExec(t, db, `CREATE UNIQUE INDEX uq_password_resets_token_hash ON password_resets(token_hash);`)
	mustExec(t, db, `
		CREATE TABLE user_sessions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			is_active BOOLEAN NOT NULL DEFAULT 1,
			revoked BOOLEAN NOT NULL DEFAULT 0,
			revoked_reason TEXT,
			updated_at DATETIME
		);
	`)
	mustExec(t, db, `
		CREATE TABLE jwt_tokens (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			is_revoked BOOLEAN NOT NULL DEFAULT 0,
			revoked_at DATETIME,
			updated_at DATETIME
		);
	`)

	return db
}

func mustExec(t *testing.T, db *gorm.DB, query string, args ...interface{}) {
	t.Helper()
	if err := db.Exec(query, args...).Error; err != nil {
		t.Fatalf("exec failed: %v\nquery: %s", err, query)
	}
}

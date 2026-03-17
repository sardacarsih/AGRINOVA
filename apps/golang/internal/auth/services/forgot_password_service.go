package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"agrinovagraphql/server/internal/auth/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	forgotPasswordGenericMessage = "Jika email terdaftar, link reset password akan dikirim."
	resetPasswordSuccessMessage  = "Password berhasil diubah."
	resetPasswordInvalidMessage  = "Token tidak valid atau sudah kedaluwarsa."
	resetPasswordWeakMessage     = "Password baru tidak memenuhi kebijakan keamanan."
)

var errResetTokenInvalidOrExpired = errors.New("reset token invalid or expired")
var errResetPasswordPolicyViolation = errors.New("reset password policy violation")

// ForgotPasswordUser is the minimal user data used by forgot-password flow.
type ForgotPasswordUser struct {
	ID    string
	Email string
}

// ForgotPasswordUserRepository defines user persistence contract for password reset.
type ForgotPasswordUserRepository interface {
	FindActiveVerifiedByEmail(ctx context.Context, tx *gorm.DB, normalizedEmail string) (*ForgotPasswordUser, error)
	UpdatePasswordHash(ctx context.Context, tx *gorm.DB, userID string, passwordHash string, updatedAt time.Time) error
}

// PasswordResetRepository defines password reset token persistence contract.
type PasswordResetRepository interface {
	Create(ctx context.Context, tx *gorm.DB, token *models.PasswordReset) error
	InvalidateActiveTokensByUserID(ctx context.Context, tx *gorm.DB, userID string, now time.Time) error
	FindValidByTokenHash(ctx context.Context, tx *gorm.DB, tokenHash string, now time.Time, forUpdate bool) (*models.PasswordReset, error)
	MarkUsed(ctx context.Context, tx *gorm.DB, tokenID string, usedAt time.Time) (bool, error)
}

// SessionTokenRevoker revokes all active web/mobile sessions for a user.
type SessionTokenRevoker interface {
	RevokeAllByUserID(ctx context.Context, tx *gorm.DB, userID string, now time.Time) error
}

type forgotPasswordRateLimitEntry struct {
	Count       int
	WindowStart time.Time
}

type forgotPasswordRateLimiter struct {
	mu          sync.Mutex
	entries     map[string]forgotPasswordRateLimitEntry
	maxAttempts int
	window      time.Duration
}

func newForgotPasswordRateLimiter(maxAttempts int, window time.Duration) *forgotPasswordRateLimiter {
	return &forgotPasswordRateLimiter{
		entries:     make(map[string]forgotPasswordRateLimitEntry),
		maxAttempts: maxAttempts,
		window:      window,
	}
}

func (l *forgotPasswordRateLimiter) Allow(ip string, normalizedEmail string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	key := fmt.Sprintf("%s|%s", strings.TrimSpace(ip), normalizedEmail)
	entry, exists := l.entries[key]
	if !exists || now.Sub(entry.WindowStart) >= l.window {
		l.entries[key] = forgotPasswordRateLimitEntry{
			Count:       1,
			WindowStart: now,
		}
		l.cleanup(now)
		return true
	}

	if entry.Count >= l.maxAttempts {
		l.entries[key] = entry
		l.cleanup(now)
		return false
	}

	entry.Count++
	l.entries[key] = entry
	l.cleanup(now)
	return true
}

func (l *forgotPasswordRateLimiter) cleanup(now time.Time) {
	for key, entry := range l.entries {
		if now.Sub(entry.WindowStart) >= l.window {
			delete(l.entries, key)
		}
	}
}

// ForgotPasswordService implements forgot/reset password use cases.
type ForgotPasswordService struct {
	db                     *gorm.DB
	userRepo               ForgotPasswordUserRepository
	passwordResetRepo      PasswordResetRepository
	sessionTokenRevoker    SessionTokenRevoker
	emailService           EmailService
	passwordService        *PasswordService
	securityLoggingService *SecurityLoggingService
	rateLimiter            *forgotPasswordRateLimiter
	resetPasswordURL       string
	tokenTTL               time.Duration
	nowFn                  func() time.Time
}

// NewForgotPasswordService builds forgot-password use case service.
func NewForgotPasswordService(
	db *gorm.DB,
	passwordService *PasswordService,
	securityLoggingService *SecurityLoggingService,
	emailService EmailService,
) *ForgotPasswordService {
	if emailService == nil {
		emailService = NewSendGridEmailService(
			os.Getenv("SENDGRID_API_KEY"),
			os.Getenv("EMAIL_FROM"),
		)
	}

	resetURL := strings.TrimSpace(os.Getenv("APP_RESET_PASSWORD_URL"))
	if resetURL == "" {
		resetURL = "http://localhost:3000/reset-password"
	}

	return &ForgotPasswordService{
		db:                     db,
		userRepo:               &gormForgotPasswordUserRepository{db: db},
		passwordResetRepo:      &gormPasswordResetRepository{db: db},
		sessionTokenRevoker:    &gormSessionTokenRevoker{db: db},
		emailService:           emailService,
		passwordService:        passwordService,
		securityLoggingService: securityLoggingService,
		rateLimiter:            newForgotPasswordRateLimiter(5, 15*time.Minute),
		resetPasswordURL:       resetURL,
		tokenTTL:               15 * time.Minute,
		nowFn:                  time.Now,
	}
}

// ForgotPassword handles password reset request with anti-enumeration response.
func (s *ForgotPasswordService) ForgotPassword(ctx context.Context, email string) (bool, string) {
	normalizedEmail := normalizeEmail(email)
	now := s.nowFn()
	clientIP := extractClientIP(ctx)

	if normalizedEmail == "" {
		return true, forgotPasswordGenericMessage
	}

	if !s.rateLimiter.Allow(clientIP, normalizedEmail, now) {
		s.logAnonymousSecurity("forgot_password_rate_limited", map[string]interface{}{
			"email": normalizedEmail,
			"ip":    clientIP,
		})
		return true, forgotPasswordGenericMessage
	}

	user, err := s.userRepo.FindActiveVerifiedByEmail(ctx, nil, normalizedEmail)
	if err != nil {
		s.logAnonymousSecurity("forgot_password_lookup_failed", map[string]interface{}{
			"email": normalizedEmail,
			"ip":    clientIP,
			"error": err.Error(),
		})
		return true, forgotPasswordGenericMessage
	}

	// No user info is leaked to client.
	if user == nil {
		s.logAnonymousSecurity("forgot_password_requested_unknown_email", map[string]interface{}{
			"email": normalizedEmail,
			"ip":    clientIP,
		})
		return true, forgotPasswordGenericMessage
	}

	rawToken, tokenHash, err := generateResetTokenPair()
	if err != nil {
		s.logSecurityEvent(ctx, EventPasswordResetFailed, SeverityError, &user.ID, map[string]interface{}{
			"reason": "token_generation_failed",
			"error":  err.Error(),
		})
		return true, forgotPasswordGenericMessage
	}

	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.passwordResetRepo.InvalidateActiveTokensByUserID(ctx, tx, user.ID, now); err != nil {
			return err
		}

		return s.passwordResetRepo.Create(ctx, tx, &models.PasswordReset{
			UserID:    user.ID,
			TokenHash: tokenHash,
			ExpiresAt: now.Add(s.tokenTTL),
			CreatedAt: now,
		})
	}); err != nil {
		s.logSecurityEvent(ctx, EventPasswordResetFailed, SeverityError, &user.ID, map[string]interface{}{
			"reason": "token_persist_failed",
			"error":  err.Error(),
		})
		return true, forgotPasswordGenericMessage
	}

	resetLink := buildResetPasswordLink(s.resetPasswordURL, rawToken)
	if sendErr := s.emailService.SendResetPassword(user.Email, resetLink); sendErr != nil {
		s.logSecurityEvent(ctx, EventPasswordResetEmailFailed, SeverityWarning, &user.ID, map[string]interface{}{
			"reason": "sendgrid_send_failed",
			"error":  sendErr.Error(),
		})
		return true, forgotPasswordGenericMessage
	}

	s.logSecurityEvent(ctx, EventPasswordResetRequested, SeverityInfo, &user.ID, map[string]interface{}{
		"ip": clientIP,
	})

	return true, forgotPasswordGenericMessage
}

// ResetPassword applies a new password from a valid one-time reset token.
func (s *ForgotPasswordService) ResetPassword(ctx context.Context, token string, newPassword string) (bool, string) {
	trimmedToken := strings.TrimSpace(token)
	if trimmedToken == "" {
		return false, resetPasswordInvalidMessage
	}

	if s.passwordService == nil {
		s.logAnonymousSecurity("reset_password_service_misconfigured", map[string]interface{}{})
		return false, resetPasswordInvalidMessage
	}

	tokenHash := hashTokenSHA256(trimmedToken)
	now := s.nowFn()
	var targetUserID string

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		resetToken, findErr := s.passwordResetRepo.FindValidByTokenHash(ctx, tx, tokenHash, now, true)
		if findErr != nil {
			return findErr
		}
		if resetToken == nil {
			return errResetTokenInvalidOrExpired
		}
		targetUserID = resetToken.UserID

		if passwordErr := s.passwordService.IsValidPassword(newPassword); passwordErr != nil {
			return fmt.Errorf("%w: %v", errResetPasswordPolicyViolation, passwordErr)
		}

		passwordHash, hashErr := s.passwordService.HashPassword(newPassword)
		if hashErr != nil {
			return hashErr
		}

		if updateErr := s.userRepo.UpdatePasswordHash(ctx, tx, resetToken.UserID, passwordHash, now); updateErr != nil {
			return updateErr
		}

		marked, markErr := s.passwordResetRepo.MarkUsed(ctx, tx, resetToken.ID, now)
		if markErr != nil {
			return markErr
		}
		if !marked {
			return errResetTokenInvalidOrExpired
		}

		return s.sessionTokenRevoker.RevokeAllByUserID(ctx, tx, resetToken.UserID, now)
	})
	if err != nil {
		if errors.Is(err, errResetPasswordPolicyViolation) {
			return false, resetPasswordWeakMessage
		}

		if errors.Is(err, gorm.ErrRecordNotFound) || errors.Is(err, errResetTokenInvalidOrExpired) {
			s.logAnonymousSecurity("reset_password_failed_invalid_token", map[string]interface{}{})
			return false, resetPasswordInvalidMessage
		}

		if targetUserID != "" {
			s.logSecurityEvent(ctx, EventPasswordResetFailed, SeverityWarning, &targetUserID, map[string]interface{}{
				"reason": "reset_transaction_failed",
				"error":  err.Error(),
			})
		} else {
			s.logAnonymousSecurity("reset_password_failed", map[string]interface{}{
				"error": err.Error(),
			})
		}
		return false, resetPasswordInvalidMessage
	}

	s.logSecurityEvent(ctx, EventPasswordResetSuccess, SeverityInfo, &targetUserID, map[string]interface{}{
		"revoked_all_sessions": true,
	})

	return true, resetPasswordSuccessMessage
}

func (s *ForgotPasswordService) logSecurityEvent(
	ctx context.Context,
	eventType SecurityEventType,
	severity SecurityEventSeverity,
	userID *string,
	details map[string]interface{},
) {
	if s.securityLoggingService == nil {
		return
	}
	if userID == nil || strings.TrimSpace(*userID) == "" {
		s.logAnonymousSecurity(string(eventType), details)
		return
	}

	enrichedCtx := context.WithValue(ctx, "user_id", strings.TrimSpace(*userID))
	if clientIP := extractClientIP(ctx); clientIP != "" {
		enrichedCtx = context.WithValue(enrichedCtx, "client_ip", clientIP)
	}
	if userAgent := extractUserAgent(ctx); userAgent != "" {
		enrichedCtx = context.WithValue(enrichedCtx, "user_agent", userAgent)
	}

	s.securityLoggingService.LogSecurityEvent(enrichedCtx, eventType, severity, details)
}

func (s *ForgotPasswordService) logAnonymousSecurity(event string, details map[string]interface{}) {
	log.Printf("[SECURITY] %s details=%v", event, details)
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func generateResetTokenPair() (string, string, error) {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", "", err
	}
	rawToken := base64.RawURLEncoding.EncodeToString(tokenBytes)
	return rawToken, hashTokenSHA256(rawToken), nil
}

func hashTokenSHA256(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func buildResetPasswordLink(baseURL string, rawToken string) string {
	trimmedURL := strings.TrimSpace(baseURL)
	if trimmedURL == "" {
		trimmedURL = "http://localhost:3000/reset-password"
	}

	parsed, err := url.Parse(trimmedURL)
	if err != nil {
		return fmt.Sprintf("%s?token=%s", strings.TrimRight(trimmedURL, "?&"), url.QueryEscape(rawToken))
	}

	query := parsed.Query()
	query.Set("token", rawToken)
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func extractClientIP(ctx context.Context) string {
	if value, ok := ctx.Value("client_ip").(string); ok {
		return strings.TrimSpace(value)
	}

	request := extractRequestFromContext(ctx)
	if request == nil {
		return ""
	}

	forwarded := strings.TrimSpace(request.Header.Get("X-Forwarded-For"))
	if forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}

	realIP := strings.TrimSpace(request.Header.Get("X-Real-IP"))
	if realIP != "" {
		return realIP
	}

	host, _, err := net.SplitHostPort(strings.TrimSpace(request.RemoteAddr))
	if err == nil {
		return host
	}

	return strings.TrimSpace(request.RemoteAddr)
}

func extractUserAgent(ctx context.Context) string {
	if value, ok := ctx.Value("user_agent").(string); ok {
		return strings.TrimSpace(value)
	}

	request := extractRequestFromContext(ctx)
	if request == nil {
		return ""
	}

	return strings.TrimSpace(request.UserAgent())
}

func extractRequestFromContext(ctx context.Context) *http.Request {
	httpCtx := ctx.Value("http")
	if httpCtx == nil {
		return nil
	}

	httpMap, ok := httpCtx.(map[string]interface{})
	if !ok {
		return nil
	}

	request, _ := httpMap["request"].(*http.Request)
	return request
}

type gormForgotPasswordUserRepository struct {
	db *gorm.DB
}

func (r *gormForgotPasswordUserRepository) withDB(tx *gorm.DB) *gorm.DB {
	if tx != nil {
		return tx
	}
	return r.db
}

func (r *gormForgotPasswordUserRepository) FindActiveVerifiedByEmail(
	ctx context.Context,
	tx *gorm.DB,
	normalizedEmail string,
) (*ForgotPasswordUser, error) {
	type row struct {
		ID            string `gorm:"column:id"`
		Email         string `gorm:"column:email"`
		IsActive      bool   `gorm:"column:is_active"`
		EmailVerified bool   `gorm:"column:email_verified"`
	}

	var result row
	db := r.withDB(tx).WithContext(ctx).Table("users").
		Select("id, email, is_active, email_verified").
		Where("LOWER(email) = ? AND is_active = true AND email_verified = true", normalizedEmail).
		Limit(1)

	if err := db.Take(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &ForgotPasswordUser{
		ID:    result.ID,
		Email: result.Email,
	}, nil
}

func (r *gormForgotPasswordUserRepository) UpdatePasswordHash(
	ctx context.Context,
	tx *gorm.DB,
	userID string,
	passwordHash string,
	updatedAt time.Time,
) error {
	db := r.withDB(tx).WithContext(ctx).Table("users").
		Where("id = ? AND is_active = true", userID).
		Updates(map[string]interface{}{
			"password":   passwordHash,
			"updated_at": updatedAt,
		})
	if db.Error != nil {
		return db.Error
	}
	if db.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

type gormPasswordResetRepository struct {
	db *gorm.DB
}

func (r *gormPasswordResetRepository) withDB(tx *gorm.DB) *gorm.DB {
	if tx != nil {
		return tx
	}
	return r.db
}

func (r *gormPasswordResetRepository) Create(ctx context.Context, tx *gorm.DB, token *models.PasswordReset) error {
	if strings.TrimSpace(token.ID) == "" {
		token.ID = uuid.NewString()
	}
	return r.withDB(tx).WithContext(ctx).Create(token).Error
}

func (r *gormPasswordResetRepository) InvalidateActiveTokensByUserID(
	ctx context.Context,
	tx *gorm.DB,
	userID string,
	now time.Time,
) error {
	return r.withDB(tx).WithContext(ctx).
		Model(&models.PasswordReset{}).
		Where("user_id = ? AND used_at IS NULL AND expires_at > ?", userID, now).
		Update("used_at", now).Error
}

func (r *gormPasswordResetRepository) FindValidByTokenHash(
	ctx context.Context,
	tx *gorm.DB,
	tokenHash string,
	now time.Time,
	forUpdate bool,
) (*models.PasswordReset, error) {
	db := r.withDB(tx).WithContext(ctx).Model(&models.PasswordReset{})
	if forUpdate {
		db = db.Clauses(clause.Locking{Strength: "UPDATE"})
	}

	var token models.PasswordReset
	if err := db.
		Where("token_hash = ? AND used_at IS NULL AND expires_at > ?", tokenHash, now).
		Order("created_at DESC").
		Limit(1).
		Take(&token).Error; err != nil {
		return nil, err
	}
	return &token, nil
}

func (r *gormPasswordResetRepository) MarkUsed(
	ctx context.Context,
	tx *gorm.DB,
	tokenID string,
	usedAt time.Time,
) (bool, error) {
	db := r.withDB(tx).WithContext(ctx).
		Model(&models.PasswordReset{}).
		Where("id = ? AND used_at IS NULL", tokenID).
		Update("used_at", usedAt)
	if db.Error != nil {
		return false, db.Error
	}
	return db.RowsAffected > 0, nil
}

type gormSessionTokenRevoker struct {
	db *gorm.DB
}

func (r *gormSessionTokenRevoker) withDB(tx *gorm.DB) *gorm.DB {
	if tx != nil {
		return tx
	}
	return r.db
}

func (r *gormSessionTokenRevoker) RevokeAllByUserID(
	ctx context.Context,
	tx *gorm.DB,
	userID string,
	now time.Time,
) error {
	db := r.withDB(tx).WithContext(ctx)

	if db.Migrator().HasTable("user_sessions") {
		if err := db.Table("user_sessions").
			Where("user_id = ?", userID).
			Updates(map[string]interface{}{
				"is_active":      false,
				"revoked":        true,
				"revoked_reason": "password_reset",
				"updated_at":     now,
			}).Error; err != nil {
			return err
		}
	}

	if db.Migrator().HasTable("jwt_tokens") {
		if err := db.Table("jwt_tokens").
			Where("user_id = ?", userID).
			Updates(map[string]interface{}{
				"is_revoked": true,
				"revoked_at": now,
				"updated_at": now,
			}).Error; err != nil {
			return err
		}
	}

	return nil
}

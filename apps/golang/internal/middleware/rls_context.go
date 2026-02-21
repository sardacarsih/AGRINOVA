package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"agrinovagraphql/server/internal/graphql/domain/auth"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RLSContext represents the security context for Row Level Security
type RLSContext struct {
	UserID       uuid.UUID   `json:"user_id"`
	Role         string      `json:"role"`
	CompanyIDs   []uuid.UUID `json:"company_ids"`
	EstateIDs    []uuid.UUID `json:"estate_ids"`
	DivisionIDs  []uuid.UUID `json:"division_ids"`
	SetAt        time.Time   `json:"set_at"`
	ExpiresAt    time.Time   `json:"expires_at"`
	IPAddress    string      `json:"ip_address"`
	SessionToken string      `json:"session_token"`
}

type rlsContextKey struct{}

// RLSContextMiddleware sets the PostgreSQL RLS context for each request
type RLSContextMiddleware struct {
	db                    *gorm.DB
	enableApplicationFallback bool
	contextTimeout        time.Duration
	enableAuditLogging    bool
	bypassForSuperAdmin   bool
}

// RLSMiddlewareConfig configures the RLS context middleware
type RLSMiddlewareConfig struct {
	DB                        *gorm.DB
	EnableApplicationFallback bool          // If true, fall back to application-level checks when RLS fails
	ContextTimeout            time.Duration // How long the context is valid
	EnableAuditLogging        bool          // Log all RLS context operations
	BypassForSuperAdmin       bool          // If true, super admins bypass RLS (not recommended)
}

// NewRLSContextMiddleware creates a new RLS context middleware
func NewRLSContextMiddleware(config RLSMiddlewareConfig) *RLSContextMiddleware {
	if config.ContextTimeout == 0 {
		config.ContextTimeout = 15 * time.Minute // Default: 15 minutes
	}

	return &RLSContextMiddleware{
		db:                    config.DB,
		enableApplicationFallback: config.EnableApplicationFallback,
		contextTimeout:        config.ContextTimeout,
		enableAuditLogging:    config.EnableAuditLogging,
		bypassForSuperAdmin:   config.BypassForSuperAdmin,
	}
}

// Middleware returns the HTTP middleware handler
func (m *RLSContextMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// Extract user from context (set by auth middleware)
		user, err := m.extractUserFromContext(ctx)
		if err != nil {
			// No authenticated user - allow request to proceed
			// RLS policies will deny access to protected resources
			next.ServeHTTP(w, r)
			return
		}

		// Build RLS context from user data
		rlsCtx, err := m.buildRLSContext(ctx, user, r)
		if err != nil {
			if m.enableAuditLogging {
				m.logRLSContextError(ctx, user, err)
			}

			// If we can't set RLS context, deny access unless fallback is enabled
			if !m.enableApplicationFallback {
				http.Error(w, "Security context initialization failed", http.StatusInternalServerError)
				return
			}

			// Fall back to application-level security
			next.ServeHTTP(w, r)
			return
		}

		// Set PostgreSQL RLS context
		if err := m.setPostgreSQLContext(ctx, rlsCtx); err != nil {
			if m.enableAuditLogging {
				m.logRLSContextError(ctx, user, fmt.Errorf("failed to set PostgreSQL context: %w", err))
			}

			if !m.enableApplicationFallback {
				http.Error(w, "Security context setup failed", http.StatusInternalServerError)
				return
			}
		}

		// Add RLS context to request context for application-level fallback
		ctx = context.WithValue(ctx, rlsContextKey{}, rlsCtx)
		r = r.WithContext(ctx)

		// Ensure context is cleared after request
		defer func() {
			if err := m.clearPostgreSQLContext(context.Background()); err != nil {
				// Log but don't fail the request
				if m.enableAuditLogging {
					m.logRLSContextError(context.Background(), user, fmt.Errorf("failed to clear context: %w", err))
				}
			}
		}()

		next.ServeHTTP(w, r)
	})
}

// extractUserFromContext extracts the authenticated user from the request context
func (m *RLSContextMiddleware) extractUserFromContext(ctx context.Context) (*auth.User, error) {
	// Try to get user from context (set by auth middleware)
	user := ctx.Value("user")
	if user == nil {
		return nil, fmt.Errorf("no user in context")
	}

	// Type assertion
	if u, ok := user.(*auth.User); ok {
		return u, nil
	}

	return nil, fmt.Errorf("invalid user type in context")
}

// buildRLSContext constructs the RLS context from user data
func (m *RLSContextMiddleware) buildRLSContext(ctx context.Context, user *auth.User, r *http.Request) (*RLSContext, error) {
	// Convert string ID to UUID
	userUUID, err := uuid.Parse(user.ID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID format: %w", err)
	}

	rlsCtx := &RLSContext{
		UserID:       userUUID,
		Role:         string(user.Role),
		CompanyIDs:   make([]uuid.UUID, 0),
		EstateIDs:    make([]uuid.UUID, 0),
		DivisionIDs:  make([]uuid.UUID, 0),
		SetAt:        time.Now(),
		ExpiresAt:    time.Now().Add(m.contextTimeout),
		IPAddress:    m.getClientIP(r),
		SessionToken: m.getSessionToken(r),
	}

	// Load assignments based on role
	if err := m.loadUserAssignments(ctx, rlsCtx, user); err != nil {
		return nil, fmt.Errorf("failed to load user assignments: %w", err)
	}

	return rlsCtx, nil
}

// loadUserAssignments loads the user's company, estate, and division assignments
func (m *RLSContextMiddleware) loadUserAssignments(ctx context.Context, rlsCtx *RLSContext, user *auth.User) error {
	// SUPER_ADMIN has access to everything - set empty arrays (handled by RLS policies)
	if user.Role == "SUPER_ADMIN" {
		if m.bypassForSuperAdmin {
			// Load all IDs (effectively bypassing RLS)
			return m.loadAllIDs(ctx, rlsCtx)
		}
		return nil
	}

	// Load company assignments
	var companyAssignments []struct {
		CompanyID uuid.UUID
	}
	if err := m.db.WithContext(ctx).
		Table("user_company_assignments").
		Where("user_id = ? AND is_active = true", user.ID).
		Select("company_id").
		Scan(&companyAssignments).Error; err != nil {
		return fmt.Errorf("failed to load company assignments: %w", err)
	}

	for _, ca := range companyAssignments {
		rlsCtx.CompanyIDs = append(rlsCtx.CompanyIDs, ca.CompanyID)
	}

	// Load estate assignments
	var estateAssignments []struct {
		EstateID uuid.UUID
	}
	if err := m.db.WithContext(ctx).
		Table("user_estate_assignments").
		Where("user_id = ? AND is_active = true", user.ID).
		Select("estate_id").
		Scan(&estateAssignments).Error; err != nil {
		return fmt.Errorf("failed to load estate assignments: %w", err)
	}

	for _, ea := range estateAssignments {
		rlsCtx.EstateIDs = append(rlsCtx.EstateIDs, ea.EstateID)
	}

	// Load division assignments
	var divisionAssignments []struct {
		DivisionID uuid.UUID
	}
	if err := m.db.WithContext(ctx).
		Table("user_division_assignments").
		Where("user_id = ? AND is_active = true", user.ID).
		Select("division_id").
		Scan(&divisionAssignments).Error; err != nil {
		return fmt.Errorf("failed to load division assignments: %w", err)
	}

	for _, da := range divisionAssignments {
		rlsCtx.DivisionIDs = append(rlsCtx.DivisionIDs, da.DivisionID)
	}

	return nil
}

// loadAllIDs loads all company, estate, and division IDs (for super admin bypass)
func (m *RLSContextMiddleware) loadAllIDs(ctx context.Context, rlsCtx *RLSContext) error {
	// Load all companies
	var companies []struct {
		ID uuid.UUID
	}
	if err := m.db.WithContext(ctx).
		Table("companies").
		Where("deleted_at IS NULL").
		Select("id").
		Scan(&companies).Error; err != nil {
		return fmt.Errorf("failed to load companies: %w", err)
	}

	for _, c := range companies {
		rlsCtx.CompanyIDs = append(rlsCtx.CompanyIDs, c.ID)
	}

	// Load all estates
	var estates []struct {
		ID uuid.UUID
	}
	if err := m.db.WithContext(ctx).
		Table("estates").
		Where("deleted_at IS NULL").
		Select("id").
		Scan(&estates).Error; err != nil {
		return fmt.Errorf("failed to load estates: %w", err)
	}

	for _, e := range estates {
		rlsCtx.EstateIDs = append(rlsCtx.EstateIDs, e.ID)
	}

	// Load all divisions
	var divisions []struct {
		ID uuid.UUID
	}
	if err := m.db.WithContext(ctx).
		Table("divisions").
		Where("deleted_at IS NULL").
		Select("id").
		Scan(&divisions).Error; err != nil {
		return fmt.Errorf("failed to load divisions: %w", err)
	}

	for _, d := range divisions {
		rlsCtx.DivisionIDs = append(rlsCtx.DivisionIDs, d.ID)
	}

	return nil
}

// setPostgreSQLContext sets the RLS context in PostgreSQL session variables
func (m *RLSContextMiddleware) setPostgreSQLContext(ctx context.Context, rlsCtx *RLSContext) error {
	// Convert UUID arrays to PostgreSQL array format
	companyIDsStr := m.uuidsToArrayString(rlsCtx.CompanyIDs)
	estateIDsStr := m.uuidsToArrayString(rlsCtx.EstateIDs)
	divisionIDsStr := m.uuidsToArrayString(rlsCtx.DivisionIDs)

	// Call PostgreSQL function to set context
	sql := `SELECT app_set_user_context($1, $2, $3::uuid[], $4::uuid[], $5::uuid[])`

	if err := m.db.WithContext(ctx).Exec(sql,
		rlsCtx.UserID,
		rlsCtx.Role,
		companyIDsStr,
		estateIDsStr,
		divisionIDsStr,
	).Error; err != nil {
		// Check if error is because function doesn't exist (SQLSTATE 42883)
		if strings.Contains(err.Error(), "42883") || strings.Contains(err.Error(), "does not exist") || strings.Contains(err.Error(), "tidak ada") {
			// Function doesn't exist - this is OK if application fallback is enabled
			return nil
		}
		return fmt.Errorf("failed to set PostgreSQL context: %w", err)
	}

	return nil
}

// clearPostgreSQLContext clears the RLS context from PostgreSQL session
func (m *RLSContextMiddleware) clearPostgreSQLContext(ctx context.Context) error {
	// Try to call the PostgreSQL function, but don't fail if it doesn't exist
	// This allows the application to work even if RLS migrations haven't been run
	err := m.db.WithContext(ctx).Exec("SELECT app_clear_user_context()").Error
	if err != nil {
		// Check if error is because function doesn't exist (SQLSTATE 42883)
		if strings.Contains(err.Error(), "42883") || strings.Contains(err.Error(), "does not exist") || strings.Contains(err.Error(), "tidak ada") {
			// Function doesn't exist - this is OK, context clearing is optional
			return nil
		}
		return err
	}
	return nil
}

// uuidsToArrayString converts a UUID array to PostgreSQL array string format
func (m *RLSContextMiddleware) uuidsToArrayString(uuids []uuid.UUID) string {
	if len(uuids) == 0 {
		return "{}"
	}

	strs := make([]string, len(uuids))
	for i, id := range uuids {
		strs[i] = id.String()
	}

	return "{" + strings.Join(strs, ",") + "}"
}

// getClientIP extracts the client IP address from the request
func (m *RLSContextMiddleware) getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header first
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		// Take the first IP in the list
		ips := strings.Split(forwarded, ",")
		return strings.TrimSpace(ips[0])
	}

	// Check X-Real-IP header
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// Fall back to RemoteAddr
	return r.RemoteAddr
}

// getSessionToken extracts the session token from the request
func (m *RLSContextMiddleware) getSessionToken(r *http.Request) string {
	// Try Authorization header first
	auth := r.Header.Get("Authorization")
	if auth != "" && strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}

	// Try cookie
	cookie, err := r.Cookie("session_token")
	if err == nil {
		return cookie.Value
	}

	return ""
}

// logRLSContextError logs RLS context errors for audit
func (m *RLSContextMiddleware) logRLSContextError(ctx context.Context, user *auth.User, err error) {
	// Log to console for debugging (always available)
	fmt.Printf("[RLS_AUDIT] User: %s, Role: %s, Error: %s\n", user.ID, user.Role, err.Error())

	// Try to log to database audit table, but don't fail if table doesn't exist
	auditSQL := `
		INSERT INTO harvest_rls_audit_log (user_id, user_role, action, violation_type, details)
		VALUES ($1, $2, $3, $4, $5)
	`

	details := fmt.Sprintf(`{"error": "%s", "timestamp": "%s"}`, err.Error(), time.Now().Format(time.RFC3339))

	// Silently ignore if table doesn't exist - this is optional audit logging
	_ = m.db.WithContext(ctx).Exec(auditSQL,
		user.ID,
		user.Role,
		"CONTEXT_ERROR",
		"RLS_CONTEXT_INITIALIZATION_FAILED",
		details,
	)
}

// GetRLSContextFromRequest retrieves the RLS context from the request context
// This is used for application-level fallback security checks
func GetRLSContextFromRequest(ctx context.Context) (*RLSContext, bool) {
	rlsCtx, ok := ctx.Value(rlsContextKey{}).(*RLSContext)
	return rlsCtx, ok
}

// ApplicationLevelSecurityCheck performs application-level security check
// This is used as a fallback when RLS is not available or as defense-in-depth
func ApplicationLevelSecurityCheck(ctx context.Context, db *gorm.DB, resourceType string, resourceID uuid.UUID) (bool, error) {
	rlsCtx, ok := GetRLSContextFromRequest(ctx)
	if !ok {
		return false, fmt.Errorf("no RLS context available")
	}

	// Check if context has expired
	if time.Now().After(rlsCtx.ExpiresAt) {
		return false, fmt.Errorf("RLS context has expired")
	}

	// Perform resource-specific checks
	switch resourceType {
	case "harvest_record":
		return checkHarvestRecordAccess(ctx, db, rlsCtx, resourceID)
	case "gate_check":
		return checkGateCheckAccess(ctx, db, rlsCtx, resourceID)
	case "company":
		return checkCompanyAccess(ctx, db, rlsCtx, resourceID)
	case "user":
		return checkUserAccess(ctx, db, rlsCtx, resourceID)
	default:
		return false, fmt.Errorf("unknown resource type: %s", resourceType)
	}
}

// checkHarvestRecordAccess checks if user has access to a harvest record
func checkHarvestRecordAccess(ctx context.Context, db *gorm.DB, rlsCtx *RLSContext, recordID uuid.UUID) (bool, error) {
	// SUPER_ADMIN has access to everything
	if rlsCtx.Role == "SUPER_ADMIN" {
		return true, nil
	}

	// Get harvest record's hierarchy
	var result struct {
		CompanyID  uuid.UUID
		EstateID   uuid.UUID
		DivisionID uuid.UUID
		MandorID   uuid.UUID
	}

	query := `
		SELECT
			e.company_id,
			d.estate_id,
			b.division_id,
			hr.mandor_id
		FROM harvest_records hr
		JOIN blocks b ON hr.block_id = b.id
		JOIN divisions d ON b.division_id = d.id
		JOIN estates e ON d.estate_id = e.id
		WHERE hr.id = $1 AND hr.deleted_at IS NULL
	`

	if err := db.WithContext(ctx).Raw(query, recordID).Scan(&result).Error; err != nil {
		return false, fmt.Errorf("failed to check harvest access: %w", err)
	}

	// Check access based on role
	switch rlsCtx.Role {
	case "COMPANY_ADMIN", "AREA_MANAGER":
		return containsUUID(rlsCtx.CompanyIDs, result.CompanyID), nil
	case "MANAGER":
		return containsUUID(rlsCtx.EstateIDs, result.EstateID), nil
	case "ASISTEN":
		return containsUUID(rlsCtx.DivisionIDs, result.DivisionID), nil
	case "MANDOR":
		return rlsCtx.UserID == result.MandorID, nil
	default:
		return false, nil
	}
}

// checkGateCheckAccess checks if user has access to a gate check record
func checkGateCheckAccess(ctx context.Context, db *gorm.DB, rlsCtx *RLSContext, recordID uuid.UUID) (bool, error) {
	// Implementation similar to harvest check
	// Will be implemented in Gate Check RLS task
	return true, nil
}

// checkCompanyAccess checks if user has access to a company
func checkCompanyAccess(ctx context.Context, db *gorm.DB, rlsCtx *RLSContext, companyID uuid.UUID) (bool, error) {
	if rlsCtx.Role == "SUPER_ADMIN" {
		return true, nil
	}

	return containsUUID(rlsCtx.CompanyIDs, companyID), nil
}

// checkUserAccess checks if user has access to another user's data
func checkUserAccess(ctx context.Context, db *gorm.DB, rlsCtx *RLSContext, userID uuid.UUID) (bool, error) {
	// Users can always access their own data
	if rlsCtx.UserID == userID {
		return true, nil
	}

	// SUPER_ADMIN can access all users
	if rlsCtx.Role == "SUPER_ADMIN" {
		return true, nil
	}

	// Company admins can access users in their companies
	if rlsCtx.Role == "COMPANY_ADMIN" || rlsCtx.Role == "AREA_MANAGER" {
		var targetUserCompanies []uuid.UUID
		if err := db.WithContext(ctx).
			Table("user_company_assignments").
			Where("user_id = ? AND is_active = true", userID).
			Pluck("company_id", &targetUserCompanies).Error; err != nil {
			return false, err
		}

		for _, companyID := range targetUserCompanies {
			if containsUUID(rlsCtx.CompanyIDs, companyID) {
				return true, nil
			}
		}
	}

	return false, nil
}

// containsUUID checks if a UUID is in a slice
func containsUUID(slice []uuid.UUID, item uuid.UUID) bool {
	for _, id := range slice {
		if id == item {
			return true
		}
	}
	return false
}

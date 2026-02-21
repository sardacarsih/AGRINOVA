package web

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"net"
	"time"

	sharedDomain "agrinovagraphql/server/internal/auth/features/shared/domain"
	webDomain "agrinovagraphql/server/internal/auth/features/web/domain"

	"github.com/google/uuid"
)

// Service implements WebAuthService
type Service struct {
	sessionRepo    sharedDomain.SessionRepository
	userRepo       sharedDomain.UserRepository
	assignmentRepo sharedDomain.AssignmentRepository
	companyRepo    sharedDomain.CompanyRepository
	cookieService  webDomain.CookieService
	passwordSvc    sharedDomain.PasswordService
	securityLogger sharedDomain.SecurityEventLogger
	rateLimiter    webDomain.RateLimiter // Injected interface
	config         WebConfig
}

// NewService creates new web authentication service
func NewService(
	sessionRepo sharedDomain.SessionRepository,
	userRepo sharedDomain.UserRepository,
	assignmentRepo sharedDomain.AssignmentRepository,
	companyRepo sharedDomain.CompanyRepository,
	cookieService webDomain.CookieService,
	passwordSvc sharedDomain.PasswordService,
	securityLogger sharedDomain.SecurityEventLogger,
	rateLimiter webDomain.RateLimiter,
	config WebConfig,
) *Service {
	return &Service{
		sessionRepo:    sessionRepo,
		userRepo:       userRepo,
		assignmentRepo: assignmentRepo,
		companyRepo:    companyRepo,
		cookieService:  cookieService,
		passwordSvc:    passwordSvc,
		securityLogger: securityLogger,
		rateLimiter:    rateLimiter,
		config:         config,
	}
}

// Login handles web authentication with cookies
func (s *Service) Login(ctx context.Context, input webDomain.WebLoginInput) (*webDomain.WebLoginResult, error) {
	// 0. Check Rate Limiter
	if allowed, wait := s.rateLimiter.Allow(input.IPAddress); !allowed {
		s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
			Event:     sharedDomain.EventLoginFailure,
			IPAddress: input.IPAddress,
			UserAgent: input.UserAgent,
			Details:   map[string]interface{}{"error": "rate_limit_exceeded", "wait_duration": wait.String()},
		})
		return nil, errors.New("too many login attempts, please try again later")
	}

	// 1. Find user by identifier (username or email)
	user, err := s.userRepo.FindByIdentifier(ctx, input.Identifier)
	if err != nil {
		s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
			Event:     sharedDomain.EventLoginFailure,
			IPAddress: input.IPAddress,
			UserAgent: input.UserAgent,
			Details:   map[string]interface{}{"identifier": input.Identifier, "error": "user_not_found"},
		})
		return nil, ErrInvalidCredentials
	}

	if user == nil || !user.IsActive {
		var userID *string
		errorCode := "user_not_found"
		if user != nil {
			userID = &user.ID
			errorCode = "user_inactive"
		}

		s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
			UserID:    userID,
			Event:     sharedDomain.EventLoginFailure,
			IPAddress: input.IPAddress,
			UserAgent: input.UserAgent,
			Details: map[string]interface{}{
				"identifier": input.Identifier,
				"error":      errorCode,
			},
		})
		return nil, ErrInvalidCredentials
	}

	// 2. Verify password
	if err := s.passwordSvc.VerifyPassword(user.Password, input.Password); err != nil {
		s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
			UserID:    &user.ID,
			Event:     sharedDomain.EventLoginFailure,
			IPAddress: input.IPAddress,
			UserAgent: input.UserAgent,
			Details:   map[string]interface{}{"error": "invalid_password"},
		})
		return nil, ErrInvalidCredentials
	}

	// 3. Get user assignments with details
	assignments, err := s.assignmentRepo.FindWithDetails(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	// 4. Extract unique companies
	companies := s.extractUniqueCompanies(assignments)
	assignmentsDTO := s.convertAssignments(assignments)
	userDTO := s.enrichUserWithPrimaryCompany(sharedDomain.ToUserDTO(user), assignmentsDTO, companies)

	// 5. Create session
	sessionDuration := s.config.SessionDuration
	if input.RememberMe {
		sessionDuration = s.config.RememberMeDuration
	}

	session := &sharedDomain.UserSession{
		ID:           generateID(),
		UserID:       user.ID,
		SessionToken: generateSecureToken(),
		Platform:     sharedDomain.PlatformWeb,
		IPAddress:    stripPort(input.IPAddress),
		UserAgent:    input.UserAgent,
		ExpiresAt:    time.Now().Add(sessionDuration),
		IsActive:     true,
		LoginMethod:  "PASSWORD",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.sessionRepo.CreateSession(ctx, session); err != nil {
		return nil, err
	}

	// 5.5. Enforce single active WEB session per user.
	// Keep the newest session and deactivate older WEB sessions.
	activeSessions, err := s.sessionRepo.FindActiveSessionsByUser(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	for _, activeSession := range activeSessions {
		if activeSession == nil {
			continue
		}
		if activeSession.Platform != sharedDomain.PlatformWeb || activeSession.ID == session.ID {
			continue
		}
		if err := s.sessionRepo.RevokeSession(ctx, activeSession.ID); err != nil {
			return nil, err
		}
	}

	// 6. Set auth cookies
	csrfToken, err := s.cookieService.GenerateCSRFToken()
	if err != nil {
		return nil, err
	}

	if err := s.cookieService.SetAuthCookies(ctx, session.SessionToken, csrfToken); err != nil {
		return nil, err
	}

	// 7. Log successful login
	s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
		UserID:    &user.ID,
		Event:     sharedDomain.EventLoginSuccess,
		IPAddress: input.IPAddress,
		UserAgent: input.UserAgent,
		Details:   map[string]interface{}{"platform": "web"},
	})

	// 8. Return result
	return &webDomain.WebLoginResult{
		SessionID:   session.ID,
		User:        userDTO,
		Companies:   companies,
		Assignments: assignmentsDTO,
		ExpiresAt:   session.ExpiresAt,
	}, nil
}

// Logout handles web logout by clearing cookies
func (s *Service) Logout(ctx context.Context, sessionID string) error {
	// 1. Revoke session
	if err := s.sessionRepo.RevokeSession(ctx, sessionID); err != nil {
		return err
	}

	// 2. Clear cookies
	if err := s.cookieService.ClearAuthCookies(ctx); err != nil {
		return err
	}

	// 3. Log logout
	s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
		Event:   sharedDomain.EventLogout,
		Details: map[string]interface{}{"session_id": sessionID, "platform": "web"},
	})

	return nil
}

// ValidateSession validates active web session
func (s *Service) ValidateSession(ctx context.Context, sessionToken string) (*sharedDomain.UserSession, error) {
	session, err := s.sessionRepo.FindSessionByToken(ctx, sessionToken)
	if err != nil {
		return nil, err
	}

	if session == nil || !session.IsActive || time.Now().After(session.ExpiresAt) {
		return nil, ErrInvalidSession
	}

	// Update last activity
	session.LastActivity = time.Now()
	if err := s.sessionRepo.UpdateSession(ctx, session); err != nil {
		return nil, err
	}

	return session, nil
}

// RefreshSession refreshes an existing web session
func (s *Service) RefreshSession(ctx context.Context, refreshToken string) (*webDomain.WebLoginResult, error) {
	// Implementation for session refresh
	// This would validate the refresh token and issue a new session
	return nil, errors.New("session refresh not implemented yet")
}

// GetMe validates session and returns current user context
func (s *Service) GetMe(ctx context.Context, sessionToken string) (*webDomain.WebLoginResult, error) {
	// 1. Validate session by token (from cookie)
	session, err := s.sessionRepo.FindSessionByToken(ctx, sessionToken)
	if err != nil {
		return nil, err
	}

	if session == nil || !session.IsActive || time.Now().After(session.ExpiresAt) {
		return nil, ErrInvalidSession
	}

	// 2. Get User
	user, err := s.userRepo.FindByID(ctx, session.UserID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrInvalidCredentials
	}

	// 3. Get Assignments & Companies
	assignments, err := s.assignmentRepo.FindWithDetails(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	companies := s.extractUniqueCompanies(assignments)
	assignmentsDTO := s.convertAssignments(assignments)
	userDTO := s.enrichUserWithPrimaryCompany(sharedDomain.ToUserDTO(user), assignmentsDTO, companies)

	return &webDomain.WebLoginResult{
		SessionID:   session.ID,
		User:        userDTO,
		Companies:   companies,
		Assignments: assignmentsDTO,
		ExpiresAt:   session.ExpiresAt,
	}, nil
}

// Helper methods

func (s *Service) extractUniqueCompanies(assignments []*sharedDomain.Assignment) []sharedDomain.CompanyDTO {
	companyMap := make(map[string]*sharedDomain.Company)

	for _, assignment := range assignments {
		if assignment.Company != nil {
			companyMap[assignment.Company.ID] = assignment.Company
		}
	}

	companies := make([]sharedDomain.CompanyDTO, 0, len(companyMap))
	for _, company := range companyMap {
		companies = append(companies, sharedDomain.ToCompanyDTO(company))
	}

	return companies
}

func (s *Service) convertAssignments(assignments []*sharedDomain.Assignment) []sharedDomain.AssignmentDTO {
	dtos := make([]sharedDomain.AssignmentDTO, len(assignments))
	for i, assignment := range assignments {
		dtos[i] = sharedDomain.ToAssignmentDTO(assignment)
	}
	return dtos
}

func (s *Service) enrichUserWithPrimaryCompany(
	user sharedDomain.UserDTO,
	assignments []sharedDomain.AssignmentDTO,
	companies []sharedDomain.CompanyDTO,
) sharedDomain.UserDTO {
	seenCompanyIDs := make(map[string]bool)
	companyIDs := make([]string, 0)

	// Prefer active assignment company for primary company_id.
	for _, assignment := range assignments {
		if !assignment.IsActive || assignment.CompanyID == "" {
			continue
		}
		if !seenCompanyIDs[assignment.CompanyID] {
			seenCompanyIDs[assignment.CompanyID] = true
			companyIDs = append(companyIDs, assignment.CompanyID)
		}
		if user.CompanyID == "" {
			user.CompanyID = assignment.CompanyID
		}
	}

	// Fallback from company list when assignment list is empty.
	if user.CompanyID == "" && len(companies) > 0 {
		user.CompanyID = companies[0].ID
	}

	for _, company := range companies {
		if company.ID == "" || seenCompanyIDs[company.ID] {
			continue
		}
		seenCompanyIDs[company.ID] = true
		companyIDs = append(companyIDs, company.ID)
	}

	if len(companyIDs) > 0 {
		user.CompanyIDs = companyIDs
	}

	// Populate primary company object if missing.
	if user.Company == nil && user.CompanyID != "" {
		for _, company := range companies {
			if company.ID != user.CompanyID {
				continue
			}
			companyCopy := company
			user.Company = &companyCopy
			break
		}
	}

	return user
}

// PasswordService defines interface for password operations
type PasswordService interface {
	VerifyPassword(hashedPassword, password string) error
	HashPassword(password string) (string, error)
}

// SecurityEventLogger defines interface for security logging
type SecurityEventLogger interface {
	LogSecurityEvent(ctx context.Context, event *sharedDomain.SecurityEvent) error
}

// WebConfig holds web authentication configuration
type WebConfig struct {
	SessionDuration    time.Duration
	RememberMeDuration time.Duration
	CSRFSecret         []byte
}

// Errors
var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidSession     = errors.New("invalid or expired session")
)

// Helper functions
func generateID() string {
	return uuid.New().String()
}

func generateSecureToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return uuid.New().String()
	}
	return base64.URLEncoding.EncodeToString(b)
}

// stripPort removes the port from an IP:port address string
func stripPort(addr string) string {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		// If there's no port, return as is
		return addr
	}
	return host
}

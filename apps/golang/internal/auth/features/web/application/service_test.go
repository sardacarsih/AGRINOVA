package web

import (
	"context"
	"testing"
	"time"

	sharedDomain "agrinovagraphql/server/internal/auth/features/shared/domain"
	webDomain "agrinovagraphql/server/internal/auth/features/web/domain"
)

type stubUserRepo struct {
	authUser              *sharedDomain.User
	authErr               error
	byIDUser              *sharedDomain.User
	byIDErr               error
	findAuthByIdentifierN int
	findByIdentifierN     int
	findByIDN             int
}

func (r *stubUserRepo) FindByID(_ context.Context, id string) (*sharedDomain.User, error) {
	r.findByIDN++
	if r.byIDUser != nil && r.byIDUser.ID == id {
		return r.byIDUser, r.byIDErr
	}
	return r.byIDUser, r.byIDErr
}

func (r *stubUserRepo) FindByUsername(context.Context, string) (*sharedDomain.User, error) {
	return nil, nil
}

func (r *stubUserRepo) FindByEmail(context.Context, string) (*sharedDomain.User, error) {
	return nil, nil
}

func (r *stubUserRepo) FindAuthByIdentifier(context.Context, string) (*sharedDomain.User, error) {
	r.findAuthByIdentifierN++
	return r.authUser, r.authErr
}

func (r *stubUserRepo) FindByIdentifier(context.Context, string) (*sharedDomain.User, error) {
	r.findByIdentifierN++
	return nil, nil
}

func (r *stubUserRepo) FindByCompany(context.Context, string) ([]*sharedDomain.User, error) {
	return nil, nil
}

func (r *stubUserRepo) FindByRole(context.Context, sharedDomain.Role) ([]*sharedDomain.User, error) {
	return nil, nil
}

func (r *stubUserRepo) FindWithFilters(context.Context, sharedDomain.UserFilters) ([]*sharedDomain.User, int64, error) {
	return nil, 0, nil
}

func (r *stubUserRepo) Create(context.Context, *sharedDomain.User) error {
	return nil
}

func (r *stubUserRepo) Update(context.Context, *sharedDomain.User) error {
	return nil
}

func (r *stubUserRepo) Delete(context.Context, string) error {
	return nil
}

type stubSessionRepo struct {
	sessionByToken          *sharedDomain.UserSession
	sessionByTokenErr       error
	activeSessions          []*sharedDomain.UserSession
	activeSessionsErr       error
	tryRotateSingleOK       bool
	tryRotateSingleErr      error
	rotateSession           *sharedDomain.UserSession
	createSessionN          int
	findActiveSessionsN     int
	tryRotateSingleN        int
	updateSessionN          int
	revokeOtherSessionsN    int
	lastRevokeOtherUserID   string
	lastRevokeOtherExclude  string
	lastRevokeOtherPlatform sharedDomain.PlatformType
	lastUpdatedSession      *sharedDomain.UserSession
	lastRotatedSession      *sharedDomain.UserSession
}

func (r *stubSessionRepo) CreateSession(_ context.Context, session *sharedDomain.UserSession) error {
	r.createSessionN++
	return nil
}

func (r *stubSessionRepo) FindSessionByToken(context.Context, string) (*sharedDomain.UserSession, error) {
	return r.sessionByToken, r.sessionByTokenErr
}

func (r *stubSessionRepo) FindSessionByID(context.Context, string) (*sharedDomain.UserSession, error) {
	return nil, nil
}

func (r *stubSessionRepo) FindActiveSessionsByUser(context.Context, string) ([]*sharedDomain.UserSession, error) {
	r.findActiveSessionsN++
	return r.activeSessions, r.activeSessionsErr
}

func (r *stubSessionRepo) TryRotateSingleActiveSession(_ context.Context, session *sharedDomain.UserSession) (bool, error) {
	r.tryRotateSingleN++
	if r.tryRotateSingleErr != nil {
		return false, r.tryRotateSingleErr
	}
	if !r.tryRotateSingleOK {
		return false, nil
	}
	if session == nil {
		r.lastRotatedSession = nil
		return true, nil
	}

	rotated := *session
	if r.rotateSession != nil {
		rotated.ID = r.rotateSession.ID
		rotated.CreatedAt = r.rotateSession.CreatedAt
	}

	copy := rotated
	r.lastRotatedSession = &copy
	*session = rotated
	return true, nil
}

func (r *stubSessionRepo) UpdateSession(_ context.Context, session *sharedDomain.UserSession) error {
	r.updateSessionN++
	if session == nil {
		r.lastUpdatedSession = nil
		return nil
	}
	copy := *session
	r.lastUpdatedSession = &copy
	return nil
}

func (r *stubSessionRepo) RevokeSession(context.Context, string) error {
	return nil
}

func (r *stubSessionRepo) RevokeOtherSessionsByUser(_ context.Context, userID, excludeSessionID string, platform sharedDomain.PlatformType) error {
	r.revokeOtherSessionsN++
	r.lastRevokeOtherUserID = userID
	r.lastRevokeOtherExclude = excludeSessionID
	r.lastRevokeOtherPlatform = platform
	return nil
}

func (r *stubSessionRepo) RevokeAllUserSessions(context.Context, string) error {
	return nil
}

func (r *stubSessionRepo) RevokeExpiredSessions(context.Context) error {
	return nil
}

func (r *stubSessionRepo) CleanupOldSessions(context.Context, time.Duration) error {
	return nil
}

type stubAssignmentRepo struct {
	assignments      []*sharedDomain.Assignment
	err              error
	findWithDetailsN int
}

func (r *stubAssignmentRepo) FindByUserID(context.Context, string) ([]*sharedDomain.Assignment, error) {
	return nil, nil
}

func (r *stubAssignmentRepo) FindByUserAndCompany(context.Context, string, string) ([]*sharedDomain.Assignment, error) {
	return nil, nil
}

func (r *stubAssignmentRepo) FindByUserAndEstate(context.Context, string, string) ([]*sharedDomain.Assignment, error) {
	return nil, nil
}

func (r *stubAssignmentRepo) CreateAssignment(context.Context, *sharedDomain.Assignment) error {
	return nil
}

func (r *stubAssignmentRepo) UpdateAssignment(context.Context, *sharedDomain.Assignment) error {
	return nil
}

func (r *stubAssignmentRepo) RevokeAssignment(context.Context, string) error {
	return nil
}

func (r *stubAssignmentRepo) FindWithDetails(context.Context, string) ([]*sharedDomain.Assignment, error) {
	r.findWithDetailsN++
	return r.assignments, r.err
}

func (r *stubAssignmentRepo) FindActiveAssignments(context.Context, string) ([]*sharedDomain.Assignment, error) {
	return nil, nil
}

type stubCookieService struct{}

func (s *stubCookieService) SetAuthCookies(context.Context, string, string) error {
	return nil
}

func (s *stubCookieService) ClearAuthCookies(context.Context) error {
	return nil
}

func (s *stubCookieService) ValidateCSRF(context.Context, string) error {
	return nil
}

func (s *stubCookieService) GenerateCSRFToken() (string, error) {
	return "csrf-token", nil
}

type stubPasswordService struct {
	verifyErr error
}

func (s *stubPasswordService) VerifyPassword(string, string) error {
	return s.verifyErr
}

func (s *stubPasswordService) HashPassword(string) (string, error) {
	return "", nil
}

type stubSecurityLogger struct{}

func (s *stubSecurityLogger) LogSecurityEvent(context.Context, *sharedDomain.SecurityEvent) error {
	return nil
}

type stubRateLimiter struct{}

func (s *stubRateLimiter) Blocked(string) (bool, time.Duration) {
	return false, 0
}

func (s *stubRateLimiter) Allow(string) (bool, time.Duration) {
	return true, 0
}

func (s *stubRateLimiter) Reset(string) {}

func TestLoginSkipsAssignmentsAndUsesBulkSessionRevoke(t *testing.T) {
	userRepo := &stubUserRepo{
		authUser: &sharedDomain.User{
			ID:       "user-1",
			Username: "manager",
			Name:     "Manager",
			Password: "hashed-password",
			Role:     sharedDomain.RoleManager,
			IsActive: true,
			Assignments: []sharedDomain.Assignment{
				{
					ID:        "assign-1",
					CompanyID: "company-1",
					IsActive:  true,
				},
			},
		},
	}
	sessionRepo := &stubSessionRepo{}
	assignmentRepo := &stubAssignmentRepo{
		assignments: []*sharedDomain.Assignment{
			{
				ID:        "unexpected-assignment",
				CompanyID: "company-1",
				IsActive:  true,
			},
		},
	}

	service := &Service{
		sessionRepo:    sessionRepo,
		userRepo:       userRepo,
		assignmentRepo: assignmentRepo,
		cookieService:  &stubCookieService{},
		passwordSvc:    &stubPasswordService{},
		securityLogger: &stubSecurityLogger{},
		rateLimiter:    &stubRateLimiter{},
		config: WebConfig{
			SessionDuration:    time.Hour,
			RememberMeDuration: 24 * time.Hour,
		},
	}

	result, err := service.Login(context.Background(), testWebLoginInput("manager", "secret"))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if userRepo.findAuthByIdentifierN != 1 {
		t.Fatalf("expected FindAuthByIdentifier to be called once, got %d", userRepo.findAuthByIdentifierN)
	}
	if userRepo.findByIdentifierN != 0 {
		t.Fatalf("expected FindByIdentifier to remain unused, got %d calls", userRepo.findByIdentifierN)
	}
	if sessionRepo.tryRotateSingleN != 1 {
		t.Fatalf("expected single-session rotate attempt once, got %d", sessionRepo.tryRotateSingleN)
	}
	if assignmentRepo.findWithDetailsN != 0 {
		t.Fatalf("expected login to skip assignment loading, got %d calls", assignmentRepo.findWithDetailsN)
	}
	if sessionRepo.revokeOtherSessionsN != 1 {
		t.Fatalf("expected bulk revoke to be called once, got %d", sessionRepo.revokeOtherSessionsN)
	}
	if sessionRepo.lastRevokeOtherUserID != "user-1" {
		t.Fatalf("expected bulk revoke for user-1, got %q", sessionRepo.lastRevokeOtherUserID)
	}
	if sessionRepo.lastRevokeOtherPlatform != sharedDomain.PlatformWeb {
		t.Fatalf("expected bulk revoke for WEB, got %q", sessionRepo.lastRevokeOtherPlatform)
	}
	if result == nil {
		t.Fatal("expected a login result")
	}
	if len(result.Assignments) != 0 {
		t.Fatalf("expected no assignments in login result, got %d", len(result.Assignments))
	}
	if len(result.Companies) != 0 {
		t.Fatalf("expected no companies in login result, got %d", len(result.Companies))
	}
	if result.User.CompanyID != "company-1" {
		t.Fatalf("expected primary company to come from auth user assignments, got %q", result.User.CompanyID)
	}
}

func TestLoginReusesSingleActiveWebSession(t *testing.T) {
	start := time.Now()
	userRepo := &stubUserRepo{
		authUser: &sharedDomain.User{
			ID:       "user-1",
			Username: "manager",
			Name:     "Manager",
			Password: "hashed-password",
			Role:     sharedDomain.RoleManager,
			IsActive: true,
			Assignments: []sharedDomain.Assignment{
				{
					ID:        "assign-1",
					CompanyID: "company-1",
					IsActive:  true,
				},
			},
		},
	}
	sessionRepo := &stubSessionRepo{
		tryRotateSingleOK: true,
		rotateSession: &sharedDomain.UserSession{
			ID:           "session-1",
			UserID:       "user-1",
			SessionToken: "old-token",
			Platform:     sharedDomain.PlatformWeb,
			IPAddress:    "10.0.0.1",
			UserAgent:    "old-agent",
			ExpiresAt:    start.Add(10 * time.Minute),
			IsActive:     true,
			LoginMethod:  "PASSWORD",
			CreatedAt:    start.Add(-time.Hour),
			UpdatedAt:    start.Add(-time.Hour),
		},
	}

	service := &Service{
		sessionRepo:    sessionRepo,
		userRepo:       userRepo,
		assignmentRepo: &stubAssignmentRepo{},
		cookieService:  &stubCookieService{},
		passwordSvc:    &stubPasswordService{},
		securityLogger: &stubSecurityLogger{},
		rateLimiter:    &stubRateLimiter{},
		config: WebConfig{
			SessionDuration:    time.Hour,
			RememberMeDuration: 24 * time.Hour,
		},
	}

	result, err := service.Login(context.Background(), testWebLoginInput("manager", "secret"))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if sessionRepo.tryRotateSingleN != 1 {
		t.Fatalf("expected single-session rotate attempt once, got %d", sessionRepo.tryRotateSingleN)
	}
	if sessionRepo.createSessionN != 0 {
		t.Fatalf("expected no new session insert, got %d", sessionRepo.createSessionN)
	}
	if sessionRepo.revokeOtherSessionsN != 0 {
		t.Fatalf("expected no bulk revoke, got %d", sessionRepo.revokeOtherSessionsN)
	}
	if sessionRepo.lastRotatedSession == nil {
		t.Fatal("expected rotated session snapshot")
	}
	if sessionRepo.lastRotatedSession.ID != "session-1" {
		t.Fatalf("expected reused session id session-1, got %q", sessionRepo.lastRotatedSession.ID)
	}
	if sessionRepo.lastRotatedSession.SessionToken == "old-token" {
		t.Fatal("expected session token rotation on reuse")
	}
	if sessionRepo.lastRotatedSession.IPAddress != "127.0.0.1" {
		t.Fatalf("expected stripped ip address, got %q", sessionRepo.lastRotatedSession.IPAddress)
	}
	if sessionRepo.lastRotatedSession.UserAgent != "test-agent" {
		t.Fatalf("expected updated user agent, got %q", sessionRepo.lastRotatedSession.UserAgent)
	}
	if !sessionRepo.lastRotatedSession.ExpiresAt.After(start.Add(59 * time.Minute)) {
		t.Fatalf("expected expiry to be extended, got %s", sessionRepo.lastRotatedSession.ExpiresAt)
	}
	if result == nil {
		t.Fatal("expected a login result")
	}
	if result.SessionID != "session-1" {
		t.Fatalf("expected login result to reuse session-1, got %q", result.SessionID)
	}
}

func TestGetMeLoadsAssignments(t *testing.T) {
	userRepo := &stubUserRepo{
		byIDUser: &sharedDomain.User{
			ID:       "user-1",
			Username: "manager",
			Name:     "Manager",
			Role:     sharedDomain.RoleManager,
			IsActive: true,
		},
	}
	sessionRepo := &stubSessionRepo{
		sessionByToken: &sharedDomain.UserSession{
			ID:        "session-1",
			UserID:    "user-1",
			IsActive:  true,
			ExpiresAt: time.Now().Add(time.Hour),
		},
	}
	assignmentRepo := &stubAssignmentRepo{
		assignments: []*sharedDomain.Assignment{
			{
				ID:        "assign-1",
				CompanyID: "company-1",
				IsActive:  true,
				Company: &sharedDomain.Company{
					ID:   "company-1",
					Name: "Agrinova",
				},
			},
		},
	}

	service := &Service{
		sessionRepo:    sessionRepo,
		userRepo:       userRepo,
		assignmentRepo: assignmentRepo,
	}

	result, err := service.GetMe(context.Background(), "session-token")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if assignmentRepo.findWithDetailsN != 1 {
		t.Fatalf("expected GetMe to load assignments once, got %d calls", assignmentRepo.findWithDetailsN)
	}
	if userRepo.findByIDN != 1 {
		t.Fatalf("expected FindByID to be called once, got %d", userRepo.findByIDN)
	}
	if result == nil {
		t.Fatal("expected GetMe result")
	}
	if len(result.Assignments) != 1 {
		t.Fatalf("expected 1 assignment in GetMe result, got %d", len(result.Assignments))
	}
	if result.User.CompanyID != "company-1" {
		t.Fatalf("expected company context from assignments, got %q", result.User.CompanyID)
	}
}

func TestCreateWebSessionForUserSkipsAssignmentsAndUsesBulkSessionRevoke(t *testing.T) {
	userRepo := &stubUserRepo{
		byIDUser: &sharedDomain.User{
			ID:       "user-1",
			Username: "manager",
			Name:     "Manager",
			Role:     sharedDomain.RoleManager,
			IsActive: true,
			Assignments: []sharedDomain.Assignment{
				{
					ID:        "assign-1",
					CompanyID: "company-1",
					IsActive:  true,
				},
			},
		},
	}
	sessionRepo := &stubSessionRepo{}
	assignmentRepo := &stubAssignmentRepo{
		assignments: []*sharedDomain.Assignment{
			{
				ID:        "unexpected-assignment",
				CompanyID: "company-1",
				IsActive:  true,
			},
		},
	}

	service := &Service{
		sessionRepo:    sessionRepo,
		userRepo:       userRepo,
		assignmentRepo: assignmentRepo,
		cookieService:  &stubCookieService{},
		securityLogger: &stubSecurityLogger{},
		config: WebConfig{
			SessionDuration: time.Hour,
		},
	}

	result, err := service.createWebSessionForUser(context.Background(), "user-1", "127.0.0.1:8080", "test-agent", "QR")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if userRepo.findByIDN != 1 {
		t.Fatalf("expected FindByID to be called once, got %d", userRepo.findByIDN)
	}
	if sessionRepo.tryRotateSingleN != 1 {
		t.Fatalf("expected single-session rotate attempt once, got %d", sessionRepo.tryRotateSingleN)
	}
	if assignmentRepo.findWithDetailsN != 0 {
		t.Fatalf("expected QR session creation to skip assignment loading, got %d calls", assignmentRepo.findWithDetailsN)
	}
	if sessionRepo.revokeOtherSessionsN != 1 {
		t.Fatalf("expected bulk revoke to be called once, got %d", sessionRepo.revokeOtherSessionsN)
	}
	if result == nil {
		t.Fatal("expected a QR login result")
	}
	if len(result.Assignments) != 0 {
		t.Fatalf("expected no assignments in QR login result, got %d", len(result.Assignments))
	}
	if len(result.Companies) != 0 {
		t.Fatalf("expected no companies in QR login result, got %d", len(result.Companies))
	}
	if result.User.CompanyID != "company-1" {
		t.Fatalf("expected primary company to come from user assignments, got %q", result.User.CompanyID)
	}
}

func testWebLoginInput(identifier, password string) webDomain.WebLoginInput {
	return webDomain.WebLoginInput{
		Identifier: identifier,
		Password:   password,
		IPAddress:  "127.0.0.1:8080",
		UserAgent:  "test-agent",
	}
}

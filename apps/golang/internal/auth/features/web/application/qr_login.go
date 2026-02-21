package web

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"net/url"
	"sync"
	"time"

	sharedDomain "agrinovagraphql/server/internal/auth/features/shared/domain"
	webDomain "agrinovagraphql/server/internal/auth/features/web/domain"
)

const (
	webQRSessionTTL         = 2 * time.Minute
	webQRLoginMethod        = "QR_CODE"
	qrLoginStatusProcessing = "PROCESSING"
)

var (
	ErrQRLoginSessionNotFound = errors.New("qr login session not found")
	ErrQRLoginSessionInvalid  = errors.New("invalid qr login session")
	ErrQRLoginNotApproved     = errors.New("qr login session not approved")
	ErrQRLoginAlreadyConsumed = errors.New("qr login session already consumed")
	ErrQRLoginExpired         = errors.New("qr login session expired")
)

type qrLoginSessionRecord struct {
	SessionID        string
	Challenge        string
	QRData           string
	Status           string
	ExpiresAt        time.Time
	CreatedAt        time.Time
	ApprovedByUserID string
	ApprovedAt       *time.Time
	ConsumedAt       *time.Time
}

func (r *qrLoginSessionRecord) clone() *qrLoginSessionRecord {
	if r == nil {
		return nil
	}
	copy := *r
	return &copy
}

type inMemoryQRLoginStore struct {
	mu       sync.RWMutex
	sessions map[string]*qrLoginSessionRecord
}

func newInMemoryQRLoginStore() *inMemoryQRLoginStore {
	return &inMemoryQRLoginStore{
		sessions: make(map[string]*qrLoginSessionRecord),
	}
}

func (s *inMemoryQRLoginStore) create(record *qrLoginSessionRecord) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[record.SessionID] = record
}

func (s *inMemoryQRLoginStore) get(sessionID string) (*qrLoginSessionRecord, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	record, ok := s.sessions[sessionID]
	if !ok {
		return nil, false
	}
	return record.clone(), true
}

func (s *inMemoryQRLoginStore) mutate(sessionID string, mutator func(record *qrLoginSessionRecord) error) (*qrLoginSessionRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record, ok := s.sessions[sessionID]
	if !ok {
		return nil, ErrQRLoginSessionNotFound
	}

	if err := mutator(record); err != nil {
		return nil, err
	}

	return record.clone(), nil
}

func (s *inMemoryQRLoginStore) cleanupExpired(now time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for id, record := range s.sessions {
		if record.ExpiresAt.After(now) {
			continue
		}
		if record.Status == string(webDomain.QRLoginStatusConsumed) {
			// Keep consumed entries briefly for status checks, then purge.
			if record.ConsumedAt != nil && now.Sub(*record.ConsumedAt) < 5*time.Minute {
				continue
			}
		}
		delete(s.sessions, id)
	}
}

var webQRLoginStore = newInMemoryQRLoginStore()

func (s *Service) CreateQRLoginSession(_ context.Context, _ webDomain.CreateQRLoginSessionInput) (*webDomain.QRLoginSession, error) {
	now := time.Now()
	webQRLoginStore.cleanupExpired(now)

	sessionID := generateID()
	challenge := generateURLSafeToken()
	expiresAt := now.Add(webQRSessionTTL)

	record := &qrLoginSessionRecord{
		SessionID: sessionID,
		Challenge: challenge,
		QRData:    buildQRLoginData(sessionID, challenge, expiresAt),
		Status:    string(webDomain.QRLoginStatusPending),
		ExpiresAt: expiresAt,
		CreatedAt: now,
	}

	webQRLoginStore.create(record)

	return &webDomain.QRLoginSession{
		SessionID: sessionID,
		Challenge: challenge,
		QRData:    record.QRData,
		Status:    webDomain.QRLoginStatusPending,
		ExpiresAt: expiresAt,
		Message:   "QR session created",
	}, nil
}

func (s *Service) GetQRLoginStatus(_ context.Context, input webDomain.GetQRLoginStatusInput) (*webDomain.QRLoginSession, error) {
	webQRLoginStore.cleanupExpired(time.Now())

	record, ok := webQRLoginStore.get(input.SessionID)
	if !ok {
		return nil, ErrQRLoginSessionNotFound
	}

	if record.Challenge != input.Challenge {
		return nil, ErrQRLoginSessionInvalid
	}

	if time.Now().After(record.ExpiresAt) && record.Status != string(webDomain.QRLoginStatusConsumed) {
		updated, err := webQRLoginStore.mutate(input.SessionID, func(existing *qrLoginSessionRecord) error {
			existing.Status = string(webDomain.QRLoginStatusExpired)
			return nil
		})
		if err == nil {
			record = updated
		}
	}

	status := mapQRLoginStatus(record.Status)
	if status == webDomain.QRLoginStatusExpired {
		return &webDomain.QRLoginSession{
			SessionID: record.SessionID,
			Challenge: record.Challenge,
			QRData:    record.QRData,
			Status:    status,
			ExpiresAt: record.ExpiresAt,
			Message:   "QR login expired",
		}, nil
	}

	return &webDomain.QRLoginSession{
		SessionID: record.SessionID,
		Challenge: record.Challenge,
		QRData:    record.QRData,
		Status:    status,
		ExpiresAt: record.ExpiresAt,
		Message:   buildQRLoginMessage(status),
	}, nil
}

func (s *Service) ApproveQRLogin(_ context.Context, input webDomain.ApproveQRLoginInput) (*webDomain.QRLoginSession, error) {
	if input.UserID == "" {
		return nil, ErrInvalidCredentials
	}

	updated, err := webQRLoginStore.mutate(input.SessionID, func(record *qrLoginSessionRecord) error {
		if record.Challenge != input.Challenge {
			return ErrQRLoginSessionInvalid
		}

		if time.Now().After(record.ExpiresAt) {
			record.Status = string(webDomain.QRLoginStatusExpired)
			return ErrQRLoginExpired
		}

		switch record.Status {
		case string(webDomain.QRLoginStatusConsumed):
			return ErrQRLoginAlreadyConsumed
		case string(webDomain.QRLoginStatusExpired):
			return ErrQRLoginExpired
		case string(webDomain.QRLoginStatusApproved):
			if record.ApprovedByUserID == input.UserID {
				return nil
			}
			return ErrQRLoginSessionInvalid
		case string(webDomain.QRLoginStatusPending):
			now := time.Now()
			record.ApprovedByUserID = input.UserID
			record.ApprovedAt = &now
			record.Status = string(webDomain.QRLoginStatusApproved)
			return nil
		default:
			return ErrQRLoginSessionInvalid
		}
	})
	if err != nil {
		return nil, err
	}

	status := mapQRLoginStatus(updated.Status)
	return &webDomain.QRLoginSession{
		SessionID: updated.SessionID,
		Challenge: updated.Challenge,
		QRData:    updated.QRData,
		Status:    status,
		ExpiresAt: updated.ExpiresAt,
		Message:   buildQRLoginMessage(status),
	}, nil
}

func (s *Service) ConsumeQRLogin(ctx context.Context, input webDomain.ConsumeQRLoginInput) (*webDomain.WebLoginResult, error) {
	claimed, err := webQRLoginStore.mutate(input.SessionID, func(record *qrLoginSessionRecord) error {
		if record.Challenge != input.Challenge {
			return ErrQRLoginSessionInvalid
		}

		if time.Now().After(record.ExpiresAt) {
			record.Status = string(webDomain.QRLoginStatusExpired)
			return ErrQRLoginExpired
		}

		if record.Status == string(webDomain.QRLoginStatusConsumed) {
			return ErrQRLoginAlreadyConsumed
		}

		if record.Status != string(webDomain.QRLoginStatusApproved) {
			return ErrQRLoginNotApproved
		}

		if record.ApprovedByUserID == "" {
			return ErrQRLoginNotApproved
		}

		record.Status = qrLoginStatusProcessing
		return nil
	})
	if err != nil {
		return nil, err
	}

	result, err := s.createWebSessionForUser(
		ctx,
		claimed.ApprovedByUserID,
		input.IPAddress,
		input.UserAgent,
		webQRLoginMethod,
	)
	if err != nil {
		_, _ = webQRLoginStore.mutate(input.SessionID, func(record *qrLoginSessionRecord) error {
			if record.Status == qrLoginStatusProcessing {
				record.Status = string(webDomain.QRLoginStatusApproved)
			}
			return nil
		})
		return nil, err
	}

	_, _ = webQRLoginStore.mutate(input.SessionID, func(record *qrLoginSessionRecord) error {
		now := time.Now()
		record.Status = string(webDomain.QRLoginStatusConsumed)
		record.ConsumedAt = &now
		return nil
	})

	return result, nil
}

func (s *Service) createWebSessionForUser(
	ctx context.Context,
	userID string,
	ipAddress string,
	userAgent string,
	loginMethod string,
) (*webDomain.WebLoginResult, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil || !user.IsActive {
		return nil, ErrInvalidCredentials
	}

	assignments, err := s.assignmentRepo.FindWithDetails(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	companies := s.extractUniqueCompanies(assignments)
	assignmentsDTO := s.convertAssignments(assignments)
	userDTO := s.enrichUserWithPrimaryCompany(sharedDomain.ToUserDTO(user), assignmentsDTO, companies)

	session := &sharedDomain.UserSession{
		ID:           generateID(),
		UserID:       user.ID,
		SessionToken: generateSecureToken(),
		Platform:     sharedDomain.PlatformWeb,
		IPAddress:    stripPort(ipAddress),
		UserAgent:    userAgent,
		ExpiresAt:    time.Now().Add(s.config.SessionDuration),
		IsActive:     true,
		LoginMethod:  loginMethod,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.sessionRepo.CreateSession(ctx, session); err != nil {
		return nil, err
	}

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

	csrfToken, err := s.cookieService.GenerateCSRFToken()
	if err != nil {
		return nil, err
	}

	if err := s.cookieService.SetAuthCookies(ctx, session.SessionToken, csrfToken); err != nil {
		return nil, err
	}

	s.securityLogger.LogSecurityEvent(ctx, &sharedDomain.SecurityEvent{
		UserID:    &user.ID,
		Event:     sharedDomain.EventLoginSuccess,
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Details: map[string]interface{}{
			"platform":     "web",
			"login_method": loginMethod,
		},
	})

	return &webDomain.WebLoginResult{
		SessionID:   session.ID,
		User:        userDTO,
		Companies:   companies,
		Assignments: assignmentsDTO,
		ExpiresAt:   session.ExpiresAt,
	}, nil
}

func mapQRLoginStatus(status string) webDomain.QRLoginStatus {
	switch status {
	case string(webDomain.QRLoginStatusApproved):
		return webDomain.QRLoginStatusApproved
	case string(webDomain.QRLoginStatusExpired):
		return webDomain.QRLoginStatusExpired
	case string(webDomain.QRLoginStatusConsumed):
		return webDomain.QRLoginStatusConsumed
	default:
		return webDomain.QRLoginStatusPending
	}
}

func buildQRLoginMessage(status webDomain.QRLoginStatus) string {
	switch status {
	case webDomain.QRLoginStatusApproved:
		return "QR login approved"
	case webDomain.QRLoginStatusExpired:
		return "QR login expired"
	case webDomain.QRLoginStatusConsumed:
		return "QR login consumed"
	default:
		return "Waiting for QR approval"
	}
}

func buildQRLoginData(sessionID, challenge string, expiresAt time.Time) string {
	params := url.Values{}
	params.Set("sessionId", sessionID)
	params.Set("challenge", challenge)
	params.Set("exp", fmt.Sprintf("%d", expiresAt.Unix()))
	params.Set("v", "1")

	return fmt.Sprintf("agrinova://login?%s", params.Encode())
}

func generateURLSafeToken() string {
	bytes := make([]byte, 24)
	if _, err := rand.Read(bytes); err != nil {
		return generateID()
	}
	return base64.RawURLEncoding.EncodeToString(bytes)
}

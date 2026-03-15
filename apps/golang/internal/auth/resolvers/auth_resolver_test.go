package resolvers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	sharedDomain "agrinovagraphql/server/internal/auth/features/shared/domain"
	webDomain "agrinovagraphql/server/internal/auth/features/web/domain"
	webGraphQL "agrinovagraphql/server/internal/auth/features/web/interfaces/graphql"
)

type mockWebAuthService struct {
	logoutCalled    int
	logoutSessionID string
	logoutErr       error
	getMeCalled     int
	getMeToken      string
	getMeResult     *webDomain.WebLoginResult
	getMeErr        error
}

func (m *mockWebAuthService) Login(context.Context, webDomain.WebLoginInput) (*webDomain.WebLoginResult, error) {
	return nil, errors.New("not implemented")
}

func (m *mockWebAuthService) Logout(_ context.Context, sessionID string) error {
	m.logoutCalled++
	m.logoutSessionID = sessionID
	return m.logoutErr
}

func (m *mockWebAuthService) ValidateSession(context.Context, string) (*sharedDomain.UserSession, error) {
	return nil, errors.New("not implemented")
}

func (m *mockWebAuthService) RefreshSession(context.Context, string) (*webDomain.WebLoginResult, error) {
	return nil, errors.New("not implemented")
}

func (m *mockWebAuthService) GetMe(_ context.Context, sessionToken string) (*webDomain.WebLoginResult, error) {
	m.getMeCalled++
	m.getMeToken = sessionToken
	if m.getMeErr != nil {
		return nil, m.getMeErr
	}
	if m.getMeResult != nil {
		return m.getMeResult, nil
	}
	return nil, errors.New("not implemented")
}

func (m *mockWebAuthService) CreateQRLoginSession(context.Context, webDomain.CreateQRLoginSessionInput) (*webDomain.QRLoginSession, error) {
	return nil, errors.New("not implemented")
}

func (m *mockWebAuthService) GetQRLoginStatus(context.Context, webDomain.GetQRLoginStatusInput) (*webDomain.QRLoginSession, error) {
	return nil, errors.New("not implemented")
}

func (m *mockWebAuthService) ApproveQRLogin(context.Context, webDomain.ApproveQRLoginInput) (*webDomain.QRLoginSession, error) {
	return nil, errors.New("not implemented")
}

func (m *mockWebAuthService) ConsumeQRLogin(context.Context, webDomain.ConsumeQRLoginInput) (*webDomain.WebLoginResult, error) {
	return nil, errors.New("not implemented")
}

func TestLogoutUsesSessionIDFromContext(t *testing.T) {
	mockService := &mockWebAuthService{}
	resolver := NewAuthResolver()
	resolver.SetWebResolver(webGraphQL.NewResolver(mockService))

	ctx := context.WithValue(context.Background(), "session_id", "session-from-context")
	ok, err := resolver.Logout(ctx)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !ok {
		t.Fatal("expected logout to succeed")
	}
	if mockService.logoutCalled != 1 {
		t.Fatalf("expected logout to be called once, got %d", mockService.logoutCalled)
	}
	if mockService.logoutSessionID != "session-from-context" {
		t.Fatalf("expected session ID to come from context, got %q", mockService.logoutSessionID)
	}
}

func TestLogoutUsesAuthSessionCookieFallback(t *testing.T) {
	mockService := &mockWebAuthService{}
	resolver := NewAuthResolver()
	resolver.SetWebResolver(webGraphQL.NewResolver(mockService))

	req := httptest.NewRequest(http.MethodPost, "/graphql", nil)
	req.AddCookie(&http.Cookie{Name: "auth-session", Value: "session-from-cookie"})
	httpCtx := map[string]interface{}{
		"request": req,
	}
	ctx := context.WithValue(context.Background(), "http", httpCtx)

	ok, err := resolver.Logout(ctx)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !ok {
		t.Fatal("expected logout to succeed")
	}
	if mockService.logoutCalled != 1 {
		t.Fatalf("expected logout to be called once, got %d", mockService.logoutCalled)
	}
	if mockService.logoutSessionID != "session-from-cookie" {
		t.Fatalf("expected session ID to come from auth-session cookie, got %q", mockService.logoutSessionID)
	}
}

func TestLogoutPropagatesWebLogoutError(t *testing.T) {
	mockService := &mockWebAuthService{
		logoutErr: errors.New("logout failed"),
	}
	resolver := NewAuthResolver()
	resolver.SetWebResolver(webGraphQL.NewResolver(mockService))

	ctx := context.WithValue(context.Background(), "session_id", "session-from-context")
	ok, err := resolver.Logout(ctx)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if ok {
		t.Fatal("expected logout to fail")
	}
}

func TestMeUsesSessionTokenCookieForWebAuth(t *testing.T) {
	mockService := &mockWebAuthService{
		getMeResult: &webDomain.WebLoginResult{
			User: sharedDomain.UserDTO{
				ID:       "user-1",
				Username: "superadmin",
			},
		},
	}
	resolver := NewAuthResolver()
	resolver.SetWebResolver(webGraphQL.NewResolver(mockService))

	req := httptest.NewRequest(http.MethodPost, "/graphql", nil)
	req.AddCookie(&http.Cookie{Name: "session_id", Value: "token-from-cookie"})
	httpCtx := map[string]interface{}{
		"request": req,
	}
	ctx := context.WithValue(context.Background(), "http", httpCtx)
	ctx = context.WithValue(ctx, "session_id", "uuid-from-context")

	user, err := resolver.Me(ctx)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if user == nil {
		t.Fatal("expected user to be returned")
	}
	if mockService.getMeCalled != 1 {
		t.Fatalf("expected GetMe to be called once, got %d", mockService.getMeCalled)
	}
	if mockService.getMeToken != "token-from-cookie" {
		t.Fatalf("expected GetMe token to come from cookie, got %q", mockService.getMeToken)
	}
}

func TestCurrentUserUsesSessionTokenCookieForWebAuth(t *testing.T) {
	mockService := &mockWebAuthService{
		getMeResult: &webDomain.WebLoginResult{
			SessionID: "session-1",
			User: sharedDomain.UserDTO{
				ID:       "user-1",
				Username: "superadmin",
			},
		},
	}
	resolver := NewAuthResolver()
	resolver.SetWebResolver(webGraphQL.NewResolver(mockService))

	req := httptest.NewRequest(http.MethodPost, "/graphql", nil)
	req.AddCookie(&http.Cookie{Name: "session_id", Value: "token-from-cookie"})
	httpCtx := map[string]interface{}{
		"request": req,
	}
	ctx := context.WithValue(context.Background(), "http", httpCtx)
	ctx = context.WithValue(ctx, "session_id", "uuid-from-context")

	payload, err := resolver.CurrentUser(ctx)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if payload == nil {
		t.Fatal("expected payload to be returned")
	}
	if mockService.getMeCalled != 1 {
		t.Fatalf("expected GetMe to be called once, got %d", mockService.getMeCalled)
	}
	if mockService.getMeToken != "token-from-cookie" {
		t.Fatalf("expected GetMe token to come from cookie, got %q", mockService.getMeToken)
	}
}

package infrastructure

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestCookieServiceNameFallbacks(t *testing.T) {
	service := NewCookieService(CookieConfig{})

	if got := service.SessionCookieName(); got != "session_id" {
		t.Fatalf("expected default session cookie name 'session_id', got %q", got)
	}

	if got := service.CSRFCookieName(); got != "csrf_token" {
		t.Fatalf("expected default CSRF cookie name 'csrf_token', got %q", got)
	}
}

func TestSetAuthCookiesUsesFallbackNames(t *testing.T) {
	recorder := httptest.NewRecorder()
	ctx := context.WithValue(context.Background(), "http", map[string]interface{}{
		"response_writer": recorder,
	})

	service := NewCookieService(CookieConfig{
		SessionCookieName: "   ",
		CSRFCookieName:    "",
		SessionDuration:   time.Hour,
		CSRFTokenDuration: time.Hour,
	})

	if err := service.SetAuthCookies(ctx, "session-value", "csrf-value"); err != nil {
		t.Fatalf("SetAuthCookies returned error: %v", err)
	}

	cookies := recorder.Result().Cookies()
	cookieValues := make(map[string]string, len(cookies))
	for _, cookie := range cookies {
		cookieValues[cookie.Name] = cookie.Value
	}

	if cookieValues["session_id"] != "session-value" {
		t.Fatalf("expected session_id cookie to be set, got %q", cookieValues["session_id"])
	}

	if cookieValues["csrf_token"] != "csrf-value" {
		t.Fatalf("expected csrf_token cookie to be set, got %q", cookieValues["csrf_token"])
	}
}

func TestValidateCSRFUsesFallbackCookieName(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/graphql", nil)
	request.AddCookie(&http.Cookie{
		Name:  "csrf_token",
		Value: "csrf-token-value",
	})

	ctx := context.WithValue(context.Background(), "http", map[string]interface{}{
		"request": request,
	})

	service := NewCookieService(CookieConfig{
		CSRFCookieName: "  ",
	})

	if err := service.ValidateCSRF(ctx, "csrf-token-value"); err != nil {
		t.Fatalf("expected CSRF token to validate, got error: %v", err)
	}
}

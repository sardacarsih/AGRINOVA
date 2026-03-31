package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// EmailService abstracts email provider integration.
type EmailService interface {
	SendResetPassword(to string, link string) error
}

// SendGridEmailService sends emails using SendGrid API.
type SendGridEmailService struct {
	apiKey     string
	from       string
	httpClient *http.Client
	endpoint   string
}

// NewSendGridEmailService creates a SendGrid-backed email service.
func NewSendGridEmailService(apiKey, from string) *SendGridEmailService {
	return &SendGridEmailService{
		apiKey:     strings.TrimSpace(apiKey),
		from:       strings.TrimSpace(from),
		httpClient: &http.Client{Timeout: 10 * time.Second},
		endpoint:   "https://api.sendgrid.com/v3/mail/send",
	}
}

// SendResetPassword sends reset-password email to a user.
func (s *SendGridEmailService) SendResetPassword(to string, link string) error {
	if strings.TrimSpace(s.apiKey) == "" {
		return fmt.Errorf("sendgrid api key is empty")
	}
	if strings.TrimSpace(s.from) == "" {
		return fmt.Errorf("sendgrid from email is empty")
	}
	if strings.TrimSpace(to) == "" {
		return fmt.Errorf("email destination is empty")
	}
	if strings.TrimSpace(link) == "" {
		return fmt.Errorf("reset link is empty")
	}

	payload := map[string]interface{}{
		"personalizations": []map[string]interface{}{
			{
				"to": []map[string]string{
					{"email": to},
				},
			},
		},
		"from": map[string]string{
			"email": s.from,
		},
		"subject": "Reset password Agrinova",
		"content": []map[string]string{
			{
				"type":  "text/plain",
				"value": fmt.Sprintf("Gunakan link berikut untuk reset password Anda: %s", link),
			},
			{
				"type":  "text/html",
				"value": fmt.Sprintf("<p>Gunakan link berikut untuk reset password Anda:</p><p><a href=\"%s\">Reset Password</a></p>", link),
			},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal sendgrid payload: %w", err)
	}

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, s.endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build sendgrid request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("sendgrid request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("sendgrid returned non-success status: %d", resp.StatusCode)
	}

	return nil
}

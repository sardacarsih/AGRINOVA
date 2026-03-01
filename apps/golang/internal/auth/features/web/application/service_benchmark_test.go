package web

import (
	"context"
	"testing"
	"time"

	sharedDomain "agrinovagraphql/server/internal/auth/features/shared/domain"
	security "agrinovagraphql/server/internal/auth/features/shared/infrastructure/security"
)

func BenchmarkLoginServiceLogin(b *testing.B) {
	const password = "BenchPassword!123"

	passwordSvc := security.NewPasswordService()
	hashedPassword, err := passwordSvc.HashPassword(password)
	if err != nil {
		b.Fatalf("hash password: %v", err)
	}

	cases := []struct {
		name            string
		passwordService sharedDomain.PasswordService
		storedPassword  string
		reuseSession    bool
	}{
		{
			name:            "NoOpPassword/CreateSession",
			passwordService: &stubPasswordService{},
			storedPassword:  "hashed-password",
		},
		{
			name:            "NoOpPassword/ReuseSession",
			passwordService: &stubPasswordService{},
			storedPassword:  "hashed-password",
			reuseSession:    true,
		},
		{
			name:            "Argon2/CreateSession",
			passwordService: passwordSvc,
			storedPassword:  hashedPassword,
		},
		{
			name:            "Argon2/ReuseSession",
			passwordService: passwordSvc,
			storedPassword:  hashedPassword,
			reuseSession:    true,
		},
	}

	for _, tc := range cases {
		tc := tc
		b.Run(tc.name, func(b *testing.B) {
			userRepo := &stubUserRepo{
				authUser: &sharedDomain.User{
					ID:       "user-1",
					Username: "manager",
					Name:     "Manager",
					Password: tc.storedPassword,
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
			if tc.reuseSession {
				sessionRepo.tryRotateSingleOK = true
				sessionRepo.rotateSession = &sharedDomain.UserSession{
					ID:           "session-1",
					UserID:       "user-1",
					SessionToken: "old-token",
					Platform:     sharedDomain.PlatformWeb,
					IPAddress:    "10.0.0.1",
					UserAgent:    "old-agent",
					ExpiresAt:    time.Now().Add(10 * time.Minute),
					IsActive:     true,
					LoginMethod:  "PASSWORD",
					CreatedAt:    time.Now().Add(-time.Hour),
					UpdatedAt:    time.Now().Add(-time.Hour),
				}
			}

			service := &Service{
				sessionRepo:    sessionRepo,
				userRepo:       userRepo,
				assignmentRepo: &stubAssignmentRepo{},
				cookieService:  &stubCookieService{},
				passwordSvc:    tc.passwordService,
				securityLogger: &stubSecurityLogger{},
				rateLimiter:    &stubRateLimiter{},
				config: WebConfig{
					SessionDuration:    time.Hour,
					RememberMeDuration: 24 * time.Hour,
				},
			}

			input := testWebLoginInput("manager", password)

			b.ReportAllocs()
			b.ResetTimer()

			for i := 0; i < b.N; i++ {
				if _, err := service.Login(context.Background(), input); err != nil {
					b.Fatalf("login: %v", err)
				}
			}
		})
	}
}

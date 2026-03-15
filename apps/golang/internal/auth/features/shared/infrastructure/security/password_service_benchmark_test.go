package security

import "testing"

func benchmarkVerifyPassword(b *testing.B, svc *PasswordService, password string) {
	b.Helper()

	hashed, err := svc.HashPassword(password)
	if err != nil {
		b.Fatalf("hash password: %v", err)
	}

	b.ReportAllocs()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		if err := svc.VerifyPassword(hashed, password); err != nil {
			b.Fatalf("verify password: %v", err)
		}
	}
}

func benchmarkHashPassword(b *testing.B, svc *PasswordService, password string) {
	b.Helper()

	b.ReportAllocs()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		if _, err := svc.HashPassword(password); err != nil {
			b.Fatalf("hash password: %v", err)
		}
	}
}

func BenchmarkPasswordServiceDefault(b *testing.B) {
	svc := NewPasswordService()
	password := "BenchPassword!123"

	b.Run("VerifyPassword", func(b *testing.B) {
		benchmarkVerifyPassword(b, svc, password)
	})

	b.Run("HashPassword", func(b *testing.B) {
		benchmarkHashPassword(b, svc, password)
	})
}

func BenchmarkPasswordServiceComparison(b *testing.B) {
	password := "BenchPassword!123"
	configs := []struct {
		name string
		cfg  PasswordConfig
	}{
		{
			name: "Current64MBx3",
			cfg: PasswordConfig{
				Memory:      64 * 1024,
				Iterations:  3,
				Parallelism: 2,
				SaltLength:  16,
				KeyLength:   32,
			},
		},
		{
			name: "Reduced32MBx2",
			cfg: PasswordConfig{
				Memory:      32 * 1024,
				Iterations:  2,
				Parallelism: 2,
				SaltLength:  16,
				KeyLength:   32,
			},
		},
	}

	for _, tc := range configs {
		tc := tc
		b.Run(tc.name, func(b *testing.B) {
			svc := NewPasswordServiceWithConfig(tc.cfg)

			b.Run("VerifyPassword", func(b *testing.B) {
				benchmarkVerifyPassword(b, svc, password)
			})

			b.Run("HashPassword", func(b *testing.B) {
				benchmarkHashPassword(b, svc, password)
			})
		})
	}
}

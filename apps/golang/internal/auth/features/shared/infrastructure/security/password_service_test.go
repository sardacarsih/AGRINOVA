package security

import (
	"strings"
	"testing"
)

func TestNewPasswordServiceDefaults(t *testing.T) {
	svc := NewPasswordService()

	if svc.memory != 64*1024 {
		t.Fatalf("expected default memory 65536 KB, got %d", svc.memory)
	}
	if svc.iterations != 3 {
		t.Fatalf("expected default iterations 3, got %d", svc.iterations)
	}
	if svc.parallelism != 2 {
		t.Fatalf("expected default parallelism 2, got %d", svc.parallelism)
	}
	if svc.saltLength != 16 {
		t.Fatalf("expected default salt length 16, got %d", svc.saltLength)
	}
	if svc.keyLength != 32 {
		t.Fatalf("expected default key length 32, got %d", svc.keyLength)
	}
}

func TestNewPasswordServiceEnvOverrides(t *testing.T) {
	t.Setenv(argon2MemoryEnv, "32768")
	t.Setenv(argon2IterationsEnv, "2")
	t.Setenv(argon2ParallelismEnv, "3")
	t.Setenv(argon2SaltLengthEnv, "24")
	t.Setenv(argon2KeyLengthEnv, "48")

	svc := NewPasswordService()

	if svc.memory != 32768 {
		t.Fatalf("expected overridden memory 32768 KB, got %d", svc.memory)
	}
	if svc.iterations != 2 {
		t.Fatalf("expected overridden iterations 2, got %d", svc.iterations)
	}
	if svc.parallelism != 3 {
		t.Fatalf("expected overridden parallelism 3, got %d", svc.parallelism)
	}
	if svc.saltLength != 24 {
		t.Fatalf("expected overridden salt length 24, got %d", svc.saltLength)
	}
	if svc.keyLength != 48 {
		t.Fatalf("expected overridden key length 48, got %d", svc.keyLength)
	}

	hash, err := svc.HashPassword("BenchPassword!123")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	if !strings.Contains(hash, "m=32768,t=2,p=3") {
		t.Fatalf("expected hash to include overridden params, got %q", hash)
	}
}

func TestNewPasswordServiceInvalidEnvFallsBack(t *testing.T) {
	t.Setenv(argon2MemoryEnv, "not-a-number")
	t.Setenv(argon2IterationsEnv, "0")
	t.Setenv(argon2ParallelismEnv, "-1")
	t.Setenv(argon2SaltLengthEnv, "")
	t.Setenv(argon2KeyLengthEnv, "4294967296")

	svc := NewPasswordService()

	if svc.memory != 64*1024 {
		t.Fatalf("expected default memory on invalid override, got %d", svc.memory)
	}
	if svc.iterations != 3 {
		t.Fatalf("expected default iterations on invalid override, got %d", svc.iterations)
	}
	if svc.parallelism != 2 {
		t.Fatalf("expected default parallelism on invalid override, got %d", svc.parallelism)
	}
	if svc.saltLength != 16 {
		t.Fatalf("expected default salt length on invalid override, got %d", svc.saltLength)
	}
	if svc.keyLength != 32 {
		t.Fatalf("expected default key length on invalid override, got %d", svc.keyLength)
	}
}

# Agrinova Testing Guide

## Overview

Strategi testing mencakup unit tests, integration tests, dan E2E tests untuk semua platform.

---

## 🧪 Testing Stack

| Platform | Framework | Coverage |
|----------|-----------|----------|
| Backend (Go) | `go test` | Services, Resolvers |
| Mobile (Flutter) | `flutter test` | BLoC, Repository |
| Web (Next.js) | Jest, RTL | Components, Hooks |

---

## 🔧 Backend Testing

### Running Tests

```bash
cd apps/golang

# Run all tests
go test ./... -v

# Run specific package
go test ./internal/auth/services/... -v

# With coverage
go test ./... -cover -coverprofile=coverage.out
go tool cover -html=coverage.out
```

### Test Structure

```go
// internal/auth/services/auth_service_test.go
func TestMobileLogin(t *testing.T) {
    // Setup
    db := setupTestDB()
    service := NewAuthService(db)
    
    // Test valid login
    t.Run("valid credentials", func(t *testing.T) {
        result, err := service.MobileLogin(ctx, input)
        assert.NoError(t, err)
        assert.NotEmpty(t, result.AccessToken)
    })
    
    // Test invalid credentials
    t.Run("invalid credentials", func(t *testing.T) {
        _, err := service.MobileLogin(ctx, invalidInput)
        assert.Error(t, err)
    })
}
```

---

## 📱 Mobile Testing

### Running Tests

```bash
cd apps/mobile

# Run all tests
flutter test

# Run specific test
flutter test test/features/auth/auth_bloc_test.dart

# With coverage
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
```

### BLoC Testing

```dart
// test/features/auth/auth_bloc_test.dart
void main() {
  group('AuthBloc', () {
    late AuthBloc authBloc;
    late MockAuthRepository mockRepo;

    setUp(() {
      mockRepo = MockAuthRepository();
      authBloc = AuthBloc(mockRepo);
    });

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthSuccess] on successful login',
      build: () {
        when(() => mockRepo.login(any())).thenAnswer((_) async => user);
        return authBloc;
      },
      act: (bloc) => bloc.add(AuthLoginRequested(credentials)),
      expect: () => [AuthLoading(), AuthSuccess(user)],
    );
  });
}
```

---

## 🌐 Web Testing

### Running Tests

```bash
cd apps/web

# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Component Testing

```tsx
// features/auth/components/__tests__/LoginForm.test.tsx
describe('LoginForm', () => {
  it('submits credentials on form submit', async () => {
    const mockLogin = jest.fn();
    render(<LoginForm onSubmit={mockLogin} />);
    
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'mandor' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'demo123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ username: 'mandor', password: 'demo123' });
    });
  });
});
```

---

## 🔄 Integration Testing

### GraphQL API Testing

```bash
# Test with curl
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ me { id username role } }"}'

# Test with test scripts
node test-auth.js
node test-harvest-flow.js
```

---

## 📋 Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Mandor | `mandor` | `demo123` |
| Satpam | `satpam` | `demo123` |
| Asisten | `asisten` | `demo123` |
| Manager | `manager` | `demo123` |
| Super Admin | `superadmin` | `demo123` |

---

## ✅ Testing Checklist

- [ ] Unit tests for all services
- [ ] BLoC tests for all features
- [ ] Repository tests with mocks
- [ ] Component tests for UI
- [ ] API integration tests
- [ ] E2E login/logout flow
- [ ] Offline sync testing

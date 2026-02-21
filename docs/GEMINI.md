# Project Overview

Agrinova adalah aplikasi manajemen perkebunan kelapa sawit dengan dukungan multi-tenant dan multi-role. Sistem ini terdiri dari mobile app (Flutter), web dashboard (Next.js), dan backend API (Go GraphQL).

## Main Technologies

### Mobile (Flutter)
- **Framework:** Flutter (>=3.10.0), Dart (>=3.0.0 <4.0.0)
- **State Management:** BLoC (flutter_bloc: ^9.1.1)
- **Navigation:** go_router: ^16.2.0
- **DI:** get_it: ^8.2.0
- **Local DB:** sqflite: ^2.3.0, hive: ^2.2.3
- **GraphQL:** graphql_flutter: ^5.1.2
- **Auth:** flutter_secure_storage, local_auth, dart_jsonwebtoken

### Backend (Go)
- **Framework:** Go with gqlgen
- **Database:** PostgreSQL with GORM
- **Auth:** JWT with httpOnly cookies

### Web (Next.js)
- **Framework:** Next.js 16.x
- **GraphQL:** Apollo Client

## Project Structure

```
agrinova/
├── apps/
│   ├── golang/           # Go Backend (GraphQL API)
│   │   ├── cmd/          # Entry points (server, seed, etc)
│   │   ├── internal/     # Internal packages
│   │   │   ├── graphql/  # GraphQL resolvers & schemas
│   │   │   ├── models/   # GORM models
│   │   │   └── services/ # Business logic
│   │   └── pkg/          # Shared packages
│   ├── mobile/           # Flutter Mobile App
│   │   └── lib/
│   │       ├── core/     # DI, routes, services, theme
│   │       ├── features/ # Feature modules
│   │       │   ├── auth/
│   │       │   ├── dashboard/
│   │       │   ├── gate_check/
│   │       │   ├── harvest/
│   │       │   ├── monitoring/
│   │       │   ├── profile/
│   │       │   └── settings/
│   │       └── shared/   # Shared widgets
│   └── web/              # Next.js Web Dashboard
├── docs/                 # Documentation (*.md files)
└── GEMINI.md            # AI Memory (this file)
```

## Role-Based System

| Role | Platform | Offline-First | Key Features |
|------|----------|---------------|--------------|
| MANDOR | Mobile | ✅ | Input Panen, Riwayat, Sync |
| ASISTEN | Mobile | ❌ | Approval, Monitoring |
| MANAGER | Mobile | ❌ | Monitor, Analytics |
| SATPAM | Mobile | ✅ | Gate Check, QR Scan, Sync |
| TIMBANGAN | Mobile/Web | ❌ | Weighing, PKS |
| GRADING | Mobile/Web | ❌ | TBS Quality |
| AREA_MANAGER | Web | ❌ | Multi-Company Analytics |
| COMPANY_ADMIN | Web | ❌ | User Management |
| SUPER_ADMIN | Web | ❌ | Multi-Tenant Management |

## GraphQL Schema Files

Located in `apps/golang/internal/graphql/schema/`:

### Core Schemas
- `auth.graphqls` - Authentication, JWT, User profiles
- `master.graphqls` - Company, Estate, Division, Block
- `panen.graphqls` - HarvestRecord, Approval
- `gatecheck.graphqls` - GateCheck, GuestLog, QRToken
- `rbac.graphqls` - Roles, Permissions
- `notifications.graphql` - Push notifications

### Role-Specific Schemas
| File | Role | Size |
|------|------|------|
| `manager.graphqls` | MANAGER | 12.8 KB |
| `asisten.graphqls` | ASISTEN | 14.8 KB |
| `mandor.graphqls` | MANDOR | 14.8 KB |
| `satpam.graphqls` | SATPAM | 17.4 KB |
| `timbangan.graphqls` | TIMBANGAN | 9.9 KB |
| `grading_role.graphqls` | GRADING | 10.4 KB |
| `area_manager.graphqls` | AREA_MANAGER | 10.2 KB |
| `company_admin.graphqls` | COMPANY_ADMIN | 13.5 KB |
| `super_admin.graphqls` | SUPER_ADMIN | 17.6 KB |

## Offline-First (Mandor & Satpam Only)

```
User Input → Local SQLite → sync_queue → Background Sync → GraphQL API → PostgreSQL
```

### Key Sync Tables
- `sync_queue` - Pending operations
- `sync_conflicts` - Conflict resolution
- `sync_logs` - Audit trail

## Authentication

### Web Login (Cookie-based)

```
User → LoginForm → Apollo Client → GraphQL webLogin → WebAuthService → Set HttpOnly Cookies → Dashboard
```

**GraphQL Mutation:**
```graphql
mutation WebLogin($input: WebLoginInput!) {
  webLogin(input: $input) {
    success
    user { id, username, role }
    sessionId
  }
}
```

**Cookie Settings:**
| Cookie | Duration | Attributes |
|--------|----------|------------|
| `auth-session` | 24 hours | HttpOnly, Secure, SameSite=Lax |
| `csrf-token` | 24 hours | SameSite=Strict |

**Key Files:**
- `apps/web/features/auth/components/LoginForm.tsx`
- `apps/web/features/auth/components/AuthProvider.tsx`
- `apps/golang/internal/auth/services/web_auth_service.go`

### Mobile Login (JWT-based)

```
User → LoginPage → AuthBloc → AuthRepository → GraphQL mobileLogin → JWT Tokens → SecureStorage → Dashboard
```

**GraphQL Mutation:**
```graphql
mutation MobileLogin($input: MobileLoginInput!) {
  mobileLogin(input: $input) {
    accessToken
    refreshToken
    offlineToken
    user { id, username, role }
  }
}
```

**Token Configuration:**
| Token | Duration | Purpose |
|-------|----------|---------|
| `accessToken` | 15 minutes | API requests (Bearer header) |
| `refreshToken` | 7 days | Token renewal |
| `offlineToken` | 30 days | Offline authentication |

**Key Files:**
- `apps/mobile/lib/features/auth/presentation/pages/login_page.dart`
- `apps/mobile/lib/features/auth/presentation/blocs/auth_bloc.dart`
- `apps/mobile/lib/features/auth/data/repositories/auth_repository.dart`

### Offline Authentication (Mandor & Satpam Only)

```
User → Check Network → No Connection → Verify Stored Credentials → Validate Offline Token → Dashboard (Limited)
```

**Requirements:**
- Valid offlineToken (not expired, < 30 days)
- Cached credentials in SQLite
- Cached user data and assignments

### Web Logout

```
User → AuthProvider.logout() → GraphQL logout → RevokeSession → Clear Cookies → Redirect /login
```

### Mobile Logout

```
User → AuthBloc.LogoutRequested → AuthRepository.logout() → GraphQL logout → Clear SecureStorage → Navigate Login
```

**Cleared Data:**
- All JWT tokens (access, refresh, offline)
- Cached user credentials
- Local user cache

## Building & Running

### Mobile
```bash
cd apps/mobile
flutter pub get
flutter run
```

### Backend
```bash
cd apps/golang
go run ./cmd/server/main.go
```

### Web
```bash
cd apps/web
npm install
npm run dev
```

## Code Generation

```bash
# Mobile (Flutter)
flutter pub run build_runner build --delete-conflicting-outputs

# Backend (Go)
cd apps/golang && go generate ./...
```

## Important Conventions

1. **State Management:** BLoC pattern untuk semua features
2. **DI:** Register di `lib/core/di/dependency_injection.dart`
3. **Routes:** Define di `lib/core/routes/app_routes.dart`
4. **Theme:** Setiap role punya theme sendiri (e.g., `manager_theme.dart`)
5. **Atomic Design:** Dashboard components menggunakan atoms/molecules/organisms
6. **Offline:** Hanya Mandor & Satpam yang support offline-first

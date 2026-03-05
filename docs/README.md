# Agrinova - Palm Oil Harvest Management System

Sistem digital panen & gate check kebun sawit dengan dukungan **offline-first**.

Dokumentasi platform dan modul lengkap tersedia di [AgrInova.md](./AgrInova.md).
Ringkasan eksekutif untuk manajemen tersedia di [AgrInova_for_Managemnt.md](./AgrInova_for_Managemnt.md).

## 🔑 Demo Login Credentials
**Login URL**: [http://localhost:3000/login](http://localhost:3000/login)

### Quick Test Accounts
- **Super Admin**: `super-admin@agrinova.com` / `admin123`
- **Company Admin**: `company-admin@agrinova.com` / `admin123` 
- **Manager**: `manager-agrinova@agrinova.com` / `admin123`
- **Legacy Quick**: `admin` / `admin123`, `manager` / `admin123`

📋 **Full credentials**: See [LOGIN_DEMO.md](./LOGIN_DEMO.md) | [DEMO_CREDENTIALS.md](./DEMO_CREDENTIALS.md)

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [API Documentation](#api-documentation)
- [AgrInova Platform Modules](./AgrInova.md)
- [AgrInova Management Report](./AgrInova_for_Managemnt.md)
- [Mobile App](#mobile-app)
- [Web Dashboard](#web-dashboard)
- [Infrastructure](#infrastructure)
- [Contributing](#contributing)
- [License](#license)

## 🌴 Overview

Agrinova is a comprehensive palm oil harvest management system designed for modern plantations. It provides:

- **Offline-first mobile applications** for field workers (Mandor, Asisten, Satpam)
- **Real-time web dashboard** for managers and administrators
- **Automated data synchronization** between offline devices and central server
- **Complete workflow management** from harvest to gate check
- **PKS integration** for final weighing and quality metrics

### Key Features

- 📱 **Multi-role mobile apps** with offline capability
- 🌐 **Real-time web dashboard** with live updates
- 🔄 **Automatic data synchronization**
- 📊 **Comprehensive reporting and analytics**
- 🚛 **Gate check and truck monitoring**
- 🔐 **Advanced authentication and security**
- 📈 **PKS integration for final metrics**

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile Apps   │    │  Web Dashboard  │    │  API Server     │
│   (Flutter)     │◄───┤   (Next.js)     │◄───┤   (Go GraphQL)      │
│   Offline-First │    │   Real-time     │    │   WebSocket     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                       │
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    SQLite       │    │     Browser     │    │   PostgreSQL    │
│   Local DB      │    │     Storage     │    │   RLS + GORM   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Domain Structure (DDD)

```
domains/
├── panen/          # Harvest management
├── gatecheck/      # Truck gate operations
├── approval/       # Workflow approvals
├── reporting/      # Analytics and reports
└── auth/          # Authentication & authorization

core/
├── services/       # Shared business services
├── utils/         # Common utilities
└── dto/           # Data transfer objects
```

## 🛠️ Tech Stack

### Backend (API Server)
- **Go** - Gin HTTP server
- **GraphQL (gqlgen)** - Schema-first GraphQL API
- **PostgreSQL** - Primary database with GORM
- **JWT + Cookies** - Authentication
- **WebSocket** - Real-time subscriptions

### Frontend (Web Dashboard)
- **Next.js 16** - React framework (App Router)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI + shadcn/ui** - Component primitives
- **Apollo Client** - GraphQL data layer
- **Zustand** - State management

### Mobile (Flutter Apps)
- **Flutter** - Cross-platform framework
- **Dart** - Programming language
- **SQLite** - Local database
- **flutter_bloc** - State management
- **graphql_flutter** - GraphQL client

### Infrastructure
- **PostgreSQL** - Primary database
- **Firebase** - Push notifications

## ⚡ Prerequisites

Before starting, ensure you have the following installed:

### Required Software

1. **Node.js** (v18.0.0 or higher)
   ```bash
   # Check version
   node --version
   npm --version
   ```

2. **Go** (v1.24.0 or higher)
   ```bash
   # Check version
   go version
   ```

3. **PostgreSQL** (v14.0 or higher)
   ```bash
   # Install PostgreSQL
   # Windows: Download from https://www.postgresql.org/download/windows/
   # macOS: brew install postgresql
   # Linux: sudo apt-get install postgresql postgresql-contrib
   
   # Check version
   psql --version
   ```

4. **Flutter** (for mobile development)
   ```bash
   # Install Flutter SDK
   # Follow: https://docs.flutter.dev/get-started/install
   
   # Check version
   flutter --version
   flutter doctor
   ```

5. **Git** (for version control)
   ```bash
   # Check version
   git --version
   ```

### Development Tools (Recommended)

- **VS Code** with extensions:
  - Flutter/Dart
  - TypeScript
  - Go
  - PostgreSQL

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/agrinova/agrinova.git
cd agrinova
```

### 2. Environment Setup

Copy environment files:

```bash
# Go GraphQL API
cp apps/golang/.env.example apps/golang/.env

# Web Dashboard
cp apps/web/.env.example apps/web/.env.local

# Root environment (optional)
cp .env.example .env
```

Edit the environment files with your configuration:

```bash
# apps/golang/.env
AGRINOVA_SERVER_PORT=8080
AGRINOVA_DATABASE_HOST=localhost
AGRINOVA_DATABASE_PORT=5432
AGRINOVA_DATABASE_USER=agrinova
AGRINOVA_DATABASE_PASSWORD=your_password
AGRINOVA_DATABASE_NAME=agrinova_go
JWT_ACCESS_SECRET="your-access-secret-32+chars"
JWT_REFRESH_SECRET="your-refresh-secret-32+chars"
JWT_OFFLINE_SECRET="your-offline-secret-32+chars"

# apps/web/.env.local
NEXT_PUBLIC_GRAPHQL_URL="/api/graphql"
NEXT_PUBLIC_WS_URL="ws://localhost:3000/api/graphql"
BACKEND_GRAPHQL_URL="http://localhost:8080/graphql"
NEXTAUTH_SECRET="your-nextauth-secret-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Start Infrastructure Services

```bash
# Start PostgreSQL service
# Windows: Start PostgreSQL service from Services
# macOS/Linux: 
sudo service postgresql start
# or
brew services start postgresql

# Create database
psql -U postgres -c "CREATE DATABASE agrinova_dev;"
psql -U postgres -c "CREATE USER agrinova WITH ENCRYPTED PASSWORD 'password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE agrinova_dev TO agrinova;"
```

### 4. Install Dependencies

```bash
# Install root tooling (optional, for scripts)
npm install

# Go dependencies
cd apps/golang && go mod download && cd ../..

# Web dependencies
cd apps/web && npm install --legacy-peer-deps && cd ../..

# Flutter dependencies
cd apps/mobile && flutter pub get && cd ../..
```

### 5. Database Setup

```bash
# The Go server can auto-migrate in development when DEV_AUTO_MIGRATE=true
# (see apps/golang/.env)

# Seed initial data (optional)
cd apps/golang
go run ./cmd/seed/main.go

cd ../..
```

### 6. Start Development Servers

```bash
# Start API server
npm run dev:api

# Start web dashboard
npm run dev:web

# Run mobile app (requires a device or emulator)
npm run dev:mobile
```

### 7. Access Applications

- **Web Dashboard**: http://localhost:3000
- **GraphQL API**: http://localhost:8080/graphql
- **PostgreSQL**: Direct connection via psql or GUI tools like pgAdmin

## 🔧 Development Setup

### API Server Development

```bash
cd apps/golang

# Start development server
go run ./cmd/server/main.go

# Regenerate GraphQL code after schema changes
go generate ./...

# Run tests
go test ./...
```

### Web Dashboard Development

```bash
cd apps/web

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Type checking
npm run type-check
```

### Mobile App Development

```bash
cd apps/mobile

# Get Flutter dependencies
flutter pub get

# Generate code
flutter packages pub run build_runner build

# Run on Android
flutter run -d android

# Run on iOS
flutter run -d ios

# Build APK
flutter build apk

# Run tests
flutter test
```

### Core Packages Development

```bash
# DTOs package
cd core/dto
npm install
npm run build
npm run test

# UI Components package
cd packages/ui
npm install
npm run build
npm run test
npm run storybook
```

## 🚢 Production Deployment

### Native Production Setup

1. **Prepare Production Environment**

```bash
# Copy production environment files
cp .env.example .env.prod
cp apps/golang/.env.example apps/golang/.env.prod
cp apps/web/.env.example apps/web/.env.prod

# Edit with production values
# Update database URLs and JWT secrets, etc.
```

2. **Setup Production Database**

```bash
# Create production database
psql -U postgres -c "CREATE DATABASE agrinova_prod;"
psql -U postgres -c "CREATE USER agrinova_prod WITH ENCRYPTED PASSWORD 'secure_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE agrinova_prod TO agrinova_prod;"

# Configure PostgreSQL for production
# Edit postgresql.conf and pg_hba.conf
# Setup connection pooling, backup strategies, etc.
```

3. **Build and Deploy API Server**

```bash
cd apps/golang

# Build API server
go build -o agrinova-server ./cmd/server

# Start production server
GO_ENV=production AGRINOVA_SERVER_PORT=8080 ./agrinova-server
```

4. **Build and Deploy Web Dashboard**

```bash
cd apps/web

# Install production dependencies
npm ci --only=production

# Build application
npm run build

# Start production server
PORT=3000 NODE_ENV=production npm start
```

5. **Process Management**

Use a process manager suitable for each service:
- API (Go): systemd, supervisor, or your preferred service manager
- Web (Next.js): PM2 or a container runtime

### Database Management

```bash
# Backup database
pg_dump -U agrinova_prod -h localhost agrinova_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
psql -U agrinova_prod -h localhost -d agrinova_prod < backup.sql
```

## 📚 API Documentation

### GraphQL Endpoint

Access the GraphQL API at:
- Development: http://localhost:8080/graphql
- Production: https://api.your-domain.com/graphql

### Schema

The GraphQL schema lives in `apps/golang/internal/graphql/schema/*.graphqls`.

### Playground

If `AGRINOVA_GRAPHQL_PLAYGROUND_ENABLED=true`, open the GraphQL endpoint in a browser to explore queries and mutations.

## 📱 Mobile App

### Building for Android

```bash
cd apps/mobile

# Debug APK
flutter build apk --debug

# Release APK
flutter build apk --release

# App Bundle (for Play Store)
flutter build appbundle --release
```

### Building for iOS

```bash
cd apps/mobile

# Debug build
flutter build ios --debug

# Release build
flutter build ios --release

# Create IPA
flutter build ipa --release
```

### Key Features

#### Offline-First Architecture
- Local SQLite database
- Automatic sync when online
- Conflict resolution
- Background sync

#### Role-Based Features

**Mandor (Foreman)**
- Input harvest data
- Manage workers
- Record TBS data
- View approval status

**Asisten (Assistant)**
- Approve/reject harvests
- Monitor mandor activities
- Generate reports
- Manage notifications

**Satpam (Security)**
- Gate check operations
- Truck monitoring
- QR code scanning
- Offline logging

**Manager**
- View reports and analytics
- Monitor operations
- User management
- System configuration

## 🌐 Web Dashboard

### Key Features

#### Real-time Dashboard
- Live data updates via WebSocket
- Real-time notifications
- Interactive charts and graphs
- Status monitoring

#### Approval Workflow
- Pending harvest approvals
- Batch approval operations
- Approval history
- Comments and notes

#### Reporting & Analytics
- Harvest performance metrics
- Worker productivity
- Estate comparisons
- Trend analysis

#### User Management
- Role-based access control
- User creation and management
- Permission settings
- Audit logs

### Custom Development

```bash
cd apps/web

# Add new components
mkdir src/components/your-component
touch src/components/your-component/index.tsx

# Add new pages
mkdir src/app/your-page
touch src/app/your-page/page.tsx

# Add new API routes
mkdir src/app/api/your-endpoint
touch src/app/api/your-endpoint/route.ts
```

## 🔧 Infrastructure

### Database Schema

The system uses PostgreSQL with GORM. Key tables:

- **companies** - Multi-tenant company data
- **estates** - Plantation estates
- **divisis** - Estate divisions
- **blocks** - Harvest blocks
- **users** - System users
- **panen** - Harvest records
- **tbs** - TBS (fruit bunch) records
- **gate_checks** - Gate monitoring

### Sync Architecture

#### Offline-First Strategy
1. Data created locally in SQLite
2. Queued for sync when online
3. Conflict detection and resolution
4. Automatic retry on failure

#### Conflict Resolution
- Last-write-wins for simple conflicts
- Manual resolution for complex conflicts
- Version-based conflict detection
- Audit trail for all changes

### Security

#### Authentication
- JWT tokens with refresh
- Biometric authentication (mobile)
- Device authorization
- Session management

#### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- Multi-tenant isolation
- API rate limiting

## 🧪 Testing

### API Testing

```bash
cd apps/golang

# Unit and integration tests
go test ./...

# Test coverage
go test -cover ./...
```

### Web Testing

```bash
cd apps/web

# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Mobile Testing

```bash
cd apps/mobile

# Unit tests
flutter test

# Integration tests
flutter test integration_test/

# Widget tests
flutter test test/widget_test.dart
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check PostgreSQL status
sudo service postgresql status
# or
brew services list | grep postgresql

# Check connection
psql -U agrinova -d agrinova_dev -c "SELECT 1;"
```

#### Mobile Build Issues
```bash
# Clean Flutter cache
flutter clean
flutter pub get

# Reset Flutter
flutter doctor
flutter upgrade
```

#### Sync Issues
```bash
# Check API server logs (stdout or your process manager)
# Example (systemd):
# journalctl -u agrinova-api -f

# Reset sync state
# In mobile app: Settings > Advanced > Reset Sync
```

### Performance Optimization

#### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_panen_harvest_date_status ON panen (harvest_date, status);
CREATE INDEX CONCURRENTLY idx_tbs_collection_time ON tbs (collection_time);
```

#### API Optimization
```bash
# Monitor API performance via logs and profiling tools
# If metrics are enabled, expose a /metrics endpoint
# Use tools like htop, iotop for system monitoring
```

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Write tests**
5. **Run quality checks**
   ```bash
   npm run lint
   npm run test
   npm run type-check
   ```
6. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```
7. **Push and create PR**

### Source-of-Truth Local Workflow

Gunakan pola ini saat branch lokal ditetapkan sebagai baseline kerja:

1. **Jangan pull/merge ke worktree yang kotor**
   - Simpan perubahan ke branch lokal atau stash dulu.
2. **Selalu kerja di feature branch atau worktree terpisah**
   - Hindari commit langsung di `develop`.
3. **Publish snapshot branch saat perlu baseline remote**
   - Contoh: `snapshot/local-source-truth-YYYYMMDD-HHMMSS`.

### Code Style

- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Conventional Commits** for commit messages

### Architecture Guidelines

- Follow **Domain-Driven Design (DDD)** principles
- Use **SOLID** principles
- Implement **Clean Architecture**
- Write **comprehensive tests**
- Document **public APIs**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:

- **Documentation**: [Wiki](https://github.com/agrinova/agrinova/wiki)
- **Issues**: [GitHub Issues](https://github.com/agrinova/agrinova/issues)
- **Discussions**: [GitHub Discussions](https://github.com/agrinova/agrinova/discussions)
- **Email**: support@agrinova.com

---

**Made with ❤️ by the Agrinova Team**
# AGRINOVA

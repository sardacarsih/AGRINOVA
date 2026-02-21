# Agrinova - Palm Oil Harvest Management System

## Project Overview

Agrinova is a comprehensive palm oil harvest management system designed for modern plantations. It provides:

- **Offline-first mobile applications** for field workers (Mandor, Asisten, Satpam)
- **Real-time web dashboard** for managers and administrators
- **Automatic data synchronization** between offline devices and central server
- **Complete workflow management** from harvest to gate check
- **PKS integration** for final weighing and quality metrics

### Key Features

- 📱 **Multi-role mobile apps** with offline capability
- 🌐 **Real-time web dashboard** with live updates
- 🔐 **Advanced authentication and security**
- 🔄 **Automatic data synchronization**
- 📊 **Comprehensive reporting and analytics**
- 🚛 **Gate check and truck monitoring**
- 📈 **PKS integration for final metrics**

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile Apps   │    │  Web Dashboard  │    │  API Server     │
│   (Flutter)     │◄───┤   (Next.js)     │◄───┤   (NestJS)      │
│   Offline-First │    │   Real-time     │    │   WebSocket     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                       │
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    SQLite       │    │     Browser     │    │   PostgreSQL    │
│   Local DB      │    │     Storage     │    │   Redis Cache   │
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

## Tech Stack

### Backend (API Server)
- **NestJS** - Node.js framework
- **PostgreSQL** - Primary database
- **Redis** - Caching and pub/sub
- **Prisma** - Database ORM
- **JWT** - Authentication
- **WebSocket** - Real-time communication

### Frontend (Web Dashboard)
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn/UI** - Component library
- **React Query** - Data fetching
- **Zustand** - State management

### Mobile (Flutter Apps)
- **Flutter** - Cross-platform framework
- **Dart** - Programming language
- **SQLite** - Local database
- **Bloc/Cubit** - State management
- **Dio** - HTTP client
- **Hive** - Local storage

### Infrastructure
- **PostgreSQL** - Primary database
- **Redis** - Caching and messaging
- **Firebase** - Push notifications

## Project Structure

```
agrinova/
├── apps/
│   ├── api/          # NestJS API server
│   ├── web/          # Next.js web dashboard
│   └── mobile/       # Flutter mobile app
├── core/
│   ├── dto/          # Shared DTOs
│   ├── services/     # Shared business services
│   └── utils/        # Common utilities
├── packages/
│   ├── ui/           # Shared UI components
│   └── shared/       # Shared libraries
├── infra/
│   ├── prisma/       # Database schema and migrations
│   ├── redis/        # Redis configuration
│   └── firebase/     # Firebase configuration
├── libs/
│   └── shared/       # Shared libraries
```

## Building and Running

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14.0
- Redis >= 6.0
- Flutter (for mobile development)

### Environment Setup
1. Copy environment files:
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

2. Edit environment files with your configuration.

### Install Dependencies
```bash
# Install root dependencies
npm install

# Install all app dependencies
npm run install:all
```

### Database Setup
```bash
# Generate Prisma client
npm run db:push

# Seed initial data
npm run db:seed
```

### Start Development Servers
```bash
# Start all services
npm run dev

# Or start individually:
# API Server
npm run dev:api

# Web Dashboard
npm run dev:web

# Mobile App
npm run dev:mobile
```

### Production Deployment
```bash
# Build API
npm run build:api

# Build Web
npm run build:web

# Start in production
npm run start:api
npm run start:web
```

## Development Conventions

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

### Testing
```bash
# API Testing
cd apps/api
npm run test
npm run test:e2e

# Web Testing
cd apps/web
npm run test

# Mobile Testing
cd apps/mobile
flutter test
```

## Key Features Implementation

### Multi-Tenant System
The system supports multiple companies with strict data isolation:
- **Super Admin**: Cross-company system management
- **Company Admin**: Company-specific master data management
- **Regular Users**: Company-scoped operational roles

### Offline-First Architecture
1. Data created locally in SQLite
2. Queued for sync when online
3. Conflict detection and resolution
4. Automatic retry on failure

### Authentication & Authorization
- JWT tokens with refresh
- Role-based access control (RBAC)
- Biometric authentication (mobile)
- Device authorization
- Session management

### Data Synchronization
- **Incremental Sync**: Only changed data since last sync
- **Conflict Resolution**: Last-write-wins with manual resolution
- **Offline Tracking**: All changes tracked with timestamps
- **Batch Upload**: Efficient bulk data transfer

## Access Points

### Web Dashboard
- **URL**: http://localhost:3000
- **Login**: http://localhost:3000/login

### API Server
- **Base URL**: http://localhost:3001
- **API Prefix**: /api/v1
- **Documentation**: http://localhost:3001/api/v1/docs

### Mobile App
- **Platforms**: Android and iOS
- **Offline Support**: Full offline functionality
- **Sync**: Automatic when online

## Demo Credentials

### Super Admin (All Companies)
```
super-admin@agrinova.com
demo123
```

### Company Admin PT Agrinova (17 users)
```
company-admin@agrinova.com
demo123
```

### Manager Single Estate (Sawit Jaya only)
```
manager-agrinova@agrinova.com
demo123
```

Full credentials available in LOGIN_DEMO.md and DEMO_CREDENTIALS.md

## Troubleshooting

### Common Issues
1. **Port Already in Use**: Check if services are already running
2. **Database Connection**: Verify PostgreSQL is running and credentials are correct
3. **Redis Connection**: Ensure Redis is running (optional, will fallback to offline mode)
4. **Node.js Issues**: Clear npm cache and reinstall dependencies
5. **Flutter Issues**: Run `flutter clean` and `flutter pub get`

### Performance Optimization
- Add indexes for better database performance
- Monitor Redis memory usage
- Check API performance metrics

## Support
For support and questions:
- **Documentation**: [Wiki](https://github.com/agrinova/agrinova/wiki)
- **Issues**: [GitHub Issues](https://github.com/agrinova/agrinova/issues)
- **Email**: support@agrinova.com
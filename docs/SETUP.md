# Agrinova Setup Guide

Panduan lengkap untuk mengatur dan menjalankan sistem Agrinova dari nol hingga production-ready.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Development Environment](#development-environment)
4. [Database Setup](#database-setup)
5. [API Server Setup](#api-server-setup)
6. [Web Dashboard Setup](#web-dashboard-setup)
7. [Mobile App Setup](#mobile-app-setup)
8. [Infrastructure Services](#infrastructure-services)
9. [Production Deployment](#production-deployment)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)

## 1. Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB free space
- **OS**: Windows 10/11, macOS 10.15+, or Ubuntu 20.04+

#### Recommended Requirements
- **CPU**: 8 cores
- **RAM**: 16GB
- **Storage**: 100GB SSD
- **OS**: Latest stable versions

### Required Software Installation

#### 1.1 Node.js & npm

**Windows:**
```bash
# Download from https://nodejs.org/
# Choose LTS version (v18.x or higher)

# Verify installation
node --version  # Should be v18.0.0 or higher
npm --version   # Should be 9.0.0 or higher
```

**macOS:**
```bash
# Using Homebrew
brew install node@18

# Or download from https://nodejs.org/

# Verify installation
node --version
npm --version
```

**Linux (Ubuntu/Debian):**
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### 1.2 PostgreSQL

**Windows:**
```bash
# Download from https://www.postgresql.org/download/windows/
# Install PostgreSQL 14 or higher with default settings

# Verify installation
psql --version
```

**macOS:**
```bash
# Using Homebrew
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Verify installation
psql --version
```

**Linux (Ubuntu/Debian):**
```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

#### 1.3 Redis

**Windows:**
```bash
# Download from https://github.com/microsoftarchive/redis/releases
# Install Redis for Windows

# Or using Windows Subsystem for Linux (WSL)
# Install Redis through WSL Ubuntu

# Verify installation
redis-server --version
```

**macOS:**
```bash
# Using Homebrew
brew install redis

# Start Redis service
brew services start redis

# Verify installation
redis-server --version
```

**Linux (Ubuntu/Debian):**
```bash
# Install Redis
sudo apt-get update
sudo apt-get install redis-server

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify installation
redis-server --version
```

#### 1.4 Flutter (for Mobile Development)

**Windows:**
```bash
# Download Flutter SDK from https://docs.flutter.dev/get-started/install/windows

# Extract to C:\development\flutter
# Add C:\development\flutter\bin to PATH

# Verify installation
flutter --version
flutter doctor
```

**macOS:**
```bash
# Download Flutter SDK
cd ~/development
curl -O https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_3.13.0-stable.zip
unzip flutter_macos_3.13.0-stable.zip

# Add to PATH in ~/.zshrc or ~/.bash_profile
export PATH="$PATH:`pwd`/flutter/bin"

# Reload shell
source ~/.zshrc

# Verify installation
flutter --version
flutter doctor
```

**Linux (Ubuntu/Debian):**
```bash
# Download Flutter SDK
cd ~/development
wget https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.13.0-stable.tar.xz
tar xf flutter_linux_3.13.0-stable.tar.xz

# Add to PATH in ~/.bashrc
export PATH="$PATH:`pwd`/flutter/bin"

# Reload shell
source ~/.bashrc

# Install dependencies
sudo apt-get install curl git unzip xz-utils zip libglu1-mesa

# Verify installation
flutter --version
flutter doctor
```

#### 1.5 Git

**Windows:**
```bash
# Download from https://git-scm.com/download/win
# Install with default settings

# Verify installation
git --version
```

**macOS:**
```bash
# Usually pre-installed, or install via Xcode Command Line Tools
xcode-select --install

# Or using Homebrew
brew install git

# Verify installation
git --version
```

**Linux:**
```bash
# Install Git
sudo apt-get install git

# Verify installation
git --version
```

## 2. Environment Setup

### 2.1 Clone Repository

```bash
# Clone the repository
git clone https://github.com/agrinova/agrinova.git
cd agrinova

# Check project structure
ls -la
```

### 2.2 Environment Variables

#### Root Environment (.env)
```bash
# Copy example file
cp .env.example .env

# Edit with your values
nano .env
```

```bash
# .env
POSTGRES_DB=agrinova_dev
POSTGRES_USER=agrinova
POSTGRES_PASSWORD=your_secure_password_here
REDIS_PASSWORD=your_redis_password_here
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
NEXTAUTH_SECRET=your_nextauth_secret_min_32_chars
```

#### API Environment
```bash
# Copy API environment
cp apps/api/.env.example apps/api/.env

# Edit API environment
nano apps/api/.env
```

```bash
# apps/api/.env
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1

# Database
DATABASE_URL="postgresql://agrinova:your_secure_password_here@localhost:5432/agrinova_dev?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here
REDIS_DB=0

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
JWT_REFRESH_EXPIRATION=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DEST=./uploads

# Email (Development - configure SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@agrinova.com

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCK_TIME=900000
SESSION_TIMEOUT=900000

# Development
SWAGGER_ENABLED=true
DEV_TOOLS_ENABLED=true
LOG_LEVEL=debug
```

#### Web Environment
```bash
# Copy Web environment
cp apps/web/.env.example apps/web/.env

# Edit Web environment
nano apps/web/.env
```

```bash
# apps/web/.env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_min_32_chars
```

### 2.3 Install Dependencies

```bash
# Install root dependencies
npm install

# Install workspace dependencies
npm run install:all
```

Or install individually:

```bash
# API dependencies
cd apps/api
npm install
cd ../..

# Web dependencies
cd apps/web
npm install
cd ../..

# Core DTOs
cd core/dto
npm install
cd ../..

# UI Components
cd packages/ui
npm install
cd ../..
```

## 3. Development Environment

### 3.1 Start Infrastructure Services

#### PostgreSQL Setup
```bash
# Create database and user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE agrinova_dev;
CREATE USER agrinova WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE agrinova_dev TO agrinova;
\q
```

#### Redis Setup
```bash
# Start Redis server
redis-server

# Or if installed as service:
# Windows: Start Redis service from Services
# macOS: brew services start redis
# Linux: sudo systemctl start redis-server
```

### 3.2 Verify Infrastructure

#### PostgreSQL
```bash
# Test connection
psql -U agrinova -d agrinova_dev -h localhost -c "SELECT version();"

# Expected output: PostgreSQL version information
```

#### Redis
```bash
# Test connection
redis-cli ping

# Expected output: PONG
```

## 4. Database Setup

### 4.1 Prisma Setup

```bash
cd apps/api

# Generate Prisma client
npm run prisma:generate

# Check database connection
npm run prisma:studio
# Access Prisma Studio: http://localhost:5555
```

### 4.2 Run Migrations

```bash
# Apply existing migrations
npm run prisma:migrate

# Or reset database (development only)
npm run db:reset
```

### 4.3 Seed Database

```bash
# Run database seeding
npm run db:seed

# Verify data
npm run prisma:studio
```

### 4.4 Verify Database Schema

```bash
# Connect to database
psql -U agrinova -d agrinova_dev -h localhost

# List tables
\dt

# Check specific table
\d users
\d panen

# Exit
\q
```

## 5. API Server Setup

### 5.1 Start API Development Server

```bash
cd apps/api

# Start in development mode
npm run start:dev

# API will be available at: http://localhost:3001
# Swagger docs: http://localhost:3001/api/v1/docs
```

### 5.2 Test API Endpoints

```bash
# Health check
curl http://localhost:3001/health

# API info
curl http://localhost:3001/api/v1

# Create test user (adjust as needed)
# Note: The registration endpoint has been removed for security reasons.
# Users should be created through the admin panel or database seeding.
```

### 5.3 API Development Tools

#### Swagger Documentation
- Access: http://localhost:3001/api/v1/docs
- Interactive API testing
- Endpoint documentation

#### Database Monitoring
- Prisma Studio: http://localhost:5555
- Direct PostgreSQL connection via psql or GUI tools

#### Redis Monitoring
- Redis CLI: `redis-cli monitor`
- GUI tools: Redis Desktop Manager, RedisInsight

## 6. Web Dashboard Setup

### 6.1 Start Web Development Server

```bash
cd apps/web

# Start development server
npm run dev

# Web dashboard: http://localhost:3000
```

### 6.2 Build for Production

```bash
cd apps/web

# Type check
npm run type-check

# Build
npm run build

# Start production server
npm run start
```

### 6.3 Web Dashboard Features

#### Authentication
- Login: http://localhost:3000/auth/login
- Registration: http://localhost:3000/auth/register

#### Dashboard
- Main dashboard: http://localhost:3000/dashboard
- Real-time updates via WebSocket

#### Role-based Access
- Admin panel: http://localhost:3000/admin
- Reports: http://localhost:3000/reports
- User management: http://localhost:3000/users

## 7. Mobile App Setup

### 7.1 Flutter Dependencies

```bash
cd apps/mobile

# Get Flutter packages
flutter pub get

# Generate code
flutter packages pub run build_runner build

# Check for issues
flutter doctor
```

### 7.2 Android Setup

#### Prerequisites
```bash
# Install Android Studio
# Download from: https://developer.android.com/studio

# Accept licenses
flutter doctor --android-licenses

# Create virtual device
# Open Android Studio > AVD Manager > Create Virtual Device
```

#### Android Build Toolchain Compatibility

Use the following Android build tool versions for `apps/mobile`:

- AGP: `8.9.1` (`apps/mobile/android/settings.gradle`)
- Gradle wrapper: `8.11.1` (`apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`)
- Kotlin Android plugin: `2.1.0` (`apps/mobile/android/settings.gradle`)

After changing Android dependencies, validate metadata compatibility:

```bash
cd apps/mobile/android
./gradlew :app:checkReleaseAarMetadata
```

#### Run on Android
```bash
cd apps/mobile

# List available devices
flutter devices

# Run on Android emulator
flutter run -d android

# Or run on specific device
flutter run -d "emulator-5554"

# Hot reload: press 'r' in terminal
# Hot restart: press 'R' in terminal
```

### 7.3 iOS Setup (macOS only)

#### Prerequisites
```bash
# Install Xcode from App Store
# Install Xcode Command Line Tools
sudo xcode-select --install

# Install CocoaPods
sudo gem install cocoapods

# Install iOS Simulator
open -a Simulator
```

#### Run on iOS
```bash
cd apps/mobile

# Install iOS dependencies
cd ios && pod install && cd ..

# Run on iOS simulator
flutter run -d ios

# Or run on specific simulator
flutter run -d "iPhone 14 Pro"
```

### 7.4 Mobile App Configuration

#### Update API URLs
```dart
// lib/core/config/app_config.dart
static const String baseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3001/api/v1', // Android emulator
  // defaultValue: 'http://localhost:3001/api/v1', // iOS simulator
);
```

#### Firebase Setup (for push notifications)
1. Create Firebase project
2. Add Android/iOS apps
3. Download config files:
   - `google-services.json` → `apps/mobile/android/app/`
   - `GoogleService-Info.plist` → `apps/mobile/ios/Runner/`

## 8. Infrastructure Services

### 8.1 Monitoring Setup (Optional)

#### Install monitoring tools
```bash
# Install Prometheus (optional)
# Download from: https://prometheus.io/download/

# Install Grafana (optional)
# Download from: https://grafana.com/grafana/download
```

#### Configure monitoring
```bash
# API metrics endpoint: http://localhost:3001/api/v1/metrics
# Configure Prometheus to scrape this endpoint
# Set up Grafana dashboards for visualization
```

### 8.2 Backup Setup

```bash
# Create backup script
mkdir -p scripts
cat > scripts/backup.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U agrinova -h localhost agrinova_dev > backups/agrinova_backup_$TIMESTAMP.sql
EOF

chmod +x scripts/backup.sh

# Create backups directory
mkdir -p backups

# Manual backup
./scripts/backup.sh

# Automated backup (setup cron job)
# Add to crontab: 0 2 * * * /path/to/agrinova/scripts/backup.sh
```

## 9. Production Deployment

### 9.1 Production Environment

```bash
# Copy production environment
cp .env.example .env.prod
cp apps/api/.env.example apps/api/.env.prod
cp apps/web/.env.example apps/web/.env.prod

# Edit with production values
nano .env.prod
```

Production environment considerations:

```bash
# .env.prod
NODE_ENV=production
POSTGRES_PASSWORD=very_secure_production_password
REDIS_PASSWORD=very_secure_redis_password
JWT_SECRET=very_long_secure_jwt_secret_min_64_chars
SMTP_HOST=your-smtp-server.com
CORS_ORIGIN=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
```

### 9.2 Production Database Setup

```bash
# Create production database
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE agrinova_prod;
CREATE USER agrinova_prod WITH ENCRYPTED PASSWORD 'very_secure_production_password';
GRANT ALL PRIVILEGES ON DATABASE agrinova_prod TO agrinova_prod;
\q

# Configure PostgreSQL for production
# Edit /etc/postgresql/14/main/postgresql.conf
# Edit /etc/postgresql/14/main/pg_hba.conf
# Setup connection pooling, SSL, etc.
```

### 9.3 Build Production Applications

#### API Server
```bash
cd apps/api

# Install production dependencies
npm ci --only=production

# Generate Prisma client
npm run prisma:generate

# Run production migrations
npm run prisma:migrate:prod

# Build application
npm run build

# Start production server
PORT=3001 NODE_ENV=production npm run start:prod
```

#### Web Dashboard
```bash
cd apps/web

# Install production dependencies
npm ci --only=production

# Build application
npm run build

# Start production server
PORT=3000 NODE_ENV=production npm start
```

### 9.4 Process Management with PM2

```bash
# Install PM2
npm install -g pm2

# Start API server
pm2 start apps/api/dist/main.js --name "agrinova-api" --env production

# Start Web server
pm2 start apps/web/server.js --name "agrinova-web" --env production

# Save PM2 configuration
pm2 save
pm2 startup

# Monitor processes
pm2 status
pm2 logs
```

### 9.5 Production Monitoring

#### Health Checks
```bash
# API health
curl https://your-domain.com/api/v1/health

# Web health
curl https://your-domain.com/health

# Database health
pg_isready -U agrinova_prod -d agrinova_prod
```

#### Log Management
```bash
# API logs
pm2 logs agrinova-api

# Web logs
pm2 logs agrinova-web

# System logs
tail -f /var/log/postgresql/postgresql-14-main.log
tail -f /var/log/redis/redis-server.log
```

## 10. Testing

### 10.1 API Testing

```bash
cd apps/api

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Test specific file
npm run test -- --testPathPattern=auth.service.spec.ts
```

### 10.2 Web Testing

```bash
cd apps/web

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

### 10.3 Mobile Testing

```bash
cd apps/mobile

# Unit tests
flutter test

# Integration tests
flutter test integration_test/

# Test specific file
flutter test test/auth_test.dart

# Test coverage
flutter test --coverage
```

## 11. Troubleshooting

### 11.1 Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :3001
# or
netstat -tulpn | grep 3001

# Kill process
kill -9 <PID>
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql
# or
brew services list | grep postgresql

# Check connection
psql -U agrinova -d agrinova_dev -h localhost -c "SELECT 1;"

# Reset PostgreSQL password
sudo -u postgres psql
ALTER USER agrinova PASSWORD 'new_password';
```

#### Redis Connection Issues
```bash
# Check Redis status
sudo systemctl status redis-server
# or
brew services list | grep redis

# Test connection
redis-cli ping

# Start Redis if not running
redis-server
# or
sudo systemctl start redis-server
```

#### Node.js Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Update npm
npm install -g npm@latest
```

#### Flutter Issues
```bash
# Clean Flutter
flutter clean
flutter pub get

# Reset Flutter
flutter doctor
flutter upgrade

# Clear Flutter cache
flutter pub cache repair
```

#### Android AAR Metadata / AGP Mismatch

If build fails at `:app:checkReleaseAarMetadata` with messages like:
- `requires Android Gradle plugin 8.9.1 or higher`

Fix by aligning both values together:

```bash
# apps/mobile/android/settings.gradle
# id "com.android.application" version "8.9.1" apply false

# apps/mobile/android/gradle/wrapper/gradle-wrapper.properties
# distributionUrl=https\://services.gradle.org/distributions/gradle-8.11.1-all.zip
```

Then re-run:

```bash
cd apps/mobile/android
./gradlew :app:checkReleaseAarMetadata
```

### 11.2 Performance Issues

#### Database Optimization
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_panen_harvest_date ON panen (harvest_date);
CREATE INDEX CONCURRENTLY idx_panen_status ON panen (status);
CREATE INDEX CONCURRENTLY idx_tbs_collection_time ON tbs (collection_time);

-- Analyze tables
ANALYZE panen;
ANALYZE tbs;
ANALYZE users;
```

#### Redis Optimization
```bash
# Check Redis memory usage
redis-cli info memory

# Monitor Redis performance
redis-cli monitor
```

#### API Performance
```bash
# Monitor API performance
# Access metrics at http://localhost:3001/api/v1/metrics

# Check slow queries
tail -f apps/api/logs/app.log | grep "slow query"
```

### 11.3 Data Sync Issues

#### Mobile Sync Debug
```bash
# Enable debug logging in mobile app
# Settings > Developer Options > Enable Debug Logs

# Check sync queue
# In app: Settings > Sync Status > View Queue

# Force sync
# In app: Settings > Sync Now
```

#### Server Sync Debug
```bash
# Check sync logs
tail -f apps/api/logs/app.log | grep sync

# Monitor sync events
redis-cli monitor | grep sync
```

### 11.4 Getting Help

#### Log Analysis
```bash
# API logs
pm2 logs agrinova-api
# or if running directly:
tail -f apps/api/logs/app.log

# Web logs
pm2 logs agrinova-web

# Database logs
tail -f /var/log/postgresql/postgresql-14-main.log
```

#### Debug Mode
```bash
# Enable debug mode in API
export LOG_LEVEL=debug
npm run start:dev

# Enable debug mode in Web
export NODE_ENV=development
npm run dev
```

#### Health Checks
```bash
# API health
curl http://localhost:3001/health

# Database health
pg_isready -U agrinova -d agrinova_dev

# Redis health
redis-cli ping
```

## 🆘 Support

If you encounter issues not covered in this guide:

1. **Check logs** first using the commands above
2. **Search existing issues** on GitHub
3. **Create new issue** with:
   - Environment details
   - Error messages
   - Steps to reproduce
   - Relevant logs

## 🎉 Success!

If you've completed this setup guide successfully, you should have:

✅ **Infrastructure services** running (PostgreSQL, Redis)  
✅ **API server** running on http://localhost:3001  
✅ **Web dashboard** running on http://localhost:3000  
✅ **Mobile app** building and running  
✅ **Database** migrated and seeded  

**Next Steps:**
- Read the [API Documentation](http://localhost:3001/api/v1/docs)
- Explore the [Web Dashboard](http://localhost:3000)
- Test the [Mobile App](apps/mobile/)
- Review the [Contributing Guide](CONTRIBUTING.md)

Happy coding! 🚀

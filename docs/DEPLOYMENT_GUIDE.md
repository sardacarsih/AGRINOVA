# Agrinova Deployment Guide

## Overview

Guide untuk deploy Agrinova ke production environment.

---

## 🖥️ Infrastructure Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Backend Server** | 2 vCPU, 4GB RAM | 4 vCPU, 8GB RAM |
| **PostgreSQL** | 2GB RAM, 20GB SSD | 4GB RAM, 100GB SSD |
| **Redis** (optional) | 512MB RAM | 1GB RAM |

---

## 🔧 Environment Variables

### Backend (.env)

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=agrinova
DB_PASSWORD=secure_password
DB_NAME=agrinova_db

# JWT
JWT_SECRET=your-very-secure-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_OFFLINE_EXPIRY=30d

# Server
PORT=8080
CORS_ORIGINS=https://yourdomain.com

# Optional
REDIS_URL=redis://localhost:6379
```

### Web (.env.local)

```env
NEXT_PUBLIC_GRAPHQL_URL=https://api.yourdomain.com/graphql
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/graphql
```

---

## 🚀 Deployment Steps

### 1. Backend (Go)

```bash
# Build binary
cd apps/golang
CGO_ENABLED=0 GOOS=linux go build -o agrinova-server ./cmd/server

# Run migrations
./agrinova-server migrate

# Seed data (optional)
./agrinova-server seed

# Start server
./agrinova-server
```

### 2. Web (Next.js)

```bash
cd apps/web

# Install dependencies
npm ci --production

# Build
npm run build

# Start
npm start
```

### 3. Mobile (Flutter)

```bash
cd apps/mobile

# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release

# iOS
flutter build ios --release
```

---

## 🐳 Docker Deployment

### docker-compose.yml

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: agrinova_db
      POSTGRES_USER: agrinova
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  backend:
    build: ./apps/golang
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    environment:
      DB_HOST: postgres
      
  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## 📋 Pre-Deployment Checklist

### Security
- [ ] Change JWT_SECRET
- [ ] Set strong DB passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set rate limiting

### Database
- [ ] Run migrations
- [ ] Backup existing data
- [ ] Test rollback procedure

### Application
- [ ] Build in production mode
- [ ] Test all auth flows
- [ ] Verify API endpoints
- [ ] Check WebSocket connections

### Mobile
- [ ] Update API URL
- [ ] Sign release build
- [ ] Test on real devices
- [ ] Submit to app stores

---

## 📊 Monitoring

| Tool | Purpose |
|------|---------|
| Prometheus | Metrics collection |
| Grafana | Dashboard visualization |
| Loki | Log aggregation |
| Sentry | Error tracking |

---

## 🔄 Rollback Procedure

```bash
# Backend
systemctl stop agrinova-server
cp backups/agrinova-server-previous ./agrinova-server
systemctl start agrinova-server

# Database
psql -U agrinova -d agrinova_db < backups/backup-YYYY-MM-DD.sql
```

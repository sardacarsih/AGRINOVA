# Agrinova GraphQL Server - Production Environment Setup

## 📋 Quick Overview

This directory contains everything needed for production deployment of the Agrinova GraphQL server on Windows systems.

### 🎯 What You Need for Production

Based on the comprehensive analysis by our Go GraphQL backend development agent, here are the **essential changes** you must make to deploy securely:

## 🔴 CRITICAL SECURITY CHANGES (MUST DO)

### 1. Generate New Production Secrets
```bash
# Run this script to generate secure secrets
./generate-production-secrets.sh
```

### 2. Replace Environment Variables
In `.env.production`, replace these placeholder values:

```env
# CRITICAL: Replace these with generated secrets
JWT_ACCESS_SECRET=REPLACE_WITH_openssl_rand_base64_32_OUTPUT
JWT_REFRESH_SECRET=REPLACE_WITH_openssl_rand_base64_32_OUTPUT
JWT_OFFLINE_SECRET=REPLACE_WITH_openssl_rand_base64_32_OUTPUT
DEVICE_SECRET=REPLACE_WITH_openssl_rand_base64_32_OUTPUT
CSRF_SECRET=REPLACE_WITH_openssl_rand_base64_32_OUTPUT

# CRITICAL: Update with your production database
AGRINOVA_DATABASE_HOST=your-production-db-server.com
AGRINOVA_DATABASE_USER=agrinova_prod_user
AGRINOVA_DATABASE_PASSWORD=your_secure_production_password
AGRINOVA_DATABASE_NAME=agrinova_production
AGRINOVA_FCM_CREDENTIALS_FILE=C:\Agrinova\secrets\firebase-service-account.json

# CRITICAL: Update with your production domain
AGRINOVA_AUTH_COOKIE_DOMAIN=agrinova.kskgroup.web.id
AGRINOVA_CORS_ALLOWED_ORIGINS=https://agrinova.kskgroup.web.id,https://admin.kskgroup.web.id

# CRITICAL: Set to production values
AGRINOVA_AUTH_SECURE_COOKIES=true
AGRINOVA_GRAPHQL_PLAYGROUND_ENABLED=false
AGRINOVA_GRAPHQL_INTROSPECTION_ENABLED=false
```

### 3. Windows-Specific Configuration
```env
# Update SSL certificate paths for Windows
PROD_SSL_CERT_PATH=C:\certs\agrinova.crt
PROD_SSL_KEY_PATH=C:\certs\agrinova.key
```

## 🟡 IMPORTANT PERFORMANCE CHANGES

### JWT Token Durations (Production Optimized)
```env
# Shorter durations for better security
AGRINOVA_AUTH_ACCESS_TOKEN_DURATION=10m      # Instead of 15m
AGRINOVA_AUTH_REFRESH_TOKEN_DURATION=72h     # Instead of 168h (3 days vs 7)
AGRINOVA_AUTH_WEB_SESSION_DURATION=12h       # Instead of 24h
```

### Rate Limiting (Production Hardened)
```env
# More restrictive for production
AGRINOVA_SECURITY_RATE_LIMIT_REQUESTS_PER_MINUTE=60  # Instead of 100
AGRINOVA_SECURITY_RATE_LIMIT_BURST=5                  # Instead of 10
```

### Logging (Production Optimized)
```env
# Reduce log verbosity in production
AGRINOVA_LOGGING_LEVEL=warn     # Instead of info
AGRINOVA_SERVER_GIN_MODE=release # Instead of debug
```

## 📁 Production Files

### Core Configuration Files
- **`.env.production`** - Complete production environment configuration
- **`agrinova-graphql-windows-amd64.exe`** - Production-optimized Windows binary (31MB)

### Setup and Security
- **`generate-production-secrets.sh`** - Script to generate secure secrets
- **`PRODUCTION_CHECKLIST.md`** - Complete deployment checklist
- **`WINDOWS_DEPLOYMENT.md`** - Detailed Windows deployment guide

## 🚀 Quick Deployment Steps

### 1. Prepare Server
```powershell
# Create directories
New-Item -Path "C:\Agrinova" -ItemType Directory -Force
New-Item -Path "C:\Agrinova\logs" -ItemType Directory -Force
New-Item -Path "C:\Agrinova\certs" -ItemType Directory -Force

# Configure firewall
New-NetFirewallRule -DisplayName "Agrinova GraphQL" -Direction Inbound -Port 8080 -Protocol TCP -Action Allow
```

### 2. Generate Secrets
```bash
# Generate production secrets
./generate-production-secrets.sh
```

### 3. Deploy Application
```powershell
# Copy files
Copy-Item "agrinova-graphql-windows-amd64.exe" "C:\Agrinova\"
Copy-Item ".env.production" "C:\Agrinova\.env"

# Update .env with generated secrets and production values
# (Use the output from step 2)
```

### 4. Test Manual Start
```powershell
cd C:\Agrinova
.\agrinova-graphql-windows-amd64.exe

# Test health endpoint (in another window)
Invoke-RestMethod -Uri "http://localhost:8080/health"
```

### 5. Install as Windows Service
```powershell
# Create and start service
sc.exe create "AgrinovaGraphQLServer" binPath= "C:\Agrinova\agrinova-graphql-windows-amd64.exe" start= auto
sc.exe start "AgrinovaGraphQLServer"

# Verify service
Get-Service -Name "AgrinovaGraphQLServer"
```

## 📊 Key Differences: Development vs Production

| Setting | Development | Production | Reason |
|---------|-------------|------------|---------|
| **GraphQL Playground** | Enabled | **Disabled** | Security |
| **GraphQL Introspection** | Enabled | **Disabled** | Security |
| **Cookie Security** | False | **True** | HTTPS only |
| **CORS Origins** | localhost | **Production domains** | Security |
| **Rate Limiting** | 100 req/min | **60 req/min** | Performance |
| **Access Token Duration** | 15 minutes | **10 minutes** | Security |
| **Refresh Token Duration** | 7 days | **3 days** | Security |
| **Logging Level** | info | **warn** | Performance |
| **Server Mode** | debug | **release** | Performance |
| **SSL Mode** | disable | **require** | Security |

## 🔐 Security Features in Production

### Authentication Security
- **7-level hierarchical roles** (SUPER_ADMIN → SATPAM)
- **JWT tokens** with device binding
- **Secure cookies** for web sessions
- **CSRF protection** enabled
- **Rate limiting** for GraphQL endpoints

### Database Security
- **SSL/TLS required** for database connections
- **Dedicated production user** with minimal privileges
- **Strong password requirements**
- **Connection pooling** for performance

### Network Security
- **CORS restricted** to production domains only
- **HTTPS enforcement** for cookies
- **Windows Firewall** configuration
- **SSL certificate** validation

## ⚡ Performance Optimizations

### Server Performance
- **Production binary** (31MB, optimized)
- **Release mode** compilation
- **WebSocket optimization** (5000 connections)
- **Query limiting** to prevent abuse

### Database Performance
- **Connection pooling** enabled
- **SSL connection reuse**
- **Optimized query timeouts**
- **GORM performance tuning**

## 📝 Production Checklist Summary

### Before Deployment ✅
- [ ] Generate new production secrets
- [ ] Update database configuration
- [ ] Configure production domains
- [ ] Install SSL certificates
- [ ] Test database connectivity

### During Deployment ✅  
- [ ] Deploy production binary
- [ ] Configure environment
- [ ] Install Windows service
- [ ] Test health endpoints
- [ ] Verify authentication

### After Deployment ✅
- [ ] Monitor service health
- [ ] Verify performance metrics
- [ ] Test all role hierarchies
- [ ] Monitor security logs
- [ ] Set up automated backups

## 🚨 Emergency Contacts & Procedures

### Service Recovery
```powershell
# Restart service
Restart-Service -Name "AgrinovaGraphQLServer"

# Check logs
Get-WinEvent -LogName Application | Where-Object {$_.ProviderName -eq "AgrinovaGraphQLServer"} | Select-Object -First 10
```

### Rollback Procedure
```powershell
# Stop service
Stop-Service -Name "AgrinovaGraphQLServer" -Force

# Restore backup
Copy-Item "C:\Agrinova\backup\agrinova-graphql.exe.backup" "C:\Agrinova\agrinova-graphql-windows-amd64.exe"
Copy-Item "C:\Agrinova\backup\.env.backup" "C:\Agrinova\.env"

# Start service
Start-Service -Name "AgrinovaGraphQLServer"
```

## 📚 Documentation Links

- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** - Complete deployment checklist
- **[WINDOWS_DEPLOYMENT.md](WINDOWS_DEPLOYMENT.md)** - Detailed Windows setup guide  
- **[.env.production](.env.production)** - Production environment template

## 🎯 Success Criteria

Your production deployment is successful when:

1. ✅ **Health endpoint** responds with `{"status":"ok"}`
2. ✅ **Authentication works** for all 7 role levels  
3. ✅ **GraphQL playground** is disabled (returns 404)
4. ✅ **HTTPS endpoints** work with valid SSL certificates
5. ✅ **WebSocket connections** are stable
6. ✅ **Database queries** execute successfully
7. ✅ **Service auto-starts** after Windows reboot

## 🔗 Production URLs

Once deployed, your GraphQL server will be available at:

- **GraphQL API**: `https://agrinova.kskgroup.web.id/graphql`
- **Health Check**: `https://agrinova.kskgroup.web.id/health`  
- **WebSocket**: `wss://agrinova.kskgroup.web.id/ws`

## 📞 Support

For deployment issues or questions:

1. Check the **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** for troubleshooting
2. Review the **[WINDOWS_DEPLOYMENT.md](WINDOWS_DEPLOYMENT.md)** for detailed procedures
3. Contact the development team with specific error messages

---

**Remember**: Production security is critical. Never skip the security configuration steps, and always test thoroughly before going live!

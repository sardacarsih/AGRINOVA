# Agrinova GraphQL Server - Production Deployment Checklist

## Overview
This checklist ensures a secure, reliable, and optimized production deployment of the Agrinova GraphQL server on Windows.

---

## 🚨 Critical Security Tasks (MUST COMPLETE)

### Environment Configuration
- [ ] **Generate new production secrets** using `./generate-production-secrets.sh`
- [ ] **Replace all placeholder values** in `.env.production` with actual production values
- [ ] **Set strong database password** (minimum 16 characters, mixed case, numbers, symbols)
- [ ] **Configure production domain** in CORS settings
- [ ] **Set secure cookie domain** to your production domain
- [ ] **Enable secure cookies** (`AGRINOVA_AUTH_SECURE_COOKIES=true`)
- [ ] **Disable GraphQL playground** (`AGRINOVA_GRAPHQL_PLAYGROUND_ENABLED=false`)
- [ ] **Disable GraphQL introspection** (`AGRINOVA_GRAPHQL_INTROSPECTION_ENABLED=false`)

### Database Security
- [ ] **Create dedicated production database user** with minimal required privileges
- [ ] **Enable PostgreSQL SSL/TLS** (`AGRINOVA_DATABASE_SSL_MODE=require`)
- [ ] **Configure database firewall rules** to restrict access to application servers only
- [ ] **Set up database backups** with encryption
- [ ] **Test database connection** from production server

### SSL/TLS Configuration
- [ ] **Obtain valid SSL certificate** from trusted CA (not self-signed)
- [ ] **Install SSL certificate** on Windows server
- [ ] **Configure certificate paths** in `.env.production`
- [ ] **Test SSL certificate chain** and validity
- [ ] **Set up automatic certificate renewal** (if using Let's Encrypt or similar)

---

## 🏗️ Infrastructure Setup

### Server Preparation
- [ ] **Windows Server 2019+** installed and updated
- [ ] **Install required software**: OpenSSL, PostgreSQL client tools
- [ ] **Create application directory** structure (`C:\Agrinova\`)
- [ ] **Set proper file permissions** for application directories
- [ ] **Configure Windows Firewall** rules for port 8080 (and 443 if using HTTPS)

### Application Deployment
- [ ] **Copy production binary** (`agrinova-graphql-windows-amd64.exe`) to server
- [ ] **Copy production environment file** (`.env.production` → `.env`)
- [ ] **Test manual application startup** to verify configuration
- [ ] **Install as Windows Service** using provided PowerShell scripts
- [ ] **Configure service auto-start** and failure recovery

### Network Configuration
- [ ] **Configure reverse proxy** (IIS/Nginx) if using HTTPS termination
- [ ] **Set up load balancing** if deploying multiple instances
- [ ] **Configure DNS records** for production domain
- [ ] **Test external connectivity** to GraphQL endpoints

---

## 🔒 Security Hardening

### System Security
- [ ] **Apply latest Windows updates** and security patches
- [ ] **Configure Windows Defender** exclusions for application directory
- [ ] **Set up Windows Event Logging** for security monitoring
- [ ] **Configure User Account Control (UAC)** settings
- [ ] **Disable unnecessary Windows services**

### Network Security
- [ ] **Restrict firewall rules** to specific IP ranges where possible
- [ ] **Configure network security policies** for service account
- [ ] **Enable audit logging** for authentication and authorization events
- [ ] **Set up intrusion detection** monitoring

### Application Security
- [ ] **Review and restrict CORS origins** to production domains only
- [ ] **Configure rate limiting** (`AGRINOVA_SECURITY_RATE_LIMIT_REQUESTS_PER_MINUTE=60`)
- [ ] **Enable CSRF protection** (`AGRINOVA_SECURITY_CSRF_ENABLED=true`)
- [ ] **Enable device binding** (`AGRINOVA_SECURITY_DEVICE_BINDING_ENABLED=true`)
- [ ] **Set minimum secret length** (`AGRINOVA_SECURITY_MIN_SECRET_LENGTH=32`)

---

## ⚡ Performance Optimization

### System Performance
- [ ] **Configure adequate virtual memory** (1.5x physical RAM minimum)
- [ ] **Optimize network settings** (TCP chimney, RSS, auto-tuning)
- [ ] **Set process priority** to High for GraphQL service
- [ ] **Configure system performance for background services**

### Application Performance
- [ ] **Set production logging level** (`AGRINOVA_LOGGING_LEVEL=warn`)
- [ ] **Optimize WebSocket settings** for expected concurrent users
- [ ] **Configure GraphQL query limits** to prevent abuse
- [ ] **Set appropriate timeout values** for production environment

### Database Performance
- [ ] **Configure database connection pooling**
- [ ] **Set up database performance monitoring**
- [ ] **Optimize database indexes** for GraphQL queries
- [ ] **Configure database maintenance tasks** (VACUUM, ANALYZE)

---

## 📊 Monitoring & Logging

### Health Monitoring
- [ ] **Set up health check endpoint** monitoring (`/health`)
- [ ] **Configure automated health checks** (scheduled task every 5 minutes)
- [ ] **Set up service restart** on health check failures
- [ ] **Configure uptime monitoring** (external service)

### Logging Configuration
- [ ] **Configure Windows Event Log** sources
- [ ] **Set up log retention policies** (size and time-based)
- [ ] **Configure structured logging** (`AGRINOVA_LOGGING_FORMAT=json`)
- [ ] **Set up log aggregation** (if using centralized logging)

### Performance Monitoring
- [ ] **Set up Performance Monitor** counters for CPU, memory, network
- [ ] **Configure alerts** for high resource usage
- [ ] **Monitor GraphQL query performance**
- [ ] **Track WebSocket connection metrics**

### Security Monitoring
- [ ] **Monitor authentication failures** and suspicious activity
- [ ] **Set up alerts** for multiple failed login attempts
- [ ] **Track API usage patterns** for anomaly detection
- [ ] **Monitor SSL certificate expiration**

---

## 🚀 Deployment Validation

### Functional Testing
- [ ] **Test GraphQL health endpoint** (`GET /health`)
- [ ] **Test user authentication** with all role types
- [ ] **Verify role hierarchy permissions** work correctly
- [ ] **Test WebSocket connections** for real-time features
- [ ] **Validate CORS headers** for web application access

### Security Testing
- [ ] **Verify SSL/TLS configuration** (SSL Labs test)
- [ ] **Test authentication token expiration** and refresh
- [ ] **Validate rate limiting** functionality
- [ ] **Test CSRF protection** mechanisms
- [ ] **Verify GraphQL introspection** is disabled

### Performance Testing
- [ ] **Load test authentication endpoints** under expected user load
- [ ] **Test WebSocket scalability** with concurrent connections
- [ ] **Measure GraphQL query response times**
- [ ] **Test database connection pool** under load
- [ ] **Validate memory usage** under sustained load

### Integration Testing
- [ ] **Test mobile app connectivity** to production API
- [ ] **Verify web dashboard integration** with production backend
- [ ] **Test real-time features** (WebSocket notifications)
- [ ] **Validate offline token functionality** for mobile devices

---

## 📋 Final Production Checklist

### Pre-Go-Live
- [ ] **All security configurations verified**
- [ ] **Performance benchmarks established**
- [ ] **Monitoring systems operational**
- [ ] **Backup and recovery procedures tested**
- [ ] **Rollback procedures documented and tested**

### Go-Live Tasks
- [ ] **DNS cutover** to production servers
- [ ] **SSL certificate validation** on production domain
- [ ] **Monitor service startup** and stability
- [ ] **Verify all integrations** working correctly
- [ ] **Check real-time features** are functioning

### Post Go-Live
- [ ] **Monitor service health** for first 24 hours continuously
- [ ] **Verify authentication flows** are working correctly
- [ ] **Check performance metrics** against baselines
- [ ] **Monitor error rates** and response times
- [ ] **Validate backup procedures** are executing successfully

---

## 🚨 Emergency Procedures

### Service Issues
- [ ] **Service restart procedure** documented and tested
- [ ] **Rollback procedure** to previous version available
- [ ] **Emergency contact list** for critical issues
- [ ] **Escalation procedures** for service outages

### Security Incidents
- [ ] **Incident response plan** documented
- [ ] **Log preservation procedures** for forensic analysis
- [ ] **Communication plan** for security breaches
- [ ] **Recovery procedures** from security incidents

### Data Issues
- [ ] **Database backup restoration** procedures tested
- [ ] **Data corruption recovery** plans available
- [ ] **Point-in-time recovery** procedures documented
- [ ] **Data validation** procedures after recovery

---

## 📝 Documentation & Handover

### Technical Documentation
- [ ] **Production environment configuration** documented
- [ ] **Service management procedures** documented
- [ ] **Monitoring and alerting setup** documented
- [ ] **Troubleshooting guides** available

### Operational Documentation
- [ ] **Maintenance procedures** documented
- [ ] **Update and patching procedures** defined
- [ ] **Performance tuning guidelines** available
- [ ] **Capacity planning** documentation updated

### Knowledge Transfer
- [ ] **Operations team trained** on service management
- [ ] **Support team familiar** with troubleshooting procedures
- [ ] **Escalation contacts** established
- [ ] **Service ownership** clearly defined

---

## ✅ Sign-Off

### Technical Validation
- [ ] **Infrastructure Team**: Server and network configuration validated
- [ ] **Security Team**: Security configurations and hardening verified
- [ ] **Database Team**: Database security and performance optimized
- [ ] **Development Team**: Application functionality validated

### Operational Readiness
- [ ] **Operations Team**: Service management procedures understood
- [ ] **Support Team**: Troubleshooting capabilities verified
- [ ] **Management**: Go-live approval received
- [ ] **Stakeholders**: Production readiness communicated

---

**Date**: _______________

**Deployed by**: _______________

**Approved by**: _______________

**Notes**: _______________

---

## Quick Reference Commands

### Service Management
```powershell
# Check service status
Get-Service -Name "AgrinovaGraphQLServer"

# Restart service
Restart-Service -Name "AgrinovaGraphQLServer"

# Check service logs
Get-WinEvent -LogName Application -MaxEvents 50 | Where-Object {$_.ProviderName -eq "AgrinovaGraphQLServer"}
```

### Health Checks
```powershell
# Test health endpoint
Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET

# Test GraphQL endpoint
$body = @{
    query = "query { __typename }"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/graphql" -Method POST -Body $body -ContentType "application/json"
```

### Performance Monitoring
```powershell
# Check process performance
Get-Process -Name "agrinova-graphql-windows-amd64" | Select-Object Name, CPU, WorkingSet, Handles

# Check network connections
netstat -an | findstr :8080
```

---

**Remember**: Production deployment is a critical process. Double-check all configurations and never skip security validations!
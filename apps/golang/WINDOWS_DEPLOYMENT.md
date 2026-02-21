# Agrinova GraphQL Server - Windows Production Deployment Guide

## Overview
This guide covers the complete deployment process for the Agrinova GraphQL server on Windows production servers, including security configurations, performance optimizations, and monitoring setup.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Server Preparation](#server-preparation)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [SSL/TLS Configuration](#ssltls-configuration)
6. [Windows Service Setup](#windows-service-setup)
7. [Security Configuration](#security-configuration)
8. [Performance Optimization](#performance-optimization)
9. [Monitoring and Logging](#monitoring-and-logging)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **Windows Server 2019** or newer
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 10GB free space
- **CPU**: 2+ cores recommended
- **Network**: Internet connectivity for database and external services

### Required Software
- **PostgreSQL Client Tools** (for database connectivity)
- **OpenSSL** (for certificate management)
- **Windows Firewall** access for port configuration
- **PowerShell 5.0+** (for automation scripts)

## Server Preparation

### 1. Create Application Directory
```powershell
# Create application directory
New-Item -Path "C:\Agrinova" -ItemType Directory -Force
New-Item -Path "C:\Agrinova\logs" -ItemType Directory -Force
New-Item -Path "C:\Agrinova\certs" -ItemType Directory -Force
New-Item -Path "C:\Agrinova\backup" -ItemType Directory -Force

# Set appropriate permissions
icacls "C:\Agrinova" /grant "IIS_IUSRS:(OI)(CI)F"
```

### 2. Configure Windows Firewall
```powershell
# Allow GraphQL server port
New-NetFirewallRule -DisplayName "Agrinova GraphQL Server" -Direction Inbound -Port 8080 -Protocol TCP -Action Allow

# Allow HTTPS if using SSL termination
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Port 443 -Protocol TCP -Action Allow
```

### 3. Install Required Tools
```powershell
# Install Chocolatey (if not already installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install OpenSSL
choco install openssl -y

# Install PostgreSQL client tools
choco install postgresql -y --params '/Password:SecurePassword123!'
```

## Database Setup

### 1. Production Database Configuration
```sql
-- Connect to PostgreSQL as superuser
psql -h your-db-server -U postgres

-- Create production database and user
CREATE DATABASE agrinova_production;
CREATE USER agrinova_prod_user WITH PASSWORD 'your_secure_production_password';

-- Grant necessary privileges
GRANT ALL PRIVILEGES ON DATABASE agrinova_production TO agrinova_prod_user;
GRANT ALL ON SCHEMA public TO agrinova_prod_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO agrinova_prod_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO agrinova_prod_user;

-- Enable SSL (if not already enabled)
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = 'server.crt';
ALTER SYSTEM SET ssl_key_file = 'server.key';
SELECT pg_reload_conf();
```

### 2. Test Database Connectivity
```powershell
# Test PostgreSQL connection
$env:PGPASSWORD = "your_secure_production_password"
psql -h your-production-db-server.com -U agrinova_prod_user -d agrinova_production -c "SELECT version();"
```

## Application Deployment

### 1. Deploy Application Files
```powershell
# Copy files to production server
Copy-Item "agrinova-graphql-windows-amd64.exe" "C:\Agrinova\"
Copy-Item ".env.production" "C:\Agrinova\.env"

# Verify file permissions
icacls "C:\Agrinova\agrinova-graphql-windows-amd64.exe" /verify
```

### 2. Generate Production Secrets
```powershell
# Navigate to application directory
cd C:\Agrinova

# Run secret generation (using Git Bash or WSL if available)
bash generate-production-secrets.sh

# Or manually generate using OpenSSL
openssl rand -base64 32  # For JWT_ACCESS_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
openssl rand -base64 32  # For JWT_OFFLINE_SECRET
openssl rand -base64 32  # For DEVICE_SECRET
openssl rand -base64 32  # For CSRF_SECRET
```

### 3. Configure Environment Variables
Edit `C:\Agrinova\.env` and replace all placeholder values:

```env
# Database Configuration
AGRINOVA_DATABASE_HOST=your-production-db-server.com
AGRINOVA_DATABASE_USER=agrinova_prod_user
AGRINOVA_DATABASE_PASSWORD=your_secure_production_password
AGRINOVA_DATABASE_NAME=agrinova_production
AGRINOVA_FCM_CREDENTIALS_FILE=C:\Agrinova\secrets\firebase-service-account.json

# Domain Configuration
AGRINOVA_AUTH_COOKIE_DOMAIN=agrinova.kskgroup.web.id
AGRINOVA_CORS_ALLOWED_ORIGINS=https://agrinova.kskgroup.web.id,https://admin.kskgroup.web.id

# Generated Secrets (replace with actual values)
JWT_ACCESS_SECRET=your_generated_jwt_access_secret
JWT_REFRESH_SECRET=your_generated_jwt_refresh_secret
# ... (other secrets)

# SSL Certificate Paths (Windows format)
PROD_SSL_CERT_PATH=C:\Agrinova\certs\agrinova.crt
PROD_SSL_KEY_PATH=C:\Agrinova\certs\agrinova.key
```

### 4. Test Application
```powershell
# Test the application manually first
cd C:\Agrinova
.\agrinova-graphql-windows-amd64.exe

# In another PowerShell window, test health endpoint
Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET
```

## SSL/TLS Configuration

### 1. Install SSL Certificate
```powershell
# Import SSL certificate to Windows Certificate Store
Import-Certificate -FilePath "C:\Agrinova\certs\agrinova.crt" -CertStoreLocation Cert:\LocalMachine\My

# Verify certificate installation
Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object {$_.Subject -like "*agrinova.kskgroup.web.id*"}
```

### 2. Configure IIS as Reverse Proxy (Optional)
If using IIS for SSL termination:

```xml
<!-- web.config for IIS reverse proxy -->
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="GraphQL API" stopProcessing="true">
          <match url=".*" />
          <action type="Rewrite" url="http://localhost:8080/{R:0}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

## Windows Service Setup

### 1. Create Service Installation Script
Create `C:\Agrinova\install-service.ps1`:

```powershell
# Agrinova GraphQL Service Installation Script
param(
    [string]$ServiceName = "AgrinovaGraphQLServer",
    [string]$DisplayName = "Agrinova GraphQL API Server",
    [string]$Description = "Production GraphQL API server for Agrinova palm oil management system",
    [string]$ExePath = "C:\Agrinova\agrinova-graphql-windows-amd64.exe",
    [string]$WorkingDirectory = "C:\Agrinova"
)

# Stop service if it exists
if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Stop-Service -Name $ServiceName -Force
    Remove-Service -Name $ServiceName
}

# Create Windows Service using sc.exe
$binPath = "`"$ExePath`""
sc.exe create $ServiceName binPath= $binPath start= auto displayname= $DisplayName
sc.exe description $ServiceName $Description

# Set service to restart on failure
sc.exe failure $ServiceName reset= 30 actions= restart/5000/restart/5000/restart/5000

# Set service to run under Network Service account
sc.exe config $ServiceName obj= "NT AUTHORITY\NetworkService"

Write-Host "Service '$DisplayName' installed successfully!"
Write-Host "Starting service..."
Start-Service -Name $ServiceName

# Check service status
Get-Service -Name $ServiceName
```

### 2. Install and Start Service
```powershell
# Run as Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force
cd C:\Agrinova
.\install-service.ps1

# Verify service is running
Get-Service -Name "AgrinovaGraphQLServer"

# Check service logs
Get-WinEvent -LogName Application | Where-Object {$_.ProviderName -eq "AgrinovaGraphQLServer"} | Select-Object -First 10
```

## Security Configuration

### 1. Windows Defender Configuration
```powershell
# Add exclusions for better performance
Add-MpPreference -ExclusionPath "C:\Agrinova"
Add-MpPreference -ExclusionProcess "agrinova-graphql-windows-amd64.exe"
```

### 2. User Account Control (UAC)
```powershell
# Set service to run with specific user (optional)
$credential = Get-Credential -Message "Enter service account credentials"
$service = Get-WmiObject -Class Win32_Service -Filter "Name='AgrinovaGraphQLServer'"
$service.Change($null, $null, $null, $null, $null, $null, $credential.UserName, $credential.GetNetworkCredential().Password)
```

### 3. Network Security
```powershell
# Configure network security policies
netsh advfirewall firewall set rule name="Agrinova GraphQL Server" new remoteip=localsubnet

# Enable audit logging
auditpol /set /category:"Logon/Logoff" /success:enable /failure:enable
auditpol /set /category:"Account Logon" /success:enable /failure:enable
```

## Performance Optimization

### 1. System Configuration
```powershell
# Optimize network settings
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global chimney=enabled
netsh int tcp set global rss=enabled

# Set process priority
Get-Process -Name "agrinova-graphql-windows-amd64" | ForEach-Object {$_.PriorityClass = "High"}
```

### 2. Memory Management
```powershell
# Configure virtual memory
$pageFileSize = [Math]::Floor((Get-WmiObject -Class Win32_ComputerSystem).TotalPhysicalMemory / 1GB) * 1.5
$pageFileSize = [Math]::Max($pageFileSize, 4)  # Minimum 4GB
Write-Host "Recommended page file size: $pageFileSize GB"
```

## Monitoring and Logging

### 1. Event Log Configuration
```powershell
# Create custom event log source
New-EventLog -Source "Agrinova GraphQL" -LogName Application

# Configure log retention
Limit-EventLog -LogName Application -MaximumSize 100MB -OverflowAction OverwriteOlder
```

### 2. Performance Monitoring
Create `C:\Agrinova\monitor-performance.ps1`:

```powershell
# Performance monitoring script
while ($true) {
    $process = Get-Process -Name "agrinova-graphql-windows-amd64" -ErrorAction SilentlyContinue
    if ($process) {
        $cpu = $process.CPU
        $memory = [Math]::Round($process.WorkingSet64 / 1MB, 2)
        $handles = $process.Handles
        
        Write-Host "$(Get-Date): CPU: $cpu, Memory: $memory MB, Handles: $handles"
        
        # Log to Windows Event Log if memory usage is high
        if ($memory -gt 1000) {  # Alert if using more than 1GB
            Write-EventLog -LogName Application -Source "Agrinova GraphQL" -EntryType Warning -EventId 1001 -Message "High memory usage: $memory MB"
        }
    }
    Start-Sleep -Seconds 60
}
```

### 3. Health Check Automation
Create `C:\Agrinova\health-check.ps1`:

```powershell
# Health check script
$healthUrl = "http://localhost:8080/health"
$serviceName = "AgrinovaGraphQLServer"

try {
    $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 10
    if ($response.status -eq "ok") {
        Write-Host "✅ Health check passed: $($response.service)"
        Write-EventLog -LogName Application -Source "Agrinova GraphQL" -EntryType Information -EventId 1000 -Message "Health check successful"
    } else {
        throw "Health check failed: Invalid response"
    }
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)"
    Write-EventLog -LogName Application -Source "Agrinova GraphQL" -EntryType Error -EventId 1002 -Message "Health check failed: $($_.Exception.Message)"
    
    # Restart service if health check fails
    Write-Host "Restarting service..."
    Restart-Service -Name $serviceName -Force
}
```

### 4. Schedule Health Checks
```powershell
# Create scheduled task for health checks
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Agrinova\health-check.ps1"
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 365) -At (Get-Date)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName "Agrinova Health Check" -Action $action -Trigger $trigger -Principal $principal -Settings $settings
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Service Won't Start
```powershell
# Check Windows Event Log
Get-WinEvent -LogName System | Where-Object {$_.ProviderName -eq "Service Control Manager" -and $_.Id -eq 7034} | Select-Object -First 5

# Check application event log
Get-WinEvent -LogName Application | Where-Object {$_.LevelDisplayName -eq "Error"} | Select-Object -First 10

# Test manual start
cd C:\Agrinova
.\agrinova-graphql-windows-amd64.exe
```

#### 2. Database Connection Issues
```powershell
# Test PostgreSQL connectivity
$env:PGPASSWORD = "your_password"
psql -h your-db-server -U agrinova_prod_user -d agrinova_production -c "SELECT 1;"

# Check network connectivity
Test-NetConnection -ComputerName your-db-server -Port 5432

# Verify SSL connectivity
openssl s_client -connect your-db-server:5432 -starttls postgres
```

#### 3. SSL Certificate Issues
```powershell
# Verify certificate validity
Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object {$_.Subject -like "*agronomi*"} | Format-List Subject, NotAfter

# Test certificate chain
certlm.msc  # Open Certificate Manager to verify chain
```

#### 4. Performance Issues
```powershell
# Monitor resource usage
Get-Counter -Counter "\Process(agrinova-graphql-windows-amd64)\% Processor Time"
Get-Counter -Counter "\Process(agrinova-graphql-windows-amd64)\Working Set"

# Check network connections
netstat -an | findstr :8080
```

### Log File Locations
- **Application Logs**: Check Windows Event Viewer → Application Log
- **Service Logs**: Check Windows Event Viewer → System Log
- **Performance Logs**: Use Performance Monitor (perfmon.msc)

### Emergency Procedures

#### Service Recovery
```powershell
# Stop service
Stop-Service -Name "AgrinovaGraphQLServer" -Force

# Backup current configuration
Copy-Item "C:\Agrinova\.env" "C:\Agrinova\backup\.env.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Restore from backup if needed
# Copy-Item "C:\Agrinova\backup\.env.backup.YYYYMMDD-HHMMSS" "C:\Agrinova\.env"

# Start service
Start-Service -Name "AgrinovaGraphQLServer"
```

#### Rollback Procedure
```powershell
# Stop current version
Stop-Service -Name "AgrinovaGraphQLServer" -Force

# Restore previous binary
Copy-Item "C:\Agrinova\backup\agrinova-graphql-windows-amd64.exe.backup" "C:\Agrinova\agrinova-graphql-windows-amd64.exe"

# Restore configuration
Copy-Item "C:\Agrinova\backup\.env.backup" "C:\Agrinova\.env"

# Start service
Start-Service -Name "AgrinovaGraphQLServer"
```

## Production Checklist

### Pre-Deployment
- [ ] Windows Server 2019+ installed and updated
- [ ] PostgreSQL database configured with SSL
- [ ] SSL certificates obtained and installed
- [ ] Firewall rules configured
- [ ] Domain DNS records configured
- [ ] Production secrets generated
- [ ] Environment configuration completed
- [ ] Database connectivity tested

### Deployment
- [ ] Application binary deployed
- [ ] Environment configuration updated
- [ ] Service installed and configured
- [ ] SSL certificates configured
- [ ] Health checks configured
- [ ] Monitoring scripts deployed
- [ ] Performance optimization applied
- [ ] Security hardening completed

### Post-Deployment
- [ ] Service starts successfully
- [ ] Health endpoint responds correctly
- [ ] Database operations working
- [ ] GraphQL queries executing properly
- [ ] Authentication system functional
- [ ] WebSocket connections stable
- [ ] Monitoring alerts configured
- [ ] Backup procedures verified
- [ ] Performance metrics baseline established
- [ ] Documentation updated

## Maintenance

### Regular Tasks
- **Daily**: Check service status and logs
- **Weekly**: Review performance metrics and resource usage
- **Monthly**: Update SSL certificates if needed, review security logs
- **Quarterly**: Performance optimization review, security audit

### Updates and Patches
1. Test updates in staging environment first
2. Schedule maintenance windows for production updates
3. Backup current configuration before updates
4. Follow rollback procedures if issues occur

---

**For additional support or questions, refer to the main project documentation or contact the development team.**

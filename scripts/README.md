# Agrinova Server Management Scripts

This directory contains utilities for managing the Agrinova API server startup and resolving port conflicts.

## 🛠️ Available Tools

### Port Manager (`port-manager.js`)

A Node.js utility for managing port conflicts and ensuring smooth server startup.

**Commands:**
```bash
# Check if port 8080 is in use
node scripts/port-manager.js check 8080

# Kill process using port 8080
node scripts/port-manager.js kill 8080

# Find next available port
node scripts/port-manager.js find 8080

# Safe startup - kill conflicting process or find alternative
node scripts/port-manager.js startup 8080
```

### Startup Scripts

#### Windows Batch Script (`start-api-server.bat`)
Double-click to run or execute from command line:
```cmd
scripts\start-api-server.bat
```

#### PowerShell Script (`start-api-server.ps1`)
Execute from PowerShell:
```powershell
.\scripts\start-api-server.ps1
```

## 🚀 Quick Start Commands

### From Root Directory

```bash
# Check port availability
npm run port:check

# Kill process on port 8080  
npm run port:kill

# Find alternative port
npm run port:find

# Safe API server startup
npm run start:api:safe
```

### Direct Script Execution

```bash
# Windows - Double-click or run from cmd
scripts\start-api-server.bat

# PowerShell
powershell -ExecutionPolicy Bypass -File scripts\start-api-server.ps1

# Cross-platform Node.js
node scripts/port-manager.js startup 8080
```

## 🔧 Troubleshooting Common Issues

### Port 8080 Already in Use

**Problem:** `EADDRINUSE: address already in use :::8080`

**Solution:**
1. Kill the conflicting process:
   ```bash
   npm run port:kill
   ```
2. Or use safe startup:
   ```bash
   npm run start:api:safe
   ```

### Multiple Node.js Processes

**Problem:** Multiple development servers running

**Solution:**
1. Check all processes on port 8080:
   ```bash
   npm run port:check
   ```
2. Kill all Node.js processes (Windows):
   ```cmd
   taskkill /F /IM node.exe
   ```
3. Start server safely:
   ```bash
   npm run start:api:safe
   ```

### Permission Issues (PowerShell)

**Problem:** PowerShell execution policy preventing script execution

**Solution:**
```powershell
# Temporarily allow script execution
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# Then run the script
.\scripts\start-api-server.ps1
```

## 🎯 Best Practices

1. **Always use safe startup** when working with multiple developers:
   ```bash
   npm run start:api:safe
   ```

2. **Check port availability** before debugging connection issues:
   ```bash
   npm run port:check
   ```

3. **Use batch/PowerShell scripts** for consistent startup environment

4. **Kill processes cleanly** to avoid zombie processes:
   ```bash
   npm run port:kill
   ```

## 🔍 Port Management Features

- **Cross-platform compatibility** (Windows, macOS, Linux)
- **Process identification** with detailed information
- **Safe process termination** with verification
- **Alternative port detection** when conflicts occur
- **Comprehensive error handling** and user feedback
- **Integration with npm scripts** for convenience

## 📊 Script Status

| Script | Platform | Status | Purpose |
|--------|----------|--------|---------|
| `port-manager.js` | Cross-platform | ✅ Ready | Port conflict resolution |
| `start-api-server.bat` | Windows | ✅ Ready | Windows batch startup |
| `start-api-server.ps1` | Windows | ✅ Ready | PowerShell startup |
| npm scripts | Cross-platform | ✅ Ready | Convenient commands |

## 🚨 Important Notes

- **Port 8080** is the default API server port
- **Always stop development servers** properly with Ctrl+C
- **Use safe startup scripts** to prevent conflicts
- **Check process ownership** before killing processes
- **Backup important work** before terminating processes

---

*For more information about the Agrinova system architecture, see the main project documentation.*
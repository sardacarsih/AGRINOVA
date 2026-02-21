# 🌐 WSL-Windows Server Access Guide

## 🎯 Quick Access Summary

**Server is running in WSL and accessible from Windows via:**
- ✅ **Method 1**: Direct WSL IP Access (Recommended)
- ✅ **Method 2**: Windows Port Forwarding
- ✅ **Method 3**: WSL Bridge Networking

---

## 🔍 Current Server Configuration

**Status**: ✅ GraphQL Server running in WSL
- **Host**: `0.0.0.0` (listening on all interfaces)
- **Port**: `8080`
- **CORS**: Updated to support Windows host access
- **Endpoints**:
  - GraphQL API: `/graphql`
  - Playground: `/playground`
  - Health: `/health`

---

## 🚀 Method 1: Direct WSL IP Access (Recommended)

### **Step 1: Get WSL IP Address**

**In WSL terminal**:
```bash
# Get WSL IP address
ip addr show eth0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1

# Or simpler:
hostname -I | awk '{print $1}'
```

**Example output**: `172.25.240.123`

### **Step 2: Access from Windows**

**Open Windows browser and navigate to**:
- **GraphQL Playground**: `http://172.25.240.123:8080/playground`
- **GraphQL API**: `http://172.25.240.123:8080/graphql`
- **Health Check**: `http://172.25.240.123:8080/health`

**Replace `172.25.240.123` with your actual WSL IP**

### **Step 3: Test Connection**

**Test with PowerShell**:
```powershell
# Test health endpoint
Invoke-WebRequest -Uri "http://172.25.240.123:8080/health"

# Test GraphQL endpoint
$body = @{
    query = "query { __schema { types { name } } }"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://172.25.240.123:8080/graphql" -Method POST -Body $body -ContentType "application/json"
```

### **Advantages:**
- ✅ Simple and direct
- ✅ No additional configuration needed
- ✅ Works immediately
- ✅ Best performance

### **Considerations:**
- ⚠️ WSL IP can change after restart
- ⚠️ Need to update IP if WSL restarts

---

## 🔧 Method 2: Windows Port Forwarding

### **Step 1: Setup Port Forwarding**

**Run as Administrator in Windows PowerShell**:

```powershell
# Get WSL IP first (run in WSL)
wsl hostname -I

# Setup port forwarding (replace 172.25.240.123 with actual WSL IP)
netsh interface portproxy add v4tov4 listenport=8080 connectaddress=172.25.240.123 connectport=8080

# Verify forwarding rule
netsh interface portproxy show v4tov4
```

### **Step 2: Configure Windows Firewall**

```powershell
# Add firewall rule for port 8080
New-NetFirewallRule -DisplayName "WSL GraphQL Server" -Direction Inbound -Port 8080 -Protocol TCP -Action Allow
```

### **Step 3: Access from Windows**

**Now you can access using Windows localhost**:
- **GraphQL Playground**: `http://localhost:8080/playground`
- **GraphQL API**: `http://localhost:8080/graphql`
- **Health Check**: `http://localhost:8080/health`

### **Step 4: Cleanup (Optional)**

**To remove port forwarding**:
```powershell
# Remove port forwarding rule
netsh interface portproxy delete v4tov4 listenport=8080

# Remove firewall rule
Remove-NetFirewallRule -DisplayName "WSL GraphQL Server"
```

### **Advantages:**
- ✅ Use familiar `localhost:8080`
- ✅ Works from any Windows application
- ✅ Persistent across sessions

### **Considerations:**
- ⚠️ Requires Administrator privileges
- ⚠️ Need to update if WSL IP changes
- ⚠️ Additional network layer

---

## 🌉 Method 3: WSL Bridge Networking (Advanced)

### **Step 1: Create .wslconfig File**

**Create/edit `C:\Users\<username>\.wslconfig`**:
```ini
[wsl2]
networkingMode=bridged
vmSwitch=WSLBridge
dhcp=true
```

### **Step 2: Create Virtual Switch**

**Run as Administrator in PowerShell**:
```powershell
# Create Hyper-V virtual switch for WSL
New-VMSwitch -Name "WSLBridge" -NetAdapterName "Ethernet" -AllowManagementOS $true
```

### **Step 3: Restart WSL**

**In PowerShell**:
```powershell
# Shutdown WSL
wsl --shutdown

# Restart WSL (any WSL command)
wsl hostname -I
```

### **Step 4: Access Server**

**WSL will now have an IP on your local network**:
- Check new IP: `ip addr show eth0`
- Access via new IP: `http://<NEW_IP>:8080/playground`

### **Advantages:**
- ✅ WSL gets real network IP
- ✅ Accessible from any device on network
- ✅ Most flexible networking

### **Considerations:**
- ⚠️ Requires Hyper-V (Windows Pro/Enterprise)
- ⚠️ Changes WSL networking fundamentally
- ⚠️ May affect other WSL applications

---

## 🧪 Testing & Verification

### **Method 1: Browser Test**
1. Open Windows browser
2. Navigate to GraphQL Playground URL
3. Try basic login query:
```graphql
mutation TestLogin {
  login(input: {
    identifier: "mandor1"
    password: "demo123"
    platform: WEB
  }) {
    accessToken
    user {
      username
      nama
      role
    }
  }
}
```

### **Method 2: PowerShell Test**
```powershell
# Replace with your actual WSL IP
$wslIP = "172.25.240.123"

# Test health endpoint
$health = Invoke-WebRequest -Uri "http://$wslIP:8080/health"
Write-Host "Health Status: $($health.StatusCode)"

# Test GraphQL login
$loginQuery = @{
    query = 'mutation { login(input: { identifier: "mandor1", password: "demo123", platform: WEB }) { accessToken user { username role } } }'
} | ConvertTo-Json

$loginResult = Invoke-WebRequest -Uri "http://$wslIP:8080/graphql" -Method POST -Body $loginQuery -ContentType "application/json"
Write-Host "Login Result: $($loginResult.StatusCode)"
```

### **Method 3: curl Test (WSL)**
```bash
# Test from WSL itself
curl -X GET http://localhost:8080/health

# Test from Windows (replace IP)
curl -X POST http://172.25.240.123:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { __schema { types { name } } }"}'
```

---

## 🔍 Network Discovery Commands

### **Find WSL IP from Windows**
```powershell
# Method 1: WSL command
wsl hostname -I

# Method 2: Using WSL ip command
wsl ip addr show eth0 | findstr "inet "

# Method 3: Check routing table
route print | findstr "172.25.240"
```

### **Find WSL IP from WSL**
```bash
# Method 1: hostname command
hostname -I | awk '{print $1}'

# Method 2: ip command
ip addr show eth0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1

# Method 3: ifconfig (if available)
ifconfig eth0 | grep 'inet ' | awk '{print $2}'
```

### **Test Network Connectivity**
```bash
# From WSL - test if server is accessible
curl -X GET http://localhost:8080/health

# Test external interface
curl -X GET http://$(hostname -I | awk '{print $1}'):8080/health
```

```powershell
# From Windows - test WSL server
Test-NetConnection -ComputerName "172.25.240.123" -Port 8080

# Test with telnet
telnet 172.25.240.123 8080
```

---

## 🛠️ Troubleshooting Guide

### **Problem: Can't connect from Windows**

**Solutions:**
1. **Check WSL IP**:
   ```bash
   # In WSL
   ip addr show eth0
   ```

2. **Verify Server is Running**:
   ```bash
   # Check if port is listening
   netstat -tulpn | grep :8080
   ```

3. **Test from WSL First**:
   ```bash
   curl http://localhost:8080/health
   ```

4. **Check Windows Firewall**:
   ```powershell
   # Check if port 8080 is blocked
   Test-NetConnection -ComputerName "127.0.0.1" -Port 8080
   ```

### **Problem: CORS Errors**

**Solution**: CORS is now configured for private IP ranges:
- `http://127.0.0.1:*`
- `http://172.16.0.0/12` (includes WSL default range)
- `http://192.168.0.0/16`
- `http://10.0.0.0/8`

### **Problem: Port Already in Use**

**Check what's using port 8080**:
```powershell
# Windows
netstat -ano | findstr :8080

# WSL/Linux
lsof -i :8080
```

### **Problem: WSL IP Changes**

**Solutions:**
1. **Create PowerShell function**:
```powershell
# Add to PowerShell profile
function Get-WSLServerURL {
    $wslIP = (wsl hostname -I).Trim()
    return "http://$wslIP:8080"
}

# Usage
$serverURL = Get-WSLServerURL
Start-Process "$serverURL/playground"
```

2. **Use Windows hosts file**:
```
# Add to C:\Windows\System32\drivers\etc\hosts
172.25.240.123 wsl-graphql
```
Then access: `http://wsl-graphql:8080/playground`

### **Problem: Server Logs Show Connection Refused**

**Check server binding**:
1. **Verify server host configuration**:
   ```bash
   # Should be 0.0.0.0, not 127.0.0.1
   grep "AGRINOVA_SERVER_HOST" .env
   ```

2. **Check if server accepts external connections**:
   ```bash
   netstat -tulpn | grep :8080
   # Should show 0.0.0.0:8080, not 127.0.0.1:8080
   ```

---

## 📋 Quick Reference Commands

### **Get WSL IP**
```bash
hostname -I | awk '{print $1}'
```

### **Test Server Health**
```bash
# From WSL
curl http://localhost:8080/health

# From Windows (PowerShell)
Invoke-WebRequest -Uri "http://$(wsl hostname -I | Out-String).Trim():8080/health"
```

### **Open GraphQL Playground from PowerShell**
```powershell
$wslIP = (wsl hostname -I).Trim()
Start-Process "http://$wslIP:8080/playground"
```

### **Setup Port Forwarding (Admin PowerShell)**
```powershell
$wslIP = (wsl hostname -I).Trim()
netsh interface portproxy add v4tov4 listenport=8080 connectaddress=$wslIP connectport=8080
```

---

## 🎯 Recommended Workflow

### **For Development (Quick Start)**
1. **Get WSL IP**: `hostname -I | awk '{print $1}'`
2. **Access GraphQL Playground**: `http://<WSL_IP>:8080/playground`
3. **Bookmark the URL** for easy access

### **For Persistent Access**
1. **Use Method 2 (Port Forwarding)** for consistent `localhost:8080` access
2. **Set up PowerShell function** to automatically get WSL IP
3. **Create Windows shortcut** to GraphQL Playground

### **For Production/Team Use**
1. **Consider Method 3 (Bridge Networking)** for network-wide access
2. **Document the specific IP range** used in your environment
3. **Set up proper DNS resolution** if needed

---

## 📱 Mobile Testing from Windows Network

If using Method 3 (Bridge Networking), your GraphQL server will be accessible from mobile devices on the same network:

1. **Find WSL bridge IP**: `ip addr show eth0`
2. **Test from mobile browser**: `http://<BRIDGE_IP>:8080/playground`
3. **Use for mobile app development** with the WSL IP

---

## 🔐 Security Considerations

### **Development Mode**
- ✅ Current configuration is suitable for development
- ✅ CORS allows local and private network access
- ✅ Debug mode provides detailed error messages

### **Production Deployment**
- ⚠️ Update CORS origins to specific domains
- ⚠️ Use HTTPS instead of HTTP
- ⚠️ Configure proper firewall rules
- ⚠️ Use production database configuration

---

## 📝 Summary

**Three methods available to access WSL GraphQL server from Windows:**

| Method | URL Format | Complexity | Persistence | Best For |
|--------|------------|------------|-------------|----------|
| **Direct IP** | `http://<WSL_IP>:8080` | Easy | Session | Quick testing |
| **Port Forward** | `http://localhost:8080` | Medium | Persistent | Daily development |
| **Bridge Network** | `http://<BRIDGE_IP>:8080` | Advanced | Persistent | Team/mobile development |

**🚀 Quick Start**: Use Method 1 (Direct IP) for immediate access, then setup Method 2 (Port Forwarding) for daily development work.

**All methods provide full access to:**
- ✅ GraphQL API (`/graphql`)
- ✅ GraphQL Playground (`/playground`)
- ✅ Health Check (`/health`)
- ✅ Authentication system
- ✅ All GraphQL mutations and queries
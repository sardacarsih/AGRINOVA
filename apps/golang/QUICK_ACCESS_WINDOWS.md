# 🚀 Quick Access - WSL GraphQL Server dari Windows

## 📍 Current WSL IP Address: `172.27.151.93`

### 🎯 **Akses Langsung dari Windows Browser**

**Buka browser Windows dan navigasi ke:**

- **📊 GraphQL Playground**: `http://172.27.151.93:8080/playground`
- **🔗 GraphQL API**: `http://172.27.151.93:8080/graphql`  
- **🏥 Health Check**: `http://172.27.151.93:8080/health`

### ⚡ **Test Login di GraphQL Playground**

Copy-paste mutation ini di GraphQL Playground:

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

### 🔍 **Jika IP WSL Berubah**

**Cara cek IP WSL terbaru:**

```bash
# Di WSL terminal
hostname -I | awk '{print $1}'
```

**Atau dari PowerShell Windows:**
```powershell
wsl hostname -I
```

### 🛠️ **Setup Port Forwarding (Optional)**

**Untuk akses via localhost:8080 dari Windows:**

1. **Buka PowerShell as Administrator**
2. **Jalankan command:**
```powershell
# Get WSL IP
$wslIP = (wsl hostname -I).Trim()

# Setup port forwarding
netsh interface portproxy add v4tov4 listenport=8080 connectaddress=$wslIP connectport=8080

# Add firewall rule
New-NetFirewallRule -DisplayName "WSL GraphQL Server" -Direction Inbound -Port 8080 -Protocol TCP -Action Allow
```

3. **Akses via**: `http://localhost:8080/playground`

### ❌ **Troubleshooting**

**Jika tidak bisa akses:**

1. **Cek server status di WSL:**
   ```bash
   curl http://localhost:8080/health
   ```

2. **Cek IP WSL:**
   ```bash
   ip addr show eth0 | grep 'inet '
   ```

3. **Test dari WSL ke external interface:**
   ```bash
   curl http://$(hostname -I | awk '{print $1}'):8080/health
   ```

### 📋 **Status Saat Ini**

- ✅ **Server**: Berjalan di WSL port 8080
- ✅ **CORS**: Dikonfigurasi untuk private IP ranges
- ✅ **Database**: Terkoneksi dengan relationship management
- ✅ **Authentication**: Sistem JWT aktif
- ✅ **GraphQL Playground**: Tersedia dan berfungsi
- ✅ **Health Check**: Endpoint aktif

### 📚 **Dokumentasi Lengkap**

Lihat file `WSL_WINDOWS_ACCESS_GUIDE.md` untuk panduan lengkap dengan 3 metode akses dan troubleshooting detail.
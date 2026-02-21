# 🧪 cURL Login Testing Commands

## Quick Copy-Paste Commands for Terminal Testing

### 🔴 Super Admin (username: superadmin)
```bash
curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d "{\"query\":\"mutation WebLogin(\$input: WebLoginInput!) { webLogin(input: \$input) { success message user { id username nama role } companies { id nama } sessionId } }\",\"variables\":{\"input\":{\"identifier\":\"superadmin\",\"password\":\"demo123\"}}}"
```

### 🟠 Company Admin (username: companyadmin)
```bash
curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d "{\"query\":\"mutation WebLogin(\$input: WebLoginInput!) { webLogin(input: \$input) { success message user { id username nama role } companies { id nama } sessionId } }\",\"variables\":{\"input\":{\"identifier\":\"companyadmin\",\"password\":\"demo123\"}}}"
```

### 🟢 Manager (username: manager)
```bash
curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d "{\"query\":\"mutation WebLogin(\$input: WebLoginInput!) { webLogin(input: \$input) { success message user { id username nama role } companies { id nama } sessionId } }\",\"variables\":{\"input\":{\"identifier\":\"manager\",\"password\":\"demo123\"}}}"
```

### 🔵 Asisten (username: asisten)
```bash
curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d "{\"query\":\"mutation WebLogin(\$input: WebLoginInput!) { webLogin(input: \$input) { success message user { id username nama role } companies { id nama } sessionId } }\",\"variables\":{\"input\":{\"identifier\":\"asisten\",\"password\":\"demo123\"}}}"
```

### 🟡 Mandor (username: mandor)
```bash
curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d "{\"query\":\"mutation WebLogin(\$input: WebLoginInput!) { webLogin(input: \$input) { success message user { id username nama role } companies { id nama } sessionId } }\",\"variables\":{\"input\":{\"identifier\":\"mandor\",\"password\":\"demo123\"}}}"
```

### 🟣 Satpam (username: satpam)
```bash
curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d "{\"query\":\"mutation WebLogin(\$input: WebLoginInput!) { webLogin(input: \$input) { success message user { id username nama role } companies { id nama } sessionId } }\",\"variables\":{\"input\":{\"identifier\":\"satpam\",\"password\":\"demo123\"}}}"
```

### ⚖️ Timbangan (username: TIMBANGAN)
```bash
curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d "{\"query\":\"mutation WebLogin(\$input: WebLoginInput!) { webLogin(input: \$input) { success message user { id username nama role } companies { id nama } sessionId } }\",\"variables\":{\"input\":{\"identifier\":\"TIMBANGAN\",\"password\":\"demo123\"}}}"
```

### 🎯 Grading (username: GRADING)
```bash
curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d "{\"query\":\"mutation WebLogin(\$input: WebLoginInput!) { webLogin(input: \$input) { success message user { id username nama role } companies { id nama } sessionId } }\",\"variables\":{\"input\":{\"identifier\":\"GRADING\",\"password\":\"demo123\"}}}"
```

---

## 📋 Testing with Email-based Credentials

### Super Admin (email)
```bash
curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d "{\"query\":\"mutation WebLogin(\$input: WebLoginInput!) { webLogin(input: \$input) { success message user { id username nama role } companies { id nama } sessionId } }\",\"variables\":{\"input\":{\"identifier\":\"super-admin@agrinova.com\",\"password\":\"demo123\"}}}"
```

### Company Admin (email)
```bash
curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d "{\"query\":\"mutation WebLogin(\$input: WebLoginInput!) { webLogin(input: \$input) { success message user { id username nama role } companies { id nama } sessionId } }\",\"variables\":{\"input\":{\"identifier\":\"company-admin@agrinova.com\",\"password\":\"demo123\"}}}"
```

### Manager (email)
```bash
curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d "{\"query\":\"mutation WebLogin(\$input: WebLoginInput!) { webLogin(input: \$input) { success message user { id username nama role } companies { id nama } sessionId } }\",\"variables\":{\"input\":{\"identifier\":\"manager-agrinova@agrinova.com\",\"password\":\"demo123\"}}}"
```

---

## 🔧 PowerShell Commands (Windows)

### Super Admin
```powershell
$body = '{"query":"mutation WebLogin($input: WebLoginInput!) { webLogin(input: $input) { success message user { id username nama role } companies { id nama } sessionId } }","variables":{"input":{"identifier":"superadmin","password":"demo123"}}}' 
Invoke-RestMethod -Uri http://localhost:8080/graphql -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json -Depth 10
```

### Company Admin
```powershell
$body = '{"query":"mutation WebLogin($input: WebLoginInput!) { webLogin(input: $input) { success message user { id username nama role } companies { id nama } sessionId } }","variables":{"input":{"identifier":"companyadmin","password":"demo123"}}}' 
Invoke-RestMethod -Uri http://localhost:8080/graphql -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json -Depth 10
```

### Manager
```powershell
$body = '{"query":"mutation WebLogin($input: WebLoginInput!) { webLogin(input: $input) { success message user { id username nama role } companies { id nama } sessionId } }","variables":{"input":{"identifier":"manager","password":"demo123"}}}' 
Invoke-RestMethod -Uri http://localhost:8080/graphql -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json -Depth 10
```

---

## 🚀 Run All Tests

### Bash/Linux/Mac
```bash
bash test-login-curl.sh
```

### PowerShell/Windows
```powershell
.\test-login-curl.ps1
```

---

## 📊 Expected Response Format

```json
{
  "data": {
    "webLogin": {
      "success": true,
      "message": "Login successful",
      "user": {
        "id": "...",
        "username": "admin",
        "nama": "Super Admin",
        "role": "SUPER_ADMIN"
      },
      "companies": [
        {
          "id": "...",
          "nama": "PT Agrinova Sentosa"
        }
      ],
      "sessionId": "..."
    }
  }
}
```

---

## ❌ Error Response Format

```json
{
  "data": {
    "webLogin": {
      "success": false,
      "message": "Invalid credentials",
      "user": null,
      "companies": [],
      "sessionId": null
    }
  }
}
```

---

## 💡 Tips

1. **Pretty Print JSON**: Add `| jq '.'` to bash commands for formatted output
2. **Save Response**: Add `> response.json` to save the response
3. **Check Backend**: Ensure Go server is running on port 8080
4. **Check Database**: Verify users exist with correct passwords

---

## 🔍 Troubleshooting

### Connection Refused
```bash
# Check if backend is running
curl http://localhost:8080/health
```

### Invalid Credentials
- Verify password is `demo123` in database
- Check username spelling (case-sensitive for TIMBANGAN/GRADING)
- Ensure database is seeded properly

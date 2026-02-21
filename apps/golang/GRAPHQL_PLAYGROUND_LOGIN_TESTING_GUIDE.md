# 📊 GraphQL Playground Login Testing Guide

## 🚀 Quick Start

**GraphQL Playground URL**: `http://localhost:8080/playground`

This guide provides comprehensive examples for testing the Agrinova GraphQL authentication system using the built-in GraphQL Playground.

---

## 👥 Available Test Users

All test users have the password: `demo123`

| Username | Role | Company | Purpose | Access Level |
|----------|------|---------|---------|--------------|
| `superadmin` | SUPER_ADMIN | PT Agrinova | System administration | Full system access |
| `companyadmin1` | COMPANY_ADMIN | PT Agrinova | Company management | Company-wide access |
| `areamanager1` | AREA_MANAGER | PT Agrinova | Multi-company oversight | Cross-company access |
| `manager1` | MANAGER | PT Agrinova | Estate management | Estate-level access |
| `asisten1` | ASISTEN | PT Agrinova | Harvest approval | Division-level access |
| `mandor1` | MANDOR | PT Agrinova | Data input | Field-level access |
| `satpam1` | SATPAM | PT Agrinova | Gate check operations | Security access |

---

## 🔐 Basic Authentication Tests

### 1. Basic Web Login

Copy this mutation into GraphQL Playground:

```graphql
mutation BasicWebLogin {
  login(input: {
    identifier: "mandor1"
    password: "demo123"
    platform: WEB
  }) {
    accessToken
    refreshToken
    tokenType
    expiresIn
    expiresAt
    refreshExpiresAt
    user {
      id
      username
      nama
      email
      role
      isActive
      company {
        id
        nama
      }
    }
    assignments {
      companies {
        id
        nama
      }
      estates {
        id
        nama
        lokasi
        company {
          nama
        }
      }
      divisions {
        id
        nama
        kode
        estate {
          nama
        }
      }
    }
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "login": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenType": "Bearer",
      "expiresIn": 900,
      "expiresAt": "2025-09-11T01:39:00Z",
      "refreshExpiresAt": "2025-09-18T00:54:00Z",
      "user": {
        "id": "f0000000-0000-0000-0000-000000000001",
        "username": "mandor1",
        "nama": "Mandor Divisi A",
        "email": "mandor1@agrinova.com",
        "role": "MANDOR",
        "isActive": true,
        "company": {
          "id": "01234567-89ab-cdef-0123-456789abcdef",
          "nama": "PT Agrinova Sawit Utama"
        }
      }
    }
  }
}
```

### 2. Super Admin Login

```graphql
mutation SuperAdminLogin {
  login(input: {
    identifier: "superadmin"
    password: "demo123"
    platform: WEB
  }) {
    accessToken
    refreshToken
    user {
      id
      username
      nama
      role
      company {
        nama
      }
    }
    assignments {
      companies {
        id
        nama
      }
    }
  }
}
```

### 3. Manager Login with Full Details

```graphql
mutation ManagerLoginDetailed {
  login(input: {
    identifier: "manager1"
    password: "demo123"
    platform: WEB
  }) {
    accessToken
    refreshToken
    tokenType
    expiresIn
    user {
      id
      username
      nama
      email
      noTelpon
      role
      isActive
      company {
        id
        nama
        alamat
        telepon
      }
    }
    assignments {
      companies {
        id
        nama
      }
      estates {
        id
        nama
        lokasi
        luasHa
      }
    }
  }
}
```

---

## 📱 Mobile Authentication Tests

### 1. Android Mobile Login

```graphql
mutation AndroidMobileLogin {
  login(input: {
    identifier: "satpam1"
    password: "demo123"
    platform: ANDROID
    deviceId: "android-device-12345"
    deviceFingerprint: "android-samsung-s21-fingerprint"
    deviceInfo: {
      model: "Samsung Galaxy S21"
      osVersion: "Android 12"
      appVersion: "1.2.0"
      deviceName: "Satpam Gate Device"
      screenResolution: "1080x2400"
      deviceLanguage: "id"
    }
    rememberDevice: true
    biometricHash: "biometric-hash-example"
  }) {
    accessToken
    refreshToken
    offlineToken
    tokenType
    expiresIn
    offlineExpiresAt
    user {
      id
      username
      nama
      role
    }
  }
}
```

### 2. iOS Mobile Login

```graphql
mutation iOSMobileLogin {
  login(input: {
    identifier: "asisten1"
    password: "demo123"
    platform: IOS
    deviceId: "ios-device-67890"
    deviceFingerprint: "iphone-13-pro-fingerprint"
    deviceInfo: {
      model: "iPhone 13 Pro"
      osVersion: "iOS 15.4"
      appVersion: "1.2.0"
      deviceName: "Asisten iPad"
      screenResolution: "1170x2532"
      deviceLanguage: "id"
    }
    rememberDevice: false
  }) {
    accessToken
    refreshToken
    offlineToken
    offlineExpiresAt
    user {
      username
      nama
      role
    }
  }
}
```

---

## 🔄 Token Management Tests

### 1. Token Refresh

**Step 1**: First, login and copy the `refreshToken`:

```graphql
mutation GetRefreshToken {
  login(input: {
    identifier: "manager1"
    password: "demo123"
    platform: WEB
  }) {
    refreshToken
  }
}
```

**Step 2**: Use the refresh token:

```graphql
mutation RefreshAccessToken {
  refreshToken(input: {
    refreshToken: "PASTE_YOUR_REFRESH_TOKEN_HERE"
  }) {
    accessToken
    refreshToken
    tokenType
    expiresIn
    expiresAt
    user {
      username
      nama
      role
    }
  }
}
```

### 2. Mobile Token Refresh with Device Info

```graphql
mutation MobileRefreshToken {
  refreshToken(input: {
    refreshToken: "PASTE_YOUR_REFRESH_TOKEN_HERE"
    deviceId: "android-device-12345"
    deviceFingerprint: "android-samsung-s21-fingerprint"
  }) {
    accessToken
    refreshToken
    offlineToken
    user {
      username
      nama
    }
  }
}
```

---

## 🔍 Authenticated Query Tests

### 1. Setup Authentication Header

After successful login, copy the `accessToken` and add it to HTTP Headers (bottom-left panel):

```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN_HERE"
}
```

### 2. Get Current User Information

```graphql
query GetCurrentUser {
  me {
    id
    username
    nama
    email
    noTelpon
    role
    isActive
    createdAt
    updatedAt
    company {
      id
      nama
      alamat
      telepon
      status
    }
  }
}
```

### 3. Get User's Devices

```graphql
query GetMyDevices {
  myDevices {
    id
    deviceId
    deviceFingerprint
    platform
    deviceInfo {
      model
      osVersion
      appVersion
      deviceName
      screenResolution
      deviceLanguage
    }
    trustLevel
    isTrusted
    isAuthorized
    lastSeenAt
    createdAt
  }
}
```

### 4. Get All Users (Admin Only)

```graphql
query GetAllUsers {
  users {
    id
    username
    nama
    email
    role
    isActive
    company {
      nama
    }
  }
}
```

### 5. Get Specific User by ID

```graphql
query GetUserById {
  user(id: "f0000000-0000-0000-0000-000000000001") {
    id
    username
    nama
    email
    role
    company {
      nama
    }
  }
}
```

---

## 🎭 Role-Based Access Tests

### 1. Check Role Information

```graphql
query CheckRoleInfo {
  roleInfo(role: MANAGER) {
    role
    level
    name
    description
    permissions
    webAccess
    mobileAccess
  }
}
```

### 2. Get Complete Role Hierarchy

```graphql
query GetRoleHierarchy {
  roleHierarchyTree {
    level
    roles {
      role
      name
      description
      permissions
      webAccess
      mobileAccess
    }
  }
}
```

### 3. Check Role Access Permissions

```graphql
query CheckRoleAccess {
  checkRoleAccess(
    requesterRole: MANAGER
    targetRole: MANDOR
  ) {
    canAccess
    canManage
    canAssignRole
    requesterRole
    targetRole
    explanation
  }
}
```

### 4. Check Specific Permission

```graphql
query CheckPermission {
  checkRolePermission(
    role: ASISTEN
    permission: "approve_harvest"
  ) {
    hasPermission
    permission
    reason
  }
}
```

---

## 🛠️ Device Management Tests

### 1. Bind New Device

```graphql
mutation BindDevice {
  bindDevice(input: {
    deviceId: "new-device-123"
    deviceFingerprint: "new-device-fingerprint"
    platform: ANDROID
    deviceInfo: {
      model: "Xiaomi Redmi Note 11"
      osVersion: "Android 11"
      appVersion: "1.2.0"
      deviceName: "Backup Device"
      screenResolution: "1080x2400"
      deviceLanguage: "id"
    }
    biometricHash: "new-biometric-hash"
  }) {
    success
    message
    device {
      id
      deviceId
      platform
      trustLevel
      isTrusted
    }
    trustLevel
  }
}
```

### 2. Unbind Device

```graphql
mutation UnbindDevice {
  unbindDevice(deviceId: "device-id-to-remove") {
    # Returns Boolean
  }
}
```

---

## 🔐 Password Management Tests

### 1. Change Password

```graphql
mutation ChangePassword {
  changePassword(input: {
    currentPassword: "demo123"
    newPassword: "newdemo456"
    confirmPassword: "newdemo456"
    logoutOtherDevices: false
  }) {
    # Returns Boolean
  }
}
```

---

## 🚪 Logout Tests

### 1. Basic Logout

```graphql
mutation BasicLogout {
  logout
}
```

### 2. Logout from All Devices

```graphql
mutation LogoutAllDevices {
  logoutAllDevices
}
```

---

## ❌ Error Scenario Tests

### 1. Invalid Credentials

```graphql
mutation InvalidCredentials {
  login(input: {
    identifier: "mandor1"
    password: "wrongpassword"
    platform: WEB
  }) {
    accessToken
    user {
      username
    }
  }
}
```

**Expected Error Response:**
```json
{
  "errors": [
    {
      "message": "Invalid credentials",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ],
  "data": null
}
```

### 2. Non-existent User

```graphql
mutation NonExistentUser {
  login(input: {
    identifier: "nonexistentuser"
    password: "demo123"
    platform: WEB
  }) {
    accessToken
    user {
      username
    }
  }
}
```

### 3. Invalid Refresh Token

```graphql
mutation InvalidRefreshToken {
  refreshToken(input: {
    refreshToken: "invalid.refresh.token"
  }) {
    accessToken
  }
}
```

### 4. Unauthorized Query (without token)

Remove the Authorization header and try:

```graphql
query UnauthorizedQuery {
  me {
    username
  }
}
```

**Expected Error:**
```json
{
  "errors": [
    {
      "message": "Access denied",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Common Issues

1. **GraphQL Playground doesn't load**
   - ✅ Verify server is running: `http://localhost:8080/health`
   - ✅ Check server logs for errors
   - ✅ Ensure port 8080 is not blocked

2. **Login returns null or errors**
   - ✅ Check if database is seeded with test users
   - ✅ Verify password is exactly `demo123`
   - ✅ Check server logs for detailed error messages

3. **"Access denied" on authenticated queries**
   - ✅ Ensure Authorization header is set correctly
   - ✅ Check token format: `Bearer YOUR_TOKEN_HERE`
   - ✅ Verify token hasn't expired (15 min default)

4. **Mobile login issues**
   - ✅ Ensure deviceId and deviceFingerprint are provided
   - ✅ Check deviceInfo contains all required fields
   - ✅ Verify platform is set correctly (ANDROID/IOS)

### Verification Steps

1. **Check Server Health**
   ```
   curl http://localhost:8080/health
   ```

2. **Test GraphQL Endpoint**
   ```bash
   curl -X POST http://localhost:8080/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"query{__schema{types{name}}}"}'
   ```

3. **Check Database Connection**
   - Look for "Database connected successfully" in server logs
   - Verify PostgreSQL is running and accessible

### Server Logs

Monitor server output for detailed error messages:
- Authentication failures
- Database connection issues
- Token validation errors
- Permission denied messages

---

## 🎯 Testing Workflow

### Recommended Testing Order

1. **Start with Basic Web Login** using `mandor1` or `manager1`
2. **Test Authenticated Queries** like `me` and `myDevices`
3. **Try Different User Roles** to understand access levels
4. **Test Mobile Authentication** with device information
5. **Experiment with Token Refresh** functionality
6. **Test Role-Based Access Control** queries
7. **Try Error Scenarios** to understand error handling
8. **Test Device Management** features
9. **Verify Logout Functionality**

### Pro Tips

- **Copy Tokens Carefully**: Ensure no extra spaces when copying JWT tokens
- **Use Variables**: For repeated testing, use GraphQL variables instead of hardcoding values
- **Monitor Expiration**: Access tokens expire in 15 minutes by default
- **Check Response Structure**: Use GraphQL's introspection to explore available fields
- **Test Edge Cases**: Try empty strings, special characters, and boundary values

---

## 📝 Additional Notes

- All timestamps are in UTC format
- JWT tokens are stateless and contain user information
- Offline tokens (mobile) have 30-day validity
- Device fingerprinting enhances security for mobile devices
- Role hierarchy determines access permissions
- CORS is configured for `localhost:3000` and `localhost:8080`

---

**🚀 Ready to test! Open `http://localhost:8080/playground` and start with the Basic Web Login example above.**
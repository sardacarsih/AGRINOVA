# Agrinova API Documentation

## Overview

Agrinova menggunakan **GraphQL API** dengan endpoint tunggal untuk semua operasi.

**Endpoint:** `http://localhost:8080/graphql`  
**WebSocket:** `ws://localhost:8080/graphql` (subscriptions)

---

## 🔐 Authentication

### Headers

| Platform | Method | Header |
|----------|--------|--------|
| Web | Cookie | `Cookie: auth-session=<token>` |
| Mobile | JWT | `Authorization: Bearer <accessToken>` |

### Login Mutations

```graphql
# Web Login
mutation WebLogin($input: WebLoginInput!) {
  webLogin(input: $input) {
    success
    message
    user { id, username, role }
    sessionId
  }
}

# Mobile Login
mutation MobileLogin($input: MobileLoginInput!) {
  mobileLogin(input: $input) {
    accessToken
    refreshToken
    offlineToken
    user { id, username, role }
  }
}
```

---

## 📋 Role-Specific API Reference

### MANAGER

| Operation | Type | Description |
|-----------|------|-------------|
| `managerDashboard` | Query | Dashboard data |
| `managerMonitor` | Query | Real-time monitoring |
| `managerAnalytics` | Query | Analytics & charts |
| `managerMonitorUpdate` | Subscription | Live updates |

### ASISTEN

| Operation | Type | Description |
|-----------|------|-------------|
| `asistenDashboard` | Query | Dashboard data |
| `pendingApprovals` | Query | Approval list |
| `approveHarvest` | Mutation | Approve record |
| `rejectHarvest` | Mutation | Reject record |
| `batchApproval` | Mutation | Batch approve/reject |
| `asistenMonitoring` | Query | Monitoring data |

### MANDOR

| Operation | Type | Description |
|-----------|------|-------------|
| `mandorDashboard` | Query | Dashboard data |
| `mandorBlocks` | Query | Available blocks |
| `mandorEmployees` | Query | Available employees |
| `createMandorHarvest` | Mutation | Create harvest |
| `mandorHistory` | Query | Harvest history |
| `syncMandorHarvests` | Mutation | Sync offline data |

### SATPAM

| Operation | Type | Description |
|-----------|------|-------------|
| `satpamDashboard` | Query | Dashboard data |
| `vehiclesInside` | Query | Current vehicles |
| `registerGuest` | Mutation | Register guest |
| `validateSatpamQR` | Query | Validate QR |
| `processGuestExit` | Mutation | Process exit |
| `syncSatpamRecords` | Mutation | Sync offline data |

### COMPANY_ADMIN

| Operation | Type | Description |
|-----------|------|-------------|
| `companyAdminDashboard` | Query | Dashboard data |
| `companyUsers` | Query | User list |
| `createCompanyUser` | Mutation | Create user |
| `updateCompanyUser` | Mutation | Update user |
| `companySettings` | Query | Settings |

### SUPER_ADMIN

| Operation | Type | Description |
|-----------|------|-------------|
| `superAdminDashboard` | Query | System dashboard |
| `allCompanies` | Query | Company list |
| `createCompanyAdmin` | Mutation | Create company |
| `systemSettings` | Query | System settings |
| `featureFlags` | Query | Feature toggles |

---

## 📡 WebSocket Subscriptions

```graphql
# Manager real-time
subscription { managerMonitorUpdate { realtimeStats } }

# Asisten new submission
subscription { newHarvestSubmission { id, mandor, block } }

# Satpam alerts
subscription { satpamOverstayAlert { vehiclePlate, duration } }
```

---

## ⚠️ Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHENTICATED` | Token missing/expired |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Input validation failed |
| `CONFLICT` | Data conflict |

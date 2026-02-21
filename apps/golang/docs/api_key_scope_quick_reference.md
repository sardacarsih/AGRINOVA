# API Key Scope Implementation - Quick Reference

## 📋 Scope Definitions

### HRIS Integration
```go
employees:read    // Read employee data
employees:create  // Create new employees
employees:update  // Update employee data
employees:sync    // Trigger full sync
```

### Smart Mill Scale Integration
```go
weighing:read     // Read weighing data
weighing:create   // Create weighing records
weighing:update   // Update weighing data
weighing:sync     // Trigger sync
```

### Sync Monitoring (Optional)
```go
sync:status       // Check sync status
sync:logs         // Access sync logs
sync:retry        // Retry failed operations
```

## 🔧 Usage Examples

### Creating API Key (GraphQL)

```graphql
mutation CreateHRISKey {
  createAPIKey(input: {
    name: "HRIS Production"
    scopes: [
      "employees:read"
      "employees:create"
      "employees:update"
      "employees:sync"
      "sync:status"
      "sync:logs"
    ]
    expiresInDays: 365
  }) {
    apiKey { id name scopes expiresAt }
    plaintextKey
  }
}
```

### Using API Key (REST)

```bash
# Create employee (requires employees:create)
curl -X POST https://api.agrinova.com/api/external/hris/employees \
  -H "Authorization: Bearer ak_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"nik": "12345", "nama": "John Doe"}'

# Create weighing record (requires weighing:create)
curl -X POST https://api.agrinova.com/api/external/weighing/records \
  -H "Authorization: Bearer ak_live_yyyyy" \
  -H "Content-Type: application/json" \
  -d '{"nomorTiket": "TKT-001", "beratNetto": 17500}'
```

## 🛡️ Error Responses

### Insufficient Scope
```json
{
  "error": "insufficient_scope",
  "message": "API key does not have required permissions",
  "required_scopes": ["employees:create"],
  "provided_scopes": ["employees:read"],
  "missing_scopes": ["employees:create"]
}
```

### Invalid API Key
```json
{
  "error": "invalid_api_key",
  "message": "Invalid or expired API key"
}
```

## 📁 Files Created

1. **Backend**
   - `internal/auth/constants/scopes.go` - Scope constants and validation
   - `internal/auth/middleware/api_key_middleware.go` - Authentication & authorization
   - `internal/routes/external_integration_routes.go` - Example route handlers

2. **Documentation**
   - `api_key_scope_guide.md` - Comprehensive guide
   - `api_key_scope_quick_reference.md` - This file

## ✅ Next Steps

1. Update frontend to show scope selection UI
2. Add actual business logic to route handlers
3. Setup monitoring and logging
4. Test with real HRIS and Smart Mill Scale systems

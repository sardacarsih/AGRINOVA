# Feature-Based Authorization System

A flexible, high-performance feature-based authorization system for the Agrinova agricultural management platform.

## Overview

This module replaces traditional role-based access control (RBAC) with a more granular feature-based approach that supports:

- **Hierarchical Features**: Organize features in parent-child relationships
- **Feature Composition**: Child features are automatically granted with parent features
- **Scoped Access**: Restrict features to specific resources (company, estate, division, block)
- **User Overrides**: Grant or deny features at the individual user level
- **High Performance**: <5ms feature resolution with intelligent caching
- **Flexible Authorization**: Mix role-based and user-specific feature grants

## Architecture

```
features/
├── models/              # Data models and types
│   └── feature_models.go
├── services/            # Business logic
│   ├── feature_service.go              # CRUD operations
│   ├── feature_composition_service.go   # High-performance resolution
│   └── migration_service.go             # RBAC→Features migration
├── resolvers/           # GraphQL resolvers
│   └── feature_resolver.go
└── README.md
```

## Quick Start

### 1. Run Migrations

```bash
cd apps/golang
go run cmd/server/main.go
# Migrations run automatically on startup
```

### 2. Seed System Features

System features are seeded automatically via migration `000006_seed_system_features.go`.

### 3. GraphQL API

```graphql
# List all features
query {
  listFeatures(page: 1, limit: 50) {
    features {
      name
      displayName
      module
    }
  }
}

# Check user access
query {
  checkUserFeature(input: {
    userId: "user-uuid"
    feature: "harvest.approve"
  }) {
    hasAccess
  }
}
```

### 4. Using in Resolvers

```go
import (
    "agrinovagraphql/server/internal/middleware"
    "agrinovagraphql/server/internal/features/models"
)

func (r *Resolver) CreateHarvest(ctx context.Context, input HarvestInput) (*Harvest, error) {
    // Check feature access
    if err := featureMiddleware.RequireFeature(ctx, "harvest.create", nil); err != nil {
        return nil, err
    }

    // Your business logic here
    return createHarvest(input)
}

// With scoped access
func (r *Resolver) ApproveHarvest(ctx context.Context, harvestID string) (*Harvest, error) {
    harvest, _ := getHarvest(harvestID)

    // Check scoped feature
    scope := &models.FeatureScope{
        Type: "estate",
        ID:   harvest.EstateID,
    }

    if err := featureMiddleware.RequireFeature(ctx, "harvest.approve", scope); err != nil {
        return nil, err
    }

    return approveHarvest(harvest)
}
```

## Feature Hierarchy

Features are organized hierarchically:

```
harvest
├── harvest.view
│   └── harvest.view.detailed
├── harvest.create
├── harvest.edit
│   ├── harvest.edit.own
│   └── harvest.edit.any
├── harvest.approve
├── harvest.reject
└── harvest.delete
```

When a user has the `harvest` feature, they automatically get all child features (`harvest.view`, `harvest.create`, etc.).

## Feature Scopes

Features can be scoped to specific resources:

- **Global**: No scope (applies everywhere)
- **Company**: Scoped to a specific company
- **Estate**: Scoped to a specific estate
- **Division**: Scoped to a specific division
- **Block**: Scoped to a specific block

Example: User A can `harvest.approve` in Estate X but not Estate Y.

## System Features

The following features are seeded automatically:

### Harvest Module
- `harvest.view` - View harvest records
- `harvest.create` - Create harvest records
- `harvest.edit` - Edit harvest records
- `harvest.approve` - Approve harvest records
- `harvest.reject` - Reject harvest records
- `harvest.delete` - Delete harvest records

### Gate Check Module
- `gatecheck.view` - View gate check records
- `gatecheck.perform` - Perform gate checks
- `gatecheck.approve` - Approve gate checks
- `gatecheck.override` - Override gate check decisions

### User Management Module
- `user.view` - View users
- `user.create` - Create users
- `user.edit` - Edit users
- `user.delete` - Delete users
- `user.manage` - Full user management

### Company Management Module
- `company.view` - View companies
- `company.create` - Create companies
- `company.edit` - Edit companies
- `company.delete` - Delete companies
- `company.manage` - Full company management

### Reports Module
- `reports.view` - View reports
- `reports.export` - Export reports
- `reports.create` - Create custom reports

### Admin Module
- `admin.full_access` - Complete system access

## Performance

### Caching Strategy

1. **Feature Cache**: In-memory cache of all features
2. **Role Feature Cache**: Cached role→features mappings
3. **User Feature Cache**: 5-minute TTL for user feature sets
4. **Background Refresh**: Automatic cache refresh every 5 minutes

### Metrics

Monitor performance with:

```graphql
query {
  getFeatureStats {
    cacheHitRate          # Target: >95%
    averageCheckLatencyMs # Target: <5ms
    totalFeatures
    activeFeatures
  }
}
```

### Optimization Tips

1. Use batch checks (`checkUserFeatures`) instead of multiple individual checks
2. Leverage feature hierarchy - grant parent features when possible
3. Use role-based features for common patterns, user overrides for exceptions
4. Monitor cache hit rate and latency

## API Reference

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

See [TEST_QUERIES.md](./TEST_QUERIES.md) for example queries and mutations.

## Database Schema

### features Table

```sql
CREATE TABLE features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    parent_id UUID REFERENCES features(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

### role_features Table

```sql
CREATE TABLE role_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    inherited_from_role_id UUID REFERENCES rbac_roles(id),
    is_denied BOOLEAN DEFAULT false,
    granted_at TIMESTAMP DEFAULT NOW(),
    granted_by UUID NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

### user_features Table

```sql
CREATE TABLE user_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    is_granted BOOLEAN NOT NULL,
    scope_type VARCHAR(20),  -- company, estate, division, block
    scope_id UUID,
    effective_from TIMESTAMP,
    expires_at TIMESTAMP,
    granted_by UUID NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

## Migration from RBAC

To migrate from traditional RBAC to feature-based authorization:

### 1. Create Feature Mappings

Map existing permissions to features:

```go
permissionToFeature := map[string]string{
    "harvest:read":   "harvest.view",
    "harvest:create": "harvest.create",
    "harvest:update": "harvest.edit",
    "harvest:delete": "harvest.delete",
    "harvest:approve": "harvest.approve",
}
```

### 2. Run Migration Service

```go
import "agrinovagraphql/server/internal/features/services"

migrationService := services.NewMigrationService(db)
err := migrationService.MigrateFromRBAC(ctx)
```

### 3. Update Resolvers

Replace RBAC checks:

```go
// Old RBAC approach
if !rbacService.HasPermission(ctx, userID, "harvest:approve") {
    return nil, errors.New("unauthorized")
}

// New feature-based approach
if err := featureMiddleware.RequireFeature(ctx, "harvest.approve", nil); err != nil {
    return nil, err
}
```

### 4. Test Feature Resolution

Verify that users have the correct features:

```graphql
query {
  getUserFeatures(userId: "user-uuid") {
    features
  }
}
```

## Testing

### Unit Tests

```bash
cd apps/golang/internal/features/services
go test -v
```

### Integration Tests

```bash
# Start server
go run cmd/server/main.go

# Run GraphQL tests
cd apps/golang/internal/features
# Use queries from TEST_QUERIES.md
```

### Performance Tests

```bash
# Benchmark feature resolution
go test -bench=BenchmarkFeatureResolution -benchmem
```

## Configuration

### Environment Variables

No specific environment variables required. Feature system uses the same database configuration as the main application.

### Cache Configuration

Cache settings are in `feature_composition_service.go`:

```go
// User feature cache TTL
expiresAt = time.Now().Add(5 * time.Minute)

// Background refresh interval
refreshInterval = 5 * time.Minute
```

Adjust these values based on your performance requirements and update frequency.

## Troubleshooting

### Feature Resolution is Slow

**Symptoms**: Feature checks taking >5ms

**Solutions**:
1. Check cache hit rate: `getFeatureStats { cacheHitRate }`
2. Ensure background refresh is running
3. Reduce cache TTL if features change frequently
4. Check database query performance

### User Missing Expected Features

**Symptoms**: User doesn't have features they should have

**Solutions**:
1. Check role features: `getRoleFeatures(roleName: "ROLE_NAME")`
2. Check user overrides: `getUserFeatureOverrides(userId: "user-id")`
3. Verify feature hierarchy: `getFeatureHierarchy`
4. Check for denials overriding grants
5. Verify feature expiration times

### Cannot Delete Feature

**Symptoms**: `deleteFeature` mutation fails

**Solutions**:
1. Check if feature is a system feature (`isSystem: true`)
2. System features cannot be deleted
3. Verify you have SUPER_ADMIN role

### Cache Not Refreshing

**Symptoms**: Feature changes not reflected immediately

**Solutions**:
1. Wait for cache TTL (5 minutes by default)
2. Manual cache clear: Restart server
3. Check background refresh goroutine is running
4. Verify no errors in server logs

## Best Practices

### 1. Use Hierarchical Features

✅ **Good**: Grant `harvest` to give all harvest permissions
❌ **Bad**: Grant each individual feature separately

### 2. Use Role Features for Defaults

✅ **Good**: Assign common features to roles
❌ **Bad**: Grant every feature to every user individually

### 3. Use User Overrides for Exceptions

✅ **Good**: Grant `harvest.approve` to specific senior mandors
❌ **Bad**: Create new roles for every edge case

### 4. Use Scoped Features for Resource Restrictions

✅ **Good**: Grant `harvest.approve` scoped to specific estates
❌ **Bad**: Create separate features for each estate

### 5. Set Expiration for Temporary Grants

✅ **Good**: Set `expiresAt` for temporary permissions
❌ **Bad**: Leave temporary permissions without expiration

### 6. Document Feature Purpose

✅ **Good**: Write clear descriptions for custom features
❌ **Bad**: Create features with unclear purposes

### 7. Monitor Performance

✅ **Good**: Regularly check `getFeatureStats`
❌ **Bad**: Ignore cache hit rate and latency

## Security Considerations

1. **System Features**: Cannot be deleted, only SUPER_ADMIN can update
2. **Authorization Checks**: All mutations require admin roles
3. **Audit Logging**: All feature changes are logged with user and reason
4. **Scope Validation**: Scoped features validate resource existence
5. **Feature Name Validation**: Prevents injection and malformed names
6. **User Context**: All operations require authenticated user context

## Contributing

When adding new features:

1. Add feature to seed migration if system feature
2. Document feature in this README
3. Add test queries to TEST_QUERIES.md
4. Update API_DOCUMENTATION.md if adding new API methods
5. Add unit tests for new functionality
6. Update feature hierarchy documentation

## License

Copyright © 2024 Agrinova. All rights reserved.

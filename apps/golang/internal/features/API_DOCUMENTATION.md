# Feature-Based Authorization API Documentation

## Overview

The Feature-Based Authorization API provides a flexible, hierarchical system for managing user capabilities beyond traditional role-based access control (RBAC). Features are granular permissions that can be composed, scoped, and assigned at both role and individual user levels.

### Key Concepts

- **Features**: Specific capabilities or functionalities (e.g., `harvest.view`, `harvest.create`, `harvest.approve`)
- **Hierarchical Organization**: Features can have parent-child relationships (`harvest` → `harvest.view` → `harvest.view.detailed`)
- **Feature Composition**: Child features are automatically granted when parent features are assigned
- **Scoped Access**: Features can be restricted to specific resources (company, estate, division, block)
- **User Overrides**: Individual users can have features granted or denied, overriding role-based features
- **Performance**: <5ms feature resolution with intelligent caching

---

## Architecture

### Components

1. **Feature Service**: Core feature management (CRUD operations)
2. **Feature Composition Service**: High-performance feature resolution with caching
3. **Feature Resolver**: GraphQL API layer
4. **Feature Middleware**: Authorization helpers for resolvers
5. **Database Schema**: PostgreSQL tables for features, role_features, user_features

### Database Tables

#### features
- Stores feature definitions
- Hierarchical structure with parent_id
- Metadata for resource types, actions, scopes

#### role_features
- Maps features to roles
- Supports feature inheritance
- Tracks grants and denials

#### user_features
- User-specific feature overrides
- Scoped feature access
- Temporal access control (effective_from, expires_at)

---

## API Reference

### Queries

#### listFeatures

List all features with optional filtering and pagination.

**Authorization**: SUPER_ADMIN or COMPANY_ADMIN

**Parameters**:
- `filter` (FeatureFilterInput, optional): Filter criteria
  - `module` (String): Filter by module
  - `parentId` (ID): Filter by parent feature
  - `isActive` (Boolean): Filter by active status
  - `isSystem` (Boolean): Filter system/custom features
  - `search` (String): Search by name or display name
- `page` (Int, default: 1): Page number
- `limit` (Int, default: 50): Items per page

**Returns**: FeaturesResponse
- `features`: Array of Feature objects
- `totalCount`: Total number of features
- `hasNextPage`: Boolean indicating more pages
- `pageInfo`: Pagination metadata

**Example**:
```graphql
query {
  listFeatures(
    filter: { module: "harvest", isActive: true }
    page: 1
    limit: 20
  ) {
    features {
      id
      name
      displayName
      module
    }
    totalCount
  }
}
```

---

#### getFeature

Get a specific feature by ID.

**Authorization**: SUPER_ADMIN or COMPANY_ADMIN

**Parameters**:
- `id` (ID!, required): Feature UUID

**Returns**: Feature

**Example**:
```graphql
query {
  getFeature(id: "feature-uuid") {
    id
    name
    displayName
    description
    module
    parent {
      name
    }
    children {
      name
    }
  }
}
```

---

#### getFeatureByName

Get a feature by its code/name.

**Authorization**: SUPER_ADMIN or COMPANY_ADMIN

**Parameters**:
- `name` (String!, required): Feature code

**Returns**: Feature

**Example**:
```graphql
query {
  getFeatureByName(name: "harvest.approve") {
    id
    name
    displayName
    metadata {
      resourceType
      actions
    }
  }
}
```

---

#### getFeatureHierarchy

Get the complete feature hierarchy tree.

**Authorization**: SUPER_ADMIN or COMPANY_ADMIN

**Parameters**:
- `module` (String, optional): Filter by module

**Returns**: Array of FeatureHierarchy

**Example**:
```graphql
query {
  getFeatureHierarchy(module: "harvest") {
    feature {
      name
      displayName
    }
    depth
    children {
      feature {
        name
      }
      depth
    }
  }
}
```

---

#### checkUserFeature

Check if a user has a specific feature.

**Authorization**: Users can check own features, admins can check any user

**Parameters**:
- `input` (FeatureCheckInput!, required):
  - `userId` (ID!): User to check
  - `feature` (String!): Feature code to check
  - `scope` (FeatureScopeInput, optional): Scope context

**Returns**: FeatureCheckResult
- `userId`: User ID
- `feature`: Feature code
- `hasAccess`: Boolean
- `accessReason`: Why access was granted (if applicable)
- `denialReason`: Why access was denied (if applicable)
- `checkedAt`: Timestamp

**Example**:
```graphql
query {
  checkUserFeature(input: {
    userId: "user-uuid"
    feature: "harvest.approve"
    scope: {
      type: "estate"
      id: "estate-uuid"
    }
  }) {
    hasAccess
    accessReason
    denialReason
  }
}
```

---

#### checkUserFeatures

Check if a user has multiple features.

**Authorization**: Users can check own features, admins can check any user

**Parameters**:
- `input` (BatchFeatureCheckInput!, required):
  - `userId` (ID!): User to check
  - `features` (Array of String!): Feature codes
  - `requireAll` (Boolean, default: false): All required or any
  - `scope` (FeatureScopeInput, optional): Scope context

**Returns**: BatchFeatureCheckResult
- `userId`: User ID
- `features`: Feature codes checked
- `hasAccess`: Overall result
- `grantedFeatures`: Features user has
- `deniedFeatures`: Features user doesn't have

**Example**:
```graphql
query {
  checkUserFeatures(input: {
    userId: "user-uuid"
    features: ["harvest.view", "harvest.create", "harvest.approve"]
    requireAll: false
  }) {
    hasAccess
    grantedFeatures
    deniedFeatures
  }
}
```

---

#### getUserFeatures

Get all features for a specific user.

**Authorization**: Users can get own features, admins can get any user's features

**Parameters**:
- `userId` (ID!, required): User UUID
- `scope` (FeatureScopeInput, optional): Scope context

**Returns**: UserFeatureSet
- `userId`: User ID
- `role`: User's role
- `features`: Array of feature codes
- `scopedFeatures`: Detailed scoped feature info
- `computedAt`: When computed
- `expiresAt`: Cache expiry

**Example**:
```graphql
query {
  getUserFeatures(userId: "user-uuid") {
    userId
    role
    features
    scopedFeatures {
      feature
      isGranted
      scope {
        type
        id
      }
    }
  }
}
```

---

#### getUserFeatureOverrides

Get user-specific feature overrides.

**Authorization**: SUPER_ADMIN or COMPANY_ADMIN

**Parameters**:
- `userId` (ID!, required): User UUID

**Returns**: Array of UserFeature

**Example**:
```graphql
query {
  getUserFeatureOverrides(userId: "user-uuid") {
    id
    feature {
      name
      displayName
    }
    isGranted
    scopeType
    scopeId
    reason
    expiresAt
  }
}
```

---

#### getRoleFeatures

Get all features assigned to a role.

**Authorization**: SUPER_ADMIN or COMPANY_ADMIN

**Parameters**:
- `roleName` (String!, required): Role name (e.g., "MANDOR")

**Returns**: Array of RoleFeature

**Example**:
```graphql
query {
  getRoleFeatures(roleName: "MANDOR") {
    id
    feature {
      name
      displayName
    }
    isDenied
    grantedAt
  }
}
```

---

#### getFeatureStats

Get feature system statistics.

**Authorization**: SUPER_ADMIN only

**Parameters**: None

**Returns**: FeatureStats
- `totalFeatures`: Total feature count
- `activeFeatures`: Active feature count
- `systemFeatures`: System feature count
- `customFeatures`: Custom feature count
- `totalRoleFeatures`: Role feature assignments
- `totalUserOverrides`: User feature overrides
- `featuresByModule`: Features grouped by module
- `cacheHitRate`: Cache performance metric
- `averageCheckLatencyMs`: Average check latency

**Example**:
```graphql
query {
  getFeatureStats {
    totalFeatures
    cacheHitRate
    averageCheckLatencyMs
  }
}
```

---

### Mutations

#### createFeature

Create a new custom feature.

**Authorization**: SUPER_ADMIN only

**Parameters**:
- `input` (CreateFeatureInput!, required):
  - `name` (String!): Feature code (alphanumeric, dots, underscores)
  - `displayName` (String!): Human-readable name
  - `description` (String): Detailed description
  - `module` (String!): Module name
  - `parentId` (ID): Parent feature UUID
  - `isActive` (Boolean, default: true): Active status
  - `metadata` (FeatureMetadataInput): Additional configuration

**Returns**: Feature

**Validation**:
- Feature name must be unique
- Name must match: `^[a-zA-Z0-9._]+$`
- Cannot start or end with dots
- Cannot have consecutive dots
- Parent feature must exist

**Example**:
```graphql
mutation {
  createFeature(input: {
    name: "harvest.bulk_approve"
    displayName: "Bulk Approve Harvests"
    description: "Approve multiple harvests at once"
    module: "harvest"
    parentId: "harvest-feature-uuid"
    isActive: true
    metadata: {
      resourceType: "harvest_record"
      actions: ["read", "approve"]
      requiredScope: "estate"
    }
  }) {
    id
    name
    displayName
  }
}
```

---

#### updateFeature

Update an existing feature.

**Authorization**: SUPER_ADMIN only

**Parameters**:
- `input` (UpdateFeatureInput!, required):
  - `id` (ID!): Feature UUID
  - `displayName` (String): New display name
  - `description` (String): New description
  - `isActive` (Boolean): New active status
  - `metadata` (FeatureMetadataInput): Updated metadata

**Returns**: Feature

**Validation**:
- System features can only be updated by SUPER_ADMIN
- Cannot change feature name or module

**Example**:
```graphql
mutation {
  updateFeature(input: {
    id: "feature-uuid"
    displayName: "Updated Name"
    isActive: false
  }) {
    id
    displayName
    isActive
    updatedAt
  }
}
```

---

#### deleteFeature

Delete a feature.

**Authorization**: SUPER_ADMIN only

**Parameters**:
- `id` (ID!, required): Feature UUID

**Returns**: Boolean (success)

**Validation**:
- System features cannot be deleted
- Soft delete (sets deleted_at)

**Example**:
```graphql
mutation {
  deleteFeature(id: "feature-uuid")
}
```

---

#### grantUserFeature

Grant a feature to a specific user.

**Authorization**: SUPER_ADMIN or COMPANY_ADMIN

**Parameters**:
- `input` (GrantUserFeatureInput!, required):
  - `userId` (ID!): User UUID
  - `feature` (String!): Feature code
  - `scope` (FeatureScopeInput): Scope context
  - `effectiveFrom` (Time): When grant becomes effective
  - `expiresAt` (Time): When grant expires
  - `reason` (String): Reason for granting

**Returns**: UserFeature

**Example**:
```graphql
mutation {
  grantUserFeature(input: {
    userId: "user-uuid"
    feature: "harvest.approve"
    scope: {
      type: "estate"
      id: "estate-uuid"
    }
    expiresAt: "2024-12-31T23:59:59Z"
    reason: "Temporary approval rights"
  }) {
    id
    isGranted
    expiresAt
  }
}
```

---

#### denyUserFeature

Deny a feature to a specific user.

**Authorization**: SUPER_ADMIN or COMPANY_ADMIN

**Parameters**:
- `input` (DenyUserFeatureInput!, required):
  - `userId` (ID!): User UUID
  - `feature` (String!): Feature code
  - `scope` (FeatureScopeInput): Scope context
  - `effectiveFrom` (Time): When denial becomes effective
  - `expiresAt` (Time): When denial expires
  - `reason` (String): Reason for denying

**Returns**: UserFeature

**Example**:
```graphql
mutation {
  denyUserFeature(input: {
    userId: "user-uuid"
    feature: "harvest.delete"
    reason: "Not authorized to delete records"
  }) {
    id
    isGranted
    reason
  }
}
```

---

#### revokeUserFeature

Revoke a user-specific feature assignment.

**Authorization**: SUPER_ADMIN or COMPANY_ADMIN

**Parameters**:
- `input` (RevokeUserFeatureInput!, required):
  - `userId` (ID!): User UUID
  - `feature` (String!): Feature code
  - `scope` (FeatureScopeInput): Must match original grant/denial

**Returns**: Boolean (success)

**Example**:
```graphql
mutation {
  revokeUserFeature(input: {
    userId: "user-uuid"
    feature: "harvest.approve"
    scope: {
      type: "estate"
      id: "estate-uuid"
    }
  })
}
```

---

#### clearUserFeatures

Clear all user-specific feature overrides for a user.

**Authorization**: SUPER_ADMIN only

**Parameters**:
- `userId` (ID!, required): User UUID

**Returns**: Boolean (success)

**Example**:
```graphql
mutation {
  clearUserFeatures(userId: "user-uuid")
}
```

---

#### assignRoleFeatures

Assign features to a role.

**Authorization**: SUPER_ADMIN only

**Parameters**:
- `input` (AssignRoleFeaturesInput!, required):
  - `roleName` (String!): Role name
  - `features` (Array of String!): Feature codes
  - `inheritFrom` (String): Role to inherit from

**Returns**: Array of RoleFeature

**Example**:
```graphql
mutation {
  assignRoleFeatures(input: {
    roleName: "MANDOR"
    features: [
      "harvest.view",
      "harvest.create",
      "harvest.edit_own"
    ]
  }) {
    id
    feature {
      name
    }
  }
}
```

---

#### removeRoleFeatures

Remove features from a role.

**Authorization**: SUPER_ADMIN only

**Parameters**:
- `roleName` (String!, required): Role name
- `features` (Array of String!, required): Feature codes to remove

**Returns**: Boolean (success)

**Example**:
```graphql
mutation {
  removeRoleFeatures(
    roleName: "MANDOR"
    features: ["harvest.delete"]
  )
}
```

---

#### bulkGrantUserFeatures

Grant features to multiple users at once.

**Authorization**: SUPER_ADMIN only

**Parameters**:
- `userIds` (Array of ID!, required): User UUIDs
- `features` (Array of String!, required): Feature codes
- `scope` (FeatureScopeInput): Scope context
- `reason` (String): Reason for granting

**Returns**: Array of UserFeature

**Example**:
```graphql
mutation {
  bulkGrantUserFeatures(
    userIds: ["user-1", "user-2", "user-3"]
    features: ["reports.view", "reports.export"]
    reason: "Bulk grant for team"
  ) {
    id
    userId
    feature {
      name
    }
  }
}
```

---

## Using Feature Middleware in Resolvers

### Basic Feature Check

```go
import "agrinovagraphql/server/internal/middleware"

func (r *Resolver) CreateHarvest(ctx context.Context, input HarvestInput) (*Harvest, error) {
    // Check if user has feature
    if err := featureMiddleware.RequireFeature(ctx, "harvest.create", nil); err != nil {
        return nil, err
    }

    // Proceed with harvest creation
    return createHarvestLogic(ctx, input)
}
```

### Scoped Feature Check

```go
func (r *Resolver) ApproveHarvest(ctx context.Context, harvestID string) (*Harvest, error) {
    // Get harvest to determine estate
    harvest, err := getHarvest(harvestID)
    if err != nil {
        return nil, err
    }

    // Check scoped feature access
    scope := middleware.ExtractEstateScope(harvest.EstateID)
    if err := featureMiddleware.RequireFeature(ctx, "harvest.approve", scope); err != nil {
        return nil, err
    }

    // Proceed with approval
    return approveHarvestLogic(ctx, harvest)
}
```

### Multiple Feature Check

```go
func (r *Resolver) ViewSensitiveReport(ctx context.Context) (*Report, error) {
    // Require multiple features
    if err := featureMiddleware.RequireAllFeatures(ctx, []string{
        "reports.view",
        "reports.view_sensitive",
        "reports.export",
    }, nil); err != nil {
        return nil, err
    }

    return generateReport(ctx)
}
```

### Optional Feature Check

```go
func (r *Resolver) GetHarvestList(ctx context.Context) ([]*Harvest, error) {
    // Check if user can see detailed info
    canSeeDetails, _ := featureMiddleware.CheckFeature(ctx, "harvest.view.detailed", nil)

    harvests := getHarvests()

    if canSeeDetails {
        return harvests, nil // Full details
    }

    return stripSensitiveInfo(harvests), nil // Limited details
}
```

---

## Performance Considerations

### Caching Strategy

1. **Feature Cache**: All features are cached in memory
2. **Role Feature Cache**: Role-to-features mappings are cached
3. **User Feature Cache**: User feature sets are cached with 5-minute TTL
4. **Automatic Refresh**: Background refresh every 5 minutes
5. **Cache Invalidation**: On feature/role/user changes

### Performance Targets

- Feature resolution: <5ms (typical: 1-2ms with cache hit)
- Cache hit rate: >95%
- Database queries: Minimized through aggressive caching

### Best Practices

1. Use batch checks when checking multiple features
2. Leverage feature hierarchy (grant parent features)
3. Use scoped features for resource-level access
4. Monitor cache statistics with `getFeatureStats`
5. Set appropriate expiration times for temporary grants

---

## Security Considerations

### Authorization Levels

1. **SUPER_ADMIN**: Full feature management access
2. **COMPANY_ADMIN**: Limited feature management (within scope)
3. **Users**: Can only check own features

### Audit Trail

All feature changes are logged:
- Who granted/denied the feature
- When it was granted/denied
- Reason for the change
- Scope and expiration details

### Validation

- Feature names are validated against regex
- Circular parent-child relationships are prevented
- System features are protected from deletion
- Scope validation ensures resource existence

---

## Migration from RBAC

See `migration_service.go` for tools to migrate from traditional RBAC to feature-based authorization.

Key migration steps:
1. Map permissions to features
2. Create feature hierarchy
3. Assign features to roles
4. Migrate user-specific permissions to user features
5. Test feature resolution
6. Switch to feature-based checks in resolvers

---

## Troubleshooting

### Common Issues

**Issue**: Feature checks are slow
- **Solution**: Check cache statistics, ensure background refresh is running

**Issue**: User doesn't have expected features
- **Solution**: Check getUserFeatures to see computed feature set, verify role features and user overrides

**Issue**: Cannot delete feature
- **Solution**: Ensure feature is not a system feature (isSystem: false)

**Issue**: Feature hierarchy not working
- **Solution**: Verify parent-child relationships, check for circular dependencies

### Debug Queries

```graphql
# Check cache performance
query {
  getFeatureStats {
    cacheHitRate
    averageCheckLatencyMs
  }
}

# Audit specific user
query {
  getUserFeatures(userId: "user-uuid") {
    features
    scopedFeatures {
      feature
      isGranted
    }
  }
  getUserFeatureOverrides(userId: "user-uuid") {
    feature { name }
    isGranted
    reason
  }
}

# Verify feature hierarchy
query {
  getFeatureByName(name: "harvest.approve") {
    parent {
      name
      parent {
        name
      }
    }
    children {
      name
    }
  }
}
```

---

## Support

For issues or questions:
1. Check the test queries in `TEST_QUERIES.md`
2. Review feature service logs
3. Monitor cache statistics
4. Contact the development team

# Feature Management GraphQL Test Queries

This document provides example GraphQL queries and mutations for testing the feature management API.

## Table of Contents
- [Queries](#queries)
- [Mutations](#mutations)
- [Real-World Examples](#real-world-examples)
- [Testing Workflow](#testing-workflow)

---

## Queries

### 1. List All Features

```graphql
query ListAllFeatures {
  listFeatures(page: 1, limit: 50) {
    features {
      id
      name
      displayName
      description
      module
      isActive
      isSystem
      parent {
        id
        name
      }
      children {
        id
        name
      }
      createdAt
      updatedAt
    }
    totalCount
    hasNextPage
    pageInfo {
      page
      limit
      totalPages
      totalCount
    }
  }
}
```

### 2. List Features with Filtering

```graphql
query ListHarvestFeatures {
  listFeatures(
    filter: {
      module: "harvest"
      isActive: true
    }
    page: 1
    limit: 20
  ) {
    features {
      id
      name
      displayName
      module
      isActive
    }
    totalCount
  }
}
```

### 3. Search Features

```graphql
query SearchFeatures {
  listFeatures(
    filter: {
      search: "approve"
    }
  ) {
    features {
      id
      name
      displayName
      description
    }
  }
}
```

### 4. Get Feature by ID

```graphql
query GetFeature {
  getFeature(id: "feature-uuid-here") {
    id
    name
    displayName
    description
    module
    parent {
      id
      name
    }
    children {
      id
      name
      displayName
    }
    metadata {
      resourceType
      actions
      requiredScope
    }
    isActive
    isSystem
    createdAt
    updatedAt
  }
}
```

### 5. Get Feature by Name

```graphql
query GetFeatureByName {
  getFeatureByName(name: "harvest.approve") {
    id
    name
    displayName
    description
    module
    metadata {
      resourceType
      actions
      requiredScope
    }
  }
}
```

### 6. Get Feature Hierarchy

```graphql
query GetFeatureHierarchy {
  getFeatureHierarchy {
    feature {
      id
      name
      displayName
      module
    }
    depth
    children {
      feature {
        id
        name
        displayName
      }
      depth
      children {
        feature {
          id
          name
          displayName
        }
        depth
      }
    }
  }
}
```

### 7. Get Feature Hierarchy for Module

```graphql
query GetHarvestHierarchy {
  getFeatureHierarchy(module: "harvest") {
    feature {
      id
      name
      displayName
    }
    depth
    children {
      feature {
        id
        name
        displayName
      }
      depth
    }
  }
}
```

### 8. Check if User Has Feature

```graphql
query CheckUserFeature {
  checkUserFeature(input: {
    userId: "user-uuid-here"
    feature: "harvest.approve"
  }) {
    userId
    feature
    hasAccess
    accessReason
    denialReason
    checkedAt
  }
}
```

### 9. Check Multiple Features

```graphql
query CheckUserFeatures {
  checkUserFeatures(input: {
    userId: "user-uuid-here"
    features: ["harvest.view", "harvest.create", "harvest.approve"]
    requireAll: false
  }) {
    userId
    features
    hasAccess
    grantedFeatures
    deniedFeatures
  }
}
```

### 10. Get User Features

```graphql
query GetUserFeatures {
  getUserFeatures(userId: "user-uuid-here") {
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
      expiresAt
    }
    computedAt
    expiresAt
  }
}
```

### 11. Get User Feature Overrides

```graphql
query GetUserFeatureOverrides {
  getUserFeatureOverrides(userId: "user-uuid-here") {
    id
    userId
    featureId
    feature {
      name
      displayName
    }
    isGranted
    scopeType
    scopeId
    effectiveFrom
    expiresAt
    reason
    createdAt
  }
}
```

### 12. Get Role Features

```graphql
query GetRoleFeatures {
  getRoleFeatures(roleName: "MANDOR") {
    id
    roleId
    featureId
    feature {
      id
      name
      displayName
      description
    }
    isDenied
    grantedAt
    expiresAt
  }
}
```

### 13. Get Feature Statistics

```graphql
query GetFeatureStats {
  getFeatureStats {
    totalFeatures
    activeFeatures
    systemFeatures
    customFeatures
    totalRoleFeatures
    totalUserOverrides
    featuresByModule
    cacheHitRate
    averageCheckLatencyMs
  }
}
```

---

## Mutations

### 1. Create Feature

```graphql
mutation CreateFeature {
  createFeature(input: {
    name: "harvest.bulk_approve"
    displayName: "Bulk Approve Harvests"
    description: "Ability to approve multiple harvest records at once"
    module: "harvest"
    parentId: "parent-feature-uuid"
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
    description
    module
    isActive
    isSystem
    createdAt
  }
}
```

### 2. Update Feature

```graphql
mutation UpdateFeature {
  updateFeature(input: {
    id: "feature-uuid-here"
    displayName: "Updated Display Name"
    description: "Updated description"
    isActive: false
  }) {
    id
    name
    displayName
    description
    isActive
    updatedAt
  }
}
```

### 3. Delete Feature

```graphql
mutation DeleteFeature {
  deleteFeature(id: "feature-uuid-here")
}
```

### 4. Grant User Feature

```graphql
mutation GrantUserFeature {
  grantUserFeature(input: {
    userId: "user-uuid-here"
    feature: "harvest.approve"
    scope: {
      type: "estate"
      id: "estate-uuid-here"
    }
    reason: "Temporary approval rights for Estate A"
    expiresAt: "2024-12-31T23:59:59Z"
  }) {
    id
    userId
    feature {
      name
      displayName
    }
    isGranted
    scopeType
    scopeId
    reason
    expiresAt
    createdAt
  }
}
```

### 5. Deny User Feature

```graphql
mutation DenyUserFeature {
  denyUserFeature(input: {
    userId: "user-uuid-here"
    feature: "harvest.delete"
    reason: "User is not authorized to delete harvest records"
  }) {
    id
    userId
    feature {
      name
      displayName
    }
    isGranted
    reason
    createdAt
  }
}
```

### 6. Revoke User Feature

```graphql
mutation RevokeUserFeature {
  revokeUserFeature(input: {
    userId: "user-uuid-here"
    feature: "harvest.approve"
    scope: {
      type: "estate"
      id: "estate-uuid-here"
    }
  })
}
```

### 7. Clear All User Features

```graphql
mutation ClearUserFeatures {
  clearUserFeatures(userId: "user-uuid-here")
}
```

### 8. Assign Features to Role

```graphql
mutation AssignRoleFeatures {
  assignRoleFeatures(input: {
    roleName: "MANDOR"
    features: [
      "harvest.view",
      "harvest.create",
      "harvest.edit_own"
    ]
  }) {
    id
    roleId
    featureId
    feature {
      name
      displayName
    }
    grantedAt
  }
}
```

### 9. Remove Features from Role

```graphql
mutation RemoveRoleFeatures {
  removeRoleFeatures(
    roleName: "MANDOR"
    features: ["harvest.delete"]
  )
}
```

### 10. Bulk Grant User Features

```graphql
mutation BulkGrantUserFeatures {
  bulkGrantUserFeatures(
    userIds: ["user-1-uuid", "user-2-uuid", "user-3-uuid"]
    features: ["reports.view", "reports.export"]
    reason: "Granting report access to team"
  ) {
    id
    userId
    feature {
      name
      displayName
    }
    isGranted
    reason
  }
}
```

---

## Real-World Examples

### Example 1: Setting up Harvest Features for a New Estate

```graphql
# Step 1: Create estate-specific features
mutation CreateEstateHarvestFeatures {
  createFeature(input: {
    name: "harvest.estate_a.view"
    displayName: "View Estate A Harvests"
    description: "Access to view harvest records for Estate A"
    module: "harvest"
    isActive: true
  }) {
    id
    name
  }
}

# Step 2: Grant features to users
mutation GrantEstateAccess {
  grantUserFeature(input: {
    userId: "mandor-user-uuid"
    feature: "harvest.create"
    scope: {
      type: "estate"
      id: "estate-a-uuid"
    }
    reason: "Mandor for Estate A"
  }) {
    id
    isGranted
  }
}
```

### Example 2: Temporary Feature Grant

```graphql
mutation GrantTemporaryApprovalRights {
  grantUserFeature(input: {
    userId: "asisten-uuid"
    feature: "harvest.approve"
    scope: {
      type: "estate"
      id: "estate-uuid"
    }
    effectiveFrom: "2024-01-01T00:00:00Z"
    expiresAt: "2024-01-31T23:59:59Z"
    reason: "Temporary approval rights during manager vacation"
  }) {
    id
    userId
    feature {
      name
    }
    effectiveFrom
    expiresAt
    reason
  }
}
```

### Example 3: Checking Access Before Action

```graphql
# Before allowing a user to approve a harvest
query CanUserApproveHarvest {
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

### Example 4: Audit User Permissions

```graphql
query AuditUserPermissions($userId: ID!) {
  # Get all features
  userFeatures: getUserFeatures(userId: $userId) {
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

  # Get specific overrides
  overrides: getUserFeatureOverrides(userId: $userId) {
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

## Testing Workflow

### 1. Initial Setup (SUPER_ADMIN)

```graphql
# 1. Check system features
query {
  listFeatures(filter: { isSystem: true }) {
    features {
      id
      name
      displayName
      module
    }
    totalCount
  }
}

# 2. View feature hierarchy
query {
  getFeatureHierarchy {
    feature {
      name
      displayName
    }
    children {
      feature {
        name
      }
    }
  }
}
```

### 2. Create Custom Features

```graphql
# Create a custom feature
mutation {
  createFeature(input: {
    name: "custom.special_report"
    displayName: "Special Report Access"
    description: "Access to view special reports"
    module: "reports"
    isActive: true
  }) {
    id
    name
    displayName
  }
}
```

### 3. Assign Features to Roles

```graphql
# Assign features to MANDOR role
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

### 4. Grant User-Specific Overrides

```graphql
# Grant additional feature to specific user
mutation {
  grantUserFeature(input: {
    userId: "mandor-uuid"
    feature: "harvest.approve"
    scope: {
      type: "division"
      id: "division-uuid"
    }
    reason: "Senior mandor with approval rights"
  }) {
    id
    isGranted
  }
}
```

### 5. Verify Access

```graphql
# Check if user has combined access
query {
  getUserFeatures(userId: "mandor-uuid") {
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

### 6. Monitor Performance

```graphql
# Check system statistics
query {
  getFeatureStats {
    totalFeatures
    activeFeatures
    cacheHitRate
    averageCheckLatencyMs
    featuresByModule
  }
}
```

---

## Testing with cURL

### Query Example

```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=your-session-token" \
  -d '{
    "query": "query { listFeatures(page: 1, limit: 10) { features { id name displayName } totalCount } }"
  }'
```

### Mutation Example

```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=your-session-token" \
  -d '{
    "query": "mutation($input: CreateFeatureInput!) { createFeature(input: $input) { id name displayName } }",
    "variables": {
      "input": {
        "name": "test.feature",
        "displayName": "Test Feature",
        "description": "A test feature",
        "module": "test",
        "isActive": true
      }
    }
  }'
```

---

## Notes

- All mutations require SUPER_ADMIN or COMPANY_ADMIN role (unless specified otherwise)
- Feature names must be alphanumeric with dots and underscores only
- System features (isSystem: true) cannot be deleted
- User feature overrides take precedence over role features
- Feature checks have <5ms target latency due to caching
- Cache is automatically refreshed every 5 minutes
- Use pagination for large feature lists
- Scoped features allow fine-grained access control (company, estate, division, block levels)

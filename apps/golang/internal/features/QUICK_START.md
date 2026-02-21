# Feature-Based Authorization - Quick Start Guide

Get started with feature-based authorization in 5 minutes!

## Step 1: Generate GraphQL Code

```bash
cd apps/golang
go run github.com/99designs/gqlgen generate
```

This generates GraphQL resolver interfaces and types from `features.graphqls`.

## Step 2: Start the Server

```bash
go run cmd/server/main.go
```

The server will:
- Run database migrations
- Seed system features (45+ features)
- Start GraphQL server on port 8080

## Step 3: Test the API

### Using GraphQL Playground

Open `http://localhost:8080/graphql` in your browser and try:

```graphql
# List all features
query {
  listFeatures(page: 1, limit: 10) {
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

### Using cURL

```bash
# Login first to get session token
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { webLogin(input: { username: \"superadmin\", password: \"your-password\" }) { success user { id role } } }"
  }'

# Then use the session token for feature queries
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=YOUR_SESSION_TOKEN" \
  -d '{
    "query": "query { listFeatures(page: 1, limit: 10) { features { name displayName } } }"
  }'
```

## Step 4: Use in Your Resolvers

### Simple Feature Check

```go
package resolvers

import (
    "context"
    "agrinovagraphql/server/internal/middleware"
)

func (r *Resolver) CreateHarvest(ctx context.Context, input HarvestInput) (*Harvest, error) {
    // Check if user has feature
    if err := featureMiddleware.RequireFeature(ctx, "harvest.create", nil); err != nil {
        return nil, err // Returns: "insufficient permissions: feature 'harvest.create' required"
    }

    // Your business logic here
    return createHarvest(input)
}
```

### Scoped Feature Check

```go
func (r *Resolver) ApproveHarvest(ctx context.Context, harvestID string) (*Harvest, error) {
    // Get the harvest
    harvest, err := r.getHarvest(harvestID)
    if err != nil {
        return nil, err
    }

    // Check scoped feature access
    scope := middleware.ExtractEstateScope(harvest.EstateID)
    if err := featureMiddleware.RequireFeature(ctx, "harvest.approve", scope); err != nil {
        return nil, err
    }

    // Approve the harvest
    return approveHarvest(harvest)
}
```

### Multiple Features

```go
func (r *Resolver) ViewSensitiveReport(ctx context.Context) (*Report, error) {
    // Require multiple features
    if err := featureMiddleware.RequireAllFeatures(ctx, []string{
        "reports.view",
        "reports.view_sensitive",
    }, nil); err != nil {
        return nil, err
    }

    return generateReport(ctx)
}
```

### Optional Feature Check

```go
func (r *Resolver) GetHarvests(ctx context.Context) ([]*Harvest, error) {
    // Check if user can see detailed info (non-blocking)
    canSeeDetails, _ := featureMiddleware.CheckFeature(ctx, "harvest.view.detailed", nil)

    harvests := getHarvests()

    if canSeeDetails {
        return harvests, nil // Return full details
    }

    return stripSensitiveInfo(harvests), nil // Return limited details
}
```

## Step 5: Common Operations

### Check User Features

```graphql
query {
  getUserFeatures(userId: "user-uuid-here") {
    userId
    role
    features
  }
}
```

### Grant Feature to User

```graphql
mutation {
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
    isGranted
    expiresAt
  }
}
```

### Assign Features to Role

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
      displayName
    }
  }
}
```

### Check Access Before Action

```graphql
query {
  checkUserFeature(input: {
    userId: "user-uuid-here"
    feature: "harvest.approve"
  }) {
    hasAccess
    accessReason
    denialReason
  }
}
```

## Available System Features

The system automatically seeds these features:

### Harvest
- `harvest.view` - View harvest records
- `harvest.create` - Create harvest records
- `harvest.edit` - Edit harvest records
- `harvest.approve` - Approve harvest records
- `harvest.reject` - Reject harvest records
- `harvest.delete` - Delete harvest records

### Gate Check
- `gatecheck.view` - View gate check records
- `gatecheck.perform` - Perform gate checks
- `gatecheck.approve` - Approve gate checks
- `gatecheck.override` - Override gate check decisions

### User Management
- `user.view` - View users
- `user.create` - Create users
- `user.edit` - Edit users
- `user.delete` - Delete users
- `user.manage` - Full user management

### Company Management
- `company.view` - View companies
- `company.create` - Create companies
- `company.edit` - Edit companies
- `company.delete` - Delete companies
- `company.manage` - Full company management

### Reports
- `reports.view` - View reports
- `reports.export` - Export reports
- `reports.create` - Create custom reports

### Admin
- `admin.full_access` - Complete system access

## Middleware Helper Functions

Quick reference for available helpers:

```go
// Basic checks
featureMiddleware.RequireFeature(ctx, "feature.code", scope)
featureMiddleware.RequireAnyFeature(ctx, []string{"feat1", "feat2"}, scope)
featureMiddleware.RequireAllFeatures(ctx, []string{"feat1", "feat2"}, scope)
featureMiddleware.CheckFeature(ctx, "feature.code", scope) // Non-blocking

// Domain-specific helpers
featureMiddleware.CanViewHarvest(ctx, scope)
featureMiddleware.CanCreateHarvest(ctx, scope)
featureMiddleware.CanApproveHarvest(ctx, scope)
featureMiddleware.CanManageUsers(ctx, scope)
featureMiddleware.CanManageCompanies(ctx)
featureMiddleware.CanViewReports(ctx, scope)
featureMiddleware.CanPerformGateCheck(ctx, scope)

// Scope builders
scope := middleware.ExtractEstateScope(estateID)
scope := middleware.ExtractDivisionScope(divisionID)
scope := middleware.ExtractBlockScope(blockID)
scope := middleware.ExtractCompanyScope(companyID)
```

## Performance Tips

1. **Use Batch Checks**: When checking multiple features, use `checkUserFeatures` instead of multiple `checkUserFeature` calls
2. **Leverage Hierarchy**: Grant parent features (e.g., `harvest`) to automatically grant all child features
3. **Use Role Features**: Assign common features to roles, not individual users
4. **Monitor Cache**: Check cache hit rate with `getFeatureStats`
5. **Set Expirations**: Always set `expiresAt` for temporary grants

## Troubleshooting

### Feature Check is Slow
```graphql
query {
  getFeatureStats {
    cacheHitRate          # Should be >95%
    averageCheckLatencyMs # Should be <5ms
  }
}
```

### User Missing Features
```graphql
query {
  getUserFeatures(userId: "user-uuid") {
    features              # All features user has
  }

  getUserFeatureOverrides(userId: "user-uuid") {
    feature { name }
    isGranted             # true=grant, false=denial
    expiresAt             # Check if expired
  }
}
```

### Cannot Delete Feature
- Check if it's a system feature: `isSystem: true` cannot be deleted
- Only SUPER_ADMIN can delete features

## Next Steps

- 📖 Read [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference
- 🧪 Try [TEST_QUERIES.md](./TEST_QUERIES.md) for more examples
- 📚 See [README.md](./README.md) for comprehensive guide
- 🔧 Integrate feature checks into your resolvers
- 📊 Monitor performance with `getFeatureStats`

## Need Help?

- **Documentation**: Check API_DOCUMENTATION.md
- **Examples**: See TEST_QUERIES.md
- **Issues**: Review troubleshooting section in README.md
- **Performance**: Monitor with getFeatureStats query

---

**You're all set!** Start adding feature checks to your resolvers and enjoy fine-grained authorization control.

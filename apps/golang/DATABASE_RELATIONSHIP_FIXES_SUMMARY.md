# Database Relationship Fixes Summary

## Overview

This document summarizes the comprehensive database relationship fixes implemented for the Agrinova Go GraphQL backend system. The fixes address relationship issues, foreign key constraints, performance indexes, and proper GORM model definitions.

## Issues Identified and Fixed

### 1. Missing GORM Relationship Tags
**Problem**: GraphQL generated models lacked proper GORM tags for database relationships.
**Solution**: Created comprehensive GORM model extensions with proper relationship tags.

### 2. Inconsistent Foreign Key Constraints
**Problem**: Database migrations used raw SQL without proper foreign key constraints.
**Solution**: Implemented GORM AutoMigrate with proper constraint definitions.

### 3. Missing Performance Indexes
**Problem**: Database lacked indexes on foreign keys and common query patterns.
**Solution**: Added comprehensive indexing strategy with composite indexes.

### 4. Orphaned Records Risk
**Problem**: No mechanism to handle orphaned records and relationship integrity.
**Solution**: Created relationship service with validation and cleanup capabilities.

## Files Created/Modified

### Core Files Created:
1. `/internal/graphql/generated/gorm_models.go` - GORM model extensions
2. `/pkg/database/gorm_migrations.go` - GORM-based migrations
3. `/pkg/database/relationship_service.go` - Relationship management service
4. `/pkg/database/relationship_test.go` - Comprehensive relationship tests

### Files Modified:
1. `/pkg/database/database.go` - Enhanced database service with relationship management
2. `/pkg/database/migrations.go` - Updated with GORM integration

## Database Model Relationships Fixed

### Core Business Hierarchy
```
Company (1:N) → Estate (1:N) → Division (1:N) → Block (1:N) → HarvestRecord
     ↓
User (N:1)
```

### Multi-Assignment System
```
User (N:M) → Estate (UserEstateAssignment)
User (N:M) → Division (UserDivisionAssignment)  
User (N:M) → Company (UserCompanyAssignment)
```

### Authentication System
```
User (1:N) → UserSession
User (1:N) → DeviceBinding
User (1:N) → JWTToken
User (1:N) → SecurityEvent
```

### Gate Check System
```
User (1:N) → GateCheckRecord
User (1:N) → QRToken
User (1:N) → GuestLog
GuestLog (1:N) → GateCheckPhoto
```

## Key Features Implemented

### 1. Proper GORM Tags
- Foreign key relationships with `foreignKey` and `constraint` tags
- Proper cascade behaviors (CASCADE, RESTRICT, SET NULL)
- Automatic timestamps with `autoCreateTime` and `autoUpdateTime`
- Soft deletes with `gorm.DeletedAt`
- Unique constraints and indexes

### 2. Comprehensive Indexing
- Primary key indexes (automatic)
- Foreign key indexes for performance
- Composite indexes for complex queries
- Unique indexes for business constraints
- Partial indexes for conditional constraints

### 3. Relationship Validation
- Foreign key integrity validation
- Orphaned record detection and cleanup
- User assignment validation based on roles
- Relationship statistics and monitoring

### 4. Business Logic Methods
- User role validation methods (`IsManager()`, `CanApproveHarvest()`)
- Harvest status checking (`IsPending()`, `CanBeModified()`)
- User assignment access checks (`GetActiveEstateIDs()`)
- Company access validation (`CanAccessCompany()`)

## Database Constraints Added

### Foreign Key Constraints
```sql
-- Company → User relationship
ALTER TABLE users ADD CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(id)

-- Estate hierarchy
ALTER TABLE estates ADD CONSTRAINT fk_estates_company FOREIGN KEY (company_id) REFERENCES companies(id)
ALTER TABLE divisions ADD CONSTRAINT fk_divisions_estate FOREIGN KEY (estate_id) REFERENCES estates(id)
ALTER TABLE blocks ADD CONSTRAINT fk_blocks_division FOREIGN KEY (division_id) REFERENCES divisions(id)

-- Assignment relationships
ALTER TABLE user_estate_assignments ADD CONSTRAINT fk_user_estate_assignments_user FOREIGN KEY (user_id) REFERENCES users(id)
ALTER TABLE user_estate_assignments ADD CONSTRAINT fk_user_estate_assignments_estate FOREIGN KEY (estate_id) REFERENCES estates(id)
```

### Business Logic Constraints
```sql
-- Positive values for harvest data
ALTER TABLE harvest_records ADD CONSTRAINT check_berat_tbs_positive CHECK (berat_tbs > 0)
ALTER TABLE harvest_records ADD CONSTRAINT check_jumlah_janjang_positive CHECK (jumlah_janjang > 0)

-- Valid role constraints
ALTER TABLE users ADD CONSTRAINT check_valid_role CHECK (role IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM'))

-- Unique assignment constraints (prevent duplicates)
ALTER TABLE user_estate_assignments ADD CONSTRAINT unique_user_estate_assignment UNIQUE (user_id, estate_id, is_active) WHERE is_active = true
```

## Performance Improvements

### Index Strategy
1. **Single Column Indexes**: All foreign keys, status fields, timestamps
2. **Composite Indexes**: Common query patterns like `(user_id, role, is_active)`
3. **Unique Indexes**: Username, email, assignment combinations
4. **Partial Indexes**: Active records only where applicable

### Query Optimization
- Connection pooling configuration
- Prepared statement caching
- Batch operation support (1000 records per batch)
- ANALYZE and VACUUM operations for PostgreSQL

## Testing Coverage

### Comprehensive Test Suite
1. **Relationship Creation**: Tests for creating related records
2. **Foreign Key Integrity**: Validation of all relationships
3. **Business Logic**: User roles, harvest status, assignments
4. **Error Handling**: Orphaned records, invalid relationships
5. **Performance**: Index usage and query optimization

### Test Scenarios
- Company → Estate → Division → Block hierarchy
- User assignments across multiple entities
- Harvest record creation with proper relationships
- Authentication session management
- Gate check record relationships

## Usage Examples

### Creating Related Records
```go
// Create company with related data
company := &generated.CompanyWithGORM{
    Nama: "Test Company",
    Status: generated.CompanyStatusActive,
}
db.Create(company)

user := &generated.UserWithGORM{
    Username: "manager",
    Nama: "Test Manager",
    Role: generated.UserRoleManager,
    CompanyID: company.ID,
}
db.Create(user)
```

### Querying with Relationships
```go
// Get user with all assignments
var user generated.UserWithGORM
db.Preload("EstateAssignments").
  Preload("EstateAssignments.Estate").
  Preload("DivisionAssignments").
  Preload("DivisionAssignments.Division").
  First(&user, userID)
```

### Using Relationship Service
```go
service := NewRelationshipService(db)

// Validate relationships
err := service.ValidateAndFixRelationships(ctx)

// Get statistics
stats, err := service.GetRelationshipStatistics(ctx)

// Get user with relationships
user, err := service.GetUserWithRelationships(ctx, userID)
```

## Migration Strategy

### Development Environment
1. Run `AutoMigrateWithGORM(db)` for new GORM-based migrations
2. Run `AutoMigrate(db)` for backward compatibility
3. Execute `ValidateAndFixRelationships()` for data integrity

### Production Environment
1. Backup database before migration
2. Run migrations in transaction
3. Validate foreign key integrity
4. Create performance indexes
5. Update table statistics

## Monitoring and Maintenance

### Relationship Health Checks
```go
// Database health with relationship validation
func (ds *DatabaseService) Health(ctx context.Context) error {
    // Test connectivity
    if err := ds.db.Exec("SELECT 1").Error; err != nil {
        return err
    }
    
    // Validate foreign keys
    return ValidateForeignKeyRelationships(ds.db)
}
```

### Statistics Monitoring
- Total records per entity type
- Active assignments count
- Relationship integrity status
- Query performance metrics

## Best Practices Implemented

1. **GORM Best Practices**:
   - Proper tag usage for relationships
   - Cascade behaviors for data integrity
   - Soft deletes for audit trails
   - Connection pooling and prepared statements

2. **Database Design**:
   - Normalized schema with proper foreign keys
   - Comprehensive indexing strategy
   - Business logic constraints
   - Performance optimization

3. **Code Organization**:
   - Separation of concerns (models, migrations, services)
   - Comprehensive test coverage
   - Clear documentation and examples
   - Error handling and logging

## Future Enhancements

1. **Advanced Features**:
   - Database sharding support
   - Read replicas for query optimization
   - Audit trail implementation
   - Advanced caching strategies

2. **Monitoring**:
   - Query performance dashboards
   - Relationship integrity alerts
   - Automated optimization recommendations
   - Health check endpoints

This comprehensive fix ensures the Agrinova Go GraphQL backend has a robust, performant, and maintainable database layer with proper relationship management.
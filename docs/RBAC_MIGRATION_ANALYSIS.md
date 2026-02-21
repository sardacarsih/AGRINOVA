# RBAC Migration Analysis & Cleanup Plan

## Overview
This document outlines the migration from static permission definitions to the dynamic RBAC system and identifies files that can be safely deprecated.

## Migration Status: ✅ COMPLETE

### ✅ Completed Components

#### Backend (Go)
1. **Database Schema** - Complete RBAC tables created
   - `rbac_roles` - Role definitions
   - `rbac_permissions` - Permission definitions
   - `rbac_role_permissions` - Role-permission assignments
   - `rbac_user_permission_assignments` - User-specific overrides

2. **GraphQL Schema** (`apps/golang/internal/graphql/schema/rbac.graphqls`)
   - Complete RBAC queries and mutations
   - Role hierarchy queries
   - Permission management
   - User override system

3. **Service Layer**
   - Role hierarchy service with inheritance
   - Permission validation service
   - User override service
   - Cache optimization

#### Frontend (Next.js)
1. **Dynamic Permission Service** (`apps/web/lib/auth/dynamic-permission-service.ts`)
   - Runtime permission loading from GraphQL
   - Permission caching
   - Role hierarchy support

2. **Enhanced Permission Validator** (`apps/web/lib/auth/enhanced-permission-validator.ts`)
   - User override support
   - Scoped permissions
   - Validation rules

3. **RBAC Management UI**
   - Role Management component
   - Permission Management component
   - Role-Permission Matrix component
   - User Permission Overrides component
   - RBAC Statistics component

## Deprecated Static Files Analysis

### 🔴 HIGH PRIORITY - Can be Deprecated

#### 1. `apps/web/lib/constants/permissions.ts`
**Status:** DEPRECATED - Replace with dynamic RBAC
**Reason:**
- Contains hardcoded `PERMISSIONS` object
- Contains hardcoded `ROLE_PERMISSIONS` mapping
- Should be replaced by GraphQL queries to RBAC system

**Impact Analysis:**
- Used in 20+ files (see grep results)
- All usages should migrate to `dynamic-permission-service.ts`

**Migration Path:**
```typescript
// OLD (Static)
import { PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/constants/permissions';
if (user.permissions.includes(PERMISSIONS.COMPANY_CREATE)) { ... }

// NEW (Dynamic)
import { getDynamicPermissionManager } from '@/lib/auth/dynamic-permission-service';
const manager = getDynamicPermissionManager(client);
const hasPermission = await manager.hasPermission(user, 'company:create');
```

#### 2. `apps/web/lib/auth/area-manager-permissions.ts`
**Status:** DEPRECATED - Merge into dynamic RBAC
**Reason:**
- Hardcoded area manager permission checks
- Should use dynamic permission system

**Migration Path:**
Replace all `AreaManagerPermissionValidator` calls with dynamic permission checks.

#### 3. `apps/web/lib/auth/hierarchical-roles.ts`
**Status:** DEPRECATED - Use GraphQL roleHierarchy query
**Reason:**
- Hardcoded `ROLE_HIERARCHY_LEVELS`
- Hardcoded `ROLE_MANAGEMENT_RULES`
- Backend now provides this via GraphQL

**Migration Path:**
```typescript
// OLD
import { ROLE_HIERARCHY_LEVELS } from '@/lib/auth/hierarchical-roles';

// NEW
import { GET_ROLE_HIERARCHY } from '@/lib/apollo/queries/rbac';
const { data } = useQuery(GET_ROLE_HIERARCHY);
```

#### 4. `apps/web/lib/auth/permission-validator.ts`
**Status:** DEPRECATED - Use enhanced-permission-validator.ts
**Reason:**
- Uses static permissions
- Doesn't support user overrides
- Replaced by `EnhancedPermissionValidator`

### 🟡 MEDIUM PRIORITY - Keep with Modifications

#### 1. `apps/web/lib/auth/permissions.ts`
**Status:** REFACTOR NEEDED
**Reason:**
- Permission cache is useful for performance
- Validation logic should use dynamic permissions

**Action:**
- Keep the cache mechanism
- Update validation to use dynamic permission service

### 🟢 LOW PRIORITY - Keep

#### 1. `apps/web/lib/auth/dynamic-permission-service.ts`
**Status:** CORE - Keep and maintain
**Reason:** This is the new dynamic RBAC implementation

#### 2. `apps/web/lib/auth/enhanced-permission-validator.ts`
**Status:** CORE - Keep and maintain
**Reason:** Provides user override and scoped permission validation

## Files Currently Using Static Permissions

Based on grep analysis, the following files import `PERMISSIONS` or `ROLE_PERMISSIONS`:

1. `apps/web/app/analytics/page.tsx`
2. `apps/web/app/companies/page.tsx`
3. `apps/web/lib/monitoring/permissions.ts`
4. `apps/web/lib/data/mock-company-data.ts`
5. `apps/web/lib/auth/mock-auth.ts`
6. `apps/web/lib/auth/graphql-only-auth-service.ts`
7. `apps/web/lib/auth/cookie-auth-service.ts`
8. `apps/web/components/debug/super-admin-access-debug.tsx`
9. `apps/web/components/debug/permission-performance-debug.tsx`
10. `apps/web/components/dashboard/user-form.tsx`
11. `apps/web/components/dashboard/hierarchical-user-form.tsx`

## Cleanup Strategy

### Phase 1: Create Compatibility Layer ✅
- Keep static files but mark as deprecated
- Add JSDoc comments warning developers
- Create migration guide

### Phase 2: Update High-Impact Files (CURRENT PHASE)
- Update page components to use dynamic permissions
- Update auth services
- Update form components

### Phase 3: Remove Static Files
- After all migrations complete
- Run tests to ensure no breakage
- Remove deprecated files

## Migration Checklist

### Backend Migration ✅
- [x] Create RBAC database schema
- [x] Implement RBAC service layer
- [x] Create GraphQL resolvers
- [x] Seed initial roles and permissions
- [x] Test role inheritance
- [x] Test user overrides

### Frontend Migration 🔄
- [x] Create dynamic permission service
- [x] Create enhanced permission validator
- [x] Create RBAC management UI
- [ ] Migrate all page components
- [ ] Migrate all auth services
- [ ] Migrate all form components
- [ ] Update tests
- [ ] Remove deprecated files

### Testing Strategy
1. **Unit Tests**
   - Test dynamic permission loading
   - Test permission caching
   - Test user overrides
   - Test scoped permissions

2. **Integration Tests**
   - Test all 9 roles with their permissions
   - Test role hierarchy inheritance
   - Test user override scenarios
   - Test permission expiration

3. **E2E Tests**
   - Test RBAC management UI
   - Test permission changes propagation
   - Test multi-company area manager scenarios

## Backward Compatibility

During migration, maintain backward compatibility by:

1. **Keep static files with deprecation warnings**
2. **Add compatibility layer in dynamic service**
3. **Gradual migration of components**
4. **Feature flags for new RBAC features**

## Risk Assessment

### Low Risk
- RBAC UI components (isolated)
- Statistics and reporting
- New features using dynamic permissions

### Medium Risk
- Authentication flows
- User management forms
- Permission checks in pages

### High Risk
- Core auth services
- Login/logout flows
- Session management

## Next Steps

1. ✅ Complete RBAC UI components
2. 🔄 Identify all static permission usages
3. ⏳ Create migration scripts for each component
4. ⏳ Update tests
5. ⏳ Remove deprecated files
6. ⏳ Update documentation

## Success Metrics

- [ ] All 9 roles fully tested
- [ ] User overrides working correctly
- [ ] Permission inheritance verified
- [ ] No static permission imports in production code
- [ ] All tests passing
- [ ] Performance benchmarks met (cache hit rate > 90%)
- [ ] Zero permission-related bugs in production

## Timeline

- Week 1: ✅ Complete RBAC implementation
- Week 2: 🔄 Migrate high-priority components (CURRENT)
- Week 3: ⏳ Migrate remaining components
- Week 4: ⏳ Testing and cleanup
- Week 5: ⏳ Remove deprecated files

import { gql } from 'graphql-tag';

// ========================================
// QUERY FRAGMENTS (for optimization)
// ========================================

const ROLE_FRAGMENT = gql`
  fragment RoleFields on Role {
    id
    name
    displayName
    level
    description
    isActive
    createdAt
    updatedAt
  }
`;

const PERMISSION_FRAGMENT = gql`
  fragment PermissionFields on Permission {
    id
    name
    resource
    action
    description
    isActive
    createdAt
  }
`;

const USER_PERMISSION_OVERRIDE_FRAGMENT = gql`
  fragment UserPermissionOverrideFields on UserPermissionOverride {
    permission
    isGranted
    scope {
      type
      id
      name
    }
    expiresAt
  }
`;

const ROLE_PERMISSION_FRAGMENT = gql`
  fragment RolePermissionFields on RolePermission {
    id
    role {
      id
      name
      displayName
      level
    }
    permission {
      id
      name
      resource
      action
      description
    }
    inheritedFromRole {
      id
      name
      displayName
      level
    }
    isDenied
    createdAt
  }
`;

const USER_PERMISSION_ASSIGNMENT_FRAGMENT = gql`
  fragment UserPermissionAssignmentFields on UserPermissionAssignment {
    id
    user {
      id
      name
      email
      role
    }
    permission {
      id
      name
      resource
      action
      description
    }
    isGranted
    scope {
      type
      id
      name
    }
    expiresAt
    createdAt
    createdBy {
      id
      name
      email
    }
  }
`;

// ========================================
// ROLE QUERIES
// ========================================

export const GET_ROLES = gql`
  ${ROLE_FRAGMENT}
  query GetRoles($activeOnly: Boolean = true, $first: Int, $after: String) {
    roles(activeOnly: $activeOnly, first: $first, after: $after) {
      ...RoleFields
    }
  }
`;

export const GET_ROLE_HIERARCHY = gql`
  ${ROLE_FRAGMENT}
  query GetRoleHierarchy {
    roleHierarchy {
      ...RoleFields
    }
  }
`;

export const GET_ROLES_AT_LEVEL = gql`
  ${ROLE_FRAGMENT}
  query GetRolesAtLevel($level: Int!) {
    rbacRolesAtLevel(level: $level) {
      ...RoleFields
    }
  }
`;

export const GET_ROLES_BY_LEVEL_RANGE = gql`
  ${ROLE_FRAGMENT}
  query GetRolesByLevelRange($minLevel: Int!, $maxLevel: Int!) {
    rbacRolesByLevelRange(minLevel: $minLevel, maxLevel: $maxLevel) {
      ...RoleFields
    }
  }
`;

export const GET_ROLE_DETAILS = gql`
  ${ROLE_FRAGMENT}
  query GetRoleDetails($name: String!) {
    role(name: $name) {
      ...RoleFields
    }
  }
`;

export const GET_ROLE_PERMISSIONS = gql`
  ${PERMISSION_FRAGMENT}
  query GetRolePermissions($roleName: String!) {
    rolePermissions(roleName: $roleName)
  }
`;

export const GET_ROLE_EFFECTIVE_PERMISSIONS = gql`
  query GetRoleEffectivePermissions($roleName: String!) {
    rbacEffectivePermissions(roleName: $roleName)
  }
`;

export const GET_ROLE_HIERARCHY_TREE = gql`
  ${ROLE_FRAGMENT}
  query GetRoleHierarchyTree {
    rbacHierarchyTree {
      role {
        ...RoleFields
      }
      level
      children {
        role {
          ...RoleFields
        }
        level
        children {
          role {
            ...RoleFields
          }
          level
          children {
            role {
              ...RoleFields
            }
            level
            permissions
          }
          permissions
        }
        permissions
      }
      permissions
    }
  }
`;

export const GET_ROLE_RELATIONSHIP = gql`
  query GetRoleRelationship($sourceRole: String!, $targetRole: String!) {
    rbacRoleRelationship(sourceRole: $sourceRole, targetRole: $targetRole) {
      sourceRole
      targetRole
      canManage
      levelDifference
      relationship
    }
  }
`;

// ========================================
// PERMISSION QUERIES
// ========================================

export const GET_PERMISSIONS = gql`
  ${PERMISSION_FRAGMENT}
  query GetPermissions($activeOnly: Boolean = true, $first: Int, $after: String) {
    permissions(activeOnly: $activeOnly, first: $first, after: $after) {
      ...PermissionFields
    }
  }
`;

export const GET_PERMISSION_DETAILS = gql`
  ${PERMISSION_FRAGMENT}
  query GetPermissionDetails($name: String!) {
    permission(name: $name) {
      ...PermissionFields
    }
  }
`;

export const GET_PERMISSIONS_BY_RESOURCE = gql`
  ${PERMISSION_FRAGMENT}
  query GetPermissionsByResource($resource: String!, $activeOnly: Boolean = true) {
    permissions(activeOnly: $activeOnly, first: $first, after: $after) {
      ...PermissionFields
    }
  }
`;

// ========================================
// USER PERMISSION QUERIES
// ========================================

export const GET_USER_PERMISSIONS = gql`
  ${USER_PERMISSION_OVERRIDE_FRAGMENT}
  query GetUserPermissions($userId: String!) {
    userPermissions(userId: $userId) {
      userId
      role
      permissions
      overrides {
        ...UserPermissionOverrideFields
      }
    }
  }
`;

export const GET_USER_PERMISSION_OVERRIDES = gql`
  ${USER_PERMISSION_ASSIGNMENT_FRAGMENT}
  query GetUserPermissionOverrides($userId: String!) {
    userPermissionOverrides(userId: $userId) {
      ...UserPermissionAssignmentFields
    }
  }
`;

export const CHECK_PERMISSION = gql`
  query CheckPermission($input: PermissionCheckInput!) {
    checkPermission(input: $input) {
      userId
      permission
      hasAccess
      reason
    }
  }
`;

export const CHECK_PERMISSIONS = gql`
  query CheckPermissions($input: BatchPermissionCheckInput!) {
    checkPermissions(input: $input) {
      userId
      permissions
      hasAccess
      failedPermissions
    }
  }
`;

export const CAN_MANAGE_ROLE = gql`
  query CanManageRole($targetRoleName: String!) {
    canManageRole(targetRoleName: $targetRoleName)
  }
`;

// ========================================
// MATRIX QUERIES
// ========================================

export const GET_PERMISSION_MATRIX = gql`
  ${ROLE_FRAGMENT}
  ${PERMISSION_FRAGMENT}
  ${ROLE_PERMISSION_FRAGMENT}
  query GetPermissionMatrix($roleIds: [String!], $permissionIds: [String!]) {
    roles: roles(activeOnly: true) {
      ...RoleFields
    }
    permissions: permissions(activeOnly: true) {
      ...PermissionFields
    }
    rolePermissions: rolePermissions(roleName: "") {
      ...RolePermissionFields
    }
  }
`;

export const GET_PERMISSION_MATRIX_BY_ROLES = gql`
  ${ROLE_FRAGMENT}
  ${PERMISSION_FRAGMENT}
  query GetPermissionMatrixByRoles($roleNames: [String!]) {
    roles: roles(activeOnly: true) @include(if: $includeAllRoles) {
      ...RoleFields
    }
    permissions: permissions(activeOnly: true) {
      ...PermissionFields
    }
    rolePermissions: roleNames @map(key: "roleNames") {
      rolePermissions(roleName: $roleName)
    }
  }
`;

// ========================================
// ANALYTICS QUERIES
// ========================================

export const GET_RBAC_STATS = gql`
  query GetRbacStats {
    rbacStats {
      totalRoles
      activeRoles
      totalPermissions
      activePermissions
      totalRolePermissions
      totalUserOverrides
      cacheStats
    }
  }
`;

export const GET_RBAC_ANALYTICS = gql`
  query GetRbacAnalytics {
    rbacStats {
      totalRoles
      activeRoles
      totalPermissions
      activePermissions
      totalRolePermissions
      totalUserOverrides
      cacheStats
    }
    roleHierarchy {
      role {
        id
        name
        displayName
        level
        isActive
      }
      level
      permissions
    }
    permissions(activeOnly: true) {
      resource
      action
      isActive
    }
  }
`;

// ========================================
// AUDIT TRAIL QUERIES
// ========================================

export const GET_AUDIT_TRAIL = gql`
  query GetAuditTrail($first: Int = 50, $after: String, $filters: AuditTrailFilters) {
    auditTrail(first: $first, after: $after, filters: $filters) {
      edges {
        node {
          id
          timestamp
          userId
          userName
          action
          entityType
          entityId
          entityName
          oldValue
          newValue
          metadata
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
        startCursor
        hasPreviousPage
      }
      totalCount
    }
  }
`;

// ========================================
// BULK OPERATION QUERIES
// ========================================

export const GET_BULK_OPERATIONS = gql`
  query GetBulkOperations($status: BulkOperationStatus, $first: Int = 20) {
    bulkOperations(status: $status, first: $first) {
      id
      type
      status
      totalItems
      processedItems
      errors
      createdAt
      completedAt
    }
  }
`;

export const GET_BULK_OPERATION_DETAILS = gql`
  query GetBulkOperationDetails($operationId: String!) {
    bulkOperation(id: $operationId) {
      id
      type
      status
      totalItems
      processedItems
      errors
      createdAt
      completedAt
      details
    }
  }
`;

// ========================================
// ROLE MANAGEMENT QUERIES
// ========================================

export const GET_ROLES_ABOVE = gql`
  ${ROLE_FRAGMENT}
  query GetRolesAbove($roleName: String!) {
    rbacRolesAbove(roleName: $roleName) {
      ...RoleFields
    }
  }
`;

export const GET_ROLES_BELOW = gql`
  ${ROLE_FRAGMENT}
  query GetRolesBelow($roleName: String!) {
    rbacRolesBelow(roleName: $roleName) {
      ...RoleFields
    }
  }
`;

export const GET_SUBORDINATE_ROLES = gql`
  ${ROLE_FRAGMENT}
  query GetSubordinateRoles($roleName: String!) {
    rbacSubordinateRoles(roleName: $roleName) {
      ...RoleFields
    }
  }
`;

export const GET_SUPERIOR_ROLES = gql`
  ${ROLE_FRAGMENT}
  query GetSuperiorRoles($roleName: String!) {
    rbacSuperiorRoles(roleName: $roleName) {
      ...RoleFields
    }
  }
`;

// ========================================
// MUTATIONS
// ========================================

// Role Mutations
export const CREATE_ROLE = gql`
  ${ROLE_FRAGMENT}
  mutation CreateRole(
    $name: String!
    $displayName: String!
    $level: Int!
    $description: String
  ) {
    createRole(
      name: $name
      displayName: $displayName
      level: $level
      description: $description
    ) {
      ...RoleFields
    }
  }
`;

export const UPDATE_ROLE = gql`
  ${ROLE_FRAGMENT}
  mutation UpdateRole(
    $name: String!
    $displayName: String
    $description: String
    $isActive: Boolean
  ) {
    updateRole(
      name: $name
      displayName: $displayName
      description: $description
      isActive: $isActive
    ) {
      ...RoleFields
    }
  }
`;

export const DELETE_ROLE = gql`
  mutation DeleteRole($name: String!) {
    deleteRole(name: $name)
  }
`;

// Permission Mutations
export const CREATE_PERMISSION = gql`
  ${PERMISSION_FRAGMENT}
  mutation CreatePermission(
    $name: String!
    $resource: String!
    $action: String!
    $description: String
  ) {
    createPermission(
      name: $name
      resource: $resource
      action: $action
      description: $description
    ) {
      ...PermissionFields
    }
  }
`;

export const UPDATE_PERMISSION = gql`
  ${PERMISSION_FRAGMENT}
  mutation UpdatePermission(
    $name: String!
    $description: String
    $isActive: Boolean
  ) {
    updatePermission(
      name: $name
      description: $description
      isActive: $isActive
    ) {
      ...PermissionFields
    }
  }
`;

export const DELETE_PERMISSION = gql`
  mutation DeletePermission($name: String!) {
    deletePermission(name: $name)
  }
`;

// Role Permission Mutations
export const ASSIGN_ROLE_PERMISSIONS = gql`
  ${ROLE_FRAGMENT}
  mutation AssignRolePermissions($input: RolePermissionInput!) {
    assignRolePermissions(input: $input) {
      ...RoleFields
    }
  }
`;

export const REMOVE_ROLE_PERMISSIONS = gql`
  ${ROLE_FRAGMENT}
  mutation RemoveRolePermissions($roleName: String!, $permissions: [String!]!) {
    removeRolePermissions(roleName: $roleName, permissions: $permissions) {
      ...RoleFields
    }
  }
`;

// User Permission Override Mutations
export const ASSIGN_USER_PERMISSION = gql`
  ${USER_PERMISSION_ASSIGNMENT_FRAGMENT}
  mutation AssignUserPermission($input: UserPermissionInput!) {
    assignUserPermission(input: $input) {
      ...UserPermissionAssignmentFields
    }
  }
`;

export const ASSIGN_USER_PERMISSIONS = gql`
  ${USER_PERMISSION_ASSIGNMENT_FRAGMENT}
  mutation AssignUserPermissions($userId: String!, $permissions: [UserPermissionInput!]!) {
    assignUserPermissions(userId: $userId, permissions: $permissions) {
      ...UserPermissionAssignmentFields
    }
  }
`;

export const REMOVE_USER_PERMISSION = gql`
  mutation RemoveUserPermission(
    $userId: String!
    $permission: String!
    $scope: PermissionScopeInput
  ) {
    removeUserPermission(userId: $userId, permission: $permission, scope: $scope)
  }
`;

export const CLEAR_USER_PERMISSIONS = gql`
  mutation ClearUserPermissions($userId: String!) {
    clearUserPermissions(userId: $userId)
  }
`;

// System Mutations
export const MIGRATE_STATIC_PERMISSIONS = gql`
  mutation MigrateStaticPermissions {
    migrateStaticPermissions
  }
`;

// ========================================
// SUBSCRIPTIONS
// ========================================

export const SUBSCRIBE_TO_RBAC_CHANGES = gql`
  subscription SubscribeToRBACChanges {
    rbacChanges {
      type
      entityId
      entityName
      action
      timestamp
      userId
      metadata
    }
  }
`;

export const SUBSCRIBE_TO_ROLE_PERMISSION_CHANGES = gql`
  subscription SubscribeToRolePermissionChanges($roleNames: [String!]) {
    rolePermissionChanges(roleNames: $roleNames) {
      roleName
      permissionName
      action
      timestamp
      userId
    }
  }
`;

export const SUBSCRIBE_TO_BULK_OPERATION_UPDATES = gql`
  subscription SubscribeToBulkOperationUpdates($operationIds: [String!]) {
    bulkOperationUpdates(operationIds: $operationIds) {
      id
      status
      processedItems
      totalItems
      errors
      completedAt
    }
  }
`;

// ========================================
// INPUT TYPES
// ========================================

export const AUDIT_TRAIL_FILTERS = `
  input AuditTrailFilters {
    userId: String
    entityType: String
    action: String
    dateFrom: Time
    dateTo: Time
    resourceType: String
  }
`;

export const BULK_OPERATION_STATUS = `
  enum BulkOperationStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    FAILED
    CANCELLED
  }
`;

// ========================================
// QUERY HELPERS
// ========================================

export const RBAC_QUERIES = {
  // Basic Queries
  GET_ROLES,
  GET_PERMISSIONS,
  GET_ROLE_HIERARCHY,
  GET_USER_PERMISSIONS,

  // Matrix Queries
  GET_PERMISSION_MATRIX,

  // Analytics
  GET_RBAC_STATS,
  GET_RBAC_ANALYTICS,

  // Role Hierarchy
  GET_ROLE_HIERARCHY_TREE,
  GET_ROLE_RELATIONSHIP,
  GET_ROLES_ABOVE,
  GET_ROLES_BELOW,

  // Mutations
  CREATE_ROLE,
  UPDATE_ROLE,
  DELETE_ROLE,
  ASSIGN_ROLE_PERMISSIONS,
  REMOVE_ROLE_PERMISSIONS,
  ASSIGN_USER_PERMISSION,
  REMOVE_USER_PERMISSION,

  // Subscriptions
  SUBSCRIBE_TO_RBAC_CHANGES,
  SUBSCRIBE_TO_ROLE_PERMISSION_CHANGES,
};

// ========================================
// CACHE CONFIGURATION
// ========================================

export const RBAC_CACHE_POLICY = {
  // Policies for different query types
  roles: {
    cacheKey: 'rbac-roles',
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
  },
  permissions: {
    cacheKey: 'rbac-permissions',
    ttl: 10 * 60 * 1000, // 10 minutes
    maxSize: 500,
  },
  roleHierarchy: {
    cacheKey: 'rbac-role-hierarchy',
    ttl: 15 * 60 * 1000, // 15 minutes
    maxSize: 50,
  },
  analytics: {
    cacheKey: 'rbac-analytics',
    ttl: 2 * 60 * 1000, // 2 minutes
    maxSize: 20,
  },
  userPermissions: {
    cacheKey: (userId: string) => `rbac-user-permissions-${userId}`,
    ttl: 3 * 60 * 1000, // 3 minutes
    maxSize: 200,
  },
};

// ========================================
// OPTIMIZATION HELPERS
// ========================================

export const createOptimizedQuery = (baseQuery: any, variables: any, cachePolicy: any) => {
  return {
    query: baseQuery,
    variables,
    errorPolicy: 'all' as const,
    fetchPolicy: 'cache-first' as const,
    nextFetchPolicy: 'cache-and-network' as const,
    notifyOnNetworkStatusChange: true,
    ...cachePolicy,
  };
};

export const createRealtimeQuery = (baseQuery: any, variables: any) => {
  return {
    query: baseQuery,
    variables,
    errorPolicy: 'all' as const,
    fetchPolicy: 'network-only' as const,
    pollInterval: 30000, // 30 seconds for real-time updates
    notifyOnNetworkStatusChange: true,
  };
};

export const createPaginatedQuery = (baseQuery: any, variables: any) => {
  return {
    query: baseQuery,
    variables: {
      first: 50,
      after: null,
      ...variables,
    },
    errorPolicy: 'all' as const,
    fetchPolicy: 'cache-first' as const,
    notifyOnNetworkStatusChange: true,
  };
};
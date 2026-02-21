import { gql } from 'graphql-tag';

// GET ROLE HIERARCHY
export const GET_ROLE_HIERARCHY = gql`
  query GetRoleHierarchy {
    rbacHierarchyTree {
      role {
        id
        name
        displayName
        level
        description
        isActive
        createdAt
        updatedAt
      }
      level
      children {
        role {
          id
          name
          displayName
          level
          description
          isActive
          createdAt
          updatedAt
        }
        level
        children {
          role {
            id
            name
            displayName
            level
            description
            isActive
            createdAt
            updatedAt
          }
          level
        }
      }
    }
  }
`;

// GET ALL ROLES
export const GET_ROLES = gql`
  query GetRoles($activeOnly: Boolean = true) {
    roles(activeOnly: $activeOnly) {
      id
      name
      displayName
      level
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

// GET ROLE BY NAME
export const GET_ROLE_BY_NAME = gql`
  query GetRoleByName($name: String!) {
    role(name: $name) {
      id
      name
      displayName
      level
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

// GET ALL PERMISSIONS
export const GET_PERMISSIONS = gql`
  query GetPermissions($activeOnly: Boolean = true) {
    permissions(activeOnly: $activeOnly) {
      id
      name
      resource
      action
      description
      isActive
      createdAt
    }
  }
`;

// GET PERMISSION BY NAME
export const GET_PERMISSION_BY_NAME = gql`
  query GetPermissionByName($name: String!) {
    permission(name: $name) {
      id
      name
      resource
      action
      description
      isActive
      createdAt
    }
  }
`;

// GET ROLE PERMISSIONS
export const GET_ROLE_PERMISSIONS = gql`
  query GetRolePermissions($roleName: String!) {
    rolePermissions(roleName: $roleName)
  }
`;

// GET USER PERMISSIONS
export const GET_USER_PERMISSIONS = gql`
  query GetUserPermissions($userId: ID!) {
    userPermissions(userId: $userId) {
      userId
      role
      permissions
      overrides {
        permission
        isGranted
        scope {
          type
          id
        }
        expiresAt
      }
    }
  }
`;

// CHECK PERMISSION
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

// CHECK MULTIPLE PERMISSIONS
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

// GET RBAC STATS
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

// GET USER PERMISSION OVERRIDES
export const GET_USER_PERMISSION_OVERRIDES = gql`
  query GetUserPermissionOverrides($userId: String!) {
    userPermissionOverrides(userId: $userId) {
      id
      user {
        id
        username
        name
      }
      permission {
        id
        name
        resource
        action
      }
      isGranted
      scope {
        type
        id
      }
      expiresAt
      createdAt
      createdBy {
        id
        username
        name
      }
    }
  }
`;

// MUTATIONS

// CREATE ROLE
export const CREATE_ROLE = gql`
  mutation CreateRole($name: String!, $displayName: String!, $level: Int!, $description: String) {
    createRole(name: $name, displayName: $displayName, level: $level, description: $description) {
      id
      name
      displayName
      level
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

// UPDATE ROLE
export const UPDATE_ROLE = gql`
  mutation UpdateRole($name: String!, $displayName: String, $description: String, $isActive: Boolean) {
    updateRole(name: $name, displayName: $displayName, description: $description, isActive: $isActive) {
      id
      name
      displayName
      level
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

// DELETE ROLE
export const DELETE_ROLE = gql`
  mutation DeleteRole($name: String!) {
    deleteRole(name: $name)
  }
`;

// CREATE PERMISSION
export const CREATE_PERMISSION = gql`
  mutation CreatePermission($name: String!, $resource: String!, $action: String!, $description: String) {
    createPermission(name: $name, resource: $resource, action: $action, description: $description) {
      id
      name
      resource
      action
      description
      isActive
      createdAt
    }
  }
`;

// UPDATE PERMISSION
export const UPDATE_PERMISSION = gql`
  mutation UpdatePermission($name: String!, $description: String, $isActive: Boolean) {
    updatePermission(name: $name, description: $description, isActive: $isActive) {
      id
      name
      resource
      action
      description
      isActive
      createdAt
    }
  }
`;

// DELETE PERMISSION
export const DELETE_PERMISSION = gql`
  mutation DeletePermission($name: String!) {
    deletePermission(name: $name)
  }
`;

// ASSIGN ROLE PERMISSIONS
export const ASSIGN_ROLE_PERMISSIONS = gql`
  mutation AssignRolePermissions($input: RolePermissionInput!) {
    assignRolePermissions(input: $input) {
      id
      name
      displayName
      level
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

// REMOVE ROLE PERMISSIONS
export const REMOVE_ROLE_PERMISSIONS = gql`
  mutation RemoveRolePermissions($roleName: String!, $permissions: [String!]!) {
    removeRolePermissions(roleName: $roleName, permissions: $permissions) {
      id
      name
      displayName
      level
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

// ASSIGN USER PERMISSION
export const ASSIGN_USER_PERMISSION = gql`
  mutation AssignUserPermission($input: UserPermissionInput!) {
    assignUserPermission(input: $input) {
      id
      user {
        id
        username
        name
      }
      permission {
        id
        name
        resource
        action
      }
      isGranted
      scope {
        type
        id
      }
      expiresAt
      createdAt
      createdBy {
        id
        username
        name
      }
    }
  }
`;

// REMOVE USER PERMISSION
export const REMOVE_USER_PERMISSION = gql`
  mutation RemoveUserPermission($userId: String!, $permission: String!, $scope: PermissionScopeInput) {
    removeUserPermission(userId: $userId, permission: $permission, scope: $scope)
  }
`;

// CLEAR USER PERMISSIONS
export const CLEAR_USER_PERMISSIONS = gql`
  mutation ClearUserPermissions($userId: String!) {
    clearUserPermissions(userId: $userId)
  }
`;

// BATCH ASSIGN USER PERMISSIONS
export const ASSIGN_USER_PERMISSIONS = gql`
  mutation AssignUserPermissions($userId: String!, $permissions: [UserPermissionInput!]!) {
    assignUserPermissions(userId: $userId, permissions: $permissions) {
      id
      user {
        id
        username
        name
      }
      permission {
        id
        name
        resource
        action
      }
      isGranted
      scope {
        type
        id
      }
      expiresAt
      createdAt
      createdBy {
        id
        username
        name
      }
    }
  }
`;

// MIGRATE STATIC PERMISSIONS
export const MIGRATE_STATIC_PERMISSIONS = gql`
  mutation MigrateStaticPermissions {
    migrateStaticPermissions
  }
`;

// GET ROLE PERMISSION MATRIX (using separate queries)
export const GET_ROLE_PERMISSION_MATRIX = gql`
  query GetRolePermissionMatrix($activeOnly: Boolean = true) {
    roles(activeOnly: $activeOnly) {
      id
      name
      displayName
      level
      description
      isActive
      createdAt
      updatedAt
    }
    permissions(activeOnly: $activeOnly) {
      id
      name
      resource
      action
      description
      isActive
      createdAt
    }
  }
`;

// GET PERMISSION MATRIX WITH USER OVERRIDES
export const GET_PERMISSION_MATRIX_WITH_OVERRIDES = gql`
  query GetPermissionMatrixWithUserOverrides(
    $userId: String
    $activeRolesOnly: Boolean = true
    $activePermissionsOnly: Boolean = true
    $includeInheritance: Boolean = true
    $includeUserOverrides: Boolean = true
  ) {
    permissionMatrixWithUserOverrides(
      userId: $userId
      activeRolesOnly: $activeRolesOnly
      activePermissionsOnly: $activePermissionsOnly
      includeInheritance: $includeInheritance
      includeUserOverrides: $includeUserOverrides
    ) {
      matrix {
        roles {
          id
          name
          displayName
          level
          description
          isActive
          createdAt
          updatedAt
        }
        permissions {
          id
          name
          resource
          action
          description
          isActive
          createdAt
        }
        cells {
          roleId
          permissionId
          hasPermission
          isDirect
          inheritedFrom
          userOverrides {
            userId
            permissionName
            isGranted
            scope {
              type
              id
              name
            }
            expiresAt
            createdAt
            createdBy
          }
        }
        hierarchy {
          role {
            id
            name
            displayName
            level
          }
          inheritsFrom {
            id
            name
            displayName
            level
          }
          inheritsTo {
            id
            name
            displayName
            level
          }
          level
        }
      }
      statistics {
        totalRoles
        activeRoles
        totalPermissions
        activePermissions
        totalRolePermissions
        totalUserOverrides
        cacheStats {
          hitRate
          size
          lastCleanup
        }
      }
    }
  }
`;

// BULK UPDATE ROLE PERMISSIONS
export const BULK_UPDATE_ROLE_PERMISSIONS = gql`
  mutation BulkUpdateRolePermissions($input: BulkRolePermissionInput!) {
    bulkUpdateRolePermissions(input: $input) {
      success
      message
      updatedRoles {
        id
        name
        displayName
        level
      }
      updatedPermissions {
        id
        name
        resource
        action
      }
      errors {
        roleId
        permissionId
        message
      }
    }
  }
`;

// GET PERMISSION RESOURCES
export const GET_PERMISSION_RESOURCES = gql`
  query GetPermissionResources {
    permissionResources {
      resource
      count
      actions
    }
  }
`;

// GET ROLE PERMISSIONS DETAIL
export const GET_ROLE_PERMISSIONS_DETAIL = gql`
  query GetRolePermissionsDetail($roleName: String!) {
    rolePermissionsDetail(roleName: $roleName) {
      role {
        id
        name
        displayName
        level
        description
      }
      directPermissions {
        id
        name
        resource
        action
        description
      }
      inheritedPermissions {
        id
        name
        resource
        action
        description
        inheritedFrom {
          id
          name
          displayName
          level
        }
      }
      totalPermissions
      directCount
      inheritedCount
    }
  }
`;

// VALIDATE ROLE PERMISSION CHANGES
export const VALIDATE_ROLE_PERMISSION_CHANGES = gql`
  mutation ValidateRolePermissionChanges($input: BulkRolePermissionInput!) {
    validateRolePermissionChanges(input: $input) {
      isValid
      warnings {
        type
        message
        roleId
        permissionId
        severity
      }
      errors {
        type
        message
        roleId
        permissionId
        code
      }
      impact {
        usersAffected
        rolesAffected
        permissionsAffected
      }
    }
  }
`;

// =============================================================================
// FEATURE-BASED AUTHORIZATION QUERIES
// =============================================================================

// LIST FEATURES
export const LIST_FEATURES = gql`
  query ListFeatures(
    $filter: FeatureFilterInput
    $page: Int = 1
    $limit: Int = 50
  ) {
    listFeatures(filter: $filter, page: $page, limit: $limit) {
      features {
        id
        name
        displayName
        description
        module
        parentId
        isActive
        isSystem
        metadata {
          resourceType
          actions
          requiredScope
          conditions
          uiMetadata
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
`;

// GET FEATURE BY ID
export const GET_FEATURE = gql`
  query GetFeature($id: ID!) {
    getFeature(id: $id) {
      id
      name
      displayName
      description
      module
      parentId
      parent {
        id
        name
        displayName
        module
      }
      children {
        id
        name
        displayName
        description
        module
        isActive
      }
      isActive
      isSystem
      metadata {
        resourceType
        actions
        requiredScope
        conditions
        uiMetadata
      }
      createdAt
      updatedAt
    }
  }
`;

// GET FEATURE BY NAME
export const GET_FEATURE_BY_NAME = gql`
  query GetFeatureByName($name: String!) {
    getFeatureByName(name: $name) {
      id
      name
      displayName
      description
      module
      parentId
      parent {
        id
        name
        displayName
        module
      }
      children {
        id
        name
        displayName
        description
        module
        isActive
      }
      isActive
      isSystem
      metadata {
        resourceType
        actions
        requiredScope
        conditions
        uiMetadata
      }
      createdAt
      updatedAt
    }
  }
`;

// GET FEATURE HIERARCHY
export const GET_FEATURE_HIERARCHY = gql`
  query GetFeatureHierarchy($module: String) {
    getFeatureHierarchy(module: $module) {
      feature {
        id
        name
        displayName
        description
        module
        isActive
        isSystem
        metadata {
          resourceType
          actions
          requiredScope
          uiMetadata
        }
      }
      children {
        feature {
          id
          name
          displayName
          description
          module
          isActive
          isSystem
          metadata {
            resourceType
            actions
            requiredScope
            uiMetadata
          }
        }
        children {
          feature {
            id
            name
            displayName
            description
            module
            isActive
            isSystem
          }
        }
        depth
      }
      depth
    }
  }
`;

// GET USER FEATURES
export const GET_USER_FEATURES = gql`
  query GetUserFeatures($userId: ID!, $scope: FeatureScopeInput) {
    getUserFeatures(userId: $userId, scope: $scope) {
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
`;

// GET USER FEATURE OVERRIDES
export const GET_USER_FEATURE_OVERRIDES = gql`
  query GetUserFeatureOverrides($userId: ID!) {
    getUserFeatureOverrides(userId: $userId) {
      id
      userId
      featureId
      feature {
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
      isGranted
      scopeType
      scopeId
      effectiveFrom
      expiresAt
      grantedBy
      reason
      createdAt
      updatedAt
    }
  }
`;

// GET ROLE FEATURES
export const GET_ROLE_FEATURES = gql`
  query GetRoleFeatures($roleName: String!) {
    getRoleFeatures(roleName: $roleName) {
      id
      roleId
      featureId
      feature {
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
      inheritedFromRoleId
      isDenied
      grantedAt
      grantedBy
      expiresAt
      createdAt
    }
  }
`;

// GET FEATURE STATS
export const GET_FEATURE_STATS = gql`
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
      cacheStats
    }
  }
`;

// CHECK USER FEATURE
export const CHECK_USER_FEATURE = gql`
  query CheckUserFeature($input: FeatureCheckInput!) {
    checkUserFeature(input: $input) {
      userId
      feature
      hasAccess
      accessReason
      denialReason
      checkedAt
    }
  }
`;

// CHECK USER FEATURES
export const CHECK_USER_FEATURES = gql`
  query CheckUserFeatures($input: BatchFeatureCheckInput!) {
    checkUserFeatures(input: $input) {
      userId
      features
      hasAccess
      grantedFeatures
      deniedFeatures
    }
  }
`;

// =============================================================================
// FEATURE-BASED AUTHORIZATION MUTATIONS
// =============================================================================

// CREATE FEATURE
export const CREATE_FEATURE = gql`
  mutation CreateFeature($input: CreateFeatureInput!) {
    createFeature(input: $input) {
      id
      name
      displayName
      description
      module
      parentId
      isActive
      isSystem
      metadata {
        resourceType
        actions
        requiredScope
        conditions
        uiMetadata
      }
      createdAt
      updatedAt
    }
  }
`;

// UPDATE FEATURE
export const UPDATE_FEATURE = gql`
  mutation UpdateFeature($input: UpdateFeatureInput!) {
    updateFeature(input: $input) {
      id
      name
      displayName
      description
      module
      parentId
      isActive
      isSystem
      metadata {
        resourceType
        actions
        requiredScope
        conditions
        uiMetadata
      }
      createdAt
      updatedAt
    }
  }
`;

// DELETE FEATURE
export const DELETE_FEATURE = gql`
  mutation DeleteFeature($id: ID!) {
    deleteFeature(id: $id)
  }
`;

// GRANT USER FEATURE
export const GRANT_USER_FEATURE = gql`
  mutation GrantUserFeature($input: GrantUserFeatureInput!) {
    grantUserFeature(input: $input) {
      id
      userId
      featureId
      feature {
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
      isGranted
      scopeType
      scopeId
      effectiveFrom
      expiresAt
      grantedBy
      reason
      createdAt
      updatedAt
    }
  }
`;

// DENY USER FEATURE
export const DENY_USER_FEATURE = gql`
  mutation DenyUserFeature($input: DenyUserFeatureInput!) {
    denyUserFeature(input: $input) {
      id
      userId
      featureId
      feature {
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
      isGranted
      scopeType
      scopeId
      effectiveFrom
      expiresAt
      grantedBy
      reason
      createdAt
      updatedAt
    }
  }
`;

// REVOKE USER FEATURE
export const REVOKE_USER_FEATURE = gql`
  mutation RevokeUserFeature($input: RevokeUserFeatureInput!) {
    revokeUserFeature(input: $input)
  }
`;

// CLEAR USER FEATURES
export const CLEAR_USER_FEATURES = gql`
  mutation ClearUserFeatures($userId: ID!) {
    clearUserFeatures(userId: $userId)
  }
`;

// ASSIGN ROLE FEATURES
export const ASSIGN_ROLE_FEATURES = gql`
  mutation AssignRoleFeatures($input: AssignRoleFeaturesInput!) {
    assignRoleFeatures(input: $input) {
      id
      roleId
      featureId
      feature {
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
      inheritedFromRoleId
      isDenied
      grantedAt
      grantedBy
      expiresAt
      createdAt
    }
  }
`;

// REMOVE ROLE FEATURES
export const REMOVE_ROLE_FEATURES = gql`
  mutation RemoveRoleFeatures($roleName: String!, $features: [String!]!) {
    removeRoleFeatures(roleName: $roleName, features: $features)
  }
`;

// BULK GRANT USER FEATURES
export const BULK_GRANT_USER_FEATURES = gql`
  mutation BulkGrantUserFeatures(
    $userIds: [ID!]!
    $features: [String!]!
    $scope: FeatureScopeInput
    $reason: String
  ) {
    bulkGrantUserFeatures(userIds: $userIds, features: $features, scope: $scope, reason: $reason) {
      id
      userId
      featureId
      feature {
        id
        name
        displayName
        description
        module
      }
      isGranted
      scopeType
      scopeId
      grantedBy
      reason
      createdAt
    }
  }
`;
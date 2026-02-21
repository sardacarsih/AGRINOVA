import { gql } from 'graphql-tag';

export const GET_ROLES = gql`
  query GetRoles($activeOnly: Boolean) {
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

export const GET_ROLE_HIERARCHY = gql`
  query GetRoleHierarchy {
    rbacHierarchyTree {
      role {
        id
        name
        displayName
        level
        description
      }
      level
      children {
        role {
          id
          name
          displayName
          level
          description
        }
        level
        children {
          role {
            id
            name
            displayName
            level
            description
          }
          level
        }
      }
    }
  }
`;

export const GET_PERMISSIONS = gql`
  query GetPermissions($activeOnly: Boolean) {
    permissions(activeOnly: $activeOnly) {
      id
      name
      resource
      action
      description
      isActive
    }
  }
`;

export const GET_ROLE_PERMISSIONS = gql`
  query GetRolePermissions($roleName: String!) {
    rolePermissions(roleName: $roleName)
  }
`;

export const GET_RBAC_STATS = gql`
  query GetRBACStats {
    rbacStats {
      totalRoles
      activeRoles
      totalPermissions
      activePermissions
      totalRolePermissions
      totalUserOverrides
    }
  }
`;

// Mutations
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

export const UPDATE_ROLE = gql`
  mutation UpdateRole($name: String!, $displayName: String, $description: String, $isActive: Boolean) {
    updateRole(name: $name, displayName: $displayName, description: $description, isActive: $isActive) {
      id
      name
      displayName
      level
      description
      isActive
      updatedAt
    }
  }
`;

export const DELETE_ROLE = gql`
  mutation DeleteRole($name: String!) {
    deleteRole(name: $name)
  }
`;

export const ASSIGN_ROLE_PERMISSIONS = gql`
  mutation AssignRolePermissions($input: RolePermissionInput!) {
    assignRolePermissions(input: $input) {
      id
      name
    }
  }
`;

export const GET_USER_PERMISSION_OVERRIDES = gql`
  query GetUserPermissionOverrides($userId: String!) {
    userPermissionOverrides(userId: $userId) {
      id
      user {
        id
        nama
        username
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
      }
      expiresAt
      createdAt
      createdBy {
        nama
        username
      }
    }
  }
`;

export const ASSIGN_USER_PERMISSION = gql`
  mutation AssignUserPermission($input: UserPermissionInput!) {
    assignUserPermission(input: $input) {
      id
      user {
        id
        nama
        username
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
    }
  }
`;

export const BATCH_ASSIGN_USER_PERMISSIONS = gql`
  mutation BatchAssignUserPermissions($userId: String!, $permissions: [UserPermissionInput!]!) {
    assignUserPermissions(userId: $userId, permissions: $permissions) {
      id
      permission {
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
    }
  }
`;

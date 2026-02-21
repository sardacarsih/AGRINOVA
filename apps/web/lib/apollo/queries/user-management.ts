import { gql } from 'graphql-tag';

// User fragments
export const USER_FRAGMENT = gql`
  fragment UserFragment on User {
    id
    username
    name
    email
    noTelpon
    role
    companyId
    company {
      id
      name
    }
    isActive
    createdAt
    updatedAt
  }
`;

export const USER_MUTATION_RESPONSE_FRAGMENT = gql`
  fragment UserMutationResponseFragment on UserMutationResponse {
    success
    message
    user {
      ...UserFragment
    }
    errors {
      field
      message
      code
    }
  }
  ${USER_FRAGMENT}
`;

// User Queries
export const GET_USERS = gql`
  query GetUsers(
    $companyId: String
    $role: UserRole
    $isActive: Boolean
    $search: String
    $limit: Int
    $offset: Int
  ) {
    users(
      companyId: $companyId
      role: $role
      isActive: $isActive
      search: $search
      limit: $limit
      offset: $offset
    ) {
      users {
        ...UserFragment
      }
      totalCount
      hasNextPage
      pageInfo {
        currentPage
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
  ${USER_FRAGMENT}
`;

export const GET_USER_BY_ID = gql`
  query GetUserById($id: ID!) {
    user(id: $id) {
      ...UserFragment
    }
  }
  ${USER_FRAGMENT}
`;

export const GET_USERS_BY_COMPANY = gql`
  query GetUsersByCompany($companyId: String!) {
    usersByCompany(companyId: $companyId) {
      ...UserFragment
    }
  }
  ${USER_FRAGMENT}
`;

export const GET_USERS_BY_ROLE = gql`
  query GetUsersByRole($role: UserRole!) {
    usersByRole(role: $role) {
      ...UserFragment
    }
  }
  ${USER_FRAGMENT}
`;

// User Mutations
export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      ...UserMutationResponseFragment
    }
  }
  ${USER_MUTATION_RESPONSE_FRAGMENT}
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      ...UserMutationResponseFragment
    }
  }
  ${USER_MUTATION_RESPONSE_FRAGMENT}
`;

export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      ...UserMutationResponseFragment
    }
  }
  ${USER_MUTATION_RESPONSE_FRAGMENT}
`;

export const TOGGLE_USER_STATUS = gql`
  mutation ToggleUserStatus($id: ID!) {
    toggleUserStatus(id: $id) {
      ...UserMutationResponseFragment
    }
  }
  ${USER_MUTATION_RESPONSE_FRAGMENT}
`;

export const RESET_USER_PASSWORD = gql`
  mutation ResetUserPassword($input: ResetPasswordInput!) {
    resetUserPassword(input: $input) {
      ...UserMutationResponseFragment
    }
  }
  ${USER_MUTATION_RESPONSE_FRAGMENT}
`;

// Role Hierarchy Queries
export const GET_ROLE_INFO = gql`
  query GetRoleInfo($role: UserRole!) {
    roleInfo(role: $role) {
      role
      level
      name
      description
      permissions
      webAccess
      mobileAccess
    }
  }
`;

export const GET_ALL_ROLES = gql`
  query GetAllRoles {
    allRoles {
      role
      level
      name
      description
      permissions
      webAccess
      mobileAccess
    }
  }
`;

export const GET_ACCESSIBLE_ROLES = gql`
  query GetAccessibleRoles($requesterRole: UserRole!) {
    getAccessibleRoles(requesterRole: $requesterRole)
  }
`;

export const GET_MANAGEABLE_ROLES = gql`
  query GetManageableRoles($requesterRole: UserRole!) {
    getManageableRoles(requesterRole: $requesterRole)
  }
`;

export const GET_ASSIGNABLE_ROLES = gql`
  query GetAssignableRoles($requesterRole: UserRole!) {
    getAssignableRoles(requesterRole: $requesterRole)
  }
`;

export const CHECK_ROLE_ACCESS = gql`
  query CheckRoleAccess($requesterRole: UserRole!, $targetRole: UserRole!) {
    checkRoleAccess(requesterRole: $requesterRole, targetRole: $targetRole) {
      canAccess
      canManage
      canAssignRole
      requesterRole
      targetRole
      explanation
    }
  }
`;

// Type definitions for TypeScript
export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  noTelpon?: string;
  role: UserRole;
  companyId: string;
  company: {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
}

export interface UserListResponse {
  users: User[];
  totalCount: number;
  hasNextPage: boolean;
  pageInfo: {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface GetUsersByCompanyResponse {
  usersByCompany: User[];
}

export interface UserMutationResponse {
  success: boolean;
  message: string;
  user?: User;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface RoleInfo {
  role: UserRole;
  level: number;
  name: string;
  description: string;
  permissions: string[];
  webAccess: boolean;
  mobileAccess: boolean;
}

export interface RoleAccessCheck {
  canAccess: boolean;
  canManage: boolean;
  canAssignRole: boolean;
  requesterRole: UserRole;
  targetRole: UserRole;
  explanation?: string;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  AREA_MANAGER = 'AREA_MANAGER',
  MANAGER = 'MANAGER',
  ASISTEN = 'ASISTEN',
  MANDOR = 'MANDOR',
  SATPAM = 'SATPAM',
}

export interface CreateUserInput {
  username: string;
  name: string;
  email?: string;
  noTelpon?: string;
  role: UserRole;
  companyId: string;
  password: string;
  isActive?: boolean;
}

export interface UpdateUserInput {
  id: string;
  username?: string;
  name?: string;
  email?: string;
  noTelpon?: string;
  role?: UserRole;
  companyId?: string;
  isActive?: boolean;
}

export interface ResetPasswordInput {
  userId: string;
  newPassword: string;
  requirePasswordChange?: boolean;
  logoutOtherDevices?: boolean;
}

// Filter types for user queries
export interface UserFilters {
  companyId?: string;
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}
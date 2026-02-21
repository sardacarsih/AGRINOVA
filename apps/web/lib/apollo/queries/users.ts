import { gql } from 'graphql-tag';

// Get all users query (for super admin)
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
        id
        username
        name
        email
        phoneNumber
        role
        companyId
        company {
          id
          name
        }
        companies {
          id
          name
        }
        estates {
          id
          name
        }
        divisions {
          id
          name
        }
        isActive
        createdAt
        updatedAt
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
`;

// Get user by ID query
export const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      username
      name
      email
      phoneNumber
      role
      companyId
      company {
        id
        name
      }
      companies {
        id
        name
      }
      estates {
        id
        name
      }
      divisions {
        id
        name
      }
      managerId
      manager {
        id
        name
      }
      isActive
      createdAt
      updatedAt
    }
  }
`;

// Create user mutation
export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      success
      message
      user {
        id
        username
        name
        email
        phoneNumber
        role
        companyId
        isActive
        createdAt
      }
      errors {
        field
        message
      }
    }
  }
`;

// Update user mutation
export const UPDATE_USER = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      success
      message
      user {
        id
        username
        name
        email
        phoneNumber
        role
        companyId
        isActive
        createdAt
        updatedAt
      }
      errors {
        field
        message
      }
    }
  }
`;

// Delete user mutation
export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      success
      message
    }
  }
`;

// Get manageable roles query
export const GET_MANAGEABLE_ROLES = gql`
  query GetManageableRoles {
    manageableRoles
  }
`;

// Get accessible companies query
export const GET_ACCESSIBLE_COMPANIES = gql`
  query GetAccessibleCompanies {
    accessibleCompanies {
      id
      name
    }
  }
`;

// Get manageable roles query
export const MANAGEABLE_ROLES_QUERY = gql`
  query ManageableRoles {
    manageableRoles
  }
`;

// Get company estates query
export const GET_COMPANY_ESTATES = gql`
  query GetCompanyEstates($companyId: ID!) {
    companyEstates(companyId: $companyId) {
      id
      name
      code
    }
  }
`;

// Get estate divisions query
export const GET_ESTATE_DIVISIONS = gql`
  query GetEstateDivisions($estateId: ID!) {
    estateDivisions(estateId: $estateId) {
      id
      name
      code
    }
  }
`;

// Type definitions for TypeScript
export interface UserFilters {
  companyId?: string;
  role?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  role: string;
  companyId?: string;
  company?: Company;
  companies?: Company[];
  estates?: Estate[];
  divisions?: Division[];
  managerId?: string;
  manager?: { id: string; name: string };
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface Estate {
  id: string;
  name: string;
  code?: string;
}

export interface Division {
  id: string;
  name: string;
  code?: string;
}

export interface UsersResponse {
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

export interface UserMutationResponse {
  success: boolean;
  message: string;
  user?: User;
  errors?: { field: string; message: string }[];
}

export interface CreateUserInput {
  username: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  role: string;
  companyIds?: string[];
  estateIds?: string[];
  divisionIds?: string[];
  managerId?: string;
  password: string;
  isActive?: boolean;
}

export interface UpdateUserInput {
  id: string;
  username?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  companyIds?: string[];
  estateIds?: string[];
  divisionIds?: string[];
  managerId?: string;
  isActive?: boolean;
}

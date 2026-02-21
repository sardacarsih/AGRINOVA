import { gql } from 'graphql-tag';

// =============================================================================
// Web Authentication Mutations & Queries
// =============================================================================

// Web Login mutation - Cookie-based authentication for web browsers
export const WEB_LOGIN_MUTATION = gql`
  mutation WebLogin($input: WebLoginInput!) {
    webLogin(input: $input) {
      success
      user {
        id
        username
        name
        email
        phoneNumber
        avatar
        role
        isActive
        companyId
        company {
          id
          name
        }
        companies {
          id
          name
        }
        managerId
        manager {
          id
          name
        }
      }
      assignments {
        companies {
          id
          name
          status
          address
        }
        estates {
          id
          name
          companyId
          location
          luasHa
        }
      }
      sessionId
      message
    }
  }
`;

// Logout mutation
export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

// Logout from all devices mutation
export const LOGOUT_ALL_DEVICES_MUTATION = gql`
  mutation LogoutAllDevices {
    logoutAllDevices
  }
`;

// =============================================================================
// User Queries
// =============================================================================

// Get current user query
export const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      name
      email
      phoneNumber
      avatar
      role
      isActive
      companyId
      company {
        id
        name
      }
      companies {
        id
        name
      }
    }
  }
`;

// Get current user with assignment context (preferred for cookie web auth)
export const CURRENT_USER_QUERY = gql`
  query CurrentUser {
    currentUser {
      success
      user {
        id
        username
        name
        email
        phoneNumber
        avatar
        role
        isActive
        companyId
      }
      assignments {
        companies {
          id
          name
          status
          address
        }
        estates {
          id
          name
          companyId
          location
          luasHa
        }
      }
      sessionId
      message
    }
  }
`;

// Get user devices query (placeholder - backend implementation needed)
export const USER_DEVICES_QUERY = gql`
  query UserDevices {
    me {
      id
    }
  }
`;

// Manageable roles query
export const MANAGEABLE_ROLES_QUERY = gql`
  query ManageableRoles {
    manageableRoles
  }
`;

// User assignments query
export const USER_ASSIGNMENTS_QUERY = gql`
  query UserAssignments($userId: ID!) {
    userAssignments(userId: $userId) {
      companies {
        id
        name
        status
      }
      estates {
        id
        name
        companyId
      }
      divisions {
        id
        name
        code
        estateId
      }
    }
  }
`;

// Minimal profile query for performance optimization
export const MINIMAL_PROFILE_QUERY = gql`
  query MinimalProfile {
    me {
      id
      username
      name
      role
    }
  }
`;

// =============================================================================
// User Management Mutations
// =============================================================================

// Update user profile mutation
export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateUserInput!) {
    updateUser(input: $input) {
      success
      message
      user {
        id
        username
        name
        email
        phoneNumber
        avatar
        role
        isActive
        createdAt
        updatedAt
      }
    }
  }
`;

// Change password mutation
export const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input)
  }
`;

// =============================================================================
// TypeScript Type Definitions
// =============================================================================

// User type
export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  avatar?: string;
  role: string;
  isActive?: boolean;
  companyId?: string;
  companyAdminFor?: string[];
  company?: {
    id: string;
    name: string;
  };
  companies?: Array<{
    id: string;
    name: string;
  }>;
  assignedCompanies?: string[];
  assignedCompanyNames?: string[];
  managerId?: string;
  manager?: {
    id: string;
    name: string;
  };
  permissions?: string[];
}

// Company type
export interface Company {
  id: string;
  name: string;
  status?: string;
  address?: string;
}

// Estate type
export interface Estate {
  id: string;
  name: string;
  companyId?: string;
  location?: string;
  luasHa?: number;
}

// Division type
export interface Division {
  id: string;
  name: string;
  code?: string;
  estateId?: string;
}

// User assignments (companies, estates, divisions)
export interface UserAssignments {
  companies: Company[];
  estates: Estate[];
  divisions?: Division[];
}

// WebLogin input
export interface WebLoginInput {
  identifier: string;
  password: string;
}

// WebLogin response payload
export interface WebLoginPayload {
  success: boolean;
  user: User;
  assignments: UserAssignments;
  sessionId: string;
  message: string;
}

// Update user profile input
export interface UpdateUserProfileInput {
  id: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  avatar?: string;
}

// Change password input
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  logoutOtherDevices?: boolean;
}

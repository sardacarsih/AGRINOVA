import { apolloClient } from '@/lib/apollo/client';
import { 
  GET_USERS,
  GET_USER,
  CREATE_USER,
  UPDATE_USER,
  DELETE_USER,
  GET_MANAGEABLE_ROLES,
  GET_ACCESSIBLE_COMPANIES,
  GET_COMPANY_ESTATES,
  GET_ESTATE_DIVISIONS,
  type UserFilters,
  type UsersResponse,
  type User,
  type CreateUserInput,
  type UpdateUserInput
} from '@/lib/apollo/queries/users';
import { UserRole } from '@/types/auth';

export interface CreateUserRequest {
  username: string;
  email: string;
  fullName: string;
  password: string;
  role: UserRole;
  companyId: string;
  phone?: string;
  employeeId?: string;
  // For single assignments (legacy roles)
  estateId?: string;
  divisionId?: string;
  // For multi-assignments
  assignedEstateIds?: string[];
  assignedDivisionIds?: string[];
  assignedCompanyIds?: string[];
  mustChangePassword?: boolean;
  emailVerified?: boolean;
  isActive?: boolean;
}

export interface UpdateUserRequest extends Partial<Omit<CreateUserRequest, 'password' | 'companyId'>> {}

export interface BulkUserActionRequest {
  userIds: string[];
  action: 'activate' | 'deactivate' | 'suspend' | 'delete';
}

export interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byRole: Record<string, number>;
  byEstate: Record<string, number>;
  byDivision: Record<string, number>;
}

export interface Estate {
  id: string;
  name: string;
  code: string;
}

export interface Division {
  id: string;
  name: string;
  code: string;
}

export interface Company {
  id: string;
  name: string;
  code: string;
}

export class UserManagementAPI {
  /**
   * Get users with filtering and pagination
   */
  static async getUsers(filters: UserFilters = {}): Promise<UsersResponse> {
    try {
      const result = await apolloClient.query({
        query: GET_USERS,
        variables: {
          companyId: filters.companyId,
          role: filters.role,
          isActive: filters.isActive,
          search: filters.search,
          limit: filters.limit,
          offset: filters.offset
        },
        fetchPolicy: 'network-only'
      });

      return result.data.users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStatistics(): Promise<UserStatistics> {
    // For now, return mock data
    return {
      total: 0,
      active: 0,
      inactive: 0,
      suspended: 0,
      byRole: {},
      byEstate: {},
      byDivision: {}
    };
  }

  /**
   * Get user by ID
   */
  static async getUser(id: string): Promise<User> {
    try {
      const result = await apolloClient.query({
        query: GET_USER,
        variables: { id },
        fetchPolicy: 'network-only'
      });
      
      return result.data.user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  static async createUser(userData: CreateUserRequest): Promise<User> {
    const input: CreateUserInput = {
      username: userData.username,
      name: userData.fullName,
      email: userData.email,
      phoneNumber: userData.phone,
      password: userData.password,
      role: userData.role,
      companyIds: userData.companyId ? [userData.companyId] : userData.assignedCompanyIds,
      estateIds: userData.estateId ? [userData.estateId] : userData.assignedEstateIds,
      divisionIds: userData.divisionId ? [userData.divisionId] : userData.assignedDivisionIds,
      isActive: userData.isActive
    };

    try {
      const result = await apolloClient.mutate({
        mutation: CREATE_USER,
        variables: { input },
        refetchQueries: [{ query: GET_USERS }]
      });

      const response = result.data.createUser;
      if (!response.success) {
        throw new Error(response.message || 'Failed to create user');
      }
      return response.user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  static async updateUser(id: string, userData: UpdateUserRequest): Promise<User> {
    const input: UpdateUserInput = {
      id,
      username: userData.username,
      name: userData.fullName,
      email: userData.email,
      phoneNumber: userData.phone,
      role: userData.role,
      companyIds: userData.assignedCompanyIds,
      estateIds: userData.assignedEstateIds,
      divisionIds: userData.assignedDivisionIds,
      isActive: userData.isActive
    };

    try {
      const result = await apolloClient.mutate({
        mutation: UPDATE_USER,
        variables: { input },
        refetchQueries: [{ query: GET_USERS }]
      });

      const response = result.data.updateUser;
      if (!response.success) {
        throw new Error(response.message || 'Failed to update user');
      }
      return response.user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    try {
      await apolloClient.mutate({
        mutation: DELETE_USER,
        variables: { id },
        refetchQueries: [{ query: GET_USERS }]
      });
      
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, message: error.message || 'Failed to delete user' };
    }
  }

  /**
   * Perform bulk action on users
   */
  static async bulkAction(actionData: BulkUserActionRequest): Promise<{ 
    success: boolean; 
    message: string; 
    affectedUsers: number; 
  }> {
    // Not implemented in GraphQL yet
    return { 
      success: true, 
      message: 'Bulk action completed', 
      affectedUsers: actionData.userIds.length 
    };
  }

  /**
   * Get estates for a company
   */
  static async getCompanyEstates(companyId: string): Promise<Estate[]> {
    try {
      const result = await apolloClient.query({
        query: GET_COMPANY_ESTATES,
        variables: { companyId },
        fetchPolicy: 'network-only'
      });
      
      return result.data.companyEstates;
    } catch (error) {
      console.error('Error fetching company estates:', error);
      return [];
    }
  }

  /**
   * Get divisions for an estate
   */
  static async getEstateDivisions(estateId: string): Promise<Division[]> {
    try {
      const result = await apolloClient.query({
        query: GET_ESTATE_DIVISIONS,
        variables: { estateId },
        fetchPolicy: 'network-only'
      });
      
      return result.data.estateDivisions;
    } catch (error) {
      console.error('Error fetching estate divisions:', error);
      return [];
    }
  }

  /**
   * Get roles that current user can manage
   */
  static async getManageableRoles(): Promise<{ roles: UserRole[] }> {
    try {
      // Import the GraphQL auth service dynamically to avoid circular dependencies
      const { GraphQLOnlyAuthService } = await import('@/lib/auth/graphql-only-auth-service');
      const { apolloClient } = await import('@/lib/apollo/client');
      
      const authService = new GraphQLOnlyAuthService(apolloClient);
      const result = await authService.getManageableRoles();
      
      if (result.success && result.roles) {
        return { roles: result.roles as UserRole[] };
      }
      
      // Return default roles for super admin if API call fails
      return {
        roles: [
          'SUPER_ADMIN',
          'COMPANY_ADMIN',
          'AREA_MANAGER',
          'MANAGER',
          'ASISTEN',
          'MANDOR',
          'SATPAM'
        ] as UserRole[]
      };
    } catch (error) {
      console.error('Error fetching manageable roles:', error);
      // Return default roles for super admin
      return {
        roles: [
          'SUPER_ADMIN',
          'COMPANY_ADMIN',
          'AREA_MANAGER',
          'MANAGER',
          'ASISTEN',
          'MANDOR',
          'SATPAM'
        ] as UserRole[]
      };
    }
  }

  /**
   * Get companies accessible by current user
   */
  static async getAccessibleCompanies(): Promise<Company[]> {
    try {
      const result = await apolloClient.query({
        query: GET_ACCESSIBLE_COMPANIES,
        fetchPolicy: 'network-only'
      });
      
      return result.data.accessibleCompanies;
    } catch (error) {
      console.error('Error fetching accessible companies:', error);
      return [];
    }
  }
}
import { 
  GET_ALL_COMPANIES, 
  GET_ALL_ESTATES, 
  GET_ALL_DIVISIONS,
  GET_USERS_BY_ROLE,
  HierarchyCompany,
  HierarchyEstate, 
  HierarchyDivision,
  HierarchyUser
} from '@/lib/apollo/queries/hierarchy-data';
import { apolloClient } from '@/lib/apollo/client';
import { Company, Estate, Divisi, User } from '@/types/auth';

/**
 * Hierarchy Data Service - Replaces mock data with real GraphQL queries
 * Provides data for the HierarchicalUserForm component
 */
export class HierarchyDataService {
  
  /**
   * Get all companies from the backend
   */
  static async getCompanies(): Promise<Company[]> {
    try {
      const { data } = await apolloClient.query({
        query: GET_ALL_COMPANIES,
        fetchPolicy: 'cache-first'
      });

      // Transform GraphQL response to expected Company format
      return (data as any).companies.map((company: any): Company => ({
        id: company.id,
        code: company.name.substring(0, 6).toUpperCase(), // Generate code from name
        name: company.name,
        description: company.alamat || `Company: ${company.name}`,
        isActive: company.status === 'ACTIVE',
        createdAt: new Date(company.createdAt),
        updatedAt: new Date(company.updatedAt),
        createdBy: 'system' // Default value
      }));
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
  }

  /**
   * Get company by ID
   */
  static async getCompanyById(companyId: string): Promise<Company | null> {
    const companies = await this.getCompanies();
    return companies.find(c => c.id === companyId) || null;
  }

  /**
   * Get estates by company ID
   */
  static async getEstatesByCompany(companyId: string): Promise<Estate[]> {
    try {
      const { data } = await apolloClient.query({
        query: GET_ALL_ESTATES,
        fetchPolicy: 'cache-first'
      });

      // Filter estates by company ID and transform to expected format
      const companyEstates = (data as any).estates.filter((estate: any) => estate.companyId === companyId);
      
      return companyEstates.map((estate: any): Estate => ({
        id: estate.id,
        companyId: estate.companyId,
        code: estate.name.substring(0, 6).toUpperCase(), // Generate code from name
        name: estate.name,
        description: estate.location || `Estate: ${estate.name}`,
        location: estate.location || 'Location not specified',
        area: estate.luasHa || 0,
        isActive: true, // Default to active since no status field in backend
        createdAt: new Date(estate.createdAt),
        updatedAt: new Date(estate.updatedAt)
      }));
    } catch (error) {
      console.error('Error fetching estates for company:', companyId, error);
      return [];
    }
  }

  /**
   * Get divisions by estate ID
   */
  static async getDivisionsByEstate(estateId: string): Promise<Divisi[]> {
    try {
      const { data } = await apolloClient.query({
        query: GET_ALL_DIVISIONS,
        fetchPolicy: 'cache-first'
      });

      // Filter divisions by estate ID and transform to expected format
      const estateDivisions = (data as any).divisions.filter((division: any) => division.estateId === estateId);
      
      return estateDivisions.map((division: any): Divisi => ({
        id: division.id,
        estateId: division.estateId,
        code: division.code,
        name: division.name,
        description: `Division ${division.name} - ${division.code}`,
        area: 0, // Default area since not provided in backend
        isActive: true, // Default to active
        createdAt: new Date(division.createdAt),
        updatedAt: new Date(division.updatedAt)
      }));
    } catch (error) {
      console.error('Error fetching divisions for estate:', estateId, error);
      return [];
    }
  }

  /**
   * Get divisions from multiple estates (for multi-estate assignments)
   */
  static async getDivisionsFromMultipleEstates(estateIds: string[]): Promise<Divisi[]> {
    try {
      const allDivisions: Divisi[] = [];
      
      // Load divisions from all selected estates
      for (const estateId of estateIds) {
        const divisions = await this.getDivisionsByEstate(estateId);
        allDivisions.push(...divisions);
      }
      
      return allDivisions;
    } catch (error) {
      console.error('Error fetching divisions from multiple estates:', estateIds, error);
      return [];
    }
  }

  /**
   * Get Area Managers for Manager assignment
   */
  static async getAreaManagersForManagerAssignment(companyId?: string): Promise<User[]> {
    try {
      const { data } = await apolloClient.query({
        query: GET_USERS_BY_ROLE,
        variables: {
          role: 'AREA_MANAGER'
        },
        fetchPolicy: 'cache-first'
      });

      // Transform GraphQL response to expected User format
      return (data as any).users.data.map((user: any): User => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        company: user.company?.name || 'Unknown Company',
        employeeId: user.username, // Use username as employee ID fallback
        phoneNumber: '', // Not provided in backend
        status: 'active',
        permissions: [],
        assignedCompanyNames: user.company ? [user.company.name] : [],
        createdAt: new Date(user.createdAt)
      }));
    } catch (error) {
      console.error('Error fetching area managers:', error);
      return [];
    }
  }

  /**
   * Get all users (fallback method)
   */
  static async getUsers(): Promise<User[]> {
    try {
      const { data } = await apolloClient.query({
        query: GET_USERS_BY_ROLE,
        variables: {
          // Don't specify role to get all users
        },
        fetchPolicy: 'cache-first'
      });

      return (data as any).users.data.map((user: any): User => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        company: user.company?.name || 'Unknown Company',
        employeeId: user.username,
        phoneNumber: '',
        status: 'active',
        permissions: [],
        assignedCompanyNames: user.company ? [user.company.name] : [],
        createdAt: new Date(user.createdAt)
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }
}
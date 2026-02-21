import { GraphQLCompanyService } from './graphql-company-service';
import { Company } from '@/types/auth';

export interface CreateCompanyDto {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateCompanyDto {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CompanyQueryDto {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

class CompanyApiService {
  private readonly basePath = '/companies';

  async getCompanies(query?: CompanyQueryDto): Promise<any> {
    // This method would typically be used in a non-React context
    // For React components, use GraphQLCompanyService.useGetCompanies() instead
    throw new Error('Use GraphQLCompanyService.useGetCompanies() in React components');
  }

  async getCompany(id: string): Promise<any> {
    // This method would typically be used in a non-React context
    // For React components, use GraphQLCompanyService.useGetCompany() instead
    throw new Error('Use GraphQLCompanyService.useGetCompany() in React components');
  }

  async createCompany(data: CreateCompanyDto): Promise<any> {
    // This method would typically be used in a non-React context
    // For React components, use GraphQLCompanyService.useCreateCompany() instead
    throw new Error('Use GraphQLCompanyService.useCreateCompany() in React components');
  }

  async updateCompany(id: string, data: UpdateCompanyDto): Promise<any> {
    // This method would typically be used in a non-React context
    // For React components, use GraphQLCompanyService.useUpdateCompany() instead
    throw new Error('Use GraphQLCompanyService.useUpdateCompany() in React components');
  }

  async deleteCompany(id: string): Promise<any> {
    // This method would typically be used in a non-React context
    // For React components, use GraphQLCompanyService.useDeleteCompany() instead
    throw new Error('Use GraphQLCompanyService.useDeleteCompany() in React components');
  }

  async getCompanyStats(id: string): Promise<any> {
    // This method would typically be used in a non-React context
    // For React components, use GraphQLCompanyService.useGetCompanyStats() instead
    throw new Error('Use GraphQLCompanyService.useGetCompanyStats() in React components');
  }
}

export const companyApiService = new CompanyApiService();
export default companyApiService;
import { GraphQLEstateService } from './graphql-estate-service';
import { Estate } from '@/types/auth';

export interface CreateEstateDto {
  code: string;
  name: string;
  description?: string;
  location?: string;
  area?: number;
  companyId: string;
  isActive?: boolean;
}

export interface UpdateEstateDto {
  code?: string;
  name?: string;
  description?: string;
  location?: string;
  area?: number;
  isActive?: boolean;
}

export interface EstateQueryDto {
  companyId?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

class EstateApiService {
  private readonly basePath = '/estates';

  async getEstates(query?: EstateQueryDto): Promise<any> {
    // This method would typically be used in a non-React context
    // For React components, use GraphQLEstateService.useGetEstates() instead
    throw new Error('Use GraphQLEstateService.useGetEstates() in React components');
  }

  async getEstatesByCompany(companyId: string): Promise<any> {
    // This method would typically be used in a non-React context
    // For React components, use GraphQLEstateService.useGetEstatesByCompany() instead
    throw new Error('Use GraphQLEstateService.useGetEstatesByCompany() in React components');
  }

  async getEstate(id: string): Promise<any> {
    // This method would typically be used in a non-React context
    // For React components, use GraphQLEstateService.useGetEstate() instead
    throw new Error('Use GraphQLEstateService.useGetEstate() in React components');
  }

  async createEstate(data: CreateEstateDto): Promise<any> {
    // This method would typically be used in a non-React context
    // For React components, use GraphQLEstateService.useCreateEstate() instead
    throw new Error('Use GraphQLEstateService.useCreateEstate() in React components');
  }

  async updateEstate(id: string, data: UpdateEstateDto): Promise<any> {
    // This method would typically be used in a non-React context
    // For React components, use GraphQLEstateService.useUpdateEstate() instead
    throw new Error('Use GraphQLEstateService.useUpdateEstate() in React components');
  }

  async deleteEstate(id: string): Promise<any> {
    // This method would typically be used in a non-React context
    // For React components, use GraphQLEstateService.useDeleteEstate() instead
    throw new Error('Use GraphQLEstateService.useDeleteEstate() in React components');
  }

  async getEstateStats(id: string): Promise<any> {
    // This method would typically be used in a non-React context
    // For React components, use GraphQLEstateService.useGetEstateStats() instead
    throw new Error('Use GraphQLEstateService.useGetEstateStats() in React components');
  }
}

export const estateApiService = new EstateApiService();
export default estateApiService;
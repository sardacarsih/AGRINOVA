import { useQuery, useMutation } from '@apollo/client/react';
import { 
  GET_COMPANIES,
  GET_COMPANY,
  CREATE_COMPANY,
  UPDATE_COMPANY,
  DELETE_COMPANY,
  GET_COMPANY_STATS
} from '@/lib/apollo/queries/company';

export interface Company {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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

export class GraphQLCompanyService {
  /**
   * Get all companies with pagination
   */
  static useGetCompanies(query?: CompanyQueryDto) {
    const { data, loading, error, refetch } = useQuery(GET_COMPANIES, {
      variables: {
        search: query?.search,
        isActive: query?.isActive,
        page: query?.page,
        limit: query?.limit
      }
    });
    
    return {
      companies: data?.companies?.data || [],
      pagination: data?.companies?.pagination,
      loading,
      error,
      refetch
    };
  }

  /**
   * Get company by ID
   */
  static useGetCompany(id: string) {
    const { data, loading, error, refetch } = useQuery(GET_COMPANY, {
      variables: { id }
    });
    
    return {
      company: data?.company,
      loading,
      error,
      refetch
    };
  }

  /**
   * Create new company
   */
  static useCreateCompany() {
    const [createCompany, { data, loading, error }] = useMutation(CREATE_COMPANY);
    
    return {
      createCompany: async (input: CreateCompanyDto) => {
        const result = await createCompany({ variables: { input } });
        return result.data?.createCompany;
      },
      company: data?.createCompany,
      loading,
      error
    };
  }

  /**
   * Update company
   */
  static useUpdateCompany() {
    const [updateCompany, { data, loading, error }] = useMutation(UPDATE_COMPANY);
    
    return {
      updateCompany: async (id: string, input: UpdateCompanyDto) => {
        const result = await updateCompany({ variables: { id, input } });
        return result.data?.updateCompany;
      },
      company: data?.updateCompany,
      loading,
      error
    };
  }

  /**
   * Delete company
   */
  static useDeleteCompany() {
    const [deleteCompany, { data, loading, error }] = useMutation(DELETE_COMPANY);
    
    return {
      deleteCompany: async (id: string) => {
        const result = await deleteCompany({ variables: { id } });
        return result.data?.deleteCompany;
      },
      result: data?.deleteCompany,
      loading,
      error
    };
  }

  /**
   * Get company statistics
   */
  static useGetCompanyStats(id: string) {
    const { data, loading, error, refetch } = useQuery(GET_COMPANY_STATS, {
      variables: { id }
    });
    
    return {
      stats: data?.companyStats,
      loading,
      error,
      refetch
    };
  }
}
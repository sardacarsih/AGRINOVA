import { useQuery, useMutation } from '@apollo/client/react';
import { 
  GET_ESTATES,
  GET_ESTATES_BY_COMPANY,
  GET_ESTATE,
  CREATE_ESTATE,
  UPDATE_ESTATE,
  DELETE_ESTATE,
  GET_ESTATE_STATS
} from '@/lib/apollo/queries/estate';

export interface Estate {
  id: string;
  code: string;
  name: string;
  description?: string;
  location?: string;
  area?: number;
  companyId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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

export class GraphQLEstateService {
  /**
   * Get all estates with pagination
   */
  static useGetEstates(query?: EstateQueryDto) {
    const { data, loading, error, refetch } = useQuery(GET_ESTATES, {
      variables: {
        companyId: query?.companyId,
        search: query?.search,
        isActive: query?.isActive,
        page: query?.page,
        limit: query?.limit
      }
    });
    
    return {
      estates: data?.estates?.data || [],
      pagination: data?.estates?.pagination,
      loading,
      error,
      refetch
    };
  }

  /**
   * Get estates by company
   */
  static useGetEstatesByCompany(companyId: string) {
    const { data, loading, error, refetch } = useQuery(GET_ESTATES_BY_COMPANY, {
      variables: { companyId }
    });
    
    return {
      estates: data?.estatesByCompany || [],
      loading,
      error,
      refetch
    };
  }

  /**
   * Get estate by ID
   */
  static useGetEstate(id: string) {
    const { data, loading, error, refetch } = useQuery(GET_ESTATE, {
      variables: { id }
    });
    
    return {
      estate: data?.estate,
      loading,
      error,
      refetch
    };
  }

  /**
   * Create new estate
   */
  static useCreateEstate() {
    const [createEstate, { data, loading, error }] = useMutation(CREATE_ESTATE);
    
    return {
      createEstate: async (input: CreateEstateDto) => {
        const result = await createEstate({ variables: { input } });
        return result.data?.createEstate;
      },
      estate: data?.createEstate,
      loading,
      error
    };
  }

  /**
   * Update estate
   */
  static useUpdateEstate() {
    const [updateEstate, { data, loading, error }] = useMutation(UPDATE_ESTATE);
    
    return {
      updateEstate: async (id: string, input: UpdateEstateDto) => {
        const result = await updateEstate({ variables: { id, input } });
        return result.data?.updateEstate;
      },
      estate: data?.updateEstate,
      loading,
      error
    };
  }

  /**
   * Delete estate
   */
  static useDeleteEstate() {
    const [deleteEstate, { data, loading, error }] = useMutation(DELETE_ESTATE);
    
    return {
      deleteEstate: async (id: string) => {
        const result = await deleteEstate({ variables: { id } });
        return result.data?.deleteEstate;
      },
      result: data?.deleteEstate,
      loading,
      error
    };
  }

  /**
   * Get estate statistics
   */
  static useGetEstateStats(id: string) {
    const { data, loading, error, refetch } = useQuery(GET_ESTATE_STATS, {
      variables: { id }
    });
    
    return {
      stats: data?.estateStats,
      loading,
      error,
      refetch
    };
  }
}
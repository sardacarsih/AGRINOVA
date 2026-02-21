import { gql } from 'graphql-tag';

// Get all divisions
export const GET_DIVISIONS = gql`
  query GetDivisions {
    divisions {
      id
      name
      code
      estateId
      estate {
        id
        name
        code
        location
        luasHa
        company {
          id
          name
        }
      }
      createdAt
      updatedAt
    }
  }
`;

// Get all divisions filtered by company (client-side filtering)
export const GET_DIVISIONS_BY_COMPANY = gql`
  query GetDivisionsByCompany {
    divisions {
      id
      name
      code
      estateId
      estate {
        id
        name
        code
        location
        luasHa
        company {
          id
          name
        }
      }
      createdAt
      updatedAt
    }
  }
`;

// Get divisions by estate
export const GET_DIVISIONS_BY_ESTATE = gql`
  query GetDivisionsByEstate($estateId: ID!) {
    divisions(estateId: $estateId) {
      id
      name
      code
      estateId
      estate {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;

// Get division by ID
export const GET_DIVISION = gql`
  query GetDivision($id: ID!) {
    division(id: $id) {
      id
      name
      code
      estateId
      estate {
        id
        name
        code
        location
        luasHa
        company {
          id
          name
        }
      }
      blocks {
        id
        blockCode
        name
        luasHa
        status
      }
      createdAt
      updatedAt
    }
  }
`;

// Create new division
export const CREATE_DIVISION = gql`
  mutation CreateDivision($input: CreateDivisionInput!) {
    createDivision(input: $input) {
      id
      name
      code
      estateId
      estate {
        id
        name
        code
        company {
          id
          name
        }
      }
      createdAt
      updatedAt
    }
  }
`;

// Update division
export const UPDATE_DIVISION = gql`
  mutation UpdateDivision($input: UpdateDivisionInput!) {
    updateDivision(input: $input) {
      id
      name
      code
      estateId
      estate {
        id
        name
        code
        company {
          id
          name
        }
      }
      createdAt
      updatedAt
    }
  }
`;

// Delete division
export const DELETE_DIVISION = gql`
  mutation DeleteDivision($id: ID!) {
    deleteDivision(id: $id)
  }
`;

// Get division statistics
export const GET_DIVISION_STATS = gql`
  query GetDivisionStats($id: ID!) {
    divisionStats(id: $id) {
      blockCount
      userCount
      harvestCount
      lastHarvestDate
    }
  }
`;

// TypeScript interfaces for Division queries
export interface GraphQLDivision {
  id: string;
  name: string;
  code: string;
  estateId: string;
  estate: {
    id: string;
    name: string;
    code: string;
    location?: string;
    luasHa?: number;
    company?: {
      id: string;
      name: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface DivisionWithBlocks extends GraphQLDivision {
  blocks: Array<{
    id: string;
    blockCode: string;
    name: string;
    luasHa?: number;
    status: string;
  }>;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface GetDivisionsResponse {
  divisions: {
    data: GraphQLDivision[];
    pagination: PaginationInfo;
  };
}

export interface GetDivisionsByCompanyResponse {
  divisions: GraphQLDivision[];
}

export interface GetDivisionsByEstateResponse {
  divisions: GraphQLDivision[];
}

export interface GetDivisionResponse {
  division: DivisionWithBlocks;
}

export interface CreateDivisionInput {
  name: string;
  code: string;
  estateId: string;
}

export interface UpdateDivisionInput {
  id: string;
  name?: string;
  code?: string;
}

export interface CreateDivisionResponse {
  createDivision: GraphQLDivision;
}

export interface UpdateDivisionResponse {
  updateDivision: GraphQLDivision;
}

export interface DeleteDivisionResponse {
  deleteDivision: boolean;
}

export interface DivisionStats {
  blockCount: number;
  userCount: number;
  harvestCount: number;
  lastHarvestDate?: string;
}

export interface GetDivisionStatsResponse {
  divisionStats: DivisionStats;
}

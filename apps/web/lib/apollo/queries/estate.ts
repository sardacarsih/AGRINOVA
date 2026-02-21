import { gql } from 'graphql-tag';

export interface GraphQLEstate {
  id: string;
  code: string;
  name: string;
  description?: string;
  location?: string;
  area: number;
  companyId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetEstatesResponse {
  estates: {
    data: GraphQLEstate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface GetEstatesByCompanyResponse {
  estatesByCompany: GraphQLEstate[];
}

export interface GetEstateResponse {
  estate: GraphQLEstate;
}

export interface CreateEstateInput {
  code: string;
  name: string;
  description?: string;
  location?: string;
  area: number;
  companyId: string;
  isActive: boolean;
}

export interface CreateEstateResponse {
  createEstate: GraphQLEstate;
}

export interface UpdateEstateInput {
  code?: string;
  name?: string;
  description?: string;
  location?: string;
  area?: number;
  isActive?: boolean;
}

export interface UpdateEstateResponse {
  updateEstate: GraphQLEstate;
}

export interface DeleteEstateResponse {
  deleteEstate: boolean;
}

export interface EstateStats {
  divisionCount: number;
  blockCount: number;
  userCount: number;
}

export interface GetEstateStatsResponse {
  estateStats: EstateStats;
}

// Get all estates with pagination
export const GET_ESTATES = gql`
  query GetEstates($companyId: ID, $search: String, $isActive: Boolean, $page: Int, $limit: Int) {
    estates(companyId: $companyId, search: $search, isActive: $isActive, page: $page, limit: $limit) {
      data {
        id
        code
        name
        description
        location
        area
        companyId
        isActive
        createdAt
        updatedAt
      }
      pagination {
        page
        limit
        total
        pages
        days
      }
    }
  }
`;

// Get estates by company
export const GET_ESTATES_BY_COMPANY = gql`
  query GetEstatesByCompany($companyId: ID!) {
    estatesByCompany(companyId: $companyId) {
      id
      code
      name
      description
      location
      area
      companyId
      isActive
      createdAt
      updatedAt
    }
  }
`;

// Get estate by ID
export const GET_ESTATE = gql`
  query GetEstate($id: ID!) {
    estate(id: $id) {
      id
      code
      name
      description
      location
      area
      companyId
      isActive
      createdAt
      updatedAt
    }
  }
`;

// Create new estate
export const CREATE_ESTATE = gql`
  mutation CreateEstate($input: CreateEstateInput!) {
    createEstate(input: $input) {
      id
      code
      name
      description
      location
      area
      companyId
      isActive
      createdAt
      updatedAt
    }
  }
`;

// Update estate
export const UPDATE_ESTATE = gql`
  mutation UpdateEstate($id: ID!, $input: UpdateEstateInput!) {
    updateEstate(id: $id, input: $input) {
      id
      code
      name
      description
      location
      area
      companyId
      isActive
      createdAt
      updatedAt
    }
  }
`;

// Delete estate
export const DELETE_ESTATE = gql`
  mutation DeleteEstate($id: ID!) {
    deleteEstate(id: $id)
  }
`;

// Get estate statistics
export const GET_ESTATE_STATS = gql`
  query GetEstateStats($id: ID!) {
    estateStats(id: $id) {
      divisionCount
      blockCount
      userCount
    }
  }
`;
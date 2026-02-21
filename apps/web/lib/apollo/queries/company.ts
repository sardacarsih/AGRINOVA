import { gql } from 'graphql-tag';

// Get all companies with pagination
export const GET_COMPANIES = gql`
  query GetCompanies($search: String, $isActive: Boolean, $page: Int, $limit: Int) {
    companies(search: $search, isActive: $isActive, page: $page, limit: $limit) {
      data {
        id
        code
        name
        description
        logoUrl
        isActive
        status
        alamat: address
        telepon: phone
        createdAt
        updatedAt
      }
      pagination {
        page
        limit
        total
        pages
      }
    }
  }
`;

// Get company by ID
export const GET_COMPANY = gql`
  query GetCompany($id: ID!) {
    company(id: $id) {
      id
      code
      name
      description
      logoUrl
      isActive
      alamat: address
      telepon: phone
      createdAt
      updatedAt
    }
  }
`;

// Create new company
export const CREATE_COMPANY = gql`
  mutation CreateCompany($input: CreateCompanyInput!) {
    createCompany(input: $input) {
      id
      code
      name
      description
      logoUrl
      isActive
      alamat: address
      telepon: phone
      createdAt
      updatedAt
    }
  }
`;

// Update company
export const UPDATE_COMPANY = gql`
  mutation UpdateCompany($input: UpdateCompanyInput!) {
    updateCompany(input: $input) {
      id
      code
      name
      description
      logoUrl
      isActive
      alamat: address
      telepon: phone
      createdAt
      updatedAt
    }
  }
`;

// Delete company
export const DELETE_COMPANY = gql`
  mutation DeleteCompany($id: ID!) {
    deleteCompany(id: $id)
  }
`;

// Get company statistics
export const GET_COMPANY_STATS = gql`
  query GetCompanyStats($id: ID!) {
    companyStats(id: $id) {
      estateCount
      divisionCount
      userCount
      totalArea
    }
  }
`;

// =============================================================================
// Company Subscriptions
// =============================================================================

// Subscribe to new companies being created
export const COMPANY_CREATED_SUBSCRIPTION = gql`
  subscription CompanyCreated {
    companyCreated {
      id
      code
      name
      description
      logoUrl
      status
      isActive
      createdAt
      updatedAt
    }
  }
`;

// Subscribe to companies being updated
export const COMPANY_UPDATED_SUBSCRIPTION = gql`
  subscription CompanyUpdated {
    companyUpdated {
      id
      code
      name
      description
      logoUrl
      status
      isActive
      createdAt
      updatedAt
    }
  }
`;

// Subscribe to companies being deleted
export const COMPANY_DELETED_SUBSCRIPTION = gql`
  subscription CompanyDeleted {
    companyDeleted
  }
`;

// Subscribe to companies' status being changed
export const COMPANY_STATUS_CHANGED_SUBSCRIPTION = gql`
  subscription CompanyStatusChanged {
    companyStatusChanged {
      id
      code
      name
      description
      logoUrl
      status
      isActive
      createdAt
      updatedAt
    }
  }
`;

// =============================================================================
// TypeScript Types for Company Subscriptions
// =============================================================================

export interface GraphQLCompany {
  id: string;
  code: string;
  name: string;
  description?: string;
  logoUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyCreatedSubscription {
  companyCreated: GraphQLCompany;
}

export interface CompanyUpdatedSubscription {
  companyUpdated: GraphQLCompany;
}

export interface CompanyDeletedSubscription {
  companyDeleted: string;
}

export interface CompanyStatusChangedSubscription {
  companyStatusChanged: GraphQLCompany;
}

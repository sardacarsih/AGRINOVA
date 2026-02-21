import { gql } from 'graphql-tag';

// Get all companies for hierarchy forms
export const GET_ALL_COMPANIES = gql`
  query GetAllCompanies {
    companies {
      id
      name
      alamat
      telepon
      status
      createdAt
      updatedAt
    }
  }
`;

// Get all estates
export const GET_ALL_ESTATES = gql`
  query GetAllEstates {
    estates {
      id
      name
      location
      luasHa
      companyId
      company {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;

// Get all divisions 
export const GET_ALL_DIVISIONS = gql`
  query GetAllDivisions {
    divisions {
      id
      name
      code
      estateId
      estate {
        id
        name
        companyId
      }
      createdAt
      updatedAt
    }
  }
`;

// Get estates by company ID (filtering client-side for now)
export const GET_ESTATES_BY_COMPANY = gql`
  query GetEstatesByCompany {
    estates {
      id
      name
      location 
      luasHa
      companyId
      company {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;

// Get divisions by estate ID (filtering client-side for now)
export const GET_DIVISIONS_BY_ESTATE = gql`
  query GetDivisionsByEstate {
    divisions {
      id
      name
      code
      estateId
      estate {
        id
        name
        companyId
      }
      createdAt
      updatedAt
    }
  }
`;

// Get users by role for Area Manager selection
export const GET_USERS_BY_ROLE = gql`
  query GetUsersByRole($role: UserRole) {
    users(role: $role) {
      data {
        id
        username
        name
        email
        role
        companyId
        company {
          id
          name
        }
        createdAt
        updatedAt
      }
      pagination {
        total
        page
        limit
        pages
      }
    }
  }
`;

// Type definitions to match the data structure expected by the form
export interface HierarchyCompany {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HierarchyEstate {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  location?: string;
  area: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HierarchyDivision {
  id: string;
  estateId: string;
  code: string;
  name: string;
  description?: string;
  area?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HierarchyUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: string;
  companyId?: string;
  company?: string;
  employeeId?: string;
  assignedCompanyNames?: string[];
  status: string;
}
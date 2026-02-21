import { NextRequest } from 'next/server';
import { AdminGraphCompany, AdminGraphUser } from './admin-analytics-utils';

const getBackendUrl = () => {
  if (process.env.BACKEND_GRAPHQL_URL) return process.env.BACKEND_GRAPHQL_URL;

  const publicUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL;
  if (publicUrl) {
    if (publicUrl.includes('/api/graphql')) {
      return 'http://127.0.0.1:8080/graphql';
    }
    return publicUrl;
  }

  return 'http://127.0.0.1:8080/graphql';
};

const GRAPHQL_URL = getBackendUrl();

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

async function requestGraphQL<T>(
  request: NextRequest,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: request.headers.get('cookie') || '',
      Authorization: request.headers.get('authorization') || '',
      'X-CSRF-Token': request.headers.get('x-csrf-token') || ''
    },
    body: JSON.stringify({ query, variables })
  });

  const payload = (await response.json()) as GraphQLResponse<T>;
  if (!response.ok || payload.errors?.length) {
    const firstError = payload.errors?.[0]?.message || `GraphQL request failed with status ${response.status}`;
    throw new Error(firstError);
  }
  if (!payload.data) {
    throw new Error('GraphQL response has no data');
  }
  return payload.data;
}

const USERS_QUERY = `
  query GetUsersForAdminAnalytics($limit: Int, $offset: Int) {
    users(limit: $limit, offset: $offset) {
      users {
        id
        username
        name
        role
        companyId
        company { id name }
        companies { id name }
        estates { id name }
        divisions { id name }
        isActive
      }
      totalCount
      hasNextPage
    }
  }
`;

const COMPANIES_QUERY = `
  query GetCompaniesForAdminAnalytics($page: Int, $limit: Int) {
    companies(page: $page, limit: $limit) {
      data {
        id
        name
        isActive
        status
      }
      pagination {
        page
        pages
      }
    }
  }
`;

const HIERARCHY_COUNTS_QUERY = `
  query GetHierarchyCountsForAdminAnalytics {
    estates { id }
    divisions { id }
    blocks { id }
  }
`;

export async function fetchUsersForAdminAnalytics(request: NextRequest): Promise<AdminGraphUser[]> {
  const limit = 200;
  let offset = 0;
  let totalCount = 0;
  const users: AdminGraphUser[] = [];

  while (true) {
    type ResponseData = {
      users: {
        users: AdminGraphUser[];
        totalCount: number;
        hasNextPage: boolean;
      };
    };

    const data = await requestGraphQL<ResponseData>(request, USERS_QUERY, { limit, offset });
    const currentUsers = Array.isArray(data.users?.users) ? data.users.users : [];
    totalCount = Number(data.users?.totalCount || 0);
    users.push(...currentUsers);

    if (!data.users?.hasNextPage || currentUsers.length === 0 || users.length >= totalCount) {
      break;
    }
    offset += limit;
  }

  return users;
}

export async function fetchCompaniesForAdminAnalytics(request: NextRequest): Promise<AdminGraphCompany[]> {
  const limit = 200;
  let page = 1;
  let totalPages = 1;
  const companies: AdminGraphCompany[] = [];

  while (page <= totalPages) {
    type ResponseData = {
      companies: {
        data: AdminGraphCompany[];
        pagination?: {
          page?: number;
          pages?: number;
        };
      };
    };

    const data = await requestGraphQL<ResponseData>(request, COMPANIES_QUERY, { page, limit });
    const current = Array.isArray(data.companies?.data) ? data.companies.data : [];
    companies.push(...current);

    totalPages = Number(data.companies?.pagination?.pages || page);
    if (totalPages <= page) break;
    page += 1;
  }

  return companies;
}

export async function fetchHierarchyCountsForAdminAnalytics(request: NextRequest): Promise<{
  totalEstates: number;
  totalDivisions: number;
  totalBlocks: number;
}> {
  type ResponseData = {
    estates?: Array<{ id: string }>;
    divisions?: Array<{ id: string }>;
    blocks?: Array<{ id: string }>;
  };

  const data = await requestGraphQL<ResponseData>(request, HIERARCHY_COUNTS_QUERY);
  return {
    totalEstates: Array.isArray(data.estates) ? data.estates.length : 0,
    totalDivisions: Array.isArray(data.divisions) ? data.divisions.length : 0,
    totalBlocks: Array.isArray(data.blocks) ? data.blocks.length : 0
  };
}

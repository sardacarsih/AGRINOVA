import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RoleRecord = {
  id: string;
  name: string;
  displayName: string;
  level: number;
  description?: string | null;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserScopeRecord = {
  id: string;
  role: string;
  companyId?: string | null;
  company?: { id: string } | null;
  companies?: Array<{ id: string }> | null;
  estates?: Array<{ id: string; companyId?: string | null; company?: { id: string } | null }> | null;
  divisions?: Array<{ id: string; estate?: { id: string; companyId?: string | null } | null }> | null;
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

type RolesQueryData = {
  roles: RoleRecord[];
};

type UsersQueryData = {
  users: {
    users: UserScopeRecord[];
    totalCount: number;
    hasNextPage: boolean;
  };
};

const USERS_PAGE_SIZE = 200;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to load roles';
};

const normalizeRole = (value: string): string => value.trim().toUpperCase();

const normalizeGraphQLEndpoint = (value: string): string => {
  const raw = value.trim();
  if (!raw) {
    return 'http://127.0.0.1:8080/graphql';
  }

  if (/\/graphql\/?$/i.test(raw)) {
    return raw.replace(/\/$/, '');
  }

  return `${raw.replace(/\/$/, '')}/graphql`;
};

const getBackendUrl = () => {
  if (process.env.BACKEND_GRAPHQL_URL) {
    return normalizeGraphQLEndpoint(process.env.BACKEND_GRAPHQL_URL);
  }

  const publicUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL;
  if (publicUrl) {
    if (publicUrl.includes('/api/graphql')) {
      return 'http://127.0.0.1:8080/graphql';
    }

    return normalizeGraphQLEndpoint(publicUrl);
  }

  return 'http://127.0.0.1:8080/graphql';
};

const GRAPHQL_URL = getBackendUrl();

const ROLES_QUERY = `
  query GetRolesForManagement($activeOnly: Boolean = true, $first: Int, $after: String) {
    roles(activeOnly: $activeOnly, first: $first, after: $after) {
      id
      name
      displayName
      level
      description
      isActive
      isSystem
      createdAt
      updatedAt
    }
  }
`;

const USERS_QUERY = `
  query GetUsersForRoleManagement($limit: Int, $offset: Int) {
    users(limit: $limit, offset: $offset) {
      users {
        id
        role
        companyId
        company {
          id
        }
        companies {
          id
        }
        estates {
          id
          companyId
          company {
            id
          }
        }
        divisions {
          id
          estate {
            id
            companyId
          }
        }
      }
      totalCount
      hasNextPage
    }
  }
`;

const clampNumber = (value: string | null, fallback: number, min: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(parsed)));
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
    const message = payload.errors?.[0]?.message || `GraphQL request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (!payload.data) {
    throw new Error('GraphQL response has no data');
  }

  return payload.data;
}

const collectUserCompanyIds = (user: UserScopeRecord): Set<string> => {
  const companyIds = new Set<string>();

  if (user.companyId) {
    companyIds.add(user.companyId);
  }
  if (user.company?.id) {
    companyIds.add(user.company.id);
  }

  user.companies?.forEach((company) => {
    if (company?.id) {
      companyIds.add(company.id);
    }
  });

  user.estates?.forEach((estate) => {
    if (estate.companyId) {
      companyIds.add(estate.companyId);
    }
    if (estate.company?.id) {
      companyIds.add(estate.company.id);
    }
  });

  user.divisions?.forEach((division) => {
    if (division.estate?.companyId) {
      companyIds.add(division.estate.companyId);
    }
  });

  return companyIds;
};

const matchesCompany = (user: UserScopeRecord, companyId: string): boolean => {
  if (!companyId) {
    return true;
  }

  return collectUserCompanyIds(user).has(companyId);
};

const matchesEstate = (user: UserScopeRecord, estateId: string): boolean => {
  if (!estateId) {
    return true;
  }

  const directEstateMatch = user.estates?.some((estate) => estate?.id === estateId);
  if (directEstateMatch) {
    return true;
  }

  return user.divisions?.some((division) => division?.estate?.id === estateId) ?? false;
};

const buildRoleCounts = (users: UserScopeRecord[]): Record<string, number> =>
  users.reduce<Record<string, number>>((counts, user) => {
    const roleName = normalizeRole(user.role);
    counts[roleName] = (counts[roleName] || 0) + 1;
    return counts;
  }, {});

async function fetchAllUsersForCounts(request: NextRequest): Promise<UserScopeRecord[]> {
  const users: UserScopeRecord[] = [];
  let offset = 0;
  let totalCount = 0;

  while (true) {
    const data = await requestGraphQL<UsersQueryData>(request, USERS_QUERY, {
      limit: USERS_PAGE_SIZE,
      offset
    });

    const currentUsers = Array.isArray(data.users?.users) ? data.users.users : [];
    totalCount = Number(data.users?.totalCount || 0);
    users.push(...currentUsers);

    if (!data.users?.hasNextPage || currentUsers.length === 0 || users.length >= totalCount) {
      break;
    }

    offset += USERS_PAGE_SIZE;
  }

  return users;
}

export async function GET(request: NextRequest) {
  try {
    const requestedPage = clampNumber(request.nextUrl.searchParams.get('page'), 1, 1, 10_000);
    const pageSize = clampNumber(request.nextUrl.searchParams.get('pageSize'), 10, 5, 100);
    const search = request.nextUrl.searchParams.get('search')?.trim().toLowerCase() || '';
    const companyId = request.nextUrl.searchParams.get('companyId')?.trim() || '';
    const estateId = request.nextUrl.searchParams.get('estateId')?.trim() || '';
    const activeOnlyParam = request.nextUrl.searchParams.get('activeOnly');
    const activeOnly = activeOnlyParam == null ? true : activeOnlyParam !== 'false';

    const needsScopedFiltering = Boolean(search || companyId || estateId);
    const roleOffset = (requestedPage - 1) * pageSize;

    const [allUsers, pagedRolesData, allRolesData] = await Promise.all([
      fetchAllUsersForCounts(request),
      needsScopedFiltering
        ? Promise.resolve<RolesQueryData | null>(null)
        : requestGraphQL<RolesQueryData>(request, ROLES_QUERY, {
            activeOnly,
            first: pageSize,
            after: String(roleOffset)
          }),
      requestGraphQL<RolesQueryData>(request, ROLES_QUERY, { activeOnly })
    ]);

    const scopedUsers = allUsers.filter((user) => matchesCompany(user, companyId) && matchesEstate(user, estateId));
    const roleCounts = buildRoleCounts(scopedUsers);

    const allRoles = Array.isArray(allRolesData.roles) ? allRolesData.roles : [];

    if (!needsScopedFiltering) {
      const totalCount = allRoles.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const page = totalCount === 0 ? 1 : Math.min(requestedPage, totalPages);
      const normalizedOffset = (page - 1) * pageSize;
      const pageRoles = requestedPage === page
        ? (Array.isArray(pagedRolesData?.roles) ? pagedRolesData.roles : [])
        : allRoles.slice(normalizedOffset, normalizedOffset + pageSize);

      return NextResponse.json({
        data: pageRoles.map((role) => ({
          ...role,
          usersCount: roleCounts[normalizeRole(role.name)] || 0
        })),
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages
        }
      });
    }

    const filteredRoles = allRoles
      .filter((role) => {
        if (companyId || estateId) {
          if ((roleCounts[normalizeRole(role.name)] || 0) === 0) {
            return false;
          }
        }

        if (!search) {
          return true;
        }

        const haystack = [role.name, role.displayName, role.description || '']
          .join(' ')
          .toLowerCase();

        return haystack.includes(search);
      })
      .sort((a, b) => {
        if (a.level !== b.level) {
          return a.level - b.level;
        }

        return a.displayName.localeCompare(b.displayName);
      });

    const totalCount = filteredRoles.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const page = totalCount === 0 ? 1 : Math.min(requestedPage, totalPages);
    const offset = (page - 1) * pageSize;

    return NextResponse.json({
      data: filteredRoles.slice(offset, offset + pageSize).map((role) => ({
        ...role,
        usersCount: roleCounts[normalizeRole(role.name)] || 0
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages
      }
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        message: getErrorMessage(error)
      },
      { status: 500 }
    );
  }
}

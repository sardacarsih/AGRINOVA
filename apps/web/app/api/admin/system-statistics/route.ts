import { NextRequest, NextResponse } from 'next/server';
import {
  buildSystemStatisticsPayload,
  AdminGraphUser,
  userMatchesCompany
} from '@/lib/api/admin-analytics-utils';
import {
  fetchCompaniesForAdminAnalytics,
  fetchHierarchyCountsForAdminAnalytics,
  fetchUsersForAdminAnalytics
} from '@/lib/api/admin-analytics-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const normalizeRole = (role: unknown): string => {
  if (typeof role !== 'string') return '';
  return role.toUpperCase().trim();
};

const filterUsersByQuery = (users: AdminGraphUser[], request: NextRequest): AdminGraphUser[] => {
  const companyIds = request.nextUrl.searchParams.getAll('companyIds[]').filter(Boolean);
  const roles = request.nextUrl.searchParams
    .getAll('roles[]')
    .map((role) => normalizeRole(role))
    .filter(Boolean);
  const status = request.nextUrl.searchParams.get('status');

  return users.filter((user) => {
    if (companyIds.length > 0 && !companyIds.some((companyId) => userMatchesCompany(user, companyId))) {
      return false;
    }
    if (roles.length > 0 && !roles.includes(normalizeRole(user.role))) {
      return false;
    }
    if (status === 'active' && user.isActive === false) {
      return false;
    }
    if (status === 'inactive' && user.isActive !== false) {
      return false;
    }
    return true;
  });
};

const filterCompaniesByQuery = (
  companies: Array<{ id: string; name: string; isActive?: boolean | null; status?: string | null }>,
  request: NextRequest
) => {
  const companyIds = request.nextUrl.searchParams.getAll('companyIds[]').filter(Boolean);
  if (companyIds.length === 0) return companies;
  return companies.filter((company) => companyIds.includes(company.id));
};

export async function GET(request: NextRequest) {
  try {
    const [companies, users, hierarchyCounts] = await Promise.all([
      fetchCompaniesForAdminAnalytics(request),
      fetchUsersForAdminAnalytics(request),
      fetchHierarchyCountsForAdminAnalytics(request)
    ]);

    const filteredUsers = filterUsersByQuery(users, request);
    const payload = buildSystemStatisticsPayload({
      users: filteredUsers,
      companies: filterCompaniesByQuery(companies, request),
      totalEstates: hierarchyCounts.totalEstates,
      totalDivisions: hierarchyCounts.totalDivisions,
      totalBlocks: hierarchyCounts.totalBlocks
    });

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message || 'Failed to build system statistics'
      },
      { status: 500 }
    );
  }
}

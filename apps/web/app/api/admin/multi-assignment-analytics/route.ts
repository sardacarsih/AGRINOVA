import { NextRequest, NextResponse } from 'next/server';
import { buildMultiAssignmentAnalyticsPayload } from '@/lib/api/admin-analytics-utils';
import { fetchCompaniesForAdminAnalytics, fetchUsersForAdminAnalytics } from '@/lib/api/admin-analytics-data';

export async function GET(request: NextRequest) {
  try {
    const [companies, users] = await Promise.all([
      fetchCompaniesForAdminAnalytics(request),
      fetchUsersForAdminAnalytics(request)
    ]);

    const companyIds = request.nextUrl.searchParams.getAll('companyIds[]').filter(Boolean);
    const roles = request.nextUrl.searchParams.getAll('roles[]').filter(Boolean);

    const payload = buildMultiAssignmentAnalyticsPayload({
      users,
      companies,
      filters: {
        companyIds,
        roles
      }
    });

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message || 'Failed to build multi-assignment analytics'
      },
      { status: 500 }
    );
  }
}


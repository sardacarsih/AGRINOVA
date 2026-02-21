'use client';

import { useQuery } from '@apollo/client/react';
import { GetUsersDocument, UserRole } from '@/gql/graphql';
import { useMemo } from 'react';

interface RoleStatisticsOptions {
    companyId?: string;
    roles?: UserRole[];
}

export function useRoleStatistics({ companyId, roles }: RoleStatisticsOptions = {}) {
    // We only care about specific roles if provided, otherwise all relevant ones
    const rolesToQuery = roles || Object.values(UserRole);
    const realtimeQueryOptions = {
        fetchPolicy: 'cache-and-network' as const,
        notifyOnNetworkStatusChange: true,
    };

    // Initial state for counts
    const counts: Record<string, number> = {};
    let isLoading = false;
    let hasError = false;

    // We can't use hooks in a loop easily without breaking rules of hooks or using a list component.
    // However, since the number of roles is static and small, we can just use multiple useQuery calls
    // or a single hook that composes them.
    // But a cleaner way for variable roles might be to use useLazyQuery or just separate queries.
    // Given the constraints and to keep it simple, let's hardcode the queries for standard roles
    // or use a component-based approach if dynamic.

    // Actually, for this specific requirements where we want "Cards by Role", we usually know the roles 
    // we want to display.

    // Let's implement a specific query for each major role we want to track.
    // This is a bit repetitive but safe for Rules of Hooks.

    const { data: superAdminData, loading: l1 } = useQuery(GetUsersDocument, {
        variables: { role: UserRole.SuperAdmin, companyId, limit: 1 },
        skip: !rolesToQuery.includes(UserRole.SuperAdmin),
        ...realtimeQueryOptions,
    });

    const { data: companyAdminData, loading: l2 } = useQuery(GetUsersDocument, {
        variables: { role: UserRole.CompanyAdmin, companyId, limit: 1 },
        skip: !rolesToQuery.includes(UserRole.CompanyAdmin),
        ...realtimeQueryOptions,
    });

    const { data: areaManagerData, loading: l3 } = useQuery(GetUsersDocument, {
        variables: { role: UserRole.AreaManager, companyId, limit: 1 },
        skip: !rolesToQuery.includes(UserRole.AreaManager),
        ...realtimeQueryOptions,
    });

    const { data: managerData, loading: l4 } = useQuery(GetUsersDocument, {
        variables: { role: UserRole.Manager, companyId, limit: 1 },
        skip: !rolesToQuery.includes(UserRole.Manager),
        ...realtimeQueryOptions,
    });

    const { data: asistenData, loading: l5 } = useQuery(GetUsersDocument, {
        variables: { role: UserRole.Asisten, companyId, limit: 1 },
        skip: !rolesToQuery.includes(UserRole.Asisten),
        ...realtimeQueryOptions,
    });

    const { data: mandorData, loading: l6 } = useQuery(GetUsersDocument, {
        variables: { role: UserRole.Mandor, companyId, limit: 1 },
        skip: !rolesToQuery.includes(UserRole.Mandor),
        ...realtimeQueryOptions,
    });

    const { data: satpamData, loading: l7 } = useQuery(GetUsersDocument, {
        variables: { role: UserRole.Satpam, companyId, limit: 1 },
        skip: !rolesToQuery.includes(UserRole.Satpam),
        ...realtimeQueryOptions,
    });

    const { data: timbanganData, loading: l8 } = useQuery(GetUsersDocument, {
        variables: { role: UserRole.Timbangan, companyId, limit: 1 },
        skip: !rolesToQuery.includes(UserRole.Timbangan),
        ...realtimeQueryOptions,
    });

    const { data: gradingData, loading: l9 } = useQuery(GetUsersDocument, {
        variables: { role: UserRole.Grading, companyId, limit: 1 },
        skip: !rolesToQuery.includes(UserRole.Grading),
        ...realtimeQueryOptions,
    });


    isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9;

    const statistics = useMemo(() => [
        { role: UserRole.SuperAdmin, count: superAdminData?.users?.totalCount || 0 },
        { role: UserRole.CompanyAdmin, count: companyAdminData?.users?.totalCount || 0 },
        { role: UserRole.AreaManager, count: areaManagerData?.users?.totalCount || 0 },
        { role: UserRole.Manager, count: managerData?.users?.totalCount || 0 },
        { role: UserRole.Asisten, count: asistenData?.users?.totalCount || 0 },
        { role: UserRole.Mandor, count: mandorData?.users?.totalCount || 0 },
        { role: UserRole.Satpam, count: satpamData?.users?.totalCount || 0 },
        { role: UserRole.Timbangan, count: timbanganData?.users?.totalCount || 0 },
        { role: UserRole.Grading, count: gradingData?.users?.totalCount || 0 },
    ].filter(stat => rolesToQuery.includes(stat.role)), [
        superAdminData, companyAdminData, areaManagerData, managerData,
        asistenData, mandorData, satpamData, timbanganData, gradingData,
        rolesToQuery
    ]);

    return {
        statistics,
        isLoading
    };
}

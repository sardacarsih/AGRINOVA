'use client';

import { useQuery } from '@apollo/client/react';
import { useState, useCallback } from 'react';
import {
    GET_SATPAM_HISTORY,
    SatpamHistoryResponse,
    SatpamHistorySummary,
    SatpamGuestLog,
} from '@/lib/apollo/queries/gate-check';

export interface GateCheckFilter {
    search?: string;
    page?: number;
    pageSize?: number;
}

export function useGateCheckData(initialFilter?: GateCheckFilter) {
    const [filter, setFilter] = useState<GateCheckFilter>(initialFilter || {
        page: 1,
        pageSize: 20,
    });

    const graphqlFilter: Record<string, unknown> = {
        page: filter.page || 1,
        pageSize: filter.pageSize || 20,
        sortBy: 'ENTRY_TIME',
        sortDirection: 'DESC',
    };

    if (filter.search) graphqlFilter.search = filter.search;

    const { data, loading, error, refetch } = useQuery<{
        satpamHistory: SatpamHistoryResponse;
    }>(GET_SATPAM_HISTORY, {
        variables: { filter: graphqlFilter },
        fetchPolicy: 'cache-and-network',
        pollInterval: 30000,
        errorPolicy: 'all',
    });

    const items: SatpamGuestLog[] = data?.satpamHistory?.items || [];
    const totalCount = data?.satpamHistory?.totalCount || 0;
    const hasMore = data?.satpamHistory?.hasMore || false;
    const summary: SatpamHistorySummary | null = data?.satpamHistory?.summary || null;

    const pageSize = filter.pageSize || 20;
    const page = filter.page || 1;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const updateFilter = useCallback((newFilter: Partial<GateCheckFilter>) => {
        setFilter((prev) => ({ ...prev, ...newFilter }));
    }, []);

    const refreshData = useCallback(() => {
        refetch();
    }, [refetch]);

    return {
        items,
        totalCount,
        hasMore,
        summary,
        page,
        totalPages,
        loading,
        error,
        updateFilter,
        refreshData,
    };
}

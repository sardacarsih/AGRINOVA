'use client';

import { useQuery } from '@apollo/client/react';
import { useState, useCallback } from 'react';
import {
    GET_SATPAM_HISTORY,
    GET_SATPAM_SYNC_STATUS,
    SatpamHistoryResponse,
    SatpamHistoryFilter,
    SyncStatus,
} from '@/lib/apollo/queries/gate-check';

export interface SyncDataFilter {
    syncStatus?: SyncStatus;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}

export interface SyncStats {
    totalSynced: number;
    totalPending: number;
    totalFailed: number;
    totalConflict: number;
}

export function useSyncData(initialFilter?: SyncDataFilter) {
    const [filter, setFilter] = useState<SyncDataFilter>(initialFilter || {
        page: 1,
        pageSize: 20,
    });

    // Build filter object, only including defined values
    const graphqlFilter: Record<string, unknown> = {
        page: filter.page || 1,
        pageSize: filter.pageSize || 20,
        sortBy: 'ENTRY_TIME',
        sortDirection: 'DESC',
    };

    // Only add optional fields if they have values
    if (filter.dateFrom) graphqlFilter.dateFrom = filter.dateFrom;
    if (filter.dateTo) graphqlFilter.dateTo = filter.dateTo;
    if (filter.search) graphqlFilter.search = filter.search;

    const { data, loading, error, refetch } = useQuery<{
        satpamHistory: SatpamHistoryResponse;
    }>(GET_SATPAM_HISTORY, {
        variables: { filter: graphqlFilter },
        fetchPolicy: 'cache-and-network',
        pollInterval: 30000, // Auto-refresh every 30 seconds
        errorPolicy: 'all', // Continue even with partial errors
    });

    // Fetch sync status separately to get device count
    const { data: statusData, loading: statusLoading } = useQuery<{
        satpamSyncStatus: {
            uniqueDeviceCount: number;
            pendingSyncCount: number;
            failedSyncCount: number;
        }
    }>(GET_SATPAM_SYNC_STATUS, {
        pollInterval: 30000,
        fetchPolicy: 'cache-and-network',
    });

    // Filter items by sync status client-side if specified
    const filteredItems = data?.satpamHistory?.items?.filter((item) => {
        if (!filter.syncStatus) return true;
        return item.syncStatus === filter.syncStatus;
    }) || [];

    // Use server-calculated sync stats (across all data, not just current page)
    const stats: SyncStats = data?.satpamHistory?.syncStats
        ? {
            totalSynced: data.satpamHistory.syncStats.totalSynced,
            totalPending: data.satpamHistory.syncStats.totalPending,
            totalFailed: data.satpamHistory.syncStats.totalFailed,
            totalConflict: data.satpamHistory.syncStats.totalConflict,
        }
        : { totalSynced: 0, totalPending: 0, totalFailed: 0, totalConflict: 0 };

    const updateFilter = useCallback((newFilter: Partial<SyncDataFilter>) => {
        setFilter((prev) => ({ ...prev, ...newFilter }));
    }, []);

    const refreshData = useCallback(() => {
        refetch();
    }, [refetch]);

    return {
        items: filteredItems,
        totalCount: data?.satpamHistory?.totalCount || 0,
        hasMore: data?.satpamHistory?.hasMore || false,
        summary: data?.satpamHistory?.summary || null,
        stats,
        filter,
        loading,
        error,
        updateFilter,
        refreshData,
        uniqueDeviceCount: statusData?.satpamSyncStatus?.uniqueDeviceCount || 0,
    };
}

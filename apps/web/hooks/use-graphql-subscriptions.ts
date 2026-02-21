import { useSubscription } from '@apollo/client/react';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { APPROVAL_UPDATES_SUBSCRIPTION } from '@/lib/apollo/queries/approvals';
import { HIERARCHY_CHANGES_SUBSCRIPTION } from '@/lib/apollo/queries/hierarchy';
import {
  SATPAM_VEHICLE_ENTRY,
  SATPAM_VEHICLE_EXIT,
  SATPAM_OVERSTAY_ALERT,
  type SatpamGuestLog,
  type VehicleInsideInfo,
} from '@/lib/apollo/queries/gate-check';
import {
  HARVEST_RECORD_CREATED,
  HARVEST_RECORD_APPROVED,
  HARVEST_RECORD_REJECTED,
  type HarvestRecord
} from '@/lib/apollo/queries/harvest';

export interface UseGraphQLSubscriptionsOptions {
  userId?: string;
  onApprovalUpdate?: (approval: any) => void;
  onHierarchyChange?: (change: any) => void;
}

/**
 * Hook to handle GraphQL subscriptions for real-time updates
 */
export function useGraphQLSubscriptions({
  userId,
  onApprovalUpdate,
  onHierarchyChange,
}: UseGraphQLSubscriptionsOptions = {}) {

  // Subscribe to approval updates
  const { data: approvalData, error: approvalError } = useSubscription<any>(
    APPROVAL_UPDATES_SUBSCRIPTION,
    {
      variables: { userId },
      skip: !userId || !onApprovalUpdate,
      onData: ({ data }) => {
        if (data.data?.approvalUpdates && onApprovalUpdate) {
          onApprovalUpdate(data.data.approvalUpdates);
        }
      },
      onError: (error) => {
        console.error('Approval subscription error:', error);
      }
    }
  );

  // Subscribe to hierarchy changes
  const { data: hierarchyData, error: hierarchyError } = useSubscription<any>(
    HIERARCHY_CHANGES_SUBSCRIPTION,
    {
      variables: { nodeId: null, includeChildren: false },
      skip: !onHierarchyChange,
      onData: ({ data }) => {
        if (data.data?.hierarchyChanges && onHierarchyChange) {
          onHierarchyChange(data.data.hierarchyChanges);
        }
      },
      onError: (error) => {
        console.error('Hierarchy subscription error:', error);
      }
    }
  );

  // Handle subscription errors
  useEffect(() => {
    if (approvalError) {
      console.error('GraphQL Approval subscription error:', approvalError);
    }
  }, [approvalError]);

  useEffect(() => {
    if (hierarchyError) {
      console.error('GraphQL Hierarchy subscription error:', hierarchyError);
    }
  }, [hierarchyError]);

  return {
    approvalData,
    hierarchyData,
    errors: {
      approval: approvalError,
      hierarchy: hierarchyError,
    },
    isConnected: !approvalError && !hierarchyError,
  };
}

/**
 * Hook specifically for approval updates subscription
 */
export function useApprovalUpdates(userId?: string) {
  const { data, error, loading } = useSubscription<any>(
    APPROVAL_UPDATES_SUBSCRIPTION,
    {
      variables: { userId },
      skip: !userId,
      errorPolicy: 'all',
    }
  );

  return {
    approvalUpdate: data?.approvalUpdates,
    loading,
    error,
  };
}

/**
 * Hook specifically for hierarchy changes subscription
 */
export function useHierarchyChanges(nodeId?: string, includeChildren = false) {
  const { data, error, loading } = useSubscription<any>(
    HIERARCHY_CHANGES_SUBSCRIPTION,
    {
      variables: { nodeId, includeChildren },
      errorPolicy: 'all',
    }
  );

  return {
    hierarchyChange: data?.hierarchyChanges,
    loading,
    error,
  };
}

export interface UseHarvestSubscriptionsOptions {
  onCreated?: (record: HarvestRecord) => void;
  onApproved?: (record: HarvestRecord) => void;
  onRejected?: (record: HarvestRecord) => void;
}

export interface UseSatpamSubscriptionsOptions {
  onVehicleEntry?: (record: SatpamGuestLog) => void;
  onVehicleExit?: (record: SatpamGuestLog) => void;
  onOverstayAlert?: (record: VehicleInsideInfo) => void;
}

const HARVEST_SUBSCRIPTION_ALLOWED_ROLES = new Set([
  'MANDOR',
  'ASISTEN',
  'MANAGER',
  'AREA_MANAGER',
  'COMPANY_ADMIN',
  'SUPER_ADMIN',
]);

const SATPAM_SUBSCRIPTION_ALLOWED_ROLES = new Set([
  'SATPAM',
  'MANAGER',
  'AREA_MANAGER',
]);

const normalizeRoleName = (role?: string | null): string => {
  if (!role) return '';

  const normalized = role
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/^ROLE_+/, '');

  if (normalized === 'AREA_AMANAGER' || normalized === 'AREAMANAGER') {
    return 'AREA_MANAGER';
  }

  return normalized;
};

/**
 * Hook specifically for harvest record subscriptions
 */
export function useHarvestSubscriptions({
  onCreated,
  onApproved,
  onRejected
}: UseHarvestSubscriptionsOptions = {}) {
  const { user, isAuthenticated } = useAuth();
  const normalizedRole = normalizeRoleName(user?.role);

  const canSubscribeHarvestRecords = Boolean(
    isAuthenticated &&
    normalizedRole &&
    HARVEST_SUBSCRIPTION_ALLOWED_ROLES.has(normalizedRole)
  );

  useSubscription<any>(HARVEST_RECORD_CREATED, {
    skip: !canSubscribeHarvestRecords || !onCreated,
    onData: ({ data }) => {
      if (data.data?.harvestRecordCreated && onCreated) {
        onCreated(data.data.harvestRecordCreated);
      }
    }
  });

  useSubscription<any>(HARVEST_RECORD_APPROVED, {
    skip: !canSubscribeHarvestRecords || !onApproved,
    onData: ({ data }) => {
      if (data.data?.harvestRecordApproved && onApproved) {
        onApproved(data.data.harvestRecordApproved);
      }
    }
  });

  useSubscription<any>(HARVEST_RECORD_REJECTED, {
    skip: !canSubscribeHarvestRecords || !onRejected,
    onData: ({ data }) => {
      if (data.data?.harvestRecordRejected && onRejected) {
        onRejected(data.data.harvestRecordRejected);
      }
    }
  });
}

/**
 * Hook specifically for satpam real-time subscriptions
 */
export function useSatpamSubscriptions({
  onVehicleEntry,
  onVehicleExit,
  onOverstayAlert,
}: UseSatpamSubscriptionsOptions = {}) {
  const { user, isAuthenticated } = useAuth();
  const normalizedRole = normalizeRoleName(user?.role);

  const canSubscribeSatpamRecords = Boolean(
    isAuthenticated &&
    normalizedRole &&
    SATPAM_SUBSCRIPTION_ALLOWED_ROLES.has(normalizedRole)
  );

  useSubscription<any>(SATPAM_VEHICLE_ENTRY, {
    skip: !canSubscribeSatpamRecords || !onVehicleEntry,
    onData: ({ data }) => {
      if (data.data?.satpamVehicleEntry && onVehicleEntry) {
        onVehicleEntry(data.data.satpamVehicleEntry);
      }
    }
  });

  useSubscription<any>(SATPAM_VEHICLE_EXIT, {
    skip: !canSubscribeSatpamRecords || !onVehicleExit,
    onData: ({ data }) => {
      if (data.data?.satpamVehicleExit && onVehicleExit) {
        onVehicleExit(data.data.satpamVehicleExit);
      }
    }
  });

  useSubscription<any>(SATPAM_OVERSTAY_ALERT, {
    skip: !canSubscribeSatpamRecords || !onOverstayAlert,
    onData: ({ data }) => {
      if (data.data?.satpamOverstayAlert && onOverstayAlert) {
        onOverstayAlert(data.data.satpamOverstayAlert);
      }
    }
  });
}

export default useGraphQLSubscriptions;

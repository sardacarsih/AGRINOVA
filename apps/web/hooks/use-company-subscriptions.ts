import { useEffect, useCallback } from 'react';
import { useSubscription } from '@apollo/client/react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import {
  COMPANY_CREATED_SUBSCRIPTION,
  COMPANY_UPDATED_SUBSCRIPTION,
  COMPANY_DELETED_SUBSCRIPTION,
  COMPANY_STATUS_CHANGED_SUBSCRIPTION,
  CompanyCreatedSubscription,
  CompanyUpdatedSubscription,
  CompanyDeletedSubscription,
  CompanyStatusChangedSubscription,
  GraphQLCompany,
} from '@/lib/apollo/queries/company';

export interface CompanySubscriptionCallbacks {
  onCompanyCreated?: (company: GraphQLCompany) => void;
  onCompanyUpdated?: (company: GraphQLCompany) => void;
  onCompanyDeleted?: (companyId: string) => void;
  onCompanyStatusChanged?: (company: GraphQLCompany) => void;
}

export interface UseCompanySubscriptionsOptions {
  enabled?: boolean;
  showToasts?: boolean;
  callbacks?: CompanySubscriptionCallbacks;
}

/**
 * Custom hook for managing company-related GraphQL subscriptions
 * Provides real-time updates for company creation, updates, deletion, and status changes
 */
export function useCompanySubscriptions(options: UseCompanySubscriptionsOptions = {}) {
  const { enabled = true, showToasts = true, callbacks } = options;
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Check if user has permission for company subscriptions
  const hasPermission = isAuthenticated && user && (
    user.role === 'COMPANY_ADMIN' ||
    user.role === 'AREA_MANAGER'
  );

  // Company Created subscription
  const { data: createdData, error: createdError } = useSubscription<CompanyCreatedSubscription>(
    COMPANY_CREATED_SUBSCRIPTION,
    {
      skip: !enabled || !hasPermission,
      onComplete: () => {
        console.log('✅ Company created subscription completed');
      },
      onError: (error) => {
        console.error('❌ Company created subscription error:', error);
      },
    }
  );

  // Company Updated subscription
  const { data: updatedData, error: updatedError } = useSubscription<CompanyUpdatedSubscription>(
    COMPANY_UPDATED_SUBSCRIPTION,
    {
      skip: !enabled || !hasPermission,
      onComplete: () => {
        console.log('✅ Company updated subscription completed');
      },
      onError: (error) => {
        console.error('❌ Company updated subscription error:', error);
      },
    }
  );

  // Company Deleted subscription (SUPER_ADMIN only)
  const { data: deletedData, error: deletedError } = useSubscription<CompanyDeletedSubscription>(
    COMPANY_DELETED_SUBSCRIPTION,
    {
      skip: !enabled || !hasPermission || user?.role !== 'SUPER_ADMIN',
      onComplete: () => {
        console.log('✅ Company deleted subscription completed');
      },
      onError: (error) => {
        console.error('❌ Company deleted subscription error:', error);
      },
    }
  );

  // Company Status Changed subscription
  const { data: statusChangedData, error: statusChangedError } = useSubscription<CompanyStatusChangedSubscription>(
    COMPANY_STATUS_CHANGED_SUBSCRIPTION,
    {
      skip: !enabled || !hasPermission,
      onComplete: () => {
        console.log('✅ Company status changed subscription completed');
      },
      onError: (error) => {
        console.error('❌ Company status changed subscription error:', error);
      },
    }
  );

  // Handle company created events
  useEffect(() => {
    if (createdData?.companyCreated) {
      const company = createdData.companyCreated;
      console.log('🏢 Company created:', company);

      if (showToasts) {
        toast({
          title: 'New Company Created',
          description: `Company "${company.name}" has been added to the system`,
        });
      }

      callbacks?.onCompanyCreated?.(company);
    }
  }, [createdData, showToasts, toast, callbacks]);

  // Handle company updated events
  useEffect(() => {
    if (updatedData?.companyUpdated) {
      const company = updatedData.companyUpdated;
      console.log('🏢 Company updated:', company);

      if (showToasts) {
        toast({
          title: 'Company Updated',
          description: `Company "${company.name}" information has been updated`,
        });
      }

      callbacks?.onCompanyUpdated?.(company);
    }
  }, [updatedData, showToasts, toast, callbacks]);

  // Handle company deleted events
  useEffect(() => {
    if (deletedData?.companyDeleted) {
      const companyId = deletedData.companyDeleted;
      console.log('🏢 Company deleted:', companyId);

      if (showToasts) {
        toast({
          title: 'Company Deleted',
          description: `A company has been removed from the system`,
          variant: 'destructive',
        });
      }

      callbacks?.onCompanyDeleted?.(companyId);
    }
  }, [deletedData, showToasts, toast, callbacks]);

  // Handle company status changed events
  useEffect(() => {
    if (statusChangedData?.companyStatusChanged) {
      const company = statusChangedData.companyStatusChanged;
      console.log('🏢 Company status changed:', company);

      if (showToasts) {
        const statusText = company.status.toLowerCase();
        const variant = company.status === 'SUSPENDED' ? 'destructive' : 'default';

        toast({
          title: 'Company Status Changed',
          description: `Company "${company.name}" is now ${statusText}`,
          variant,
        });
      }

      callbacks?.onCompanyStatusChanged?.(company);
    }
  }, [statusChangedData, showToasts, toast, callbacks]);

  // Error handling
  useEffect(() => {
    const errors = [createdError, updatedError, deletedError, statusChangedError].filter(Boolean);

    if (errors.length > 0) {
      console.error('Company subscription errors:', errors);

      if (showToasts) {
        toast({
          title: 'Subscription Error',
          description: 'Failed to receive real-time company updates. Please refresh the page.',
          variant: 'destructive',
        });
      }
    }
  }, [createdError, updatedError, deletedError, statusChangedError, showToasts, toast]);

  // Manual subscription management
  const enableSubscriptions = useCallback(() => {
    console.log('🔄 Enabling company subscriptions');
  }, []);

  const disableSubscriptions = useCallback(() => {
    console.log('⏸️ Disabling company subscriptions');
  }, []);

  return {
    // Subscription states
    isEnabled: enabled && hasPermission,
    hasPermission,

    // Latest data from subscriptions
    latestCreated: createdData?.companyCreated,
    latestUpdated: updatedData?.companyUpdated,
    latestDeleted: deletedData?.companyDeleted,
    latestStatusChanged: statusChangedData?.companyStatusChanged,

    // Error states
    errors: {
      created: createdError,
      updated: updatedError,
      deleted: deletedError,
      statusChanged: statusChangedError,
    },

    // Control functions
    enableSubscriptions,
    disableSubscriptions,

    // Helper functions
    hasErrors: !!(createdError || updatedError || deletedError || statusChangedError),
    isConnected: enabled && hasPermission && !createdError && !updatedError,
  };
}

export default useCompanySubscriptions;

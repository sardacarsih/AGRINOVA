import { useMemo } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import {
  GET_WEIGHING_RECORDS,
  GET_WEIGHING_RECORD,
  CREATE_WEIGHING_RECORD,
  UPDATE_WEIGHING_RECORD,
  WEIGHING_UPDATED_SUBSCRIPTION,
  GET_WEIGHING_QUEUE,
  GET_WEIGHING_SUMMARY,
  GET_WEIGHING_ANALYTICS
} from '@/lib/apollo/queries/weighing';

// Types
export interface WeighingRecord {
  id: string;
  ticketNumber: string;
  vehicleNumber: string;
  driverName: string;
  vendorName: string;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  weighingTime: string;
  cargoType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWeighingRecordInput {
  ticketNumber: string;
  vehicleNumber: string;
  driverName?: string;
  vendorName?: string;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  weighingTime: string;
  cargoType?: string;
  companyID: string;
}

export interface UpdateWeighingRecordInput {
  ticketNumber?: string;
  vehicleNumber?: string;
  driverName?: string;
  vendorName?: string;
  grossWeight?: number;
  tareWeight?: number;
  netWeight?: number;
  weighingTime?: string;
  cargoType?: string;
}

export interface WeighingQueueItem {
  id: string;
  ticketNumber: string;
  vehicleNumber: string;
  driverName: string;
  vendorName: string;
  estimatedWeight: number;
  arrivalTime: string;
  status: 'waiting' | 'weighing' | 'completed';
  priority: 'normal' | 'urgent' | 'high';
  position: number;
}

export interface WeighingSummary {
  totalRecords: number;
  totalTonnage: number;
  averageTonnage: number;
  completedRecords: number;
  averageServiceTime: number;
  efficiency: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface WeighingFiltersInput {
  startDate?: string;
  endDate?: string;
  vehicleNumber?: string;
  vendorName?: string;
  status?: string;
}

// Custom Hooks
export function useWeighingRecords() {
  const { data, loading, error, refetch } = useQuery<{
    weighingRecords: WeighingRecord[];
  }>(GET_WEIGHING_RECORDS);

  return {
    records: data?.weighingRecords || [],
    loading,
    error,
    refetch
  };
}

export function useWeighingRecord(id: string) {
  const { data, loading, error, refetch } = useQuery<{
    weighingRecord: WeighingRecord;
  }>(GET_WEIGHING_RECORD, {
    variables: { id },
    skip: !id
  });

  return {
    record: data?.weighingRecord,
    loading,
    error,
    refetch
  };
}

export function useCreateWeighingRecord() {
  const [createRecord, { loading, error, data }] = useMutation<{
    createWeighingRecord: WeighingRecord;
  }>(CREATE_WEIGHING_RECORD, {
    refetchQueries: [GET_WEIGHING_RECORDS],
    awaitRefetchQueries: true,
    onError: (error) => {
      console.error('GraphQL mutation error:', error);
      // You can add global error handling here
      if (error.networkError) {
        // Network error
        console.error('Network error:', error.networkError);
      } else if (error.graphQLErrors.length > 0) {
        // GraphQL error
        error.graphQLErrors.forEach((graphQLError) => {
          console.error('GraphQL error:', graphQLError);
        });
      }
    },
    // Add optimistic updates
    update: (cache, { data: newData }) => {
      if (!newData?.createWeighingRecord) return;

      try {
        // Read existing records from cache
        const existingData = cache.readQuery<{
          weighingRecords: WeighingRecord[];
        }>({
          query: GET_WEIGHING_RECORDS,
        });

        if (existingData?.weighingRecords) {
          // Add the new record to the cache optimistically
          cache.writeQuery({
            query: GET_WEIGHING_RECORDS,
            data: {
              weighingRecords: [...existingData.weighingRecords, newData.createWeighingRecord],
            },
          });
        }
      } catch (cacheError) {
        console.warn('Cache update failed:', cacheError);
        // Continue without cache update - the refetch will handle it
      }
    },
  });

  const createWeighingRecord = async (input: CreateWeighingRecordInput) => {
    try {
      const result = await createRecord({
        variables: { input },
        optimisticResponse: {
          createWeighingRecord: {
            __typename: 'WeighingRecord',
            id: `temp-${Date.now()}`, // Temporary ID
            ticketNumber: input.ticketNumber,
            vehicleNumber: input.vehicleNumber,
            driverName: input.driverName || '',
            vendorName: input.vendorName || '',
            grossWeight: input.grossWeight,
            tareWeight: input.tareWeight,
            netWeight: input.netWeight,
            weighingTime: input.weighingTime,
            cargoType: input.cargoType,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as WeighingRecord,
        },
      });
      return result.data?.createWeighingRecord;
    } catch (error) {
      console.error('Error in createWeighingRecord:', error);
      throw error; // Re-throw to let component handle it
    }
  };

  return {
    createWeighingRecord,
    loading,
    error,
    data: data?.createWeighingRecord
  };
}

export function useUpdateWeighingRecord() {
  const [updateRecord, { loading, error, data }] = useMutation<{
    updateWeighingRecord: WeighingRecord;
  }>(UPDATE_WEIGHING_RECORD, {
    refetchQueries: [GET_WEIGHING_RECORDS],
    awaitRefetchQueries: true,
  });

  const updateWeighingRecord = async (id: string, input: UpdateWeighingRecordInput) => {
    const result = await updateRecord({
      variables: { id, input }
    });
    return result.data?.updateWeighingRecord;
  };

  return {
    updateWeighingRecord,
    loading,
    error,
    data: data?.updateWeighingRecord
  };
}

export function useWeighingQueue() {
  const { data, loading, error, refetch } = useQuery<{
    weighingQueue: WeighingQueueItem[];
  }>(GET_WEIGHING_QUEUE);

  // Calculate derived data
  const queueStats = useMemo(() => {
    if (!data?.weighingQueue) return null;

    const queue = data.weighingQueue;
    const totalTonnage = queue.reduce((sum, item) => sum + item.estimatedWeight, 0);
    const urgentItems = queue.filter(item => item.priority === 'urgent' || item.priority === 'high').length;

    return {
      total: queue.length,
      totalTonnage,
      waiting: queue.filter(item => item.status === 'waiting').length,
      weighing: queue.filter(item => item.status === 'weighing').length,
      completed: queue.filter(item => item.status === 'completed').length,
      urgent: urgentItems
    };
  }, [data]);

  return {
    queue: data?.weighingQueue || [],
    stats: queueStats,
    loading,
    error,
    refetch
  };
}

export function useWeighingSummary(filters?: WeighingFiltersInput) {
  const { data, loading, error, refetch } = useQuery<{
    weighingSummary: WeighingSummary;
  }>(GET_WEIGHING_SUMMARY, {
    variables: { filters },
    skip: !filters
  });

  return {
    summary: data?.weighingSummary,
    loading,
    error,
    refetch
  };
}

export function useWeighingAnalytics(period: string, filters?: WeighingFiltersInput) {
  const { data, loading, error, refetch } = useQuery<{
    weighingAnalytics: any;
  }>(GET_WEIGHING_ANALYTICS, {
    variables: { period, filters }
  });

  return {
    analytics: data?.weighingAnalytics,
    loading,
    error,
    refetch
  };
}

export function useWeighingSubscription() {
  const { data, loading, error } = useSubscription<{
    weighingUpdated: WeighingRecord;
  }>(WEIGHING_UPDATED_SUBSCRIPTION);

  return {
    updatedRecord: data?.weighingUpdated,
    loading,
    error
  };
}

// Combined hook for weighing operations
export function useWeighingOperations() {
  const { records, loading: recordsLoading, refetch: refetchRecords } = useWeighingRecords();
  const { queue, stats } = useWeighingQueue();
  const { createWeighingRecord, loading: createLoading, error: createError } = useCreateWeighingRecord();
  const { updateWeighingRecord, loading: updateLoading, error: updateError } = useUpdateWeighingRecord();
  const { updatedRecord } = useWeighingSubscription();

  return {
    // Data
    records,
    queue,
    stats,
    updatedRecord,

    // Loading states
    loading: recordsLoading || createLoading || updateLoading,

    // Errors
    errors: {
      create: createError,
      update: updateError
    },

    // Operations
    createWeighingRecord,
    updateWeighingRecord,
    refetchRecords
  };
}

// Utility functions
export const generateTicketNumber = (): string => {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
  return `TBS-${timestamp}`;
};

export const calculateNetWeight = (gross: number, tare: number): number => {
  return Math.max(0, gross - tare);
};

export const validateWeighingData = (data: CreateWeighingRecordInput | UpdateWeighingRecordInput): string[] => {
  const errors: string[] = [];

  if ('vehicleNumber' in data && !data.vehicleNumber?.trim()) {
    errors.push('Vehicle number is required');
  }

  if ('grossWeight' in data && (!data.grossWeight || data.grossWeight <= 0)) {
    errors.push('Gross weight must be greater than 0');
  }

  if ('tareWeight' in data && (!data.tareWeight || data.tareWeight < 0)) {
    errors.push('Tare weight must be greater than or equal to 0');
  }

  if (data.grossWeight && data.tareWeight && data.tareWeight > data.grossWeight) {
    errors.push('Tare weight cannot be greater than gross weight');
  }

  return errors;
};
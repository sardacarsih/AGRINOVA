import { useMemo } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import {
  GET_GRADING_RECORDS,
  GET_GRADING_RECORD,
  CREATE_GRADING_RECORD,
  UPDATE_GRADING_RECORD,
  APPROVE_GRADING,
  REJECT_GRADING,
  GRADING_UPDATED_SUBSCRIPTION,
  GRADING_APPROVED_SUBSCRIPTION,
  GRADING_REJECTED_SUBSCRIPTION,
  GET_PENDING_GRADING_APPROVALS,
  GET_GRADING_QUEUE,
  GET_GRADING_ANALYTICS,
  GET_QUALITY_SUMMARY
} from '@/lib/apollo/queries/grading';

// Types
export interface GradingRecord {
  id: string;
  harvestRecordId: string;
  graderId: string;
  qualityScore: number;
  maturityLevel: 'MENTAH' | 'MASAK' | 'TERLALU_MASAK' | 'BUSUK';
  brondolanPercentage: number;
  looseFruitPercentage: number;
  dirtPercentage: number;
  gradingNotes: string;
  gradingDate: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGradingRecordInput {
  harvestRecordId: string;
  qualityScore: number;
  maturityLevel: string;
  brondolanPercentage: number;
  looseFruitPercentage: number;
  dirtPercentage: number;
  gradingNotes?: string;
  gradingDate: string;
}

export interface UpdateGradingRecordInput {
  qualityScore?: number;
  maturityLevel?: string;
  brondolanPercentage?: number;
  looseFruitPercentage?: number;
  dirtPercentage?: number;
  gradingNotes?: string;
}

export interface GradingApprovalInput {
  approved: boolean;
  rejectionReason?: string;
}

export interface GradingQueueItem {
  id: string;
  harvestRecordId: string;
  blockName: string;
  harvestDate: string;
  fieldSupervisor: string;
  deliveryTime: string;
  estimatedTime: string;
  status: 'waiting' | 'grading' | 'completed';
  priority: 'normal' | 'urgent' | 'high';
  tonnage: number;
  maturityLevel?: string;
}

export interface GradingAnalytics {
  totalRecords: number;
  averageQualityScore: number;
  gradeDistribution: {
    grade: string;
    count: number;
    percentage: number;
  }[];
  maturityDistribution: {
    level: string;
    count: number;
    percentage: number;
  }[];
  averageDefects: {
    brondolan: number;
    looseFruit: number;
    dirt: number;
  };
  trends: {
    qualityScore: number;
    approvalRate: number;
    rejectionRate: number;
  };
  topPerformers: {
    graderId: string;
    graderName: string;
    averageScore: number;
    recordCount: number;
  }[];
}

export interface QualityFiltersInput {
  startDate?: string;
  endDate?: string;
  blockName?: string;
  graderId?: string;
  maturityLevel?: string;
  qualityScoreMin?: number;
  qualityScoreMax?: number;
}

// Custom Hooks
export function useGradingRecords() {
  const { data, loading, error, refetch } = useQuery<{
    gradingRecords: GradingRecord[];
  }>(GET_GRADING_RECORDS);

  return {
    records: data?.gradingRecords || [],
    loading,
    error,
    refetch
  };
}

export function useGradingRecord(id: string) {
  const { data, loading, error, refetch } = useQuery<{
    gradingRecord: GradingRecord;
  }>(GET_GRADING_RECORD, {
    variables: { id },
    skip: !id
  });

  return {
    record: data?.gradingRecord,
    loading,
    error,
    refetch
  };
}

export function useCreateGradingRecord() {
  const [createRecord, { loading, error, data }] = useMutation<{
    createGradingRecord: GradingRecord;
  }>(CREATE_GRADING_RECORD, {
    refetchQueries: [GET_GRADING_RECORDS],
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
      if (!newData?.createGradingRecord) return;

      try {
        // Read existing records from cache
        const existingData = cache.readQuery<{
          gradingRecords: GradingRecord[];
        }>({
          query: GET_GRADING_RECORDS,
        });

        if (existingData?.gradingRecords) {
          // Add the new record to the cache optimistically
          cache.writeQuery({
            query: GET_GRADING_RECORDS,
            data: {
              gradingRecords: [...existingData.gradingRecords, newData.createGradingRecord],
            },
          });
        }
      } catch (cacheError) {
        console.warn('Cache update failed:', cacheError);
        // Continue without cache update - the refetch will handle it
      }
    },
  });

  const createGradingRecord = async (input: CreateGradingRecordInput) => {
    try {
      const result = await createRecord({
        variables: { input },
        optimisticResponse: {
          createGradingRecord: {
            __typename: 'GradingRecord',
            id: `temp-${Date.now()}`, // Temporary ID
            harvestRecordId: input.harvestRecordId,
            graderId: 'current-user', // Will be filled by backend
            qualityScore: input.qualityScore,
            maturityLevel: input.maturityLevel as any,
            brondolanPercentage: input.brondolanPercentage,
            looseFruitPercentage: input.looseFruitPercentage,
            dirtPercentage: input.dirtPercentage,
            gradingNotes: input.gradingNotes || '',
            gradingDate: input.gradingDate,
            isApproved: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as GradingRecord,
        },
      });
      return result.data?.createGradingRecord;
    } catch (error) {
      console.error('Error in createGradingRecord:', error);
      throw error; // Re-throw to let component handle it
    }
  };

  return {
    createGradingRecord,
    loading,
    error,
    data: data?.createGradingRecord
  };
}

export function useUpdateGradingRecord() {
  const [updateRecord, { loading, error, data }] = useMutation<{
    updateGradingRecord: GradingRecord;
  }>(UPDATE_GRADING_RECORD, {
    refetchQueries: [GET_GRADING_RECORDS],
    awaitRefetchQueries: true,
  });

  const updateGradingRecord = async (id: string, input: UpdateGradingRecordInput) => {
    const result = await updateRecord({
      variables: { id, input }
    });
    return result.data?.updateGradingRecord;
  };

  return {
    updateGradingRecord,
    loading,
    error,
    data: data?.updateGradingRecord
  };
}

export function useGradingApprovals() {
  const { data, loading, error, refetch } = useQuery<{
    pendingGradingApprovals: GradingRecord[];
  }>(GET_PENDING_GRADING_APPROVALS);

  const [approveRecord, approveRecordState] = useMutation(APPROVE_GRADING, {
    refetchQueries: [GET_PENDING_GRADING_APPROVALS, GET_GRADING_RECORDS],
    awaitRefetchQueries: true,
  });

  const [rejectRecord, rejectRecordState] = useMutation(REJECT_GRADING, {
    refetchQueries: [GET_PENDING_GRADING_APPROVALS, GET_GRADING_RECORDS],
    awaitRefetchQueries: true,
  });

  const approveGrading = async (id: string, input: GradingApprovalInput) => {
    const result = await approveRecord({
      variables: { id, input }
    });
    return result.data?.approveGrading;
  };

  const rejectGrading = async (id: string, input: GradingApprovalInput) => {
    const result = await rejectRecord({
      variables: { id, input }
    });
    return result.data?.rejectGrading;
  };

  return {
    approvals: data?.pendingGradingApprovals || [],
    loading: loading || approveRecordState.loading || rejectRecordState.loading,
    error: error || approveRecordState.error || rejectRecordState.error,
    approveGrading,
    rejectGrading,
    refetch
  };
}

export function useGradingQueue() {
  const { data, loading, error, refetch } = useQuery<{
    gradingQueue: GradingQueueItem[];
  }>(GET_GRADING_QUEUE);

  // Calculate derived data
  const queueStats = useMemo(() => {
    if (!data?.gradingQueue) return null;

    const queue = data.gradingQueue;
    const totalTonnage = queue.reduce((sum, item) => sum + item.tonnage, 0);
    const urgentItems = queue.filter(item => item.priority === 'urgent' || item.priority === 'high').length;

    return {
      total: queue.length,
      totalTonnage,
      waiting: queue.filter(item => item.status === 'waiting').length,
      grading: queue.filter(item => item.status === 'grading').length,
      completed: queue.filter(item => item.status === 'completed').length,
      urgent: urgentItems
    };
  }, [data]);

  return {
    queue: data?.gradingQueue || [],
    stats: queueStats,
    loading,
    error,
    refetch
  };
}

export function useGradingAnalytics(period: string, filters?: QualityFiltersInput) {
  const { data, loading, error, refetch } = useQuery<{
    gradingAnalytics: GradingAnalytics;
  }>(GET_GRADING_ANALYTICS, {
    variables: { period, filters }
  });

  return {
    analytics: data?.gradingAnalytics,
    loading,
    error,
    refetch
  };
}

export function useQualitySummary(filters?: QualityFiltersInput) {
  const { data, loading, error, refetch } = useQuery<{
    qualitySummary: any;
  }>(GET_QUALITY_SUMMARY, {
    variables: { filters }
  });

  return {
    summary: data?.qualitySummary,
    loading,
    error,
    refetch
  };
}

// Subscription hooks
export function useGradingSubscriptions() {
  const { data: updatedData, loading: updatedLoading, error: updatedError } = useSubscription<{
    gradingUpdated: GradingRecord;
  }>(GRADING_UPDATED_SUBSCRIPTION);

  const { data: approvedData, loading: approvedLoading, error: approvedError } = useSubscription<{
    gradingApproved: GradingRecord;
  }>(GRADING_APPROVED_SUBSCRIPTION);

  const { data: rejectedData, loading: rejectedLoading, error: rejectedError } = useSubscription<{
    gradingRejected: GradingRecord;
  }>(GRADING_REJECTED_SUBSCRIPTION);

  return {
    updatedRecord: updatedData?.gradingUpdated,
    approvedRecord: approvedData?.gradingApproved,
    rejectedRecord: rejectedData?.gradingRejected,
    loading: updatedLoading || approvedLoading || rejectedLoading,
    error: updatedError || approvedError || rejectedError
  };
}

// Combined hook for grading operations
export function useGradingOperations() {
  const { records, loading: recordsLoading, refetch: refetchRecords } = useGradingRecords();
  const { queue, stats } = useGradingQueue();
  const { approvals, approveGrading, rejectGrading, loading: approvalsLoading } = useGradingApprovals();
  const { createGradingRecord, loading: createLoading, error: createError } = useCreateGradingRecord();
  const { updateGradingRecord, loading: updateLoading, error: updateError } = useUpdateGradingRecord();
  const { updatedRecord, approvedRecord, rejectedRecord } = useGradingSubscriptions();

  return {
    // Data
    records,
    queue,
    stats,
    approvals,
    updatedRecord,
    approvedRecord,
    rejectedRecord,

    // Loading states
    loading: recordsLoading || approvalsLoading || createLoading || updateLoading,

    // Errors
    errors: {
      create: createError,
      update: updateError
    },

    // Operations
    createGradingRecord,
    updateGradingRecord,
    approveGrading,
    rejectGrading,
    refetchRecords
  };
}

// Utility functions
export const calculateQualityCategory = (score: number): string => {
  if (score >= 90) return 'EXCELLENT';
  if (score >= 80) return 'GOOD';
  if (score >= 70) return 'FAIR';
  if (score >= 60) return 'POOR';
  return 'VERY_POOR';
};

export const calculateOverallGrade = (qualityScore: number, brondolanPercentage: number, looseFruitPercentage: number): string => {
  const dirtPenalty = brondolanPercentage * 0.5;
  const looseFruitPenalty = looseFruitPercentage * 0.3;

  const finalScore = qualityScore - dirtPenalty - looseFruitPenalty;

  if (finalScore >= 90) return 'A';
  if (finalScore >= 80) return 'B';
  if (finalScore >= 70) return 'C';
  if (finalScore >= 60) return 'D';
  return 'E';
};

export const validateGradingData = (data: CreateGradingRecordInput | UpdateGradingRecordInput): string[] => {
  const errors: string[] = [];

  if ('qualityScore' in data && (!data.qualityScore || data.qualityScore < 0 || data.qualityScore > 100)) {
    errors.push('Quality score must be between 0 and 100');
  }

  if ('maturityLevel' in data && !data.maturityLevel?.trim()) {
    errors.push('Maturity level is required');
  }

  const totalPercentage = (data.brondolanPercentage || 0) + (data.looseFruitPercentage || 0) + (data.dirtPercentage || 0);

  if (totalPercentage > 100) {
    errors.push('Total percentage cannot exceed 100%');
  }

  if (data.brondolanPercentage !== undefined && (data.brondolanPercentage < 0 || data.brondolanPercentage > 100)) {
    errors.push('Brondolan percentage must be between 0 and 100');
  }

  if (data.looseFruitPercentage !== undefined && (data.looseFruitPercentage < 0 || data.looseFruitPercentage > 100)) {
    errors.push('Loose fruit percentage must be between 0 and 100');
  }

  if (data.dirtPercentage !== undefined && (data.dirtPercentage < 0 || data.dirtPercentage > 100)) {
    errors.push('Dirt percentage must be between 0 and 100');
  }

  return errors;
};

export const formatQualityScore = (score: number): string => {
  return score.toFixed(1);
};

export const getMaturityLevelLabel = (level: string): string => {
  const labels = {
    'MENTAH': 'Mentah',
    'MASAK': 'Masak',
    'TERLALU_MASAK': 'Terlalu Masak',
    'BUSUK': 'Busuk'
  };
  return labels[level as keyof typeof labels] || level;
};

export const getGradeColor = (grade: string): string => {
  const colors = {
    'A': 'text-green-600',
    'B': 'text-blue-600',
    'C': 'text-yellow-600',
    'D': 'text-orange-600',
    'E': 'text-red-600'
  };
  return colors[grade as keyof typeof colors] || 'text-gray-600';
};
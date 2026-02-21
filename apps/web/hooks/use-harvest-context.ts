import { useQuery } from '@apollo/client/react';
import { useAuth } from './use-auth';
import {
  GET_HARVEST_CONTEXT,
  GetHarvestContextResponse,
  HarvestContext,
  Block,
  BlockWithStats,
} from '@/lib/apollo/queries/harvest-context';

/**
 * useHarvestContext Hook
 *
 * Fetches optimized harvest context with role-based defaults.
 * Automatically loads:
 * - Assignment summary (how many estates/divisions/blocks user has access to)
 * - Recent blocks (last 7 days of activity)
 * - Default blocks (for Mandor with single division - auto-loads blocks)
 *
 * @returns {Object} Harvest context data and loading state
 *
 * @example
 * ```tsx
 * const { context, recentBlocks, defaultBlocks, loading, error } = useHarvestContext();
 *
 * if (loading) return <LoadingSkeleton />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * // Show recent blocks for quick access
 * {recentBlocks.map(block => (
 *   <QuickBlockCard key={block.id} block={block} />
 * ))}
 * ```
 */
export function useHarvestContext() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery<GetHarvestContextResponse>(
    GET_HARVEST_CONTEXT,
    {
      skip: !user,
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first',
      // Cache for 5 minutes
      context: {
        debounceKey: 'harvest-context',
      },
    }
  );

  return {
    context: data?.harvestContext,
    assignmentSummary: data?.harvestContext?.assignmentSummary,
    recentBlocks: data?.harvestContext?.recentBlocks || [],
    defaultBlocks: data?.harvestContext?.defaultDivisionBlocks || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Helper type exports for components
 */
export type { HarvestContext, Block, BlockWithStats };

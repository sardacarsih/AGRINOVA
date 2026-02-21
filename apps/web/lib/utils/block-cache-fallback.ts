/**
 * Block Data Cache Fallback Utilities
 *
 * Provides localStorage-based fallback for block data when API fails
 */

export interface CachedBlockData {
  id: string;
  blockCode: string;
  name: string;
  luasHa?: number;
  cropType?: string;
  plantingYear?: number;
  bjrValue: number;
  divisionId: string;
  division: {
    id: string;
    name: string;
    estate: {
      id: string;
      name: string;
    };
  };
  lastHarvestDate?: string;
  harvestCount?: number;
  cachedAt: number;
}

export interface CachedHarvestContext {
  assignmentSummary: {
    totalEstates: number;
    totalDivisions: number;
    totalBlocks: number;
    primaryDivisionId?: string;
  };
  recentBlocks: CachedBlockData[];
  defaultDivisionBlocks: CachedBlockData[];
  cachedAt: number;
}

const CACHE_KEYS = {
  HARVEST_CONTEXT: 'harvest_context_cache',
  BLOCKS_BY_DIVISION: 'blocks_by_division_',
} as const;

const CACHE_DURATION = {
  HARVEST_CONTEXT: 15 * 60 * 1000, // 15 minutes
  BLOCKS_BY_DIVISION: 30 * 60 * 1000, // 30 minutes
} as const;

/**
 * Check if cached data is still valid
 */
export function isCacheValid(cachedAt: number, duration: number): boolean {
  return Date.now() - cachedAt < duration;
}

/**
 * Save harvest context to localStorage
 */
export function saveHarvestContextToCache(context: CachedHarvestContext): void {
  try {
    localStorage.setItem(CACHE_KEYS.HARVEST_CONTEXT, JSON.stringify(context));
  } catch (error) {
    console.warn('Failed to save harvest context to cache:', error);
  }
}

/**
 * Get harvest context from localStorage
 */
export function getHarvestContextFromCache(): CachedHarvestContext | null {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.HARVEST_CONTEXT);
    if (!cached) return null;

    const context: CachedHarvestContext = JSON.parse(cached);

    if (!isCacheValid(context.cachedAt, CACHE_DURATION.HARVEST_CONTEXT)) {
      localStorage.removeItem(CACHE_KEYS.HARVEST_CONTEXT);
      return null;
    }

    return context;
  } catch (error) {
    console.warn('Failed to load harvest context from cache:', error);
    return null;
  }
}

/**
 * Save blocks by division to localStorage
 */
export function saveBlocksByDivisionToCache(
  divisionId: string,
  blocks: CachedBlockData[],
  totalCount: number,
  hasMore: boolean
): void {
  try {
    const cacheData = {
      blocks,
      totalCount,
      hasMore,
      cachedAt: Date.now(),
    };
    localStorage.setItem(
      `${CACHE_KEYS.BLOCKS_BY_DIVISION}${divisionId}`,
      JSON.stringify(cacheData)
    );
  } catch (error) {
    console.warn(`Failed to save blocks for division ${divisionId} to cache:`, error);
  }
}

/**
 * Get blocks by division from localStorage
 */
export function getBlocksByDivisionFromCache(divisionId: string): {
  blocks: CachedBlockData[];
  totalCount: number;
  hasMore: boolean;
} | null {
  try {
    const cached = localStorage.getItem(`${CACHE_KEYS.BLOCKS_BY_DIVISION}${divisionId}`);
    if (!cached) return null;

    const cacheData: any = JSON.parse(cached);

    if (!isCacheValid(cacheData.cachedAt, CACHE_DURATION.BLOCKS_BY_DIVISION)) {
      localStorage.removeItem(`${CACHE_KEYS.BLOCKS_BY_DIVISION}${divisionId}`);
      return null;
    }

    return {
      blocks: cacheData.blocks,
      totalCount: cacheData.totalCount,
      hasMore: cacheData.hasMore,
    };
  } catch (error) {
    console.warn(`Failed to load blocks for division ${divisionId} from cache:`, error);
    return null;
  }
}

/**
 * Clear all block-related cache
 */
export function clearBlockCache(): void {
  try {
    Object.values(CACHE_KEYS).forEach(key => {
      if (key === CACHE_KEYS.BLOCKS_BY_DIVISION) {
        // Remove all division-specific cache entries
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey && storageKey.startsWith(key)) {
            localStorage.removeItem(storageKey);
          }
        }
      } else {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear block cache:', error);
  }
}

/**
 * Get cache statistics for debugging
 */
export function getBlockCacheStats(): {
  harvestContextCached: boolean;
  divisionCacheCount: number;
  totalCachedBlocks: number;
  cacheSize: string;
} {
  const stats = {
    harvestContextCached: !!getHarvestContextFromCache(),
    divisionCacheCount: 0,
    totalCachedBlocks: 0,
    cacheSize: '0 KB',
  };

  try {
    let totalSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEYS.BLOCKS_BY_DIVISION)) {
        stats.divisionCacheCount++;
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
          const cacheData = JSON.parse(value);
          stats.totalCachedBlocks += cacheData.blocks?.length || 0;
        }
      }
    }

    // Add harvest context size
    const harvestContextCache = localStorage.getItem(CACHE_KEYS.HARVEST_CONTEXT);
    if (harvestContextCache) {
      totalSize += harvestContextCache.length;
    }

    stats.cacheSize = `${(totalSize / 1024).toFixed(1)} KB`;
  } catch (error) {
    console.warn('Failed to calculate cache stats:', error);
  }

  return stats;
}
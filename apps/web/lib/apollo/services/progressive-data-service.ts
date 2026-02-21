import { ApolloClient } from '@apollo/client/core';
import { USER_ASSIGNMENTS_QUERY, MINIMAL_PROFILE_QUERY } from '../queries/auth';

// Progressive data loading service for optimized dashboard performance
export class ProgressiveDataService {
  private client: ApolloClient<unknown>;
  private loadingPromises: Map<string, Promise<unknown>> = new Map();
  private loadedData: Map<string, unknown> = new Map();
  private loadTimestamps: Map<string, number> = new Map();

  constructor(client: ApolloClient<unknown>) {
    this.client = client;
  }

  // Load user assignments progressively with caching
  async loadUserAssignments(userId: string, forceRefresh: boolean = false): Promise<unknown> {
    const cacheKey = `user_assignments_${userId}`;

    // Check if already loaded and not expired
    if (!forceRefresh && this.loadedData.has(cacheKey)) {
      const timestamp = this.loadTimestamps.get(cacheKey) || 0;
      const age = Date.now() - timestamp;

      // Cache assignments for 10 minutes
      if (age < 10 * 60 * 1000) {
        console.log('⚡ [ProgressiveData] Using cached assignments for user:', userId);
        return this.loadedData.get(cacheKey);
      }
    }

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      console.log('🔄 [ProgressiveData] Returning existing loading promise for user:', userId);
      return this.loadingPromises.get(cacheKey);
    }

    // Start loading with timeout protection
    const loadingPromise = this.loadWithTimeout(
      () => this.client.query({
        query: USER_ASSIGNMENTS_QUERY,
        variables: { userId },
        fetchPolicy: forceRefresh ? 'network-only' : 'cache-first',
        errorPolicy: 'all',
      }),
      8000 // 8 second timeout
    ).then(result => {
      console.log('✅ [ProgressiveData] User assignments loaded for:', userId);

      // Cache the result
      this.loadedData.set(cacheKey, result.data);
      this.loadTimestamps.set(cacheKey, Date.now());

      // Clean up loading promise
      this.loadingPromises.delete(cacheKey);

      return result.data;
    }).catch(error => {
      console.error('❌ [ProgressiveData] Failed to load user assignments:', error);
      this.loadingPromises.delete(cacheKey);
      throw error;
    });

    this.loadingPromises.set(cacheKey, loadingPromise);
    return loadingPromise;
  }

  // Load minimal profile data
  async loadMinimalProfile(forceRefresh: boolean = false): Promise<unknown> {
    const cacheKey = 'minimal_profile';

    // Check cache (5 minute TTL)
    if (!forceRefresh && this.loadedData.has(cacheKey)) {
      const timestamp = this.loadTimestamps.get(cacheKey) || 0;
      const age = Date.now() - timestamp;

      if (age < 5 * 60 * 1000) {
        console.log('⚡ [ProgressiveData] Using cached minimal profile');
        return this.loadedData.get(cacheKey);
      }
    }

    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    const loadingPromise = this.loadWithTimeout(
      () => this.client.query({
        query: MINIMAL_PROFILE_QUERY,
        fetchPolicy: forceRefresh ? 'network-only' : 'cache-first',
        errorPolicy: 'all',
      }),
      5000 // 5 second timeout for minimal profile
    ).then(result => {
      console.log('✅ [ProgressiveData] Minimal profile loaded');
      this.loadedData.set(cacheKey, result.data);
      this.loadTimestamps.set(cacheKey, Date.now());
      this.loadingPromises.delete(cacheKey);
      return result.data;
    }).catch(error => {
      console.error('❌ [ProgressiveData] Failed to load minimal profile:', error);
      this.loadingPromises.delete(cacheKey);
      throw error;
    });

    this.loadingPromises.set(cacheKey, loadingPromise);
    return loadingPromise;
  }

  // Load dashboard data in priority order
  async loadDashboardData(userId: string): Promise<{
    profile: unknown;
    assignments: unknown;
    loadTime: number;
  }> {
    const startTime = Date.now();
    console.log('🚀 [ProgressiveData] Starting dashboard data load for user:', userId);

    try {
      // Load critical data first (parallel for speed)
      const [profile, assignments] = await Promise.all([
        this.loadMinimalProfile().catch(error => {
          console.warn('⚠️ [ProgressiveData] Profile load failed, continuing...', error);
          return null;
        }),
        this.loadUserAssignments(userId).catch(error => {
          console.warn('⚠️ [ProgressiveData] Assignments load failed, continuing...', error);
          return null;
        }),
      ]);

      const loadTime = Date.now() - startTime;
      console.log(`✅ [ProgressiveData] Dashboard data loaded in ${loadTime}ms`);

      return {
        profile,
        assignments,
        loadTime,
      };
    } catch (error) {
      const loadTime = Date.now() - startTime;
      console.error(`❌ [ProgressiveData] Dashboard data load failed after ${loadTime}ms:`, error);
      throw error;
    }
  }

  // Preload data for common user actions
  async preloadCommonData(userRole: string): Promise<void> {
    console.log('🔮 [ProgressiveData] Preloading common data for role:', userRole);

    // Based on role, preload commonly accessed data
    const preloadPromises: Promise<unknown>[] = [];

    // All roles benefit from quick profile access
    preloadPromises.push(
      this.loadMinimalProfile().catch(() => { }) // Ignore errors in preload
    );

    // Role-specific preloading
    switch (userRole) {
      case 'MANAGER':
        // Preload estate data for managers
        preloadPromises.push(
          this.preloadEstates().catch(() => { })
        );
        break;
      case 'ASISTEN':
        // Preload division and harvest data
        preloadPromises.push(
          this.preloadDivisions().catch(() => { }),
          this.preloadHarvestData().catch(() => { })
        );
        break;
      case 'MANDOR':
        // Preload block and harvest input data
        preloadPromises.push(
          this.preloadBlocks().catch(() => { }),
          this.preloadHarvestInputTemplates().catch(() => { })
        );
        break;
      case 'SATPAM':
        // Preload gate check data
        preloadPromises.push(
          this.preloadGateCheckData().catch(() => { })
        );
        break;
    }

    // Wait for all preloads with timeout
    await Promise.race([
      Promise.all(preloadPromises),
      new Promise(resolve => setTimeout(resolve, 3000)) // 3 second max preload time
    ]);

    console.log('✅ [ProgressiveData] Preload completed for role:', userRole);
  }

  // Clear cache for specific user
  clearUserCache(userId: string): void {
    const keysToDelete = Array.from(this.loadedData.keys()).filter(key =>
      key.includes(userId) || key.startsWith('user_')
    );

    keysToDelete.forEach(key => {
      this.loadedData.delete(key);
      this.loadTimestamps.delete(key);
      this.loadingPromises.delete(key);
    });

    console.log('🧹 [ProgressiveData] Cleared cache for user:', userId, 'Removed', keysToDelete.length, 'entries');
  }

  // Clear all expired cache entries
  clearExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.loadTimestamps.forEach((timestamp, key) => {
      const age = now - timestamp;

      // Different TTL for different data types
      let maxAge = 10 * 60 * 1000; // 10 minutes default

      if (key.includes('profile')) {
        maxAge = 5 * 60 * 1000; // 5 minutes for profiles
      } else if (key.includes('assignments')) {
        maxAge = 10 * 60 * 1000; // 10 minutes for assignments
      } else if (key.includes('preload')) {
        maxAge = 30 * 60 * 1000; // 30 minutes for preloaded data
      }

      if (age > maxAge) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.loadedData.delete(key);
      this.loadTimestamps.delete(key);
      this.loadingPromises.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.log('🧹 [ProgressiveData] Cleared', expiredKeys.length, 'expired cache entries');
    }
  }

  // Get cache statistics for monitoring
  getCacheStats(): {
    totalEntries: number;
    loadingOperations: number;
    estimatedSize: string;
  } {
    const totalEntries = this.loadedData.size;
    const loadingOperations = this.loadingPromises.size;

    // Rough estimation of cache size
    let estimatedSize = 0;
    this.loadedData.forEach(value => {
      estimatedSize += JSON.stringify(value).length;
    });

    const sizeInMB = (estimatedSize / (1024 * 1024)).toFixed(2);

    return {
      totalEntries,
      loadingOperations,
      estimatedSize: `${sizeInMB} MB`,
    };
  }

  // Helper method for timeout protection
  private async loadWithTimeout<T>(loadFn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      loadFn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Loading timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  // Preload helper methods (simplified implementations)
  private async preloadEstates(): Promise<void> {
    // Implementation would load estate data
    console.log('🔮 [ProgressiveData] Preloading estates...');
  }

  private async preloadDivisions(): Promise<void> {
    console.log('🔮 [ProgressiveData] Preloading divisions...');
  }

  private async preloadHarvestData(): Promise<void> {
    console.log('🔮 [ProgressiveData] Preloading harvest data...');
  }

  private async preloadBlocks(): Promise<void> {
    console.log('🔮 [ProgressiveData] Preloading blocks...');
  }

  private async preloadHarvestInputTemplates(): Promise<void> {
    console.log('🔮 [ProgressiveData] Preloading harvest input templates...');
  }

  private async preloadGateCheckData(): Promise<void> {
    console.log('🔮 [ProgressiveData] Preloading gate check data...');
  }
}

// Singleton instance for the application
let progressiveDataService: ProgressiveDataService | null = null;

export const getProgressiveDataService = (client: ApolloClient<unknown>): ProgressiveDataService => {
  if (!progressiveDataService) {
    progressiveDataService = new ProgressiveDataService(client);
  }
  return progressiveDataService;
};

// Export for direct use in components

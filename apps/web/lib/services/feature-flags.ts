// Feature flags service for gradual rollout of performance optimizations
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  rolloutPercentage: number;
  description: string;
  userRoles?: string[];
  environments?: ('development' | 'staging' | 'production')[];
  lastUpdated: number;
}

export interface FeatureFlagConfig {
  FAST_LOGIN: FeatureFlag;
  PROGRESSIVE_LOADING: FeatureFlag;
  DEFERRED_WEBSOCKET: FeatureFlag;
  ENHANCED_CACHING: FeatureFlag;
  PERFORMANCE_MONITORING: FeatureFlag;
  PREDICTIVE_TOKEN_REFRESH: FeatureFlag;
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  private userContext: {
    userId?: string;
    userRole?: string;
    sessionId?: string;
    environment: string;
  } = {
      environment: process.env.NODE_ENV || 'development'
    };

  constructor() {
    this.initializeFlags();
    this.loadUserContext();
  }

  // Initialize default feature flags
  private initializeFlags(): void {
    const defaultFlags: FeatureFlagConfig = {
      FAST_LOGIN: {
        key: 'FAST_LOGIN',
        enabled: true,
        rolloutPercentage: 100, // Fully rolled out
        description: 'Use optimized fast login with minimal data fetching',
        lastUpdated: Date.now(),
      },
      PROGRESSIVE_LOADING: {
        key: 'PROGRESSIVE_LOADING',
        enabled: true,
        rolloutPercentage: 90, // 90% of users
        description: 'Load dashboard data progressively for faster initial load',
        lastUpdated: Date.now(),
      },
      DEFERRED_WEBSOCKET: {
        key: 'DEFERRED_WEBSOCKET',
        enabled: true,
        rolloutPercentage: 80, // 80% of users
        description: 'Defer WebSocket connection until needed',
        lastUpdated: Date.now(),
      },
      ENHANCED_CACHING: {
        key: 'ENHANCED_CACHING',
        enabled: true,
        rolloutPercentage: 100, // Fully rolled out
        description: 'Use enhanced caching with TTL policies',
        lastUpdated: Date.now(),
      },
      PERFORMANCE_MONITORING: {
        key: 'PERFORMANCE_MONITORING',
        enabled: true,
        rolloutPercentage: 100, // Fully rolled out
        description: 'Enable comprehensive performance monitoring',
        environments: ['development', 'staging'], // Only in dev/staging
        lastUpdated: Date.now(),
      },
      PREDICTIVE_TOKEN_REFRESH: {
        key: 'PREDICTIVE_TOKEN_REFRESH',
        enabled: true,
        rolloutPercentage: 70, // 70% of users
        description: 'Refresh tokens predictively before expiry',
        userRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER'], // Admin roles first
        lastUpdated: Date.now(),
      },
    };

    Object.values(defaultFlags).forEach(flag => {
      this.flags.set(flag.key, flag);
    });

    // Load flags from localStorage if available
    this.loadFlagsFromStorage();
    this.loadFlagsFromEnvironment();
  }

  // Load user context from various sources
  private loadUserContext(): void {
    if (typeof window === 'undefined') return;

    // Get user info from localStorage
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        this.userContext.userId = parsed.id;
        this.userContext.userRole = parsed.role;
      } catch (error) {
        console.warn('⚠️ [FeatureFlags] Failed to parse user info:', error);
      }
    }

    // Get session info
    const sessionId = sessionStorage.getItem('sessionId');
    if (sessionId) {
      this.userContext.sessionId = sessionId;
    }
  }

  // Load flags from localStorage
  private loadFlagsFromStorage(): void {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('featureFlags');
    if (stored) {
      try {
        const parsedFlags = JSON.parse(stored);
        Object.entries(parsedFlags).forEach(([key, flag]) => {
          // Only update if stored flag is newer
          const existingFlag = this.flags.get(key);
          const typedFlag = flag as FeatureFlag;
          if (!existingFlag || typedFlag.lastUpdated > existingFlag.lastUpdated) {
            this.flags.set(key, { ...existingFlag, ...typedFlag });
          }
        });
      } catch (error) {
        console.warn('⚠️ [FeatureFlags] Failed to load flags from storage:', error);
      }
    }
  }

  // Load flags from environment variables
  private loadFlagsFromEnvironment(): void {
    // Environment-based overrides
    const envFlags = {
      FAST_LOGIN: process.env.NEXT_PUBLIC_ENABLE_FAST_LOGIN !== 'false',
      PROGRESSIVE_LOADING: process.env.NEXT_PUBLIC_ENABLE_PROGRESSIVE_LOADING !== 'false',
      DEFERRED_WEBSOCKET: process.env.NEXT_PUBLIC_ENABLE_DEFERRED_WEBSOCKET !== 'false',
      ENHANCED_CACHING: process.env.NEXT_PUBLIC_ENABLE_ENHANCED_CACHING !== 'false',
      PERFORMANCE_MONITORING: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
      PREDICTIVE_TOKEN_REFRESH: process.env.NEXT_PUBLIC_ENABLE_PREDICTIVE_REFRESH === 'true',
    };

    Object.entries(envFlags).forEach(([key, enabled]) => {
      const flag = this.flags.get(key);
      if (flag) {
        flag.enabled = enabled;
        flag.lastUpdated = Date.now();
      }
    });
  }

  // Check if a feature flag is enabled for the current user
  isEnabled(flagKey: keyof FeatureFlagConfig): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      console.warn(`⚠️ [FeatureFlags] Flag '${flagKey}' not found`);
      return false;
    }

    // Environment check
    if (flag.environments && !flag.environments.includes(this.userContext.environment as any)) {
      return false;
    }

    // Role-based check
    if (flag.userRoles && flag.userRoles.length > 0) {
      if (!this.userContext.userRole || !flag.userRoles.includes(this.userContext.userRole)) {
        return false;
      }
    }

    // If explicitly enabled or disabled, respect that
    if (flag.enabled && flag.rolloutPercentage === 100) {
      return true;
    }
    if (!flag.enabled && flag.rolloutPercentage === 0) {
      return false;
    }

    // Rollout percentage check
    return this.isUserInRolloutPercentage(flag.rolloutPercentage);
  }

  // Check if user falls within rollout percentage
  private isUserInRolloutPercentage(percentage: number): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;

    // Generate consistent hash based on user context
    const hashInput = `${this.userContext.userId || ''}-${this.userContext.userRole || ''}-${this.userContext.sessionId || ''}`;
    const hash = this.simpleHash(hashInput);
    const userPercentage = (hash % 100) + 1; // 1-100

    return userPercentage <= percentage;
  }

  // Simple hash function for consistent user assignment
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Update a feature flag
  updateFlag(flagKey: keyof FeatureFlagConfig, updates: Partial<FeatureFlag>): void {
    const flag = this.flags.get(flagKey);
    if (flag) {
      Object.assign(flag, updates, { lastUpdated: Date.now() });
      this.saveFlagsToStorage();
    }
  }

  // Enable/disable a feature flag
  setEnabled(flagKey: keyof FeatureFlagConfig, enabled: boolean): void {
    this.updateFlag(flagKey, { enabled });
  }

  // Update rollout percentage
  setRolloutPercentage(flagKey: keyof FeatureFlagConfig, percentage: number): void {
    this.updateFlag(flagKey, { rolloutPercentage: Math.max(0, Math.min(100, percentage)) });
  }

  // Save flags to localStorage
  private saveFlagsToStorage(): void {
    if (typeof window === 'undefined') return;

    const flagsObject: Record<string, FeatureFlag> = {};
    this.flags.forEach((flag, key) => {
      flagsObject[key] = flag;
    });

    try {
      localStorage.setItem('featureFlags', JSON.stringify(flagsObject));
    } catch (error) {
      console.warn('⚠️ [FeatureFlags] Failed to save flags to storage:', error);
    }
  }

  // Get all flags (for debugging)
  getAllFlags(): Record<string, FeatureFlag & { enabledForUser: boolean }> {
    const result: Record<string, FeatureFlag & { enabledForUser: boolean }> = {};

    this.flags.forEach((flag, key) => {
      result[key] = {
        ...flag,
        enabledForUser: this.isEnabled(key as keyof FeatureFlagConfig)
      };
    });

    return result;
  }

  // Get flags that are enabled for current user
  getEnabledFlags(): string[] {
    return Array.from(this.flags.keys()).filter(key =>
      this.isEnabled(key as keyof FeatureFlagConfig)
    );
  }

  // Reset to defaults
  resetToDefaults(): void {
    this.flags.clear();
    this.initializeFlags();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('featureFlags');
    }
  }

  // Export flag configuration (for debugging)
  exportConfig(): string {
    const config = this.getAllFlags();
    return JSON.stringify(config, null, 2);
  }

  // Import flag configuration (for testing)
  importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      Object.entries(config).forEach(([key, flag]: [string, any]) => {
        if (this.flags.has(key)) {
          this.updateFlag(key as keyof FeatureFlagConfig, flag);
        }
      });
    } catch (error) {
      console.error('❌ [FeatureFlags] Failed to import configuration:', error);
    }
  }
}

// Singleton instance
let featureFlagService: FeatureFlagService | null = null;

export const getFeatureFlagService = (): FeatureFlagService => {
  if (!featureFlagService) {
    featureFlagService = new FeatureFlagService();
  }
  return featureFlagService;
};

// Convenience functions for common checks
export const isFastLoginEnabled = (): boolean => {
  return getFeatureFlagService().isEnabled('FAST_LOGIN');
};

export const isProgressiveLoadingEnabled = (): boolean => {
  return getFeatureFlagService().isEnabled('PROGRESSIVE_LOADING');
};

export const isDeferredWebSocketEnabled = (): boolean => {
  return getFeatureFlagService().isEnabled('DEFERRED_WEBSOCKET');
};

export const isEnhancedCachingEnabled = (): boolean => {
  return getFeatureFlagService().isEnabled('ENHANCED_CACHING');
};

export const isPerformanceMonitoringEnabled = (): boolean => {
  return getFeatureFlagService().isEnabled('PERFORMANCE_MONITORING');
};

export const isPredictiveTokenRefreshEnabled = (): boolean => {
  return getFeatureFlagService().isEnabled('PREDICTIVE_TOKEN_REFRESH');
};

// Export types and service
export { FeatureFlagService };
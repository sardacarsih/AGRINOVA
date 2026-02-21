'use client';

// Data Consistency and Cache Management for Pure WebSocket Implementation
// This handles data synchronization, conflict resolution, and cache management

export interface CacheEntry<T = any> {
  data: T;
  timestamp: Date;
  version: number;
  checksum?: string;
  expiryTime?: Date;
  source: 'websocket' | 'api' | 'cache';
  lastModified?: Date;
}

export interface ConflictResolutionStrategy {
  strategy: 'timestamp' | 'version' | 'user_choice' | 'merge';
  customResolver?: (local: any, remote: any) => any;
}

export interface DataConsistencyOptions {
  enableVersioning: boolean;
  enableChecksums: boolean;
  conflictResolution: ConflictResolutionStrategy;
  cacheExpiration: number; // milliseconds
  maxCacheSize: number; // number of entries
  enableOptimisticUpdates: boolean;
  syncRetries: number;
}

class DataConsistencyManager {
  private cache: Map<string, CacheEntry> = new Map();
  private pendingUpdates: Map<string, any> = new Map();
  private conflictQueue: Array<{ key: string; local: any; remote: any; timestamp: Date }> = [];
  private options: DataConsistencyOptions;
  private syncListeners: Set<(event: SyncEvent) => void> = new Set();

  constructor(options: Partial<DataConsistencyOptions> = {}) {
    this.options = {
      enableVersioning: true,
      enableChecksums: false,
      conflictResolution: { strategy: 'timestamp' },
      cacheExpiration: 300000, // 5 minutes
      maxCacheSize: 1000,
      enableOptimisticUpdates: true,
      syncRetries: 3,
      ...options
    };

    // Start cleanup interval
    setInterval(() => this.cleanupExpiredEntries(), 60000); // Every minute
  }

  // Cache Management
  set<T>(key: string, data: T, options?: {
    version?: number;
    source?: 'websocket' | 'api' | 'cache';
    expiryTime?: Date;
    checksum?: string;
  }): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      version: options?.version || this.getNextVersion(key),
      source: options?.source || 'api',
      expiryTime: options?.expiryTime || new Date(Date.now() + this.options.cacheExpiration),
      checksum: options?.checksum || (this.options.enableChecksums ? this.generateChecksum(data) : undefined),
      lastModified: new Date(),
    };

    // Check for conflicts before setting
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      if (this.hasConflict(existing, entry)) {
        this.handleConflict(key, existing, entry);
        return;
      }
    }

    this.cache.set(key, entry);
    this.enforceMaxCacheSize();
    this.notifySyncListeners({ type: 'cache_updated', key, data: entry });

    console.log(`📦 Data Consistency: Cached data for ${key} (v${entry.version}, source: ${entry.source})`);
  }

  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;

    // Check expiration
    if (entry.expiryTime && entry.expiryTime < new Date()) {
      this.cache.delete(key);
      console.log(`🗑️ Data Consistency: Expired cache entry removed for ${key}`);
      return null;
    }

    // Validate checksum if enabled
    if (this.options.enableChecksums && entry.checksum) {
      const currentChecksum = this.generateChecksum(entry.data);
      if (currentChecksum !== entry.checksum) {
        console.warn(`⚠️ Data Consistency: Checksum mismatch for ${key}, data may be corrupted`);
        this.cache.delete(key);
        return null;
      }
    }

    return entry as CacheEntry<T>;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check expiration
    if (entry.expiryTime && entry.expiryTime < new Date()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.notifySyncListeners({ type: 'cache_deleted', key });
      console.log(`🗑️ Data Consistency: Cache entry deleted for ${key}`);
    }
    return deleted;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.pendingUpdates.clear();
    this.notifySyncListeners({ type: 'cache_cleared' });
    console.log(`🧹 Data Consistency: Cache cleared (${size} entries removed)`);
  }

  // Optimistic Updates
  setOptimistic<T>(key: string, data: T, originalValue?: T): void {
    if (!this.options.enableOptimisticUpdates) return;

    // Store original value for rollback
    if (originalValue && !this.pendingUpdates.has(key)) {
      this.pendingUpdates.set(key, originalValue);
    }

    this.set(key, data, { source: 'cache' });
    console.log(`⚡ Data Consistency: Optimistic update applied for ${key}`);
  }

  confirmOptimistic(key: string): void {
    this.pendingUpdates.delete(key);
    const entry = this.cache.get(key);
    if (entry) {
      entry.source = 'websocket';
      this.cache.set(key, entry);
    }
    console.log(`✅ Data Consistency: Optimistic update confirmed for ${key}`);
  }

  rollbackOptimistic(key: string): void {
    const originalValue = this.pendingUpdates.get(key);
    if (originalValue) {
      this.set(key, originalValue, { source: 'api' });
      this.pendingUpdates.delete(key);
      console.log(`↩️ Data Consistency: Optimistic update rolled back for ${key}`);
    }
  }

  // Conflict Resolution
  private hasConflict(existing: CacheEntry, incoming: CacheEntry): boolean {
    if (!this.options.enableVersioning) return false;

    // No conflict if versions are sequential
    if (incoming.version > existing.version) return false;

    // Conflict if same version but different data
    if (incoming.version === existing.version) {
      return JSON.stringify(existing.data) !== JSON.stringify(incoming.data);
    }

    // Conflict if incoming version is older
    return incoming.version < existing.version;
  }

  private handleConflict(key: string, local: CacheEntry, remote: CacheEntry): void {
    const { strategy, customResolver } = this.options.conflictResolution;

    console.warn(`⚔️ Data Consistency: Conflict detected for ${key}`);
    console.warn('Local:', { version: local.version, timestamp: local.timestamp });
    console.warn('Remote:', { version: remote.version, timestamp: remote.timestamp });

    let resolvedData: any;

    switch (strategy) {
      case 'timestamp':
        resolvedData = remote.timestamp > local.timestamp ? remote : local;
        break;

      case 'version':
        resolvedData = remote.version > local.version ? remote : local;
        break;

      case 'merge':
        resolvedData = this.mergeData(local.data, remote.data);
        break;

      case 'user_choice':
        // Queue for user resolution
        this.conflictQueue.push({
          key,
          local: local.data,
          remote: remote.data,
          timestamp: new Date()
        });
        this.notifySyncListeners({
          type: 'conflict_detected',
          key,
          local: local.data,
          remote: remote.data
        });
        return;

      default:
        if (customResolver) {
          resolvedData = customResolver(local.data, remote.data);
        } else {
          resolvedData = remote; // Default to remote wins
        }
    }

    this.cache.set(key, {
      ...resolvedData,
      version: Math.max(local.version, remote.version) + 1,
      timestamp: new Date(),
      source: 'websocket',
      lastModified: new Date(),
    });

    this.notifySyncListeners({
      type: 'conflict_resolved',
      key,
      resolution: strategy,
      data: resolvedData
    });

    console.log(`✅ Data Consistency: Conflict resolved for ${key} using ${strategy} strategy`);
  }

  // Data Merging (simple object merge)
  private mergeData(local: any, remote: any): any {
    if (typeof local !== 'object' || typeof remote !== 'object') {
      return remote; // Fall back to remote for non-objects
    }

    const merged = { ...local };

    for (const key in remote) {
      if (remote.hasOwnProperty(key)) {
        if (typeof remote[key] === 'object' && typeof local[key] === 'object') {
          merged[key] = this.mergeData(local[key], remote[key]);
        } else {
          // Remote wins for individual properties
          merged[key] = remote[key];
        }
      }
    }

    return merged;
  }

  // Utility Methods
  private getNextVersion(key: string): number {
    const existing = this.cache.get(key);
    return existing ? existing.version + 1 : 1;
  }

  private generateChecksum(data: any): string {
    // Simple checksum - in production, use a proper hashing algorithm
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private cleanupExpiredEntries(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiryTime && entry.expiryTime < now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Data Consistency: Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  private enforceMaxCacheSize(): void {
    if (this.cache.size <= this.options.maxCacheSize) return;

    // Remove oldest entries
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());

    const toRemove = entries.slice(0, this.cache.size - this.options.maxCacheSize);
    
    toRemove.forEach(([key]) => {
      this.cache.delete(key);
    });

    console.log(`🧹 Data Consistency: Removed ${toRemove.length} entries to enforce max cache size`);
  }

  // Event Management
  onSync(listener: (event: SyncEvent) => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  private notifySyncListeners(event: SyncEvent): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Data Consistency: Sync listener error:', error);
      }
    });
  }

  // Public API for monitoring
  getCacheStats(): CacheStats {
    const now = new Date();
    let expiredCount = 0;
    let optimisticCount = 0;
    const sourceStats = { websocket: 0, api: 0, cache: 0 };

    for (const entry of this.cache.values()) {
      if (entry.expiryTime && entry.expiryTime < now) {
        expiredCount++;
      }
      sourceStats[entry.source]++;
    }

    optimisticCount = this.pendingUpdates.size;

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      optimisticUpdates: optimisticCount,
      pendingConflicts: this.conflictQueue.length,
      sourceBreakdown: sourceStats,
      cacheHitRate: this.calculateCacheHitRate(),
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  private calculateCacheHitRate(): number {
    // This would need to be implemented with hit/miss tracking
    // For now, return a placeholder
    return 85.5;
  }

  private estimateMemoryUsage(): number {
    // Rough estimate of memory usage in KB
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // UTF-16 characters
      size += JSON.stringify(entry).length * 2;
    }
    return Math.round(size / 1024);
  }

  getConflictQueue(): Array<{ key: string; local: any; remote: any; timestamp: Date }> {
    return [...this.conflictQueue];
  }

  resolveConflict(key: string, resolution: 'local' | 'remote' | 'custom', customData?: any): boolean {
    const conflictIndex = this.conflictQueue.findIndex(c => c.key === key);
    if (conflictIndex === -1) return false;

    const conflict = this.conflictQueue[conflictIndex];
    let resolvedData: any;

    switch (resolution) {
      case 'local':
        resolvedData = conflict.local;
        break;
      case 'remote':
        resolvedData = conflict.remote;
        break;
      case 'custom':
        resolvedData = customData;
        break;
      default:
        return false;
    }

    this.set(key, resolvedData, { source: 'websocket' });
    this.conflictQueue.splice(conflictIndex, 1);

    console.log(`✅ Data Consistency: User resolved conflict for ${key} choosing ${resolution}`);
    return true;
  }
}

// Type Definitions
export interface SyncEvent {
  type: 'cache_updated' | 'cache_deleted' | 'cache_cleared' | 'conflict_detected' | 'conflict_resolved';
  key?: string;
  data?: any;
  local?: any;
  remote?: any;
  resolution?: string;
}

export interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  optimisticUpdates: number;
  pendingConflicts: number;
  sourceBreakdown: { websocket: number; api: number; cache: number };
  cacheHitRate: number;
  memoryUsage: number; // in KB
}

// Singleton instance
export const dataConsistencyManager = new DataConsistencyManager({
  enableVersioning: true,
  enableChecksums: false, // Disable for performance, enable in production if needed
  conflictResolution: { strategy: 'timestamp' },
  cacheExpiration: 300000, // 5 minutes
  maxCacheSize: 1000,
  enableOptimisticUpdates: true,
  syncRetries: 3,
});

export default DataConsistencyManager;
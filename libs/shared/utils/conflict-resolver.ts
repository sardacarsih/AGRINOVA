import { ConflictResolutionStrategy, ConflictRecord } from '../constants/sync-constants';
import { BaseEntity } from '../types/base-entity.interface';

export class ConflictResolutionError extends Error {
  constructor(
    message: string,
    public readonly localData: any,
    public readonly serverData: any,
    public readonly conflictFields: string[]
  ) {
    super(message);
    this.name = 'ConflictResolutionError';
  }
}

export class ConflictResolver {
  /**
   * Resolve conflicts between local and server data
   */
  async resolve<T extends BaseEntity>(
    local: T,
    remote: T,
    strategy: ConflictResolutionStrategy,
    metadata?: {
      userId?: string;
      deviceId?: string;
      fieldPriorities?: Record<string, 'LOCAL' | 'REMOTE'>;
    }
  ): Promise<T> {
    const conflictFields = this.identifyConflictFields(local, remote);
    
    if (conflictFields.length === 0) {
      return remote; // No conflicts, use server data
    }

    switch (strategy) {
      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        return this.lastWriteWins(local, remote);
      
      case ConflictResolutionStrategy.FIRST_WRITE_WINS:
        return this.firstWriteWins(local, remote);
      
      case ConflictResolutionStrategy.SERVER_WINS:
        return remote;
      
      case ConflictResolutionStrategy.CLIENT_WINS:
        return { ...remote, ...local, version: remote.version + 1 };
      
      case ConflictResolutionStrategy.FIELD_LEVEL_MERGE:
        return this.fieldLevelMerge(local, remote, metadata?.fieldPriorities);
      
      case ConflictResolutionStrategy.MANUAL_RESOLUTION:
        throw new ConflictResolutionError(
          'Manual resolution required',
          local,
          remote,
          conflictFields
        );
      
      default:
        throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
    }
  }

  /**
   * Identify fields that have conflicts between local and remote data
   */
  private identifyConflictFields<T>(local: T, remote: T): string[] {
    const conflictFields: string[] = [];
    const excludeFields = ['id', 'version', 'syncStatus', 'syncedAt', 'updatedAt'];

    for (const key in local) {
      if (excludeFields.includes(key as string)) continue;

      const localValue = local[key];
      const remoteValue = remote[key];

      if (!this.isEqual(localValue, remoteValue)) {
        conflictFields.push(key as string);
      }
    }

    return conflictFields;
  }

  /**
   * Resolve using last write wins strategy
   */
  private lastWriteWins<T extends BaseEntity>(local: T, remote: T): T {
    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remote.updatedAt).getTime();
    
    return localTime > remoteTime ? 
      { ...remote, ...local, version: remote.version + 1 } : 
      remote;
  }

  /**
   * Resolve using first write wins strategy
   */
  private firstWriteWins<T extends BaseEntity>(local: T, remote: T): T {
    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remote.updatedAt).getTime();
    
    return localTime < remoteTime ? 
      { ...remote, ...local, version: remote.version + 1 } : 
      remote;
  }

  /**
   * Resolve using field-level merge strategy
   */
  private fieldLevelMerge<T extends BaseEntity>(
    local: T,
    remote: T,
    fieldPriorities?: Record<string, 'LOCAL' | 'REMOTE'>
  ): T {
    const merged = { ...remote };

    for (const key in local) {
      if (['id', 'version', 'syncStatus', 'syncedAt'].includes(key as string)) {
        continue; // Skip metadata fields
      }

      const priority = fieldPriorities?.[key as string];
      
      if (priority === 'LOCAL') {
        (merged as any)[key] = local[key];
      } else if (priority === 'REMOTE') {
        (merged as any)[key] = remote[key];
      } else {
        // Default strategy for field-level: prefer newer values
        const localValue = local[key];
        const remoteValue = remote[key];
        
        if (localValue !== remoteValue) {
          // For harvest-specific logic, prefer local data for certain fields
          if (this.isHarvestDataField(key as string)) {
            (merged as any)[key] = local[key];
          }
          // For approval data, prefer remote (server) data
          else if (this.isApprovalDataField(key as string)) {
            (merged as any)[key] = remote[key];
          }
          // Default: use server data
          else {
            (merged as any)[key] = remote[key];
          }
        }
      }
    }

    // Always increment version for merged data
    merged.version = remote.version + 1;
    merged.updatedAt = new Date();

    return merged;
  }

  /**
   * Check if field contains harvest-specific data that should prefer local values
   */
  private isHarvestDataField(fieldName: string): boolean {
    const harvestFields = [
      'totalTbs',
      'totalWeight',
      'harvestDate',
      'notes',
      'coordinates'
    ];
    return harvestFields.includes(fieldName);
  }

  /**
   * Check if field contains approval data that should prefer server values
   */
  private isApprovalDataField(fieldName: string): boolean {
    const approvalFields = [
      'status',
      'approvedBy',
      'approvalDate',
      'approvalNotes',
      'rejectionReason'
    ];
    return approvalFields.includes(fieldName);
  }

  /**
   * Deep equality check for conflict detection
   */
  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        if (!keysB.includes(key) || !this.isEqual(a[key], b[key])) {
          return false;
        }
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Create conflict record for manual resolution
   */
  createConflictRecord<T extends BaseEntity>(
    entityType: string,
    localData: T,
    serverData: T,
    strategy: ConflictResolutionStrategy
  ): ConflictRecord {
    return {
      entityType,
      entityId: localData.id,
      localVersion: localData.version,
      serverVersion: serverData.version,
      localData,
      serverData,
      conflictFields: this.identifyConflictFields(localData, serverData),
      strategy
    };
  }

  /**
   * Validate resolved data integrity
   */
  validateResolvedData<T extends BaseEntity>(resolved: T, original: T): boolean {
    // Basic validation rules
    if (!resolved.id || resolved.id !== original.id) {
      return false;
    }

    if (resolved.version <= original.version) {
      return false;
    }

    // Add domain-specific validations here
    return true;
  }
}
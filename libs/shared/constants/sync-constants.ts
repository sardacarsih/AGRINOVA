export enum SyncStatus {
  PENDING = 'PENDING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  CONFLICT = 'CONFLICT'
}

export enum ConflictResolutionStrategy {
  LAST_WRITE_WINS = 'last_write_wins',
  FIRST_WRITE_WINS = 'first_write_wins',
  MANUAL_RESOLUTION = 'manual_resolution',
  FIELD_LEVEL_MERGE = 'field_level_merge',
  SERVER_WINS = 'server_wins',
  CLIENT_WINS = 'client_wins'
}

export enum SyncOperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

export interface SyncMetadata {
  lastSyncTimestamp: Date;
  deviceId: string;
  appVersion: string;
  userId: string;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  conflictCount: number;
}

export interface ConflictRecord {
  entityType: string;
  entityId: string;
  localVersion: number;
  serverVersion: number;
  localData: any;
  serverData: any;
  conflictFields: string[];
  strategy: ConflictResolutionStrategy;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export const SYNC_BATCH_SIZE = 50;
export const SYNC_TIMEOUT_MS = 30000; // 30 seconds
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 2000; // 2 seconds

export const SYNC_PRIORITIES = {
  HIGH: ['Panen', 'GateCheck', 'User'],
  MEDIUM: ['Employee', 'Block'],
  LOW: ['Company', 'Estate', 'Divisi']
} as const;
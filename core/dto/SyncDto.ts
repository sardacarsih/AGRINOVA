export interface SyncQueueItem {
  id: string;
  tableName: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  data?: any;
  createdAt: string;
  retryCount: number;
}

export interface SyncRequest {
  items: SyncQueueItem[];
  lastSyncTime?: string;
}

export interface SyncResponse {
  success: boolean;
  processedItems: string[];
  failedItems: SyncFailedItem[];
  serverData?: SyncServerData;
  newSyncTime: string;
}

export interface SyncFailedItem {
  id: string;
  error: string;
  retryable: boolean;
}

export interface SyncServerData {
  users?: any[];
  companies?: any[];
  estates?: any[];
  divisi?: any[];
  blok?: any[];
  karyawan?: any[];
  panen?: any[];
  approvals?: any[];
  gateChecks?: any[];
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

export const SyncActions = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE'
} as const;
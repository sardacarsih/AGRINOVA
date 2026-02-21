'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket/socket-provider';
// Smart polling replaced with pure WebSocket implementation
import { usePerformanceMonitoring, withPerformanceMonitoring } from '@/lib/monitoring/dashboard-performance';
import { useDashboardUpdates } from './use-dashboard-updates';

export type UserRole = 'company_admin' | 'area_manager' | 'manager' | 'asisten' | 'mandor' | 'satpam';

interface RoleDashboardConfig {
  role: UserRole;
  pollingInterval?: number;
  websocketChannels: string[];
  enableRealTimeUpdates?: boolean;
  maxRetries?: number;
  performanceLogging?: boolean;
}

interface DashboardState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdate: Date | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

interface RoleDashboardReturn extends DashboardState {
  // Control methods
  refresh: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  
  // Performance methods
  getPerformanceMetrics: () => any;
  generatePerformanceReport: () => string;
  
  // WebSocket status
  isWebSocketConnected: boolean;
  websocketConnectionState: string;
  
  // Smart polling controls
  startPolling: () => void;
  stopPolling: () => void;
  resetPolling: () => void;
  
  // Utility functions for API calls with performance monitoring
  withPerformanceTracking: <T>(apiCall: () => Promise<T>, estimatedDataSize?: number) => Promise<T>;
}

const getRoleSpecificChannels = (role: UserRole): string[] => {
  const commonChannels = ['WEB_DASHBOARD'];
  
  const roleChannels: Record<UserRole, string[]> = {
    company_admin: [...commonChannels, 'COMPANY_ADMIN', 'COMPANY_MANAGEMENT'],
    area_manager: [...commonChannels, 'AREA_MANAGER', 'MULTI_COMPANY', 'REPORTING'],
    manager: [...commonChannels, 'MANAGER', 'ESTATE_MANAGEMENT'],
    asisten: [...commonChannels, 'ASISTEN', 'APPROVAL_WORKFLOW', 'PANEN_APPROVAL'],
    mandor: [...commonChannels, 'MANDOR', 'PANEN_INPUT'],
    satpam: [...commonChannels, 'SATPAM', 'GATE_CHECK', 'TRUCK_MONITORING'],
  };
  
  return roleChannels[role] || commonChannels;
};

const getRolePollingInterval = (role: UserRole): number => {
  // Different roles have different data freshness requirements
  const intervals: Record<UserRole, number> = {
    company_admin: 120000, // 2 minutes - master data changes less frequently
    area_manager: 90000,   // 1.5 minutes - strategic overview
    manager: 60000,        // 1 minute - operational oversight
    asisten: 45000,        // 45 seconds - approval workflow needs quick updates
    mandor: 60000,         // 1 minute - input status tracking
    satpam: 30000,         // 30 seconds - real-time gate monitoring
  };
  
  return intervals[role] || 60000;
};

export function useRoleDashboardPerformance(
  dataLoader: () => Promise<void>,
  config: RoleDashboardConfig
): RoleDashboardReturn {
  
  const {
    role,
    pollingInterval = getRolePollingInterval(role),
    websocketChannels = getRoleSpecificChannels(role),
    enableRealTimeUpdates = true,
    maxRetries = 3,
    performanceLogging = true,
  } = config;

  // State management
  const [state, setState] = useState<DashboardState>({
    loading: true,
    refreshing: false,
    error: null,
    lastUpdate: null,
    connectionStatus: 'disconnected',
  });

  // WebSocket integration
  const { isConnected, connectionState } = useSocket();
  
  // Performance monitoring
  const { recordWebSocketEvent, getMetrics, generateReport } = usePerformanceMonitoring();

  // Enhanced data loader with error handling and performance tracking
  const enhancedDataLoader = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      if (performanceLogging) {
        console.log(`[${role.toUpperCase()}] Loading dashboard data...`);
      }
      
      await dataLoader();
      
      setState(prev => ({
        ...prev,
        loading: false,
        lastUpdate: new Date(),
        connectionStatus: isConnected ? 'connected' : 'disconnected',
      }));
      
      if (performanceLogging) {
        console.log(`[${role.toUpperCase()}] Dashboard data loaded successfully`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        connectionStatus: 'disconnected',
      }));
      
      console.error(`[${role.toUpperCase()}] Dashboard loading error:`, error);
      
      if (performanceLogging) {
        console.error(`[${role.toUpperCase()}] Performance impact: Error in data loading`);
      }
    }
  }, [dataLoader, role, isConnected, performanceLogging]);

  // WebSocket-only implementation - smart polling removed
  const webSocketOnlyRefresh = useCallback(async () => {
    try {
      await enhancedDataLoader();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `WebSocket refresh error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        connectionStatus: 'reconnecting',
      }));
      
      if (performanceLogging) {
        console.error(`[${role.toUpperCase()}] WebSocket refresh error:`, error);
      }
    }
  }, [enhancedDataLoader, role, performanceLogging]);

  // WebSocket real-time updates handler
  const handleRealTimeUpdate = useCallback((update: any) => {
    if (performanceLogging) {
      console.log(`[${role.toUpperCase()}] Real-time update received:`, update.type);
    }
    
    recordWebSocketEvent();
    
    // Role-specific update handling
    if (update.type === `${role}:data_update` || 
        update.type === 'dashboard:refresh' ||
        update.type === `${role}:refresh`) {
      // Trigger optimized refresh for role-specific updates
      enhancedDataLoader();
    } else if (update.type.startsWith('system:')) {
      // System-wide updates might need partial refresh
      setState(prev => ({
        ...prev,
        lastUpdate: new Date(),
        connectionStatus: 'connected',
      }));
    }
  }, [role, recordWebSocketEvent, enhancedDataLoader, performanceLogging]);

  // Set up real-time updates if enabled
  useDashboardUpdates({
    onUpdate: enableRealTimeUpdates ? handleRealTimeUpdate : undefined,
    channels: enableRealTimeUpdates ? websocketChannels : [],
    enableNotifications: true,
  });

  // Manual refresh function - WebSocket only
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, refreshing: true }));
    try {
      await webSocketOnlyRefresh();
    } finally {
      setState(prev => ({ ...prev, refreshing: false }));
    }
  }, [webSocketOnlyRefresh]);

  // Force refresh function (bypasses caching) - WebSocket only
  const forceRefresh = useCallback(async () => {
    setState(prev => ({ ...prev, refreshing: true }));
    try {
      await enhancedDataLoader();
    } finally {
      setState(prev => ({ ...prev, refreshing: false }));
    }
  }, [enhancedDataLoader]);

  // Performance-tracked API call wrapper
  const withPerformanceTracking = useCallback(<T>(
    apiCall: () => Promise<T>,
    estimatedDataSize: number = 0
  ): Promise<T> => {
    return withPerformanceMonitoring(apiCall, estimatedDataSize);
  }, []);

  // Enhanced performance metrics with role-specific context
  const getPerformanceMetrics = useCallback(() => {
    const baseMetrics = getMetrics();
    return {
      ...baseMetrics,
      role,
      pollingInterval,
      websocketChannels: websocketChannels.length,
      realTimeEnabled: enableRealTimeUpdates,
      lastUpdate: state.lastUpdate,
      connectionStatus: state.connectionStatus,
    };
  }, [getMetrics, role, pollingInterval, websocketChannels.length, enableRealTimeUpdates, state.lastUpdate, state.connectionStatus]);

  // Enhanced performance report with role context
  const generatePerformanceReport = useCallback(() => {
    const baseReport = generateReport();
    const roleMetrics = getPerformanceMetrics();
    
    return `${baseReport}

Role-Specific Metrics:
======================
Role: ${role.toUpperCase()}
Polling Interval: ${pollingInterval / 1000}s
WebSocket Channels: ${websocketChannels.join(', ')}
Real-time Updates: ${enableRealTimeUpdates ? 'Enabled' : 'Disabled'}
Connection Status: ${state.connectionStatus}
Last Update: ${state.lastUpdate?.toLocaleTimeString() || 'Never'}
Error State: ${state.error || 'None'}

Performance Recommendations:
- ${roleMetrics.efficiency > 30 ? '✅' : '⚠️'} Role-optimized polling interval
- ${roleMetrics.websocketEvents > 0 ? '✅' : '⚠️'} Real-time event processing
- ${state.connectionStatus === 'connected' ? '✅' : '❌'} WebSocket connectivity
    `;
  }, [generateReport, getPerformanceMetrics, role, pollingInterval, websocketChannels, enableRealTimeUpdates, state]);

  // Connection status tracking
  useEffect(() => {
    setState(prev => ({
      ...prev,
      connectionStatus: isConnected ? 'connected' : 'disconnected',
    }));
  }, [isConnected]);

  // Initial load - WebSocket only (no polling)
  useEffect(() => {
    if (performanceLogging) {
      console.log(`[${role.toUpperCase()}] Initializing WebSocket dashboard monitoring`);
    }
    
    // Initial data load via WebSocket
    webSocketOnlyRefresh();
    
    // No cleanup needed - WebSocket provider handles connection lifecycle
  }, [webSocketOnlyRefresh, role, performanceLogging]);

  return {
    ...state,
    refresh,
    forceRefresh,
    getPerformanceMetrics,
    generatePerformanceReport,
    isWebSocketConnected: isConnected,
    websocketConnectionState: connectionState,
    startPolling: () => {}, // No-op - WebSocket handles all updates
    stopPolling: () => {}, // No-op - WebSocket handles all updates  
    resetPolling: webSocketOnlyRefresh, // Maps to WebSocket refresh
    withPerformanceTracking,
  };
}
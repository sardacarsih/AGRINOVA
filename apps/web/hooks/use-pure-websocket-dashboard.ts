'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { usePureWebSocket } from '@/lib/socket/pure-websocket-provider';
import { usePerformanceMonitoring, withPerformanceMonitoring } from '@/lib/monitoring/dashboard-performance';

export type UserRole = 'company_admin' | 'area_manager' | 'manager' | 'asisten' | 'mandor' | 'satpam' | 'super_admin';

interface PureWebSocketDashboardConfig {
  role: UserRole;
  channels: string[];
  enableInitialLoad?: boolean;
  enableCaching?: boolean;
  enableNotifications?: boolean;
  autoReconnect?: boolean;
  performanceLogging?: boolean;
}

interface DashboardState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdate: Date | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' | 'failed';
  dataVersion: number;
  cacheHits: number;
}

interface PureWebSocketDashboardReturn extends DashboardState {
  // Manual control methods
  refresh: () => Promise<void>; // Alias for manualRefresh
  manualRefresh: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  
  // Connection management
  reconnect: () => void;
  healthCheck: () => Promise<boolean>;
  
  // Data management
  getCachedData: (key: string) => any;
  invalidateCache: () => void;
  
  // Performance methods
  getPerformanceMetrics: () => any;
  generatePerformanceReport: () => string;
  
  // WebSocket status
  isWebSocketConnected: boolean;
  connectionQuality: string;
  activeChannels: string[];
  messagesReceived: number;
  
  // Event management
  onDataUpdate: (callback: (data: any) => void) => () => void;
  pushUpdate: (type: string, data: any) => void;
  
  // Utility functions for API calls with performance monitoring
  withPerformanceTracking: <T>(apiCall: () => Promise<T>, estimatedDataSize?: number) => Promise<T>;
}

const getRoleSpecificChannels = (role: UserRole): string[] => {
  const commonChannels = ['WEB_DASHBOARD'];
  
  const roleChannels: Record<UserRole, string[]> = {
    super_admin: [...commonChannels, 'SUPER_ADMIN', 'SYSTEM_MONITORING', 'ALL_COMPANIES'],
    company_admin: [...commonChannels, 'COMPANY_ADMIN', 'COMPANY_MANAGEMENT', 'EMPLOYEE_MANAGEMENT'],
    area_manager: [...commonChannels, 'AREA_MANAGER', 'MULTI_COMPANY', 'REPORTING', 'CROSS_ESTATE'],
    manager: [...commonChannels, 'MANAGER', 'ESTATE_MANAGEMENT', 'TEAM_MONITORING'],
    asisten: [...commonChannels, 'ASISTEN', 'APPROVAL_WORKFLOW', 'PANEN_APPROVAL', 'HARVEST_MANAGEMENT'],
    mandor: [...commonChannels, 'MANDOR', 'PANEN_INPUT', 'HARVEST_TRACKING'],
    satpam: [...commonChannels, 'SATPAM', 'GATE_CHECK', 'TRUCK_MONITORING', 'SECURITY_ALERTS'],
  };
  
  return roleChannels[role] || commonChannels;
};

export function usePureWebSocketDashboard(
  initialDataLoader: () => Promise<void>,
  config: PureWebSocketDashboardConfig
): PureWebSocketDashboardReturn {
  
  const {
    role,
    channels = getRoleSpecificChannels(role),
    enableInitialLoad = true,
    enableCaching = true,
    enableNotifications = true,
    autoReconnect = true,
    performanceLogging = true,
  } = config;

  // State management
  const [state, setState] = useState<DashboardState>({
    loading: true,
    refreshing: false,
    error: null,
    lastUpdate: null,
    connectionStatus: 'disconnected',
    dataVersion: 0,
    cacheHits: 0,
  });

  // WebSocket integration
  const { 
    isConnected,
    connectionState,
    connectionQuality,
    socket,
    subscribe,
    unsubscribe,
    activeSubscriptions,
    getCachedData: getSocketCachedData,
    clearCache: clearSocketCache,
    forceReconnect,
    healthCheck,
    getConnectionStats
  } = usePureWebSocket();
  
  // Performance monitoring
  const { recordWebSocketEvent, getMetrics, generateReport } = usePerformanceMonitoring();

  // Refs for cleanup and state management
  const dataUpdateCallbacks = useRef<Set<(data: any) => void>>(new Set());
  const lastDataVersion = useRef(0);
  const messagesReceived = useRef(0);

  // Enhanced data loader with WebSocket-first approach - Fixed circular dependency
  const enhancedDataLoader = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setState(prev => ({ ...prev, loading: !prev.lastUpdate, refreshing: !!prev.lastUpdate, error: null }));
      
      if (performanceLogging) {
        console.log(`🚀 [${role.toUpperCase()}] Pure WebSocket: Loading dashboard data... (Force: ${forceRefresh})`);
      }
      
      // Check cache first if not forcing refresh
      if (!forceRefresh && enableCaching) {
        const cachedData = getSocketCachedData(`dashboard:${role}`);
        if (cachedData && cachedData.timestamp && 
            (Date.now() - new Date(cachedData.timestamp).getTime()) < 30000) { // 30 second cache
          
          setState(prev => ({
            ...prev,
            loading: false,
            refreshing: false,
            lastUpdate: new Date(cachedData.timestamp),
            connectionStatus: isConnected ? 'connected' : 'disconnected',
            cacheHits: prev.cacheHits + 1,
          }));
          
          if (performanceLogging) {
            console.log(`💾 [${role.toUpperCase()}] Pure WebSocket: Using cached data`);
          }
          return;
        }
      }
      
      // Load fresh data
      await withPerformanceMonitoring(initialDataLoader, 0);
      
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        lastUpdate: new Date(),
        connectionStatus: isConnected ? 'connected' : 'disconnected',
        dataVersion: prev.dataVersion + 1,
      }));
      
      if (performanceLogging) {
        console.log(`✅ [${role.toUpperCase()}] Pure WebSocket: Dashboard data loaded successfully`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
      
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: errorMessage,
        connectionStatus: 'failed',
      }));
      
      console.error(`❌ [${role.toUpperCase()}] Pure WebSocket: Dashboard loading error:`, error);
      
      if (performanceLogging) {
        console.error(`📊 [${role.toUpperCase()}] Pure WebSocket: Performance impact - Error in data loading`);
      }
    }
  }, [initialDataLoader, role, isConnected, enableCaching, getSocketCachedData, performanceLogging]);

  // WebSocket real-time event handlers
  const handleRealTimeUpdate = useCallback((eventType: string, data: any) => {
    if (performanceLogging) {
      console.log(`⚡ [${role.toUpperCase()}] Pure WebSocket: Real-time update - ${eventType}`, data);
    }
    
    recordWebSocketEvent();
    messagesReceived.current += 1;
    
    // Update state with new activity
    setState(prev => ({
      ...prev,
      lastUpdate: new Date(),
      connectionStatus: 'connected',
      dataVersion: prev.dataVersion + 1,
    }));

    // Notify all registered callbacks
    dataUpdateCallbacks.current.forEach(callback => {
      try {
        callback({ type: eventType, ...data });
      } catch (error) {
        console.error(`❌ [${role.toUpperCase()}] Data update callback error:`, error);
      }
    });

    // Role-specific update handling
    const roleEventMappings: Record<string, (data: any) => void> = {
      'data:gate_vehicle_entry': (data) => {
        if (role === 'satpam' || role === 'manager') {
          enhancedDataLoader(false); // Soft refresh for gate events
        }
      },
      
      'data:harvest_approval_request': (data) => {
        if (role === 'asisten' || role === 'manager') {
          enhancedDataLoader(false); // Immediate refresh for approval workflow
        }
      },
      
      'data:estate_production_update': (data) => {
        if (role === 'manager' || role === 'area_manager') {
          enhancedDataLoader(false); // Production updates for management
        }
      },
      
      'data:system_health_update': (data) => {
        if (role === 'super_admin') {
          enhancedDataLoader(false); // System health for admin
        }
      }
    };

    const handler = roleEventMappings[eventType];
    if (handler) {
      handler(data);
    } else if (eventType.includes('dashboard:refresh') || eventType.includes(`${role}:`)) {
      // Generic refresh for role-specific or dashboard-wide events
      enhancedDataLoader(false);
    }

  }, [role, recordWebSocketEvent, enhancedDataLoader, performanceLogging]);

  // Subscribe to WebSocket channels on mount and role change
  useEffect(() => {
    if (performanceLogging) {
      console.log(`📺 [${role.toUpperCase()}] Pure WebSocket: Subscribing to channels:`, channels);
    }
    
    subscribe(channels);
    
    return () => {
      if (performanceLogging) {
        console.log(`📺 [${role.toUpperCase()}] Pure WebSocket: Unsubscribing from channels`);
      }
      unsubscribe(channels);
    };
  }, [subscribe, unsubscribe, channels, role, performanceLogging]);

  // Set up real-time event listeners
  useEffect(() => {
    if (!socket) return;

    const eventTypes = [
      'data:gate_vehicle_entry',
      'data:harvest_approval_request', 
      'data:estate_production_update',
      'data:system_health_update',
      `data:${role}_initial`,
      'dashboard:refresh',
      `${role}:data_update`
    ];

    // Add event listeners
    eventTypes.forEach(eventType => {
      socket.on(eventType, (data: any) => handleRealTimeUpdate(eventType, data));
    });

    // Cleanup listeners on unmount or socket change
    return () => {
      eventTypes.forEach(eventType => {
        socket.off(eventType);
      });
    };
  }, [socket, role, handleRealTimeUpdate]);

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    if (performanceLogging) {
      console.log(`🔄 [${role.toUpperCase()}] Pure WebSocket: Manual refresh triggered`);
    }
    await enhancedDataLoader(false);
  }, [enhancedDataLoader, role, performanceLogging]);

  // Force refresh function (bypasses all caching)
  const forceRefresh = useCallback(async () => {
    if (performanceLogging) {
      console.log(`🔥 [${role.toUpperCase()}] Pure WebSocket: Force refresh triggered - clearing cache`);
    }
    clearSocketCache();
    setState(prev => ({ ...prev, cacheHits: 0 }));
    await enhancedDataLoader(true);
  }, [enhancedDataLoader, clearSocketCache, role, performanceLogging]);

  // Connection management
  const reconnect = useCallback(() => {
    if (performanceLogging) {
      console.log(`🔌 [${role.toUpperCase()}] Pure WebSocket: Manual reconnection triggered`);
    }
    forceReconnect();
  }, [forceReconnect, role, performanceLogging]);

  // Data management functions
  const getCachedData = useCallback((key: string) => {
    const data = getSocketCachedData(key);
    if (data && enableCaching) {
      setState(prev => ({ ...prev, cacheHits: prev.cacheHits + 1 }));
    }
    return data;
  }, [getSocketCachedData, enableCaching]);

  const invalidateCache = useCallback(() => {
    clearSocketCache();
    setState(prev => ({ ...prev, cacheHits: 0 }));
    if (performanceLogging) {
      console.log(`🧹 [${role.toUpperCase()}] Pure WebSocket: Cache invalidated`);
    }
  }, [clearSocketCache, role, performanceLogging]);

  // Event management
  const onDataUpdate = useCallback((callback: (data: any) => void) => {
    dataUpdateCallbacks.current.add(callback);
    return () => {
      dataUpdateCallbacks.current.delete(callback);
    };
  }, []);

  const pushUpdate = useCallback((type: string, data: any) => {
    if (socket) {
      socket.pushData(type, data, channels);
      if (performanceLogging) {
        console.log(`📤 [${role.toUpperCase()}] Pure WebSocket: Data pushed - ${type}`);
      }
    }
  }, [socket, channels, role, performanceLogging]);

  // Performance-tracked API call wrapper
  const withPerformanceTracking = useCallback(<T>(
    apiCall: () => Promise<T>,
    estimatedDataSize: number = 0
  ): Promise<T> => {
    return withPerformanceMonitoring(apiCall, estimatedDataSize);
  }, []);

  // Enhanced performance metrics
  const getPerformanceMetrics = useCallback(() => {
    const baseMetrics = getMetrics();
    const connectionStats = getConnectionStats();
    
    return {
      ...baseMetrics,
      role,
      channels: channels.length,
      activeChannels: activeSubscriptions.length,
      realTimeEnabled: true,
      lastUpdate: state.lastUpdate,
      connectionStatus: state.connectionStatus,
      connectionQuality,
      dataVersion: state.dataVersion,
      cacheHits: state.cacheHits,
      messagesReceived: messagesReceived.current,
      ...connectionStats,
    };
  }, [getMetrics, getConnectionStats, role, channels.length, activeSubscriptions.length, state, connectionQuality]);

  // Enhanced performance report
  const generatePerformanceReport = useCallback(() => {
    const baseReport = generateReport();
    const metrics = getPerformanceMetrics();
    
    return `${baseReport}

Pure WebSocket Dashboard Metrics:
==================================
Role: ${role.toUpperCase()}
WebSocket Channels: ${channels.join(', ')}
Active Subscriptions: ${activeSubscriptions.length}
Connection Status: ${state.connectionStatus}
Connection Quality: ${connectionQuality}
Last Update: ${state.lastUpdate?.toLocaleTimeString() || 'Never'}
Data Version: ${state.dataVersion}
Cache Hits: ${state.cacheHits}
Messages Received: ${messagesReceived.current}
Uptime: ${Math.floor(metrics.uptime / 60)}m ${metrics.uptime % 60}s
Reconnections: ${metrics.reconnections}

Performance Analysis:
- ${metrics.efficiency > 40 ? '🚀' : metrics.efficiency > 20 ? '✅' : '⚠️'} WebSocket Efficiency: ${metrics.efficiency.toFixed(1)}%
- ${state.cacheHits > 5 ? '💾' : '🔍'} Cache Usage: ${state.cacheHits} hits
- ${messagesReceived.current > 10 ? '📈' : '📊'} Real-time Activity: ${messagesReceived.current} messages
- ${connectionQuality === 'excellent' ? '🌟' : connectionQuality === 'good' ? '✅' : '⚠️'} Connection: ${connectionQuality}

Recommendations:
- ${state.connectionStatus === 'connected' ? '✅' : '❌'} WebSocket connectivity health
- ${state.cacheHits > 3 ? '✅' : '💡'} Cache utilization ${state.cacheHits > 3 ? 'optimized' : 'could be improved'}
- ${messagesReceived.current > 0 ? '✅' : '⚠️'} Real-time event processing ${messagesReceived.current > 0 ? 'active' : 'inactive'}
    `;
  }, [generateReport, getPerformanceMetrics, role, channels, activeSubscriptions, state, connectionQuality]);

  // Connection status tracking
  useEffect(() => {
    setState(prev => ({
      ...prev,
      connectionStatus: isConnected ? 'connected' : 
                      connectionState === 'reconnecting' ? 'reconnecting' :
                      connectionState === 'failed' ? 'failed' : 'disconnected',
    }));
  }, [isConnected, connectionState]);

  // Auto-reconnection logic
  useEffect(() => {
    if (autoReconnect && !isConnected && connectionState === 'disconnected') {
      const reconnectTimer = setTimeout(() => {
        if (performanceLogging) {
          console.log(`🔄 [${role.toUpperCase()}] Pure WebSocket: Auto-reconnecting...`);
        }
        forceReconnect();
      }, 5000);

      return () => clearTimeout(reconnectTimer);
    }
  }, [autoReconnect, isConnected, connectionState, forceReconnect, role, performanceLogging]);

  // Initial load
  useEffect(() => {
    if (enableInitialLoad) {
      if (performanceLogging) {
        console.log(`🏁 [${role.toUpperCase()}] Pure WebSocket: Starting initial dashboard load...`);
      }
      enhancedDataLoader(false);
    }
    
    // Cleanup on unmount
    return () => {
      dataUpdateCallbacks.current.clear();
    };
  }, [enableInitialLoad, enhancedDataLoader, role, performanceLogging]);

  return {
    // State
    ...state,
    
    // Manual control
    refresh: manualRefresh, // Alias for backward compatibility
    manualRefresh,
    forceRefresh,
    
    // Connection management
    reconnect,
    healthCheck,
    
    // Data management
    getCachedData,
    invalidateCache,
    
    // Performance
    getPerformanceMetrics,
    generatePerformanceReport,
    
    // WebSocket status
    isWebSocketConnected: isConnected,
    connectionQuality: connectionQuality || 'unknown',
    activeChannels: activeSubscriptions,
    messagesReceived: messagesReceived.current,
    
    // Event management
    onDataUpdate,
    pushUpdate,
    
    // Utilities
    withPerformanceTracking,
  };
}
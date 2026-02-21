'use client';

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Optimized icon imports - only import what we need for better tree shaking
import { 
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  Building,
  GitBranch,
  RefreshCw,
  BarChart3,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
// Import our components with optimized lazy loading
import { SuperAdminStatistics, SystemStatistics as LocalSystemStatistics } from './super-admin-statistics';

// Lazy load heavy components for better performance
const GlobalSearch = React.lazy(() => import('./global-search').then(module => ({ default: module.GlobalSearch })));
const MultiAssignmentAnalyticsComponent = React.lazy(() => import('./multi-assignment-analytics').then(module => ({ default: module.MultiAssignmentAnalytics })));

// Import types separately for better tree shaking
import type { SearchResult } from './global-search';
import type { MultiAssignmentData } from './multi-assignment-analytics';

// Import types and API services
import { User, Company, Estate, Divisi, Block } from '@/types/auth';
import { 
  SuperAdminAPI, 
  SystemStatistics, 
  MultiAssignmentAnalytics, 
  SystemActivity 
} from '@/lib/api/super-admin-api';
import { AuthDebugger } from '@/lib/debug/auth-debug';

import { usePureWebSocketDashboard } from '@/hooks/use-pure-websocket-dashboard';
import { withPerformanceMonitoring } from '@/lib/monitoring/dashboard-performance';

// Apollo Client for direct GraphQL queries
import { apolloClient } from '@/lib/apollo/client';
import { GET_SYSTEM_ACTIVITY_LOGS } from '@/lib/apollo/queries/super-admin';

// Memoized Statistics Cards Component for better performance
const StatisticsCards = memo(({ systemStats }: { systemStats: SystemStatistics | null }) => {
  if (!systemStats) return null;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Ringkasan Sistem
        </h2>
        <Badge variant="secondary" className="px-3 py-1">
          Terakhir diperbarui: {systemStats.lastUpdated.toLocaleTimeString()}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-50">Total Pengguna</CardTitle>
            <Users className="h-5 w-5 text-blue-100" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">{systemStats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-blue-100">
              <span className="inline-flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{systemStats.trends.users}% dari bulan lalu
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-50">Perusahaan Aktif</CardTitle>
            <Building className="h-5 w-5 text-green-100" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">{systemStats.activeCompanies.toLocaleString()}</div>
            <p className="text-xs text-green-100">
              <span className="inline-flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{systemStats.trends.companies}% dari bulan lalu
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-50">Multi-Penugasan</CardTitle>
            <GitBranch className="h-5 w-5 text-orange-100" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">
              {(systemStats.multiCompanyAreaManagers + systemStats.multiEstateManagers + systemStats.multiDivisionAsistens).toLocaleString()}
            </div>
            <p className="text-xs text-orange-100">
              <span className="inline-flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                Penugasan multi-peran
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-50">Kesehatan Sistem</CardTitle>
            {systemStats.systemHealth === 'healthy' ? (
              <CheckCircle className="h-5 w-5 text-green-200" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-200" />
            )}
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1 capitalize">{systemStats.systemHealth}</div>
            <p className="text-xs text-purple-100">
              Uptime: {systemStats.systemUptime}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

// Memoized Activities Component
const ActivitiesSection = memo(({ activities }: { activities: SystemActivity[] }) => {
  const getTimeAgo = useMemo(() => (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days} hari lalu`;
    if (hours > 0) return `${hours} jam lalu`;
    if (minutes > 0) return `${minutes} menit lalu`;
    return 'Baru saja';
  }, []);

  const getSeverityColor = useMemo(() => (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'success': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  }, []);

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 bg-blue-500 rounded-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          Aktivitas Sistem Terkini
        </CardTitle>
        <CardDescription className="text-base">
          Peristiwa terbaru dan perubahan penting di seluruh platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between py-3 px-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className={`h-3 w-3 ${getSeverityColor(activity.severity)} rounded-full ${activity.severity === 'success' ? 'animate-pulse' : ''}`}></div>
                <div>
                  <span className="text-sm font-medium">{activity.title}</span>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {getTimeAgo(activity.timestamp)}
              </Badge>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Belum ada aktivitas terbaru</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Helper: fetch system activities via GraphQL and map to SystemActivity type
async function fetchSystemActivityLogs(limit: number = 10): Promise<{ data: SystemActivity[] }> {
  try {
    const result = await apolloClient.query({
      query: GET_SYSTEM_ACTIVITY_LOGS,
      variables: { limit },
      fetchPolicy: 'network-only',
    });
    const logs = result.data?.systemActivityLogs || [];
    const mapped: SystemActivity[] = logs.map((log: any) => {
      // Parse metadata for severity
      let severity: SystemActivity['severity'] = 'info';
      try {
        const meta = log.metadata ? JSON.parse(log.metadata) : {};
        if (meta.severity) severity = meta.severity;
      } catch { /* ignore */ }

      // Map GraphQL type to frontend type
      const typeMap: Record<string, SystemActivity['type']> = {
        COMPANY_CREATED: 'company_created',
        COMPANY_UPDATED: 'assignment_updated',
        COMPANY_SUSPENDED: 'system_alert',
        COMPANY_ACTIVATED: 'company_created',
        ADMIN_CREATED: 'user_created',
        SYSTEM_SETTINGS_CHANGED: 'system_alert',
        FEATURE_TOGGLED: 'system_alert',
        SECURITY_EVENT: 'performance_alert',
        DATABASE_MIGRATION: 'system_alert',
        SYSTEM_RESTART: 'system_alert',
        BACKUP_CREATED: 'system_alert',
      };

      return {
        id: log.id,
        type: typeMap[log.type] || 'system_alert',
        title: log.description,
        description: `oleh ${log.actor}`,
        severity,
        timestamp: new Date(log.timestamp),
        companyId: log.companyId || undefined,
        companyName: log.companyName || undefined,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
      } as SystemActivity;
    });
    return { data: mapped };
  } catch (error) {
    console.error('Failed to fetch system activity logs via GraphQL:', error);
    return { data: [] };
  }
}

export function SuperAdminDashboard() {
  // Data states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  
  // Statistics and system data
  const [systemStats, setSystemStats] = useState<SystemStatistics | null>(null);
  const [multiAssignmentData, setMultiAssignmentData] = useState<MultiAssignmentAnalytics | null>(null);

  // Pure WebSocket data loader - OPTIMIZED
  const loadDashboardData = useCallback(async () => {
    try {
      // Start performance measurement
      const startTime = performance.now();
      
      // Debug: Check authentication status before making API calls (suppressed in production)
      if (process.env.NODE_ENV === 'development') {
        const issues = AuthDebugger.logCookieStatus('before-dashboard-api-calls', true);
        if (issues.length > 0) {
          console.warn('🚨 Super Admin Dashboard: Cookie authentication issues detected:', issues);
        }
      }
      
      // Optimized parallel loading - removed performance monitoring overhead for speed
      const [
        companiesData, 
        usersResponse, 
        systemStatsData, 
        multiAssignmentAnalyticsData,
        activitiesResponse
      ] = await Promise.all([
        SuperAdminAPI.getAllCompanies(),
        SuperAdminAPI.getAllUsers({ limit: 50 }), // Reduced limit for faster loading
        SuperAdminAPI.getSystemStatistics(),
        SuperAdminAPI.getMultiAssignmentAnalytics(),
        fetchSystemActivityLogs(5) // Reduced activities for faster loading
      ]);
      
      // Batch state updates to prevent multiple re-renders
      const batchedUpdate = () => {
        setCompanies(companiesData);
        setUsers(usersResponse.data);
        setSystemStats(systemStatsData);
        setMultiAssignmentData(multiAssignmentAnalyticsData);
        setActivities(activitiesResponse.data);
      };
      
      // React 18+ has automatic batching, so we can call directly
      batchedUpdate();
      
      // Log performance improvement
      const loadTime = performance.now() - startTime;
      console.log(`🚀 Super Admin Dashboard: Optimized load completed in ${loadTime.toFixed(0)}ms`);
      
    } catch (error) {
      console.error('Dashboard loading error:', error);
      throw error;
    }
  }, []);

  // Pure WebSocket Dashboard - OPTIMIZED for performance
  const websocketConfig = useMemo(() => ({
    role: 'super_admin' as const,
    channels: ['WEB_DASHBOARD', 'SUPER_ADMIN', 'SYSTEM_MONITORING', 'ALL_COMPANIES'],
    enableInitialLoad: true,
    enableCaching: true,
    enableNotifications: false, // Disable notifications for better performance
    autoReconnect: true,
    performanceLogging: process.env.NODE_ENV === 'development', // Only log in dev
  }), []);

  const {
    loading,
    refreshing,
    error,
    lastUpdate,
    activeChannels,
    messagesReceived,
    manualRefresh,
    onDataUpdate,
    getPerformanceMetrics,
    generatePerformanceReport,
  } = usePureWebSocketDashboard(loadDashboardData, websocketConfig);

  // Memoized real-time update handlers for performance
  const updateHandlers = useMemo(() => ({
    'data:system_health_update': () => {
      SuperAdminAPI.getSystemStatistics()
        .then(setSystemStats)
        .catch(console.error);
    },
    'data:company_admin_initial': () => {
      Promise.all([
        SuperAdminAPI.getAllCompanies(),
        SuperAdminAPI.getAllUsers({ limit: 50 })
      ]).then(([companiesData, usersResponse]) => {
        setCompanies(companiesData);
        setUsers(usersResponse.data);
      }).catch(console.error);
    },
    'data:user_management_update': () => {
      Promise.all([
        SuperAdminAPI.getAllCompanies(),
        SuperAdminAPI.getAllUsers({ limit: 50 })
      ]).then(([companiesData, usersResponse]) => {
        setCompanies(companiesData);
        setUsers(usersResponse.data);
      }).catch(console.error);
    },
    'data:multi_assignment_update': () => {
      SuperAdminAPI.getMultiAssignmentAnalytics()
        .then(setMultiAssignmentData)
        .catch(console.error);
    },
    'data:system_activity_update': () => {
      fetchSystemActivityLogs(5)
        .then(response => setActivities(response.data))
        .catch(console.error);
    }
  }), []);

  // Set up optimized real-time data update handlers
  useEffect(() => {
    const unsubscribe = onDataUpdate((data: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 Super Admin: Real-time data update received:', data.type);
      }
      
      const handler = updateHandlers[data.type as keyof typeof updateHandlers];
      if (handler) {
        // Debounce rapid updates for better performance
        clearTimeout((window as any).__updateTimeout);
        (window as any).__updateTimeout = setTimeout(handler, 100);
      } else if (data.type.includes('dashboard:refresh') || data.type.includes('super_admin:')) {
        // Handle full refresh with debouncing
        clearTimeout((window as any).__refreshTimeout);
        (window as any).__refreshTimeout = setTimeout(() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Super Admin: Triggering debounced refresh for:', data.type);
          }
        }, 200);
      }
    });
    
    return unsubscribe;
  }, [onDataUpdate, updateHandlers]);

  const handleRefresh = async () => {
    try {
      await manualRefresh();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    }
  };

  const handleSearchResults = (results: SearchResult[]) => {
    console.log('Search results:', results);
    // You can add state to display search results if needed
  };

  const handleEntitySelect = (result: SearchResult) => {
    // Navigate to entity or show details
    console.log('Entity selected:', result);
  };

  const handleUserSelect = (user: User) => {
    // Navigate to user details or show user modal
    console.log('User selected:', user);
  };

  const handleOptimizeAssignments = async () => {
    try {
      const result = await SuperAdminAPI.optimizeAssignments({
        balanceWorkload: true,
        minimizeOverlaps: true,
        dryRun: false
      });
      console.log('Assignment optimization result:', result);
      // You can show a success message or refresh the data
      if (result.success) {
        await manualRefresh(); // Refresh data to show changes
      }
    } catch (error) {
      console.error('Assignment optimization failed:', error);
    }
  };

  // Pure WebSocket handles initialization automatically - no manual setup needed

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Gagal Memuat Dashboard
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={manualRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Dashboard Super Admin
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Pengawasan dan kontrol penuh ekosistem Agrinova
          </p>
          <div className="flex items-center gap-4 mt-2">
            {/* WebSocket Channels Status */}
            {activeChannels.length > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                {activeChannels.length} Kanal Aktif
              </Badge>
            )}
            
            {/* Messages Received Counter */}
            {messagesReceived > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                {messagesReceived} Pesan
              </Badge>
            )}
            
            {/* Last Update */}
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                Terakhir: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            
            {/* Pure WebSocket Performance Metrics (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
              <>
                <Button
                  onClick={() => console.log(getPerformanceMetrics())}
                  variant="ghost"
                  size="sm"
                  className="text-xs opacity-50 hover:opacity-100"
                >
                  📊 Metrics
                </Button>
                <Button
                  onClick={() => console.log(generatePerformanceReport())}
                  variant="ghost"
                  size="sm"
                  className="text-xs opacity-50 hover:opacity-100"
                >
                  📋 Report
                </Button>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Manual Refresh */}
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="flex items-center gap-2 h-10 px-4 hover:bg-blue-50 dark:hover:bg-blue-950/20 border-blue-200 dark:border-blue-800"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Segarkan Data
          </Button>
        </div>
      </div>

      {/* Global Search - Lazy loaded for performance */}
      <div className="max-w-3xl">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800/50">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Pencarian Global
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cari di semua perusahaan, pengguna, estate, dan divisi dalam sistem
            </p>
          </div>
          <React.Suspense fallback={
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-10 rounded-md"></div>
          }>
            <GlobalSearch
              onSearchResults={handleSearchResults}
              onEntitySelect={handleEntitySelect}
              placeholder="Ketik untuk mencari..."
              className="w-full"
            />
          </React.Suspense>
        </div>
      </div>

      {/* Optimized Statistics Cards - Memoized for Performance */}
      <StatisticsCards systemStats={systemStats} />

      {/* Main Statistics */}
      {systemStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <SuperAdminStatistics
            data={systemStats}
            loading={refreshing}
          />
        </motion.div>
      )}

      {/* Multi-Assignment Analytics - Lazy loaded for performance */}
      {multiAssignmentData && (
        <React.Suspense fallback={
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        }>
          <MultiAssignmentAnalyticsComponent
            data={multiAssignmentData as MultiAssignmentData}
            users={users}
            onUserSelect={handleUserSelect}
            onOptimizationRequest={handleOptimizeAssignments}
          />
        </React.Suspense>
      )}

      {/* Optimized Activities Section - Memoized for Performance */}
      <ActivitiesSection activities={activities} />
    </div>
  );
}

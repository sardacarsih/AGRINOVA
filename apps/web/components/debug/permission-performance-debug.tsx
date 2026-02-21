'use client';

import React from 'react';
import { PermissionManager } from '@/lib/auth/permissions';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/components/auth/protected-route';
import { PermissionWrapper, usePermissionCheck } from '@/components/auth/permission-wrapper';
import { PERMISSIONS } from '@/types/auth';

/**
 * Debug component to test and monitor PermissionManager performance
 * This component helps identify performance improvements and potential bottlenecks
 */
export function PermissionPerformanceDebug() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const permissionCheck = usePermissionCheck();
  const [renderCount, setRenderCount] = React.useState(0);
  const [permissionCalls, setPermissionCalls] = React.useState(0);
  
  // Track render count
  React.useEffect(() => {
    setRenderCount(prev => prev + 1);
  });

  // Performance measurement for permission checks
  const measurePermissionPerformance = React.useCallback(() => {
    if (!user) return null;

    const startTime = performance.now();
    const iterations = 1000;
    
    // Test permission checks
    for (let i = 0; i < iterations; i++) {
      PermissionManager.hasPermission(user, PERMISSIONS.HARVEST_READ);
      PermissionManager.hasPermission(user, PERMISSIONS.GATE_CHECK_READ);
      PermissionManager.hasPermission(user, PERMISSIONS.REPORT_VIEW);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    setPermissionCalls(prev => prev + (iterations * 3));
    
    return {
      iterations: iterations * 3,
      duration: duration.toFixed(2),
      averagePerCall: (duration / (iterations * 3)).toFixed(4)
    };
  }, [user]);

  // Clear cache test
  const testCacheClear = React.useCallback(() => {
    if (!user) return;
    
    console.log('🧹 Clearing PermissionManager cache...');
    PermissionManager.clearCache();
    console.log('✅ Cache cleared');
  }, [user]);

  // Test cache efficiency
  const testCacheEfficiency = React.useCallback(() => {
    if (!user) return null;

    console.log('🏃 Testing cache efficiency...');
    
    // First call (cache miss)
    const startTime1 = performance.now();
    const result1 = PermissionManager.hasPermission(user, PERMISSIONS.HARVEST_READ);
    const endTime1 = performance.now();
    const uncachedTime = endTime1 - startTime1;
    
    // Second call (cache hit)
    const startTime2 = performance.now();
    const result2 = PermissionManager.hasPermission(user, PERMISSIONS.HARVEST_READ);
    const endTime2 = performance.now();
    const cachedTime = endTime2 - startTime2;
    
    const improvement = ((uncachedTime - cachedTime) / uncachedTime * 100).toFixed(1);
    
    console.log('📊 Cache Performance:', {
      uncachedTime: uncachedTime.toFixed(4) + 'ms',
      cachedTime: cachedTime.toFixed(4) + 'ms',
      improvement: improvement + '%',
      result1, result2
    });

    return {
      uncachedTime: uncachedTime.toFixed(4),
      cachedTime: cachedTime.toFixed(4),
      improvement
    };
  }, [user]);

  if (!user) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Permission Performance Debug</h3>
        <p className="text-gray-600">No user logged in</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
      <h3 className="font-semibold mb-2">Permission Performance Debug</h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <strong>User:</strong> {user.email}
        </div>
        <div>
          <strong>Role:</strong> {user.role}
        </div>
        <div>
          <strong>Render Count:</strong> {renderCount}
        </div>
        <div>
          <strong>Permission Calls:</strong> {permissionCalls}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={measurePermissionPerformance}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Measure Performance
        </button>
        
        <button
          onClick={testCacheEfficiency}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
        >
          Test Cache
        </button>
        
        <button
          onClick={testCacheClear}
          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
        >
          Clear Cache
        </button>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Quick Permission Checks:</h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <strong>Harvest Read:</strong> {permissions.hasPermission(PERMISSIONS.HARVEST_READ) ? '✅' : '❌'}
          </div>
          <div>
            <strong>Gate Check:</strong> {permissions.hasPermission(PERMISSIONS.GATE_CHECK_READ) ? '✅' : '❌'}
          </div>
          <div>
            <strong>Report View:</strong> {permissions.hasPermission(PERMISSIONS.REPORT_VIEW) ? '✅' : '❌'}
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Optimized Components Test:</h4>
        <PermissionWrapper 
          permission={PERMISSIONS.HARVEST_READ}
          fallback={<span className="text-red-500">No harvest access</span>}
        >
          <span className="text-green-500">✅ Has harvest access (via PermissionWrapper)</span>
        </PermissionWrapper>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { DashboardConfig, DashboardMetrics } from '../types/dashboard';

export function useDashboard() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock metrics for now - replace with actual API calls
      const mockMetrics: DashboardMetrics = {
        totalUsers: 145,
        activeUsers: 89,
        pendingApprovals: 12,
        recentActivity: []
      };
      
      setMetrics(mockMetrics);
    } catch (err) {
      setError('Failed to load dashboard metrics');
      console.error('Dashboard metrics error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMetrics();
  }, []);

  return {
    config,
    metrics,
    loading,
    error,
    refreshMetrics
  };
}
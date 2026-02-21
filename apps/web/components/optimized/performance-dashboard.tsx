'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { performance } from '../../lib/performance/perf-monitor';
import { useCoreWebVitals } from '../../lib/performance/core-web-vitals';

interface PerformanceMetrics {
  renderTime: number;
  apiRequests: number;
  errors: number;
  cacheHitRate: number;
  memoryUsage: number;
  networkLatency: number;
}

interface PerformanceDashboardProps {
  visible?: boolean;
  refreshInterval?: number;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  visible = process.env.NODE_ENV === 'development',
  refreshInterval = 5000,
}) => {
  const { getLatestVitals, getPerformanceScore } = useCoreWebVitals();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    apiRequests: 0,
    errors: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    networkLatency: 0,
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate metrics from performance monitor
  useEffect(() => {
    const updateMetrics = () => {
      const renderStats = performance.getMetricStats('render.dashboard.layout.duration');
      const apiRequests = performance.getMetrics('api.request.success').length;
      const errors = performance.getMetrics('dashboard.error.boundary').length;
      const cacheHits = performance.getMetrics('graphql.cache.hit').length;
      const cacheMisses = performance.getMetrics('graphql.cache.miss').length;
      const networkStats = performance.getMetricStats('graphql.request');

      setMetrics({
        renderTime: renderStats?.avg || 0,
        apiRequests,
        errors,
        cacheHitRate: cacheHits + cacheMisses > 0 ? (cacheHits / (cacheHits + cacheMisses)) * 100 : 0,
        memoryUsage: (performance as any).getMemoryUsage?.() ||
                     (typeof performance !== 'undefined' && (performance as any).memory?.usedJSHeapSize) || 0,
        networkLatency: networkStats?.avg || 0,
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Get Core Web Vitals
  const coreVitals = useMemo(() => {
    const vitals = getLatestVitals();
    const score = getPerformanceScore();

    return {
      LCP: vitals.LCP?.value || 0,
      FID: vitals.FID?.value || 0,
      CLS: vitals.CLS?.value || 0,
      FCP: vitals.FCP?.value || 0,
      TTFB: vitals.TTFB?.value || 0,
      score,
    };
  }, [getLatestVitals, getPerformanceScore]);

  // Generate health status
  const healthStatus = useMemo(() => {
    const { renderTime, errors, cacheHitRate, networkLatency } = metrics;
    const { score } = coreVitals;

    if (errors > 5 || renderTime > 100 || score < 50) return 'critical';
    if (errors > 2 || renderTime > 50 || score < 70) return 'warning';
    return 'healthy';
  }, [metrics, coreVitals]);

  // Health status colors
  const healthColors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
  };

  // Performance score colors
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono text-xs">
      {/* Collapsed indicator */}
      {!isExpanded && (
        <div
          className={`bg-gray-900 text-white p-3 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors`}
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${healthColors[healthStatus]} animate-pulse`} />
            <span>Performance</span>
            <span className={getScoreColor(coreVitals.score)}>
              {coreVitals.score}
            </span>
          </div>
        </div>
      )}

      {/* Expanded dashboard */}
      {isExpanded && (
        <div className="bg-gray-900 text-white rounded-lg shadow-xl max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${healthColors[healthStatus]}`} />
              <h3 className="font-semibold">Performance Dashboard</h3>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Core Performance Score */}
            <div className="bg-gray-800 rounded p-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Performance Score</span>
                <span className={`font-bold text-lg ${getScoreColor(coreVitals.score)}`}>
                  {coreVitals.score}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    coreVitals.score >= 90 ? 'bg-green-500' :
                    coreVitals.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${coreVitals.score}%` }}
                />
              </div>
            </div>

            {/* Core Web Vitals */}
            <div className="bg-gray-800 rounded p-3">
              <h4 className="font-semibold mb-2 text-gray-300">Core Web Vitals</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">LCP:</span>
                  <span>{Math.round(coreVitals.LCP)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">FID:</span>
                  <span>{Math.round(coreVitals.FID)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">CLS:</span>
                  <span>{coreVitals.CLS.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">FCP:</span>
                  <span>{Math.round(coreVitals.FCP)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">TTFB:</span>
                  <span>{Math.round(coreVitals.TTFB)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Memory:</span>
                  <span>{(metrics.memoryUsage / 1024).toFixed(1)}MB</span>
                </div>
              </div>
            </div>

            {/* Application Metrics */}
            <div className="bg-gray-800 rounded p-3">
              <h4 className="font-semibold mb-2 text-gray-300">Application Metrics</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Render Time:</span>
                  <span className={metrics.renderTime > 50 ? 'text-yellow-400' : 'text-green-400'}>
                    {metrics.renderTime.toFixed(2)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">API Requests:</span>
                  <span>{metrics.apiRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Network Latency:</span>
                  <span className={metrics.networkLatency > 1000 ? 'text-yellow-400' : 'text-green-400'}>
                    {Math.round(metrics.networkLatency)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cache Hit Rate:</span>
                  <span className={metrics.cacheHitRate > 80 ? 'text-green-400' : 'text-yellow-400'}>
                    {metrics.cacheHitRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Errors:</span>
                  <span className={metrics.errors > 0 ? 'text-red-400' : 'text-green-400'}>
                    {metrics.errors}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  performance.clear();
                  console.log('Performance metrics cleared');
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs transition-colors"
              >
                Clear Metrics
              </button>
              <button
                onClick={() => {
                  const data = performance.export();
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `performance-metrics-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded text-xs transition-colors"
              >
                Export Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;
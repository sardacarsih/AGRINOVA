/**
 * Performance monitoring for Agrinova routing optimization
 */
import * as React from 'react';

interface PerformanceMetric {
  route: string;
  loadTime: number;
  timestamp: number;
  userRole: string;
  cacheHit?: boolean;
  errorCount?: number;
}

export class PerformanceTracker {
  private static metrics: PerformanceMetric[] = [];
  private static maxStoredMetrics = 1000;

  static trackPageLoad(route: string, userRole: string, startTime: number) {
    const loadTime = performance.now() - startTime;
    
    const metric: PerformanceMetric = {
      route,
      loadTime,
      timestamp: Date.now(),
      userRole,
      cacheHit: this.detectCacheHit(loadTime),
    };

    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics = this.metrics.slice(-this.maxStoredMetrics);
    }

    // Log performance issues
    if (loadTime > 500) {
      console.warn(`Slow page load detected: ${route} took ${loadTime}ms`);
    }

    // Send to analytics (optional)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_load_time', {
        event_category: 'Performance',
        event_label: route,
        value: Math.round(loadTime),
        custom_map: { user_role: userRole }
      });
    }
  }

  private static detectCacheHit(loadTime: number): boolean {
    // Heuristic: cache hits typically under 150ms
    return loadTime < 150;
  }

  static getAverageLoadTime(route?: string, timeWindow = 300000): number {
    const now = Date.now();
    const relevantMetrics = this.metrics.filter(m => 
      m.timestamp > (now - timeWindow) && 
      (!route || m.route === route)
    );

    if (relevantMetrics.length === 0) return 0;

    return relevantMetrics.reduce((sum, m) => sum + m.loadTime, 0) / relevantMetrics.length;
  }

  static getPerformanceReport() {
    const report = {
      totalRequests: this.metrics.length,
      averageLoadTime: this.getAverageLoadTime(),
      slowRequests: this.metrics.filter(m => m.loadTime > 500).length,
      cacheHitRate: this.metrics.filter(m => m.cacheHit).length / this.metrics.length,
      routeBreakdown: this.getRouteBreakdown(),
      recentTrends: this.getRecentTrends(),
    };

    return report;
  }

  private static getRouteBreakdown() {
    const routes: { [key: string]: { count: number; avgTime: number } } = {};
    
    this.metrics.forEach(metric => {
      if (!routes[metric.route]) {
        routes[metric.route] = { count: 0, avgTime: 0 };
      }
      routes[metric.route].count++;
    });

    Object.keys(routes).forEach(route => {
      const routeMetrics = this.metrics.filter(m => m.route === route);
      routes[route].avgTime = routeMetrics.reduce((sum, m) => sum + m.loadTime, 0) / routeMetrics.length;
    });

    return routes;
  }

  private static getRecentTrends() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
    
    return {
      lastHourRequests: recentMetrics.length,
      lastHourAverageTime: recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, m) => sum + m.loadTime, 0) / recentMetrics.length 
        : 0
    };
  }

  // Method to track consecutive same-route requests (like your log pattern)
  static trackConsecutiveRequests(): { route: string; consecutiveCount: number }[] {
    const consecutive: { route: string; consecutiveCount: number }[] = [];
    let currentRoute = '';
    let currentCount = 0;

    this.metrics.slice(-10).forEach(metric => {
      if (metric.route === currentRoute) {
        currentCount++;
      } else {
        if (currentCount > 1) {
          consecutive.push({ route: currentRoute, consecutiveCount: currentCount });
        }
        currentRoute = metric.route;
        currentCount = 1;
      }
    });

    if (currentCount > 1) {
      consecutive.push({ route: currentRoute, consecutiveCount: currentCount });
    }

    return consecutive.filter(item => item.consecutiveCount > 1);
  }
}

// Usage hook for React components
export function usePerformanceTracking(route: string, userRole: string) {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      PerformanceTracker.trackPageLoad(route, userRole, startTime);
    };
  }, [route, userRole]);
}
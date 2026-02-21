// Performance monitoring service for dashboard optimization tracking
export interface PerformanceMetrics {
  dashboardLoadTime: number;
  authenticationTime: number;
  dataLoadingTime: number;
  componentLoadingTime: number;
  totalTime: number;
  timestamp: number;
  userAgent: string;
  userRole?: string;
  cacheHitRate: number;
  errorCount: number;
  retryCount: number;
}

export interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private startTime: number = 0;
  private checkpoints: Map<string, number> = new Map();
  private maxMetrics: number = 100; // Keep last 100 metrics
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializePerformanceObservers();
    this.startMetricsCollection();
  }

  // Initialize Performance API observers
  private initializePerformanceObservers() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      console.warn('⚠️ [PerformanceMonitor] PerformanceObserver not available');
      return;
    }

    try {
      // Observe navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            console.log('📊 [PerformanceMonitor] Navigation timing:', {
              dnsLookup: navEntry.domainLookupEnd - navEntry.domainLookupStart,
              tcpConnect: navEntry.connectEnd - navEntry.connectStart,
              serverResponse: navEntry.responseEnd - navEntry.requestStart,
              domProcessing: navEntry.domContentLoadedEventEnd - navEntry.responseEnd,
              pageLoad: navEntry.loadEventEnd - navEntry.fetchStart,
            });
          }
        });
      });

      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const slowResources = entries.filter(entry => entry.duration > 1000);
        if (slowResources.length > 0) {
          console.warn('🐌 [PerformanceMonitor] Slow resources detected:', slowResources.map(r => ({
            name: r.name,
            duration: r.duration,
            size: (r as any).transferSize
          })));
        }
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Observe long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          console.warn('⚠️ [PerformanceMonitor] Long task detected:', {
            duration: entry.duration,
            startTime: entry.startTime,
          });
        });
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);

    } catch (error) {
      console.warn('⚠️ [PerformanceMonitor] Failed to initialize observers:', error);
    }
  }

  // Start metrics collection
  startMetricsCollection() {
    this.startTime = performance.now();
    this.checkpoint('start');
    console.log('🚀 [PerformanceMonitor] Started metrics collection');
  }

  // Set checkpoint for measuring time between steps
  checkpoint(name: string) {
    const timestamp = performance.now();
    this.checkpoints.set(name, timestamp);
    console.log(`📍 [PerformanceMonitor] Checkpoint: ${name} at ${Math.round(timestamp)}ms`);
  }

  // Get time between checkpoints
  getCheckpointTime(from: string, to: string = 'current'): number {
    const fromTime = this.checkpoints.get(from);
    const toTime = to === 'current' ? performance.now() : this.checkpoints.get(to);

    if (!fromTime) {
      console.warn(`⚠️ [PerformanceMonitor] Checkpoint '${from}' not found`);
      return 0;
    }

    if (!toTime && to !== 'current') {
      console.warn(`⚠️ [PerformanceMonitor] Checkpoint '${to}' not found`);
      return 0;
    }

    return Math.round((toTime as number) - fromTime);
  }

  // Record dashboard load performance
  recordDashboardLoad(userRole?: string, errorCount: number = 0, retryCount: number = 0) {
    const totalTime = this.getCheckpointTime('start');
    const authenticationTime = this.getCheckpointTime('auth_end');
    const dataLoadingTime = this.getCheckpointTime('data_end');
    const componentLoadingTime = this.getCheckpointTime('components_end');

    const metrics: PerformanceMetrics = {
      dashboardLoadTime: totalTime,
      authenticationTime: authenticationTime,
      dataLoadingTime: dataLoadingTime,
      componentLoadingTime: componentLoadingTime,
      totalTime,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      userRole,
      cacheHitRate: this.calculateCacheHitRate(),
      errorCount,
      retryCount,
    };

    this.addMetrics(metrics);
    this.checkPerformanceThresholds(metrics);
    this.logPerformanceSummary(metrics);

    return metrics;
  }

  // Calculate cache hit rate estimate
  private calculateCacheHitRate(): number {
    try {
      const entries = performance.getEntriesByType('resource');
      const cachedEntries = entries.filter(entry => {
        const resourceEntry = entry as PerformanceResourceTiming;
        return resourceEntry.transferSize === 0 && resourceEntry.decodedBodySize > 0;
      });

      return entries.length > 0 ? (cachedEntries.length / entries.length) * 100 : 0;
    } catch (error) {
      return 0;
    }
  }

  // Add metrics to collection
  private addMetrics(metrics: PerformanceMetrics) {
    this.metrics.push(metrics);

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Check performance against thresholds and create alerts
  private checkPerformanceThresholds(metrics: PerformanceMetrics) {
    const thresholds = {
      dashboardLoadTime: { warning: 3000, error: 5000 },
      authenticationTime: { warning: 1500, error: 3000 },
      dataLoadingTime: { warning: 2000, error: 4000 },
      componentLoadingTime: { warning: 1000, error: 2000 },
      cacheHitRate: { warning: 30, error: 10 }, // Lower is worse
    };

    Object.entries(thresholds).forEach(([metric, threshold]) => {
      const value = metrics[metric as keyof PerformanceMetrics] as number;

      if (typeof value === 'number') {
        if (value > threshold.error) {
          this.createAlert('error', metric, value, threshold.error);
        } else if (value > threshold.warning) {
          this.createAlert('warning', metric, value, threshold.warning);
        }
      }
    });

    // Specific cache hit rate check (lower is worse)
    if (metrics.cacheHitRate < thresholds.cacheHitRate.error) {
      this.createAlert('error', 'cacheHitRate', metrics.cacheHitRate, thresholds.cacheHitRate.error);
    } else if (metrics.cacheHitRate < thresholds.cacheHitRate.warning) {
      this.createAlert('warning', 'cacheHitRate', metrics.cacheHitRate, thresholds.cacheHitRate.warning);
    }
  }

  // Create performance alert
  private createAlert(type: PerformanceAlert['type'], metric: string, value: number, threshold: number) {
    const alert: PerformanceAlert = {
      type,
      message: this.getAlertMessage(metric, value, threshold),
      metric,
      value,
      threshold,
      timestamp: Date.now(),
    };

    this.alerts.push(alert);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    // Log alert
    const logMethod = type === 'error' ? console.error : type === 'warning' ? console.warn : console.info;
    logMethod(`🚨 [PerformanceMonitor] ${type.toUpperCase()}: ${alert.message}`);

    // Send to monitoring service (if available)
    this.sendAlertToService(alert);
  }

  // Get alert message
  private getAlertMessage(metric: string, value: number, threshold: number): string {
    const messages = {
      dashboardLoadTime: `Dashboard load time ${Math.round(value)}ms exceeds threshold ${threshold}ms`,
      authenticationTime: `Authentication time ${Math.round(value)}ms exceeds threshold ${threshold}ms`,
      dataLoadingTime: `Data loading time ${Math.round(value)}ms exceeds threshold ${threshold}ms`,
      componentLoadingTime: `Component loading time ${Math.round(value)}ms exceeds threshold ${threshold}ms`,
      cacheHitRate: `Cache hit rate ${Math.round(value)}% is below threshold ${threshold}%`,
    };

    return messages[metric as keyof typeof messages] || `${metric}: ${Math.round(value)} exceeds threshold ${threshold}`;
  }

  // Log performance summary
  private logPerformanceSummary(metrics: PerformanceMetrics) {
    console.log('📊 [PerformanceMonitor] Dashboard Performance Summary:', {
      'Total Load Time': `${Math.round(metrics.dashboardLoadTime)}ms`,
      'Authentication': `${Math.round(metrics.authenticationTime)}ms`,
      'Data Loading': `${Math.round(metrics.dataLoadingTime)}ms`,
      'Component Loading': `${Math.round(metrics.componentLoadingTime)}ms`,
      'Cache Hit Rate': `${Math.round(metrics.cacheHitRate)}%`,
      'Errors': metrics.errorCount,
      'Retries': metrics.retryCount,
      'User Role': metrics.userRole,
    });
  }

  // Send alert to external monitoring service
  private sendAlertToService(alert: PerformanceAlert) {
    // In production, this would send to your monitoring service
    // For now, just log to console
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, DataDog, or custom endpoint
      console.log('📤 [PerformanceMonitor] Alert sent to monitoring service:', alert);
    }
  }

  // Get performance statistics
  getPerformanceStats(): {
    averageLoadTime: number;
    p95LoadTime: number;
    errorRate: number;
    averageCacheHitRate: number;
    totalMetrics: number;
    recentAlerts: PerformanceAlert[];
  } {
    if (this.metrics.length === 0) {
      return {
        averageLoadTime: 0,
        p95LoadTime: 0,
        errorRate: 0,
        averageCacheHitRate: 0,
        totalMetrics: 0,
        recentAlerts: [],
      };
    }

    const loadTimes = this.metrics.map(m => m.dashboardLoadTime).sort((a, b) => a - b);
    const cacheHitRates = this.metrics.map(m => m.cacheHitRate);
    const errorCount = this.metrics.reduce((sum, m) => sum + m.errorCount, 0);

    return {
      averageLoadTime: Math.round(loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length),
      p95LoadTime: Math.round(loadTimes[Math.floor(loadTimes.length * 0.95)]),
      errorRate: Math.round((errorCount / this.metrics.length) * 100),
      averageCacheHitRate: Math.round(cacheHitRates.reduce((sum, rate) => sum + rate, 0) / cacheHitRates.length),
      totalMetrics: this.metrics.length,
      recentAlerts: this.alerts.slice(-10), // Last 10 alerts
    };
  }

  // Get Core Web Vitals
  getCoreWebVitals(): {
    LCP: number | null;
    FID: number | null;
    CLS: number | null;
  } {
    if (typeof window === 'undefined') {
      return { LCP: null, FID: null, CLS: null };
    }

    const vitals = {
      LCP: null as number | null,
      FID: null as number | null,
      CLS: null as number | null,
    };

    try {
      // Get LCP (Largest Contentful Paint)
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        vitals.LCP = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
      }

      // Get FID (First Input Delay)
      const fidEntries = performance.getEntriesByType('first-input');
      if (fidEntries.length > 0) {
        vitals.FID = Math.round((fidEntries[0] as any).processingStart - (fidEntries[0] as any).startTime);
      }

      // Get CLS (Cumulative Layout Shift) - simplified version
      vitals.CLS = 0; // Would need proper CLS calculation

    } catch (error) {
      console.warn('⚠️ [PerformanceMonitor] Failed to get Core Web Vitals:', error);
    }

    return vitals;
  }

  // Create performance report
  createPerformanceReport(): string {
    const stats = this.getPerformanceStats();
    const vitals = this.getCoreWebVitals();

    return `
Performance Report - ${new Date().toISOString()}
=====================================
Dashboard Performance:
- Average Load Time: ${stats.averageLoadTime}ms
- P95 Load Time: ${stats.p95LoadTime}ms
- Error Rate: ${stats.errorRate}%
- Cache Hit Rate: ${stats.averageCacheHitRate}%
- Total Metrics: ${stats.totalMetrics}

Core Web Vitals:
- LCP: ${vitals.LCP ? vitals.LCP + 'ms' : 'N/A'}
- FID: ${vitals.FID ? vitals.FID + 'ms' : 'N/A'}
- CLS: ${vitals.CLS !== null ? vitals.CLS.toFixed(3) : 'N/A'}

Recent Alerts (${stats.recentAlerts.length}):
${stats.recentAlerts.map(alert => `- [${alert.type.toUpperCase()}] ${alert.message}`).join('\n')}
    `.trim();
  }

  // Export performance data
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  // Export alerts
  exportAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  // Cleanup
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    console.log('🧹 [PerformanceMonitor] Cleaned up observers');
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export const getPerformanceMonitor = (): PerformanceMonitor => {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
};

// Export for direct use
export { PerformanceMonitor };
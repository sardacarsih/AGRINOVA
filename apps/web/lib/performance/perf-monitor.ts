'use client';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface PerformanceConfig {
  sampleRate: number;
  maxMetrics: number;
  endpoint?: string;
  enableConsoleLogging: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private config: PerformanceConfig;
  private isEnabled: boolean = true;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      sampleRate: 1.0, // 100% sampling for development
      maxMetrics: 1000,
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      ...config,
    };

    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    // Enable/disable based on user preference or sample rate
    this.isEnabled = Math.random() <= this.config.sampleRate;

    if (this.isEnabled) {
      this.setupGlobalHandlers();
      this.startPerformanceTracking();
    }
  }

  private setupGlobalHandlers() {
    // Track errors that affect performance
    window.addEventListener('error', (event) => {
      this.recordMetric('javascript.error', 1, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno.toString(),
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordMetric('promise.rejection', 1, {
        reason: event.reason?.toString() || 'unknown',
      });
    });

    // Track resource loading performance
    this.trackResourceTiming();
  }

  private trackResourceTiming() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;
          const loadTime = resource.responseEnd - resource.startTime;

          this.recordMetric('resource.load_time', loadTime, {
            type: this.getResourceType(resource.name),
            size: resource.transferSize?.toString() || 'unknown',
          });
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Resource timing not supported');
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|avif|svg)$/)) return 'image';
    if (url.includes('.woff') || url.includes('.ttf')) return 'font';
    return 'other';
  }

  private startPerformanceTracking() {
    // Track initial page load
    if (document.readyState === 'complete') {
      this.recordPageLoadMetrics();
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.recordPageLoadMetrics(), 0);
      });
    }

    // Track long tasks
    this.trackLongTasks();

    // Track memory usage (if available)
    this.trackMemoryUsage();
  }

  private recordPageLoadMetrics() {
    const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return;

    const metrics = {
      'page.dom_content_loaded': navigation.domContentLoadedEventEnd - navigation.startTime,
      'page.load_complete': navigation.loadEventEnd - navigation.startTime,
      'page.first_byte': navigation.responseStart - navigation.requestStart,
      'page.dom_interactive': navigation.domInteractive - navigation.startTime,
    };

    Object.entries(metrics).forEach(([name, value]) => {
      this.recordMetric(name, value);
    });
  }

  private trackLongTasks() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.entryType === 'longtask') {
            this.recordMetric('longtask.duration', entry.duration, {
              start_time: entry.startTime.toString(),
            });
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Long task monitoring not supported');
      }
    }
  }

  private trackMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;

      setInterval(() => {
        this.recordMetric('memory.used', memory.usedJSHeapSize, {
          total: memory.totalJSHeapSize.toString(),
          limit: memory.jsHeapSizeLimit.toString(),
        });

        this.recordMetric('memory.total', memory.totalJSHeapSize);
        this.recordMetric('memory.limit', memory.jsHeapSizeLimit);
      }, 30000); // Every 30 seconds
    }
  }

  // Public API
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);

    // Maintain max metrics limit
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics);
    }

    // Console logging for development
    if (this.config.enableConsoleLogging) {
      console.log(`📊 Performance [${name}]:`, {
        value: Math.round(value),
        tags,
        timestamp: new Date(metric.timestamp).toISOString(),
      });
    }

    // Send to analytics service if configured
    this.sendToAnalytics(metric);
  }

  private sendToAnalytics(metric: PerformanceMetric) {
    // This is where you'd send metrics to your analytics service
    // For now, we'll just store them locally
    if (this.config.endpoint && typeof navigator !== 'undefined') {
      // Use sendBeacon for reliable delivery
      navigator.sendBeacon(
        this.config.endpoint,
        JSON.stringify({
          metrics: [metric],
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now(),
        })
      );
    }
  }

  startTimer(name: string): () => number {
    const startTime = window.performance.now();

    return () => {
      const duration = window.performance.now() - startTime;
      this.recordMetric(`${name}.duration`, duration);
      return duration;
    };
  }

  measureFunction<T extends (...args: any[]) => any>(
    name: string,
    fn: T
  ): T {
    return ((...args: Parameters<T>) => {
      const timer = this.startTimer(name);
      try {
        const result = fn(...args);

        // Handle async functions
        if (result && typeof result.then === 'function') {
          return result.finally(() => {
            timer();
          });
        }

        timer();
        return result;
      } catch (error) {
        timer();
        this.recordMetric(`${name}.error`, 1);
        throw error;
      }
    }) as T;
  }

  getMetrics(name?: string): PerformanceMetric[] {
    return name
      ? this.metrics.filter(metric => metric.name === name)
      : [...this.metrics];
  }

  getMetricsByNamePattern(pattern: RegExp): PerformanceMetric[] {
    return this.metrics.filter(metric => pattern.test(metric.name));
  }

  getMetricStats(name: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return null;

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);

    return {
      count,
      avg: sum / count,
      min: values[0],
      max: values[count - 1],
      p50: values[Math.floor(count * 0.5)],
      p95: values[Math.floor(count * 0.95)],
      p99: values[Math.floor(count * 0.99)],
    };
  }

  clear() {
    this.metrics = [];
  }

  export(): string {
    return JSON.stringify({
      metrics: this.metrics,
      config: this.config,
      export_time: Date.now(),
    }, null, 2);
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  updateConfig(config: Partial<PerformanceConfig>) {
    this.config = { ...this.config, ...config };
  }
}

// Create singleton instance
export const performance = new PerformanceMonitor();

// Export utilities for common usage
export const measureRender = (componentName: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = function(...args: any[]) {
      return performance.measureFunction(
        `render.${componentName}.${propertyKey}`,
        originalMethod
      ).apply(this, args);
    };

    return descriptor;
  };
};

export const trackAPICall = (url: string, method: string = 'GET') => {
  const startTime = window.performance.now();
  const endpoint = new URL(url).pathname;

  return {
    success: (response?: Response) => {
      const duration = window.performance.now() - startTime;
      performance.recordMetric('api.request.success', duration, {
        endpoint,
        method,
        status: response?.status?.toString() || '200',
      });
    },

    error: (error: any) => {
      const duration = window.performance.now() - startTime;
      performance.recordMetric('api.request.error', duration, {
        endpoint,
        method,
        error_type: error?.name || 'unknown',
      });
    },
  };
};

export type { PerformanceMetric, PerformanceConfig };
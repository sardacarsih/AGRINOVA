'use client';

import { performance } from './perf-monitor';

// Core Web Vitals monitoring
interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  id: string;
}

interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  type: string;
}

class CoreWebVitals {
  private vitals: VitalMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private config = {
    // Core Web Vitals thresholds
    LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
    FID: { good: 100, poor: 300 },   // First Input Delay
    CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
    FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
    TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  };

  constructor() {
    this.initializeObservers();
    this.trackNavigationMetrics();
  }

  private initializeObservers() {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    this.observePerformanceEntry('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      this.recordVital('LCP', lastEntry.startTime, 'lcp');
    });

    // First Input Delay (FID)
    this.observePerformanceEntry('first-input', (entries) => {
      const firstInput = entries[0];
      const fid = firstInput.processingStart - firstInput.startTime;
      this.recordVital('FID', fid, 'fid');
    });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    this.observePerformanceEntry('layout-shift', (entries) => {
      for (const entry of entries) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      this.recordVital('CLS', clsValue, 'cls');
    });

    // First Contentful Paint (FCP)
    this.observePerformanceEntry('paint', (entries) => {
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.recordVital('FCP', fcpEntry.startTime, 'fcp');
      }
    });

    // Time to First Byte (TTFB)
    this.observeNavigation();
  }

  private observePerformanceEntry(type: string, callback: (entries: any[]) => void) {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ type, buffered: true });
      this.observers.push(observer);
    } catch (error) {
      console.warn(`Performance observer for ${type} not supported:`, error);
    }
  }

  private observeNavigation() {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          const ttfb = navEntry.responseStart - navEntry.requestStart;
          this.recordVital('TTFB', ttfb, 'ttfb');
        }
      }
    });
    observer.observe({ type: 'navigation', buffered: true });
    this.observers.push(observer);
  }

  private trackNavigationMetrics() {
    if (typeof window === 'undefined') return;

    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const loadTime = window.performance.now();
        this.recordVital('LoadTime', loadTime, 'custom');
      }, 0);
    });

    // Track route changes (for SPA navigation)
    this.trackRouteChanges();
  }

  private trackRouteChanges() {
    if (typeof window === 'undefined') return;

    // Override pushState and replaceState to track route changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      window.dispatchEvent(new Event('routechange'));
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      window.dispatchEvent(new Event('routechange'));
    };

    window.addEventListener('routechange', () => {
      window.performance.mark('route-change-start');

      requestAnimationFrame(() => {
        setTimeout(() => {
          window.performance.mark('route-change-end');
          window.performance.measure('route-change', 'route-change-start', 'route-change-end');
          const measure = window.performance.getEntriesByName('route-change')[0];
          this.recordVital('RouteChange', measure.duration, 'custom');
        }, 0);
      });
    });
  }

  private recordVital(name: string, value: number, type: string) {
    const threshold = this.config[name as keyof typeof this.config];
    let rating: 'good' | 'needs-improvement' | 'poor';

    if (threshold) {
      if (value <= threshold.good) {
        rating = 'good';
      } else if (value <= threshold.poor) {
        rating = 'needs-improvement';
      } else {
        rating = 'poor';
      }
    } else {
      // Custom metrics
      rating = 'good'; // Default for custom metrics
    }

    const vital: VitalMetric = {
      name,
      value,
      rating,
      timestamp: Date.now(),
      id: `${name}-${Date.now()}`,
    };

    this.vitals.push(vital);

    // Report to performance monitoring
    this.reportVital(vital);

    // Log for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎯 Core Web Vital [${name}]:`, {
        value: `${Math.round(value)}ms`,
        rating,
        threshold,
      });
    }
  }

  private reportVital(vital: VitalMetric) {
    // Report to performance monitoring service
    performance.recordMetric(`cwv.${vital.name.toLowerCase()}`, vital.value, {
      rating: vital.rating,
      timestamp: String(vital.timestamp),
    });

    // Report poor performance metrics
    if (vital.rating === 'poor') {
      performance.recordMetric(`cwv.poor.${vital.name.toLowerCase()}`, 1, {
        value: String(vital.value),
        timestamp: String(vital.timestamp),
      });
    }
  }

  // Public API
  getVitals(): VitalMetric[] {
    return [...this.vitals];
  }

  getVitalsByName(name: string): VitalMetric[] {
    return this.vitals.filter(vital => vital.name === name);
  }

  getLatestVital(name: string): VitalMetric | null {
    const vitals = this.getVitalsByName(name);
    return vitals.length > 0 ? vitals[vitals.length - 1] : null;
  }

  getPerformanceScore(): number {
    if (this.vitals.length === 0) return 0;

    const weights = {
      LCP: 0.25,
      FID: 0.25,
      CLS: 0.25,
      FCP: 0.15,
      TTFB: 0.1,
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const vital of this.vitals) {
      const weight = weights[vital.name as keyof typeof weights] || 0;
      if (weight > 0) {
        const score = vital.rating === 'good' ? 100 : vital.rating === 'needs-improvement' ? 50 : 0;
        totalScore += score * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  dispose() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Export singleton instance
export const coreWebVitals = new CoreWebVitals();

// Export utilities
export const useCoreWebVitals = () => {
  const getLatestVitals = () => ({
    LCP: coreWebVitals.getLatestVital('LCP'),
    FID: coreWebVitals.getLatestVital('FID'),
    CLS: coreWebVitals.getLatestVital('CLS'),
    FCP: coreWebVitals.getLatestVital('FCP'),
    TTFB: coreWebVitals.getLatestVital('TTFB'),
  });

  const getPerformanceScore = () => coreWebVitals.getPerformanceScore();

  return {
    getLatestVitals,
    getPerformanceScore,
    getAllVitals: () => coreWebVitals.getVitals(),
  };
};

export type { VitalMetric, PerformanceEntry };
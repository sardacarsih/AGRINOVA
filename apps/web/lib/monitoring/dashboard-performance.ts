'use client';

interface PerformanceMetrics {
  apiCallsCount: number;
  totalDataTransfer: number;
  avgResponseTime: number;
  refreshFrequency: number;
  tabVisibilityPauses: number;
  websocketEvents: number;
  cacheHits: number;
  lastMeasurement: Date;
}

class DashboardPerformanceMonitor {
  private metrics: PerformanceMetrics = {
    apiCallsCount: 0,
    totalDataTransfer: 0,
    avgResponseTime: 0,
    refreshFrequency: 0,
    tabVisibilityPauses: 0,
    websocketEvents: 0,
    cacheHits: 0,
    lastMeasurement: new Date(),
  };

  private responseTimes: number[] = [];
  private startTime: number = Date.now();
  private isVisible: boolean = true;

  constructor() {
    // Only setup tracking on client side
    if (typeof window !== 'undefined') {
      this.setupVisibilityTracking();
    }
  }

  private setupVisibilityTracking() {
    if (typeof document === 'undefined') return;
    
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.isVisible) {
        this.metrics.tabVisibilityPauses++;
        this.isVisible = true;
      } else if (document.hidden) {
        this.isVisible = false;
      }
    });
  }

  recordApiCall(responseTime: number, dataSize: number = 0) {
    this.metrics.apiCallsCount++;
    this.metrics.totalDataTransfer += dataSize;
    this.responseTimes.push(responseTime);
    
    // Keep only last 100 response times for average calculation
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
    
    this.metrics.avgResponseTime = 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    
    this.metrics.lastMeasurement = new Date();
  }

  recordWebSocketEvent() {
    this.metrics.websocketEvents++;
  }

  recordCacheHit() {
    this.metrics.cacheHits++;
  }

  recordRefresh() {
    const now = Date.now();
    const timeSinceStart = now - this.startTime;
    this.metrics.refreshFrequency = this.metrics.apiCallsCount / (timeSinceStart / 1000 / 60); // calls per minute
  }

  getMetrics(): PerformanceMetrics & { 
    efficiency: number;
    serverLoadReduction: number;
    userExperienceScore: number;
  } {
    const efficiency = this.metrics.cacheHits / Math.max(this.metrics.apiCallsCount, 1);
    const serverLoadReduction = Math.max(0, (60 - this.metrics.refreshFrequency) / 60); // Assume 60/min was the old frequency
    const userExperienceScore = Math.min(100, 
      (100 - this.metrics.avgResponseTime / 10) * // Response time factor
      (1 + this.metrics.tabVisibilityPauses / 10) * // Smart pausing factor
      (1 + efficiency) // Caching factor
    );

    return {
      ...this.metrics,
      efficiency: efficiency * 100,
      serverLoadReduction: serverLoadReduction * 100,
      userExperienceScore: Math.max(0, userExperienceScore),
    };
  }

  reset() {
    this.metrics = {
      apiCallsCount: 0,
      totalDataTransfer: 0,
      avgResponseTime: 0,
      refreshFrequency: 0,
      tabVisibilityPauses: 0,
      websocketEvents: 0,
      cacheHits: 0,
      lastMeasurement: new Date(),
    };
    this.responseTimes = [];
    this.startTime = Date.now();
  }

  generateReport(): string {
    const metrics = this.getMetrics();
    const runTime = Date.now() - this.startTime;
    const runTimeMinutes = Math.floor(runTime / 60000);

    return `
Dashboard Performance Report
============================
Runtime: ${runTimeMinutes} minutes
API Calls: ${metrics.apiCallsCount}
Average Response Time: ${metrics.avgResponseTime.toFixed(2)}ms
Data Transfer: ${(metrics.totalDataTransfer / 1024).toFixed(2)}KB
Refresh Frequency: ${metrics.refreshFrequency.toFixed(2)} calls/min
Tab Visibility Pauses: ${metrics.tabVisibilityPauses}
WebSocket Events: ${metrics.websocketEvents}
Cache Efficiency: ${metrics.efficiency.toFixed(1)}%
Server Load Reduction: ${metrics.serverLoadReduction.toFixed(1)}%
User Experience Score: ${metrics.userExperienceScore.toFixed(1)}/100

Performance Summary:
- ${metrics.serverLoadReduction > 50 ? '✅ Excellent' : metrics.serverLoadReduction > 20 ? '⚠️ Good' : '❌ Needs Improvement'} server load reduction
- ${metrics.efficiency > 30 ? '✅ Great' : metrics.efficiency > 10 ? '⚠️ Good' : '❌ Poor'} caching efficiency  
- ${metrics.userExperienceScore > 80 ? '✅ Excellent' : metrics.userExperienceScore > 60 ? '⚠️ Good' : '❌ Needs Work'} user experience
    `.trim();
  }
}

// Global instance
export const dashboardPerformanceMonitor = new DashboardPerformanceMonitor();

// Utility function to wrap API calls with performance monitoring
export function withPerformanceMonitoring<T>(
  apiCall: () => Promise<T>,
  estimatedDataSize: number = 0
): Promise<T> {
  const startTime = Date.now();
  
  return apiCall()
    .then(result => {
      const endTime = Date.now();
      dashboardPerformanceMonitor.recordApiCall(endTime - startTime, estimatedDataSize);
      return result;
    })
    .catch(error => {
      const endTime = Date.now();
      dashboardPerformanceMonitor.recordApiCall(endTime - startTime, 0);
      throw error;
    });
}

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  const getMetrics = () => dashboardPerformanceMonitor.getMetrics();
  const generateReport = () => dashboardPerformanceMonitor.generateReport();
  const reset = () => dashboardPerformanceMonitor.reset();

  return {
    getMetrics,
    generateReport,
    reset,
    recordWebSocketEvent: () => dashboardPerformanceMonitor.recordWebSocketEvent(),
    recordCacheHit: () => dashboardPerformanceMonitor.recordCacheHit(),
  };
}
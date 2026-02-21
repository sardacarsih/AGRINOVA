/**
 * Performance Metrics Types for Enhanced Monitoring System
 * Supports real-time system performance tracking for Super Admin users
 */

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    cores: number;
    load: number[];
  };
  memory: {
    used: number;
    total: number;
    cached: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    iops: number;
    percentage: number;
  };
  network: {
    inbound: number;
    outbound: number;
    connections: number;
  };
  database: {
    connections: {
      active: number;
      idle: number;
      max: number;
    };
    queries: {
      avgResponseTime: number;
      slowQueries: number;
      errorRate: number;
      throughput: number;
    };
    storage: {
      used: number;
      total: number;
      growth: number;
    };
  };
  webSocket: {
    connections: {
      active: number;
      peak: number;
      rejected: number;
    };
    messages: {
      sent: number;
      received: number;
      failed: number;
    };
    latency: {
      average: number;
      p95: number;
      p99: number;
    };
  };
  api: {
    performance: {
      avgResponseTime: number;
      requestsPerMinute: number;
      errorRate: number;
      throughput: number;
    };
    endpoints: {
      healthy: number;
      degraded: number;
      down: number;
    };
  };
  cache: {
    memory: {
      used: number;
      peak: number;
      fragmentation: number;
    };
    operations: {
      opsPerSecond: number;
      hitRate: number;
      keyspace: number;
      evictions: number;
    };
  };
  security: {
    failedLogins: number;
    suspiciousActivity: number;
    blockedIPs: number;
    lastSecurityScan: Date;
    activeThreats: number;
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  tags: string[];
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'acknowledge' | 'resolve' | 'escalate' | 'investigate';
  label: string;
  description: string;
  requiresAuth: boolean;
}

export interface PerformanceTrend {
  metric: string;
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  data: Array<{
    timestamp: Date;
    value: number;
  }>;
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
  prediction?: {
    nextValue: number;
    confidence: number;
  };
  anomaly: boolean;
  anomalies?: Array<{
    timestamp: Date;
    value: number;
    score: number;
  }>;
}

export interface ResourceUsagePanel {
  type: 'cpu' | 'memory' | 'disk' | 'network';
  title: string;
  currentValue: number;
  maxValue: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  status: 'healthy' | 'warning' | 'critical';
  historical: Array<{
    timestamp: Date;
    value: number;
  }>;
  thresholds: {
    warning: number;
    critical: number;
  };
}

export interface DashboardLayout {
  id: string;
  name: string;
  description: string;
  layout: Array<LayoutPanel>;
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
}

export interface LayoutPanel {
  id: string;
  type: 'system-overview' | 'resource-usage' | 'performance-trends' | 'alerts' | 'database-health' | 'api-performance';
  title: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config: {
    timeRange?: string;
    refreshInterval?: number;
    metrics?: string[];
    chartType?: 'line' | 'area' | 'bar' | 'gauge' | 'heatmap';
    showThresholds?: boolean;
    showTrends?: boolean;
  };
}

export interface MonitoringConfig {
  refreshInterval: number;
  alertThresholds: {
    cpu: { warning: number; critical: number };
    memory: { warning: number; critical: number };
    disk: { warning: number; critical: number };
    responseTime: { warning: number; critical: number };
    errorRate: { warning: number; critical: number };
  };
  dataRetention: {
    detailed: number; // days
    aggregated: number; // days
  };
  notifications: {
    email: boolean;
    sms: boolean;
    webhook: boolean;
  };
}

export interface PerformanceDashboard {
  id: string;
  title: string;
  description?: string;
  layout: DashboardLayout;
  config: MonitoringConfig;
  permissions: {
    viewRoles: string[];
    editRoles: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  lastAccessed?: Date;
  isActive: boolean;
}

// WebSocket subscription types
export interface SystemMetricsSubscriptionData {
  systemMetrics: SystemMetrics;
  alerts: PerformanceAlert[];
  trends: PerformanceTrend[];
}

export interface SystemMetricsSubscriptionVariables {
  timeRange?: string;
  metrics?: string[];
  refreshInterval?: number;
}

// GraphQL query responses
export interface SystemMetricsResponse {
  systemMetrics: SystemMetrics[];
  performanceTrends: PerformanceTrend[];
  performanceAlerts: PerformanceAlert[];
}

// Component Props Types
export interface SystemOverviewProps {
  metrics?: SystemMetrics;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  timeRange?: string;
}

export interface ResourceUsageProps {
  resource: ResourceUsagePanel;
  loading?: boolean;
  error?: string;
  showDetails?: boolean;
  onThresholdChange?: (resource: string, thresholds: any) => void;
}

export interface PerformanceTrendsProps {
  trends: PerformanceTrend[];
  loading?: boolean;
  error?: string;
  selectedMetrics?: string[];
  timeRange?: string;
  onMetricSelect?: (metric: string) => void;
  onTimeRangeChange?: (range: string) => void;
}

export interface PerformanceAlertsProps {
  alerts: PerformanceAlert[];
  loading?: boolean;
  error?: string;
  filters?: {
    severity?: string;
    type?: string;
    acknowledged?: boolean;
  };
  onAlertAction?: (alertId: string, action: string) => void;
  onFilterChange?: (filters: any) => void;
}

// Utility types
export type MetricType = keyof SystemMetrics;
export type AlertSeverity = PerformanceAlert['severity'];
export type TrendDirection = PerformanceTrend['trend'];
export type PanelType = LayoutPanel['type'];

// Chart data types
export interface ChartDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
  color?: string;
}

export interface MultiSeriesChartData {
  series: Array<{
    name: string;
    data: ChartDataPoint[];
    color?: string;
  }>;
}

// Configuration defaults
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  refreshInterval: 30000, // 30 seconds
  alertThresholds: {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    disk: { warning: 85, critical: 95 },
    responseTime: { warning: 1000, critical: 3000 }, // ms
    errorRate: { warning: 5, critical: 10 } // percentage
  },
  dataRetention: {
    detailed: 7, // 7 days
    aggregated: 90 // 90 days
  },
  notifications: {
    email: true,
    sms: false,
    webhook: false
  }
};

// Error types
export interface MonitoringError {
  type: 'connection' | 'permission' | 'data' | 'unknown';
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

// Export commonly used type guards
export const isValidSystemMetrics = (data: any): data is SystemMetrics => {
  return (
    data &&
    typeof data.timestamp === 'object' &&
    typeof data.cpu === 'object' &&
    typeof data.memory === 'object' &&
    typeof data.disk === 'object' &&
    typeof data.network === 'object'
  );
};

export const isValidPerformanceAlert = (data: any): data is PerformanceAlert => {
  return (
    data &&
    typeof data.id === 'string' &&
    ['critical', 'warning', 'info'].includes(data.type) &&
    typeof data.message === 'string' &&
    typeof data.timestamp === 'object'
  );
};
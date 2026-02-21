'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Database,
  Server,
  Wifi,
  WifiOff,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  HardDrive,
  Cpu,
  MemoryStick,
  Globe,
  Shield,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Users,
  FileText,
  MessageSquare,
  Bell,
  Download,
  Upload,
  Eye,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SystemHealthData {
  overall: {
    status: 'healthy' | 'warning' | 'critical' | 'maintenance';
    uptime: string;
    lastChecked: Date;
    version: string;
  };
  
  database: {
    status: 'connected' | 'disconnected' | 'degraded';
    connectionPool: {
      active: number;
      idle: number;
      max: number;
    };
    queryMetrics: {
      avgResponseTime: number;
      slowQueries: number;
      errorRate: number;
    };
    storage: {
      used: number;
      total: number;
      growth: number; // percentage
    };
  };
  
  redis: {
    status: 'connected' | 'disconnected' | 'degraded';
    memory: {
      used: number;
      peak: number;
      fragmentation: number;
    };
    operations: {
      opsPerSecond: number;
      hitRate: number;
      keyspace: number;
    };
  };
  
  webSocket: {
    status: 'connected' | 'disconnected' | 'degraded';
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
  };
  
  api: {
    status: 'healthy' | 'degraded' | 'down';
    performance: {
      avgResponseTime: number;
      requestsPerMinute: number;
      errorRate: number;
    };
    endpoints: {
      healthy: number;
      degraded: number;
      down: number;
    };
  };
  
  system: {
    cpu: {
      usage: number;
      cores: number;
      load: number[];
    };
    memory: {
      used: number;
      total: number;
      cached: number;
    };
    disk: {
      used: number;
      total: number;
      iops: number;
    };
    network: {
      inbound: number;
      outbound: number;
      connections: number;
    };
  };
  
  security: {
    failedLogins: number;
    suspiciousActivity: number;
    blockedIPs: number;
    lastSecurityScan: Date;
  };
  
  monitoring: {
    alerts: {
      critical: number;
      warning: number;
      info: number;
    };
    notifications: {
      sent: number;
      failed: number;
      pending: number;
    };
  };
}

interface SystemHealthMonitorProps {
  data: SystemHealthData;
  onRefresh?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
  enableSmartPolling?: boolean;
}

export function SystemHealthMonitor({
  data,
  onRefresh,
  autoRefresh = false, // Changed to false by default
  refreshInterval = 60000, // Increased to 60 seconds
  className = "",
  enableSmartPolling = true
}: SystemHealthMonitorProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Smart polling with better performance
  useEffect(() => {
    if (!autoRefresh || !onRefresh || !enableSmartPolling) return;
    
    // Only refresh if tab is visible and online
    const shouldRefresh = () => {
      return !document.hidden && navigator.onLine;
    };
    
    const performRefresh = () => {
      if (shouldRefresh()) {
        onRefresh();
        setLastRefresh(new Date());
      }
    };
    
    // Set up intelligent interval
    const interval = setInterval(performRefresh, refreshInterval);
    
    // Handle visibility change - refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && shouldRefresh()) {
        performRefresh();
      }
    };
    
    // Handle online/offline status
    const handleOnlineStatus = () => {
      if (navigator.onLine && shouldRefresh()) {
        performRefresh();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnlineStatus);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnlineStatus);
    };
  }, [autoRefresh, onRefresh, refreshInterval, enableSmartPolling]);
  
  const handleManualRefresh = async () => {
    if (!onRefresh || refreshing) return;
    
    setRefreshing(true);
    try {
      await onRefresh();
      setLastRefresh(new Date());
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'text-status-success bg-status-success-background border-status-success/20';
      case 'warning':
      case 'degraded':
        return 'text-status-warning bg-status-warning-background border-status-warning/20';
      case 'critical':
      case 'down':
      case 'disconnected':
        return 'text-status-error bg-status-error-background border-status-error/20';
      case 'maintenance':
        return 'text-status-info bg-status-info-background border-status-info/20';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return CheckCircle;
      case 'warning':
      case 'degraded':
        return AlertTriangle;
      case 'critical':
      case 'down':
      case 'disconnected':
        return XCircle;
      case 'maintenance':
        return Settings;
      default:
        return Activity;
    }
  };
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const formatPercentage = (value: number, total: number) => {
    return ((value / total) * 100).toFixed(1) + '%';
  };
  
  const getTrendIcon = (value: number, threshold: { good: number; warning: number }) => {
    if (value <= threshold.good) return TrendingUp;
    if (value <= threshold.warning) return Minus;
    return TrendingDown;
  };
  
  const getTrendColor = (value: number, threshold: { good: number; warning: number }) => {
    if (value <= threshold.good) return 'text-status-success';
    if (value <= threshold.warning) return 'text-status-warning';
    return 'text-status-error';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">System Health Monitor</h2>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-muted-foreground">
              Last updated: {lastRefresh.toLocaleString('id-ID')}
            </p>
            {enableSmartPolling && autoRefresh && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Activity className="h-3 w-3 animate-pulse text-status-success" />
                <span className="text-xs">Smart Polling Active</span>
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge className={getStatusColor(data.overall.status)}>
            {React.createElement(getStatusIcon(data.overall.status), {
              className: "h-4 w-4 mr-1"
            })}
            System {data.overall.status.charAt(0).toUpperCase() + data.overall.status.slice(1)}
          </Badge>
          
          <Button
            onClick={handleManualRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>
      
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.overall.uptime}</div>
              <p className="text-xs text-muted-foreground">
                Version {data.overall.version}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Performance</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.api.performance.avgResponseTime}ms</div>
              <p className="text-xs text-muted-foreground">
                {data.api.performance.requestsPerMinute} req/min
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.webSocket.connections.active}</div>
              <p className="text-xs text-muted-foreground">
                Peak: {data.webSocket.connections.peak}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.monitoring.alerts.critical + data.monitoring.alerts.warning}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.monitoring.alerts.critical} critical
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>Redis Cache</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Cache Status</span>
              <Badge className={getStatusColor(data.redis.status)}>
                {React.createElement(getStatusIcon(data.redis.status), {
                  className: "h-3 w-3 mr-1"
                })}
                {data.redis.status}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Memory Usage</span>
                <span className="font-medium">
                  {formatBytes(data.redis.memory.used)} (Peak: {formatBytes(data.redis.memory.peak)})
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-status-success h-2 rounded-full"
                  style={{
                    width: `${(data.redis.memory.used / data.redis.memory.peak) * 100}%`
                  }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Operations/sec</span>
                <div className="font-medium">{data.redis.operations.opsPerSecond.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Hit Rate</span>
                <div className="font-medium">{data.redis.operations.hitRate.toFixed(1)}%</div>
              </div>
              <div>
                <span className="text-muted-foreground">Keyspace</span>
                <div className="font-medium">{data.redis.operations.keyspace.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Fragmentation</span>
                <div className="font-medium">{data.redis.memory.fragmentation.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>System Resources</span>
          </CardTitle>
          <CardDescription>
            Current system resource utilization and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CPU Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">CPU Usage</span>
                </div>
                <span className="text-sm font-bold">{data.system.cpu.usage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    data.system.cpu.usage > 80 ? 'bg-status-error' :
                    data.system.cpu.usage > 60 ? 'bg-status-warning' : 'bg-status-success'
                  }`}
                  style={{ width: `${data.system.cpu.usage}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {data.system.cpu.cores} cores • Load: {data.system.cpu.load.map(l => l.toFixed(2)).join(', ')}
              </div>
            </div>

            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MemoryStick className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Memory</span>
                </div>
                <span className="text-sm font-bold">
                  {formatPercentage(data.system.memory.used, data.system.memory.total)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    (data.system.memory.used / data.system.memory.total) > 0.8 ? 'bg-status-error' :
                    (data.system.memory.used / data.system.memory.total) > 0.6 ? 'bg-status-warning' : 'bg-status-info'
                  }`}
                  style={{ width: `${(data.system.memory.used / data.system.memory.total) * 100}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {formatBytes(data.system.memory.used)} / {formatBytes(data.system.memory.total)}
              </div>
            </div>

            {/* Disk Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Disk Space</span>
                </div>
                <span className="text-sm font-bold">
                  {formatPercentage(data.system.disk.used, data.system.disk.total)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    (data.system.disk.used / data.system.disk.total) > 0.9 ? 'bg-status-error' :
                    (data.system.disk.used / data.system.disk.total) > 0.8 ? 'bg-status-warning' : 'bg-primary'
                  }`}
                  style={{ width: `${(data.system.disk.used / data.system.disk.total) * 100}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {formatBytes(data.system.disk.used)} / {formatBytes(data.system.disk.total)}
              </div>
            </div>

            {/* Network */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Network</span>
                </div>
                <span className="text-sm font-bold">{data.system.network.connections}</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    <Download className="h-3 w-3 text-status-success" />
                    <span>In</span>
                  </div>
                  <span>{formatBytes(data.system.network.inbound)}/s</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    <Upload className="h-3 w-3 text-status-info" />
                    <span>Out</span>
                  </div>
                  <span>{formatBytes(data.system.network.outbound)}/s</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {data.system.network.connections} active connections
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts & Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>System Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-status-error">
                  {data.monitoring.alerts.critical}
                </div>
                <div className="text-xs text-muted-foreground">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-status-warning">
                  {data.monitoring.alerts.warning}
                </div>
                <div className="text-xs text-muted-foreground">Warning</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-status-info">
                  {data.monitoring.alerts.info}
                </div>
                <div className="text-xs text-muted-foreground">Info</div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border">
              <div className="flex justify-between items-center text-sm">
                <span>Notifications Sent</span>
                <span className="font-medium">{data.monitoring.notifications.sent}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Failed Notifications</span>
                <span className="font-medium text-status-error">{data.monitoring.notifications.failed}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Pending</span>
                <span className="font-medium text-status-warning">{data.monitoring.notifications.pending}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Security Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Failed Login Attempts</span>
                <Badge variant={data.security.failedLogins > 10 ? "destructive" : "secondary"}>
                  {data.security.failedLogins}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Suspicious Activities</span>
                <Badge variant={data.security.suspiciousActivity > 5 ? "destructive" : "secondary"}>
                  {data.security.suspiciousActivity}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Blocked IP Addresses</span>
                <Badge variant="outline">
                  {data.security.blockedIPs}
                </Badge>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center text-sm">
                <span>Last Security Scan</span>
                <span className="font-medium">
                  {data.security.lastSecurityScan.toLocaleDateString('id-ID')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  BarChart3,
  GitBranch,
  RefreshCw,
  Settings,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePureWebSocket } from '@/lib/socket/pure-websocket-provider';
import { cn } from '@/lib/utils';

interface WebSocketStatusIndicatorProps {
  showDetails?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';
  compact?: boolean;
  onStatusClick?: (status: string) => void;
}

export function WebSocketStatusIndicator({
  showDetails = false,
  position = 'top-right',
  compact = false,
  onStatusClick
}: WebSocketStatusIndicatorProps) {
  const {
    isConnected,
    connectionState,
    connectionQuality,
    lastActivity,
    activeSubscriptions,
    forceReconnect,
    healthCheck,
    getConnectionStats
  } = usePureWebSocket();

  const [showDetailPanel, setShowDetailPanel] = useState(showDetails);
  const [healthStatus, setHealthStatus] = useState<boolean | null>(null);
  const [stats, setStats] = useState<any>({});

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      setStats(getConnectionStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [getConnectionStats]);

  // Health check on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthy = await healthCheck();
        setHealthStatus(healthy);
      } catch (error) {
        setHealthStatus(false);
      }
    };

    if (isConnected) {
      checkHealth();
    }
  }, [isConnected, healthCheck]);

  const getStatusInfo = () => {
    switch (connectionState) {
      case 'connected':
        return {
          icon: Wifi,
          label: `Live (${connectionQuality || 'good'})`,
          color: 'text-green-600',
          bgColor: 'bg-green-100 border-green-200',
          dotColor: 'bg-green-500',
          description: 'Real-time updates active'
        };
      case 'connecting':
        return {
          icon: Activity,
          label: 'Connecting...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100 border-yellow-200',
          dotColor: 'bg-yellow-500',
          description: 'Establishing connection'
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          label: 'Reconnecting...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100 border-yellow-200',
          dotColor: 'bg-yellow-500',
          description: 'Attempting to reconnect'
        };
      case 'failed':
        return {
          icon: AlertTriangle,
          label: 'Failed',
          color: 'text-red-600',
          bgColor: 'bg-red-100 border-red-200',
          dotColor: 'bg-red-500',
          description: 'Connection failed'
        };
      default:
        return {
          icon: WifiOff,
          label: 'Offline',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100 border-gray-200',
          dotColor: 'bg-gray-500',
          description: 'No real-time updates'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const IconComponent = statusInfo.icon;

  const handleStatusClick = () => {
    if (onStatusClick) {
      onStatusClick(connectionState);
    } else if (!compact) {
      setShowDetailPanel(!showDetailPanel);
    }
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
    'inline': 'relative'
  };

  if (compact) {
    return (
      <Badge 
        variant="outline"
        className={cn(
          "flex items-center gap-2 cursor-pointer transition-all hover:shadow-md",
          statusInfo.bgColor,
          statusInfo.color
        )}
        onClick={handleStatusClick}
      >
        <div className={cn("w-2 h-2 rounded-full", statusInfo.dotColor)}>
          {connectionState === 'connecting' || connectionState === 'reconnecting' ? (
            <motion.div
              className={cn("w-2 h-2 rounded-full", statusInfo.dotColor)}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          ) : null}
        </div>
        <IconComponent className="h-3 w-3" />
        <span className="text-xs font-medium">{statusInfo.label}</span>
      </Badge>
    );
  }

  return (
    <div className={positionClasses[position]}>
      {/* Status Badge */}
      <Badge 
        variant="outline"
        className={cn(
          "flex items-center gap-2 cursor-pointer transition-all hover:shadow-md p-2",
          statusInfo.bgColor,
          statusInfo.color,
          showDetailPanel && "mb-2"
        )}
        onClick={handleStatusClick}
      >
        <div className={cn("w-2 h-2 rounded-full", statusInfo.dotColor)}>
          {connectionState === 'connecting' || connectionState === 'reconnecting' ? (
            <motion.div
              className={cn("w-2 h-2 rounded-full", statusInfo.dotColor)}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          ) : null}
        </div>
        
        <IconComponent className={cn("h-4 w-4", 
          connectionState === 'reconnecting' && "animate-spin"
        )} />
        
        <div className="text-left">
          <div className="text-sm font-medium">{statusInfo.label}</div>
          {lastActivity && (
            <div className="text-xs opacity-75">
              Last: {lastActivity.toLocaleTimeString()}
            </div>
          )}
        </div>
        
        {showDetailPanel ? (
          <X className="h-3 w-3 ml-1" />
        ) : (
          <Settings className="h-3 w-3 ml-1" />
        )}
      </Badge>

      {/* Detail Panel */}
      <AnimatePresence>
        {showDetailPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="w-80 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <IconComponent className={cn("h-4 w-4", statusInfo.color)} />
                    WebSocket Status
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetailPanel(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <CardDescription>
                  {statusInfo.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Connection Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Status</div>
                    <div className={cn("font-medium", statusInfo.color)}>
                      {connectionState.charAt(0).toUpperCase() + connectionState.slice(1)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Quality</div>
                    <div className="font-medium">
                      {connectionQuality ? (
                        <span className={cn(
                          connectionQuality === 'excellent' ? 'text-green-600' :
                          connectionQuality === 'good' ? 'text-blue-600' :
                          'text-yellow-600'
                        )}>
                          {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}
                        </span>
                      ) : (
                        <span className="text-gray-500">Unknown</span>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Connection Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Uptime
                    </div>
                    <div className="font-mono">
                      {stats.uptime ? formatUptime(stats.uptime) : '0s'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GitBranch className="h-3 w-3" />
                      Active Channels
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {activeSubscriptions.length}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BarChart3 className="h-3 w-3" />
                      Messages
                    </div>
                    <div className="font-mono">
                      {stats.messagesReceived || 0}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <RefreshCw className="h-3 w-3" />
                      Reconnections
                    </div>
                    <div className="font-mono">
                      {stats.reconnections || 0}
                    </div>
                  </div>
                </div>

                {/* Health Status */}
                {healthStatus !== null && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-muted-foreground">Health Check</div>
                      <div className="flex items-center gap-1">
                        {healthStatus ? (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-green-600 font-medium">Healthy</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                            <span className="text-red-600 font-medium">Unhealthy</span>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Active Channels */}
                {activeSubscriptions.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Subscribed Channels</div>
                      <div className="flex flex-wrap gap-1">
                        {activeSubscriptions.map((channel, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="text-xs px-2 py-0"
                          >
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Actions */}
                <Separator />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={forceReconnect}
                    disabled={connectionState === 'connecting' || connectionState === 'reconnecting'}
                    className="flex-1 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reconnect
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => healthCheck().then(healthy => 
                      setHealthStatus(healthy)
                    )}
                    className="flex-1 text-xs"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Check Health
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WebSocketStatusIndicator;
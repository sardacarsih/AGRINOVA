'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud,
  CloudOff,
  RotateCcw,
  CheckCircle,
  CircleAlert,
  WifiOff,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { harvestStorage } from '@/lib/services/harvest-storage';
import { SyncStatus } from '@/types/harvest';

interface SyncStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
  onSync?: () => void;
}

export function SyncStatusIndicator({ 
  showDetails = false, 
  className,
  onSync 
}: SyncStatusIndicatorProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Update sync status
  const updateSyncStatus = () => {
    const status = harvestStorage.getSyncStatus();
    setSyncStatus(status);
    setIsOnline(status.isConnected);
  };

  // Handle online/offline events
  useEffect(() => {
    updateSyncStatus();

    const handleOnline = () => {
      setIsOnline(true);
      updateSyncStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateSyncStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update status periodically
    const interval = setInterval(updateSyncStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Handle manual sync
  const handleSync = async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      const result = await harvestStorage.syncToServer();
      updateSyncStatus();
      
      if (onSync) {
        onSync();
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!syncStatus) return null;

  // Get status icon and color
  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Offline'
      };
    }

    if (isSyncing || syncStatus.isSyncing) {
      return {
        icon: RefreshCw,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        label: 'Syncing...'
      };
    }

    if (syncStatus.syncError) {
      return {
        icon: CircleAlert,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Sync Error'
      };
    }

    if (syncStatus.pendingSync > 0) {
      return {
        icon: Clock,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: 'Pending Sync'
      };
    }

    return {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'Synced'
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  if (!showDetails) {
    // Compact indicator
    return (
      <div className={cn('fixed bottom-4 right-4 z-50', className)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'flex items-center space-x-2 px-3 py-2 rounded-full border shadow-lg backdrop-blur-sm',
            statusConfig.bgColor,
            statusConfig.borderColor
          )}
        >
          <StatusIcon 
            className={cn('h-4 w-4', statusConfig.color, {
              'animate-spin': isSyncing || syncStatus.isSyncing
            })} 
          />
          <span className={cn('text-sm font-medium', statusConfig.color)}>
            {statusConfig.label}
          </span>
          {syncStatus.pendingSync > 0 && (
            <Badge variant="secondary" className="ml-1">
              {syncStatus.pendingSync}
            </Badge>
          )}
        </motion.div>
      </div>
    );
  }

  // Detailed indicator
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full',
              statusConfig.bgColor,
              statusConfig.borderColor,
              'border'
            )}>
              <StatusIcon 
                className={cn('h-5 w-5', statusConfig.color, {
                  'animate-spin': isSyncing || syncStatus.isSyncing
                })} 
              />
            </div>
            
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-foreground">{statusConfig.label}</h4>
                {syncStatus.pendingSync > 0 && (
                  <Badge variant="secondary">
                    {syncStatus.pendingSync} pending
                  </Badge>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground">
                {!isOnline && 'No internet connection'}
                {isOnline && syncStatus.syncError && syncStatus.syncError}
                {isOnline && !syncStatus.syncError && syncStatus.lastSyncAt && (
                  `Last sync: ${new Date(syncStatus.lastSyncAt).toLocaleTimeString()}`
                )}
                {isOnline && !syncStatus.syncError && !syncStatus.lastSyncAt && 
                  'Ready to sync'
                }
              </div>
            </div>
          </div>

          {/* Sync button */}
          <AnimatePresence>
            {isOnline && !isSyncing && !syncStatus.isSyncing && syncStatus.pendingSync > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing || syncStatus.isSyncing}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Sync Now
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Connection status */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Cloud className="h-4 w-4 text-green-500" />
              ) : (
                <CloudOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-muted-foreground">
                {isOnline ? 'Connected' : 'Offline Mode'}
              </span>
            </div>
            
            {syncStatus.pendingSync > 0 && (
              <span className="text-muted-foreground">
                {syncStatus.pendingSync} items waiting to sync
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
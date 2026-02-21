'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LucideIcon,
  Clock,
  CheckCircle,
  XCircle,
  CircleAlert,
  Info,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export interface ActivityItem {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  metadata?: Record<string, any>;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline';
  }>;
  priority?: 'low' | 'medium' | 'high';
}

export interface ActivityFeedProps {
  title: string;
  description?: string;
  activities: ActivityItem[];
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

export function ActivityFeed({
  title,
  description,
  activities,
  maxItems = 5,
  showViewAll = true,
  onViewAll,
  onRefresh,
  loading = false,
  className,
}: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'warning':
        return CircleAlert;
      case 'error':
        return XCircle;
      case 'info':
        return Info;
      default:
        return Clock;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'success':
        return 'text-status-success bg-status-success-background';
      case 'warning':
        return 'text-status-warning bg-status-warning-background';
      case 'error':
        return 'text-status-error bg-status-error-background';
      case 'info':
        return 'text-status-info bg-status-info-background';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getPriorityColor = (priority: ActivityItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-status-error';
      case 'medium':
        return 'border-l-status-warning';
      case 'low':
        return 'border-l-status-success';
      default:
        return 'border-l-border';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded w-32 animate-pulse" />
              <div className="h-4 bg-muted rounded w-48 animate-pulse" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          <AnimatePresence>
            {displayActivities.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-sm">Belum ada aktivitas</p>
              </div>
            ) : (
              <div className="space-y-0">
                {displayActivities.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type);
                  const isLast = index === displayActivities.length - 1;

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={cn(
                        'relative p-4 border-l-4 hover:bg-muted/50 transition-colors',
                        getPriorityColor(activity.priority),
                        !isLast && 'border-b border-border'
                      )}
                    >
                      {/* Timeline connector */}
                      {!isLast && (
                        <div className="absolute left-0 top-12 bottom-0 w-px bg-border" />
                      )}

                      <div className="flex items-start space-x-3">
                        {/* Activity icon */}
                        <div className={cn('p-2 rounded-full', getActivityColor(activity.type))}>
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Activity content */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {activity.title}
                              </p>
                              {activity.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {activity.description}
                                </p>
                              )}
                              
                              {/* User info */}
                              {activity.user && (
                                <div className="flex items-center space-x-2 mt-2">
                                  {activity.user.avatar ? (
                                    <img
                                      src={activity.user.avatar}
                                      alt={activity.user.name}
                                      className="h-5 w-5 rounded-full"
                                    />
                                  ) : (
                                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                                      <span className="text-xs text-muted-foreground">
                                        {activity.user.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {activity.user.name}
                                    {activity.user.role && ` • ${activity.user.role}`}
                                  </span>
                                </div>
                              )}

                              {/* Metadata */}
                              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {Object.entries(activity.metadata).map(([key, value]) => (
                                    <Badge key={key} variant="outline" className="text-xs">
                                      {key}: {String(value)}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Timestamp */}
                              <p className="text-xs text-muted-foreground/80 mt-2">
                                {formatRelativeTime(activity.timestamp)}
                                {' • '}
                                {formatDate(activity.timestamp, { 
                                  timeStyle: 'short', 
                                  dateStyle: 'short' 
                                })}
                              </p>
                            </div>

                            {/* Actions */}
                            {activity.actions && activity.actions.length > 0 && (
                              <div className="flex items-center space-x-2 ml-4">
                                {activity.actions.slice(0, 2).map((action, actionIndex) => (
                                  <Button
                                    key={actionIndex}
                                    size="sm"
                                    variant={action.variant || 'outline'}
                                    onClick={action.onClick}
                                    className="h-7 px-2 text-xs"
                                  >
                                    {action.label}
                                  </Button>
                                ))}
                                {activity.actions.length > 2 && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {activity.actions.slice(2).map((action, actionIndex) => (
                                        <DropdownMenuItem 
                                          key={actionIndex}
                                          onClick={action.onClick}
                                        >
                                          {action.label}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* View All Button */}
        {showViewAll && activities.length > maxItems && (
          <div className="p-4 border-t border-border">
            <Button
              variant="outline"
              onClick={onViewAll}
              className="w-full"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              Lihat Semua ({activities.length} aktivitas)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActivityFeed;
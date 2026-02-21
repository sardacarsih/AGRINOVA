'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'stable';
    period?: string;
  };
  trend?: {
    data: number[];
    color?: string;
  };
  status?: {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  className?: string;
  priority?: 'normal' | 'high' | 'critical';
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  change,
  trend,
  status,
  className,
  priority = 'normal',
  loading = false,
  onClick,
}: StatCardProps) {
  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-8 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
            <div className="h-12 w-12 bg-muted rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const priorityStyles = {
    normal: '',
    high: 'ring-2 ring-status-warning/30 border-status-warning/50',
    critical: 'ring-2 ring-status-error/30 border-status-error/50 bg-status-error-background',
  };

  const getTrendIcon = () => {
    if (!change) return null;

    switch (change.type) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-status-success" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-status-error" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getChangeColor = () => {
    if (!change) return '';

    switch (change.type) {
      case 'increase':
        return 'text-status-success';
      case 'decrease':
        return 'text-status-error';
      case 'stable':
        return 'text-muted-foreground';
      default:
        return '';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: onClick ? 1.02 : 1 }}
      whileTap={{ scale: onClick ? 0.98 : 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          'relative overflow-hidden transition-all duration-200 hover:shadow-md',
          priorityStyles[priority],
          onClick && 'cursor-pointer hover:shadow-lg',
          className
        )}
        onClick={onClick}
      >
        {/* Priority indicator */}
        {priority !== 'normal' && (
          <div
            className={cn(
              'absolute top-0 left-0 w-full h-1',
              priority === 'high' && 'bg-status-warning',
              priority === 'critical' && 'bg-status-error'
            )}
          />
        )}

        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-1">
              {/* Title and Status */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                {status && (
                  <Badge variant={status.variant} className="text-xs">
                    {status.label}
                  </Badge>
                )}
              </div>

              {/* Value */}
              <div className="flex items-baseline space-x-2">
                <p className="text-2xl font-bold text-foreground">{value}</p>
                {change && (
                  <div className="flex items-center space-x-1">
                    {getTrendIcon()}
                    <span className={cn('text-sm font-medium', getChangeColor())}>
                      {change.value}%
                    </span>
                  </div>
                )}
              </div>

              {/* Description and Change Period */}
              <div className="space-y-1">
                {description && (
                  <p className="text-xs text-muted-foreground">{description}</p>
                )}
                {change?.period && (
                  <p className="text-xs text-muted-foreground/80">{change.period}</p>
                )}
              </div>

              {/* Mini Trend Chart */}
              {trend && (
                <div className="mt-3">
                  <div className="flex items-end space-x-1 h-8">
                    {trend.data.slice(-8).map((point, index) => {
                      const maxValue = Math.max(...trend.data);
                      const height = (point / maxValue) * 100;
                      return (
                        <div
                          key={index}
                          className={cn(
                            'flex-1 rounded-t-sm',
                            trend.color || 'bg-primary/30'
                          )}
                          style={{ height: `${height}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Icon */}
            <div className="ml-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default StatCard;
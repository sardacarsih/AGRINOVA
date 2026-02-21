'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  color?: 'default' | 'primary' | 'secondary' | 'destructive' | 'success';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
}

export interface ActionGridProps {
  title: string;
  description?: string;
  actions: ActionItem[];
  columns?: number;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function ActionGrid({
  title,
  description,
  actions,
  columns = 4,
  size = 'medium',
  className,
}: ActionGridProps) {
  const getActionColor = (color: ActionItem['color'], disabled?: boolean) => {
    if (disabled) {
      return 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed';
    }
    
    switch (color) {
      case 'primary':
        return 'bg-green-600 hover:bg-green-700 text-white border-green-600';
      case 'secondary':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600';
      case 'destructive':
        return 'bg-red-600 hover:bg-red-700 text-white border-red-600';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600';
      default:
        return 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getActionSize = (actionSize: ActionItem['size']) => {
    const globalSize = actionSize || size;
    switch (globalSize) {
      case 'small':
        return 'h-16 p-3';
      case 'large':
        return 'h-24 p-6';
      default:
        return 'h-20 p-4';
    }
  };

  const getIconSize = (actionSize: ActionItem['size']) => {
    const globalSize = actionSize || size;
    switch (globalSize) {
      case 'small':
        return 'h-4 w-4';
      case 'large':
        return 'h-8 w-8';
      default:
        return 'h-6 w-6';
    }
  };

  const getGridColumns = () => {
    switch (columns) {
      case 2:
        return 'grid-cols-1 sm:grid-cols-2';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      case 5:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';
      case 6:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6';
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className={cn('grid gap-4', getGridColumns())}>
          {actions.map((action, index) => {
            const Icon = action.icon;
            
            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: action.disabled ? 1 : 1.02 }}
                whileTap={{ scale: action.disabled ? 1 : 0.98 }}
              >
                <Button
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  className={cn(
                    'relative w-full flex flex-col items-center justify-center space-y-2 transition-all duration-200',
                    getActionSize(action.size),
                    getActionColor(action.color, action.disabled || action.loading)
                  )}
                  variant="outline"
                >
                  {/* Badge */}
                  {action.badge && !action.disabled && (
                    <Badge
                      variant={action.badge.variant || 'default'}
                      className="absolute -top-2 -right-2 h-5 px-1.5 text-xs"
                    >
                      {action.badge.label}
                    </Badge>
                  )}

                  {/* Loading state */}
                  {action.loading ? (
                    <>
                      <div className={cn('animate-spin rounded-full border-2 border-gray-300 border-t-gray-600', getIconSize(action.size))} />
                      <span className="text-xs font-medium">Loading...</span>
                    </>
                  ) : (
                    <>
                      {/* Icon */}
                      <Icon className={getIconSize(action.size)} />
                      
                      {/* Title */}
                      <span className="text-xs font-medium text-center leading-tight">
                        {action.title}
                      </span>
                      
                      {/* Description for larger sizes */}
                      {action.description && (size === 'large' || action.size === 'large') && (
                        <span className="text-xs text-gray-500 text-center leading-tight">
                          {action.description}
                        </span>
                      )}
                    </>
                  )}

                  {/* Arrow indicator for navigation actions */}
                  {action.color === 'default' && !action.disabled && !action.loading && (
                    <ChevronRight className="absolute top-2 right-2 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Empty state */}
        {actions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Tidak ada aksi tersedia</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActionGrid;
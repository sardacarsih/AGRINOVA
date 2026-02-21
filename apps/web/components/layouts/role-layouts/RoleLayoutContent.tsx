'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

interface RoleLayoutContentProps {
  children: React.ReactNode;
  statusLabel?: string;
  statusVariant?: BadgeVariant;
  orbPrimaryClass: string;
  orbSecondaryClass: string;
  dotClass?: string;
  maxWidthClass?: string;
  contentPaddingClass?: string;
  showStatus?: boolean;
  showDate?: boolean;
}

export function RoleLayoutContent({
  children,
  statusLabel,
  statusVariant = 'info',
  orbPrimaryClass,
  orbSecondaryClass,
  dotClass = 'bg-status-info',
  maxWidthClass = 'max-w-7xl',
  contentPaddingClass = 'p-4 sm:p-6 lg:p-8',
  showStatus = false,
  showDate = false,
}: RoleLayoutContentProps) {
  const formattedDate = React.useMemo(() => {
    if (!showDate) return '';

    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  }, [showDate]);

  return (
    <motion.main
      className="relative min-h-screen flex-1 overflow-auto bg-background"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute -left-20 top-0 h-72 w-72 rounded-full blur-3xl ${orbPrimaryClass}`} />
        <div className={`absolute bottom-0 right-0 h-80 w-80 rounded-full blur-3xl ${orbSecondaryClass}`} />
      </div>

      <div className={`relative mx-auto ${contentPaddingClass} ${maxWidthClass}`}>
        <div className="space-y-6">
          {showStatus && statusLabel && (
            <Card className="hidden border-border/60 bg-card/80 shadow-sm backdrop-blur-sm lg:block">
              <CardContent className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full animate-pulse ${dotClass}`} />
                  <Badge variant={statusVariant}>{statusLabel}</Badge>
                </div>

                {showDate && <p className="text-xs text-muted-foreground">{formattedDate}</p>}
              </CardContent>
            </Card>
          )}

          {children}
        </div>
      </div>
    </motion.main>
  );
}

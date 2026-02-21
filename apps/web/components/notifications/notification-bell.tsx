'use client';

import * as React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/lib/notifications/notification-provider';
import { NotificationCenter } from './notification-center';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <div className={`relative ${className}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className="relative p-2 hover:bg-gray-100 rounded-full"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs min-w-[20px] rounded-full"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      <NotificationCenter isOpen={isOpen} onClose={handleClose} />
    </>
  );
}

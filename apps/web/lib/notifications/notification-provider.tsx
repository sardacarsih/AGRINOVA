'use client';

import { createContext, useContext, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useAuth } from '@/hooks/use-auth';
import {
  GET_NOTIFICATIONS,
  GET_UNREAD_NOTIFICATION_COUNT,
  MARK_ALL_NOTIFICATIONS_AS_READ,
  MARK_NOTIFICATION_AS_READ,
} from '@/lib/graphql/notifications';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  source?: 'server';
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  refreshNotifications: () => void;
  showSuccess: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  removeNotification: () => {},
  clearNotifications: () => {},
  refreshNotifications: () => {},
  showSuccess: () => {},
  showWarning: () => {},
  showError: () => {},
  showInfo: () => {},
});

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  const {
    data: notificationsData,
    refetch: refetchNotifications,
  } = useQuery(GET_NOTIFICATIONS, {
    skip: !isAuthenticated,
    variables: {
      filter: { unreadOnly: true },
      limit: 50,
      offset: 0,
      orderBy: 'created_at DESC',
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000,
  });

  const {
    data: unreadCountData,
    refetch: refetchUnreadCount,
  } = useQuery(GET_UNREAD_NOTIFICATION_COUNT, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000,
  });

  const [markNotificationAsRead] = useMutation(MARK_NOTIFICATION_AS_READ);
  const [markAllNotificationsAsRead] = useMutation(MARK_ALL_NOTIFICATIONS_AS_READ);

  const serverNotifications: Notification[] = useMemo(() => {
    const records = (notificationsData as any)?.notifications ?? [];
    return records.map((item: any) => {
      const priority = String(item?.priority || '').toUpperCase();
      const typeRaw = String(item?.type || '').toUpperCase();

      let type: Notification['type'] = 'info';
      if (priority === 'CRITICAL') type = 'error';
      else if (priority === 'HIGH') type = 'warning';
      else if (typeRaw.includes('REJECT')) type = 'warning';
      else if (typeRaw.includes('APPROVED')) type = 'success';

      return {
        id: String(item?.id || Math.random().toString(36).slice(2)),
        title: String(item?.title || 'Notifikasi'),
        message: String(item?.message || ''),
        type,
        timestamp: item?.createdAt ? new Date(item.createdAt) : new Date(),
        source: 'server' as const,
      };
    });
  }, [notificationsData]);

  const notifications = useMemo(() => serverNotifications, [serverNotifications]);

  const unreadCount = useMemo(() => {
    const serverUnread = Number((unreadCountData as any)?.unreadNotificationCount ?? serverNotifications.length);
    return serverUnread;
  }, [unreadCountData, serverNotifications.length]);

  const addNotification = (_notification: Omit<Notification, 'id' | 'timestamp'>) => {
    if (!isAuthenticated) return;
    void refetchNotifications();
    void refetchUnreadCount();
  };

  const removeNotification = (id: string) => {
    if (!isAuthenticated) return;

    void markNotificationAsRead({ variables: { id } })
      .finally(() => {
        void refetchNotifications();
        void refetchUnreadCount();
      });
  };

  const clearNotifications = () => {
    if (!isAuthenticated) return;

    void markAllNotificationsAsRead()
      .finally(() => {
        void refetchNotifications();
        void refetchUnreadCount();
      });
  };

  const refreshNotifications = () => {
    if (!isAuthenticated) return;
    void refetchNotifications();
    void refetchUnreadCount();
  };

  // Convenience methods for different notification types
  const showSuccess = (title: string, message: string) => {
    addNotification({ title, message, type: 'success' });
  };

  const showWarning = (title: string, message: string) => {
    addNotification({ title, message, type: 'warning' });
  };

  const showError = (title: string, message: string) => {
    addNotification({ title, message, type: 'error' });
  };

  const showInfo = (title: string, message: string) => {
    addNotification({ title, message, type: 'info' });
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount,
        addNotification, 
        removeNotification, 
        clearNotifications,
        refreshNotifications,
        showSuccess,
        showWarning,
        showError,
        showInfo
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

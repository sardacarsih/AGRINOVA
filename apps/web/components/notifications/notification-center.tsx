'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle, AlertTriangle, Info, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications } from '@/lib/notifications/notification-provider';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertTriangle,
} as const;

const typeColors = {
  info: 'text-blue-600 bg-blue-100',
  success: 'text-green-600 bg-green-100',
  warning: 'text-yellow-600 bg-yellow-100',
  error: 'text-red-600 bg-red-100',
} as const;

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Baru saja';
  if (diffInMinutes < 60) return `${diffInMinutes} menit yang lalu`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} jam yang lalu`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} hari yang lalu`;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, removeNotification, clearNotifications } = useNotifications();

  const markAsRead = (id: string) => {
    removeNotification(id);
  };

  const markAllAsRead = () => {
    clearNotifications();
  };

  const clearNotification = (id: string) => {
    removeNotification(id);
  };

  const clearAll = () => {
    clearNotifications();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 overflow-hidden"
          >
            <Card className="h-full rounded-none border-0 shadow-none">
              <CardHeader className="border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="h-5 w-5 text-gray-600" />
                    <CardTitle className="text-lg">Notifikasi</CardTitle>
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={markAllAsRead}
                      className="w-fit text-xs"
                    >
                      Tandai semua dibaca
                    </Button>
                  )}
                  {notifications.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAll}
                      className="w-fit text-xs"
                    >
                      Hapus semua
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0 h-full overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Bell className="h-12 w-12 mb-4 opacity-40" />
                    <p className="text-sm">Tidak ada notifikasi</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((notification) => {
                      const IconComponent = typeIcons[notification.type];

                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors bg-blue-50 border-l-4 border-l-blue-500"
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-full ${typeColors[notification.type]}`}>
                              <IconComponent className="h-4 w-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {notification.title}
                                </h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => clearNotification(notification.id)}
                                  className="h-6 w-6 p-0 hover:bg-gray-200"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>

                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {notification.message}
                              </p>

                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center text-xs text-gray-500">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTimeAgo(new Date(notification.timestamp))}
                                </div>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="h-6 text-xs px-2"
                                >
                                  Tandai dibaca
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

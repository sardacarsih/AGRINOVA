'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications } from '@/lib/notifications/notification-provider';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  CircleAlert,
  Zap,
  RefreshCw
} from 'lucide-react';

export function NotificationTest() {
  const {
    showSuccess,
    showWarning,
    showError,
    showInfo,
    notifications,
    clearNotifications
  } = useNotifications();

  // Compute unread count from notifications
  const unreadCount = notifications.length;

  // Refetch is not available in current context, use clearNotifications as reset
  const handleRefresh = () => {
    clearNotifications();
  };

  const handleTestSuccess = () => {
    showSuccess(
      "Panen Disetujui", 
      "Data panen dari Mandor Budi di Blok A-123 telah disetujui"
    );
  };

  const handleTestWarning = () => {
    showWarning(
      "Persetujuan Diperlukan", 
      "Data panen baru menunggu persetujuan Asisten"
    );
  };

  const handleTestError = () => {
    showError(
      "Panen Ditolak", 
      "Data panen ditolak: Berat TBS tidak sesuai standar"
    );
  };

  const handleTestInfo = () => {
    showInfo(
      "Info Sistem", 
      "Sistem backup sedang berjalan, estimasi selesai 10 menit"
    );
  };

  const handleTestCritical = () => {
    showError(
      "Peringatan Kritis", 
      "Koneksi ke sistem PKS terputus, segera hubungi IT Support"
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Test Sistem Notifikasi
        </CardTitle>
        <CardDescription>
          Test komponen notifikasi real-time untuk MANDOR ↔ ASISTEN workflow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Status Notifikasi</span>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <span>{unreadCount}</span>
                <span className="text-xs">belum dibaca</span>
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span className="text-xs">Semua terbaca</span>
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Summary Info */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-blue-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{unreadCount}</div>
            <div className="text-xs text-blue-700">Total Notifikasi</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{notifications.filter(n => n.type === 'warning').length}</div>
            <div className="text-xs text-orange-700">Peringatan</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{notifications.filter(n => n.type === 'error').length}</div>
            <div className="text-xs text-red-700">Error</div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Test Toast Notifications:</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleTestSuccess}
              variant="outline"
              className="flex items-center gap-2 border-green-200 hover:bg-green-50"
            >
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-green-700">Panen Disetujui</span>
            </Button>

            <Button
              onClick={handleTestWarning}
              variant="outline"
              className="flex items-center gap-2 border-orange-200 hover:bg-orange-50"
            >
              <Zap className="h-4 w-4 text-orange-600" />
              <span className="text-orange-700">Perlu Persetujuan</span>
            </Button>

            <Button
              onClick={handleTestError}
              variant="outline"
              className="flex items-center gap-2 border-red-200 hover:bg-red-50"
            >
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-red-700">Panen Ditolak</span>
            </Button>

            <Button
              onClick={handleTestInfo}
              variant="outline"
              className="flex items-center gap-2 border-blue-200 hover:bg-blue-50"
            >
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700">Info Sistem</span>
            </Button>
          </div>

          <Button
            onClick={handleTestCritical}
            variant="destructive"
            className="w-full flex items-center gap-2"
          >
            <CircleAlert className="h-4 w-4" />
            Test Notifikasi Kritis
          </Button>
        </div>

        {/* Instructions */}
        <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
          <p className="font-medium mb-1">Cara Test:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Klik tombol untuk trigger toast notification</li>
            <li>Check notification bell di topbar untuk unread count</li>
            <li>Click bell untuk buka notification center</li>
            <li>Verify real-time WebSocket connections</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
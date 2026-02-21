'use client';

import React, { useState } from 'react';
import { useSubscription } from '@apollo/client/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  RefreshCw,
  Bell,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  MessageCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { MandorDashboardLayout } from '@/components/layouts/role-layouts/MandorDashboardLayout';
import {
  HARVEST_RECORD_APPROVED,
  HARVEST_RECORD_REJECTED,
  type HarvestRecord
} from '@/lib/apollo/queries/harvest';

type ViewMode = 'overview' | 'pending' | 'history' | 'analytics';

interface ApprovalItem {
  id: string;
  submittedAt: string;
  block: string;
  team: string;
  totalWeight: number;
  workersCount: number;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  notes?: string;
  priority: 'high' | 'medium' | 'low';
  daysWaiting: number;
}

interface ApprovalStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  averageApprovalTime: number;
  approvalRate: number;
  quickestApproval: number;
  slowestApproval: number;
}

const mockApprovalData: ApprovalItem[] = [
  {
    id: 'A001',
    submittedAt: '2024-01-15T08:30:00',
    block: 'A-15',
    team: 'Tim Alpha',
    totalWeight: 1250,
    workersCount: 8,
    status: 'pending',
    priority: 'high',
    daysWaiting: 1,
    notes: 'Data lengkap, butuh review segera'
  },
  {
    id: 'A002',
    submittedAt: '2024-01-14T15:45:00',
    block: 'B-08',
    team: 'Tim Beta',
    totalWeight: 980,
    workersCount: 7,
    status: 'approved',
    approvedBy: 'Asisten Budi',
    approvedAt: '2024-01-14T16:30:00',
    priority: 'medium',
    daysWaiting: 0
  },
  {
    id: 'A003',
    submittedAt: '2024-01-13T10:15:00',
    block: 'C-12',
    team: 'Tim Gamma',
    totalWeight: 750,
    workersCount: 6,
    status: 'rejected',
    rejectedBy: 'Asisten Candra',
    rejectedAt: '2024-01-13T17:00:00',
    rejectedReason: 'Data kategori TBS tidak lengkap, perlu input ulang',
    priority: 'medium',
    daysWaiting: 0
  },
  {
    id: 'A004',
    submittedAt: '2024-01-15T14:20:00',
    block: 'D-05',
    team: 'Tim Delta',
    totalWeight: 890,
    workersCount: 7,
    status: 'pending',
    priority: 'medium',
    daysWaiting: 1
  },
  {
    id: 'A005',
    submittedAt: '2024-01-12T11:30:00',
    block: 'A-20',
    team: 'Tim Alpha',
    totalWeight: 1180,
    workersCount: 8,
    status: 'approved',
    approvedBy: 'Asisten Eko',
    approvedAt: '2024-01-12T16:45:00',
    priority: 'low',
    daysWaiting: 0
  }
];

const mockStats: ApprovalStats = {
  totalPending: 2,
  totalApproved: 23,
  totalRejected: 3,
  averageApprovalTime: 4.2,
  approvalRate: 88.5,
  quickestApproval: 0.5,
  slowestApproval: 12
};

export function ApprovalsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'info' | 'warning';
    timestamp: Date;
  }>>([]);

  // WebSocket subscriptions for real-time approval updates
  useSubscription<{ harvestRecordApproved: HarvestRecord }>(HARVEST_RECORD_APPROVED, {
    onData: ({ data }) => {
      const approvedRecord = data?.data?.harvestRecordApproved;
      if (approvedRecord && approvedRecord.mandorId === user?.id) {
        const notification = {
          id: Date.now().toString(),
          message: `Data panen Anda untuk blok ${approvedRecord.block?.blockCode} telah disetujui`,
          type: 'success' as const,
          timestamp: new Date(),
        };
        setNotifications(prev => [notification, ...prev.slice(0, 4)]);

        toast({
          title: "Data Panen Disetujui!",
          description: `Blok ${approvedRecord.block?.blockCode} - ${approvedRecord.beratTbs.toFixed(2)} kg`,
        });
      }
    },
  });

  useSubscription<{ harvestRecordRejected: HarvestRecord }>(HARVEST_RECORD_REJECTED, {
    onData: ({ data }) => {
      const rejectedRecord = data?.data?.harvestRecordRejected;
      if (rejectedRecord && rejectedRecord.mandorId === user?.id) {
        const notification = {
          id: Date.now().toString(),
          message: `Data panen Anda untuk blok ${rejectedRecord.block?.blockCode} ditolak: ${rejectedRecord.rejectedReason}`,
          type: 'warning' as const,
          timestamp: new Date(),
        };
        setNotifications(prev => [notification, ...prev.slice(0, 4)]);

        toast({
          title: "Data Panen Ditolak",
          description: rejectedRecord.rejectedReason,
          variant: "destructive",
        });
      }
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleViewDetail = (approvalId: string) => {
    toast({
      title: "Detail Approval",
      description: `Melihat detail approval ${approvalId}`,
    });
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Approval Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Pending</div>
                <div className="text-2xl font-bold">{mockStats.totalPending}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Disetujui</div>
                <div className="text-2xl font-bold">{mockStats.totalApproved}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Ditolak</div>
                <div className="text-2xl font-bold">{mockStats.totalRejected}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Approval Rate</div>
                <div className="text-2xl font-bold">{mockStats.approvalRate}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Metrik Performa Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{mockStats.averageApprovalTime}h</div>
              <div className="text-sm text-blue-600">Rata-rata Waktu Approval</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{mockStats.quickestApproval}h</div>
              <div className="text-sm text-green-600">Approval Tercepat</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">{mockStats.slowestApproval}h</div>
              <div className="text-sm text-orange-600">Approval Terlama</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Aksi Cepat Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              onClick={() => setViewMode('pending')}
              className="h-20 bg-yellow-600 hover:bg-yellow-700"
              size="lg"
            >
              <div className="flex flex-col items-center gap-2">
                <Clock className="h-6 w-6" />
                <span className="text-center">Pending<br />Approval</span>
              </div>
            </Button>

            <Button
              onClick={() => setViewMode('history')}
              variant="outline"
              className="h-20"
              size="lg"
            >
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-6 w-6" />
                <span className="text-center">Riwayat<br />Approval</span>
              </div>
            </Button>

            <Button
              onClick={() => setViewMode('analytics')}
              variant="outline"
              className="h-20"
              size="lg"
            >
              <div className="flex flex-col items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                <span className="text-center">Analisis<br />Performa</span>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-20"
              size="lg"
              onClick={() => {
                toast({
                  title: "Notifikasi",
                  description: "Fitur pengaturan notifikasi akan segera tersedia",
                });
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <Bell className="h-6 w-6" />
                <span className="text-center">Pengaturan<br />Notifikasi</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Priority Items */}
      {mockApprovalData.filter(item => item.status === 'pending' && item.priority === 'high').length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Approval Prioritas Tinggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockApprovalData
                .filter(item => item.status === 'pending' && item.priority === 'high')
                .map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <div className="font-medium">{item.team} - Blok {item.block}</div>
                        <div className="text-sm text-gray-500">
                          Menunggu {item.daysWaiting} hari • {item.totalWeight}kg
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetail(item.id)}
                      className="border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              Notifikasi Approval Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notification) => (
                <Alert key={notification.id}>
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-start justify-between">
                      <span className="text-sm">{notification.message}</span>
                      <Badge variant="outline" className="text-xs ml-2">
                        {notification.timestamp.toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Approvals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Status Approval Terbaru
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('history')}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Lihat Semua
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockApprovalData.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(item.status)}
                    <Badge className={getStatusColor(item.status)}>
                      {item.status.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={getPriorityColor(item.priority)}>
                      {item.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <div className="font-medium">{item.team} - Blok {item.block}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(item.submittedAt).toLocaleDateString('id-ID')} • {item.totalWeight}kg • {item.workersCount} pekerja
                    </div>
                    {item.status === 'pending' && (
                      <div className="text-xs text-orange-600">
                        Menunggu {item.daysWaiting} hari
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    {item.approvedBy && (
                      <div className="text-green-600">Disetujui: {item.approvedBy}</div>
                    )}
                    {item.rejectedBy && (
                      <div className="text-red-600">Ditolak: {item.rejectedBy}</div>
                    )}
                    {item.rejectedReason && (
                      <div className="text-xs text-red-500 max-w-48 truncate">
                        {item.rejectedReason}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetail(item.id)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Detail
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'pending':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Pending Approval ({mockStats.totalPending})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Tampilan detail pending approval akan segera tersedia
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 'history':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Riwayat Approval
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    Fitur riwayat approval detail akan segera tersedia
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 'analytics':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Analisis Performa Approval
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    Fitur analisis performa dan grafik tren approval akan segera tersedia
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        );

      default:
        return renderOverview();
    }
  };

  const breadcrumbItems = [
    { label: 'Status Approval', href: '/approvals' },
    ...(viewMode === 'pending' ? [{ label: 'Pending' }] : []),
    ...(viewMode === 'history' ? [{ label: 'Riwayat' }] : []),
    ...(viewMode === 'analytics' ? [{ label: 'Analisis' }] : []),
  ];

  const getPageTitle = () => {
    switch (viewMode) {
      case 'pending': return 'Pending Approval';
      case 'history': return 'Riwayat Approval';
      case 'analytics': return 'Analisis Approval';
      default: return 'Dashboard Status Approval';
    }
  };

  const getPageDescription = () => {
    switch (viewMode) {
      case 'pending': return 'Monitor approval yang masih menunggu';
      case 'history': return 'Riwayat semua proses approval';
      case 'analytics': return 'Analisis performa approval tim';
      default: return 'Monitor dan kelola status approval data panen';
    }
  };

  return (
    <MandorDashboardLayout
      title={getPageTitle()}
      description={getPageDescription()}
      breadcrumbItems={breadcrumbItems}
    >
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
    </MandorDashboardLayout>
  );
}

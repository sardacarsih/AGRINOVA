'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  List,
  BarChart3,
  Bell,
  Leaf,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { MandorDashboardLayout } from '@/components/layouts/role-layouts/MandorDashboardLayout';
import { AsistenDashboardLayout } from '@/components/layouts/role-layouts/AsistenDashboardLayout';
import { ManagerDashboardLayout } from '@/components/layouts/role-layouts/ManagerDashboardLayout';
import { AreaManagerDashboardLayout } from '@/components/layouts/role-layouts/AreaManagerDashboardLayout';
import { HarvestList } from './HarvestList';
import { HarvestStats } from './HarvestStats';
import { useSubscription } from '@apollo/client/react';
import {
  OnHarvestRecordApprovedDocument,
  OnHarvestRecordRejectedDocument,
  type OnHarvestRecordApprovedSubscription,
  type OnHarvestRecordRejectedSubscription
} from '@/gql/graphql';

// Utility function to sanitize block display text for MANDOR role
const sanitizeBlockDisplay = (text: string | null | undefined, userRole: string | undefined): string => {
  if (!text) return '';

  const normalizedUserRole = (userRole || '').toUpperCase();

  // For MANDOR role, remove any potential TPH references
  if (normalizedUserRole === 'MANDOR') {
    return text
      .replace(/TPH[^\s]*/gi, '') // Remove any TPH followed by characters
      .replace(/\btph\b/gi, '')   // Remove standalone 'tph' words
      .replace(/tempat penumpukan hasil/gi, '') // Remove full TPH expansion
      .replace(/\s+/g, ' ')       // Clean up multiple spaces
      .trim();
  }

  return text;
};

type ViewMode = 'overview' | 'list' | 'stats';

interface HarvestDashboardProps {
  historyMode?: boolean;
}

interface HarvestLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  breadcrumbItems: Array<{ label: string; href?: string }>;
}

export function HarvestDashboard({ historyMode = false }: HarvestDashboardProps) {
  // HOOKS VIOLATION FIX: All hooks must be called at the top level unconditionally
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const userRole = (user?.role || '').toUpperCase();
  const isMandorReadOnly = userRole === 'MANDOR';
  const isMonitoringRole = userRole === 'MANAGER' || userRole === 'AREA_MANAGER';
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'info' | 'warning';
    timestamp: Date;
  }>>([]);
  const todayDate = React.useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);
  const historyDateFrom = React.useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const yyyy = from.getFullYear();
    const mm = String(from.getMonth() + 1).padStart(2, '0');
    const dd = String(from.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Fetch harvest statistics with role-based access control
  // const { data: statsData, error: statsError, loading: statsLoading } = useQuery(GetHarvestStatisticsDocument, {
  //   fetchPolicy: 'cache-and-network',
  //   pollInterval: 30000, // Poll every 30 seconds
  // });
  const statsError = null;
  // Subscriptions for real-time updates
  useSubscription<OnHarvestRecordApprovedSubscription>(OnHarvestRecordApprovedDocument, {
    skip: isMandorReadOnly || !user?.id,
    onData: ({ data }) => {
      const approvedRecord = data.data?.harvestRecordApproved;
      if (approvedRecord && approvedRecord.mandor?.id === user?.id) {
        const blockCode = sanitizeBlockDisplay(approvedRecord.block?.blockCode, userRole) || 'Blok tidak diketahui';
        const notification = {
          id: Date.now().toString(),
          message: `Data panen Anda untuk blok ${blockCode} telah disetujui`,
          type: 'success' as const,
          timestamp: new Date(),
        };
        setNotifications(prev => [notification, ...prev.slice(0, 4)]);

        toast({
          title: "Data Panen Disetujui",
          description: `Blok ${blockCode} - ${approvedRecord.beratTbs.toFixed(2)} kg`,
        });
      }
    }
  });

  useSubscription<OnHarvestRecordRejectedSubscription>(OnHarvestRecordRejectedDocument, {
    skip: isMandorReadOnly || !user?.id,
    onData: ({ data }) => {
      const rejectedRecord = data.data?.harvestRecordRejected;
      if (rejectedRecord && rejectedRecord.mandor?.id === user?.id) {
        const blockCode = sanitizeBlockDisplay(rejectedRecord.block?.blockCode, userRole) || 'Blok tidak diketahui';
        const notification = {
          id: Date.now().toString(),
          message: `Data panen Anda untuk blok ${blockCode} ditolak: ${rejectedRecord.rejectedReason}`,
          type: 'warning' as const,
          timestamp: new Date(),
        };
        setNotifications(prev => [notification, ...prev.slice(0, 4)]);

        toast({
          title: "Data Panen Ditolak",
          description: rejectedRecord.rejectedReason || 'Alasan tidak diketahui',
          variant: "destructive",
        });
      }
    },
  });

  const handleViewRecord = (record: any) => {
    // Could open a modal or navigate to detail page
    console.log('View record:', record);
  };

  const renderRoleLayout = ({
    children,
    title,
    description,
    breadcrumbItems,
  }: HarvestLayoutProps) => {
    if (userRole === 'AREA_MANAGER') {
      return (
        <AreaManagerDashboardLayout
          title={title}
          description={description}
          breadcrumbItems={breadcrumbItems}
        >
          {children}
        </AreaManagerDashboardLayout>
      );
    }

    if (userRole === 'MANAGER') {
      return (
        <ManagerDashboardLayout
          title={title}
          description={description}
          breadcrumbItems={breadcrumbItems}
          contentMaxWidthClass="max-w-[96rem]"
          contentPaddingClass="px-2 sm:px-3 lg:px-4 py-4 sm:py-5 lg:py-6"
        >
          {children}
        </ManagerDashboardLayout>
      );
    }

    if (userRole === 'ASISTEN') {
      return (
        <AsistenDashboardLayout
          title={title}
          description={description}
          breadcrumbItems={breadcrumbItems}
        >
          {children}
        </AsistenDashboardLayout>
      );
    }

    return (
      <MandorDashboardLayout
        title={title}
        description={description}
        maxWidthClass="max-w-[96rem]"
        contentPaddingClass="px-2 sm:px-3 lg:px-4 py-4 sm:py-5 lg:py-6"
        breadcrumbItems={breadcrumbItems}
      >
        {children}
      </MandorDashboardLayout>
    );
  };

  // Show loading while authentication is being checked
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-center">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show authentication prompt if user is not authenticated
  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Leaf className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-4">
            Anda harus login untuk mengakses dashboard panen.
          </p>
          <Button onClick={() => window.location.href = '/login'}>
            Login Sekarang
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show error if harvest statistics query fails
  if (statsError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="text-center py-12">
          <div className="text-red-600 mb-4">
            <h3 className="text-lg font-semibold mb-2">Gagal Memuat Statistik Panen</h3>
            <p>Error: {statsError.message}</p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            Refresh Halaman
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (historyMode) {
    return renderRoleLayout({
      title: 'Histori Panen',
      description: 'Lihat histori panen berdasarkan range tanggal',
      breadcrumbItems: [
        { label: 'Panen', href: '/harvest' },
        { label: 'Histori Panen' },
      ],
      children: (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <HarvestList
            onView={handleViewRecord}
            showActions={false}
            enableDateRangeFilter
            defaultDateFrom={historyDateFrom}
            defaultDateTo={todayDate}
            listTitle="Histori Panen (Range Tanggal)"
          />
        </motion.div>
      ),
    });
  }

  if (isMandorReadOnly) {
    return renderRoleLayout({
      title: 'Record Hasil Sync Mobile',
      description: 'Pantau data panen hasil sinkronisasi mobile untuk hari ini',
      breadcrumbItems: [
        { label: 'Panen', href: '/harvest' },
        { label: 'Record Sync Mobile' },
      ],
      children: (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <HarvestList
            onView={handleViewRecord}
            showActions={false}
            defaultDateFrom={todayDate}
            defaultDateTo={todayDate}
            listTitle="Record Hasil Sync Mobile Hari Ini"
          />
        </motion.div>
      ),
    });
  }

  const renderContent = () => {
    switch (viewMode) {
      case 'list':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <HarvestList
              onView={handleViewRecord}
              showActions={userRole === 'MANDOR'}
            />
          </motion.div>
        );

      case 'stats':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <HarvestStats />
            <HarvestList
              onView={handleViewRecord}
              showActions={false}
              defaultStatus="APPROVED"
            />
          </motion.div>
        );

      default:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Quick Stats */}
            <HarvestStats />

            {/* Quick Actions Card (hidden for monitoring roles) */}
            {!isMonitoringRole && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-green-600" />
                    Aksi Cepat Panen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={() => setViewMode('list')}
                      variant="outline"
                      className="h-20"
                      size="lg"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <List className="h-6 w-6" />
                        <span className="text-center">Lihat Data<br />Panen</span>
                      </div>
                    </Button>

                    <Button
                      onClick={() => setViewMode('stats')}
                      variant="outline"
                      className="h-20"
                      size="lg"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <BarChart3 className="h-6 w-6" />
                        <span className="text-center">Laporan &<br />Statistik</span>
                      </div>
                    </Button>
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
                    Notifikasi Terbaru
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


            {/* Recent Harvest Records Preview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    Data Panen Terbaru
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Lihat Semua
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <HarvestList
                  onView={handleViewRecord}
                  showActions={userRole === 'MANDOR'}
                />
              </CardContent>
            </Card>

            {/* Quick Tips Card - Shows when no data */}
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <Bell className="h-5 w-5" />
                  Tips Monitoring Panen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-amber-800">Persiapan Monitoring Panen</h4>
                    <ul className="text-sm space-y-1 text-amber-700">
                      <li>- Pastikan data panen mobile sudah tersinkron</li>
                      <li>- Pastikan blok panen sudah dipetakan</li>
                      <li>- Verifikasi berat TBS per blok sesuai laporan</li>
                      <li>- Tinjau data anomali sebelum approval</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-amber-800">Workflow Approval</h4>
                    <ul className="text-sm space-y-1 text-amber-700">
                      <li>- Mandor sinkronisasi data lapangan</li>
                      <li>- Asisten review dan approve</li>
                      <li>- Manager monitoring performa</li>
                      <li>- Export laporan bulanan</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 rounded border border-amber-200 bg-white p-3">
                  <span className="text-sm text-amber-700">
                    <strong>Pro tip:</strong> Pantau status approval setiap hari agar data tetap konsisten.
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
    }
  };

  const breadcrumbItems = [
    { label: 'Panen', href: '/harvest' },

    ...(viewMode === 'list' ? [{ label: 'Daftar Data' }] : []),
    ...(viewMode === 'stats' ? [{ label: 'Statistik' }] : []),
  ];

  const getPageTitle = () => {
    switch (viewMode) {

      case 'list': return 'Daftar Data Panen';
      case 'stats': return 'Statistik & Laporan Panen';
      default: return 'Dashboard Panen';
    }
  };

  const getPageDescription = () => {
    switch (viewMode) {

      case 'list': return 'Kelola dan pantau data panen';
      case 'stats': return 'Analisis performa dan tren panen';
      default: return 'Pantau data panen harian dari hasil sinkronisasi';
    }
  };

  return renderRoleLayout({
    title: getPageTitle(),
    description: getPageDescription(),
    breadcrumbItems,
    children: (
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
    ),
  });
}


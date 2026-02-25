'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useSubscription } from '@apollo/client/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart3,
  Bell,
  Building2,
  Calendar,
  ClipboardList,
  Leaf,
  List,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ALL_COMPANIES_SCOPE, useCompanyScope } from '@/contexts/company-scope-context';
import { MandorDashboardLayout } from '@/components/layouts/role-layouts/MandorDashboardLayout';
import { AsistenDashboardLayout } from '@/components/layouts/role-layouts/AsistenDashboardLayout';
import { ManagerDashboardLayout } from '@/components/layouts/role-layouts/ManagerDashboardLayout';
import { AreaManagerDashboardLayout } from '@/components/layouts/role-layouts/AreaManagerDashboardLayout';
import { HarvestList } from './HarvestList';
import { HarvestStats } from './HarvestStats';
import {
  OnHarvestRecordApprovedDocument,
  OnHarvestRecordRejectedDocument,
  type OnHarvestRecordApprovedSubscription,
  type OnHarvestRecordRejectedSubscription,
} from '@/gql/graphql';

type ViewMode = 'overview' | 'list' | 'stats';
type DashboardRole = 'MANDOR' | 'ASISTEN' | 'MANAGER' | 'AREA_MANAGER';
type HarvestStatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface HarvestDashboardProps {
  historyMode?: boolean;
}

interface HarvestLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  breadcrumbItems: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
}

interface RoleViewConfig {
  label: string;
  heroDescription: string;
  focusPoints: string[];
  defaultView: ViewMode;
  overviewTitle: string;
  listTitle: string;
  overviewStatus: HarvestStatusFilter;
}

interface ViewOption {
  value: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const VIEW_OPTIONS_DEFAULT: ViewOption[] = [
  { value: 'overview', label: 'Ringkasan', icon: Leaf },
  { value: 'list', label: 'Data Panen', icon: List },
  { value: 'stats', label: 'Statistik', icon: BarChart3 },
];

const VIEW_OPTIONS_MANDOR: ViewOption[] = [
  { value: 'overview', label: 'Hari Ini', icon: Calendar },
  { value: 'list', label: 'Riwayat 30 Hari', icon: ClipboardList },
];

const ROLE_VIEW_CONFIG: Record<DashboardRole, RoleViewConfig> = {
  MANDOR: {
    label: 'Mandor',
    heroDescription: 'Validasi hasil sinkronisasi panen harian dan pantau status review data Anda.',
    focusPoints: [
      'Pastikan semua hasil sync mobile masuk sebelum akhir shift',
      'Pantau status approval untuk tindak lanjut cepat',
      'Gunakan riwayat 30 hari untuk pengecekan konsistensi',
    ],
    defaultView: 'overview',
    overviewTitle: 'Record Sync Mobile Hari Ini',
    listTitle: 'Riwayat Record Sync 30 Hari',
    overviewStatus: 'ALL',
  },
  ASISTEN: {
    label: 'Asisten',
    heroDescription: 'Review data panen tim, prioritaskan antrian pending, dan jaga kualitas approval.',
    focusPoints: [
      'Prioritaskan review data dengan status pending',
      'Verifikasi kualitas buah sebelum approval',
      'Pantau ritme input tim lapangan sepanjang hari',
    ],
    defaultView: 'overview',
    overviewTitle: 'Antrian Panen Pending Review',
    listTitle: 'Data Panen Dalam Scope Asisten',
    overviewStatus: 'PENDING',
  },
  MANAGER: {
    label: 'Manager',
    heroDescription: 'Pantau performa panen lintas divisi dan jaga konsistensi kualitas data estate.',
    focusPoints: [
      'Pantau tren volume panen terverifikasi',
      'Identifikasi gap kualitas antar tim lapangan',
      'Gunakan statistik untuk evaluasi operasional mingguan',
    ],
    defaultView: 'overview',
    overviewTitle: 'Data Panen Terverifikasi',
    listTitle: 'Data Panen Lintas Divisi Estate',
    overviewStatus: 'APPROVED',
  },
  AREA_MANAGER: {
    label: 'Area Manager',
    heroDescription: 'Pantau konsistensi panen antar estate dan pastikan kinerja regional tetap stabil.',
    focusPoints: [
      'Bandingkan performa panen lintas perusahaan dalam assignment',
      'Fokus pada data approved untuk evaluasi regional',
      'Pastikan ritme operasional antar estate tetap seimbang',
    ],
    defaultView: 'overview',
    overviewTitle: 'Data Panen Regional Terverifikasi',
    listTitle: 'Data Panen Lintas Perusahaan',
    overviewStatus: 'APPROVED',
  },
};

const normalizeRole = (role?: string): DashboardRole => {
  const normalized = (role || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'MANDOR' || normalized === 'ASISTEN' || normalized === 'MANAGER' || normalized === 'AREA_MANAGER') {
    return normalized;
  }
  return 'MANDOR';
};

const sanitizeBlockDisplay = (text: string | null | undefined, userRole: string | undefined): string => {
  if (!text) return '';

  const normalizedUserRole = (userRole || '').toUpperCase();
  if (normalizedUserRole !== 'MANDOR') return text;

  return text
    .replace(/TPH[^\s]*/gi, '')
    .replace(/\btph\b/gi, '')
    .replace(/tempat penumpukan hasil/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export function HarvestDashboard({ historyMode = false }: HarvestDashboardProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { selectedCompanyId, selectedCompanyLabel } = useCompanyScope();

  const normalizedRole = normalizeRole(user?.role);
  const isMandorReadOnly = normalizedRole === 'MANDOR';
  const roleConfig = ROLE_VIEW_CONFIG[normalizedRole];
  const viewOptions = isMandorReadOnly ? VIEW_OPTIONS_MANDOR : VIEW_OPTIONS_DEFAULT;

  const [viewMode, setViewMode] = React.useState<ViewMode>(roleConfig.defaultView);
  const [notifications, setNotifications] = React.useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'warning';
    timestamp: Date;
  }>>([]);

  React.useEffect(() => {
    if (!historyMode) {
      setViewMode(roleConfig.defaultView);
    }
  }, [historyMode, roleConfig.defaultView]);

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

  const scopeLabel = React.useMemo(() => {
    if (normalizedRole === 'AREA_MANAGER') {
      if (selectedCompanyId === ALL_COMPANIES_SCOPE) return 'Semua perusahaan dalam assignment';
      return selectedCompanyLabel || 'Perusahaan terpilih';
    }
    if (normalizedRole === 'MANAGER' || normalizedRole === 'ASISTEN') {
      return selectedCompanyLabel || 'Perusahaan user';
    }
    return 'Area kerja mandor';
  }, [normalizedRole, selectedCompanyId, selectedCompanyLabel]);

  useSubscription<OnHarvestRecordApprovedSubscription>(OnHarvestRecordApprovedDocument, {
    skip: !isMandorReadOnly || !user?.id,
    onData: ({ data }) => {
      const approvedRecord = data.data?.harvestRecordApproved;
      if (approvedRecord && approvedRecord.mandor?.id === user?.id) {
        const blockCode = sanitizeBlockDisplay(approvedRecord.block?.blockCode, normalizedRole) || 'Blok tidak diketahui';
        const notification = {
          id: `${Date.now()}-approved`,
          message: `Data panen untuk blok ${blockCode} telah disetujui`,
          type: 'success' as const,
          timestamp: new Date(),
        };
        setNotifications((prev) => [notification, ...prev.slice(0, 4)]);

        toast({
          title: 'Data Panen Disetujui',
          description: `Blok ${blockCode} - ${approvedRecord.beratTbs.toFixed(2)} kg`,
        });
      }
    },
  });

  useSubscription<OnHarvestRecordRejectedSubscription>(OnHarvestRecordRejectedDocument, {
    skip: !isMandorReadOnly || !user?.id,
    onData: ({ data }) => {
      const rejectedRecord = data.data?.harvestRecordRejected;
      if (rejectedRecord && rejectedRecord.mandor?.id === user?.id) {
        const blockCode = sanitizeBlockDisplay(rejectedRecord.block?.blockCode, normalizedRole) || 'Blok tidak diketahui';
        const notification = {
          id: `${Date.now()}-rejected`,
          message: `Data panen untuk blok ${blockCode} ditolak: ${rejectedRecord.rejectedReason || 'Tanpa alasan'}`,
          type: 'warning' as const,
          timestamp: new Date(),
        };
        setNotifications((prev) => [notification, ...prev.slice(0, 4)]);

        toast({
          title: 'Data Panen Ditolak',
          description: rejectedRecord.rejectedReason || 'Alasan tidak diketahui',
          variant: 'destructive',
        });
      }
    },
  });

  const handleViewRecord = React.useCallback(() => {}, []);

  const renderRoleLayout = ({ children, title, description, breadcrumbItems, actions }: HarvestLayoutProps) => {
    if (normalizedRole === 'AREA_MANAGER') {
      return (
        <AreaManagerDashboardLayout
          title={title}
          description={description}
          breadcrumbItems={breadcrumbItems}
          actions={actions}
        >
          {children}
        </AreaManagerDashboardLayout>
      );
    }

    if (normalizedRole === 'MANAGER') {
      return (
        <ManagerDashboardLayout
          title={title}
          description={description}
          breadcrumbItems={breadcrumbItems}
          contentMaxWidthClass="max-w-[96rem]"
          contentPaddingClass="px-2 sm:px-3 lg:px-4 py-4 sm:py-5 lg:py-6"
          actions={actions}
        >
          {children}
        </ManagerDashboardLayout>
      );
    }

    if (normalizedRole === 'ASISTEN') {
      return (
        <AsistenDashboardLayout
          title={title}
          description={description}
          breadcrumbItems={breadcrumbItems}
          actions={actions}
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
        actions={actions}
      >
        {children}
      </MandorDashboardLayout>
    );
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-center">
          <div className="mx-auto mb-4 h-8 w-64 rounded bg-gray-200" />
          <div className="mx-auto h-4 w-48 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Leaf className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold">Authentication Required</h3>
          <p className="mb-4 text-gray-600">Anda harus login untuk mengakses dashboard panen.</p>
          <Button onClick={() => router.push('/login')}>
            Login Sekarang
          </Button>
        </CardContent>
      </Card>
    );
  }

  const renderHistoryContent = () => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-blue-50">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Histori Panen</p>
              <h3 className="text-lg font-semibold text-slate-900">Analisis data panen dalam rentang waktu</h3>
              <p className="mt-1 text-sm text-slate-700">Gunakan filter tanggal untuk audit ritme panen dan tren approval.</p>
            </div>
            <Badge className="border-emerald-300 bg-white text-emerald-900">
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              Default: 30 hari terakhir
            </Badge>
          </div>
        </CardContent>
      </Card>

      <HarvestList
        key={`${normalizedRole}-history`}
        onView={handleViewRecord}
        showActions={false}
        enableDateRangeFilter
        defaultDateFrom={historyDateFrom}
        defaultDateTo={todayDate}
        listTitle="Histori Panen (Range Tanggal)"
      />
    </motion.div>
  );

  const renderOverviewContent = () => {
    if (isMandorReadOnly) {
      return (
        <HarvestList
          key={`${normalizedRole}-overview`}
          onView={handleViewRecord}
          showActions={false}
          defaultDateFrom={todayDate}
          defaultDateTo={todayDate}
          listTitle={roleConfig.overviewTitle}
          pageSize={10}
        />
      );
    }

    return (
      <div className="space-y-6">
        <HarvestStats />
        <HarvestList
          key={`${normalizedRole}-overview`}
          onView={handleViewRecord}
          showActions={false}
          defaultStatus={roleConfig.overviewStatus}
          listTitle={roleConfig.overviewTitle}
          pageSize={10}
        />
      </div>
    );
  };

  const renderListContent = () => {
    if (isMandorReadOnly) {
      return (
        <HarvestList
          key={`${normalizedRole}-list`}
          onView={handleViewRecord}
          showActions={false}
          enableDateRangeFilter
          defaultDateFrom={historyDateFrom}
          defaultDateTo={todayDate}
          listTitle={roleConfig.listTitle}
        />
      );
    }

    return (
      <HarvestList
        key={`${normalizedRole}-list`}
        onView={handleViewRecord}
        showActions={false}
        listTitle={roleConfig.listTitle}
      />
    );
  };

  const renderStatsContent = () => (
    <div className="space-y-6">
      <HarvestStats />
      <HarvestList
        key={`${normalizedRole}-stats`}
        onView={handleViewRecord}
        showActions={false}
        defaultStatus="APPROVED"
        enableDateRangeFilter
        defaultDateFrom={historyDateFrom}
        defaultDateTo={todayDate}
        listTitle="Data Approved untuk Analisis"
      />
    </div>
  );

  const renderMainContent = () => {
    if (viewMode === 'list') return renderListContent();
    if (viewMode === 'stats' && !isMandorReadOnly) return renderStatsContent();
    return renderOverviewContent();
  };

  const activeView = viewOptions.find((item) => item.value === viewMode) || viewOptions[0];
  const ActiveViewIcon = activeView.icon;

  const layoutActions = historyMode ? (
    <Button type="button" variant="outline" size="sm" onClick={() => router.push('/harvest')}>
      <RefreshCw className="mr-2 h-4 w-4" />
      Dashboard Panen
    </Button>
  ) : (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => router.push('/harvest/history')}>
        <Calendar className="mr-2 h-4 w-4" />
        Histori
      </Button>
      {normalizedRole === 'ASISTEN' && (
        <Button type="button" size="sm" onClick={() => router.push('/approvals')}>
          <ShieldCheck className="mr-2 h-4 w-4" />
          Approval
        </Button>
      )}
      {(normalizedRole === 'MANAGER' || normalizedRole === 'AREA_MANAGER') && (
        <Button type="button" size="sm" onClick={() => router.push('/tim-estate')}>
          <Users className="mr-2 h-4 w-4" />
          Tim Estate
        </Button>
      )}
    </div>
  );

  if (historyMode) {
    return renderRoleLayout({
      title: 'Histori Panen',
      description: 'Lihat histori panen berdasarkan range tanggal',
      breadcrumbItems: [
        { label: 'Panen', href: '/harvest' },
        { label: 'Histori Panen' },
      ],
      actions: layoutActions,
      children: renderHistoryContent(),
    });
  }

  const breadcrumbItems = [
    { label: 'Panen', href: '/harvest' },
    ...(viewMode === 'list' ? [{ label: 'Data Panen' }] : []),
    ...(viewMode === 'stats' ? [{ label: 'Statistik' }] : []),
  ];

  const getPageTitle = () => {
    if (viewMode === 'list') return 'Data Panen';
    if (viewMode === 'stats' && !isMandorReadOnly) return 'Statistik Panen';
    return 'Dashboard Panen';
  };

  const getPageDescription = () => {
    if (viewMode === 'list') return roleConfig.listTitle;
    if (viewMode === 'stats' && !isMandorReadOnly) return 'Analisis volume, status approval, dan tren panen';
    return roleConfig.heroDescription;
  };

  return renderRoleLayout({
    title: getPageTitle(),
    description: getPageDescription(),
    breadcrumbItems,
    actions: layoutActions,
    children: (
      <div className="space-y-6">
        <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 text-white">
          <CardContent className="p-5 sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-white/25 bg-white/10 text-white">
                    <Leaf className="mr-1.5 h-3.5 w-3.5" />
                    {roleConfig.label} View
                  </Badge>
                  <Badge className="border-white/25 bg-white/10 text-white">
                    <Building2 className="mr-1.5 h-3.5 w-3.5" />
                    Scope: {scopeLabel}
                  </Badge>
                  <Badge className="border-white/25 bg-white/10 text-white">
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Auto refresh 30 detik
                  </Badge>
                </div>

                <div>
                  <h2 className="text-xl font-semibold sm:text-2xl">Pusat Monitoring Panen</h2>
                  <p className="mt-1 text-sm text-emerald-100 sm:text-base">{roleConfig.heroDescription}</p>
                </div>

                <div className="grid gap-2 text-sm text-emerald-50 sm:grid-cols-2">
                  {roleConfig.focusPoints.map((point) => (
                    <div key={point} className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                      {point}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-white/20 bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Mode Aktif</p>
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <ActiveViewIcon className="h-5 w-5 text-emerald-200" />
                  {activeView.label}
                </div>
                <p className="text-sm text-emerald-100">
                  Gunakan switch mode untuk menyesuaikan tampilan dengan kebutuhan operasional role Anda.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {viewOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = viewMode === option.value;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        size="sm"
                        variant={isActive ? 'secondary' : 'outline'}
                        className={isActive ? 'border-white/20 bg-white text-slate-900 hover:bg-white/90' : 'border-white/30 bg-transparent text-white hover:bg-white/10'}
                        onClick={() => setViewMode(option.value)}
                      >
                        <Icon className="mr-1.5 h-4 w-4" />
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isMandorReadOnly && notifications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Notifikasi Status Record
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.slice(0, 3).map((notification) => (
                <Alert key={notification.id}>
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="text-sm">{notification.message}</span>
                      <Badge variant="outline" className="text-xs">
                        {notification.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </CardContent>
          </Card>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={`${normalizedRole}-${viewMode}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {renderMainContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    ),
  });
}

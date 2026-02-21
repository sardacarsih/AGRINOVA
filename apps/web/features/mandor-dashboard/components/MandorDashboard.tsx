'use client';

import React from 'react';
import { useQuery, useSubscription } from '@apollo/client/react';
import { motion } from 'framer-motion';
import { RoleDashboardProps } from '@/features/dashboard/types/dashboard';
import { MandorDashboardLayout } from '@/components/layouts/role-layouts/MandorDashboardLayout';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Users,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Leaf,
  RefreshCw,
  FileText,
  Target,
  Activity,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import {
  GET_HARVEST_RECORDS_BY_STATUS,
  GET_MY_ASSIGNMENTS,
  HARVEST_RECORD_CREATED,
  HARVEST_RECORD_APPROVED,
  HARVEST_RECORD_REJECTED,
  type HarvestRecord,
  type GetMyAssignmentsResponse,
  type GetHarvestRecordsByStatusResponse
} from '@/lib/apollo/queries/harvest';

// Enhanced Mandor Dashboard Widgets with Real Data
function TodayStatsWidget() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const { data: todayRecords, loading, error } = useQuery<GetHarvestRecordsByStatusResponse>(GET_HARVEST_RECORDS_BY_STATUS, {
    variables: { status: 'PENDING' },
    pollInterval: 30000, // Refresh every 30 seconds
  });

  const { data: myAssignments } = useQuery<GetMyAssignmentsResponse>(GET_MY_ASSIGNMENTS);

  // Calculate today's statistics
  const todayStats = React.useMemo(() => {
    if (!todayRecords?.harvestRecordsByStatus) return { totalWeight: 0, recordCount: 0, blocks: 0 };

    const todayHarvests = todayRecords.harvestRecordsByStatus.filter(record =>
      record.tanggal === today && record.mandorId === user?.id
    );

    const totalWeight = todayHarvests.reduce((sum, record) => sum + record.beratTbs, 0);
    const uniqueBlocks = new Set(todayHarvests.map(record => record.blockId)).size;

    return {
      totalWeight,
      recordCount: todayHarvests.length,
      blocks: uniqueBlocks
    };
  }, [todayRecords, today, user?.id]);

  const totalBlocks = myAssignments?.myAssignments.divisions.reduce(
    (sum, division) => sum + division.blocks.length, 0
  ) || 0;

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hari Ini</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hari Ini</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Gagal memuat data hari ini</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Hari Ini</CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-green-600">
          {todayStats.totalWeight.toFixed(1)} kg
        </div>
        <p className="text-xs text-muted-foreground">
          Total TBS dikumpulkan
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-lg font-semibold">{todayStats.recordCount}</div>
            <div className="text-xs text-gray-600">Data Input</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{todayStats.blocks}</div>
            <div className="text-xs text-gray-600">Blok Aktif</div>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Total blok tersedia: {totalBlocks}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkerStatsWidget() {
  const { user } = useAuth();
  const { data: myAssignments } = useQuery<GetMyAssignmentsResponse>(GET_MY_ASSIGNMENTS);

  // Calculate worker statistics based on assignments
  const workerStats = React.useMemo(() => {
    if (!myAssignments?.myAssignments.divisions) return { totalBlocks: 0, totalDivisions: 0, totalEstates: 0 };

    const divisions = myAssignments.myAssignments.divisions;
    const estates = myAssignments?.myAssignments.estates || [];
    const totalBlocks = divisions.reduce((sum, div) => sum + div.blocks.length, 0);
    const totalDivisions = divisions.length;
    const totalEstates = new Set(divisions.map(div => div.estateId)).size;

    return { totalBlocks, totalDivisions, totalEstates };
  }, [myAssignments]);

  // Create estate lookup function
  const getEstateById = React.useCallback((estateId: string) => {
    return myAssignments?.myAssignments.estates?.find(estate => estate.id === estateId);
  }, [myAssignments]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Area Kerja</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Estate</span>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {workerStats.totalEstates} area
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Divisi</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {workerStats.totalDivisions} divisi
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Total Blok</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
              {workerStats.totalBlocks} blok
            </Badge>
          </div>
        </div>
        {myAssignments?.myAssignments.divisions.map((division) => {
          const estate = getEstateById(division.estateId);
          return (
            <div key={division.id} className="mt-3 p-2 bg-gray-50 rounded text-xs">
              <div className="font-medium">{estate?.name || 'Unknown Estate'}</div>
              <div className="text-gray-600">{division.name} - {division.blocks.length} blok</div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ProductivityWidget() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const { data: todayRecords } = useQuery<GetHarvestRecordsByStatusResponse>(GET_HARVEST_RECORDS_BY_STATUS, {
    variables: { status: 'APPROVED' },
    pollInterval: 60000,
  });

  const productivity = React.useMemo(() => {
    if (!todayRecords?.harvestRecordsByStatus || !user?.id) {
      return { todayAvg: 0, yesterdayAvg: 0, change: 0, totalToday: 0 };
    }

    const myTodayRecords = todayRecords.harvestRecordsByStatus.filter(
      record => record.tanggal === today && record.mandorId === user.id
    );

    const myYesterdayRecords = todayRecords.harvestRecordsByStatus.filter(
      record => record.tanggal === yesterday && record.mandorId === user.id
    );

    const todayTotal = myTodayRecords.reduce((sum, record) => sum + record.beratTbs, 0);
    const yesterdayTotal = myYesterdayRecords.reduce((sum, record) => sum + record.beratTbs, 0);

    const todayRecordCount = myTodayRecords.length || 1;
    const yesterdayRecordCount = myYesterdayRecords.length || 1;

    const todayAvg = todayTotal / todayRecordCount;
    const yesterdayAvg = yesterdayTotal / yesterdayRecordCount;

    const change = yesterdayAvg > 0 ? ((todayAvg - yesterdayAvg) / yesterdayAvg) * 100 : 0;

    return { todayAvg, yesterdayAvg, change, totalToday: todayTotal };
  }, [todayRecords, today, yesterday, user?.id]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Produktivitas</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{productivity.todayAvg.toFixed(1)} kg</div>
        <p className="text-xs text-muted-foreground">
          Rata-rata per record hari ini
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm">
            {productivity.change >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-2" />
            ) : (
              <TrendingUp className="h-3 w-3 text-red-500 mr-2 rotate-180" />
            )}
            <span className={productivity.change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {productivity.change >= 0 ? '+' : ''}{productivity.change.toFixed(1)}% dari kemarin
            </span>
          </div>
          <div className="flex items-center text-sm">
            <Target className="h-3 w-3 text-blue-500 mr-2" />
            <span>Total hari ini: {productivity.totalToday.toFixed(1)} kg</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PendingTasksWidget() {
  const { user } = useAuth();

  const { data: pendingRecords } = useQuery<GetHarvestRecordsByStatusResponse>(GET_HARVEST_RECORDS_BY_STATUS, {
    variables: { status: 'PENDING' },
    pollInterval: 10000, // More frequent updates for pending status
  });

  const { data: approvedRecords } = useQuery<GetHarvestRecordsByStatusResponse>(GET_HARVEST_RECORDS_BY_STATUS, {
    variables: { status: 'APPROVED' },
    pollInterval: 60000,
  });

  const { data: rejectedRecords } = useQuery<GetHarvestRecordsByStatusResponse>(GET_HARVEST_RECORDS_BY_STATUS, {
    variables: { status: 'REJECTED' },
    pollInterval: 60000,
  });

  const statusCounts = React.useMemo(() => {
    const pending = pendingRecords?.harvestRecordsByStatus.filter(
      record => record.mandorId === user?.id
    ).length || 0;

    const approved = approvedRecords?.harvestRecordsByStatus.filter(
      record => record.mandorId === user?.id
    ).length || 0;

    const rejected = rejectedRecords?.harvestRecordsByStatus.filter(
      record => record.mandorId === user?.id
    ).length || 0;

    return { pending, approved, rejected };
  }, [pendingRecords, approvedRecords, rejectedRecords, user?.id]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Status Data Panen</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Menunggu Approval</span>
            <Badge variant="outline" className="bg-orange-50 text-orange-700">
              {statusCounts.pending} entry
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Ditolak</span>
            <Badge variant="outline" className="bg-red-50 text-red-700">
              {statusCounts.rejected} entry
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Disetujui</span>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {statusCounts.approved} entry
            </Badge>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-gray-500">
            Total: {statusCounts.pending + statusCounts.approved + statusCounts.rejected} data
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivitiesWidget() {
  const { user } = useAuth();
  const [recentActivities, setRecentActivities] = React.useState<Array<{
    id: string;
    title: string;
    description: string;
    time: string;
    type: 'approved' | 'rejected' | 'created';
    icon: React.ElementType;
    color: string;
  }>>([]);

  // Subscribe to real-time harvest updates
  useSubscription<{ harvestRecordCreated: HarvestRecord }>(HARVEST_RECORD_CREATED, {
    onData: ({ data }) => {
      const record = data?.data?.harvestRecordCreated;
      if (record && record.mandorId === user?.id) {
        const activity = {
          id: `created-${record.id}`,
          title: 'Data Panen Baru',
          description: `Blok ${record.block.blockCode}: ${record.beratTbs.toFixed(1)} kg TBS`,
          time: 'Baru saja',
          type: 'created' as const,
          icon: Plus,
          color: 'text-blue-600',
        };
        setRecentActivities(prev => [activity, ...prev.slice(0, 9)]);
      }
    },
  });

  useSubscription<{ harvestRecordApproved: HarvestRecord }>(HARVEST_RECORD_APPROVED, {
    onData: ({ data }) => {
      const record = data?.data?.harvestRecordApproved;
      if (record && record.mandorId === user?.id) {
        const activity = {
          id: `approved-${record.id}`,
          title: 'Data Panen Disetujui',
          description: `Blok ${record.block.blockCode}: ${record.beratTbs.toFixed(1)} kg TBS`,
          time: 'Baru saja',
          type: 'approved' as const,
          icon: CheckCircle,
          color: 'text-green-600',
        };
        setRecentActivities(prev => [activity, ...prev.slice(0, 9)]);
      }
    },
  });

  useSubscription<{ harvestRecordRejected: HarvestRecord }>(HARVEST_RECORD_REJECTED, {
    onData: ({ data }) => {
      const record = data?.data?.harvestRecordRejected;
      if (record && record.mandorId === user?.id) {
        const activity = {
          id: `rejected-${record.id}`,
          title: 'Data Panen Ditolak',
          description: `Blok ${record.block.blockCode}: ${record.rejectedReason}`,
          time: 'Baru saja',
          type: 'rejected' as const,
          icon: AlertTriangle,
          color: 'text-red-600',
        };
        setRecentActivities(prev => [activity, ...prev.slice(0, 9)]);
      }
    },
  });

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Aktivitas Terkini</CardTitle>
        <CardDescription>Update real-time data panen Anda</CardDescription>
      </CardHeader>
      <CardContent>
        {recentActivities.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Belum ada aktivitas hari ini</p>
            <p className="text-xs text-gray-400 mt-1">Aktivitas akan muncul di sini secara real-time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivities.slice(0, 5).map((activity) => (
              <motion.div
                key={activity.id}
                className="flex items-start space-x-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="rounded-full p-2 bg-gray-50">
                  <activity.icon className={`h-4 w-4 ${activity.color}`} />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {activity.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.time}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionsWidget() {
  const router = useRouter();

  const handleAction = (path: string) => {
    router.push(path);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aksi Cepat</CardTitle>
        <CardDescription>Akses cepat ke data sinkronisasi mobile</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => handleAction('/harvest')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Record Sync Mobile
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
}

// Weekly Summary Widget with Real Data
function WeeklySummaryWidget() {
  const { user } = useAuth();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const { data: weeklyApproved } = useQuery<GetHarvestRecordsByStatusResponse>(GET_HARVEST_RECORDS_BY_STATUS, {
    variables: { status: 'APPROVED' },
    pollInterval: 300000, // 5 minutes
  });

  const { data: weeklyPending } = useQuery<GetHarvestRecordsByStatusResponse>(GET_HARVEST_RECORDS_BY_STATUS, {
    variables: { status: 'PENDING' },
  });

  const weeklyStats = React.useMemo(() => {
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());

    const approved = weeklyApproved?.harvestRecordsByStatus.filter(record => {
      const recordDate = new Date(record.tanggal);
      return recordDate >= thisWeek && record.mandorId === user?.id;
    }) || [];

    const pending = weeklyPending?.harvestRecordsByStatus.filter(record => {
      const recordDate = new Date(record.tanggal);
      return recordDate >= thisWeek && record.mandorId === user?.id;
    }) || [];

    const totalTbs = approved.reduce((sum, record) => sum + record.beratTbs, 0);
    const totalRecords = approved.length + pending.length;
    const approvalRate = totalRecords > 0 ? (approved.length / totalRecords) * 100 : 0;

    const avgProductivity = approved.length > 0 ? totalTbs / approved.length : 0;

    return {
      totalTbs: totalTbs / 1000, // Convert to tons
      totalRecords,
      approvalRate,
      avgProductivity,
      approvedCount: approved.length,
      pendingCount: pending.length
    };
  }, [weeklyApproved, weeklyPending, user?.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ringkasan Minggu Ini</CardTitle>
        <CardDescription>Performance data panen dalam 7 hari terakhir</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="text-center p-4 border rounded-lg hover:bg-green-50 transition-colors">
            <Leaf className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">
              {weeklyStats.totalTbs.toFixed(1)} ton
            </div>
            <div className="text-sm text-gray-600">Total TBS Disetujui</div>
          </div>
          <div className="text-center p-4 border rounded-lg hover:bg-blue-50 transition-colors">
            <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">{weeklyStats.totalRecords}</div>
            <div className="text-sm text-gray-600">Total Input Data</div>
          </div>
          <div className="text-center p-4 border rounded-lg hover:bg-emerald-50 transition-colors">
            <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-emerald-600">
              {weeklyStats.approvalRate.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">Approval Rate</div>
          </div>
          <div className="text-center p-4 border rounded-lg hover:bg-orange-50 transition-colors">
            <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-600">
              {weeklyStats.avgProductivity.toFixed(1)} kg
            </div>
            <div className="text-sm text-gray-600">Rata-rata/Record</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="bg-green-50 p-3 rounded text-center">
            <div className="font-semibold text-green-800">{weeklyStats.approvedCount}</div>
            <div className="text-green-600">Data Disetujui</div>
          </div>
          <div className="bg-orange-50 p-3 rounded text-center">
            <div className="font-semibold text-orange-800">{weeklyStats.pendingCount}</div>
            <div className="text-orange-600">Menunggu Approval</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Mandor Dashboard Component
function MandorDashboard({ role }: RoleDashboardProps) {
  const { config, metrics, loading, refreshMetrics } = useDashboard();
  const { user } = useAuth();
  const router = useRouter();

  // Open synced records page from mobile app
  const handleOpenMobileSyncRecords = () => {
    router.push('/harvest');
  };

  if (loading) {
    return (
      <MandorDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <div className="text-sm text-gray-600">Memuat dashboard...</div>
          </div>
        </div>
      </MandorDashboardLayout>
    );
  }

  // Define breadcrumb items for main dashboard
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' }
  ];

  return (
    <MandorDashboardLayout
      title="Dashboard Mandor"
      description="Pantau tim dan record hasil sinkronisasi dari mobile"
      breadcrumbItems={breadcrumbItems}
      actions={
        <Button onClick={handleOpenMobileSyncRecords} variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Record Sync Mobile
        </Button>
      }
    >
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <TodayStatsWidget />
          <WorkerStatsWidget />
          <ProductivityWidget />
          <PendingTasksWidget />
        </div>

        {/* Activities and Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <RecentActivitiesWidget />
          <QuickActionsWidget />
        </div>

        {/* Weekly Performance Summary */}
        <WeeklySummaryWidget />

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-green-100 p-2">
                <Leaf className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">Selamat datang, {user?.name || user?.username}!</h3>
                <p className="text-sm text-green-700 mt-1">
                  Dashboard ini menampilkan data real-time dari sistem Agrinova.
                  Semua data akan ter-update otomatis setiap ada perubahan.
                </p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    Real-time Updates
                  </Badge>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                    GraphQL Integration
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </MandorDashboardLayout>
  );
}

export default MandorDashboard;

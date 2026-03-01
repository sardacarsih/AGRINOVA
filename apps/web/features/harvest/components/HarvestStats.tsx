'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GraphQLErrorHandler } from '@/components/ui/graphql-error-handler';
import {
  TrendingUp,
  TrendingDown,
  Package,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  Leaf,
} from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '@/hooks/use-auth';
import { GET_HARVEST_STATS_SOURCE, type GetHarvestStatsSourceResponse } from '@/lib/apollo/queries/harvest';
import { buildHarvestDateVariables } from '@/features/harvest/utils/harvest-query-params';

interface HarvestStatsProps {
  className?: string;
  dateFrom?: string;
  dateTo?: string;
}

const EMPTY_STATS = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  totalWeight: 0,
  totalBunches: 0,
  todayRecords: 0,
  todayWeight: 0,
  weeklyRecords: 0,
  weeklyWeight: 0,
  avgWeightPerRecord: 0,
  avgBunchesPerRecord: 0,
  approvalRate: 0,
  trendData: {
    weightTrend: 0,
    recordsTrend: 0,
  },
  quality: {
    totalQualityBunches: 0,
    ripeBunches: 0,
    rawBunches: 0,
    overripeBunches: 0,
    rottenBunches: 0,
    longStalkBunches: 0,
    looseFruits: 0,
    ripeRate: 0,
    defectRate: 0,
    hasQualityData: false,
  },
};

function parseRecordDate(rawDate: string): Date | null {
  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }
  return parsedDate;
}

function addDays(baseDate: Date, days: number): Date {
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function HarvestStats({ className, dateFrom, dateTo }: HarvestStatsProps) {
  const { user } = useAuth();
  const userRole = (user?.role || '').toUpperCase();
  const queryVariables = React.useMemo(
    () => buildHarvestDateVariables(dateFrom, dateTo),
    [dateFrom, dateTo]
  );
  const { data, loading, error, refetch } = useQuery<GetHarvestStatsSourceResponse>(GET_HARVEST_STATS_SOURCE, {
    variables: queryVariables,
    pollInterval: 60000,
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'cache-and-network',
    skip: !user,
  });

  // Check for authentication errors specifically
  const isAuthError = error?.graphQLErrors?.some((err) => {
    const message = (err.message || '').toLowerCase();
    return (
      message.includes('authentication required') ||
      message.includes('unauthorized') ||
      err.extensions?.code === 'UNAUTHENTICATED'
    );
  }) ?? false;

  const stats = React.useMemo(() => {
    const records = data?.harvestRecords ?? [];
    if (records.length === 0) {
      return EMPTY_STATS;
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = addDays(todayStart, 1);

    const currentWeekStart = addDays(todayStart, -6);
    const previousWeekStart = addDays(currentWeekStart, -7);
    const previousWeekEnd = currentWeekStart;

    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let totalWeight = 0;
    let totalBunches = 0;
    let ripeBunches = 0;
    let rawBunches = 0;
    let overripeBunches = 0;
    let rottenBunches = 0;
    let longStalkBunches = 0;
    let looseFruits = 0;

    let todayRecords = 0;
    let todayWeight = 0;
    let weeklyRecords = 0;
    let weeklyWeight = 0;
    let previousWeeklyRecords = 0;
    let previousWeeklyWeight = 0;

    for (const record of records) {
      const recordWeight = Number(record.beratTbs) || 0;
      const recordBunches = Number(record.jumlahJanjang) || 0;
      const recordRipeBunches = Number(record.jjgMatang ?? 0) || 0;
      const recordRawBunches = Number(record.jjgMentah ?? 0) || 0;
      const recordOverripeBunches = Number(record.jjgLewatMatang ?? 0) || 0;
      const recordRottenBunches = Number(record.jjgBusukAbnormal ?? 0) || 0;
      const recordLongStalkBunches = Number(record.jjgTangkaiPanjang ?? 0) || 0;
      const recordLooseFruits = Number(record.totalBrondolan ?? 0) || 0;

      totalWeight += recordWeight;
      totalBunches += recordBunches;
      ripeBunches += recordRipeBunches;
      rawBunches += recordRawBunches;
      overripeBunches += recordOverripeBunches;
      rottenBunches += recordRottenBunches;
      longStalkBunches += recordLongStalkBunches;
      looseFruits += recordLooseFruits;

      if (record.status === 'PENDING') pending += 1;
      if (record.status === 'APPROVED') approved += 1;
      if (record.status === 'REJECTED') rejected += 1;

      const recordDate = parseRecordDate(record.tanggal);
      if (!recordDate) continue;

      if (recordDate >= todayStart && recordDate < tomorrowStart) {
        todayRecords += 1;
        todayWeight += recordWeight;
      }

      if (recordDate >= currentWeekStart && recordDate < tomorrowStart) {
        weeklyRecords += 1;
        weeklyWeight += recordWeight;
      }

      if (recordDate >= previousWeekStart && recordDate < previousWeekEnd) {
        previousWeeklyRecords += 1;
        previousWeeklyWeight += recordWeight;
      }
    }

    const total = records.length;
    const avgWeightPerRecord = total > 0 ? totalWeight / total : 0;
    const avgBunchesPerRecord = total > 0 ? totalBunches / total : 0;
    const processedRecords = approved + rejected;
    const approvalRate = processedRecords > 0 ? (approved / processedRecords) * 100 : 0;
    const totalQualityBunches = ripeBunches + rawBunches + overripeBunches + rottenBunches + longStalkBunches;
    const defectiveBunches = rawBunches + overripeBunches + rottenBunches + longStalkBunches;
    const hasQualityData = totalQualityBunches > 0 || looseFruits > 0;
    const ripeRate = totalQualityBunches > 0 ? (ripeBunches / totalQualityBunches) * 100 : 0;
    const defectRate = totalQualityBunches > 0 ? (defectiveBunches / totalQualityBunches) * 100 : 0;

    const recordsTrend =
      previousWeeklyRecords > 0
        ? ((weeklyRecords - previousWeeklyRecords) / previousWeeklyRecords) * 100
        : weeklyRecords > 0
          ? 100
          : 0;

    const weightTrend =
      previousWeeklyWeight > 0
        ? ((weeklyWeight - previousWeeklyWeight) / previousWeeklyWeight) * 100
        : weeklyWeight > 0
          ? 100
          : 0;

    return {
      total,
      pending,
      approved,
      rejected,
      totalWeight,
      totalBunches,
      todayRecords,
      todayWeight,
      weeklyRecords,
      weeklyWeight,
      avgWeightPerRecord,
      avgBunchesPerRecord,
      approvalRate,
      trendData: {
        recordsTrend,
        weightTrend,
      },
      quality: {
        totalQualityBunches,
        ripeBunches,
        rawBunches,
        overripeBunches,
        rottenBunches,
        longStalkBunches,
        looseFruits,
        ripeRate,
        defectRate,
        hasQualityData,
      },
    };
  }, [data?.harvestRecords]);

  // Show loading only for initial load, not for auth errors
  if (loading && !data && !error) {
    return (
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Show authentication prompt if not logged in
  if (isAuthError) {
    return (
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
        <Card className="md:col-span-2 lg:col-span-4">
          <CardContent className="py-6">
            <Alert>
              <AlertDescription>
                Anda harus login untuk melihat statistik panen. Silakan <a href="/login" className="text-blue-600 underline">login terlebih dahulu</a>.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle other error states
  if (error) {
    return (
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
        <Card className="md:col-span-2 lg:col-span-4">
          <CardContent className="py-6">
            <GraphQLErrorHandler
              error={error}
              onRetry={() => refetch()}
              title="Gagal Memuat Statistik Panen"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const TrendIcon = ({ trend }: { trend: number }) => {
    if (trend > 0) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (trend < 0) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return null;
  };

  // Show empty state when no data available  
  if (!loading && stats.total === 0) {
    return (
      <div className="space-y-4">
        {/* Empty State Message */}
        <Alert className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
          <Package className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span className="text-orange-800 font-medium">
                📊 Belum Ada Data Panen untuk Statistik
              </span>
              <Badge className="bg-orange-600 text-white">No Data</Badge>
            </div>
          </AlertDescription>
        </Alert>

        {/* Role-based guidance */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Card for Mandor */}
          {userRole === 'MANDOR' && (
            <Card className="md:col-span-2 lg:col-span-3 bg-green-50 border-green-200">
              <CardContent className="py-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Package className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800">Pantau Record Sync Mobile</h3>
                    <p className="text-sm text-green-700">Statistik akan muncul dari data sinkronisasi aplikasi mobile</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-sm text-green-700">
                  <div className="bg-white p-3 rounded border border-green-200">
                    <div className="font-semibold">1. Input di Mobile</div>
                    <div>Catat hasil panen melalui aplikasi mobile</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-green-200">
                    <div className="font-semibold">2. Submit Approval</div>
                    <div>Data akan ditinjau oleh Asisten</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-green-200">
                    <div className="font-semibold">3. Monitor Status</div>
                    <div>Pantau status hasil sinkronisasi di web</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card for Asisten */}
          {userRole === 'ASISTEN' && (
            <Card className="md:col-span-2 lg:col-span-3 bg-blue-50 border-blue-200">
              <CardContent className="py-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-800">Menunggu Data Panen dari Mandor</h3>
                    <p className="text-sm text-blue-700">Statistik akan muncul setelah Mandor menginput data</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-700">
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <div className="font-semibold">Monitor</div>
                    <div>Periksa data pending dari Mandor</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <div className="font-semibold">Review & Approve</div>
                    <div>Validasi data panen yang masuk</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <div className="font-semibold">Track Progress</div>
                    <div>Lihat statistik approval rate</div>
                  </div>
                </div>
                <div className="text-xs text-blue-600 mt-3">
                  💡 Data panen akan muncul secara real-time saat Mandor menginput
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card for Manager and above */}
          {userRole && ['MANAGER', 'AREA_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(userRole) && (
            <Card className="md:col-span-2 lg:col-span-3 bg-purple-50 border-purple-200">
              <CardContent className="py-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-purple-800">Monitor Performa Panen Tim</h3>
                    <p className="text-sm text-purple-700">Statistik akan muncul setelah data panen di-approve</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-sm text-purple-700">
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <div className="font-semibold">Team Input</div>
                    <div>Monitor input dari Mandor/Asisten</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <div className="font-semibold">Approval Rate</div>
                    <div>Track efisiensi proses approval</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <div className="font-semibold">Harvest Volume</div>
                    <div>Analisis tonase dan performa</div>
                  </div>
                </div>
                <div className="text-xs text-purple-600 mt-3">
                  📈 Statistik lengkap akan tersedia setelah ada data yang disetujui
                </div>
              </CardContent>
            </Card>
          )}

          {/* System status card hidden for MANAGER role */}
          {userRole !== 'MANAGER' && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <Calendar className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">System Status</h4>
                      <p className="text-sm text-gray-600">Monitoring sistem panen real-time</p>
                    </div>
                  </div>
                  <Badge className="bg-green-600 text-white">Online</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-semibold text-green-600">🟢 API Server</div>
                    <div className="text-muted-foreground">Operational</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-semibold text-blue-600">🔄 WebSocket</div>
                    <div className="text-muted-foreground">Connected</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-semibold text-purple-600">📊 Database</div>
                    <div className="text-muted-foreground">Ready</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-semibold text-orange-600">📱 Sync</div>
                    <div className="text-muted-foreground">Active</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-3 text-center">
                  🔄 Terakhir diperbarui: {new Date().toLocaleTimeString('id-ID')} | 📱 Data refresh otomatis setiap 30 detik
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
        {/* Today's Harvest */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hari Ini</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.todayWeight.toFixed(2)} kg
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.todayRecords} entry panen
            </p>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <Package className="h-3 w-3 mr-1" />
              Rata-rata: {stats.todayRecords > 0 ? (stats.todayWeight / stats.todayRecords).toFixed(2) : '0.00'} kg/entry
            </div>
          </CardContent>
        </Card>

        {/* Weekly Performance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minggu Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.weeklyWeight / 1000).toFixed(1)} ton
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.weeklyRecords} total entry
            </p>
            <div className="flex items-center text-xs mt-2">
              <TrendIcon trend={stats.trendData.weightTrend} />
              <span className={`ml-1 ${stats.trendData.weightTrend > 0
                ? 'text-green-600'
                : stats.trendData.weightTrend < 0
                  ? 'text-red-600'
                  : 'text-muted-foreground'
                }`}>
                {Math.abs(stats.trendData.weightTrend).toFixed(1)}% vs minggu lalu
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Status Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Approval</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.approvalRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Tingkat approval
            </p>
            <div className="flex gap-2 mt-3">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {stats.pending}
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                {stats.approved}
              </Badge>
              <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                {stats.rejected}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* TBS Quality */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kualitas TBS</CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {stats.quality.hasQualityData ? `${stats.quality.ripeRate.toFixed(1)}%` : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              Persentase buah matang
            </p>
            <div className="flex gap-2 mt-3">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-xs">
                Matang {stats.quality.ripeBunches}
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">
                Cacat {(
                  stats.quality.rawBunches +
                  stats.quality.overripeBunches +
                  stats.quality.rottenBunches +
                  stats.quality.longStalkBunches
                )}
              </Badge>
              <Badge variant="outline" className="bg-slate-50 text-slate-700 text-xs">
                Brondolan {stats.quality.looseFruits}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Defect rate: {stats.quality.defectRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

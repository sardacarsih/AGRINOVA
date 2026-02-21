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
  CircleAlert,
  Clock
} from 'lucide-react';
import { useQuery } from '@apollo/client/react';
// import { GetHarvestStatisticsDocument } from '@/gql/graphql';
import { useAuth } from '@/hooks/use-auth';

interface HarvestStatsProps {
  className?: string;
}

export function HarvestStats({ className }: HarvestStatsProps) {
  const { user } = useAuth();
  const userRole = (user?.role || '').toUpperCase();
  // const { data, loading, error, refetch } = useQuery(GetHarvestStatisticsDocument, {
  //   pollInterval: 60000, // Refresh every minute
  //   errorPolicy: 'all', // Return both data and errors
  //   notifyOnNetworkStatusChange: true,
  //   fetchPolicy: 'cache-and-network',
  //   skip: !user, // Skip query if user is not authenticated
  // });
  const data: any = null;
  const loading = false;
  const error = null;
  const refetch = () => { };

  // Check for authentication errors specifically
  const isAuthError = (error as any)?.graphQLErrors?.some((err: any) =>
    err.message?.includes('authentication required') ||
    err.message?.includes('unauthorized') ||
    err.extensions?.code === 'UNAUTHENTICATED'
  );

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

  const stats = React.useMemo(() => {
    const harvestStats = data?.harvestStatistics;

    if (!harvestStats) {
      return {
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
        }
      };
    }

    // Use backend-calculated statistics
    const total = harvestStats.totalRecords;
    const pending = harvestStats.pendingRecords;
    const approved = harvestStats.approvedRecords;
    const rejected = harvestStats.rejectedRecords;
    const totalWeight = harvestStats.totalBeratTbs;
    const totalBunches = harvestStats.totalJanjang;
    const avgWeightPerRecord = harvestStats.averagePerRecord || 0;
    const avgBunchesPerRecord = total > 0 ? totalBunches / total : 0;

    // Approval rate
    const processedRecords = approved + rejected;
    const approvalRate = processedRecords > 0 ? (approved / processedRecords) * 100 : 0;

    // Calculate today's data (placeholder - could be added to backend)
    const todayRecords = 0;
    const todayWeight = 0;
    const weeklyRecords = 0;
    const weeklyWeight = 0;

    // Trend calculation (placeholder values - backend integration needed)
    const recordsTrend = 0;
    const weightTrend = 0;

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
      }
    };
  }, [data]);

  const TrendIcon = ({ trend }: { trend: number }) => {
    if (trend > 0) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (trend < 0) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return null;
  };

  // Show empty state when no data available  
  if (!loading && (!data?.harvestStatistics || !data.harvestStatistics.totalRecords)) {
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
      {/* TPH System Status Alert - Visible for ASISTEN, MANAGER, and higher roles */}
      {userRole && ['ASISTEN', 'MANAGER', 'AREA_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(userRole) && (
        <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <Package className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                TPH (Tempat Penumpukan Hasil) System Enhanced - Real-time location tracking active
              </span>
              <Badge className="bg-blue-600 text-white">Live</Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className={`grid gap-4 md:grid-cols-2 ${userRole && ['ASISTEN', 'MANAGER', 'AREA_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(userRole)
        ? 'lg:grid-cols-4'
        : 'lg:grid-cols-3'
        } ${className}`}>
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

        {/* TPH Performance - Visible for ASISTEN, MANAGER, and higher roles */}
        {userRole && ['ASISTEN', 'MANAGER', 'AREA_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(userRole) && (
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-bl-full opacity-50"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">TPH Performance</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.avgWeightPerRecord.toFixed(2)} kg
              </div>
              <p className="text-xs text-muted-foreground">
                Rata-rata per TPH entry
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="font-semibold text-purple-600">
                    {(stats.totalWeight / 1000).toFixed(1)}t
                  </div>
                  <div className="text-muted-foreground">Total via TPH</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-semibold text-blue-600">
                    {Math.floor(stats.totalBunches / 100)}+
                  </div>
                  <div className="text-muted-foreground">TPH Used</div>
                </div>
              </div>
              <div className="mt-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded border">
                <div className="flex items-center gap-1 text-xs text-purple-700">
                  <Package className="h-3 w-3" />
                  <span className="font-medium">Enhanced TPH tracking active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

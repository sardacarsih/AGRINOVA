'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Users, 
  Shield, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  Database,
  MapPin,
  Grid3x3,
  UserCheck,
  Crown,
  Globe,
  Clock,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SystemStatistics {
  // Core System Metrics
  totalCompanies: number;
  activeCompanies: number;
  totalEstates: number;
  totalDivisions: number;
  totalBlocks: number;
  
  // User Metrics
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  
  // Role Distribution
  superAdmins: number;
  companyAdmins: number;
  areaManagers: number;
  managers: number;
  asistens: number;
  mandors: number;
  satpams: number;
  
  // Multi-Assignment Analytics
  multiCompanyAreaManagers: number;
  multiEstateManagers: number;
  multiDivisionAsistens: number;
  orphanedUsers: number; // Users without proper assignments
  
  // System Health
  systemHealth: 'healthy' | 'warning' | 'critical';
  systemUptime: string;
  databaseStatus: 'connected' | 'disconnected' | 'error';
  redisStatus: 'connected' | 'disconnected' | 'error';
  wsConnectionStatus: 'connected' | 'disconnected' | 'error';
  
  // Performance Metrics
  totalAPIRequests: number;
  avgResponseTime: number;
  errorRate: number;
  
  // Activity Metrics
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  pendingApprovals: number;
  gateChecksToday: number;
  harvestRecordsToday: number;
  
  // Trends (percentage changes)
  trends: {
    users: number;
    companies: number;
    activities: number;
    performance: number;
  };
  
  lastUpdated: Date;
}

interface SuperAdminStatisticsProps {
  data: SystemStatistics;
  loading?: boolean;
  onRefresh?: () => void;
}

export const SuperAdminStatistics = React.memo(function SuperAdminStatistics({ data, loading = false, onRefresh }: SuperAdminStatisticsProps) {
  const [refreshing, setRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    if (onRefresh && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  const getSystemHealthColor = (health: SystemStatistics['systemHealth']) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
    }
  };

  const getSystemHealthIcon = (health: SystemStatistics['systemHealth']) => {
    switch (health) {
      case 'healthy':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'critical':
        return XCircle;
    }
  };

  const getConnectionStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) {
      return <ArrowUp className="h-3 w-3 text-green-600" />;
    } else if (trend < 0) {
      return <ArrowDown className="h-3 w-3 text-red-600" />;
    }
    return null;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatTrend = (trend: number) => {
    const sign = trend > 0 ? '+' : '';
    return `${sign}${trend.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Detail Sistem</h2>
          <p className="text-gray-600">
            Terakhir diperbarui: {data.lastUpdated.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* System Health Badge */}
          <Badge className={getSystemHealthColor(data.systemHealth)}>
            {React.createElement(getSystemHealthIcon(data.systemHealth), {
              className: "h-4 w-4 mr-1"
            })}
            {data.systemHealth === 'healthy' ? 'Sistem Sehat' :
             data.systemHealth === 'warning' ? 'Sistem Peringatan' : 'Sistem Kritis'}
          </Badge>
          
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
          )}
        </div>
      </div>

      {/* Core System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Perusahaan</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold">{data.totalCompanies}</div>
                <div className={`flex items-center text-xs ${getTrendColor(data.trends.companies)}`}>
                  {getTrendIcon(data.trends.companies)}
                  <span className="ml-1">{formatTrend(data.trends.companies)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {data.activeCompanies} perusahaan aktif
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold">{data.totalUsers}</div>
                <div className={`flex items-center text-xs ${getTrendColor(data.trends.users)}`}>
                  {getTrendIcon(data.trends.users)}
                  <span className="ml-1">{formatTrend(data.trends.users)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {data.activeUsers} aktif • {data.suspendedUsers} ditangguhkan
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sumber Daya Sistem</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalEstates + data.totalDivisions + data.totalBlocks}</div>
              <p className="text-xs text-muted-foreground">
                {data.totalEstates} estate • {data.totalDivisions} divisi • {data.totalBlocks} blok
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kinerja Sistem</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold">{data.avgResponseTime}ms</div>
                <div className={`flex items-center text-xs ${getTrendColor(data.trends.performance)}`}>
                  {getTrendIcon(data.trends.performance)}
                  <span className="ml-1">{formatTrend(data.trends.performance)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {data.errorRate.toFixed(2)}% tingkat kesalahan
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* System Health & Connectivity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Kesehatan Sistem</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Database</span>
              {getConnectionStatusIcon(data.databaseStatus)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Redis Cache</span>
              {getConnectionStatusIcon(data.redisStatus)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">WebSocket</span>
              {getConnectionStatusIcon(data.wsConnectionStatus)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Uptime</span>
              <Badge variant="secondary">{data.systemUptime}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Metrik Aktivitas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Pengguna Aktif Harian</span>
              <span className="font-semibold">{data.dailyActiveUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Menunggu Persetujuan</span>
              <Badge variant={data.pendingApprovals > 10 ? "destructive" : "secondary"}>
                {data.pendingApprovals}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Gate Check Hari Ini</span>
              <span className="font-semibold">{data.gateChecksToday}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Catatan Panen</span>
              <span className="font-semibold">{data.harvestRecordsToday}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Statistik Multi-Penugasan</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Area Manager Multi-Perusahaan</span>
              <Badge className="bg-purple-100 text-purple-800">{data.multiCompanyAreaManagers}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Manager Multi-Estate</span>
              <Badge className="bg-blue-100 text-blue-800">{data.multiEstateManagers}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Asisten Multi-Divisi</span>
              <Badge className="bg-green-100 text-green-800">{data.multiDivisionAsistens}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Pengguna Tanpa Penugasan</span>
              <Badge variant={data.orphanedUsers > 0 ? "destructive" : "secondary"}>
                {data.orphanedUsers}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>Distribusi Peran</span>
          </CardTitle>
          <CardDescription>
            Distribusi pengguna berdasarkan peran dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <motion.div className="text-center space-y-2" whileHover={{ scale: 1.05 }}>
              <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                <Crown className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold">{data.superAdmins}</div>
              <div className="text-xs text-gray-600">Super Admin</div>
            </motion.div>

            <motion.div className="text-center space-y-2" whileHover={{ scale: 1.05 }}>
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <Building className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold">{data.companyAdmins}</div>
              <div className="text-xs text-gray-600">Admin Perusahaan</div>
            </motion.div>

            <motion.div className="text-center space-y-2" whileHover={{ scale: 1.05 }}>
              <div className="w-12 h-12 mx-auto bg-indigo-100 rounded-full flex items-center justify-center">
                <Globe className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold">{data.areaManagers}</div>
              <div className="text-xs text-gray-600">Area Manager</div>
            </motion.div>

            <motion.div className="text-center space-y-2" whileHover={{ scale: 1.05 }}>
              <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold">{data.managers}</div>
              <div className="text-xs text-gray-600">Manager</div>
            </motion.div>

            <motion.div className="text-center space-y-2" whileHover={{ scale: 1.05 }}>
              <div className="w-12 h-12 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold">{data.asistens}</div>
              <div className="text-xs text-gray-600">Asisten</div>
            </motion.div>

            <motion.div className="text-center space-y-2" whileHover={{ scale: 1.05 }}>
              <div className="w-12 h-12 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-2xl font-bold">{data.mandors}</div>
              <div className="text-xs text-gray-600">Mandor</div>
            </motion.div>

            <motion.div className="text-center space-y-2" whileHover={{ scale: 1.05 }}>
              <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div className="text-2xl font-bold">{data.satpams}</div>
              <div className="text-xs text-gray-600">Satpam</div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

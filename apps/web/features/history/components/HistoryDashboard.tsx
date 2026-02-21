'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  History,
  Calendar,
  Download,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { MandorDashboardLayout } from '@/components/layouts/role-layouts/MandorDashboardLayout';

type ViewMode = 'overview' | 'detailed' | 'analytics' | 'export';

interface HistoryRecord {
  id: string;
  date: string;
  block: string;
  team: string;
  totalWeight: number;
  workersCount: number;
  status: 'approved' | 'rejected' | 'pending';
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  notes?: string;
  productivity: number;
}

interface HistoryStats {
  totalRecords: number;
  totalWeight: number;
  averageProductivity: number;
  approvalRate: number;
  bestPerformingBlock: string;
  totalWorkingDays: number;
}

const mockHistoryData: HistoryRecord[] = [
  {
    id: 'H001',
    date: '2024-01-14',
    block: 'A-15',
    team: 'Tim Alpha',
    totalWeight: 1250,
    workersCount: 8,
    status: 'approved',
    approvedBy: 'Asisten Budi',
    approvedAt: '2024-01-14T16:30:00',
    productivity: 96,
    notes: 'Performa sangat baik'
  },
  {
    id: 'H002',
    date: '2024-01-13',
    block: 'B-08',
    team: 'Tim Beta',
    totalWeight: 980,
    workersCount: 7,
    status: 'approved',
    approvedBy: 'Asisten Candra',
    approvedAt: '2024-01-13T17:15:00',
    productivity: 87
  },
  {
    id: 'H003',
    date: '2024-01-12',
    block: 'C-12',
    team: 'Tim Gamma',
    totalWeight: 750,
    workersCount: 6,
    status: 'rejected',
    rejectedReason: 'Data tidak lengkap, perlu input ulang kategori TBS',
    productivity: 65
  },
  {
    id: 'H004',
    date: '2024-01-11',
    block: 'A-20',
    team: 'Tim Alpha',
    totalWeight: 1180,
    workersCount: 8,
    status: 'approved',
    approvedBy: 'Asisten Budi',
    approvedAt: '2024-01-11T16:45:00',
    productivity: 92
  },
  {
    id: 'H005',
    date: '2024-01-10',
    block: 'D-05',
    team: 'Tim Delta',
    totalWeight: 890,
    workersCount: 7,
    status: 'approved',
    approvedBy: 'Asisten Eko',
    approvedAt: '2024-01-10T17:00:00',
    productivity: 83
  }
];

const mockStats: HistoryStats = {
  totalRecords: 45,
  totalWeight: 42750,
  averageProductivity: 88.5,
  approvalRate: 91.1,
  bestPerformingBlock: 'A-15',
  totalWorkingDays: 22
};

export function HistoryDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected' | 'pending'>('all');
  const [dateFilter, setDateFilter] = useState('');

  const filteredData = mockHistoryData.filter(record => {
    const matchesSearch = record.block.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.team.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesDate = !dateFilter || record.date.includes(dateFilter);

    return matchesSearch && matchesStatus && matchesDate;
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

  const handleExport = () => {
    toast({
      title: "Export Data",
      description: "Fitur export data histori akan segera tersedia",
    });
  };

  const handleViewDetail = (recordId: string) => {
    toast({
      title: "Detail Record",
      description: `Melihat detail record ${recordId}`,
    });
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <History className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Total Records</div>
                <div className="text-2xl font-bold">{mockStats.totalRecords}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Total Panen</div>
                <div className="text-2xl font-bold">{(mockStats.totalWeight / 1000).toFixed(1)}t</div>
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
                <div className="text-sm font-medium text-gray-500">Produktivitas</div>
                <div className="text-2xl font-bold">{mockStats.averageProductivity}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Approval Rate</div>
                <div className="text-2xl font-bold">{mockStats.approvalRate}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Performa Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{mockStats.bestPerformingBlock}</div>
              <div className="text-sm text-green-600">Blok Terbaik</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{mockStats.totalWorkingDays}</div>
              <div className="text-sm text-blue-600">Hari Kerja</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">
                {(mockStats.totalWeight / mockStats.totalWorkingDays).toFixed(0)}kg
              </div>
              <div className="text-sm text-purple-600">Rata-rata/Hari</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            Aksi Cepat Histori
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              onClick={() => setViewMode('detailed')}
              className="h-20 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <div className="flex flex-col items-center gap-2">
                <Eye className="h-6 w-6" />
                <span className="text-center">Lihat Detail<br />Histori</span>
              </div>
            </Button>

            <Button
              onClick={() => setViewMode('analytics')}
              variant="outline"
              className="h-20"
              size="lg"
            >
              <div className="flex flex-col items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                <span className="text-center">Analisis<br />Tren</span>
              </div>
            </Button>

            <Button
              onClick={handleExport}
              variant="outline"
              className="h-20"
              size="lg"
            >
              <div className="flex flex-col items-center gap-2">
                <Download className="h-6 w-6" />
                <span className="text-center">Export<br />Data</span>
              </div>
            </Button>

            <Button
              onClick={() => setViewMode('detailed')}
              variant="outline"
              className="h-20"
              size="lg"
            >
              <div className="flex flex-col items-center gap-2">
                <Search className="h-6 w-6" />
                <span className="text-center">Cari &<br />Filter</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Aktivitas Terbaru
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('detailed')}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Lihat Semua
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockHistoryData.slice(0, 5).map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(record.status)}
                    <Badge className={getStatusColor(record.status)}>
                      {record.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <div className="font-medium">{record.team} - Blok {record.block}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(record.date).toLocaleDateString('id-ID')} • {record.totalWeight}kg • {record.workersCount} pekerja
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">Produktivitas: {record.productivity}%</div>
                    {record.approvedBy && (
                      <div className="text-xs text-gray-500">Disetujui: {record.approvedBy}</div>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetail(record.id)}
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

  const renderDetailed = () => (
    <div className="space-y-6">
      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Pencarian & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Cari blok atau tim..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex items-center"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">Semua Status</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
              <option value="pending">Pending</option>
            </select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            <Button onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDateFilter('');
            }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-green-600" />
            Data Histori ({filteredData.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredData.map((record) => (
              <div key={record.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(record.status)}>
                      {getStatusIcon(record.status)}
                      <span className="ml-1">{record.status.toUpperCase()}</span>
                    </Badge>
                    <div className="font-medium">{record.team}</div>
                    <div className="text-sm text-gray-500">ID: {record.id}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetail(record.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Detail
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Tanggal:</span>
                    <div className="font-medium">{new Date(record.date).toLocaleDateString('id-ID')}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Blok:</span>
                    <div className="font-medium">{record.block}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Berat:</span>
                    <div className="font-medium">{record.totalWeight} kg</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Produktivitas:</span>
                    <div className={`font-medium ${record.productivity >= 90 ? 'text-green-600' : record.productivity >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {record.productivity}%
                    </div>
                  </div>
                </div>

                {record.status === 'approved' && record.approvedBy && (
                  <div className="mt-3 p-2 bg-green-50 rounded text-sm">
                    <span className="text-green-800">
                      Disetujui oleh {record.approvedBy} pada {new Date(record.approvedAt!).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}

                {record.status === 'rejected' && record.rejectedReason && (
                  <div className="mt-3 p-2 bg-red-50 rounded text-sm">
                    <span className="text-red-800">
                      Ditolak: {record.rejectedReason}
                    </span>
                  </div>
                )}

                {record.notes && (
                  <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                    <span className="text-blue-800">
                      Catatan: {record.notes}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'detailed':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderDetailed()}
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
                <CardTitle>Analisis Tren & Performa</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <BarChart3 className="h-4 w-4" />
                  <AlertDescription>
                    Fitur analisis tren dan grafik performa akan segera tersedia
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 'export':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Export Data Histori</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Download className="h-4 w-4" />
                  <AlertDescription>
                    Fitur export data dalam format Excel/PDF akan segera tersedia
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
    { label: 'Riwayat Panen', href: '/history' },
    ...(viewMode === 'detailed' ? [{ label: 'Detail' }] : []),
    ...(viewMode === 'analytics' ? [{ label: 'Analisis' }] : []),
    ...(viewMode === 'export' ? [{ label: 'Export' }] : []),
  ];

  const getPageTitle = () => {
    switch (viewMode) {
      case 'detailed': return 'Detail Riwayat Panen';
      case 'analytics': return 'Analisis Performa';
      case 'export': return 'Export Data';
      default: return 'Dashboard Riwayat Panen';
    }
  };

  const getPageDescription = () => {
    switch (viewMode) {
      case 'detailed': return 'Tampilan detail data panen historis';
      case 'analytics': return 'Analisis tren dan performa panen';
      case 'export': return 'Export data histori untuk laporan';
      default: return 'Kelola dan analisis data panen historis';
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
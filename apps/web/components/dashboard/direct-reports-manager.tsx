'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { 
  Users,
  MapPin,
  Building2,
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronRight,
  Eye,
  Calendar,
  Award,
  AlertTriangle
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from '@/types/auth';
import { mockCompanyDataService } from '@/lib/data/mock-company-data';
import { formatWeight, formatCurrency, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface DirectReportsManagerProps {
  areaManagerId: string;
  className?: string;
}

interface ManagerWithStats extends User {
  stats?: {
    totalHarvest: number;
    totalRevenue: number;
    teamSize: number;
    efficiency: number;
    trend: 'up' | 'down' | 'stable';
    lastReport: string;
    status: 'excellent' | 'good' | 'needs-attention';
  };
}

// Mock performance data for managers
const mockManagerStats: Record<string, ManagerWithStats['stats']> = {
  manager_1: {
    totalHarvest: 125000,
    totalRevenue: 2500000000,
    teamSize: 45,
    efficiency: 87,
    trend: 'up',
    lastReport: '2 hours ago',
    status: 'excellent',
  },
  manager_2: {
    totalHarvest: 98000,
    totalRevenue: 1960000000,
    teamSize: 38,
    efficiency: 82,
    trend: 'stable',
    lastReport: '5 hours ago',
    status: 'good',
  },
};

export function DirectReportsManager({ areaManagerId, className }: DirectReportsManagerProps) {
  const [directReports, setDirectReports] = React.useState<ManagerWithStats[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadDirectReports();
  }, [areaManagerId]);

  const loadDirectReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const managers = await mockCompanyDataService.getDirectReportManagers(areaManagerId);
      
      // Enhance with mock stats
      const managersWithStats: ManagerWithStats[] = managers.map(manager => ({
        ...manager,
        stats: mockManagerStats[manager.id] || {
          totalHarvest: Math.floor(Math.random() * 100000) + 50000,
          totalRevenue: Math.floor(Math.random() * 2000000000) + 1000000000,
          teamSize: Math.floor(Math.random() * 30) + 20,
          efficiency: Math.floor(Math.random() * 20) + 70,
          trend: (['up', 'down', 'stable'] as const)[Math.floor(Math.random() * 3)],
          lastReport: `${Math.floor(Math.random() * 24)} hours ago`,
          status: (['excellent', 'good', 'needs-attention'] as const)[Math.floor(Math.random() * 3)],
        }
      }));
      
      setDirectReports(managersWithStats);
    } catch (err) {
      console.error('Failed to load direct reports:', err);
      setError('Failed to load direct reports');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'good':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'needs-attention':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'needs-attention':
        return 'Needs Attention';
      default:
        return 'Unknown';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      case 'stable':
        return <Activity className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendText = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'Trending Up';
      case 'down':
        return 'Trending Down';
      case 'stable':
        return 'Stable';
      default:
        return 'Unknown';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-500" />
            Direct Report Managers
          </CardTitle>
          <CardDescription>Managers yang bertanggung jawab langsung kepada Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-500" />
            Direct Report Managers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadDirectReports} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (directReports.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-500" />
            Direct Report Managers
          </CardTitle>
          <CardDescription>Managers yang bertanggung jawab langsung kepada Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Belum ada Manager yang bertanggung jawab kepada Anda</p>
            <p className="text-sm text-gray-500">Manager akan muncul di sini ketika mereka ditugaskan untuk melaporkan kepada Anda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-500" />
              Direct Report Managers
              <Badge variant="secondary" className="ml-2">
                {directReports.length}
              </Badge>
            </CardTitle>
            <CardDescription>Managers yang bertanggung jawab langsung kepada Anda</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            View All
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {directReports.map((manager, index) => (
            <motion.div
              key={manager.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="p-5 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
            >
              {/* Manager Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                      {manager.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'M'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{manager.name}</h4>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center space-x-1">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{manager.employeeId}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{manager.position}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {manager.assignedEstateNames && manager.assignedEstateNames.length > 0 
                          ? `Estates: ${manager.assignedEstateNames.join(', ')}` 
                          : 'No estates assigned'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Badge className={cn('px-3 py-1 font-semibold', getStatusColor(manager.stats?.status || 'unknown'))}>
                    {getStatusText(manager.stats?.status || 'unknown')}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(manager.stats?.trend || 'stable')}
                    <span className={cn('text-xs font-medium', getTrendColor(manager.stats?.trend || 'stable'))}>
                      {getTrendText(manager.stats?.trend || 'stable')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Manager Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Panen</p>
                  <p className="font-bold text-gray-900 text-sm">{formatWeight(manager.stats?.totalHarvest || 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">bulan ini</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Revenue</p>
                  <p className="font-bold text-gray-900 text-sm">{formatCurrency(manager.stats?.totalRevenue || 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">bulan ini</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Efisiensi</p>
                  <p className="font-bold text-gray-900 text-sm">{manager.stats?.efficiency || 0}%</p>
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${(manager.stats?.efficiency || 0) >= 90 ? 'bg-green-500' : (manager.stats?.efficiency || 0) >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${manager.stats?.efficiency || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Tim</p>
                  <p className="font-bold text-gray-900 text-sm">{manager.stats?.teamSize || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">karyawan</p>
                </div>
              </div>

              {/* Manager Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">Online</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">Last report: {manager.stats?.lastReport || 'Never'}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Contact
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{directReports.length}</span> Manager(s) reporting to you
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-600">
                  {directReports.filter(m => m.stats?.status === 'excellent').length} Excellent
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-xs text-gray-600">
                  {directReports.filter(m => m.stats?.status === 'good').length} Good
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-xs text-gray-600">
                  {directReports.filter(m => m.stats?.status === 'needs-attention').length} Need Attention
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
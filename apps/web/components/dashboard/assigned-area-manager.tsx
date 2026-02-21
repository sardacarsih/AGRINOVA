'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { 
  UserCheck,
  Building2,
  MapPin,
  Phone,
  Mail,
  Eye,
  Calendar,
  MessageCircle,
  ChevronRight,
  Badge as BadgeIcon,
  Award,
  Clock,
  AlertTriangle
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from '@/types/auth';
import { mockCompanyDataService } from '@/lib/data/mock-company-data';

interface AssignedAreaManagerProps {
  userId: string;
  className?: string;
}

interface AreaManagerWithStats extends User {
  stats?: {
    totalDirectReports: number;
    responseTime: string;
    availabilityStatus: 'available' | 'busy' | 'offline';
    lastContact: string;
    totalEstatesSupervised: number;
    totalCompaniesSupervised: number;
  };
}

// Mock additional stats for area manager
const mockAreaManagerStats: Record<string, AreaManagerWithStats['stats']> = {
  area_manager_1: {
    totalDirectReports: 3,
    responseTime: '< 2 hours',
    availabilityStatus: 'available',
    lastContact: '2 hours ago',
    totalEstatesSupervised: 8,
    totalCompaniesSupervised: 2,
  },
  area_manager_3: {
    totalDirectReports: 5,
    responseTime: '< 4 hours',
    availabilityStatus: 'busy',
    lastContact: '1 day ago',
    totalEstatesSupervised: 12,
    totalCompaniesSupervised: 3,
  },
};

export function AssignedAreaManager({ userId, className }: AssignedAreaManagerProps) {
  const [areaManager, setAreaManager] = React.useState<AreaManagerWithStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadAreaManager();
  }, [userId]);

  const loadAreaManager = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user to find their reporting relationship
      const currentUser = await mockCompanyDataService.getUserById(userId);
      if (!currentUser || !currentUser.reportingToAreaManagerId) {
        setAreaManager(null);
        return;
      }

      // Get the Area Manager details
      const areaManagerData = await mockCompanyDataService.getUserById(currentUser.reportingToAreaManagerId);
      if (!areaManagerData) {
        setError('Area Manager not found');
        return;
      }

      // Enhance with mock stats
      const areaManagerWithStats: AreaManagerWithStats = {
        ...areaManagerData,
        stats: mockAreaManagerStats[areaManagerData.id] || {
          totalDirectReports: Math.floor(Math.random() * 5) + 2,
          responseTime: `< ${Math.floor(Math.random() * 8) + 1} hours`,
          availabilityStatus: (['available', 'busy', 'offline'] as const)[Math.floor(Math.random() * 3)],
          lastContact: `${Math.floor(Math.random() * 48)} hours ago`,
          totalEstatesSupervised: Math.floor(Math.random() * 10) + 5,
          totalCompaniesSupervised: Math.floor(Math.random() * 3) + 1,
        }
      };
      
      setAreaManager(areaManagerWithStats);
    } catch (err) {
      console.error('Failed to load area manager:', err);
      setError('Failed to load Area Manager information');
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'offline':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAvailabilityText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'busy':
        return 'Busy';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const getAvailabilityIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>;
      case 'busy':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>;
      case 'offline':
        return <div className="w-3 h-3 bg-gray-500 rounded-full"></div>;
      default:
        return <div className="w-3 h-3 bg-gray-500 rounded-full"></div>;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="h-5 w-5 mr-2 text-blue-500" />
            Area Manager (Atasan)
          </CardTitle>
          <CardDescription>Atasan langsung Anda dalam struktur organisasi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/3"></div>
              </div>
            </div>
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
            <UserCheck className="h-5 w-5 mr-2 text-blue-500" />
            Area Manager (Atasan)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadAreaManager} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!areaManager) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="h-5 w-5 mr-2 text-blue-500" />
            Area Manager (Atasan)
          </CardTitle>
          <CardDescription>Atasan langsung Anda dalam struktur organisasi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Belum ada Area Manager yang ditugaskan</p>
            <p className="text-sm text-gray-500">Hubungi admin untuk mendapatkan Area Manager sebagai atasan langsung</p>
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
              <UserCheck className="h-5 w-5 mr-2 text-blue-500" />
              Area Manager (Atasan)
            </CardTitle>
            <CardDescription>Atasan langsung Anda dalam struktur organisasi</CardDescription>
          </div>
          <Badge className={getAvailabilityColor(areaManager.stats?.availabilityStatus || 'offline')}>
            <div className="flex items-center space-x-2">
              {getAvailabilityIcon(areaManager.stats?.availabilityStatus || 'offline')}
              <span>{getAvailabilityText(areaManager.stats?.availabilityStatus || 'offline')}</span>
            </div>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200"
        >
          {/* Area Manager Profile */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start space-x-4">
              <Avatar className="h-16 w-16 border-2 border-blue-200">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg">
                  {areaManager.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'AM'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-gray-900 text-xl">{areaManager.name}</h3>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <BadgeIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600 font-medium">{areaManager.employeeId}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Award className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600 font-medium">{areaManager.position}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-3">
                  <Badge variant="outline" className="bg-white/50">
                    {areaManager.assignedCompanyNames?.join(', ') || areaManager.company}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="bg-white/70 hover:bg-white">
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact
              </Button>
              <Button variant="outline" size="sm" className="bg-white/70 hover:bg-white">
                <Eye className="h-4 w-4 mr-2" />
                View Profile
              </Button>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-lg">
              <Phone className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Phone</p>
                <p className="text-sm font-medium text-gray-900">{areaManager.phoneNumber || 'Not available'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-lg">
              <Mail className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Email</p>
                <p className="text-sm font-medium text-gray-900">{areaManager.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-lg">
              <Clock className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Response Time</p>
                <p className="text-sm font-medium text-gray-900">{areaManager.stats?.responseTime || 'Unknown'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-lg">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Last Contact</p>
                <p className="text-sm font-medium text-gray-900">{areaManager.stats?.lastContact || 'Never'}</p>
              </div>
            </div>
          </div>

          {/* Area Manager Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Direct Reports</p>
              <p className="font-bold text-gray-900 text-lg">{areaManager.stats?.totalDirectReports || 0}</p>
              <p className="text-xs text-gray-600 mt-1">managers</p>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Estates</p>
              <p className="font-bold text-gray-900 text-lg">{areaManager.stats?.totalEstatesSupervised || 0}</p>
              <p className="text-xs text-gray-600 mt-1">supervised</p>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Companies</p>
              <p className="font-bold text-gray-900 text-lg">{areaManager.stats?.totalCompaniesSupervised || 0}</p>
              <p className="text-xs text-gray-600 mt-1">managed</p>
            </div>
          </div>

          {/* Reporting Guidelines */}
          <div className="p-4 bg-white/80 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
              <Award className="h-4 w-4 mr-2 text-blue-500" />
              Reporting Guidelines
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Submit weekly performance reports every Friday</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Escalate critical issues immediately</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Monthly one-on-one meetings scheduled</span>
              </li>
            </ul>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-blue-200">
            <div className="text-sm text-gray-600">
              Reporting structure established on {new Date(areaManager.createdAt).toLocaleDateString('id-ID')}
            </div>
            <div className="flex items-center space-x-2">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <MessageCircle className="h-4 w-4 mr-2" />
                Send Report
              </Button>
              <Button variant="outline" size="sm" className="bg-white/70 hover:bg-white">
                Schedule Meeting
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  Users,
  Clock,
  Plus,
  Edit,
  CheckCircle,
  AlertTriangle,
  Sun,
  CloudRain,
  Eye,
  UserCheck,
  MapPin,
  Target,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { MandorDashboardLayout } from '@/components/layouts/role-layouts/MandorDashboardLayout';

type ViewMode = 'overview' | 'calendar' | 'teams' | 'planning';

interface ScheduleItem {
  id: string;
  date: string;
  shift: 'pagi' | 'siang' | 'malam';
  block: string;
  team: string;
  workers: string[];
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  weather: 'sunny' | 'cloudy' | 'rainy';
  notes?: string;
}

interface TeamSchedule {
  teamId: string;
  teamName: string;
  leader: string;
  members: number;
  currentBlock: string;
  todayStatus: 'present' | 'partial' | 'absent';
  productivity: number;
}

const mockScheduleData: ScheduleItem[] = [
  {
    id: '1',
    date: '2024-01-15',
    shift: 'pagi',
    block: 'A-15',
    team: 'Tim Alpha',
    workers: ['Ahmad', 'Budi', 'Candra', 'Dedi', 'Eko'],
    status: 'completed',
    weather: 'sunny',
    notes: 'Produktivitas tinggi'
  },
  {
    id: '2',
    date: '2024-01-15',
    shift: 'siang',
    block: 'B-08',
    team: 'Tim Beta',
    workers: ['Fajar', 'Gilang', 'Hendra', 'Ivan', 'Joko'],
    status: 'active',
    weather: 'cloudy'
  },
  {
    id: '3',
    date: '2024-01-16',
    shift: 'pagi',
    block: 'C-12',
    team: 'Tim Gamma',
    workers: ['Krisna', 'Lukman', 'Made', 'Nani', 'Omar'],
    status: 'planned',
    weather: 'sunny'
  }
];

const mockTeamData: TeamSchedule[] = [
  {
    teamId: 'team-alpha',
    teamName: 'Tim Alpha',
    leader: 'Ahmad Santoso',
    members: 8,
    currentBlock: 'A-15',
    todayStatus: 'present',
    productivity: 95
  },
  {
    teamId: 'team-beta',
    teamName: 'Tim Beta',
    leader: 'Budi Raharjo',
    members: 7,
    currentBlock: 'B-08',
    todayStatus: 'partial',
    productivity: 87
  },
  {
    teamId: 'team-gamma',
    teamName: 'Tim Gamma',
    leader: 'Candra Wijaya',
    members: 6,
    currentBlock: 'C-12',
    todayStatus: 'present',
    productivity: 92
  }
];

export function ScheduleDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'active': return <Clock className="h-4 w-4" />;
      case 'planned': return <Calendar className="h-4 w-4" />;
      case 'cancelled': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'sunny': return <Sun className="h-4 w-4 text-yellow-500" />;
      case 'cloudy': return <Sun className="h-4 w-4 text-gray-500" />;
      case 'rainy': return <CloudRain className="h-4 w-4 text-blue-500" />;
      default: return <Sun className="h-4 w-4" />;
    }
  };

  const handleCreateSchedule = () => {
    toast({
      title: "Buat Jadwal Baru",
      description: "Fitur pembuatan jadwal akan segera tersedia",
    });
  };

  const handleEditSchedule = (scheduleId: string) => {
    toast({
      title: "Edit Jadwal",
      description: `Edit jadwal ${scheduleId}`,
    });
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Tim Aktif</div>
                <div className="text-2xl font-bold">3</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Hadir Hari Ini</div>
                <div className="text-2xl font-bold">18/21</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Target className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Target Harian</div>
                <div className="text-2xl font-bold">850kg</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Progress</div>
                <div className="text-2xl font-bold">91%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Aksi Cepat Jadwal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={handleCreateSchedule}
              className="h-20 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <div className="flex flex-col items-center gap-2">
                <Plus className="h-6 w-6" />
                <span className="text-center">Buat Jadwal<br />Baru</span>
              </div>
            </Button>

            <Button
              onClick={() => setViewMode('teams')}
              variant="outline"
              className="h-20"
              size="lg"
            >
              <div className="flex flex-col items-center gap-2">
                <Users className="h-6 w-6" />
                <span className="text-center">Kelola<br />Tim</span>
              </div>
            </Button>

            <Button
              onClick={() => setViewMode('calendar')}
              variant="outline"
              className="h-20"
              size="lg"
            >
              <div className="flex flex-col items-center gap-2">
                <Calendar className="h-6 w-6" />
                <span className="text-center">Lihat<br />Kalender</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-600" />
            Jadwal Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockScheduleData.filter(schedule =>
              schedule.date === new Date().toISOString().split('T')[0]
            ).map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(schedule.status)}
                    <Badge className={getStatusColor(schedule.status)}>
                      {schedule.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <div className="font-medium">{schedule.team}</div>
                    <div className="text-sm text-gray-500">
                      Shift {schedule.shift} • Blok {schedule.block}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getWeatherIcon(schedule.weather)}
                    <span className="text-sm text-gray-500">{schedule.workers.length} pekerja</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditSchedule(schedule.id)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Detail
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Performa Tim
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockTeamData.map((team) => (
              <div key={team.teamId} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{team.teamName}</h4>
                  <Badge
                    variant="outline"
                    className={
                      team.todayStatus === 'present' ? 'bg-green-50 text-green-700' :
                        team.todayStatus === 'partial' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-700'
                    }
                  >
                    {team.todayStatus === 'present' ? 'Lengkap' :
                      team.todayStatus === 'partial' ? 'Sebagian' : 'Tidak Hadir'}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ketua Tim:</span>
                    <span>{team.leader}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Anggota:</span>
                    <span>{team.members} orang</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Blok Saat Ini:</span>
                    <span>{team.currentBlock}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Produktivitas:</span>
                    <span className="font-medium">{team.productivity}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'calendar':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Kalender Jadwal</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    Tampilan kalender jadwal akan segera tersedia
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 'teams':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Manajemen Tim</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    Fitur manajemen tim detail akan segera tersedia
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 'planning':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Perencanaan Jadwal</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Target className="h-4 w-4" />
                  <AlertDescription>
                    Fitur perencanaan jadwal detail akan segera tersedia
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
    { label: 'Jadwal Kerja', href: '/schedule' },
    ...(viewMode === 'calendar' ? [{ label: 'Kalender' }] : []),
    ...(viewMode === 'teams' ? [{ label: 'Tim' }] : []),
    ...(viewMode === 'planning' ? [{ label: 'Perencanaan' }] : []),
  ];

  const getPageTitle = () => {
    switch (viewMode) {
      case 'calendar': return 'Kalender Jadwal';
      case 'teams': return 'Manajemen Tim';
      case 'planning': return 'Perencanaan Jadwal';
      default: return 'Dashboard Jadwal Kerja';
    }
  };

  const getPageDescription = () => {
    switch (viewMode) {
      case 'calendar': return 'Tampilan kalender untuk jadwal kerja tim';
      case 'teams': return 'Kelola tim dan assignment kerja';
      case 'planning': return 'Perencanaan jadwal kerja mendatang';
      default: return 'Kelola jadwal kerja dan assignment tim lapangan';
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
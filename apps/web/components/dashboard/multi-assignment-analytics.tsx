'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building, 
  MapPin, 
  Grid3x3, 
  Users,
  Crown,
  Globe,
  UserCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Activity,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Zap,
  Target,
  Award,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { User, UserRole, USER_ROLE_LABELS } from '@/types/auth';

export interface MultiAssignmentData {
  summary: {
    totalMultiAssignedUsers: number;
    multiCompanyAreaManagers: number;
    multiEstateManagers: number;
    multiDivisionAsistens: number;
    orphanedUsers: number;
    efficiencyScore: number;
    coverageScore: number;
  };
  
  trends: {
    multiAssignments: {
      current: number;
      previous: number;
      change: number;
    };
    efficiency: {
      current: number;
      previous: number;
      change: number;
    };
    coverage: {
      current: number;
      previous: number;
      change: number;
    };
  };
  
  roleBreakdown: {
    role: UserRole;
    total: number;
    multiAssigned: number;
    averageAssignments: number;
    maxAssignments: number;
    efficiency: number;
  }[];
  
  companyAnalysis: {
    companyId: string;
    companyName: string;
    areaManagersAssigned: number;
    managersAssigned: number;
    assistensAssigned: number;
    totalUsers: number;
    multiAssignmentRatio: number;
    coverage: number;
  }[];
  
  assignmentMatrix: {
    userId: string;
    userName: string;
    role: UserRole;
    assignments: {
      type: 'company' | 'estate' | 'division';
      id: string;
      name: string;
    }[];
    workload: number;
    performance: number;
    recommendations: string[];
  }[];
  
  hotspots: {
    type: 'overloaded' | 'underutilized' | 'orphaned' | 'critical';
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    affectedUsers: number;
    affectedUserNames?: string[];
    recommendations: string[];
  }[];
}

interface MultiAssignmentAnalyticsProps {
  data: MultiAssignmentData;
  users: User[];
  onUserSelect?: (user: User) => void;
  onOptimizationRequest?: () => void;
  className?: string;
}

const ROLE_PRIORITY_RULES: Array<{ role: UserRole; rule: string }> = [
  { role: 'SUPER_ADMIN', rule: 'Tidak boleh memiliki assignment' },
  { role: 'COMPANY_ADMIN', rule: 'Wajib memiliki minimal 1 company scope' },
  { role: 'AREA_MANAGER', rule: 'Wajib minimal 1 company, boleh lebih dari 1 company' },
  { role: 'MANAGER', rule: 'Wajib tepat 1 company, wajib minimal 1 estate, boleh multi-estate' },
  { role: 'ASISTEN', rule: 'Wajib memiliki company, estate, dan minimal 1 divisi' },
  { role: 'MANDOR', rule: 'Wajib memiliki company, estate, dan minimal 1 divisi' },
  { role: 'SATPAM', rule: 'Wajib memiliki company scope' },
  { role: 'TIMBANGAN', rule: 'Wajib memiliki company scope' },
  { role: 'GRADING', rule: 'Wajib memiliki company scope' }
];

export function MultiAssignmentAnalytics({
  data,
  users,
  onUserSelect,
  onOptimizationRequest,
  className = ""
}: MultiAssignmentAnalyticsProps) {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [showRecommendations, setShowRecommendations] = useState(true);

  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      selectedRole === 'all' || user.role === selectedRole
    );
  }, [users, selectedRole]);

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return 'text-green-600 bg-green-100';
    if (efficiency >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return TrendingUp;
    if (change < 0) return TrendingDown;
    return Activity;
  };

  const getTrendColor = (change: number, isPositiveGood = true) => {
    if (change === 0) return 'text-gray-600';
    const isPositive = change > 0;
    
    if (isPositiveGood) {
      return isPositive ? 'text-green-600' : 'text-red-600';
    } else {
      return isPositive ? 'text-red-600' : 'text-green-600';
    }
  };

  const getHotspotColor = (type: MultiAssignmentData['hotspots'][0]['type']) => {
    switch (type) {
      case 'overloaded': return 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20';
      case 'underutilized': return 'border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-950/20';
      case 'orphaned': return 'border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20';
      case 'critical': return 'border-purple-200 bg-purple-50 dark:border-purple-900/50 dark:bg-purple-950/20';
    }
  };

  const getHotspotIcon = (type: MultiAssignmentData['hotspots'][0]['type']) => {
    switch (type) {
      case 'overloaded': return AlertTriangle;
      case 'underutilized': return Target;
      case 'orphaned': return Users;
      case 'critical': return Zap;
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return Crown;
      case 'COMPANY_ADMIN': return Building;
      case 'AREA_MANAGER': return Globe;
      case 'MANAGER': return MapPin;
      case 'ASISTEN': return UserCheck;
      case 'MANDOR': return Users;
      case 'SATPAM': return Users;
      case 'TIMBANGAN': return Users;
      case 'GRADING': return Users;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analitik Multi-Penugasan</h2>
          <p className="text-gray-600">
            Analisis penugasan pengguna, efisiensi, dan peluang optimasi
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={onOptimizationRequest}>
            <Zap className="h-4 w-4 mr-1" />
            Optimasi Otomatis
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Ekspor Laporan
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pengguna Multi-Penugasan</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold">{data.summary.totalMultiAssignedUsers}</div>
                <div className={`flex items-center text-xs ${getTrendColor(data.trends.multiAssignments.change)}`}>
                  {React.createElement(getTrendIcon(data.trends.multiAssignments.change), {
                    className: "h-3 w-3 mr-1"
                  })}
                  <span>{Math.abs(data.trends.multiAssignments.change).toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {data.summary.orphanedUsers} pengguna tanpa penugasan
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
              <CardTitle className="text-sm font-medium">Efisiensi Sistem</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold">{data.summary.efficiencyScore}%</div>
                <div className={`flex items-center text-xs ${getTrendColor(data.trends.efficiency.change)}`}>
                  {React.createElement(getTrendIcon(data.trends.efficiency.change), {
                    className: "h-3 w-3 mr-1"
                  })}
                  <span>{Math.abs(data.trends.efficiency.change).toFixed(1)}%</span>
                </div>
              </div>
              <Badge className={getEfficiencyColor(data.summary.efficiencyScore)} variant="secondary">
                {data.summary.efficiencyScore >= 80 ? 'Sangat Baik' :
                 data.summary.efficiencyScore >= 60 ? 'Baik' : 'Perlu Perbaikan'}
              </Badge>
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
              <CardTitle className="text-sm font-medium">Skor Cakupan</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold">{data.summary.coverageScore}%</div>
                <div className={`flex items-center text-xs ${getTrendColor(data.trends.coverage.change)}`}>
                  {React.createElement(getTrendIcon(data.trends.coverage.change), {
                    className: "h-3 w-3 mr-1"
                  })}
                  <span>{Math.abs(data.trends.coverage.change).toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Cakupan sumber daya di seluruh sistem
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
              <CardTitle className="text-sm font-medium">AM Multi-Perusahaan</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.multiCompanyAreaManagers}</div>
              <p className="text-xs text-muted-foreground">
                Manajer area lintas perusahaan
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Hotspots Alert */}
      {data.hotspots.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-900 dark:text-orange-200">
              <AlertTriangle className="h-5 w-5" />
              <span>Area Perhatian Penugasan ({data.hotspots.length})</span>
            </CardTitle>
            <CardDescription className="text-orange-800/90 dark:text-orange-300">
              Area yang memerlukan perhatian segera untuk distribusi penugasan dan validasi scope role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-md border border-orange-200 bg-orange-100/60 px-3 py-2 text-xs text-orange-900 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-200">
              <p className="mb-2 font-semibold">Aturan prioritas per role:</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {ROLE_PRIORITY_RULES.map((item) => (
                  <div key={item.role} className="rounded border border-orange-200 bg-white/70 px-2 py-1 dark:border-orange-900/40 dark:bg-background/70">
                    <strong>{USER_ROLE_LABELS[item.role]}</strong>: {item.rule}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.hotspots.slice(0, 4).map((hotspot, index) => {
                const HotspotIcon = getHotspotIcon(hotspot.type);
                return (
                  <div key={index} className={`p-3 rounded-lg border ${getHotspotColor(hotspot.type)}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <HotspotIcon className="h-4 w-4" />
                      <span className="font-medium text-sm text-foreground">{hotspot.title}</span>
                      <Badge 
                        variant={hotspot.severity === 'high' ? 'destructive' : 
                                hotspot.severity === 'medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {hotspot.severity}
                      </Badge>
                    </div>
                    <p className="mb-2 text-xs text-muted-foreground">{hotspot.description}</p>
                    <div className="text-xs text-muted-foreground">
                      {hotspot.affectedUsers} pengguna terdampak
                    </div>
                    {hotspot.affectedUserNames && hotspot.affectedUserNames.length > 0 && (
                      <div className="mt-1 text-xs text-foreground/90">
                        Username: {hotspot.affectedUserNames.slice(0, 6).join(', ')}
                        {hotspot.affectedUserNames.length > 6 && ` +${hotspot.affectedUserNames.length - 6} lainnya`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {data.hotspots.length > 4 && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm">
                  Lihat Semua Area Perhatian ({data.hotspots.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Ikhtisar</TabsTrigger>
          <TabsTrigger value="roles">Per Peran</TabsTrigger>
          <TabsTrigger value="companies">Per Perusahaan</TabsTrigger>
          <TabsTrigger value="matrix">Matriks Penugasan</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Role Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5" />
                <span>Distribusi Multi-Penugasan per Peran</span>
              </CardTitle>
              <CardDescription>
                Rincian pengguna multi-penugasan di berbagai peran
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.roleBreakdown.map((role, index) => {
                  const RoleIcon = getRoleIcon(role.role);
                  const multiAssignmentRatio = (role.multiAssigned / role.total) * 100;
                  
                  return (
                    <motion.div
                      key={role.role}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <RoleIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{USER_ROLE_LABELS[role.role]}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{role.multiAssigned}/{role.total}</Badge>
                            <Badge className={getEfficiencyColor(role.efficiency)} variant="secondary">
                              {role.efficiency}% efisiensi
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${multiAssignmentRatio}%` }}
                          />
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                          <span>{multiAssignmentRatio.toFixed(1)}% multi-penugasan</span>
                          <span>Rata-rata: {role.averageAssignments.toFixed(1)} penugasan</span>
                          <span>Maks: {role.maxAssignments}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Analisis Berbasis Peran</h3>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">Semua Peran</option>
              {data.roleBreakdown.map(role => (
                <option key={role.role} value={role.role}>
                  {USER_ROLE_LABELS[role.role]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.roleBreakdown
              .filter(role => selectedRole === 'all' || role.role === selectedRole)
              .map((role, index) => {
                const RoleIcon = getRoleIcon(role.role);
                
                return (
                  <motion.div
                    key={role.role}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <RoleIcon className="h-5 w-5" />
                          <span>{USER_ROLE_LABELS[role.role]}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{role.total}</div>
                            <div className="text-xs text-gray-600">Total Pengguna</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{role.multiAssigned}</div>
                            <div className="text-xs text-gray-600">Multi-Penugasan</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Rata-rata Penugasan</span>
                            <span className="font-medium">{role.averageAssignments.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Maks Penugasan</span>
                            <span className="font-medium">{role.maxAssignments}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Skor Efisiensi</span>
                            <Badge className={getEfficiencyColor(role.efficiency)} variant="secondary">
                              {role.efficiency}%
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
          </div>
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Analisis Penugasan Perusahaan</span>
              </CardTitle>
              <CardDescription>
                Distribusi multi-penugasan dan cakupan di seluruh perusahaan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.companyAnalysis.map((company, index) => (
                  <motion.div
                    key={company.companyId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Building className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">{company.companyName}</div>
                          <div className="text-sm text-gray-600">
                            {company.totalUsers} total pengguna
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {(company.multiAssignmentRatio * 100).toFixed(1)}% multi-penugasan
                        </Badge>
                        <Badge className={getEfficiencyColor(company.coverage * 100)} variant="secondary">
                          {(company.coverage * 100).toFixed(0)}% coverage
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">
                          {company.areaManagersAssigned}
                        </div>
                        <div className="text-gray-600">Manajer Area</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {company.managersAssigned}
                        </div>
                        <div className="text-gray-600">Manajer</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {company.assistensAssigned}
                        </div>
                        <div className="text-gray-600">Asisten</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Matriks Penugasan</span>
              </CardTitle>
              <CardDescription>
                Tampilan rinci penugasan dan beban kerja pengguna secara individual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.assignmentMatrix.slice(0, 10).map((user, index) => {
                  const RoleIcon = getRoleIcon(user.role);
                  
                  return (
                    <motion.div
                      key={user.userId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        const fullUser = users.find(u => u.id === user.userId);
                        if (fullUser) onUserSelect?.(fullUser);
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <RoleIcon className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium">{user.userName}</div>
                            <div className="text-sm text-gray-600">
                              {USER_ROLE_LABELS[user.role]}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            {user.assignments.length} penugasan
                          </Badge>
                          <Badge className={getEfficiencyColor(user.performance)} variant="secondary">
                            {user.performance}% kinerja
                          </Badge>
                          <div className="w-16 h-2 bg-gray-200 rounded-full">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                user.workload > 80 ? 'bg-red-500' :
                                user.workload > 60 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${user.workload}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {user.assignments.map((assignment, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {assignment.type === 'company' && <Building className="h-3 w-3 mr-1" />}
                            {assignment.type === 'estate' && <MapPin className="h-3 w-3 mr-1" />}
                            {assignment.type === 'division' && <Grid3x3 className="h-3 w-3 mr-1" />}
                            {assignment.name}
                          </Badge>
                        ))}
                      </div>
                      
                      {showRecommendations && user.recommendations.length > 0 && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                          <div className="font-medium mb-1">Rekomendasi:</div>
                          <ul className="space-y-1">
                            {user.recommendations.slice(0, 2).map((rec, i) => (
                              <li key={i} className="flex items-start space-x-1">
                                <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              
              {data.assignmentMatrix.length > 10 && (
                <div className="text-center mt-6">
                  <Button variant="outline">
                    Lihat Semua {data.assignmentMatrix.length} Pengguna
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

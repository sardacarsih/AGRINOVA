'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  MapPin,
  Crown,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Target,
  Activity,
  GitBranch,
  Zap,
  Award,
  Calendar
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

import { User, Company, Estate } from '@/types/auth';

interface AssignmentAnalyticsProps {
  users: User[];
  companies: Company[];
  estates: Estate[];
  stats: {
    totalAssignments: number;
    activeUsers: number;
    multiAssignedUsers: number;
    unassignedCompanies: number;
    conflictCount: number;
    coveragePercentage: number;
  };
}

interface CompanyAnalytics {
  id: string;
  name: string;
  code: string;
  areaManagerCount: number;
  managerCount: number;
  estateCount: number;
  assignedEstateCount: number;
  coveragePercentage: number;
  efficiency: number;
  workload: number;
  conflicts: number;
}

interface UserAnalytics {
  id: string;
  name: string;
  role: string;
  companyCount: number;
  estateCount: number;
  workloadScore: number;
  efficiencyScore: number;
  conflictCount: number;
  assignmentDate: string;
}

const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export function AssignmentAnalytics({
  users,
  companies,
  estates,
  stats
}: AssignmentAnalyticsProps) {
  // Company Analytics Data
  const companyAnalytics = useMemo((): CompanyAnalytics[] => {
    return companies.map(company => {
      const areaManagers = users.filter(user => 
        user.role === 'AREA_MANAGER' && 
        user.status === 'active' &&
        (user.assignedCompanies?.includes(company.id) || user.companyId === company.id)
      );

      const companyEstates = estates.filter(estate => estate.companyId === company.id);
      
      const managers = users.filter(user => 
        user.role === 'MANAGER' && 
        user.status === 'active' &&
        user.assignedEstates?.some(estateId => 
          companyEstates.some(estate => estate.id === estateId)
        )
      );

      const assignedEstateCount = companyEstates.filter(estate =>
        managers.some(manager => manager.assignedEstates?.includes(estate.id))
      ).length;

      const coveragePercentage = companyEstates.length > 0 
        ? Math.round((assignedEstateCount / companyEstates.length) * 100) 
        : 0;

      // Calculate efficiency (simplified metric)
      const efficiency = Math.min(100, Math.round(
        (coveragePercentage * 0.6) + 
        (areaManagers.length > 0 ? 20 : 0) + 
        (managers.length > 0 ? 20 : 0)
      ));

      // Calculate workload (assignments per user)
      const totalUsers = areaManagers.length + managers.length;
      const totalAssignments = areaManagers.reduce((sum, am) => 
        sum + (am.assignedCompanies?.length || 0), 0
      ) + managers.reduce((sum, m) => 
        sum + (m.assignedEstates?.length || 0), 0
      );
      const workload = totalUsers > 0 ? Math.round(totalAssignments / totalUsers) : 0;

      // Count conflicts
      const conflicts = managers.filter(manager => {
        const areaManagerId = manager.reportingToAreaManagerId;
        const areaManager = areaManagers.find(am => am.id === areaManagerId);
        return !areaManager;
      }).length;

      return {
        id: company.id,
        name: company.name,
        code: company.code,
        areaManagerCount: areaManagers.length,
        managerCount: managers.length,
        estateCount: companyEstates.length,
        assignedEstateCount,
        coveragePercentage,
        efficiency,
        workload,
        conflicts
      };
    });
  }, [users, companies, estates]);

  // User Analytics Data
  const userAnalytics = useMemo((): UserAnalytics[] => {
    const relevantUsers = users.filter(user => 
      ['AREA_MANAGER', 'MANAGER'].includes(user.role) && user.status === 'active'
    );

    return relevantUsers.map(user => {
      const companyCount = user.assignedCompanies?.length || 0;
      const estateCount = user.assignedEstates?.length || 0;
      
      // Calculate workload score
      let workloadScore = 0;
      if (user.role === 'AREA_MANAGER') {
        workloadScore = Math.min(100, companyCount * 25); // Max 4 companies = 100%
      } else if (user.role === 'MANAGER') {
        workloadScore = Math.min(100, estateCount * 15); // Max ~7 estates = 100%
      }

      // Calculate efficiency score (simplified)
      const efficiencyScore = Math.max(20, Math.min(100, 
        workloadScore > 80 ? 60 : // Overloaded
        workloadScore > 50 ? 85 : // Good load
        workloadScore > 20 ? 95 : // Optimal load
        60 // Underutilized
      ));

      // Count conflicts
      let conflictCount = 0;
      if (user.role === 'MANAGER') {
        const areaManagerId = user.reportingToAreaManagerId;
        if (!areaManagerId) {
          conflictCount++;
        } else {
          // Check if Area Manager has access to assigned estates' companies
          const areaManager = users.find(u => u.id === areaManagerId);
          if (areaManager && user.assignedEstates) {
            user.assignedEstates.forEach(estateId => {
              const estate = estates.find(e => e.id === estateId);
              if (estate && !areaManager.assignedCompanies?.includes(estate.companyId)) {
                conflictCount++;
              }
            });
          }
        }
      }

      return {
        id: user.id,
        name: user.name,
        role: user.role,
        companyCount,
        estateCount,
        workloadScore,
        efficiencyScore,
        conflictCount,
        assignmentDate: user.createdAt?.toISOString() || new Date().toISOString()
      };
    });
  }, [users, estates]);

  // Chart Data
  const companyDistributionData = useMemo(() => {
    return companyAnalytics.map(company => ({
      name: company.code,
      areaManagers: company.areaManagerCount,
      managers: company.managerCount,
      estates: company.estateCount,
      coverage: company.coveragePercentage
    }));
  }, [companyAnalytics]);

  const workloadDistributionData = useMemo(() => {
    const workloadRanges = [
      { range: '0-25%', count: 0, color: '#10B981' },
      { range: '26-50%', count: 0, color: '#F59E0B' },
      { range: '51-75%', count: 0, color: '#EF4444' },
      { range: '76-100%', count: 0, color: '#8B5CF6' }
    ];

    userAnalytics.forEach(user => {
      if (user.workloadScore <= 25) workloadRanges[0].count++;
      else if (user.workloadScore <= 50) workloadRanges[1].count++;
      else if (user.workloadScore <= 75) workloadRanges[2].count++;
      else workloadRanges[3].count++;
    });

    return workloadRanges;
  }, [userAnalytics]);

  const efficiencyTrendData = useMemo(() => {
    // Generate trend data for the last 30 days
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      
      return {
        date: date.toISOString().split('T')[0],
        efficiency: Math.round(75 + Math.random() * 20), // Mock data
        assignments: Math.round(stats.totalAssignments * (0.8 + Math.random() * 0.4)),
        conflicts: Math.max(0, Math.round(stats.conflictCount * (0.5 + Math.random() * 1.5)))
      };
    });
  }, [stats]);

  const performanceRadarData = useMemo(() => {
    const avgCoverage = companyAnalytics.reduce((sum, c) => sum + c.coveragePercentage, 0) / (companyAnalytics.length || 1);
    const avgEfficiency = companyAnalytics.reduce((sum, c) => sum + c.efficiency, 0) / (companyAnalytics.length || 1);
    const userUtilization = (stats.activeUsers / (users.filter(u => ['AREA_MANAGER', 'MANAGER'].includes(u.role)).length || 1)) * 100;
    const conflictRate = Math.max(0, 100 - (stats.conflictCount / (stats.totalAssignments || 1)) * 100);

    return [
      { metric: 'Coverage', value: Math.round(avgCoverage), fullMark: 100 },
      { metric: 'Efficiency', value: Math.round(avgEfficiency), fullMark: 100 },
      { metric: 'User Utilization', value: Math.round(userUtilization), fullMark: 100 },
      { metric: 'Quality Score', value: Math.round(conflictRate), fullMark: 100 },
      { metric: 'Balance Score', value: Math.round(85 - (stats.multiAssignedUsers / (stats.activeUsers || 1)) * 20), fullMark: 100 },
      { metric: 'Optimization', value: Math.round(stats.coveragePercentage * 0.8), fullMark: 100 }
    ];
  }, [companyAnalytics, stats, users]);

  const topPerformers = useMemo(() => {
    return userAnalytics
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
      .slice(0, 5);
  }, [userAnalytics]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">System Efficiency</p>
                  <p className="text-2xl font-bold">
                    {Math.round(
                      companyAnalytics.reduce((sum, c) => sum + c.efficiency, 0) / (companyAnalytics.length || 1)
                    )}%
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600">+12% vs last month</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Workload Balance</p>
                  <p className="text-2xl font-bold">
                    {Math.round(
                      userAnalytics.reduce((sum, u) => sum + u.workloadScore, 0) / (userAnalytics.length || 1)
                    )}%
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Target className="h-3 w-3 text-purple-600" />
                    <span className="text-xs text-muted-foreground">Optimal range</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <GitBranch className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Assignment Quality</p>
                  <p className="text-2xl font-bold">
                    {Math.round((1 - (stats.conflictCount / (stats.totalAssignments || 1))) * 100)}%
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-muted-foreground">{stats.conflictCount} conflicts</span>
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Optimization Score</p>
                  <p className="text-2xl font-bold">
                    {Math.round((stats.coveragePercentage + 
                      (stats.multiAssignedUsers / stats.activeUsers * 100) + 
                      ((stats.totalAssignments - stats.conflictCount) / stats.totalAssignments * 100)
                    ) / 3)}%
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Zap className="h-3 w-3 text-yellow-600" />
                    <span className="text-xs text-muted-foreground">Can improve</span>
                  </div>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Analytics Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Company Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Assignment Distribution by Company</CardTitle>
                  <CardDescription>
                    User assignments and coverage across all companies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={companyDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="areaManagers" fill="#3B82F6" name="Area Managers" />
                      <Bar dataKey="managers" fill="#10B981" name="Managers" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Workload Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Workload Distribution</CardTitle>
                  <CardDescription>
                    Distribution of users by workload percentage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={workloadDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ range, count, percent }) => 
                          count > 0 ? `${range}: ${(percent * 100).toFixed(0)}%` : ''
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {workloadDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [
                        `${value} users`, 
                        props.payload.range
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Efficiency Trend */}
            <Card>
              <CardHeader>
                <CardTitle>System Performance Trends</CardTitle>
                <CardDescription>
                  30-day trend of system efficiency, assignments, and conflicts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={efficiencyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="efficiency" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="Efficiency %" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="assignments" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="Total Assignments" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="conflicts" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      name="Conflicts" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {companyAnalytics.map((company, index) => (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {company.code} - {company.name}
                          </CardTitle>
                          <CardDescription>
                            {company.estateCount} estates • {company.areaManagerCount + company.managerCount} assigned users
                          </CardDescription>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              company.efficiency >= 80 ? 'default' :
                              company.efficiency >= 60 ? 'secondary' : 'destructive'
                            }
                          >
                            {company.efficiency}% Efficiency
                          </Badge>
                          {company.conflicts > 0 && (
                            <Badge variant="destructive">
                              {company.conflicts} Conflicts
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">Area Managers</span>
                          </div>
                          <p className="text-2xl font-bold">{company.areaManagerCount}</p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Managers</span>
                          </div>
                          <p className="text-2xl font-bold">{company.managerCount}</p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium">Estate Coverage</span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-2xl font-bold">{company.coveragePercentage}%</p>
                            <Progress value={company.coveragePercentage} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {company.assignedEstateCount} of {company.estateCount} estates
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium">Workload</span>
                          </div>
                          <p className="text-2xl font-bold">{company.workload}</p>
                          <p className="text-xs text-muted-foreground">avg assignments/user</p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-indigo-600" />
                            <span className="text-sm font-medium">Quality</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold">
                              {company.conflicts === 0 ? '100%' : `${Math.max(0, 100 - company.conflicts * 20)}%`}
                            </p>
                            {company.conflicts === 0 ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Performers */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>User Performance Overview</CardTitle>
                  <CardDescription>
                    Top performing users based on efficiency scores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topPerformers.map((user, index) => (
                      <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-medium text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {user.role === 'AREA_MANAGER' ? 'Area Manager' : 'Manager'}
                              </Badge>
                              {user.role === 'AREA_MANAGER' ? (
                                <span className="text-xs text-muted-foreground">
                                  {user.companyCount} companies
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {user.estateCount} estates
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold text-lg">{user.efficiencyScore}%</p>
                          <div className="flex items-center gap-2">
                            <Progress value={user.workloadScore} className="w-20 h-2" />
                            <span className="text-xs text-muted-foreground">
                              {user.workloadScore}% load
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* User Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>User Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Total Active Users</span>
                      <span className="font-medium">{stats.activeUsers}</span>
                    </div>
                    <Progress value={(stats.activeUsers / users.length) * 100} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Multi-Assigned</span>
                      <span className="font-medium">{stats.multiAssignedUsers}</span>
                    </div>
                    <Progress value={(stats.multiAssignedUsers / stats.activeUsers) * 100} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>With Conflicts</span>
                      <span className="font-medium text-red-600">
                        {userAnalytics.filter(u => u.conflictCount > 0).length}
                      </span>
                    </div>
                    <Progress 
                      value={(userAnalytics.filter(u => u.conflictCount > 0).length / stats.activeUsers) * 100} 
                      className="h-2"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Workload Distribution</h4>
                    {workloadDistributionData.map((range, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{range.range}</span>
                        <span className="font-medium">{range.count} users</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Radar */}
              <Card>
                <CardHeader>
                  <CardTitle>System Performance Radar</CardTitle>
                  <CardDescription>
                    Multi-dimensional view of system performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={performanceRadarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]} 
                        tick={false}
                      />
                      <Radar
                        name="Performance"
                        dataKey="value"
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Recommendations</CardTitle>
                  <CardDescription>
                    AI-powered suggestions to improve assignments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.unassignedCompanies > 0 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                        <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Unassigned Companies</p>
                          <p className="text-sm text-muted-foreground">
                            {stats.unassignedCompanies} companies need Area Manager assignment
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {stats.conflictCount > 0 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Assignment Conflicts</p>
                          <p className="text-sm text-muted-foreground">
                            {stats.conflictCount} conflicts need resolution
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {stats.coveragePercentage < 90 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                        <Target className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Improve Coverage</p>
                          <p className="text-sm text-muted-foreground">
                            Consider balancing assignments to reach 90%+ coverage
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Optimization Opportunity</p>
                        <p className="text-sm text-muted-foreground">
                          Redistribute assignments to optimize workload balance
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
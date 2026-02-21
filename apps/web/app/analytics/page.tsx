'use client';

import React from 'react';
import { PERMISSIONS } from '@/types/auth';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { SuperAdminLayout } from '@/components/layout/super-admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  LineChart,
  Users,
  Building,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';

function AnalyticsDashboard() {
  const mockAnalytics = {
    userGrowth: {
      current: 847,
      previous: 782,
      change: 8.3,
      trend: 'up' as const
    },
    companyGrowth: {
      current: 12,
      previous: 11,
      change: 9.1,
      trend: 'up' as const
    },
    systemPerformance: {
      avgResponseTime: 245,
      previous: 268,
      change: -8.6,
      trend: 'down' as const
    },
    dailyActiveUsers: {
      current: 654,
      previous: 621,
      change: 5.3,
      trend: 'up' as const
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Advanced analytics and insights across the entire system
          </p>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockAnalytics.userGrowth.current}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                {mockAnalytics.userGrowth.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                )}
                +{mockAnalytics.userGrowth.change}% from last month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Companies</CardTitle>
              <Building className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockAnalytics.companyGrowth.current}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                {mockAnalytics.companyGrowth.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                )}
                +{mockAnalytics.companyGrowth.change}% from last month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Activity className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockAnalytics.systemPerformance.avgResponseTime}ms</div>
              <p className="text-xs text-muted-foreground flex items-center">
                {mockAnalytics.systemPerformance.trend === 'down' ? (
                  <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <TrendingUp className="h-3 w-3 mr-1 text-red-500" />
                )}
                {mockAnalytics.systemPerformance.change}% from last month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockAnalytics.dailyActiveUsers.current}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                {mockAnalytics.dailyActiveUsers.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                )}
                +{mockAnalytics.dailyActiveUsers.change}% from yesterday
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                User Growth Trend
              </CardTitle>
              <CardDescription>
                Monthly user registration and activity patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>User growth chart visualization</p>
                  <p className="text-sm mt-1">Would show monthly trends, new registrations, and activity patterns</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                User Role Distribution
              </CardTitle>
              <CardDescription>
                Distribution of users across different roles
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <PieChart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>Role distribution pie chart</p>
                  <p className="text-sm mt-1">Would show breakdown by Manager, Asisten, Mandor, Satpam, etc.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                System Performance
              </CardTitle>
              <CardDescription>
                API response times and system health metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <LineChart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>Performance metrics line chart</p>
                  <p className="text-sm mt-1">Would show response times, error rates, and system health over time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Multi-Assignment Analytics
              </CardTitle>
              <CardDescription>
                Analysis of multi-assignment efficiency and coverage
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Multi-Company Area Managers</span>
                  <Badge variant="secondary">2 users</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Multi-Estate Managers</span>
                  <Badge variant="secondary">1 user</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Multi-Division Asistens</span>
                  <Badge variant="secondary">3 users</Badge>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Efficiency Score</span>
                    <span className="text-sm font-semibold text-green-600">87.2%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Coverage Score</span>
                    <span className="text-sm font-semibold text-blue-600">92.8%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Insights Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Key Insights & Recommendations
            </CardTitle>
            <CardDescription>
              AI-powered insights based on system analytics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                  High Workload Detected
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Some Area Managers are handling assignments across 3+ companies. Consider redistributing workload or adding personnel.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-200">
                  Optimal Coverage Achieved
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Current multi-assignment strategy is providing 92.8% coverage across all estates and divisions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200">
                  User Growth Acceleration
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  User registration has increased by 8.3% this month. Consider scaling infrastructure and support resources.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

import { useAuth } from '@/hooks/use-auth';
import ManagerAnalyticsPage from '@/features/manager-dashboard/components/ManagerAnalyticsPage';

function AnalyticsContent() {
  const { user } = useAuth();

  if (user?.role === 'MANAGER' || user?.role === 'AREA_MANAGER') {
    return <ManagerAnalyticsPage />;
  }

  return (
    <SuperAdminLayout
      title="Analytics"
      description="Advanced analytics and insights across the entire system"
      breadcrumbItems={[
        { label: 'Super Admin', href: '/dashboard' },
        { label: 'Analytics' }
      ]}
    >
      <AnalyticsDashboard />
    </SuperAdminLayout>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute
      allowedRoles={['SUPER_ADMIN', 'AREA_MANAGER', 'MANAGER']}
      requiredPermissions={[]} // Remove specific permission requirement for now or add MANAGER permission
    >
      <AnalyticsContent />
    </ProtectedRoute>
  );
}

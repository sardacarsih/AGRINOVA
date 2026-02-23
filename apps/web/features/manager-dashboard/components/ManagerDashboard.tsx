'use client';

import React from 'react';
import { RoleDashboardProps } from '@/features/dashboard/types/dashboard';
import { ManagerDashboardLayout } from '@/components/layouts/role-layouts/ManagerDashboardLayout';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { HarvestList } from '@/features/harvest/components/HarvestList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building, 
  Users, 
  Activity, 
  TrendingUp, 
  MapPin,
  BarChart3,
  TreePine,
  Target,
  FileText,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const DASHBOARD_PAGE_SIZE = 10;

// Manager Dashboard Widgets
function EstateOverviewWidget() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Estate Overview</CardTitle>
        <Building className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">3</div>
        <p className="text-xs text-muted-foreground">
          Estates under management
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">2</div>
            <div className="text-xs text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">1</div>
            <div className="text-xs text-gray-600">Maintenance</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HarvestPerformanceWidget() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Harvest Performance</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">2,850 tons</div>
        <p className="text-xs text-muted-foreground">
          Total monthly production
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm">
            <Activity className="h-3 w-3 text-green-500 mr-2" />
            <span>Daily Avg: 95 tons</span>
          </div>
          <div className="flex items-center text-sm">
            <TrendingUp className="h-3 w-3 text-blue-500 mr-2" />
            <span>Growth: +12.3% vs last month</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkforceWidget() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Workforce Status</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">156</div>
        <p className="text-xs text-muted-foreground">
          Active workers today
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Present</span>
            <Badge variant="outline" className="bg-green-50 text-green-700">148</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">On Leave</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">5</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Absent</span>
            <Badge variant="outline" className="bg-red-50 text-red-700">3</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalStatusWidget() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Approval Status</CardTitle>
        <CheckCircle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">12</div>
        <p className="text-xs text-muted-foreground">
          Pending approvals
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Harvest Data</span>
            <Badge variant="outline" className="bg-orange-50 text-orange-700">8</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Leave Requests</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">3</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Equipment</span>
            <Badge variant="outline" className="bg-purple-50 text-purple-700">1</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivitiesWidget() {
  const activities = [
    {
      id: '1',
      title: 'Harvest Approved',
      description: 'Block A-15 harvest data approved by Asisten Budi',
      time: '30 minutes ago',
      type: 'approval',
      icon: CheckCircle,
    },
    {
      id: '2',
      title: 'Equipment Maintenance',
      description: 'Harvester #3 scheduled for routine maintenance',
      time: '2 hours ago',
      type: 'maintenance',
      icon: AlertTriangle,
    },
    {
      id: '3',
      title: 'New Worker Assignment',
      description: 'Ahmad assigned to Division 2 - Block B sector',
      time: '4 hours ago',
      type: 'assignment',
      icon: Users,
    },
    {
      id: '4',
      title: 'Production Target',
      description: 'Estate Maju achieved 105% of daily target',
      time: '6 hours ago',
      type: 'achievement',
      icon: Target,
    },
  ];

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
        <CardDescription>Latest activities across your estates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-4">
              <div className="rounded-full p-2 bg-green-100">
                <activity.icon className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {activity.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" className="w-full">
            View All Activities
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ManagerDashboard({ role: _role }: RoleDashboardProps) {
  const { loading, refreshMetrics } = useDashboard();

  if (loading) {
    return (
      <ManagerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </ManagerDashboardLayout>
    );
  }

  return (
    <ManagerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Estate Management</h1>
            <p className="text-muted-foreground">
              Multi-estate oversight and harvest monitoring
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={refreshMetrics} variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <EstateOverviewWidget />
          <HarvestPerformanceWidget />
          <WorkforceWidget />
          <ApprovalStatusWidget />
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Monitoring Data Panen
            </h2>
            <p className="text-sm text-muted-foreground">
              Menampilkan kualitas buah dan nama blok (bukan kode blok) dengan
              navigasi halaman kiri/kanan.
            </p>
          </div>
          <HarvestList
            showActions={false}
            pageSize={DASHBOARD_PAGE_SIZE}
            listTitle="Data Panen Asisten & Manager"
          />
        </div>

        {/* Recent Activities & Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <RecentActivitiesWidget />
          
          {/* Estate Operations */}
          <Card>
            <CardHeader>
              <CardTitle>Estate Operations</CardTitle>
              <CardDescription>Quick access to estate management tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <TreePine className="h-4 w-4 mr-2" />
                Division Management
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Team Oversight
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Harvest Analytics
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <MapPin className="h-4 w-4 mr-2" />
                Gate Operations
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Estate Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
}

export default ManagerDashboard;

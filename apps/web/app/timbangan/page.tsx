import { Suspense } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { TimbanganDashboard } from '@/components/weighing/timbangan-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Truck, Clock, TrendingUp } from 'lucide-react';

export default function TimbanganPage() {
  return (
    <DashboardLayout
      title="Dashboard Timbangan"
      description="Pantau dan kelola operasional timbangan TBS"
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Timbangan Hari Ini</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">
                +12% dari kemarin
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tonnase</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156.7</div>
              <p className="text-xs text-muted-foreground">
                Ton TBS
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Antrian</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">
                Kendaraan menunggu
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Efisiensi</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">92%</div>
              <p className="text-xs text-muted-foreground">
                +5% dari target
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Content */}
        <Suspense fallback={<div>Loading dashboard...</div>}>
          <TimbanganDashboard />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
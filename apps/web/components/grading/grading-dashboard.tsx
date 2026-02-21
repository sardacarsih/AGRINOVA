'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Star,
  CheckCircle,
  Clock,
  CircleAlert,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  Award,
  Target
} from 'lucide-react';
import { GradingQueue } from './grading-queue';
import { QualityControlForm } from './quality-control-form';
import { GradingApprovals } from './grading-approvals';
import { QualityAnalytics } from './quality-analytics';

export function GradingDashboard() {
  const [activeTab, setActiveTab] = useState('queue');
  const [currentGrading, setCurrentGrading] = useState(null);

  return (
    <div className="space-y-6">
      {/* Quality Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Status Quality Control
          </CardTitle>
          <CardDescription>
            Monitor proses grading dan kualitas TBS secara real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium">Kualitas Baik</p>
                <p className="text-sm text-muted-foreground">85% dari total</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div>
                <p className="font-medium">Kualitas Sedang</p>
                <p className="text-sm text-muted-foreground">12% dari total</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div>
                <p className="font-medium">Kualitas Rendah</p>
                <p className="text-sm text-muted-foreground">3% dari total</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <div>
                <p className="font-medium">Sedang Diproses</p>
                <p className="text-sm text-muted-foreground">2 grading aktif</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Operations Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Antrian
          </TabsTrigger>
          <TabsTrigger value="quality-control" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Quality Control
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Approval
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <GradingQueue />
        </TabsContent>

        <TabsContent value="quality-control" className="space-y-4">
          <QualityControlForm
            currentGrading={currentGrading}
            setCurrentGrading={setCurrentGrading}
          />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <GradingApprovals />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <QualityAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
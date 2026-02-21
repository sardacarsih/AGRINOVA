'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Scale,
  Truck,
  Clock,
  CircleAlert,
  CheckCircle,
  Play,
  Printer,
  FileText,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { WeighingQueue } from './weighing-queue';
import { WeighingForm } from './weighing-form';
import { WeighingHistory } from './weighing-history';

export function TimbanganDashboard() {
  const [activeTab, setActiveTab] = useState('queue');
  const [currentWeighing, setCurrentWeighing] = useState(null);

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Status Timbangan Saat Ini
          </CardTitle>
          <CardDescription>
            Monitor status operasional timbangan secara real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium">Timbangan Aktif</p>
                <p className="text-sm text-muted-foreground">Siap menerima kendaraan</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
              <div>
                <p className="font-medium">Sedang Ditimbang</p>
                <p className="text-sm text-muted-foreground">BK 1234 CD - Gross</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div>
                <p className="font-medium">Antrian</p>
                <p className="text-sm text-muted-foreground">3 kendaraan</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Operations Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Antrian
          </TabsTrigger>
          <TabsTrigger value="weighing" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Timbangan
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Riwayat
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Laporan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <WeighingQueue />
        </TabsContent>

        <TabsContent value="weighing" className="space-y-4">
          <WeighingForm
            currentWeighing={currentWeighing}
            setCurrentWeighing={setCurrentWeighing}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <WeighingHistory />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Laporan Harian</CardTitle>
              <CardDescription>
                Ringkasan operasional timbangan hari ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium text-green-600 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Performa Positif
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Timbangan per jam:</span>
                      <span className="text-sm font-medium">12.3 (+15%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Rata-rata tonase:</span>
                      <span className="text-sm font-medium">6.5 ton (+8%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Waktu layanan:</span>
                      <span className="text-sm font-medium">8.2 menit (-12%)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-orange-600 flex items-center gap-2">
                    <CircleAlert className="h-4 w-4" />
                    Perlu Perhatian
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Kendaraan terlambat:</span>
                      <span className="text-sm font-medium">3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Queue time {'>'} 30 menit:</span>
                      <span className="text-sm font-medium">2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Anomali pembacaan:</span>
                      <span className="text-sm font-medium">1</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
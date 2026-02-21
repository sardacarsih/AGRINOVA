'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Truck,
  Clock,
  User,
  Play,
  AlertTriangle,
  CheckCircle,
  FileText
} from 'lucide-react';
import { useWeighingOperations } from '@/hooks/use-weighing';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface QueueItem {
  id: string;
  vehicleNumber: string;
  driverName: string;
  vendorName: string;
  arrivalTime: string;
  estimatedTime: string;
  status: 'waiting' | 'weighing' | 'completed';
  priority: 'normal' | 'urgent' | 'vip';
  type: 'in' | 'out';
  position: number;
}

export function WeighingQueue() {
  const router = useRouter();
  const { queue, stats, loading, updatedRecord } = useWeighingOperations();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  // Real-time subscription for queue updates
  useEffect(() => {
    if (updatedRecord) {
      toast.success(`Timbangan kendaraan ${updatedRecord.vehicleNumber} telah diperbarui!`);
    }
  }, [updatedRecord]);

  // Transform GraphQL queue data to match the component's expected format
  const mapPriority = (priority: string): 'normal' | 'urgent' | 'vip' => {
    if (priority === 'high' || priority === 'vip') return 'vip';
    if (priority === 'urgent') return 'urgent';
    return 'normal';
  };

  const transformedQueue: QueueItem[] = queue.map((item, index) => ({
    id: item.id,
    vehicleNumber: item.vehicleNumber,
    driverName: item.driverName,
    vendorName: item.vendorName,
    arrivalTime: new Date().toISOString().slice(11, 16), // TODO: Use actual arrival time
    estimatedTime: new Date().toISOString().slice(11, 16),
    status: item.status as 'waiting' | 'weighing' | 'completed',
    priority: mapPriority(item.priority),
    type: 'in' as 'in' | 'out',
    position: index + 1,
  }));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'weighing':
        return <Badge className="bg-yellow-500">Sedang Ditimbang</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Selesai</Badge>;
      default:
        return <Badge className="bg-blue-500">Menunggu</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'vip':
        return <Badge className="bg-purple-500">VIP</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const getWaitTimeProgress = (arrivalTime: string, estimatedTime: string) => {
    const [arrivalHour, arrivalMin] = arrivalTime.split(':').map(Number);
    const [estHour, estMin] = estimatedTime.split(':').map(Number);

    const arrivalMinutes = arrivalHour * 60 + arrivalMin;
    const estMinutes = estHour * 60 + estMin;
    const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const totalWait = estMinutes - arrivalMinutes;
    const elapsedWait = Math.min(currentMinutes - arrivalMinutes, totalWait);

    return (elapsedWait / totalWait) * 100;
  };

  const handleStartWeighing = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
    // Navigate to weighing form
    router.push('/dashboard/timbangan/weighing');
  };

  return (
    <div className="space-y-4">
      {/* Queue Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Antrian</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sedang Diproses</p>
                <p className="text-2xl font-bold">{stats?.weighing || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Menunggu</p>
                <p className="text-2xl font-bold">{stats?.waiting || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prioritas Tinggi</p>
                <p className="text-2xl font-bold">{stats?.urgent || 0}</p>
              </div>
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Daftar Antrian Kendaraan</span>
            <Button variant="outline" size="sm">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Kelola Prioritas
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Kendaraan</TableHead>
                <TableHead>Supir</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Waktu Datang</TableHead>
                <TableHead>Estimasi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transformedQueue.map((item, index) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{item.position}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      <span className="font-medium">{item.vehicleNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {item.driverName}
                    </div>
                  </TableCell>
                  <TableCell>{item.vendorName}</TableCell>
                  <TableCell>
                    <Badge variant={item.type === 'in' ? 'default' : 'secondary'}>
                      {item.type === 'in' ? 'Masuk' : 'Keluar'}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.arrivalTime}</TableCell>
                  <TableCell>{item.estimatedTime}</TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                  <TableCell className="w-32">
                    <Progress
                      value={getWaitTimeProgress(item.arrivalTime, item.estimatedTime)}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.status === 'waiting' ? 'Menunggu' : 'Memproses'}
                    </p>
                  </TableCell>
                  <TableCell>
                    {item.status === 'waiting' && (
                      <Button
                        size="sm"
                        onClick={() => handleStartWeighing(item.id)}
                        className="gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Mulai
                      </Button>
                    )}
                    {item.status === 'weighing' && (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Sedang Diproses
                      </Badge>
                    )}
                    {item.status === 'completed' && (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Selesai
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {transformedQueue.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {loading ? (
            <div className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse bg-gray-200 rounded-full"></div>
          ) : (
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          )}
          <p>{loading ? 'Memuat data...' : 'Tidak ada antrian timbangan'}</p>
        </div>
      )}
    </div>
  );
}
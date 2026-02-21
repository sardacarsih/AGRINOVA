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
  Star,
  Clock,
  User,
  Play,
  AlertTriangle,
  CheckCircle,
  Target,
  Timer,
  TrendingUp
} from 'lucide-react';
import { useGradingOperations } from '@/hooks/use-grading';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface GradingQueueItem {
  id: string;
  harvestRecordId: string;
  blockName: string;
  harvestDate: string;
  fieldSupervisor: string;
  deliveryTime: string;
  estimatedTime: string;
  status: 'waiting' | 'grading' | 'completed';
  priority: 'normal' | 'urgent' | 'high';
  tonnage: number;
  maturityLevel?: string;
}

export function GradingQueue() {
  const router = useRouter();
  const { queue, stats, loading, updatedRecord, approvedRecord, rejectedRecord } = useGradingOperations();
  const [selectedHarvest, setSelectedHarvest] = useState<string | null>(null);

  // Real-time subscriptions for queue updates
  useEffect(() => {
    if (updatedRecord) {
      toast.success(`Antrian grading untuk ${updatedRecord.harvestRecordId} telah diperbarui!`);
    }
    if (approvedRecord) {
      toast.success(`Grading untuk ${approvedRecord.harvestRecordId} telah disetujui!`);
    }
    if (rejectedRecord) {
      toast.error(`Grading untuk ${rejectedRecord.harvestRecordId} telah ditolak!`);
    }
  }, [updatedRecord, approvedRecord, rejectedRecord]);

  // Transform GraphQL queue data to match the component's expected format
  const transformedQueue: GradingQueueItem[] = queue.map((item, index) => ({
    id: item.id,
    harvestRecordId: item.harvestRecordId,
    blockName: item.blockName,
    harvestDate: item.harvestDate,
    fieldSupervisor: item.fieldSupervisor,
    deliveryTime: new Date().toISOString().slice(11, 16), // TODO: Use actual delivery time
    estimatedTime: new Date().toISOString().slice(11, 16),
    status: item.status as 'waiting' | 'grading' | 'completed',
    priority: item.priority as 'normal' | 'urgent' | 'high',
    tonnage: item.tonnage,
    maturityLevel: item.maturityLevel
  }));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'grading':
        return <Badge className="bg-yellow-500">Sedang Digrading</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Selesai</Badge>;
      default:
        return <Badge className="bg-blue-500">Menunggu</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Prioritas Tinggi</Badge>;
      case 'urgent':
        return <Badge className="bg-orange-500">Urgent</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const getWaitTimeProgress = (deliveryTime: string, estimatedTime: string) => {
    const [deliveryHour, deliveryMin] = deliveryTime.split(':').map(Number);
    const [estHour, estMin] = estimatedTime.split(':').map(Number);

    const deliveryMinutes = deliveryHour * 60 + deliveryMin;
    const estMinutes = estHour * 60 + estMin;
    const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const totalWait = estMinutes - deliveryMinutes;
    const elapsedWait = Math.min(currentMinutes - deliveryMinutes, totalWait);

    return (elapsedWait / totalWait) * 100;
  };

  const handleStartGrading = (harvestId: string) => {
    setSelectedHarvest(harvestId);
    // Navigate to grading form
    router.push('/dashboard/grading/quality-control');
  };

  const getMaturityLevelBadge = (level?: string) => {
    if (!level) return <Badge variant="outline">Belum Diketahui</Badge>;

    const levelMap = {
      'MENTAH': { label: 'Mentah', color: 'bg-green-500' },
      'MASAK': { label: 'Masak', color: 'bg-yellow-500' },
      'TERLALU_MASAK': { label: 'Terlalu Masak', color: 'bg-orange-500' },
      'BUSUK': { label: 'Busuk', color: 'bg-red-500' }
    };

    const levelInfo = levelMap[level as keyof typeof levelMap] || { label: level, color: 'bg-gray-500' };
    return <Badge className={levelInfo.color}>{levelInfo.label}</Badge>;
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
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tonase</p>
                <p className="text-2xl font-bold">{(stats?.totalTonnage || 0).toFixed(1)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sedang Dinilai</p>
                <p className="text-2xl font-bold">{stats?.grading || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
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
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Daftar Antrian Grading</span>
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
                <TableHead>ID Panen</TableHead>
                <TableHead>Blok</TableHead>
                <TableHead>Mandor</TableHead>
                <TableHead>Tonase</TableHead>
                <TableHead>Kematangan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transformedQueue.map((item, index) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      <span className="font-medium">{item.harvestRecordId}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.blockName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {item.fieldSupervisor}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{item.tonnage.toFixed(1)} ton</span>
                  </TableCell>
                  <TableCell>
                    {getMaturityLevelBadge(item.maturityLevel)}
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                  <TableCell className="w-32">
                    <Progress
                      value={getWaitTimeProgress(item.deliveryTime, item.estimatedTime)}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.status === 'waiting' ? 'Menunggu' :
                       item.status === 'grading' ? 'Menilai' : 'Selesai'}
                    </p>
                  </TableCell>
                  <TableCell>
                    {item.status === 'waiting' && (
                      <Button
                        size="sm"
                        onClick={() => handleStartGrading(item.harvestRecordId)}
                        className="gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Mulai
                      </Button>
                    )}
                    {item.status === 'grading' && (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Sedang Dinilai
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
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
          )}
          <p>{loading ? 'Memuat data...' : 'Tidak ada antrian grading'}</p>
        </div>
      )}
    </div>
  );
}
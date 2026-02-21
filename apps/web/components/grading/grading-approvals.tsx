'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Target,
  AlertTriangle,
  User,
  Calendar
} from 'lucide-react';

interface GradingApproval {
  id: string;
  harvestRecordId: string;
  blockName: string;
  graderName: string;
  qualityScore: number;
  maturityLevel: string;
  brondolanPercentage: number;
  looseFruitPercentage: number;
  dirtPercentage: number;
  gradingDate: string;
  gradingNotes: string;
  status: 'pending' | 'approved' | 'rejected';
  qualityCategory: string;
  overallGrade: string;
  tonnage: number;
  submittedAt: string;
}

export function GradingApprovals() {
  const [approvals, setApprovals] = useState<GradingApproval[]>([
    {
      id: '1',
      harvestRecordId: 'HRV-2024-002',
      blockName: 'B-08',
      graderName: 'Grader A',
      qualityScore: 88,
      maturityLevel: 'MASAK',
      brondolanPercentage: 4.5,
      looseFruitPercentage: 2.8,
      dirtPercentage: 1.2,
      gradingDate: '2024-12-03',
      gradingNotes: 'Kualitas baik, tingkat kematangan optimal',
      status: 'pending',
      qualityCategory: 'GOOD',
      overallGrade: 'B',
      tonnage: 1800,
      submittedAt: '2024-12-03 09:30:00'
    },
    {
      id: '2',
      harvestRecordId: 'HRV-2024-003',
      blockName: 'C-15',
      graderName: 'Grader B',
      qualityScore: 92,
      maturityLevel: 'MASAK',
      brondolanPercentage: 3.2,
      looseFruitPercentage: 2.1,
      dirtPercentage: 0.8,
      gradingDate: '2024-12-03',
      gradingNotes: 'Kualitas excellent, sangat sedikit defect',
      status: 'pending',
      qualityCategory: 'EXCELLENT',
      overallGrade: 'A',
      tonnage: 3200,
      submittedAt: '2024-12-03 10:15:00'
    },
    {
      id: '3',
      harvestRecordId: 'HRV-2024-001',
      blockName: 'A-12',
      graderName: 'Grader A',
      qualityScore: 65,
      maturityLevel: 'MENTAH',
      brondolanPercentage: 8.5,
      looseFruitPercentage: 5.2,
      dirtPercentage: 3.8,
      gradingDate: '2024-12-03',
      gradingNotes: 'Kualitas rendah, banyak buah mentah',
      status: 'pending',
      qualityCategory: 'POOR',
      overallGrade: 'D',
      tonnage: 2500,
      submittedAt: '2024-12-03 08:45:00'
    }
  ]);

  const [selectedApproval, setSelectedApproval] = useState<GradingApproval | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Disetujui</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return <Badge className="bg-yellow-500">Menunggu Approval</Badge>;
    }
  };

  const getQualityCategoryBadge = (category: string) => {
    const colors = {
      'EXCELLENT': 'bg-green-500',
      'GOOD': 'bg-blue-500',
      'FAIR': 'bg-yellow-500',
      'POOR': 'bg-orange-500',
      'VERY_POOR': 'bg-red-500'
    };
    return <Badge className={colors[category as keyof typeof colors] || 'bg-gray-500'}>{category}</Badge>;
  };

  const getGradeBadge = (grade: string) => {
    const colors = {
      'A': 'bg-green-500',
      'B': 'bg-blue-500',
      'C': 'bg-yellow-500',
      'D': 'bg-orange-500',
      'E': 'bg-red-500'
    };
    return <Badge className={colors[grade as keyof typeof colors] || 'bg-gray-500'}>Grade {grade}</Badge>;
  };

  const handleApprove = (approval: GradingApproval) => {
    setSelectedApproval(approval);
    setIsApproveDialogOpen(true);
  };

  const handleReject = (approval: GradingApproval) => {
    setSelectedApproval(approval);
    setIsRejectDialogOpen(true);
  };

  const confirmApprove = () => {
    if (selectedApproval) {
      setApprovals(prev => prev.map(approval =>
        approval.id === selectedApproval.id
          ? { ...approval, status: 'approved' as const }
          : approval
      ));
      setIsApproveDialogOpen(false);
      setSelectedApproval(null);
      console.log('Approved grading:', selectedApproval.id);
    }
  };

  const confirmReject = () => {
    if (selectedApproval && rejectionReason.trim()) {
      setApprovals(prev => prev.map(approval =>
        approval.id === selectedApproval.id
          ? {
              ...approval,
              status: 'rejected' as const,
              gradingNotes: `${approval.gradingNotes}\n\nDitolak: ${rejectionReason}`
            }
          : approval
      ));
      setIsRejectDialogOpen(false);
      setSelectedApproval(null);
      setRejectionReason('');
      console.log('Rejected grading:', selectedApproval.id, 'Reason:', rejectionReason);
    }
  };

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const approvedApprovals = approvals.filter(a => a.status === 'approved');
  const rejectedApprovals = approvals.filter(a => a.status === 'rejected');

  const averageQualityScore = approvals.length > 0
    ? approvals.reduce((sum, a) => sum + a.qualityScore, 0) / approvals.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Menunggu Approval</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingApprovals.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Disetujui</p>
                <p className="text-2xl font-bold text-green-600">{approvedApprovals.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ditolak</p>
                <p className="text-2xl font-bold text-red-600">{rejectedApprovals.length}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rata-rata Kualitas</p>
                <p className="text-2xl font-bold">{averageQualityScore.toFixed(1)}</p>
              </div>
              <Star className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approvals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Daftar Approval Quality Control</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                Filter Tanggal
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Target className="h-4 w-4" />
                Filter Blok
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Panen</TableHead>
                  <TableHead>Blok</TableHead>
                  <TableHead>Grader</TableHead>
                  <TableHead>Skor</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Tonnase</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal Submit</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map((approval) => (
                  <TableRow key={approval.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{approval.harvestRecordId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{approval.blockName}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {approval.graderName}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold">{approval.qualityScore}</TableCell>
                    <TableCell>{getQualityCategoryBadge(approval.qualityCategory)}</TableCell>
                    <TableCell>{getGradeBadge(approval.overallGrade)}</TableCell>
                    <TableCell className="font-mono">{approval.tonnage.toLocaleString()} kg</TableCell>
                    <TableCell>{getStatusBadge(approval.status)}</TableCell>
                    <TableCell>{approval.submittedAt}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {approval.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(approval)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(approval)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {approval.status !== 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Setujui Grading
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menyetujui grading ini?
            </DialogDescription>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">ID Panen:</span>
                  <p>{selectedApproval.harvestRecordId}</p>
                </div>
                <div>
                  <span className="font-medium">Blok:</span>
                  <p>{selectedApproval.blockName}</p>
                </div>
                <div>
                  <span className="font-medium">Skor Kualitas:</span>
                  <p>{selectedApproval.qualityScore}</p>
                </div>
                <div>
                  <span className="font-medium">Grade:</span>
                  <p>{selectedApproval.overallGrade}</p>
                </div>
              </div>
              <div>
                <span className="font-medium">Catatan Grader:</span>
                <p className="text-sm text-muted-foreground mt-1">{selectedApproval.gradingNotes}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={confirmApprove} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Ya, Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Tolak Grading
            </DialogTitle>
            <DialogDescription>
              Masukkan alasan penolakan grading ini.
            </DialogDescription>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">ID Panen:</span>
                  <p>{selectedApproval.harvestRecordId}</p>
                </div>
                <div>
                  <span className="font-medium">Blok:</span>
                  <p>{selectedApproval.blockName}</p>
                </div>
                <div>
                  <span className="font-medium">Skor Kualitas:</span>
                  <p>{selectedApproval.qualityScore}</p>
                </div>
                <div>
                  <span className="font-medium">Grade:</span>
                  <p>{selectedApproval.overallGrade}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Alasan Penolakan *</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Masukkan alasan penolakan..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={confirmReject}
              variant="destructive"
              disabled={!rejectionReason.trim()}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Ya, Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
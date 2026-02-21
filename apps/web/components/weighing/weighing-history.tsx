'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Truck,
  Scale,
  FileText
} from 'lucide-react';

interface WeighingRecord {
  id: string;
  ticketNumber: string;
  vehicleNumber: string;
  driverName: string;
  vendorName: string;
  cargoType: string;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  weighingTime: string;
  status: 'completed' | 'voided' | 'corrected';
  operator: string;
}

export function WeighingHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('today');

  // Mock data
  const [records] = useState<WeighingRecord[]>([
    {
      id: '1',
      ticketNumber: 'TBS-2024-001234',
      vehicleNumber: 'BK 1234 CD',
      driverName: 'Ahmad Yani',
      vendorName: 'PT. Sawit Jaya',
      cargoType: 'TBS',
      grossWeight: 12500,
      tareWeight: 3500,
      netWeight: 9000,
      weighingTime: '2024-12-03 08:45:00',
      status: 'completed',
      operator: 'Operator A'
    },
    {
      id: '2',
      ticketNumber: 'TBS-2024-001235',
      vehicleNumber: 'BE 5678 EF',
      driverName: 'Budi Santoso',
      vendorName: 'CV. Agro Mandiri',
      cargoType: 'TBS',
      grossWeight: 11800,
      tareWeight: 3200,
      netWeight: 8600,
      weighingTime: '2024-12-03 09:15:00',
      status: 'completed',
      operator: 'Operator A'
    },
    {
      id: '3',
      ticketNumber: 'TBS-2024-001236',
      vehicleNumber: 'BA 9012 GH',
      driverName: 'Chandra Wijaya',
      vendorName: 'PT. Palm Oil',
      cargoType: 'TBS',
      grossWeight: 13200,
      tareWeight: 3800,
      netWeight: 9400,
      weighingTime: '2024-12-03 09:30:00',
      status: 'voided',
      operator: 'Operator B'
    }
  ]);

  // Filter records
  const filteredRecords = records.filter(record => {
    const matchesSearch =
      record.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.vendorName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Selesai</Badge>;
      case 'voided':
        return <Badge variant="destructive">Batal</Badge>;
      case 'corrected':
        return <Badge className="bg-yellow-500">Dikoreksi</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleView = (record: WeighingRecord) => {
    console.log('View record:', record);
    // TODO: Open detail modal
  };

  const handleEdit = (record: WeighingRecord) => {
    console.log('Edit record:', record);
    // TODO: Open edit modal
  };

  const handleDelete = (record: WeighingRecord) => {
    console.log('Delete record:', record);
    // TODO: Show confirmation and delete
  };

  const handleExport = () => {
    console.log('Export data');
    // TODO: Export to Excel/CSV
  };

  const totalTonnage = filteredRecords
    .filter(r => r.status === 'completed')
    .reduce((sum, record) => sum + record.netWeight, 1000);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Timbangan</p>
                <p className="text-2xl font-bold">{filteredRecords.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tonnase</p>
                <p className="text-2xl font-bold">{(totalTonnage / 1000).toFixed(1)}</p>
              </div>
              <Scale className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Selesai</p>
                <p className="text-2xl font-bold">
                  {filteredRecords.filter(r => r.status === 'completed').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rata-rata</p>
                <p className="text-2xl font-bold">
                  {filteredRecords.length > 0
                    ? Math.round(totalTonnage / filteredRecords.filter(r => r.status === 'completed').length)
                    : 0}
                </p>
              </div>
              <Truck className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Filter & Pencarian</span>
            <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cari</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="No. tiket, kendaraan, supir..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                  <SelectItem value="voided">Batal</SelectItem>
                  <SelectItem value="corrected">Dikoreksi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal</label>
              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tanggal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="yesterday">Kemarin</SelectItem>
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                  <SelectItem value="custom">Kustom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Jenis</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="tbs">TBS</SelectItem>
                  <SelectItem value="cpo">CPO</SelectItem>
                  <SelectItem value="palmKernel">Palm Kernel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Timbangan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Tiket</TableHead>
                  <TableHead>Kendaraan</TableHead>
                  <TableHead>Supir</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Bruto (kg)</TableHead>
                  <TableHead>Tara (kg)</TableHead>
                  <TableHead>Bersih (kg)</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{record.ticketNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {record.vehicleNumber}
                      </div>
                    </TableCell>
                    <TableCell>{record.driverName}</TableCell>
                    <TableCell>{record.vendorName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.cargoType}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{record.grossWeight.toLocaleString()}</TableCell>
                    <TableCell className="font-mono">{record.tareWeight.toLocaleString()}</TableCell>
                    <TableCell className="font-mono font-bold">{record.netWeight.toLocaleString()}</TableCell>
                    <TableCell>{record.weighingTime}</TableCell>
                    <TableCell>{record.operator}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleView(record)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {record.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {record.status === 'voided' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(record)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredRecords.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada data timbangan yang ditemukan</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
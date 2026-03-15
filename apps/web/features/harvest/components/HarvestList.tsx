'use client';

import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Loader2,
  Search,
  Filter,
  Calendar,
  User,
  MapPin,
  Weight,
  Package,
  Clock,
  CircleAlert,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Eye,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useHarvestSubscriptions } from '@/hooks/use-graphql-subscriptions';
import { GraphQLErrorWrapper } from '@/components/ui/graphql-error-handler';
import { useQuery, useMutation } from '@apollo/client/react';
import { DeleteHarvestRecordDocument } from '@/gql/graphql';
import { resolveMediaUrl } from '@/lib/utils/media-url';
import { ALL_COMPANIES_SCOPE, useCompanyScope } from '@/contexts/company-scope-context';
import {
  GET_HARVEST_RECORDS,
  GET_MY_ASSIGNMENTS,
  type GetHarvestRecordsResponse,
  type GetMyAssignmentsResponse,
} from '@/lib/apollo/queries/harvest';
import {
  buildHarvestDateVariables,
  buildHarvestRoleScope,
  isHarvestRecordInScope,
} from '@/features/harvest/utils/harvest-query-params';

// Utility function to sanitize block display text for MANDOR role
const sanitizeBlockDisplay = (text: string | null | undefined, userRole: string | undefined): string => {
  if (!text) return '';

  // For MANDOR role, remove any potential TPH references
  if (userRole === 'MANDOR') {
    return text
      .replace(/TPH[^\s]*/gi, '') // Remove any TPH followed by characters
      .replace(/\btph\b/gi, '')   // Remove standalone 'tph' words
      .replace(/tempat penumpukan hasil/gi, '') // Remove full TPH expansion
      .replace(/\s+/g, ' ')       // Clean up multiple spaces
      .trim();
  }

  return text;
};

const toSafeString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
};

const toSafeNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toSafeDate = (value: unknown): Date | null => {
  const raw = toSafeString(value).trim();
  if (!raw) return null;

  const parsedIso = parseISO(raw);
  if (!Number.isNaN(parsedIso.getTime())) return parsedIso;

  const parsedDate = new Date(raw);
  if (!Number.isNaN(parsedDate.getTime())) return parsedDate;

  return null;
};

const isPlaceholderWorkerValue = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return normalized === '' ||
    normalized === '-' ||
    normalized === '--' ||
    normalized === 'n/a' ||
    normalized === 'na' ||
    normalized === 'null' ||
    normalized === 'undefined';
};

const getDisplayWorkerValue = (karyawan: unknown, nik: unknown): string => {
  const karyawanValue = toSafeString(karyawan).trim();
  const nikValue = toSafeString(nik).trim();

  if (!isPlaceholderWorkerValue(karyawanValue)) return karyawanValue;
  if (!isPlaceholderWorkerValue(nikValue)) return nikValue;

  return '';
};

const getHarvestPhotoUrl = (value: unknown): string => {
  const raw = toSafeString(value).trim();
  if (!raw) return '';
  return resolveMediaUrl(raw);
};

interface HarvestListProps {
  onEdit?: (record: any) => void;
  onView?: (record: any) => void;
  onDateRangeChange?: (dateFrom: string, dateTo: string) => void;
  showActions?: boolean;
  defaultStatus?: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
  enableDateRangeFilter?: boolean;
  defaultDateFrom?: string;
  defaultDateTo?: string;
  listTitle?: string;
  pageSize?: number;
  allowSearchFilter?: boolean;
  allowStatusFilter?: boolean;
  allowSortFilter?: boolean;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  APPROVED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
};

const statusIcons = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
};

export function HarvestList({
  onEdit,
  onView,
  onDateRangeChange,
  showActions = true,
  defaultStatus = 'ALL',
  enableDateRangeFilter = false,
  defaultDateFrom = '',
  defaultDateTo = '',
  listTitle,
  pageSize,
  allowSearchFilter = true,
  allowStatusFilter = true,
  allowSortFilter = true,
}: HarvestListProps) {
  const { user } = useAuth();
  const { selectedCompanyId, selectedCompanyLabel } = useCompanyScope();
  const userRole = (user?.role || '').toUpperCase();
  const isMandor = userRole === 'MANDOR';
  const isMandorReadOnly = isMandor;
  const currentUserId = toSafeString(user?.id).trim();
  const canShowManualActions = showActions && !isMandor;
  const roleSpecificColumn: 'COMPANY' | 'ESTATE' | 'DIVISION' | null =
    userRole === 'AREA_MANAGER'
      ? 'COMPANY'
      : userRole === 'MANAGER'
        ? 'ESTATE'
        : userRole === 'ASISTEN' || userRole === 'MANDOR'
          ? 'DIVISION'
          : null;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>(defaultStatus);
  const [sortBy, setSortBy] = useState<'tanggal' | 'createdAt' | 'beratTbs'>('createdAt');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const realtimeRefetchInFlightRef = React.useRef(false);
  const lastRealtimeRefetchAtRef = React.useRef(0);
  const shouldLoadAssignments = ['ASISTEN', 'MANAGER', 'AREA_MANAGER'].includes(userRole);
  const harvestQueryVariables = React.useMemo(
    () => buildHarvestDateVariables(dateFrom, dateTo),
    [dateFrom, dateTo]
  );

  React.useEffect(() => {
    if (!enableDateRangeFilter || !onDateRangeChange) return;
    onDateRangeChange(dateFrom, dateTo);
  }, [dateFrom, dateTo, enableDateRangeFilter, onDateRangeChange]);

  const { data: assignmentsData } = useQuery<GetMyAssignmentsResponse>(GET_MY_ASSIGNMENTS, {
    skip: !shouldLoadAssignments || !user,
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-first',
  });

  const roleScope = React.useMemo(() => {
    return buildHarvestRoleScope({
      role: userRole,
      currentUserId,
      selectedCompanyId,
      assignments: assignmentsData?.myAssignments,
    });
  }, [assignmentsData?.myAssignments, currentUserId, selectedCompanyId, userRole]);

  const hierarchyContext = React.useMemo(() => {
    const companyNameById = new Map<string, string>();
    const estateMetaById = new Map<string, { name: string; companyId: string }>();
    const divisionMetaById = new Map<string, { name: string; estateId: string }>();

    const assignments = assignmentsData?.myAssignments;
    const companies = assignments?.companies || [];
    const estates = assignments?.estates || [];
    const divisions = assignments?.divisions || [];

    companies.forEach((company) => {
      const id = toSafeString(company?.id).trim();
      if (!id) return;
      companyNameById.set(id, toSafeString(company?.name).trim());
    });

    estates.forEach((estate) => {
      const id = toSafeString(estate?.id).trim();
      if (!id) return;
      estateMetaById.set(id, {
        name: toSafeString(estate?.name).trim(),
        companyId: toSafeString(estate?.companyId).trim(),
      });
    });

    divisions.forEach((division) => {
      const id = toSafeString(division?.id).trim();
      if (!id) return;
      divisionMetaById.set(id, {
        name: toSafeString(division?.name).trim(),
        estateId: toSafeString(division?.estateId).trim(),
      });
    });

    return {
      companyNameById,
      estateMetaById,
      divisionMetaById,
    };
  }, [assignmentsData?.myAssignments]);

  const { data, loading, error, refetch } = useQuery<GetHarvestRecordsResponse>(GET_HARVEST_RECORDS, {
    variables: harvestQueryVariables,
    pollInterval: 30000,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const triggerRealtimeRefetch = React.useCallback(async (
    event: any,
    allowedStatusFilters: Array<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>
  ) => {
    if (!allowedStatusFilters.includes(statusFilter)) {
      return;
    }

    if (isMandor && currentUserId) {
      const eventMandorId = toSafeString(event?.mandor?.id).trim();
      if (!eventMandorId || eventMandorId !== currentUserId) {
        return;
      }
    }

    const now = Date.now();
    if (realtimeRefetchInFlightRef.current || now - lastRealtimeRefetchAtRef.current < 1200) {
      return;
    }

    realtimeRefetchInFlightRef.current = true;
    lastRealtimeRefetchAtRef.current = now;

    try {
      await refetch();
    } finally {
      window.setTimeout(() => {
        realtimeRefetchInFlightRef.current = false;
      }, 250);
    }
  }, [statusFilter, isMandor, currentUserId, refetch]);

  useHarvestSubscriptions({
    onCreated: (record) => {
      void triggerRealtimeRefetch(record, ['ALL', 'PENDING']);
    },
    onApproved: (record) => {
      void triggerRealtimeRefetch(record, ['ALL', 'PENDING', 'APPROVED']);
    },
    onRejected: (record) => {
      void triggerRealtimeRefetch(record, ['ALL', 'PENDING', 'REJECTED']);
    },
  });

  // Delete mutation
  const [deleteRecord, { loading: deleteLoading }] = useMutation(DeleteHarvestRecordDocument, {
    onCompleted: () => {
      refetch();
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data panen ini?')) {
      await deleteRecord({ variables: { id } });
    }
  };

  // Get harvest records from query
  const harvestRecords = React.useMemo(() => {
    const toDateKey = (value: unknown): string => {
      const raw = toSafeString(value).trim();
      if (!raw) return '';
      return raw.slice(0, 10);
    };

    let records = data?.harvestRecords || [];
    records = records.filter((record: any) => isHarvestRecordInScope(record, roleScope));

    // Filter by search term with role-based sanitization
    let filteredRecords = records.filter((record: any) => {
      const recordDate = toDateKey(record.tanggal);
      if (enableDateRangeFilter || dateFrom || dateTo) {
        if (dateFrom && recordDate < dateFrom) return false;
        if (dateTo && recordDate > dateTo) return false;
      }

      const searchLower = searchTerm.toLowerCase();
      const karyawanDisplay = getDisplayWorkerValue(record.karyawan, record.nik);
      const nikValue = toSafeString(record.nik).toLowerCase();

      // Apply sanitization for MANDOR role in search
      const sanitizedKodeBlok = sanitizeBlockDisplay(record.block?.blockCode, userRole)?.toLowerCase() || '';
      const sanitizedNamaBlok = sanitizeBlockDisplay(record.block?.name, userRole)?.toLowerCase() || '';
      const sanitizedDivisiNama = sanitizeBlockDisplay(record.block?.division?.name, userRole)?.toLowerCase() || '';

      return (
        sanitizedKodeBlok.includes(searchLower) ||
        sanitizedNamaBlok.includes(searchLower) ||
        sanitizedDivisiNama.includes(searchLower) ||
        nikValue.includes(searchLower) ||
        karyawanDisplay.toLowerCase().includes(searchLower) ||
        record.mandor?.name?.toLowerCase().includes(searchLower) // Changed from nama to name based on schema
      );
    });

    if (statusFilter !== 'ALL') {
      filteredRecords = filteredRecords.filter((record: any) => {
        const statusValue = toSafeString(record.status).toUpperCase();
        return statusValue === statusFilter;
      });
    }

    // Sort records
    filteredRecords = [...filteredRecords].sort((a: any, b: any) => {
      switch (sortBy) {
        case 'tanggal':
          return (toSafeDate(b.tanggal)?.getTime() ?? 0) - (toSafeDate(a.tanggal)?.getTime() ?? 0);
        case 'beratTbs':
          return toSafeNumber(b.beratTbs ?? b.berat_tbs) - toSafeNumber(a.beratTbs ?? a.berat_tbs);
        default:
          return (toSafeDate(b.createdAt ?? b.created_at)?.getTime() ?? 0) - (toSafeDate(a.createdAt ?? a.created_at)?.getTime() ?? 0);
      }
    });

    return filteredRecords;
  }, [data, roleScope, searchTerm, statusFilter, sortBy, userRole, enableDateRangeFilter, dateFrom, dateTo]);

  const normalizedPageSize = React.useMemo(() => {
    if (typeof pageSize !== 'number') return null;
    const normalized = Math.floor(pageSize);
    return normalized > 0 ? normalized : null;
  }, [pageSize]);

  const totalPages = React.useMemo(() => {
    if (!normalizedPageSize) return 1;
    return Math.max(1, Math.ceil(harvestRecords.length / normalizedPageSize));
  }, [harvestRecords.length, normalizedPageSize]);

  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, sortBy, dateFrom, dateTo, normalizedPageSize]);

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const displayedRecords = React.useMemo(() => {
    if (!normalizedPageSize) return harvestRecords;
    const start = (page - 1) * normalizedPageSize;
    return harvestRecords.slice(start, start + normalizedPageSize);
  }, [harvestRecords, normalizedPageSize, page]);

  // Check for authentication errors specifically
  const isAuthError = (error as any)?.graphQLErrors?.some((err: any) =>
    err.message?.includes('authentication required') ||
    err.message?.includes('unauthorized') ||
    err.message?.includes('authentication') ||
    err.extensions?.code === 'UNAUTHENTICATED'
  );

  // Show loading only for initial load, not for auth errors
  if (loading && !data && !error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Memuat data panen...</span>
        </CardContent>
      </Card>
    );
  }

  // Show authentication prompt if not logged in
  if (isAuthError) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Alert>
            <AlertDescription>
              Anda harus login untuk melihat data panen. Silakan <a href="/login" className="text-blue-600 underline">login terlebih dahulu</a>.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <GraphQLErrorWrapper
            error={error}
            onRetry={() => refetch()}
            title="Gagal Memuat Data Panen"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              {listTitle || (isMandorReadOnly ? 'Record Hasil Sync Mobile' : 'Data Panen')}
            </CardTitle>
            {normalizedPageSize && (
              <p className="text-xs text-muted-foreground">
                Halaman {Math.min(page, totalPages)} dari {totalPages} (maks {normalizedPageSize} data per halaman)
              </p>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            {allowSearchFilter && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari blok, divisi, karyawan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
            )}

            {/* Status Filter */}
            {allowStatusFilter && (
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Sort */}
            {allowSortFilter && (
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Terbaru</SelectItem>
                  <SelectItem value="tanggal">Tanggal Panen</SelectItem>
                  <SelectItem value="beratTbs">Berat TBS</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Date Range Filter */}
            {enableDateRangeFilter && (
              <>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full sm:w-40"
                  aria-label="Tanggal mulai"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full sm:w-40"
                  aria-label="Tanggal akhir"
                />
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {displayedRecords.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-3">Tidak Ada Data Panen</h3>

            {/* Different messages based on filter and search state */}
            {searchTerm ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Tidak ditemukan data panen dengan kata kunci: <strong>"{searchTerm}"</strong>
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Tip: Coba gunakan kata kunci pencarian yang berbeda atau reset filter
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('ALL');
                    if (enableDateRangeFilter) {
                      setDateFrom('');
                      setDateTo('');
                    }
                  }}
                  className="mb-4"
                >
                  Reset Filter
                </Button>
              </div>
            ) : statusFilter !== 'ALL' ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Tidak ada data panen dengan status <strong>{statusFilter.toLowerCase()}</strong>
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Tip: Semua data panen dengan status ini akan muncul di sini
                </p>
                <Button
                  variant="outline"
                  onClick={() => setStatusFilter('ALL')}
                  className="mb-4"
                >
                  Lihat Semua Status
                </Button>
              </div>
            ) : enableDateRangeFilter && (dateFrom || dateTo) ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Tidak ada data panen pada range tanggal yang dipilih.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="mb-4"
                >
                  Reset Range Tanggal
                </Button>
              </div>
            ) : (
              <div className="space-y-4 max-w-md mx-auto">
                <p className="text-muted-foreground">
                  Belum ada data panen yang tersedia di sistem
                </p>

                {/* Role-based guidance (hidden for Mandor) */}
                {userRole !== 'MANDOR' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                    <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <CircleAlert className="h-4 w-4" />
                      Panduan {userRole === 'ASISTEN' ? 'Asisten' : 'User'}
                    </h4>
                    {userRole === 'ASISTEN' && (
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>- Data panen dari Mandor akan muncul di sini setelah diinput</li>
                        <li>- Anda dapat melakukan approval/reject pada data dengan status <strong>PENDING</strong></li>
                        <li>- Pastikan Mandor telah menginput data panen hari ini</li>
                      </ul>
                    )}
                    {userRole === 'MANAGER' && (
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>- Monitor data panen yang telah disetujui oleh Asisten</li>
                        <li>- Data dengan status <strong>APPROVED</strong> akan muncul di statistik</li>
                        <li>- Pastikan tim lapangan (Mandor/Asisten) sudah input data</li>
                      </ul>
                    )}
                    {(!userRole || !['ASISTEN', 'MANAGER'].includes(userRole)) && (
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>- Pastikan tim lapangan telah menginput data panen</li>
                        <li>- Data akan muncul sesuai dengan role dan akses Anda</li>
                        <li>- Hubungi administrator jika Anda butuh akses tambahan</li>
                      </ul>
                    )}
                  </div>
                )}
                {/* System info */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Data akan refresh otomatis setiap 30 detik.</p>
                  <p>Terakhir diperbarui: {new Date().toLocaleTimeString('id-ID')}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Blok</TableHead>
                  {roleSpecificColumn === 'COMPANY' && <TableHead>Perusahaan</TableHead>}
                  {roleSpecificColumn === 'ESTATE' && <TableHead>Estate</TableHead>}
                  {roleSpecificColumn === 'DIVISION' && <TableHead>Divisi</TableHead>}
                  <TableHead>NIK</TableHead>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Kualitas Buah</TableHead>
                  <TableHead>Foto</TableHead>
                  <TableHead>Berat TBS</TableHead>
                  <TableHead>Janjang</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mandor</TableHead>
                  {canShowManualActions && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedRecords.map((record: any) => {
                  const StatusIcon = statusIcons[record.status as keyof typeof statusIcons];
                  const harvestDate = toSafeDate(record.tanggal);
                  const createdAtDate = toSafeDate(record.createdAt ?? record.created_at);
                  const nik = toSafeString(record.nik);
                  const karyawanDisplay = getDisplayWorkerValue(record.karyawan, record.nik);
                  const jjgMatang = toSafeNumber(record.jjgMatang ?? record.jjg_matang);
                  const jjgMentah = toSafeNumber(record.jjgMentah ?? record.jjg_mentah);
                  const jjgLewatMatang = toSafeNumber(record.jjgLewatMatang ?? record.jjg_lewat_matang);
                  const jjgBusukAbnormal = toSafeNumber(record.jjgBusukAbnormal ?? record.jjg_busuk_abnormal);
                  const jjgTangkaiPanjang = toSafeNumber(record.jjgTangkaiPanjang ?? record.jjg_tangkai_panjang);
                  const totalBrondolan = toSafeNumber(record.totalBrondolan ?? record.total_brondolan);
                  const photoUrl = getHarvestPhotoUrl(record.photoUrl ?? record.photo_url);
                  const beratTbs = toSafeNumber(record.beratTbs ?? record.berat_tbs);
                  const jumlahJanjang = toSafeNumber(record.jumlahJanjang ?? record.jumlah_janjang);
                  const divisionId = toSafeString(
                    record.block?.division?.id ??
                    record.divisionId ??
                    record.division_id
                  ).trim();
                  const divisionMeta = hierarchyContext.divisionMetaById.get(divisionId);
                  const divisionName = sanitizeBlockDisplay(
                    record.block?.division?.name || divisionMeta?.name || '',
                    userRole
                  );
                  const estateMeta = hierarchyContext.estateMetaById.get(
                    toSafeString(divisionMeta?.estateId).trim()
                  );
                  const estateName = toSafeString(estateMeta?.name).trim();
                  const companyName = toSafeString(
                    hierarchyContext.companyNameById.get(toSafeString(estateMeta?.companyId).trim())
                  ).trim();
                  const scopedCompanyFallback =
                    selectedCompanyId && selectedCompanyId !== ALL_COMPANIES_SCOPE
                      ? toSafeString(selectedCompanyLabel).trim()
                      : '';
                  const canEdit = canShowManualActions &&
                    userRole === 'MANDOR' &&
                    record.status === 'PENDING' &&
                    record.mandor?.id === user.id;

                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {harvestDate ? format(harvestDate, 'dd MMM yyyy', { locale: idLocale }) : '-'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Input: {createdAtDate ? format(createdAtDate, 'HH:mm') : '-'}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {sanitizeBlockDisplay(record.block?.name, userRole) || 'Blok tidak tersedia'}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {roleSpecificColumn === 'COMPANY' && (
                        <TableCell>
                          <span className="text-sm">{companyName || scopedCompanyFallback || '-'}</span>
                        </TableCell>
                      )}

                      {roleSpecificColumn === 'ESTATE' && (
                        <TableCell>
                          <span className="text-sm">{estateName || '-'}</span>
                        </TableCell>
                      )}

                      {roleSpecificColumn === 'DIVISION' && (
                        <TableCell>
                          <span className="text-sm">{divisionName || '-'}</span>
                        </TableCell>
                      )}

                      <TableCell>
                        <span className="font-mono text-xs">{nik || '-'}</span>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div className="text-sm">
                            {karyawanDisplay.length > 30
                              ? `${karyawanDisplay.substring(0, 30)}...`
                              : karyawanDisplay || '-'
                            }
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div className="font-medium">
                            Matang {jjgMatang} | Mentah {jjgMentah} | Lewat {jjgLewatMatang}
                          </div>
                          <div className="text-muted-foreground">
                            Busuk {jjgBusukAbnormal} | Tangkai {jjgTangkaiPanjang} | Brondolan {totalBrondolan.toFixed(1)}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {photoUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewPhotoUrl(photoUrl)}
                            className="group relative block h-12 w-12 overflow-hidden rounded-md border border-border bg-muted/20"
                            title="Lihat foto panen"
                          >
                            <img
                              src={photoUrl}
                              alt={`Foto panen ${record.id}`}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                              }}
                            />
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <ImageIcon className="h-3.5 w-3.5" />
                            -
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Weight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{beratTbs.toFixed(2)} kg</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>{jumlahJanjang}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge className={statusColors[record.status as keyof typeof statusColors]}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {record.status}
                        </Badge>
                        {/* Approval info would need to be added to query if needed */}
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {record.mandor?.name || 'Mandor tidak tersedia'}
                        </div>
                      </TableCell>

                      {canShowManualActions && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {onView && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onView(record)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}

                            {canEdit && onEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(record)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}

                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(record.id)}
                                disabled={deleteLoading}
                              >
                                {deleteLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {normalizedPageSize && harvestRecords.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Menampilkan {displayedRecords.length} dari {harvestRecords.length} data
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Kiri
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
              >
                Kanan
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <Dialog open={Boolean(previewPhotoUrl)} onOpenChange={(open) => {
        if (!open) {
          setPreviewPhotoUrl(null);
        }
      }}>
        <DialogContent className="max-w-3xl p-2 sm:p-4">
          <DialogTitle className="sr-only">Preview Foto Panen</DialogTitle>
          {previewPhotoUrl && (
            <img
              src={previewPhotoUrl}
              alt="Preview foto panen"
              className="max-h-[75vh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

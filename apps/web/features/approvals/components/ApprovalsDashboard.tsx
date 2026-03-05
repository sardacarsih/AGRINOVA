'use client';

import React from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { CheckCircle, ChevronLeft, ChevronRight, Clock, Eye, FileText, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MandorDashboardLayout } from '@/components/layouts/role-layouts/MandorDashboardLayout';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { PermissionManager } from '@/lib/auth/permissions';
import { PERMISSIONS } from '@/types/auth';
import { resolveMediaUrl } from '@/lib/utils/media-url';
import {
  GET_HARVEST_RECORD,
  type GetHarvestRecordResponse,
  type HarvestRecord as HarvestQualityRecord,
} from '@/lib/apollo/queries/harvest';

type ViewMode = 'overview' | 'pending' | 'history';
type HarvestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type ApprovalPriority = 'NORMAL' | 'HIGH' | 'URGENT';
type ApprovalSortField = 'SUBMITTED_AT' | 'HARVEST_DATE' | 'WEIGHT' | 'TBS_COUNT' | 'PRIORITY';
type SortDirection = 'ASC' | 'DESC';
type QualityGrade = 'A' | 'B' | 'C';

type ApprovalItem = {
  id: string;
  harvestDate: string;
  employeeCount: number;
  employees: string;
  tbsCount: number;
  weight: number;
  submittedAt: string;
  elapsedTime: string;
  status: HarvestStatus;
  hasPhoto: boolean;
  photoUrls?: string[] | null;
  notes?: string | null;
  priority: ApprovalPriority;
  validationIssues?: string[] | null;
  mandor: { id: string; name: string; username?: string | null };
  block: { id: string; blockCode?: string | null; name?: string | null };
  division: { id: string; name: string };
};

type ApprovalListPayload = {
  items: ApprovalItem[];
  totalCount: number;
  hasMore: boolean;
  pageInfo: { currentPage: number; totalPages: number; pageSize: number };
};

type AssignmentDivision = {
  id: string;
  name: string;
  code?: string | null;
  estateId: string;
};

type AssignmentEstate = {
  id: string;
  name: string;
  code?: string | null;
  companyId?: string | null;
};

type ApprovalPageData = {
  pendingApprovals: ApprovalListPayload;
  approvalHistory: ApprovalListPayload;
  approvalStats: {
    totalSubmissions: number;
    totalApproved: number;
    totalRejected: number;
    approvalRate: number;
  };
  myAssignments: {
    divisions: AssignmentDivision[];
    estates: AssignmentEstate[];
  };
  mandorOptions: {
    users: Array<{
      id: string;
      name: string;
      username?: string | null;
      divisions?: Array<{ id: string; name: string }>;
    }>;
  };
};

type FilterPriority = ApprovalPriority | 'ALL';
type FilterHistoryStatus = HarvestStatus | 'ALL';
type ApprovalFilterVariables = {
  status?: HarvestStatus;
  priority?: ApprovalPriority;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  divisionId?: string;
  mandorId?: string;
  sortBy?: ApprovalSortField;
  sortDirection?: SortDirection;
  page: number;
  pageSize: number;
};

type ApprovalPageVariables = {
  pendingFilter: ApprovalFilterVariables;
  historyFilter: ApprovalFilterVariables;
  statsDateFrom?: string;
  statsDateTo?: string;
};

type ApproveMutationData = { approveHarvestRecord: { id: string } };
type RejectMutationData = { rejectHarvestRecord: { id: string } };
type ApproveMutationVariables = { input: { id: string; approvedBy: string } };
type RejectMutationVariables = { input: { id: string; rejectedReason: string } };

const APPROVAL_ITEM_FIELDS = gql`
  fragment ApprovalItemFields on ApprovalItem {
    id
    harvestDate
    employeeCount
    employees
    tbsCount
    weight
    submittedAt
    elapsedTime
    status
    hasPhoto
    photoUrls
    notes
    priority
    validationIssues
    mandor {
      id
      name
      username
    }
    block {
      id
      blockCode
      name
    }
    division {
      id
      name
    }
  }
`;

const GET_APPROVAL_PAGE_DATA = gql`
  ${APPROVAL_ITEM_FIELDS}
  query GetApprovalPageData($pendingFilter: ApprovalFilterInput, $historyFilter: ApprovalFilterInput, $statsDateFrom: Time, $statsDateTo: Time) {
    pendingApprovals(filter: $pendingFilter) {
      items { ...ApprovalItemFields }
      totalCount
      hasMore
      pageInfo { currentPage totalPages pageSize }
    }
    approvalHistory(filter: $historyFilter) {
      items { ...ApprovalItemFields }
      totalCount
      hasMore
      pageInfo { currentPage totalPages pageSize }
    }
    approvalStats(dateFrom: $statsDateFrom, dateTo: $statsDateTo) {
      totalSubmissions
      totalApproved
      totalRejected
      approvalRate
    }
    myAssignments {
      estates {
        id
        name
        code
        companyId
      }
      divisions {
        id
        name
        code
        estateId
      }
    }
    mandorOptions: users(role: MANDOR, isActive: true, limit: 200, offset: 0) {
      users {
        id
        name
        username
        divisions {
          id
          name
        }
      }
    }
  }
`;

const APPROVE_HARVEST_RECORD = gql`
  mutation ApproveHarvestRecord($input: ApproveHarvestInput!) {
    approveHarvestRecord(input: $input) { id }
  }
`;

const REJECT_HARVEST_RECORD = gql`
  mutation RejectHarvestRecord($input: RejectHarvestInput!) {
    rejectHarvestRecord(input: $input) { id }
  }
`;

const statusClass: Record<HarvestStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
};

const priorityClass: Record<ApprovalPriority, string> = {
  NORMAL: 'bg-slate-100 text-slate-700 border-slate-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  URGENT: 'bg-red-100 text-red-800 border-red-200',
};
const qualityGradeClass: Record<QualityGrade, string> = {
  A: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  B: 'bg-amber-100 text-amber-800 border-amber-200',
  C: 'bg-rose-100 text-rose-800 border-rose-200',
};

const APPROVALS_CONTENT_MAX_WIDTH_CLASS = 'max-w-none';
const APPROVALS_CONTENT_PADDING_CLASS = 'px-2 sm:px-3 lg:px-4 py-4 sm:py-5 lg:py-6';

const formatDate = (value: string) =>
  new Date(value).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const toDateStartIso = (value: string) => new Date(`${value}T00:00:00`).toISOString();
const toDateEndIso = (value: string) => new Date(`${value}T23:59:59.999`).toISOString();
const normalizeRole = (role?: string) => (role || '').toUpperCase().replace(/[\s-]+/g, '_');
const getBlockDisplayName = (block: ApprovalItem['block']) => block.name || block.blockCode || 'Blok';
const getPrimaryPhotoUrl = (item: ApprovalItem) => {
  if (!item.hasPhoto || !item.photoUrls || item.photoUrls.length === 0) {
    return '';
  }
  return resolveMediaUrl(item.photoUrls[0]);
};
const getQualityIssueCount = (record?: HarvestQualityRecord | null) => {
  if (!record) return null;
  let total = 0;
  if ((record.jjgMentah || 0) > 0) total += 1;
  if ((record.jjgLewatMatang || 0) > 0) total += 1;
  if ((record.jjgBusukAbnormal || 0) > 0) total += 1;
  if ((record.jjgTangkaiPanjang || 0) > 0) total += 1;
  if ((record.totalBrondolan || 0) > 0) total += 1;
  return total;
};
const getQualityGrade = (record?: HarvestQualityRecord | null): QualityGrade | null => {
  const issueCount = getQualityIssueCount(record);
  if (issueCount === null) return null;
  if (issueCount === 0) return 'A';
  if (issueCount <= 2) return 'B';
  return 'C';
};
const getQualitySummary = (record?: HarvestQualityRecord | null) => {
  if (!record) return 'Detail kualitas sedang dimuat.';
  return `Matang ${record.jjgMatang || 0} | Mentah ${record.jjgMentah || 0} | Lewat ${record.jjgLewatMatang || 0} | Busuk ${record.jjgBusukAbnormal || 0} | Tangkai ${record.jjgTangkaiPanjang || 0} | Brondolan ${(record.totalBrondolan || 0).toFixed(1)}`;
};

export function ApprovalsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const normalizedRole = normalizeRole(user?.role);
  const isManagerRole = normalizedRole === 'MANAGER';
  const [viewMode, setViewMode] = React.useState<ViewMode>('overview');
  const [pendingPage, setPendingPage] = React.useState(1);
  const [historyPage, setHistoryPage] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [priorityFilter, setPriorityFilter] = React.useState<FilterPriority>('ALL');
  const [historyStatusFilter, setHistoryStatusFilter] = React.useState<FilterHistoryStatus>('ALL');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [estateFilter, setEstateFilter] = React.useState('ALL');
  const [divisionFilter, setDivisionFilter] = React.useState('ALL');
  const [mandorFilter, setMandorFilter] = React.useState('ALL');
  const [sortBy, setSortBy] = React.useState<ApprovalSortField>('SUBMITTED_AT');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('DESC');
  const pageSize = 10;
  const canUseApprovalQueue = user?.role === 'ASISTEN' || user?.role === 'MANAGER';
  const canApprove = PermissionManager.hasPermission(user, PERMISSIONS.APPROVAL_APPROVE);
  const canReject = PermissionManager.hasPermission(user, PERMISSIONS.APPROVAL_REJECT);
  const deferredSearch = React.useDeferredValue(searchTerm.trim());

  const variables = React.useMemo<ApprovalPageVariables>(() => ({
    pendingFilter: {
      status: 'PENDING',
      page: pendingPage,
      pageSize,
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(priorityFilter !== 'ALL' ? { priority: priorityFilter } : {}),
      ...(dateFrom ? { dateFrom: toDateStartIso(dateFrom) } : {}),
      ...(dateTo ? { dateTo: toDateEndIso(dateTo) } : {}),
      ...(divisionFilter !== 'ALL' ? { divisionId: divisionFilter } : {}),
      ...(mandorFilter !== 'ALL' ? { mandorId: mandorFilter } : {}),
      sortBy,
      sortDirection,
    },
    historyFilter: {
      page: historyPage,
      pageSize,
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(priorityFilter !== 'ALL' ? { priority: priorityFilter } : {}),
      ...(historyStatusFilter !== 'ALL' ? { status: historyStatusFilter } : {}),
      ...(dateFrom ? { dateFrom: toDateStartIso(dateFrom) } : {}),
      ...(dateTo ? { dateTo: toDateEndIso(dateTo) } : {}),
      ...(divisionFilter !== 'ALL' ? { divisionId: divisionFilter } : {}),
      ...(mandorFilter !== 'ALL' ? { mandorId: mandorFilter } : {}),
      sortBy,
      sortDirection,
    },
    ...(dateFrom ? { statsDateFrom: toDateStartIso(dateFrom) } : {}),
    ...(dateTo ? { statsDateTo: toDateEndIso(dateTo) } : {}),
  }), [dateFrom, dateTo, deferredSearch, divisionFilter, historyPage, historyStatusFilter, mandorFilter, pageSize, pendingPage, priorityFilter, sortBy, sortDirection]);

  const { data, loading, error, refetch, networkStatus } = useQuery<ApprovalPageData, ApprovalPageVariables>(GET_APPROVAL_PAGE_DATA, {
    variables,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    skip: !canUseApprovalQueue,
  });

  const [approveHarvestRecord, approveState] = useMutation<ApproveMutationData, ApproveMutationVariables>(APPROVE_HARVEST_RECORD);
  const [rejectHarvestRecord, rejectState] = useMutation<RejectMutationData, RejectMutationVariables>(REJECT_HARVEST_RECORD);

  const pending = data?.pendingApprovals.items ?? [];
  const history = data?.approvalHistory.items ?? [];
  const selected = pending.find(item => item.id === selectedId) ?? null;
  const { data: selectedHarvestDetailData } = useQuery<GetHarvestRecordResponse, { id: string }>(GET_HARVEST_RECORD, {
    variables: { id: selectedId || '' },
    fetchPolicy: 'cache-and-network',
    skip: !canUseApprovalQueue || !selectedId || viewMode !== 'pending',
  });
  const selectedHarvestDetail = selectedHarvestDetailData?.harvestRecord ?? null;
  const selectedQualityGrade = getQualityGrade(selectedHarvestDetail);
  const selectedQualityIssueCount = getQualityIssueCount(selectedHarvestDetail);
  const isRefreshing = networkStatus === 4;
  const isSubmitting = approveState.loading || rejectState.loading;
  const estateOptions = React.useMemo(() => {
    const rawEstates = data?.myAssignments.estates ?? [];
    return [...rawEstates].sort((left, right) => left.name.localeCompare(right.name, 'id'));
  }, [data?.myAssignments.estates]);
  const divisionOptions = React.useMemo(() => {
    const rawDivisions = data?.myAssignments.divisions ?? [];
    const scopedDivisions = isManagerRole && estateFilter !== 'ALL'
      ? rawDivisions.filter(division => division.estateId === estateFilter)
      : rawDivisions;

    return [...scopedDivisions].sort((left, right) => left.name.localeCompare(right.name, 'id'));
  }, [data?.myAssignments.divisions, estateFilter, isManagerRole]);
  const scopedDivisionIds = React.useMemo(() => {
    const ids = new Set<string>();
    divisionOptions.forEach((division) => {
      const divisionId = division.id.trim();
      if (!divisionId) return;
      ids.add(divisionId);
    });
    return ids;
  }, [divisionOptions]);
  const mandorOptions = React.useMemo(() => {
    const allMandors = data?.mandorOptions.users ?? [];
    const activeDivisionIds = divisionFilter === 'ALL'
      ? scopedDivisionIds
      : new Set([divisionFilter]);

    if (activeDivisionIds.size === 0) {
      return [];
    }

    return allMandors.filter(mandor =>
      (mandor.divisions ?? []).some(division => activeDivisionIds.has(division.id))
    );
  }, [data?.mandorOptions.users, divisionFilter, scopedDivisionIds]);

  React.useEffect(() => {
    if (!pending.some(item => item.id === selectedId)) {
      setSelectedId(pending[0]?.id ?? null);
    }
  }, [pending, selectedId]);

  React.useEffect(() => {
    setReviewNotes('');
  }, [selectedId]);

  React.useEffect(() => {
    if (estateFilter === 'ALL') {
      return;
    }
    if (estateOptions.some(estate => estate.id === estateFilter)) {
      return;
    }
    setEstateFilter('ALL');
  }, [estateFilter, estateOptions]);

  React.useEffect(() => {
    if (divisionFilter === 'ALL') {
      return;
    }
    if (divisionOptions.some(division => division.id === divisionFilter)) {
      return;
    }
    setDivisionFilter('ALL');
  }, [divisionFilter, divisionOptions]);

  React.useEffect(() => {
    if (mandorFilter === 'ALL') {
      return;
    }
    if (mandorOptions.some(mandor => mandor.id === mandorFilter)) {
      return;
    }
    setMandorFilter('ALL');
  }, [mandorFilter, mandorOptions]);

  React.useEffect(() => {
    setPendingPage(1);
    setHistoryPage(1);
  }, [dateFrom, dateTo, deferredSearch, divisionFilter, estateFilter, historyStatusFilter, mandorFilter, priorityFilter, sortBy, sortDirection]);

  const handleRefresh = async () => {
    try {
      await refetch(variables);
      toast({ title: 'Approval diperbarui', description: 'Data terbaru berhasil dimuat dari database.' });
    } catch {
      toast({ title: 'Refresh gagal', description: 'Tidak dapat memuat data approval.', variant: 'destructive' });
    }
  };

  const handleProcess = async (action: 'approve' | 'reject') => {
    if (!selected || !user?.id) return;
    if (action === 'approve' && !canApprove) return;
    if (action === 'reject' && !canReject) return;

    try {
      if (action === 'approve') {
        await approveHarvestRecord({ variables: { input: { id: selected.id, approvedBy: user.id } } });
      } else {
        await rejectHarvestRecord({ variables: { input: { id: selected.id, rejectedReason: reviewNotes.trim() || 'Ditolak oleh reviewer.' } } });
      }
      await refetch(variables);
      toast({
        title: action === 'approve' ? 'Approval disetujui' : 'Approval ditolak',
        description: `${getBlockDisplayName(selected.block)} - ${selected.mandor.name}`,
        variant: action === 'reject' ? 'destructive' : 'default',
      });
      setViewMode('history');
    } catch (mutationError) {
      toast({
        title: 'Proses approval gagal',
        description: mutationError instanceof Error ? mutationError.message : 'Terjadi kesalahan saat memproses approval.',
        variant: 'destructive',
      });
    }
  };

  if (!canUseApprovalQueue) {
    return (
      <MandorDashboardLayout
        title="Approval Panen"
        description="Approval queue tersedia untuk asisten dan manager"
        maxWidthClass={APPROVALS_CONTENT_MAX_WIDTH_CLASS}
        contentPaddingClass={APPROVALS_CONTENT_PADDING_CLASS}
      >
        <Alert><Clock className="h-4 w-4" /><AlertDescription>Role Anda tidak memiliki akses ke queue approval database. Gunakan halaman panen untuk memantau status record Anda.</AlertDescription></Alert>
      </MandorDashboardLayout>
    );
  }

  return (
    <MandorDashboardLayout
      title="Approval Panen"
      description={user?.role === 'MANAGER' ? 'Manager dapat memproses approval sebagai backup approver dengan data langsung dari database' : 'Queue approval panen berbasis database dengan pagination dari server'}
      breadcrumbItems={[{ label: 'Approval Panen', href: '/approvals' }, ...(viewMode === 'pending' ? [{ label: 'Queue Review' }] : []), ...(viewMode === 'history' ? [{ label: 'Riwayat' }] : [])]}
      maxWidthClass={APPROVALS_CONTENT_MAX_WIDTH_CLASS}
      contentPaddingClass={APPROVALS_CONTENT_PADDING_CLASS}
      actions={
        <Button variant="outline" onClick={handleRefresh} disabled={loading || isRefreshing || isSubmitting}>
          {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant={viewMode === 'overview' ? 'default' : 'outline'} onClick={() => setViewMode('overview')}>Overview</Button>
        <Button variant={viewMode === 'pending' ? 'default' : 'outline'} onClick={() => setViewMode('pending')}>Pending</Button>
        <Button variant={viewMode === 'history' ? 'default' : 'outline'} onClick={() => setViewMode('history')}>Riwayat</Button>
      </div>

      {error ? (
        <Alert><XCircle className="h-4 w-4" /><AlertDescription>{error.message}</AlertDescription></Alert>
      ) : loading && !data ? (
        <Card><CardContent className="flex min-h-[240px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></CardContent></Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filter Server</CardTitle>
              <p className="text-sm text-muted-foreground">
                Scope filter mengikuti assignment aktif untuk role {isManagerRole ? 'manager' : 'asisten'}.
              </p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-10">
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Search</div>
                <Input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Cari NIK atau data approval" />
              </div>
              {isManagerRole && estateOptions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Estate</div>
                  <Select value={estateFilter} onValueChange={setEstateFilter}>
                    <SelectTrigger><SelectValue placeholder="Semua estate assignment" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua estate assignment</SelectItem>
                      {estateOptions.map(estate => (
                        <SelectItem key={estate.id} value={estate.id}>
                          {estate.code ? `${estate.code} - ${estate.name}` : estate.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Divisi</div>
                <Select value={divisionFilter} onValueChange={setDivisionFilter} disabled={divisionOptions.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={divisionOptions.length === 0 ? 'Tidak ada divisi assignment' : 'Semua divisi'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua divisi</SelectItem>
                    {divisionOptions.map(division => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.code ? `${division.code} - ${division.name}` : division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Mandor</div>
                <Select value={mandorFilter} onValueChange={setMandorFilter} disabled={mandorOptions.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={mandorOptions.length === 0 ? 'Tidak ada mandor dalam scope' : 'Semua mandor'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua mandor</SelectItem>
                    {mandorOptions.map(mandor => (
                      <SelectItem key={mandor.id} value={mandor.id}>
                        {mandor.name || mandor.username || mandor.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Priority</div>
                <Select value={priorityFilter} onValueChange={value => setPriorityFilter(value as FilterPriority)}>
                  <SelectTrigger><SelectValue placeholder="Semua priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua priority</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Status Riwayat</div>
                <Select value={historyStatusFilter} onValueChange={value => setHistoryStatusFilter(value as FilterHistoryStatus)}>
                  <SelectTrigger><SelectValue placeholder="Semua status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua status</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Urutkan</div>
                <Select value={sortBy} onValueChange={value => setSortBy(value as ApprovalSortField)}>
                  <SelectTrigger><SelectValue placeholder="Field sort" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUBMITTED_AT">Submitted</SelectItem>
                    <SelectItem value="HARVEST_DATE">Tanggal Panen</SelectItem>
                    <SelectItem value="WEIGHT">Berat</SelectItem>
                    <SelectItem value="TBS_COUNT">Jumlah JJG</SelectItem>
                    <SelectItem value="PRIORITY">Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Arah Sort</div>
                <Select value={sortDirection} onValueChange={value => setSortDirection(value as SortDirection)}>
                  <SelectTrigger><SelectValue placeholder="Arah sort" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DESC">Descending</SelectItem>
                    <SelectItem value="ASC">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Dari Tanggal</div>
                <Input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} max={dateTo || undefined} />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Sampai Tanggal</div>
                <div className="flex gap-2">
                  <Input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} min={dateFrom || undefined} />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setPriorityFilter('ALL');
                      setHistoryStatusFilter('ALL');
                      setDateFrom('');
                      setDateTo('');
                      setEstateFilter('ALL');
                      setDivisionFilter('ALL');
                      setMandorFilter('ALL');
                      setSortBy('SUBMITTED_AT');
                      setSortDirection('DESC');
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card><CardContent className="p-6"><div className="text-sm text-gray-500">Pending</div><div className="mt-2 text-2xl font-semibold">{data?.pendingApprovals.totalCount ?? 0}</div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="text-sm text-gray-500">Disetujui</div><div className="mt-2 text-2xl font-semibold">{data?.approvalStats.totalApproved ?? 0}</div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="text-sm text-gray-500">Ditolak</div><div className="mt-2 text-2xl font-semibold">{data?.approvalStats.totalRejected ?? 0}</div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="text-sm text-gray-500">Approval Rate</div><div className="mt-2 text-2xl font-semibold">{Math.round(data?.approvalStats.approvalRate ?? 0)}%</div></CardContent></Card>
          </div>

          {viewMode === 'pending' ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_1.45fr]">
              <Card>
                <CardHeader><CardTitle>Queue Approval</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {pending.length === 0 ? <Alert><CheckCircle className="h-4 w-4" /><AlertDescription>Tidak ada approval pending.</AlertDescription></Alert> : pending.map(item => (
                    <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full rounded-lg border p-4 text-left ${selectedId === item.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={statusClass[item.status]}>{item.status}</Badge>
                        <Badge variant="outline" className={priorityClass[item.priority]}>{item.priority}</Badge>
                      </div>
                      <div className="mt-3 flex gap-3">
                        {getPrimaryPhotoUrl(item) ? (
                          <img
                            src={getPrimaryPhotoUrl(item)}
                            alt={`Foto ${getBlockDisplayName(item.block)}`}
                            className="h-16 w-16 rounded-md border object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-slate-50 text-[10px] text-slate-500">
                            No Photo
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{getBlockDisplayName(item.block)}</div>
                          <div className="text-sm text-gray-500">{item.mandor.name} - {item.division.name}</div>
                          <div className="text-xs text-gray-500">{item.weight.toFixed(2)} kg - {item.elapsedTime}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" size="sm" onClick={() => setPendingPage(current => Math.max(1, current - 1))} disabled={pendingPage <= 1 || loading}><ChevronLeft className="mr-1 h-4 w-4" />Prev</Button>
                    <span className="text-xs text-gray-500">Halaman {data?.pendingApprovals.pageInfo.currentPage ?? 1} / {data?.pendingApprovals.pageInfo.totalPages ?? 1}</span>
                    <Button variant="outline" size="sm" onClick={() => setPendingPage(current => current + 1)} disabled={!(data?.pendingApprovals.hasMore)}><ChevronRight className="mr-1 h-4 w-4" />Next</Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Detail Review</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {selected ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={statusClass[selected.status]}>{selected.status}</Badge>
                        <Badge variant="outline" className={priorityClass[selected.priority]}>{selected.priority}</Badge>
                        {selectedQualityGrade && (
                          <Badge variant="outline" className={qualityGradeClass[selectedQualityGrade]}>Grade {selectedQualityGrade}</Badge>
                        )}
                        <Badge variant="outline">{user?.role === 'MANAGER' ? 'Backup Approver' : 'Approver'}</Badge>
                      </div>
                      <div className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
                        <div><span className="font-medium">Mandor:</span> {selected.mandor.name}</div>
                        <div><span className="font-medium">Blok:</span> {getBlockDisplayName(selected.block)}</div>
                        <div><span className="font-medium">Divisi:</span> {selected.division.name}</div>
                        <div><span className="font-medium">Tanggal panen:</span> {formatDate(selected.harvestDate)}</div>
                        <div><span className="font-medium">Dikirim:</span> {formatDate(selected.submittedAt)}</div>
                        <div><span className="font-medium">Berat:</span> {selected.weight.toFixed(2)} kg</div>
                        <div><span className="font-medium">JJG:</span> {selected.tbsCount}</div>
                        <div><span className="font-medium">Pekerja:</span> {selected.employeeCount} ({selected.employees})</div>
                        <div>
                          <span className="font-medium">Grade kualitas:</span>{' '}
                          {selectedQualityGrade && selectedQualityIssueCount !== null
                            ? `Grade ${selectedQualityGrade} (${selectedQualityIssueCount} detail non-ideal)`
                            : 'Sedang dimuat'}
                        </div>
                        <div><span className="font-medium">Detail kualitas:</span> {getQualitySummary(selectedHarvestDetail)}</div>
                        {selectedHarvestDetail && (
                          <>
                            <div><span className="font-medium">Matang:</span> {selectedHarvestDetail.jjgMatang || 0}</div>
                            <div><span className="font-medium">Mentah:</span> {selectedHarvestDetail.jjgMentah || 0}</div>
                            <div><span className="font-medium">Lewat matang:</span> {selectedHarvestDetail.jjgLewatMatang || 0}</div>
                            <div><span className="font-medium">Busuk/abnormal:</span> {selectedHarvestDetail.jjgBusukAbnormal || 0}</div>
                            <div><span className="font-medium">Tangkai panjang:</span> {selectedHarvestDetail.jjgTangkaiPanjang || 0}</div>
                            <div><span className="font-medium">Brondolan:</span> {(selectedHarvestDetail.totalBrondolan || 0).toFixed(1)}</div>
                          </>
                        )}
                        {selected.validationIssues && selected.validationIssues.length > 0 && <div><span className="font-medium">Catatan kualitas:</span> {selected.validationIssues.join(', ')}</div>}
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Foto Panen</div>
                        {getPrimaryPhotoUrl(selected) ? (
                          <img
                            src={getPrimaryPhotoUrl(selected)}
                            alt={`Foto ${getBlockDisplayName(selected.block)}`}
                            className="max-h-64 w-full rounded-lg border object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="rounded-lg border border-dashed bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            Foto panen tidak tersedia.
                          </div>
                        )}
                      </div>
                      <Textarea value={reviewNotes} onChange={event => setReviewNotes(event.target.value)} placeholder="Catatan review atau alasan reject" className="min-h-[120px]" />
                      <div className="flex flex-col gap-3 md:flex-row">
                        <Button onClick={() => handleProcess('approve')} disabled={!canApprove || isSubmitting} className="bg-green-600 hover:bg-green-700">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}{user?.role === 'MANAGER' ? 'Approve sebagai Backup' : 'Approve'}</Button>
                        <Button variant="outline" onClick={() => handleProcess('reject')} disabled={!canReject || isSubmitting} className="border-red-200 text-red-700 hover:bg-red-50"><XCircle className="mr-2 h-4 w-4" />Reject</Button>
                      </div>
                    </>
                  ) : (
                    <Alert><Eye className="h-4 w-4" /><AlertDescription>Pilih approval pending untuk melihat detail review.</AlertDescription></Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader><CardTitle>{viewMode === 'history' ? 'Riwayat Approval' : 'Ringkasan Queue'}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {(viewMode === 'overview' ? pending : history).map(item => (
                  <div key={item.id} className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 flex-1 gap-3">
                      {getPrimaryPhotoUrl(item) ? (
                        <img
                          src={getPrimaryPhotoUrl(item)}
                          alt={`Foto ${getBlockDisplayName(item.block)}`}
                          className="h-16 w-16 rounded-md border object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-slate-50 text-[10px] text-slate-500">
                          No Photo
                        </div>
                      )}
                      <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <Badge className={statusClass[item.status]}>{item.status}</Badge>
                        <Badge variant="outline" className={priorityClass[item.priority]}>{item.priority}</Badge>
                      </div>
                      <div className="mt-2 font-medium">{getBlockDisplayName(item.block)} - {item.division.name}</div>
                      <div className="text-sm text-gray-500">{item.mandor.name} - {item.weight.toFixed(2)} kg - {item.employeeCount} pekerja</div>
                      <div className="text-xs text-gray-500">{formatDate(item.submittedAt)}</div>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => item.status === 'PENDING' ? (setSelectedId(item.id), setViewMode('pending')) : undefined} disabled={item.status !== 'PENDING'}>
                      <Eye className="mr-2 h-4 w-4" />
                      {item.status === 'PENDING' ? 'Tinjau' : 'Diproses'}
                    </Button>
                  </div>
                ))}
                {viewMode === 'history' && (
                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" size="sm" onClick={() => setHistoryPage(current => Math.max(1, current - 1))} disabled={historyPage <= 1 || loading}><ChevronLeft className="mr-1 h-4 w-4" />Prev</Button>
                    <span className="text-xs text-gray-500">Halaman {data?.approvalHistory.pageInfo.currentPage ?? 1} / {data?.approvalHistory.pageInfo.totalPages ?? 1}</span>
                    <Button variant="outline" size="sm" onClick={() => setHistoryPage(current => current + 1)} disabled={!(data?.approvalHistory.hasMore)}><ChevronRight className="mr-1 h-4 w-4" />Next</Button>
                  </div>
                )}
                {viewMode === 'overview' && pending.length === 0 && <Alert><FileText className="h-4 w-4" /><AlertDescription>Tidak ada approval pending saat ini.</AlertDescription></Alert>}
                {viewMode === 'history' && history.length === 0 && <Alert><FileText className="h-4 w-4" /><AlertDescription>Belum ada riwayat approval.</AlertDescription></Alert>}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </MandorDashboardLayout>
  );
}

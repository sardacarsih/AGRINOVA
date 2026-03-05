'use client';

import React, { useMemo, useState } from 'react';
import { gql } from 'graphql-tag';
import { useMutation, useQuery } from '@apollo/client/react';
import { AlertCircle, Check, RefreshCw, Send, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { AreaManagerDashboardLayout } from '@/components/layouts/role-layouts/AreaManagerDashboardLayout';
import { CompanyAdminDashboardLayout } from '@/components/layouts/role-layouts/CompanyAdminDashboardLayout';
import { ManagerDashboardLayout } from '@/components/layouts/role-layouts/ManagerDashboardLayout';
import { SuperAdminDashboardLayout } from '@/components/layouts/role-layouts/SuperAdminDashboardLayout';
import { useToast } from '@/hooks/use-toast';

interface UserCompanyRef {
  id?: string | null;
}

interface WorkflowUserLike {
  id?: string | null;
  role?: string | null;
  companyId?: string | null;
  company?: UserCompanyRef | null;
  companies?: Array<UserCompanyRef | null> | null;
}

interface BlockOption {
  id: string;
  blockCode?: string | null;
  name?: string | null;
}

interface TarifOption {
  id: string;
  companyId: string;
  perlakuan: string;
  tarifCode?: string | null;
  isActive: boolean;
}

interface WorkflowItem {
  id: string;
  blockId: string;
  blockCode?: string | null;
  blockName?: string | null;
  currentPerlakuan?: string | null;
  proposedPerlakuan?: string | null;
  impactSummary?: string | null;
}

type RequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'APPLIED'
  | 'CANCELLED';

interface WorkflowRequest {
  id: string;
  semester: string;
  status: RequestStatus;
  notes?: string | null;
  rejectedReason?: string | null;
  createdBy: string;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  items: WorkflowItem[];
}

interface BlocksPayload {
  blocksPaginated: {
    data: BlockOption[];
  };
}

interface TarifPayload {
  tarifBloks: TarifOption[];
}

interface WorkflowPayload {
  blockTreatmentSemesterRequests: WorkflowRequest[];
}

interface WorkflowCapabilityPayload {
  queryType?: {
    fields?: Array<{ name: string }> | null;
  } | null;
  mutationType?: {
    fields?: Array<{ name: string }> | null;
  } | null;
}

interface WorkflowPageProps {
  user?: WorkflowUserLike | null;
  withLayout?: boolean;
}

type CreateItemInput = {
  blockId: string;
  proposedTarifBlokId: string;
  impactSummary: string;
};

const GET_WORKFLOW_CAPABILITY = gql`
  query GetBlockTreatmentCapability {
    queryType: __type(name: "Query") {
      fields { name }
    }
    mutationType: __type(name: "Mutation") {
      fields { name }
    }
  }
`;

const GET_BLOCK_TREATMENT_REQUESTS = gql`
  query GetBlockTreatmentSemesterRequests(
    $companyId: ID
    $semester: String
    $status: BlockTreatmentRequestStatus
    $limit: Int
    $offset: Int
  ) {
    blockTreatmentSemesterRequests(
      companyId: $companyId
      semester: $semester
      status: $status
      limit: $limit
      offset: $offset
    ) {
      id
      semester
      status
      notes
      rejectedReason
      createdBy
      createdByName
      createdAt
      updatedAt
      items {
        id
        blockId
        blockCode
        blockName
        currentPerlakuan
        proposedPerlakuan
        impactSummary
      }
    }
  }
`;

const GET_BLOCK_OPTIONS = gql`
  query GetBlockTreatmentBlockOptions($companyId: ID) {
    blocksPaginated(companyId: $companyId, page: 1, limit: 200) {
      data {
        id
        blockCode
        name
      }
    }
  }
`;

const GET_TARIF_OPTIONS = gql`
  query GetBlockTreatmentTarifOptions {
    tarifBloks {
      id
      companyId
      perlakuan
      tarifCode
      isActive
    }
  }
`;

const CREATE_REQUEST = gql`
  mutation CreateBlockTreatmentSemesterRequest($input: CreateBlockTreatmentSemesterRequestInput!) {
    createBlockTreatmentSemesterRequest(input: $input) { id }
  }
`;

const SUBMIT_REQUEST = gql`
  mutation SubmitBlockTreatmentSemesterRequest($id: ID!) {
    submitBlockTreatmentSemesterRequest(id: $id) { id }
  }
`;

const REVIEW_REQUEST = gql`
  mutation ReviewBlockTreatmentSemesterRequest($id: ID!, $notes: String) {
    reviewBlockTreatmentSemesterRequest(id: $id, notes: $notes) { id }
  }
`;

const APPROVE_REQUEST = gql`
  mutation ApproveBlockTreatmentSemesterRequest($id: ID!, $notes: String) {
    approveBlockTreatmentSemesterRequest(id: $id, notes: $notes) { id }
  }
`;

const REJECT_REQUEST = gql`
  mutation RejectBlockTreatmentSemesterRequest($id: ID!, $reason: String!) {
    rejectBlockTreatmentSemesterRequest(id: $id, reason: $reason) { id }
  }
`;

const APPLY_REQUEST = gql`
  mutation ApplyBlockTreatmentSemesterRequest($id: ID!) {
    applyBlockTreatmentSemesterRequest(id: $id) { id }
  }
`;

const CANCEL_REQUEST = gql`
  mutation CancelBlockTreatmentSemesterRequest($id: ID!, $reason: String) {
    cancelBlockTreatmentSemesterRequest(id: $id, reason: $reason) { id }
  }
`;

const STATUS_BADGE_CLASS: Record<RequestStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SUBMITTED: 'bg-amber-100 text-amber-800 border-amber-200',
  UNDER_REVIEW: 'bg-sky-100 text-sky-800 border-sky-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  APPLIED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  CANCELLED: 'bg-zinc-100 text-zinc-700 border-zinc-200',
};

function normalizeRole(role?: string | null): string {
  return (role || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function resolveCompanyId(user?: WorkflowUserLike | null): string {
  if (!user) return '';
  return (user.companyId || user.company?.id || user.companies?.[0]?.id || '').trim();
}

function resolveWrapperByRole(
  role: string,
): React.ComponentType<{ children: React.ReactNode; title?: string; description?: string }> {
  if (role === 'MANAGER') return ManagerDashboardLayout;
  if (role === 'AREA_MANAGER') return AreaManagerDashboardLayout;
  if (role === 'SUPER_ADMIN') return SuperAdminDashboardLayout;
  return CompanyAdminDashboardLayout;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID');
}

function createDefaultSemester(now = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return `${year}-${month <= 6 ? 'S1' : 'S2'}`;
}

export default function BlockTreatmentWorkflowPage({ user, withLayout = true }: WorkflowPageProps) {
  const { toast } = useToast();
  const role = normalizeRole(user?.role);
  const userID = (user?.id || '').trim();
  const companyId = resolveCompanyId(user);

  const isManager = role === 'MANAGER';
  const isAreaManager = role === 'AREA_MANAGER';
  const canApply = role === 'AREA_MANAGER' || role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN';

  const [semesterFilter, setSemesterFilter] = useState(createDefaultSemester());
  const [statusFilter, setStatusFilter] = useState<'ALL' | RequestStatus>('ALL');
  const [formSemester, setFormSemester] = useState(createDefaultSemester());
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<CreateItemInput[]>([
    { blockId: '', proposedTarifBlokId: '', impactSummary: '' },
  ]);

  const { data: capabilityData, loading: loadingCapability } = useQuery<WorkflowCapabilityPayload>(GET_WORKFLOW_CAPABILITY);

  const workflowSupported = useMemo(() => {
    const queryFields = capabilityData?.queryType?.fields?.map((field) => field.name) || [];
    const mutationFields = capabilityData?.mutationType?.fields?.map((field) => field.name) || [];
    return queryFields.includes('blockTreatmentSemesterRequests')
      && mutationFields.includes('createBlockTreatmentSemesterRequest')
      && mutationFields.includes('submitBlockTreatmentSemesterRequest')
      && mutationFields.includes('reviewBlockTreatmentSemesterRequest')
      && mutationFields.includes('approveBlockTreatmentSemesterRequest')
      && mutationFields.includes('rejectBlockTreatmentSemesterRequest')
      && mutationFields.includes('applyBlockTreatmentSemesterRequest')
      && mutationFields.includes('cancelBlockTreatmentSemesterRequest');
  }, [capabilityData?.mutationType?.fields, capabilityData?.queryType?.fields]);

  const {
    data: requestData,
    loading: loadingRequests,
    refetch: refetchRequests,
    error: requestError,
  } = useQuery<WorkflowPayload>(GET_BLOCK_TREATMENT_REQUESTS, {
    variables: {
      companyId: companyId || undefined,
      semester: semesterFilter.trim() || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      limit: 100,
      offset: 0,
    },
    skip: !workflowSupported,
  });

  const { data: blockData } = useQuery<BlocksPayload>(GET_BLOCK_OPTIONS, {
    variables: { companyId: companyId || undefined },
    skip: !workflowSupported || !isManager,
  });

  const { data: tarifData } = useQuery<TarifPayload>(GET_TARIF_OPTIONS, {
    skip: !workflowSupported || !isManager,
  });

  const [createRequest, { loading: creatingRequest }] = useMutation(CREATE_REQUEST);
  const [submitRequest, { loading: submittingRequest }] = useMutation(SUBMIT_REQUEST);
  const [reviewRequest, { loading: reviewingRequest }] = useMutation(REVIEW_REQUEST);
  const [approveRequest, { loading: approvingRequest }] = useMutation(APPROVE_REQUEST);
  const [rejectRequest, { loading: rejectingRequest }] = useMutation(REJECT_REQUEST);
  const [applyRequest, { loading: applyingRequest }] = useMutation(APPLY_REQUEST);
  const [cancelRequest, { loading: cancellingRequest }] = useMutation(CANCEL_REQUEST);

  const requests = requestData?.blockTreatmentSemesterRequests || [];
  const blockOptions = blockData?.blocksPaginated?.data || [];
  const tarifOptions = useMemo(
    () => (tarifData?.tarifBloks || []).filter((tarif) => !companyId || tarif.companyId === companyId),
    [companyId, tarifData?.tarifBloks],
  );

  const anyMutationLoading =
    creatingRequest || submittingRequest || reviewingRequest || approvingRequest || rejectingRequest || applyingRequest || cancellingRequest;

  async function handleCreateRequest() {
    const semester = formSemester.trim().toUpperCase();
    const items = formItems
      .map((item) => ({
        blockId: item.blockId.trim(),
        proposedTarifBlokId: item.proposedTarifBlokId.trim(),
        impactSummary: item.impactSummary.trim() || undefined,
      }))
      .filter((item) => item.blockId && item.proposedTarifBlokId);

    if (!companyId) {
      toast({ title: 'Company context tidak ditemukan', variant: 'destructive' });
      return;
    }
    if (!semester) {
      toast({ title: 'Semester wajib diisi', variant: 'destructive' });
      return;
    }
    if (items.length === 0) {
      toast({ title: 'Minimal 1 item perubahan', variant: 'destructive' });
      return;
    }

    try {
      await createRequest({
        variables: {
          input: {
            companyId,
            semester,
            notes: formNotes.trim() || undefined,
            items,
          },
        },
      });
      toast({ title: 'Pengajuan draft berhasil dibuat' });
      setFormNotes('');
      setFormItems([{ blockId: '', proposedTarifBlokId: '', impactSummary: '' }]);
      await refetchRequests();
    } catch (error) {
      toast({
        title: 'Gagal membuat pengajuan',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan',
        variant: 'destructive',
      });
    }
  }

  async function runAction(
    action: 'submit' | 'review' | 'approve' | 'reject' | 'apply' | 'cancel',
    requestID: string,
  ) {
    try {
      if (action === 'submit') {
        await submitRequest({ variables: { id: requestID } });
      } else if (action === 'review') {
        const notes = window.prompt('Catatan review (opsional):') || undefined;
        await reviewRequest({ variables: { id: requestID, notes } });
      } else if (action === 'approve') {
        const notes = window.prompt('Catatan approval (opsional):') || undefined;
        await approveRequest({ variables: { id: requestID, notes } });
      } else if (action === 'reject') {
        const reason = window.prompt('Alasan reject (wajib diisi):') || '';
        if (!reason.trim()) return;
        await rejectRequest({ variables: { id: requestID, reason: reason.trim() } });
      } else if (action === 'apply') {
        await applyRequest({ variables: { id: requestID } });
      } else if (action === 'cancel') {
        const reason = window.prompt('Alasan pembatalan (opsional):') || undefined;
        await cancelRequest({ variables: { id: requestID, reason } });
      }

      toast({ title: 'Aksi workflow berhasil diproses' });
      await refetchRequests();
    } catch (error) {
      toast({
        title: 'Aksi gagal diproses',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan',
        variant: 'destructive',
      });
    }
  }

  function canSubmit(request: WorkflowRequest): boolean {
    return isManager && request.createdBy === userID && (request.status === 'DRAFT' || request.status === 'REJECTED');
  }

  function canCancel(request: WorkflowRequest): boolean {
    return isManager && request.createdBy === userID && (request.status === 'DRAFT' || request.status === 'SUBMITTED');
  }

  function canReview(request: WorkflowRequest): boolean {
    return isAreaManager && request.status === 'SUBMITTED';
  }

  function canApproveReject(request: WorkflowRequest): boolean {
    return isAreaManager && request.status === 'UNDER_REVIEW';
  }

  function canApplyRequest(request: WorkflowRequest): boolean {
    return canApply && request.status === 'APPROVED';
  }

  const content = (
    <div className="space-y-6">
      {!loadingCapability && !workflowSupported ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Workflow pengajuan perlakuan blok belum tersedia di backend environment ini.
          </AlertDescription>
        </Alert>
      ) : null}

      {isManager ? (
        <Card>
          <CardHeader>
            <CardTitle>Buat Pengajuan Semester</CardTitle>
            <CardDescription>Manager membuat draft perubahan perlakuan/tarif blok per semester.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <Input
                  id="semester"
                  value={formSemester}
                  onChange={(event) => setFormSemester(event.target.value.toUpperCase())}
                  placeholder="2026-S1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={formNotes}
                  onChange={(event) => setFormNotes(event.target.value)}
                  placeholder="Ringkasan alasan perubahan"
                />
              </div>
            </div>

            <div className="space-y-3">
              {formItems.map((item, index) => (
                <div key={`item-${index}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <Label className="text-xs">Blok</Label>
                    <Select
                      value={item.blockId}
                      onValueChange={(value) => {
                        setFormItems((previous) => previous.map((current, currentIndex) =>
                          currentIndex === index ? { ...current, blockId: value } : current));
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Pilih blok" /></SelectTrigger>
                      <SelectContent>
                        {blockOptions.map((block) => (
                          <SelectItem key={block.id} value={block.id}>
                            {(block.blockCode || '-').toUpperCase()} - {block.name || 'Blok'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-4">
                    <Label className="text-xs">Tarif Usulan</Label>
                    <Select
                      value={item.proposedTarifBlokId}
                      onValueChange={(value) => {
                        setFormItems((previous) => previous.map((current, currentIndex) =>
                          currentIndex === index ? { ...current, proposedTarifBlokId: value } : current));
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Pilih tarif" /></SelectTrigger>
                      <SelectContent>
                        {tarifOptions.map((tarif) => (
                          <SelectItem key={tarif.id} value={tarif.id}>
                            {(tarif.tarifCode || '-').toUpperCase()} - {tarif.perlakuan}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-xs">Impact Summary</Label>
                    <Input
                      value={item.impactSummary}
                      onChange={(event) => {
                        setFormItems((previous) => previous.map((current, currentIndex) =>
                          currentIndex === index ? { ...current, impactSummary: event.target.value } : current));
                      }}
                      placeholder="Opsional"
                    />
                  </div>
                  <div className="flex items-end md:col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setFormItems((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
                      }}
                      disabled={formItems.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormItems((previous) => [...previous, { blockId: '', proposedTarifBlokId: '', impactSummary: '' }])}
              >
                Tambah Item
              </Button>
              <Button type="button" onClick={handleCreateRequest} disabled={creatingRequest}>
                Buat Draft
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Inbox Workflow Perubahan Perlakuan Blok</CardTitle>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label htmlFor="filter-semester">Semester</Label>
              <Input
                id="filter-semester"
                value={semesterFilter}
                onChange={(event) => setSemesterFilter(event.target.value.toUpperCase())}
                placeholder="2026-S1"
              />
            </div>
            <div>
              <Label htmlFor="filter-status">Status</Label>
              <Select value={statusFilter} onValueChange={(value: 'ALL' | RequestStatus) => setStatusFilter(value)}>
                <SelectTrigger id="filter-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem value="DRAFT">DRAFT</SelectItem>
                  <SelectItem value="SUBMITTED">SUBMITTED</SelectItem>
                  <SelectItem value="UNDER_REVIEW">UNDER_REVIEW</SelectItem>
                  <SelectItem value="APPROVED">APPROVED</SelectItem>
                  <SelectItem value="REJECTED">REJECTED</SelectItem>
                  <SelectItem value="APPLIED">APPLIED</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={() => refetchRequests()} disabled={loadingRequests || anyMutationLoading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {requestError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{requestError.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Semester</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Tidak ada data workflow.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.semester}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_BADGE_CLASS[request.status]}>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{request.createdByName || request.createdBy || '-'}</TableCell>
                      <TableCell>{request.items.length}</TableCell>
                      <TableCell>{formatDate(request.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {canSubmit(request) ? (
                            <Button size="sm" variant="outline" onClick={() => runAction('submit', request.id)} disabled={anyMutationLoading}>
                              <Send className="mr-1 h-3 w-3" />
                              Submit
                            </Button>
                          ) : null}
                          {canCancel(request) ? (
                            <Button size="sm" variant="outline" onClick={() => runAction('cancel', request.id)} disabled={anyMutationLoading}>
                              <X className="mr-1 h-3 w-3" />
                              Cancel
                            </Button>
                          ) : null}
                          {canReview(request) ? (
                            <Button size="sm" variant="outline" onClick={() => runAction('review', request.id)} disabled={anyMutationLoading}>
                              Review
                            </Button>
                          ) : null}
                          {canApproveReject(request) ? (
                            <>
                              <Button size="sm" variant="outline" onClick={() => runAction('approve', request.id)} disabled={anyMutationLoading}>
                                <Check className="mr-1 h-3 w-3" />
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => runAction('reject', request.id)} disabled={anyMutationLoading}>
                                Reject
                              </Button>
                            </>
                          ) : null}
                          {canApplyRequest(request) ? (
                            <Button size="sm" onClick={() => runAction('apply', request.id)} disabled={anyMutationLoading}>
                              Apply
                            </Button>
                          ) : null}
                        </div>
                        {request.rejectedReason ? (
                          <p className="mt-1 text-xs text-red-600">Reject: {request.rejectedReason}</p>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (!withLayout) {
    return content;
  }

  const Wrapper = resolveWrapperByRole(role);
  return (
    <Wrapper
      title="Workflow Tarif Blok Semester"
      description="Pengajuan manager, review area manager, dan apply perubahan tarif/perlakuan blok"
    >
      {content}
    </Wrapper>
  );
}

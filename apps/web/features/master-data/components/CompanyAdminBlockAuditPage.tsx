'use client';

import React, { useState } from 'react';
import { gql } from 'graphql-tag';
import { useQuery } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CompanyAdminDashboardLayout } from '@/components/layouts/role-layouts/CompanyAdminDashboardLayout';
import { RefreshCw, Search } from 'lucide-react';

interface CompanyAdminBlockAuditPageProps {
  user?: AuthUserLike | null;
  withLayout?: boolean;
}

interface UserCompanyRef {
  id?: string | null;
}

interface AuthUserLike {
  companyId?: string | null;
  company?: UserCompanyRef | null;
  companies?: Array<UserCompanyRef | null> | null;
}

interface CompanyNode {
  id: string;
  name: string;
}

interface QueryFieldNode {
  name: string;
}

interface QueryTypeNode {
  fields?: QueryFieldNode[] | null;
}

interface QueryCapabilityPayload {
  __type?: QueryTypeNode | null;
}

interface BlockTariffChangeLogNode {
  id: string;
  changedAt: string;
  eventType: string;
  changedBy?: string | null;
  changedByName?: string | null;
  companyName?: string | null;
  blockCode?: string | null;
  blockName?: string | null;
  divisionName?: string | null;
  tarifCode?: string | null;
  rulePerlakuan?: string | null;
  overrideType?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  oldValues?: string | null;
  newValues?: string | null;
}

interface PaginationNode {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface BlockTariffChangeLogPaginationPayload {
  data: BlockTariffChangeLogNode[];
  pagination: PaginationNode;
}

type AuditEventFilter =
  | 'ALL'
  | 'BLOCK_ASSIGNMENT_CHANGED'
  | 'RULE_VALUES_UPDATED'
  | 'OVERRIDE_CREATED'
  | 'OVERRIDE_UPDATED'
  | 'OVERRIDE_DELETED';

const GET_COMPANY_CONTEXT = gql`
  query GetCompanyContextForBlockAudit {
    companies(page: 1, limit: 100) {
      data {
        id
        name
      }
    }
  }
`;

const GET_BLOCK_TARIFF_CHANGE_LOGS = gql`
  query GetBlockTariffChangeLogs(
    $companyId: ID
    $search: String
    $eventType: String
    $page: Int
    $limit: Int
  ) {
    blockTariffChangeLogs(
      companyId: $companyId
      search: $search
      eventType: $eventType
      page: $page
      limit: $limit
    ) {
      data {
        id
        changedAt
        eventType
        changedBy
        changedByName
        companyName
        blockCode
        blockName
        divisionName
        tarifCode
        rulePerlakuan
        overrideType
        effectiveFrom
        effectiveTo
        oldValues
        newValues
      }
      pagination {
        page
        limit
        total
        pages
      }
    }
  }
`;

const GET_BLOCK_AUDIT_CAPABILITY = gql`
  query GetBlockAuditCapability {
    __type(name: "Query") {
      fields {
        name
      }
    }
  }
`;

function toDisplayDate(iso?: string | null): string {
  if (!iso) return '-';
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return '-';
  return value.toLocaleString('id-ID');
}

function summarizeJSON(raw?: string | null): string {
  if (!raw) return '-';
  const compact = raw.replace(/\s+/g, ' ').trim();
  if (!compact) return '-';
  return compact.length > 80 ? `${compact.slice(0, 80)}...` : compact;
}

function eventBadgeVariant(eventType: string): 'default' | 'secondary' | 'outline' {
  if (eventType === 'BLOCK_ASSIGNMENT_CHANGED') return 'default';
  if (eventType === 'RULE_VALUES_UPDATED') return 'secondary';
  return 'outline';
}

export default function CompanyAdminBlockAuditPage({
  user,
  withLayout = true,
}: CompanyAdminBlockAuditPageProps) {
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<AuditEventFilter>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    data: companyData,
    loading: loadingCompanies,
    error: companyError,
  } = useQuery<{ companies: { data: CompanyNode[] } }>(GET_COMPANY_CONTEXT);

  const companies = companyData?.companies?.data || [];
  const companyIdFromUser =
    user?.companyId || user?.company?.id || user?.companies?.[0]?.id || null;
  const currentCompanyId = companyIdFromUser || companies[0]?.id || null;
  const trimmedSearch = search.trim();

  const {
    data: capabilityData,
    loading: loadingCapability,
    error: capabilityError,
  } = useQuery<QueryCapabilityPayload>(GET_BLOCK_AUDIT_CAPABILITY);

  const supportsBlockAuditLogs = Boolean(
    capabilityData?.__type?.fields?.some((field) => field.name === 'blockTariffChangeLogs'),
  );
  const blockAuditFeatureUnavailable =
    !capabilityError && !loadingCapability && !supportsBlockAuditLogs;
  const shouldSkipLogsQuery = !capabilityError && (loadingCapability || !supportsBlockAuditLogs);

  const {
    data: logsData,
    loading: loadingLogs,
    error: logsError,
    refetch,
  } = useQuery<{ blockTariffChangeLogs: BlockTariffChangeLogPaginationPayload }>(
    GET_BLOCK_TARIFF_CHANGE_LOGS,
    {
      variables: {
        companyId: currentCompanyId || undefined,
        search: trimmedSearch || undefined,
        eventType: eventFilter === 'ALL' ? undefined : eventFilter,
        page,
        limit: pageSize,
      },
      skip: shouldSkipLogsQuery,
    },
  );

  const rows = logsData?.blockTariffChangeLogs?.data || [];
  const pagination = logsData?.blockTariffChangeLogs?.pagination;
  const effectivePage = pagination?.page || page;
  const totalPages = Math.max(1, pagination?.pages || 1);
  const totalItems = pagination?.total || 0;

  const LayoutWrapper: React.ComponentType<{
    children: React.ReactNode;
    title?: string;
    description?: string;
  }> = withLayout
    ? CompanyAdminDashboardLayout
    : ({ children }) => <>{children}</>;

  const layoutProps = withLayout
    ? {
        title: 'Audit Blok',
        description: 'Riwayat perubahan tarif blok dari backend audit log.',
      }
    : {};

  return (
    <LayoutWrapper {...layoutProps}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Audit Blok</CardTitle>
            <CardDescription>
              Data berasal dari `block_tariff_change_logs` (siapa mengubah, event, before/after).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari block/rule"
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={eventFilter}
                  onValueChange={(value) => {
                    setEventFilter(value as AuditEventFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Event</SelectItem>
                    <SelectItem value="BLOCK_ASSIGNMENT_CHANGED">Block Assignment Changed</SelectItem>
                    <SelectItem value="RULE_VALUES_UPDATED">Rule Values Updated</SelectItem>
                    <SelectItem value="OVERRIDE_CREATED">Override Created</SelectItem>
                    <SelectItem value="OVERRIDE_UPDATED">Override Updated</SelectItem>
                    <SelectItem value="OVERRIDE_DELETED">Override Deleted</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!shouldSkipLogsQuery) {
                      void refetch();
                    }
                  }}
                  disabled={loadingCompanies || loadingLogs || shouldSkipLogsQuery}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {blockAuditFeatureUnavailable && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
                Backend belum mendukung query `blockTariffChangeLogs`. Jalankan backend dengan schema
                terbaru untuk menampilkan audit blok.
              </div>
            )}

            {(companyError || logsError) && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                Gagal memuat audit blok: {companyError?.message || logsError?.message}
              </div>
            )}

            <div className="overflow-x-auto rounded-md border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Blok</TableHead>
                    <TableHead>Divisi</TableHead>
                    <TableHead>Rule Tarif</TableHead>
                    <TableHead>Override</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Before</TableHead>
                    <TableHead>After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(loadingCompanies || loadingLogs) && (
                    <TableRow>
                      <TableCell colSpan={9}>Loading audit blok...</TableCell>
                    </TableRow>
                  )}
                  {!loadingCompanies && !loadingLogs && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9}>Tidak ada data audit blok.</TableCell>
                    </TableRow>
                  )}
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{toDisplayDate(row.changedAt)}</TableCell>
                      <TableCell>
                        <Badge variant={eventBadgeVariant(row.eventType)}>{row.eventType}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline">{row.blockCode || '-'}</Badge>
                          <p className="text-xs text-muted-foreground">{row.blockName || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>{row.divisionName || '-'}</TableCell>
                      <TableCell>
                        {(row.tarifCode || '-').toUpperCase()} / {row.rulePerlakuan || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p>{row.overrideType || '-'}</p>
                          <p className="text-muted-foreground">
                            {toDisplayDate(row.effectiveFrom)} - {toDisplayDate(row.effectiveTo)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p>{row.changedByName || '-'}</p>
                          <p className="text-muted-foreground">{row.changedBy || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <p className="text-xs text-muted-foreground">{summarizeJSON(row.oldValues)}</p>
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <p className="text-xs text-muted-foreground">{summarizeJSON(row.newValues)}</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Menampilkan {rows.length} data pada halaman ini, total {totalItems} log
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Per halaman</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={effectivePage <= 1}
                >
                  Prev
                </Button>
                <span className="min-w-24 text-center text-sm">
                  Page {effectivePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={effectivePage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  );
}

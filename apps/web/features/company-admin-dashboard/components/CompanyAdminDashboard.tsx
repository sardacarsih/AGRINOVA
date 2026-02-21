'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { gql } from 'graphql-tag';
import { useQuery } from '@apollo/client/react';
import { RoleDashboardProps } from '@/features/dashboard/types/dashboard';
import { CompanyAdminDashboardLayout } from '@/components/layouts/role-layouts/CompanyAdminDashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { HarvestTrendChart } from '@/features/company-admin-dashboard/components/HarvestTrendChart';
import {
  Building,
  Users,
  Activity,
  TrendingUp,
  UserCheck,
  BarChart3,
  Building2,
  FileText,
  RefreshCcw,
  ArrowUpRight,
  ShieldCheck,
  Database,
  ClipboardCheck,
  AlertTriangle,
  Inbox
} from 'lucide-react';
import { HarvestStatus } from '@/gql/graphql';

interface CompanyNode {
  id: string;
  name: string;
  code?: string | null;
}

interface EstateNode {
  id: string;
  name: string;
  companyId: string;
  createdAt?: string;
  company?: CompanyNode | null;
}

interface DivisionNode {
  id: string;
  name: string;
  code?: string | null;
  estateId: string;
  createdAt?: string;
  estate?: {
    id: string;
    name: string;
    company?: CompanyNode | null;
  } | null;
}

interface BlockPaginationNode {
  total: number;
}

interface BlockCountPayload {
  blocksPaginated: {
    pagination: BlockPaginationNode;
  };
}

interface UserNode {
  id: string;
  username: string;
  name?: string | null;
  role: string;
  isActive: boolean;
  createdAt?: string;
}

interface HarvestRecordNode {
  id: string;
  status: string;
  beratTbs?: number | null;
  createdAt?: string;
  mandor?: {
    id: string;
    name?: string | null;
  } | null;
  block?: {
    id: string;
    name?: string | null;
  } | null;
}

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  sortTimestamp: number;
  icon: typeof UserCheck;
};

type DashboardUserContext = {
  companyId?: string | null;
  company?: { id?: string | null; name?: string | null } | null;
  companies?: Array<{ id?: string | null; name?: string | null }> | null;
};

const EMPTY_HARVEST_RECORDS: HarvestRecordNode[] = [];

const GET_COMPANY_CONTEXT = gql`
  query GetCompanyContextForDashboard {
    companies(page: 1, limit: 100) {
      data {
        id
        name
        code
      }
    }
  }
`;

const GET_ESTATES = gql`
  query GetEstatesForDashboard {
    estates {
      id
      name
      companyId
      createdAt
      company {
        id
        name
      }
    }
  }
`;

const GET_DIVISIONS = gql`
  query GetDivisionsForDashboard {
    divisions {
      id
      name
      code
      estateId
      createdAt
      estate {
        id
        name
        company {
          id
          name
        }
      }
    }
  }
`;

const GET_BLOCKS_COUNT = gql`
  query GetBlocksCountForDashboard($companyId: ID, $page: Int, $limit: Int) {
    blocksPaginated(companyId: $companyId, page: $page, limit: $limit) {
      pagination {
        total
      }
    }
  }
`;

const GET_USERS = gql`
  query GetUsersForDashboard($companyId: String, $isActive: Boolean, $limit: Int, $offset: Int) {
    users(companyId: $companyId, isActive: $isActive, limit: $limit, offset: $offset) {
      totalCount
      users {
        id
        username
        name
        role
        isActive
        createdAt
      }
    }
  }
`;

const GET_HARVEST_BY_STATUS = gql`
  query GetHarvestByStatusForDashboard($status: HarvestStatus!) {
    harvestRecordsByStatus(status: $status) {
      id
      status
      beratTbs
      createdAt
      mandor {
        id
        name
      }
      block {
        id
        name
      }
    }
  }
`;

function toTimestamp(value?: string | null): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatRelativeTime(value?: string | null): string {
  const timestamp = toTimestamp(value);
  if (!timestamp) return 'Waktu tidak diketahui';

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'Baru saja';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} menit lalu`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} jam lalu`;
  return `${Math.floor(diffMs / day)} hari lalu`;
}

function formatWeightKg(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return '0,00 ton';
  return `${(kg / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ton`;
}

function getGraphQLErrorMessage(error: unknown): string {
  if (!error) return 'Terjadi kesalahan saat memuat data.';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return 'Terjadi kesalahan saat memuat data.';
}

function SectionErrorAlert({ title, message }: { title: string; message: string }) {
  return (
    <Alert
      variant="destructive"
      className="border-rose-200 bg-rose-50/80 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function SectionEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed border-border/70 bg-muted/30">
      <CardContent className="flex min-h-[180px] flex-col items-center justify-center gap-2 text-center">
        <Inbox className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// Company Admin Dashboard Widgets
function CompanyOverviewWidget({
  companyName,
  activeEstates,
  totalDivisions,
  totalBlocks,
}: {
  companyName: string;
  activeEstates: number;
  totalDivisions: number;
  totalBlocks: number;
}) {
  const divisionsPerEstate = activeEstates > 0 ? totalDivisions / activeEstates : 0;
  const blocksPerDivision = totalDivisions > 0 ? totalBlocks / totalDivisions : 0;

  return (
    <Card className="overflow-hidden border-orange-200/70 bg-gradient-to-br from-white via-orange-50/40 to-amber-50/40 dark:border-orange-900/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200">
            Company Scope
          </Badge>
          <Building className="h-4 w-4 text-orange-500 dark:text-orange-300" />
        </div>
        <CardTitle className="truncate text-sm font-semibold leading-tight sm:text-base" title={companyName}>
          {companyName}
        </CardTitle>
        <CardDescription>Cakupan organisasi aktif di level perusahaan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-orange-200/70 bg-background/80 p-3 dark:border-orange-900/40 dark:bg-slate-900/80">
            <p className="text-xs text-muted-foreground">Estate Aktif</p>
            <p className="text-xl font-semibold text-orange-700 dark:text-orange-300">{activeEstates}</p>
          </div>
          <div className="rounded-lg border border-emerald-200/70 bg-background/80 p-3 dark:border-emerald-900/40 dark:bg-slate-900/80">
            <p className="text-xs text-muted-foreground">Total Divisi</p>
            <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">{totalDivisions}</p>
          </div>
          <div className="col-span-2 rounded-lg border border-cyan-200/70 bg-background/80 p-3 dark:border-cyan-900/40 dark:bg-slate-900/80 sm:col-span-1">
            <p className="text-xs text-muted-foreground">Jumlah Blok</p>
            <p className="text-xl font-semibold text-cyan-700 dark:text-cyan-300">{totalBlocks}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Rata-rata {divisionsPerEstate.toFixed(1)} divisi per estate dan {blocksPerDivision.toFixed(1)} blok per divisi.
        </p>
      </CardContent>
    </Card>
  );
}

function EmployeeStatsWidget({
  totalUsers,
  activeUsers,
  inactiveUsers,
}: {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
}) {
  const activeRatio = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

  return (
    <Card className="border-sky-200/70 bg-gradient-to-br from-white via-sky-50/40 to-cyan-50/30 dark:border-sky-900/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200">
            Workforce
          </Badge>
          <Users className="h-4 w-4 text-sky-500 dark:text-sky-300" />
        </div>
        <CardTitle className="text-base font-semibold">Statistik Karyawan</CardTitle>
        <CardDescription>Komposisi status pengguna perusahaan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Total Karyawan</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">{totalUsers}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Pengguna Aktif</span>
            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-200">{activeUsers}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Pengguna Nonaktif</span>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200">{inactiveUsers}</Badge>
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Rasio pengguna aktif</span>
            <span>{activeRatio}%</span>
          </div>
          <Progress value={activeRatio} className="h-2 [&>div]:bg-emerald-500" />
        </div>
      </CardContent>
    </Card>
  );
}

function ProductionStatsWidget({
  totalApprovedWeightKg,
  avgWeightPerApprovedKg,
  growthPercentage,
  pendingApprovals,
}: {
  totalApprovedWeightKg: number;
  avgWeightPerApprovedKg: number;
  growthPercentage: number | null;
  pendingApprovals: number;
}) {
  return (
    <Card className="border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/30 to-lime-50/30 dark:border-emerald-900/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
            Produksi
          </Badge>
          <TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
        </div>
        <CardTitle className="text-base font-semibold">Ringkasan Produksi</CardTitle>
        <CardDescription>Output panen dan performa persetujuan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-bold">{formatWeightKg(totalApprovedWeightKg)}</p>
          <p className="text-xs text-muted-foreground">Volume panen yang disetujui</p>
        </div>
        <div className="space-y-2 rounded-lg border border-emerald-100/70 bg-background/70 p-3 dark:border-emerald-900/40 dark:bg-slate-900/70">
          <div className="flex items-center text-sm">
            <Activity className="h-3 w-3 text-green-500 mr-2" />
            <span>Rata-rata per persetujuan: {formatWeightKg(avgWeightPerApprovedKg)}</span>
          </div>
          <div className="flex items-center text-sm">
            <TrendingUp className="h-3 w-3 text-blue-500 mr-2" />
            <span>
              {growthPercentage === null
                ? 'Pertumbuhan: belum ada baseline bulan lalu'
                : `Pertumbuhan: ${growthPercentage >= 0 ? '+' : ''}${growthPercentage.toFixed(1)}% dari bulan lalu`}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <UserCheck className="h-3 w-3 text-orange-500 mr-2" />
            <span>Menunggu persetujuan: {pendingApprovals}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemHealthWidget({
  masterDataOk,
  userServiceOk,
  harvestServiceOk,
}: {
  masterDataOk: boolean;
  userServiceOk: boolean;
  harvestServiceOk: boolean;
}) {
  const allHealthy = masterDataOk && userServiceOk && harvestServiceOk;
  const healthScore = [masterDataOk, userServiceOk, harvestServiceOk].filter(Boolean).length * 100 / 3;

  return (
    <Card className="border-violet-200/70 bg-gradient-to-br from-white via-violet-50/40 to-indigo-50/30 dark:border-violet-900/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
            System Health
          </Badge>
          <ShieldCheck className="h-4 w-4 text-violet-500 dark:text-violet-300" />
        </div>
        <CardTitle className="text-base font-semibold">Kesehatan Sistem</CardTitle>
        <CardDescription>Status layanan inti untuk operasional harian</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Skor kesehatan sistem</span>
            <span>{Math.round(healthScore)}%</span>
          </div>
          <Progress value={healthScore} className="h-2 [&>div]:bg-violet-500" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">API Master Data</span>
            <Badge
              variant="outline"
              className={masterDataOk ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-200' : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200'}
            >
              {masterDataOk ? 'Sehat' : 'Gangguan'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Layanan Pengguna</span>
            <Badge
              variant="outline"
              className={userServiceOk ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-200' : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200'}
            >
              {userServiceOk ? 'Sehat' : 'Gangguan'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Layanan Panen</span>
            <Badge
              variant="outline"
              className={harvestServiceOk ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-200' : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-200'}
            >
              {harvestServiceOk ? 'Sehat' : 'Parsial'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Keseluruhan</span>
            <Badge
              variant="outline"
              className={allHealthy ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-200' : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-200'}
            >
              {allHealthy ? 'Operasional' : 'Menurun'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivitiesWidget({ activities }: { activities: ActivityItem[] }) {
  return (
    <Card className="col-span-2 border-orange-200/70 dark:border-orange-900/40">
      <CardHeader>
        <CardTitle>Aktivitas Terbaru Perusahaan</CardTitle>
        <CardDescription>Aktivitas terbaru dari pengguna, struktur, dan alur panen</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada aktivitas terbaru.</p>
          )}
          {activities.map((activity, index) => {
            const ActivityIcon = activity.icon;
            return (
              <div key={activity.id} className="relative flex items-start gap-4 pl-1">
                {index < activities.length - 1 && (
                  <div className="absolute left-[14px] top-8 h-[calc(100%-0.25rem)] w-px bg-orange-100 dark:bg-orange-900/40" />
                )}
                <div className="relative z-10 rounded-full border border-orange-200 bg-orange-50 p-1.5 dark:border-orange-900/40 dark:bg-orange-950/40">
                  <ActivityIcon className="h-3.5 w-3.5 text-orange-600 dark:text-orange-300" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {activity.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CompanyAdminDashboardSkeleton() {
  return (
    <CompanyAdminDashboardLayout>
      <div className="space-y-6">
        <Card className="overflow-hidden border-orange-200/70 bg-gradient-to-r from-orange-100/80 via-amber-50/70 to-emerald-50/60">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40 bg-white/80" />
                <Skeleton className="h-8 w-64 bg-white/80" />
                <Skeleton className="h-4 w-96 max-w-full bg-white/80" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-28 bg-white/80" />
                <Skeleton className="h-10 w-36 bg-white/80" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`hero-skeleton-${index}`} className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-6 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`kpi-skeleton-${index}`} className="border-orange-200/60">
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-36" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="col-span-2 border-orange-200/60">
              <CardHeader>
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-3 w-72" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={`activity-skeleton-${index}`} className="flex items-center gap-3">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-3 w-44" />
                      <Skeleton className="h-3 w-72 max-w-full" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-orange-200/60">
              <CardHeader>
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-48" />
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={`quick-action-skeleton-${index}`} className="h-9 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CompanyAdminDashboardLayout>
  );
}

// Main Company Admin Dashboard Component
function CompanyAdminDashboard({ user }: RoleDashboardProps) {
  const { data: companyData, loading: companyLoading, error: companyError, refetch: refetchCompanies } = useQuery<{
    companies: { data: CompanyNode[] };
  }>(GET_COMPANY_CONTEXT, {
    fetchPolicy: 'cache-and-network',
  });

  const dashboardUser = user as DashboardUserContext | undefined;
  const companyIdFromUser =
    dashboardUser?.companyId ||
    dashboardUser?.company?.id ||
    dashboardUser?.companies?.[0]?.id ||
    null;

  const currentCompanyId = companyIdFromUser || companyData?.companies?.data?.[0]?.id || null;

  const { data: estatesData, loading: estatesLoading, error: estatesError, refetch: refetchEstates } = useQuery<{
    estates: EstateNode[];
  }>(GET_ESTATES, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: divisionsData, loading: divisionsLoading, error: divisionsError, refetch: refetchDivisions } = useQuery<{
    divisions: DivisionNode[];
  }>(GET_DIVISIONS, {
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: blocksCountData,
    loading: blocksCountLoading,
    error: blocksCountError,
    refetch: refetchBlocksCount,
  } = useQuery<BlockCountPayload>(GET_BLOCKS_COUNT, {
    variables: {
      companyId: currentCompanyId || undefined,
      page: 1,
      limit: 1,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { data: totalUsersData, loading: totalUsersLoading, error: totalUsersError, refetch: refetchTotalUsers } = useQuery<{
    users: { totalCount: number; users: UserNode[] };
  }>(GET_USERS, {
    variables: {
      companyId: currentCompanyId || undefined,
      limit: 1,
      offset: 0,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { data: activeUsersData, loading: activeUsersLoading, error: activeUsersError, refetch: refetchActiveUsers } = useQuery<{
    users: { totalCount: number; users: UserNode[] };
  }>(GET_USERS, {
    variables: {
      companyId: currentCompanyId || undefined,
      isActive: true,
      limit: 1,
      offset: 0,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { data: inactiveUsersData, loading: inactiveUsersLoading, error: inactiveUsersError, refetch: refetchInactiveUsers } = useQuery<{
    users: { totalCount: number; users: UserNode[] };
  }>(GET_USERS, {
    variables: {
      companyId: currentCompanyId || undefined,
      isActive: false,
      limit: 1,
      offset: 0,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { data: recentUsersData, loading: recentUsersLoading, error: recentUsersError, refetch: refetchRecentUsers } = useQuery<{
    users: { totalCount: number; users: UserNode[] };
  }>(GET_USERS, {
    variables: {
      companyId: currentCompanyId || undefined,
      limit: 25,
      offset: 0,
    },
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: pendingHarvestData,
    loading: pendingHarvestLoading,
    error: pendingHarvestError,
    refetch: refetchPendingHarvest,
  } = useQuery<{ harvestRecordsByStatus: HarvestRecordNode[] }>(GET_HARVEST_BY_STATUS, {
    variables: { status: HarvestStatus.Pending },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const {
    data: approvedHarvestData,
    loading: approvedHarvestLoading,
    error: approvedHarvestError,
    refetch: refetchApprovedHarvest,
  } = useQuery<{ harvestRecordsByStatus: HarvestRecordNode[] }>(GET_HARVEST_BY_STATUS, {
    variables: { status: HarvestStatus.Approved },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const {
    data: rejectedHarvestData,
    loading: rejectedHarvestLoading,
    error: rejectedHarvestError,
    refetch: refetchRejectedHarvest,
  } = useQuery<{ harvestRecordsByStatus: HarvestRecordNode[] }>(GET_HARVEST_BY_STATUS, {
    variables: { status: HarvestStatus.Rejected },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const estates = useMemo(() => {
    const base = estatesData?.estates || [];
    if (!currentCompanyId) return base;
    return base.filter((estate) => {
      if (estate.companyId) return estate.companyId === currentCompanyId;
      return estate.company?.id === currentCompanyId;
    });
  }, [estatesData?.estates, currentCompanyId]);

  const estateIds = useMemo(() => new Set(estates.map((estate) => estate.id)), [estates]);

  const divisions = useMemo(() => {
    const base = divisionsData?.divisions || [];
    if (!currentCompanyId) return base;

    return base.filter((division) => {
      const divisionCompanyId = division.estate?.company?.id;
      if (divisionCompanyId) return divisionCompanyId === currentCompanyId;
      return estateIds.has(division.estateId);
    });
  }, [divisionsData?.divisions, currentCompanyId, estateIds]);

  const totalUsers = totalUsersData?.users?.totalCount || 0;
  const activeUsers = activeUsersData?.users?.totalCount || 0;
  const inactiveUsers = inactiveUsersData?.users?.totalCount || 0;
  const totalBlocks = blocksCountData?.blocksPaginated?.pagination?.total || 0;

  const pendingHarvest = pendingHarvestData?.harvestRecordsByStatus ?? EMPTY_HARVEST_RECORDS;
  const approvedHarvest = approvedHarvestData?.harvestRecordsByStatus ?? EMPTY_HARVEST_RECORDS;
  const rejectedHarvest = rejectedHarvestData?.harvestRecordsByStatus ?? EMPTY_HARVEST_RECORDS;

  const totalApprovedWeightKg = useMemo(
    () => approvedHarvest.reduce((total, record) => total + (record.beratTbs || 0), 0),
    [approvedHarvest],
  );

  const avgWeightPerApprovedKg = approvedHarvest.length > 0 ? totalApprovedWeightKg / approvedHarvest.length : 0;

  const growthPercentage = useMemo(() => {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

    const thisMonthWeight = approvedHarvest
      .filter((record) => {
        const createdAt = toTimestamp(record.createdAt);
        return createdAt >= startOfThisMonth;
      })
      .reduce((total, record) => total + (record.beratTbs || 0), 0);

    const previousMonthWeight = approvedHarvest
      .filter((record) => {
        const createdAt = toTimestamp(record.createdAt);
        return createdAt >= startOfPrevMonth && createdAt < startOfThisMonth;
      })
      .reduce((total, record) => total + (record.beratTbs || 0), 0);

    if (previousMonthWeight <= 0) return null;
    return ((thisMonthWeight - previousMonthWeight) / previousMonthWeight) * 100;
  }, [approvedHarvest]);

  const activities = useMemo(() => {
    const list: ActivityItem[] = [];

    const users = [...(recentUsersData?.users?.users || [])]
      .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
      .slice(0, 4);

    users.forEach((entry) => {
      list.push({
        id: `user-${entry.id}`,
        title: 'Pengguna Baru Ditambahkan',
        description: `${entry.name || entry.username} bergabung sebagai ${entry.role}`,
        time: formatRelativeTime(entry.createdAt),
        sortTimestamp: toTimestamp(entry.createdAt),
        icon: UserCheck,
      });
    });

    [...estates]
      .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
      .slice(0, 2)
      .forEach((entry) => {
        list.push({
          id: `estate-${entry.id}`,
          title: 'Estate Diperbarui',
          description: `Estate ${entry.name} aktif dalam cakupan perusahaan`,
          time: formatRelativeTime(entry.createdAt),
          sortTimestamp: toTimestamp(entry.createdAt),
          icon: Building,
        });
      });

    [...divisions]
      .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
      .slice(0, 2)
      .forEach((entry) => {
        list.push({
          id: `division-${entry.id}`,
          title: 'Divisi Terdaftar',
          description: `${entry.name}${entry.code ? ` (${entry.code})` : ''} sudah tersedia`,
          time: formatRelativeTime(entry.createdAt),
          sortTimestamp: toTimestamp(entry.createdAt),
          icon: Building2,
        });
      });

    [...pendingHarvest]
      .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
      .slice(0, 2)
      .forEach((record) => {
        list.push({
          id: `pending-harvest-${record.id}`,
          title: 'Panen Menunggu Persetujuan',
          description: `${record.block?.name || 'Blok tidak diketahui'} diajukan oleh ${record.mandor?.name || 'tim lapangan'}`,
          time: formatRelativeTime(record.createdAt),
          sortTimestamp: toTimestamp(record.createdAt),
          icon: FileText,
        });
      });

    [...approvedHarvest]
      .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
      .slice(0, 2)
      .forEach((record) => {
        list.push({
          id: `approved-harvest-${record.id}`,
          title: 'Panen Disetujui',
          description: `${record.block?.name || 'Blok tidak diketahui'} disetujui (${(record.beratTbs || 0).toLocaleString('id-ID')} kg)`,
          time: formatRelativeTime(record.createdAt),
          sortTimestamp: toTimestamp(record.createdAt),
          icon: TrendingUp,
        });
      });

    return list.sort((a, b) => b.sortTimestamp - a.sortTimestamp).slice(0, 8);
  }, [recentUsersData?.users?.users, estates, divisions, pendingHarvest, approvedHarvest]);

  const masterDataOk = !companyError && !estatesError && !divisionsError && !blocksCountError;
  const userServiceOk = !totalUsersError && !activeUsersError && !inactiveUsersError && !recentUsersError;
  const harvestServiceOk = !pendingHarvestError && !approvedHarvestError && !rejectedHarvestError;

  const loading =
    companyLoading ||
    estatesLoading ||
    divisionsLoading ||
    blocksCountLoading ||
    totalUsersLoading ||
    activeUsersLoading ||
    inactiveUsersLoading ||
    recentUsersLoading ||
    pendingHarvestLoading ||
    approvedHarvestLoading ||
    rejectedHarvestLoading;

  const handleRefreshData = async () => {
    await Promise.allSettled([
      refetchCompanies(),
      refetchEstates(),
      refetchDivisions(),
      refetchBlocksCount(),
      refetchTotalUsers(),
      refetchActiveUsers(),
      refetchInactiveUsers(),
      refetchRecentUsers(),
      refetchPendingHarvest(),
      refetchApprovedHarvest(),
      refetchRejectedHarvest(),
    ]);
  };

  const companyName =
    companyData?.companies?.data?.find((entry) => entry.id === currentCompanyId)?.name ||
    dashboardUser?.company?.name ||
    dashboardUser?.companies?.[0]?.name ||
    'Perusahaan Saya';

  const totalHarvestRecords = pendingHarvest.length + approvedHarvest.length + rejectedHarvest.length;
  const approvalRate = totalHarvestRecords > 0 ? (approvedHarvest.length / totalHarvestRecords) * 100 : 0;
  const rejectionRate = totalHarvestRecords > 0 ? (rejectedHarvest.length / totalHarvestRecords) * 100 : 0;
  const queuePressure = totalHarvestRecords > 0 ? (pendingHarvest.length / totalHarvestRecords) * 100 : 0;
  const systemHealthScore = [masterDataOk, userServiceOk, harvestServiceOk].filter(Boolean).length * 100 / 3;
  const isInitialPageLoading = loading &&
    !companyData &&
    !estatesData &&
    !divisionsData &&
    !totalUsersData &&
    !activeUsersData &&
    !inactiveUsersData &&
    !recentUsersData &&
    !pendingHarvestData &&
    !approvedHarvestData &&
    !rejectedHarvestData;

  const harvestTrendData = useMemo(() => {
    const dayCount = 14;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const dayEntries = Array.from({ length: dayCount }, (_, offset) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (dayCount - 1 - offset));
      const key = date.toISOString().slice(0, 10);
      return { key, date, weight: 0 };
    });

    const buckets = new Map(dayEntries.map((entry) => [entry.key, entry]));

    approvedHarvest.forEach((record) => {
      const timestamp = toTimestamp(record.createdAt);
      if (!timestamp) return;

      const date = new Date(timestamp);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) return;

      bucket.weight += record.beratTbs || 0;
    });

    return dayEntries.map((entry) => ({
      date: entry.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      originalDate: entry.key,
      weight: entry.weight,
    }));
  }, [approvedHarvest]);

  const harvestTrendPercentage = useMemo(() => {
    if (harvestTrendData.length < 14) return undefined;

    const recentWindow = harvestTrendData.slice(-7).reduce((sum, item) => sum + item.weight, 0);
    const previousWindow = harvestTrendData.slice(-14, -7).reduce((sum, item) => sum + item.weight, 0);

    if (previousWindow <= 0) return undefined;
    return ((recentWindow - previousWindow) / previousWindow) * 100;
  }, [harvestTrendData]);

  const overviewSectionLoading = recentUsersLoading || estatesLoading || divisionsLoading;
  const operationsSectionLoading = pendingHarvestLoading || approvedHarvestLoading || rejectedHarvestLoading;
  const systemSectionLoading = companyLoading || totalUsersLoading || activeUsersLoading || inactiveUsersLoading;

  const overviewSectionError = recentUsersError || estatesError || divisionsError;
  const operationsSectionError = pendingHarvestError || approvedHarvestError || rejectedHarvestError;
  const systemSectionError = companyError || totalUsersError || activeUsersError || inactiveUsersError;
  const systemSectionEmpty =
    totalUsers === 0 &&
    totalHarvestRecords === 0 &&
    estates.length === 0 &&
    divisions.length === 0;

  if (isInitialPageLoading) {
    return <CompanyAdminDashboardSkeleton />;
  }

  return (
    <CompanyAdminDashboardLayout>
      <div className="space-y-6">
        <Card className="overflow-hidden border-orange-200/70 bg-gradient-to-r from-orange-100/80 via-amber-50/70 to-emerald-50/60 dark:border-orange-900/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <Badge variant="outline" className="border-orange-300 bg-background/80 text-orange-700 dark:border-orange-800 dark:bg-slate-900/80 dark:text-orange-200">
                  Company Admin Console
                </Badge>
                <CardTitle className="text-2xl tracking-tight md:text-3xl">
                  Dashboard Perusahaan
                </CardTitle>
                <CardDescription className="max-w-xl text-sm text-muted-foreground">
                  Pantau struktur organisasi, status pengguna, dan alur persetujuan panen dalam satu layar.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleRefreshData} variant="secondary" className="bg-background/90 dark:bg-slate-900/90">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Muat Ulang
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Perusahaan</p>
                <p className="mt-1 truncate whitespace-nowrap text-sm font-semibold md:text-base" title={companyName}>
                  {companyName}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total User</p>
                <p className="mt-1 text-lg font-semibold">{totalUsers}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Approval Rate</p>
                <p className="mt-1 text-lg font-semibold">{approvalRate.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">System Health</p>
                <p className="mt-1 text-lg font-semibold">{Math.round(systemHealthScore)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CompanyOverviewWidget
            companyName={companyName}
            activeEstates={estates.length}
            totalDivisions={divisions.length}
            totalBlocks={totalBlocks}
          />
          <EmployeeStatsWidget
            totalUsers={totalUsers}
            activeUsers={activeUsers}
            inactiveUsers={inactiveUsers}
          />
          <ProductionStatsWidget
            totalApprovedWeightKg={totalApprovedWeightKg}
            avgWeightPerApprovedKg={avgWeightPerApprovedKg}
            growthPercentage={growthPercentage}
            pendingApprovals={pendingHarvest.length}
          />
          <SystemHealthWidget
            masterDataOk={masterDataOk}
            userServiceOk={userServiceOk}
            harvestServiceOk={harvestServiceOk}
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-background/80 p-1 dark:bg-slate-900/80">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="operations">Operasional</TabsTrigger>
            <TabsTrigger value="system">Sistem</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {overviewSectionError && (
              <SectionErrorAlert
                title="Gagal memuat ringkasan overview"
                message={getGraphQLErrorMessage(overviewSectionError)}
              />
            )}

            {overviewSectionLoading ? (
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="col-span-2 border-orange-200/60">
                  <CardHeader>
                    <Skeleton className="h-5 w-52" />
                    <Skeleton className="h-3 w-72" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={`overview-activity-loading-${index}`} className="flex items-center gap-3">
                        <Skeleton className="h-7 w-7 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-3 w-44" />
                          <Skeleton className="h-3 w-72 max-w-full" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="border-orange-200/60">
                  <CardHeader>
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-3 w-48" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={`overview-action-loading-${index}`} className="h-9 w-full" />
                    ))}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {activities.length > 0 ? (
                  <RecentActivitiesWidget activities={activities} />
                ) : (
                  <div className="lg:col-span-2">
                    <SectionEmptyState
                      title="Belum ada aktivitas terbaru"
                      description="Aktivitas akan muncul setelah ada pembaruan user, struktur organisasi, atau approval panen."
                    />
                  </div>
                )}

                <Card className="border-orange-200/70 dark:border-orange-900/40">
                  <CardHeader>
                    <CardTitle>Aksi Cepat</CardTitle>
                    <CardDescription>Shortcut ke halaman manajemen yang paling sering dipakai</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button className="w-full justify-start" variant="outline" asChild>
                      <Link href="/users">
                        <Users className="mr-2 h-4 w-4" />
                        Kelola Karyawan
                        <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button className="w-full justify-start" variant="outline" asChild>
                      <Link href="/divisions">
                        <Building2 className="mr-2 h-4 w-4" />
                        Buat Divisi
                        <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button className="w-full justify-start" variant="outline" asChild>
                      <Link href="/reports">
                        <FileText className="mr-2 h-4 w-4" />
                        Buka Laporan
                        <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            {operationsSectionError && (
              <SectionErrorAlert
                title="Gagal memuat data operasional"
                message={getGraphQLErrorMessage(operationsSectionError)}
              />
            )}

            {operationsSectionLoading ? (
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="col-span-1 lg:col-span-2 border-orange-200/60">
                  <CardHeader>
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-3 w-64" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[260px] w-full" />
                  </CardContent>
                </Card>
                <Card className="border-emerald-200/60">
                  <CardHeader>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
                <Card className="border-cyan-200/60">
                  <CardHeader>
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-3 w-52" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
                <Card className="border-indigo-200/60">
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </CardContent>
                </Card>
              </div>
            ) : totalHarvestRecords === 0 ? (
              <SectionEmptyState
                title="Belum ada data panen operasional"
                description="Data akan muncul setelah proses panen berjalan dan status approval mulai tercatat."
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                <HarvestTrendChart
                  data={harvestTrendData}
                  title="Tren Panen Disetujui"
                  description="Total berat TBS approved dalam 14 hari terakhir"
                  trend={harvestTrendPercentage}
                />

                <Card className="border-emerald-200/70 dark:border-emerald-900/40">
                  <CardHeader>
                    <CardTitle className="text-base">Flow Persetujuan Panen</CardTitle>
                    <CardDescription>Distribusi status persetujuan panen perusahaan</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                          Approved
                        </span>
                        <span className="font-medium">{approvedHarvest.length}</span>
                      </div>
                      <Progress value={approvalRate} className="h-2 [&>div]:bg-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-amber-600" />
                          Pending
                        </span>
                        <span className="font-medium">{pendingHarvest.length}</span>
                      </div>
                      <Progress value={queuePressure} className="h-2 [&>div]:bg-amber-500" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-rose-600" />
                          Rejected
                        </span>
                        <span className="font-medium">{rejectedHarvest.length}</span>
                      </div>
                      <Progress value={rejectionRate} className="h-2 [&>div]:bg-rose-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-cyan-200/70 dark:border-cyan-900/40">
                  <CardHeader>
                    <CardTitle className="text-base">Master Data Coverage</CardTitle>
                    <CardDescription>Skala data untuk operasi harian</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border bg-background/60 p-3 dark:bg-slate-900/60">
                      <span className="text-sm">Estate Aktif</span>
                      <Badge>{estates.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-background/60 p-3 dark:bg-slate-900/60">
                      <span className="text-sm">Divisi Terdaftar</span>
                      <Badge>{divisions.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-background/60 p-3 dark:bg-slate-900/60">
                      <span className="text-sm">Total Record Panen</span>
                      <Badge>{totalHarvestRecords}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-indigo-200/70 dark:border-indigo-900/40">
                  <CardHeader>
                    <CardTitle className="text-base">Arah Kinerja</CardTitle>
                    <CardDescription>Sinyal performa bulanan perusahaan</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg border bg-background/70 p-3 dark:bg-slate-900/70">
                      <TrendingUp className="h-5 w-5 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium">Pertumbuhan Produksi</p>
                        <p className="text-xs text-muted-foreground">
                          {growthPercentage === null
                            ? 'Belum ada baseline bulan lalu'
                            : `${growthPercentage >= 0 ? '+' : ''}${growthPercentage.toFixed(1)}% dibanding bulan lalu`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border bg-background/70 p-3 dark:bg-slate-900/70">
                      <BarChart3 className="h-5 w-5 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium">Rata-rata Berat</p>
                        <p className="text-xs text-muted-foreground">{formatWeightKg(avgWeightPerApprovedKg)} per approval</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            {systemSectionError && (
              <SectionErrorAlert
                title="Gagal memuat status sistem"
                message={getGraphQLErrorMessage(systemSectionError)}
              />
            )}

            {systemSectionLoading ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-violet-200/60">
                  <CardHeader>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-2 w-full" />
                  </CardContent>
                </Card>
                <Card className="border-slate-200/60">
                  <CardHeader>
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-3 w-72 max-w-full" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              </div>
            ) : systemSectionEmpty ? (
              <SectionEmptyState
                title="Belum ada data sistem yang cukup"
                description="Tambahkan user, struktur estate/divisi, atau aktivitas panen agar indikator reliability dan governance terisi."
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-violet-200/70 dark:border-violet-900/40">
                  <CardHeader>
                    <CardTitle className="text-base">Service Reliability</CardTitle>
                    <CardDescription>Indikator kesehatan service inti platform</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-violet-600" />
                          Master Data API
                        </span>
                        <Badge
                          variant="outline"
                          className={masterDataOk ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-200' : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200'}
                        >
                          {masterDataOk ? 'Sehat' : 'Gangguan'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-violet-600" />
                          User Service
                        </span>
                        <Badge
                          variant="outline"
                          className={userServiceOk ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-200' : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200'}
                        >
                          {userServiceOk ? 'Sehat' : 'Gangguan'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-violet-600" />
                          Harvest Service
                        </span>
                        <Badge
                          variant="outline"
                          className={harvestServiceOk ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-200' : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-200'}
                        >
                          {harvestServiceOk ? 'Sehat' : 'Parsial'}
                        </Badge>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Reliability Score</span>
                        <span>{Math.round(systemHealthScore)}%</span>
                      </div>
                      <Progress value={systemHealthScore} className="h-2 [&>div]:bg-violet-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/80 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-base">Governance Checklist</CardTitle>
                    <CardDescription>Checklist ringkas untuk operasi harian company admin</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3 rounded-lg border bg-background/70 p-3 dark:bg-slate-900/70">
                      <UserCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium">Tinjau user nonaktif</p>
                        <p className="text-xs text-muted-foreground">
                          Saat ini ada {inactiveUsers} user nonaktif yang perlu verifikasi akses.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border bg-background/70 p-3 dark:bg-slate-900/70">
                      <ClipboardCheck className="mt-0.5 h-4 w-4 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium">Pantau antrean approval</p>
                        <p className="text-xs text-muted-foreground">
                          {pendingHarvest.length} data panen masih menunggu persetujuan.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border bg-background/70 p-3 dark:bg-slate-900/70">
                      <Building2 className="mt-0.5 h-4 w-4 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium">Validasi struktur organisasi</p>
                        <p className="text-xs text-muted-foreground">
                          {estates.length} estate dan {divisions.length} divisi tercatat aktif.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CompanyAdminDashboardLayout>
  );
}

export default CompanyAdminDashboard;

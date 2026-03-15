'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gql, useQuery } from '@apollo/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaManagerDashboardLayout } from '@/components/layouts/role-layouts/AreaManagerDashboardLayout';
import { ALL_COMPANIES_SCOPE, useCompanyScope } from '@/contexts/company-scope-context';
import { cn } from '@/lib/utils';
import { CompanyHealthStatus, TrendDirection } from '@/gql/graphql';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Gauge,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';

type DetailPeriod = 'today' | 'last7Days' | 'monthToDate';

type AreaManagerCompanyMonitorDetailData = {
  areaManagerCompanyDetail: {
    companyId: string;
    companyName: string;
    estatesCount: number;
    todayProduction: number;
    monthlyProduction: number;
    targetAchievement: number;
    efficiencyScore: number;
    qualityScore: number;
    trend: TrendDirection;
    status: CompanyHealthStatus;
    pendingIssues: number;
    estatesPerformance?: Array<{
      estateId: string;
      estateName: string;
      todayProduction: number;
      monthlyProduction: number;
      monthlyTarget: number;
      targetAchievement: number;
      qualityScore: number;
    }>;
  };
  managersUnderArea: Array<{
    id: string;
    name: string;
    username?: string | null;
    email?: string | null;
    isActive: boolean;
  }>;
  regionalAlerts: Array<{
    id: string;
    severity: string;
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
  }>;
  areaManagerDashboard: {
    budgetWorkflowSummary: {
      draft: number;
      review: number;
      approved: number;
      total: number;
    };
    companyPerformance: Array<{
      companyId: string;
      companyName: string;
      monthlyProduction: number;
      todayProduction: number;
      targetAchievement: number;
      efficiencyScore: number;
    }>;
  };
};

type AreaManagerCompanyMonitorDetailVars = {
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
};

const AREA_MANAGER_COMPANY_MONITOR_DETAIL_QUERY = gql`
  query AreaManagerCompanyMonitorDetail($companyId: ID!, $dateFrom: Time, $dateTo: Time) {
    areaManagerCompanyDetail(companyId: $companyId) {
      companyId
      companyName
      estatesCount
      todayProduction
      monthlyProduction
      targetAchievement
      efficiencyScore
      qualityScore
      trend
      status
      pendingIssues
      estatesPerformance {
        estateId
        estateName
        todayProduction
        monthlyProduction
        monthlyTarget
        targetAchievement
        qualityScore
      }
    }
    managersUnderArea(companyId: $companyId) {
      id
      name
      username
      email
      isActive
    }
    regionalAlerts(companyId: $companyId, unreadOnly: false) {
      id
      severity
      title
      message
      createdAt
      isRead
    }
    areaManagerDashboard(dateFrom: $dateFrom, dateTo: $dateTo, companyId: $companyId) {
      budgetWorkflowSummary {
        draft
        review
        approved
        total
      }
      companyPerformance {
        companyId
        companyName
        monthlyProduction
        todayProduction
        targetAchievement
        efficiencyScore
      }
    }
  }
`;

const PERIOD_OPTIONS: Array<{ value: DetailPeriod; label: string }> = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'last7Days', label: '7 Hari' },
  { value: 'monthToDate', label: 'Bulan Ini' },
];

const STATUS_STYLES: Record<CompanyHealthStatus, { badge: string; label: string }> = {
  [CompanyHealthStatus.Excellent]: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'Sangat Baik',
  },
  [CompanyHealthStatus.Good]: {
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    label: 'Baik',
  },
  [CompanyHealthStatus.Warning]: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Waspada',
  },
  [CompanyHealthStatus.Critical]: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    label: 'Kritis',
  },
};

const SEVERITY_STYLES: Record<string, string> = {
  INFO: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
};

const formatNumber = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits }).format(value);

const toDateOnly = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfDay = (value: Date): Date => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const endOfDay = (value: Date): Date => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);

const resolveRange = (period: DetailPeriod): { dateFrom: Date; dateTo: Date } => {
  const now = new Date();
  if (period === 'today') {
    return { dateFrom: startOfDay(now), dateTo: endOfDay(now) };
  }

  if (period === 'last7Days') {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { dateFrom: startOfDay(from), dateTo: endOfDay(now) };
  }

  return { dateFrom: new Date(now.getFullYear(), now.getMonth(), 1), dateTo: endOfDay(now) };
};

type AreaManagerCompanyMonitorDetailProps = {
  companyId: string;
};

export function AreaManagerCompanyMonitorDetail({ companyId }: AreaManagerCompanyMonitorDetailProps) {
  const router = useRouter();
  const { availableCompanies, setSelectedCompanyId } = useCompanyScope();
  const [selectedPeriod, setSelectedPeriod] = React.useState<DetailPeriod>('monthToDate');
  const [lastSyncAt, setLastSyncAt] = React.useState<Date | null>(null);

  const activeRange = React.useMemo(() => resolveRange(selectedPeriod), [selectedPeriod]);

  const variables = React.useMemo<AreaManagerCompanyMonitorDetailVars>(
    () => ({
      companyId,
      dateFrom: toDateOnly(activeRange.dateFrom),
      dateTo: toDateOnly(activeRange.dateTo),
    }),
    [activeRange.dateFrom, activeRange.dateTo, companyId]
  );

  const { data, loading, error, refetch, networkStatus } = useQuery<
    AreaManagerCompanyMonitorDetailData,
    AreaManagerCompanyMonitorDetailVars
  >(AREA_MANAGER_COMPANY_MONITOR_DETAIL_QUERY, {
    variables,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
  });

  const isCompanyDetailUnavailable = React.useMemo(() => {
    const graphQLErrors = (
      error as unknown as
        | { graphQLErrors?: readonly { message?: string; path?: Array<string | number> | string }[] }
        | null
    )?.graphQLErrors;
    if (!Array.isArray(graphQLErrors)) return false;

    return graphQLErrors.some((graphQLError) => {
      const message = String(graphQLError?.message || '').toLowerCase();
      const pathHead = Array.isArray(graphQLError?.path)
        ? String(graphQLError?.path?.[0] || '').toLowerCase()
        : String(graphQLError?.path || '').toLowerCase();
      return message.includes('company not found') && pathHead === 'areamanagercompanydetail';
    });
  }, [error]);

  React.useEffect(() => {
    if (!data?.areaManagerCompanyDetail?.companyId) return;
    const isKnownCompany = availableCompanies.some((company) => company.id === data.areaManagerCompanyDetail.companyId);
    if (isKnownCompany) {
      setSelectedCompanyId(data.areaManagerCompanyDetail.companyId);
      return;
    }
    setSelectedCompanyId(ALL_COMPANIES_SCOPE);
  }, [availableCompanies, data?.areaManagerCompanyDetail?.companyId, setSelectedCompanyId]);

  React.useEffect(() => {
    if (data?.areaManagerCompanyDetail) {
      setLastSyncAt(new Date());
    }
  }, [data?.areaManagerCompanyDetail]);

  const company = data?.areaManagerCompanyDetail;
  const estatesPerformance = company?.estatesPerformance || [];
  const supportsEstatePerformanceBreakdown = Array.isArray(company?.estatesPerformance);
  const estateGridClassName = React.useMemo(() => {
    if (estatesPerformance.length <= 1) {
      return 'grid gap-4 grid-cols-1';
    }
    if (estatesPerformance.length === 2) {
      return 'grid gap-4 sm:grid-cols-2';
    }
    return 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';
  }, [estatesPerformance.length]);
  const peerCompanies = React.useMemo(
    () => data?.areaManagerDashboard?.companyPerformance || [],
    [data?.areaManagerDashboard?.companyPerformance]
  );
  const companyMetricsInSelectedPeriod = React.useMemo(() => {
    if (!company) return null;
    return peerCompanies.find((item) => item.companyId === company.companyId) || null;
  }, [company, peerCompanies]);

  const companyRank = React.useMemo(() => {
    if (!company) return null;
    const sorted = [...peerCompanies].sort((a, b) => b.monthlyProduction - a.monthlyProduction);
    const index = sorted.findIndex((item) => item.companyId === company.companyId);
    if (index < 0) return null;
    return { position: index + 1, total: sorted.length };
  }, [company, peerCompanies]);

  const averageEfficiency = React.useMemo(() => {
    if (peerCompanies.length === 0) return 0;
    return peerCompanies.reduce((sum, item) => sum + item.efficiencyScore, 0) / peerCompanies.length;
  }, [peerCompanies]);

  const averageTargetAchievement = React.useMemo(() => {
    if (peerCompanies.length === 0) return 0;
    return peerCompanies.reduce((sum, item) => sum + item.targetAchievement, 0) / peerCompanies.length;
  }, [peerCompanies]);

  const budgetWorkflowSummary = React.useMemo(
    () =>
      data?.areaManagerDashboard?.budgetWorkflowSummary || {
        draft: 0,
        review: 0,
        approved: 0,
        total: 0,
      },
    [data?.areaManagerDashboard?.budgetWorkflowSummary]
  );

  const budgetApprovalRate = React.useMemo(() => {
    if (budgetWorkflowSummary.total <= 0) return 0;
    return (budgetWorkflowSummary.approved / budgetWorkflowSummary.total) * 100;
  }, [budgetWorkflowSummary.approved, budgetWorkflowSummary.total]);

  const managers = data?.managersUnderArea || [];
  const activeManagers = managers.filter((manager) => manager.isActive);
  const topAlerts = (data?.regionalAlerts || []).slice(0, 8);
  const unreadAlerts = topAlerts.filter((alert) => !alert.isRead).length;
  const isRefreshing = networkStatus === 4;

  const lastSyncLabel = React.useMemo(() => {
    if (!lastSyncAt) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(lastSyncAt);
  }, [lastSyncAt]);

  const handleRefresh = React.useCallback(async () => {
    await refetch(variables);
  }, [refetch, variables]);

  const handleBackToMonitor = React.useCallback(() => {
    // Reset scope to default (none/scope semua company) before returning.
    setSelectedCompanyId(ALL_COMPANIES_SCOPE);
    router.push(`/?company=${encodeURIComponent(ALL_COMPANIES_SCOPE)}`);
  }, [router, setSelectedCompanyId]);

  if (loading && !company) {
    return (
      <AreaManagerDashboardLayout
        title="Detail Monitor Perusahaan"
        description="Memuat data performa perusahaan"
        showBreadcrumb={false}
      >
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-2xl bg-muted/40" />
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        </div>
      </AreaManagerDashboardLayout>
    );
  }

  if (!company) {
    return (
      <AreaManagerDashboardLayout
        title="Detail Monitor Perusahaan"
        description={isCompanyDetailUnavailable ? 'Perusahaan belum memiliki estate aktif' : 'Data perusahaan tidak tersedia'}
        showBreadcrumb={false}
      >
        <Alert variant={isCompanyDetailUnavailable ? 'warning' : 'destructive'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {isCompanyDetailUnavailable
              ? `Perusahaan ID ${companyId} belum memiliki estate/data monitor. Tambahkan estate terlebih dahulu agar detail tersedia.`
              : `Detail monitor perusahaan tidak ditemukan untuk ID ${companyId}.`}
          </AlertDescription>
        </Alert>
        <div className="pt-3">
          <Button type="button" variant="outline" size="sm" onClick={handleBackToMonitor}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Monitor
          </Button>
        </div>
      </AreaManagerDashboardLayout>
    );
  }

  const statusStyle = STATUS_STYLES[company.status];
  const effectiveTodayProduction = companyMetricsInSelectedPeriod?.todayProduction ?? company.todayProduction;
  const effectiveMonthlyProduction = companyMetricsInSelectedPeriod?.monthlyProduction ?? company.monthlyProduction;
  const effectiveTargetAchievement = companyMetricsInSelectedPeriod?.targetAchievement ?? company.targetAchievement;
  const effectiveEfficiency = companyMetricsInSelectedPeriod?.efficiencyScore ?? company.efficiencyScore;
  const efficiencyGap = effectiveEfficiency - averageEfficiency;
  const targetGap = effectiveTargetAchievement - averageTargetAchievement;

  return (
    <AreaManagerDashboardLayout
      title="Detail Monitor Perusahaan"
      description="Evaluasi performa perusahaan secara komparatif untuk mendukung keputusan berbasis data."
      showBreadcrumb={false}
      actions={
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
            Muat Ulang
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/analytics">Buka Analitik</Link>
          </Button>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-6xl space-y-5 pb-16">
        <Card className="border-emerald-300/70 bg-gradient-to-br from-teal-700 via-emerald-700 to-cyan-700 text-white shadow-xl">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-white/85">Monitoring Multi-Perusahaan</p>
                <h1 className="text-2xl font-extrabold">{company.companyName}</h1>
                <p className="text-sm text-white/85">ID Perusahaan: {company.companyId}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={handleBackToMonitor}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Kembali ke Monitor
                </Button>
                <Badge variant="outline" className={cn('border', statusStyle.badge)}>
                  {statusStyle.label}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map((option) => {
                const active = selectedPeriod === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedPeriod(option.value)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'border-white/70 bg-white/20 text-white'
                        : 'border-white/30 bg-white/10 text-white/90 hover:bg-white/20'
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
              <span className="ml-auto text-xs text-white/80">Sinkron terakhir: {lastSyncLabel}</span>
            </div>
          </CardContent>
        </Card>

        {error && !isCompanyDetailUnavailable && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Gagal memuat detail monitor: {error.message}</AlertDescription>
          </Alert>
        )}

        {unreadAlerts > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Ada {unreadAlerts} peringatan regional belum dibaca untuk perusahaan ini.</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Produksi Hari Ini</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{formatNumber(effectiveTodayProduction)} ton</p>
              <p className="text-xs text-muted-foreground">Pembaruan harian perusahaan</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Produksi Bulanan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{formatNumber(effectiveMonthlyProduction)} ton</p>
              <p className="text-xs text-muted-foreground">Akumulasi periode berjalan</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pencapaian Target</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{formatNumber(effectiveTargetAchievement)}%</p>
              <p className={cn('text-xs', targetGap >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                {targetGap >= 0 ? '+' : ''}{formatNumber(targetGap)}% vs rata-rata regional
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Efisiensi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="inline-flex items-center gap-1.5">
                {company.trend === TrendDirection.Up ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : company.trend === TrendDirection.Down ? (
                  <TrendingDown className="h-4 w-4 text-rose-600" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-slate-600" />
                )}
                <p className="text-3xl font-black">{formatNumber(effectiveEfficiency)}%</p>
              </div>
              <p className={cn('text-xs', efficiencyGap >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                {efficiencyGap >= 0 ? '+' : ''}{formatNumber(efficiencyGap)}% vs rata-rata regional
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ringkasan Operasional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Jumlah Estate</span>
                <span className="font-semibold">{formatNumber(company.estatesCount, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Isu Tertunda</span>
                <span className="font-semibold">{formatNumber(company.pendingIssues, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Skor Kualitas</span>
                <span className="font-semibold">{formatNumber(company.qualityScore)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Manajer Aktif</span>
                <span className="font-semibold">{formatNumber(activeManagers.length, 0)} / {formatNumber(managers.length, 0)}</span>
              </div>
              {companyRank && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Peringkat Regional (Bulanan)</span>
                  <Badge variant="outline">#{companyRank.position} / {companyRank.total}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manajer di Area</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {managers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada manager terdaftar di company ini.</p>
              ) : (
                managers.slice(0, 8).map((manager) => (
                  <div key={manager.id} className="flex items-center justify-between rounded-lg border p-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{manager.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{manager.email || manager.username || manager.id}</p>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      manager.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                      <Users className="h-3 w-3" />
                      {manager.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow Budget Divisi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Status budget untuk perusahaan ini (periode aktif).</p>
              <Badge variant={budgetApprovalRate >= 70 ? 'secondary' : 'outline'}>
                Approved {formatNumber(budgetApprovalRate)}%
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Total</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{formatNumber(budgetWorkflowSummary.total, 0)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Draft</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-2xl font-black text-slate-900">{formatNumber(budgetWorkflowSummary.draft, 0)}</p>
                  <Badge variant="outline">DRAFT</Badge>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Review</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-2xl font-black text-slate-900">{formatNumber(budgetWorkflowSummary.review, 0)}</p>
                  <Badge variant="destructive">REVIEW</Badge>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Approved</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-2xl font-black text-slate-900">{formatNumber(budgetWorkflowSummary.approved, 0)}</p>
                  <Badge variant="secondary">APPROVED</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-800">Informasi Produksi Per Estate</h2>
            <p className="text-sm text-slate-600">
              Ringkasan performa harian dan bulanan setiap estate dalam perusahaan terpilih.
            </p>
          </div>
          {!supportsEstatePerformanceBreakdown ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Rincian produksi per estate belum tersedia pada endpoint API saat ini.
              </CardContent>
            </Card>
          ) : estatesPerformance.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Belum ada data produksi per estate.
              </CardContent>
            </Card>
          ) : (
            <div className={estateGridClassName}>
              {estatesPerformance.map((estate) => {
                const clampedAchievement = Number.isFinite(estate.targetAchievement)
                  ? Math.min(100, Math.max(0, estate.targetAchievement))
                  : 0;
                const progressTone =
                  clampedAchievement >= 100
                    ? 'bg-emerald-500'
                    : clampedAchievement >= 75
                      ? 'bg-cyan-500'
                      : clampedAchievement >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500';

                return (
                  <Card
                    key={estate.estateId}
                    className="group overflow-hidden rounded-xl border-slate-200/80 bg-white/90 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 to-cyan-500" />
                    <CardHeader className="space-y-2 p-4 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base font-bold text-slate-800">
                            {estate.estateName}
                          </CardTitle>
                          <p className="mt-1 truncate font-mono text-[11px] text-slate-500" title={estate.estateId}>
                            ID: {estate.estateId}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 border-slate-300 bg-slate-50 text-slate-700">
                          Estate
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4 pt-1">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-2 py-2">
                          <p className="text-[11px] text-slate-500">Hari Ini</p>
                          <p className="text-base font-black tabular-nums text-slate-900">
                            {formatNumber(estate.todayProduction)}
                          </p>
                          <p className="text-[10px] text-slate-500">ton</p>
                        </div>
                        <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-2 py-2">
                          <p className="text-[11px] text-slate-500">Bulan Ini</p>
                          <p className="text-base font-black tabular-nums text-slate-900">
                            {formatNumber(estate.monthlyProduction)}
                          </p>
                          <p className="text-[10px] text-slate-500">ton</p>
                        </div>
                        <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-2 py-2">
                          <p className="text-[11px] text-slate-500">Target</p>
                          <p className="text-base font-black tabular-nums text-slate-900">
                            {formatNumber(estate.monthlyTarget)}
                          </p>
                          <p className="text-[10px] text-slate-500">ton</p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-2.5">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-600">Pencapaian Target</span>
                          <span className="font-bold tabular-nums text-slate-900">
                            {formatNumber(clampedAchievement)}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', progressTone)}
                            style={{ width: `${clampedAchievement}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Peringatan Regional (Lingkup Perusahaan)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada alert regional untuk company ini.</p>
            ) : (
              topAlerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={SEVERITY_STYLES[alert.severity] || 'bg-slate-100 text-slate-700 border-slate-200'}>
                        {alert.severity}
                      </Badge>
                      {!alert.isRead && <Badge variant="secondary">Belum Dibaca</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="sticky bottom-4 z-20">
          <Card className="border-teal-200 bg-white/95 shadow-xl backdrop-blur">
            <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Monitor Perusahaan</p>
                <p className="text-2xl font-black leading-none text-slate-900">{company.companyName}</p>
              </div>
              <div className="hidden h-10 w-px bg-slate-200 md:block" />
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                  <Gauge className="h-4 w-4" />
                  Efisiensi {formatNumber(effectiveEfficiency)}%
                </span>
                <Button type="button" size="sm" onClick={handleBackToMonitor}>
                  Kembali ke Monitor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AreaManagerDashboardLayout>
  );
}

export default AreaManagerCompanyMonitorDetail;

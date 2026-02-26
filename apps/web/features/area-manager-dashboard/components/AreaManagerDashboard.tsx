'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gql, useQuery } from '@apollo/client';
import { RoleDashboardProps } from '@/features/dashboard/types/dashboard';
import { AreaManagerDashboardLayout } from '@/components/layouts/role-layouts/AreaManagerDashboardLayout';
import { ALL_COMPANIES_SCOPE, useCompanyScope } from '@/contexts/company-scope-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CompanyHealthStatus, TrendDirection } from '@/gql/graphql';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  Gauge,
  Leaf,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

type PeriodPreset = 'today' | 'last7Days' | 'monthToDate' | 'custom';
type MonitorFilter = 'Semua' | 'Active' | 'Alert' | 'Maintenance';

type MonitorDashboardData = {
  areaManagerDashboard: {
    stats: {
      totalCompanies: number;
      totalEstates: number;
      totalDivisions: number;
      totalEmployees: number;
      todayProduction: number;
      monthlyProduction: number;
      monthlyTarget: number;
      targetAchievement: number;
      avgEfficiency: number;
      topPerformingCompany?: string | null;
    };
    companyPerformance: Array<{
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
    }>;
    alerts: Array<{
      id: string;
      severity: string;
      isRead: boolean;
    }>;
  };
};

type MonitorDashboardVars = {
  dateFrom?: string;
  dateTo?: string;
};

type ManagersUnderAreaData = {
  managersUnderArea: Array<{
    id: string;
    name: string;
    isActive: boolean;
  }>;
};

type ManagersUnderAreaVars = {
  companyId?: string;
};

type CompanyPerformanceItem = MonitorDashboardData['areaManagerDashboard']['companyPerformance'][number];

const AREA_MANAGER_MONITOR_QUERY = gql`
  query AreaManagerMonitorDashboard($dateFrom: Time, $dateTo: Time) {
    areaManagerDashboard(dateFrom: $dateFrom, dateTo: $dateTo) {
      stats {
        totalCompanies
        totalEstates
        totalDivisions
        totalEmployees
        todayProduction
        monthlyProduction
        monthlyTarget
        targetAchievement
        avgEfficiency
        topPerformingCompany
      }
      companyPerformance {
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
      }
      alerts {
        id
        severity
        isRead
      }
    }
  }
`;

const MANAGERS_UNDER_AREA_QUERY = gql`
  query ManagersUnderAreaMonitor($companyId: ID) {
    managersUnderArea(companyId: $companyId) {
      id
      name
      isActive
    }
  }
`;

const FILTER_OPTIONS: readonly MonitorFilter[] = ['Semua', 'Active', 'Alert', 'Maintenance'];
const PERIOD_OPTIONS: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'last7Days', label: '7 Hari' },
  { value: 'monthToDate', label: 'Bulan Ini' },
  { value: 'custom', label: 'Custom' },
];

const STATUS_STYLES: Record<CompanyHealthStatus, { dot: string; badge: string; label: string }> = {
  [CompanyHealthStatus.Excellent]: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'Excellent',
  },
  [CompanyHealthStatus.Good]: {
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    label: 'Good',
  },
  [CompanyHealthStatus.Warning]: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Warning',
  },
  [CompanyHealthStatus.Critical]: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    label: 'Critical',
  },
};

const formatNumber = (value: number, maxFractionDigits = 1) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: maxFractionDigits }).format(value);

const toDateOnly = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfDay = (value: Date): Date => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const endOfDay = (value: Date): Date => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);

const resolveRange = (period: PeriodPreset): { dateFrom: Date; dateTo: Date } => {
  const now = new Date();

  if (period === 'today') {
    return { dateFrom: startOfDay(now), dateTo: endOfDay(now) };
  }

  if (period === 'last7Days') {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { dateFrom: startOfDay(from), dateTo: endOfDay(now) };
  }

  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return { dateFrom: firstDayOfMonth, dateTo: endOfDay(now) };
};

const estimateMonthlyTarget = (company: CompanyPerformanceItem): number => {
  if (company.targetAchievement <= 0) return 0;
  return company.monthlyProduction / (company.targetAchievement / 100);
};

function AreaManagerDashboard({ role: _role }: RoleDashboardProps) {
  const router = useRouter();
  const {
    availableCompanies,
    selectedCompanyId,
    selectedCompanyLabel,
    setSelectedCompanyId,
  } = useCompanyScope();

  const defaultRange = React.useMemo(() => resolveRange('monthToDate'), []);
  const [selectedFilter, setSelectedFilter] = React.useState<MonitorFilter>('Semua');
  const [selectedPeriod, setSelectedPeriod] = React.useState<PeriodPreset>('monthToDate');
  const [customDateFrom, setCustomDateFrom] = React.useState<string>(toDateOnly(defaultRange.dateFrom));
  const [customDateTo, setCustomDateTo] = React.useState<string>(toDateOnly(defaultRange.dateTo));
  const [lastSyncAt, setLastSyncAt] = React.useState<Date | null>(null);

  const activeRange = React.useMemo(() => {
    if (selectedPeriod !== 'custom') {
      return resolveRange(selectedPeriod);
    }

    const parsedFrom = customDateFrom ? new Date(customDateFrom) : defaultRange.dateFrom;
    const parsedTo = customDateTo ? new Date(customDateTo) : defaultRange.dateTo;

    return {
      dateFrom: startOfDay(Number.isNaN(parsedFrom.getTime()) ? defaultRange.dateFrom : parsedFrom),
      dateTo: endOfDay(Number.isNaN(parsedTo.getTime()) ? defaultRange.dateTo : parsedTo),
    };
  }, [customDateFrom, customDateTo, defaultRange.dateFrom, defaultRange.dateTo, selectedPeriod]);

  const queryVariables = React.useMemo<MonitorDashboardVars>(() => ({
    dateFrom: toDateOnly(activeRange.dateFrom),
    dateTo: toDateOnly(activeRange.dateTo),
  }), [activeRange.dateFrom, activeRange.dateTo]);

  const {
    data,
    loading,
    error,
    refetch,
    networkStatus,
  } = useQuery<MonitorDashboardData, MonitorDashboardVars>(AREA_MANAGER_MONITOR_QUERY, {
    variables: queryVariables,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
  });

  const managerVariables = React.useMemo<ManagersUnderAreaVars>(
    () => ({
      companyId: selectedCompanyId === ALL_COMPANIES_SCOPE ? undefined : selectedCompanyId,
    }),
    [selectedCompanyId]
  );

  const {
    data: managerData,
    error: managerError,
    loading: managersLoading,
    refetch: refetchManagers,
  } = useQuery<ManagersUnderAreaData, ManagersUnderAreaVars>(MANAGERS_UNDER_AREA_QUERY, {
    variables: managerVariables,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
  });

  React.useEffect(() => {
    if (data?.areaManagerDashboard) {
      setLastSyncAt(new Date());
    }
  }, [data?.areaManagerDashboard]);

  const scopedCompanies = React.useMemo(() => {
    const companies = data?.areaManagerDashboard?.companyPerformance || [];
    if (selectedCompanyId === ALL_COMPANIES_SCOPE) return companies;
    return companies.filter((item) => String(item.companyId) === selectedCompanyId);
  }, [data?.areaManagerDashboard?.companyPerformance, selectedCompanyId]);

  const filteredCompanies = React.useMemo(() => {
    if (selectedFilter === 'Semua') return scopedCompanies;

    if (selectedFilter === 'Active') {
      return scopedCompanies.filter((company) => company.status !== CompanyHealthStatus.Critical);
    }

    if (selectedFilter === 'Alert') {
      return scopedCompanies.filter((company) =>
        company.status === CompanyHealthStatus.Warning || company.status === CompanyHealthStatus.Critical
      );
    }

    return [];
  }, [scopedCompanies, selectedFilter]);

  const totalTodayProduction = React.useMemo(
    () => scopedCompanies.reduce((sum, company) => sum + company.todayProduction, 0),
    [scopedCompanies]
  );

  const totalMonthlyProduction = React.useMemo(
    () => scopedCompanies.reduce((sum, company) => sum + company.monthlyProduction, 0),
    [scopedCompanies]
  );

  const derivedMonthlyTarget = React.useMemo(
    () => scopedCompanies.reduce((sum, company) => sum + estimateMonthlyTarget(company), 0),
    [scopedCompanies]
  );

  const averageEfficiency = React.useMemo(() => {
    if (scopedCompanies.length === 0) return data?.areaManagerDashboard?.stats?.avgEfficiency || 0;
    const total = scopedCompanies.reduce((sum, company) => sum + company.efficiencyScore, 0);
    return total / scopedCompanies.length;
  }, [data?.areaManagerDashboard?.stats?.avgEfficiency, scopedCompanies]);

  const totalEstates = React.useMemo(() => {
    if (scopedCompanies.length === 0) return data?.areaManagerDashboard?.stats?.totalEstates || 0;
    return scopedCompanies.reduce((sum, company) => sum + company.estatesCount, 0);
  }, [data?.areaManagerDashboard?.stats?.totalEstates, scopedCompanies]);

  const managerCount = React.useMemo(() => {
    const managers = managerData?.managersUnderArea || [];
    return managers.filter((manager) => manager.isActive).length;
  }, [managerData?.managersUnderArea]);

  const targetTon = selectedCompanyId === ALL_COMPANIES_SCOPE
    ? data?.areaManagerDashboard?.stats?.monthlyTarget || derivedMonthlyTarget
    : derivedMonthlyTarget;

  const targetPercentage = React.useMemo(() => {
    if (targetTon <= 0) {
      return data?.areaManagerDashboard?.stats?.targetAchievement || 0;
    }
    return Math.min(100, (totalMonthlyProduction / targetTon) * 100);
  }, [data?.areaManagerDashboard?.stats?.targetAchievement, targetTon, totalMonthlyProduction]);

  const unreadAlertCount = React.useMemo(() => {
    const alerts = data?.areaManagerDashboard?.alerts || [];
    return alerts.filter((alert) => !alert.isRead).length;
  }, [data?.areaManagerDashboard?.alerts]);

  const lastSyncLabel = React.useMemo(() => {
    if (!lastSyncAt) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(lastSyncAt);
  }, [lastSyncAt]);

  const handlePeriodChange = (period: PeriodPreset) => {
    setSelectedPeriod(period);
    if (period !== 'custom') {
      const range = resolveRange(period);
      setCustomDateFrom(toDateOnly(range.dateFrom));
      setCustomDateTo(toDateOnly(range.dateTo));
    }
  };

  const handleRefresh = React.useCallback(async () => {
    await Promise.all([refetch(queryVariables), refetchManagers(managerVariables)]);
  }, [managerVariables, queryVariables, refetch, refetchManagers]);

  const handleViewDetail = React.useCallback(
    (companyId: string) => {
      setSelectedCompanyId(companyId);
      router.push(`/monitor/company/${encodeURIComponent(companyId)}`);
    },
    [router, setSelectedCompanyId]
  );

  const isInitialLoading = loading && !data;
  const isRefreshing = networkStatus === 4 || managersLoading;

  if (isInitialLoading) {
    return (
      <AreaManagerDashboardLayout>
        <div className="space-y-4">
          <div className="h-36 animate-pulse rounded-2xl bg-muted/40" />
          <div className="grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        </div>
      </AreaManagerDashboardLayout>
    );
  }

  return (
    <AreaManagerDashboardLayout
      title="Multi-Estate Monitoring"
      description="Ringkasan performa lintas perusahaan berbasis data monitor mobile"
      showBreadcrumb={false}
      actions={
        <Button type="button" variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-7xl space-y-5 pb-24">
        <Card className="overflow-hidden border-emerald-300/70 bg-gradient-to-br from-teal-700 via-emerald-700 to-cyan-700 text-white shadow-xl">
          <CardContent className="relative space-y-4 p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-emerald-300/20 blur-2xl" />

            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Monitor Regional
                </p>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Multi-Estate Monitoring</h1>
                <p className="text-sm text-white/85">
                  Sumber desain mengikuti monitor mobile: ringkasan estate, filter status, dan kartu performa perusahaan.
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/85">Cakupan Perusahaan</p>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="h-9 min-w-[220px] border-white/30 bg-white/10 text-white">
                    <SelectValue placeholder="Pilih perusahaan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_COMPANIES_SCOPE}>Semua perusahaan</SelectItem>
                    {availableCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-white/80">Scope aktif: {selectedCompanyLabel}</p>
              </div>
            </div>

            <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/80">Estate</p>
                <p className="mt-2 text-3xl font-black leading-none">{formatNumber(totalEstates, 0)}</p>
              </div>
              <div className="rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/80">Today</p>
                <p className="mt-2 text-3xl font-black leading-none">{formatNumber(totalTodayProduction)} ton</p>
              </div>
              <div className="rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/80">Manager</p>
                <p className="mt-2 text-3xl font-black leading-none">{formatNumber(managerCount, 0)}</p>
              </div>
              <div className="rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/80">Efficiency</p>
                <p className="mt-2 text-3xl font-black leading-none">{formatNumber(averageEfficiency)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/95 shadow-sm">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {PERIOD_OPTIONS.map((option) => {
                  const isActive = selectedPeriod === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handlePeriodChange(option.value)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <CalendarDays className="h-3.5 w-3.5" />
                Last sync: {lastSyncLabel}
                {isRefreshing && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              </div>
            </div>

            {selectedPeriod === 'custom' && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-600">Tanggal Mulai</p>
                  <Input type="date" value={customDateFrom} onChange={(event) => setCustomDateFrom(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-600">Tanggal Akhir</p>
                  <Input type="date" value={customDateTo} onChange={(event) => setCustomDateTo(event.target.value)} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              {FILTER_OPTIONS.map((filter) => {
                const active = selectedFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setSelectedFilter(filter)}
                    className={cn(
                      'rounded-md border-b-2 px-3 py-1 text-sm transition-colors',
                      active
                        ? 'border-b-teal-700 text-teal-700'
                        : 'border-b-transparent text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {(error || managerError) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Gagal memuat data monitor area manager.
              {error ? ` Dashboard: ${error.message}.` : ''}
              {managerError ? ` Manager: ${managerError.message}.` : ''}
            </AlertDescription>
          </Alert>
        )}

        {unreadAlertCount > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Ada {unreadAlertCount} alert regional yang belum dibaca untuk periode aktif.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredCompanies.length === 0 ? (
            <Card className="lg:col-span-2 border-dashed">
              <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                <Leaf className="h-4 w-4" />
                Tidak ada company yang sesuai filter monitor saat ini.
              </CardContent>
            </Card>
          ) : (
            filteredCompanies.map((company) => {
              const statusStyle = STATUS_STYLES[company.status];
              const target = estimateMonthlyTarget(company);
              const progress = target > 0 ? Math.min(100, (company.monthlyProduction / target) * 100) : company.targetAchievement;

              return (
                <Card key={company.companyId} className="border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className={cn('mt-1 h-2.5 w-2.5 rounded-full', statusStyle.dot)} />
                        <div className="rounded-lg bg-teal-50 p-2 text-teal-700">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{company.companyName}</p>
                          <p className="text-xs text-slate-500">{company.estatesCount} estate</p>
                          <p className="text-xs text-slate-500">Pending issue: {formatNumber(company.pendingIssues, 0)}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={statusStyle.badge}>{statusStyle.label}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] text-slate-500">Today&apos;s production</p>
                        <p className="text-xl font-black leading-none text-slate-900">{formatNumber(company.todayProduction)} ton</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-slate-500">Efficiency</p>
                        <div className="inline-flex items-center gap-1.5">
                          {company.trend === TrendDirection.Up ? (
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                          ) : company.trend === TrendDirection.Down ? (
                            <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
                          )}
                          <p className="text-base font-bold text-slate-900">{formatNumber(company.efficiencyScore)}%</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Target progress</span>
                        <span className="font-semibold text-slate-800">{formatNumber(progress)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Gauge className="h-3.5 w-3.5" />
                        Achievement {formatNumber(company.targetAchievement)}%
                      </span>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetail(String(company.companyId))}>
                        View Detail
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="sticky bottom-4 z-20">
          <Card className="border-teal-200 bg-white/95 shadow-xl backdrop-blur">
            <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Hari Ini</p>
                <p className="text-3xl font-black leading-none text-slate-900">{formatNumber(totalTodayProduction)} ton</p>
              </div>

              <div className="hidden h-10 w-px bg-slate-200 md:block" />

              <div className="space-y-1.5">
                <p className="text-xs text-slate-500">
                  Target: {formatNumber(targetTon)} ton ({formatNumber(targetPercentage)}%)
                </p>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-700 to-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, targetPercentage)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Periode: {toDateOnly(activeRange.dateFrom)} - {toDateOnly(activeRange.dateTo)}</span>
                  <Link href="/reports" className="font-semibold text-teal-700 hover:underline">Buka reports</Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AreaManagerDashboardLayout>
  );
}

export default AreaManagerDashboard;

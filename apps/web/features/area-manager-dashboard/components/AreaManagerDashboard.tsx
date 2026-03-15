'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { gql, useQuery } from '@apollo/client';
import { RoleDashboardProps } from '@/features/dashboard/types/dashboard';
import { AreaManagerDashboardLayout } from '@/components/layouts/role-layouts/AreaManagerDashboardLayout';
import { useAuth } from '@/hooks/use-auth';
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
type MonitorFilter = 'ALL' | 'ACTIVE' | 'ALERT' | 'MAINTENANCE';

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
    budgetWorkflowSummary?: {
      draft: number;
      review: number;
      approved: number;
      total: number;
    } | null;
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
  companyId?: string;
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

const toPerformancePlaceholder = (companyId: string, companyName: string): CompanyPerformanceItem => ({
  companyId,
  companyName,
  estatesCount: 0,
  todayProduction: 0,
  monthlyProduction: 0,
  targetAchievement: 0,
  efficiencyScore: 0,
  qualityScore: 0,
  trend: TrendDirection.Stable,
  status: CompanyHealthStatus.Good,
  pendingIssues: 0,
});

const AREA_MANAGER_MONITOR_QUERY = gql`
  query AreaManagerMonitorDashboard($dateFrom: Time, $dateTo: Time, $companyId: ID) {
    areaManagerDashboard(dateFrom: $dateFrom, dateTo: $dateTo, companyId: $companyId) {
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
      budgetWorkflowSummary {
        draft
        review
        approved
        total
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

const AREA_MANAGER_MONITOR_QUERY_LEGACY = gql`
  query AreaManagerMonitorDashboardLegacy($dateFrom: Time, $dateTo: Time) {
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

const FILTER_OPTIONS: Array<{ value: MonitorFilter; label: string }> = [
  { value: 'ALL', label: 'Semua' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'ALERT', label: 'Peringatan' },
  { value: 'MAINTENANCE', label: 'Perawatan' },
];
const PERIOD_OPTIONS: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'last7Days', label: '7 Hari' },
  { value: 'monthToDate', label: 'Bulan Ini' },
  { value: 'custom', label: 'Kustom' },
];

const STATUS_STYLES: Record<CompanyHealthStatus, { dot: string; badge: string; label: string }> = {
  [CompanyHealthStatus.Excellent]: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'Sangat Baik',
  },
  [CompanyHealthStatus.Good]: {
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    label: 'Baik',
  },
  [CompanyHealthStatus.Warning]: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Waspada',
  },
  [CompanyHealthStatus.Critical]: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    label: 'Kritis',
  },
};

const formatNumber = (value: number, maxFractionDigits = 1) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: maxFractionDigits }).format(value);

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RESET_MONITOR_FILTERS_ON_RETURN_KEY = 'agrinova_monitor_reset_filters_on_return_v1';

const toDateOnly = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateOnlyInput = (value?: string | null): Date | null => {
  const raw = String(value || '').trim();
  if (!DATE_ONLY_PATTERN.test(raw)) return null;

  const [yearRaw, monthRaw, dayRaw] = raw.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
};

const isValidDateOnlyInput = (value?: string | null): boolean => parseDateOnlyInput(value) !== null;

const startOfDay = (value: Date): Date => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const endOfDay = (value: Date): Date => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);

const parsePeriodPreset = (value?: string | null): PeriodPreset => {
  if (value === 'today' || value === 'last7Days' || value === 'monthToDate' || value === 'custom') {
    return value;
  }
  return 'monthToDate';
};

const parseMonitorFilter = (value?: string | null): MonitorFilter => {
  if (value === 'ALL' || value === 'ACTIVE' || value === 'ALERT' || value === 'MAINTENANCE') {
    return value;
  }
  return 'ALL';
};

const getFriendlyErrorMessage = (
  errorLike: { message?: string } | null | undefined,
  fallback: string
): string | null => {
  const rawMessage = String(errorLike?.message || '').trim();
  if (!rawMessage) return null;

  const normalized = rawMessage.toLowerCase();
  if (normalized.includes('invalid date range')) {
    return `${fallback} Rentang tanggal tidak valid.`;
  }
  if (normalized.includes('authentication') || normalized.includes('unauthorized') || normalized.includes('forbidden')) {
    return `${fallback} Sesi login tidak valid.`;
  }
  return `${fallback} Silakan muat ulang beberapa saat lagi.`;
};

const hasAreaManagerDashboardSchemaCompatibilityError = (errorLike: unknown): boolean => {
  if (!errorLike || typeof errorLike !== 'object') return false;
  const graphQLErrors = (errorLike as { graphQLErrors?: Array<{ message?: string }> }).graphQLErrors;
  if (!Array.isArray(graphQLErrors)) return false;

  return graphQLErrors.some((graphQLError) => {
    const message = String(graphQLError?.message || '').toLowerCase();
    if (!message) return false;

    const unknownCompanyArg =
      message.includes('unknown argument') &&
      message.includes('companyid') &&
      message.includes('areamanagerdashboard');
    const missingBudgetWorkflowField =
      message.includes('cannot query field') &&
      message.includes('budgetworkflowsummary') &&
      message.includes('areamanagerdashboard');

    return unknownCompanyArg || missingBudgetWorkflowField;
  });
};

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    availableCompanies,
    effectiveCompanyId,
    selectedCompanyId,
    selectedCompanyLabel,
    setSelectedCompanyId,
  } = useCompanyScope();
  const contentContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [floatingCardOffsets, setFloatingCardOffsets] = React.useState<{ left: number; right: number }>({
    left: 16,
    right: 16,
  });

  const defaultRange = React.useMemo(() => resolveRange('monthToDate'), []);
  const [selectedFilter, setSelectedFilter] = React.useState<MonitorFilter>('ALL');
  const [selectedPeriod, setSelectedPeriod] = React.useState<PeriodPreset>('monthToDate');
  const [customDateFrom, setCustomDateFrom] = React.useState<string>(toDateOnly(defaultRange.dateFrom));
  const [customDateTo, setCustomDateTo] = React.useState<string>(toDateOnly(defaultRange.dateTo));
  const [lastSyncAt, setLastSyncAt] = React.useState<Date | null>(null);
  const [useLegacyDashboardQuery, setUseLegacyDashboardQuery] = React.useState(false);
  const skipUrlStateHydrationOnceRef = React.useRef(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const shouldReset = window.sessionStorage.getItem(RESET_MONITOR_FILTERS_ON_RETURN_KEY) === '1';
    if (!shouldReset) return;

    window.sessionStorage.removeItem(RESET_MONITOR_FILTERS_ON_RETURN_KEY);
    skipUrlStateHydrationOnceRef.current = true;

    setSelectedFilter('ALL');
    setSelectedPeriod('monthToDate');
    setCustomDateFrom(toDateOnly(defaultRange.dateFrom));
    setCustomDateTo(toDateOnly(defaultRange.dateTo));

    const params = new URLSearchParams(searchParams?.toString());
    params.delete('filter');
    params.delete('period');
    params.delete('from');
    params.delete('to');
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [defaultRange.dateFrom, defaultRange.dateTo, pathname, router, searchParams]);

  React.useEffect(() => {
    if (skipUrlStateHydrationOnceRef.current) {
      skipUrlStateHydrationOnceRef.current = false;
      return;
    }

    const periodFromUrl = parsePeriodPreset(searchParams?.get('period'));
    const filterFromUrl = parseMonitorFilter(searchParams?.get('filter'));
    const fromFromUrl = searchParams?.get('from');
    const toFromUrl = searchParams?.get('to');
    const companyFromUrl = String(searchParams?.get('company') || '').trim();

    setSelectedPeriod((prev) => (prev === periodFromUrl ? prev : periodFromUrl));
    setSelectedFilter((prev) => (prev === filterFromUrl ? prev : filterFromUrl));

    if (periodFromUrl === 'custom') {
      if (isValidDateOnlyInput(fromFromUrl)) {
        setCustomDateFrom((prev) => (prev === fromFromUrl ? prev : String(fromFromUrl)));
      }
      if (isValidDateOnlyInput(toFromUrl)) {
        setCustomDateTo((prev) => (prev === toFromUrl ? prev : String(toFromUrl)));
      }
    }

    if (!companyFromUrl) return;
    const canSelectCompany =
      companyFromUrl === ALL_COMPANIES_SCOPE ||
      availableCompanies.some((company) => company.id === companyFromUrl);

    if (canSelectCompany) {
      setSelectedCompanyId(companyFromUrl);
    }
  }, [availableCompanies, searchParams, setSelectedCompanyId]);

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString());

    if (selectedPeriod === 'monthToDate') {
      params.delete('period');
    } else {
      params.set('period', selectedPeriod);
    }

    if (selectedFilter === 'ALL') {
      params.delete('filter');
    } else {
      params.set('filter', selectedFilter);
    }

    if (selectedCompanyId === ALL_COMPANIES_SCOPE) {
      params.delete('company');
    } else {
      params.set('company', selectedCompanyId);
    }

    if (selectedPeriod === 'custom') {
      if (isValidDateOnlyInput(customDateFrom)) {
        params.set('from', customDateFrom);
      } else {
        params.delete('from');
      }

      if (isValidDateOnlyInput(customDateTo)) {
        params.set('to', customDateTo);
      } else {
        params.delete('to');
      }
    } else {
      params.delete('from');
      params.delete('to');
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams?.toString() || '';
    if (nextQuery === currentQuery) return;

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [
    customDateFrom,
    customDateTo,
    pathname,
    router,
    searchParams,
    selectedCompanyId,
    selectedFilter,
    selectedPeriod,
  ]);

  const activeRange = React.useMemo(() => {
    if (selectedPeriod !== 'custom') {
      return resolveRange(selectedPeriod);
    }

    const parsedFrom = parseDateOnlyInput(customDateFrom) || defaultRange.dateFrom;
    const parsedTo = parseDateOnlyInput(customDateTo) || defaultRange.dateTo;
    const normalizedFrom = startOfDay(parsedFrom);
    const normalizedTo = parsedTo.getTime() < parsedFrom.getTime() ? endOfDay(parsedFrom) : endOfDay(parsedTo);

    return {
      dateFrom: normalizedFrom,
      dateTo: normalizedTo,
    };
  }, [customDateFrom, customDateTo, defaultRange.dateFrom, defaultRange.dateTo, selectedPeriod]);

  const customDateRangeError = React.useMemo(() => {
    if (selectedPeriod !== 'custom') return null;
    const parsedFrom = parseDateOnlyInput(customDateFrom);
    const parsedTo = parseDateOnlyInput(customDateTo);

    if (!parsedFrom || !parsedTo) {
      return 'Tanggal mulai dan akhir harus diisi dengan format yang valid.';
    }
    if (parsedFrom.getTime() > parsedTo.getTime()) {
      return 'Tanggal akhir harus sama atau setelah tanggal mulai.';
    }
    return null;
  }, [customDateFrom, customDateTo, selectedPeriod]);

  const queryVariables = React.useMemo<MonitorDashboardVars>(
    () => ({
      dateFrom: toDateOnly(activeRange.dateFrom),
      dateTo: toDateOnly(activeRange.dateTo),
      companyId: selectedCompanyId === ALL_COMPANIES_SCOPE ? undefined : selectedCompanyId,
    }),
    [activeRange.dateFrom, activeRange.dateTo, selectedCompanyId],
  );

  const scopedCompanyIds = React.useMemo(() => {
    const ids = new Set<string>();

    const directScopeId = (effectiveCompanyId || '').trim();
    if (directScopeId) {
      ids.add(directScopeId);
      return ids;
    }

    const assignedCompanyIds = Array.isArray(user?.assignedCompanies) ? user.assignedCompanies : [];
    assignedCompanyIds.forEach((companyId) => {
      const value = (companyId || '').trim();
      if (value) ids.add(value);
    });

    const userCompanyId = (user?.companyId || '').trim();
    if (userCompanyId) ids.add(userCompanyId);

    availableCompanies.forEach((company) => {
      const value = String(company.id || '').trim();
      if (value) ids.add(value);
    });

    return ids;
  }, [availableCompanies, effectiveCompanyId, user?.assignedCompanies, user?.companyId]);

  const {
    data,
    loading,
    error,
    refetch,
    networkStatus,
  } = useQuery<MonitorDashboardData, MonitorDashboardVars>(
    useLegacyDashboardQuery ? AREA_MANAGER_MONITOR_QUERY_LEGACY : AREA_MANAGER_MONITOR_QUERY,
    {
    variables: queryVariables,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
    }
  );

  React.useEffect(() => {
    if (useLegacyDashboardQuery) return;
    if (!hasAreaManagerDashboardSchemaCompatibilityError(error)) return;
    setUseLegacyDashboardQuery(true);
  }, [error, useLegacyDashboardQuery]);

  const managerCompanyId = React.useMemo(() => {
    const selectedScopeId = (selectedCompanyId || '').trim();
    if (selectedScopeId && selectedScopeId !== ALL_COMPANIES_SCOPE) {
      return selectedScopeId;
    }
    if (scopedCompanyIds.size === 1) {
      return Array.from(scopedCompanyIds)[0];
    }
    return undefined;
  }, [scopedCompanyIds, selectedCompanyId]);

  const managerVariables = React.useMemo<ManagersUnderAreaVars>(
    () => ({
      companyId: managerCompanyId,
    }),
    [managerCompanyId]
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
    const companyMap = new Map<string, CompanyPerformanceItem>();
    companies.forEach((company) => {
      const normalizedId = String(company.companyId || '').trim();
      if (!normalizedId) return;
      companyMap.set(normalizedId, company);
    });

    const selectedScopeId = (selectedCompanyId || '').trim();
    const availableCompanyIds = availableCompanies
      .map((company) => String(company.id || '').trim())
      .filter(Boolean);
    const availableCompanyNameMap = new Map<string, string>(
      availableCompanies.map((company) => [String(company.id || '').trim(), company.name || String(company.id || '').trim()])
    );

    if (selectedScopeId && selectedScopeId !== ALL_COMPANIES_SCOPE) {
      const selectedCompany = companyMap.get(selectedScopeId);
      if (selectedCompany) return [selectedCompany];
      return [toPerformancePlaceholder(selectedScopeId, availableCompanyNameMap.get(selectedScopeId) || selectedScopeId)];
    }

    if (scopedCompanyIds.size === 0) return companies;

    const orderedScopedIds: string[] = [];
    const addedIds = new Set<string>();

    // Keep UI order aligned with available company options shown in selector.
    availableCompanyIds.forEach((id) => {
      if (!scopedCompanyIds.has(id) || addedIds.has(id)) return;
      orderedScopedIds.push(id);
      addedIds.add(id);
    });

    scopedCompanyIds.forEach((id) => {
      const normalizedId = String(id || '').trim();
      if (!normalizedId || addedIds.has(normalizedId)) return;
      orderedScopedIds.push(normalizedId);
      addedIds.add(normalizedId);
    });

    return orderedScopedIds.map(
      (companyId) =>
        companyMap.get(companyId) ||
        toPerformancePlaceholder(companyId, availableCompanyNameMap.get(companyId) || companyId)
    );
  }, [availableCompanies, data?.areaManagerDashboard?.companyPerformance, scopedCompanyIds, selectedCompanyId]);

  const filteredCompanies = React.useMemo(() => {
    if (selectedFilter === 'ALL') return scopedCompanies;

    if (selectedFilter === 'ACTIVE') {
      return scopedCompanies.filter((company) => company.status !== CompanyHealthStatus.Critical);
    }

    if (selectedFilter === 'ALERT') {
      return scopedCompanies.filter((company) =>
        company.status === CompanyHealthStatus.Warning || company.status === CompanyHealthStatus.Critical
      );
    }

    if (selectedFilter === 'MAINTENANCE') {
      return scopedCompanies.filter((company) => company.pendingIssues > 0);
    }

    return scopedCompanies;
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

  const totalCompanies = React.useMemo(() => {
    if (scopedCompanies.length === 0) return data?.areaManagerDashboard?.stats?.totalCompanies || 0;
    return new Set(scopedCompanies.map((company) => String(company.companyId))).size;
  }, [data?.areaManagerDashboard?.stats?.totalCompanies, scopedCompanies]);

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

  const budgetWorkflowSummary = React.useMemo(() => {
    return (
      data?.areaManagerDashboard?.budgetWorkflowSummary || {
        draft: 0,
        review: 0,
        approved: 0,
        total: 0,
      }
    );
  }, [data?.areaManagerDashboard?.budgetWorkflowSummary]);

  const budgetApprovalRate = React.useMemo(() => {
    if (budgetWorkflowSummary.total <= 0) return 0;
    return (budgetWorkflowSummary.approved / budgetWorkflowSummary.total) * 100;
  }, [budgetWorkflowSummary.approved, budgetWorkflowSummary.total]);

  const dashboardErrorMessage = React.useMemo(
    () => (hasAreaManagerDashboardSchemaCompatibilityError(error) ? null : getFriendlyErrorMessage(error, 'Dasbor tidak dapat dimuat.')),
    [error]
  );
  const managerErrorMessage = React.useMemo(
    () => getFriendlyErrorMessage(managerError, 'Data manajer tidak dapat dimuat.'),
    [managerError]
  );

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
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(RESET_MONITOR_FILTERS_ON_RETURN_KEY, '1');
      }
      router.push(`/monitor/company/${encodeURIComponent(companyId)}`);
    },
    [router]
  );

  const isInitialLoading = loading && !data;
  const isRefreshing = networkStatus === 4 || managersLoading;

  React.useEffect(() => {
    if (isInitialLoading) return;

    const updateFloatingOffsets = () => {
      const container = contentContainerRef.current;
      if (!container || typeof window === 'undefined') return;

      const rect = container.getBoundingClientRect();
      const nextLeft = Math.max(8, Math.round(rect.left));
      const nextRight = Math.max(8, Math.round(window.innerWidth - rect.right));

      setFloatingCardOffsets((prev) => {
        if (prev.left === nextLeft && prev.right === nextRight) {
          return prev;
        }
        return { left: nextLeft, right: nextRight };
      });
    };

    const container = contentContainerRef.current;
    if (!container) return;

    updateFloatingOffsets();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updateFloatingOffsets())
        : null;
    if (resizeObserver) {
      resizeObserver.observe(container);
    }

    window.addEventListener('resize', updateFloatingOffsets);
    const rafId = window.requestAnimationFrame(updateFloatingOffsets);
    const timeoutId = window.setTimeout(updateFloatingOffsets, 120);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', updateFloatingOffsets);
      resizeObserver?.disconnect();
    };
  }, [isInitialLoading]);

  if (isInitialLoading) {
    return (
      <AreaManagerDashboardLayout>
        <div className="space-y-4">
          <div className="h-36 animate-pulse rounded-2xl bg-muted/40" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
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
      title="Monitoring Multi-Perusahaan"
      description="Visibilitas terpadu lintas perusahaan untuk kendali operasional regional."
      showBreadcrumb={false}
    >
      <div ref={contentContainerRef} className="mx-auto w-full max-w-7xl space-y-5 pb-44 md:pb-36">
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
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Monitoring Multi-Perusahaan</h1>
                <p className="text-sm text-white/85">
                  Pantau ringkasan estate, status operasional, dan performa perusahaan dalam satu dashboard eksekutif.
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
                <p className="text-xs text-white/80">Cakupan aktif: {selectedCompanyLabel}</p>
              </div>
            </div>

            <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/80">Perusahaan</p>
                <p className="mt-2 text-3xl font-black leading-none">{formatNumber(totalCompanies, 0)}</p>
              </div>
              <div className="rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/80">Estate</p>
                <p className="mt-2 text-3xl font-black leading-none">{formatNumber(totalEstates, 0)}</p>
              </div>
              <div className="rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/80">Hari Ini</p>
                <p className="mt-2 text-3xl font-black leading-none">{formatNumber(totalTodayProduction)} ton</p>
              </div>
              <div className="rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/80">Manajer</p>
                <p className="mt-2 text-3xl font-black leading-none">{formatNumber(managerCount, 0)}</p>
              </div>
              <div className="rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/80">Efisiensi</p>
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
                        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2',
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

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Sinkron terakhir: {lastSyncLabel}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
                  Muat Ulang
                </Button>
              </div>
            </div>

            {selectedPeriod === 'custom' && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="am-date-from" className="text-xs font-medium text-slate-600">Tanggal Mulai</label>
                  <Input
                    id="am-date-from"
                    name="am-date-from"
                    type="date"
                    value={customDateFrom}
                    aria-invalid={Boolean(customDateRangeError)}
                    onChange={(event) => setCustomDateFrom(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="am-date-to" className="text-xs font-medium text-slate-600">Tanggal Akhir</label>
                  <Input
                    id="am-date-to"
                    name="am-date-to"
                    type="date"
                    value={customDateTo}
                    aria-invalid={Boolean(customDateRangeError)}
                    onChange={(event) => setCustomDateTo(event.target.value)}
                  />
                </div>
                {customDateRangeError && (
                  <p className="md:col-span-2 text-xs font-medium text-rose-600" role="alert">
                    {customDateRangeError}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              {FILTER_OPTIONS.map((filter) => {
                const active = selectedFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setSelectedFilter(filter.value)}
                    className={cn(
                      'rounded-md border-b-2 px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2',
                      active
                        ? 'border-b-teal-700 text-teal-700'
                        : 'border-b-transparent text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/95 shadow-sm">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Workflow Budget Divisi</p>
                <p className="text-sm font-semibold text-slate-800">Ringkasan lintas perusahaan (periode aktif)</p>
              </div>
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

        {(dashboardErrorMessage || managerErrorMessage) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Gagal memuat data monitor area manager.
              {dashboardErrorMessage ? ` ${dashboardErrorMessage}` : ''}
              {managerErrorMessage ? ` ${managerErrorMessage}` : ''}
            </AlertDescription>
          </Alert>
        )}

        {unreadAlertCount > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Ada {unreadAlertCount} peringatan regional yang belum dibaca untuk periode aktif.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredCompanies.length === 0 ? (
            <Card className="lg:col-span-2 border-dashed">
              <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                <Leaf className="h-4 w-4" />
                Tidak ada perusahaan yang sesuai filter monitor saat ini.
              </CardContent>
            </Card>
          ) : (
            filteredCompanies.map((company) => {
              const statusStyle = STATUS_STYLES[company.status];
              const target = estimateMonthlyTarget(company);
              const progress = target > 0 ? Math.min(100, (company.monthlyProduction / target) * 100) : company.targetAchievement;
              const canOpenDetail = company.estatesCount > 0;

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
                          <p className="text-xs text-slate-500">Isu tertunda: {formatNumber(company.pendingIssues, 0)}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={statusStyle.badge}>{statusStyle.label}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] text-slate-500">Produksi hari ini</p>
                        <p className="text-xl font-black leading-none text-slate-900">{formatNumber(company.todayProduction)} ton</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-slate-500">Efisiensi</p>
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
                        <span className="text-slate-500">Progres target</span>
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
                        Pencapaian {formatNumber(company.targetAchievement)}%
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canOpenDetail}
                        title={!canOpenDetail ? 'Estate belum dibuat untuk perusahaan ini.' : undefined}
                        onClick={() => handleViewDetail(String(company.companyId))}
                      >
                        {canOpenDetail ? 'Lihat Detail' : 'Belum Ada Estate'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div
          className="fixed bottom-4 z-40"
          style={{ left: `${floatingCardOffsets.left}px`, right: `${floatingCardOffsets.right}px` }}
        >
          <Card className="border-teal-200 bg-white/95 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-white/90">
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
                  <Link href="/reports" className="font-semibold text-teal-700 hover:underline">Buka laporan</Link>
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

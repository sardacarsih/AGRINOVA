'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { RoleDashboardProps } from '@/features/dashboard/types/dashboard';
import { AreaManagerDashboardLayout } from '@/components/layouts/role-layouts/AreaManagerDashboardLayout';
import { useAuth } from '@/hooks/use-auth';
import { ALL_COMPANIES_SCOPE, useCompanyScope } from '@/contexts/company-scope-context';
import {
  GET_BKM_POTONG_BUAH_ANALYTICS,
  type BkmPotongBuahAnalyticsData,
  type BkmPotongBuahAnalyticsVars,
} from '@/lib/apollo/queries/bkm-report';
import { GET_MY_ASSIGNMENTS, type GetMyAssignmentsResponse } from '@/lib/apollo/queries/harvest';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle,
  BarChart3,
  Building,
  Building2,
  FileText,
  Globe,
  Layers,
  Leaf,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';

type CompanyScopeOption = {
  id: string;
  name: string;
};

const ALL_SCOPE = ALL_COMPANIES_SCOPE;

const MONTH_OPTIONS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

const toFiniteNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const formatNumber = (value: number, maxFractionDigits = 2) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: maxFractionDigits }).format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatDateLabel = (dateText: string) => {
  const raw = dateText.trim();
  if (!raw) return 'Tanggal tidak diketahui';
  const firstTen = raw.slice(0, 10);
  const parsed = new Date(firstTen);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsed);
  }
  return raw;
};

function AreaManagerDashboard({ role: _role }: RoleDashboardProps) {
  const { user } = useAuth();
  const {
    isAreaManager: isAreaManagerScope,
    availableCompanies: globalCompanyOptions,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedCompanyLabel,
  } = useCompanyScope();

  const [selectedMonth, setSelectedMonth] = React.useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = React.useState(() => String(new Date().getFullYear()));

  const currentYear = new Date().getFullYear();
  const yearOptions = React.useMemo(
    () => Array.from({ length: 10 }, (_, idx) => String(currentYear - 5 + idx)),
    [currentYear]
  );

  const period = `${selectedYear}${selectedMonth}`;

  const {
    data: assignmentsData,
    loading: assignmentsLoading,
    error: assignmentsError,
    refetch: refetchAssignments,
  } = useQuery<GetMyAssignmentsResponse>(GET_MY_ASSIGNMENTS, {
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-first',
  });

  const isAreaManager = isAreaManagerScope || user?.role === 'AREA_MANAGER';

  const assignmentCompanyOptions = React.useMemo<CompanyScopeOption[]>(() => {
    const assignmentCompanies = assignmentsData?.myAssignments?.companies || [];
    if (assignmentCompanies.length > 0) {
      return assignmentCompanies.map((company) => ({
        id: String(company.id),
        name: company.name || String(company.id),
      }));
    }

    const fallbackIds = Array.isArray(user?.assignedCompanies) ? user.assignedCompanies : [];
    const fallbackNames = Array.isArray(user?.assignedCompanyNames) ? user.assignedCompanyNames : [];

    return fallbackIds
      .filter(Boolean)
      .map((id, index) => ({
        id,
        name: fallbackNames[index] || id,
      }));
  }, [assignmentsData?.myAssignments?.companies, user?.assignedCompanies, user?.assignedCompanyNames]);

  const companyOptions = React.useMemo<CompanyScopeOption[]>(() => {
    if (isAreaManager && globalCompanyOptions.length > 0) {
      return globalCompanyOptions.map((company) => ({
        id: String(company.id),
        name: company.name || String(company.id),
      }));
    }
    return assignmentCompanyOptions;
  }, [assignmentCompanyOptions, globalCompanyOptions, isAreaManager]);

  const estates = React.useMemo(() => assignmentsData?.myAssignments?.estates || [], [assignmentsData?.myAssignments?.estates]);
  const divisions = React.useMemo(() => assignmentsData?.myAssignments?.divisions || [], [assignmentsData?.myAssignments?.divisions]);

  const estateCompanyById = React.useMemo(() => {
    const map = new Map<string, string>();
    estates.forEach((estate) => {
      const estateId = String(estate.id || '').trim();
      const companyId = String(estate.companyId || '').trim();
      if (!estateId || !companyId) return;
      map.set(estateId, companyId);
    });
    return map;
  }, [estates]);

  const filteredEstates = React.useMemo(() => {
    if (selectedCompanyId === ALL_SCOPE) return estates;
    return estates.filter((estate) => String(estate.companyId || '') === selectedCompanyId);
  }, [estates, selectedCompanyId]);

  const filteredDivisions = React.useMemo(() => {
    if (selectedCompanyId === ALL_SCOPE) return divisions;
    return divisions.filter((division) => estateCompanyById.get(String(division.estateId || '')) === selectedCompanyId);
  }, [divisions, estateCompanyById, selectedCompanyId]);

  const totalBlocks = React.useMemo(
    () => filteredDivisions.reduce((sum, division) => sum + (division.blocks?.length || 0), 0),
    [filteredDivisions]
  );

  const analyticsFilter = React.useMemo<BkmPotongBuahAnalyticsVars['filter']>(() => {
    const filter: BkmPotongBuahAnalyticsVars['filter'] = {
      periode: parseInt(period, 10) || 0,
    };

    if (selectedCompanyId !== ALL_SCOPE) {
      filter.companyId = selectedCompanyId;
    }

    return filter;
  }, [period, selectedCompanyId]);

  const {
    data: analyticsData,
    loading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery<BkmPotongBuahAnalyticsData, BkmPotongBuahAnalyticsVars>(GET_BKM_POTONG_BUAH_ANALYTICS, {
    variables: {
      filter: analyticsFilter,
      topN: 8,
    },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
  });

  const analytics = analyticsData?.bkmPotongBuahAnalytics;

  const summary = React.useMemo(() => {
    const totalQtyKg = toFiniteNumber(analytics?.summary?.totalQty);
    const totalCost = toFiniteNumber(analytics?.summary?.totalJumlah);
    const totalHk = toFiniteNumber(analytics?.summary?.totalHk);
    const outputPerHk = toFiniteNumber(analytics?.summary?.outputPerHk);
    const bgm = toFiniteNumber(analytics?.summary?.bgm);

    return {
      totalRecords: toFiniteNumber(analytics?.totalRecords),
      totalQtyKg,
      totalQtyTon: totalQtyKg / 1000,
      totalCost,
      totalHk,
      outputPerHk,
      bgm,
      lastWorkerCount: analytics?.daily?.length ? toFiniteNumber(analytics.daily[analytics.daily.length - 1]?.workerCount) : 0,
    };
  }, [analytics]);

  const companyStatus = React.useMemo(() => {
    const companies = analytics?.companies || [];
    if (companies.length === 0) {
      return {
        excellent: 0,
        good: 0,
        needsAttention: 0,
      };
    }

    const totalOutput = companies.reduce((sum, company) => sum + toFiniteNumber(company.outputQty), 0);
    const averageOutput = totalOutput / companies.length;

    return companies.reduce(
      (acc, company) => {
        const output = toFiniteNumber(company.outputQty);
        if (output >= averageOutput * 1.1) {
          acc.excellent += 1;
        } else if (output >= averageOutput * 0.9) {
          acc.good += 1;
        } else {
          acc.needsAttention += 1;
        }
        return acc;
      },
      { excellent: 0, good: 0, needsAttention: 0 }
    );
  }, [analytics?.companies]);

  const topCompanies = React.useMemo(
    () =>
      [...(analytics?.companies || [])]
        .sort((a, b) => toFiniteNumber(b.outputQty) - toFiniteNumber(a.outputQty))
        .slice(0, 5),
    [analytics?.companies]
  );

  const latestActivities = React.useMemo(
    () =>
      [...(analytics?.daily || [])]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [analytics?.daily]
  );

  const activeCompanyCount = React.useMemo(() => {
    if (selectedCompanyId !== ALL_SCOPE) return 1;
    return companyOptions.length;
  }, [companyOptions.length, selectedCompanyId]);

  const handleRefresh = React.useCallback(async () => {
    await Promise.all([refetchAssignments(), refetchAnalytics()]);
  }, [refetchAssignments, refetchAnalytics]);

  const initialLoading = (analyticsLoading && !analyticsData) || (assignmentsLoading && !assignmentsData);

  if (initialLoading) {
    return (
      <AreaManagerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </AreaManagerDashboardLayout>
    );
  }

  return (
    <AreaManagerDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Regional Dashboard</h1>
            <p className="text-muted-foreground">
              Monitoring real-time kinerja regional lintas perusahaan
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            <Button asChild variant="outline">
              <Link href="/analytics">
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
              </Link>
            </Button>
            <Button asChild>
              <Link href="/reports">
                <FileText className="h-4 w-4 mr-2" />
                Reports
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Filter Regional</CardTitle>
            <CardDescription>Periode dan cakupan perusahaan untuk dashboard regional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Bulan</p>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Tahun</p>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Perusahaan</p>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua perusahaan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_SCOPE}>Semua perusahaan</SelectItem>
                    {companyOptions.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Scope Aktif</p>
                <div className="h-10 rounded-md border bg-muted/20 px-3 flex items-center text-sm text-muted-foreground">
                  {selectedCompanyLabel}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {(assignmentsError || analyticsError) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Gagal memuat data dashboard regional.
              {assignmentsError ? ` Assignments: ${assignmentsError.message}.` : ''}
              {analyticsError ? ` Analytics: ${analyticsError.message}.` : ''}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Multi-Company Overview</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(activeCompanyCount, 0)}</div>
              <p className="text-xs text-muted-foreground">Perusahaan dalam cakupan aktif</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-semibold text-blue-600">{formatNumber(filteredEstates.length, 0)}</p>
                  <p className="text-xs text-muted-foreground">Estate</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-emerald-600">{formatNumber(filteredDivisions.length, 0)}</p>
                  <p className="text-xs text-muted-foreground">Divisi</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-violet-600">{formatNumber(totalBlocks, 0)}</p>
                  <p className="text-xs text-muted-foreground">Blok</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Regional Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(summary.totalQtyTon)} Ton</div>
              <p className="text-xs text-muted-foreground">Total output periode {period}</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Record</span>
                  <span className="font-medium">{formatNumber(summary.totalRecords, 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Biaya</span>
                  <span className="font-medium">{formatCurrency(summary.totalCost)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Company Status</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Excellent</span>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {companyStatus.excellent}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Good</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {companyStatus.good}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Needs Attention</span>
                <Badge variant="outline" className="bg-amber-50 text-amber-700">
                  {companyStatus.needsAttention}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Regional KPI</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Output / HK</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                  {formatNumber(summary.outputPerHk)} Kg/HK
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total HK</span>
                <Badge variant="outline" className="bg-cyan-50 text-cyan-700">
                  {formatNumber(summary.totalHk)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">BGM</span>
                <Badge variant="outline" className="bg-violet-50 text-violet-700">
                  {formatNumber(summary.bgm)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Regional Activities</CardTitle>
              <CardDescription>Aktivitas produksi harian dari data aktual</CardDescription>
            </CardHeader>
            <CardContent>
              {latestActivities.length === 0 ? (
                <div className="text-sm text-muted-foreground">Belum ada aktivitas untuk periode ini.</div>
              ) : (
                <div className="space-y-3">
                  {latestActivities.map((item) => (
                    <div key={item.date} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Leaf className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">{formatDateLabel(item.date)}</span>
                        </div>
                        <Badge variant="secondary">{formatNumber(toFiniteNumber(item.workerCount), 0)} pekerja</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>Output: {formatNumber(toFiniteNumber(item.outputQty) / 1000)} Ton</span>
                        <span>Biaya: {formatCurrency(toFiniteNumber(item.totalJumlah))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Company Output</CardTitle>
              <CardDescription>Peringkat output perusahaan di scope aktif</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topCompanies.length === 0 ? (
                <div className="text-sm text-muted-foreground">Belum ada data perusahaan.</div>
              ) : (
                topCompanies.map((company, index) => (
                  <div key={`${company.name}-${index}`} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">{company.name}</span>
                      </div>
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Output {formatNumber(toFiniteNumber(company.outputQty) / 1000)} Ton
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Insights</CardTitle>
              <CardDescription>Ringkasan operasional area terpilih</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Perusahaan Aktif</span>
                <span className="font-medium">{activeCompanyCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pemanen Terakhir</span>
                <span className="font-medium">{formatNumber(summary.lastWorkerCount, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Divisi Terpantau</span>
                <span className="font-medium">{formatNumber(filteredDivisions.length, 0)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aksi Strategis</CardTitle>
              <CardDescription>Akses cepat analitik dan pelaporan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Buka Analytics
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/reports">
                  <FileText className="h-4 w-4 mr-2" />
                  Buka Reports
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coverage Area</CardTitle>
              <CardDescription>Distribusi unit dalam cakupan area manager</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" />
                  Company
                </span>
                <span className="font-medium">{formatNumber(activeCompanyCount, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Building className="h-3.5 w-3.5" />
                  Estate
                </span>
                <span className="font-medium">{formatNumber(filteredEstates.length, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" />
                  Blok
                </span>
                <span className="font-medium">{formatNumber(totalBlocks, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  HK (Periode)
                </span>
                <span className="font-medium">{formatNumber(summary.totalHk)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AreaManagerDashboardLayout>
  );
}

export default AreaManagerDashboard;

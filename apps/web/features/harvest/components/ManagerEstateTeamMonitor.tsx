'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowUpRight, BarChart3, ChevronDown, ClipboardList, Gauge, LayoutGrid, Leaf, List, Plus, Search, UserRound, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useGetHarvestRecordsQuery, useGetUsersQuery, UserRole } from '@/gql/graphql';

type TeamRole = 'Mandor' | 'Asisten' | 'Pemanen';
type RoleFilter = 'Semua' | TeamRole;
type SortMode = 'Performa' | 'Nama' | 'Produksi';
type TeamMemberSource = 'user' | 'harvest_record';
type PeriodMode = 'HARI' | 'MINGGU' | 'BULAN';

interface TeamMember {
  id: string;
  name: string;
  role: TeamRole;
  division: string;
  performance: number;
  productionTon: number;
  isActive: boolean;
  source: TeamMemberSource;
  estateNames: string[];
  avatar?: string | null;
  rawUserId?: string;
  reportsToId?: string | null;
}

const TEAM_ROLE_ORDER: TeamRole[] = ['Asisten', 'Mandor', 'Pemanen'];
const ROLE_FILTERS: RoleFilter[] = ['Semua', ...TEAM_ROLE_ORDER];
const PERIOD_OPTIONS: Array<{ value: PeriodMode; label: string }> = [
  { value: 'HARI', label: 'Hari Ini' },
  { value: 'MINGGU', label: '7 Hari' },
  { value: 'BULAN', label: '30 Hari' },
];

const ROLE_CLASSES: Record<TeamRole, { badge: string; avatar: string }> = {
  Mandor: {
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
    avatar: 'from-sky-600 to-cyan-600',
  },
  Asisten: {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    avatar: 'from-amber-500 to-orange-600',
  },
  Pemanen: {
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
    avatar: 'from-emerald-600 to-teal-600',
  },
};

const getInitials = (name: string): string => {
  const safeName = (name || '').trim();
  if (!safeName) return 'NA';

  const initials = safeName
    .split(/\s+/)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2);

  return initials || 'NA';
};

const toRecordDate = (value: unknown): Date | null => {
  if (!value) return null;
  const asDate = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(asDate.getTime())) return null;
  return asDate;
};

const normalizeIdentifier = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const splitKaryawanTokens = (value: string): string[] =>
  value
    .split(/[,;\n|/]+/g)
    .map(token => token.trim())
    .filter(Boolean);

const getRoleRank = (role: TeamRole): number => TEAM_ROLE_ORDER.indexOf(role);

export function ManagerEstateTeamMonitor() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedRole, setSelectedRole] = React.useState<RoleFilter>('Semua');
  const [sortMode, setSortMode] = React.useState<SortMode>('Performa');
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>('BULAN');
  const [isGridView, setIsGridView] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [detailMember, setDetailMember] = React.useState<TeamMember | null>(null);

  const companyId = user?.companyId || user?.assignedCompanies?.[0];
  const managerUserId = user?.id;

  const { data: usersData, loading: isLoadingUsers } = useGetUsersQuery({
    variables: {
      companyId: companyId || undefined,
      isActive: true,
      limit: 400,
      offset: 0,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { data: harvestData, loading: isLoadingHarvest } = useGetHarvestRecordsQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  });

  const userMembers = React.useMemo<TeamMember[]>(() => {
    const users = usersData?.users?.users || [];
    if (!managerUserId) return [];

    const directReports = users.filter(item => {
      const isTeamRole = item.role === UserRole.Mandor || item.role === UserRole.Asisten;
      return isTeamRole && item.managerId === managerUserId;
    });

    const asistenIds = new Set(
      directReports
        .filter(item => item.role === UserRole.Asisten)
        .map(item => item.id)
    );

    const mandorViaAsisten = users.filter(item =>
      item.role === UserRole.Mandor &&
      Boolean(item.managerId) &&
      asistenIds.has(item.managerId as string)
    );

    const uniqueById = new Map<string, (typeof users)[number]>();
    directReports.forEach(item => uniqueById.set(item.id, item));
    mandorViaAsisten.forEach(item => uniqueById.set(item.id, item));

    return Array.from(uniqueById.values()).map(item => ({
      id: `usr-${item.id}`,
      name: (item.name || item.username || 'Tanpa Nama').trim(),
      role: item.role === UserRole.Asisten ? 'Asisten' : 'Mandor',
      division: item.divisions?.[0]?.name || 'Divisi -',
      performance: 0,
      productionTon: 0,
      isActive: item.isActive,
      source: 'user',
      estateNames: item.estates?.map(estate => estate.name) || [],
      avatar: item.avatar,
      rawUserId: item.id,
      reportsToId: item.managerId || null,
    }));
  }, [managerUserId, usersData?.users?.users]);

  const periodStartDate = React.useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (periodMode === 'HARI') {
      start.setHours(0, 0, 0, 0);
      return start;
    }
    if (periodMode === 'MINGGU') {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [periodMode]);

  const mandorProductionByUserId = React.useMemo(() => {
    const map = new Map<string, number>();
    const records = harvestData?.harvestRecords || [];

    for (const record of records) {
      const recordDate = toRecordDate(record.tanggal);
      if (!recordDate || recordDate < periodStartDate) continue;
      if (record.status === 'REJECTED') continue;

      const mandorId = record.mandor?.id;
      if (!mandorId) continue;

      const productionTon = Number(record.beratTbs || 0) / 1000;
      map.set(mandorId, (map.get(mandorId) || 0) + productionTon);
    }

    return map;
  }, [harvestData?.harvestRecords, periodStartDate]);

  const members = React.useMemo(() => {
    const mandorProductionByAsistenId = new Map<string, number>();
    const userMembersWithProduction = userMembers.map(member => {
      if (member.role !== 'Mandor') return member;

      const production = Number((mandorProductionByUserId.get(member.rawUserId || '') || 0).toFixed(1));
      if (member.reportsToId) {
        mandorProductionByAsistenId.set(
          member.reportsToId,
          Number(((mandorProductionByAsistenId.get(member.reportsToId) || 0) + production).toFixed(1))
        );
      }

      return {
        ...member,
        productionTon: production,
      };
    });

    const asistenMapped = userMembersWithProduction.map(member => {
      if (member.role !== 'Asisten') return member;
      return {
        ...member,
        productionTon: Number((mandorProductionByAsistenId.get(member.rawUserId || '') || 0).toFixed(1)),
      };
    });

    // Pemanen source is harvest_records.nik (primary) and fallback harvest_records.karyawan.
    const pemanenById = new Map<string, TeamMember>();
    const ensurePemanen = (rawToken: string, sourceType: 'nik' | 'karyawan'): string | null => {
      const token = rawToken.trim();
      if (!token) return null;

      const normalizedToken = normalizeIdentifier(token);
      if (!normalizedToken) return null;

      const memberId = sourceType === 'nik'
        ? `pem-nik-${normalizedToken}`
        : `pem-name-${normalizedToken}`;

      if (!pemanenById.has(memberId)) {
        pemanenById.set(memberId, {
          id: memberId,
          name: sourceType === 'nik' ? `NIK ${token}` : token,
          role: 'Pemanen',
          division: 'Divisi -',
          performance: 0,
          productionTon: 0,
          isActive: true,
          source: 'harvest_record',
          estateNames: [],
        });
      }

      return memberId;
    };

    const records = harvestData?.harvestRecords || [];
    for (const record of records) {
      const recordDate = toRecordDate(record.tanggal);
      if (!recordDate || recordDate < periodStartDate) continue;
      if (record.status === 'REJECTED') continue;

      const nikTokens = splitKaryawanTokens((record.nik || '').trim());
      const fallbackKaryawanTokens = nikTokens.length > 0
        ? []
        : splitKaryawanTokens((record.karyawan || '').trim());
      const tokens = nikTokens.length > 0 ? nikTokens : fallbackKaryawanTokens;
      if (tokens.length === 0) continue;
      const sourceType: 'nik' | 'karyawan' = nikTokens.length > 0 ? 'nik' : 'karyawan';

      const matchedMemberIds = new Set<string>();
      for (const token of tokens) {
        const memberId = ensurePemanen(token, sourceType);
        if (memberId) matchedMemberIds.add(memberId);
      }

      if (matchedMemberIds.size === 0) continue;

      const recordTon = Number(record.beratTbs || 0) / 1000;
      const splitTon = recordTon / matchedMemberIds.size;
      for (const memberId of matchedMemberIds) {
        const existing = pemanenById.get(memberId);
        if (!existing) continue;
        pemanenById.set(memberId, {
          ...existing,
          productionTon: Number((existing.productionTon + splitTon).toFixed(2)),
        });
      }
    }

    const pemanenMapped = Array.from(pemanenById.values());

    const combined = [...asistenMapped, ...pemanenMapped];
    const maxProductionByRole: Record<TeamRole, number> = {
      Mandor: 0,
      Asisten: 0,
      Pemanen: 0,
    };

    combined.forEach(member => {
      maxProductionByRole[member.role] = Math.max(maxProductionByRole[member.role], member.productionTon);
    });

    return combined.map(member => {
      const maxRoleValue = maxProductionByRole[member.role];
      const performance = maxRoleValue > 0
        ? Number(Math.min(100, (member.productionTon / maxRoleValue) * 100).toFixed(1))
        : 0;
      return {
        ...member,
        performance,
      };
    });
  }, [harvestData?.harvestRecords, mandorProductionByUserId, periodStartDate, userMembers]);

  const summary = React.useMemo(() => {
    const totalMandor = members.filter(item => item.role === 'Mandor').length;
    const totalAsisten = members.filter(item => item.role === 'Asisten').length;
    const totalPemanen = members.filter(item => item.role === 'Pemanen').length;
    const activeMembers = members.filter(item => item.isActive).length;
    const totalTeam = members.length;
    const totalProduction = Number(members.reduce((acc, item) => acc + item.productionTon, 0).toFixed(1));
    const efficiency = totalTeam > 0
      ? Number((members.reduce((acc, item) => acc + item.performance, 0) / totalTeam).toFixed(1))
      : 0;

    return {
      totalTeam,
      totalMandor,
      totalAsisten,
      totalPemanen,
      activeMembers,
      totalProduction,
      efficiency,
    };
  }, [members]);

  const roleCounts = React.useMemo(() => {
    const counts: Record<RoleFilter, number> = {
      Semua: members.length,
      Mandor: 0,
      Asisten: 0,
      Pemanen: 0,
    };

    members.forEach(member => {
      counts[member.role] += 1;
    });

    return counts;
  }, [members]);

  const filteredMembers = React.useMemo(() => {
    const roleFiltered =
      selectedRole === 'Semua'
        ? members
        : members.filter(member => member.role === selectedRole);

    const searchFiltered = searchTerm.trim()
      ? roleFiltered.filter(member => member.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : roleFiltered;

    switch (sortMode) {
      case 'Nama':
        return searchFiltered.toSorted((a, b) => {
          const nameCompare = a.name.localeCompare(b.name);
          if (nameCompare !== 0) return nameCompare;
          return getRoleRank(a.role) - getRoleRank(b.role);
        });
      case 'Produksi':
        return searchFiltered.toSorted((a, b) => {
          const productionCompare = b.productionTon - a.productionTon;
          if (productionCompare !== 0) return productionCompare;
          return getRoleRank(a.role) - getRoleRank(b.role);
        });
      case 'Performa':
      default:
        return searchFiltered.toSorted((a, b) => {
          const performanceCompare = b.performance - a.performance;
          if (performanceCompare !== 0) return performanceCompare;
          return getRoleRank(a.role) - getRoleRank(b.role);
        });
    }
  }, [members, searchTerm, selectedRole, sortMode]);

  const isLoading = isLoadingUsers || isLoadingHarvest;
  const selectedPeriodLabel = PERIOD_OPTIONS.find(option => option.value === periodMode)?.label ?? '30 Hari';

  const handleDetail = (member: TeamMember) => {
    setDetailMember(member);
  };

  const handleEvaluate = (member: TeamMember) => {
    toast({
      title: 'Mode evaluasi dibuka',
      description: `Evaluasi performa ${member.name} siap diproses.`,
    });
    router.push('/reports');
  };

  const handleAddTeam = () => {
    router.push('/users');
  };

  const handleSortCycle = () => {
    setSortMode(previous => {
      if (previous === 'Performa') return 'Nama';
      if (previous === 'Nama') return 'Produksi';
      return 'Performa';
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-24">
      <Card className="overflow-hidden border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 text-slate-900 shadow-xl dark:border-emerald-500/40 dark:from-emerald-800 dark:via-teal-800 dark:to-cyan-900 dark:text-white">
        <CardContent className="relative p-6 sm:p-7">
          <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-emerald-300/30 blur-sm dark:bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-cyan-300/30 blur-sm dark:bg-white/10" />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl space-y-2">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:border-white/30 dark:bg-white/10 dark:text-white/95">
                <Activity className="h-3.5 w-3.5" />
                Monitor Tim Estate
              </p>
              <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">
                Pantau produktivitas tim harian secara cepat
              </h2>
              <p className="text-sm text-slate-700 sm:text-base dark:text-white/90">
                Data tim diperbarui setiap 60 detik dengan fokus pada performa, produksi TBS, dan status keaktifan.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white/70 px-4 py-3 text-sm dark:border-white/25 dark:bg-white/10">
              <p className="font-semibold">Periode Analisis</p>
              <p className="mt-1 text-xl font-extrabold">{selectedPeriodLabel}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-white/70 p-3 dark:border-white/25 dark:bg-white/10">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-white/80">Total Anggota</p>
                <Users className="h-4 w-4 text-slate-600 dark:text-white/90" />
              </div>
              <p className="mt-2 text-3xl font-black leading-none">{summary.totalTeam}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white/70 p-3 dark:border-white/25 dark:bg-white/10">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-white/80">Aktif</p>
                <ArrowUpRight className="h-4 w-4 text-slate-600 dark:text-white/90" />
              </div>
              <p className="mt-2 text-3xl font-black leading-none">{summary.activeMembers}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white/70 p-3 dark:border-white/25 dark:bg-white/10">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-white/80">Produksi</p>
                <BarChart3 className="h-4 w-4 text-slate-600 dark:text-white/90" />
              </div>
              <p className="mt-2 text-3xl font-black leading-none">{summary.totalProduction.toFixed(1)}</p>
              <p className="text-xs text-slate-600 dark:text-white/80">ton</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white/70 p-3 dark:border-white/25 dark:bg-white/10">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-white/80">Efisiensi</p>
                <Gauge className="h-4 w-4 text-slate-600 dark:text-white/90" />
              </div>
              <p className="mt-2 text-3xl font-black leading-none">{summary.efficiency}%</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/75 px-2.5 py-1 font-semibold text-slate-700 dark:border-white/30 dark:bg-white/15 dark:text-white">
              <ClipboardList className="h-3.5 w-3.5" />
              Asisten: {summary.totalAsisten}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/75 px-2.5 py-1 font-semibold text-slate-700 dark:border-white/30 dark:bg-white/15 dark:text-white">
              <UserRound className="h-3.5 w-3.5" />
              Mandor: {summary.totalMandor}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/75 px-2.5 py-1 font-semibold text-slate-700 dark:border-white/30 dark:bg-white/15 dark:text-white">
              <Leaf className="h-3.5 w-3.5" />
              Pemanen: {summary.totalPemanen}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-300 !bg-white !text-slate-900 shadow-sm dark:border-slate-700 dark:!bg-slate-900 dark:!text-slate-100">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari anggota tim, contoh: Andi"
                className="border-slate-300 bg-slate-50 pl-9 text-slate-900 placeholder:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={handleSortCycle}
            >
              Urutkan: {sortMode}
              <ChevronDown className="h-4 w-4" />
            </button>

            <Select value={periodMode} onValueChange={(value: PeriodMode) => setPeriodMode(value)}>
              <SelectTrigger className="w-full min-w-[150px] border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setIsGridView(false)}
                className={cn(
                  'rounded-md p-2 transition-colors',
                  !isGridView ? 'bg-emerald-700 text-white' : 'text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                )}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsGridView(true)}
                className={cn(
                  'rounded-md p-2 transition-colors',
                  isGridView ? 'bg-emerald-700 text-white' : 'text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map(filter => {
              const active = selectedRole === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedRole(filter)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                      : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  )}
                >
                  {filter}
                  <span className={cn('rounded-full px-2 py-0.5 text-xs', active ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-600 dark:text-slate-100')}>
                    {roleCounts[filter]}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className={cn('grid gap-4', isGridView ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1')}>
        {isLoading ? (
          <Card className="rounded-2xl border-dashed border-slate-300 !bg-slate-50 !text-slate-900 shadow-sm dark:border-slate-700 dark:!bg-slate-900 dark:!text-slate-100">
            <CardContent className="flex items-center gap-3 p-6 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Activity className="h-4 w-4 animate-pulse" />
              Memuat data tim estate...
            </CardContent>
          </Card>
        ) : filteredMembers.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-slate-300 !bg-slate-50 !text-slate-900 shadow-sm dark:border-slate-700 dark:!bg-slate-900 dark:!text-slate-100">
            <CardContent className="flex items-center gap-3 p-6 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Search className="h-4 w-4" />
              Tidak ada anggota tim sesuai filter.
            </CardContent>
          </Card>
        ) : (
          filteredMembers.map(member => {
            const roleStyle = ROLE_CLASSES[member.role];
            return (
              <Card key={member.id} className="group overflow-hidden rounded-2xl border-slate-300 !bg-white !text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:!bg-slate-900 dark:!text-slate-100 dark:hover:bg-slate-900">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar || undefined} alt={member.name} />
                        <AvatarFallback className={cn('bg-gradient-to-br text-base font-bold text-white', roleStyle.avatar)}>
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold leading-tight text-slate-900 dark:text-slate-100">{member.name}</p>
                        <p className="truncate text-sm text-slate-600 dark:text-slate-400">{member.division}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black leading-none text-emerald-700 dark:text-emerald-400">{member.performance.toFixed(1)}%</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Performa</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', roleStyle.badge)}>
                      {member.role}
                    </span>
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', member.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200')}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', member.isActive ? 'bg-emerald-500' : 'bg-rose-500')} />
                      {member.isActive ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                    {member.source === 'harvest_record' && (
                      <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                        Dari Harvest
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                        style={{ width: `${member.performance}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-medium text-slate-700 dark:text-slate-300">Produksi</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{member.productionTon.toFixed(1)} ton</p>
                    </div>
                    {member.estateNames.length > 0 && (
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">Estate: {member.estateNames.join(', ')}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="rounded-full border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                      onClick={() => handleDetail(member)}
                    >
                      Detail
                    </Button>
                    <Button className="rounded-full bg-emerald-700 hover:bg-emerald-800" onClick={() => handleEvaluate(member)}>
                      Evaluasi
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="pointer-events-none fixed bottom-6 right-6 z-20">
        <Button
          className="pointer-events-auto rounded-full bg-emerald-700 px-5 py-6 text-sm font-semibold shadow-lg hover:bg-emerald-800"
          onClick={handleAddTeam}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Tim
        </Button>
      </div>

      <Dialog open={Boolean(detailMember)} onOpenChange={(open) => !open && setDetailMember(null)}>
        <DialogContent className="sm:max-w-md !bg-white !text-slate-900 dark:!bg-slate-900 dark:!text-slate-100">
          <DialogHeader>
            <DialogTitle>Detail Anggota Tim</DialogTitle>
          </DialogHeader>
          {detailMember && (
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Nama:</span> {detailMember.name}</p>
              <p><span className="font-semibold">Role:</span> {detailMember.role}</p>
              <p><span className="font-semibold">Divisi:</span> {detailMember.division}</p>
              <p><span className="font-semibold">Performa:</span> {detailMember.performance.toFixed(1)}%</p>
              <p><span className="font-semibold">Produksi:</span> {detailMember.productionTon.toFixed(1)} ton</p>
              <p><span className="font-semibold">Status:</span> {detailMember.isActive ? 'Active' : 'Inactive'}</p>
              <p><span className="font-semibold">Sumber Data:</span> {detailMember.source === 'user' ? 'User Management' : 'Harvest Record'}</p>
              {detailMember.estateNames.length > 0 && (
                <p><span className="font-semibold">Estate:</span> {detailMember.estateNames.join(', ')}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

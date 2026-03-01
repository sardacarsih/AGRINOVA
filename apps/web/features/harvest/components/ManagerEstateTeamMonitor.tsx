'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowUpRight, BarChart3, Building2, ChevronDown, ClipboardList, Gauge, LayoutGrid, Leaf, List, Search, UserRound, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ALL_COMPANIES_SCOPE, useCompanyScope } from '@/contexts/company-scope-context';
import { GetHarvestRecordsQuery, GetUsersQuery, useGetHarvestRecordsQuery, useGetUsersQuery, UserRole } from '@/gql/graphql';

type TeamRole = 'Manager' | 'Asisten' | 'Mandor' | 'Pemanen';
type RoleFilter = 'Semua' | TeamRole;
type SortMode = 'Performa' | 'Nama' | 'Produksi';
type TeamMemberSource = 'user' | 'harvest_record';
type PeriodMode = 'HARI' | 'MINGGU' | 'BULAN';
type DashboardRole = 'ASISTEN' | 'MANAGER' | 'AREA_MANAGER';
type QueryUser = NonNullable<NonNullable<GetUsersQuery['users']>['users']>[number];
type HarvestRecordNode = NonNullable<GetHarvestRecordsQuery['harvestRecords']>[number];

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

const TEAM_ROLE_ORDER: TeamRole[] = ['Manager', 'Asisten', 'Mandor', 'Pemanen'];
const ROLE_FILTERS: RoleFilter[] = ['Semua', ...TEAM_ROLE_ORDER];
const PERIOD_OPTIONS: Array<{ value: PeriodMode; label: string }> = [
  { value: 'HARI', label: 'Hari Ini' },
  { value: 'MINGGU', label: '7 Hari' },
  { value: 'BULAN', label: '30 Hari' },
];

const ROLE_CLASSES: Record<TeamRole, { badge: string; avatar: string }> = {
  Manager: {
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
    avatar: 'from-indigo-600 to-blue-600',
  },
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

const normalizeDashboardRole = (role?: string): DashboardRole | null => {
  const normalized = (role || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'ASISTEN' || normalized === 'MANAGER' || normalized === 'AREA_MANAGER') {
    return normalized;
  }
  return null;
};

const isVisibleUserRole = (viewerRole: DashboardRole | null, userRole: UserRole): boolean => {
  if (!viewerRole) return false;
  if (viewerRole === 'ASISTEN') {
    return userRole === UserRole.Mandor;
  }
  if (viewerRole === 'MANAGER') {
    return userRole === UserRole.Asisten || userRole === UserRole.Mandor;
  }
  return userRole === UserRole.Manager || userRole === UserRole.Asisten || userRole === UserRole.Mandor;
};

const mapToTeamRole = (userRole: UserRole): TeamRole | null => {
  if (userRole === UserRole.Manager) return 'Manager';
  if (userRole === UserRole.Asisten) return 'Asisten';
  if (userRole === UserRole.Mandor) return 'Mandor';
  return null;
};

const getUserEntityIds = (items?: Array<{ id: string } | null> | null): string[] =>
  (items || [])
    .map((item) => (item?.id || '').trim())
    .filter(Boolean);

const hasIdOverlap = (scope: Set<string>, targetIds: string[]): boolean => {
  if (scope.size === 0 || targetIds.length === 0) return false;
  return targetIds.some((id) => scope.has(id));
};

export function ManagerEstateTeamMonitor() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { effectiveCompanyId, selectedCompanyId, selectedCompanyLabel } = useCompanyScope();

  const [selectedRole, setSelectedRole] = React.useState<RoleFilter>('Semua');
  const [sortMode, setSortMode] = React.useState<SortMode>('Performa');
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>('BULAN');
  const [isGridView, setIsGridView] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [detailMember, setDetailMember] = React.useState<TeamMember | null>(null);

  const currentUserId = (user?.id || '').trim();
  const normalizedRole = normalizeDashboardRole(user?.role);
  const resolvedCompanyId = React.useMemo(() => {
    if (normalizedRole === 'AREA_MANAGER') {
      return effectiveCompanyId;
    }
    return effectiveCompanyId || user?.companyId || user?.assignedCompanies?.[0];
  }, [effectiveCompanyId, normalizedRole, user?.assignedCompanies, user?.companyId]);

  const usersQueryVariables = React.useMemo(() => ({
    isActive: true,
    limit: 1000,
    offset: 0,
    ...(resolvedCompanyId ? { companyId: resolvedCompanyId } : {}),
  }), [resolvedCompanyId]);

  const { data: usersData, loading: isLoadingUsers } = useGetUsersQuery({
    variables: usersQueryVariables,
    fetchPolicy: 'cache-and-network',
  });

  const { data: harvestData, loading: isLoadingHarvest } = useGetHarvestRecordsQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  });

  const users = React.useMemo(() => usersData?.users?.users || [], [usersData?.users?.users]);

  const currentUserNode = React.useMemo(
    () => users.find((candidate) => candidate.id === currentUserId) || null,
    [currentUserId, users]
  );

  const viewerCompanyIds = React.useMemo(() => {
    const ids = new Set<string>();
    const scopedCompanyId = (effectiveCompanyId || '').trim();
    if (scopedCompanyId) {
      ids.add(scopedCompanyId);
      return ids;
    }

    const assignedCompanyIds = Array.isArray(user?.assignedCompanies) ? user.assignedCompanies : [];
    assignedCompanyIds.forEach((id) => {
      const value = (id || '').trim();
      if (value) ids.add(value);
    });

    const userCompanyId = (user?.companyId || '').trim();
    if (userCompanyId) ids.add(userCompanyId);

    const nodeCompanyId = (currentUserNode?.companyId || '').trim();
    if (nodeCompanyId) ids.add(nodeCompanyId);

    getUserEntityIds(currentUserNode?.companies || []).forEach((id) => ids.add(id));
    return ids;
  }, [
    currentUserNode?.companies,
    currentUserNode?.companyId,
    effectiveCompanyId,
    user?.assignedCompanies,
    user?.companyId,
  ]);

  const viewerEstateIds = React.useMemo(() => {
    const ids = new Set<string>();
    const assignedEstateIds = Array.isArray(user?.assignedEstates) ? user.assignedEstates : [];
    assignedEstateIds.forEach((id) => {
      const value = (id || '').trim();
      if (value) ids.add(value);
    });
    getUserEntityIds(currentUserNode?.estates || []).forEach((id) => ids.add(id));
    return ids;
  }, [currentUserNode?.estates, user?.assignedEstates]);

  const viewerDivisionIds = React.useMemo(() => {
    const ids = new Set<string>();
    const assignedDivisionIds = Array.isArray(user?.assignedDivisions) ? user.assignedDivisions : [];
    assignedDivisionIds.forEach((id) => {
      const value = (id || '').trim();
      if (value) ids.add(value);
    });
    getUserEntityIds(currentUserNode?.divisions || []).forEach((id) => ids.add(id));
    return ids;
  }, [currentUserNode?.divisions, user?.assignedDivisions]);

  const userMatchesCompanyScope = React.useCallback((candidate: QueryUser): boolean => {
    if (normalizedRole !== 'AREA_MANAGER') return true;
    if (viewerCompanyIds.size === 0) return true;

    const directCompanyId = (candidate.companyId || '').trim();
    if (directCompanyId && viewerCompanyIds.has(directCompanyId)) {
      return true;
    }

    const candidateCompanyIds = getUserEntityIds(candidate.companies || []);
    return hasIdOverlap(viewerCompanyIds, candidateCompanyIds);
  }, [normalizedRole, viewerCompanyIds]);

  const childrenByManagerId = React.useMemo(() => {
    const map = new Map<string, QueryUser[]>();
    users.forEach((candidate) => {
      const managerId = (candidate.managerId || '').trim();
      if (!managerId) return;
      const current = map.get(managerId) || [];
      current.push(candidate);
      map.set(managerId, current);
    });
    return map;
  }, [users]);

  const hierarchicalTeamUsers = React.useMemo(() => {
    if (!currentUserId || !normalizedRole) return [] as QueryUser[];

    const visible = new Map<string, QueryUser>();
    const queue: string[] = [currentUserId];
    const visited = new Set<string>([currentUserId]);

    while (queue.length > 0) {
      const managerId = queue.shift();
      if (!managerId) continue;

      const children = childrenByManagerId.get(managerId) || [];
      children.forEach((child) => {
        if (visited.has(child.id)) return;
        visited.add(child.id);
        queue.push(child.id);

        if (!isVisibleUserRole(normalizedRole, child.role)) return;
        if (!userMatchesCompanyScope(child)) return;
        visible.set(child.id, child);
      });
    }

    return Array.from(visible.values());
  }, [childrenByManagerId, currentUserId, normalizedRole, userMatchesCompanyScope]);

  const fallbackScopedUsers = React.useMemo(() => {
    if (!normalizedRole) return [] as QueryUser[];

    const hierarchicalIds = new Set(hierarchicalTeamUsers.map((item) => item.id));
    const result: QueryUser[] = [];

    users.forEach((candidate) => {
      if (candidate.id === currentUserId) return;
      if (hierarchicalIds.has(candidate.id)) return;
      if (!isVisibleUserRole(normalizedRole, candidate.role)) return;
      if (!userMatchesCompanyScope(candidate)) return;

      if (normalizedRole === 'AREA_MANAGER') {
        result.push(candidate);
        return;
      }

      const candidateEstateIds = getUserEntityIds(candidate.estates || []);
      const candidateDivisionIds = getUserEntityIds(candidate.divisions || []);
      const divisionMatch = hasIdOverlap(viewerDivisionIds, candidateDivisionIds);
      const estateMatch = hasIdOverlap(viewerEstateIds, candidateEstateIds);
      if (divisionMatch || estateMatch) {
        result.push(candidate);
      }
    });

    return result;
  }, [
    currentUserId,
    hierarchicalTeamUsers,
    normalizedRole,
    userMatchesCompanyScope,
    users,
    viewerDivisionIds,
    viewerEstateIds,
  ]);

  const scopedUsers = React.useMemo(() => {
    const unique = new Map<string, QueryUser>();
    hierarchicalTeamUsers.forEach((item) => unique.set(item.id, item));
    fallbackScopedUsers.forEach((item) => unique.set(item.id, item));
    return Array.from(unique.values());
  }, [fallbackScopedUsers, hierarchicalTeamUsers]);

  const roleFilters = React.useMemo<RoleFilter[]>(() => {
    if (normalizedRole === 'AREA_MANAGER') return ROLE_FILTERS;
    return ROLE_FILTERS.filter((filter) => filter !== 'Manager');
  }, [normalizedRole]);

  React.useEffect(() => {
    if (!roleFilters.includes(selectedRole)) {
      setSelectedRole('Semua');
    }
  }, [roleFilters, selectedRole]);

  const userMembers = React.useMemo<TeamMember[]>(() => {
    const mapped: TeamMember[] = [];

    scopedUsers.forEach((item) => {
      const teamRole = mapToTeamRole(item.role);
      if (!teamRole) return;

      mapped.push({
        id: `usr-${item.id}`,
        name: (item.name || item.username || 'Tanpa Nama').trim(),
        role: teamRole,
        division: item.divisions?.[0]?.name || 'Divisi -',
        performance: 0,
        productionTon: 0,
        isActive: item.isActive,
        source: 'user',
        estateNames: item.estates?.map((estate) => estate.name) || [],
        avatar: item.avatar,
        rawUserId: item.id,
        reportsToId: item.managerId || null,
      });
    });

    return mapped;
  }, [scopedUsers]);

  const scopedMandorIds = React.useMemo(() => {
    return new Set(
      userMembers
        .filter((member) => member.role === 'Mandor')
        .map((member) => (member.rawUserId || '').trim())
        .filter(Boolean)
    );
  }, [userMembers]);

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

  const scopedHarvestRecords = React.useMemo(() => {
    const records = harvestData?.harvestRecords || [];
    if (!normalizedRole) return [] as HarvestRecordNode[];

    return records.filter((record) => {
      const recordDate = toRecordDate(record.tanggal);
      if (!recordDate || recordDate < periodStartDate) return false;
      if (record.status === 'REJECTED') return false;

      if (scopedMandorIds.size === 0) return false;
      const mandorId = (record.mandor?.id || '').trim();
      return Boolean(mandorId && scopedMandorIds.has(mandorId));
    });
  }, [harvestData?.harvestRecords, normalizedRole, periodStartDate, scopedMandorIds]);

  const mandorProductionByUserId = React.useMemo(() => {
    const map = new Map<string, number>();

    for (const record of scopedHarvestRecords) {
      const mandorId = record.mandor?.id;
      if (!mandorId) continue;

      const productionTon = Number(record.beratTbs || 0) / 1000;
      map.set(mandorId, (map.get(mandorId) || 0) + productionTon);
    }

    return map;
  }, [scopedHarvestRecords]);

  const members = React.useMemo(() => {
    const mandorProductionBySupervisorId = new Map<string, number>();
    const userMembersWithProduction = userMembers.map(member => {
      if (member.role !== 'Mandor') return member;

      const production = Number((mandorProductionByUserId.get(member.rawUserId || '') || 0).toFixed(1));
      if (member.reportsToId) {
        mandorProductionBySupervisorId.set(
          member.reportsToId,
          Number(((mandorProductionBySupervisorId.get(member.reportsToId) || 0) + production).toFixed(1))
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
        productionTon: Number((mandorProductionBySupervisorId.get(member.rawUserId || '') || 0).toFixed(1)),
      };
    });

    const asistenProductionByManagerId = new Map<string, number>();
    asistenMapped.forEach((member) => {
      if (member.role !== 'Asisten') return;
      const managerId = (member.reportsToId || '').trim();
      if (!managerId) return;

      asistenProductionByManagerId.set(
        managerId,
        Number(((asistenProductionByManagerId.get(managerId) || 0) + member.productionTon).toFixed(1))
      );
    });

    const managerMapped = asistenMapped.map((member) => {
      if (member.role !== 'Manager') return member;
      const managerUserId = (member.rawUserId || '').trim();
      const directMandorTon = mandorProductionBySupervisorId.get(managerUserId) || 0;
      const asistenTon = asistenProductionByManagerId.get(managerUserId) || 0;

      return {
        ...member,
        productionTon: Number((directMandorTon + asistenTon).toFixed(1)),
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

    for (const record of scopedHarvestRecords) {
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

    const combined = [...managerMapped, ...pemanenMapped];
    const maxProductionByRole: Record<TeamRole, number> = {
      Manager: 0,
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
  }, [mandorProductionByUserId, scopedHarvestRecords, userMembers]);

  const summary = React.useMemo(() => {
    const totalManager = members.filter(item => item.role === 'Manager').length;
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
      totalManager,
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
      Manager: 0,
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
  const roleViewLabel = React.useMemo(() => {
    if (normalizedRole === 'AREA_MANAGER') return 'Tampilan Area Manager';
    if (normalizedRole === 'ASISTEN') return 'Tampilan Asisten';
    if (normalizedRole === 'MANAGER') return 'Tampilan Manager';
    return 'Tampilan Tim';
  }, [normalizedRole]);
  const scopeLabel = React.useMemo(() => {
    if (normalizedRole === 'AREA_MANAGER') {
      if (selectedCompanyId === ALL_COMPANIES_SCOPE) {
        return 'Semua perusahaan dalam penugasan';
      }
      return selectedCompanyLabel || 'Perusahaan terpilih';
    }

    return selectedCompanyLabel || 'Cakupan perusahaan pengguna';
  }, [normalizedRole, selectedCompanyId, selectedCompanyLabel]);

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
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-semibold">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white/80 px-2.5 py-1 text-emerald-900 dark:border-white/30 dark:bg-white/10 dark:text-white">
                  <Users className="h-3.5 w-3.5" />
                  {roleViewLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white/80 px-2.5 py-1 text-emerald-900 dark:border-white/30 dark:bg-white/10 dark:text-white">
                  <Building2 className="h-3.5 w-3.5" />
                  Cakupan: {scopeLabel}
                </span>
              </div>
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
              <Building2 className="h-3.5 w-3.5" />
              Manager: {summary.totalManager}
            </span>
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
                aria-label="Tampilan daftar"
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
                aria-label="Tampilan grid"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {roleFilters.map(filter => {
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
                        Dari Panen
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

      <Dialog open={Boolean(detailMember)} onOpenChange={(open) => !open && setDetailMember(null)}>
        <DialogContent className="sm:max-w-md !bg-white !text-slate-900 dark:!bg-slate-900 dark:!text-slate-100">
          <DialogHeader>
            <DialogTitle>Detail Anggota Tim</DialogTitle>
          </DialogHeader>
          {detailMember && (
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Nama:</span> {detailMember.name}</p>
              <p><span className="font-semibold">Peran:</span> {detailMember.role}</p>
              <p><span className="font-semibold">Divisi:</span> {detailMember.division}</p>
              <p><span className="font-semibold">Performa:</span> {detailMember.performance.toFixed(1)}%</p>
              <p><span className="font-semibold">Produksi:</span> {detailMember.productionTon.toFixed(1)} ton</p>
              <p><span className="font-semibold">Status:</span> {detailMember.isActive ? 'Aktif' : 'Nonaktif'}</p>
              <p><span className="font-semibold">Sumber Data:</span> {detailMember.source === 'user' ? 'Manajemen Pengguna' : 'Catatan Panen'}</p>
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

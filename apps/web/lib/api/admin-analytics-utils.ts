export type AdminGraphCompany = {
  id: string;
  name: string;
  isActive?: boolean | null;
  status?: string | null;
};

export type AdminGraphEntity = {
  id: string;
  name?: string | null;
};

export type AdminGraphUser = {
  id: string;
  username?: string | null;
  name: string;
  role: string;
  companyId?: string | null;
  company?: AdminGraphEntity | null;
  companies?: AdminGraphEntity[] | null;
  estates?: AdminGraphEntity[] | null;
  divisions?: AdminGraphEntity[] | null;
  isActive?: boolean | null;
};

export type RoleScopingAnalysis = {
  violationCount: number;
  violationsByRole: Record<string, number>;
};

const normalizeRole = (role: unknown): string => {
  if (typeof role !== 'string') return '';
  return role.toUpperCase().trim();
};

const formatProcessUptime = (): string => {
  const totalSeconds = Number.isFinite(process.uptime()) ? Math.max(0, Math.floor(process.uptime())) : 0;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days} hari ${hours} jam ${minutes} menit`;
  }

  return `${hours} jam ${minutes} menit`;
};

const listLength = (value: unknown): number => (Array.isArray(value) ? value.length : 0);
const toUserLabel = (user: AdminGraphUser): string => user.username || user.name;

const getRoleMinimumRequiredAssignments = (role: string): number => {
  switch (role) {
    case 'COMPANY_ADMIN':
      return 1; // wajib company
    case 'AREA_MANAGER':
      return 1; // minimal 1 company
    case 'MANAGER':
      return 2; // company + estate
    case 'ASISTEN':
      return 3; // company + estate + minimal 1 divisi
    case 'MANDOR':
      return 3; // company + estate + minimal 1 divisi
    case 'SATPAM':
    case 'TIMBANGAN':
    case 'GRADING':
      return 1; // wajib company
    default:
      return 0;
  }
};

const hasCompanyScope = (user: AdminGraphUser): boolean =>
  Boolean(user.companyId) ||
  Boolean(user.company?.id) ||
  listLength(user.companies) > 0;

const getCompanyScopeCount = (user: AdminGraphUser): number => {
  const ids = new Set<string>();
  if (typeof user.companyId === 'string' && user.companyId.trim().length > 0) {
    ids.add(user.companyId.trim());
  }
  if (typeof user.company?.id === 'string' && user.company.id.trim().length > 0) {
    ids.add(user.company.id.trim());
  }
  if (Array.isArray(user.companies)) {
    user.companies.forEach((company) => {
      if (typeof company?.id === 'string' && company.id.trim().length > 0) {
        ids.add(company.id.trim());
      }
    });
  }
  return ids.size;
};

const hasEstateScope = (user: AdminGraphUser): boolean => listLength(user.estates) > 0;
const hasDivisionScope = (user: AdminGraphUser): boolean => listLength(user.divisions) > 0;

const hasAnyAssignments = (user: AdminGraphUser): boolean =>
  listLength(user.companies) + listLength(user.estates) + listLength(user.divisions) > 0;

export const getRoleScopingIssues = (user: AdminGraphUser): string[] => {
  const role = normalizeRole(user.role);
  const companyScopeCount = getCompanyScopeCount(user);
  const issues: string[] = [];

  switch (role) {
    case 'SUPER_ADMIN':
      if (hasAnyAssignments(user)) issues.push('SUPER_ADMIN must not have assignment');
      break;
    case 'COMPANY_ADMIN':
      if (!hasCompanyScope(user)) issues.push('COMPANY_ADMIN must have company scope');
      break;
    case 'AREA_MANAGER':
      if (companyScopeCount < 1) issues.push('AREA_MANAGER must have at least one company');
      break;
    case 'MANAGER':
      if (companyScopeCount !== 1) issues.push('MANAGER must have exactly one company');
      if (!hasEstateScope(user)) issues.push('MANAGER must have at least one estate');
      break;
    case 'ASISTEN':
    case 'MANDOR':
      if (!hasCompanyScope(user)) issues.push(`${role} must have company scope`);
      if (!hasEstateScope(user)) issues.push(`${role} must have estate scope`);
      if (!hasDivisionScope(user)) issues.push(`${role} must have at least one division`);
      break;
    case 'SATPAM':
    case 'TIMBANGAN':
    case 'GRADING':
      if (!hasCompanyScope(user)) issues.push(`${role} must have company scope`);
      break;
    default:
      break;
  }

  return issues;
};

export const analyzeRoleScoping = (users: AdminGraphUser[]): RoleScopingAnalysis => {
  const violationsByRole = users.reduce<Record<string, number>>((acc, user) => {
    const role = normalizeRole(user.role);
    if (getRoleScopingIssues(user).length > 0) {
      acc[role] = (acc[role] || 0) + 1;
    }
    return acc;
  }, {});

  return {
    violationCount: Object.values(violationsByRole).reduce((sum, value) => sum + value, 0),
    violationsByRole
  };
};

const formatRoleViolationSummary = (violationsByRole: Record<string, number>): string =>
  Object.entries(violationsByRole)
    .sort((a, b) => b[1] - a[1])
    .map(([role, count]) => `${role}: ${count}`)
    .join(', ');

const ROLE_SCOPE_GUIDANCE: Record<string, string> = {
  SUPER_ADMIN: 'SUPER_ADMIN tidak boleh memiliki assignment',
  COMPANY_ADMIN: 'COMPANY_ADMIN wajib memiliki company scope',
  AREA_MANAGER: 'AREA_MANAGER wajib memiliki minimal 1 company',
  MANAGER: 'MANAGER wajib tepat 1 company dan minimal 1 estate',
  ASISTEN: 'ASISTEN wajib memiliki company, estate, dan minimal 1 divisi',
  MANDOR: 'MANDOR wajib memiliki company, estate, dan minimal 1 divisi',
  SATPAM: 'SATPAM wajib memiliki company',
  TIMBANGAN: 'TIMBANGAN wajib memiliki company',
  GRADING: 'GRADING wajib memiliki company'
};

const buildRoleScopingRecommendations = (violationsByRole: Record<string, number>): string[] => {
  const recommendations = Object.keys(violationsByRole)
    .map((role) => ROLE_SCOPE_GUIDANCE[role])
    .filter((value): value is string => Boolean(value));
  if (recommendations.length === 0) {
    return ['Review role scope assignments and normalize hierarchy coverage'];
  }
  return recommendations;
};

type AssignmentItem = { type: 'company' | 'estate' | 'division'; id: string; name: string };

const getAssignments = (user: AdminGraphUser): AssignmentItem[] => [
  ...(Array.isArray(user.companies)
    ? user.companies.map((company) => ({
        type: 'company' as const,
        id: company.id,
        name: company.name || company.id
      }))
    : []),
  ...(Array.isArray(user.estates)
    ? user.estates.map((estate) => ({
        type: 'estate' as const,
        id: estate.id,
        name: estate.name || `Estate ${estate.id}`
      }))
    : []),
  ...(Array.isArray(user.divisions)
    ? user.divisions.map((division) => ({
        type: 'division' as const,
        id: division.id,
        name: division.name || `Division ${division.id}`
      }))
    : [])
];

const getAssignmentCount = (user: AdminGraphUser): number => getAssignments(user).length;

const getEffectiveAssignments = (role: string, assignments: AssignmentItem[]): number => {
  if (role === 'AREA_MANAGER') {
    // Multi-company assignment is normal for AREA_MANAGER.
    return assignments.filter((assignment) => assignment.type !== 'company').length;
  }

  if (role === 'MANAGER') {
    // 1 company + multi-estate is normal for MANAGER.
    return assignments.filter((assignment) => assignment.type === 'division').length;
  }

  const requiredAssignments = getRoleMinimumRequiredAssignments(role);
  return Math.max(0, assignments.length - requiredAssignments);
};

export const userMatchesCompany = (user: AdminGraphUser, companyId: string): boolean => {
  if (user.companyId === companyId) return true;
  if (user.company?.id === companyId) return true;
  return Array.isArray(user.companies) && user.companies.some((company) => company.id === companyId);
};

export const buildSystemStatisticsPayload = (input: {
  users: AdminGraphUser[];
  companies: AdminGraphCompany[];
  totalEstates: number;
  totalDivisions: number;
  totalBlocks: number;
}) => {
  const { users, companies, totalEstates, totalDivisions, totalBlocks } = input;
  const roleScoping = analyzeRoleScoping(users);

  return {
    totalCompanies: companies.length,
    activeCompanies: companies.filter((company) => company.isActive || normalizeRole(company.status) === 'ACTIVE').length,
    totalEstates,
    totalDivisions,
    totalBlocks,
    totalUsers: users.length,
    activeUsers: users.filter((user) => user.isActive !== false).length,
    inactiveUsers: users.filter((user) => user.isActive === false).length,
    suspendedUsers: 0,
    superAdmins: users.filter((user) => normalizeRole(user.role) === 'SUPER_ADMIN').length,
    companyAdmins: users.filter((user) => normalizeRole(user.role) === 'COMPANY_ADMIN').length,
    areaManagers: users.filter((user) => normalizeRole(user.role) === 'AREA_MANAGER').length,
    managers: users.filter((user) => normalizeRole(user.role) === 'MANAGER').length,
    asistens: users.filter((user) => normalizeRole(user.role) === 'ASISTEN').length,
    mandors: users.filter((user) => normalizeRole(user.role) === 'MANDOR').length,
    satpams: users.filter((user) => normalizeRole(user.role) === 'SATPAM').length,
    multiCompanyAreaManagers: users.filter(
      (user) => normalizeRole(user.role) === 'AREA_MANAGER' && listLength(user.companies) > 1
    ).length,
    multiEstateManagers: users.filter(
      (user) => normalizeRole(user.role) === 'MANAGER' && listLength(user.estates) > 1
    ).length,
    multiDivisionAsistens: users.filter(
      (user) => normalizeRole(user.role) === 'ASISTEN' && listLength(user.divisions) > 1
    ).length,
    orphanedUsers: roleScoping.violationCount,
    systemHealth: 'warning',
    systemUptime: formatProcessUptime(),
    databaseStatus: 'connected',
    redisStatus: 'connected',
    wsConnectionStatus: 'connected',
    totalAPIRequests: 0,
    avgResponseTime: 0,
    errorRate: 0,
    dailyActiveUsers: Math.floor(users.length * 0.85),
    weeklyActiveUsers: Math.floor(users.length * 0.95),
    monthlyActiveUsers: users.length,
    pendingApprovals: 0,
    gateChecksToday: 0,
    harvestRecordsToday: 0,
    trends: {
      users: 0,
      companies: 0,
      activities: 0,
      performance: 0
    },
    lastUpdated: new Date().toISOString()
  };
};

export const buildMultiAssignmentAnalyticsPayload = (input: {
  users: AdminGraphUser[];
  companies: AdminGraphCompany[];
  filters?: {
    companyIds?: string[];
    roles?: string[];
  };
}) => {
  const roleFilters = (input.filters?.roles || []).map((role) => normalizeRole(role)).filter(Boolean);
  const companyFilters = (input.filters?.companyIds || []).filter(Boolean);

  const filteredUsers = input.users.filter((user) => {
    if (roleFilters.length > 0 && !roleFilters.includes(normalizeRole(user.role))) return false;
    if (companyFilters.length > 0 && !companyFilters.some((companyId) => userMatchesCompany(user, companyId))) return false;
    return true;
  });

  const trackedRoles = ['AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR'];
  const roleScoping = analyzeRoleScoping(filteredUsers);

  const multiAssignedUsers = filteredUsers.filter((user) => getAssignmentCount(user) > 1);
  const multiCompanyAreaManagers = filteredUsers.filter(
    (user) => normalizeRole(user.role) === 'AREA_MANAGER' && listLength(user.companies) > 1
  ).length;
  const multiEstateManagers = filteredUsers.filter(
    (user) => normalizeRole(user.role) === 'MANAGER' && listLength(user.estates) > 1
  ).length;
  const multiDivisionAsistens = filteredUsers.filter(
    (user) => normalizeRole(user.role) === 'ASISTEN' && listLength(user.divisions) > 1
  ).length;

  const roleBreakdown = trackedRoles.map((role) => {
    const roleUsers = filteredUsers.filter((user) => normalizeRole(user.role) === role);
    const counts = roleUsers.map((user) => getAssignmentCount(user));
    const totalAssignments = counts.reduce((sum, value) => sum + value, 0);
    const multiAssigned = counts.filter((value) => value > 1).length;
    const averageAssignments = roleUsers.length > 0 ? Number((totalAssignments / roleUsers.length).toFixed(1)) : 0;
    const maxAssignments = counts.length > 0 ? Math.max(...counts) : 0;
    const efficiency = roleUsers.length > 0 ? Math.max(0, Math.round(100 - (multiAssigned / roleUsers.length) * 25)) : 100;

    return {
      role,
      total: roleUsers.length,
      multiAssigned,
      averageAssignments,
      maxAssignments,
      efficiency
    };
  });

  const companyAnalysis = input.companies.map((company) => {
    const companyUsers = filteredUsers.filter((user) => userMatchesCompany(user, company.id));
    const totalUsers = companyUsers.length;
    const areaManagersAssigned = companyUsers.filter((user) => normalizeRole(user.role) === 'AREA_MANAGER').length;
    const managersAssigned = companyUsers.filter((user) => normalizeRole(user.role) === 'MANAGER').length;
    const assistensAssigned = companyUsers.filter((user) => normalizeRole(user.role) === 'ASISTEN').length;
    const multiAssignedInCompany = companyUsers.filter((user) => getAssignmentCount(user) > 1).length;
    const multiAssignmentRatio = totalUsers > 0 ? Number((multiAssignedInCompany / totalUsers).toFixed(2)) : 0;
    const coverage =
      totalUsers > 0
        ? Number((Math.min(1, (areaManagersAssigned + managersAssigned + assistensAssigned) / totalUsers)).toFixed(2))
        : 0;

    return {
      companyId: company.id,
      companyName: company.name,
      areaManagersAssigned,
      managersAssigned,
      assistensAssigned,
      totalUsers,
      multiAssignmentRatio,
      coverage
    };
  });

  const assignmentMatrix = filteredUsers
    .filter((user) => trackedRoles.includes(normalizeRole(user.role)))
    .map((user) => {
      const assignments = getAssignments(user);
      const normalizedRole = normalizeRole(user.role);
      const effectiveAssignments = getEffectiveAssignments(normalizedRole, assignments);
      const workload = Math.min(100, effectiveAssignments * 30);
      const performance = Math.max(50, 100 - Math.round(workload * 0.4));
      const scopeIssues = getRoleScopingIssues(user);

      const recommendations =
        scopeIssues.length > 0
          ? scopeIssues
          : effectiveAssignments === 0
          ? ['Assignment level is within normal role scope']
          : effectiveAssignments > 2
          ? ['Redistribute workload', 'Review assignment overlap']
          : effectiveAssignments === 1
          ? ['Capacity available for additional assignment']
          : ['Assignment distribution is balanced'];

      return {
        userId: user.id,
        userName: toUserLabel(user),
        role: normalizedRole,
        assignments,
        workload,
        performance,
        recommendations
      };
    });

  const overloadedUsers = assignmentMatrix.filter((item) => item.workload >= 80).length;
  const underutilizedUsers = assignmentMatrix.filter((item) => item.workload > 0 && item.workload <= 30).length;
  const orphanedUsers = roleScoping.violationCount;
  const overloadedUserNames = assignmentMatrix
    .filter((item) => item.workload >= 80)
    .map((item) => item.userName);
  const underutilizedUserNames = assignmentMatrix
    .filter((item) => item.workload > 0 && item.workload <= 30)
    .map((item) => item.userName);
  const orphanedUserNames = filteredUsers
    .filter((user) => getRoleScopingIssues(user).length > 0)
    .map((user) => toUserLabel(user));

  const hotspots: Array<{
    type: 'overloaded' | 'underutilized' | 'orphaned';
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    affectedUsers: number;
    affectedUserNames?: string[];
    recommendations: string[];
  }> = [];

  if (overloadedUsers > 0) {
    hotspots.push({
      type: 'overloaded',
      severity: overloadedUsers >= 3 ? 'high' : 'medium',
      title: 'Assignment overload detected',
      description: 'Some users currently carry too many assignments',
      affectedUsers: overloadedUsers,
      affectedUserNames: overloadedUserNames,
      recommendations: ['Redistribute assignments', 'Add backup assignees']
    });
  }

  if (underutilizedUsers > 0) {
    hotspots.push({
      type: 'underutilized',
      severity: 'low',
      title: 'Unused assignment capacity',
      description: 'Some users can still take more assignments',
      affectedUsers: underutilizedUsers,
      affectedUserNames: underutilizedUserNames,
      recommendations: ['Rebalance assignment distribution']
    });
  }

  if (orphanedUsers > 0) {
    const summary = formatRoleViolationSummary(roleScoping.violationsByRole);
    hotspots.push({
      type: 'orphaned',
      severity: 'high',
      title: 'Unscoped users detected',
      description: summary ? `Users violating role scope rules found (${summary})` : 'Users violating role scope rules found',
      affectedUsers: orphanedUsers,
      affectedUserNames: orphanedUserNames,
      recommendations: buildRoleScopingRecommendations(roleScoping.violationsByRole)
    });
  }

  const efficiencyScore =
    roleBreakdown.length > 0
      ? Number((roleBreakdown.reduce((sum, row) => sum + row.efficiency, 0) / roleBreakdown.length).toFixed(1))
      : 0;
  const coverageScore =
    companyAnalysis.length > 0
      ? Number(((companyAnalysis.reduce((sum, row) => sum + row.coverage, 0) / companyAnalysis.length) * 100).toFixed(1))
      : 0;

  return {
    summary: {
      totalMultiAssignedUsers: multiAssignedUsers.length,
      multiCompanyAreaManagers,
      multiEstateManagers,
      multiDivisionAsistens,
      orphanedUsers,
      efficiencyScore,
      coverageScore
    },
    trends: {
      multiAssignments: { current: multiAssignedUsers.length, previous: multiAssignedUsers.length, change: 0 },
      efficiency: { current: efficiencyScore, previous: efficiencyScore, change: 0 },
      coverage: { current: coverageScore, previous: coverageScore, change: 0 }
    },
    roleBreakdown,
    companyAnalysis,
    assignmentMatrix,
    hotspots
  };
};

import cookieApiClient from './cookie-client';
import { User, Company } from '@/types/auth';
import { apolloClient } from '@/lib/apollo/client';
import { GET_COMPANIES } from '@/lib/apollo/queries/company';
import { GET_USERS } from '@/lib/apollo/queries/users';
import { GET_ALL_ESTATES, GET_ALL_DIVISIONS } from '@/lib/apollo/queries/hierarchy-data';
import { GET_BLOCKS_FOR_HARVEST } from '@/lib/apollo/queries/harvest';

// Super Admin Statistics interfaces
export interface SystemStatistics {
  totalCompanies: number;
  activeCompanies: number;
  totalEstates: number;
  totalDivisions: number;
  totalBlocks: number;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  superAdmins: number;
  companyAdmins: number;
  areaManagers: number;
  managers: number;
  asistens: number;
  mandors: number;
  satpams: number;
  multiCompanyAreaManagers: number;
  multiEstateManagers: number;
  multiDivisionAsistens: number;
  orphanedUsers: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  systemUptime: string;
  databaseStatus: 'connected' | 'disconnected' | 'error';
  redisStatus: 'connected' | 'disconnected' | 'error';
  wsConnectionStatus: 'connected' | 'disconnected' | 'error';
  totalAPIRequests: number;
  avgResponseTime: number;
  errorRate: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  pendingApprovals: number;
  gateChecksToday: number;
  harvestRecordsToday: number;
  trends: {
    users: number;
    companies: number;
    activities: number;
    performance: number;
  };
  lastUpdated: Date;
}

export interface MultiAssignmentAnalytics {
  summary: {
    totalMultiAssignedUsers: number;
    multiCompanyAreaManagers: number;
    multiEstateManagers: number;
    multiDivisionAsistens: number;
    orphanedUsers: number;
    efficiencyScore: number;
    coverageScore: number;
  };
  trends: {
    multiAssignments: { current: number; previous: number; change: number };
    efficiency: { current: number; previous: number; change: number };
    coverage: { current: number; previous: number; change: number };
  };
  roleBreakdown: Array<{
    role: string;
    total: number;
    multiAssigned: number;
    averageAssignments: number;
    maxAssignments: number;
    efficiency: number;
  }>;
  companyAnalysis: Array<{
    companyId: string;
    companyName: string;
    areaManagersAssigned: number;
    managersAssigned: number;
    assistensAssigned: number;
    totalUsers: number;
    multiAssignmentRatio: number;
    coverage: number;
  }>;
  assignmentMatrix: Array<{
    userId: string;
    userName: string;
    role: string;
    assignments: Array<{
      type: 'company' | 'estate' | 'division';
      id: string;
      name: string;
    }>;
    workload: number;
    performance: number;
    recommendations: string[];
  }>;
  hotspots: Array<{
    type: 'overloaded' | 'underutilized' | 'conflicted' | 'orphaned';
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    affectedUsers: number;
    affectedUserNames?: string[];
    recommendations: string[];
  }>;
}

export interface SystemActivity {
  id: string;
  type: 'user_created' | 'user_updated' | 'user_deleted' | 'company_created' | 'system_alert' | 'assignment_updated' | 'performance_alert';
  title: string;
  description: string;
  userId?: string;
  userName?: string;
  companyId?: string;
  companyName?: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface GlobalSearchResult {
  type: 'user' | 'company' | 'estate' | 'division' | 'block';
  id: string;
  name: string;
  code?: string;
  description?: string;
  parentName?: string;
  status?: string;
  role?: string;
  metadata?: Record<string, any>;
}

export interface DashboardFilters {
  dateRange?: {
    from: Date;
    to: Date;
  };
  companyIds?: string[];
  roles?: string[];
  status?: 'all' | 'active' | 'inactive' | 'suspended';
}

const normalizeRole = (role: unknown): string => {
  if (typeof role !== 'string') return '';
  return role.toUpperCase().trim();
};

const VALID_ROLES: User['role'][] = [
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'AREA_MANAGER',
  'MANAGER',
  'ASISTEN',
  'MANDOR',
  'SATPAM',
  'TIMBANGAN',
  'GRADING'
];

const toSafeRole = (role: unknown): User['role'] => {
  const normalized = normalizeRole(role);
  if (VALID_ROLES.includes(normalized as User['role'])) {
    return normalized as User['role'];
  }
  return 'MANDOR';
};

const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
};

const normalizeUptimeLabel = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;

  const invalidLabels = new Set(['N/A', 'NA', '-', 'UNKNOWN', 'NULL']);
  if (invalidLabels.has(normalized.toUpperCase())) {
    return null;
  }

  return normalized;
};

const normalizeUserStatus = (input: unknown, isActive?: unknown): 'active' | 'inactive' | 'suspended' => {
  if (typeof input === 'string') {
    const status = input.toLowerCase();
    if (status === 'active' || status === 'inactive' || status === 'suspended') {
      return status;
    }
  }
  return isActive === false ? 'inactive' : 'active';
};

type RoleScopingAnalysis = {
  violationCount: number;
  violationsByRole: Record<string, number>;
};

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

const getArrayLength = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

const hasCompanyScope = (user: User): boolean =>
  Boolean(user.companyId) ||
  (typeof user.company === 'string' && user.company.trim().length > 0) ||
  getArrayLength(user.assignedCompanies) > 0;

const getCompanyScopeCount = (user: User): number => {
  const companyIds = new Set<string>();
  if (typeof user.companyId === 'string' && user.companyId.trim().length > 0) {
    companyIds.add(user.companyId.trim());
  }
  if (typeof user.company === 'string' && user.company.trim().length > 0) {
    companyIds.add(user.company.trim());
  }
  if (Array.isArray(user.assignedCompanies)) {
    user.assignedCompanies.forEach((companyId) => {
      if (typeof companyId === 'string' && companyId.trim().length > 0) {
        companyIds.add(companyId.trim());
      }
    });
  }
  return companyIds.size;
};

const hasEstateScope = (user: User): boolean =>
  getArrayLength(user.assignedEstates) > 0 ||
  (typeof user.estate === 'string' && user.estate.trim().length > 0);
const hasDivisionScope = (user: User): boolean =>
  getArrayLength(user.assignedDivisions) > 0 ||
  (typeof (user as any).division === 'string' && (user as any).division.trim().length > 0);

const hasAnyAssignments = (user: User): boolean =>
  getArrayLength(user.assignedCompanies) + getArrayLength(user.assignedEstates) + getArrayLength(user.assignedDivisions) > 0;

const getRoleScopingIssues = (user: User): string[] => {
  const role = normalizeRole(user.role);
  const companyScopeCount = getCompanyScopeCount(user);
  const issues: string[] = [];

  switch (role) {
    case 'SUPER_ADMIN':
      if (hasAnyAssignments(user)) {
        issues.push('SUPER_ADMIN must not have assignment');
      }
      break;
    case 'COMPANY_ADMIN':
      if (!hasCompanyScope(user)) {
        issues.push('COMPANY_ADMIN must have company scope');
      }
      break;
    case 'AREA_MANAGER':
      if (companyScopeCount < 1) {
        issues.push('AREA_MANAGER must have at least one company');
      }
      break;
    case 'MANAGER':
      if (companyScopeCount !== 1) {
        issues.push('MANAGER must have exactly one company');
      }
      if (!hasEstateScope(user)) {
        issues.push('MANAGER must have at least one estate');
      }
      break;
    case 'ASISTEN':
    case 'MANDOR':
      if (!hasCompanyScope(user)) {
        issues.push(`${role} must have company scope`);
      }
      if (!hasEstateScope(user)) {
        issues.push(`${role} must have estate scope`);
      }
      if (!hasDivisionScope(user)) {
        issues.push(`${role} must have at least one division`);
      }
      break;
    case 'SATPAM':
    case 'TIMBANGAN':
    case 'GRADING':
      if (!hasCompanyScope(user)) {
        issues.push(`${role} must have company scope`);
      }
      break;
    default:
      break;
  }

  return issues;
};

const analyzeRoleScoping = (users: User[]): RoleScopingAnalysis => {
  const violationsByRole = users.reduce<Record<string, number>>((acc, user) => {
    const role = normalizeRole(user.role);
    const issues = getRoleScopingIssues(user);
    if (issues.length > 0) {
      acc[role] = (acc[role] || 0) + 1;
    }
    return acc;
  }, {});

  return {
    violationCount: Object.values(violationsByRole).reduce((sum, count) => sum + count, 0),
    violationsByRole
  };
};

const formatRoleViolationSummary = (violationsByRole: Record<string, number>): string =>
  Object.entries(violationsByRole)
    .sort((a, b) => b[1] - a[1])
    .map(([role, count]) => `${role}: ${count}`)
    .join(', ');

const buildRoleScopingRecommendations = (violationsByRole: Record<string, number>): string[] => {
  const roleBased = Object.keys(violationsByRole)
    .map((role) => ROLE_SCOPE_GUIDANCE[role])
    .filter((value): value is string => Boolean(value));
  const fallback = ['Review role scope assignments and normalize hierarchy coverage'];
  return roleBased.length > 0 ? roleBased : fallback;
};

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

type AssignmentItem = { type: 'company' | 'estate' | 'division'; id: string; name: string };

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

const hasSystemStatisticsPayload = (input: any): input is Partial<SystemStatistics> => {
  return Boolean(
    input &&
      typeof input === 'object' &&
      typeof input.totalCompanies === 'number' &&
      typeof input.totalUsers === 'number'
  );
};

const hasMultiAssignmentPayload = (input: any): input is Partial<MultiAssignmentAnalytics> => {
  return Boolean(
    input &&
      typeof input === 'object' &&
      input.summary &&
      typeof input.summary.totalMultiAssignedUsers === 'number'
  );
};

export class SuperAdminAPI {
  /**
   * Get comprehensive system statistics
   */
  static async getSystemStatistics(filters?: DashboardFilters): Promise<SystemStatistics> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.dateRange) {
        params.append('from', filters.dateRange.from.toISOString());
        params.append('to', filters.dateRange.to.toISOString());
      }
      if (filters?.companyIds && Array.isArray(filters.companyIds) && filters.companyIds.length > 0) {
        filters.companyIds.forEach(id => params.append('companyIds[]', id));
      }
      if (filters?.roles && Array.isArray(filters.roles) && filters.roles.length > 0) {
        filters.roles.forEach(role => params.append('roles[]', role));
      }
      if (filters?.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }

      // Try admin endpoint first, fall back to manual calculation
      try {
        const response = await cookieApiClient.get<SystemStatistics>(`/admin/system-statistics?${params.toString()}`);
        const data = (response.data || response) as any;
        if (!hasSystemStatisticsPayload(data)) {
          throw new Error('System statistics endpoint returned invalid payload');
        }
        const parsed: SystemStatistics = {
          ...(data as SystemStatistics),
          systemUptime: normalizeUptimeLabel(data.systemUptime) || 'Tidak tersedia',
          lastUpdated: toDate(data.lastUpdated)
        };
        return parsed;
      } catch (adminError) {
        // Fallback: Calculate statistics from existing endpoints
        const [companies, users, estatesResult, divisionsResult, blocksResult, healthSnapshot] = await Promise.all([
          this.getAllCompanies(),
          this.getAllUsers({ limit: 100 }),
          apolloClient.query({
            query: GET_ALL_ESTATES,
            fetchPolicy: 'network-only'
          }),
          apolloClient.query({
            query: GET_ALL_DIVISIONS,
            fetchPolicy: 'network-only'
          }),
          apolloClient.query({
            query: GET_BLOCKS_FOR_HARVEST,
            fetchPolicy: 'network-only'
          }),
          this.getSystemHealth().catch(() => null)
        ]);

        const totalEstates = Array.isArray((estatesResult.data as any)?.estates)
          ? (estatesResult.data as any).estates.length
          : 0;
        const totalDivisions = Array.isArray((divisionsResult.data as any)?.divisions)
          ? (divisionsResult.data as any).divisions.length
          : 0;
        const totalBlocks = Array.isArray((blocksResult.data as any)?.blocks)
          ? (blocksResult.data as any).blocks.length
          : 0;

        const usersData = Array.isArray(users.data) ? users.data : [];
        const roleScopingAnalysis = analyzeRoleScoping(usersData);

        // Generate statistics based on actual data
        return {
          totalCompanies: Array.isArray(companies) ? companies.length : 0,
          activeCompanies: Array.isArray(companies) ? companies.filter((c: any) => c.isActive).length : 0,
          totalEstates,
          totalDivisions,
          totalBlocks,
          totalUsers: users.pagination?.total || usersData.length,
          activeUsers: usersData.filter((u: any) => u.status === 'active').length,
          inactiveUsers: usersData.filter((u: any) => u.status === 'inactive').length,
          suspendedUsers: usersData.filter((u: any) => u.status === 'suspended').length,
          superAdmins: usersData.filter((u: any) => normalizeRole(u.role) === 'SUPER_ADMIN').length,
          companyAdmins: usersData.filter((u: any) => normalizeRole(u.role) === 'COMPANY_ADMIN').length,
          areaManagers: usersData.filter((u: any) => normalizeRole(u.role) === 'AREA_MANAGER').length,
          managers: usersData.filter((u: any) => normalizeRole(u.role) === 'MANAGER').length,
          asistens: usersData.filter((u: any) => normalizeRole(u.role) === 'ASISTEN').length,
          mandors: usersData.filter((u: any) => normalizeRole(u.role) === 'MANDOR').length,
          satpams: usersData.filter((u: any) => normalizeRole(u.role) === 'SATPAM').length,
          multiCompanyAreaManagers: usersData.filter((u: any) => 
            normalizeRole(u.role) === 'AREA_MANAGER' && u.assignedCompanies && Array.isArray(u.assignedCompanies) && u.assignedCompanies.length > 1
          ).length,
          multiEstateManagers: usersData.filter((u: any) => 
            normalizeRole(u.role) === 'MANAGER' && u.assignedEstates && Array.isArray(u.assignedEstates) && u.assignedEstates.length > 1
          ).length,
          multiDivisionAsistens: usersData.filter((u: any) => 
            normalizeRole(u.role) === 'ASISTEN' && u.assignedDivisions && Array.isArray(u.assignedDivisions) && u.assignedDivisions.length > 1
          ).length,
          orphanedUsers: roleScopingAnalysis.violationCount,
          systemHealth: healthSnapshot?.overall || 'warning',
          systemUptime: normalizeUptimeLabel(healthSnapshot?.uptime) || 'Tidak tersedia',
          databaseStatus: healthSnapshot?.services?.database?.status || 'error',
          redisStatus: healthSnapshot?.services?.redis?.status || 'error',
          wsConnectionStatus: healthSnapshot?.services?.websocket?.status || 'error',
          totalAPIRequests: 0,
          avgResponseTime: healthSnapshot?.services?.api?.avgResponseTime || 0,
          errorRate: healthSnapshot?.services?.api?.errorRate || 0,
          dailyActiveUsers: Math.floor(usersData.length * 0.85),
          weeklyActiveUsers: Math.floor(usersData.length * 0.95),
          monthlyActiveUsers: usersData.length,
          pendingApprovals: 0,
          gateChecksToday: 0,
          harvestRecordsToday: 0,
          trends: {
            users: 0,
            companies: 0,
            activities: 0,
            performance: 0
          },
          lastUpdated: new Date()
        };
      }
    } catch (error) {
      console.error('Failed to get system statistics:', error);
      throw error;
    }
  }

  /**
   * Get multi-assignment analytics
   */
  static async getMultiAssignmentAnalytics(filters?: DashboardFilters): Promise<MultiAssignmentAnalytics> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.companyIds && Array.isArray(filters.companyIds) && filters.companyIds.length > 0) {
        filters.companyIds.forEach(id => params.append('companyIds[]', id));
      }
      if (filters?.roles && Array.isArray(filters.roles) && filters.roles.length > 0) {
        filters.roles.forEach(role => params.append('roles[]', role));
      }

      try {
        const response = await cookieApiClient.get<MultiAssignmentAnalytics>(`/admin/multi-assignment-analytics?${params.toString()}`);
        const data = (response.data || response) as any;
        if (!hasMultiAssignmentPayload(data)) {
          throw new Error('Multi-assignment endpoint returned invalid payload');
        }
        return data as MultiAssignmentAnalytics;
      } catch (adminError) {
        // Fallback: Generate analytics from existing data
        const [companies, users] = await Promise.all([
          this.getAllCompanies(),
          this.getAllUsers({ limit: 100 })
        ]);

        const usersData = Array.isArray(users.data) ? users.data : [];
        const companiesData = Array.isArray(companies) ? companies : [];
        const trackedRoles = ['AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR'];
        const roleScopingAnalysis = analyzeRoleScoping(usersData);

        const getAssignments = (user: User) => [
          ...(Array.isArray(user.assignedCompanies)
            ? user.assignedCompanies.map((id: string) => ({
                type: 'company' as const,
                id,
                name: companiesData.find((c: any) => c.id === id)?.name || id
              }))
            : []),
          ...(Array.isArray(user.assignedEstates)
            ? user.assignedEstates.map((id: string) => ({ type: 'estate' as const, id, name: `Estate ${id}` }))
            : []),
          ...(Array.isArray(user.assignedDivisions)
            ? user.assignedDivisions.map((id: string) => ({ type: 'division' as const, id, name: `Division ${id}` }))
            : [])
        ];
        const getAssignmentCount = (user: User) => getAssignments(user).length;

        const multiAssignedUsers = usersData.filter((user: User) => getAssignmentCount(user) > 1);
        const multiCompanyAreaManagers = usersData.filter(
          (user: User) =>
            normalizeRole(user.role) === 'AREA_MANAGER' &&
            Array.isArray(user.assignedCompanies) &&
            user.assignedCompanies.length > 1
        ).length;
        const multiEstateManagers = usersData.filter(
          (user: User) =>
            normalizeRole(user.role) === 'MANAGER' &&
            Array.isArray(user.assignedEstates) &&
            user.assignedEstates.length > 1
        ).length;
        const multiDivisionAsistens = usersData.filter(
          (user: User) =>
            normalizeRole(user.role) === 'ASISTEN' &&
            Array.isArray(user.assignedDivisions) &&
            user.assignedDivisions.length > 1
        ).length;
        const orphanedUsers = roleScopingAnalysis.violationCount;

        const roleBreakdown = trackedRoles.map((role) => {
          const roleUsers = usersData.filter((user: User) => normalizeRole(user.role) === role);
          const counts = roleUsers.map((user: User) => getAssignmentCount(user));
          const totalAssignments = counts.reduce((sum, value) => sum + value, 0);
          const multiAssigned = counts.filter((value) => value > 1).length;
          const averageAssignments = roleUsers.length > 0 ? Number((totalAssignments / roleUsers.length).toFixed(1)) : 0;
          const maxAssignments = counts.length > 0 ? Math.max(...counts) : 0;
          const efficiency =
            roleUsers.length > 0
              ? Math.max(0, Math.round(100 - (multiAssigned / roleUsers.length) * 25))
              : 100;

          return {
            role,
            total: roleUsers.length,
            multiAssigned,
            averageAssignments,
            maxAssignments,
            efficiency
          };
        });

        const companyAnalysis = companiesData.map((company: Company) => {
          const companyUsers = usersData.filter((user: User) => user.companyId === company.id);
          const areaManagersAssigned = companyUsers.filter((user: User) => normalizeRole(user.role) === 'AREA_MANAGER').length;
          const managersAssigned = companyUsers.filter((user: User) => normalizeRole(user.role) === 'MANAGER').length;
          const assistensAssigned = companyUsers.filter((user: User) => normalizeRole(user.role) === 'ASISTEN').length;
          const totalUsers = companyUsers.length;
          const multiAssignedInCompany = companyUsers.filter((user: User) => getAssignmentCount(user) > 1).length;
          const multiAssignmentRatio = totalUsers > 0 ? Number((multiAssignedInCompany / totalUsers).toFixed(2)) : 0;
          const coverage = totalUsers > 0
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

        const assignmentMatrix = usersData
          .filter((user: User) => trackedRoles.includes(normalizeRole(user.role)))
          .map((user: User) => {
            const assignments = getAssignments(user);
            const normalizedRole = normalizeRole(user.role);
            const effectiveAssignments = getEffectiveAssignments(normalizedRole, assignments);
            const workload = Math.min(100, effectiveAssignments * 30);
            const performance = Math.max(50, 100 - Math.round(workload * 0.4));
            const roleScopingIssues = getRoleScopingIssues(user);
            const recommendations = roleScopingIssues.length > 0
              ? roleScopingIssues
              : effectiveAssignments === 0
              ? ['Assignment level is within normal role scope']
              : effectiveAssignments > 2
              ? ['Redistribute workload', 'Review assignment overlap']
              : effectiveAssignments === 1
              ? ['Capacity available for additional assignment']
              : ['Assignment distribution is balanced'];

            return {
              userId: user.id,
              userName: user.username || user.name,
              role: normalizedRole,
              assignments,
              workload,
              performance,
              recommendations
            };
          });

        const overloadedUsers = assignmentMatrix.filter((item) => item.workload >= 80).length;
        const underutilizedUsers = assignmentMatrix.filter((item) => item.workload > 0 && item.workload <= 30).length;
        const overloadedUserNames = assignmentMatrix
          .filter((item) => item.workload >= 80)
          .map((item) => item.userName);
        const underutilizedUserNames = assignmentMatrix
          .filter((item) => item.workload > 0 && item.workload <= 30)
          .map((item) => item.userName);
        const orphanedUserNames = usersData
          .filter((user: User) => getRoleScopingIssues(user).length > 0)
          .map((user: User) => user.username || user.name);
        const hotspots: MultiAssignmentAnalytics['hotspots'] = [];
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
          const violationSummary = formatRoleViolationSummary(roleScopingAnalysis.violationsByRole);
          hotspots.push({
            type: 'orphaned',
            severity: 'high',
            title: 'Unscoped users detected',
            description: violationSummary
              ? `Users violating role scope rules found (${violationSummary})`
              : 'Users violating role scope rules found',
            affectedUsers: orphanedUsers,
            affectedUserNames: orphanedUserNames,
            recommendations: buildRoleScopingRecommendations(roleScopingAnalysis.violationsByRole)
          });
        }

        const efficiencyScore =
          roleBreakdown.length > 0
            ? Number((roleBreakdown.reduce((sum, row) => sum + row.efficiency, 0) / roleBreakdown.length).toFixed(1))
            : 0;
        const coverageScore =
          companyAnalysis.length > 0
            ? Number((companyAnalysis.reduce((sum, row) => sum + row.coverage, 0) / companyAnalysis.length * 100).toFixed(1))
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
      }
    } catch (error) {
      console.error('Failed to get multi-assignment analytics:', error);
      throw error;
    }
  }

  /**
   * Get recent system activities
   */
  static async getSystemActivities(
    page = 1, 
    limit = 20, 
    filters?: { types?: string[]; severities?: string[]; dateRange?: { from: Date; to: Date } }
  ): Promise<{
    data: SystemActivity[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (filters?.types && Array.isArray(filters.types) && filters.types.length > 0) {
        filters.types.forEach(type => params.append('types[]', type));
      }
      if (filters?.severities && Array.isArray(filters.severities) && filters.severities.length > 0) {
        filters.severities.forEach(severity => params.append('severities[]', severity));
      }
      if (filters?.dateRange) {
        params.append('from', filters.dateRange.from.toISOString());
        params.append('to', filters.dateRange.to.toISOString());
      }

      try {
        type ActivitiesResponse = { data: SystemActivity[]; pagination: { page: number; limit: number; total: number; pages: number } };
        const response = await cookieApiClient.get<ActivitiesResponse>(`/admin/system-activities?${params.toString()}`);
        const data = (response.data || response) as any;
        if (!Array.isArray(data?.data)) {
          throw new Error('System activities endpoint returned invalid payload');
        }
        return {
          data: data.data.map((activity: any) => ({
            ...activity,
            timestamp: new Date(activity.timestamp)
          })),
          pagination: data.pagination
        };
      } catch (adminError) {
        // Fallback: Generate mock activities
        const mockActivities: SystemActivity[] = [
          {
            id: '1',
            type: 'user_created',
            title: 'Pengguna baru terdaftar: John Doe (Manager)',
            description: 'Pengguna berhasil didaftarkan ke Operasi Estate',
            severity: 'success',
            timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
            metadata: { userId: 'user_123', role: 'manager' }
          },
          {
            id: '2',
            type: 'assignment_updated',
            title: 'Multi-penugasan diperbarui: Area Manager ditugaskan ke 3 perusahaan',
            description: 'Optimasi penugasan selesai',
            severity: 'info',
            timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
            metadata: { assignmentType: 'multi_company' }
          },
          {
            id: '3',
            type: 'performance_alert',
            title: 'Peringatan kinerja sistem teratasi',
            description: 'Optimasi database berhasil diselesaikan',
            severity: 'warning',
            timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
            metadata: { alertType: 'performance' }
          },
          {
            id: '4',
            type: 'company_created',
            title: 'Perusahaan baru terdaftar: PT Sawit Makmur',
            description: 'Setup lengkap dengan 5 estate dan 12 divisi',
            severity: 'success',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
            metadata: { companyId: 'company_456', estates: 5, divisions: 12 }
          }
        ];

        return {
          data: mockActivities,
          pagination: { page: 1, limit: 10, total: mockActivities.length, pages: 1 }
        };
      }
    } catch (error) {
      console.error('Failed to get system activities:', error);
      throw error;
    }
  }

  /**
   * Global search across all entities
   */
  static async globalSearch(
    query: string, 
    types?: ('user' | 'company' | 'estate' | 'division' | 'block')[],
    limit = 50
  ): Promise<GlobalSearchResult[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('limit', limit.toString());
    
    if (types && Array.isArray(types) && types.length > 0) {
      types.forEach(type => params.append('types[]', type));
    }

    const response = await cookieApiClient.get<GlobalSearchResult[]>(`/admin/global-search?${params.toString()}`);
    return (response.data || response) as GlobalSearchResult[];
  }

  /**
   * Get all companies for super admin
   */
  static async getAllCompanies(): Promise<Company[]> {
    try {
      const result = await apolloClient.query({
        query: GET_COMPANIES,
        variables: { page: 1, limit: 100 },
        fetchPolicy: 'network-only'
      });

      const companyContainer = (result.data as any)?.companies;
      const rawCompanies = Array.isArray(companyContainer?.data)
        ? companyContainer.data
        : Array.isArray(companyContainer)
        ? companyContainer
        : [];

      return rawCompanies.map((company: any): Company => ({
        id: company.id,
        code: company.code || '',
        name: company.name || '',
        description: company.description || undefined,
        isActive: company.isActive ?? normalizeRole(company.status) === 'ACTIVE',
        createdAt: toDate(company.createdAt),
        updatedAt: toDate(company.updatedAt),
        createdBy: company.createdBy || undefined,
        updatedBy: company.updatedBy || undefined
      }));
    } catch (error) {
      console.error('Failed to get companies via GraphQL:', error);
      return [];
    }
  }

  /**
   * Get all users across all companies
   */
  static async getAllUsers(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    companyId?: string;
    assignmentType?: string;
  }): Promise<{
    data: User[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    try {
      const limit = Math.min(filters?.limit || 100, 100);
      const page = filters?.page || 1;
      const offset = (page - 1) * limit;

      const result = await apolloClient.query({
        query: GET_USERS,
        variables: {
          companyId: filters?.companyId && filters.companyId !== 'all' ? filters.companyId : undefined,
          role: filters?.role && filters.role !== 'all' ? filters.role : undefined,
          isActive: filters?.status === 'active' ? true : filters?.status === 'inactive' ? false : undefined,
          search: filters?.search || undefined,
          limit,
          offset
        },
        fetchPolicy: 'network-only'
      });

      const usersContainer = (result.data as any)?.users;
      const rawUsers = Array.isArray(usersContainer?.users)
        ? usersContainer.users
        : [];
      const totalCount = usersContainer?.totalCount || rawUsers.length;

      const mappedUsers: User[] = rawUsers
        .map((user: any): User => ({
          id: user.id,
          email: user.email || '',
          username: user.username || undefined,
          name: user.name || user.username || user.email || 'Unknown User',
          role: toSafeRole(user.role),
          avatar: user.avatar || undefined,
          company: user.company?.name || undefined,
          companyId: user.companyId || undefined,
          permissions: [],
          createdAt: toDate(user.createdAt),
          phoneNumber: user.phoneNumber || undefined,
          status: normalizeUserStatus(undefined, user.isActive),
          assignedEstates: Array.isArray(user.estates) ? user.estates.map((e: any) => e.id) : undefined,
          assignedEstateNames: Array.isArray(user.estates) ? user.estates.map((e: any) => e.name) : undefined,
          assignedDivisions: Array.isArray(user.divisions) ? user.divisions.map((d: any) => d.id) : undefined,
          assignedDivisionNames: Array.isArray(user.divisions) ? user.divisions.map((d: any) => d.name) : undefined,
          assignedCompanies: Array.isArray(user.companies) ? user.companies.map((c: any) => c.id) : undefined,
          assignedCompanyNames: Array.isArray(user.companies) ? user.companies.map((c: any) => c.name) : undefined,
        }));

      const totalPages = Math.max(1, Math.ceil(totalCount / limit));
      return {
        data: mappedUsers,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: totalPages
        }
      };
    } catch (error) {
      console.error('Failed to get users via GraphQL:', error);
      return {
        data: [],
        pagination: { page: filters?.page || 1, limit: Math.min(filters?.limit || 100, 100), total: 0, pages: 0 }
      };
    }
  }

  /**
   * Get system health status
   */
  static async getSystemHealth(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    services: {
      database: { status: 'connected' | 'disconnected' | 'error'; responseTime?: number };
      redis: { status: 'connected' | 'disconnected' | 'error'; responseTime?: number };
      websocket: { status: 'connected' | 'disconnected' | 'error'; activeConnections?: number };
      api: { status: 'healthy' | 'warning' | 'critical'; avgResponseTime: number; errorRate: number };
    };
    uptime: string;
    lastCheck: Date;
  }> {
    const response = await cookieApiClient.get<any>('/admin/system-health');
    const data = (response.data || response) as any;
    return {
      ...data,
      lastCheck: new Date(data.lastCheck)
    };
  }

  /**
   * Optimize user assignments
   */
  static async optimizeAssignments(options?: {
    balanceWorkload?: boolean;
    minimizeOverlaps?: boolean;
    maxAssignmentsPerUser?: number;
    dryRun?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    changes: Array<{
      userId: string;
      userName: string;
      currentAssignments: number;
      suggestedAssignments: number;
      recommendations: string[];
    }>;
    dryRun: boolean;
  }> {
    type OptimizeResponse = { success: boolean; message: string; changes: Array<{ userId: string; userName: string; currentAssignments: number; suggestedAssignments: number; recommendations: string[] }>; dryRun: boolean };
    const response = await cookieApiClient.post<OptimizeResponse>('/admin/optimize-assignments', options || {});
    return (response.data || response) as OptimizeResponse;
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<{
    apiRequests: { timestamp: Date; count: number; avgResponseTime: number }[];
    errorRates: { timestamp: Date; rate: number }[];
    activeUsers: { timestamp: Date; count: number }[];
    systemLoad: { timestamp: Date; cpu: number; memory: number }[];
  }> {
    const response = await cookieApiClient.get<any>(`/admin/performance-metrics?timeRange=${timeRange}`);
    const data = (response.data || response) as any;
    return {
      ...data,
      apiRequests: data.apiRequests.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      })),
      errorRates: data.errorRates.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      })),
      activeUsers: data.activeUsers.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      })),
      systemLoad: data.systemLoad.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }))
    };
  }

  /**
   * Export system data
   */
  static async exportData(
    type: 'users' | 'companies' | 'statistics' | 'activities' | 'assignments',
    format: 'csv' | 'xlsx' | 'json' = 'csv',
    filters?: Record<string, any>
  ): Promise<{ downloadUrl: string; fileName: string }> {
    const params = new URLSearchParams();
    params.append('format', format);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(`${key}[]`, v));
        } else if (value !== null && value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    type ExportResponse = { downloadUrl: string; fileName: string };
    const response = await cookieApiClient.post<ExportResponse>(`/admin/export/${type}?${params.toString()}`, {});
    return (response.data || response) as ExportResponse;
  }

  /**
   * Trigger system maintenance tasks
   */
  static async triggerMaintenance(
    tasks: ('cleanup_logs' | 'optimize_db' | 'clear_cache' | 'update_statistics')[]
  ): Promise<{
    success: boolean;
    message: string;
    taskResults: Array<{
      task: string;
      success: boolean;
      message: string;
      duration: number;
    }>;
  }> {
    type MaintenanceResponse = { success: boolean; message: string; taskResults: Array<{ task: string; success: boolean; message: string; duration: number }> };
    const response = await cookieApiClient.post<MaintenanceResponse>('/admin/maintenance', { tasks });
    return (response.data || response) as MaintenanceResponse;
  }

  /**
   * Get audit log
   */
  static async getAuditLog(
    page = 1,
    limit = 20,
    filters?: {
      userId?: string;
      action?: string;
      entityType?: string;
      entityId?: string;
      dateRange?: { from: Date; to: Date };
    }
  ): Promise<{
    data: Array<{
      id: string;
      userId: string;
      userName: string;
      action: string;
      entityType: string;
      entityId: string;
      entityName?: string;
      changes?: Record<string, any>;
      metadata?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      timestamp: Date;
    }>;
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.entityType) params.append('entityType', filters.entityType);
    if (filters?.entityId) params.append('entityId', filters.entityId);
    if (filters?.dateRange) {
      params.append('from', filters.dateRange.from.toISOString());
      params.append('to', filters.dateRange.to.toISOString());
    }

    const response = await cookieApiClient.get<any>(`/admin/audit-log?${params.toString()}`);
    const result = (response.data || response) as any;
    return {
      data: result.data.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      })),
      pagination: result.pagination
    };
  }
}

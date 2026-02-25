import { ALL_COMPANIES_SCOPE } from '@/contexts/company-scope-context';

export type RoleScopedAssignments = {
  divisions?: Array<{
    id?: string;
    estateId?: string;
  }>;
  estates?: Array<{
    id?: string;
    companyId?: string;
  }>;
};

export type HarvestRoleScope = {
  mandorId?: string;
  allowedDivisionIds?: Set<string>;
};

export const normalizeRole = (role?: string): string =>
  (role || '').toString().trim().toUpperCase();

export const toDateBoundaryISO = (
  dateValue: string,
  boundary: 'start' | 'end'
): string | undefined => {
  const raw = (dateValue || '').trim();
  if (!raw) return undefined;

  const timePart = boundary === 'start' ? '00:00:00.000' : '23:59:59.999';
  const parsed = new Date(`${raw}T${timePart}`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

export const buildHarvestDateVariables = (
  dateFrom?: string,
  dateTo?: string
): { dateFrom?: string; dateTo?: string } => {
  const variables: { dateFrom?: string; dateTo?: string } = {};
  const normalizedDateFrom = toDateBoundaryISO(dateFrom || '', 'start');
  const normalizedDateTo = toDateBoundaryISO(dateTo || '', 'end');

  if (normalizedDateFrom) variables.dateFrom = normalizedDateFrom;
  if (normalizedDateTo) variables.dateTo = normalizedDateTo;

  return variables;
};

export const buildHarvestRoleScope = ({
  role,
  currentUserId,
  selectedCompanyId,
  assignments,
}: {
  role: string;
  currentUserId?: string;
  selectedCompanyId?: string;
  assignments?: RoleScopedAssignments;
}): HarvestRoleScope => {
  const normalizedRole = normalizeRole(role);
  const scope: HarvestRoleScope = {};

  if (normalizedRole === 'MANDOR') {
    const mandorId = (currentUserId || '').trim();
    if (mandorId) scope.mandorId = mandorId;
    return scope;
  }

  const divisions = assignments?.divisions || [];
  const estates = assignments?.estates || [];
  if (divisions.length === 0) {
    return scope;
  }

  const divisionIds = new Set<string>();
  const estateToCompanyMap = new Map<string, string>();

  for (const estate of estates) {
    const estateId = (estate?.id || '').trim();
    const companyId = (estate?.companyId || '').trim();
    if (!estateId || !companyId) continue;
    estateToCompanyMap.set(estateId, companyId);
  }

  for (const division of divisions) {
    const divisionId = (division?.id || '').trim();
    if (!divisionId) continue;
    divisionIds.add(divisionId);
  }

  if (normalizedRole === 'AREA_MANAGER') {
    const companyScope = (selectedCompanyId || '').trim();
    if (companyScope && companyScope !== ALL_COMPANIES_SCOPE) {
      const scopedDivisionIds = new Set<string>();
      for (const division of divisions) {
        const divisionId = (division?.id || '').trim();
        const estateId = (division?.estateId || '').trim();
        if (!divisionId || !estateId) continue;
        const companyId = estateToCompanyMap.get(estateId);
        if (companyId === companyScope) {
          scopedDivisionIds.add(divisionId);
        }
      }
      if (scopedDivisionIds.size > 0) {
        scope.allowedDivisionIds = scopedDivisionIds;
      }
      return scope;
    }

    scope.allowedDivisionIds = divisionIds;
    return scope;
  }

  if (normalizedRole === 'MANAGER' || normalizedRole === 'ASISTEN') {
    scope.allowedDivisionIds = divisionIds;
  }

  return scope;
};

export const isHarvestRecordInScope = (
  record: any,
  scope: HarvestRoleScope
): boolean => {
  if (scope.mandorId) {
    const recordMandorId = (
      record?.mandor?.id ??
      record?.mandorId ??
      record?.mandor_id ??
      ''
    )
      .toString()
      .trim();

    if (!recordMandorId || recordMandorId !== scope.mandorId) {
      return false;
    }
  }

  if (scope.allowedDivisionIds && scope.allowedDivisionIds.size > 0) {
    const divisionId = (
      record?.block?.division?.id ??
      record?.divisionId ??
      record?.division_id ??
      ''
    )
      .toString()
      .trim();
    if (!divisionId || !scope.allowedDivisionIds.has(divisionId)) {
      return false;
    }
  }

  return true;
};

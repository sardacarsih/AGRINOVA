import {
  buildHarvestDateVariables,
  buildHarvestRoleScope,
  isHarvestRecordInScope,
} from '@/features/harvest/utils/harvest-query-params';

describe('harvest-query-params', () => {
  it('builds ISO date boundaries from date range input', () => {
    const variables = buildHarvestDateVariables('2026-02-01', '2026-02-28');
    expect(variables.dateFrom).toContain('2026-02-01');
    expect(variables.dateTo).toContain('2026-02-28');
  });

  it('enforces mandor scope by current user id', () => {
    const scope = buildHarvestRoleScope({
      role: 'MANDOR',
      currentUserId: 'mandor-1',
    });

    expect(scope.mandorId).toBe('mandor-1');
    expect(
      isHarvestRecordInScope(
        { mandor: { id: 'mandor-1' }, block: { division: { id: 'div-1' } } },
        scope
      )
    ).toBe(true);
    expect(
      isHarvestRecordInScope(
        { mandor: { id: 'mandor-2' }, block: { division: { id: 'div-1' } } },
        scope
      )
    ).toBe(false);
  });

  it('builds area manager scope from selected company and assignments', () => {
    const scope = buildHarvestRoleScope({
      role: 'AREA_MANAGER',
      selectedCompanyId: 'company-2',
      assignments: {
        estates: [
          { id: 'estate-1', companyId: 'company-1' },
          { id: 'estate-2', companyId: 'company-2' },
        ],
        divisions: [
          { id: 'div-1', estateId: 'estate-1' },
          { id: 'div-2', estateId: 'estate-2' },
        ],
      },
    });

    expect(scope.allowedDivisionIds?.has('div-2')).toBe(true);
    expect(scope.allowedDivisionIds?.has('div-1')).toBe(false);
  });
});

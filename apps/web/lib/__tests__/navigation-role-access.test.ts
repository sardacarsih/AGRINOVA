import { canRoleAccessPath } from '@/lib/constants/navigation';

describe('Role navigation access', () => {
  it('allows AREA_MANAGER to access harvest dashboard route', () => {
    expect(canRoleAccessPath('AREA_MANAGER', '/harvest')).toBe(true);
    expect(canRoleAccessPath('AREA_MANAGER', '/harvest/history')).toBe(false);
  });

  it('keeps MANAGER harvest dashboard route access unchanged', () => {
    expect(canRoleAccessPath('MANAGER', '/harvest')).toBe(true);
    expect(canRoleAccessPath('MANAGER', '/harvest/history')).toBe(false);
  });

  it('does not grant harvest access to SATPAM', () => {
    expect(canRoleAccessPath('SATPAM', '/harvest')).toBe(false);
  });
});

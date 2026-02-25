import { canRoleAccessPath } from '@/lib/constants/navigation';

describe('Role navigation access', () => {
  it('allows AREA_MANAGER to access harvest routes', () => {
    expect(canRoleAccessPath('AREA_MANAGER', '/harvest')).toBe(true);
    expect(canRoleAccessPath('AREA_MANAGER', '/harvest/history')).toBe(true);
  });

  it('keeps MANAGER harvest route access unchanged', () => {
    expect(canRoleAccessPath('MANAGER', '/harvest')).toBe(true);
    expect(canRoleAccessPath('MANAGER', '/harvest/history')).toBe(true);
  });

  it('does not grant harvest access to SATPAM', () => {
    expect(canRoleAccessPath('SATPAM', '/harvest')).toBe(false);
  });
});

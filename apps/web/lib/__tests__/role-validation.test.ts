import {
    UserRole,
    isValidUserRole,
    toStandardRole,
    toStandardRoleStrict,
    getAllValidRoles,
    getRoleLevel,
    canRoleAccessRole,
    getManageableRoles,
    getRoleMetadata,
} from '@/types/user';

describe('Role Validation Functions', () => {
    describe('isValidUserRole', () => {
        it('should return true for valid roles', () => {
            const validRoles: string[] = [
                'SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER',
                'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM',
                'TIMBANGAN', 'GRADING'
            ];

            validRoles.forEach(role => {
                expect(isValidUserRole(role)).toBe(true);
            });
        });

        it('should return false for invalid roles', () => {
            const invalidRoles = [
                'INVALID_ROLE', '', 'admin', 'super_admin',
                'USER', 'GUEST', 'LEGACY_ROLE', null, undefined
            ];

            invalidRoles.forEach(role => {
                expect(isValidUserRole(role as any)).toBe(false);
            });
        });
    });

    describe('toStandardRole', () => {
        it('should convert valid role strings to UserRole', () => {
            const validRoles: { input: string; expected: UserRole }[] = [
                { input: 'SUPER_ADMIN', expected: 'SUPER_ADMIN' },
                { input: 'COMPANY_ADMIN', expected: 'COMPANY_ADMIN' },
                { input: 'MANAGER', expected: 'MANAGER' },
                { input: 'TIMBANGAN', expected: 'TIMBANGAN' },
                { input: 'GRADING', expected: 'GRADING' },
            ];

            validRoles.forEach(({ input, expected }) => {
                expect(toStandardRole(input)).toBe(expected);
            });
        });

        it('should throw error for invalid role strings', () => {
            const invalidRoles = ['INVALID_ROLE', 'admin', '', 'LEGACY_ROLE'];

            invalidRoles.forEach(role => {
                expect(() => toStandardRole(role)).toThrow('Invalid user role');
            });
        });
    });

    describe('getAllValidRoles', () => {
        it('should return all valid UserRole values', () => {
            const roles = getAllValidRoles();
            const expectedRoles: UserRole[] = [
                'SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER',
                'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM',
                'TIMBANGAN', 'GRADING'
            ];

            expect(roles).toEqual(expectedRoles);
            expect(roles).toHaveLength(9);
        });
    });

    describe('getRoleLevel', () => {
        it('should return correct hierarchy levels', () => {
            expect(getRoleLevel('SUPER_ADMIN')).toBe(1);
            expect(getRoleLevel('COMPANY_ADMIN')).toBe(2);
            expect(getRoleLevel('AREA_MANAGER')).toBe(3);
            expect(getRoleLevel('MANAGER')).toBe(4);
            expect(getRoleLevel('ASISTEN')).toBe(5);
            expect(getRoleLevel('MANDOR')).toBe(6);
            expect(getRoleLevel('SATPAM')).toBe(7);
            expect(getRoleLevel('TIMBANGAN')).toBe(8);
            expect(getRoleLevel('GRADING')).toBe(9);
        });
    });

    describe('canRoleAccessRole', () => {
        it('should allow higher roles to access lower roles', () => {
            expect(canRoleAccessRole('SUPER_ADMIN', 'COMPANY_ADMIN')).toBe(true);
            expect(canRoleAccessRole('COMPANY_ADMIN', 'MANAGER')).toBe(true);
            expect(canRoleAccessRole('MANAGER', 'ASISTEN')).toBe(true);
            expect(canRoleAccessRole('ASISTEN', 'MANDOR')).toBe(true);
        });

        it('should allow same level role access', () => {
            expect(canRoleAccessRole('MANAGER', 'MANAGER')).toBe(true);
            expect(canRoleAccessRole('ASISTEN', 'ASISTEN')).toBe(true);
            expect(canRoleAccessRole('TIMBANGAN', 'TIMBANGAN')).toBe(true);
        });

        it('should prevent lower roles from accessing higher roles', () => {
            expect(canRoleAccessRole('MANDOR', 'MANAGER')).toBe(false);
            expect(canRoleAccessRole('ASISTEN', 'COMPANY_ADMIN')).toBe(false);
            expect(canRoleAccessRole('GRADING', 'SUPER_ADMIN')).toBe(false);
        });
    });

    describe('getManageableRoles', () => {
        it('should return all roles for SUPER_ADMIN', () => {
            const manageable = getManageableRoles('SUPER_ADMIN');
            expect(manageable).toHaveLength(9);
            expect(manageable).toContain('SUPER_ADMIN');
        });

        it('should return all roles except SUPER_ADMIN for COMPANY_ADMIN', () => {
            const manageable = getManageableRoles('COMPANY_ADMIN');
            expect(manageable).toHaveLength(8);
            expect(manageable).not.toContain('SUPER_ADMIN');
        });

        it('should return only self role for non-admin roles', () => {
            expect(getManageableRoles('MANAGER')).toEqual(['MANAGER']);
            expect(getManageableRoles('ASISTEN')).toEqual(['ASISTEN']);
            expect(getManageableRoles('MANDOR')).toEqual(['MANDOR']);
            expect(getManageableRoles('TIMBANGAN')).toEqual(['TIMBANGAN']);
            expect(getManageableRoles('GRADING')).toEqual(['GRADING']);
        });
    });

    describe('getRoleMetadata', () => {
        it('should return correct metadata for SUPER_ADMIN', () => {
            const metadata = getRoleMetadata('SUPER_ADMIN');
            expect(metadata.role).toBe('SUPER_ADMIN');
            expect(metadata.level).toBe(1);
            expect(metadata.name).toBe('Super Administrator');
            expect(metadata.hasWebAccess).toBe(true);
            expect(metadata.hasMobileAccess).toBe(false);
        });

        it('should return correct metadata for MANDOR', () => {
            const metadata = getRoleMetadata('MANDOR');
            expect(metadata.role).toBe('MANDOR');
            expect(metadata.level).toBe(6);
            expect(metadata.name).toBe('Supervisor');
            expect(metadata.hasWebAccess).toBe(false);
            expect(metadata.hasMobileAccess).toBe(true);
        });

        it('should return correct metadata for TIMBANGAN', () => {
            const metadata = getRoleMetadata('TIMBANGAN');
            expect(metadata.role).toBe('TIMBANGAN');
            expect(metadata.level).toBe(8);
            expect(metadata.name).toBe('Weighing Operator');
            expect(metadata.hasWebAccess).toBe(false);
            expect(metadata.hasMobileAccess).toBe(true);
        });

        it('should return correct metadata for GRADING', () => {
            const metadata = getRoleMetadata('GRADING');
            expect(metadata.role).toBe('GRADING');
            expect(metadata.level).toBe(9);
            expect(metadata.name).toBe('Grading Staff');
            expect(metadata.hasWebAccess).toBe(false);
            expect(metadata.hasMobileAccess).toBe(true);
        });

        it('should return correct metadata for all roles', () => {
            const allRoles = getAllValidRoles();
            allRoles.forEach(role => {
                const metadata = getRoleMetadata(role);
                expect(metadata.role).toBe(role);
                expect(metadata.level).toBeGreaterThan(0);
                expect(metadata.level).toBeLessThan(10);
                expect(typeof metadata.name).toBe('string');
                expect(typeof metadata.description).toBe('string');
                expect(typeof metadata.hasWebAccess).toBe('boolean');
                expect(typeof metadata.hasMobileAccess).toBe('boolean');
            });
        });
    });
});

describe('Role Type Guards', () => {
    describe('UserRole type safety', () => {
        it('should enforce UserRole type constraints', () => {
            const validRole: UserRole = 'MANAGER';
            const assignRole: UserRole = validRole; // Should compile without error

            expect(assignRole).toBe('MANAGER');
        });
    });
});

describe('Integration with Role Constants', () => {
    it('should be compatible with constants/roles utilities', () => {
        const {
            getSupportedRoles,
            isRoleSupported,
            getRoleLabel,
            hasWebAccess,
            hasMobileAccess
        } = require('@/lib/constants/roles');

        const supportedRoles = getSupportedRoles();
        expect(supportedRoles).toEqual(getAllValidRoles());

        supportedRoles.forEach(role => {
            expect(isRoleSupported(role)).toBe(true);
            expect(typeof getRoleLabel(role)).toBe('string');
            expect(typeof hasWebAccess(role)).toBe('boolean');
            expect(typeof hasMobileAccess(role)).toBe('boolean');
        });
    });
});

// Performance tests
describe('Performance Tests', () => {
    it('should validate roles efficiently', () => {
        const start = performance.now();

        for (let i = 0; i < 10000; i++) {
            isValidUserRole('MANAGER');
            toStandardRole('ASISTEN');
        }

        const end = performance.now();
        const duration = end - start;

        // Should complete within reasonable time (adjust threshold as needed)
        expect(duration).toBeLessThan(100); // 100ms for 10k iterations
    });
});

// Edge case tests
describe('Edge Cases', () => {
    it('should handle empty strings gracefully', () => {
        expect(isValidUserRole('')).toBe(false);
    });

    it('should handle null/undefined inputs', () => {
        expect(isValidUserRole(null as any)).toBe(false);
        expect(isValidUserRole(undefined as any)).toBe(false);
    });

    it('should handle mixed case strings', () => {
        expect(isValidUserRole('manager')).toBe(false);
        expect(isValidUserRole('Manager')).toBe(false);
        expect(isValidUserRole('MANAGER')).toBe(true);
    });
});
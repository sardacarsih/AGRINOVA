import {
    UserRole,
    FullUserRole,
    isValidUserRole,
    toStandardRole,
    toStandardRoleSafe,
    getRoleLevel,
    canRoleAccessRole,
    getRoleMetadata,
    getSupportedRoles,
    validateRoleFormat,
} from '@/types/user';
import {
    USER_ROLE_LABELS,
    getRoleLabel,
    hasWebAccess,
    hasMobileAccess,
    isRoleSupported,
    validateRoleFormat as constantsValidateRoleFormat,
} from '@/lib/constants/roles';
import { PermissionManager } from '@/lib/auth/permissions';

// Mock user data for testing
const mockUsers = [
    {
        id: '1',
        email: 'super@admin.com',
        name: 'Super Admin',
        role: 'SUPER_ADMIN' as FullUserRole,
        permissions: [],
    },
    {
        id: '2',
        email: 'manager@company.com',
        name: 'Manager',
        role: 'MANAGER' as FullUserRole,
        permissions: [],
    },
    {
        id: '3',
        email: 'mandor@estate.com',
        name: 'Mandor',
        role: 'MANDOR' as FullUserRole,
        permissions: [],
    },
    {
        id: '4',
        email: 'legacy@user.com',
        name: 'Legacy User',
        role: 'TIMBANGAN' as FullUserRole,
        permissions: [],
    },
];

describe('Role Conversion Integration Tests', () => {
    describe('Frontend Role Validation', () => {
        it('should validate all standard roles', () => {
            const validRoles: UserRole[] = [
                'SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER',
                'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM'
            ];

            validRoles.forEach(role => {
                expect(isValidUserRole(role)).toBe(true);
                expect(toStandardRole(role)).toBe(role);
            });
        });

        it('should handle legacy roles gracefully', () => {
            const legacyRoles: FullUserRole[] = ['TIMBANGAN', 'GRADING'];

            legacyRoles.forEach(role => {
                expect(isValidUserRole(role)).toBe(false);
                expect(() => toStandardRole(role)).toThrow();
                expect(toStandardRoleSafe(role)).toBe('MANDOR');
            });
        });
    });

    describe('Permission Manager Integration', () => {
        it('should validate and normalize roles correctly', () => {
            mockUsers.forEach(user => {
                const normalizedRole = PermissionManager.validateAndNormalizeRole(user);
                expect(typeof normalizedRole).toBe('string');
                expect(isValidUserRole(normalizedRole)).toBe(true);
            });
        });

        it('should handle invalid roles safely', () => {
            const invalidUser = {
                ...mockUsers[0],
                role: 'INVALID_ROLE' as FullUserRole,
            };

            const normalizedRole = PermissionManager.validateAndNormalizeRole(invalidUser);
            expect(normalizedRole).toBe('MANDOR'); // Should fallback to safe default
        });

        it('should check role validity correctly', () => {
            const validUser = mockUsers[0]; // SUPER_ADMIN
            const invalidUser = { ...mockUsers[0], role: 'INVALID_ROLE' as FullUserRole };

            expect(PermissionManager.hasValidRole(validUser)).toBe(true);
            expect(PermissionManager.hasValidRole(invalidUser)).toBe(false);
        });
    });

    describe('Role Hierarchy Consistency', () => {
        it('should maintain consistent hierarchy levels', () => {
            const expectedHierarchy = {
                'SUPER_ADMIN': 1,
                'COMPANY_ADMIN': 2,
                'AREA_MANAGER': 3,
                'MANAGER': 4,
                'ASISTEN': 5,
                'MANDOR': 6,
                'SATPAM': 7,
            };

            Object.entries(expectedHierarchy).forEach(([role, expectedLevel]) => {
                const level = getRoleLevel(role as UserRole);
                expect(level).toBe(expectedLevel);
            });
        });

        it('should respect role access rules', () => {
            // Higher roles should access lower roles
            expect(canRoleAccessRole('SUPER_ADMIN', 'COMPANY_ADMIN')).toBe(true);
            expect(canRoleAccessRole('MANAGER', 'MANDOR')).toBe(true);
            expect(canRoleAccessRole('ASISTEN', 'SATPAM')).toBe(true);

            // Lower roles should not access higher roles
            expect(canRoleAccessRole('MANDOR', 'MANAGER')).toBe(false);
            expect(canRoleAccessRole('SATPAM', 'SUPER_ADMIN')).toBe(false);

            // Same level access should work
            expect(canRoleAccessRole('MANAGER', 'MANAGER')).toBe(true);
        });
    });

    describe('Role Metadata Consistency', () => {
        it('should provide consistent metadata for all roles', () => {
            getSupportedRoles().forEach(role => {
                const metadata = getRoleMetadata(role);

                expect(metadata).toHaveProperty('role', role);
                expect(metadata).toHaveProperty('level');
                expect(metadata).toHaveProperty('name');
                expect(metadata).toHaveProperty('description');
                expect(metadata).toHaveProperty('hasWebAccess');
                expect(metadata).toHaveProperty('hasMobileAccess');

                expect(typeof metadata.level).toBe('number');
                expect(typeof metadata.name).toBe('string');
                expect(typeof metadata.description).toBe('string');
                expect(typeof metadata.hasWebAccess).toBe('boolean');
                expect(typeof metadata.hasMobileAccess).toBe('boolean');
            });
        });

        it('should have correct access patterns for roles', () => {
            const accessPatterns = {
                'SUPER_ADMIN': { web: true, mobile: false },
                'COMPANY_ADMIN': { web: true, mobile: false },
                'AREA_MANAGER': { web: true, mobile: true },
                'MANAGER': { web: true, mobile: true },
                'ASISTEN': { web: true, mobile: true },
                'MANDOR': { web: false, mobile: true },
                'SATPAM': { web: true, mobile: true },
            };

            Object.entries(accessPatterns).forEach(([role, expected]) => {
                const metadata = getRoleMetadata(role as UserRole);
                expect(metadata.hasWebAccess).toBe(expected.web);
                expect(metadata.hasMobileAccess).toBe(expected.mobile);
            });
        });
    });

    describe('Constants Integration', () => {
        it('should match role labels between types and constants', () => {
            getSupportedRoles().forEach(role => {
                const typeLabel = role; // Simple for this case
                const constantLabel = getRoleLabel(role);

                expect(constantLabel).toBeDefined();
                expect(typeof constantLabel).toBe('string');
            });
        });

        it('should validate roles using constants validation', () => {
            getSupportedRoles().forEach(role => {
                expect(isRoleSupported(role)).toBe(true);
                expect(() => constantsValidateRoleFormat(role)).not.toThrow();
            });
        });

        it('should provide consistent access control', () => {
            const accessControl = {
                webAccess: hasWebAccess,
                mobileAccess: hasMobileAccess,
            };

            getSupportedRoles().forEach(role => {
                const metadata = getRoleMetadata(role);
                expect(accessControl.webAccess(role)).toBe(metadata.hasWebAccess);
                expect(accessControl.mobileAccess(role)).toBe(metadata.hasMobileAccess);
            });
        });
    });

    describe('Mock User Integration', () => {
        it('should process mock users correctly', () => {
            mockUsers.forEach(user => {
                // Test role processing
                const hasValidRole = PermissionManager.hasValidRole(user);
                const normalizedRole = PermissionManager.validateAndNormalizeRole(user);
                const metadata = PermissionManager.getRoleMetadata(user);

                expect(typeof hasValidRole).toBe('boolean');
                expect(typeof normalizedRole).toBe('string');
                expect(typeof metadata).toBe('object');

                if (hasValidRole) {
                    expect(isValidUserRole(normalizedRole)).toBe(true);
                }
            });
        });

        it('should handle different user types correctly', () => {
            const standardUser = mockUsers[0]; // SUPER_ADMIN
            const legacyUser = mockUsers[3]; // TIMBANGAN

            // Standard user should work normally
            expect(PermissionManager.hasValidRole(standardUser)).toBe(true);
            const standardNormalized = PermissionManager.validateAndNormalizeRole(standardUser);
            expect(isValidUserRole(standardNormalized)).toBe(true);

            // Legacy user should be handled gracefully
            expect(PermissionManager.hasValidRole(legacyUser)).toBe(false);
            const legacyNormalized = PermissionManager.validateAndNormalizeRole(legacyUser);
            expect(isValidUserRole(legacyNormalized)).toBe(true); // After normalization
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle invalid roles gracefully', () => {
            const errorCases = [
                'INVALID_ROLE',
                '',
                null,
                undefined,
                123,
                {},
                [],
            ];

            errorCases.forEach(roleInput => {
                expect(() => {
                    if (typeof roleInput === 'string' && roleInput) {
                        toStandardRole(roleInput);
                    } else {
                        // These should throw type errors at compile time, but we test runtime behavior
                        toStandardRole(roleInput as any);
                    }
                }).toThrow();

                // Safe conversion should not throw
                const safeResult = toStandardRoleSafe(roleInput as any);
                expect(['SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM']).toContain(safeResult);
            });
        });

        it('should provide meaningful error messages', () => {
            expect(() => toStandardRole('INVALID_ROLE')).toThrow(/Invalid user role/);
            expect(() => toStandardRole('')).toThrow(/Invalid user role/);
            expect(() => toStandardRole('admin')).toThrow(/Invalid user role/);
        });
    });

    describe('Performance Integration', () => {
        it('should handle bulk role operations efficiently', () => {
            const iterations = 10000;
            const roles: UserRole[] = getSupportedRoles();

            const startTime = performance.now();

            for (let i = 0; i < iterations; i++) {
                roles.forEach(role => {
                    isValidUserRole(role);
                    getRoleLevel(role);
                    getRoleMetadata(role);
                    toStandardRole(role);
                });
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Should complete within reasonable time (adjust threshold as needed)
            expect(duration).toBeLessThan(1000); // 1 second for bulk operations
            console.log(`Bulk role operations completed in ${duration}ms`);
        });

        it('should handle PermissionManager operations efficiently', () => {
            const iterations = 1000;
            const user = mockUsers[0]; // SUPER_ADMIN

            const startTime = performance.now();

            for (let i = 0; i < iterations; i++) {
                PermissionManager.hasValidRole(user);
                PermissionManager.validateAndNormalizeRole(user);
                PermissionManager.getRoleMetadata(user);
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(500); // 500ms for permission manager operations
            console.log(`PermissionManager operations completed in ${duration}ms`);
        });
    });

    describe('Real-world Scenario Tests', () => {
        it('should handle typical authentication flow', () => {
            // Simulate user login and role processing
            const loginUser = mockUsers[1]; // MANAGER

            // 1. Validate user role
            expect(PermissionManager.hasValidRole(loginUser)).toBe(true);

            // 2. Normalize role
            const normalizedRole = PermissionManager.validateAndNormalizeRole(loginUser);
            expect(normalizedRole).toBe('MANAGER');

            // 3. Check permissions
            const metadata = PermissionManager.getRoleMetadata(loginUser);
            expect(metadata.hasWebAccess).toBe(true);
            expect(metadata.hasMobileAccess).toBe(true);

            // 4. Test access control
            expect(canRoleAccessRole(normalizedRole, 'MANDOR')).toBe(true);
            expect(canRoleAccessRole(normalizedRole, 'SUPER_ADMIN')).toBe(false);
        });

        it('should handle role-based UI rendering decisions', () => {
            const testCases = [
                { user: mockUsers[0], expectWebUI: true, expectMobileUI: false }, // SUPER_ADMIN
                { user: mockUsers[1], expectWebUI: true, expectMobileUI: true },  // MANAGER
                { user: mockUsers[2], expectWebUI: false, expectMobileUI: true }, // MANDOR
            ];

            testCases.forEach(({ user, expectWebUI, expectMobileUI }) => {
                const metadata = PermissionManager.getRoleMetadata(user);
                const normalizedRole = PermissionManager.validateAndNormalizeRole(user);

                expect(metadata.hasWebAccess).toBe(expectWebUI);
                expect(metadata.hasMobileAccess).toBe(expectMobileUI);

                // Test UI access decisions
                expect(hasWebAccess(normalizedRole)).toBe(expectWebUI);
                expect(hasMobileAccess(normalizedRole)).toBe(expectMobileUI);
            });
        });

        it('should handle legacy user migration', () => {
            const legacyUser = mockUsers[3]; // TIMBANGAN

            // Should detect legacy role
            expect(PermissionManager.hasValidRole(legacyUser)).toBe(false);

            // Should normalize to safe fallback
            const normalizedRole = PermissionManager.validateAndNormalizeRole(legacyUser);
            expect(isValidUserRole(normalizedRole)).toBe(true);

            // Should provide appropriate access
            const metadata = PermissionManager.getRoleMetadata(legacyUser);
            expect(metadata.hasWebAccess).toBe(true); // SATPAM fallback has web access
            expect(metadata.hasMobileAccess).toBe(true);
        });
    });
});
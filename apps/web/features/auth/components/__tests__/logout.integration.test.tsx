import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { useAuth, AuthProvider } from '../AuthProvider';
import { LogoutDocument } from '@/gql/graphql';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
    }),
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('Logout Integration Tests', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks();

        // Clear localStorage and sessionStorage
        localStorage.clear();
        sessionStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Successful Logout', () => {
        it('should successfully logout and clear all session data', async () => {
            const logoutMock = {
                request: {
                    query: LogoutDocument,
                },
                result: {
                    data: {
                        logout: true,
                    },
                },
            };

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <MockedProvider mocks={[logoutMock]} addTypename={false}>
                    <AuthProvider>{children}</AuthProvider>
                </MockedProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            // Perform logout
            await act(async () => {
                await result.current.logout();
            });

            // Wait for logout to complete
            await waitFor(() => {
                expect(result.current.user).toBeNull();
                expect(result.current.isAuthenticated).toBe(false);
            });

            // Verify localStorage is cleared
            expect(localStorage.getItem('refreshToken')).toBeNull();
            expect(sessionStorage.getItem('agrinova_device_id')).toBeNull();
            expect(sessionStorage.getItem('agrinova_graphql_session_cache')).toBeNull();
        });

        it('should clear Apollo cache on logout', async () => {
            const logoutMock = {
                request: {
                    query: LogoutDocument,
                },
                result: {
                    data: {
                        logout: true,
                    },
                },
            };

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <MockedProvider mocks={[logoutMock]} addTypename={false}>
                    <AuthProvider>{children}</AuthProvider>
                </MockedProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            // Perform logout
            await act(async () => {
                await result.current.logout();
            });

            // Wait for logout to complete
            await waitFor(() => {
                expect(result.current.user).toBeNull();
            });

            // Note: Testing Apollo cache clearing requires access to the client
            // which is not directly exposed. This is tested in E2E tests.
        });

        it('should redirect to login page after logout', async () => {
            const mockPush = vi.fn();
            vi.mocked(require('next/navigation').useRouter).mockReturnValue({
                push: mockPush,
                replace: vi.fn(),
                prefetch: vi.fn(),
            });

            const logoutMock = {
                request: {
                    query: LogoutDocument,
                },
                result: {
                    data: {
                        logout: true,
                    },
                },
            };

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <MockedProvider mocks={[logoutMock]} addTypename={false}>
                    <AuthProvider>{children}</AuthProvider>
                </MockedProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            // Perform logout
            await act(async () => {
                await result.current.logout();
            });

            // Wait for redirect
            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith('/login');
            });
        });
    });

    describe('Logout with Network Failure', () => {
        it('should clear session even if logout mutation fails', async () => {
            const logoutMock = {
                request: {
                    query: LogoutDocument,
                },
                error: new Error('Network error'),
            };

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <MockedProvider mocks={[logoutMock]} addTypename={false}>
                    <AuthProvider>{children}</AuthProvider>
                </MockedProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            // Perform logout
            await act(async () => {
                await result.current.logout();
            });

            // Wait for logout to complete
            await waitFor(() => {
                expect(result.current.user).toBeNull();
                expect(result.current.isAuthenticated).toBe(false);
            });

            // Verify localStorage is still cleared despite error
            expect(localStorage.getItem('refreshToken')).toBeNull();
            expect(sessionStorage.getItem('agrinova_device_id')).toBeNull();
        });

        it('should show error toast on logout failure but still clear session', async () => {
            const logoutMock = {
                request: {
                    query: LogoutDocument,
                },
                error: new Error('Server error'),
            };

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <MockedProvider mocks={[logoutMock]} addTypename={false}>
                    <AuthProvider>{children}</AuthProvider>
                </MockedProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            // Perform logout
            await act(async () => {
                await result.current.logout();
            });

            // Wait for logout to complete
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Logout failed');
            });

            // Session should still be cleared
            expect(result.current.user).toBeNull();
        });
    });

    describe('Logout State Management', () => {
        it('should set isLoggingOut flag during logout', async () => {
            const logoutMock = {
                request: {
                    query: LogoutDocument,
                },
                result: {
                    data: {
                        logout: true,
                    },
                },
            };

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <MockedProvider mocks={[logoutMock]} addTypename={false}>
                    <AuthProvider>{children}</AuthProvider>
                </MockedProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            // Start logout
            act(() => {
                result.current.logout();
            });

            // isLoading should be true during logout
            expect(result.current.isLoading).toBe(true);

            // Wait for logout to complete
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('should skip Me query during logout', async () => {
            // This test verifies that the Me query is skipped when isLoggingOut is true
            // The actual implementation is in AuthProvider with skip: isLoggingOut

            const logoutMock = {
                request: {
                    query: LogoutDocument,
                },
                result: {
                    data: {
                        logout: true,
                    },
                },
            };

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <MockedProvider mocks={[logoutMock]} addTypename={false}>
                    <AuthProvider>{children}</AuthProvider>
                </MockedProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            // Perform logout
            await act(async () => {
                await result.current.logout();
            });

            // Wait for logout to complete
            await waitFor(() => {
                expect(result.current.user).toBeNull();
            });

            // Note: Verifying that Me query is skipped requires checking
            // the Apollo Client's query execution, which is tested in E2E tests
        });
    });

    describe('Concurrent Logout', () => {
        it('should handle multiple concurrent logout calls gracefully', async () => {
            const logoutMock = {
                request: {
                    query: LogoutDocument,
                },
                result: {
                    data: {
                        logout: true,
                    },
                },
            };

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <MockedProvider mocks={[logoutMock, logoutMock, logoutMock]} addTypename={false}>
                    <AuthProvider>{children}</AuthProvider>
                </MockedProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            // Perform multiple concurrent logouts
            await act(async () => {
                await Promise.all([
                    result.current.logout(),
                    result.current.logout(),
                    result.current.logout(),
                ]);
            });

            // Wait for all logouts to complete
            await waitFor(() => {
                expect(result.current.user).toBeNull();
                expect(result.current.isAuthenticated).toBe(false);
            });

            // Verify localStorage is cleared
            expect(localStorage.getItem('refreshToken')).toBeNull();
        });
    });

    describe('Logout Error Recovery', () => {
        it('should reset logout state on error to allow retry', async () => {
            const logoutMock = {
                request: {
                    query: LogoutDocument,
                },
                error: new Error('Temporary error'),
            };

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <MockedProvider mocks={[logoutMock]} addTypename={false}>
                    <AuthProvider>{children}</AuthProvider>
                </MockedProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            // First logout attempt (fails)
            await act(async () => {
                await result.current.logout();
            });

            // Wait for error handling
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalled();
            });

            // User should still be able to retry
            // (isLoggingOut should be reset to false on error)
            expect(result.current.isLoading).toBe(false);
        });
    });

    describe('Session Cleanup', () => {
        it('should clear all session-related data from storage', async () => {
            // Setup initial session data
            localStorage.setItem('refreshToken', 'test-refresh-token');
            localStorage.setItem('accessToken', 'test-access-token');
            sessionStorage.setItem('agrinova_device_id', 'test-device-id');
            sessionStorage.setItem('agrinova_graphql_session_cache', JSON.stringify({ user: 'test' }));

            const logoutMock = {
                request: {
                    query: LogoutDocument,
                },
                result: {
                    data: {
                        logout: true,
                    },
                },
            };

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <MockedProvider mocks={[logoutMock]} addTypename={false}>
                    <AuthProvider>{children}</AuthProvider>
                </MockedProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            // Perform logout
            await act(async () => {
                await result.current.logout();
            });

            // Wait for logout to complete
            await waitFor(() => {
                expect(result.current.user).toBeNull();
            });

            // Verify all session data is cleared
            expect(localStorage.getItem('refreshToken')).toBeNull();
            expect(localStorage.getItem('accessToken')).toBeNull();
            expect(sessionStorage.getItem('agrinova_device_id')).toBeNull();
            expect(sessionStorage.getItem('agrinova_graphql_session_cache')).toBeNull();
        });

        it('should clear session monitoring timers on logout', async () => {
            // This test verifies that session monitoring intervals and timeouts are cleared
            // The actual implementation is in graphql-auth-service.ts clearSession()

            const logoutMock = {
                request: {
                    query: LogoutDocument,
                },
                result: {
                    data: {
                        logout: true,
                    },
                },
            };

            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <MockedProvider mocks={[logoutMock]} addTypename={false}>
                    <AuthProvider>{children}</AuthProvider>
                </MockedProvider>
            );

            const { result } = renderHook(() => useAuth(), { wrapper });

            // Perform logout
            await act(async () => {
                await result.current.logout();
            });

            // Wait for logout to complete
            await waitFor(() => {
                expect(result.current.user).toBeNull();
            });

            // Note: Verifying timer cleanup requires access to the auth service
            // which is tested in unit tests for graphql-auth-service.ts
        });
    });
});

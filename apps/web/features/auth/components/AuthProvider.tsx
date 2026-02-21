'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { MeDocument, WebLoginDocument, User, WebLoginInput } from '@/gql/graphql';
import { toast } from 'sonner';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (input: WebLoginInput) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    login: async () => { },
    logout: async () => { },
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

const LOGOUT_MUTATION = gql`
    mutation Logout {
        logout
    }
`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const client = useApolloClient();
    const [user, setUser] = useState<User | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // CRITICAL FIX: Skip Me query during logout AND when logout flag is set in storage
    const shouldSkipMeQuery = isLoggingOut || (
        typeof window !== 'undefined' &&
        (sessionStorage.getItem('agrinova_logout_in_progress') === 'true' ||
            sessionStorage.getItem('agrinova_logged_out') === 'true')
    );

    const { data: meData, loading: meLoading, refetch: refetchMe, error: meError } = useQuery(MeDocument, {
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
        skip: shouldSkipMeQuery, // Skip query during logout
    });

    const [webLogin, { loading: loginLoading }] = useMutation(WebLoginDocument);
    const [logoutMutation, { loading: logoutLoading }] = useMutation(LOGOUT_MUTATION);

    useEffect(() => {
        // CRITICAL FIX: Don't update user if logging out
        if (isLoggingOut) return;

        if (meData?.me) {
            setUser(meData.me as User);
        } else if (meError) {
            setUser(null);
        }
    }, [meData, meError, isLoggingOut]);

    const login = useCallback(async (input: WebLoginInput) => {
        try {
            // Reset logout state if user is logging in
            setIsLoggingOut(false);

            // CRITICAL FIX: Clear logout flags from sessionStorage
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('agrinova_logout_in_progress');
                sessionStorage.removeItem('agrinova_logged_out');
            }

            const { data } = await webLogin({ variables: { input } });

            if (data?.webLogin?.success && data.webLogin.user) {
                setUser(data.webLogin.user as User);
                toast.success(data.webLogin.message || 'Login successful');
                router.push('/');
            } else {
                toast.error(data?.webLogin?.message || 'Login failed');
                throw new Error(data?.webLogin?.message || 'Login failed');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            toast.error(error.message || 'Login failed');
            throw error;
        }
    }, [webLogin, router]);

    const logout = useCallback(async () => {
        try {
            console.log('🚪 [AuthProvider] Starting logout process...');

            // CRITICAL FIX: Set logout flags IMMEDIATELY to prevent Me query
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('agrinova_logout_in_progress', 'true');
                sessionStorage.setItem('agrinova_logged_out', 'true');
            }
            setIsLoggingOut(true);

            // Generate unique logout ID for this logout transaction
            const logoutId = `logout-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            console.log(`📤 [AuthProvider] Calling logout mutation with ID: ${logoutId}...`);

            // CRITICAL FIX: Call logout mutation FIRST (before clearing cookies)
            // The server needs the session cookie to identify which session to invalidate
            try {
                await logoutMutation();
                console.log('✅ [AuthProvider] Logout mutation completed');
            } catch (mutationError) {
                console.warn('⚠️ [AuthProvider] Logout mutation failed, continuing with client-side cleanup:', mutationError);
                // Continue with logout even if mutation fails
            }


            // CRITICAL FIX: Clear cookies client-side AFTER mutation as backup
            // This ensures cookies are cleared even if backend Set-Cookie headers don't reach browser
            if (typeof window !== 'undefined') {
                const cookiesToClear = ['auth-session', 'csrf-token', 'session_token', 'XSRF-TOKEN'];

                // Clear cookies multiple times with different domain variations
                for (let i = 0; i < 3; i++) {
                    cookiesToClear.forEach(cookieName => {
                        // Clear cookie for current domain
                        document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
                        document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax`;
                        document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Strict`;

                        // Also try clearing for parent domain (in case cookies were set with domain attribute)
                        const domain = window.location.hostname;
                        document.cookie = `${cookieName}=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;

                        // Try clearing for parent domain with leading dot
                        if (domain.includes('.')) {
                            const parentDomain = domain.substring(domain.indexOf('.'));
                            document.cookie = `${cookieName}=; path=/; domain=${parentDomain}; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
                        }

                        // Try without domain (browser default)
                        document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
                    });
                }

                console.log('🧹 [AuthProvider] Cleared client-side cookies aggressively');

                // Verify cookies are actually cleared
                const remainingCookies = document.cookie.split(';').map(c => c.trim());
                const authCookiesRemaining = remainingCookies.filter(c =>
                    cookiesToClear.some(name => c.startsWith(name + '='))
                );

                if (authCookiesRemaining.length > 0) {
                    console.warn('⚠️ [AuthProvider] Some auth cookies still present:', authCookiesRemaining);
                } else {
                    console.log('✅ [AuthProvider] All auth cookies verified cleared');
                }
            }

            // Clear user state immediately
            setUser(null);

            // CRITICAL FIX: Clear Apollo cache without refetching active queries
            console.log('🧹 [AuthProvider] Clearing Apollo cache...');
            await client.clearStore();

            // CRITICAL FIX: Clear all storage
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('agrinova_session_cache');
                localStorage.removeItem('agrinova_session_cache');
                // Keep logout flag to prevent auto-login on reload
                console.log('🧹 [AuthProvider] Cleared storage, keeping logout flag');
            }

            // CRITICAL FIX: Add delay to ensure cookies are cleared before redirect
            await new Promise(resolve => setTimeout(resolve, 200));

            console.log('✅ [AuthProvider] Logout complete, redirecting to login...');
            router.push('/login');

            // Clear logout_in_progress flag after redirect
            setTimeout(() => {
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('agrinova_logout_in_progress');
                }
            }, 500);

        } catch (error: any) {
            console.error('❌ [AuthProvider] Logout error:', error);
            toast.error('Logout failed');
            // Reset logout state on error so user can try again
            setIsLoggingOut(false);
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('agrinova_logout_in_progress');
            }
        }
    }, [logoutMutation, router, client]);

    const isLoading = meLoading || loginLoading || logoutLoading;
    // CRITICAL FIX: isAuthenticated must be false immediately when logout starts
    const isAuthenticated = !isLoggingOut && !!user;

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}


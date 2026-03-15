'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, AuthSession } from '@/types/auth';
import { GraphQLOnlyAuthService } from '@/lib/auth/graphql-only-auth-service';
import { UpdateUserProfileInput, ChangePasswordInput } from '@/lib/apollo/queries/auth';
import { useApolloClient } from '@apollo/client/react';

const LOGOUT_IN_PROGRESS_KEY = 'agrinova_logout_in_progress';
const LOGOUT_MARKER_KEY = 'agrinova_logged_out';
const LOGOUT_RECENT_TS_KEY = 'agrinova_logged_out_at';
const LOGOUT_MARKER_TTL_MS = 15_000;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (authSession: AuthSession) => void;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  updateUserProfile: (input: UpdateUserProfileInput) => Promise<{ success: boolean; user?: User; message: string }>;
  changePassword: (input: ChangePasswordInput) => Promise<{ success: boolean; message: string }>;
  logoutAllDevices: () => Promise<{ success: boolean; message: string }>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: () => {},
  logout: async () => {},
  updateProfile: async () => {},
  updateUserProfile: async () => ({ success: false, message: 'Not implemented' }),
  changePassword: async () => ({ success: false, message: 'Not implemented' }),
  logoutAllDevices: async () => ({ success: false, message: 'Not implemented' }),
  refreshSession: async () => false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to normalize user data to match the full User type
const normalizeUser = (userData: any): User => ({
  ...userData,
  companyId:
    userData.companyId ||
    userData.company?.id ||
    userData.companies?.[0]?.id ||
    userData.assignedCompanies?.[0] ||
    userData.companyAdminFor?.[0],
  company:
    typeof userData.company === 'string'
      ? userData.company
      : (userData.company?.name || userData.companies?.[0]?.name || userData.assignedCompanyNames?.[0]),
  permissions: userData.permissions || [],
  createdAt: userData.createdAt || new Date(),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const apolloClient = useApolloClient();

  // Initialize GraphQL-only auth service
  const [graphQLAuthService] = useState(() => {
    const service = new GraphQLOnlyAuthService(apolloClient);
    return service;
  });

  // Check if current route is public (no authentication required)
  const isPublicRoute = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const pathname = window.location.pathname;
    const publicRoutes = ['/login', '/change-password', '/forgot-password', '/reset-password'];
    return publicRoutes.some(route => pathname.startsWith(route));
  }, []);

  // Simplified session restoration using pure GraphQL authentication
  const restoreSessionFromGraphQL = useCallback(async () => {
    try {
      // Skip authentication checks on public routes (like login page)
      if (isPublicRoute()) {
        return null;
      }

      // Step 1: Check for existing cached session first (fast path)
      const currentSession = graphQLAuthService.getCurrentSession();
      if (currentSession?.user && currentSession.expiresAt > new Date()) {
        return currentSession.user;
      }

      // Step 2: For web authentication, check cookies via GraphQL API (no localStorage)
      if (typeof window !== 'undefined') {
        // Make API call to validate session and get user data using cookies only
        try {
          const isAuthenticated = await graphQLAuthService.checkAuth();
          if (isAuthenticated) {
            const validatedSession = graphQLAuthService.getCurrentSession();
            if (validatedSession?.user) {
              return validatedSession.user;
            }
          }
        } catch (apiError) {
          console.warn('Ã¢Å¡Â Ã¯Â¸Â [AuthProvider] Cookie session validation failed:', apiError.message);
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error('Ã¢ÂÅ’ [AuthProvider] Session restoration error:', {
        message: error.message,
        name: error.name
      });
      return null;
    }
  }, [isPublicRoute, graphQLAuthService]);

  // CRITICAL FIX: Enhanced initialization with improved session restoration
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      // Prevent accessing window during SSR
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      setIsMounted(true);

      try {
        // Clean up legacy tokens and JWT-related storage
        localStorage.removeItem('agrinova_auth');
        localStorage.removeItem('agrinova_access_token');
        localStorage.removeItem('agrinova_refresh_token');
        localStorage.removeItem('agrinova_session');
        localStorage.removeItem('refreshToken'); // Clean up remaining legacy storage
        sessionStorage.removeItem('agrinova_jwt_access');
        sessionStorage.removeItem(LOGOUT_IN_PROGRESS_KEY);

        // SIMPLIFIED: Direct session validation via cookies (no complex caching logic)
        const restoredUser = await restoreSessionFromGraphQL();

        if (restoredUser) {
          setUser(normalizeUser(restoredUser));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Ã¢ÂÅ’ [AuthProvider] Initialization error:', {
          message: error.message,
          name: error.name
        });
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Cleanup on unmount
    return () => {
      graphQLAuthService.destroy();
    };
  }, []); // Run only once on mount

  // Method to authenticate users (performs GraphQL API call)
  const authenticate = useCallback(async (loginData: { email: string; password: string; rememberMe?: boolean }) => {
    try {
      const response = await graphQLAuthService.login({
        email: loginData.email,
        password: loginData.password,
        rememberMe: loginData.rememberMe ?? false
      });

      if (response.success && response.data?.user) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(LOGOUT_IN_PROGRESS_KEY);
          sessionStorage.removeItem(LOGOUT_MARKER_KEY);
          sessionStorage.removeItem(LOGOUT_RECENT_TS_KEY);
        }

        // Preserve role data as-is from backend (already in correct UPPERCASE format)
        const normalizedUser = {
          ...response.data.user,
          role: response.data.user.role
        };

        setUser(normalizedUser);
        return { ...response, data: { ...response.data, user: normalizedUser } };
      }

      throw new Error(response.message);
    } catch (error) {
      console.error('Ã¢ÂÅ’ Error during GraphQL-only login:', error);
      throw error;
    }
  }, [graphQLAuthService]);

  // Method to set user state after successful authentication (matches interface)
  const login = useCallback((authSession: AuthSession) => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(LOGOUT_IN_PROGRESS_KEY);
      sessionStorage.removeItem(LOGOUT_MARKER_KEY);
      sessionStorage.removeItem(LOGOUT_RECENT_TS_KEY);
    }

    setUser(normalizeUser(authSession.user));
  }, []);

  const logout = useCallback(async () => {
    let logoutFailure: Error | null = null;

    if (typeof window !== 'undefined') {
      const now = Date.now().toString();
      sessionStorage.setItem(LOGOUT_IN_PROGRESS_KEY, 'true');
      sessionStorage.setItem(LOGOUT_MARKER_KEY, 'true');
      sessionStorage.setItem(LOGOUT_RECENT_TS_KEY, now);
    }

    // Immediately clear user state so protected pages unmount before any 401 responses come back.
    setUser(null);

    try {
      const result = await graphQLAuthService.logout();
      if (!result.success) {
        logoutFailure = new Error(result.message || 'Logout server gagal');
      }
    } catch (error) {
      console.error('Error during GraphQL logout:', error);
      logoutFailure = error instanceof Error ? error : new Error('Logout gagal');
    } finally {
      try {
        await apolloClient.clearStore();
      } catch (clearError) {
        console.warn('Failed to clear Apollo store:', clearError);
      }

      setUser(null);

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(LOGOUT_IN_PROGRESS_KEY);
        window.setTimeout(() => {
          sessionStorage.removeItem(LOGOUT_MARKER_KEY);
        }, LOGOUT_MARKER_TTL_MS);
      }
    }

    if (logoutFailure) {
      throw logoutFailure;
    }
  }, [graphQLAuthService, apolloClient]);

  const updateProfile = useCallback(async (userData: Partial<User>) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      // For now, we'll just update the local state since we don't have a specific GraphQL mutation for this
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);

      // Also update the session in the auth service
      const currentSession = graphQLAuthService.getCurrentSession();
      if (currentSession) {
        graphQLAuthService.updateCurrentSession({
          ...currentSession,
          user: updatedUser as any
        });
      }
    } catch (error: any) {
      console.error('Ã¢ÂÅ’ Error updating profile:', error);
      throw new Error(error.message || 'Gagal memperbarui profil');
    }
  }, [user, graphQLAuthService]);

  const updateUserProfile = useCallback(async (input: UpdateUserProfileInput): Promise<{ success: boolean; user?: User; message: string }> => {
    try {
      const result = await graphQLAuthService.updateProfile(input);
      if (result.success && result.user) {
        const userData = result.user as unknown as Partial<User>;
        const sessionUser = graphQLAuthService.getCurrentSession()?.user as unknown as Partial<User> | undefined;

        const normalizedUser = normalizeUser({
          ...(user ?? {}),
          ...(sessionUser ?? {}),
          ...userData,
          permissions:
            userData.permissions ||
            sessionUser?.permissions ||
            user?.permissions ||
            [],
          createdAt:
            userData.createdAt ||
            sessionUser?.createdAt ||
            user?.createdAt ||
            new Date(),
        }) as User;

        setUser(normalizedUser);
        return { ...result, user: normalizedUser };
      }
      return result as unknown as { success: boolean; user?: User; message: string };
    } catch (error: any) {
      console.error('Ã¢ÂÅ’ Error updating user profile:', error);
      return {
        success: false,
        message: error.message || 'Gagal memperbarui profil'
      };
    }
  }, [graphQLAuthService, user]);

  const changePassword = useCallback(async (input: ChangePasswordInput): Promise<{ success: boolean; message: string }> => {
    try {
      return await graphQLAuthService.changePassword(input);
    } catch (error: any) {
      console.error('Ã¢ÂÅ’ Error changing password:', error);
      return {
        success: false,
        message: error.message || 'Gagal mengubah password'
      };
    }
  }, [graphQLAuthService]);

  const logoutAllDevices = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await graphQLAuthService.logoutAllDevices();
      if (result.success) {
        setUser(null);
      }
      return result;
    } catch (error: any) {
      console.error('Ã¢ÂÅ’ Error logging out from all devices:', error);
      return {
        success: false,
        message: error.message || 'Gagal logout dari semua perangkat'
      };
    }
  }, [graphQLAuthService]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      // Always validate via API so assignment/company scope changes are reflected.
      const isAuthenticated = await graphQLAuthService.checkAuth(true);

      if (isAuthenticated) {
        const newSession = graphQLAuthService.getCurrentSession();
        if (newSession?.user) {
          setUser(normalizeUser(newSession.user));
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Ã¢ÂÅ’ Error refreshing GraphQL session:', error);
      return false;
    }
  }, [graphQLAuthService]);

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        updateProfile,
        updateUserProfile,
        changePassword,
        logoutAllDevices,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

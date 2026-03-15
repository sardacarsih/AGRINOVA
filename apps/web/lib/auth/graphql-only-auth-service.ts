import { ApolloClient } from '@apollo/client/core';
import {
  WEB_LOGIN_MUTATION,
  LOGOUT_MUTATION,
  LOGOUT_ALL_DEVICES_MUTATION,
  CURRENT_USER_QUERY,
  ME_QUERY,
  UPDATE_PROFILE_MUTATION,
  CHANGE_PASSWORD_MUTATION,
  MANAGEABLE_ROLES_QUERY,
  type WebLoginInput,
  type WebLoginPayload,
  type User,
  type UpdateUserProfileInput,
  type ChangePasswordInput
} from '@/lib/apollo/queries/auth';
import { LoginFormData, LoginResponse, AuthSession, UserRole } from '@/types/auth';
import { ROLE_PERMISSIONS } from '@/types/auth';
import { disconnectWebSocket } from '@/lib/apollo/websocket';

export interface GraphQLAuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  isAuthenticated: boolean;
}

// Login attempt tracking (client-side)
let loginAttempts: Record<string, { count: number; lastAttempt: Date; isLocked: boolean }> = {};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export class GraphQLOnlyAuthService {
  private currentSession: GraphQLAuthSession | null = null;
  private sessionCheckInterval?: NodeJS.Timeout;
  private refreshTokenTimeout?: NodeJS.Timeout;
  private apolloClient: ApolloClient<any> | null = null;

  constructor(apolloClient: ApolloClient<any>) {
    this.apolloClient = apolloClient;
  }

  private extractErrorMessage(error: any, fallback: string): string {
    const graphQLErrorMessage =
      error?.graphQLErrors?.[0]?.message ||
      error?.networkError?.result?.errors?.[0]?.message;

    if (typeof graphQLErrorMessage === 'string' && graphQLErrorMessage.trim()) {
      return graphQLErrorMessage;
    }

    if (typeof error?.message === 'string' && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }

  private enrichUserWithCompanyContext(user: any, assignmentCompanies?: Array<{ id: string; name: string }>): any {
    const primaryCompany =
      user?.company ||
      user?.companies?.[0] ||
      assignmentCompanies?.[0] ||
      null;

    const companyNames = assignmentCompanies?.map((c) => c.name) || [];
    const companyIDs = assignmentCompanies?.map((c) => c.id) || [];

    return {
      ...user,
      companyId: user?.companyId || primaryCompany?.id || user?.companyAdminFor?.[0],
      company: typeof user?.company === 'string' ? user.company : (primaryCompany?.name || undefined),
      assignedCompanies: user?.assignedCompanies || companyIDs,
      assignedCompanyNames: user?.assignedCompanyNames || companyNames,
    };
  }

  // Set Apollo client after initialization
  setApolloClient(client: ApolloClient<any>) {
    this.apolloClient = client;
  }

  // Check if user is locked out (client-side)
  private checkLockout(email: string): { isLocked: boolean; remainingTime?: number } {
    const userAttempts = loginAttempts[email];

    if (!userAttempts || userAttempts.count < MAX_LOGIN_ATTEMPTS) {
      return { isLocked: false };
    }

    const timeSinceLastAttempt = Date.now() - userAttempts.lastAttempt.getTime();

    if (timeSinceLastAttempt >= LOCKOUT_DURATION) {
      // Lockout period expired, reset attempts
      loginAttempts[email] = { count: 0, lastAttempt: new Date(), isLocked: false };
      return { isLocked: false };
    }

    const remainingTime = Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 60000);
    return { isLocked: true, remainingTime };
  }

  // Increment failed login attempts
  private incrementFailedAttempts(email: string): void {
    const userAttempts = loginAttempts[email] || { count: 0, lastAttempt: new Date(), isLocked: false };

    loginAttempts[email] = {
      count: userAttempts.count + 1,
      lastAttempt: new Date(),
      isLocked: userAttempts.count + 1 >= MAX_LOGIN_ATTEMPTS,
    };
  }

  // Reset login attempts on successful login
  private resetLoginAttempts(email: string): void {
    delete loginAttempts[email];
  }

  // GraphQL-based login
  async login(data: LoginFormData): Promise<LoginResponse> {
    try {
      const { email, password, rememberMe } = data;

      // Check client-side lockout
      const lockoutCheck = this.checkLockout(email);
      if (lockoutCheck.isLocked) {
        return {
          success: false,
          message: `Akun terkunci. Coba lagi dalam ${lockoutCheck.remainingTime} menit.`,
          errors: {
            email: [`Terlalu banyak percobaan login. Coba lagi dalam ${lockoutCheck.remainingTime} menit.`],
          },
        };
      }

      if (!this.apolloClient) {
        throw new Error('Apollo Client not initialized');
      }

      // Prepare login input for GraphQL (WebLogin uses simpler input)
      const webLoginInput: WebLoginInput = {
        identifier: email, // Can be username or email
        password,
      };

      // Execute GraphQL webLogin mutation
      const result = await this.apolloClient.mutate({
        mutation: WEB_LOGIN_MUTATION,
        variables: { input: webLoginInput }
      });

      if (result.data && result.data.webLogin) {
        // Reset login attempts on successful login
        this.resetLoginAttempts(email);

        const webLoginPayload: WebLoginPayload = result.data.webLogin;

        if (!webLoginPayload.success) {
          throw new Error(webLoginPayload.message || 'Login failed');
        }
        if (!webLoginPayload.user) {
          throw new Error(webLoginPayload.message || 'Login failed');
        }

        // Prevent cross-account stale UI data when users switch accounts
        // without a clean logout flow.
        await this.apolloClient.clearStore().catch((clearError) => {
          console.warn('[GraphQLOnlyAuthService] Failed to clear Apollo store after login:', clearError);
        });

        // Keep role in original format from backend (SUPER_ADMIN)
        const normalizedUser = this.enrichUserWithCompanyContext({
          ...webLoginPayload.user,
          role: webLoginPayload.user.role as UserRole
        });

        // Create GraphQL-based auth session (for WebLogin, tokens are handled via cookies)
        const graphQLSession: GraphQLAuthSession = {
          user: {
            ...normalizedUser,
            lastLogin: new Date(),
            permissions: ROLE_PERMISSIONS[normalizedUser.role] || [],
            createdAt: (normalizedUser as any).createdAt || new Date(),
          } as any,
          accessToken: '', // Not provided in webLogin - handled via cookies
          refreshToken: '', // Not provided in webLogin - handled via cookies
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to 24 hours
          refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days
          isAuthenticated: true,
        };

        // Store current session
        this.currentSession = graphQLSession;

        // Cache session for fast page reload recovery
        this.cacheSessionToStorage(graphQLSession);

        // Start session monitoring
        this.startSessionMonitoring();

        // Schedule token refresh (for webLogin this would check cookies)
        this.scheduleTokenRefresh();

        const userName = normalizedUser?.name || normalizedUser?.username || 'User';
        const userRole = normalizedUser?.role || 'user';

        return {
          success: true,
          message: webLoginPayload.message || `Selamat datang, ${userName}! Login sebagai ${userRole}.`,
          data: {
            user: graphQLSession.user,
            accessToken: '', // WebLogin uses cookies, not explicit tokens
            refreshToken: '', // WebLogin uses cookies, not explicit tokens
            expiresAt: graphQLSession.expiresAt,
          } as unknown as AuthSession,
        };
      }

      this.incrementFailedAttempts(email);

      return {
        success: false,
        message: 'Login gagal. Periksa username/email dan password Anda.',
      };
    } catch (error: any) {
      console.error('[GraphQLOnlyAuthService] Login error:', error);

      // Increment failed attempts on error
      this.incrementFailedAttempts(data.email);

      // Handle GraphQL errors
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        const graphqlError = error.graphQLErrors[0];
        return {
          success: false,
          message: graphqlError.message || 'Login gagal.',
          errors: graphqlError.extensions?.validation || undefined,
        };
      }

      // Handle network errors
      if (error.networkError) {
        return {
          success: false,
          message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
        };
      }

      return {
        success: false,
        message: error.message || 'Login gagal. Silakan coba lagi.',
      };
    }
  }

  // GraphQL-based logout
  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.apolloClient) {
        throw new Error('Apollo Client not initialized');
      }

      // Call GraphQL logout mutation
      const result = await this.apolloClient.mutate({
        mutation: LOGOUT_MUTATION
      });

      if (result?.data?.logout !== true) {
        throw new Error('Server logout did not complete');
      }

      // Clear tokens and session
      this.clearSession();

      return {
        success: true,
        message: 'Logout berhasil.',
      };
    } catch (error: any) {
      console.warn('[GraphQLOnlyAuthService] Logout API error, but clearing session anyway:', error);

      // Even if API call fails, clear local session for security
      this.clearSession();

      return {
        success: false,
        message: this.extractErrorMessage(
          error,
          'Sesi lokal ditutup, tetapi logout server gagal. Silakan login ulang.'
        ),
      };
    }
  }

  // Clear session and tokens
  private clearSession(): void {
    this.currentSession = null;

    // Clear stored tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('agrinova_device_id');
      this.clearSessionCache();

      // Clear additional auth-related storage
      localStorage.removeItem('agrinova_auth');
      localStorage.removeItem('agrinova_access_token');
      localStorage.removeItem('agrinova_refresh_token');
      localStorage.removeItem('agrinova_session');
      sessionStorage.removeItem('agrinova_jwt_access');

      // Clear Apollo cache to prevent stale data on re-login
      if (this.apolloClient) {
        this.apolloClient.clearStore().catch(err => {
          console.warn('[GraphQLOnlyAuthService] Failed to clear Apollo store:', err);
        });
      }

      // Disconnect WebSocket explicitly
      disconnectWebSocket();

      // Notify other components about logout via event
      try {
        const event = new CustomEvent('auth:logout', {
          detail: { reason: 'logout', timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.warn('Failed to dispatch logout event:', error);
      }
    }

    // Clear timers
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = undefined;
    }

    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = undefined;
    }
  }

  // Get current session
  getCurrentSession(): GraphQLAuthSession | null {
    return this.currentSession;
  }

  // Update current session (for AuthProvider integration)
  updateCurrentSession(session: GraphQLAuthSession): void {
    // Preserve role format from backend (UPPERCASE) - frontend now expects uppercase too
    const normalizedSession = {
      ...session,
      user: {
        ...session.user,
        role: session.user.role as UserRole
      }
    };

    this.currentSession = normalizedSession;
  }

  // Check authentication status
  async checkAuth(forceNetwork = false): Promise<boolean> {
    try {
      // Step 1: Check for valid cached session first (fast path)
      if (!forceNetwork && this.currentSession?.isAuthenticated && this.currentSession.expiresAt > new Date()) {
        return true;
      }

      // Step 2: Try to restore from sessionStorage cache (immediate page reload recovery)
      if (!forceNetwork && typeof window !== 'undefined' && !this.currentSession) {
        const cachedSession = this.restoreSessionFromStorage();
        if (cachedSession) {
          return true;
        }
      }

      if (!this.apolloClient) {
        throw new Error('Apollo Client not initialized');
      }

      // Step 3: For web authentication, validate directly with GraphQL API using cookies
      // Cookie-based auth doesn't need localStorage tokens
      try {
        const currentUserResult = await this.apolloClient.query({
          query: CURRENT_USER_QUERY,
          fetchPolicy: 'network-only', // Always fetch from network to validate auth
          errorPolicy: 'all'
        });

        const currentUserPayload = currentUserResult?.data?.currentUser;
        const currentUserData = currentUserPayload?.user;
        const assignmentCompanies = currentUserPayload?.assignments?.companies as Array<{ id: string; name: string }> | undefined;

        if (currentUserPayload?.success && currentUserData) {
          // Create session from user data + assignment context.
          const user = currentUserData;
          // Preserve role format from backend (UPPERCASE)
          const normalizedUser = this.enrichUserWithCompanyContext({
            ...user,
            role: user.role as UserRole
          }, assignmentCompanies);

          this.currentSession = {
            user: {
              ...normalizedUser,
              lastLogin: new Date(),
              permissions: ROLE_PERMISSIONS[normalizedUser.role] || []
            },
            accessToken: '', // Not used for cookie-based auth
            refreshToken: '', // Not used for cookie-based auth
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours for web
            refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            isAuthenticated: true,
          };

          this.cacheSessionToStorage(this.currentSession);
          this.startSessionMonitoring();
          return true;
        }

        // Fallback to ME_QUERY for compatibility if currentUser payload is unavailable.
        const meResult = await this.apolloClient.query({
          query: ME_QUERY,
          fetchPolicy: 'network-only',
          errorPolicy: 'all'
        });
        if (meResult.data && meResult.data.me) {
          const user = meResult.data.me;
          const normalizedUser = this.enrichUserWithCompanyContext({
            ...user,
            role: user.role as UserRole
          });

          this.currentSession = {
            user: {
              ...normalizedUser,
              lastLogin: new Date(),
              permissions: ROLE_PERMISSIONS[normalizedUser.role] || []
            },
            accessToken: '',
            refreshToken: '',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            isAuthenticated: true,
          };

          this.cacheSessionToStorage(this.currentSession);
          this.startSessionMonitoring();
          return true;
        }

      } catch (apiError: any) {
        console.error('[GraphQLOnlyAuthService] API validation failed:', apiError);
        // Check if it's an authentication error
        if (apiError.graphQLErrors && apiError.graphQLErrors.length > 0) {
          const graphQLError = apiError.graphQLErrors[0];
          if (graphQLError.message.includes('session not found') ||
            graphQLError.message.includes('unauthorized') ||
            graphQLError.message.includes('no token found')) {
            this.clearSession();
            return false;
          }
        }

        // For other errors, we might be offline, so keep cached session if available
        if (this.currentSession?.isAuthenticated) {
          return true;
        }

        this.clearSession();
        return false;
      }

      return false;
    } catch (error: any) {
      console.error('[GraphQLOnlyAuthService] Error checking authentication:', error);
      this.clearSession();
      return false;
    }
  }

  // Store tokens securely
  private storeTokens(authPayload: { accessToken: string; refreshToken: string }): void {
    if (typeof window !== 'undefined') {
      // Store refresh token in localStorage (longer term)
      localStorage.setItem('refreshToken', authPayload.refreshToken);
      // Access token is managed by Apollo Client automatically
    }
  }

  // Get stored tokens
  private getStoredTokens(): { accessToken: string; refreshToken: string } {
    if (typeof window === 'undefined') {
      return { accessToken: '', refreshToken: '' };
    }

    const accessToken = localStorage.getItem('accessToken') || '';
    const refreshToken = localStorage.getItem('refreshToken') || '';

    return { accessToken, refreshToken };
  }

  // Generate device ID for web platform
  private generateDeviceId(): string {
    if (typeof window !== 'undefined') {
      let deviceId = sessionStorage.getItem('agrinova_device_id');
      if (!deviceId) {
        deviceId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('agrinova_device_id', deviceId);
      }
      return deviceId;
    }
    return `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cache session to storage for fast page reload recovery
  private cacheSessionToStorage(session: GraphQLAuthSession): void {
    try {
      if (typeof window !== 'undefined') {
        const sessionData = {
          user: session.user,
          expiresAt: session.expiresAt.toISOString(),
          refreshExpiresAt: session.refreshExpiresAt.toISOString(),
          isAuthenticated: session.isAuthenticated,
          cachedAt: new Date().toISOString(),
        };
        sessionStorage.setItem('agrinova_graphql_session_cache', JSON.stringify(sessionData));
      }
    } catch (error) {
      console.warn('[GraphQLOnlyAuthService] Failed to cache session:', error);
    }
  }

  // Restore session from storage cache
  private restoreSessionFromStorage(): GraphQLAuthSession | null {
    try {
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem('agrinova_graphql_session_cache');
        if (cached) {
          const sessionData = JSON.parse(cached);
          const expiresAt = new Date(sessionData.expiresAt);
          const cachedAt = new Date(sessionData.cachedAt);
          const cacheAge = Date.now() - cachedAt.getTime();

          // Use cache if it's less than 5 minutes old and not expired
          if (cacheAge < 5 * 60 * 1000 && expiresAt > new Date()) {
            const storedTokens = this.getStoredTokens();
            if (storedTokens.accessToken && storedTokens.refreshToken) {
              // MIGRATION FIX: Convert any legacy lowercase roles to uppercase
              // This handles cached sessions from before the fix
              const legacyRole = sessionData.user.role;
              const normalizedRole = legacyRole ?
                (legacyRole.toString().toUpperCase() as UserRole) :
                undefined;

              const normalizedUser = {
                ...sessionData.user,
                role: normalizedRole
              };

              this.currentSession = {
                user: normalizedUser,
                accessToken: storedTokens.accessToken,
                refreshToken: storedTokens.refreshToken,
                expiresAt: expiresAt,
                refreshExpiresAt: new Date(sessionData.refreshExpiresAt),
                isAuthenticated: sessionData.isAuthenticated,
              };

              return this.currentSession;
            }
          } else {
            this.clearSessionCache();
          }
        }
      }
    } catch (error) {
      console.warn('[GraphQLOnlyAuthService] Failed to restore session from cache:', error);
      this.clearSessionCache();
    }
    return null;
  }

  // Clear session cache
  private clearSessionCache(): void {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('agrinova_graphql_session_cache');
      }
    } catch (error) {
      console.warn('[GraphQLOnlyAuthService] Failed to clear session cache:', error);
    }
  }

  // Schedule token refresh
  private scheduleTokenRefresh(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }

    if (this.currentSession) {
      const now = Date.now();
      const expiresAt = this.currentSession.expiresAt.getTime();
      const timeUntilExpiry = expiresAt - now;

      // Refresh 2 minutes before expiry (13 minutes for 15-minute tokens)
      const refreshTime = Math.max(timeUntilExpiry - 2 * 60 * 1000, 30 * 1000); // Minimum 30 seconds

      this.refreshTokenTimeout = setTimeout(async () => {
        await this.refreshTokenSilently();
      }, refreshTime);
    }
  }

  // Refresh token silently - For cookie-based auth, validate session via currentUser, fallback to me.
  private async refreshTokenSilently(): Promise<void> {
    try {
      if (!this.apolloClient) {
        throw new Error('Apollo Client not initialized');
      }

      // For cookie-based auth, we don't use refresh tokens.
      const currentUserResult = await this.apolloClient.query({
        query: CURRENT_USER_QUERY,
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
      });

      const currentUserPayload = currentUserResult?.data?.currentUser;
      const currentUserData = currentUserPayload?.user;
      const assignmentCompanies = currentUserPayload?.assignments?.companies as Array<{ id: string; name: string }> | undefined;

      if (currentUserPayload?.success && currentUserData) {
        // Session is still valid, update session data
        if (this.currentSession) {
          const refreshedUser = this.enrichUserWithCompanyContext({
            ...currentUserData,
            role: currentUserData.role as UserRole,
          }, assignmentCompanies);
          this.currentSession.user = {
            ...this.currentSession.user,
            ...refreshedUser,
            permissions: ROLE_PERMISSIONS[refreshedUser.role] || this.currentSession.user.permissions || [],
          } as any;
          this.currentSession.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
          this.cacheSessionToStorage(this.currentSession);
          this.scheduleTokenRefresh();
        }
        return;
      }

      // Backward-compatible fallback.
      const meResult = await this.apolloClient.query({
        query: ME_QUERY,
        fetchPolicy: 'network-only'
      });

      if (meResult.data && meResult.data.me) {
        if (this.currentSession) {
          const refreshedUser = this.enrichUserWithCompanyContext({
            ...meResult.data.me,
            role: meResult.data.me.role as UserRole,
          });
          this.currentSession.user = {
            ...this.currentSession.user,
            ...refreshedUser,
            permissions: ROLE_PERMISSIONS[refreshedUser.role] || this.currentSession.user.permissions || [],
          } as any;
          this.currentSession.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
          this.cacheSessionToStorage(this.currentSession);
          this.scheduleTokenRefresh();
        }
        return;
      }

      throw new Error('Session expired');
    } catch (error) {
      console.error('[GraphQLOnlyAuthService] Session validation failed:', error);
      this.clearSession();
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  // Start session monitoring
  private startSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    // Check session every 5 minutes
    this.sessionCheckInterval = setInterval(async () => {
      if (this.currentSession && this.currentSession.expiresAt <= new Date()) {
        await this.refreshTokenSilently();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Update user profile
  async updateProfile(input: UpdateUserProfileInput): Promise<{ success: boolean; user?: User; message: string }> {
    try {
      if (!this.apolloClient) {
        throw new Error('Apollo Client not initialized');
      }

      console.log('[GraphQLOnlyAuthService] Updating user profile:', input.id);

      const result = await this.apolloClient.mutate({
        mutation: UPDATE_PROFILE_MUTATION,
        variables: { input }
      });

      const updateResponse = result.data?.updateUser;
      if (updateResponse) {
        if (!updateResponse.success || !updateResponse.user) {
          return {
            success: false,
            message: updateResponse.message || 'Gagal memperbarui profil'
          };
        }

        const updatedUser = updateResponse.user as User;

        // Update current session with new user data
        if (this.currentSession) {
          // Preserve role format from backend (UPPERCASE)
          const normalizedUpdatedUser = {
            ...updatedUser,
            role: (updatedUser.role || this.currentSession.user.role) as UserRole
          };
          this.currentSession.user = {
            ...this.currentSession.user,
            ...normalizedUpdatedUser,
            permissions: ROLE_PERMISSIONS[normalizedUpdatedUser.role] || []
          };
          this.cacheSessionToStorage(this.currentSession);
        }

        return {
          success: true,
          user: updatedUser,
          message: updateResponse.message || 'Profil berhasil diperbarui'
        };
      }

      throw new Error('No data returned from update mutation');
    } catch (error: any) {
      console.error('[GraphQLOnlyAuthService] Profile update error:', error);

      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        return {
          success: false,
          message: error.graphQLErrors[0].message || 'Gagal memperbarui profil'
        };
      }

      return {
        success: false,
        message: error.message || 'Gagal memperbarui profil'
      };
    }
  }

  // Change user password
  async changePassword(input: ChangePasswordInput): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.apolloClient) {
        throw new Error('Apollo Client not initialized');
      }

      console.log('[GraphQLOnlyAuthService] Changing user password');

      const result = await this.apolloClient.mutate({
        mutation: CHANGE_PASSWORD_MUTATION,
        variables: { input }
      });

      if (result.data && result.data.changePassword) {
        // If user chose to logout from other devices, we might need to handle session updates
        if (input.logoutOtherDevices) {
          console.log('[GraphQLOnlyAuthService] Password changed with logout from other devices');
        }

        return {
          success: true,
          message: 'Password berhasil diubah'
        };
      }

      throw new Error('Password change failed');
    } catch (error: any) {
      console.error('[GraphQLOnlyAuthService] Password change error:', error);

      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        const graphqlError = error.graphQLErrors[0];
        return {
          success: false,
          message: graphqlError.message || 'Gagal mengubah password'
        };
      }

      return {
        success: false,
        message: error.message || 'Gagal mengubah password'
      };
    }
  }

  // Logout from all devices
  async logoutAllDevices(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.apolloClient) {
        throw new Error('Apollo Client not initialized');
      }

      console.log('[GraphQLOnlyAuthService] Logging out from all devices');

      const result = await this.apolloClient.mutate({
        mutation: LOGOUT_ALL_DEVICES_MUTATION
      });

      if (result?.data?.logoutAllDevices !== true) {
        throw new Error('Server failed to revoke all active sessions');
      }

      // Clear local session
      this.clearSession();

      return {
        success: true,
        message: 'Berhasil logout dari semua perangkat'
      };
    } catch (error: any) {
      console.error('[GraphQLOnlyAuthService] Logout all devices error:', error);

      return {
        success: false,
        message: this.extractErrorMessage(
          error,
          'Gagal logout dari semua perangkat. Silakan coba lagi.'
        ),
      };
    }
  }

  // Get manageable roles
  async getManageableRoles(): Promise<{ success: boolean; roles?: string[]; message?: string }> {
    try {
      if (!this.apolloClient) {
        throw new Error('Apollo Client not initialized');
      }

      console.log('[GraphQLOnlyAuthService] Fetching manageable roles');

      const result = await this.apolloClient.query({
        query: MANAGEABLE_ROLES_QUERY,
        fetchPolicy: 'network-only'
      });

      if (result.data && result.data.manageableRoles) {
        return {
          success: true,
          roles: result.data.manageableRoles
        };
      }

      return {
        success: false,
        message: 'Failed to fetch manageable roles'
      };
    } catch (error: any) {
      console.error('[GraphQLOnlyAuthService] Get manageable roles error:', error);

      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        const graphqlError = error.graphQLErrors[0];
        return {
          success: false,
          message: graphqlError.message || 'Gagal memuat peran yang dapat dikelola'
        };
      }

      return {
        success: false,
        message: error.message || 'Gagal memuat peran yang dapat dikelola'
      };
    }
  }

  // Clean up on component unmount
  destroy(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = undefined;
    }

    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = undefined;
    }
  }
}

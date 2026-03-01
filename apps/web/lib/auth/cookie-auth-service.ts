import cookieApiClient, { ApiResponse, CookieLoginResponse } from '@/lib/api/cookie-client';
import { LoginFormData, User, AuthSession, LoginResponse, UserRole } from '@/types/auth';

export interface CookieAuthSession {
  user: User;
  expiresAt: Date;
  isAuthenticated: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  passwordConfirmation: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phoneNumber?: string;
  position?: string;
  avatar?: string;
  notes?: string;
}

// Login attempt tracking (client-side)
let loginAttempts: Record<string, { count: number; lastAttempt: Date; isLocked: boolean }> = {};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

class CookieAuthService {
  private currentSession: CookieAuthSession | null = null;
  private sessionCheckInterval?: NodeJS.Timeout;

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

  // Check if valid session cookies exist
  private hasValidSessionCookie(): boolean {
    if (typeof document === 'undefined') return false;
    const cookies = document.cookie;
    // Check for known session cookie names used across legacy/new auth flows.
    return cookies.includes('auth_token') ||
           cookies.includes('session_id') ||
           cookies.includes('sessionId') ||
           cookies.includes('session_token') ||
           cookies.includes('auth-session');
  }

  private async verifyServerSessionAfterLogin(maxAttempts = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const authenticated = await cookieApiClient.checkAuth();
        if (authenticated) {
          return true;
        }
      } catch (error) {
        console.warn(`⚠️ [CookieAuthService] Post-login session check failed (attempt ${attempt}/${maxAttempts}):`, error);
      }

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 200));
      }
    }

    return false;
  }

  // Cookie-based login
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

      // Validate email/username parameter
      if (!email || email.trim() === '') {
        console.error('❌ [CookieAuthService] Missing or empty email/username parameter');
        return {
          success: false,
          message: 'Username atau email harus diisi.',
        };
      }

      // Make API call to cookie-based login endpoint
      const response = await cookieApiClient.login({
        username: email.trim(),
        password,
        rememberMe,
        platform: 'WEB',
      });

      if (response.success && response.data) {
        // Prevent false-positive login states when cookies/session are not yet active.
        const serverSessionReady = await this.verifyServerSessionAfterLogin();
        if (!serverSessionReady) {
          console.error('❌ [CookieAuthService] Login response succeeded but server session validation failed');
          return {
            success: false,
            message: 'Login berhasil, tetapi sesi belum aktif. Silakan coba lagi.',
          };
        }

        // Reset login attempts on successful login
        this.resetLoginAttempts(email);

        const loginData = response.data;
        
        // Ensure user has permissions from role-based mapping if not provided by API
        const userData = loginData.user;
        
        // Handle both GraphQL and REST response formats
        const hasGraphQLFields = loginData.companies && loginData.sessionId;
        
        // Always ensure user has complete role-based permissions (merge with API permissions)
        const { ROLE_PERMISSIONS } = await import('@/types/auth');
        // Use role directly - roles are now consistent with backend format (uppercase)
        const roleBasedPermissions = ROLE_PERMISSIONS[userData.role] || [];
        
        // Merge API permissions with role-based permissions to ensure completeness
        const existingPermissions = Array.isArray(userData.permissions) ? userData.permissions : [];
        const mergedPermissions = [...new Set([...existingPermissions, ...roleBasedPermissions])];
        
        userData.permissions = mergedPermissions;

        // Create cookie-based auth session with flexible expiration handling
        let sessionExpiry: Date;
        if (hasGraphQLFields) {
          // GraphQL webLogin - use default session duration
          const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
          sessionExpiry = new Date(Date.now() + sessionDuration);
        } else {
          // REST API - use provided expiresAt or fallback to default
          sessionExpiry = loginData.expiresAt ? new Date(loginData.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
        }

        const userDataAny = userData as any;
        const cookieSession: CookieAuthSession = {
          user: {
            ...userData,
            lastLogin: new Date(),
            createdAt: userDataAny.createdAt || new Date(),
            permissions: userDataAny.permissions || [],
            // Add companies data if available (GraphQL format)
            ...(hasGraphQLFields && { companies: loginData.companies || [] }),
          } as any,
          expiresAt: sessionExpiry,
          isAuthenticated: true,
        };

        // Store current session
        this.currentSession = cookieSession;

        // Cache session for fast page reload recovery
        this.cacheSessionToStorage(cookieSession);

        // Start session monitoring
        this.startSessionMonitoring();

        const userName = userData?.name || userData?.email || 'User';
        const userRole = userData?.role || 'user';
        
        return {
          success: true,
          message: loginData.message || `Selamat datang, ${userName}! Login sebagai ${userRole}.`,
          data: {
            user: cookieSession.user,
            // Pure cookie authentication - no tokens exposed to client
            accessToken: '', // Not used in cookie-only auth
            refreshToken: '', // Not used in cookie-only auth
            expiresAt: cookieSession.expiresAt,
            // Include companies data if available (GraphQL format)
            ...(hasGraphQLFields && { 
              companies: loginData.companies || [],
              sessionId: loginData.sessionId 
            }),
          } as AuthSession,
        };
      }

      // If login failed, increment attempts
      this.incrementFailedAttempts(email);

      return {
        success: false,
        message: response.message || 'Login gagal. Periksa username/email dan password Anda.',
        errors: (response as any).errors,
      };
    } catch (error: any) {
      console.error('❌ [CookieAuthService] Login error:', error);
      console.error('❌ [CookieAuthService] Error details:', {
        message: error.message,
        errors: error.errors,
        stack: error.stack
      });
      
      // Increment failed attempts on error
      this.incrementFailedAttempts(data.email);

      if (error.errors) {
        return {
          success: false,
          message: error.message || 'Login gagal.',
          errors: error.errors,
        };
      }

      return {
        success: false,
        message: error.message || 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
      };
    }
  }

  // Cookie-based logout
  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      // Call API logout endpoint
      await cookieApiClient.logout();

      // Clear local session
      this.currentSession = null;
      
      // Clear session cache and device ID for security
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('agrinova_device_id');
        this.clearSessionCache();
      }

      // Clear session monitoring
      if (this.sessionCheckInterval) {
        clearInterval(this.sessionCheckInterval);
        this.sessionCheckInterval = undefined;
      }

      return {
        success: true,
        message: 'Logout berhasil.',
      };
    } catch (error: any) {
      // Even if API call fails, clear local session
      this.currentSession = null;
      
      // Clear device ID for security
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('agrinova_device_id');
      }
      
      if (this.sessionCheckInterval) {
        clearInterval(this.sessionCheckInterval);
        this.sessionCheckInterval = undefined;
      }
      
      return {
        success: true,
        message: 'Logout berhasil.',
      };
    }
  }

  // Get current session
  getCurrentSession(): CookieAuthSession | null {
    return this.currentSession;
  }

  // Update current session (for AuthProvider integration)
  updateCurrentSession(session: CookieAuthSession): void {
    console.log('🔄 [CookieAuthService] Updating current session:', session.user?.email, session.user?.role);
    this.currentSession = session;
  }

  // CRITICAL FIX: Enhanced authentication check with comprehensive session recovery
  async checkAuth(): Promise<boolean> {
    try {
      console.log('🔍 [CookieAuthService] Checking authentication with recovery mechanisms...');
      
      // Step 1: Check for valid cached session first (fast path)
      if (this.currentSession?.isAuthenticated && this.currentSession.expiresAt > new Date()) {
        console.log('✅ [CookieAuthService] Using valid cached session');
        return true;
      }
      
      // Step 1.5: Try to restore from sessionStorage cache (immediate page reload recovery)
      if (typeof window !== 'undefined' && !this.currentSession) {
        const cachedSession = this.restoreSessionFromStorage();
        if (cachedSession) {
          console.log('✅ [CookieAuthService] Restored session from storage cache');
          // Session already set in restoreSessionFromStorage
          return true;
        }
      }
      
      // Step 2: Check for session cookies before API validation
      if (typeof window !== 'undefined') {
        const hasSessionCookie = this.hasValidSessionCookie();
        
        if (!hasSessionCookie) {
          console.log('❌ [CookieAuthService] No session cookies found');
          this.clearSessionCache();
          this.currentSession = null;
          return false;
        }
      }
      
      // Step 3: API validation with enhanced error handling
      try {
        const isAuthenticated = await cookieApiClient.checkAuth();
        
        if (isAuthenticated) {
          // Load user profile if we don't have current session
          if (!this.currentSession) {
            console.log('🔍 [CookieAuthService] Loading user profile after API validation...');
            await this.loadCurrentUser();
          }
          
          const hasValidSession = this.currentSession?.isAuthenticated || false;
          console.log('✅ [CookieAuthService] Authentication validated:', hasValidSession);
          
          // Cache session for fast reload recovery
          if (hasValidSession && this.currentSession) {
            this.cacheSessionToStorage(this.currentSession);
          }
          
          // Start session monitoring for persistence
          this.startSessionMonitoring();
          return hasValidSession;
        } else {
          console.log('❌ [CookieAuthService] API authentication check failed');
          await this.handleAuthenticationFailure();
          return false;
        }
      } catch (apiError: any) {
        return await this.handleApiError(apiError);
      }
    } catch (error: any) {
      console.error('❌ [CookieAuthService] Error checking authentication:', {
        message: error.message,
        code: error.code
      });
      await this.handleAuthenticationFailure();
      return false;
    }
  }


  

  // Handle authentication failure with cleanup
  private async handleAuthenticationFailure(): Promise<void> {
    console.log('🧹 [CookieAuthService] Handling authentication failure - cleaning up...');
    this.currentSession = null;
    this.clearSessionCache();
  }

  // Cache session to storage for fast page reload recovery
  private cacheSessionToStorage(session: CookieAuthSession): void {
    try {
      if (typeof window !== 'undefined') {
        const sessionData = {
          user: session.user,
          expiresAt: session.expiresAt.toISOString(),
          isAuthenticated: session.isAuthenticated,
          cachedAt: new Date().toISOString(),
        };
        sessionStorage.setItem('agrinova_session_cache', JSON.stringify(sessionData));
        console.log('📦 [CookieAuthService] Session cached to storage');
      }
    } catch (error) {
      console.warn('⚠️ [CookieAuthService] Failed to cache session:', error);
    }
  }

  // Restore session from storage cache
  private restoreSessionFromStorage(): CookieAuthSession | null {
    try {
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem('agrinova_session_cache');
        if (cached) {
          const sessionData = JSON.parse(cached);
          const expiresAt = new Date(sessionData.expiresAt);
          const cachedAt = new Date(sessionData.cachedAt);
          const cacheAge = Date.now() - cachedAt.getTime();
          
          // CRITICAL FIX: Extended cache lifetime for better page reload recovery
          // Use cache if it's less than 15 minutes old and not expired
          if (cacheAge < 15 * 60 * 1000 && expiresAt > new Date()) {
            console.log('📦 [CookieAuthService] Restored valid session from cache (age:', Math.round(cacheAge / 1000), 'seconds)');
            
            // MIGRATION FIX: Convert any legacy lowercase roles to uppercase
            // This handles cached sessions from before the fix
            const legacyRole = sessionData.user?.role;
            const normalizedUser = legacyRole ? {
              ...sessionData.user,
              role: legacyRole.toString().toUpperCase()
            } : sessionData.user;

            // Set the current session for immediate access
            this.currentSession = {
              user: normalizedUser,
              expiresAt: expiresAt,
              isAuthenticated: sessionData.isAuthenticated,
            };
            
            return this.currentSession;
          } else {
            console.log('📦 [CookieAuthService] Session cache expired (age:', Math.round(cacheAge / 1000), 'seconds), clearing...');
            this.clearSessionCache();
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ [CookieAuthService] Failed to restore session from cache:', error);
      this.clearSessionCache();
    }
    return null;
  }

  // Clear session cache
  private clearSessionCache(): void {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('agrinova_session_cache');
      }
    } catch (error) {
      console.warn('⚠️ [CookieAuthService] Failed to clear session cache:', error);
    }
  }

  // Enhanced API error handling with recovery attempts
  private async handleApiError(apiError: any): Promise<boolean> {
    // Handle network errors gracefully with offline support
    if (apiError.code === 'NETWORK_ERROR' || apiError.code === 'ERR_NETWORK' || 
        apiError.message?.includes('Network Error') || 
        apiError.message?.includes('Failed to fetch')) {
      console.warn('🌐 [CookieAuthService] Network error - attempting offline session validation:', {
        hasCurrentSession: !!this.currentSession,
        error: apiError.message
      });
      
      // Try offline validation if we have a session
      if (this.currentSession?.isAuthenticated) {
        // Check if session is still valid by expiration time
        if (this.currentSession.expiresAt > new Date()) {
          console.log('✅ [CookieAuthService] Using offline session validation');
          return true;
        }
      }
      
      // For network errors, we rely on cached session validation
      console.log('🌐 [CookieAuthService] Network error - using cached session only');
      
      console.log('❌ [CookieAuthService] Could not recover from network error');
      return false;
    }
    
    // For authentication errors, clear session and attempt recovery
    console.error('❌ [CookieAuthService] API authentication error:', apiError.message);
    await this.handleAuthenticationFailure();
    return false;
  }


  // Load current user from API
  async loadCurrentUser(): Promise<void> {
    try {
      console.log('🔍 [CookieAuthService] Loading user profile from API...');
      const response = await cookieApiClient.getCurrentUser();
      
      if (response.success && response.data) {
        const userData = response.data;
        console.log('✅ [CookieAuthService] User profile loaded:', {
          email: userData.email,
          role: userData.role,
          hasPermissions: !!(userData.permissions?.length)
        });
        
        // Ensure user has permissions
        // Always ensure user has complete role-based permissions (merge with API permissions)  
        console.log('🔧 [CookieAuthService] Ensuring complete permissions for role:', userData.role);
        const { ROLE_PERMISSIONS } = await import('@/types/auth');
        // Use role directly - roles are now consistent with backend format (uppercase)
        const roleBasedPermissions = ROLE_PERMISSIONS[userData.role] || [];
        
        // Merge API permissions with role-based permissions to ensure completeness
        const existingPermissions = Array.isArray(userData.permissions) ? userData.permissions : [];
        const mergedPermissions = [...new Set([...existingPermissions, ...roleBasedPermissions])];
        
        userData.permissions = mergedPermissions;
        console.log('🔧 [CookieAuthService] Complete permissions for role:', {
          role: userData.role,
          totalPermissions: mergedPermissions.length
        });

        // Create session with proper expiration
        const userDataAny = userData as any;
        this.currentSession = {
          user: {
            ...userData,
            lastLogin: new Date(),
            createdAt: userDataAny.createdAt || new Date(),
            permissions: userDataAny.permissions || [],
          } as any,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          isAuthenticated: true,
        };

        console.log('✅ [CookieAuthService] Session created successfully');
        this.startSessionMonitoring();
      } else {
        console.log('❌ [CookieAuthService] No user data in API response');
        this.currentSession = null;
      }
    } catch (error: any) {
      console.error('❌ [CookieAuthService] Failed to load user profile:', {
        message: error.message,
        code: error.code,
        status: error.status
      });
      this.currentSession = null;
      throw error; // Re-throw to let caller handle
    }
  }

  // Start session monitoring
  private startSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    // Check session every 5 minutes
    this.sessionCheckInterval = setInterval(async () => {
      const isValid = await this.checkAuth();
      if (!isValid) {
        // Session expired, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Get current user profile
  async getProfile(): Promise<ApiResponse<User>> {
    try {
      const response = await cookieApiClient.getCurrentUser();
      // Cast to match expected User type with all required fields
      return response as unknown as ApiResponse<User>;
    } catch (error: any) {
      throw error;
    }
  }

  // Update user profile
  async updateProfile(data: UpdateProfileRequest & { currentPassword?: string; newPassword?: string }): Promise<ApiResponse<User>> {
    try {
      const response = await cookieApiClient.put<User>('/auth/profile', data);
      
      // Update current session with new user data
      if (response.success && response.data && this.currentSession) {
        this.currentSession = {
          ...this.currentSession,
          user: {
            ...this.currentSession.user,
            ...response.data,
            lastLogin: this.currentSession.user.lastLogin, // Preserve lastLogin
          }
        };
        console.log('✅ [CookieAuthService] Profile updated and session refreshed');
      }
      
      return response;
    } catch (error: any) {
      console.error('❌ [CookieAuthService] Profile update error:', error);
      throw error;
    }
  }

  // Forgot password
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await cookieApiClient.post<void>('/auth/forgot-password', { email });
      
      return {
        success: response.success,
        message: response.message || 'Link reset password telah dikirim ke email Anda.',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Gagal mengirim link reset password.',
      };
    }
  }

  // Reset password
  async resetPassword(token: string, password: string, passwordConfirmation: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await cookieApiClient.post<void>('/auth/reset-password', {
        token,
        password,
        passwordConfirmation,
      });

      return {
        success: response.success,
        message: response.message || 'Password berhasil direset.',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Gagal reset password.',
      };
    }
  }


  // Clean up on component unmount
  destroy(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = undefined;
    }
  }

  // Pure cookie authentication - no JWT token extraction needed
  // HttpOnly cookies are handled automatically by the browser

}

// Create and export singleton instance
const cookieAuthService = new CookieAuthService();
export { CookieAuthService };
export default cookieAuthService;

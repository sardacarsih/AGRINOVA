import { apolloClient } from '@/lib/apollo/client';
import {
  WEB_LOGIN_MUTATION,
  CREATE_WEB_QR_LOGIN_SESSION_MUTATION,
  WEB_QR_LOGIN_STATUS_QUERY,
  CONSUME_WEB_QR_LOGIN_MUTATION,
  LOGOUT_MUTATION,
  ME_QUERY,
  type WebLoginInput,
  type WebLoginPayload,
  type User,
  type WebQRLoginSessionPayload,
  type WebQRLoginStatusPayload,
  type WebQRConsumeInput,
} from '@/lib/apollo/queries/auth';

// Response interface to match the expected structure
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

// Cookie login response interface
export interface CookieLoginResponse {
  user: User;
  message?: string;
  expiresAt?: string;
  // GraphQL-specific fields
  companies?: any[];
  sessionId?: string;
}

export interface QRLoginSessionResponse {
  sessionId: string;
  challenge: string;
  qrData: string;
  status: 'PENDING' | 'APPROVED' | 'EXPIRED' | 'CONSUMED';
  expiresAt?: string;
  message?: string;
}

export interface QRLoginStatusResponse {
  sessionId?: string;
  status: 'PENDING' | 'APPROVED' | 'EXPIRED' | 'CONSUMED';
  expiresAt?: string;
  message?: string;
  user?: User;
}

// Login request interface for cookie-based authentication
export interface CookieLoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
  platform: 'WEB' | 'ANDROID' | 'IOS';
}

class CookieApiClient {
  /**
   * Cookie-based login using GraphQL mutation
   * This integrates with the existing GraphQL authentication system
   * while providing cookie-based session management
   */
  async login(request: CookieLoginRequest): Promise<ApiResponse<CookieLoginResponse>> {
    try {
      console.log('🔍 [CookieApiClient] GraphQL webLogin attempt:', { username: request.username });

      // Validate input parameters
      if (!request.username || request.username.trim() === '') {
        console.error('❌ [CookieApiClient] Missing or empty username/identifier');
        return {
          success: false,
          message: 'Username atau email harus diisi.',
        };
      }

      if (!request.password || request.password.trim() === '') {
        console.error('❌ [CookieApiClient] Missing or empty password');
        return {
          success: false,
          message: 'Password harus diisi.',
        };
      }

      // Prepare GraphQL webLogin input (simpler than regular login)
      const identifier = request.username.trim();
      const webLoginInput: WebLoginInput = {
        identifier: identifier,
        password: request.password,
      };

      console.log('🔍 [CookieApiClient] Prepared webLoginInput:', {
        identifier: webLoginInput.identifier,
        password: '[REDACTED]', // Don't log passwords
        identifierType: typeof webLoginInput.identifier,
        identifierLength: webLoginInput.identifier.length,
        identifierValue: JSON.stringify(webLoginInput.identifier)
      });

      const mutationVariables = { input: webLoginInput };
      console.log('🔍 [CookieApiClient] GraphQL mutation variables:', {
        input: {
          identifier: webLoginInput.identifier,
          password: '[REDACTED]'
        }
      });
      console.log('🔍 [CookieApiClient] Variables stringified:', JSON.stringify({
        input: {
          identifier: webLoginInput.identifier,
          password: '[REDACTED]'
        }
      }));

      // Execute GraphQL webLogin mutation
      const response = await apolloClient.mutate({
        mutation: WEB_LOGIN_MUTATION,
        variables: mutationVariables,
        errorPolicy: 'all',
        fetchPolicy: 'no-cache', // Always fetch fresh data
      });

      console.log('🔍 [CookieApiClient] Full GraphQL response structure:', {
        data: response.data,
        errors: response.errors,
        extensions: response.extensions
      });
      console.log('🔍 [CookieApiClient] Raw response data:', response.data);
      console.log('🔍 [CookieApiClient] Response data keys:', response.data ? Object.keys(response.data) : 'No data');
      console.log('🔍 [CookieApiClient] Response data type:', typeof response.data);
      console.log('🔍 [CookieApiClient] Response data JSON:', JSON.stringify(response.data, null, 2));

      if (response.errors && response.errors.length > 0) {
        console.log('🔍 [CookieApiClient] GraphQL errors found:', response.errors);
        response.errors.forEach((error, index) => {
          console.log(`🔍 [CookieApiClient] Error ${index}:`, {
            message: error.message,
            locations: error.locations,
            path: error.path,
            extensions: error.extensions
          });
        });
      }

      const { data } = response;
      console.log('🔍 [CookieApiClient] Checking data.webLogin existence:', {
        'data exists': !!data,
        'data type': typeof data,
        'data.webLogin exists': !!(data && data.webLogin),
        'data.webLogin type': data && data.webLogin ? typeof data.webLogin : 'undefined'
      });

      if (data && data.webLogin) {
        const webLoginPayload: WebLoginPayload = data.webLogin;
        console.log('✅ [CookieApiClient] GraphQL webLogin successful:', webLoginPayload);

        // Check if webLogin was successful
        if (webLoginPayload.success) {
          // WebLogin already returns the success status and proper data structure
          const responseData: CookieLoginResponse = {
            user: {
              ...webLoginPayload.user,
              // Add permissions based on role if not provided
              permissions: this.getRolePermissions(webLoginPayload.user.role),
            },
            message: webLoginPayload.message,
            // No expiresAt in webLogin as it uses cookies
            companies: webLoginPayload.assignments?.companies || [],
            sessionId: webLoginPayload.sessionId,
          };

          return {
            success: webLoginPayload.success,
            message: responseData.message,
            data: responseData,
          };
        } else {
          // Login failed but GraphQL response was successful
          console.log('❌ [CookieApiClient] Login failed on server:', webLoginPayload.message);
          return {
            success: false,
            message: webLoginPayload.message || 'Login gagal. Periksa username dan password Anda.',
          };
        }
      }

      console.log('❌ [CookieApiClient] No webLogin data returned from GraphQL');
      console.log('❌ [CookieApiClient] Data exists:', !!data);
      console.log('❌ [CookieApiClient] Data.webLogin exists:', !!(data && data.webLogin));
      console.log('❌ [CookieApiClient] Raw data:', data);
      return {
        success: false,
        message: 'Login gagal. Periksa username dan password Anda.',
      };
    } catch (error: any) {
      console.error('❌ [CookieApiClient] Login error:', error);

      // Handle GraphQL errors
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        const graphqlError = error.graphQLErrors[0];
        return {
          success: false,
          message: graphqlError.message || 'Login gagal.',
          errors: graphqlError.extensions?.validation || {
            general: [graphqlError.message || 'Login gagal.']
          },
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

  /**
   * Create a short-lived web QR login session.
   */
  async createWebQRLoginSession(): Promise<ApiResponse<QRLoginSessionResponse>> {
    try {
      const response = await apolloClient.mutate({
        mutation: CREATE_WEB_QR_LOGIN_SESSION_MUTATION,
        errorPolicy: 'all',
        fetchPolicy: 'no-cache',
      });

      const payload: WebQRLoginSessionPayload | undefined = response.data?.createWebQRLoginSession;
      if (!payload?.success || !payload.sessionId || !payload.challenge || !payload.qrData) {
        return {
          success: false,
          message: payload?.message || 'Gagal membuat sesi QR login.',
        };
      }

      return {
        success: true,
        message: payload.message,
        data: {
          sessionId: payload.sessionId,
          challenge: payload.challenge,
          qrData: payload.qrData,
          status: payload.status,
          expiresAt: payload.expiresAt,
          message: payload.message,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Terjadi kesalahan saat membuat sesi QR login.',
      };
    }
  }

  /**
   * Poll QR login status.
   */
  async getWebQRLoginStatus(sessionId: string, challenge: string): Promise<ApiResponse<QRLoginStatusResponse>> {
    try {
      const response = await apolloClient.query({
        query: WEB_QR_LOGIN_STATUS_QUERY,
        variables: { sessionId, challenge },
        errorPolicy: 'all',
        fetchPolicy: 'network-only',
      });

      const payload: WebQRLoginStatusPayload | undefined = response.data?.webQRLoginStatus;
      if (!payload) {
        return {
          success: false,
          message: 'Status QR login tidak tersedia.',
        };
      }

      return {
        success: payload.success,
        message: payload.message,
        data: {
          sessionId: payload.sessionId,
          status: payload.status,
          expiresAt: payload.expiresAt,
          message: payload.message,
          user: payload.user,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Gagal memeriksa status QR login.',
      };
    }
  }

  /**
   * Consume approved QR login session and create cookie-based web session.
   */
  async consumeWebQRLogin(input: WebQRConsumeInput): Promise<ApiResponse<CookieLoginResponse>> {
    try {
      const response = await apolloClient.mutate({
        mutation: CONSUME_WEB_QR_LOGIN_MUTATION,
        variables: { input },
        errorPolicy: 'all',
        fetchPolicy: 'no-cache',
      });

      const payload: WebLoginPayload | undefined = response.data?.consumeWebQRLogin;
      if (!payload?.success || !payload.user) {
        return {
          success: false,
          message: payload?.message || 'QR login belum dapat digunakan.',
        };
      }

      const responseData: CookieLoginResponse = {
        user: {
          ...payload.user,
          permissions: this.getRolePermissions(payload.user.role),
        },
        message: payload.message,
        companies: payload.assignments?.companies || [],
        sessionId: payload.sessionId,
      };

      return {
        success: true,
        message: responseData.message,
        data: responseData,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Terjadi kesalahan saat menyelesaikan QR login.',
      };
    }
  }

  /**
   * Cookie-based logout using GraphQL mutation
   */
  async logout(): Promise<ApiResponse<void>> {
    try {
      console.log('🔍 [CookieApiClient] GraphQL logout attempt');

      await apolloClient.mutate({
        mutation: LOGOUT_MUTATION,
        errorPolicy: 'all',
      });

      // Clear Apollo cache after logout
      await apolloClient.clearStore();

      console.log('✅ [CookieApiClient] GraphQL logout successful');
      return {
        success: true,
        message: 'Logout berhasil.',
      };
    } catch (error: any) {
      console.warn('⚠️ [CookieApiClient] Logout error, but continuing:', error);

      // Even if logout fails, clear local cache
      await apolloClient.clearStore();

      return {
        success: true,
        message: 'Logout berhasil.',
      };
    }
  }

  /**
   * Check authentication status using GraphQL query
   */
  async checkAuth(): Promise<boolean> {
    try {
      console.log('🔍 [CookieApiClient] Checking auth via GraphQL');

      const { data } = await apolloClient.query({
        query: ME_QUERY,
        errorPolicy: 'all',
        fetchPolicy: 'network-only', // Always check with server for auth status
      });

      if (data && data.me) {
        console.log('✅ [CookieApiClient] Authentication verified');
        return true;
      }

      console.log('❌ [CookieApiClient] No user data returned');
      return false;
    } catch (error: any) {
      console.error('❌ [CookieApiClient] Auth check error:', error);
      return false;
    }
  }

  /**
   * Get current user profile using GraphQL query
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      console.log('🔍 [CookieApiClient] Loading current user via GraphQL');

      const { data } = await apolloClient.query({
        query: ME_QUERY,
        errorPolicy: 'all',
        fetchPolicy: 'cache-first', // Use cache if available for profile data
      });

      if (data && data.me) {
        const user = {
          ...data.me,
          permissions: this.getRolePermissions(data.me.role),
        };

        console.log('✅ [CookieApiClient] User profile loaded');
        return {
          success: true,
          message: 'User profile loaded successfully.',
          data: user,
        };
      }

      return {
        success: false,
        message: 'User profile tidak ditemukan.',
      };
    } catch (error: any) {
      console.error('❌ [CookieApiClient] Get current user error:', error);
      return {
        success: false,
        message: error.message || 'Gagal memuat profile user.',
      };
    }
  }

  /**
   * Generic GET request for REST API compatibility
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    if (
      endpoint.startsWith('/admin/system-statistics') ||
      endpoint.startsWith('/admin/multi-assignment-analytics')
    ) {
      try {
        const apiEndpoint = `/api${endpoint}`;
        const targetURL =
          typeof window === 'undefined'
            ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${apiEndpoint}`
            : apiEndpoint;

        const response = await fetch(targetURL, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const body = await response.json().catch(() => null);
        if (!response.ok) {
          return {
            success: false,
            message: body?.message || `GET ${endpoint} failed`
          };
        }

        return {
          success: true,
          message: 'Data loaded successfully',
          data: body as T
        };
      } catch (error: any) {
        return {
          success: false,
          message: error.message || `GET ${endpoint} failed`
        };
      }
    }
    console.warn('⚠️ [CookieApiClient] GET request to', endpoint, 'using fallback implementation');
    console.warn('⚠️ This should be replaced with GraphQL queries when available');

    try {
      // For users endpoints, return mock data
      if (endpoint.includes('/users')) {
        // Handle manageable roles endpoint
        if (endpoint.includes('/manageable-roles')) {
          return {
            success: true,
            message: 'Manageable roles loaded successfully',
            data: {
              roles: ['super_admin', 'company_admin', 'area_manager', 'manager', 'asisten', 'mandor', 'satpam']
            } as T,
          };
        }

        // Handle users list endpoint
        return {
          success: true,
          message: 'Users loaded successfully',
          data: {
            data: [
              {
                id: '1',
                email: 'super-admin@agrinova.com',
                name: 'Super Admin',
                role: 'super_admin',
                company: 'PT Agrinova Sentosa',
                companyId: '1',
                estate: 'Estate Sawit Jaya',
                divisi: 'Divisi A',
                permissions: ['super_admin:all'],
                createdAt: new Date(),
                status: 'active',
                employeeId: 'EMP001'
              },
              {
                id: '2',
                email: 'company-admin@agrinova.com',
                name: 'Company Admin',
                role: 'company_admin',
                company: 'PT Agrinova Sentosa',
                companyId: '1',
                estate: 'Estate Sawit Jaya',
                divisi: 'Divisi A',
                permissions: ['company_admin:all'],
                createdAt: new Date(),
                status: 'active',
                employeeId: 'EMP002'
              },
              {
                id: '3',
                email: 'manager@agrinova.com',
                name: 'Manager',
                role: 'manager',
                company: 'PT Agrinova Sentosa',
                companyId: '1',
                estate: 'Estate Sawit Jaya',
                divisi: 'Divisi A',
                permissions: ['manager:all'],
                createdAt: new Date(),
                status: 'active',
                employeeId: 'EMP003'
              }
            ],
            pagination: {
              page: 1,
              limit: 10,
              total: 3,
              pages: 1
            }
          } as T,
        };
      }

      // For gate check endpoints, return mock data
      if (endpoint.includes('/gate-check/')) {
        return this.getMockGateCheckData(endpoint) as ApiResponse<T>;
      }

      // For companies endpoint, return mock data
      if (endpoint.includes('/companies')) {
        return {
          success: true,
          message: 'Companies loaded successfully',
          data: [] as T,
        };
      }

      // Default fallback
      return {
        success: false,
        message: `GET endpoint ${endpoint} not implemented`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'GET request failed',
      };
    }
  }

  /**
   * Generic PUT request for REST API compatibility
   */
  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    console.warn('⚠️ [CookieApiClient] PUT request to', endpoint, 'using fallback implementation');
    console.warn('⚠️ This method should be replaced with specific GraphQL mutations');

    try {
      // For profile updates, keep the existing behavior
      if (endpoint.includes('/auth/profile')) {
        return {
          success: false,
          message: 'Profile update belum diimplementasikan dalam GraphQL client.',
        };
      }

      // For gate check endpoints, return mock success
      if (endpoint.includes('/gate-check/')) {
        return {
          success: true,
          message: 'Operation completed successfully',
          data: data as T,
        };
      }

      throw new Error(`PUT endpoint ${endpoint} not implemented`);
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'PUT request failed.',
      };
    }
  }

  /**
   * Generic POST request for REST API compatibility
   */
  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    console.warn('⚠️ [CookieApiClient] POST request to', endpoint, 'using fallback implementation');
    console.warn('⚠️ This method should be replaced with specific GraphQL mutations');

    try {
      // For password reset, keep the existing behavior
      if (endpoint.includes('/auth/forgot-password') || endpoint.includes('/auth/reset-password')) {
        return {
          success: false,
          message: 'Fitur ini belum diimplementasikan dalam GraphQL client.',
        };
      }

      // For gate check endpoints, return mock success
      if (endpoint.includes('/gate-check/')) {
        return {
          success: true,
          message: 'Operation completed successfully',
          data: { ...data, id: `mock_${Date.now()}` } as T,
        };
      }

      throw new Error(`POST endpoint ${endpoint} not implemented`);
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'POST request failed.',
      };
    }
  }

  /**
   * Generic PATCH request for REST API compatibility
   */
  async patch<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    console.warn('⚠️ [CookieApiClient] PATCH request to', endpoint, 'using fallback implementation');
    console.warn('⚠️ This method should be replaced with specific GraphQL mutations');

    try {
      // For employee updates, return mock success with updated data
      if (endpoint.includes('/employees/')) {
        return {
          success: true,
          message: 'Employee updated successfully',
          data: { ...data } as T,
        };
      }

      throw new Error(`PATCH endpoint ${endpoint} not implemented`);
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'PATCH request failed.',
      };
    }
  }

  /**
   * Generic DELETE request for REST API compatibility
   */
  async delete<T = void>(endpoint: string): Promise<ApiResponse<T>> {
    console.warn('⚠️ [CookieApiClient] DELETE request to', endpoint, 'using fallback implementation');
    console.warn('⚠️ This method should be replaced with specific GraphQL mutations');

    try {
      // For employee deletions, return mock success
      if (endpoint.includes('/employees/')) {
        return {
          success: true,
          message: 'Employee deleted successfully',
        };
      }

      throw new Error(`DELETE endpoint ${endpoint} not implemented`);
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'DELETE request failed.',
      };
    }
  }

  /**
   * Mock data provider for gate check endpoints
   */
  private getMockGateCheckData(endpoint: string): ApiResponse<any> {
    if (endpoint.includes('/vehicles/active')) {
      return {
        success: true,
        message: 'Active vehicles loaded',
        data: [],
      };
    }

    if (endpoint.includes('/stats')) {
      return {
        success: true,
        message: 'Gate check stats loaded',
        data: {
          vehiclesInside: 0,
          todayEntries: 0,
          todayExits: 0,
          pendingExit: 0,
          averageLoadTime: 0,
          complianceRate: 0,
        },
      };
    }

    if (endpoint.includes('/entries') || endpoint.includes('/exits')) {
      return {
        success: true,
        message: 'Gate check entries loaded',
        data: [],
      };
    }

    if (endpoint.includes('/vehicles/search')) {
      return {
        success: true,
        message: 'Vehicle search completed',
        data: [],
      };
    }

    if (endpoint.includes('/vehicles/') || endpoint.includes('/history')) {
      return {
        success: true,
        message: 'Vehicle data loaded',
        data: {},
      };
    }

    return {
      success: false,
      message: 'Mock endpoint not implemented',
    };
  }

  /**
   * Generate device ID for tracking
   */
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

  /**
   * Generate session ID for tracking
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get role-based permissions
   */
  private getRolePermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      'SUPER_ADMIN': ['read:all', 'write:all', 'delete:all', 'admin:system'],
      'COMPANY_ADMIN': ['read:company', 'write:company', 'read:users', 'write:users'],
      'AREA_MANAGER': ['read:companies', 'read:estates', 'read:harvest', 'read:reports'],
      'MANAGER': ['read:estate', 'write:estate', 'read:harvest', 'write:harvest'],
      'ASISTEN': ['read:division', 'write:division', 'read:harvest', 'approve:harvest'],
      'MANDOR': ['read:division', 'write:harvest', 'create:harvest'],
      'SATPAM': ['read:gatecheck', 'write:gatecheck', 'create:gatecheck'],
    };

    return rolePermissions[role] || [];
  }
}

// Create and export singleton instance
const cookieApiClient = new CookieApiClient();

export default cookieApiClient;

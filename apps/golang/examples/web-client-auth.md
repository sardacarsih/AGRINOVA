# Web Client GraphQL Authentication Integration

This document provides comprehensive examples for integrating the Agrinova GraphQL authentication system in web applications (React/Next.js).

## Table of Contents
1. [Basic Setup](#basic-setup)
2. [Authentication Queries and Mutations](#authentication-queries-and-mutations)
3. [Role-Based Authentication](#role-based-authentication)
4. [Token Management](#token-management)
5. [Error Handling](#error-handling)
6. [Security Best Practices](#security-best-practices)

## Basic Setup

### GraphQL Client Configuration

```typescript
// lib/graphql/client.ts
import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:8080/graphql',
  credentials: 'include', // Important for cookie-based auth
});

// Auth link to add JWT token to requests
const authLink = setContext((_, { headers }) => {
  // Get token from localStorage or secure storage
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

// Error link for handling auth errors
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (let err of graphQLErrors) {
      switch (err.extensions?.code) {
        case 'UNAUTHENTICATED':
          // Handle token expiration
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          break;
        case 'FORBIDDEN':
          console.error('Access denied:', err.message);
          break;
      }
    }
  }
  
  if (networkError) {
    console.error('Network error:', networkError);
  }
});

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});
```

## Authentication Queries and Mutations

### 1. Enhanced Login with Role-Based Profile

```typescript
// graphql/mutations/auth.ts
import { gql } from '@apollo/client';

export const ENHANCED_LOGIN = gql`
  mutation EnhancedLogin($input: LoginInput!) {
    enhancedLogin(input: $input) {
      accessToken
      refreshToken
      tokenType
      expiresIn
      expiresAt
      user {
        id
        username
        nama
        email
        role
        companyId
        isActive
      }
      assignments {
        companies {
          id
          nama
        }
        estates {
          id
          nama
          companyId
        }
        divisions {
          id
          nama
          estateId
        }
      }
      profile {
        ... on SuperAdminProfile {
          user {
            id
            username
            nama
            role
          }
          companies {
            id
            nama
          }
          systemStats {
            totalCompanies
            totalUsers
            totalEstates
            systemHealth {
              uptimeSeconds
              memoryUsage
              cpuUsage
              databaseStatus
            }
          }
        }
        ... on CompanyAdminProfile {
          user {
            id
            username
            nama
            role
          }
          company {
            id
            nama
          }
          companyStats {
            totalEstates
            totalUsers
            totalDivisions
            performanceMetrics {
              monthlyHarvestVolume
              averageQualityScore
              estateEfficiency
            }
          }
        }
        ... on ManagerProfile {
          user {
            id
            username
            nama
            role
          }
          company {
            id
            nama
          }
          estates {
            id
            nama
          }
          managerStats {
            estatesManaged
            totalDivisions
            estatePerformance {
              monthlyTarget
              actualProduction
              efficiency
            }
          }
        }
        ... on AsistenProfile {
          user {
            id
            username
            nama
            role
          }
          company {
            id
            nama
          }
          estate {
            id
            nama
          }
          divisions {
            id
            nama
          }
          asistenStats {
            divisionsAssigned
            pendingApprovals
            dailyWorkload {
              approvalsCompleted
              rejectionsToday
              averageApprovalTime
            }
          }
        }
        ... on MandorProfile {
          user {
            id
            username
            nama
            role
          }
          company {
            id
            nama
          }
          estate {
            id
            nama
          }
          divisions {
            id
            nama
          }
          mandorStats {
            divisionsSupervised
            dailyHarvestRecords
            fieldWorkSummary {
              recordsCreated
              blocksSupervised
              qualityScoreAverage
            }
          }
        }
        ... on SatpamProfile {
          user {
            id
            username
            nama
            role
          }
          company {
            id
            nama
          }
          gateStats {
            dailyGateChecks
            pendingApprovals
            securitySummary {
              vehiclesProcessed
              securityIncidents
              averageProcessingTime
            }
          }
        }
      }
    }
  }
`;

export const STANDARD_LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      tokenType
      expiresIn
      expiresAt
      user {
        id
        username
        nama
        email
        role
        companyId
        isActive
      }
      assignments {
        companies {
          id
          nama
        }
        estates {
          id
          nama
          companyId
        }
        divisions {
          id
          nama
          estateId
        }
      }
    }
  }
`;

export const REFRESH_TOKEN = gql`
  mutation RefreshToken($input: RefreshTokenInput!) {
    refreshToken(input: $input) {
      accessToken
      refreshToken
      tokenType
      expiresIn
      expiresAt
      user {
        id
        username
        nama
        role
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;
```

### 2. Authentication Service

```typescript
// services/authService.ts
import { client } from '@/lib/graphql/client';
import { ENHANCED_LOGIN, STANDARD_LOGIN, REFRESH_TOKEN, LOGOUT } from '@/graphql/mutations/auth';

export interface LoginCredentials {
  identifier: string; // username or email
  password: string;
  platform?: 'WEB' | 'ANDROID' | 'IOS';
  rememberDevice?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  username: string;
  nama: string;
  email?: string;
  role: string;
  companyId: string;
}

export class AuthService {
  private static instance: AuthService;
  private tokenRefreshTimer?: NodeJS.Timeout;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Enhanced login with role-based profile data
  async enhancedLogin(credentials: LoginCredentials) {
    try {
      const { data } = await client.mutate({
        mutation: ENHANCED_LOGIN,
        variables: {
          input: {
            identifier: credentials.identifier,
            password: credentials.password,
            platform: credentials.platform || 'WEB',
            rememberDevice: credentials.rememberDevice || false,
          }
        }
      });

      if (data?.enhancedLogin) {
        this.storeTokens({
          accessToken: data.enhancedLogin.accessToken,
          refreshToken: data.enhancedLogin.refreshToken,
          expiresAt: data.enhancedLogin.expiresAt,
          expiresIn: data.enhancedLogin.expiresIn,
        });

        // Store user data and profile
        this.storeUserData(data.enhancedLogin.user);
        this.storeUserAssignments(data.enhancedLogin.assignments);
        this.storeUserProfile(data.enhancedLogin.profile);

        // Setup automatic token refresh
        this.setupTokenRefresh(data.enhancedLogin.expiresIn);

        return {
          user: data.enhancedLogin.user,
          profile: data.enhancedLogin.profile,
          assignments: data.enhancedLogin.assignments,
        };
      }

      throw new Error('Login failed');
    } catch (error) {
      console.error('Enhanced login error:', error);
      throw error;
    }
  }

  // Standard login (backward compatibility)
  async login(credentials: LoginCredentials) {
    try {
      const { data } = await client.mutate({
        mutation: STANDARD_LOGIN,
        variables: {
          input: {
            identifier: credentials.identifier,
            password: credentials.password,
            platform: credentials.platform || 'WEB',
            rememberDevice: credentials.rememberDevice || false,
          }
        }
      });

      if (data?.login) {
        this.storeTokens({
          accessToken: data.login.accessToken,
          refreshToken: data.login.refreshToken,
          expiresAt: data.login.expiresAt,
          expiresIn: data.login.expiresIn,
        });

        this.storeUserData(data.login.user);
        this.storeUserAssignments(data.login.assignments);
        this.setupTokenRefresh(data.login.expiresIn);

        return {
          user: data.login.user,
          assignments: data.login.assignments,
        };
      }

      throw new Error('Login failed');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Token refresh
  async refreshToken() {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const { data } = await client.mutate({
        mutation: REFRESH_TOKEN,
        variables: {
          input: {
            refreshToken,
          }
        }
      });

      if (data?.refreshToken) {
        this.storeTokens({
          accessToken: data.refreshToken.accessToken,
          refreshToken: data.refreshToken.refreshToken,
          expiresAt: data.refreshToken.expiresAt,
          expiresIn: data.refreshToken.expiresIn,
        });

        this.setupTokenRefresh(data.refreshToken.expiresIn);
        return data.refreshToken;
      }

      throw new Error('Token refresh failed');
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      throw error;
    }
  }

  // Logout
  async logout() {
    try {
      await client.mutate({
        mutation: LOGOUT,
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthData();
      if (this.tokenRefreshTimer) {
        clearTimeout(this.tokenRefreshTimer);
      }
      // Redirect to login
      window.location.href = '/login';
    }
  }

  // Token management
  private storeTokens(tokens: AuthTokens) {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('tokenExpiresAt', tokens.expiresAt);
  }

  private storeUserData(user: UserProfile) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  private storeUserAssignments(assignments: any) {
    localStorage.setItem('userAssignments', JSON.stringify(assignments));
  }

  private storeUserProfile(profile: any) {
    localStorage.setItem('userProfile', JSON.stringify(profile));
  }

  private clearAuthData() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiresAt');
    localStorage.removeItem('user');
    localStorage.removeItem('userAssignments');
    localStorage.removeItem('userProfile');
  }

  public getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  public getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  public getUser(): UserProfile | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  public getUserProfile(): any | null {
    const profile = localStorage.getItem('userProfile');
    return profile ? JSON.parse(profile) : null;
  }

  public getUserAssignments(): any | null {
    const assignments = localStorage.getItem('userAssignments');
    return assignments ? JSON.parse(assignments) : null;
  }

  public isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    
    if (!token || !expiresAt) {
      return false;
    }

    return new Date() < new Date(expiresAt);
  }

  // Setup automatic token refresh (13 minutes before expiry for 15-minute tokens)
  private setupTokenRefresh(expiresIn: number) {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    const refreshTime = (expiresIn - 120) * 1000; // Refresh 2 minutes before expiry
    this.tokenRefreshTimer = setTimeout(() => {
      this.refreshToken();
    }, refreshTime);
  }
}

export const authService = AuthService.getInstance();
```

## Role-Based Authentication

### Role-Based Component Protection

```typescript
// components/auth/RoleGuard.tsx
import React from 'react';
import { useAuth } from '@/hooks/useAuth';

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  allowedRoles, 
  children, 
  fallback = <div>Access Denied</div> 
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <div>Please login</div>;
  }

  if (!allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Usage examples:
export const SuperAdminOnly = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowedRoles={['SUPER_ADMIN']} children={children} />
);

export const CompanyAdminOnly = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN']} children={children} />
);

export const ManagerAndAbove = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard 
    allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER']} 
    children={children} 
  />
);

export const FieldWorkers = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard 
    allowedRoles={['ASISTEN', 'MANDOR', 'SATPAM']} 
    children={children} 
  />
);
```

### Role-Based Dashboard Routing

```typescript
// hooks/useAuth.ts
import { useState, useEffect, createContext, useContext } from 'react';
import { authService } from '@/services/authService';

interface AuthContextType {
  user: any | null;
  profile: any | null;
  assignments: any | null;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<any>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state from localStorage
    const savedUser = authService.getUser();
    const savedProfile = authService.getUserProfile();
    const savedAssignments = authService.getUserAssignments();

    if (savedUser && authService.isAuthenticated()) {
      setUser(savedUser);
      setProfile(savedProfile);
      setAssignments(savedAssignments);
    }

    setIsLoading(false);
  }, []);

  const login = async (credentials: any) => {
    setIsLoading(true);
    try {
      const result = await authService.enhancedLogin(credentials);
      setUser(result.user);
      setProfile(result.profile);
      setAssignments(result.assignments);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setProfile(null);
      setAssignments(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      assignments,
      isAuthenticated: !!user && authService.isAuthenticated(),
      login,
      logout,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Role-Based Dashboard Component

```typescript
// components/dashboard/RoleDashboard.tsx
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { CompanyAdminDashboard } from './CompanyAdminDashboard';
import { AreaManagerDashboard } from './AreaManagerDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { AsistenDashboard } from './AsistenDashboard';
import { MandorDashboard } from './MandorDashboard';
import { SatpamDashboard } from './SatpamDashboard';

export const RoleDashboard: React.FC = () => {
  const { user, profile, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user || !profile) {
    return <div>Loading...</div>;
  }

  // Render dashboard based on user role
  switch (user.role) {
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard profile={profile} />;
    case 'COMPANY_ADMIN':
      return <CompanyAdminDashboard profile={profile} />;
    case 'AREA_MANAGER':
      return <AreaManagerDashboard profile={profile} />;
    case 'MANAGER':
      return <ManagerDashboard profile={profile} />;
    case 'ASISTEN':
      return <AsistenDashboard profile={profile} />;
    case 'MANDOR':
      return <MandorDashboard profile={profile} />;
    case 'SATPAM':
      return <SatpamDashboard profile={profile} />;
    default:
      return <div>Unknown role: {user.role}</div>;
  }
};
```

## Security Best Practices

### 1. Secure Token Storage

```typescript
// utils/secureStorage.ts
class SecureStorage {
  private static isSecureContext(): boolean {
    return window.isSecureContext || location.protocol === 'https:';
  }

  static setItem(key: string, value: string, options: { 
    secure?: boolean; 
    httpOnly?: boolean; 
    sameSite?: 'strict' | 'lax' | 'none' 
  } = {}) {
    if (this.isSecureContext() && options.secure) {
      // Use secure cookie storage for sensitive data
      document.cookie = `${key}=${value}; Secure; SameSite=${options.sameSite || 'strict'}${options.httpOnly ? '; HttpOnly' : ''}`;
    } else {
      // Fallback to localStorage for development
      localStorage.setItem(key, value);
    }
  }

  static getItem(key: string): string | null {
    if (this.isSecureContext()) {
      // Try to get from cookie first
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === key) {
          return value;
        }
      }
    }
    
    // Fallback to localStorage
    return localStorage.getItem(key);
  }

  static removeItem(key: string) {
    // Remove from both cookie and localStorage
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    localStorage.removeItem(key);
  }
}
```

### 2. CSRF Protection

```typescript
// utils/csrfProtection.ts
export class CSRFProtection {
  private static csrfToken: string | null = null;

  static async getCSRFToken(): Promise<string> {
    if (this.csrfToken) {
      return this.csrfToken;
    }

    try {
      const response = await fetch('/api/csrf-token', {
        credentials: 'include',
      });
      const { token } = await response.json();
      this.csrfToken = token;
      return token;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      throw error;
    }
  }

  static async addCSRFHeader(headers: Record<string, string> = {}): Promise<Record<string, string>> {
    try {
      const token = await this.getCSRFToken();
      return {
        ...headers,
        'X-CSRF-Token': token,
      };
    } catch {
      return headers;
    }
  }
}
```

### 3. Request Validation

```typescript
// utils/requestValidation.ts
export class RequestValidator {
  static validateInput(input: any, schema: any): boolean {
    // Implement input validation using joi, yup, or zod
    return true; // Placeholder
  }

  static sanitizeInput(input: string): string {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .trim();
  }

  static validatePermissions(userRole: string, requiredPermissions: string[]): boolean {
    const rolePermissions: Record<string, string[]> = {
      'SUPER_ADMIN': ['*'],
      'COMPANY_ADMIN': ['company:read', 'company:write', 'users:read', 'users:write'],
      'AREA_MANAGER': ['company:read', 'estates:read', 'harvest:read'],
      'MANAGER': ['estates:read', 'harvest:read', 'reports:read'],
      'ASISTEN': ['harvest:read', 'harvest:approve', 'harvest:reject'],
      'MANDOR': ['harvest:create', 'harvest:read'],
      'SATPAM': ['gatecheck:create', 'gatecheck:read', 'gatecheck:approve'],
    };

    const userPermissions = rolePermissions[userRole] || [];
    
    // Check for wildcard permission
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check if user has all required permissions
    return requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
  }
}
```

This web client integration guide provides a comprehensive foundation for implementing the GraphQL authentication system in web applications, with proper security measures, role-based access control, and error handling.
// Configuration for authentication method
export const authConfig = {
  // Enable cookie-based authentication (httpOnly cookies)
  useCookieAuth: process.env.NEXT_PUBLIC_USE_COOKIE_AUTH === 'true' || process.env.NODE_ENV === 'production',
  
  // Enable secure storage (memory + sessionStorage) for JWT tokens
  useSecureStorage: process.env.NEXT_PUBLIC_USE_SECURE_STORAGE === 'true' || process.env.NODE_ENV === 'production',
  
  // Development fallback to localStorage for convenience
  allowLocalStorage: process.env.NODE_ENV === 'development',
  
  // CSRF protection configuration
  csrfProtection: {
    enabled: true,
    headerName: 'x-csrf-token',
    cookieName: 'csrf_token',
  },
  
  // Session monitoring configuration
  sessionMonitoring: {
    enabled: true,
    checkInterval: 5 * 60 * 1000, // 5 minutes
    refreshThreshold: 2 * 60 * 1000, // 2 minutes before expiry
  },
  
  // Cookie configuration
  cookies: {
    sessionName: 'session_token',
    userInfoName: 'user_info',
    csrfName: 'csrf_token',
    domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  },
} as const;

export type AuthConfig = typeof authConfig;
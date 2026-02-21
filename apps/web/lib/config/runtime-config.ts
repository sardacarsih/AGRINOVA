// Runtime configuration detection untuk production debugging

export interface RuntimeConfig {
  apiUrl: string;
  environment: string;
  siteUrl: string;
  debug: boolean;
  useSecureStorage: boolean;
  tokenExpiryMinutes: number;
  refreshTokenBeforeExpiryMinutes: number;
  useProxy: boolean;
  directApiUrl: string;
}

export function getRuntimeConfig(): RuntimeConfig {
  // Detect environment
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Get current hostname to determine environment
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isProductionDomain = hostname === 'agrinova.kskgroup.web.id';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // CRITICAL FIX: Determine API URL with proxy support for cross-port cookie issues
  const useProxy = isLocalhost && isDevelopment && process.env.NEXT_PUBLIC_USE_API_PROXY !== 'false';
  const directApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  
  let apiUrl: string;
  
  if (isProductionDomain) {
    // Force production API when on production domain
    apiUrl = 'https://api.kskgroup.web.id/api/v1';
  } else if (isLocalhost && useProxy) {
    // CRITICAL FIX: Use proxy API for development to solve cross-port cookie issues
    apiUrl = '/api'; // Proxy endpoints through Next.js API routes
  } else if (isLocalhost) {
    // Direct API access (fallback or if proxy disabled)
    apiUrl = directApiUrl;
  } else {
    // Fallback to environment variable
    apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  }
  
  const config: RuntimeConfig = {
    apiUrl,
    environment: isProduction ? 'production' : isDevelopment ? 'development' : 'unknown',
    siteUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    debug: !isProduction || isLocalhost, // Enable debug on development or localhost
    useSecureStorage: process.env.NEXT_PUBLIC_USE_SECURE_STORAGE === 'true' || isProduction,
    tokenExpiryMinutes: parseInt(process.env.NEXT_PUBLIC_TOKEN_EXPIRY_MINUTES || '15'),
    refreshTokenBeforeExpiryMinutes: parseInt(process.env.NEXT_PUBLIC_REFRESH_BEFORE_EXPIRY_MINUTES || '2'),
    useProxy,
    directApiUrl,
  };
  
  // Log configuration in browser
  if (typeof window !== 'undefined') {
    console.group('🔧 Runtime Configuration (Enhanced with Proxy Support)');
    console.log('🌐 Hostname:', hostname);
    console.log('🏠 Environment:', config.environment);
    console.log('🔗 API URL:', config.apiUrl);
    console.log('🔄 Using Proxy:', config.useProxy ? '✅ YES (solves cross-port cookies)' : '❌ NO');
    console.log('🎯 Direct API URL:', config.directApiUrl);
    console.log('📍 Site URL:', config.siteUrl);
    console.log('🐛 Debug Mode:', config.debug);
    console.log('🔒 Secure Storage:', config.useSecureStorage);
    console.log('⏱️ Token Expiry:', config.tokenExpiryMinutes, 'minutes');
    console.log('🔄 Refresh Before Expiry:', config.refreshTokenBeforeExpiryMinutes, 'minutes');
    console.log('📦 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔑 NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('🚫 NEXT_PUBLIC_USE_API_PROXY:', process.env.NEXT_PUBLIC_USE_API_PROXY);
    if (config.useProxy) {
      console.log('🎉 PROXY MODE: All API calls will go through /api/* (same-origin)');
      console.log('🍪 COOKIES: Will work normally due to same-origin requests');
    }
    console.groupEnd();
  }
  
  return config;
}

// Export singleton
export const runtimeConfig = getRuntimeConfig();

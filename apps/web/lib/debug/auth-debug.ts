// Authentication Debug Helper
// This file helps debug cookie-based authentication issues

export class AuthDebugger {
  static logCookieStatus(context: string = 'unknown', suppressNormalErrors: boolean = false) {
    if (typeof document === 'undefined') {
      console.log(`[AuthDebug:${context}] Running in SSR - no cookies available`);
      return [];
    }

    const cookies = document.cookie;
    const cookiePairs = cookies.split(';').map(c => c.trim()).filter(c => c.length > 0);
    const cookieMap: Record<string, string> = {};
    
    cookiePairs.forEach(pair => {
      const [name, value] = pair.split('=');
      if (name && value) {
        cookieMap[name] = value;
      }
    });

    // Only log detailed info in development or when explicitly requested
    if (process.env.NODE_ENV === 'development' || !suppressNormalErrors) {
      console.log(`[AuthDebug:${context}] Cookie Status:`, {
        totalCookies: cookiePairs.length,
        cookieNames: Object.keys(cookieMap),
        hasSessionToken: 'session_token' in cookieMap,
        hasCSRFToken: 'XSRF-TOKEN' in cookieMap,
        hasUserInfo: 'user_info' in cookieMap,
        sessionTokenPreview: cookieMap.session_token ? cookieMap.session_token.substring(0, 20) + '...' : 'not found',
        csrfTokenPreview: cookieMap['XSRF-TOKEN'] ? cookieMap['XSRF-TOKEN'].substring(0, 20) + '...' : 'not found',
        domain: window.location.hostname,
        path: window.location.pathname,
        protocol: window.location.protocol,
        timestamp: new Date().toISOString()
      });
    }

    // Check for common issues
    const issues = [];
    const isLoginPage = window.location.pathname === '/login';
    const isPublicRoute = ['/login', '/forgot-password', '/reset-password'].some(route => 
      window.location.pathname.startsWith(route)
    );
    
    if (!cookieMap.session_token && !isPublicRoute) {
      issues.push('Missing session_token cookie - API requests will fail');
    }
    if (!cookieMap['XSRF-TOKEN'] && !isPublicRoute) {
      issues.push('Missing XSRF-TOKEN cookie - CSRF protection may fail');
    }
    if (window.location.protocol === 'http:' && cookieMap.session_token) {
      issues.push('Running on HTTP but have secure cookies - may not work properly');
    }

    // Only show issues if they're relevant and not normal expected behavior
    if (issues.length > 0 && !isPublicRoute && !suppressNormalErrors) {
      console.warn(`[AuthDebug:${context}] Authentication issues detected:`, issues);
    }
    
    return issues;
  }

  static async testAPICall(endpoint: string = '/api/v1/companies') {
    console.log(`[AuthDebug] Testing API call to ${endpoint}`);
    
    const issues = this.logCookieStatus('before-api-call', true);
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-platform': 'WEB'
        }
      });

      console.log(`[AuthDebug] API Response:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`[AuthDebug] API Error Response:`, errorData);
        
        // If there are cookie issues and API fails, provide helpful guidance
        if (issues.length > 0 && response.status === 401) {
          console.error(`[AuthDebug] 🔧 AUTHENTICATION PROBLEM DETECTED:`);
          console.error('   This 401 error combined with missing cookies suggests:');
          console.error('   1. User may not be properly logged in');
          console.error('   2. Cookies may not have been set during login');
          console.error('   3. Browser may be blocking cookies due to CORS/SameSite settings');
          console.error('   4. API server may not be properly setting cookies');
        }
      } else {
        console.log(`[AuthDebug] ✅ API call successful!`);
      }
    } catch (error) {
      console.error(`[AuthDebug] API call failed:`, error);
    }
  }

  static monitorCookieChanges() {
    if (typeof document === 'undefined') return;

    let lastCookies = document.cookie;
    
    const checkCookies = () => {
      const currentCookies = document.cookie;
      if (currentCookies !== lastCookies) {
        console.log('[AuthDebug] Cookie change detected:', {
          before: lastCookies.substring(0, 100) + (lastCookies.length > 100 ? '...' : ''),
          after: currentCookies.substring(0, 100) + (currentCookies.length > 100 ? '...' : ''),
          timestamp: new Date().toISOString()
        });
        lastCookies = currentCookies;
        this.logCookieStatus('cookie-change');
      }
    };

    // Check every 1 second for cookie changes
    const interval = setInterval(checkCookies, 1000);
    
    console.log('[AuthDebug] Started monitoring cookie changes');
    
    // Return cleanup function
    return () => {
      clearInterval(interval);
      console.log('[AuthDebug] Stopped monitoring cookie changes');
    };
  }
}

// Global debug helper - can be called from browser console
if (typeof window !== 'undefined') {
  (window as any).authDebug = AuthDebugger;
}
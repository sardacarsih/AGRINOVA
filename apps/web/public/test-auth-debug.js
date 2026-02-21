// Authentication Debug Helper Script
// Add this to browser console to debug login issues
console.log('🔧 Agrinova Authentication Debug Helper Loaded');

const AuthDebug = {
  // Check current cookie status
  checkCookies() {
    console.log('🍪 === COOKIE STATUS ===');
    const allCookies = document.cookie;
    console.log('All cookies:', allCookies);
    
    const cookies = {
      session_token: document.cookie.split(';').find(c => c.trim().startsWith('session_token=')),
      'XSRF-TOKEN': document.cookie.split(';').find(c => c.trim().startsWith('XSRF-TOKEN=')),
      user_info: document.cookie.split(';').find(c => c.trim().startsWith('user_info=')),
      'auth-session': document.cookie.split(';').find(c => c.trim().startsWith('auth-session='))
    };
    
    Object.entries(cookies).forEach(([name, value]) => {
      if (value) {
        console.log(`✅ ${name}:`, value.substring(0, 50) + '...');
      } else {
        console.log(`❌ ${name}: Not found`);
      }
    });
    
    return cookies;
  },

  // Check session storage
  checkSessionStorage() {
    console.log('💾 === SESSION STORAGE ===');
    const tokens = {
      agrinova_jwt_access: sessionStorage.getItem('agrinova_jwt_access'),
      agrinova_jwt_refresh: sessionStorage.getItem('agrinova_jwt_refresh'),
      agrinova_device_id: sessionStorage.getItem('agrinova_device_id')
    };
    
    Object.entries(tokens).forEach(([name, value]) => {
      if (value) {
        console.log(`✅ ${name}:`, value.substring(0, 50) + '...');
      } else {
        console.log(`❌ ${name}: Not found`);
      }
    });
    
    return tokens;
  },

  // Test API endpoint with current authentication
  async testAPICall(endpoint = '/companies') {
    console.log(`🔍 === TESTING API CALL: ${endpoint} ===`);
    
    try {
      const response = await fetch(`/api/v1${endpoint}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('Response data:', data);
      
      return { success: response.ok, status: response.status, data };
    } catch (error) {
      console.error('API call failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Extract and validate JWT from cookies
  validateJWTFromCookies() {
    console.log('🔐 === JWT VALIDATION FROM COOKIES ===');
    
    const sessionTokenCookie = document.cookie.split(';')
      .find(c => c.trim().startsWith('session_token='));
    
    if (!sessionTokenCookie) {
      console.log('❌ No session_token cookie found');
      return null;
    }
    
    const token = sessionTokenCookie.split('=')[1];
    const decodedToken = decodeURIComponent(token);
    
    console.log('Token length:', decodedToken.length);
    console.log('Token format:', decodedToken.split('.').length === 3 ? 'Valid JWT format' : 'Invalid JWT format');
    
    if (decodedToken.split('.').length === 3) {
      try {
        const payload = JSON.parse(atob(decodedToken.split('.')[1]));
        console.log('JWT payload:', payload);
        
        const currentTime = Math.floor(Date.now() / 1000);
        const isExpired = payload.exp <= currentTime;
        console.log('Token expired:', isExpired);
        console.log('Expires at:', new Date(payload.exp * 1000));
        
        return { valid: !isExpired, payload };
      } catch (error) {
        console.error('Error parsing JWT:', error);
        return null;
      }
    }
    
    return null;
  },

  // Full authentication debug check
  async fullCheck() {
    console.log('🚀 === FULL AUTHENTICATION DEBUG ===');
    
    this.checkCookies();
    this.checkSessionStorage();
    this.validateJWTFromCookies();
    
    console.log('📡 Testing API calls...');
    await this.testAPICall('/auth/web/me');
    await this.testAPICall('/companies');
    
    console.log('🏁 Debug check complete');
  },

  // Simulate login and track cookie setting
  async simulateLogin(username = 'admin', password = 'demo123') {
    console.log('🔐 === SIMULATING LOGIN ===');
    console.log('Credentials:', { username, password });
    
    // Clear existing auth state
    this.clearAuth();
    
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-platform': 'WEB',
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          password,
          rememberMe: false,
          platform: 'WEB'
        })
      });
      
      console.log('Login response status:', response.status);
      console.log('Set-Cookie headers:', response.headers.get('set-cookie'));
      
      const data = await response.json();
      console.log('Login response data:', data);
      
      // Wait a moment then check cookies
      setTimeout(() => {
        console.log('🍪 Post-login cookie check:');
        this.checkCookies();
        this.validateJWTFromCookies();
      }, 100);
      
      return data;
    } catch (error) {
      console.error('Login simulation failed:', error);
      return null;
    }
  },

  // Clear all authentication data
  clearAuth() {
    console.log('🧹 === CLEARING AUTHENTICATION DATA ===');
    
    // Clear cookies (best effort)
    const cookies = ['session_token', 'XSRF-TOKEN', 'user_info', 'auth-session'];
    cookies.forEach(name => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
    
    // Clear session storage
    ['agrinova_jwt_access', 'agrinova_jwt_refresh', 'agrinova_device_id'].forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    console.log('✅ Authentication data cleared');
  }
};

// Make it globally available
window.AuthDebug = AuthDebug;

console.log('🎯 Usage:');
console.log('  AuthDebug.fullCheck() - Complete authentication check');
console.log('  AuthDebug.checkCookies() - Check current cookies');
console.log('  AuthDebug.validateJWTFromCookies() - Validate JWT from cookies');
console.log('  AuthDebug.testAPICall("/companies") - Test API call');
console.log('  AuthDebug.simulateLogin() - Simulate login process');
console.log('  AuthDebug.clearAuth() - Clear all auth data');
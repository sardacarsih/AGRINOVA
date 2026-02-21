// Cross-Port Cookie Authentication Test Script
// This script tests the enhanced cookie authentication system

console.log('🍪 CROSS-PORT COOKIE AUTHENTICATION TEST');
console.log('==========================================');

class CrossPortCookieTest {
  constructor() {
    this.apiUrl = 'http://localhost:3001/api/v1';
    this.frontendUrl = 'http://localhost:3000';
  }

  // Test 1: Current cookie status
  getCurrentCookieStatus() {
    console.log('📋 Test 1: Current Cookie Status Analysis');
    
    const allCookies = document.cookie;
    const cookies = this.parseCookies(allCookies);
    
    const status = {
      hasSessionToken: allCookies.includes('session_token='),
      hasSessionTokenAlt: allCookies.includes('session_token_alt='),
      hasUserInfo: allCookies.includes('user_info='),
      totalCookies: Object.keys(cookies).length,
      cookies: cookies,
      domain: window.location.hostname,
      protocol: window.location.protocol,
      port: window.location.port || (window.location.protocol === 'https:' ? '443' : '80')
    };
    
    console.log('  Cookie Analysis:', status);
    
    if (status.hasSessionToken || status.hasSessionTokenAlt) {
      console.log('  ✅ Authentication cookies found');
    } else {
      console.log('  ❌ No authentication cookies found');
    }
    
    return status;
  }

  // Test 2: Test API call with current cookies
  async testApiCallWithCookies() {
    console.log('🌐 Test 2: API Call with Current Cookies');
    
    try {
      const response = await fetch(`${this.apiUrl}/companies`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-platform': 'WEB'
        }
      });
      
      console.log('  API Response Status:', response.status, response.statusText);
      console.log('  Response Headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('  ✅ API call successful - authentication working');
        console.log('  Response data:', data);
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('  ❌ API call failed:', errorData);
        return false;
      }
    } catch (error) {
      console.error('  ❌ API call error:', error);
      return false;
    }
  }

  // Test 3: Comprehensive authentication test
  async testFullAuthenticationFlow(username, password) {
    console.log('🔐 Test 3: Full Authentication Flow Test');
    console.log(`  Testing with username: ${username}`);
    
    try {
      // Step 1: Login
      const loginResponse = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-platform': 'WEB'
        },
        body: JSON.stringify({
          username: username,
          password: password,
          platform: 'WEB'
        })
      });
      
      console.log('  Login Response Status:', loginResponse.status, loginResponse.statusText);
      console.log('  Login Response Headers:', Object.fromEntries(loginResponse.headers.entries()));
      
      if (!loginResponse.ok) {
        const errorData = await loginResponse.json().catch(() => ({}));
        console.log('  ❌ Login failed:', errorData);
        return false;
      }
      
      const loginData = await loginResponse.json();
      console.log('  ✅ Login successful:', loginData);
      
      // Step 2: Wait for cookies to be set and check
      await this.waitAndCheckCookies(loginResponse);
      
      // Step 3: Test API call after login
      const apiSuccess = await this.testApiCallWithCookies();
      
      return apiSuccess;
      
    } catch (error) {
      console.error('  ❌ Authentication flow error:', error);
      return false;
    }
  }

  // Wait for cookies and check multiple strategies
  async waitAndCheckCookies(loginResponse) {
    console.log('⏱️ Test 4: Cookie Reception Analysis');
    
    const maxRetries = 5;
    const delays = [100, 250, 500, 1000, 2000];
    
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, delays[i]));
      
      const cookieStatus = this.getCurrentCookieStatus();
      const customHeader = loginResponse.headers.get('x-session-token');
      
      console.log(`  Attempt ${i + 1}/${maxRetries} (${delays[i]}ms delay):`, {
        hasSessionToken: cookieStatus.hasSessionToken,
        hasSessionTokenAlt: cookieStatus.hasSessionTokenAlt,
        hasCustomHeader: !!customHeader,
        cookieCount: cookieStatus.totalCookies
      });
      
      if (cookieStatus.hasSessionToken || cookieStatus.hasSessionTokenAlt || customHeader) {
        console.log('  ✅ Authentication method found:');
        if (cookieStatus.hasSessionToken) console.log('    - Standard session_token cookie');
        if (cookieStatus.hasSessionTokenAlt) console.log('    - Alternative session_token_alt cookie');
        if (customHeader) console.log('    - Custom X-Session-Token header');
        return true;
      }
    }
    
    console.log('  ❌ No authentication method found after all retries');
    return false;
  }

  // Test 5: Browser compatibility check
  getBrowserCompatibilityInfo() {
    console.log('🛡️ Test 5: Browser Compatibility Information');
    
    const info = {
      userAgent: navigator.userAgent,
      cookieEnabled: navigator.cookieEnabled,
      language: navigator.language,
      platform: navigator.platform,
      origin: window.location.origin,
      hostname: window.location.hostname,
      port: window.location.port,
      protocol: window.location.protocol,
      sameOriginWithAPI: window.location.origin === 'http://localhost:3001',
      crossOriginWithAPI: window.location.origin !== 'http://localhost:3001'
    };
    
    console.log('  Browser Info:', info);
    
    if (info.crossOriginWithAPI) {
      console.log('  ⚠️ Cross-origin configuration detected');
      console.log('    Frontend:', window.location.origin);
      console.log('    API:', 'http://localhost:3001');
      console.log('    This requires special cookie handling');
    }
    
    return info;
  }

  // Utility: Parse cookies
  parseCookies(cookieString = document.cookie) {
    return cookieString.split(';').reduce((cookies, cookie) => {
      const [name, ...rest] = cookie.split('=');
      const value = rest.join('=').trim();
      if (name.trim()) {
        cookies[name.trim()] = value;
      }
      return cookies;
    }, {});
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Running All Cross-Port Cookie Tests');
    console.log('=====================================');
    
    // Test 1: Current status
    this.getCurrentCookieStatus();
    
    // Test 2: API call test
    await this.testApiCallWithCookies();
    
    // Test 5: Browser info
    this.getBrowserCompatibilityInfo();
    
    console.log('📋 Test Summary Complete');
    console.log('========================');
    console.log('To test full authentication flow, use:');
    console.log('  testCrossPortAuth.testFullAuthenticationFlow("username", "password")');
  }

  // Manual login test function
  async manualLoginTest() {
    const username = prompt('Enter username (or press Cancel to skip):');
    if (!username) {
      console.log('Manual login test skipped');
      return;
    }
    
    const password = prompt('Enter password:');
    if (!password) {
      console.log('Manual login test skipped - no password provided');
      return;
    }
    
    return await this.testFullAuthenticationFlow(username, password);
  }
}

// Create global instance
const testCrossPortAuth = new CrossPortCookieTest();

// Auto-run basic tests
testCrossPortAuth.runAllTests();

// Export for manual testing
window.testCrossPortAuth = testCrossPortAuth;

console.log('📝 Available Manual Tests:');
console.log('  testCrossPortAuth.getCurrentCookieStatus() - Check current cookies');
console.log('  testCrossPortAuth.testApiCallWithCookies() - Test API with current auth');
console.log('  testCrossPortAuth.testFullAuthenticationFlow(username, password) - Full test');
console.log('  testCrossPortAuth.manualLoginTest() - Interactive login test');
console.log('  testCrossPortAuth.getBrowserCompatibilityInfo() - Browser info');
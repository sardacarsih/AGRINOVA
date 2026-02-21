// Proxy Authentication Test Script
// This script tests the new API proxy system that solves cross-port cookie issues

console.log('🔄 PROXY AUTHENTICATION SYSTEM TEST');
console.log('====================================');

class ProxyAuthTest {
  constructor() {
    this.proxyApiUrl = '/api';           // Proxy endpoints
    this.directApiUrl = 'http://localhost:3001/api/v1';  // Direct backend
    this.frontendUrl = window.location.origin;
  }

  // Test 1: Configuration Analysis
  analyzeConfiguration() {
    console.log('📋 Test 1: Configuration Analysis');
    
    const config = {
      currentOrigin: window.location.origin,
      hostname: window.location.hostname,
      port: window.location.port,
      protocol: window.location.protocol,
      userAgent: navigator.userAgent.substring(0, 100) + '...',
      cookieEnabled: navigator.cookieEnabled
    };
    
    console.log('  Browser Configuration:', config);
    
    // Check if we're in the right environment
    const isLocalhost = config.hostname === 'localhost';
    const isPort3000 = config.port === '3000' || config.port === '';
    const isHttps = config.protocol === 'https:';
    
    console.log('  Environment Check:', {
      isLocalhost,
      isPort3000,
      isHttps,
      expectedForProxy: isLocalhost && isPort3000
    });
    
    if (isLocalhost && isPort3000) {
      console.log('  ✅ Environment suitable for proxy mode');
    } else {
      console.log('  ⚠️ Unexpected environment - proxy may not be needed');
    }
    
    return config;
  }

  // Test 2: Proxy Connectivity Test
  async testProxyConnectivity() {
    console.log('🔄 Test 2: Proxy Connectivity Test');
    
    try {
      // Test proxy health endpoint
      const response = await fetch('/api/health', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('  Proxy Health Check:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('  ✅ Proxy connectivity successful');
        console.log('  Health data:', data);
        return true;
      } else {
        console.log('  ❌ Proxy connectivity failed');
        return false;
      }
    } catch (error) {
      console.error('  ❌ Proxy connectivity error:', error);
      return false;
    }
  }

  // Test 3: Cookie Status Analysis
  analyzeCookieStatus() {
    console.log('🍪 Test 3: Cookie Status Analysis');
    
    const cookies = this.parseCookies();
    const cookieAnalysis = {
      totalCookies: Object.keys(cookies).length,
      hasSessionToken: document.cookie.includes('session_token='),
      hasSessionTokenAlt: document.cookie.includes('session_token_alt='),
      hasUserInfo: document.cookie.includes('user_info='),
      cookieNames: Object.keys(cookies),
      relevantCookies: {}
    };
    
    // Extract relevant auth cookies
    ['session_token', 'session_token_alt', 'user_info'].forEach(name => {
      if (cookies[name]) {
        cookieAnalysis.relevantCookies[name] = `Present (${cookies[name].length} chars)`;
      }
    });
    
    console.log('  Cookie Analysis:', cookieAnalysis);
    
    if (cookieAnalysis.hasSessionToken || cookieAnalysis.hasSessionTokenAlt) {
      console.log('  ✅ Authentication cookies found');
    } else {
      console.log('  ❌ No authentication cookies found - login required');
    }
    
    return cookieAnalysis;
  }

  // Test 4: Proxy Authentication Test
  async testProxyAuthentication() {
    console.log('🔐 Test 4: Proxy Authentication Test');
    
    try {
      // Test protected endpoint through proxy
      const response = await fetch('/api/companies', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-platform': 'WEB'
        }
      });
      
      console.log('  Authentication Test Result:', {
        status: response.status,
        statusText: response.statusText,
        isAuthenticated: response.status === 200,
        responseHeaders: Object.fromEntries(response.headers.entries())
      });
      
      if (response.status === 200) {
        const data = await response.json();
        console.log('  ✅ Proxy authentication successful');
        console.log('  API Response:', data);
        return true;
      } else if (response.status === 401) {
        console.log('  ❌ Authentication failed - login required');
        const errorData = await response.json().catch(() => ({}));
        console.log('  Error details:', errorData);
        return false;
      } else {
        console.log('  ❌ Unexpected response status');
        return false;
      }
    } catch (error) {
      console.error('  ❌ Proxy authentication error:', error);
      return false;
    }
  }

  // Test 5: Login Through Proxy
  async testProxyLogin(username, password) {
    console.log('🔐 Test 5: Login Through Proxy');
    console.log(`  Testing login with username: ${username}`);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-platform': 'WEB'
        },
        body: JSON.stringify({
          username,
          password,
          platform: 'WEB'
        })
      });
      
      console.log('  Login Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (response.ok) {
        const loginData = await response.json();
        console.log('  ✅ Proxy login successful');
        console.log('  Login data:', loginData);
        
        // Wait for cookies to be set
        setTimeout(() => {
          console.log('  🍪 Cookies after login:');
          this.analyzeCookieStatus();
        }, 500);
        
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('  ❌ Proxy login failed:', errorData);
        return false;
      }
    } catch (error) {
      console.error('  ❌ Proxy login error:', error);
      return false;
    }
  }

  // Test 6: Compare Direct vs Proxy
  async compareDirectVsProxy() {
    console.log('📊 Test 6: Direct vs Proxy Comparison');
    
    const results = {
      proxy: { available: false, authenticated: false },
      direct: { available: false, authenticated: false }
    };
    
    // Test proxy endpoint
    try {
      const proxyResponse = await fetch('/api/companies', {
        method: 'GET',
        credentials: 'include'
      });
      results.proxy.available = true;
      results.proxy.authenticated = proxyResponse.status === 200;
      results.proxy.status = proxyResponse.status;
    } catch (error) {
      results.proxy.error = error.message;
    }
    
    // Test direct endpoint
    try {
      const directResponse = await fetch('http://localhost:3001/api/v1/companies', {
        method: 'GET',
        credentials: 'include'
      });
      results.direct.available = true;
      results.direct.authenticated = directResponse.status === 200;
      results.direct.status = directResponse.status;
    } catch (error) {
      results.direct.error = error.message;
    }
    
    console.log('  Comparison Results:', results);
    
    if (results.proxy.authenticated && !results.direct.authenticated) {
      console.log('  ✅ PROXY SUCCESS: Proxy authentication works, direct fails');
      console.log('     This confirms the proxy solves cross-port cookie issues');
    } else if (results.direct.authenticated && !results.proxy.authenticated) {
      console.log('  ⚠️ DIRECT SUCCESS: Direct works, proxy fails');
      console.log('     Proxy may need debugging');
    } else if (results.proxy.authenticated && results.direct.authenticated) {
      console.log('  ✅ BOTH WORK: Both proxy and direct authentication work');
    } else {
      console.log('  ❌ BOTH FAIL: Neither proxy nor direct authentication work');
      console.log('     Login may be required');
    }
    
    return results;
  }

  // Utility: Parse cookies
  parseCookies(cookieString = document.cookie) {
    return cookieString.split(';').reduce((cookies, cookie) => {
      const [name, ...rest] = cookie.split('=');
      const value = rest.join('=').trim();
      if (name && name.trim()) {
        cookies[name.trim()] = value;
      }
      return cookies;
    }, {});
  }

  // Interactive login test
  async interactiveLoginTest() {
    console.log('🎮 Interactive Login Test');
    
    const username = prompt('Enter username for proxy login test:');
    if (!username) {
      console.log('  Login test cancelled');
      return;
    }
    
    const password = prompt('Enter password:');
    if (!password) {
      console.log('  Login test cancelled - no password');
      return;
    }
    
    return await this.testProxyLogin(username, password);
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Running All Proxy Authentication Tests');
    console.log('=========================================');
    
    // Sequential test execution
    this.analyzeConfiguration();
    console.log('');
    
    const proxyConnectivity = await this.testProxyConnectivity();
    console.log('');
    
    this.analyzeCookieStatus();
    console.log('');
    
    const authTest = await this.testProxyAuthentication();
    console.log('');
    
    const comparison = await this.compareDirectVsProxy();
    console.log('');
    
    // Summary
    console.log('📋 Test Summary');
    console.log('===============');
    console.log(`  Proxy Connectivity: ${proxyConnectivity ? '✅' : '❌'}`);
    console.log(`  Proxy Authentication: ${authTest ? '✅' : '❌'}`);
    console.log(`  Cross-port Issue Solved: ${comparison.proxy.authenticated && !comparison.direct.authenticated ? '✅' : '❓'}`);
    
    if (proxyConnectivity && authTest) {
      console.log('  🎉 PROXY SYSTEM WORKING! Cross-port cookie authentication solved.');
    } else if (proxyConnectivity && !authTest) {
      console.log('  ⚠️ Proxy working but authentication failed - login required');
      console.log('  💡 Try: proxyAuthTest.interactiveLoginTest()');
    } else {
      console.log('  ❌ Proxy system needs debugging');
    }
  }
}

// Create global instance
const proxyAuthTest = new ProxyAuthTest();

// Auto-run basic tests
proxyAuthTest.runAllTests();

// Export for manual testing
window.proxyAuthTest = proxyAuthTest;

console.log('');
console.log('📝 Available Manual Tests:');
console.log('  proxyAuthTest.runAllTests() - Run complete test suite');
console.log('  proxyAuthTest.testProxyAuthentication() - Test current auth status');
console.log('  proxyAuthTest.interactiveLoginTest() - Interactive login test');
console.log('  proxyAuthTest.compareDirectVsProxy() - Compare proxy vs direct API');
console.log('  proxyAuthTest.analyzeCookieStatus() - Check current cookies');
console.log('  proxyAuthTest.testProxyConnectivity() - Test proxy connection');
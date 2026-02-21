/**
 * Comprehensive Cookie Authentication Test Suite
 * This script tests the entire authentication flow and diagnoses cookie issues
 */

class CookieAuthTester {
  constructor() {
    this.API_BASE_URL = 'http://localhost:3001/api/v1';
    this.results = {};
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌',
      'debug': '🔍'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCookieMap() {
    if (typeof document === 'undefined') return {};
    
    const cookies = document.cookie;
    const cookieMap = {};
    
    if (cookies) {
      cookies.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          cookieMap[name] = value;
        }
      });
    }
    
    return cookieMap;
  }

  analyzeCookies() {
    const cookieMap = this.getCookieMap();
    const analysis = {
      totalCookies: Object.keys(cookieMap).length,
      hasSessionToken: 'session_token' in cookieMap,
      hasUserInfo: 'user_info' in cookieMap,
      hasCSRFToken: 'XSRF-TOKEN' in cookieMap,
      cookieNames: Object.keys(cookieMap),
      domain: window.location.hostname,
      protocol: window.location.protocol,
      path: window.location.pathname
    };

    this.log('Cookie Analysis:', 'debug');
    console.table(analysis);
    
    return analysis;
  }

  async testEndpoint(endpoint, method = 'GET', body = null, description = '') {
    this.log(`Testing ${method} ${endpoint} ${description}`, 'debug');
    
    try {
      const options = {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-platform': 'WEB'
        }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.API_BASE_URL}${endpoint}`, options);
      
      const result = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      };

      if (response.ok) {
        try {
          const data = await response.json();
          result.data = data;
          this.log(`✅ ${endpoint} SUCCESS (${response.status})`, 'success');
        } catch (e) {
          this.log(`✅ ${endpoint} SUCCESS (${response.status}) - No JSON response`, 'success');
        }
      } else {
        try {
          const errorData = await response.text();
          result.error = errorData;
          this.log(`❌ ${endpoint} FAILED (${response.status}): ${response.statusText}`, 'error');
        } catch (e) {
          this.log(`❌ ${endpoint} FAILED (${response.status}): ${response.statusText}`, 'error');
        }
      }

      return result;
    } catch (error) {
      this.log(`❌ ${endpoint} NETWORK ERROR: ${error.message}`, 'error');
      return {
        status: 0,
        error: error.message,
        networkError: true
      };
    }
  }

  async runComprehensiveTest() {
    this.log('🚀 Starting Comprehensive Cookie Authentication Test', 'info');
    
    // Step 1: Initial cookie analysis
    this.log('\n📊 Step 1: Initial Cookie Analysis', 'info');
    const initialCookies = this.analyzeCookies();
    this.results.initialCookies = initialCookies;

    // Step 2: Test login endpoint
    this.log('\n🔐 Step 2: Testing Login Endpoint', 'info');
    const loginResult = await this.testEndpoint('/auth/login', 'POST', {
      username: 'superadmin@agrinova.com',
      password: 'superadmin123'
    }, '(unified login endpoint)');
    
    this.results.login = loginResult;

    if (loginResult.ok) {
      this.log('Login successful, waiting for cookies to be set...', 'info');
      await this.sleep(200); // Give time for cookies to be processed
      
      // Step 3: Post-login cookie analysis
      this.log('\n🍪 Step 3: Post-Login Cookie Analysis', 'info');
      const postLoginCookies = this.analyzeCookies();
      this.results.postLoginCookies = postLoginCookies;
      
      const cookiesSet = postLoginCookies.hasSessionToken || postLoginCookies.hasUserInfo;
      if (cookiesSet) {
        this.log('✅ Cookies detected after login!', 'success');
      } else {
        this.log('⚠️ No authentication cookies detected after login', 'warning');
        this.log('This could indicate a cookie reception issue', 'warning');
      }

      // Step 4: Test user profile endpoint
      this.log('\n👤 Step 4: Testing User Profile Endpoint', 'info');
      const profileResult = await this.testEndpoint('/auth/me', 'GET', null, '(unified user profile endpoint)');
      this.results.profile = profileResult;

      // Step 5: Test protected endpoints
      this.log('\n🏢 Step 5: Testing Protected Endpoints', 'info');
      const companiesResult = await this.testEndpoint('/companies', 'GET', null, '(companies endpoint)');
      this.results.companies = companiesResult;

      // Step 6: WebSocket test (if applicable)
      this.log('\n📡 Step 6: Testing WebSocket Connection', 'info');
      try {
        // Test WebSocket connection to notification service
        const wsUrl = 'ws://localhost:3001/notifications';
        this.log(`Attempting WebSocket connection to ${wsUrl}`, 'debug');
        // This is just a connection test, we won't keep it open
        const ws = new WebSocket(wsUrl);
        
        const wsResult = await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            ws.close();
            resolve({ connected: false, error: 'Connection timeout' });
          }, 3000);

          ws.onopen = () => {
            clearTimeout(timeout);
            this.log('✅ WebSocket connection successful', 'success');
            ws.close();
            resolve({ connected: true });
          };

          ws.onerror = (error) => {
            clearTimeout(timeout);
            this.log('❌ WebSocket connection failed', 'error');
            resolve({ connected: false, error: error.message || 'Connection failed' });
          };
        });
        
        this.results.websocket = wsResult;
      } catch (error) {
        this.log(`❌ WebSocket test error: ${error.message}`, 'error');
        this.results.websocket = { connected: false, error: error.message };
      }

    } else {
      this.log('❌ Login failed, skipping subsequent tests', 'error');
      this.results.loginFailed = true;
    }

    // Step 7: Generate comprehensive report
    this.log('\n📋 Step 7: Generating Comprehensive Report', 'info');
    this.generateReport();
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      browser: {
        userAgent: navigator.userAgent,
        cookieEnabled: navigator.cookieEnabled,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        port: window.location.port
      },
      tests: this.results,
      recommendations: []
    };

    // Analyze results and provide recommendations
    if (this.results.login?.ok) {
      report.recommendations.push('✅ Login endpoint working correctly');
    } else {
      report.recommendations.push('❌ Login endpoint failing - check credentials and API server');
    }

    if (this.results.postLoginCookies?.hasSessionToken) {
      report.recommendations.push('✅ Session cookies being set correctly');
    } else {
      report.recommendations.push('❌ Session cookies not being set - check CORS configuration and cookie settings');
    }

    if (this.results.profile?.ok) {
      report.recommendations.push('✅ User profile endpoint working with cookies');
    } else {
      report.recommendations.push('❌ User profile endpoint failing - cookies may not be sent with requests');
    }

    if (this.results.companies?.ok) {
      report.recommendations.push('✅ Protected endpoints accessible with cookie authentication');
    } else {
      report.recommendations.push('❌ Protected endpoints failing - this is the main issue affecting the super-admin dashboard');
    }

    if (this.results.websocket?.connected) {
      report.recommendations.push('✅ WebSocket connection working');
    } else {
      report.recommendations.push('⚠️ WebSocket connection issues - may affect real-time features');
    }

    // Summary
    const issueCount = report.recommendations.filter(r => r.startsWith('❌')).length;
    const warningCount = report.recommendations.filter(r => r.startsWith('⚠️')).length;
    
    console.log('\n' + '='.repeat(60));
    console.log('🔍 COMPREHENSIVE AUTHENTICATION TEST REPORT');
    console.log('='.repeat(60));
    console.log(`📅 Test Date: ${report.timestamp}`);
    console.log(`🌐 Environment: ${report.browser.protocol}//${report.browser.hostname}:${report.browser.port || 'default'}`);
    console.log(`🔧 Issues Found: ${issueCount}`);
    console.log(`⚠️ Warnings: ${warningCount}`);
    console.log('\n📋 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => console.log(`   ${rec}`));
    
    if (issueCount === 0) {
      console.log('\n🎉 All authentication tests passed! The super-admin dashboard should work correctly.');
    } else {
      console.log(`\n🔧 Found ${issueCount} issues that need to be resolved for proper authentication.`);
    }
    
    console.log('\n📊 Full test results stored in:', 'window.authTestResults');
    window.authTestResults = report;
    
    console.log('='.repeat(60));
  }
}

// Auto-run test when script is loaded
console.log('🧪 Cookie Authentication Test Suite Loaded');
console.log('Run: const tester = new CookieAuthTester(); tester.runComprehensiveTest()');

// Make it available globally for manual testing
window.CookieAuthTester = CookieAuthTester;

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CookieAuthTester;
}
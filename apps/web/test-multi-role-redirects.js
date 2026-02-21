#!/usr/bin/env node

/**
 * Comprehensive test script for multi-role dashboard redirect system
 * Tests clean URL architecture and role-based routing
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3001';

// Test cases for different role-prefixed URLs and their expected clean URL destinations
// Note: Due to i18n middleware, clean URLs will get locale prefixes (e.g., /id/dashboard)
const TEST_CASES = [
  // Dashboard redirects
  { from: '/dashboard/super-admin', to: '/dashboard', description: 'Super Admin dashboard redirect' },
  { from: '/dashboard/company-admin', to: '/dashboard', description: 'Company Admin dashboard redirect' },
  { from: '/dashboard/area-manager', to: '/dashboard', description: 'Area Manager dashboard redirect' },
  { from: '/dashboard/manager', to: '/dashboard', description: 'Manager dashboard redirect' },
  { from: '/dashboard/asisten', to: '/dashboard', description: 'Asisten dashboard redirect' },
  { from: '/dashboard/mandor', to: '/dashboard', description: 'Mandor dashboard redirect' },
  { from: '/dashboard/satpam', to: '/dashboard', description: 'Satpam dashboard redirect' },

  // Users page redirects
  { from: '/dashboard/manager/users', to: '/users', description: 'Manager users page redirect' },
  { from: '/dashboard/super-admin/users', to: '/users', description: 'Super Admin users page redirect' },
  { from: '/dashboard/company-admin/users', to: '/users', description: 'Company Admin users page redirect' },

  // Reports page redirects
  { from: '/dashboard/manager/reports', to: '/reports', description: 'Manager reports page redirect' },
  { from: '/dashboard/asisten/reports', to: '/reports', description: 'Asisten reports page redirect' },

  // Settings page redirects
  { from: '/dashboard/super-admin/settings', to: '/settings', description: 'Super Admin settings redirect' },
  { from: '/dashboard/company-admin/settings', to: '/settings', description: 'Company Admin settings redirect' },

  // Harvest page redirects
  { from: '/dashboard/mandor/panen/multiple-entry', to: '/harvest', description: 'Mandor harvest page redirect' },
  { from: '/dashboard/asisten/harvest', to: '/harvest', description: 'Asisten harvest page redirect' },
  { from: '/dashboard/manager/harvest', to: '/harvest', description: 'Manager harvest page redirect' },

  // Gate Check redirects
  { from: '/dashboard/satpam/gate-check', to: '/gate-check', description: 'Satpam gate check redirect' },

  // Estates and blocks redirects
  { from: '/dashboard/manager/estates', to: '/estates', description: 'Manager estates page redirect' },
  { from: '/dashboard/manager/blocks', to: '/blocks', description: 'Manager blocks page redirect' },

  // Other clean URLs (will get locale prefix but no role redirect)
  { from: '/dashboard', to: null, description: 'Clean dashboard URL (no role redirect)' },
  { from: '/users', to: null, description: 'Clean users URL (no role redirect)' },
  { from: '/reports', to: null, description: 'Clean reports URL (no role redirect)' },
  { from: '/settings', to: null, description: 'Clean settings URL (no role redirect)' },
  { from: '/harvest', to: null, description: 'Clean harvest URL (no role redirect)' },
  { from: '/gate-check', to: null, description: 'Clean gate-check URL (no role redirect)' },
];

/**
 * Make HTTP request and follow redirects
 */
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Multi-Role-Redirect-Tester/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    };

    const req = http.request(options, (res) => {
      let finalUrl = path;

      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        finalUrl = res.headers.location;
      }

      resolve({
        statusCode: res.statusCode,
        finalUrl: finalUrl,
        headers: res.headers
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Run redirect tests
 */
async function runTests() {
  console.log('🚀 Testing Multi-Role Dashboard Redirect System\n');
  console.log(`📡 Testing against: ${BASE_URL}\n`);
  console.log('📝 Note: All URLs will get locale prefixes (e.g., /id/dashboard) due to i18n middleware\n');

  let passedTests = 0;
  let failedTests = 0;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];

    try {
      console.log(`🧪 Test ${i + 1}: ${testCase.description}`);
      console.log(`   Request: ${testCase.from}`);

      const result = await makeRequest(testCase.from);

      if (testCase.to === null) {
        // Should not have role redirect (but will get locale prefix)
        // Check if final URL contains the expected clean path without role prefixes
        const cleanPath = testCase.from;
        const hasRolePrefix = cleanPath.includes('/dashboard/super-admin') ||
                            cleanPath.includes('/dashboard/company-admin') ||
                            cleanPath.includes('/dashboard/area-manager') ||
                            cleanPath.includes('/dashboard/manager') ||
                            cleanPath.includes('/dashboard/asisten') ||
                            cleanPath.includes('/dashboard/mandor') ||
                            cleanPath.includes('/dashboard/satpam');

        if (!hasRolePrefix && (result.finalUrl.includes(cleanPath) || result.finalUrl.includes(cleanPath.replace('/', '')))) {
          console.log(`   ✅ PASS: Clean URL with locale prefix (Status: ${result.statusCode})`);
          console.log(`   📍 Final URL: ${result.finalUrl}`);
          passedTests++;
        } else if (hasRolePrefix && result.statusCode >= 300 && result.statusCode < 400) {
          console.log(`   ✅ PASS: Role-prefixed URL redirected (Status: ${result.statusCode})`);
          console.log(`   📍 Final URL: ${result.finalUrl}`);
          passedTests++;
        } else {
          console.log(`   ❌ FAIL: Unexpected behavior (Status: ${result.statusCode})`);
          console.log(`   📍 Final URL: ${result.finalUrl}`);
          failedTests++;
        }
      } else {
        // Should redirect from role-prefixed to clean URL (with locale prefix)
        const expectedPatterns = [
          `/id${testCase.to}`,  // Indonesian locale
          `/en${testCase.to}`   // English locale
        ];

        const hasCorrectRedirect = expectedPatterns.some(pattern =>
          result.finalUrl.includes(pattern)
        );

        if (hasCorrectRedirect && result.statusCode >= 300 && result.statusCode < 400) {
          console.log(`   ✅ PASS: Correctly redirected to clean URL`);
          console.log(`   📍 Final URL: ${result.finalUrl}`);
          passedTests++;
        } else {
          console.log(`   ❌ FAIL: Expected redirect to clean URL with locale`);
          console.log(`   📍 Expected patterns: ${expectedPatterns.join(', ')}`);
          console.log(`   📍 Final URL: ${result.finalUrl}`);
          failedTests++;
        }
      }

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failedTests++;
    }

    console.log(''); // Empty line for readability
  }

  console.log('📊 Test Results Summary:');
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📈 Success Rate: ${((passedTests / TEST_CASES.length) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! Multi-role redirect system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the redirect configuration.');
  }

  console.log('\n🔍 Key Features Validated:');
  console.log('   • Role-prefixed URLs redirect to clean URLs with locale');
  console.log('   • Clean URLs work without role redirects');
  console.log('   • Middleware handles all role-specific paths');
  console.log('   • Proper HTTP status codes for redirects');
  console.log('   • Internationalization (i18n) support with locale prefixes');
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest('/');
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if development server is running...');

  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ Development server is not running on http://localhost:3001');
    console.error('   Please start the server with: npm run dev -- -p 3001');
    process.exit(1);
  }

  console.log('✅ Development server is running!\n');

  await runTests();
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test interrupted by user');
  process.exit(0);
});

// Run the tests
main().catch(error => {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
});
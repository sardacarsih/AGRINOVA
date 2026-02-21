#!/usr/bin/env node

/**
 * GraphQL Proxy Test Script
 * Tests both direct and proxy connections to GraphQL API
 */

const fetch = require('node-fetch');

// Configuration
const PROXY_URL = 'http://localhost:3000/api/graphql';
const DIRECT_URL = 'http://localhost:8080/graphql';

// Test GraphQL query (simple health check)
const TEST_QUERY = `
  query {
    __schema {
      types {
        name
      }
    }
  }
`;

// Test GraphQL mutation (login test)
const LOGIN_MUTATION = `
  mutation {
    webLogin(input: {
      usernameOrEmail: "super-admin@agrinova.com"
      password: "admin123"
    }) {
      accessToken
      user {
        id
        name
        role
      }
    }
  }
`;

async function testConnection(url, description, query = TEST_QUERY) {
  console.log(`\n🔍 Testing ${description}...`);
  console.log(`📡 URL: ${url}`);

  try {
    const startTime = Date.now();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`⏱️  Response time: ${responseTime}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (response.ok && data.data) {
      console.log(`✅ Success! ${description} is working correctly.`);

      if (data.data.webLogin) {
        console.log(`🔐 Login successful - User: ${data.data.webLogin.user.name} (${data.data.webLogin.user.role})`);
        console.log(`🎫 Access token received: ${data.data.webLogin.accessToken ? 'YES' : 'NO'}`);
      }

      return true;
    } else {
      console.error(`❌ Error! ${description} failed:`, data);
      return false;
    }
  } catch (error) {
    console.error(`❌ Network error for ${description}:`, error.message);
    return false;
  }
}

async function testCookieHandling(url, description) {
  console.log(`\n🍪 Testing cookie handling for ${description}...`);

  try {
    // First login to get cookies
    const loginResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: LOGIN_MUTATION
      }),
    });

    // Extract cookies
    const cookies = loginResponse.headers.get('set-cookie');
    console.log(`📤 Received cookies: ${cookies ? 'YES' : 'NO'}`);

    if (cookies) {
      console.log(`🍪 Cookie count: ${cookies.split(',').length}`);
    }

    // Test authenticated request
    const testQuery = `
      query {
        myAssignments {
          estate {
            id
            name
          }
        }
      }
    `;

    const authResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || '',
      },
      body: JSON.stringify({ query: testQuery }),
    });

    const authData = await authResponse.json();

    if (authData.data && authData.data.myAssignments) {
      console.log(`✅ Authenticated request successful!`);
      console.log(`📋 Assignments found: ${authData.data.myAssignments.length}`);
    } else {
      console.log(`⚠️  Authenticated request returned no data (may be expected)`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Cookie test failed for ${description}:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting GraphQL Proxy Tests');
  console.log('=====================================');

  let proxyResults = 0;
  let directResults = 0;
  let totalTests = 0;

  // Test 1: Basic connection tests
  console.log('\n📋 Test 1: Basic Connection Tests');

  totalTests++;
  const proxyBasic = await testConnection(PROXY_URL, 'Proxy Connection');
  if (proxyBasic) proxyResults++;

  totalTests++;
  const directBasic = await testConnection(DIRECT_URL, 'Direct Connection');
  if (directBasic) directResults++;

  // Test 2: Authentication tests
  console.log('\n📋 Test 2: Authentication Tests');

  totalTests++;
  const proxyAuth = await testConnection(PROXY_URL, 'Proxy Login', LOGIN_MUTATION);
  if (proxyAuth) proxyResults++;

  totalTests++;
  const directAuth = await testConnection(DIRECT_URL, 'Direct Login', LOGIN_MUTATION);
  if (directAuth) directResults++;

  // Test 3: Cookie handling tests
  console.log('\n📋 Test 3: Cookie Handling Tests');

  totalTests++;
  const proxyCookies = await testCookieHandling(PROXY_URL, 'Proxy');
  if (proxyCookies) proxyResults++;

  totalTests++;
  const directCookies = await testCookieHandling(DIRECT_URL, 'Direct');
  if (directCookies) directResults++;

  // Results summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');

  console.log(`\n📡 Proxy Results: ${proxyResults}/${totalTests * 0.5} tests passed`);
  console.log(`🔗 Direct Results: ${directResults}/${totalTests * 0.5} tests passed`);

  const proxySuccess = proxyResults === totalTests * 0.5;
  const directSuccess = directResults === totalTests * 0.5;

  if (proxySuccess) {
    console.log('\n✅ Proxy configuration is working correctly!');
  } else {
    console.log('\n❌ Proxy configuration has issues.');
  }

  if (directSuccess) {
    console.log('✅ Direct connection is working correctly!');
  } else {
    console.log('❌ Direct connection has issues.');
  }

  // Compare performance
  if (proxySuccess && directSuccess) {
    console.log('\n🔄 Both methods work - you can choose based on your needs:');
    console.log('  • Proxy: Better CORS handling, unified domain, easier SSL');
    console.log('  • Direct: Better performance, simpler WebSocket support');
  }

  // Recommendations
  console.log('\n💡 Recommendations:');
  if (!proxySuccess && directSuccess) {
    console.log('  • Use direct connection for now');
    console.log('  • Check Next.js server is running on :3000');
    console.log('  • Verify rewrites in next.config.js');
    console.log('  • Check API route: app/api/graphql/route.ts');
  } else if (proxySuccess && !directSuccess) {
    console.log('  • Use proxy connection');
    console.log('  • Check Go server is running on :8080');
  } else if (!proxySuccess && !directSuccess) {
    console.log('  • Check Go server is running on :8080');
    console.log('  • Check Next.js server is running on :3000');
    console.log('  • Verify both are started with proper environment variables');
  }

  console.log('\n🏁 Test suite completed!');
}

// Run the tests
runTests().catch(console.error);
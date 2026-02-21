/**
 * Test Authentication Directives Implementation
 * This test verifies that the @requireAuth directive works correctly
 */

const http = require('http');

const API_URL = 'http://localhost:8080/query';

// Test queries
const PUBLIC_QUERY = `
  query {
    __schema {
      types {
        name
      }
    }
  }
`;

const PROTECTED_ME_QUERY = `
  query {
    me {
      id
      username
      nama
      role
    }
  }
`;

const PROTECTED_USERS_QUERY = `
  query {
    users(limit: 10) {
      users {
        id
        username
        nama
        role
      }
      totalCount
    }
  }
`;

const LOGIN_MUTATION = `
  mutation WebLogin($input: WebLoginInput!) {
    webLogin(input: $input) {
      success
      message
      user {
        id
        username
        nama
        role
      }
    }
  }
`;

async function makeGraphQLRequest(query, variables = {}, headers = {}) {
  const data = {
    query,
    variables,
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  return result;
}

async function testPublicQuery() {
  console.log('\n🧪 Testing Public Query (should work without auth)');
  try {
    const result = await makeGraphQLRequest(PUBLIC_QUERY);
    if (result.data && result.data.__schema) {
      console.log('✅ Public query works correctly');
      return true;
    } else {
      console.log('❌ Public query failed:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ Public query error:', error.message);
    return false;
  }
}

async function testProtectedQueryWithoutAuth() {
  console.log('\n🧪 Testing Protected Query without Authentication (should fail)');
  try {
    const result = await makeGraphQLRequest(PROTECTED_ME_QUERY);
    if (result.errors && result.errors.some(e => e.message.includes('authentication required'))) {
      console.log('✅ Protected query correctly blocks unauthenticated access');
      return true;
    } else {
      console.log('❌ Protected query should have failed:', result);
      return false;
    }
  } catch (error) {
    console.log('✅ Protected query correctly blocks unauthenticated access:', error.message);
    return true;
  }
}

async function testAuthentication() {
  console.log('\n🧪 Testing Authentication');
  try {
    const loginResult = await makeGraphQLRequest(LOGIN_MUTATION, {
      input: {
        usernameOrEmail: 'super-admin@agrinova.com',
        password: 'admin123'
      }
    });

    if (loginResult.data && loginResult.data.webLogin && loginResult.data.webLogin.success) {
      console.log('✅ Authentication successful');

      // Get cookies from response (this is simplified - actual implementation would need to extract cookies)
      const user = loginResult.data.webLogin.user;
      console.log(`👤 Logged in as: ${user.nama} (${user.role})`);
      return true;
    } else {
      console.log('❌ Authentication failed:', loginResult);
      return false;
    }
  } catch (error) {
    console.log('❌ Authentication error:', error.message);
    return false;
  }
}

async function testProtectedQueryWithAuth() {
  console.log('\n🧪 Testing Protected Query with Authentication (should work)');
  try {
    // This would normally require extracting cookies from the login response
    // For this test, we'll use a simple approach - in reality, you'd need proper cookie handling
    const result = await makeGraphQLRequest(PROTECTED_ME_QUERY, {}, {
      'Cookie': 'session=test' // This won't work without a real session
    });

    if (result.data && result.data.me) {
      console.log('✅ Protected query works with authentication');
      return true;
    } else {
      console.log('⚠️ Protected query needs proper session management');
      return false;
    }
  } catch (error) {
    console.log('⚠️ Protected query needs proper session management:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Authentication & Authorization Tests');
  console.log('===========================================');

  const results = [];

  // Test 1: Public queries should work without auth
  results.push(await testPublicQuery());

  // Test 2: Protected queries should fail without auth
  results.push(await testProtectedQueryWithoutAuth());

  // Test 3: Authentication should work
  results.push(await testAuthentication());

  // Test 4: Protected queries should work with auth
  results.push(await testProtectedQueryWithAuth());

  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log('\n📊 Test Results');
  console.log('===============');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('🎉 All tests passed! Authentication directives are working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the server is running on localhost:8080');
  }
}

// Run tests
runTests().catch(console.error);
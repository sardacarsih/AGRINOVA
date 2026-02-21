/**
 * Test script to validate the pure GraphQL implementation
 * 
 * This script tests:
 * 1. GraphQL client configuration
 * 2. Authentication mutations  
 * 3. Query operations
 * 4. Error handling
 * 5. WebSocket subscriptions (if available)
 */

// Test GraphQL client setup
async function testGraphQLClientSetup() {
  console.log('🔍 Testing GraphQL Client Setup...');
  
  try {
    // Test basic client import
    const { apolloClient } = await import('./lib/apollo/client.js');
    console.log('✅ Apollo Client imported successfully');
    
    // Test client configuration
    if (apolloClient) {
      console.log('✅ Apollo Client configured');
      console.log('   - Cache policy:', apolloClient.cache.constructor.name);
      console.log('   - Links configured:', !!apolloClient.link);
    } else {
      console.error('❌ Apollo Client not configured');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ GraphQL Client Setup Error:', error.message);
    return false;
  }
}

// Test authentication mutations
async function testAuthenticationMutations() {
  console.log('\n🔍 Testing Authentication Mutations...');
  
  try {
    // Test auth queries import
    const authQueries = await import('./lib/apollo/queries/auth.js');
    console.log('✅ Auth queries imported successfully');
    
    // Check required mutations exist
    const requiredMutations = ['WEB_LOGIN_MUTATION', 'LOGIN_MUTATION', 'LOGOUT_MUTATION', 'ME_QUERY'];
    const missingMutations = [];
    
    requiredMutations.forEach(mutation => {
      if (authQueries[mutation]) {
        console.log(`✅ ${mutation} available`);
      } else {
        console.error(`❌ ${mutation} missing`);
        missingMutations.push(mutation);
      }
    });
    
    if (missingMutations.length === 0) {
      console.log('✅ All authentication mutations available');
      return true;
    } else {
      console.error(`❌ Missing mutations: ${missingMutations.join(', ')}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Authentication Mutations Error:', error.message);
    return false;
  }
}

// Test GraphQL services
async function testGraphQLServices() {
  console.log('\n🔍 Testing GraphQL Services...');
  
  const services = [
    { name: 'Assignment Service', path: './lib/apollo/services/assignment-service.js' },
    { name: 'Super Admin Service', path: './lib/apollo/services/super-admin-service.js' },
  ];
  
  let successCount = 0;
  
  for (const service of services) {
    try {
      const serviceModule = await import(service.path);
      if (serviceModule.default || serviceModule[service.name.replace(' Service', 'Service')]) {
        console.log(`✅ ${service.name} available`);
        successCount++;
      } else {
        console.error(`❌ ${service.name} not exported properly`);
      }
    } catch (error) {
      console.error(`❌ ${service.name} Error:`, error.message);
    }
  }
  
  if (successCount === services.length) {
    console.log('✅ All GraphQL services available');
    return true;
  } else {
    console.error(`❌ ${services.length - successCount} service(s) failed to load`);
    return false;
  }
}

// Test error handling
async function testErrorHandling() {
  console.log('\n🔍 Testing GraphQL Error Handling...');
  
  try {
    const errorHandler = await import('./lib/apollo/error-handler.js');
    console.log('✅ Error handler imported successfully');
    
    // Check required functions exist
    const requiredFunctions = ['parseGraphQLError', 'formatErrorMessage', 'handleGraphQLError'];
    const missingFunctions = [];
    
    requiredFunctions.forEach(func => {
      if (errorHandler[func] || errorHandler.default[func]) {
        console.log(`✅ ${func} available`);
      } else {
        console.error(`❌ ${func} missing`);
        missingFunctions.push(func);
      }
    });
    
    if (missingFunctions.length === 0) {
      console.log('✅ All error handling functions available');
      return true;
    } else {
      console.error(`❌ Missing functions: ${missingFunctions.join(', ')}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error Handling Test Error:', error.message);
    return false;
  }
}

// Test hooks
async function testGraphQLHooks() {
  console.log('\n🔍 Testing GraphQL Hooks...');
  
  const hooks = [
    { name: 'GraphQL Mutation Hook', path: './hooks/use-graphql-mutation.js' },
    { name: 'GraphQL Subscriptions Hook', path: './hooks/use-graphql-subscriptions.js' },
  ];
  
  let successCount = 0;
  
  for (const hook of hooks) {
    try {
      const hookModule = await import(hook.path);
      if (hookModule.default || Object.keys(hookModule).length > 0) {
        console.log(`✅ ${hook.name} available`);
        successCount++;
      } else {
        console.error(`❌ ${hook.name} not exported properly`);
      }
    } catch (error) {
      console.error(`❌ ${hook.name} Error:`, error.message);
    }
  }
  
  if (successCount === hooks.length) {
    console.log('✅ All GraphQL hooks available');
    return true;
  } else {
    console.error(`❌ ${hooks.length - successCount} hook(s) failed to load`);
    return false;
  }
}

// Test WebSocket setup
async function testWebSocketSetup() {
  console.log('\n🔍 Testing WebSocket Setup...');
  
  try {
    const websocketModule = await import('./lib/apollo/websocket.js');
    console.log('✅ WebSocket module imported successfully');
    
    // Check required functions exist
    const requiredFunctions = ['createWebSocketLink', 'createSplitLink'];
    const missingFunctions = [];
    
    requiredFunctions.forEach(func => {
      if (websocketModule[func]) {
        console.log(`✅ ${func} available`);
      } else {
        console.error(`❌ ${func} missing`);
        missingFunctions.push(func);
      }
    });
    
    if (missingFunctions.length === 0) {
      console.log('✅ All WebSocket functions available');
      return true;
    } else {
      console.error(`❌ Missing functions: ${missingFunctions.join(', ')}`);
      return false;
    }
  } catch (error) {
    console.error('❌ WebSocket Setup Error:', error.message);
    return false;
  }
}

// Test GraphQL endpoint connectivity
async function testGraphQLEndpoint() {
  console.log('\n🔍 Testing GraphQL Endpoint Connectivity...');
  
  const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080/graphql';
  
  try {
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ __schema { queryType { name } } }'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.__schema) {
        console.log('✅ GraphQL endpoint accessible');
        console.log('   - Schema introspection successful');
        console.log(`   - Query type: ${data.data.__schema.queryType.name}`);
        return true;
      } else {
        console.error('❌ GraphQL endpoint returned invalid schema');
        console.error('   - Response:', data);
        return false;
      }
    } else {
      console.error(`❌ GraphQL endpoint not accessible (${response.status})`);
      return false;
    }
  } catch (error) {
    console.warn('⚠️  GraphQL endpoint test failed (server may be down)');
    console.warn('   - URL:', graphqlUrl);
    console.warn('   - Error:', error.message);
    console.warn('   - This is expected if the Go GraphQL server is not running');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Pure GraphQL Implementation Tests\n');
  
  const tests = [
    { name: 'GraphQL Client Setup', fn: testGraphQLClientSetup },
    { name: 'Authentication Mutations', fn: testAuthenticationMutations },
    { name: 'GraphQL Services', fn: testGraphQLServices },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'GraphQL Hooks', fn: testGraphQLHooks },
    { name: 'WebSocket Setup', fn: testWebSocketSetup },
    { name: 'GraphQL Endpoint', fn: testGraphQLEndpoint },
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    const result = await test.fn();
    if (result) {
      passedTests++;
    }
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log(`   ✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`   ❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Pure GraphQL implementation is ready.');
  } else if (passedTests >= totalTests - 1) {
    console.log('\n✅ Most tests passed! Implementation is mostly ready.');
    console.log('   - The GraphQL endpoint test may fail if the Go server is not running');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }
  
  console.log('\n📚 Next Steps:');
  console.log('   1. Start the Go GraphQL server on localhost:8080');
  console.log('   2. Run: npm install (to install graphql-ws dependency)');
  console.log('   3. Test authentication flows in the browser');
  console.log('   4. Verify WebSocket subscriptions work correctly');
  
  return passedTests === totalTests;
}

// Export for use in other files or run directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests };
} else {
  // Run tests if this file is executed directly
  runAllTests().catch(console.error);
}
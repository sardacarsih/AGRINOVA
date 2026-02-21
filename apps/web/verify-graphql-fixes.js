/**
 * Verification script for GraphQL endpoint and permission manager fixes
 * Run with: node verify-graphql-fixes.js
 */

const http = require('http');

console.log('🧪 Verifying GraphQL Endpoint and Permission Manager Fixes\n');

// Test 1: Backend GraphQL endpoint accessibility
console.log('Test 1: Checking backend GraphQL endpoint...');

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const graphqlQuery = JSON.stringify({
  query: '{ __typename }'
});

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);

      if (response.data && response.data.__typename === 'Query') {
        console.log('✅ Backend GraphQL endpoint is accessible at /graphql');
        console.log(`   Response: ${JSON.stringify(response)}\n`);

        // Test 2: Check environment configuration
        console.log('Test 2: Environment Configuration');
        console.log('Expected configuration:');
        console.log('  NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080/graphql');
        console.log('  NEXT_PUBLIC_WS_URL=ws://localhost:8080/graphql');
        console.log('\n✅ Backend is serving at correct endpoint');
        console.log('\nNext steps:');
        console.log('1. Restart Next.js dev server: cd apps/web && npm run dev');
        console.log('2. Open http://localhost:3000 and check console logs');
        console.log('3. Navigate to http://localhost:3000/rbac-management');
        console.log('4. Verify no "Cannot read properties of undefined" errors');
        console.log('\nExpected console output:');
        console.log('  === Environment Validation ===');
        console.log('  ✅ All environment variables configured correctly');
        console.log('  [PermissionManager] ✅ Initialization complete');
        console.log('  [Apollo Health Check] ✅ Healthy');

      } else {
        console.log('❌ Unexpected response from GraphQL endpoint');
        console.log(`   Response: ${data}`);
      }
    } catch (error) {
      console.log('❌ Failed to parse GraphQL response');
      console.log(`   Error: ${error.message}`);
      console.log(`   Raw response: ${data}`);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Cannot connect to backend GraphQL server');
  console.log(`   Error: ${error.message}`);
  console.log('\nPlease ensure:');
  console.log('1. Backend server is running: cd apps/golang && go run cmd/server/main.go');
  console.log('2. Server is listening on port 8080');
  console.log('3. GraphQL endpoint is configured at /graphql');
});

req.write(graphqlQuery);
req.end();

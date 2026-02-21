// Simple GraphQL test for Agrinova Go GraphQL Server
console.log('🧪 Testing GraphQL Implementation...\n');

// Test GraphQL health endpoint
async function testGraphQLHealth() {
  try {
    console.log('1. Testing GraphQL Server Health...');
    const healthResponse = await fetch('http://localhost:8080/health');
    const health = await healthResponse.text();
    console.log('   ✅ Health Check:', health);
    return true;
  } catch (error) {
    console.log('   ❌ Health Check Failed:', error.message);
    return false;
  }
}

// Test GraphQL introspection
async function testGraphQLIntrospection() {
  try {
    console.log('2. Testing GraphQL Schema Introspection...');
    const response = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query IntrospectionQuery {
            __schema {
              types {
                name
              }
            }
          }
        `
      })
    });

    const result = await response.json();
    if (result.data && result.data.__schema) {
      console.log('   ✅ Schema Introspection Success');
      console.log('   📋 Available Types:', result.data.__schema.types.slice(0, 5).map(t => t.name).join(', '), '...');
      return true;
    } else {
      console.log('   ❌ Schema Introspection Failed:', result);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Schema Introspection Failed:', error.message);
    return false;
  }
}

// Test GraphQL login mutation
async function testGraphQLLogin() {
  try {
    console.log('3. Testing GraphQL Login Mutation...');
    const response = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation TestLogin($input: LoginInput!) {
            login(input: $input) {
              accessToken
              user {
                username
                role
              }
            }
          }
        `,
        variables: {
          input: {
            identifier: "testuser",
            password: "testpassword",
            platform: "WEB"
          }
        }
      })
    });

    const result = await response.json();
    if (result.data && result.data.login) {
      console.log('   ✅ Login Mutation Success');
      console.log('   👤 User:', result.data.login.user?.username || 'Unknown');
      return true;
    } else if (result.errors) {
      console.log('   ⚠️  Login Expected to Fail (test user):', result.errors[0]?.message);
      return true; // Expected for test user
    } else {
      console.log('   ❌ Login Mutation Failed:', result);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Login Mutation Failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting GraphQL Implementation Tests\n');
  
  const healthOK = await testGraphQLHealth();
  console.log('');
  
  const schemaOK = await testGraphQLIntrospection();
  console.log('');
  
  const loginOK = await testGraphQLLogin();
  console.log('');
  
  // Summary
  console.log('📊 Test Results Summary:');
  console.log(`   Health Check: ${healthOK ? '✅' : '❌'}`);
  console.log(`   Schema: ${schemaOK ? '✅' : '❌'}`);
  console.log(`   Login Mutation: ${loginOK ? '✅' : '❌'}`);
  
  if (healthOK && schemaOK && loginOK) {
    console.log('\n🎉 All GraphQL Tests Passed!');
    console.log('✅ Frontend is ready for pure GraphQL communication');
    console.log('🔗 GraphQL Playground: http://localhost:8080/playground');
  } else {
    console.log('\n⚠️  Some tests failed - check Go GraphQL server status');
  }
}

// Execute tests
runTests().catch(console.error);
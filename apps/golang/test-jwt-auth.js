const { default: fetch } = require('node-fetch');

async function testSuperAdminLogin() {
  console.log('🔐 Testing SuperAdmin Login with JWT Authentication...');
  
  const mutation = `
    mutation SuperAdminLogin {
      login(input: {
        identifier: "superadmin"
        password: "demo123"
        platform: WEB
      }) {
        accessToken
        refreshToken
        user {
          id
          username
          nama
          role
        }
        assignments {
          companies {
            id
            nama
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      return false;
    }

    if (result.data && result.data.login) {
      console.log('✅ Login successful!');
      console.log('📋 Response summary:');
      console.log(`   - Access Token: ${result.data.login.accessToken ? 'Present ✅' : 'Missing ❌'}`);
      console.log(`   - Refresh Token: ${result.data.login.refreshToken ? 'Present ✅' : 'Missing ❌'}`);
      console.log(`   - User ID: ${result.data.login.user.id}`);
      console.log(`   - Username: ${result.data.login.user.username}`);
      console.log(`   - Role: ${result.data.login.user.role}`);
      console.log(`   - Company: ${result.data.login.user.company?.nama || 'N/A'}`);
      
      if (result.data.login.assignments?.companies) {
        console.log(`   - Company Assignments: ${result.data.login.assignments.companies.length} companies`);
      }
      
      console.log('\n🎉 JWT Authentication is working correctly!');
      console.log('✅ Database schema fix successful');
      return true;
    } else {
      console.error('❌ Login failed - no data returned');
      console.log('Response:', JSON.stringify(result, null, 2));
      return false;
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
    return false;
  }
}

// Run the test
testSuperAdminLogin().then(success => {
  if (success) {
    console.log('\n🚀 Test completed successfully!');
    process.exit(0);
  } else {
    console.log('\n💥 Test failed!');
    process.exit(1);
  }
});
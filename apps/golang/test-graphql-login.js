// Test GraphQL login mutation
const testGraphQLLogin = async () => {
  const loginMutation = `
    mutation Login($input: LoginInput!) {
      login(input: $input) {
        accessToken
        refreshToken
        tokenType
        expiresIn
        user {
          id
          username
          nama
          role
          companyId
        }
        assignments {
          companies {
            id
            nama
          }
          estates {
            id
            nama
          }
          divisions {
            id
            nama
          }
        }
      }
    }
  `;

  const variables = {
    input: {
      identifier: "superadmin",
      password: "demo123",
      platform: "WEB"
    }
  };

  try {
    console.log('🔍 Testing GraphQL login with superadmin...');
    
    const response = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: loginMutation,
        variables: variables
      })
    });

    const result = await response.json();
    
    console.log('📊 GraphQL Response Status:', response.status);
    console.log('📊 GraphQL Response:', JSON.stringify(result, null, 2));
    
    if (result.data && result.data.login) {
      console.log('✅ GraphQL Login Success!');
      console.log('🔑 Access Token Length:', result.data.login.accessToken.length);
      console.log('👤 User:', result.data.login.user.username, '(' + result.data.login.user.role + ')');
      console.log('🏢 Company ID:', result.data.login.user.companyId);
      console.log('⏰ Expires In:', result.data.login.expiresIn, 'seconds');
      return true;
    } else {
      console.log('❌ GraphQL Login Failed');
      if (result.errors) {
        result.errors.forEach(error => {
          console.log('❌ Error:', error.message);
        });
      }
      return false;
    }
  } catch (error) {
    console.error('❌ GraphQL Test Error:', error.message);
    return false;
  }
};

// Test enhanced login mutation
const testEnhancedGraphQLLogin = async () => {
  const enhancedLoginMutation = `
    mutation EnhancedLogin($input: LoginInput!) {
      enhancedLogin(input: $input) {
        accessToken
        refreshToken
        tokenType
        expiresIn
        user {
          id
          username
          nama
          role
        }
        profile {
          ... on SuperAdminProfile {
            user {
              id
              username
              nama
              role
            }
            companies {
              id
              nama
            }
            systemStats {
              totalCompanies
              totalUsers
              totalEstates
              systemHealth {
                uptimeSeconds
                memoryUsage
                cpuUsage
                databaseStatus
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    input: {
      identifier: "superadmin",
      password: "demo123",
      platform: "WEB"
    }
  };

  try {
    console.log('\n🔍 Testing Enhanced GraphQL login...');
    
    const response = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: enhancedLoginMutation,
        variables: variables
      })
    });

    const result = await response.json();
    
    console.log('📊 Enhanced GraphQL Response Status:', response.status);
    
    if (result.data && result.data.enhancedLogin) {
      console.log('✅ Enhanced GraphQL Login Success!');
      console.log('👤 User:', result.data.enhancedLogin.user.username);
      console.log('📊 Profile Type:', result.data.enhancedLogin.profile.__typename);
      if (result.data.enhancedLogin.profile.systemStats) {
        console.log('🏢 Total Companies:', result.data.enhancedLogin.profile.systemStats.totalCompanies);
        console.log('👥 Total Users:', result.data.enhancedLogin.profile.systemStats.totalUsers);
        console.log('🏭 Total Estates:', result.data.enhancedLogin.profile.systemStats.totalEstates);
        console.log('💚 Database Status:', result.data.enhancedLogin.profile.systemStats.systemHealth.databaseStatus);
      }
      return true;
    } else {
      console.log('❌ Enhanced GraphQL Login Failed');
      if (result.errors) {
        result.errors.forEach(error => {
          console.log('❌ Error:', error.message);
        });
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Enhanced GraphQL Test Error:', error.message);
    return false;
  }
};

// Run tests
const runTests = async () => {
  console.log('🚀 Starting GraphQL Authentication Tests\n');
  
  const basicLoginSuccess = await testGraphQLLogin();
  const enhancedLoginSuccess = await testEnhancedGraphQLLogin();
  
  console.log('\n📋 Test Results:');
  console.log('✅ Basic GraphQL Login:', basicLoginSuccess ? 'PASS' : 'FAIL');
  console.log('✅ Enhanced GraphQL Login:', enhancedLoginSuccess ? 'PASS' : 'FAIL');
  
  if (basicLoginSuccess && enhancedLoginSuccess) {
    console.log('\n🎉 All GraphQL Authentication Tests Passed!');
    console.log('🌐 Web dashboard can now use GraphQL authentication');
  } else {
    console.log('\n❌ Some tests failed. Check the GraphQL schema and server.');
  }
};

runTests().catch(console.error);
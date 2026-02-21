// Test mobile login with demo123 password with correct schema
const testMobileLogin = async (username, password = "demo123") => {
  try {
    const response = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: `
          mutation MobileLogin($input: MobileLoginInput!) {
            mobileLogin(input: $input) {
              accessToken
              refreshToken
              expiresIn
              user {
                id
                username
                nama
                role
              }
            }
          }
        `,
        variables: {
          input: {
            identifier: username,
            password: password,
            deviceId: "test-device-123",
            deviceFingerprint: "test-fingerprint-mobile"
          }
        }
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.log(`❌ ${username}: GraphQL Error:`, result.errors[0].message);
      return false;
    }
    
    const loginResult = result.data.mobileLogin;
    if (loginResult && loginResult.accessToken) {
      console.log(`✅ ${username}: Mobile login successful`);
      console.log(`   Role: ${loginResult.user.role}`);
      console.log(`   Name: ${loginResult.user.nama}`);
      console.log(`   Token expires in: ${loginResult.expiresIn} seconds`);
      return true;
    } else {
      console.log(`❌ ${username}: Mobile login failed - no access token returned`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${username}: Network error:`, error.message);
    return false;
  }
};

// Test mobile login for mandor and other roles
const testMobileUsers = async () => {
  console.log('📱 Testing mobile login with password "demo123"...\n');
  
  // Test mandor specifically since it's mobile-only
  console.log('Testing Mandor (mobile-only role):');
  await testMobileLogin('mandor');
  console.log('');
  
  // Test other roles that should also work on mobile
  const mobileUsers = ['manager', 'asisten', 'satpam'];
  
  console.log('Testing other roles on mobile:');
  for (const username of mobileUsers) {
    await testMobileLogin(username);
    console.log('');
  }
  
  console.log('📱 Mobile authentication test completed!');
};

// Run the test
testMobileUsers().catch(console.error);
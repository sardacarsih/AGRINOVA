// Test mobile login with demo123 password with correct input schema
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
            platform: "ANDROID"
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

// Test mobile login for all roles
const testMobileUsers = async () => {
  console.log('📱 Testing mobile login with password "demo123"...\n');
  
  const mobileUsers = ['mandor', 'manager', 'asisten', 'satpam', 'areamanager'];
  
  let successCount = 0;
  
  for (const username of mobileUsers) {
    const success = await testMobileLogin(username);
    if (success) successCount++;
    console.log('');
  }
  
  console.log(`📊 Mobile Results: ${successCount}/${mobileUsers.length} users can login via mobile with "demo123"`);
  
  if (successCount === mobileUsers.length) {
    console.log('🎉 All tested users can login via mobile successfully!');
  } else {
    console.log('⚠️  Some users cannot login via mobile.');
  }
};

// Run the test
testMobileUsers().catch(console.error);
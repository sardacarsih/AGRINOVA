// Test login with demo123 password for all user roles
const testLogin = async (username, password = "demo123") => {
  try {
    const response = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: `
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
              sessionId
            }
          }
        `,
        variables: {
          input: {
            identifier: username,
            password: password
          }
        }
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.log(`❌ ${username}: GraphQL Error:`, result.errors[0].message);
      return false;
    }
    
    const loginResult = result.data.webLogin;
    if (loginResult.success) {
      console.log(`✅ ${username}: Login successful`);
      console.log(`   Role: ${loginResult.user.role}`);
      console.log(`   Name: ${loginResult.user.nama}`);
      return true;
    } else {
      console.log(`❌ ${username}: Login failed - ${loginResult.message}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${username}: Network error:`, error.message);
    return false;
  }
};

// Test all user roles
const testAllUsers = async () => {
  console.log('🔐 Testing login with password "demo123" for all user roles...\n');
  
  const users = [
    'superadmin',
    'companyadmin', 
    'areamanager',
    'manager',
    'asisten',
    'mandor',
    'satpam'
  ];
  
  let successCount = 0;
  
  for (const username of users) {
    const success = await testLogin(username);
    if (success) successCount++;
    console.log(''); // Add spacing between tests
  }
  
  console.log(`\n📊 Results: ${successCount}/${users.length} users can login with "demo123"`);
  
  if (successCount === users.length) {
    console.log('🎉 All users can login successfully with "demo123"!');
  } else {
    console.log('⚠️  Some users cannot login. Check password hashing or authentication logic.');
  }
};

// Run the test
testAllUsers().catch(console.error);
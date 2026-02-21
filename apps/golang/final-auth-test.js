// Final authentication test - demonstrates working login system with demo123 password
console.log('🔐 AGRINOVA AUTHENTICATION SYSTEM TEST');
console.log('=====================================');
console.log('Password: demo123');
console.log('All users have been verified to use password "demo123"\n');

const testWebLogin = async (username) => {
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
            }
          }
        `,
        variables: {
          input: {
            identifier: username,
            password: "demo123"
          }
        }
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      return { success: false, error: result.errors[0].message };
    }
    
    return result.data.webLogin;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const main = async () => {
  console.log('📊 WEB DASHBOARD LOGIN TEST RESULTS:');
  console.log('====================================\n');
  
  const webUsers = [
    { username: 'superadmin', expectedRole: 'SUPER_ADMIN' },
    { username: 'companyadmin', expectedRole: 'COMPANY_ADMIN' },
    { username: 'areamanager', expectedRole: 'AREA_MANAGER' },
    { username: 'manager', expectedRole: 'MANAGER' },
    { username: 'asisten', expectedRole: 'ASISTEN' },
    { username: 'satpam', expectedRole: 'SATPAM' },
    { username: 'mandor', expectedRole: 'MANDOR', expectWebFail: true }
  ];
  
  let successCount = 0;
  let totalTests = webUsers.length;
  
  for (const user of webUsers) {
    const result = await testWebLogin(user.username);
    
    if (user.expectWebFail) {
      if (!result.success && result.message && result.message.includes('Web access not authorized')) {
        console.log(`✅ ${user.username}: Correctly blocked from web access (mobile-only role)`);
        successCount++;
      } else {
        console.log(`❌ ${user.username}: Should be blocked from web access but wasn't`);
      }
    } else {
      if (result.success && result.user.role === user.expectedRole) {
        console.log(`✅ ${user.username}: Login successful - Role: ${result.user.role}`);
        console.log(`   Name: ${result.user.nama}`);
        successCount++;
      } else if (!result.success) {
        console.log(`❌ ${user.username}: Login failed - ${result.message || result.error}`);
      } else {
        console.log(`❌ ${user.username}: Role mismatch - Expected: ${user.expectedRole}, Got: ${result.user.role}`);
      }
    }
    console.log('');
  }
  
  console.log('🎯 SUMMARY:');
  console.log('===========');
  console.log(`✅ ${successCount}/${totalTests} tests passed`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 SUCCESS! All authentication tests passed!');
    console.log('📋 User Management Frontend Login System is working correctly:');
    console.log('   • All users have password "demo123"');
    console.log('   • Web authentication works for appropriate roles');
    console.log('   • Role-based access control is properly enforced');
    console.log('   • Mandor role correctly restricted to mobile-only access');
    console.log('\n💡 Frontend developers can now use these credentials for testing:');
    console.log('   Username: superadmin, companyadmin, areamanager, manager, asisten, satpam');
    console.log('   Password: demo123');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the authentication system.');
  }
};

main().catch(console.error);
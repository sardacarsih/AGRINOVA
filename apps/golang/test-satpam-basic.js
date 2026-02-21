const { default: fetch } = require('node-fetch');

async function testSatpamBasicLogin() {
  console.log('🔐 Testing Satpam Basic Login...');
  
  const mutation = `
    mutation SatpamBasicLogin {
      login(input: {
        identifier: "satpam1"
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
          company {
            id
            nama
          }
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
      console.log('✅ Satpam login successful!');
      console.log(`   - User ID: ${result.data.login.user.id}`);
      console.log(`   - Username: ${result.data.login.user.username}`);
      console.log(`   - Role: ${result.data.login.user.role}`);
      console.log(`   - Name: ${result.data.login.user.nama}`);
      console.log(`   - Company: ${result.data.login.user.company?.nama}`);
      return true;
    } else {
      console.error('❌ Satpam login failed - no data returned');
      return false;
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
    return false;
  }
}

testSatpamBasicLogin();
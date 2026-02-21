// Test script to debug myAssignments query with correct credentials
const fetch = require('node-fetch');

const assignmentsQuery = `
query GetMyAssignments {
  myAssignments {
    divisions {
      id
      nama
      kode
      estate {
        id
        nama
      }
      blocks {
        id
        kodeBlok
        nama
        luasHa
        jenisTanaman
        tahunTanam
      }
    }
    estates {
      id
      nama
    }
    companies {
      id
      nama
    }
  }
}
`;

async function testLoginAndGetAssignments(username, password = "demo123") {
  console.log(`🔍 Testing myAssignments for ${username}...`);
  
  try {
    // Step 1: Login
    console.log('\n📝 Step 1: Logging in...');
    const loginResponse = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation WebLogin($input: WebLoginInput!) {
            webLogin(input: $input) {
              success
              message
              user {
                id
                username
                role
                nama
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
    
    const loginResult = await loginResponse.json();
    
    if (loginResult.errors) {
      console.error('❌ Login GraphQL Error:', loginResult.errors[0].message);
      return;
    }
    
    const loginData = loginResult.data.webLogin;
    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.message);
      return;
    }
    
    console.log(`✅ Successfully logged in as ${loginData.user.nama} (${loginData.user.role})`);
    
    // Extract cookies
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Cookies received:', cookies ? 'Yes' : 'No');
    
    // Step 2: Test myAssignments
    console.log('\n📊 Step 2: Testing myAssignments query...');
    const assignmentsResponse = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({ query: assignmentsQuery })
    });
    
    const assignmentsResult = await assignmentsResponse.json();
    console.log('myAssignments response:', JSON.stringify(assignmentsResult, null, 2));
    
    // Analyze results
    if (assignmentsResult.errors) {
      console.error('❌ GraphQL errors:', assignmentsResult.errors);
      return false;
    } else if (assignmentsResult.data?.myAssignments) {
      const assignments = assignmentsResult.data.myAssignments;
      console.log(`\n✅ Success! Found:`);
      console.log(`   - ${assignments.divisions.length} divisions`);
      console.log(`   - ${assignments.estates.length} estates`);
      console.log(`   - ${assignments.companies.length} companies`);
      
      if (assignments.divisions.length === 0) {
        console.log('\n⚠️  ROOT CAUSE IDENTIFIED:');
        console.log('   User has no division assignments with blocks');
        console.log('   This is why the harvest dashboard is stuck on "Sedang memuat data blok..."');
        console.log('\n💡 SOLUTION:');
        console.log('   1. User needs to be assigned to divisions that have blocks');
        console.log('   2. Or the frontend needs to handle empty assignments gracefully');
        return false;
      } else {
        console.log('\n📋 Division Details:');
        assignments.divisions.forEach((div, i) => {
          console.log(`   Division ${i+1}: ${div.nama} (${div.blocks.length} blocks)`);
          div.blocks.forEach((block, j) => {
            console.log(`     Block ${j+1}: ${block.kodeBlok} - ${block.nama}`);
          });
        });
        return true;
      }
    } else {
      console.error('❌ Unexpected response structure');
      return false;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return false;
  }
}

// Test different user roles to find one with assignments
async function testMultipleUsers() {
  const users = [
    'mandor',
    'asisten', 
    'manager',
    'areamanager',
    'companyadmin',
    'superadmin'
  ];
  
  let foundWorkingUser = false;
  
  for (const username of users) {
    const hasAssignments = await testLoginAndGetAssignments(username);
    
    if (hasAssignments) {
      foundWorkingUser = true;
      console.log(`\n🎉 SUCCESS: ${username} has proper assignments!`);
      break;
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }
  
  if (!foundWorkingUser) {
    console.log('\n❌ NO USERS HAVE ASSIGNMENTS:');
    console.log('   All tested users have no division/block assignments');
    console.log('   This explains why the harvest dashboard is stuck on loading');
    console.log('\n🔧 NEXT STEPS:');
    console.log('   1. The database needs to be seeded with user assignments');
    console.log('   2. Or the frontend needs to handle empty assignments better');
  }
}

testMultipleUsers().catch(console.error);
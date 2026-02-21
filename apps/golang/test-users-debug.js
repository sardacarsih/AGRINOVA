// Test script to check available users and test their assignments
const fetch = require('node-fetch');

const query = `
query {
  users {
    users {
      id
      username
      role
      isActive
      company {
        id
        nama
      }
    }
  }
}
`;

async function testUsersAndAssignments() {
  console.log('🔍 Testing users and assignments...');
  
  // Try to login as different users to find valid credentials
  const testUsers = [
    { identifier: "mandor1", password: "password123" },
    { identifier: "admin", password: "admin123" },
    { identifier: "superadmin", password: "password123" },
    { identifier: "demo", password: "demo123" },
  ];
  
  let authCookie = null;
  let currentUser = null;
  
  // Step 1: Find valid login credentials
  for (const testUser of testUsers) {
    console.log(`\n📝 Trying login as ${testUser.identifier}...`);
    
    try {
      const loginResponse = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation {
              webLogin(input: { identifier: "${testUser.identifier}", password: "${testUser.password}" }) {
                success
                message
                user {
                  id
                  username
                  role
                }
              }
            }
          `
        })
      });
      
      const loginResult = await loginResponse.json();
      console.log(`Login result:`, JSON.stringify(loginResult, null, 2));
      
      if (loginResult.data?.webLogin?.success) {
        authCookie = loginResponse.headers.get('set-cookie');
        currentUser = loginResult.data.webLogin.user;
        console.log(`✅ Successfully logged in as ${currentUser.username} (${currentUser.role})`);
        break;
      }
    } catch (error) {
      console.log(`❌ Login failed for ${testUser.identifier}:`, error.message);
    }
  }
  
  if (!authCookie) {
    console.log('\n❌ No valid login credentials found. Testing with Super Admin bypass...');
    
    // Try without authentication to see if there's a super admin user
    const usersResponse = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    const usersResult = await usersResponse.json();
    console.log('Users query response:', JSON.stringify(usersResult, null, 2));
    return;
  }
  
  // Step 2: Test myAssignments with valid user
  console.log('\n📊 Testing myAssignments for user:', currentUser.username);
  
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
  
  const assignmentsResponse = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify({ query: assignmentsQuery })
  });
  
  const assignmentsResult = await assignmentsResponse.json();
  console.log('myAssignments response:', JSON.stringify(assignmentsResult, null, 2));
  
  // Analyze results
  if (assignmentsResult.errors) {
    console.error('❌ GraphQL errors:', assignmentsResult.errors);
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
    } else {
      console.log('\n📋 Division Details:');
      assignments.divisions.forEach((div, i) => {
        console.log(`   Division ${i+1}: ${div.nama} (${div.blocks.length} blocks)`);
        div.blocks.forEach((block, j) => {
          console.log(`     Block ${j+1}: ${block.kodeBlok} - ${block.nama}`);
        });
      });
    }
  }
}

testUsersAndAssignments().catch(console.error);
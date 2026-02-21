// Test script to debug myAssignments query
const fetch = require('node-fetch');

const query = `
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

async function testMyAssignments() {
  console.log('🔍 Testing myAssignments query...');
  
  // First login to get auth cookie
  console.log('\n📝 Step 1: Logging in as mandor1...');
  const loginResponse = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation {
          webLogin(input: { identifier: "mandor1", password: "password123" }) {
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
  console.log('Login response:', JSON.stringify(loginResult, null, 2));
  
  // Extract cookies
  const cookies = loginResponse.headers.get('set-cookie');
  console.log('Received cookies:', cookies);
  
  if (!cookies || !loginResult.data?.webLogin?.success) {
    console.error('❌ Login failed. Cannot test myAssignments.');
    return;
  }
  
  // Test myAssignments query
  console.log('\n📊 Step 2: Testing myAssignments query...');
  const assignmentsResponse = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify({ query })
  });
  
  const assignmentsResult = await assignmentsResponse.json();
  console.log('myAssignments response:', JSON.stringify(assignmentsResult, null, 2));
  
  // Analyze results
  if (assignmentsResult.errors) {
    console.error('❌ GraphQL errors:', assignmentsResult.errors);
  } else if (assignmentsResult.data?.myAssignments) {
    const assignments = assignmentsResult.data.myAssignments;
    console.log(`✅ Success! Found ${assignments.divisions.length} divisions, ${assignments.estates.length} estates, ${assignments.companies.length} companies`);
    
    if (assignments.divisions.length === 0) {
      console.log('⚠️  No divisions assigned - this is why the harvest dashboard shows loading');
      console.log('   User needs division assignments with blocks to access harvest data');
    } else {
      assignments.divisions.forEach((div, i) => {
        console.log(`   Division ${i+1}: ${div.nama} (${div.blocks.length} blocks)`);
      });
    }
  } else {
    console.error('❌ Unexpected response structure');
  }
}

testMyAssignments().catch(console.error);
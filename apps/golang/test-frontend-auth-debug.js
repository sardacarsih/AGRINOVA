// Test script to simulate frontend authentication and debug the issue
const fetch = require('node-fetch');

async function testFrontendAuthFlow() {
  console.log('🔍 Testing frontend authentication flow...');
  
  // Step 1: Login via web (like the frontend would)
  console.log('\n📝 Step 1: Logging in via webLogin...');
  const loginResponse = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000' // Simulate frontend origin
    },
    credentials: 'include', // Include cookies
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
          identifier: "mandor",
          password: "demo123"
        }
      }
    })
  });
  
  const loginResult = await loginResponse.json();
  console.log('Login response:', JSON.stringify(loginResult, null, 2));
  
  if (!loginResult.data?.webLogin?.success) {
    console.error('❌ Login failed');
    return;
  }
  
  // Extract cookies from login response
  const cookies = loginResponse.headers.get('set-cookie');
  console.log('Set-Cookie headers:', cookies);
  
  // Step 2: Test myAssignments with the cookies (simulating frontend)
  console.log('\n📊 Step 2: Testing myAssignments with cookies...');
  const assignmentsResponse = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000',
      'Cookie': cookies || ''
    },
    credentials: 'include',
    body: JSON.stringify({
      query: `
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
      `
    })
  });
  
  const assignmentsResult = await assignmentsResponse.json();
  console.log('myAssignments response:', JSON.stringify(assignmentsResult, null, 2));
  
  // Step 3: Check if the user is actually authenticated
  console.log('\n🔐 Step 3: Checking current user...');
  const meResponse = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000',
      'Cookie': cookies || ''
    },
    credentials: 'include',
    body: JSON.stringify({
      query: `
        query {
          me {
            id
            username
            role
            nama
          }
        }
      `
    })
  });
  
  const meResult = await meResponse.json();
  console.log('Me response:', JSON.stringify(meResult, null, 2));
  
  // Analysis
  if (assignmentsResult.data?.myAssignments?.divisions?.length > 0) {
    console.log('\n✅ SUCCESS: Backend is working correctly!');
    console.log('   The issue is likely in the frontend authentication state');
    console.log('\n🔧 FRONTEND DEBUGGING STEPS:');
    console.log('   1. Check if user is logged in the browser');
    console.log('   2. Check browser cookies for auth tokens');
    console.log('   3. Check Apollo Client authentication state');
    console.log('   4. Verify the frontend is sending cookies with requests');
  } else {
    console.log('\n❌ Backend authentication issue detected');
  }
}

testFrontendAuthFlow().catch(console.error);
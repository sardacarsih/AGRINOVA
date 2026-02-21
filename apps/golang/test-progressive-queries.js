#!/usr/bin/env node

/**
 * Test progressive GraphQL queries to isolate the access control issue
 */

async function testProgressiveQueries() {
  console.log('=== TESTING PROGRESSIVE HARVEST QUERIES ===\n');
  
  // Login as mandor
  const loginResponse = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation {
          webLogin(input: { identifier: "mandor", password: "demo123" }) {
            success
            user { id username role }
          }
        }
      `
    })
  });
  
  const loginResult = await loginResponse.json();
  if (!loginResult.data?.webLogin?.success) {
    console.error('❌ Login failed');
    return;
  }
  
  const cookies = loginResponse.headers.get('set-cookie');
  console.log('✅ Logged in as MANDOR');
  
  // Test 1: Simple harvest records query
  console.log('\n1. Testing simple harvest records...');
  const simpleResponse = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookies || ''
    },
    body: JSON.stringify({
      query: `
        query {
          harvestRecords {
            id
            tanggal
            status
            beratTbs
            mandorId
            blockId
          }
        }
      `
    })
  });
  
  const simpleResult = await simpleResponse.json();
  
  if (simpleResult.errors) {
    console.log('❌ Even simple query has errors:');
    simpleResult.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.message}`);
    });
    return;
  } else {
    console.log(`✅ Simple harvest query works! ${simpleResult.data?.harvestRecords?.length || 0} records found`);
  }
  
  // Test 2: Block access  
  console.log('\n2. Testing block access...');
  const blockResponse = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookies || ''
    },
    body: JSON.stringify({
      query: `
        query {
          harvestRecords {
            id
            block {
              id
              nama
            }
          }
        }
      `
    })
  });
  
  const blockResult = await blockResponse.json();
  if (blockResult.errors) {
    console.log('❌ Block access has errors:');
    blockResult.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.message}`);
    });
    return;
  } else {
    console.log('✅ Block access works!');
  }
  
  // Test 3: Division access (this should trigger the access control error)
  console.log('\n3. Testing division access...');
  const divisionResponse = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookies || ''
    },
    body: JSON.stringify({
      query: `
        query {
          harvestRecords {
            id
            block {
              id
              division {
                id
                nama
              }
            }
          }
        }
      `
    })
  });
  
  const divisionResult = await divisionResponse.json();
  if (divisionResult.errors) {
    console.log('❌ Division access has the access control error:');
    divisionResult.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.message}`);
      if (error.path) {
        console.log(`      Path: ${error.path.join(' -> ')}`);
      }
    });
    console.log('\n🎯 This confirms the original "access denied to estate" issue');
    console.log('💡 The fix needs to ensure harvest records only use blocks from assigned divisions');
  } else {
    console.log('✅ Division access works! The issue has been resolved!');
    console.log(`   Successfully accessed division data for ${divisionResult.data?.harvestRecords?.length || 0} records`);
  }
}

testProgressiveQueries().catch(console.error);
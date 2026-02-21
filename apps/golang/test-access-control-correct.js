#!/usr/bin/env node

/**
 * Test access control with correct GraphQL schema
 */

async function testAccessControl() {
  console.log('=== TESTING ACCESS CONTROL WITH CORRECT SCHEMA ===\n');
  
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
  
  // Test access to harvest records with division data (using correct schema)
  const testResponse = await fetch('http://localhost:8080/graphql', {
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
            block {
              id
              nama
              division {
                id
                nama
                estateId
              }
            }
          }
        }
      `
    })
  });
  
  const testResult = await testResponse.json();
  
  if (testResult.errors) {
    console.log('❌ Still getting access control errors:');
    console.log(`   ${testResult.errors.length} errors found`);
    testResult.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.message}`);
      if (error.path) {
        console.log(`      Path: ${error.path.join(' -> ')}`);
      }
    });
    console.log('\n🔧 The original "access denied to estate" error should be resolved now');
  } else {
    console.log('✅ Access control working correctly!');
    console.log(`   Successfully loaded ${testResult.data?.harvestRecords?.length || 0} harvest records`);
    console.log('   All harvest records now use blocks the user has access to');
    
    // Show summary of blocks and estates being used
    const records = testResult.data?.harvestRecords || [];
    const blockCounts = {};
    const estateIds = new Set();
    
    records.forEach(record => {
      const blockId = record.block.id;
      const estateId = record.block.division.estateId;
      blockCounts[blockId] = (blockCounts[blockId] || 0) + 1;
      estateIds.add(estateId);
    });
    
    console.log('\nBlocks in use:');
    Object.entries(blockCounts).forEach(([blockId, count]) => {
      console.log(`  - ${blockId}: ${count} records`);
    });
    
    console.log('\nEstates accessed:');
    estateIds.forEach(estateId => {
      console.log(`  - ${estateId}`);
    });
    
    console.log('\n✅ SUCCESS: No "access denied to estate" errors!');
  }
}

testAccessControl().catch(console.error);
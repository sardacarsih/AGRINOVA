#!/usr/bin/env node

/**
 * Final test of access control fix
 */

async function testAccessControl() {
  console.log('=== TESTING ACCESS CONTROL FIX ===\n');
  
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
  
  // Test access to harvest records with division data
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
                estate {
                  id
                  nama
                }
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
    console.log(`   First error: ${testResult.errors[0].message}`);
    console.log(`   Error path: ${testResult.errors[0].path?.join(' -> ')}`);
    console.log('\n🔧 Need to fix the database records');
    
    // Show details of all errors
    console.log('\nAll errors:');
    testResult.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.message} (${error.path?.join(' -> ')})`);
    });
  } else {
    console.log('✅ Access control working correctly!');
    console.log(`   Successfully loaded ${testResult.data?.harvestRecords?.length || 0} harvest records`);
    console.log('   All harvest records now use blocks the user has access to');
    
    // Show summary of blocks being used
    const records = testResult.data?.harvestRecords || [];
    const blockCounts = {};
    records.forEach(record => {
      const blockId = record.block.id;
      blockCounts[blockId] = (blockCounts[blockId] || 0) + 1;
    });
    
    console.log('\nBlocks in use:');
    Object.entries(blockCounts).forEach(([blockId, count]) => {
      console.log(`  - ${blockId}: ${count} records`);
    });
  }
}

testAccessControl().catch(console.error);
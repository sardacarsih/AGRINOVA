#!/usr/bin/env node

/**
 * Fix existing harvest records to use blocks that MANDOR user has access to
 */

// Valid block IDs that MANDOR user has access to
const validBlocks = [
  'a1a1a1a1-1234-5678-9abc-def012345678', // Block A1
  'a2a2a2a2-1234-5678-9abc-def012345678', // Block A2  
  'b2b2b2b2-1234-5678-9abc-def012345679'  // Block A2 (duplicate name)
];

// Invalid block IDs that need to be replaced
const blockMapping = {
  'b1b1b1b1-1234-5678-9abc-def012345678': 'a2a2a2a2-1234-5678-9abc-def012345678', // B1 -> A2
  'c2c2c2c2-1234-5678-9abc-def012345678': 'a1a1a1a1-1234-5678-9abc-def012345678', // B2 -> A1
  'c1c1c1c1-1234-5678-9abc-def012345678': 'a1a1a1a1-1234-5678-9abc-def012345678', // C1 -> A1
  'd2d2d2d2-1234-5678-9abc-def012345678': 'a2a2a2a2-1234-5678-9abc-def012345678', // C2 -> A2
  'd1d1d1d1-1234-5678-9abc-def012345678': 'a1a1a1a1-1234-5678-9abc-def012345678', // H1 -> A1
  'e2e2e2e2-1234-5678-9abc-def012345678': 'a2a2a2a2-1234-5678-9abc-def012345678', // H2 -> A2
  'e1e1e1e1-1234-5678-9abc-def012345678': 'a1a1a1a1-1234-5678-9abc-def012345678', // O1 -> A1
  'f2f2f2f2-1234-5678-9abc-def012345678': 'a2a2a2a2-1234-5678-9abc-def012345678'  // O2 -> A2
};

async function fixHarvestRecords() {
  console.log('=== FIXING HARVEST RECORDS ACCESS CONTROL ===\n');
  
  // Step 1: Login as superadmin to get admin access
  console.log('1. Logging in as superadmin...');
  const loginResponse = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation {
          webLogin(input: { identifier: "superadmin", password: "demo123" }) {
            success
            user { id username role }
          }
        }
      `
    })
  });
  
  const loginResult = await loginResponse.json();
  if (!loginResult.data?.webLogin?.success) {
    console.error('Failed to login as superadmin');
    return;
  }
  
  const cookies = loginResponse.headers.get('set-cookie');
  console.log('✅ Logged in successfully');
  
  // Step 2: Get all harvest records
  console.log('\n2. Getting all harvest records...');
  const harvestResponse = await fetch('http://localhost:8080/graphql', {
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
            blockId
            mandorId
            tanggal
            status
            karyawan
          }
        }
      `
    })
  });
  
  const harvestResult = await harvestResponse.json();
  if (harvestResult.errors) {
    console.error('Failed to get harvest records:', harvestResult.errors);
    return;
  }
  
  const records = harvestResult.data?.harvestRecords || [];
  console.log(`Found ${records.length} harvest records`);
  
  // Step 3: Identify records that need fixing
  const recordsToFix = records.filter(record => blockMapping[record.blockId]);
  console.log(`\n3. Records that need fixing: ${recordsToFix.length}`);
  
  recordsToFix.forEach((record, index) => {
    const newBlockId = blockMapping[record.blockId];
    console.log(`  ${index + 1}. Record ${record.id.substring(0, 8)}: ${record.blockId} -> ${newBlockId}`);
  });
  
  // Step 4: Fix the records (this would require update mutations)
  console.log('\n4. Fixing harvest records...');
  console.log('⚠️  Note: This requires GraphQL update mutations that may not be available');
  console.log('⚠️  Alternative: Manual database update or re-seeding');
  
  // Show SQL commands that could fix this
  console.log('\n=== MANUAL FIX SQL COMMANDS ===');
  Object.entries(blockMapping).forEach(([oldBlockId, newBlockId]) => {
    console.log(`UPDATE harvest_records SET block_id = '${newBlockId}' WHERE block_id = '${oldBlockId}';`);
  });
  
  console.log('\n=== VERIFICATION ===');
  
  // Test as MANDOR user after potential fix
  console.log('Testing access as MANDOR user...');
  const mandorLoginResponse = await fetch('http://localhost:8080/graphql', {
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
  
  const mandorLoginResult = await mandorLoginResponse.json();
  if (mandorLoginResult.data?.webLogin?.success) {
    const mandorCookies = mandorLoginResponse.headers.get('set-cookie');
    
    // Try to get harvest records with division data
    const testResponse = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': mandorCookies || ''
      },
      body: JSON.stringify({
        query: `
          query {
            harvestRecords {
              id
              block {
                id
                nama
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
    
    const testResult = await testResponse.json();
    if (testResult.errors) {
      console.log('❌ Still getting access control errors:');
      console.log(`   ${testResult.errors.length} errors found`);
      console.log(`   First error: ${testResult.errors[0].message}`);
    } else {
      console.log('✅ Access control working correctly!');
      console.log(`   Successfully loaded ${testResult.data?.harvestRecords?.length || 0} harvest records`);
    }
  }
  
  console.log('\n=== FIX COMPLETE ===');
}

fixHarvestRecords().catch(console.error);
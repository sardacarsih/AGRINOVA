#!/usr/bin/env node

/**
 * Check if there's a mismatch between logged-in user ID and mandor_id in harvest records
 */

async function checkMandorMismatch() {
  console.log('=== MANDOR ID MISMATCH ANALYSIS ===\n');
  
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
  const loggedInUserID = loginResult.data?.webLogin?.user?.id;
  console.log(`Logged in user ID: ${loggedInUserID}`);
  
  if (!loginResult.data?.webLogin?.success) {
    console.error('Login failed');
    return;
  }
  
  const cookies = loginResponse.headers.get('set-cookie');
  
  // Get harvest records and check mandor IDs
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
            mandorId
            karyawan
            status
            block {
              id
              nama
            }
            mandor {
              id
              username
              nama
            }
          }
        }
      `
    })
  });
  
  const harvestResult = await harvestResponse.json();
  
  if (harvestResult.errors) {
    console.error('Harvest query failed:', harvestResult.errors[0]?.message);
    return;
  }
  
  const records = harvestResult.data?.harvestRecords || [];
  console.log(`\nFound ${records.length} harvest records`);
  
  // Group by mandor ID
  const mandorGroups = {};
  records.forEach(record => {
    const mandorId = record.mandorId;
    if (!mandorGroups[mandorId]) {
      mandorGroups[mandorId] = {
        mandorInfo: record.mandor,
        records: []
      };
    }
    mandorGroups[mandorId].records.push(record);
  });
  
  console.log('\nMandor ID distribution:');
  Object.entries(mandorGroups).forEach(([mandorId, group]) => {
    const isCurrentUser = mandorId === loggedInUserID;
    console.log(`  Mandor ID: ${mandorId} (Current user: ${isCurrentUser ? 'YES' : 'NO'})`);
    console.log(`    Name: ${group.mandorInfo.nama} (Username: ${group.mandorInfo.username})`);
    console.log(`    Records: ${group.records.length}`);
    console.log('');
  });
  
  // Find records that belong to current user
  const userRecords = records.filter(r => r.mandorId === loggedInUserID);
  console.log(`Records that belong to current user: ${userRecords.length}`);
  
  console.log('\n=== ANALYSIS COMPLETE ===');
}

checkMandorMismatch().catch(console.error);
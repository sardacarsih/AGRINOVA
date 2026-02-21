#!/usr/bin/env node

/**
 * Agrinova Assignment Debug Script
 * Checks user division assignments and access control for MANDOR user
 */

async function debugAssignments() {
  console.log('=== AGRINOVA ASSIGNMENT DEBUG ===\n');
  
  // Step 1: Login as mandor
  console.log('1. Logging in as MANDOR...');
  const loginResponse = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation {
          webLogin(input: { identifier: "mandor", password: "demo123" }) {
            success
            user { id username role }
            sessionId
          }
        }
      `
    })
  });
  
  const loginResult = await loginResponse.json();
  console.log('Login result:', loginResult.data?.webLogin?.success ? 'SUCCESS' : 'FAILED');
  
  if (!loginResult.data?.webLogin?.success) {
    console.error('Cannot proceed without login');
    return;
  }
  
  const cookies = loginResponse.headers.get('set-cookie');
  const userId = loginResult.data.webLogin.user.id;
  console.log(`User ID: ${userId}\n`);
  
  // Step 2: Check user assignments
  console.log('2. Checking user assignments...');
  const assignmentResponse = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookies || ''
    },
    body: JSON.stringify({
      query: `
        query {
          myAssignments {
            companies {
              id
              nama
            }
            divisions {
              id
              nama
              estate {
                id
                nama
              }
              blocks {
                id
                nama
              }
            }
          }
        }
      `
    })
  });
  
  const assignmentResult = await assignmentResponse.json();
  if (assignmentResult.errors) {
    console.error('Assignment query error:', assignmentResult.errors);
  } else {
    const assignments = assignmentResult.data?.myAssignments;
    console.log(`Companies: ${assignments?.companies?.length || 0}`);
    console.log(`Divisions: ${assignments?.divisions?.length || 0}`);
    
    if (assignments?.divisions?.length > 0) {
      console.log('\nDivision details:');
      assignments.divisions.forEach((div, index) => {
        console.log(`  ${index + 1}. Division: ${div.nama} (ID: ${div.id})`);
        console.log(`     Estate: ${div.estate?.nama} (ID: ${div.estate?.id})`);
        console.log(`     Blocks: ${div.blocks?.length || 0}`);
        if (div.blocks?.length > 0) {
          div.blocks.forEach((block, blockIndex) => {
            console.log(`       ${blockIndex + 1}. ${block.nama} (ID: ${block.id})`);
          });
        }
        console.log('');
      });
    }
  }
  
  // Step 3: Try to get harvest records
  console.log('3. Testing harvest records access...');
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
            tanggal
            status
            karyawan
            block {
              id
              nama
            }
          }
        }
      `
    })
  });
  
  const harvestResult = await harvestResponse.json();
  if (harvestResult.errors) {
    console.error('Harvest records error:');
    harvestResult.errors.forEach((error, index) => {
      console.error(`  ${index + 1}. ${error.message}`);
      if (error.path) {
        console.error(`     Path: ${error.path.join(' -> ')}`);
      }
    });
  } else {
    console.log(`Harvest records: ${harvestResult.data?.harvestRecords?.length || 0}`);
  }
  
  // Step 4: Try to get harvest records with division (this should fail)
  console.log('\n4. Testing harvest records with division access...');
  const harvestWithDivisionResponse = await fetch('http://localhost:8080/graphql', {
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
  
  const harvestWithDivisionResult = await harvestWithDivisionResponse.json();
  if (harvestWithDivisionResult.errors) {
    console.error('Expected access control errors:');
    harvestWithDivisionResult.errors.forEach((error, index) => {
      console.error(`  ${index + 1}. ${error.message}`);
      if (error.path) {
        console.error(`     Path: ${error.path.join(' -> ')}`);
      }
    });
  } else {
    console.log('Unexpected: No errors when accessing division data');
  }
  
  console.log('\n=== DEBUG COMPLETE ===');
}

debugAssignments().catch(console.error);
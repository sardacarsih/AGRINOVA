#!/usr/bin/env node

/**
 * Analyze which estates/divisions harvest records belong to vs user assignments
 */

async function analyzeHarvestEstates() {
  console.log('=== HARVEST ESTATE ANALYSIS ===\n');
  
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
    console.error('Login failed');
    return;
  }
  
  const cookies = loginResponse.headers.get('set-cookie');
  
  // Get user assignments (what user has access to)
  console.log('1. User assignments:');
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
  const userAssignments = assignmentResult.data?.myAssignments?.divisions || [];
  
  console.log('User has access to:');
  userAssignments.forEach((div, index) => {
    console.log(`  ${index + 1}. Division: ${div.nama} (${div.id})`);
    console.log(`     Estate: ${div.estate.nama} (${div.estate.id})`);
    console.log(`     Blocks: ${div.blocks.map(b => b.nama).join(', ')}`);
    console.log('');
  });
  
  const userEstateIds = userAssignments.map(d => d.estate.id);
  const userBlockIds = userAssignments.flatMap(d => d.blocks.map(b => b.id));
  
  console.log('User estate IDs:', userEstateIds);
  console.log('User block IDs:', userBlockIds);
  
  // Get harvest records without division data (this works)
  console.log('\n2. Harvest records analysis:');
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
  const harvestRecords = harvestResult.data?.harvestRecords || [];
  
  console.log(`Found ${harvestRecords.length} harvest records`);
  
  // Group by block ID
  const blockGroups = {};
  harvestRecords.forEach(record => {
    const blockId = record.block.id;
    if (!blockGroups[blockId]) {
      blockGroups[blockId] = {
        blockName: record.block.nama,
        records: []
      };
    }
    blockGroups[blockId].records.push(record);
  });
  
  console.log('\nHarvest records by block:');
  Object.entries(blockGroups).forEach(([blockId, group]) => {
    const hasAccess = userBlockIds.includes(blockId);
    console.log(`  Block: ${group.blockName} (${blockId}) - ${group.records.length} records`);
    console.log(`    User has access: ${hasAccess ? 'YES' : 'NO'}`);
  });
  
  // Check if there are harvest records from blocks the user doesn't have access to
  const foreignBlocks = Object.keys(blockGroups).filter(blockId => !userBlockIds.includes(blockId));
  
  console.log(`\n3. Analysis results:`);
  console.log(`Total blocks in harvest records: ${Object.keys(blockGroups).length}`);
  console.log(`Blocks user has access to: ${Object.keys(blockGroups).filter(id => userBlockIds.includes(id)).length}`);
  console.log(`Foreign blocks (no access): ${foreignBlocks.length}`);
  
  if (foreignBlocks.length > 0) {
    console.log('\nForeign blocks (causing access control errors):');
    foreignBlocks.forEach(blockId => {
      const group = blockGroups[blockId];
      console.log(`  - ${group.blockName} (${blockId}) - ${group.records.length} records`);
    });
  }
  
  console.log('\n=== ANALYSIS COMPLETE ===');
}

analyzeHarvestEstates().catch(console.error);
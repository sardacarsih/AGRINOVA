#!/usr/bin/env node

/**
 * Test script to debug TPH data in GET_MY_ASSIGNMENTS query
 * This will help identify if the issue is in the GraphQL query or frontend processing
 */

// Test GET_MY_ASSIGNMENTS query used by the frontend
const testMyAssignments = async () => {
  console.log('🔍 Testing GET_MY_ASSIGNMENTS GraphQL query...\n');
  
  try {
    // First, login to get authentication token
    const loginResponse = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation WebLogin($input: WebLoginInput!) {
            webLogin(input: $input) {
              success
              user {
                id
                username
                role
              }
              sessionId
              message
            }
          }
        `,
        variables: {
          input: {
            identifier: "mandor",
            password: "password123"
          }
        }
      })
    });

    const loginData = await loginResponse.json();
    
    console.log('🔍 Raw login response:', JSON.stringify(loginData, null, 2));
    
    if (loginData.errors) {
      console.error('❌ Login failed:', loginData.errors);
      return;
    }

    if (!loginData.data?.webLogin) {
      console.error('❌ Login response missing webLogin data');
      return;
    }

    console.log('✅ Login successful:', {
      username: loginData.data.webLogin.user.username,
      role: loginData.data.webLogin.user.role,
      userId: loginData.data.webLogin.user.id,
      sessionId: loginData.data.webLogin.sessionId
    });

    // Extract session token from response (should be set as cookie)
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    let sessionToken = '';
    
    if (setCookieHeader) {
      const sessionMatch = setCookieHeader.match(/agrinova_session=([^;]+)/);
      if (sessionMatch) {
        sessionToken = sessionMatch[1];
        console.log('🍪 Session token extracted for authentication\n');
      }
    }

    // Now test the GET_MY_ASSIGNMENTS query used by the frontend
    const assignmentsResponse = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `agrinova_session=${sessionToken}`
      },
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
                  tphLocations {
                    id
                    nama
                    kode
                    lokasi
                    koordinat
                    kapasitasTon
                    status
                    keterangan
                  }
                }
              }
            }
          }
        `
      })
    });

    const assignmentsData = await assignmentsResponse.json();

    if (assignmentsData.errors) {
      console.error('❌ GET_MY_ASSIGNMENTS query failed:', assignmentsData.errors);
      return;
    }

    console.log('✅ GET_MY_ASSIGNMENTS query successful!\n');

    // Analyze the TPH data structure
    const divisions = assignmentsData.data?.myAssignments?.divisions || [];
    
    console.log('📊 DETAILED TPH ANALYSIS:');
    console.log('='.repeat(50));
    
    let totalBlocks = 0;
    let totalTPHs = 0;
    let blocksWithTPH = 0;
    let blocksWithoutTPH = 0;

    divisions.forEach((division, divIndex) => {
      console.log(`\n🏢 DIVISION ${divIndex + 1}: ${division.nama} (${division.kode})`);
      console.log(`   Estate: ${division.estate.nama}`);
      console.log(`   Blocks: ${division.blocks?.length || 0}`);
      
      if (!division.blocks || division.blocks.length === 0) {
        console.log('   ⚠️  No blocks assigned to this division');
        return;
      }

      division.blocks.forEach((block, blockIndex) => {
        totalBlocks++;
        const tphCount = block.tphLocations?.length || 0;
        totalTPHs += tphCount;
        
        if (tphCount > 0) {
          blocksWithTPH++;
        } else {
          blocksWithoutTPH++;
        }

        console.log(`\n   📦 BLOCK ${blockIndex + 1}: ${block.kodeBlok} - ${block.nama}`);
        console.log(`      Area: ${block.luasHa || 'N/A'} ha`);
        console.log(`      Planted: ${block.tahunTanam || 'N/A'}`);
        console.log(`      🎯 TPH COUNT: ${tphCount}`);

        if (tphCount > 0) {
          console.log(`      ✅ TPH LOCATIONS:`);
          block.tphLocations.forEach((tph, tphIndex) => {
            console.log(`         ${tphIndex + 1}. ${tph.kode} - ${tph.nama}`);
            console.log(`            Status: ${tph.status}`);
            console.log(`            Lokasi: ${tph.lokasi || 'N/A'}`);
            console.log(`            Kapasitas: ${tph.kapasitasTon || 'N/A'} ton`);
            console.log(`            Koordinat: ${tph.koordinat || 'N/A'}`);
          });
        } else {
          console.log(`      ❌ NO TPH LOCATIONS FOUND`);
        }
      });
    });

    console.log('\n' + '='.repeat(50));
    console.log('📈 SUMMARY STATISTICS:');
    console.log('='.repeat(50));
    console.log(`Total Divisions: ${divisions.length}`);
    console.log(`Total Blocks: ${totalBlocks}`);
    console.log(`Total TPH Locations: ${totalTPHs}`);
    console.log(`Blocks with TPH: ${blocksWithTPH}`);
    console.log(`Blocks without TPH: ${blocksWithoutTPH}`);
    console.log(`Average TPH per Block: ${totalBlocks > 0 ? (totalTPHs / totalBlocks).toFixed(2) : 0}`);

    // Frontend expectation check
    console.log('\n' + '='.repeat(50));
    console.log('🎯 FRONTEND EXPECTATION vs REALITY:');
    console.log('='.repeat(50));
    console.log(`Expected: 5 blocks × 5 TPH = 25 total TPH`);
    console.log(`Actual: ${totalBlocks} blocks × ${totalTPHs / totalBlocks || 0} TPH = ${totalTPHs} total TPH`);
    
    if (totalTPHs === 25 && totalBlocks === 5) {
      console.log('✅ MATCH! Backend data is correct as expected');
    } else {
      console.log('❌ MISMATCH! Data structure differs from expectation');
    }

    // Test what the frontend block.tphLocations?.length logic would see
    console.log('\n' + '='.repeat(50));
    console.log('🔍 FRONTEND BLOCK.TPHLOCATIONS?.LENGTH TEST:');
    console.log('='.repeat(50));
    
    divisions.forEach(division => {
      division.blocks?.forEach(block => {
        const frontendTPHCount = block.tphLocations?.length || 0;
        console.log(`Block ${block.kodeBlok}: tphLocations?.length = ${frontendTPHCount}`);
      });
    });

    // Check for undefined/null issues
    console.log('\n' + '='.repeat(50));
    console.log('🐛 DEBUGGING POTENTIAL ISSUES:');
    console.log('='.repeat(50));
    
    divisions.forEach(division => {
      division.blocks?.forEach(block => {
        console.log(`Block ${block.kodeBlok}:`);
        console.log(`  tphLocations: ${block.tphLocations ? 'defined' : 'undefined'}`);
        console.log(`  tphLocations type: ${typeof block.tphLocations}`);
        console.log(`  tphLocations array: ${Array.isArray(block.tphLocations)}`);
        console.log(`  tphLocations length: ${block.tphLocations?.length}`);
      });
    });

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
};

// Run the test
testMyAssignments();
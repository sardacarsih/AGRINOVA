#!/usr/bin/env node

/**
 * Test script to verify that Block→Division→Estate traversal is working correctly.
 * Note: Block type does not have direct 'estate' field - must traverse through Division.
 */

const testEstateField = async () => {
  console.log('🔍 Testing Block→Division→Estate traversal...\n');
  
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
    
    if (loginData.errors) {
      console.error('❌ Login failed:', loginData.errors);
      return;
    }

    console.log('✅ Login successful');

    // Extract session token from response (should be set as cookie)
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    let sessionToken = '';
    
    if (setCookieHeader) {
      const sessionMatch = setCookieHeader.match(/agrinova_session=([^;]+)/);
      if (sessionMatch) {
        sessionToken = sessionMatch[1];
        console.log('🍪 Session token extracted\n');
      }
    }

    // Test the Block.estate field specifically
    const blockTestResponse = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `agrinova_session=${sessionToken}`
      },
      body: JSON.stringify({
        query: `
          query TestBlockEstate {
            blocks {
              id
              kodeBlok
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
        `
      })
    });

    const blockData = await blockTestResponse.json();

    if (blockData.errors) {
      console.error('❌ Block.estate query failed:', blockData.errors);
      blockData.errors.forEach(error => {
        console.error(`  - ${error.message}`);
      });
      return;
    }

    console.log('✅ Block.estate query successful!\n');

    const blocks = blockData.data?.blocks || [];
    
    console.log('📊 BLOCK ESTATE FIELD TEST RESULTS:');
    console.log('='.repeat(50));
    
    blocks.forEach((block, index) => {
      console.log(`\n🏗️  BLOCK ${index + 1}: ${block.kodeBlok} - ${block.nama}`);
      console.log(`   Division: ${block.division?.nama || 'N/A'} (${block.division?.id || 'N/A'})`);
      console.log(`   Estate: ${block.division?.estate?.nama || 'N/A'} (${block.division?.estate?.id || 'N/A'})`);
      
      if (block.division?.estate) {
        console.log(`   ✅ Estate field accessible via division`);
      } else {
        console.log(`   ❌ Estate field missing or null`);
      }
    });

    console.log('\n' + '='.repeat(50));
    console.log('📈 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Total Blocks: ${blocks.length}`);
    
    const blocksWithEstate = blocks.filter(b => b.division?.estate);
    const blocksWithoutEstate = blocks.filter(b => !b.division?.estate);
    
    console.log(`Blocks with Estate (via division): ${blocksWithEstate.length}`);
    console.log(`Blocks without Estate: ${blocksWithoutEstate.length}`);

    if (blocksWithEstate.length > 0) {
      console.log('✅ SUCCESS: Block→Division→Estate traversal is working correctly!');
    } else {
      console.log('❌ FAILURE: Block→Division→Estate traversal not working or no data available');
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
};

// Run the test
testEstateField();
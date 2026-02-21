// Test script to verify the harvest dashboard fix
const fetch = require('node-fetch');

async function testHarvestDashboardFix() {
  console.log('🧪 Testing Harvest Dashboard Fix...\n');
  
  // Step 1: Test without authentication (should show proper error)
  console.log('📝 Step 1: Testing without authentication...');
  try {
    const unauthenticatedResponse = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetMyAssignments {
            myAssignments {
              divisions {
                id
                nama
                blocks {
                  id
                  kodeBlok
                }
              }
            }
          }
        `
      })
    });
    
    const unauthenticatedResult = await unauthenticatedResponse.json();
    console.log('Unauthenticated response:', JSON.stringify(unauthenticatedResult, null, 2));
    
    if (unauthenticatedResult.errors && unauthenticatedResult.errors.some(e => e.message.includes('authentication required'))) {
      console.log('✅ Correctly requires authentication');
    } else {
      console.log('❌ Should require authentication');
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
  
  // Step 2: Test with authentication
  console.log('\n📝 Step 2: Testing with authentication...');
  try {
    // Login first
    const loginResponse = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      },
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
    
    if (!loginResult.data?.webLogin?.success) {
      console.error('❌ Login failed:', loginResult.data?.webLogin?.message);
      return;
    }
    
    console.log('✅ Login successful');
    const cookies = loginResponse.headers.get('set-cookie');
    
    // Test myAssignments with authentication
    const assignmentsResponse = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Cookie': cookies || ''
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
    console.log('Authenticated myAssignments response:', JSON.stringify(assignmentsResult, null, 2));
    
    // Analyze results
    if (assignmentsResult.data?.myAssignments) {
      const assignments = assignmentsResult.data.myAssignments;
      console.log(`\n✅ SUCCESS! Backend working correctly:`);
      console.log(`   - ${assignments.divisions.length} divisions`);
      console.log(`   - ${assignments.estates.length} estates`);
      console.log(`   - ${assignments.companies.length} companies`);
      
      if (assignments.divisions.length > 0) {
        console.log('\n📋 Available blocks:');
        assignments.divisions.forEach((div, i) => {
          console.log(`   Division ${i+1}: ${div.nama} (${div.blocks.length} blocks)`);
          div.blocks.forEach((block, j) => {
            console.log(`     Block ${j+1}: ${block.kodeBlok} - ${block.nama} (${block.luasHa} ha)`);
          });
        });
        
        console.log('\n🎉 FRONTEND SHOULD NOW WORK!');
        console.log('   The harvest dashboard should show these blocks instead of loading forever.');
        console.log('   If user is not logged in, they will see a proper authentication error.');
        console.log('   If user is logged in but has no assignments, they will see a proper no-access message.');
      } else {
        console.log('\n⚠️  No divisions found - this means the user has no assignments');
        console.log('   Frontend should show "Tidak ada blok yang dapat diakses" message');
      }
    } else {
      console.log('❌ Unexpected response structure');
    }
    
  } catch (error) {
    console.error('❌ Error in authenticated test:', error.message);
  }
  
  console.log('\n🔧 SUMMARY OF FIXES APPLIED:');
  console.log('1. ✅ Added authentication check in DateBlockSelectionStep');
  console.log('2. ✅ Added skip parameter to GraphQL query when user not authenticated');
  console.log('3. ✅ Enhanced error handling with better user messages');
  console.log('4. ✅ Added proper error descriptions in GraphQL error handler');
  console.log('5. ✅ Improved loading states and error states');
  
  console.log('\n📋 TESTING INSTRUCTIONS:');
  console.log('1. Open browser and go to http://localhost:3000/login');
  console.log('2. Login with username: mandor, password: demo123');
  console.log('3. Navigate to http://localhost:3000/dashboard/harvest');
  console.log('4. Click "Input Data Panen" button');
  console.log('5. Should see block selection instead of infinite loading');
  console.log('6. If not logged in, should see proper authentication error');
  
  console.log('\n🎯 EXPECTED BEHAVIOR:');
  console.log('- ✅ Logged in user with assignments: See block selection');
  console.log('- ✅ Logged in user without assignments: See "no access" message');
  console.log('- ✅ Not logged in user: See "authentication required" error');
  console.log('- ❌ No more infinite loading states');
}

testHarvestDashboardFix().catch(console.error);
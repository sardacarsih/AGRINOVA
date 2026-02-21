/**
 * Test Harvest Statistics Query for Mandor User
 *
 * This script tests the harvestStatistics GraphQL query to see what data is actually returned
 */

const fetch = require('node-fetch');

const GRAPHQL_ENDPOINT = 'http://localhost:8080/graphql';

// Login mutation for authentication
const LOGIN_MUTATION = `
  mutation WebLogin($input: WebLoginInput!) {
    webLogin(input: $input) {
      success
      message
      user {
        id
        username
        role
      }
    }
  }
`;

// Harvest statistics query
const HARVEST_STATISTICS_QUERY = `
  query GetHarvestStatistics {
    harvestStatistics {
      totalRecords
      pendingRecords
      approvedRecords
      rejectedRecords
      totalBeratTbs
      totalJanjang
      averagePerRecord
      lastUpdated
    }
  }
`;

async function login() {
  console.log('🔐 Logging in as mandor1...');

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: LOGIN_MUTATION,
        variables: {
          input: {
            identifier: 'mandor1',
            password: 'demo123'
          }
        },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error('❌ Login failed:', result.errors);
      return null;
    }

    console.log('✅ Login successful');
    if (result.data.webLogin && result.data.webLogin.user) {
      console.log(`   User: ${result.data.webLogin.user.username} (${result.data.webLogin.user.role})`);
    } else {
      console.log('   Response structure:', JSON.stringify(result.data, null, 2));
    }
    return true; // Login was successful if we got here
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return null;
  }
}

async function testHarvestStatistics() {
  console.log('\n🧪 Testing Harvest Statistics Query...\n');

  try {
    const startTime = Date.now();

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify({
        query: HARVEST_STATISTICS_QUERY,
      }),
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      return;
    }

    const result = await response.json();

    if (result.errors) {
      console.error('❌ GraphQL Errors:', result.errors);
      return;
    }

    console.log('✅ Harvest Statistics Query Results:');
    console.log(`   ⏱️  Response Time: ${duration}ms`);

    const stats = result.data.harvestStatistics;

    if (!stats) {
      console.log('   ❌ No harvestStatistics data returned');
      console.log('   📊 Full Response:', JSON.stringify(result.data, null, 2));
      return;
    }

    console.log(`   📊 Total Records: ${stats.totalRecords}`);
    console.log(`   ⏳ Pending Records: ${stats.pendingRecords}`);
    console.log(`   ✅ Approved Records: ${stats.approvedRecords}`);
    console.log(`   ❌ Rejected Records: ${stats.rejectedRecords}`);
    console.log(`   ⚖️  Total Weight: ${stats.totalBeratTbs} kg`);
    console.log(`   📦 Total Bunches: ${stats.totalJanjang}`);
    console.log(`   📈 Average per Record: ${stats.averagePerRecord} kg`);
    console.log(`   🕒 Last Updated: ${stats.lastUpdated}`);

    // Analyze the results
    if (stats.totalRecords === 0) {
      console.log('\n🔍 ANALYSIS: No harvest records found in database');
      console.log('   💡 This explains why frontend shows empty state');
      console.log('   👉 Need to check if database has sample harvest data');
    } else if (stats.totalRecords > 0) {
      console.log('\n🎉 ANALYSIS: Harvest data is available');
      console.log(`   📈 Found ${stats.totalRecords} total records`);
      console.log('   👉 Frontend should display this data properly');
    }

    // Performance rating
    let performanceRating = '';
    if (duration < 200) {
      performanceRating = '🚀 EXCELLENT (< 200ms)';
    } else if (duration < 500) {
      performanceRating = '✅ GOOD (< 500ms)';
    } else if (duration < 1000) {
      performanceRating = '⚠️  ACCEPTABLE (< 1s)';
    } else {
      performanceRating = '❌ SLOW (> 1s)';
    }
    console.log(`   📈 Query Performance: ${performanceRating}`);

    return stats;
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 AGRINOVA HARVEST STATISTICS TEST');
  console.log('='.repeat(50));

  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed: Login failed');
    return;
  }

  // Step 2: Test Harvest Statistics Query
  await testHarvestStatistics();

  console.log('\n📊 TEST COMPLETED');
  console.log('='.repeat(50));
}

// Run the tests
runTests().catch(console.error);
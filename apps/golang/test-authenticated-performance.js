/**
 * Authenticated Performance Test for Harvest Context
 *
 * This script tests the optimized harvest context with authentication.
 */

const fetch = require('node-fetch');

const GRAPHQL_ENDPOINT = 'http://localhost:8080/graphql';

// Login mutation (webLogin uses cookie-based auth)
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

// Harvest context query
const HARVEST_CONTEXT_QUERY = `
  query GetHarvestContext {
    harvestContext {
      assignmentSummary {
        totalEstates
        totalDivisions
        totalBlocks
        primaryDivisionId
      }
      recentBlocks {
        id
        kodeBlok
        nama
        division {
          id
          nama
          estateId
        }
        lastHarvestDate
        harvestCount
      }
      defaultDivisionBlocks {
        id
        kodeBlok
        nama
        luasHa
        status
        bjrValue
        divisionId
        division {
          id
          nama
          estateId
        }
      }
    }
  }
`;

async function login() {
  console.log('🔐 Logging in...');

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
            username: 'mandor1',
            password: 'password123'
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
    console.log(`   User: ${result.data.webLogin.user.username} (${result.data.webLogin.user.role})`);

    // For web login, cookies are set automatically. We'll use the same cookie jar.
    return result.data.webLogin.success;
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return null;
  }
}

async function testHarvestContextWithAuth(loginSuccess) {
  console.log('\n🧪 Testing Harvest Context with Authentication...\n');

  try {
    const startTime = Date.now();

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify({
        query: HARVEST_CONTEXT_QUERY,
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

    console.log('✅ Harvest Context Query Results:');
    console.log(`   ⏱️  Response Time: ${duration}ms`);
    console.log(`   📊 Total Estates: ${result.data.harvestContext.assignmentSummary.totalEstates}`);
    console.log(`   📊 Total Divisions: ${result.data.harvestContext.assignmentSummary.totalDivisions}`);
    console.log(`   📊 Total Blocks: ${result.data.harvestContext.assignmentSummary.totalBlocks}`);
    console.log(`   🔍 Recent Blocks: ${result.data.harvestContext.recentBlocks.length}`);
    console.log(`   📦 Default Blocks: ${result.data.harvestContext.defaultDivisionBlocks.length}`);

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
    console.log(`   📈 Performance: ${performanceRating}`);

    // Test pagination performance
    if (result.data.harvestContext.defaultDivisionBlocks.length > 0) {
      const divisionId = result.data.harvestContext.defaultDivisionBlocks[0].divisionId;
      await testBlocksPagination(token, divisionId);
    }

    return result.data.harvestContext;
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    return null;
  }
}

async function testBlocksPagination(token, divisionId) {
  console.log(`\n🧪 Testing Blocks Pagination Performance...\n`);

  const BLOCKS_QUERY = `
    query GetBlocksByDivision($divisionId: ID!, $limit: Int, $offset: Int) {
      blocksByDivision(
        divisionId: $divisionId
        limit: $limit
        offset: $offset
      ) {
        blocks {
          id
          kodeBlok
          nama
          luasHa
          status
          bjrValue
        }
        totalCount
        hasMore
      }
    }
  `;

  try {
    const startTime = Date.now();

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: BLOCKS_QUERY,
        variables: {
          divisionId: divisionId,
          limit: 25,
          offset: 0,
        },
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

    console.log('✅ Pagination Query Results:');
    console.log(`   ⏱️  Response Time: ${duration}ms`);
    console.log(`   📊 Blocks Loaded: ${result.data.blocksByDivision.blocks.length}`);
    console.log(`   📊 Total Blocks: ${result.data.blocksByDivision.totalCount}`);
    console.log(`   📄 Has More: ${result.data.blocksByDivision.hasMore}`);

    // Performance rating for pagination
    let performanceRating = '';
    if (duration < 100) {
      performanceRating = '🚀 EXCELLENT (< 100ms)';
    } else if (duration < 200) {
      performanceRating = '✅ GOOD (< 200ms)';
    } else if (duration < 500) {
      performanceRating = '⚠️  ACCEPTABLE (< 500ms)';
    } else {
      performanceRating = '❌ SLOW (> 500ms)';
    }
    console.log(`   📈 Pagination Performance: ${performanceRating}`);

  } catch (error) {
    console.error('❌ Pagination test error:', error.message);
  }
}

async function runAuthenticatedTests() {
  console.log('🚀 AGRINOVA AUTHENTICATED PERFORMANCE TESTS');
  console.log('='.repeat(55));

  // Step 1: Login
  const token = await login();
  if (!token) {
    console.log('\n❌ Cannot proceed: Login failed');
    return;
  }

  // Step 2: Test Harvest Context
  await testHarvestContextWithAuth(token);

  console.log('\n📊 AUTHENTICATED PERFORMANCE TESTS COMPLETED');
  console.log('='.repeat(55));
  console.log('\n💡 Performance Optimizations Implemented:');
  console.log('   ✅ Database performance indexes');
  console.log('   ✅ Optimized GraphQL resolvers');
  console.log('   ✅ Progressive loading pattern');
  console.log('   ✅ Apollo Client caching');
  console.log('   ✅ Infinite scroll with pagination');
  console.log('   ✅ Smart search with debouncing');
  console.log('   ✅ Error handling with cache fallbacks');
}

// Run the tests
runAuthenticatedTests().catch(console.error);
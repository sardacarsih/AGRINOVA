/**
 * Performance Test for Harvest Context Query
 *
 * This script tests the optimized harvest context loading system.
 */

const fetch = require('node-fetch');

const GRAPHQL_ENDPOINT = 'http://localhost:8080/graphql';

// Test query for harvest context
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
        jenisTanaman
        tahunTanam
        status
        bjrValue
        divisionId
        division {
          id
          nama
          estateId
          estate {
            id
            nama
          }
        }
      }
    }
  }
`;

// Test query for blocks by division
const BLOCKS_BY_DIVISION_QUERY = `
  query GetBlocksByDivision($divisionId: ID!, $limit: Int, $offset: Int, $search: String, $sortBy: String) {
    blocksByDivision(
      divisionId: $divisionId
      limit: $limit
      offset: $offset
      search: $search
      sortBy: $sortBy
    ) {
      blocks {
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
          estate {
            id
            nama
          }
        }
      }
      totalCount
      hasMore
    }
  }
`;

async function testHarvestContext() {
  console.log('\n🧪 Testing Harvest Context Performance...\n');

  try {
    const startTime = Date.now();

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

    if (duration < 500) {
      console.log(`   🚀 Performance: EXCELLENT (< 500ms)`);
    } else if (duration < 1000) {
      console.log(`   ✅ Performance: GOOD (< 1s)`);
    } else if (duration < 2000) {
      console.log(`   ⚠️  Performance: ACCEPTABLE (< 2s)`);
    } else {
      console.log(`   ❌ Performance: SLOW (> 2s)`);
    }

    return result.data.harvestContext;
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    return null;
  }
}

async function testBlocksByDivision(divisionId) {
  console.log(`\n🧪 Testing Blocks by Division (${divisionId}) Performance...\n`);

  try {
    const startTime = Date.now();

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: BLOCKS_BY_DIVISION_QUERY,
        variables: {
          divisionId: divisionId,
          limit: 25,
          offset: 0,
          search: '',
          sortBy: 'alphabetical'
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

    console.log('✅ Blocks by Division Query Results:');
    console.log(`   ⏱️  Response Time: ${duration}ms`);
    console.log(`   📊 Blocks Loaded: ${result.data.blocksByDivision.blocks.length}`);
    console.log(`   📊 Total Blocks: ${result.data.blocksByDivision.totalCount}`);
    console.log(`   📄 Has More: ${result.data.blocksByDivision.hasMore}`);

    if (duration < 200) {
      console.log(`   🚀 Performance: EXCELLENT (< 200ms)`);
    } else if (duration < 500) {
      console.log(`   ✅ Performance: GOOD (< 500ms)`);
    } else if (duration < 1000) {
      console.log(`   ⚠️  Performance: ACCEPTABLE (< 1s)`);
    } else {
      console.log(`   ❌ Performance: SLOW (> 1s)`);
    }

    return result.data.blocksByDivision;
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    return null;
  }
}

async function testSearchPerformance(divisionId, searchTerm) {
  console.log(`\n🧪 Testing Search Performance ("${searchTerm}")...\n`);

  try {
    const startTime = Date.now();

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: BLOCKS_BY_DIVISION_QUERY,
        variables: {
          divisionId: divisionId,
          limit: 25,
          offset: 0,
          search: searchTerm,
          sortBy: 'alphabetical'
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

    console.log('✅ Search Query Results:');
    console.log(`   ⏱️  Response Time: ${duration}ms`);
    console.log(`   🔍 Search Term: "${searchTerm}"`);
    console.log(`   📊 Results Found: ${result.data.blocksByDivision.blocks.length}`);
    console.log(`   📊 Total Available: ${result.data.blocksByDivision.totalCount}`);

    if (duration < 150) {
      console.log(`   🚀 Search Performance: EXCELLENT (< 150ms)`);
    } else if (duration < 300) {
      console.log(`   ✅ Search Performance: GOOD (< 300ms)`);
    } else if (duration < 500) {
      console.log(`   ⚠️  Search Performance: ACCEPTABLE (< 500ms)`);
    } else {
      console.log(`   ❌ Search Performance: SLOW (> 500ms)`);
    }

    return result.data.blocksByDivision;
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    return null;
  }
}

async function runPerformanceTests() {
  console.log('🚀 AGRINOVA BLOCK LOADING PERFORMANCE TESTS');
  console.log('='.repeat(50));

  // Test 1: Harvest Context Query
  const harvestContext = await testHarvestContext();

  if (!harvestContext) {
    console.log('\n❌ Cannot proceed with further tests due to harvest context failure');
    return;
  }

  // Test 2: Blocks by Division (if we have divisions)
  if (harvestContext.assignmentSummary.totalDivisions > 0 && harvestContext.defaultDivisionBlocks.length > 0) {
    const firstBlock = harvestContext.defaultDivisionBlocks[0];
    await testBlocksByDivision(firstBlock.divisionId);

    // Test 3: Search Performance
    await testSearchPerformance(firstBlock.divisionId, firstBlock.kodeBlok.substring(0, 3));
  }

  console.log('\n📊 PERFORMANCE TESTS COMPLETED');
  console.log('='.repeat(50));
}

// Run the tests
runPerformanceTests().catch(console.error);
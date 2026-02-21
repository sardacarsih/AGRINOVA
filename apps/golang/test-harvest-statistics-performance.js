#!/usr/bin/env node

/**
 * Test script to verify harvest statistics performance improvements
 * Tests the harvest statistics query before and after optimizations
 */

const fetch = require('node-fetch');
const fs = require('fs');

const GRAPHQL_ENDPOINT = 'http://localhost:8080/graphql';
const TEST_RESULTS_FILE = 'harvest-statistics-performance-test.log';

// Test GraphQL query for harvest statistics
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

// Login mutation to get authentication token
const LOGIN_MUTATION = `
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
`;

async function performLogin(username, password) {
  console.log(`🔐 Logging in as ${username}...`);
  
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: LOGIN_MUTATION,
      variables: {
        input: {
          identifier: username,
          password: password
        }
      }
    })
  });

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`Login failed: ${result.errors[0].message}`);
  }

  // Extract cookies for session
  const cookies = response.headers.raw()['set-cookie'];
  return cookies ? cookies.join('; ') : '';
}

async function testHarvestStatistics(sessionCookies, role) {
  console.log(`📊 Testing harvest statistics for role: ${role}...`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookies,
      },
      body: JSON.stringify({
        query: HARVEST_STATISTICS_QUERY
      })
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    const result = await response.json();
    
    if (result.errors) {
      console.error(`❌ GraphQL Error for ${role}:`, result.errors[0].message);
      return {
        role,
        success: false,
        duration,
        error: result.errors[0].message
      };
    }

    const stats = result.data.harvestStatistics;
    console.log(`✅ Success for ${role} in ${duration}ms`);
    console.log(`   - Total Records: ${stats.totalRecords}`);
    console.log(`   - Pending: ${stats.pendingRecords}, Approved: ${stats.approvedRecords}, Rejected: ${stats.rejectedRecords}`);
    console.log(`   - Total Weight: ${stats.totalBeratTbs} kg`);
    console.log(`   - Average per Record: ${stats.averagePerRecord} kg`);
    
    return {
      role,
      success: true,
      duration,
      stats
    };

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`❌ Network Error for ${role}:`, error.message);
    return {
      role,
      success: false,
      duration,
      error: error.message
    };
  }
}

async function runPerformanceTests() {
  console.log('🚀 Starting Harvest Statistics Performance Tests');
  console.log('================================================');
  
  const testUsers = [
    { username: 'mandor', password: 'demo123', role: 'MANDOR' },
    { username: 'asisten', password: 'demo123', role: 'ASISTEN' },
    { username: 'manager', password: 'demo123', role: 'MANAGER' },
    { username: 'areamanager', password: 'demo123', role: 'AREA_MANAGER' },
    { username: 'superadmin', password: 'demo123', role: 'SUPER_ADMIN' }
  ];

  const results = [];
  
  for (const user of testUsers) {
    try {
      console.log(`\n🧪 Testing ${user.role}...`);
      
      // Login and get session
      const sessionCookies = await performLogin(user.username, user.password);
      
      // Test harvest statistics
      const result = await testHarvestStatistics(sessionCookies, user.role);
      results.push(result);
      
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Test failed for ${user.role}:`, error.message);
      results.push({
        role: user.role,
        success: false,
        duration: 0,
        error: error.message
      });
    }
  }
  
  // Summary
  console.log('\n📈 PERFORMANCE TEST SUMMARY');
  console.log('============================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful tests: ${successful.length}/${results.length}`);
  console.log(`❌ Failed tests: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    const maxDuration = Math.max(...successful.map(r => r.duration));
    const minDuration = Math.min(...successful.map(r => r.duration));
    
    console.log(`⏱️  Average response time: ${avgDuration.toFixed(2)}ms`);
    console.log(`⏱️  Fastest response: ${minDuration}ms`);
    console.log(`⏱️  Slowest response: ${maxDuration}ms`);
    
    if (maxDuration > 10000) {
      console.log('⚠️  WARNING: Some queries took longer than 10 seconds');
    }
    
    if (avgDuration < 5000) {
      console.log('🎉 EXCELLENT: Average response time under 5 seconds');
    } else if (avgDuration < 15000) {
      console.log('✅ GOOD: Average response time under 15 seconds');
    } else {
      console.log('⚠️  NEEDS OPTIMIZATION: Average response time over 15 seconds');
    }
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    failed.forEach(result => {
      console.log(`   - ${result.role}: ${result.error}`);
    });
  }
  
  // Save results to file
  const logData = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      avgDuration: successful.length > 0 ? successful.reduce((sum, r) => sum + r.duration, 0) / successful.length : 0
    }
  };
  
  fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(logData, null, 2));
  console.log(`\n📁 Test results saved to: ${TEST_RESULTS_FILE}`);
  
  return results;
}

async function main() {
  try {
    await runPerformanceTests();
    process.exit(0);
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runPerformanceTests };
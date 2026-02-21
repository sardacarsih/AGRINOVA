#!/usr/bin/env node

/**
 * Test harvestStatistics field with authentication
 */

const http = require('http');

function makeGraphQLRequest(query, cookies = '') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query });

    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            success: true,
            statusCode: res.statusCode,
            cookies: res.headers['set-cookie'],
            data: response
          });
        } catch (parseError) {
          resolve({
            success: false,
            statusCode: res.statusCode,
            error: 'Parse error: ' + parseError.message,
            rawData: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({ success: false, error: error.message });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject({ success: false, error: 'Request timeout (30s)' });
    });

    req.write(postData);
    req.end();
  });
}

async function testHarvestStatisticsWithAuth() {
  console.log('🚀 Testing harvestStatistics with Authentication');
  console.log('='.repeat(50));

  let cookies = '';

  // Step 1: Login as mandor1
  console.log('\n🔐 Step 1: Logging in as mandor1...');
  const loginQuery = `
    mutation {
      webLogin(input: {
        identifier: "demo123",
        password: "demo123"
      }) {
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
  `;

  try {
    const loginResult = await makeGraphQLRequest(loginQuery);

    if (loginResult.success && loginResult.data.data) {
      const loginData = loginResult.data.data.webLogin;
      if (loginData.success && loginResult.data.cookies) {
        cookies = loginResult.data.cookies.join('; ');
        console.log('   ✅ Login successful!');
        console.log(`   👤 User: ${loginData.user.nama} (${loginData.user.role})`);
        console.log(`   🆔 Session: ${loginData.sessionId}`);
      } else {
        console.log('   ❌ Login failed:', loginData.message);
        return;
      }
    } else {
      console.log('   ❌ Login error:', loginResult.data.errors);
      return;
    }
  } catch (error) {
    console.log('   💥 Login network error:', error);
    return;
  }

  // Step 2: Test harvestStatistics
  console.log('\n📊 Step 2: Testing harvestStatistics Query...');
  const statisticsQuery = `
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

  try {
    const result = await makeGraphQLRequest(statisticsQuery, cookies);

    if (result.success && result.data.data) {
      if (result.data.data.harvestStatistics) {
        const stats = result.data.data.harvestStatistics;
        console.log('   ✅ SUCCESS: harvestStatistics field is working!');
        console.log('   📊 Statistics returned:');
        console.log(`      - Total Records: ${stats.totalRecords}`);
        console.log(`      - Pending: ${stats.pendingRecords}`);
        console.log(`      - Approved: ${stats.approvedRecords}`);
        console.log(`      - Rejected: ${stats.rejectedRecords}`);
        console.log(`      - Total Weight: ${stats.totalBeratTbs} kg`);
        console.log(`      - Total Bunches: ${stats.totalJanjang}`);
        console.log(`      - Average/Record: ${stats.averagePerRecord ? stats.averagePerRecord + ' kg' : 'N/A'}`);
        console.log(`      - Last Updated: ${stats.lastUpdated}`);
      } else {
        console.log('   ❌ FAILED: harvestStatistics returned null/undefined');
        console.log('   📋 Available fields:', Object.keys(result.data.data));
      }
    } else {
      console.log('   ❌ FAILED: GraphQL Query Error');
      console.log('   📋 Error details:', result.data.errors);
    }
  } catch (error) {
    console.log('   💥 Network Error:', error);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎯 Test Results Summary');
  console.log('='.repeat(50));
}

if (require.main === module) {
  testHarvestStatisticsWithAuth().catch(console.error);
}

module.exports = { testHarvestStatisticsWithAuth };
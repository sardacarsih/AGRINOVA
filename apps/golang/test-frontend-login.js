#!/usr/bin/env node

/**
 * Test frontend login that was previously failing with Division.estate field error
 */

const fetch = require('node-fetch');

async function testFrontendLogin() {
  console.log('🔍 Testing frontend login with updated Division queries...');

  // Login mutation similar to what the frontend uses
  const loginQuery = `
    mutation Login($input: LoginInput!) {
      login(input: $input) {
        accessToken
        refreshToken
        tokenType
        expiresIn
        expiresAt
        refreshExpiresAt
        user {
          id
          username
          nama
          email
          role
          companyId
          company {
            id
            nama
            status
          }
        }
        assignments {
          companies {
            id
            nama
            status
          }
          estates {
            id
            nama
            lokasi
            luasHa
          }
          divisions {
            id
            nama
            kode
            estateId
          }
        }
      }
    }
  `;

  const variables = {
    input: {
      identifier: "mandor1",
      password: "password123",
      platform: "WEB"
    }
  };

  try {
    const response = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: loginQuery,
        variables: variables
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error('❌ GraphQL Errors:');
      result.errors.forEach(error => {
        console.error(`   - ${error.message}`);
        if (error.path) {
          console.error(`     Path: ${error.path.join('.')}`);
        }
      });
      return false;
    }

    console.log('✅ Frontend login query successful!');
    console.log('📊 Results:');

    if (result.data && result.data.login) {
      const login = result.data.login;
      console.log(`   User: ${login.user.nama} (${login.user.role})`);
      console.log(`   Company: ${login.user.company.nama}`);

      if (login.assignments && login.assignments.divisions) {
        console.log(`   Divisions assigned: ${login.assignments.divisions.length}`);
        login.assignments.divisions.forEach((division, index) => {
          console.log(`     ${index + 1}. ${division.nama} (${division.kode}) - Estate ID: ${division.estateId}`);
        });
      }
    }

    return true;

  } catch (error) {
    console.error('❌ Network Error:', error.message);
    return false;
  }
}

// Run the test
testFrontendLogin().then(success => {
  if (success) {
    console.log('🎉 Frontend login test completed successfully!');
  } else {
    console.log('💥 Frontend login test failed!');
    process.exit(1);
  }
});
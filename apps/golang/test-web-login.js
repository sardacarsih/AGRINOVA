#!/usr/bin/env node

/**
 * Test web login using the correct mutation
 */

const fetch = require('node-fetch');

async function testWebLogin() {
  console.log('🔍 Testing web login with correct mutation...');

  // Web login mutation that's actually available
  const webLoginQuery = `
    mutation WebLogin($input: WebLoginInput!) {
      webLogin(input: $input) {
        success
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
        companies {
          id
          nama
          status
        }
        assignments {
          estates {
            id
            nama
          }
          divisions {
            id
            nama
            estateId
          }
          companies {
            id
            nama
          }
        }
        sessionId
        message
      }
    }
  `;

  const variables = {
    input: {
      identifier: "mandor1",
      password: "password123"
    }
  };

  try {
    const response = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: webLoginQuery,
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

    console.log('✅ Web login query successful!');
    console.log('📊 Results:');

    if (result.data && result.data.webLogin) {
      const login = result.data.webLogin;
      console.log(`   Success: ${login.success}`);
      console.log(`   Message: ${login.message}`);

      if (login.user) {
        console.log(`   User: ${login.user.nama} (${login.user.role})`);
        console.log(`   Company: ${login.user.company.nama}`);
      }

      if (login.assignments && login.assignments.divisions) {
        console.log(`   Divisions assigned: ${login.assignments.divisions.length}`);
        login.assignments.divisions.forEach((division, index) => {
          console.log(`     ${index + 1}. ${division.nama} - Estate ID: ${division.estateId}`);
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
testWebLogin().then(success => {
  if (success) {
    console.log('🎉 Web login test completed successfully!');
  } else {
    console.log('💥 Web login test failed!');
    process.exit(1);
  }
});
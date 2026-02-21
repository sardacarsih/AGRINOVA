// Test RBAC Statistics GraphQL Query
const fetch = require('node-fetch');

const query = `
query {
  rbacStats {
    totalRoles
    activeRoles
    systemRoles
    customRoles
    totalPermissions
    activePermissions
    totalRolePermissions
    totalUserOverrides
    activeUserOverrides
    expiredUserOverrides
  }
}
`;

async function testRBACStats() {
  try {
    console.log('🧪 Testing RBAC Statistics Query...');

    const response = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error('❌ GraphQL Errors:');
      result.errors.forEach(err => {
        console.error(`  - ${err.message}`);
        console.error(`    Location: ${err.locations ? JSON.stringify(err.locations) : 'undefined'}`);
        console.error(`    Path: ${err.path ? JSON.stringify(err.path) : 'undefined'}`);
      });
    } else {
      console.log('✅ RBAC Statistics Query Success:');
      console.log(JSON.stringify(result.data, null, 2));
    }
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

testRBACStats();
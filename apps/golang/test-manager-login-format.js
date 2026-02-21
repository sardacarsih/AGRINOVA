const { default: fetch } = require('node-fetch');

async function testManagerLogin() {
  console.log('🔐 Testing Manager Login with JWT Authentication...');
  
  const mutation = `
    mutation ManagerLogin {
      login(input: {
        identifier: "manager1"
        password: "demo123"
        platform: WEB
      }) {
        accessToken
        refreshToken
        user {
          id
          username
          nama
          role
        }
        assignments {
          estates {
            id
            nama
            company {
              id
              nama
            }
          }
          divisions {
            id
            nama
            kode
            estate {
              id
              nama
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      return false;
    }

    if (result.data && result.data.login) {
      console.log('✅ Manager login successful!');
      console.log('📋 Response summary:');
      console.log(`   - Access Token: ${result.data.login.accessToken ? 'Present ✅' : 'Missing ❌'}`);
      console.log(`   - Refresh Token: ${result.data.login.refreshToken ? 'Present ✅' : 'Missing ❌'}`);
      console.log(`   - User ID: ${result.data.login.user.id}`);
      console.log(`   - Username: ${result.data.login.user.username}`);
      console.log(`   - Role: ${result.data.login.user.role}`);
      console.log(`   - Name: ${result.data.login.user.nama}`);
      
      if (result.data.login.assignments?.estates) {
        console.log(`   - Estate Assignments: ${result.data.login.assignments.estates.length} estates`);
        result.data.login.assignments.estates.forEach((estate, index) => {
          console.log(`     ${index + 1}. ${estate.nama} (Company: ${estate.company.nama})`);
        });
      }
      
      if (result.data.login.assignments?.divisions) {
        console.log(`   - Division Assignments: ${result.data.login.assignments.divisions.length} divisions`);
      }
      
      console.log('\n🎉 Manager JWT Authentication is working correctly!');
      return true;
    } else {
      console.error('❌ Manager login failed - no data returned');
      console.log('Response:', JSON.stringify(result, null, 2));
      return false;
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testManagerLogin().then(success => {
    if (success) {
      console.log('\n🚀 Manager login test completed successfully!');
      process.exit(0);
    } else {
      console.log('\n💥 Manager login test failed!');
      process.exit(1);
    }
  });
}

module.exports = { testManagerLogin };

/* 
=====================================
MANAGER LOGIN FORMAT - COPY & PASTE
=====================================

GraphQL Mutation (For GraphQL Playground):
-------------------------------------------
mutation ManagerLogin {
  login(input: {
    identifier: "manager1"
    password: "demo123"
    platform: WEB
  }) {
    accessToken
    refreshToken
    user {
      id
      username
      nama
      role
    }
    assignments {
      estates {
        id
        nama
        company {
          id
          nama
        }
      }
      divisions {
        id
        nama
        kode
        estate {
          id
          nama
        }
      }
    }
  }
}

JavaScript/Fetch Format:
------------------------
fetch('http://localhost:8080/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: `
      mutation ManagerLogin {
        login(input: {
          identifier: "manager1"
          password: "demo123"
          platform: WEB
        }) {
          accessToken
          refreshToken
          user {
            id
            username
            nama
            role
          }
          assignments {
            estates {
              id
              nama
              company {
                id
                nama
              }
            }
            divisions {
              id
              nama
              kode
              estate {
                id
                nama
              }
            }
          }
        }
      }
    `
  })
}).then(r => r.json()).then(console.log);

Key Differences from SuperAdmin:
--------------------------------
1. ✅ Uses "manager1" as identifier (not "superadmin")
2. ✅ Returns estates instead of companies in assignments
3. ✅ Includes divisions for multi-division management
4. ✅ Shows estate-company relationships for context
5. ✅ Role-specific permissions for MANAGER role

Expected Response Structure:
----------------------------
{
  "data": {
    "login": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "user": {
        "id": "uuid-here",
        "username": "manager1",
        "nama": "Manager User",
        "role": "MANAGER"
      },
      "assignments": {
        "estates": [
          {
            "id": "estate-uuid",
            "nama": "Estate Name",
            "company": {
              "id": "company-uuid",
              "nama": "Company Name"
            }
          }
        ],
        "divisions": [
          {
            "id": "division-uuid",
            "nama": "Division Name",
            "kode": "DIV001",
            "estate": {
              "id": "estate-uuid",
              "nama": "Estate Name"
            }
          }
        ]
      }
    }
  }
}
*/
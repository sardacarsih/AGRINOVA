const { default: fetch } = require('node-fetch');
const crypto = require('crypto');

// Generate realistic device fingerprint
function generateDeviceFingerprint() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return crypto.createHash('sha256').update(`${timestamp}-${random}`).digest('hex').substring(0, 32);
}

// Generate realistic device ID
function generateDeviceId() {
  return 'android_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
}

async function testSatpamMobileLogin() {
  console.log('📱 Testing Satpam Mobile Login (Android Platform)...');
  
  const deviceId = generateDeviceId();
  const deviceFingerprint = generateDeviceFingerprint();
  
  console.log(`🔐 Device ID: ${deviceId}`);
  console.log(`🔑 Device Fingerprint: ${deviceFingerprint.substring(0, 16)}...`);
  
  const mutation = `
    mutation SatpamMobileLogin($input: LoginInput!) {
      login(input: $input) {
        accessToken
        refreshToken
        offlineToken
        tokenType
        expiresIn
        expiresAt
        refreshExpiresAt
        offlineExpiresAt
        user {
          id
          username
          nama
          role
          companyId
          company {
            id
            nama
          }
          isActive
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
          }
          divisions {
            id
            nama
          }
        }
      }
    }
  `;

  const variables = {
    input: {
      identifier: "satpam1",
      password: "demo123",
      platform: "ANDROID",
      deviceId: deviceId,
      deviceFingerprint: deviceFingerprint,
      rememberDevice: true,
      deviceInfo: {
        model: "Samsung Galaxy S21",
        osVersion: "Android 13",
        appVersion: "1.0.0",
        deviceName: "Samsung SM-G991B",
        screenResolution: "2400x1080",
        deviceLanguage: "id-ID"
      }
    }
  };

  try {
    const response = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: variables
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      return false;
    }

    if (result.data && result.data.login) {
      const loginData = result.data.login;
      
      console.log('✅ Satpam mobile login successful!');
      console.log('📋 Authentication Response:');
      console.log(`   - Access Token: ${loginData.accessToken ? 'Present ✅' : 'Missing ❌'}`);
      console.log(`   - Refresh Token: ${loginData.refreshToken ? 'Present ✅' : 'Missing ❌'}`);
      console.log(`   - Offline Token: ${loginData.offlineToken ? 'Present ✅' : 'Missing ❌'}`);
      console.log(`   - Token Type: ${loginData.tokenType}`);
      console.log(`   - Expires In: ${loginData.expiresIn} seconds`);
      
      console.log('\n👤 User Information:');
      console.log(`   - User ID: ${loginData.user.id}`);
      console.log(`   - Username: ${loginData.user.username}`);
      console.log(`   - Role: ${loginData.user.role}`);
      console.log(`   - Name: ${loginData.user.nama}`);
      console.log(`   - Company: ${loginData.user.company.nama}`);
      console.log(`   - Active: ${loginData.user.isActive ? '✅' : '❌'}`);
      
      console.log('\n🏢 Company Assignments:');
      if (loginData.assignments?.companies?.length > 0) {
        loginData.assignments.companies.forEach((company, index) => {
          console.log(`   ${index + 1}. ${company.nama} (Status: ${company.status})`);
        });
      } else {
        console.log('   - No company assignments');
      }
      
      console.log('\n🏭 Estate Access:');
      if (loginData.assignments?.estates?.length > 0) {
        loginData.assignments.estates.forEach((estate, index) => {
          console.log(`   ${index + 1}. ${estate.nama}`);
        });
      } else {
        console.log('   - No estate assignments (Expected for SATPAM role)');
      }
      
      console.log('\n📅 Token Expiration:');
      console.log(`   - Access Token Expires: ${new Date(loginData.expiresAt).toLocaleString()}`);
      if (loginData.refreshExpiresAt) {
        console.log(`   - Refresh Token Expires: ${new Date(loginData.refreshExpiresAt).toLocaleString()}`);
      }
      if (loginData.offlineExpiresAt) {
        console.log(`   - Offline Token Expires: ${new Date(loginData.offlineExpiresAt).toLocaleString()}`);
        const offlineDays = Math.ceil((new Date(loginData.offlineExpiresAt) - new Date()) / (1000 * 60 * 60 * 24));
        console.log(`   - Offline Duration: ${offlineDays} days 🔋`);
      }
      
      console.log('\n🎉 Mobile Authentication is working correctly!');
      console.log('📱 Ready for offline-first gate check operations');
      return true;
    } else {
      console.error('❌ Satpam mobile login failed - no data returned');
      console.log('Response:', JSON.stringify(result, null, 2));
      return false;
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
    return false;
  }
}

// Test with simplified input (for basic testing)
async function testSatpamSimpleLogin() {
  console.log('\n📱 Testing Satpam Simple Mobile Login...');
  
  const mutation = `
    mutation SatpamSimpleLogin {
      login(input: {
        identifier: "satpam1"
        password: "demo123"
        platform: ANDROID
      }) {
        accessToken
        refreshToken
        offlineToken
        user {
          id
          username
          nama
          role
        }
        assignments {
          companies {
            id
            nama
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
      console.error('❌ Simple login errors:', JSON.stringify(result.errors, null, 2));
      return false;
    }

    if (result.data && result.data.login) {
      console.log('✅ Simple mobile login successful!');
      console.log(`   - Username: ${result.data.login.user.username}`);
      console.log(`   - Role: ${result.data.login.user.role}`);
      console.log(`   - Offline Token: ${result.data.login.offlineToken ? 'Present ✅' : 'Missing ❌'}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Simple login error:', error.message);
    return false;
  }
}

// Run both tests
async function runAllTests() {
  console.log('🚀 Starting Satpam Mobile Authentication Tests\n');
  
  let allPassed = true;
  
  // Test full mobile login
  const fullTest = await testSatpamMobileLogin();
  allPassed = allPassed && fullTest;
  
  // Test simple mobile login
  const simpleTest = await testSatpamSimpleLogin();
  allPassed = allPassed && simpleTest;
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 All Satpam mobile authentication tests passed!');
    console.log('📱 Mobile app authentication is ready for production');
  } else {
    console.log('💥 Some tests failed - check authentication configuration');
  }
  
  return allPassed;
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { 
  testSatpamMobileLogin, 
  testSatpamSimpleLogin, 
  runAllTests 
};

/* 
=====================================
SATPAM MOBILE LOGIN FORMAT
=====================================

🔥 FULL MOBILE LOGIN (Flutter/React Native):
-------------------------------------------
mutation SatpamMobileLogin($input: LoginInput!) {
  login(input: $input) {
    accessToken
    refreshToken
    offlineToken
    tokenType
    expiresIn
    expiresAt
    refreshExpiresAt
    offlineExpiresAt
    user {
      id
      username
      nama
      role
      companyId
      company {
        id
        nama
      }
      isActive
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
      }
      divisions {
        id
        nama
      }
    }
  }
}

Variables:
{
  "input": {
    "identifier": "satpam1",
    "password": "demo123",
    "platform": "ANDROID",
    "deviceId": "android_1234567890abcdef",
    "deviceFingerprint": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "rememberDevice": true,
    "deviceInfo": {
      "model": "Samsung Galaxy S21",
      "osVersion": "Android 13",
      "appVersion": "1.0.0", 
      "deviceName": "Samsung SM-G991B",
      "screenResolution": "2400x1080",
      "deviceLanguage": "id-ID"
    }
  }
}

📱 SIMPLE MOBILE LOGIN (Quick Testing):
---------------------------------------
mutation SatpamSimpleLogin {
  login(input: {
    identifier: "satpam1"
    password: "demo123"
    platform: ANDROID
  }) {
    accessToken
    refreshToken
    offlineToken
    user {
      id
      username
      nama
      role
    }
    assignments {
      companies {
        id
        nama
      }
    }
  }
}

🚀 FLUTTER/DART EXAMPLE:
------------------------
```dart
Future<AuthResponse> satpamMobileLogin() async {
  final mutation = '''
    mutation SatpamMobileLogin(\$input: LoginInput!) {
      login(input: \$input) {
        accessToken
        refreshToken
        offlineToken
        user {
          id
          username
          nama
          role
          company {
            id
            nama
          }
        }
        assignments {
          companies {
            id
            nama
          }
        }
      }
    }
  ''';
  
  final variables = {
    'input': {
      'identifier': 'satpam1',
      'password': 'demo123', 
      'platform': 'ANDROID',
      'deviceId': await DeviceService.getDeviceId(),
      'deviceFingerprint': await DeviceService.getFingerprint(),
      'rememberDevice': true,
      'deviceInfo': {
        'model': await DeviceService.getModel(),
        'osVersion': await DeviceService.getOSVersion(),
        'appVersion': await PackageInfo.fromPlatform().then((info) => info.version),
        'deviceName': await DeviceService.getDeviceName(),
        'screenResolution': await DeviceService.getScreenResolution(),
        'deviceLanguage': Platform.localeName,
      }
    }
  };
  
  // Execute GraphQL mutation and return result
  return await graphQLClient.mutate(
    MutationOptions(
      document: gql(mutation),
      variables: variables,
    ),
  );
}
```

🔐 KEY FEATURES FOR SATPAM MOBILE:
----------------------------------
✅ Offline Token: 30-day validity for offline gate check operations
✅ Device Binding: Secure device fingerprinting and registration  
✅ Company Access: Satpam gets company-level permissions (not estates/divisions)
✅ Role Validation: SATPAM role with gate check specific permissions
✅ Mobile Platform: Android/iOS platform detection and handling
✅ Device Info: Complete device information for security and analytics
✅ Remember Device: Trusted device functionality for streamlined login

🎯 SATPAM ROLE CHARACTERISTICS:
-------------------------------
- Role: SATPAM (Security personnel)
- Access Level: Company-level (not estate or division specific)
- Primary Function: Gate check operations (entry/exit logging)
- Mobile Access: ✅ (Offline-first for gate operations)
- Web Access: ✅ (Monitoring and reporting)
- Offline Duration: 30 days (longest offline capability)
- Device Binding: Required for mobile security

📊 EXPECTED RESPONSE:
--------------------
{
  "data": {
    "login": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...", 
      "offlineToken": "eyJ...",
      "tokenType": "Bearer",
      "expiresIn": 900,
      "user": {
        "id": "c0000000-0000-0000-0000-000000000001",
        "username": "satpam1",
        "nama": "Satpam Gate Agrinova 1",
        "role": "SATPAM",
        "company": {
          "id": "01234567-89ab-cdef-0123-456789abcdef",
          "nama": "PT Agrinova Sawit Utama"
        }
      },
      "assignments": {
        "companies": [
          {
            "id": "01234567-89ab-cdef-0123-456789abcdef",
            "nama": "PT Agrinova Sawit Utama",
            "status": "ACTIVE"
          }
        ],
        "estates": [],
        "divisions": []
      }
    }
  }
}
*/
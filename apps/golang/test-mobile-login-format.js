const { default: fetch } = require('node-fetch');

// Test format data login mobile
async function testMobileLoginFormat() {
  console.log('📱 Testing Mobile Login Data Format...\n');

  // 1. Basic Mobile Login Format (Minimum Required)
  console.log('🔥 1. BASIC MOBILE LOGIN FORMAT:');
  console.log('================================');
  
  const basicMutation = `
    mutation MobileLoginBasic {
      login(input: {
        identifier: "superadmin"
        password: "demo123"
        platform: ANDROID
      }) {
        accessToken
        refreshToken
        offlineToken
        tokenType
        expiresIn
        user {
          id
          username
          nama
          role
        }
        assignments {
          companies { id nama }
        }
      }
    }
  `;

  console.log('GraphQL Mutation:');
  console.log(basicMutation);
  
  console.log('\nJSON Variables (Minimal):');
  console.log(JSON.stringify({
    input: {
      identifier: "superadmin",
      password: "demo123", 
      platform: "ANDROID"
    }
  }, null, 2));

  // Test basic format
  try {
    const response = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: basicMutation })
    });

    const result = await response.json();
    
    if (result.data?.login) {
      console.log('\n✅ BASIC FORMAT WORKS!');
      console.log(`   Username: ${result.data.login.user.username}`);
      console.log(`   Role: ${result.data.login.user.role}`);
      console.log(`   Access Token: ${result.data.login.accessToken ? 'Present ✅' : 'Missing ❌'}`);
      console.log(`   Offline Token: ${result.data.login.offlineToken ? 'Present ✅' : 'Missing ❌'}`);
    } else {
      console.log('\n❌ Basic format failed:', result.errors?.[0]?.message);
    }
  } catch (error) {
    console.log('\n❌ Network error:', error.message);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // 2. Full Mobile Login Format with Device Info
  console.log('🚀 2. FULL MOBILE LOGIN FORMAT:');
  console.log('===============================');

  const fullMutation = `
    mutation MobileLoginFull($input: LoginInput!) {
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
          company {
            id
            nama
          }
        }
        assignments {
          companies {
            id
            nama
            status
          }
        }
      }
    }
  `;

  const fullVariables = {
    input: {
      identifier: "superadmin",
      password: "demo123",
      platform: "ANDROID",
      deviceId: "android_demo_device_123",
      deviceFingerprint: "sha256_fingerprint_demo_hash_456",
      rememberDevice: true,
      deviceInfo: {
        model: "Samsung Galaxy S21",
        osVersion: "Android 13",
        appVersion: "1.0.0",
        deviceName: "Demo Android Device",
        screenResolution: "2400x1080",
        deviceLanguage: "id-ID"
      }
    }
  };

  console.log('GraphQL Mutation with Variables:');
  console.log(fullMutation);
  
  console.log('\nJSON Variables (Complete):');
  console.log(JSON.stringify(fullVariables, null, 2));

  // Test full format
  try {
    const response = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: fullMutation,
        variables: fullVariables 
      })
    });

    const result = await response.json();
    
    if (result.data?.login) {
      console.log('\n✅ FULL FORMAT WORKS!');
      console.log(`   Username: ${result.data.login.user.username}`);
      console.log(`   Role: ${result.data.login.user.role}`);
      console.log(`   Company: ${result.data.login.user.company?.nama}`);
      console.log(`   Access Token: ${result.data.login.accessToken ? 'Present ✅' : 'Missing ❌'}`);
      console.log(`   Refresh Token: ${result.data.login.refreshToken ? 'Present ✅' : 'Missing ❌'}`);
      console.log(`   Offline Token: ${result.data.login.offlineToken ? 'Present ✅' : 'Missing ❌'}`);
      
      if (result.data.login.offlineExpiresAt) {
        const offlineUntil = new Date(result.data.login.offlineExpiresAt);
        const daysOffline = Math.ceil((offlineUntil - new Date()) / (1000 * 60 * 60 * 24));
        console.log(`   Offline Duration: ${daysOffline} days 🔋`);
      }
    } else {
      console.log('\n❌ Full format failed:', result.errors?.[0]?.message);
    }
  } catch (error) {
    console.log('\n❌ Network error:', error.message);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // 3. Role-Specific Examples
  console.log('👥 3. ROLE-SPECIFIC LOGIN EXAMPLES:');
  console.log('===================================');

  const roleExamples = [
    {
      role: 'SATPAM',
      identifier: 'satpam1',
      description: 'Security personnel - Gate check operations'
    },
    {
      role: 'MANDOR', 
      identifier: 'mandor1',
      description: 'Field supervisor - Harvest data input'
    },
    {
      role: 'MANAGER',
      identifier: 'manager1', 
      description: 'Estate manager - Multi-estate monitoring'
    }
  ];

  roleExamples.forEach(example => {
    console.log(`\n📱 ${example.role} Login Format:`);
    console.log(`   Description: ${example.description}`);
    console.log(`   
    {
      "input": {
        "identifier": "${example.identifier}",
        "password": "demo123",
        "platform": "ANDROID",
        "deviceId": "android_${example.identifier}_device",
        "deviceFingerprint": "fingerprint_${example.identifier}_hash",
        "rememberDevice": true,
        "deviceInfo": {
          "model": "Samsung Galaxy S21",
          "osVersion": "Android 13",
          "appVersion": "1.0.0",
          "deviceName": "${example.role} Mobile Device",
          "screenResolution": "2400x1080", 
          "deviceLanguage": "id-ID"
        }
      }
    }`);
  });

  console.log('\n' + '='.repeat(80) + '\n');

  // 4. Flutter/Dart Usage Example
  console.log('🎯 4. FLUTTER/DART USAGE EXAMPLE:');
  console.log('=================================');

  console.log(`
// Basic Mobile Login in Flutter/Dart
final authResponse = await MobileAuthService.loginBasic(
  identifier: 'satpam1',
  password: 'demo123',
);

if (authResponse != null) {
  print('Login successful: \${authResponse.user.nama}');
  print('Role: \${authResponse.user.role}');
  print('Offline Token: \${authResponse.offlineToken}');
  
  // Store tokens securely
  await FlutterSecureStorage().write(
    key: 'access_token', 
    value: authResponse.accessToken
  );
} else {
  print('Login failed - check credentials');
}

// Full Mobile Login with Device Binding
final fullAuth = await MobileAuthService.loginFull(
  identifier: 'mandor1',
  password: 'demo123',
  rememberDevice: true,
);

if (fullAuth != null) {
  print('Full login successful with device binding');
  print('Offline until: \${fullAuth.offlineExpiresAt}');
  print('Assignments: \${fullAuth.assignments.divisions.length} divisions');
}
  `);

  console.log('\n' + '='.repeat(80) + '\n');

  // 5. Summary
  console.log('📋 5. SUMMARY - REQUIRED FIELDS:');
  console.log('================================');
  
  console.log(`
✅ REQUIRED (Minimal):
   - identifier: String (username atau email)
   - password: String (password user)
   - platform: PlatformType (ANDROID, IOS, WEB)

🔒 RECOMMENDED (Security):
   - deviceId: String (ID unik device)
   - deviceFingerprint: String (fingerprint device)
   - rememberDevice: Boolean (trusted device)
   - deviceInfo: Object (informasi device lengkap)

🎯 OPTIONAL (Enhanced):
   - biometricHash: String (hash biometric)

📊 RESPONSE FORMAT:
   - accessToken: JWT token (15 menit)
   - refreshToken: JWT token (7 hari)  
   - offlineToken: JWT token (30 hari - mobile only)
   - user: User object with role & company
   - assignments: Role-based access scope
  `);

  console.log('🎉 Mobile login data format guide complete!');
  console.log('📖 Check MOBILE_LOGIN_DATA_FORMAT_GUIDE.md for complete documentation');
}

// Run the test
testMobileLoginFormat();
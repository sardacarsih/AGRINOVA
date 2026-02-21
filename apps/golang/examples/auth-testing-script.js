#!/usr/bin/env node

/**
 * Comprehensive GraphQL Authentication System Testing Script
 * 
 * This script tests the enhanced GraphQL authentication system with:
 * - Role-based login and profile responses
 * - Token refresh functionality
 * - JWT validation and middleware
 * - Role-based access control
 * - Device binding for mobile platforms
 * 
 * Usage: node auth-testing-script.js
 */

const fetch = require('node-fetch');
const readline = require('readline');

// Configuration
const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'http://localhost:8080/graphql';
const TEST_USERS = {
  super_admin: { identifier: 'superadmin', password: 'password123' },
  company_admin: { identifier: 'companyadmin', password: 'password123' },
  area_manager: { identifier: 'areamanager', password: 'password123' },
  manager: { identifier: 'manager1', password: 'password123' },
  asisten: { identifier: 'asisten1', password: 'password123' },
  mandor: { identifier: 'mandor1', password: 'password123' },
  satpam: { identifier: 'satpam1', password: 'password123' },
};

// GraphQL Queries and Mutations
const QUERIES = {
  enhancedLogin: `
    mutation EnhancedLogin($input: LoginInput!) {
      enhancedLogin(input: $input) {
        accessToken
        refreshToken
        tokenType
        expiresIn
        expiresAt
        user {
          id
          username
          nama
          email
          role
          companyId
          isActive
        }
        assignments {
          companies {
            id
            nama
          }
          estates {
            id
            nama
            companyId
          }
          divisions {
            id
            nama
            estateId
          }
        }
        profile {
          ... on SuperAdminProfile {
            user {
              id
              username
              nama
              role
            }
            companies {
              id
              nama
            }
            systemStats {
              totalCompanies
              totalUsers
              totalEstates
              systemHealth {
                uptimeSeconds
                memoryUsage
                cpuUsage
                databaseStatus
              }
            }
          }
          ... on CompanyAdminProfile {
            user {
              id
              username
              nama
              role
            }
            company {
              id
              nama
            }
            companyStats {
              totalEstates
              totalUsers
              totalDivisions
              performanceMetrics {
                monthlyHarvestVolume
                averageQualityScore
                estateEfficiency
              }
            }
          }
          ... on AreaManagerProfile {
            user {
              id
              username
              nama
              role
            }
            companies {
              id
              nama
            }
            areaStats {
              companiesManaged
              totalEstates
              crossCompanyMetrics {
                bestPerformingCompany
                averagePerformance
                totalProduction
              }
            }
          }
          ... on ManagerProfile {
            user {
              id
              username
              nama
              role
            }
            company {
              id
              nama
            }
            estates {
              id
              nama
            }
            managerStats {
              estatesManaged
              totalDivisions
              estatePerformance {
                monthlyTarget
                actualProduction
                efficiency
              }
            }
          }
          ... on AsistenProfile {
            user {
              id
              username
              nama
              role
            }
            company {
              id
              nama
            }
            estate {
              id
              nama
            }
            divisions {
              id
              nama
            }
            asistenStats {
              divisionsAssigned
              pendingApprovals
              dailyWorkload {
                approvalsCompleted
                rejectionsToday
                averageApprovalTime
              }
            }
          }
          ... on MandorProfile {
            user {
              id
              username
              nama
              role
            }
            company {
              id
              nama
            }
            estate {
              id
              nama
            }
            divisions {
              id
              nama
            }
            mandorStats {
              divisionsSupervised
              dailyHarvestRecords
              fieldWorkSummary {
                recordsCreated
                blocksSupervised
                qualityScoreAverage
              }
            }
          }
          ... on SatpamProfile {
            user {
              id
              username
              nama
              role
            }
            company {
              id
              nama
            }
            gateStats {
              dailyGateChecks
              pendingApprovals
              securitySummary {
                vehiclesProcessed
                securityIncidents
                averageProcessingTime
              }
            }
          }
        }
      }
    }
  `,

  standardLogin: `
    mutation Login($input: LoginInput!) {
      login(input: $input) {
        accessToken
        refreshToken
        tokenType
        expiresIn
        expiresAt
        user {
          id
          username
          nama
          role
          companyId
        }
        assignments {
          companies { id nama }
          estates { id nama }
          divisions { id nama }
        }
      }
    }
  `,

  refreshToken: `
    mutation RefreshToken($input: RefreshTokenInput!) {
      refreshToken(input: $input) {
        accessToken
        refreshToken
        tokenType
        expiresIn
        expiresAt
      }
    }
  `,

  enhancedRefreshToken: `
    mutation EnhancedRefreshToken($input: RefreshTokenInput!) {
      enhancedRefreshToken(input: $input) {
        accessToken
        refreshToken
        tokenType
        expiresIn
        expiresAt
        user {
          id
          username
          nama
          role
        }
        profile {
          ... on SuperAdminProfile {
            systemStats {
              totalCompanies
              totalUsers
            }
          }
        }
      }
    }
  `,

  me: `
    query Me {
      me {
        id
        username
        nama
        email
        role
        companyId
        isActive
      }
    }
  `,

  myDevices: `
    query MyDevices {
      myDevices {
        id
        deviceId
        deviceFingerprint
        platform
        trustLevel
        isTrusted
        isAuthorized
        lastSeenAt
      }
    }
  `,

  logout: `
    mutation Logout {
      logout
    }
  `,
};

// Utility functions
class AuthTester {
  constructor() {
    this.tokens = {};
    this.testResults = [];
  }

  async makeGraphQLRequest(query, variables = {}, token = null) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(result.errors, null, 2)}`);
      }

      return result.data;
    } catch (error) {
      console.error('GraphQL Request Error:', error.message);
      throw error;
    }
  }

  logTest(testName, status, details = '') {
    const result = { testName, status, details, timestamp: new Date().toISOString() };
    this.testResults.push(result);
    
    const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${statusIcon} ${testName}: ${status}${details ? ` - ${details}` : ''}`);
  }

  // Test 1: Enhanced Login for all roles
  async testEnhancedLogin() {
    console.log('\n🧪 Testing Enhanced Login for All Roles');
    console.log('='.repeat(50));

    for (const [roleName, credentials] of Object.entries(TEST_USERS)) {
      try {
        const result = await this.makeGraphQLRequest(QUERIES.enhancedLogin, {
          input: {
            identifier: credentials.identifier,
            password: credentials.password,
            platform: 'WEB',
            rememberDevice: false,
          },
        });

        if (result.enhancedLogin && result.enhancedLogin.accessToken) {
          this.tokens[roleName] = {
            accessToken: result.enhancedLogin.accessToken,
            refreshToken: result.enhancedLogin.refreshToken,
            user: result.enhancedLogin.user,
            profile: result.enhancedLogin.profile,
          };

          // Validate profile structure based on role
          const profile = result.enhancedLogin.profile;
          const userRole = result.enhancedLogin.user.role;
          
          let profileValid = false;
          switch (userRole) {
            case 'SUPER_ADMIN':
              profileValid = profile.systemStats && profile.companies;
              break;
            case 'COMPANY_ADMIN':
              profileValid = profile.companyStats && profile.company;
              break;
            case 'AREA_MANAGER':
              profileValid = profile.areaStats && profile.companies;
              break;
            case 'MANAGER':
              profileValid = profile.managerStats && profile.estates;
              break;
            case 'ASISTEN':
              profileValid = profile.asistenStats && profile.divisions;
              break;
            case 'MANDOR':
              profileValid = profile.mandorStats && profile.divisions;
              break;
            case 'SATPAM':
              profileValid = profile.gateStats && profile.company;
              break;
          }

          this.logTest(
            `Enhanced Login - ${roleName.toUpperCase()}`,
            profileValid ? 'PASS' : 'WARN',
            profileValid ? `Role: ${userRole}` : 'Profile structure may be incomplete'
          );
        } else {
          this.logTest(`Enhanced Login - ${roleName.toUpperCase()}`, 'FAIL', 'No access token received');
        }
      } catch (error) {
        this.logTest(`Enhanced Login - ${roleName.toUpperCase()}`, 'FAIL', error.message);
      }
    }
  }

  // Test 2: Standard Login (backward compatibility)
  async testStandardLogin() {
    console.log('\n🧪 Testing Standard Login (Backward Compatibility)');
    console.log('='.repeat(50));

    const testRole = 'manager';
    const credentials = TEST_USERS[testRole];

    try {
      const result = await this.makeGraphQLRequest(QUERIES.standardLogin, {
        input: {
          identifier: credentials.identifier,
          password: credentials.password,
          platform: 'WEB',
        },
      });

      if (result.login && result.login.accessToken) {
        this.logTest('Standard Login', 'PASS', `Role: ${result.login.user.role}`);
      } else {
        this.logTest('Standard Login', 'FAIL', 'No access token received');
      }
    } catch (error) {
      this.logTest('Standard Login', 'FAIL', error.message);
    }
  }

  // Test 3: Token Refresh
  async testTokenRefresh() {
    console.log('\n🧪 Testing Token Refresh');
    console.log('='.repeat(50));

    const testRole = 'manager';
    const tokenData = this.tokens[testRole];

    if (!tokenData) {
      this.logTest('Token Refresh', 'FAIL', 'No token available for testing');
      return;
    }

    try {
      // Test standard refresh
      const standardResult = await this.makeGraphQLRequest(QUERIES.refreshToken, {
        input: {
          refreshToken: tokenData.refreshToken,
        },
      });

      if (standardResult.refreshToken && standardResult.refreshToken.accessToken) {
        this.logTest('Standard Token Refresh', 'PASS', 'New tokens received');
      } else {
        this.logTest('Standard Token Refresh', 'FAIL', 'No new tokens received');
      }

      // Test enhanced refresh
      const enhancedResult = await this.makeGraphQLRequest(QUERIES.enhancedRefreshToken, {
        input: {
          refreshToken: tokenData.refreshToken,
        },
      });

      if (enhancedResult.enhancedRefreshToken && enhancedResult.enhancedRefreshToken.profile) {
        this.logTest('Enhanced Token Refresh', 'PASS', 'New tokens with profile received');
      } else {
        this.logTest('Enhanced Token Refresh', 'FAIL', 'No profile data in refresh response');
      }
    } catch (error) {
      this.logTest('Token Refresh', 'FAIL', error.message);
    }
  }

  // Test 4: Protected Queries
  async testProtectedQueries() {
    console.log('\n🧪 Testing Protected Queries');
    console.log('='.repeat(50));

    const testRole = 'manager';
    const tokenData = this.tokens[testRole];

    if (!tokenData) {
      this.logTest('Protected Queries', 'FAIL', 'No token available for testing');
      return;
    }

    try {
      // Test Me query
      const meResult = await this.makeGraphQLRequest(QUERIES.me, {}, tokenData.accessToken);
      
      if (meResult.me && meResult.me.id) {
        this.logTest('Me Query', 'PASS', `User: ${meResult.me.username}`);
      } else {
        this.logTest('Me Query', 'FAIL', 'No user data received');
      }

      // Test MyDevices query
      const devicesResult = await this.makeGraphQLRequest(QUERIES.myDevices, {}, tokenData.accessToken);
      
      if (Array.isArray(devicesResult.myDevices)) {
        this.logTest('MyDevices Query', 'PASS', `Devices: ${devicesResult.myDevices.length}`);
      } else {
        this.logTest('MyDevices Query', 'FAIL', 'No devices data received');
      }
    } catch (error) {
      this.logTest('Protected Queries', 'FAIL', error.message);
    }
  }

  // Test 5: Unauthorized Access
  async testUnauthorizedAccess() {
    console.log('\n🧪 Testing Unauthorized Access');
    console.log('='.repeat(50));

    try {
      // Test without token
      await this.makeGraphQLRequest(QUERIES.me);
      this.logTest('Unauthorized Access - No Token', 'FAIL', 'Should have been rejected');
    } catch (error) {
      this.logTest('Unauthorized Access - No Token', 'PASS', 'Correctly rejected');
    }

    try {
      // Test with invalid token
      await this.makeGraphQLRequest(QUERIES.me, {}, 'invalid-token');
      this.logTest('Unauthorized Access - Invalid Token', 'FAIL', 'Should have been rejected');
    } catch (error) {
      this.logTest('Unauthorized Access - Invalid Token', 'PASS', 'Correctly rejected');
    }
  }

  // Test 6: Mobile Device Binding
  async testMobileDeviceBinding() {
    console.log('\n🧪 Testing Mobile Device Binding');
    console.log('='.repeat(50));

    const credentials = TEST_USERS.mandor;

    try {
      const result = await this.makeGraphQLRequest(QUERIES.enhancedLogin, {
        input: {
          identifier: credentials.identifier,
          password: credentials.password,
          platform: 'ANDROID',
          deviceId: 'test-device-001',
          deviceFingerprint: 'android-samsung-galaxy-s21',
          deviceInfo: {
            model: 'Galaxy S21',
            osVersion: '11.0',
            appVersion: '1.0.0',
            deviceName: 'Test Device',
          },
          rememberDevice: true,
        },
      });

      if (result.enhancedLogin && result.enhancedLogin.offlineToken) {
        this.logTest('Mobile Device Binding', 'PASS', 'Offline token received');
      } else {
        this.logTest('Mobile Device Binding', 'WARN', 'No offline token for mobile login');
      }
    } catch (error) {
      this.logTest('Mobile Device Binding', 'FAIL', error.message);
    }
  }

  // Test 7: Role-Based Profile Validation
  async testRoleBasedProfiles() {
    console.log('\n🧪 Testing Role-Based Profile Validation');
    console.log('='.repeat(50));

    const testCases = [
      { role: 'super_admin', expectedFields: ['systemStats', 'companies'] },
      { role: 'company_admin', expectedFields: ['companyStats', 'company'] },
      { role: 'manager', expectedFields: ['managerStats', 'estates'] },
      { role: 'asisten', expectedFields: ['asistenStats', 'divisions'] },
      { role: 'mandor', expectedFields: ['mandorStats', 'divisions'] },
      { role: 'satpam', expectedFields: ['gateStats', 'company'] },
    ];

    for (const testCase of testCases) {
      const tokenData = this.tokens[testCase.role];
      
      if (!tokenData) {
        this.logTest(`Profile Validation - ${testCase.role.toUpperCase()}`, 'SKIP', 'No token available');
        continue;
      }

      const profile = tokenData.profile;
      const hasAllFields = testCase.expectedFields.every(field => profile && profile[field]);

      this.logTest(
        `Profile Validation - ${testCase.role.toUpperCase()}`,
        hasAllFields ? 'PASS' : 'FAIL',
        hasAllFields ? 'All expected fields present' : `Missing fields: ${testCase.expectedFields.filter(field => !profile || !profile[field]).join(', ')}`
      );
    }
  }

  // Test 8: Logout Functionality
  async testLogout() {
    console.log('\n🧪 Testing Logout Functionality');
    console.log('='.repeat(50));

    const testRole = 'manager';
    const tokenData = this.tokens[testRole];

    if (!tokenData) {
      this.logTest('Logout', 'FAIL', 'No token available for testing');
      return;
    }

    try {
      // Logout
      const logoutResult = await this.makeGraphQLRequest(QUERIES.logout, {}, tokenData.accessToken);
      
      if (logoutResult.logout === true) {
        this.logTest('Logout', 'PASS', 'Logout successful');

        // Verify token is invalidated
        try {
          await this.makeGraphQLRequest(QUERIES.me, {}, tokenData.accessToken);
          this.logTest('Token Invalidation', 'FAIL', 'Token still valid after logout');
        } catch (error) {
          this.logTest('Token Invalidation', 'PASS', 'Token correctly invalidated');
        }
      } else {
        this.logTest('Logout', 'FAIL', 'Logout returned false');
      }
    } catch (error) {
      this.logTest('Logout', 'FAIL', error.message);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Comprehensive GraphQL Authentication Tests');
    console.log('='.repeat(60));
    console.log(`📍 GraphQL Endpoint: ${GRAPHQL_ENDPOINT}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    await this.testEnhancedLogin();
    await this.testStandardLogin();
    await this.testTokenRefresh();
    await this.testProtectedQueries();
    await this.testUnauthorizedAccess();
    await this.testMobileDeviceBinding();
    await this.testRoleBasedProfiles();
    await this.testLogout();

    this.printSummary();
  }

  // Print test summary
  printSummary() {
    console.log('\n📊 Test Summary');
    console.log('='.repeat(60));

    const summary = this.testResults.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    }, {});

    console.log(`✅ PASSED: ${summary.PASS || 0}`);
    console.log(`❌ FAILED: ${summary.FAIL || 0}`);
    console.log(`⚠️  WARNINGS: ${summary.WARN || 0}`);
    console.log(`⏭️  SKIPPED: ${summary.SKIP || 0}`);
    console.log(`📝 TOTAL TESTS: ${this.testResults.length}`);

    const passRate = ((summary.PASS || 0) / this.testResults.length * 100).toFixed(1);
    console.log(`📈 SUCCESS RATE: ${passRate}%`);

    if (summary.FAIL > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   • ${r.testName}: ${r.details}`));
    }

    console.log('\n🏁 Testing completed at:', new Date().toISOString());
  }
}

// Interactive mode
async function runInteractiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

  console.log('🎯 GraphQL Authentication Testing Tool');
  console.log('=====================================');
  
  const endpoint = await question(`GraphQL Endpoint (${GRAPHQL_ENDPOINT}): `);
  if (endpoint.trim()) {
    process.env.GRAPHQL_ENDPOINT = endpoint.trim();
  }

  const testChoice = await question(`
Choose test mode:
1. Run all tests (recommended)
2. Test specific role login
3. Test token refresh only
4. Test unauthorized access
5. Exit

Enter choice (1-5): `);

  const tester = new AuthTester();

  switch (testChoice.trim()) {
    case '1':
      await tester.runAllTests();
      break;
    case '2':
      console.log('\nAvailable roles:', Object.keys(TEST_USERS).join(', '));
      const role = await question('Enter role to test: ');
      if (TEST_USERS[role]) {
        await tester.testEnhancedLogin();
      } else {
        console.log('❌ Invalid role');
      }
      break;
    case '3':
      await tester.testEnhancedLogin();
      await tester.testTokenRefresh();
      break;
    case '4':
      await tester.testUnauthorizedAccess();
      break;
    case '5':
      console.log('👋 Goodbye!');
      rl.close();
      return;
    default:
      console.log('❌ Invalid choice');
  }

  rl.close();
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--interactive') || args.includes('-i')) {
    runInteractiveMode().catch(console.error);
  } else {
    const tester = new AuthTester();
    tester.runAllTests().catch(console.error);
  }
}

module.exports = { AuthTester, QUERIES };
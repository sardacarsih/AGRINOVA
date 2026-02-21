/**
 * Permission Performance Test Script
 * 
 * This script tests the performance improvements made to the PermissionManager
 * Run this in the browser console on a page with user authentication
 */

(function() {
  'use strict';

  console.log('🚀 Starting PermissionManager Performance Test...');

  // Mock user for testing
  const testUser = {
    id: 'test-user-1',
    email: 'test@company.com',
    role: 'asisten',
    permissions: [
      'harvest:read',
      'harvest:create',
      'approval:view',
      'approval:approve',
      'gate_check:read',
      'report:view'
    ],
    companyId: 'company-1',
    companyAdminFor: []
  };

  const testPermissions = [
    'harvest:read',
    'harvest:create',
    'approval:view', 
    'approval:approve',
    'gate_check:read',
    'report:view',
    'user:manage' // This should return false
  ];

  // Test 1: Performance without cache (first run)
  console.log('\n📊 Test 1: Cold start performance (no cache)');
  
  if (typeof PermissionManager !== 'undefined') {
    // Clear cache first
    PermissionManager.clearCache();

    const iterations = 1000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      testPermissions.forEach(permission => {
        PermissionManager.hasPermission(testUser, permission);
      });
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const totalCalls = iterations * testPermissions.length;

    console.log(`✅ Cold start: ${totalCalls} calls in ${totalTime.toFixed(2)}ms`);
    console.log(`   Average: ${(totalTime / totalCalls).toFixed(4)}ms per call`);

    // Test 2: Performance with cache (warm)
    console.log('\n🔥 Test 2: Warm cache performance');
    
    const startTime2 = performance.now();

    for (let i = 0; i < iterations; i++) {
      testPermissions.forEach(permission => {
        PermissionManager.hasPermission(testUser, permission);
      });
    }

    const endTime2 = performance.now();
    const totalTime2 = endTime2 - startTime2;

    console.log(`✅ Warm cache: ${totalCalls} calls in ${totalTime2.toFixed(2)}ms`);
    console.log(`   Average: ${(totalTime2 / totalCalls).toFixed(4)}ms per call`);

    const improvement = ((totalTime - totalTime2) / totalTime * 100);
    console.log(`🚀 Performance improvement: ${improvement.toFixed(1)}%`);

    // Test 3: Role info caching
    console.log('\n👤 Test 3: Role info caching');
    
    const roleStartTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      PermissionManager.getRoleDisplayInfo(testUser.role);
    }
    const roleEndTime = performance.now();
    
    console.log(`✅ Role info: 1000 calls in ${(roleEndTime - roleStartTime).toFixed(2)}ms`);
    console.log(`   Average: ${((roleEndTime - roleStartTime) / 1000).toFixed(4)}ms per call`);

    // Test 4: Cache efficiency by checking results
    console.log('\n🔍 Test 4: Cache correctness');
    
    testPermissions.forEach(permission => {
      const result = PermissionManager.hasPermission(testUser, permission);
      const expected = testUser.permissions.includes(permission);
      const status = result === expected ? '✅' : '❌';
      console.log(`   ${status} ${permission}: ${result} (expected: ${expected})`);
    });

    console.log('\n🎉 Performance test completed!');
    console.log('\n💡 Benefits of the optimization:');
    console.log('   - Permission results are cached for 5 seconds');
    console.log('   - Console logging only in development mode');
    console.log('   - Memoized role display info and redirect paths');
    console.log('   - React hooks use useCallback and useMemo for stability');
    console.log('   - Reduced re-renders in components using permissions');

  } else {
    console.error('❌ PermissionManager not found. Make sure you\'re on a page that loads it.');
  }

})();

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testPermissionPerformance = function() {
    console.clear();
    // Re-run the test function
    eval(document.currentScript.innerHTML);
  };
}
/**
 * Enhanced PermissionManager Test Suite
 * Tests all new functionality: wildcards, multi-actions, resource-specific, debugging
 */

// Mock user data for testing
const mockUsers = {
  superAdmin: {
    id: 'super-1',
    email: 'super@admin.com',
    name: 'Super Admin',
    role: 'super_admin',
    permissions: [],
    companyId: null,
    companyAdminFor: null
  },
  
  companyAdmin: {
    id: 'company-1',
    email: 'admin@company.com',
    name: 'Company Admin',
    role: 'company_admin',
    permissions: [],
    companyId: 'company-123',
    companyAdminFor: ['company-123']
  },
  
  areaManager: {
    id: 'area-1',
    email: 'area@manager.com',
    name: 'Area Manager',
    role: 'area_manager',
    permissions: [],
    companyId: 'company-123',
    assignedCompanies: ['company-123', 'company-456'],
    assignedCompanyNames: ['PT Agrinova', 'PT Sawit Jaya']
  },
  
  manager: {
    id: 'manager-1',
    email: 'manager@estate.com',
    name: 'Estate Manager',
    role: 'manager',
    permissions: [],
    companyId: 'company-123',
    estate: 'estate-456',
    assignedEstates: ['estate-456', 'estate-789'],
    assignedEstateNames: ['Estate Alpha', 'Estate Beta'],
    reportingToAreaManagerId: 'area-1',
    reportingToAreaManagerName: 'Area Manager'
  },
  
  asisten: {
    id: 'asisten-1',
    email: 'asisten@divisi.com',
    name: 'Asisten Lapangan',
    role: 'asisten',
    permissions: [],
    companyId: 'company-123',
    estate: 'estate-456',
    divisi: 'divisi-101',
    assignedDivisions: ['divisi-101', 'divisi-102'],
    assignedDivisionNames: ['Divisi A', 'Divisi B']
  },
  
  mandor: {
    id: 'mandor-1',
    email: 'mandor@field.com',
    name: 'Mandor Kebun',
    role: 'mandor',
    permissions: [],
    companyId: 'company-123',
    estate: 'estate-456',
    divisi: 'divisi-101'
  },
  
  satpam: {
    id: 'satpam-1',
    email: 'satpam@gate.com',
    name: 'Satpam Gate',
    role: 'satpam',
    permissions: [],
    companyId: 'company-123',
    estate: 'estate-456'
  }
};

/**
 * Test Suite Runner
 */
class PermissionManagerTestSuite {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  // Test framework methods
  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async runAll() {
    console.log('🚀 Starting Enhanced PermissionManager Test Suite\n');
    
    for (const test of this.tests) {
      try {
        await test.fn();
        this.passed++;
        console.log(`✅ ${test.name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
    console.log(`Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
    
    return { passed: this.passed, failed: this.failed, total: this.tests.length };
  }

  assertEquals(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`${message} Expected: ${expected}, Got: ${actual}`);
    }
  }

  assertTrue(condition, message = '') {
    if (!condition) {
      throw new Error(`${message} Expected true, got false`);
    }
  }

  assertFalse(condition, message = '') {
    if (condition) {
      throw new Error(`${message} Expected false, got true`);
    }
  }
}

// Create test suite instance
const testSuite = new PermissionManagerTestSuite();

// === BASIC PERMISSION TESTS ===

testSuite.test('Super Admin has all permissions', () => {
  const result = PermissionManager.hasPermission(mockUsers.superAdmin, 'harvest:create');
  testSuite.assertTrue(result, 'Super admin should have all permissions');
});

testSuite.test('Basic role-based permission check', () => {
  const result = PermissionManager.hasPermission(mockUsers.mandor, 'harvest:create');
  testSuite.assertTrue(result, 'Mandor should have harvest create permission');
});

testSuite.test('Permission denial for insufficient role', () => {
  const result = PermissionManager.hasPermission(mockUsers.mandor, 'company:create');
  testSuite.assertFalse(result, 'Mandor should not have company create permission');
});

// === ENHANCED ACTION COVERAGE TESTS ===

testSuite.test('Enhanced action mapping - harvest operations', () => {
  const createResult = PermissionManager.canPerformAction(mockUsers.mandor, 'create_harvest');
  const viewResult = PermissionManager.canPerformAction(mockUsers.mandor, 'view_harvest');
  const fieldResult = PermissionManager.canPerformAction(mockUsers.mandor, 'field_operations');
  
  testSuite.assertTrue(createResult, 'Mandor should be able to create harvest');
  testSuite.assertTrue(viewResult, 'Mandor should be able to view harvest');
  testSuite.assertTrue(fieldResult, 'Mandor should be able to perform field operations');
});

testSuite.test('Enhanced action mapping - approval workflow', () => {
  const approveResult = PermissionManager.canPerformAction(mockUsers.asisten, 'approve_harvest');
  const rejectResult = PermissionManager.canPerformAction(mockUsers.asisten, 'reject_harvest');
  const reviewResult = PermissionManager.canPerformAction(mockUsers.asisten, 'review_harvest');
  
  testSuite.assertTrue(approveResult, 'Asisten should be able to approve harvest');
  testSuite.assertTrue(rejectResult, 'Asisten should be able to reject harvest');
  testSuite.assertTrue(reviewResult, 'Asisten should be able to review harvest');
});

testSuite.test('Enhanced action mapping - gate operations', () => {
  const gateCheckResult = PermissionManager.canPerformAction(mockUsers.satpam, 'create_gate_check');
  const vehicleEntryResult = PermissionManager.canPerformAction(mockUsers.satpam, 'log_vehicle_entry');
  const vehicleExitResult = PermissionManager.canPerformAction(mockUsers.satpam, 'log_vehicle_exit');
  
  testSuite.assertTrue(gateCheckResult, 'Satpam should be able to create gate check');
  testSuite.assertTrue(vehicleEntryResult, 'Satpam should be able to log vehicle entry');
  testSuite.assertTrue(vehicleExitResult, 'Satpam should be able to log vehicle exit');
});

testSuite.test('Enhanced action mapping - reporting', () => {
  const viewReportsResult = PermissionManager.canPerformAction(mockUsers.manager, 'view_reports');
  const exportReportsResult = PermissionManager.canPerformAction(mockUsers.manager, 'export_reports');
  const analyticsResult = PermissionManager.canPerformAction(mockUsers.manager, 'view_analytics');
  
  testSuite.assertTrue(viewReportsResult, 'Manager should be able to view reports');
  testSuite.assertTrue(exportReportsResult, 'Manager should be able to export reports');
  testSuite.assertTrue(analyticsResult, 'Manager should be able to view analytics');
});

// === WILDCARD PERMISSION TESTS ===

testSuite.test('Wildcard permissions - harvest:*', () => {
  const result = PermissionManager.hasWildcardPermission(mockUsers.mandor, 'harvest:*');
  testSuite.assertTrue(result, 'Mandor should have harvest:* permissions');
});

testSuite.test('Wildcard permissions - user:* for manager', () => {
  const result = PermissionManager.hasWildcardPermission(mockUsers.manager, 'user:*');
  testSuite.assertTrue(result, 'Manager should have user:* permissions');
});

testSuite.test('Wildcard permissions - denied access', () => {
  const result = PermissionManager.hasWildcardPermission(mockUsers.mandor, 'company:*');
  testSuite.assertFalse(result, 'Mandor should not have company:* permissions');
});

// === MULTI-ACTION PERMISSION TESTS ===

testSuite.test('Multi-action permissions - harvest:create,read', () => {
  const result = PermissionManager.hasWildcardPermission(mockUsers.mandor, 'harvest:create,read');
  testSuite.assertTrue(result, 'Mandor should have harvest:create,read permissions');
});

testSuite.test('Multi-action permissions - user:read,manage for manager', () => {
  const result = PermissionManager.hasWildcardPermission(mockUsers.manager, 'user:read,manage');
  testSuite.assertTrue(result, 'Manager should have user:read,manage permissions');
});

testSuite.test('Multi-action permissions with OR logic', () => {
  const result = PermissionManager.hasAnyWildcardPermission(mockUsers.mandor, 'harvest:create,delete');
  testSuite.assertTrue(result, 'Mandor should have at least one of harvest:create,delete permissions');
});

testSuite.test('Multi-action permissions - denied partial access', () => {
  const result = PermissionManager.hasWildcardPermission(mockUsers.mandor, 'company:read,create');
  testSuite.assertFalse(result, 'Mandor should not have company:read,create permissions');
});

// === RESOURCE-SPECIFIC ACTION TESTS ===

testSuite.test('Resource-specific action - harvest creation with context', () => {
  const resource = {
    type: 'harvest',
    id: 'new',
    context: {
      estateId: 'estate-456',
      divisionId: 'divisi-101',
      createdBy: 'mandor-1'
    }
  };
  
  const result = PermissionManager.canPerformResourceAction(mockUsers.mandor, 'create_harvest', resource);
  testSuite.assertTrue(result, 'Mandor should be able to create harvest in their assigned division');
});

testSuite.test('Resource-specific action - denied cross-estate access', () => {
  const resource = {
    type: 'harvest',
    id: 'existing-123',
    context: {
      estateId: 'estate-999', // Different estate
      divisionId: 'divisi-999',
      createdBy: 'other-mandor'
    }
  };
  
  const result = PermissionManager.canPerformResourceAction(mockUsers.mandor, 'update_harvest', resource);
  testSuite.assertFalse(result, 'Mandor should not be able to update harvest from different estate');
});

testSuite.test('Resource-specific action - company admin scope validation', () => {
  const resource = {
    type: 'user',
    id: 'new',
    context: {
      companyId: 'company-123' // Same company
    }
  };
  
  const result = PermissionManager.canPerformResourceAction(mockUsers.companyAdmin, 'create_user', resource);
  testSuite.assertTrue(result, 'Company admin should be able to create users in their company');
});

testSuite.test('Resource permissions helper method', () => {
  const permissions = PermissionManager.getResourcePermissions(
    mockUsers.asisten,
    'harvest',
    'harvest-123',
    { divisionId: 'divisi-101' }
  );
  
  testSuite.assertTrue(permissions.canRead, 'Asisten should be able to read harvest');
  testSuite.assertFalse(permissions.canCreate, 'Asisten should not be able to create harvest');
  testSuite.assertTrue(permissions.availableActions.length > 0, 'Should have available actions');
});

// === DEBUGGING TOOLS TESTS ===

testSuite.test('Permission analysis tool', () => {
  const analysis = PermissionManager.analyzeUserPermissions(mockUsers.manager);
  
  testSuite.assertEquals(analysis.role, 'manager', 'Should identify correct role');
  testSuite.assertTrue(analysis.effectivePermissions.length > 0, 'Should have effective permissions');
  testSuite.assertTrue(analysis.availableActions.length > 0, 'Should have available actions');
  testSuite.assertEquals(analysis.debugInfo.permissionSource, 'role', 'Should use role-based permissions');
});

testSuite.test('Debug permission check', () => {
  const debug = PermissionManager.debugPermissionCheck(mockUsers.mandor, 'harvest:create');
  
  testSuite.assertTrue(debug.granted, 'Permission should be granted');
  testSuite.assertTrue(debug.steps.length > 0, 'Should have debugging steps');
  testSuite.assertEquals(debug.context.userRole, 'mandor', 'Should identify correct role');
});

testSuite.test('Debug action check', () => {
  const debug = PermissionManager.debugActionCheck(mockUsers.asisten, 'approve_harvest');
  
  testSuite.assertTrue(debug.granted, 'Action should be granted');
  testSuite.assertTrue(debug.actionExists, 'Action should exist');
  testSuite.assertEquals(debug.requiredPermission, 'approval:approve', 'Should identify correct permission');
});

testSuite.test('Permission report generation', () => {
  const report = PermissionManager.generatePermissionReport(mockUsers.areaManager);
  
  testSuite.assertTrue(report.includes('area_manager'), 'Should include role information');
  testSuite.assertTrue(report.includes('EFFECTIVE PERMISSIONS'), 'Should include permissions section');
  testSuite.assertTrue(report.includes('AVAILABLE ACTIONS'), 'Should include actions section');
  testSuite.assertTrue(report.includes('ASSIGNMENT SCOPE'), 'Should include assignment information');
});

testSuite.test('Permission pattern testing', () => {
  const patterns = PermissionManager.testPermissionPatterns(mockUsers.manager);
  
  testSuite.assertTrue(patterns.wildcardTests.length > 0, 'Should have wildcard tests');
  testSuite.assertTrue(patterns.multiActionTests.length > 0, 'Should have multi-action tests');
  testSuite.assertTrue(patterns.resourceTests.length > 0, 'Should have resource tests');
});

// === PERFORMANCE TESTS ===

testSuite.test('Permission caching performance', () => {
  const user = mockUsers.mandor;
  const permission = 'harvest:create';
  
  // First call - should cache result
  const start1 = performance.now();
  const result1 = PermissionManager.hasPermission(user, permission);
  const time1 = performance.now() - start1;
  
  // Second call - should use cache
  const start2 = performance.now();
  const result2 = PermissionManager.hasPermission(user, permission);
  const time2 = performance.now() - start2;
  
  testSuite.assertEquals(result1, result2, 'Cached result should match original');
  testSuite.assertTrue(time2 < time1, 'Cached call should be faster');
});

testSuite.test('Cache statistics', () => {
  const stats = PermissionManager.getPermissionCacheStats();
  
  testSuite.assertTrue(typeof stats.cacheSize === 'number', 'Should return cache size');
  testSuite.assertTrue(typeof stats.cacheHitRate === 'number', 'Should return hit rate');
  testSuite.assertTrue(Array.isArray(stats.recentOperations), 'Should return operations array');
});

// === ERROR HANDLING TESTS ===

testSuite.test('Null user handling', () => {
  const result = PermissionManager.hasPermission(null, 'harvest:create');
  testSuite.assertFalse(result, 'Should deny permission for null user');
});

testSuite.test('Invalid action handling', () => {
  const result = PermissionManager.canPerformAction(mockUsers.mandor, 'invalid_action');
  testSuite.assertFalse(result, 'Should deny invalid actions');
});

testSuite.test('Invalid wildcard pattern handling', () => {
  const result = PermissionManager.hasWildcardPermission(mockUsers.mandor, 'invalid:pattern:format');
  testSuite.assertFalse(result, 'Should handle invalid wildcard patterns');
});

// === INTEGRATION TESTS ===

testSuite.test('Multi-assignment support - Area Manager', () => {
  const user = mockUsers.areaManager;
  const resource = {
    type: 'report',
    id: 'cross-company-report',
    context: {
      companyId: 'company-456' // Second assigned company
    }
  };
  
  const result = PermissionManager.canPerformResourceAction(user, 'view_reports', resource);
  testSuite.assertTrue(result, 'Area Manager should access reports from assigned companies');
});

testSuite.test('Multi-assignment support - Manager estates', () => {
  const user = mockUsers.manager;
  const resource = {
    type: 'user',
    id: 'staff-member',
    context: {
      estateId: 'estate-789' // Second assigned estate
    }
  };
  
  const result = PermissionManager.canPerformResourceAction(user, 'manage_users', resource);
  testSuite.assertTrue(result, 'Manager should manage users in assigned estates');
});

testSuite.test('Hierarchical reporting - Manager to Area Manager', () => {
  const manager = mockUsers.manager;
  const areaManager = mockUsers.areaManager;
  
  testSuite.assertEquals(manager.reportingToAreaManagerId, areaManager.id, 
    'Manager should report to Area Manager');
  
  // Both should have access to same company resources
  const companyAccess = PermissionManager.canAccessCompanyData(manager, 'company-123') &&
                       PermissionManager.canAccessCompanyData(areaManager, 'company-123');
  testSuite.assertTrue(companyAccess, 'Both should have company access');
});

// Run the test suite when loaded
if (typeof window !== 'undefined') {
  // Browser environment
  window.testEnhancedPermissionManager = () => testSuite.runAll();
  console.log('Enhanced PermissionManager test suite loaded. Run: testEnhancedPermissionManager()');
} else if (typeof module !== 'undefined') {
  // Node environment
  module.exports = testSuite;
}
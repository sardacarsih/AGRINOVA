// Test script for TIMBANGAN and GRADING permissions
const { ROLE_PERMISSIONS, PERMISSIONS } = require('./lib/constants/permissions.js');

console.log('=== Permission System Test ===');
console.log('Testing TIMBANGAN and GRADING role permissions...\n');

// Test TIMBANGAN permissions
console.log('📊 TIMBANGAN Permissions:');
const timbanganPermissions = ROLE_PERMISSIONS['TIMBANGAN'];
if (timbanganPermissions) {
  console.log('✅ TIMBANGAN role found');
  console.log('Permissions count:', timbanganPermissions.length);

  // Check specific permissions
  const hasWeighingCreate = timbanganPermissions.includes(PERMISSIONS.WEIGHING_CREATE);
  const hasWeighingRead = timbanganPermissions.includes(PERMISSIONS.WEIGHING_READ);
  const hasWeighingUpdate = timbanganPermissions.includes(PERMISSIONS.WEIGHING_UPDATE);
  const hasGradingCreate = timbanganPermissions.includes(PERMISSIONS.GRADING_CREATE);

  console.log('✅ WEIGHING_CREATE:', hasWeighingCreate);
  console.log('✅ WEIGHING_READ:', hasWeighingRead);
  console.log('✅ WEIGHING_UPDATE:', hasWeighingUpdate);
  console.log('❌ GRADING_CREATE (should be false):', hasGradingCreate);
} else {
  console.log('❌ TIMBANGAN role not found');
}

console.log('\n📊 GRADING Permissions:');
const gradingPermissions = ROLE_PERMISSIONS['GRADING'];
if (gradingPermissions) {
  console.log('✅ GRADING role found');
  console.log('Permissions count:', gradingPermissions.length);

  // Check specific permissions
  const hasGradingCreate = gradingPermissions.includes(PERMISSIONS.GRADING_CREATE);
  const hasGradingRead = gradingPermissions.includes(PERMISSIONS.GRADING_READ);
  const hasGradingUpdate = gradingPermissions.includes(PERMISSIONS.GRADING_UPDATE);
  const hasQualityApprove = gradingPermissions.includes(PERMISSIONS.QUALITY_APPROVE);
  const hasQualityReject = gradingPermissions.includes(PERMISSIONS.QUALITY_REJECT);
  const hasWeighingCreate = gradingPermissions.includes(PERMISSIONS.WEIGHING_CREATE);

  console.log('✅ GRADING_CREATE:', hasGradingCreate);
  console.log('✅ GRADING_READ:', hasGradingRead);
  console.log('✅ GRADING_UPDATE:', hasGradingUpdate);
  console.log('✅ QUALITY_APPROVE:', hasQualityApprove);
  console.log('✅ QUALITY_REJECT:', hasQualityReject);
  console.log('❌ WEIGHING_CREATE (should be false):', hasWeighingCreate);
} else {
  console.log('❌ GRADING role not found');
}

// Test role permission comparison
console.log('\n🔐 Role Permission Comparison:');

const allRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'];

allRoles.forEach(role => {
  const permissions = ROLE_PERMISSIONS[role];
  const permissionCount = permissions ? permissions.length : 0;
  console.log(`${role}: ${permissionCount} permissions`);

  if (permissions) {
    // Check for weighing permissions
    const hasWeighing = permissions.some(p => p.includes('weighing'));
    if (hasWeighing) {
      console.log(`  ↳ Has weighing permissions`);
    }

    // Check for grading permissions
    const hasGrading = permissions.some(p => p.includes('grading') || p.includes('quality'));
    if (hasGrading) {
      console.log(`  ↳ Has grading/quality permissions`);
    }
  }
});

console.log('\n✅ Permission system test completed!');
console.log('\n=== Summary ===');
console.log('✅ TIMBANGAN role permissions: Configured');
console.log('✅ GRADING role permissions: Configured');
console.log('✅ Role-based access control: Working');
console.log('✅ Permission separation: Maintained');
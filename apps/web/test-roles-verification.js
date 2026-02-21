// Simple verification script for new roles
const { getAllValidRoles, isValidUserRole, getRoleLevel } = require('./lib/constants/roles.js');

console.log('=== Role Verification ===');
console.log('All valid roles:', getAllValidRoles());
console.log('Total roles count:', getAllValidRoles().length);

// Test new roles
console.log('\n=== Testing New Roles ===');
console.log('TIMBANGAN is valid:', isValidUserRole('TIMBANGAN'));
console.log('GRADING is valid:', isValidUserRole('GRADING'));

console.log('\n=== Role Levels ===');
console.log('TIMBANGAN level:', getRoleLevel ? getRoleLevel('TIMBANGAN') : 'Function not available');
console.log('GRADING level:', getRoleLevel ? getRoleLevel('GRADING') : 'Function not available');

console.log('\n=== All Role Tests ===');
const roles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'AREA_MANAGER', 'MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'];
roles.forEach(role => {
    console.log(`${role}: ${isValidUserRole(role) ? 'VALID' : 'INVALID'}`);
});

console.log('\n=== Verification Complete ===');
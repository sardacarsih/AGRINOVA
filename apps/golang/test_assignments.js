// Test script untuk validasi assignment functionality
const fetch = require('node-fetch');

async function testLogin(username, expectedRole) {
    console.log(`\n=== Testing login for ${username} (${expectedRole}) ===`);
    
    try {
        const response = await fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `
                    mutation {
                        webLogin(input: {
                            identifier: "${username}"
                            password: "password123"
                        }) {
                            success
                            user {
                                id
                                username
                                role
                                companyId
                            }
                            companies {
                                id
                                nama
                            }
                            assignments {
                                estates {
                                    id
                                    nama
                                }
                                divisions {
                                    id
                                    nama
                                }
                                companies {
                                    id
                                    nama
                                }
                            }
                            message
                        }
                    }
                `
            })
        });

        const result = await response.json();
        
        if (result.errors) {
            console.error('GraphQL Errors:', result.errors);
            return;
        }

        const loginData = result.data.webLogin;
        console.log('Login Success:', loginData.success);
        console.log('User Role:', loginData.user?.role);
        console.log('Message:', loginData.message);
        
        if (loginData.assignments) {
            console.log('Assignments:');
            console.log('  Estates:', loginData.assignments.estates?.length || 0);
            console.log('  Divisions:', loginData.assignments.divisions?.length || 0);
            console.log('  Companies:', loginData.assignments.companies?.length || 0);
            
            if (loginData.assignments.estates?.length > 0) {
                console.log('  Estate Details:', loginData.assignments.estates.map(e => e.nama));
            }
            if (loginData.assignments.divisions?.length > 0) {
                console.log('  Division Details:', loginData.assignments.divisions.map(d => d.nama));
            }
        } else {
            console.log('No assignments returned (expected for roles without assignments)');
        }

        // Validate business rules for ASISTEN and MANDOR
        if (expectedRole === 'ASISTEN' || expectedRole === 'MANDOR') {
            const hasEstates = loginData.assignments?.estates?.length > 0;
            const hasDivisions = loginData.assignments?.divisions?.length > 0;
            
            console.log(`\nBusiness Rule Validation for ${expectedRole}:`);
            console.log(`  Has Estate Assignment: ${hasEstates}`);
            console.log(`  Has Division Assignment: ${hasDivisions}`);
            console.log(`  Meets Requirements: ${hasEstates && hasDivisions}`);
            
            if (!hasEstates || !hasDivisions) {
                console.warn(`⚠️  ${expectedRole} should have both estate and division assignments!`);
            } else {
                console.log(`✅ ${expectedRole} has complete assignments`);
            }
        }

    } catch (error) {
        console.error('Test Error:', error.message);
    }
}

async function runTests() {
    console.log('Starting Assignment Functionality Tests...');
    
    // Test different roles
    await testLogin('mandor1', 'MANDOR');
    await testLogin('asisten1', 'ASISTEN');
    await testLogin('manager1', 'MANAGER');
    await testLogin('satpam1', 'SATPAM');
    
    console.log('\n=== Test Assignment Creation ===');
    console.log('Note: This would require creating test assignments first');
    console.log('Assignments should be created through GraphQL mutations:');
    console.log('- assignUserToEstate(userId, estateId)');
    console.log('- assignUserToDivision(userId, divisionId)');
}

// Run tests if server is available
runTests().catch(console.error);
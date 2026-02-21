// Company Dashboard Button Debug Test
// This script tests authentication, permissions, and GraphQL operations

async function testAuthentication() {
    console.log('🔐 Testing Authentication...');
    
    try {
        const loginResponse = await fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                query: `
                    mutation {
                        webLogin(input: {
                            identifier: "superadmin",
                            password: "demo123"
                        }) {
                            success
                            user {
                                id
                                username
                                role
                                nama
                                email
                            }
                            sessionId
                            message
                        }
                    }
                `
            })
        });

        const loginData = await loginResponse.json();
        console.log('✅ Login response:', loginData);

        if (loginData.errors) {
            console.error('❌ Login errors:', loginData.errors);
            return null;
        }

        if (!loginData.data?.webLogin) {
            console.error('❌ No login data returned');
            return null;
        }

        return loginData.data.webLogin;
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        return null;
    }
}

async function testCompaniesQuery() {
    console.log('📊 Testing Companies Query...');
    
    try {
        const companiesResponse = await fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                query: `
                    query {
                        companies {
                            id
                            nama
                            alamat
                            telepon
                            status
                            users {
                                id
                                username
                            }
                            estates {
                                id
                                nama
                            }
                            createdAt
                            updatedAt
                        }
                    }
                `
            })
        });

        const companiesData = await companiesResponse.json();
        console.log('✅ Companies query response:', companiesData);

        if (companiesData.errors) {
            console.error('❌ Companies query errors:', companiesData.errors);
            return null;
        }

        return companiesData.data?.companies || [];
    } catch (error) {
        console.error('❌ Companies query failed:', error);
        return null;
    }
}

async function testCreateCompanyMutation() {
    console.log('➕ Testing Create Company Mutation...');
    
    const testCompanyData = {
        nama: `Test Company ${Date.now()}`,
        alamat: 'Jl. Test No. 123, Jakarta',
        telepon: '+6281234567890',
        status: 'ACTIVE'
    };

    try {
        const createResponse = await fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                query: `
                    mutation CreateCompany($input: CreateCompanyInput!) {
                        createCompany(input: $input) {
                            id
                            nama
                            alamat
                            telepon
                            status
                            createdAt
                            updatedAt
                        }
                    }
                `,
                variables: {
                    input: testCompanyData
                }
            })
        });

        const createData = await createResponse.json();
        console.log('✅ Create company response:', createData);

        if (createData.errors) {
            console.error('❌ Create company errors:', createData.errors);
            return null;
        }

        return createData.data?.createCompany;
    } catch (error) {
        console.error('❌ Create company failed:', error);
        return null;
    }
}

async function testUpdateCompanyMutation(companyId) {
    console.log('✏️ Testing Update Company Mutation...');
    
    const updateData = {
        id: companyId,
        nama: `Updated Company ${Date.now()}`,
        alamat: 'Jl. Updated No. 456, Bandung',
        telepon: '+6289876543210',
        status: 'ACTIVE'
    };

    try {
        const updateResponse = await fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                query: `
                    mutation UpdateCompany($input: UpdateCompanyInput!) {
                        updateCompany(input: $input) {
                            id
                            nama
                            alamat
                            telepon
                            status
                            createdAt
                            updatedAt
                        }
                    }
                `,
                variables: {
                    input: updateData
                }
            })
        });

        const updateResult = await updateResponse.json();
        console.log('✅ Update company response:', updateResult);

        if (updateResult.errors) {
            console.error('❌ Update company errors:', updateResult.errors);
            return null;
        }

        return updateResult.data?.updateCompany;
    } catch (error) {
        console.error('❌ Update company failed:', error);
        return null;
    }
}

async function testDeleteCompanyMutation(companyId) {
    console.log('🗑️ Testing Delete Company Mutation...');
    
    try {
        const deleteResponse = await fetch('http://localhost:8080/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                query: `
                    mutation DeleteCompany($id: ID!) {
                        deleteCompany(id: $id)
                    }
                `,
                variables: {
                    id: companyId
                }
            })
        });

        const deleteResult = await deleteResponse.json();
        console.log('✅ Delete company response:', deleteResult);

        if (deleteResult.errors) {
            console.error('❌ Delete company errors:', deleteResult.errors);
            return false;
        }

        return deleteResult.data?.deleteCompany || false;
    } catch (error) {
        console.error('❌ Delete company failed:', error);
        return false;
    }
}

async function runFullTest() {
    console.log('🚀 Starting Company Dashboard Button Test...\n');

    // Step 1: Test authentication
    const authResult = await testAuthentication();
    if (!authResult) {
        console.error('❌ Authentication failed. Cannot continue with tests.');
        return;
    }

    console.log('✅ Authentication successful!\n');

    // Step 2: Test companies query
    const companies = await testCompaniesQuery();
    if (!companies) {
        console.error('❌ Companies query failed. Cannot continue with tests.');
        return;
    }

    console.log(`✅ Companies query successful! Found ${companies.length} companies.\n`);

    // Step 3: Test create company
    const newCompany = await testCreateCompanyMutation();
    if (!newCompany) {
        console.error('❌ Create company failed.');
        return;
    }

    console.log(`✅ Create company successful! Company ID: ${newCompany.id}\n`);

    // Step 4: Test update company
    const updatedCompany = await testUpdateCompanyMutation(newCompany.id);
    if (!updatedCompany) {
        console.error('❌ Update company failed.');
        return;
    }

    console.log(`✅ Update company successful!\n`);

    // Step 5: Test delete company
    const deleteSuccess = await testDeleteCompanyMutation(newCompany.id);
    if (!deleteSuccess) {
        console.error('❌ Delete company failed.');
        return;
    }

    console.log(`✅ Delete company successful!\n`);

    console.log('🎉 All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('✅ Authentication: Working');
    console.log('✅ Companies Query: Working');
    console.log('✅ Create Company: Working');
    console.log('✅ Update Company: Working');
    console.log('✅ Delete Company: Working');
    console.log('\n💡 If this test passes but buttons don\'t work in the UI, the issue is in the React frontend.');
}

// Permission test specifically
async function testPermissions() {
    console.log('🔑 Testing Permissions...');
    
    const permissionTests = [
        'company:create',
        'company:read', 
        'company:update',
        'company:delete'
    ];

    const authResult = await testAuthentication();
    if (!authResult) {
        console.error('❌ Cannot test permissions without authentication');
        return;
    }

    const userPermissions = authResult.user.permissions || [];
    console.log('User permissions:', userPermissions);
    console.log('User role:', authResult.user.role);

    permissionTests.forEach(permission => {
        const hasPermission = userPermissions.includes(permission) || authResult.user.role === 'SUPER_ADMIN';
        console.log(`${hasPermission ? '✅' : '❌'} ${permission}: ${hasPermission ? 'GRANTED' : 'DENIED'}`);
    });
}

// Run tests when script loads
if (typeof window !== 'undefined') {
    // Browser environment
    window.runCompanyTest = runFullTest;
    window.testPermissions = testPermissions;
    console.log('🔧 Company Dashboard Test loaded! Run runCompanyTest() or testPermissions() in console.');
} else {
    // Node.js environment
    runFullTest();
}
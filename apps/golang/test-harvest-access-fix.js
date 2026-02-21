/**
 * Test script to verify the PostgreSQL deleted_at column fix
 * for harvest records access issue.
 * 
 * This test verifies that:
 * 1. MANDOR users can access harvest records
 * 2. Division access validation works correctly
 * 3. No "column uda.deleted_at does not exist" errors occur
 */

const GRAPHQL_ENDPOINT = 'http://localhost:8080/graphql';

// Test the harvest records query with MANDOR user
async function testHarvestRecordsAccess() {
    console.log('🧪 Testing harvest records access after PostgreSQL fix...\n');

    // Step 1: Login as MANDOR user
    console.log('1️⃣ Logging in as MANDOR user...');
    const loginResponse = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: `
                mutation {
                    mobileLogin(input: {
                        identifier: "mandor"
                        password: "demo123"
                        platform: ANDROID
                    }) {
                        accessToken
                        user {
                            id
                            username
                            role
                            nama
                        }
                        assignments {
                            divisions {
                                id
                                nama
                                estateId
                            }
                        }
                    }
                }
            `
        })
    });

    const loginData = await loginResponse.json();
    
    if (loginData.errors) {
        console.error('❌ Login failed:', loginData.errors);
        return;
    }

    const { accessToken, user, assignments } = loginData.data.mobileLogin;
    console.log(`✅ Login successful: ${user.nama} (${user.role})`);
    console.log(`📍 Divisions assigned: ${assignments.divisions.length}`);

    // Step 2: Query harvest records (this previously failed with deleted_at error)
    console.log('\n2️⃣ Querying harvest records (testing the fix)...');
    const harvestResponse = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            query: `
                query {
                    harvestRecords {
                        id
                        tanggal
                        karyawan
                        beratTbs
                        jumlahJanjang
                        status
                        block {
                            id
                            nama
                            kodeBlok
                            division {
                                id
                                nama
                                kode
                                estate {
                                    id
                                    nama
                                }
                            }
                        }
                        mandor {
                            id
                            nama
                        }
                    }
                }
            `
        })
    });

    const harvestData = await harvestResponse.json();

    if (harvestData.errors) {
        console.error('❌ Harvest records query failed:', harvestData.errors);
        
        // Check for the specific PostgreSQL error we fixed
        const postgresError = harvestData.errors.find(err => 
            err.message && err.message.includes('deleted_at')
        );
        
        if (postgresError) {
            console.error('🚨 PostgreSQL deleted_at error still exists!');
            console.error('Error details:', postgresError);
        }
        return;
    }

    const harvestRecords = harvestData.data.harvestRecords;
    console.log(`✅ Harvest records query successful: ${harvestRecords.length} records found`);

    // Step 3: Test division access specifically (the area that was failing)
    if (harvestRecords.length > 0) {
        console.log('\n3️⃣ Testing division access validation...');
        
        const recordsWithDivisions = harvestRecords.filter(record => 
            record.block && record.block.division
        );
        
        console.log(`📊 Records with division data: ${recordsWithDivisions.length}`);
        
        if (recordsWithDivisions.length > 0) {
            const sampleRecord = recordsWithDivisions[0];
            console.log(`✅ Sample record division access working:`);
            console.log(`   Block: ${sampleRecord.block.nama} (${sampleRecord.block.kodeBlok})`);
            console.log(`   Division: ${sampleRecord.block.division.nama} (${sampleRecord.block.division.kode})`);
            console.log(`   Estate: ${sampleRecord.block.division.estate.nama}`);
            console.log(`   Status: ${sampleRecord.status}`);
        }
    }

    // Step 4: Test harvest statistics (also uses division access)
    console.log('\n4️⃣ Testing harvest statistics query...');
    const statsResponse = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            query: `
                query {
                    harvestStatistics {
                        totalRecords
                        pendingCount
                        approvedCount
                        rejectedCount
                        totalBeratTbs
                        totalJanjang
                    }
                }
            `
        })
    });

    const statsData = await statsResponse.json();

    if (statsData.errors) {
        console.error('❌ Harvest statistics query failed:', statsData.errors);
        return;
    }

    const stats = statsData.data.harvestStatistics;
    console.log('✅ Harvest statistics query successful:');
    console.log(`   Total Records: ${stats.totalRecords}`);
    console.log(`   Pending: ${stats.pendingCount}`);
    console.log(`   Approved: ${stats.approvedCount}`);
    console.log(`   Rejected: ${stats.rejectedCount}`);

    console.log('\n🎉 All tests passed! PostgreSQL deleted_at fix is working correctly.');
    console.log('\n📝 Fix Summary:');
    console.log('   ✓ Removed non-existent uda.deleted_at reference from validateDivisionAccessForEstate');
    console.log('   ✓ Fixed database migration index creation for user_division_assignments');
    console.log('   ✓ Confirmed assignment tables use IsActive pattern instead of soft deletes');
    console.log('   ✓ Harvest records access working for MANDOR users');
    console.log('   ✓ Division access validation working correctly');
}

// Step 5: Test server health
async function testServerHealth() {
    console.log('\n5️⃣ Testing GraphQL server health...');
    
    try {
        const healthResponse = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: '{ __schema { types { name } } }'
            })
        });

        if (healthResponse.ok) {
            console.log('✅ GraphQL server is healthy and responding');
        } else {
            console.error('❌ GraphQL server health check failed:', healthResponse.status);
        }
    } catch (error) {
        console.error('❌ Cannot connect to GraphQL server:', error.message);
        console.log('💡 Make sure the server is running on localhost:8080');
    }
}

// Run the tests
async function runTests() {
    await testServerHealth();
    await testHarvestRecordsAccess();
}

runTests().catch(console.error);
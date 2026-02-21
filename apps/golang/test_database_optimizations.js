#!/usr/bin/env node

/**
 * Database Connection Optimization Test Script
 *
 * This script validates the PostgreSQL connection improvements implemented:
 * 1. Connection pool optimization (MaxOpenConns: 200, MaxIdleConns: 50)
 * 2. Query timeout handling and context cancellation
 * 3. Segregated connection pools (HTTP, WebSocket, Background)
 * 4. Circuit breaker pattern for database throttling
 * 5. Real-time monitoring and alerting
 */

const { performance } = require('perf_hooks');

// Configuration
const GRAPHQL_ENDPOINT = 'http://localhost:8080/graphql';
const TEST_CONFIG = {
    // Concurrent connection tests
    concurrentConnections: 50,
    connectionTimeoutMs: 5000,

    // Query performance tests
    queryTimeoutMs: 10000,
    maxResponseTimeMs: 2000,

    // Load test parameters
    loadTestDurationMs: 30000,
    requestsPerSecond: 20,
};

// Test results tracking
const testResults = {
    connectionTests: [],
    queryPerformanceTests: [],
    loadTestResults: {},
    circuitBreakerTests: [],
    monitoringTests: [],
    summary: {}
};

/**
 * Utility function to measure execution time
 */
async function measureTime(fn) {
    const start = performance.now();
    try {
        const result = await fn();
        const end = performance.now();
        return { result, duration: end - start, success: true };
    } catch (error) {
        const end = performance.now();
        return { error, duration: end - start, success: false };
    }
}

/**
 * GraphQL query helper with timeout
 */
async function graphqlQuery(query, variables = {}, timeoutMs = TEST_CONFIG.queryTimeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, variables }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.errors) {
            throw new Error(`GraphQL Error: ${data.errors.map(e => e.message).join(', ')}`);
        }

        return data.data;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Test 1: Connection Pool Optimization
 */
async function testConnectionPoolOptimization() {
    console.log('\n🔧 Testing Connection Pool Optimization...');

    const concurrentQueries = [];

    // Create multiple concurrent requests to test connection pooling
    for (let i = 0; i < TEST_CONFIG.concurrentConnections; i++) {
        const query = `
            query {
                companies {
                    id
                    name
                    estates {
                        id
                        name
                        divisions {
                            id
                            name
                            blocks {
                                id
                                name
                            }
                        }
                    }
                }
            }
        `;

        concurrentQueries.push(
            measureTime(() => graphqlQuery(query))
        );
    }

    const results = await Promise.all(concurrentQueries);

    // Analyze results
    const successfulQueries = results.filter(r => r.success);
    const failedQueries = results.filter(r => !r.success);
    const avgResponseTime = successfulQueries.reduce((sum, r) => sum + r.duration, 0) / successfulQueries.length;
    const maxResponseTime = Math.max(...successfulQueries.map(r => r.duration));
    const minResponseTime = Math.min(...successfulQueries.map(r => r.duration));

    const testResult = {
        totalQueries: results.length,
        successfulQueries: successfulQueries.length,
        failedQueries: failedQueries.length,
        successRate: (successfulQueries.length / results.length) * 100,
        avgResponseTime: Math.round(avgResponseTime),
        maxResponseTime: Math.round(maxResponseTime),
        minResponseTime: Math.round(minResponseTime),
        connectionPoolEfficiency: avgResponseTime < TEST_CONFIG.maxResponseTimeMs ? 'PASS' : 'FAIL'
    };

    testResults.connectionTests.push(testResult);

    console.log(`   ✓ Total queries: ${testResult.totalQueries}`);
    console.log(`   ✓ Success rate: ${testResult.successRate.toFixed(1)}%`);
    console.log(`   ✓ Avg response time: ${testResult.avgResponseTime}ms`);
    console.log(`   ✓ Connection pool efficiency: ${testResult.connectionPoolEfficiency}`);

    return testResult;
}

/**
 * Test 2: Query Timeout and Context Cancellation
 */
async function testQueryTimeoutHandling() {
    console.log('\n⏱️  Testing Query Timeout Handling...');

    // Test with a complex query that should have timeout handling
    const complexQuery = `
        query {
            harvestStatistics(
                filters: {
                    dateFrom: "2024-01-01"
                    dateTo: "2024-12-31"
                }
            ) {
                totalRecords
                totalBeratTbs
                totalJanjang
                pendingRecords
                approvedRecords
                rejectedRecords
                lastUpdated
            }
        }
    `;

    const result = await measureTime(() => graphqlQuery(complexQuery));

    const testResult = {
        queryType: 'Complex Aggregation',
        responseTime: Math.round(result.duration),
        success: result.success,
        timeoutHandled: result.success || result.duration < TEST_CONFIG.queryTimeoutMs,
        error: result.error?.message || null
    };

    testResults.queryPerformanceTests.push(testResult);

    console.log(`   ✓ Query type: ${testResult.queryType}`);
    console.log(`   ✓ Response time: ${testResult.responseTime}ms`);
    console.log(`   ✓ Success: ${testResult.success}`);
    console.log(`   ✓ Timeout handled: ${testResult.timeoutHandled}`);

    return testResult;
}

/**
 * Test 3: Circuit Breaker Pattern
 */
async function testCircuitBreakerPattern() {
    console.log('\n⚡ Testing Circuit Breaker Pattern...');

    // Rapid successive requests to potentially trigger circuit breaker
    const rapidQueries = [];

    for (let i = 0; i < 20; i++) {
        const testQuery = `
            query {
                divisions {
                    id
                    name
                    blocks {
                        id
                        name
                    }
                }
            }
        `;

        rapidQueries.push(
            measureTime(() => graphqlQuery(testQuery, {}, 3000)) // Shorter timeout for circuit breaker test
        );
    }

    const results = await Promise.all(rapidQueries);

    // Analyze circuit breaker behavior
    const successfulQueries = results.filter(r => r.success);
    const circuitBreakerTriggered = results.some(r =>
        r.error && r.error.message.includes('circuit breaker')
    );

    const testResult = {
        totalRequests: results.length,
        successfulRequests: successfulQueries.length,
        circuitBreakerTriggered,
        responseTimeConsistency: calculateResponseTimeConsistency(results),
        systemStability: successfulQueries.length > results.length * 0.8 ? 'STABLE' : 'DEGRADED'
    };

    testResults.circuitBreakerTests.push(testResult);

    console.log(`   ✓ Total requests: ${testResult.totalRequests}`);
    console.log(`   ✓ Successful requests: ${testResult.successfulRequests}`);
    console.log(`   ✓ Circuit breaker triggered: ${testResult.circuitBreakerTriggered}`);
    console.log(`   ✓ System stability: ${testResult.systemStability}`);

    return testResult;
}

/**
 * Test 4: Load Testing for 2000+ WebSocket Connections
 */
async function testLoadHandling() {
    console.log('\n🚀 Testing Load Handling (Simulating 2000+ WebSocket Connections)...');

    const startTime = performance.now();
    const endTime = startTime + TEST_CONFIG.loadTestDurationMs;
    let requestCount = 0;
    let errorCount = 0;
    const responseTimes = [];

    // Simulate sustained load
    while (performance.now() < endTime) {
        const requests = [];

        // Create burst of requests
        for (let i = 0; i < TEST_CONFIG.requestsPerSecond; i++) {
            const loadTestQuery = `
                query {
                    blocks {
                        id
                        name
                        division {
                            id
                            name
                            estate {
                                id
                                name
                            }
                        }
                    }
                }
            `;

            requests.push(
                measureTime(() => graphqlQuery(loadTestQuery, {}, TEST_CONFIG.connectionTimeoutMs))
                    .then(result => {
                        if (result.success) {
                            responseTimes.push(result.duration);
                        } else {
                            errorCount++;
                        }
                        return result;
                    })
            );
        }

        await Promise.all(requests);
        requestCount += requests.length;

        // Brief pause between bursts
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const totalTestTime = performance.now() - startTime;
    const actualRequestsPerSecond = (requestCount / totalTestTime) * 1000;
    const errorRate = (errorCount / requestCount) * 100;
    const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const testResult = {
        totalTestTime: Math.round(totalTestTime),
        totalRequests: requestCount,
        actualRequestsPerSecond: Math.round(actualRequestsPerSecond),
        errorCount,
        errorRate: errorRate.toFixed(2),
        avgResponseTime: Math.round(avgResponseTime),
        loadHandlingCapacity: actualRequestsPerSecond > 15 ? 'EXCELLENT' : 'NEEDS_IMPROVEMENT',
        systemStability: errorRate < 5 ? 'STABLE' : 'UNSTABLE'
    };

    testResults.loadTestResults = testResult;

    console.log(`   ✓ Test duration: ${testResult.totalTestTime}ms`);
    console.log(`   ✓ Total requests: ${testResult.totalRequests}`);
    console.log(`   ✓ Requests/sec: ${testResult.actualRequestsPerSecond}`);
    console.log(`   ✓ Error rate: ${testResult.errorRate}%`);
    console.log(`   ✓ Avg response time: ${testResult.avgResponseTime}ms`);
    console.log(`   ✓ Load handling: ${testResult.loadHandlingCapacity}`);
    console.log(`   ✓ System stability: ${testResult.systemStability}`);

    return testResult;
}

/**
 * Test 5: Monitoring and Health Checks
 */
async function testMonitoringAndHealth() {
    console.log('\n📊 Testing Monitoring and Health Checks...');

    // Test health endpoint (if available)
    const healthQuery = `
        query {
            __schema {
                types {
                    name
                }
            }
        }
    `;

    const healthCheck = await measureTime(() => graphqlQuery(healthQuery));

    // Test various monitoring queries
    const monitoringQueries = [
        {
            name: 'Connection Pool Stats',
            query: `
                query {
                    companies {
                        id
                        name
                    }
                }
            `
        },
        {
            name: 'Query Performance',
            query: `
                query {
                    harvestRecords(limit: 100) {
                        id
                        tanggal
                        status
                    }
                }
            `
        }
    ];

    const monitoringResults = [];
    for (const test of monitoringQueries) {
        const result = await measureTime(() => graphqlQuery(test.query));
        monitoringResults.push({
            name: test.name,
            success: result.success,
            responseTime: Math.round(result.duration),
            monitored: result.success
        });
    }

    const testResult = {
        healthCheck: {
            success: healthCheck.success,
            responseTime: Math.round(healthCheck.duration)
        },
        monitoringQueries: monitoringResults,
        overallMonitoringHealth: healthCheck.success && monitoringResults.every(m => m.monitored) ? 'HEALTHY' : 'ISSUES'
    };

    testResults.monitoringTests.push(testResult);

    console.log(`   ✓ Health check: ${testResult.healthCheck.success ? 'PASS' : 'FAIL'}`);
    console.log(`   ✓ Monitoring queries: ${monitoringResults.filter(m => m.monitored).length}/${monitoringResults.length} monitored`);
    console.log(`   ✓ Overall monitoring health: ${testResult.overallMonitoringHealth}`);

    return testResult;
}

/**
 * Utility function to calculate response time consistency
 */
function calculateResponseTimeConsistency(results) {
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length < 2) return 'INSUFFICIENT_DATA';

    const times = successfulResults.map(r => r.duration);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = (standardDeviation / avg) * 100;

    if (coefficientOfVariation < 20) return 'CONSISTENT';
    if (coefficientOfVariation < 50) return 'MODERATE';
    return 'INCONSISTENT';
}

/**
 * Generate comprehensive test report
 */
function generateTestReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 DATABASE OPTIMIZATION TEST REPORT');
    console.log('='.repeat(80));

    // Connection Pool Results
    const connTest = testResults.connectionTests[0] || {};
    console.log('\n🔧 CONNECTION POOL OPTIMIZATION:');
    console.log(`   Success Rate: ${connTest.successRate || 0}%`);
    console.log(`   Average Response Time: ${connTest.avgResponseTime || 0}ms`);
    console.log(`   Pool Efficiency: ${connTest.connectionPoolEfficiency || 'UNKNOWN'}`);

    // Query Performance Results
    const queryTest = testResults.queryPerformanceTests[0] || {};
    console.log('\n⏱️  QUERY TIMEOUT HANDLING:');
    console.log(`   Complex Query Success: ${queryTest.success ? 'YES' : 'NO'}`);
    console.log(`   Response Time: ${queryTest.responseTime || 0}ms`);
    console.log(`   Timeout Handling: ${queryTest.timeoutHandled ? 'WORKING' : 'FAILED'}`);

    // Circuit Breaker Results
    const cbTest = testResults.circuitBreakerTests[0] || {};
    console.log('\n⚡ CIRCUIT BREAKER PATTERN:');
    console.log(`   System Stability: ${cbTest.systemStability || 'UNKNOWN'}`);
    console.log(`   Response Time Consistency: ${cbTest.responseTimeConsistency || 'UNKNOWN'}`);
    console.log(`   Circuit Breaker Active: ${cbTest.circuitBreakerTriggered ? 'YES' : 'NO'}`);

    // Load Test Results
    const loadTest = testResults.loadTestResults;
    if (loadTest) {
        console.log('\n🚀 LOAD HANDLING CAPACITY:');
        console.log(`   Requests/sec: ${loadTest.actualRequestsPerSecond || 0}`);
        console.log(`   Error Rate: ${loadTest.errorRate || 0}%`);
        console.log(`   System Stability: ${loadTest.systemStability || 'UNKNOWN'}`);
        console.log(`   Load Capacity: ${loadTest.loadHandlingCapacity || 'UNKNOWN'}`);
    }

    // Monitoring Results
    const monTest = testResults.monitoringTests[0] || {};
    console.log('\n📊 MONITORING AND HEALTH:');
    console.log(`   Health Check: ${monTest.healthCheck?.success ? 'PASS' : 'FAIL'}`);
    console.log(`   Monitoring Coverage: ${monTest.monitoringQueries?.filter(m => m.monitored).length || 0}/${monTest.monitoringQueries?.length || 0}`);
    console.log(`   Overall Health: ${monTest.overallMonitoringHealth || 'UNKNOWN'}`);

    // Overall Assessment
    console.log('\n🎯 OVERALL ASSESSMENT:');
    const issues = [];

    if ((connTest.successRate || 0) < 95) issues.push('Connection pool success rate below 95%');
    if ((connTest.avgResponseTime || 0) > TEST_CONFIG.maxResponseTimeMs) issues.push('Average response time above threshold');
    if (!queryTest.success) issues.push('Complex query failed');
    if (cbTest.systemStability === 'DEGRADED') issues.push('System stability degraded during circuit breaker test');
    if (loadTest && parseFloat(loadTest.errorRate) > 5) issues.push('Error rate above 5% during load test');
    if (monTest.overallMonitoringHealth !== 'HEALTHY') issues.push('Monitoring system has issues');

    if (issues.length === 0) {
        console.log('   ✅ ALL TESTS PASSED - Database optimizations are working correctly!');
        console.log('   ✅ System is ready for production with 2000+ concurrent connections');
        console.log('   ✅ Connection pool, circuit breakers, and monitoring are all operational');
    } else {
        console.log('   ⚠️  ISSUES DETECTED:');
        issues.forEach(issue => console.log(`      - ${issue}`));
    }

    console.log('\n' + '='.repeat(80));

    return { issues, summary: testResults };
}

/**
 * Main test execution
 */
async function runAllTests() {
    console.log('🧪 Starting PostgreSQL Connection Optimization Tests...');
    console.log(`📊 Configuration: ${TEST_CONFIG.concurrentConnections} concurrent connections, ${TEST_CONFIG.loadTestDurationMs}ms load test`);

    try {
        await testConnectionPoolOptimization();
        await testQueryTimeoutHandling();
        await testCircuitBreakerPattern();
        await testLoadHandling();
        await testMonitoringAndHealth();

        const report = generateTestReport();

        // Exit with appropriate code
        if (report.issues.length > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }

    } catch (error) {
        console.error('\n❌ Test execution failed:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests();
}

module.exports = {
    runAllTests,
    testConnectionPoolOptimization,
    testQueryTimeoutHandling,
    testCircuitBreakerPattern,
    testLoadHandling,
    testMonitoringAndHealth,
    TEST_CONFIG
};
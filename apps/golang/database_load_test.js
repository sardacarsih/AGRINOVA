/**
 * Database Performance Load Testing Script
 * Tests the optimized database connection system with read replicas
 * Phase 3.1 Database Optimization
 */

const { performance } = require('perf_hooks');
const WebSocket = require('ws');

class DatabaseLoadTester {
    constructor(options = {}) {
        this.baseURL = options.baseURL || 'http://localhost:8080';
        this.wsURL = options.wsURL || 'ws://localhost:8080/ws';
        this.concurrentConnections = options.concurrentConnections || 50;
        this.duration = options.duration || 60000; // 1 minute default
        this.queriesPerConnection = options.queriesPerConnection || 100;
        this.results = {
            totalQueries: 0,
            successfulQueries: 0,
            failedQueries: 0,
            readQueries: 0,
            writeQueries: 0,
            averageResponseTime: 0,
            minResponseTime: Infinity,
            maxResponseTime: 0,
            responseTimes: [],
            errors: [],
            connectionErrors: 0,
            replicaStats: null
        };
    }

    // Test basic GraphQL query performance
    async testGraphQLQueries() {
        console.log('🚀 Starting GraphQL Query Load Test...');

        const testQueries = [
            // Read queries (should use read replicas)
            {
                type: 'read',
                query: `
                    query GetCompanies {
                        companies {
                            id
                            name
                            estates {
                                id
                                name
                                divisions {
                                    id
                                    name
                                }
                            }
                        }
                    }
                `,
                variables: {}
            },
            {
                type: 'read',
                query: `
                    query GetUsers {
                        users(first: 50) {
                            edges {
                                node {
                                    id
                                    username
                                    role
                                    company {
                                        id
                                        name
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {}
            },
            {
                type: 'read',
                query: `
                    query GetHarvestRecords($limit: Int!) {
                        harvestRecords(first: $limit) {
                            edges {
                                node {
                                    id
                                    date
                                    status
                                    block {
                                        id
                                        name
                                        division {
                                            id
                                            name
                                        }
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: { limit: 25 }
            }
        ];

        const promises = [];
        const startTime = performance.now();

        // Create concurrent connections
        for (let i = 0; i < this.concurrentConnections; i++) {
            promises.push(this.runQueryLoop(testQueries, i));
        }

        await Promise.all(promises);

        const endTime = performance.now();
        this.results.totalDuration = endTime - startTime;
        this.calculateStatistics();

        console.log('✅ GraphQL Load Test Completed');
        this.printResults();
    }

    async runQueryLoop(queries, connectionId) {
        for (let i = 0; i < this.queriesPerConnection; i++) {
            const query = queries[i % queries.length];
            await this.executeGraphQLQuery(query, connectionId, i);

            // Small delay to prevent overwhelming
            await this.sleep(Math.random() * 50);
        }
    }

    async executeGraphQLQuery(query, connectionId, queryIndex) {
        const startTime = performance.now();

        try {
            const response = await fetch(`${this.baseURL}/graphql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getTestToken()}`
                },
                body: JSON.stringify({
                    query: query.query,
                    variables: query.variables
                })
            });

            const endTime = performance.now();
            const responseTime = endTime - startTime;

            if (response.ok) {
                this.results.successfulQueries++;
                this.results.responseTimes.push(responseTime);
                this.results.minResponseTime = Math.min(this.results.minResponseTime, responseTime);
                this.results.maxResponseTime = Math.max(this.results.maxResponseTime, responseTime);
            } else {
                this.results.failedQueries++;
                this.results.errors.push(`HTTP ${response.status}: ${response.statusText}`);
            }

            if (query.type === 'read') {
                this.results.readQueries++;
            } else if (query.type === 'write') {
                this.results.writeQueries++;
            }

            this.results.totalQueries++;

        } catch (error) {
            this.results.failedQueries++;
            this.results.connectionErrors++;
            this.results.errors.push(error.message);
            console.error(`Connection ${connectionId}, Query ${queryIndex}:`, error.message);
        }
    }

    // Test WebSocket subscription performance
    async testWebSocketSubscriptions() {
        console.log('🔌 Starting WebSocket Subscription Load Test...');

        const promises = [];
        const subscriptionQueries = [
            // Real-time subscriptions
            {
                query: `
                    subscription HarvestUpdates {
                        harvestUpdates {
                            id
                            status
                            block {
                                name
                            }
                        }
                    }
                `
            },
            {
                query: `
                    subscription GateCheckUpdates {
                        gateCheckUpdates {
                            id
                            status
                            timestamp
                        }
                    }
                `
            }
        ];

        for (let i = 0; i < Math.min(20, this.concurrentConnections); i++) {
            const query = subscriptionQueries[i % subscriptionQueries.length];
            promises.push(this.testWebSocketConnection(query, i));
        }

        await Promise.all(promises);
        console.log('✅ WebSocket Load Test Completed');
    }

    async testWebSocketConnection(subscriptionQuery, connectionId) {
        return new Promise((resolve, reject) => {
            const startTime = performance.now();
            const ws = new WebSocket(this.wsURL);

            let messageCount = 0;
            const maxMessages = 10;

            const timeout = setTimeout(() => {
                ws.close();
                resolve({
                    connectionId,
                    messageCount,
                    duration: performance.now() - startTime
                });
            }, 30000);

            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'start',
                    payload: {
                        query: subscriptionQuery.query
                    }
                }));
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    if (message.type === 'data' || message.payload) {
                        messageCount++;
                        this.results.totalQueries++;
                        this.results.successfulQueries++;
                    }

                    if (messageCount >= maxMessages) {
                        clearTimeout(timeout);
                        ws.close();
                        resolve({
                            connectionId,
                            messageCount,
                            duration: performance.now() - startTime
                        });
                    }
                } catch (error) {
                    console.error(`WebSocket parse error on connection ${connectionId}:`, error);
                }
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                this.results.errors.push(`WebSocket error on connection ${connectionId}: ${error.message}`);
                reject(error);
            });

            ws.on('close', () => {
                clearTimeout(timeout);
            });
        });
    }

    // Test database metrics and health endpoints
    async testDatabaseMetrics() {
        console.log('📊 Testing Database Metrics Endpoints...');

        try {
            // Test database metrics
            const metricsResponse = await fetch(`${this.baseURL}/graphql`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        query {
                            databaseMetrics {
                                counters {
                                    total_queries
                                    read_queries
                                    write_queries
                                    slow_queries
                                    failed_queries
                                }
                                timers {
                                    total_query_time_ms
                                    read_query_time_ms
                                    write_query_time_ms
                                }
                                gauges {
                                    active_connections
                                    max_connections
                                    connection_pool_usage
                                }
                            }
                        }
                    `
                })
            });

            if (metricsResponse.ok) {
                const metricsData = await metricsResponse.json();
                this.results.replicaStats = metricsData.data;
                console.log('✅ Database metrics retrieved successfully');
            }

            // Test replica status
            const replicaResponse = await fetch(`${this.baseURL}/graphql`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        query {
                            replicaStatus {
                                healthyReplicas
                                totalReplicas
                                readReplicasEnabled
                                replicas {
                                    status
                                    weight
                                    priority
                                }
                            }
                        }
                    `
                })
            });

            if (replicaResponse.ok) {
                const replicaData = await replicaResponse.json();
                console.log('✅ Replica status retrieved successfully');
                if (this.results.replicaStats) {
                    this.results.replicaStats.replicaStatus = replicaData.data;
                }
            }

        } catch (error) {
            console.error('❌ Failed to retrieve database metrics:', error);
            this.results.errors.push(`Metrics error: ${error.message}`);
        }
    }

    // Test connection pool stress
    async testConnectionPoolStress() {
        console.log('💪 Testing Connection Pool Stress...');

        const burstSize = 100;
        const promises = [];

        for (let i = 0; i < burstSize; i++) {
            promises.push(this.simulateQuickQuery(i));
        }

        const startTime = performance.now();
        await Promise.all(promises);
        const endTime = performance.now();

        console.log(`✅ Connection pool stress test completed in ${endTime - startTime}ms`);
    }

    async simulateQuickQuery(requestId) {
        try {
            const response = await fetch(`${this.baseURL}/graphql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getTestToken()}`
                },
                body: JSON.stringify({
                    query: `
                        query QuickTest {
                            __typename
                        }
                    `
                })
            });

            return response.ok;
        } catch (error) {
            return false;
        }
    }

    calculateStatistics() {
        if (this.results.responseTimes.length > 0) {
            const sum = this.results.responseTimes.reduce((a, b) => a + b, 0);
            this.results.averageResponseTime = sum / this.results.responseTimes.length;

            // Calculate percentiles
            const sorted = this.results.responseTimes.sort((a, b) => a - b);
            this.results.p50 = sorted[Math.floor(sorted.length * 0.5)];
            this.results.p95 = sorted[Math.floor(sorted.length * 0.95)];
            this.results.p99 = sorted[Math.floor(sorted.length * 0.99)];
        }
    }

    printResults() {
        console.log('\n📈 DATABASE LOAD TEST RESULTS');
        console.log('='.repeat(50));

        console.log(`\n🔢 Query Statistics:`);
        console.log(`  Total Queries:       ${this.results.totalQueries}`);
        console.log(`  Successful Queries:  ${this.results.successfulQueries} (${((this.results.successfulQueries/this.results.totalQueries)*100).toFixed(2)}%)`);
        console.log(`  Failed Queries:      ${this.results.failedQueries} (${((this.results.failedQueries/this.results.totalQueries)*100).toFixed(2)}%)`);
        console.log(`  Read Queries:        ${this.results.readQueries}`);
        console.log(`  Write Queries:       ${this.results.writeQueries}`);
        console.log(`  Connection Errors:   ${this.results.connectionErrors}`);

        console.log(`\n⚡ Performance Statistics:`);
        console.log(`  Average Response Time: ${this.results.averageResponseTime.toFixed(2)}ms`);
        console.log(`  Min Response Time:     ${this.results.minResponseTime.toFixed(2)}ms`);
        console.log(`  Max Response Time:     ${this.results.maxResponseTime.toFixed(2)}ms`);
        console.log(`  50th Percentile:       ${this.results.p50?.toFixed(2) || 'N/A'}ms`);
        console.log(`  95th Percentile:       ${this.results.p95?.toFixed(2) || 'N/A'}ms`);
        console.log(`  99th Percentile:       ${this.results.p99?.toFixed(2) || 'N/A'}ms`);

        if (this.results.totalDuration) {
            const qps = (this.results.totalQueries / this.results.totalDuration) * 1000;
            console.log(`  Queries Per Second:   ${qps.toFixed(2)}`);
        }

        if (this.results.replicaStats) {
            console.log(`\n🔄 Database Metrics:`);
            console.log('  Database Metrics:', JSON.stringify(this.results.replicaStats, null, 2));
        }

        if (this.results.errors.length > 0) {
            console.log(`\n❌ Errors (${this.results.errors.length}):`);
            this.results.errors.slice(0, 10).forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
            if (this.results.errors.length > 10) {
                console.log(`  ... and ${this.results.errors.length - 10} more errors`);
            }
        }
    }

    getTestToken() {
        // Return a test JWT token (you'll need to authenticate first)
        return 'test-token';
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runFullTestSuite() {
        console.log('🧪 Starting Full Database Load Test Suite...\n');

        try {
            await this.testDatabaseMetrics();
            await this.testGraphQLQueries();
            await this.testConnectionPoolStress();
            await this.testWebSocketSubscriptions();

            console.log('\n🎉 All tests completed successfully!');

        } catch (error) {
            console.error('\n💥 Test suite failed:', error);
        }
    }
}

// Run the load test if this file is executed directly
if (require.main === module) {
    const options = {
        baseURL: process.env.BASE_URL || 'http://localhost:8080',
        wsURL: process.env.WS_URL || 'ws://localhost:8080/ws',
        concurrentConnections: parseInt(process.env.CONCURRENT_CONNECTIONS) || 50,
        duration: parseInt(process.env.TEST_DURATION) || 60000,
        queriesPerConnection: parseInt(process.env.QUERIES_PER_CONNECTION) || 100
    };

    console.log(`🚀 Starting Database Load Test with options:`, options);

    const tester = new DatabaseLoadTester(options);
    tester.runFullTestSuite();
}

module.exports = DatabaseLoadTester;
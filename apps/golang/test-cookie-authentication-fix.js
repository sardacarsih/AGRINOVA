#!/usr/bin/env node

/**
 * Cookie Authentication Fix Test Script
 * Tests the comprehensive cookie authentication fixes in the Agrinova GraphQL system
 */

const http = require('http');

// Configuration
const BACKEND_URL = 'http://localhost:8080';
const FRONTEND_URL = 'http://localhost:3000';

// Test credentials (using working credentials from server logs)
const TEST_CREDENTIALS = {
    identifier: 'superadmin',
    password: 'demo123'
};

// GraphQL mutation for web login
const LOGIN_MUTATION = `
    mutation WebLogin($input: WebLoginInput!) {
        webLogin(input: $input) {
            success
            user {
                id
                username
                nama
                role
                email
                noTelpon
                company {
                    id
                    nama
                }
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
            sessionId
            message
        }
    }
`;

// Test function
function makeGraphQLRequest(variables, headers = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            query: LOGIN_MUTATION,
            variables: variables
        });

        const requestOptions = {
            hostname: 'localhost',
            port: 8080,
            path: '/graphql',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'Origin': FRONTEND_URL,
                'Referer': FRONTEND_URL,
                ...headers
            }
        };

        const req = http.request(requestOptions, (res) => {
            let body = '';

            console.log('\n=== HTTP Response ===');
            console.log(`Status: ${res.statusCode}`);
            console.log(`Status Message: ${res.statusMessage}`);

            // Log all response headers
            console.log('\n--- Response Headers ---');
            for (const [key, value] of Object.entries(res.headers)) {
                console.log(`${key}: ${value}`);
            }

            // Specifically check for Set-Cookie headers
            console.log('\n--- Cookie Analysis ---');
            const setCookieHeaders = res.headers['set-cookie'] || [];
            if (setCookieHeaders.length > 0) {
                setCookieHeaders.forEach((cookie, index) => {
                    console.log(`Cookie ${index + 1}: ${cookie}`);

                    // Analyze cookie attributes
                    const cookieParts = cookie.split(';');
                    console.log(`  Name: ${cookieParts[0].split('=')[0].trim()}`);
                    console.log(`  Value: ${cookieParts[0].split('=')[1]?.trim() || '[EMPTY]'}`);

                    cookieParts.slice(1).forEach(part => {
                        const trimmed = part.trim();
                        if (trimmed.startsWith('Domain=')) {
                            console.log(`  Domain: ${trimmed.substring(7)}`);
                        } else if (trimmed.startsWith('Path=')) {
                            console.log(`  Path: ${trimmed.substring(5)}`);
                        } else if (trimmed.startsWith('SameSite=')) {
                            console.log(`  SameSite: ${trimmed.substring(9)}`);
                        } else if (trimmed.startsWith('Expires=')) {
                            console.log(`  Expires: ${trimmed.substring(8)}`);
                        } else if (trimmed.startsWith('Max-Age=')) {
                            console.log(`  Max-Age: ${trimmed.substring(7)}`);
                        } else if (trimmed === 'Secure') {
                            console.log(`  Secure: true`);
                        } else if (trimmed === 'HttpOnly') {
                            console.log(`  HttpOnly: true`);
                        }
                    });
                });
            } else {
                console.log('❌ No Set-Cookie headers found in response!');
            }

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve({ response, headers: res.headers, statusCode: res.statusCode });
                } catch (error) {
                    reject(new Error(`Failed to parse JSON response: ${error.message}. Raw body: ${body}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        // Log request details
        console.log('\n=== HTTP Request ===');
        console.log(`Method: ${requestOptions.method}`);
        console.log(`URL: http://${requestOptions.hostname}:${requestOptions.port}${requestOptions.path}`);
        console.log('\n--- Request Headers ---');
        for (const [key, value] of Object.entries(requestOptions.headers)) {
            console.log(`${key}: ${value}`);
        }
        console.log('\n--- Request Body ---');
        console.log(JSON.stringify(variables, null, 2));

        req.write(data);
        req.end();
    });
}

// Main test function
async function runCookieAuthenticationTest() {
    console.log('🍪 Cookie Authentication Fix Test');
    console.log('='.repeat(50));
    console.log(`Testing login from frontend: ${FRONTEND_URL}`);
    console.log(`Targeting backend: ${BACKEND_URL}`);
    console.log(`Test credentials: ${TEST_CREDENTIALS.identifier} / ${TEST_CREDENTIALS.password}`);
    console.log('\n' + '='.repeat(50));

    try {
        // Test 1: Basic web login with CORS headers
        console.log('\n🧪 Test 1: Web Login with CORS Headers');
        console.log('-'.repeat(30));

        const result = await makeGraphQLRequest({
            input: TEST_CREDENTIALS
        });

        console.log('\n--- GraphQL Response ---');
        console.log(JSON.stringify(result.response, null, 2));

        // Analyze the response
        if (result.response.data && result.response.data.webLogin) {
            const loginResult = result.response.data.webLogin;

            console.log('\n--- Login Analysis ---');
            console.log(`✅ Success: ${loginResult.success}`);
            console.log(`📝 Message: ${loginResult.message}`);

            if (loginResult.user) {
                console.log(`👤 User: ${loginResult.user.username} (${loginResult.user.role})`);
            }

            if (loginResult.sessionId) {
                console.log(`🆔 Session ID: ${loginResult.sessionId}`);
            }

            // Check if login was successful but cookies might not be working
            if (loginResult.success && (!result.headers['set-cookie'] || result.headers['set-cookie'].length === 0)) {
                console.log('\n⚠️  WARNING: Login successful but no cookies were set!');
                console.log('This indicates the CORS/cookie configuration issue still exists.');
            } else if (loginResult.success && result.headers['set-cookie'] && result.headers['set-cookie'].length > 0) {
                console.log('\n✅ SUCCESS: Login successful and cookies were set properly!');
            } else if (!loginResult.success) {
                console.log('\n❌ FAILED: Login was not successful');
            }
        }

        if (result.response.errors) {
            console.log('\n--- GraphQL Errors ---');
            result.response.errors.forEach((error, index) => {
                console.log(`Error ${index + 1}: ${error.message}`);
                if (error.extensions) {
                    console.log(`  Extensions: ${JSON.stringify(error.extensions, null, 2)}`);
                }
            });
        }

    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
if (require.main === module) {
    runCookieAuthenticationTest().then(() => {
        console.log('\n🏁 Test completed');
        process.exit(0);
    }).catch((error) => {
        console.error('\n💥 Test crashed:', error);
        process.exit(1);
    });
}

module.exports = { runCookieAuthenticationTest };
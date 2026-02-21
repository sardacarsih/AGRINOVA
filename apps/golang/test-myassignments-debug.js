const https = require('https');
const http = require('http');

async function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ 
            ok: res.statusCode >= 200 && res.statusCode < 300, 
            status: res.statusCode, 
            data: jsonData,
            headers: res.headers
          });
        } catch (e) {
          resolve({ 
            ok: res.statusCode >= 200 && res.statusCode < 300, 
            status: res.statusCode, 
            text: body,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function testMyAssignments() {
  try {
    // First login to get session cookie
    console.log('🔐 Logging in as mandor...');
    const loginResponse = await makeRequest('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      query: `
        mutation {
          webLogin(input: {
            identifier: "mandor"
            password: "demo123"
          }) {
            success
            sessionId
            user { id username role }
          }
        }
      `
    }));

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    console.log('✅ Login successful:', JSON.stringify(loginResponse.data, null, 2));

    if (!loginResponse.data?.data?.webLogin?.success) {
      throw new Error('Login not successful');
    }

    // Extract session cookie
    console.log('🔍 Debug: Full response headers:', JSON.stringify(loginResponse.headers, null, 2));
    
    // Use sessionId from response data as backup
    const sessionId = loginResponse.data?.data?.webLogin?.sessionId;
    console.log('🆔 Session ID from response:', sessionId);
    
    // Try to extract from set-cookie header
    const setCookieHeader = loginResponse.headers['set-cookie'];
    let sessionToken = null;
    let csrfToken = null;
    
    if (setCookieHeader) {
      console.log('🍪 Set-Cookie headers:', setCookieHeader);
      
      // Extract auth-session cookie (JWT token)
      const authSessionCookie = Array.isArray(setCookieHeader) 
        ? setCookieHeader.find(c => c.includes('auth-session='))
        : setCookieHeader.includes('auth-session=') ? setCookieHeader : null;
      
      if (authSessionCookie) {
        sessionToken = authSessionCookie.split('auth-session=')[1].split(';')[0];
        console.log('🍪 Extracted auth-session token:', sessionToken.substring(0, 50) + '...');
      }
      
      // Extract CSRF token
      const csrfCookie = Array.isArray(setCookieHeader) 
        ? setCookieHeader.find(c => c.includes('csrf-token='))
        : setCookieHeader.includes('csrf-token=') ? setCookieHeader : null;
        
      if (csrfCookie) {
        csrfToken = csrfCookie.split('csrf-token=')[1].split(';')[0];
        console.log('🛡️ Extracted CSRF token:', csrfToken.substring(0, 50) + '...');
      }
    }

    if (!sessionToken) {
      throw new Error('No session cookie or ID found');
    }

    // Now test myAssignments query
    console.log('\n📋 Testing myAssignments query...');
    const assignmentsResponse = await makeRequest('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth-session=${sessionToken}${csrfToken ? `; csrf-token=${csrfToken}` : ''}`
      }
    }, JSON.stringify({
      query: `
        query GetMyAssignments {
          myAssignments {
            companies {
              id
              nama
              alamat
              telepon
              status
              createdAt
            }
            estates {
              id
              nama
              lokasi
              luasHa
              companyId
              company {
                id
                nama
                status
              }
              divisions {
                id
                nama
                kode
              }
              createdAt
            }
            divisions {
              id
              nama
              kode
              estateId
              estate {
                id
                nama
                lokasi
                luasHa
                company {
                  id
                  nama
                  status
                }
              }
              blocks {
                id
                kodeBlok
                nama
                luasHa
              }
              createdAt
            }
          }
        }
      `
    }));

    if (!assignmentsResponse.ok) {
      throw new Error(`Assignments query failed: ${assignmentsResponse.status}`);
    }

    if (assignmentsResponse.data.errors) {
      console.log('❌ GraphQL Errors:');
      assignmentsResponse.data.errors.forEach(error => {
        console.log('  - Message:', error.message);
        console.log('    Path:', error.path);
        console.log('    Extensions:', error.extensions);
        console.log('    Locations:', error.locations);
      });
    }

    if (assignmentsResponse.data.data) {
      console.log('✅ Assignments data received:');
      console.log(JSON.stringify(assignmentsResponse.data.data, null, 2));
    } else {
      console.log('❌ No data in response');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMyAssignments();
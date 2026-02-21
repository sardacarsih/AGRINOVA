// Browser-based authentication testing
// Run this in browser console: fetch('/test-auth-browser.js').then(r => r.text()).then(eval)

console.log('🚀 Starting Browser Cookie Authentication Test');
console.log('===============================================');

// Configuration
const API_BASE_URL = 'http://localhost:3001/api/v1';

// Test function for comprehensive cookie auth debugging
async function testBrowserCookieAuth() {
    console.log('\n=== PHASE 1: Environment Check ===');
    
    // Check current domain and URL
    console.log('Current domain:', window.location.hostname);
    console.log('Current origin:', window.location.origin); 
    console.log('Current protocol:', window.location.protocol);
    console.log('Document domain:', document.domain);
    
    // Check initial cookies
    console.log('Initial cookies:', document.cookie);
    
    console.log('\n=== PHASE 2: Login Test ===');
    
    try {
        // Test login with proper credentials and platform headers
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-platform': 'WEB',
                'Accept': 'application/json'
            },
            credentials: 'include', // CRITICAL: Include cookies
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123',
                platform: 'WEB',
                rememberMe: true
            })
        });
        
        console.log('Login response status:', loginResponse.status);
        console.log('Login response headers:', [...loginResponse.headers.entries()]);
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('✅ Login successful!', loginData);
            
            // Check cookies after login
            console.log('Cookies after login:', document.cookie);
            
            // Parse cookies to check for session_token
            const cookies = document.cookie.split(';').reduce((acc, cookie) => {
                const [name, value] = cookie.trim().split('=');
                acc[name] = decodeURIComponent(value || '');
                return acc;
            }, {});
            
            console.log('Parsed cookies:', cookies);
            
            if (cookies.session_token) {
                console.log('✅ session_token cookie found in browser');
                console.log('Session token length:', cookies.session_token.length);
                
                // Try to decode JWT (just for debugging - don't do this in production)
                try {
                    const tokenParts = cookies.session_token.split('.');
                    if (tokenParts.length === 3) {
                        const header = JSON.parse(atob(tokenParts[0]));
                        const payload = JSON.parse(atob(tokenParts[1]));
                        console.log('JWT Header:', header);
                        console.log('JWT Payload (user info):', payload);
                        console.log('Token expires at:', new Date(payload.exp * 1000));
                    }
                } catch (jwtError) {
                    console.log('Could not decode JWT:', jwtError.message);
                }
            } else {
                console.log('❌ session_token cookie NOT found in browser!');
                console.log('Available cookies:', Object.keys(cookies));
                return;
            }
            
            if (cookies.user_info) {
                console.log('✅ user_info cookie found');
                try {
                    const userInfo = JSON.parse(cookies.user_info);
                    console.log('User info from cookie:', userInfo);
                } catch (e) {
                    console.log('Could not parse user_info cookie');
                }
            }
            
        } else {
            console.log('❌ Login failed:', loginResponse.status, loginResponse.statusText);
            const errorData = await loginResponse.text();
            console.log('Error response:', errorData);
            return;
        }
        
        console.log('\n=== PHASE 3: API Request Test ===');
        
        // Test companies API with cookies
        console.log('Testing /companies endpoint...');
        
        const companiesResponse = await fetch(`${API_BASE_URL}/companies`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-platform': 'WEB'
            },
            credentials: 'include' // CRITICAL: Include cookies
        });
        
        console.log('Companies response status:', companiesResponse.status);
        console.log('Companies response headers:', [...companiesResponse.headers.entries()]);
        
        if (companiesResponse.ok) {
            const companiesData = await companiesResponse.json();
            console.log('✅ Companies API successful!', companiesData);
            console.log('Companies count:', companiesData?.length || 0);
        } else {
            console.log('❌ Companies API failed:', companiesResponse.status, companiesResponse.statusText);
            const errorData = await companiesResponse.text();
            console.log('Companies error response:', errorData);
            
            // Additional debugging for 401 errors
            if (companiesResponse.status === 401) {
                console.log('🔍 401 Unauthorized Analysis:');
                console.log('Cookies being sent:', document.cookie);
                console.log('Request URL:', `${API_BASE_URL}/companies`);
                console.log('Request origin:', window.location.origin);
                console.log('API base URL:', API_BASE_URL);
                console.log('Cross-origin request:', window.location.origin !== new URL(API_BASE_URL).origin);
            }
        }
        
        // Test auth/web/me endpoint
        console.log('\nTesting /auth/web/me endpoint...');
        
        const meResponse = await fetch(`${API_BASE_URL}/auth/web/me`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-platform': 'WEB'
            },
            credentials: 'include'
        });
        
        if (meResponse.ok) {
            const meData = await meResponse.json();
            console.log('✅ Auth/me API successful!', meData);
        } else {
            console.log('❌ Auth/me API failed:', meResponse.status);
        }
        
        console.log('\n🎉 Browser Cookie Authentication Test Completed!');
        
    } catch (error) {
        console.error('❌ Browser test failed:', error);
        
        // Additional debugging information
        console.log('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 3)
        });
        
        console.log('Network debugging:');
        console.log('- Check if API server is running on http://localhost:3001');
        console.log('- Verify CORS configuration allows localhost:3000');
        console.log('- Check browser Network tab for detailed error information');
    }
}

// Auto-run the test
testBrowserCookieAuth().catch(console.error);

// Make functions available in global scope for manual testing
window.testBrowserCookieAuth = testBrowserCookieAuth;

console.log('🔧 Manual test functions available:');
console.log('- testBrowserCookieAuth() - Run complete browser cookie test');
console.log('- document.cookie - Check current cookies');
console.log('- fetch() with credentials: "include" - Manual API testing');
// Debug session test for Next.js authentication issue
console.log('=== Session Debug Test ===');

// Test 1: Check if we can access browser cookies
if (typeof document !== 'undefined') {
    console.log('Browser cookies:', document.cookie);
    
    // Check for specific session cookies
    const hasSessionToken = document.cookie.includes('session_token=');
    const hasAuthSession = document.cookie.includes('auth-session=');
    
    console.log('Session cookies found:', {
        session_token: hasSessionToken,
        'auth-session': hasAuthSession
    });
    
    // Test direct GraphQL call with cookies
    const testGraphQLAuth = async () => {
        try {
            console.log('Testing direct GraphQL call...');
            const response = await fetch('http://localhost:8080/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Include cookies
                body: JSON.stringify({
                    query: '{ me { id username role } }'
                })
            });
            
            const result = await response.json();
            console.log('GraphQL response:', result);
            
            if (result.data && result.data.me) {
                console.log('✅ GraphQL authentication working with cookies');
                console.log('User data:', result.data.me);
            } else {
                console.log('❌ GraphQL authentication failed');
                if (result.errors) {
                    console.log('Errors:', result.errors);
                }
            }
        } catch (error) {
            console.error('GraphQL test error:', error);
        }
    };
    
    testGraphQLAuth();
} else {
    console.log('Not in browser environment');
}
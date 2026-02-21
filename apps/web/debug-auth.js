// Debug script for authentication state
console.log('=== AUTH DEBUG INFO ===');

// Check localStorage
const authData = localStorage.getItem('agrinova_auth');
const accessToken = localStorage.getItem('agrinova_access_token');
const refreshToken = localStorage.getItem('agrinova_refresh_token');

console.log('1. localStorage data:');
console.log('   agrinova_auth:', authData ? 'EXISTS' : 'MISSING');
console.log('   access_token:', accessToken ? 'EXISTS' : 'MISSING');  
console.log('   refresh_token:', refreshToken ? 'EXISTS' : 'MISSING');

if (authData) {
  try {
    const parsed = JSON.parse(authData);
    console.log('2. Parsed auth data:');
    console.log('   user:', parsed.user?.email || 'N/A');
    console.log('   role:', parsed.user?.role || 'N/A');
    console.log('   expiresAt:', parsed.expiresAt);
    console.log('   isExpired:', new Date() > new Date(parsed.expiresAt));
  } catch (error) {
    console.error('2. Error parsing auth data:', error);
  }
}

console.log('3. Current URL:', window.location.href);
console.log('=== END DEBUG ===');
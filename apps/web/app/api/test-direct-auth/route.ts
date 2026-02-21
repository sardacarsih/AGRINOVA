import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [Direct Auth Test] Testing direct GraphQL authentication');
    
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    console.log('🔍 [Direct Auth Test] Making direct GraphQL request for:', { username });
    
    const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080/graphql';
    
    const query = `
      mutation {
        webLogin(input: {identifier: "${username}", password: "${password}"}) {
          success
          message
          user {
            id
            username
            nama
            role
          }
          companies {
            id
            nama
          }
          sessionId
        }
      }
    `;
    
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query })
    });
    
    console.log('🔍 [Direct Auth Test] GraphQL response status:', response.status);
    
    const data = await response.json();
    
    console.log('🔍 [Direct Auth Test] GraphQL response data:', data);
    
    if (response.ok && data.data && data.data.webLogin) {
      const webLogin = data.data.webLogin;
      
      return NextResponse.json({
        success: webLogin.success,
        message: webLogin.message,
        data: webLogin.success ? {
          user: webLogin.user,
          companies: webLogin.companies,
          sessionId: webLogin.sessionId,
        } : null,
        timestamp: new Date().toISOString(),
        testType: 'direct-graphql',
      });
    } else if (data.errors) {
      return NextResponse.json({
        success: false,
        message: 'GraphQL errors occurred',
        errors: data.errors,
        timestamp: new Date().toISOString(),
        testType: 'direct-graphql',
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Unexpected GraphQL response',
        data: data,
        timestamp: new Date().toISOString(),
        testType: 'direct-graphql',
      });
    }
    
  } catch (error: any) {
    console.error('🔍 [Direct Auth Test] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Direct authentication test failed',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        testType: 'direct-graphql',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Direct Auth Test API is running',
    graphqlUrl: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080/graphql',
    timestamp: new Date().toISOString(),
  });
}
import { NextRequest, NextResponse } from 'next/server';
import cookieApiClient from '@/lib/api/cookie-client';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [Test Auth API] Received test authentication request');
    
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    console.log('🔍 [Test Auth API] Testing login for:', { username });
    
    // Test the cookie client login
    const loginData = {
      username,
      password,
      platform: 'WEB' as const,
      rememberMe: false,
    };
    
    const result = await cookieApiClient.login(loginData);
    
    console.log('🔍 [Test Auth API] Login result:', {
      success: result.success,
      hasData: !!result.data,
      message: result.message,
      userRole: result.data?.user?.role,
    });
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result.data ? {
        user: {
          id: result.data.user.id,
          username: result.data.user.username,
          name: result.data.user.name,
          role: result.data.user.role,
        },
        sessionId: result.data.sessionId,
        companies: result.data.companies,
      } : null,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('🔍 [Test Auth API] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Test authentication failed',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test Auth API is running',
    graphqlUrl: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080/graphql',
    timestamp: new Date().toISOString(),
  });
}
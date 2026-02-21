import { NextRequest, NextResponse } from 'next/server';

const normalizeGraphQLEndpoint = (value: string): string => {
    const raw = value.trim();
    if (!raw) {
        return 'http://127.0.0.1:8080/graphql';
    }

    // Accept both base URL and full GraphQL endpoint.
    // https://api.example.com -> https://api.example.com/graphql
    // https://api.example.com/graphql -> unchanged
    if (/\/graphql\/?$/i.test(raw)) {
        return raw.replace(/\/$/, '');
    }

    return `${raw.replace(/\/$/, '')}/graphql`;
};

const getBackendUrl = () => {
    // 1. Prioritize explicit backend URL
    if (process.env.BACKEND_GRAPHQL_URL) {
        return normalizeGraphQLEndpoint(process.env.BACKEND_GRAPHQL_URL);
    }

    // 2. Check NEXT_PUBLIC_GRAPHQL_URL but avoid loops
    const publicUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL;
    if (publicUrl) {
        // If the public URL points to this proxy (contains /api/graphql), 
        // we must NOT use it for the backend connection.
        if (publicUrl.includes('/api/graphql')) {
            console.warn('⚠️ NEXT_PUBLIC_GRAPHQL_URL points to /api/graphql. Ignoring for backend connection to prevent loop.');
            return 'http://127.0.0.1:8080/graphql';
        }
        return normalizeGraphQLEndpoint(publicUrl);
    }

    // 3. Default fallback
    return 'http://127.0.0.1:8080/graphql';
};

const GRAPHQL_URL = getBackendUrl();

type GraphQLBody = {
    operationName?: string;
    query?: string;
    variables?: Record<string, any>;
};

function normalizeCompanyMutationInput(body: GraphQLBody): GraphQLBody {
    const operationName = body.operationName || '';
    const query = body.query || '';
    const isCreateCompany = operationName === 'CreateCompany' || query.includes('mutation CreateCompany');
    const isUpdateCompany = operationName === 'UpdateCompany' || query.includes('mutation UpdateCompany');

    if (!isCreateCompany && !isUpdateCompany) {
        return body;
    }

    const variables = body.variables;
    const input = variables?.input;
    if (!variables || !input || typeof input !== 'object' || Array.isArray(input)) {
        return body;
    }

    const normalizedInput = { ...input };

    // Backward compatibility for older clients that still send `code`.
    if (normalizedInput.companyCode == null && normalizedInput.code != null) {
        normalizedInput.companyCode = normalizedInput.code;
    }
    delete normalizedInput.code;

    // UpdateCompanyInput does not accept isActive.
    if (isUpdateCompany) {
        delete normalizedInput.isActive;
    }

    return {
        ...body,
        variables: {
            ...variables,
            input: normalizedInput,
        },
    };
}

export async function POST(request: NextRequest) {
    try {
        console.log('🔄 [GraphQL Proxy] Proxying GraphQL request to:', GRAPHQL_URL);
        console.log('📋 [GraphQL Proxy] Request headers:', {
            'content-type': request.headers.get('content-type'),
            'content-length': request.headers.get('content-length'),
            'method': request.method,
        });

        // Read the request body properly to handle all cases
        let body: GraphQLBody | null = null;
        let text = '';

        try {
            // Try to get body as text first
            text = await request.text();
            console.log('📦 [GraphQL Proxy] Request body length:', text.length);

            if (!text || text.trim() === '') {
                console.warn('⚠️ [GraphQL Proxy] Empty request body received');
                return NextResponse.json(
                    { errors: [{ message: 'Empty request body' }] },
                    { status: 400 }
                );
            }

            // Parse the JSON body
            body = JSON.parse(text);
            body = normalizeCompanyMutationInput(body);
            text = JSON.stringify(body);
            console.log('📦 [GraphQL Proxy] Request body preview:', JSON.stringify(body).substring(0, 200));

        } catch (err) {
            console.error('❌ [GraphQL Proxy] Error reading or parsing request body:', err);
            return NextResponse.json(
                { errors: [{ message: 'Invalid JSON in request body' }] },
                { status: 400 }
            );
        }

        // Debug logging for request
        const operationName = body?.operationName || 'Unknown';
        console.log(`📝 [GraphQL Proxy] Operation: ${operationName}`);

        // Log incoming cookies
        const incomingCookies = request.headers.get('cookie');
        console.log('📥 [GraphQL Proxy] Incoming cookies:', incomingCookies || 'None');

        // Forward the request to the backend
        const response = await fetch(GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Forward cookies from the client request
                'Cookie': incomingCookies || '',
                // Forward other relevant headers
                'Authorization': request.headers.get('authorization') || '',
                'X-CSRF-Token': request.headers.get('x-csrf-token') || '',
            },
            body: text, // Use the original text we already parsed
        });

        console.log(`📊 [GraphQL Proxy] Backend response status: ${response.status} ${response.statusText}`);

        const rawResponseBody = await response.text();
        let data: any;

        if (!rawResponseBody || rawResponseBody.trim() === '') {
            data = {
                errors: [
                    {
                        message: `Backend returned empty response (${response.status} ${response.statusText})`,
                        extensions: {
                            backendUrl: GRAPHQL_URL,
                        },
                    },
                ],
                data: null,
            };
            console.error('❌ [GraphQL Proxy] Empty backend response body');
        } else {
            try {
                data = JSON.parse(rawResponseBody);
            } catch (parseError) {
                const preview = rawResponseBody.substring(0, 300);
                data = {
                    errors: [
                        {
                            message: `Backend returned non-JSON response (${response.status} ${response.statusText})`,
                            extensions: {
                                backendUrl: GRAPHQL_URL,
                                responsePreview: preview,
                            },
                        },
                    ],
                    data: null,
                };
                console.error('❌ [GraphQL Proxy] Failed to parse backend JSON:', parseError);
            }
        }

        // Log response data for debugging
        if (response.status !== 200) {
            console.error('❌ [GraphQL Proxy] Error response:', JSON.stringify(data).substring(0, 500));
        } else {
            console.log('✅ [GraphQL Proxy] Success response');
        }

        // Create the Next.js response
        const nextResponse = NextResponse.json(data, {
            status: response.status,
            statusText: response.statusText,
        });

        // Forward Set-Cookie headers from backend to client
        // Try to use getSetCookie() if available (Node.js 18+ / Next.js 13+)
        // @ts-ignore - getSetCookie might not be in the type definition yet
        if (typeof response.headers.getSetCookie === 'function') {
            // @ts-ignore
            const cookies = response.headers.getSetCookie();
            if (cookies && cookies.length > 0) {
                console.log(`📤 [GraphQL Proxy] Forwarding ${cookies.length} Set-Cookie header(s) from backend`);
                cookies.forEach((cookie: string, index: number) => {
                    console.log(`   🍪 Cookie ${index + 1}:`, cookie.substring(0, 100) + (cookie.length > 100 ? '...' : ''));
                    nextResponse.headers.append('set-cookie', cookie);
                });
            } else {
                console.log('⚠️  [GraphQL Proxy] No Set-Cookie headers received from backend');
            }
        } else {
            // Fallback for older environments
            const setCookieHeader = response.headers.get('set-cookie');
            if (setCookieHeader) {
                console.log('📤 [GraphQL Proxy] Forwarding Set-Cookie header (fallback method):', setCookieHeader.substring(0, 100));
                nextResponse.headers.set('set-cookie', setCookieHeader);
            } else {
                console.log('⚠️  [GraphQL Proxy] No Set-Cookie headers received from backend (fallback method)');
            }
        }

        // Also iterate over all Set-Cookie headers if the environment supports it to be safe
        // (This is a bit of a hack because standard fetch API doesn't make it easy to get multiple Set-Cookie headers)
        // However, Next.js NextResponse might handle the 'Set-Cookie' header correctly if passed as is.

        return nextResponse;
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json(
            {
                errors: [
                    {
                        message: 'GraphQL backend unavailable',
                        extensions: {
                            backendUrl: GRAPHQL_URL,
                            cause: error instanceof Error ? error.message : String(error),
                        },
                    },
                ],
                data: null,
            },
            { status: 503 }
        );
    }
}

export async function OPTIONS(request: NextRequest) {
    console.log('🔄 [GraphQL Proxy] Handling OPTIONS preflight request');

    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-CSRF-Token',
            'Access-Control-Allow-Credentials': 'true',
        },
    });
}

export async function GET(request: NextRequest) {
    // Handle GET requests (e.g. for playground or simple queries if supported)
    // For now, just return 405 Method Not Allowed or forward if needed.
    // Let's forward for completeness if the backend supports GET GraphQL

    const url = new URL(request.url);
    const backendUrl = new URL(GRAPHQL_URL);
    backendUrl.search = url.search;

    try {
        const response = await fetch(backendUrl.toString(), {
            method: 'GET',
            headers: {
                'Cookie': request.headers.get('cookie') || '',
                'Authorization': request.headers.get('authorization') || '',
            }
        });

        const data = await response.json(); // Assuming JSON response

        const nextResponse = NextResponse.json(data, {
            status: response.status,
        });

        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
            nextResponse.headers.set('set-cookie', setCookieHeader);
        }

        return nextResponse;

    } catch (error) {
        return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
    }
}

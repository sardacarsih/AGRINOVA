import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl } from '@/lib/api/backend-base-url';

const rewriteSetCookieHeader = (cookie: string, request: NextRequest): string => {
  const requestHost = (request.headers.get('host') || '').split(':')[0]?.trim().toLowerCase() || '';
  if (!requestHost) return cookie;

  const localHost =
    requestHost === 'localhost' ||
    requestHost === '127.0.0.1' ||
    requestHost.endsWith('.localhost');

  if (localHost) {
    return cookie.replace(/;\s*domain=[^;]+/gi, '');
  }

  return cookie.replace(/domain=[^;]+/gi, `Domain=${requestHost}`);
};

export async function proxyToBackend(
  request: NextRequest,
  targetPath: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
  }
): Promise<NextResponse> {
  const baseUrl = getBackendBaseUrl();
  const target = new URL(targetPath, `${baseUrl}/`);

  if (request.nextUrl.search) {
    target.search = request.nextUrl.search;
  }

  const method = options?.method ?? (request.method as 'GET' | 'POST' | 'PUT' | 'DELETE');
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  headers.set('Cookie', request.headers.get('cookie') || '');
  headers.set('Authorization', request.headers.get('authorization') || '');
  headers.set('X-CSRF-Token', request.headers.get('x-csrf-token') || '');

  let bodyPayload: string | undefined;
  if (options?.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    bodyPayload = JSON.stringify(options.body);
  } else if (method !== 'GET' && method !== 'DELETE') {
    const contentType = request.headers.get('content-type') || 'application/json';
    headers.set('Content-Type', contentType);
    const rawBody = await request.text();
    if (rawBody) {
      bodyPayload = rawBody;
    }
  }

  const response = await fetch(target.toString(), {
    method,
    headers,
    body: bodyPayload,
  });

  const raw = await response.text();
  let parsed: unknown = null;
  if (raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { message: raw };
    }
  }

  const nextResponse = NextResponse.json(parsed, { status: response.status });

  // @ts-ignore - available in Node runtime
  if (typeof response.headers.getSetCookie === 'function') {
    // @ts-ignore
    const setCookies = response.headers.getSetCookie() as string[];
    for (const cookie of setCookies) {
      nextResponse.headers.append('set-cookie', rewriteSetCookieHeader(cookie, request));
    }
  } else {
    const singleCookie = response.headers.get('set-cookie');
    if (singleCookie) {
      nextResponse.headers.set('set-cookie', rewriteSetCookieHeader(singleCookie, request));
    }
  }

  return nextResponse;
}

export async function proxyMultipartToBackend(
  request: NextRequest,
  targetPath: string,
  method: 'POST' | 'PUT' = 'POST'
): Promise<NextResponse> {
  const baseUrl = getBackendBaseUrl();
  const target = new URL(targetPath, `${baseUrl}/`);

  if (request.nextUrl.search) {
    target.search = request.nextUrl.search;
  }

  const headers = new Headers();
  headers.set('Accept', 'application/json');
  headers.set('Cookie', request.headers.get('cookie') || '');
  headers.set('Authorization', request.headers.get('authorization') || '');
  headers.set('X-CSRF-Token', request.headers.get('x-csrf-token') || '');

  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  const response = await fetch(target.toString(), {
    method,
    headers,
    body: await request.arrayBuffer(),
  });

  const raw = await response.text();
  let parsed: unknown = null;
  if (raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { message: raw };
    }
  }

  const nextResponse = NextResponse.json(parsed, { status: response.status });

  // @ts-ignore - available in Node runtime
  if (typeof response.headers.getSetCookie === 'function') {
    // @ts-ignore
    const setCookies = response.headers.getSetCookie() as string[];
    for (const cookie of setCookies) {
      nextResponse.headers.append('set-cookie', rewriteSetCookieHeader(cookie, request));
    }
  } else {
    const singleCookie = response.headers.get('set-cookie');
    if (singleCookie) {
      nextResponse.headers.set('set-cookie', rewriteSetCookieHeader(singleCookie, request));
    }
  }

  return nextResponse;
}

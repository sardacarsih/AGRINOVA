import { NextApiRequest, NextApiResponse } from 'next';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { IncomingMessage } from 'http';

// Extended interfaces for proxy
interface ExtendedNextApiRequest extends NextApiRequest {
  url?: string;
}

interface ExtendedIncomingMessage extends IncomingMessage {
  url?: string;
}

// Backend API configuration - Updated to use Go GraphQL server
const API_BASE_URL = process.env.API_URL || 'http://localhost:8080';
const isDevelopment = process.env.NODE_ENV === 'development';

console.log(`🔄 API Proxy Configuration:`, {
  NODE_ENV: process.env.NODE_ENV,
  API_BASE_URL,
  isDevelopment
});

// Create proxy middleware with new API format
const apiProxy = createProxyMiddleware({
  target: API_BASE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/graphql': '/graphql',
    '^/api': '',
  },
  cookieDomainRewrite: {
    "localhost:8080": "localhost",
  },
  secure: false,
  logger: isDevelopment ? console : undefined,
  on: {
    proxyReq: (proxyReq: any, req: ExtendedIncomingMessage) => {
      const rewrittenUrl = req.url?.replace(/^\/api\/graphql/, '/graphql') || req.url?.replace(/^\/api/, '') || req.url;
      console.log(`🔄 Proxying ${req.method} ${req.url} → ${API_BASE_URL}${rewrittenUrl}`);

      if (req.url?.includes('/graphql') && req.method === 'POST') {
        console.log('🔍 [GraphQL Proxy] Incoming GraphQL POST request detected');
      }

      if (req.headers.cookie) {
        console.log(`🍪 Forwarding cookies: ${req.headers.cookie}`);
      }

      proxyReq.setHeader('x-forwarded-for', req.connection?.remoteAddress || '');
      proxyReq.setHeader('x-forwarded-proto', (req.connection as any)?.encrypted ? 'https' : 'http');
      proxyReq.setHeader('x-forwarded-host', req.headers.host || '');
    },
    proxyRes: (proxyRes: any, req: ExtendedIncomingMessage, res: any) => {
      console.log(`✅ Proxy response ${proxyRes.statusCode} for ${req.method} ${req.url}`);

      if (proxyRes.headers['set-cookie']) {
        const rewrittenCookies = proxyRes.headers['set-cookie'].map((cookie: string) => {
          let rewrittenCookie = cookie
            .replace(/domain=localhost:8080;/gi, 'domain=localhost;')
            .replace(/domain=127.0.0.1:8080;/gi, 'domain=127.0.0.1;');

          if (process.env.NODE_ENV === 'development') {
            rewrittenCookie = rewrittenCookie
              .replace(/domain=localhost;/gi, '')
              .replace(/domain=127.0.0.1;/gi, '');
          }
          return rewrittenCookie;
        });
        res.setHeader('set-cookie', rewrittenCookies);
      }
    },
    error: (err: any, req: ExtendedIncomingMessage, res: any) => {
      console.error(`❌ Proxy error for ${req.method} ${req.url}:`, err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        message: 'API Gateway Error',
        error: err.message,
        details: 'The backend API server may be down or unreachable'
      }));
    },
  },
});

export default function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  console.log(`🎯 API Gateway: ${req.method} ${req.url}`);
  
  // Add CORS headers for development
  if (isDevelopment) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, x-platform, x-device-id');
  }
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Ensure URL is set for proxy
  if (!req.url) {
    req.url = `/api/${(req.query.proxy as string[]).join('/')}`;
  }
  
  // Use proxy middleware
  return apiProxy(req as any, res as any);
}

export const config = {
  api: {
    bodyParser: false, // Required for proxy to handle body parsing
    externalResolver: true, // Required for proxy middleware
  },
};
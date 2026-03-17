import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/api/backend-proxy';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/api/public/theme-runtime', { method: 'GET' });
}

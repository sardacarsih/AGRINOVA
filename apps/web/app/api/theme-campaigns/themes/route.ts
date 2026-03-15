import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/api/backend-proxy';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/api/theme/themes', { method: 'GET' });
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request, '/api/theme/themes', { method: 'POST' });
}

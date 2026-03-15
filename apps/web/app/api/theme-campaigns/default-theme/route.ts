import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/api/backend-proxy';

export async function POST(request: NextRequest) {
  return proxyToBackend(request, '/api/theme/settings/default-theme', { method: 'POST' });
}

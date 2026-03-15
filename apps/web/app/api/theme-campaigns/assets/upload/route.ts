import { NextRequest } from 'next/server';
import { proxyMultipartToBackend } from '@/lib/api/backend-proxy';

export async function POST(request: NextRequest) {
  return proxyMultipartToBackend(request, '/api/theme/assets/upload', 'POST');
}

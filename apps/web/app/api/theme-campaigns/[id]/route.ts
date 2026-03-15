import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/api/backend-proxy';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyToBackend(request, `/api/theme/campaigns/${id}`, { method: 'PUT' });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyToBackend(request, `/api/theme/campaigns/${id}`, { method: 'DELETE' });
}

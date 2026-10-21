import { NextResponse } from 'next/server';
import { clearAdminCookie } from '@/lib/auth';
import { isSameOriginRequest } from '@/lib/security';

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return new NextResponse('Requisição inválida.', { status: 403 });
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: '/admin',
      'Set-Cookie': clearAdminCookie(),
      'Cache-Control': 'no-store',
    },
  });
}

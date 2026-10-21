import { NextResponse } from 'next/server';
import { createAdminCookie, getConfiguredAdminPassword } from '@/lib/auth';
import {
  checkRateLimit,
  getClientIp,
  isSameOriginRequest,
  resetRateLimit,
  sleep,
  timingSafeStringEqual,
} from '@/lib/security';

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    return new NextResponse('Requisição inválida.', { status: 403 });
  }

  const contentLength = Number(req.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > 4096) {
    return new NextResponse('Requisição inválida.', { status: 413 });
  }

  const ip = getClientIp(req);
  const key = `admin-login:${ip}`;
  const rate = checkRateLimit(key, 6, 15 * 60 * 1000);
  if (!rate.allowed) {
    return new NextResponse('Muitas tentativas. Tente novamente mais tarde.', {
      status: 429,
      headers: { 'Retry-After': String(rate.retryAfter), 'Cache-Control': 'no-store' },
    });
  }

  try {
    const form = await req.formData();
    const password = String(form.get('password') || '').trim();
    const configuredPassword = getConfiguredAdminPassword();

    if (!timingSafeStringEqual(password, configuredPassword)) {
      await sleep(700);
      return new NextResponse('Senha inválida', {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    resetRateLimit(key);
    return new NextResponse(null, {
      status: 303,
      headers: {
        Location: '/admin',
        'Set-Cookie': createAdminCookie(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Falha de configuração do admin:', error instanceof Error ? error.message : 'erro desconhecido');
    return new NextResponse('Painel administrativo não configurado.', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}

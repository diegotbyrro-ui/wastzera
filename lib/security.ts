import crypto from 'crypto';

type RateEntry = { count: number; resetAt: number };

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
};

const globalSecurity = globalThis as typeof globalThis & {
  __wastzeraRateLimitStore?: Map<string, RateEntry>;
};

const rateStore = globalSecurity.__wastzeraRateLimitStore || new Map<string, RateEntry>();
globalSecurity.__wastzeraRateLimitStore = rateStore;

export function getClientIp(req: Request): string {
  const cfIp = req.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;

  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return 'unknown';
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  // Limpeza oportunista para evitar crescimento indefinido do mapa.
  if (rateStore.size > 1000) {
    for (const [storedKey, entry] of rateStore) {
      if (entry.resetAt <= now) rateStore.delete(storedKey);
    }
  }

  const current = rateStore.get(key);
  if (!current || current.resetAt <= now) {
    rateStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfter: Math.ceil(windowMs / 1000) };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  rateStore.set(key, current);
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function resetRateLimit(key: string) {
  rateStore.delete(key);
}

export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get('origin');
  const secFetchSite = req.headers.get('sec-fetch-site');
  const configuredOrigin = process.env.APP_ORIGIN?.trim().replace(/\/$/, '');

  // Em produção, APP_ORIGIN é a referência mais confiável porque evita
  // depender somente de headers de proxy. Defina-o no hPanel da Hostinger.
  if (configuredOrigin) {
    if (!origin) {
      if (process.env.NODE_ENV !== 'production') return true;
      return secFetchSite === 'same-origin';
    }
    try {
      return new URL(origin).origin === new URL(configuredOrigin).origin;
    } catch {
      return false;
    }
  }

  // Fallback para desenvolvimento ou primeira configuração local.
  if (!origin) {
    if (process.env.NODE_ENV !== 'production') return true;
    return secFetchSite === 'same-origin';
  }

  try {
    const parsed = new URL(origin);
    const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const host = forwardedHost || req.headers.get('host');
    if (!host) return false;

    const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const protocol = forwardedProto || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    return parsed.origin === `${protocol}://${host}`;
  } catch {
    return false;
  }
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');
  if (aBuffer.length !== bBuffer.length) {
    // Mantém uma comparação criptográfica mesmo quando os tamanhos diferem.
    const digestA = crypto.createHash('sha256').update(aBuffer).digest();
    const digestB = crypto.createHash('sha256').update(bBuffer).digest();
    crypto.timingSafeEqual(digestA, digestB);
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export async function readJsonWithLimit<T = unknown>(req: Request, maxBytes = 16_384): Promise<T> {
  const contentLength = Number(req.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error('PAYLOAD_TOO_LARGE');
  }

  const text = await req.text();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');
  return JSON.parse(text) as T;
}

export function safeSpreadsheetCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  // Mitiga formula injection ao abrir arquivos XLSX em Excel/LibreOffice.
  return /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

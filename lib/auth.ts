import crypto from 'crypto';

const COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-wastzera_admin' : 'wastzera_admin';
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

function secret() {
  const value = process.env.ADMIN_COOKIE_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new Error('ADMIN_COOKIE_SECRET deve ter pelo menos 32 caracteres.');
  }
  return value;
}

function signature(value: string) {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}

export function getConfiguredAdminPassword() {
  const password = process.env.ADMIN_PASSWORD?.trim() || '';
  const minimumLength = process.env.NODE_ENV === 'production' ? 16 : 12;
  if (!password || password.length < minimumLength) {
    throw new Error(`ADMIN_PASSWORD não configurada ou muito curta. Use ao menos ${minimumLength} caracteres.`);
  }
  return password;
}

export function createAdminCookie() {
  const issuedAt = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${issuedAt}.${nonce}`;
  const token = `${payload}.${signature(payload)}`;
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}; Priority=High${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export function clearAdminCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0; Priority=High${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export function isValidAdminCookie(raw?: string | null) {
  if (!raw) return false;

  const token = raw
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);

  if (!token) return false;
  const [issuedAtRaw, nonce, sig] = token.split('.');
  if (!issuedAtRaw || !nonce || !sig) return false;

  const issuedAt = Number(issuedAtRaw);
  const now = Date.now();
  if (!Number.isFinite(issuedAt) || issuedAt > now + 60_000 || now - issuedAt > SESSION_TTL_MS) return false;

  const payload = `${issuedAtRaw}.${nonce}`;

  try {
    const expected = signature(payload);
    const sigBuffer = Buffer.from(sig, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getEnv } from './env';

export const ADMIN_COOKIE_NAME = 'aura_admin_session';
export const CLIENT_SESSION_COOKIE_NAME = 'aura_client_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const CLIENT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

interface AdminTokenPayload {
  role: 'admin';
  iat: number;
  exp: number;
}

function sha256(value: string): Buffer {
  return crypto.createHash('sha256').update(value, 'utf-8').digest();
}

export function verifyAdminPassword(candidate: string): boolean {
  const expected = getEnv().ADMIN_PASSWORD;
  // Compare fixed-length SHA-256 digests to avoid leaking password length via timing
  return crypto.timingSafeEqual(sha256(candidate), sha256(expected));
}

function signPayload(encodedPayload: string): string {
  const secret = getEnv().ADMIN_JWT_SECRET;
  return crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
}

export function createAdminSessionToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminTokenPayload = {
    role: 'admin',
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return false;

  const expectedSig = signPayload(encodedPayload);
  const sigBuf = Buffer.from(signature, 'utf-8');
  const expectedBuf = Buffer.from(expectedSig, 'utf-8');

  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;

  try {
    const decoded = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    ) as AdminTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    return decoded.role === 'admin' && decoded.exp > now;
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
}

export function getAdminCookieOptions() {
  return {
    name: ADMIN_COOKIE_NAME,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function resolveOrCreateClientSession(): Promise<{
  sessionId: string;
  cookieToken: string;
  isNew: boolean;
}> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CLIENT_SESSION_COOKIE_NAME)?.value;

  if (existing) {
    const [sid, sig] = existing.split('.');
    if (sid && sig && /^[a-zA-Z0-9_-]{12,64}$/.test(sid)) {
      const expectedSig = signPayload(`client:${sid}`);
      const sigBuf = Buffer.from(sig, 'utf-8');
      const expectedBuf = Buffer.from(expectedSig, 'utf-8');
      if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return { sessionId: sid, cookieToken: existing, isNew: false };
      }
    }
  }

  const newSid = crypto.randomUUID();
  const cookieToken = `${newSid}.${signPayload(`client:${newSid}`)}`;
  return { sessionId: newSid, cookieToken, isNew: true };
}

export function getClientSessionCookieOptions() {
  return {
    name: CLIENT_SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CLIENT_SESSION_TTL_SECONDS,
  };
}

export function buildClientSessionSetCookieHeader(cookieToken: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${CLIENT_SESSION_COOKIE_NAME}=${encodeURIComponent(cookieToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${CLIENT_SESSION_TTL_SECONDS}${secure}`;
}

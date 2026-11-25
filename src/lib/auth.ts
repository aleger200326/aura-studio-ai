import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getEnv } from './env';

export const ADMIN_COOKIE_NAME = 'aura_admin_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

interface AdminTokenPayload {
  role: 'admin';
  iat: number;
  exp: number;
}

export function verifyAdminPassword(candidate: string): boolean {
  const expected = getEnv().ADMIN_PASSWORD;
  const candidateBuf = Buffer.from(candidate, 'utf-8');
  const expectedBuf = Buffer.from(expected, 'utf-8');

  if (candidateBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(candidateBuf, expectedBuf);
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

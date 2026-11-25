import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminCookieOptions,
  verifyAdminPassword,
} from '@/lib/auth';
import {
  checkAdminAuthRateLimit,
  getClientIp,
  resetAdminAuthRateLimit,
} from '@/lib/rate-limit';

const loginSchema = z.object({
  password: z.string().min(1, 'Введите пароль'),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const preCheck = checkAdminAuthRateLimit(ip, false);
  if (!preCheck.allowed) {
    return NextResponse.json(
      { error: 'Слишком много неудачных попыток. Повторите через 15 минут.' },
      {
        status: 429,
        headers: { 'Retry-After': String(preCheck.retryAfterSec) },
      }
    );
  }

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Введите пароль' }, { status: 400 });
    }

    const isValid = verifyAdminPassword(parsed.data.password);
    if (!isValid) {
      checkAdminAuthRateLimit(ip, true);
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
    }

    resetAdminAuthRateLimit(ip);
    const token = createAdminSessionToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE_NAME, token, getAdminCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    ...getAdminCookieOptions(),
    maxAge: 0,
  });
  return response;
}

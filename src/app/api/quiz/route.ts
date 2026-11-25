import { NextResponse } from 'next/server';
import { generateQuizEstimate } from '@/lib/ai/estimator';
import {
  CLIENT_SESSION_COOKIE_NAME,
  getClientSessionCookieOptions,
  resolveOrCreateClientSession,
} from '@/lib/auth';
import { createQuizLead } from '@/lib/lead-service';
import { checkQuizRateLimit, getClientIp } from '@/lib/rate-limit';
import { quizRequestSchema } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rate = checkQuizRateLimit(ip);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: 'Слишком много расчетов за последний час. Попробуйте чуть позже или напишите в чат.',
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rate.retryAfterSec) },
        }
      );
    }

    const body = await request.json();
    const parsed = quizRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Проверьте корректность заполненных полей.',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { quizAnswers, contactInfo, userMetadata } = parsed.data;
    const clientSession = await resolveOrCreateClientSession();
    const { result, leadTemperature } = await generateQuizEstimate(quizAnswers);

    const lead = await createQuizLead({
      sessionId: clientSession.sessionId,
      quizAnswers,
      contactInfo,
      userMetadata,
      temperature: leadTemperature,
      result,
    });

    const response = NextResponse.json({
      success: true,
      leadCode: lead.leadCode,
      result,
    });
    if (clientSession.isNew) {
      response.cookies.set(
        CLIENT_SESSION_COOKIE_NAME,
        clientSession.cookieToken,
        getClientSessionCookieOptions()
      );
    }
    return response;
  } catch (err) {
    console.error('[POST /api/quiz] Error:', err);
    return NextResponse.json(
      { error: 'Не удалось сформировать расчет. Попробуйте еще раз.' },
      { status: 500 }
    );
  }
}

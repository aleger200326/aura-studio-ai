import crypto from 'node:crypto';
import { webhookCallback } from 'grammy';
import { NextResponse } from 'next/server';
import { getBot } from '@/bot';
import { getEnv, isTelegramConfigured } from '@/lib/env';

function safeSecretEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a, 'utf-8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf-8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export async function POST(request: Request) {
  const env = getEnv();

  if (!isTelegramConfigured()) {
    return NextResponse.json({ error: 'Telegram bot is not configured' }, { status: 503 });
  }

  const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Telegram webhook secret is not configured' },
      { status: 503 }
    );
  }

  const secretHeader = request.headers.get('x-telegram-bot-api-secret-token') || '';
  if (!safeSecretEqual(secretHeader, webhookSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bot = getBot();
  const handleUpdate = webhookCallback(bot, 'std/http', {
    secretToken: webhookSecret,
  });

  return handleUpdate(request);
}

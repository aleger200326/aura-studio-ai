import { webhookCallback } from 'grammy';
import { NextResponse } from 'next/server';
import { getBot } from '@/bot';
import { getEnv, isTelegramConfigured } from '@/lib/env';

export async function POST(request: Request) {
  const env = getEnv();

  if (!isTelegramConfigured()) {
    return NextResponse.json({ error: 'Telegram bot is not configured' }, { status: 503 });
  }

  const secretHeader = request.headers.get('x-telegram-bot-api-secret-token');
  if (env.TELEGRAM_WEBHOOK_SECRET && secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bot = getBot();
  const handleUpdate = webhookCallback(bot, 'std/http', {
    secretToken: env.TELEGRAM_WEBHOOK_SECRET || undefined,
  });

  return handleUpdate(request);
}

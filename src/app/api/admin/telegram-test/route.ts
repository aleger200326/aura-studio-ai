import { NextResponse } from 'next/server';
import { resolveTargetTelegramChatId, sendTelegramTestMessage } from '@/bot/notifier';
import { isAdminAuthenticated } from '@/lib/auth';
import { isTelegramConfigured } from '@/lib/env';
import { adminTelegramTestSchema } from '@/lib/validators';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chatId = await resolveTargetTelegramChatId();
  return NextResponse.json({
    chatId: chatId || '',
    botConfigured: isTelegramConfigured(),
  });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = adminTelegramTestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректный Chat ID' }, { status: 400 });
    }

    const result = await sendTelegramTestMessage(parsed.data.chatId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    console.error('[POST /api/admin/telegram-test] Error:', err);
    return NextResponse.json({ ok: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

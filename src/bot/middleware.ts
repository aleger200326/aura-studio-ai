import type { Context, NextFunction } from 'grammy';
import { prisma } from '@/lib/db';
import { getAllowedTelegramChatIds } from '@/lib/env';

export async function adminChatGuard(ctx: Context, next: NextFunction): Promise<void> {
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : null;
  if (!chatId) {
    return;
  }

  const allowed = new Set(getAllowedTelegramChatIds());
  try {
    const dbChatSetting = await prisma.systemSetting.findUnique({
      where: { key: 'telegram_chat_id' },
    });
    if (dbChatSetting?.value?.trim()) {
      allowed.add(dbChatSetting.value.trim());
    }
  } catch {
    // Ignore DB errors during guard fallback
  }

  // Allow /start so admin can discover their chat_id during initial setup
  const text = ctx.message?.text?.trim();
  if (allowed.size === 0 && text?.startsWith('/start')) {
    await next();
    return;
  }

  if (allowed.size > 0 && !allowed.has(chatId)) {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({
        text: '⛔ Доступ ограничен.',
        show_alert: true,
      });
    } else {
      await ctx.reply('⛔ Доступ ограничен. Этот бот предназначен для уведомлений AURA Studio.');
    }
    return;
  }

  await next();
}

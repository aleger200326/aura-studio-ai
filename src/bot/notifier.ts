import type { Lead } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getEnv, isTelegramConfigured } from '@/lib/env';
import { isDbFallbackAllowed, localGetSetting, localSetSetting, localUpdateLead } from '@/lib/local-store';
import { getBot } from './index';
import { buildLeadKeyboard, escapeHtml, formatLeadMessage } from './formatter';

const RETRY_DELAYS_MS = [1000, 3000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resolveTargetTelegramChatId(): Promise<string | null> {
  try {
    const dbSetting = await prisma.systemSetting.findUnique({
      where: { key: 'telegram_chat_id' },
    });
    if (dbSetting?.value?.trim()) {
      return dbSetting.value.trim();
    }
  } catch (err) {
    if (isDbFallbackAllowed(err)) {
      const local = await localGetSetting('telegram_chat_id');
      if (local?.value?.trim()) return local.value.trim();
    }
  }

  const envChatId = getEnv().TELEGRAM_CHAT_ID.trim();
  return envChatId || null;
}

async function sendWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt] ?? 1000;
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

async function persistLeadDeliveryState(
  leadId: string,
  data: Partial<Pick<Lead, 'telegramStatus' | 'telegramMessageId' | 'telegramChatId' | 'telegramError'>>
) {
  try {
    await prisma.lead.update({ where: { id: leadId }, data });
  } catch (err) {
    if (isDbFallbackAllowed(err)) {
      await localUpdateLead(leadId, data);
      return;
    }
    throw err;
  }
}

export async function notifyTelegramLead(lead: Lead): Promise<{
  delivered: boolean;
  error?: string;
}> {
  if (!isTelegramConfigured()) {
    const msg = 'TELEGRAM_BOT_TOKEN не настроен в .env';
    await persistLeadDeliveryState(lead.id, {
      telegramStatus: 'FAILED',
      telegramError: msg,
    });
    return { delivered: false, error: msg };
  }

  const chatId = await resolveTargetTelegramChatId();
  if (!chatId) {
    const msg = 'TELEGRAM_CHAT_ID не задан (ни в базе, ни в .env)';
    await persistLeadDeliveryState(lead.id, {
      telegramStatus: 'FAILED',
      telegramError: msg,
    });
    return { delivered: false, error: msg };
  }

  try {
    const bot = getBot();
    const htmlText = formatLeadMessage(lead, getEnv().APP_TIMEZONE);
    const keyboard = buildLeadKeyboard(lead);

    const sentMessage = await sendWithRetry(() =>
      bot.api.sendMessage(chatId, htmlText, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
        link_preview_options: { is_disabled: true },
      })
    );

    await persistLeadDeliveryState(lead.id, {
      telegramStatus: 'SENT',
      telegramMessageId: sentMessage.message_id,
      telegramChatId: chatId,
      telegramError: null,
    });

    return { delivered: true };
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'Unknown Telegram error';
    console.error(
      JSON.stringify({
        event: 'telegram_delivery_failed',
        leadCode: lead.leadCode,
        error: errMessage,
      })
    );

    await persistLeadDeliveryState(lead.id, {
      telegramStatus: 'FAILED',
      telegramError: errMessage.slice(0, 500),
    });

    return { delivered: false, error: errMessage };
  }
}

export async function notifyTelegramLeadUpdate(
  lead: Lead,
  updateSummary: string
): Promise<void> {
  if (!isTelegramConfigured()) return;
  const chatId = lead.telegramChatId || (await resolveTargetTelegramChatId());
  if (!chatId) return;

  try {
    const bot = getBot();
    const text = [
      `🔄 <b>ДОПОЛНЕНИЕ ПО ЛИДУ #${escapeHtml(lead.leadCode)}</b>`,
      `• <b>Клиент:</b> ${escapeHtml(lead.clientName)} (${escapeHtml(lead.contact)})`,
      `• <b>Обновление из чата:</b> ${escapeHtml(updateSummary)}`,
    ].join('\n');

    await sendWithRetry(() =>
      bot.api.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_parameters: lead.telegramMessageId
          ? { message_id: lead.telegramMessageId }
          : undefined,
      })
    );
  } catch (err) {
    console.warn('[telegram] Failed to send deduplicated update:', err);
  }
}

export async function sendTelegramTestMessage(explicitChatId?: string): Promise<{
  ok: boolean;
  chatId?: string;
  error?: string;
}> {
  if (!isTelegramConfigured()) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN не задан в переменных окружения.' };
  }

  const chatId = explicitChatId?.trim() || (await resolveTargetTelegramChatId());
  if (!chatId) {
    return { ok: false, error: 'Укажите Telegram Chat ID для проверки.' };
  }

  if (explicitChatId?.trim()) {
    try {
      await prisma.systemSetting.upsert({
        where: { key: 'telegram_chat_id' },
        update: { value: explicitChatId.trim() },
        create: { key: 'telegram_chat_id', value: explicitChatId.trim() },
      });
    } catch (err) {
      if (isDbFallbackAllowed(err)) {
        await localSetSetting('telegram_chat_id', explicitChatId.trim());
      } else {
        throw err;
      }
    }
  }

  try {
    const bot = getBot();
    await bot.api.sendMessage(
      chatId,
      '✅ <b>Подключение AURA Studio AI успешно настроено!</b>\nБот готов принимать заявки из квиза и AI-чата.',
      { parse_mode: 'HTML' }
    );
    return { ok: true, chatId };
  } catch (err) {
    return {
      ok: false,
      chatId,
      error: err instanceof Error ? err.message : 'Ошибка отправки в Telegram API',
    };
  }
}

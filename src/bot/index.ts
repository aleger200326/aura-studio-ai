import { Bot } from 'grammy';
import { getEnv, isTelegramConfigured } from '@/lib/env';
import { adminChatGuard } from './middleware';
import { registerBotHandlers } from './handlers';

const globalForBot = globalThis as unknown as {
  auraBot?: Bot;
};

export function getBot(): Bot {
  if (globalForBot.auraBot) {
    return globalForBot.auraBot;
  }

  const token = getEnv().TELEGRAM_BOT_TOKEN;
  if (!isTelegramConfigured()) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  const bot = new Bot(token);
  bot.use(adminChatGuard);
  registerBotHandlers(bot);

  bot.catch((err) => {
    console.error('[grammY] Unhandled bot error:', err.error);
  });

  globalForBot.auraBot = bot;
  return bot;
}

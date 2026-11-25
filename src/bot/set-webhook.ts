import { getBot } from './index';
import { getEnv } from '@/lib/env';

async function main() {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  if (!env.TELEGRAM_WEBHOOK_SECRET) {
    throw new Error('TELEGRAM_WEBHOOK_SECRET must be set before registering webhook');
  }

  const bot = getBot();
  await bot.api.setWebhook(webhookUrl, {
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
  });

  console.log(`✅ Telegram webhook registered: ${webhookUrl}`);
}

main().catch((err) => {
  console.error('❌ Failed to set Telegram webhook:', err);
  process.exit(1);
});

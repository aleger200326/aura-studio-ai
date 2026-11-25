import { getBot } from './index';

async function main() {
  const bot = getBot();
  await bot.api.deleteWebhook({ drop_pending_updates: false });
  console.log('🤖 AURA Studio Telegram Bot started in Long Polling mode...');
  await bot.start({
    onStart: (botInfo) => {
      console.log(`✅ Logged in as @${botInfo.username}`);
    },
  });
}

main().catch((err) => {
  console.error('❌ Failed to start Telegram bot polling:', err);
  process.exit(1);
});

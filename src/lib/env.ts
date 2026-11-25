import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().optional().default(''),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().optional().default('gemini-3.8-flash'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().optional().default('gpt-4o-mini'),
  AI_MOCK_MODE: z.string().optional().default('false'),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
  TELEGRAM_CHAT_ID: z.string().optional().default(''),
  TELEGRAM_ALLOWED_CHAT_IDS: z.string().optional().default(''),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional().default(''),
  ADMIN_PASSWORD: z.string().optional().default('aura-admin-2026'),
  ADMIN_JWT_SECRET: z
    .string()
    .optional()
    .default('aura-studio-dev-jwt-secret-change-in-production-2026'),
  NEXT_PUBLIC_APP_URL: z.string().optional().default('http://localhost:3000'),
  APP_TIMEZONE: z.string().optional().default('Asia/Tashkent'),
});

export function getEnv() {
  return envSchema.parse(process.env);
}

export function getEnvGoogleApiKey(): string {
  const env = getEnv();
  const key = (env.GOOGLE_GENERATIVE_AI_API_KEY || env.GEMINI_API_KEY || '').trim();
  if (!key || key.includes('your-google-ai-studio-key')) return '';
  return key;
}

export function getEnvOpenAiApiKey(): string {
  const env = getEnv();
  const key = env.OPENAI_API_KEY.trim();
  if (!key || key.startsWith('sk-proj-your')) return '';
  return key;
}

export function isAiMockMode(): boolean {
  const env = getEnv();
  if (env.AI_MOCK_MODE === 'true') return true;
  if (getEnvGoogleApiKey()) return false;
  if (getEnvOpenAiApiKey()) return false;
  return true;
}

export function isTelegramConfigured(): boolean {
  const env = getEnv();
  return Boolean(
    env.TELEGRAM_BOT_TOKEN &&
      !env.TELEGRAM_BOT_TOKEN.includes('your_bot_token') &&
      env.TELEGRAM_BOT_TOKEN.includes(':')
  );
}

export function getAllowedTelegramChatIds(): string[] {
  const env = getEnv();
  const ids = new Set<string>();
  if (env.TELEGRAM_CHAT_ID.trim()) {
    ids.add(env.TELEGRAM_CHAT_ID.trim());
  }
  for (const part of env.TELEGRAM_ALLOWED_CHAT_IDS.split(',')) {
    const trimmed = part.trim();
    if (trimmed) ids.add(trimmed);
  }
  return Array.from(ids);
}

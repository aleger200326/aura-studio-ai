import { z } from 'zod';

const DEV_DEFAULT_PASSWORD = 'aura-admin-2026';
const DEV_DEFAULT_JWT_SECRET =
  'aura-studio-dev-jwt-secret-change-in-production-2026';

const envSchema = z.object({
  DATABASE_URL: z.string().optional().default(''),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().optional().default('gemini-3.5-flash-lite'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().optional().default('gpt-4o-mini'),
  AI_MOCK_MODE: z.string().optional().default('false'),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
  TELEGRAM_CHAT_ID: z.string().optional().default(''),
  TELEGRAM_ALLOWED_CHAT_IDS: z.string().optional().default(''),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional().default(''),
  ADMIN_PASSWORD: z.string().optional().default(''),
  ADMIN_JWT_SECRET: z.string().optional().default(''),
  NEXT_PUBLIC_APP_URL: z.string().optional().default('http://localhost:3000'),
  APP_TIMEZONE: z.string().optional().default('Asia/Tashkent'),
});

export function getEnv() {
  const parsed = envSchema.parse(process.env);
  const isProd = process.env.NODE_ENV === 'production';

  const adminPassword = parsed.ADMIN_PASSWORD.trim();
  const adminJwtSecret = parsed.ADMIN_JWT_SECRET.trim();

  if (isProd && process.env.NEXT_PHASE !== 'phase-production-build') {
    if (!adminPassword || adminPassword.length < 8) {
      throw new Error('Security Error: ADMIN_PASSWORD must be configured (min 8 chars) in production.');
    }
    if (!adminJwtSecret || adminJwtSecret.length < 32) {
      throw new Error('Security Error: ADMIN_JWT_SECRET must be configured (min 32 chars) in production.');
    }
  }

  return {
    ...parsed,
    ADMIN_PASSWORD: adminPassword || DEV_DEFAULT_PASSWORD,
    ADMIN_JWT_SECRET: adminJwtSecret || DEV_DEFAULT_JWT_SECRET,
  };
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

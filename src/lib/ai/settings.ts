import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { getEnv, getEnvGoogleApiKey } from '@/lib/env';
import { isDbFallbackAllowed, localGetSetting, localSetSetting } from '@/lib/local-store';
import { DEFAULT_GEMINI_MODEL, isValidGeminiModel, type GeminiModelId } from './models';

const KEY_GOOGLE_API_KEY = 'google_api_key';
const KEY_GEMINI_MODEL = 'gemini_model';
const KEY_FORCE_MOCK = 'ai_force_mock';
const SETTINGS_TTL_MS = 30_000;
const ENC_PREFIX = 'enc:v1:';

export interface AiRuntimeSettings {
  googleApiKey: string;
  geminiModel: GeminiModelId;
  forceMockMode: boolean;
}

let cachedSettings: { data: AiRuntimeSettings; expiresAt: number } | null = null;

export function invalidateAiSettingsCache(): void {
  cachedSettings = null;
}

function getEncryptionKey(): Buffer {
  const secret = getEnv().ADMIN_JWT_SECRET;
  return crypto.createHash('sha256').update(`aura-aes-key:${secret}`, 'utf-8').digest();
}

function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

function decryptSecret(stored: string): string {
  if (!stored) return '';
  if (!stored.startsWith(ENC_PREFIX)) {
    return stored;
  }
  try {
    const rest = stored.slice(ENC_PREFIX.length);
    const [ivB64, tagB64, dataB64] = rest.split(':');
    if (!ivB64 || !tagB64 || !dataB64) return '';
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
      Buffer.from(ivB64, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]);
    return decrypted.toString('utf-8');
  } catch {
    return '';
  }
}

async function readSettingValue(key: string): Promise<string | null> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch (err) {
    if (isDbFallbackAllowed(err)) {
      const local = await localGetSetting(key);
      return local?.value ?? null;
    }
    return null;
  }
}

async function writeSettingValue(key: string, value: string): Promise<void> {
  try {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  } catch (err) {
    if (isDbFallbackAllowed(err)) {
      await localSetSetting(key, value);
      return;
    }
    throw err;
  }
}

export async function getAiRuntimeSettings(): Promise<AiRuntimeSettings> {
  const now = Date.now();
  if (cachedSettings && cachedSettings.expiresAt > now) {
    return cachedSettings.data;
  }

  const env = getEnv();
  const [dbKeyRaw, dbModel, dbMock] = await Promise.all([
    readSettingValue(KEY_GOOGLE_API_KEY),
    readSettingValue(KEY_GEMINI_MODEL),
    readSettingValue(KEY_FORCE_MOCK),
  ]);

  const decryptedDbKey = dbKeyRaw ? decryptSecret(dbKeyRaw) : '';
  const googleApiKey = (decryptedDbKey || getEnvGoogleApiKey()).trim();
  const rawModel = (dbModel ?? env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL).trim();
  const geminiModel: GeminiModelId = isValidGeminiModel(rawModel)
    ? rawModel
    : DEFAULT_GEMINI_MODEL;

  const forceMockMode =
    dbMock !== null ? dbMock === 'true' : env.AI_MOCK_MODE === 'true' && !googleApiKey;

  const data: AiRuntimeSettings = {
    googleApiKey,
    geminiModel,
    forceMockMode,
  };

  cachedSettings = { data, expiresAt: now + SETTINGS_TTL_MS };
  return data;
}

export async function saveAiRuntimeSettings(input: {
  googleApiKey?: string;
  geminiModel?: GeminiModelId;
  forceMockMode?: boolean;
}): Promise<AiRuntimeSettings> {
  if (input.googleApiKey !== undefined) {
    const clean = input.googleApiKey.trim();
    await writeSettingValue(KEY_GOOGLE_API_KEY, clean ? encryptSecret(clean) : '');
  }
  if (input.geminiModel !== undefined) {
    await writeSettingValue(KEY_GEMINI_MODEL, input.geminiModel);
  }
  if (input.forceMockMode !== undefined) {
    await writeSettingValue(KEY_FORCE_MOCK, input.forceMockMode ? 'true' : 'false');
  }

  invalidateAiSettingsCache();
  return getAiRuntimeSettings();
}

export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 10) return '••••••••';
  return `${key.slice(0, 6)}••••••${key.slice(-4)}`;
}

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminAuthenticated } from '@/lib/auth';
import { GEMINI_MODELS, type GeminiModelId } from '@/lib/ai/models';
import {
  getAiRuntimeSettings,
  maskApiKey,
  saveAiRuntimeSettings,
} from '@/lib/ai/settings';

const updateSchema = z.object({
  googleApiKey: z.string().trim().max(300).optional(),
  geminiModel: z
    .enum(['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'])
    .optional(),
  forceMockMode: z.boolean().optional(),
  clearKey: z.boolean().optional(),
});

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await getAiRuntimeSettings();
  return NextResponse.json({
    hasKey: Boolean(settings.googleApiKey),
    maskedKey: maskApiKey(settings.googleApiKey),
    geminiModel: settings.geminiModel,
    forceMockMode: settings.forceMockMode,
    models: GEMINI_MODELS,
  });
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректные параметры AI' }, { status: 400 });
    }

    const { googleApiKey, geminiModel, forceMockMode, clearKey } = parsed.data;
    const nextKey = clearKey
      ? ''
      : googleApiKey && googleApiKey.trim().length > 0
        ? googleApiKey.trim()
        : undefined;

    const updated = await saveAiRuntimeSettings({
      googleApiKey: nextKey,
      geminiModel: geminiModel as GeminiModelId | undefined,
      forceMockMode:
        nextKey && forceMockMode === undefined ? false : forceMockMode,
    });

    return NextResponse.json({
      hasKey: Boolean(updated.googleApiKey),
      maskedKey: maskApiKey(updated.googleApiKey),
      geminiModel: updated.geminiModel,
      forceMockMode: updated.forceMockMode,
    });
  } catch (err) {
    console.error('[PUT /api/admin/ai-settings] Error:', err);
    return NextResponse.json({ error: 'Ошибка сохранения настроек AI' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(body);
    const current = await getAiRuntimeSettings();

    const apiKey = parsed.success && parsed.data.googleApiKey
      ? parsed.data.googleApiKey.trim()
      : current.googleApiKey;
    const modelId =
      parsed.success && parsed.data.geminiModel
        ? parsed.data.geminiModel
        : current.geminiModel;

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: 'Сначала вставьте API-ключ из Google AI Studio.' },
        { status: 400 }
      );
    }

    const google = createGoogleGenerativeAI({ apiKey });
    const { text } = await generateText({
      model: google(modelId),
      prompt: 'Ответь одним коротким предложением на русском: подключение к AURA Studio активно.',
      maxTokens: 60,
    });

    return NextResponse.json({
      ok: true,
      modelId,
      reply: text.trim(),
    });
  } catch (err) {
    console.error('[POST /api/admin/ai-settings] Error:', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Не удалось подключиться к Google Gemini API. Проверьте ключ, квоту или попробуйте другую модель.',
      },
      { status: 400 }
    );
  }
}

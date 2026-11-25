import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';
import { getEnv, getEnvOpenAiApiKey } from '@/lib/env';
import { getAiRuntimeSettings } from './settings';

export interface ResolvedAiClient {
  mode: 'google' | 'openai' | 'mock';
  modelId: string;
  model: LanguageModelV1 | null;
}

export async function resolveActiveAiClient(): Promise<ResolvedAiClient> {
  const settings = await getAiRuntimeSettings();

  if (!settings.forceMockMode && settings.googleApiKey) {
    const google = createGoogleGenerativeAI({
      apiKey: settings.googleApiKey,
    });
    return {
      mode: 'google',
      modelId: settings.geminiModel,
      model: google(settings.geminiModel) as unknown as LanguageModelV1,
    };
  }

  const openAiKey = getEnvOpenAiApiKey();
  if (!settings.forceMockMode && openAiKey) {
    const env = getEnv();
    const provider = createOpenAI({ apiKey: openAiKey });
    const modelId = env.OPENAI_MODEL || 'gpt-4o-mini';
    return {
      mode: 'openai',
      modelId,
      model: provider(modelId) as unknown as LanguageModelV1,
    };
  }

  return {
    mode: 'mock',
    modelId: settings.geminiModel,
    model: null,
  };
}

export type GeminiModelId =
  | 'gemini-3.5-flash-lite'
  | 'gemini-3.6-flash'
  | 'gemini-3.8-flash';

export interface GeminiModelOption {
  id: GeminiModelId;
  label: string;
  version: '3.5' | '3.6' | '3.8';
  badge: string;
  description: string;
}

export const GEMINI_MODELS: GeminiModelOption[] = [
  {
    id: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash-Lite',
    version: '3.5',
    badge: 'Быстрая',
    description: 'Минимальная задержка и минимальная стоимость для мгновенных ответов 24/7.',
  },
  {
    id: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    version: '3.6',
    badge: 'Баланс',
    description: 'Высокая точность по базе знаний, вызов submit_lead и стабильный стриминг.',
  },
  {
    id: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash',
    version: '3.8',
    badge: 'Рекомендуемая',
    description: 'Флагманская модель серии Gemini 3 для сложных диалогов и персональных концепций.',
  },
];

export const DEFAULT_GEMINI_MODEL: GeminiModelId = 'gemini-3.8-flash';

export function isValidGeminiModel(value: string): value is GeminiModelId {
  return GEMINI_MODELS.some((m) => m.id === value);
}

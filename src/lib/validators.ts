import { z } from 'zod';

export const QUIZ_OBJECT_TYPES = [
  'Новостройка',
  'Вторичка',
  'Загородный дом',
  'Коммерция',
] as const;

export const QUIZ_STYLES = [
  'Минимализм',
  'Джапанди',
  'Контемпорари',
  'Неоклассика',
  'Пока не определился',
] as const;

export const QUIZ_SERVICES = [
  'Только эскиз и планировка',
  'Только дизайн-проект',
  'Дизайн + ремонт под ключ',
] as const;

export const QUIZ_TIMELINES = [
  'Уже есть ключи',
  'В течение 1–2 месяцев',
  'Через 3+ месяца',
  'Прицениваюсь',
] as const;

export const PREFERRED_CHANNELS = ['Telegram', 'WhatsApp', 'Звонок'] as const;

export const userMetadataSchema = z
  .object({
    utmSource: z.string().max(120).nullable().optional(),
    utmMedium: z.string().max(120).nullable().optional(),
    utmCampaign: z.string().max(120).nullable().optional(),
    pageUrl: z.string().max(500).nullable().optional(),
    referrer: z.string().max(500).nullable().optional(),
    device: z.string().max(120).nullable().optional(),
  })
  .default({});

export const quizAnswersSchema = z.object({
  objectType: z.enum(QUIZ_OBJECT_TYPES),
  areaSqm: z
    .number()
    .finite('Площадь должна быть числом')
    .positive('Площадь должна быть больше 0')
    .max(10000, 'Максимальная площадь — 10 000 м²'),
  style: z.enum(QUIZ_STYLES),
  serviceNeeded: z.enum(QUIZ_SERVICES),
  timeline: z.enum(QUIZ_TIMELINES),
});

export const contactInfoSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Укажите имя (минимум 2 символа)')
    .max(80, 'Имя слишком длинное'),
  contact: z
    .string()
    .trim()
    .min(5, 'Укажите телефон или Telegram @username (минимум 5 символов)')
    .max(100, 'Контакт слишком длинный'),
  preferredChannel: z.enum(PREFERRED_CHANNELS).default('Telegram'),
  comment: z.string().trim().max(1000, 'Комментарий не должен превышать 1000 символов').optional(),
});

export const quizRequestSchema = z.object({
  sessionId: z.string().trim().min(6, 'Некорректный sessionId').max(128),
  quizAnswers: quizAnswersSchema,
  contactInfo: contactInfoSchema,
  userMetadata: userMetadataSchema.optional().default({}),
});

export const chatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system', 'data']),
  content: z.string().max(4000),
});

export const chatRequestSchema = z.object({
  sessionId: z.string().trim().min(6).max(128).optional().default('anonymous-session'),
  messages: z.array(chatMessageSchema).min(1).max(40),
  userMetadata: userMetadataSchema.optional().default({}),
});

export const submitLeadToolSchema = z.object({
  client_name: z.string().trim().min(2).max(80).describe('Имя клиента'),
  contact: z
    .string()
    .trim()
    .min(5)
    .max(100)
    .describe('Номер телефона или Telegram username клиента'),
  preferred_channel: z
    .enum(['Telegram', 'WhatsApp', 'Звонок', 'Не указано'])
    .default('Не указано')
    .describe('Предпочтительный способ связи'),
  object_type: z
    .string()
    .trim()
    .max(80)
    .optional()
    .describe('Тип объекта (например: Новостройка, Вторичка, Дом, Коммерция)'),
  area_sqm: z
    .number()
    .positive()
    .max(10000)
    .optional()
    .describe('Площадь объекта в квадратных метрах (если указана)'),
  service_interest: z
    .string()
    .trim()
    .max(160)
    .optional()
    .describe('Интересующая услуга или тариф (Эскизный / Полный / Под ключ / Ремонт)'),
  timeline: z
    .string()
    .trim()
    .max(120)
    .optional()
    .describe('Планируемые сроки старта работ'),
  budget_note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .describe('Комментарий о бюджете или пожеланиях клиента'),
  lead_temperature: z
    .enum(['hot', 'warm', 'cold'])
    .describe(
      'Оценка готовности клиента: hot (ключи на руках/готовы стартовать скоро), warm (прицениваются на 1-3 месяца), cold (просто смотрят)'
    ),
  ai_summary: z
    .string()
    .trim()
    .min(10)
    .max(1000)
    .describe(
      'Краткое резюме диалога в 2-3 предложениях для менеджера: что спрашивал клиент, какие боли и пожелания озвучил'
    ),
});

export const adminKnowledgeSchema = z.object({
  content: z
    .string()
    .trim()
    .min(50, 'База знаний не может быть пустой')
    .max(50000, 'Максимальный размер базы знаний — 50 000 символов'),
});

export const adminLeadPatchSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'COMPLETED', 'SPAM']),
});

export const adminTelegramTestSchema = z.object({
  chatId: z.string().trim().max(64).optional(),
});

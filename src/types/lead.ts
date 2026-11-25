export type QuizObjectType =
  | 'Новостройка'
  | 'Вторичка'
  | 'Загородный дом'
  | 'Коммерция';

export type QuizStyle =
  | 'Минимализм'
  | 'Джапанди'
  | 'Контемпорари'
  | 'Неоклассика'
  | 'Пока не определился';

export type QuizServiceNeeded =
  | 'Только эскиз и планировка'
  | 'Только дизайн-проект'
  | 'Дизайн + ремонт под ключ';

export type QuizTimeline =
  | 'Уже есть ключи'
  | 'В течение 1–2 месяцев'
  | 'Через 3+ месяца'
  | 'Прицениваюсь';

export type PreferredChannel = 'Telegram' | 'WhatsApp' | 'Звонок';

export interface QuizAnswers {
  objectType: QuizObjectType;
  areaSqm: number;
  style: QuizStyle;
  serviceNeeded: QuizServiceNeeded;
  timeline: QuizTimeline;
}

export interface ContactInfo {
  name: string;
  contact: string;
  preferredChannel: PreferredChannel;
  comment?: string;
}

export interface UserMetadata {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  pageUrl?: string | null;
  referrer?: string | null;
  device?: string | null;
}

export interface QuizResult {
  recommended_tariff: string;
  estimated_design_cost_usd: string;
  estimated_renovation_cost_usd: string;
  estimated_timeline: string;
  style_concept_title: string;
  personal_recommendations: [string, string, string];
  manager_pitch: string;
  effective_area_sqm?: number;
  min_area_applied?: boolean;
}

export type LeadSourceType = 'AI_QUIZ' | 'AI_CHAT';
export type LeadStatusType = 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'SPAM';
export type LeadTemperatureType = 'HOT' | 'WARM' | 'COLD';
export type TelegramStatusType = 'PENDING' | 'SENT' | 'FAILED';

export interface ChatAiAnalysis {
  lead_temperature: 'hot' | 'warm' | 'cold';
  object_type?: string;
  area_sqm?: number;
  service_interest?: string;
  timeline?: string;
  budget_note?: string;
  ai_summary: string;
}

export interface ChatMessageEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface LeadRecord {
  id: string;
  leadCode: string;
  sessionId: string;
  source: LeadSourceType;
  status: LeadStatusType;
  temperature: LeadTemperatureType;
  clientName: string;
  contact: string;
  preferredChannel: string;
  comment: string | null;
  quizAnswers: QuizAnswers | null;
  aiAnalysis: QuizResult | ChatAiAnalysis | Record<string, unknown>;
  userMetadata: UserMetadata;
  telegramStatus: TelegramStatusType;
  telegramMessageId: number | null;
  telegramChatId: string | null;
  telegramError: string | null;
  assignedManager: string | null;
  createdAt: string;
  updatedAt: string;
}

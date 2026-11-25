import { InlineKeyboard } from 'grammy';
import type { Lead } from '@prisma/client';
import type { ChatAiAnalysis, QuizAnswers, QuizResult, UserMetadata } from '@/types/lead';

export function escapeHtml(input: string | null | undefined): string {
  if (!input || !input.trim()) return '—';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatTemperatureLabel(
  temperature: Lead['temperature'],
  timeline?: string | null
): string {
  if (temperature === 'HOT') {
    const hasKeys = timeline && timeline.toLowerCase().includes('ключ');
    return hasKeys ? '🔴 Горячий (ключи на руках)' : '🔴 Горячий';
  }
  if (temperature === 'WARM') {
    return '🟡 Теплый';
  }
  return '🔵 Холодный';
}

function formatLocalTimestamp(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
}

function formatSourceMeta(meta: UserMetadata | null | undefined): string {
  if (!meta) return 'Прямой заход';
  if (meta.utmSource && meta.utmCampaign) {
    return `${escapeHtml(meta.utmSource)} / ${escapeHtml(meta.utmCampaign)}`;
  }
  if (meta.utmSource) {
    return escapeHtml(meta.utmSource);
  }
  if (meta.referrer) {
    return escapeHtml(meta.referrer);
  }
  return 'Прямой заход';
}

function truncateRaw(text: string | null | undefined, maxLen: number): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 3)).trimEnd()}...`;
}

export function formatQuizLeadMessage(
  lead: Pick<
    Lead,
    | 'leadCode'
    | 'temperature'
    | 'clientName'
    | 'contact'
    | 'preferredChannel'
    | 'comment'
    | 'quizAnswers'
    | 'aiAnalysis'
    | 'userMetadata'
    | 'createdAt'
  >,
  timeZone = process.env.APP_TIMEZONE || 'Asia/Tashkent'
): string {
  const quiz = (lead.quizAnswers ?? {}) as Partial<QuizAnswers>;
  const ai = (lead.aiAnalysis ?? {}) as Partial<QuizResult>;
  const meta = (lead.userMetadata ?? {}) as UserMetadata;

  const buildMessage = (commentText: string | null) => {
    const lines = [
      `🔥 <b>НОВЫЙ ЛИД: AI-КВИЗ</b> (#${escapeHtml(lead.leadCode)})`,
      `<b>Статус готовности:</b> ${formatTemperatureLabel(lead.temperature, quiz.timeline)}`,
      '',
      '👤 <b>КЛИЕНТ</b>',
      `• <b>Имя:</b> ${escapeHtml(lead.clientName)}`,
      `• <b>Контакт:</b> ${escapeHtml(lead.contact)}`,
      `• <b>Связь:</b> ${escapeHtml(lead.preferredChannel)}`,
    ];

    if (commentText && commentText.trim()) {
      lines.push(`• <b>Комментарий:</b> ${escapeHtml(commentText)}`);
    }

    lines.push(
      '',
      '📋 <b>ОТВЕТЫ НА КВИЗ</b>',
      `• <b>Объект:</b> ${escapeHtml(quiz.objectType)}`,
      `• <b>Площадь:</b> ${quiz.areaSqm ? `${quiz.areaSqm} м²` : '—'}`,
      `• <b>Стиль:</b> ${escapeHtml(quiz.style)}`,
      `• <b>Услуга:</b> ${escapeHtml(quiz.serviceNeeded)}`,
      `• <b>Сроки старта:</b> ${escapeHtml(quiz.timeline)}`,
      '',
      '🤖 <b>РАСЧЕТ И ОЦЕНКА AI</b>',
      `• <b>Рекомендован тариф:</b> ${escapeHtml(ai.recommended_tariff)}`,
      `• <b>Дизайн (ориентир):</b> ${escapeHtml(ai.estimated_design_cost_usd)}`,
      `• <b>Ремонт (ориентир):</b> ${escapeHtml(ai.estimated_renovation_cost_usd)}`,
      `• <b>Концепция:</b> «${escapeHtml(ai.style_concept_title)}»`,
      '',
      '📊 <b>ИНФО О ПОЛЬЗОВАТЕЛЕ</b>',
      `• <b>Источник:</b> ${formatSourceMeta(meta)}`,
      `• <b>Устройство:</b> ${escapeHtml(meta.device || 'Не определено')}`,
      `• <b>Время:</b> ${formatLocalTimestamp(new Date(lead.createdAt), timeZone)}`
    );

    return lines.join('\n');
  };

  let message = buildMessage(lead.comment);
  if (message.length > 3900 && lead.comment) {
    const excess = message.length - 3850;
    const targetLen = Math.max(40, lead.comment.length - excess);
    message = buildMessage(truncateRaw(lead.comment, targetLen));
  }
  if (message.length > 4096) {
    message = `${message.slice(0, 4080)}...`;
  }
  return message;
}

export function formatChatLeadMessage(
  lead: Pick<
    Lead,
    | 'leadCode'
    | 'temperature'
    | 'clientName'
    | 'contact'
    | 'preferredChannel'
    | 'comment'
    | 'aiAnalysis'
    | 'userMetadata'
    | 'createdAt'
  >,
  timeZone = process.env.APP_TIMEZONE || 'Asia/Tashkent'
): string {
  const ai = (lead.aiAnalysis ?? {}) as Partial<ChatAiAnalysis>;
  const meta = (lead.userMetadata ?? {}) as UserMetadata;

  const projectParts: string[] = [];
  if (ai.object_type) projectParts.push(escapeHtml(ai.object_type));
  if (ai.area_sqm) projectParts.push(`${ai.area_sqm} м²`);
  const projectLine = projectParts.length > 0 ? projectParts.join(', ') : 'Не уточнено';

  const buildMessage = (summaryText: string, budgetText: string | undefined) => {
    const lines = [
      `💬 <b>НОВЫЙ ЛИД: AI-ЧАТ</b> (#${escapeHtml(lead.leadCode)})`,
      `<b>Статус готовности:</b> ${formatTemperatureLabel(lead.temperature, ai.timeline)}`,
      '',
      '👤 <b>КЛИЕНТ</b>',
      `• <b>Имя:</b> ${escapeHtml(lead.clientName)}`,
      `• <b>Контакт:</b> ${escapeHtml(lead.contact)}`,
      `• <b>Связь:</b> ${escapeHtml(lead.preferredChannel)}`,
      '',
      '🏠 <b>ПАРАМЕТРЫ ПРОЕКТА</b>',
      `• <b>Объект:</b> ${projectLine}`,
      `• <b>Интерес:</b> ${escapeHtml(ai.service_interest)}`,
      `• <b>Сроки:</b> ${escapeHtml(ai.timeline)}`,
    ];

    if (budgetText && budgetText.trim()) {
      lines.push(`• <b>Пожелания / бюджет:</b> ${escapeHtml(budgetText)}`);
    }

    lines.push(
      '',
      '📝 <b>РЕЗЮМЕ ДИАЛОГА ОТ AI</b>',
      escapeHtml(summaryText),
      '',
      '📊 <b>ИНФО О ПОЛЬЗОВАТЕЛЕ</b>',
      `• <b>Источник:</b> ${formatSourceMeta(meta)}`,
      `• <b>Устройство:</b> ${escapeHtml(meta.device || 'Не определено')}`,
      `• <b>Время:</b> ${formatLocalTimestamp(new Date(lead.createdAt), timeZone)}`
    );

    return lines.join('\n');
  };

  const rawSummary = ai.ai_summary || 'Клиент оставил контактные данные в чате с Алиной.';
  let message = buildMessage(rawSummary, ai.budget_note);
  if (message.length > 3900) {
    const excess = message.length - 3850;
    const trimmedSummary = truncateRaw(rawSummary, Math.max(80, rawSummary.length - excess));
    const trimmedBudget = ai.budget_note ? truncateRaw(ai.budget_note, 200) : undefined;
    message = buildMessage(trimmedSummary, trimmedBudget);
  }
  if (message.length > 4096) {
    message = `${message.slice(0, 4080)}...`;
  }
  return message;
}

export function formatLeadMessage(lead: Lead, timeZone?: string): string {
  if (lead.source === 'AI_QUIZ') {
    return formatQuizLeadMessage(lead, timeZone);
  }
  return formatChatLeadMessage(lead, timeZone);
}

export function buildLeadKeyboard(
  lead: Pick<Lead, 'id' | 'contact' | 'status' | 'source'>
): InlineKeyboard {
  const kb = new InlineKeyboard();

  const cleanContact = lead.contact.trim();
  if (cleanContact.startsWith('@') && /^@[a-zA-Z0-9_]{4,32}$/.test(cleanContact)) {
    kb.url('✉️ Написать в Telegram', `https://t.me/${cleanContact.slice(1)}`).row();
  }

  if (lead.status === 'NEW') {
    kb.text('✅ Взять в работу', `lead:take:${lead.id}`)
      .text('🗑 Спам', `lead:spam:${lead.id}`)
      .row();
  } else if (lead.status === 'IN_PROGRESS') {
    kb.text('🏁 Завершить', `lead:done:${lead.id}`).row();
  }

  if (lead.source === 'AI_CHAT') {
    kb.text('💬 История чата', `lead:chatlog:${lead.id}`);
  }

  return kb;
}

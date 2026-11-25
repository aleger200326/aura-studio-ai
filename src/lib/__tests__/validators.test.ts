import { describe, expect, it } from 'vitest';
import { quizRequestSchema, submitLeadToolSchema } from '@/lib/validators';

describe('Zod validators', () => {
  it('rejects empty contact and invalid area (<= 0 or > 10000)', () => {
    const badAreaZero = quizRequestSchema.safeParse({
      sessionId: 'session-123456',
      quizAnswers: {
        objectType: 'Новостройка',
        areaSqm: 0,
        style: 'Минимализм',
        serviceNeeded: 'Только дизайн-проект',
        timeline: 'Уже есть ключи',
      },
      contactInfo: {
        name: 'Иван',
        contact: '+998901234567',
        preferredChannel: 'Telegram',
      },
    });
    expect(badAreaZero.success).toBe(false);

    const badAreaHuge = quizRequestSchema.safeParse({
      sessionId: 'session-123456',
      quizAnswers: {
        objectType: 'Новостройка',
        areaSqm: 15000,
        style: 'Минимализм',
        serviceNeeded: 'Только дизайн-проект',
        timeline: 'Уже есть ключи',
      },
      contactInfo: {
        name: 'Иван',
        contact: '+998901234567',
        preferredChannel: 'Telegram',
      },
    });
    expect(badAreaHuge.success).toBe(false);

    const badContact = submitLeadToolSchema.safeParse({
      client_name: 'Иван',
      contact: '12',
      lead_temperature: 'warm',
      ai_summary: 'Клиент хочет узнать стоимость дизайна квартиры.',
    });
    expect(badContact.success).toBe(false);
  });

  it('accepts valid quiz and chat tool payloads', () => {
    const validQuiz = quizRequestSchema.safeParse({
      sessionId: 'session-123456',
      quizAnswers: {
        objectType: 'Новостройка',
        areaSqm: 78,
        style: 'Джапанди',
        serviceNeeded: 'Дизайн + ремонт под ключ',
        timeline: 'Уже есть ключи',
      },
      contactInfo: {
        name: 'Александр',
        contact: '@alex_design99',
        preferredChannel: 'Telegram',
        comment: 'Хотим успеть до осени',
      },
    });
    expect(validQuiz.success).toBe(true);
  });
});

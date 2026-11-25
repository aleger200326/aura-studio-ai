import { describe, expect, it } from 'vitest';
import { escapeHtml, formatChatLeadMessage, formatQuizLeadMessage } from '@/bot/formatter';

describe('Telegram formatter', () => {
  it('escapes HTML special characters safely', () => {
    expect(escapeHtml('<script>alert("xss") & > </script>')).toBe(
      '&lt;script&gt;alert("xss") &amp; &gt; &lt;/script&gt;'
    );
    expect(escapeHtml(null)).toBe('—');
    expect(escapeHtml('   ')).toBe('—');
  });

  it('formats quiz lead and truncates overlong comments below 4096 chars', () => {
    const longComment = 'Комментарий <test> & '.repeat(260);
    const msg = formatQuizLeadMessage(
      {
        leadCode: 'LD-2026-0042',
        temperature: 'HOT',
        clientName: 'Александр <VIP>',
        contact: '@alex_design99',
        preferredChannel: 'Telegram',
        comment: longComment,
        quizAnswers: {
          objectType: 'Новостройка',
          areaSqm: 78,
          style: 'Джапанди',
          serviceNeeded: 'Дизайн + ремонт под ключ',
          timeline: 'Уже есть ключи',
        },
        aiAnalysis: {
          recommended_tariff: 'Под ключ (VIP)',
          estimated_design_cost_usd: '$6 630',
          estimated_renovation_cost_usd: 'от $27 300',
          style_concept_title: 'Теплый минимализм и природный баланс',
        },
        userMetadata: {
          utmSource: 'instagram',
          utmCampaign: 'interior_quiz_nov',
          device: 'Mobile (iOS)',
        },
        createdAt: new Date('2026-11-25T16:15:00Z'),
      },
      'Asia/Tashkent'
    );

    expect(msg.length).toBeLessThanOrEqual(4096);
    expect(msg).toContain('LD-2026-0042');
    expect(msg).toContain('Александр &lt;VIP&gt;');
    expect(msg).toContain('instagram / interior_quiz_nov');
  });

  it('formats chat lead and truncates overlong AI summaries safely', () => {
    const longSummary = 'Резюме диалога & детали <важно> '.repeat(240);
    const msg = formatChatLeadMessage({
      leadCode: 'LD-2026-0043',
      temperature: 'WARM',
      clientName: 'Мария',
      contact: '+998 90 123-45-67',
      preferredChannel: 'WhatsApp',
      comment: null,
      aiAnalysis: {
        lead_temperature: 'warm',
        object_type: 'Вторичка',
        area_sqm: 54,
        service_interest: 'Полный дизайн-проект',
        timeline: 'Через 1–2 месяца',
        ai_summary: longSummary,
      },
      userMetadata: {
        device: 'Desktop (Chrome)',
      },
      createdAt: new Date('2026-11-25T16:15:00Z'),
    });

    expect(msg.length).toBeLessThanOrEqual(4096);
    expect(msg).toContain('НОВЫЙ ЛИД: AI-ЧАТ');
    expect(msg).toContain('Вторичка, 54 м²');
  });
});

import { NextResponse } from 'next/server';
import { createDataStreamResponse, formatDataStreamPart, streamText } from 'ai';
import { resolveActiveAiClient } from '@/lib/ai/client';
import { buildChatSystemPrompt } from '@/lib/ai/prompts';
import { buildChatTools } from '@/lib/ai/tools';
import {
  buildClientSessionSetCookieHeader,
  resolveOrCreateClientSession,
} from '@/lib/auth';
import { extractTariffRatesFromMarkdown, getKnowledgeBase } from '@/lib/knowledge';
import { createOrUpdateChatLead, saveChatLog } from '@/lib/lead-service';
import { checkChatRateLimit, getClientIp } from '@/lib/rate-limit';
import { chatRequestSchema } from '@/lib/validators';
import type { ChatMessageEntry, UserMetadata } from '@/types/lead';

function parseContactFromMessages(messages: { role: string; content: string }[]): {
  contact: string | null;
  name: string | null;
  preferredChannel: 'Telegram' | 'WhatsApp' | 'Звонок' | 'Не указано';
} {
  const userTexts = messages.filter((m) => m.role === 'user').map((m) => m.content);
  const fullUserText = userTexts.join('\n');

  const tgMatch = fullUserText.match(/@[a-zA-Z0-9_]{4,32}/);
  const phoneMatch = fullUserText.match(/(?:\+?\d[\d\s\-()]{7,16}\d)/);
  const contact = tgMatch?.[0] || phoneMatch?.[0]?.trim() || null;

  let preferredChannel: 'Telegram' | 'WhatsApp' | 'Звонок' | 'Не указано' = 'Не указано';
  const lower = fullUserText.toLowerCase();
  if (lower.includes('whatsapp') || lower.includes('вотсап') || lower.includes('ватсап')) {
    preferredChannel = 'WhatsApp';
  } else if (tgMatch || lower.includes('telegram') || lower.includes('телеграм') || lower.includes('тг')) {
    preferredChannel = 'Telegram';
  } else if (lower.includes('звон') || lower.includes('позвон')) {
    preferredChannel = 'Звонок';
  }

  let name: string | null = null;
  const namePatterns = [
    /(?:[Мм]еня\s+зовут\s+|[Ии]мя[:\s]+|(?:^|[.!?,]\s*)[Яя]\s+—?\s*)([А-ЯЁA-Z][а-яёa-z]{1,25})/,
    /^([А-ЯЁA-Z][а-яёa-z]{1,25})[,\s]+(?:@|\+?\d)/,
  ];
  for (const pat of namePatterns) {
    const m = fullUserText.match(pat);
    if (m?.[1]) {
      name = m[1];
      break;
    }
  }

  return { contact, name, preferredChannel };
}

async function generateMockReply(
  messages: { role: string; content: string }[],
  sessionId: string,
  userMetadata: UserMetadata
): Promise<{
  text: string;
  toolCall?: { toolCallId: string; args: Record<string, unknown>; result: Record<string, unknown> };
}> {
  const kb = await getKnowledgeBase();
  const rates = extractTariffRatesFromMarkdown(kb);
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const lower = lastUserMsg.toLowerCase();
  const allUserText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ');

  const { contact, name, preferredChannel } = parseContactFromMessages(messages);
  const areaMatch = allUserText.match(/(\d{2,4})\s*(?:м2|м²|кв|квадрат)/i);
  const areaSqm = areaMatch ? Number(areaMatch[1]) : undefined;

  if (contact) {
    const clientName = name || 'Клиент';
    const effectiveArea = areaSqm ? Math.max(areaSqm, rates.minAreaSqm) : undefined;
    const estimatedFull = effectiveArea ? effectiveArea * rates.fullRate : null;

    const input = {
      client_name: clientName,
      contact,
      preferred_channel: preferredChannel,
      object_type: /вторич/i.test(allUserText)
        ? 'Вторичка'
        : /дом|коттедж/i.test(allUserText)
          ? 'Загородный дом'
          : /коммерц|офис|кафе/i.test(allUserText)
            ? 'Коммерция'
            : 'Новостройка',
      area_sqm: areaSqm,
      service_interest: /под ключ/i.test(allUserText)
        ? 'Под ключ (VIP)'
        : /эскиз/i.test(allUserText)
          ? 'Эскизный проект'
          : 'Полный дизайн-проект',
      timeline: /ключ/i.test(allUserText) ? 'Уже есть ключи' : 'В течение 1–2 месяцев',
      budget_note: estimatedFull
        ? `Предварительный ориентир полного проекта: ~$${estimatedFull}`
        : undefined,
      lead_temperature: /ключ|срочн|сейчас/i.test(allUserText)
        ? ('hot' as const)
        : ('warm' as const),
      ai_summary: `Клиент ${clientName} обратился в чат AURA Studio${areaSqm ? ` (площадь ~${areaSqm} м²)` : ''}. Оставил контакт ${contact} (${preferredChannel}) для детального обсуждения проекта с ведущим дизайнером.`,
    };

    const { lead } = await createOrUpdateChatLead({
      sessionId,
      userMetadata,
      input,
    });

    return {
      toolCall: {
        toolCallId: `mock-call-${Date.now()}`,
        args: input,
        result: {
          success: true,
          leadCode: lead.leadCode,
          message: `Заявка ${lead.leadCode} передана ведущему дизайнеру студии.`,
        },
      },
      text: `Благодарю, ${clientName}! Заявка #${lead.leadCode} уже передана ведущему дизайнеру AURA Studio. Менеджер свяжется с Вами по контакту ${contact} в ближайшее рабочее время (Пн–Сб с 10:00 до 20:00).`,
    };
  }

  if (areaSqm) {
    const effective = Math.max(areaSqm, rates.minAreaSqm);
    const minNote =
      areaSqm < rates.minAreaSqm
        ? ` (учитывая минимальную расчётную площадь ${rates.minAreaSqm} м²)`
        : '';
    return {
      text: `Для объекта площадью ${areaSqm} м²${minNote} предварительный ориентир стоимости составит:\n• «Эскизный проект» (${rates.sketchRate} $/м²) — $${effective * rates.sketchRate}\n• «Полный дизайн-проект» (${rates.fullRate} $/м²) — $${effective * rates.fullRate}\n• «Под ключ VIP» (${rates.vipRate} $/м²) — $${effective * rates.vipRate}\n\nЧтобы ведущий дизайнер подготовил детальный расчёт и варианты планировки, подскажите Ваше имя и удобный контакт (телефон или Telegram @username)?`,
    };
  }

  if (lower.includes('стоим') || lower.includes('цен') || lower.includes('прайс') || lower.includes('тариф') || lower.includes('сколько')) {
    return {
      text: `В AURA Studio действуют 3 прозрачных формата проектирования:\n• «Эскизный проект» — $${rates.sketchRate} / м² (3–4 недели)\n• «Полный дизайн-проект» — $${rates.fullRate} / м² (6–8 недель)\n• «Под ключ (VIP)» — $${rates.vipRate} / м² (дизайн + надзор + комплектация)\n\nМинимальная расчётная площадь — ${rates.minAreaSqm} м². Подскажите, какой у Вас объект и примерная площадь, чтобы я сделала точный расчёт?`,
    };
  }

  if (lower.includes('ремонт') || lower.includes('под ключ') || lower.includes('гарант')) {
    return {
      text: `Да, мы выполняем ремонт под ключ в основном городе присутствия и пригороде до 30 км. Стоимость работ — от $${rates.renovationRate} / м² (без материалов), гарантия по договору — 2 года, а срок ремонта для квартир до 70 м² — от 4 месяцев.\n\nУ Вас уже есть готовый дизайн-проект или нужно разработать его с нуля?`,
    };
  }

  if (lower.includes('срок') || lower.includes('долго') || lower.includes('когда')) {
    return {
      text: `Эскизный проект занимает 3–4 недели, а полный дизайн-проект с 3D-визуализациями и рабочими чертежами — 6–8 недель. Новые проекты мы берём в работу в течение 3–5 рабочих дней после подписания договора.\n\nПодскажите, на каком этапе сейчас ваш объект — уже получили ключи или только планируете?`,
    };
  }

  return {
    text: `С удовольствием помогу сориентироваться по услугам AURA Studio. Мы работаем с новостройками, вторичным фондом, загородными домами и коммерческими пространствами, а также ведём ремонт под ключ с гарантией 2 года.\n\nРасскажите о вашем объекте (тип и примерная площадь в м²), и я сразу рассчитаю ориентировочный бюджет.`,
  };
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rate = checkChatRateLimit(ip);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Слишком много сообщений. Пожалуйста, подождите минуту.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rate.retryAfterSec) },
        }
      );
    }

    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректный формат сообщений' }, { status: 400 });
    }

    const { userMetadata } = parsed.data;
    const clientSession = await resolveOrCreateClientSession();
    const sessionId = clientSession.sessionId;
    const recentMessages = parsed.data.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-20)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    if (recentMessages.length === 0) {
      return NextResponse.json({ error: 'Пустое сообщение' }, { status: 400 });
    }

    const aiClient = await resolveActiveAiClient();

    if (!aiClient.model) {
      const mock = await generateMockReply(recentMessages, sessionId, userMetadata);

      const historyToSave: ChatMessageEntry[] = [
        ...recentMessages.map((m) => ({
          role: m.role,
          content: m.content,
          createdAt: new Date().toISOString(),
        })),
        {
          role: 'assistant',
          content: mock.text,
          createdAt: new Date().toISOString(),
        },
      ];
      await saveChatLog(sessionId, historyToSave).catch((err) =>
        console.warn('[chat] Failed to save mock ChatLog:', err)
      );

      const mockResponse = createDataStreamResponse({
        execute: async (dataStream) => {
          if (mock.toolCall) {
            dataStream.write(
              formatDataStreamPart('tool_call', {
                toolCallId: mock.toolCall.toolCallId,
                toolName: 'submit_lead',
                args: mock.toolCall.args,
              })
            );
            dataStream.write(
              formatDataStreamPart('tool_result', {
                toolCallId: mock.toolCall.toolCallId,
                result: mock.toolCall.result,
              })
            );
          }

          const chunks = mock.text.match(/.{1,12}/gs) ?? [mock.text];
          for (const chunk of chunks) {
            dataStream.write(formatDataStreamPart('text', chunk));
            await new Promise((r) => setTimeout(r, 14));
          }
        },
      });
      if (clientSession.isNew) {
        mockResponse.headers.append(
          'Set-Cookie',
          buildClientSessionSetCookieHeader(clientSession.cookieToken)
        );
      }
      return mockResponse;
    }

    const systemPrompt = await buildChatSystemPrompt();
    let capturedLeadId: string | undefined;

    const result = streamText({
      model: aiClient.model,
      system: systemPrompt,
      messages: recentMessages,
      temperature: 0.3,
      maxTokens: 500,
      maxSteps: 3,
      tools: buildChatTools({
        sessionId,
        userMetadata,
        onLeadCaptured: (info) => {
          capturedLeadId = info.leadId;
        },
      }),
      onFinish: async ({ text }) => {
        const nowIso = new Date().toISOString();
        const history: ChatMessageEntry[] = [
          ...recentMessages.map((m) => ({
            role: m.role,
            content: m.content,
            createdAt: nowIso,
          })),
          ...(text
            ? [
                {
                  role: 'assistant' as const,
                  content: text,
                  createdAt: nowIso,
                },
              ]
            : []),
        ];
        await saveChatLog(sessionId, history, capturedLeadId).catch((err) =>
          console.warn('[chat] Failed to persist ChatLog:', err)
        );
      },
    });

    const streamResponse = result.toDataStreamResponse();
    if (clientSession.isNew) {
      streamResponse.headers.append(
        'Set-Cookie',
        buildClientSessionSetCookieHeader(clientSession.cookieToken)
      );
    }
    return streamResponse;
  } catch (err) {
    console.error('[POST /api/chat] Error:', err);
    return NextResponse.json(
      { error: 'Не удалось получить ответ консультанта. Попробуйте снова.' },
      { status: 500 }
    );
  }
}

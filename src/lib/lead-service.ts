import { Prisma, type Lead, type LeadTemperature } from '@prisma/client';
import { prisma } from './db';
import {
  isDbFallbackAllowed,
  localCreateLead,
  localFindRecentChatLead,
  localSaveChatLog,
  localUpdateLead,
} from './local-store';
import { notifyTelegramLead, notifyTelegramLeadUpdate } from '@/bot/notifier';
import type {
  ChatAiAnalysis,
  ChatMessageEntry,
  ContactInfo,
  QuizAnswers,
  QuizResult,
  UserMetadata,
} from '@/types/lead';

async function generateNextLeadCode(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LD-${year}-`;

  const lastLead = await tx.lead.findFirst({
    where: { leadCode: { startsWith: prefix } },
    orderBy: { leadCode: 'desc' },
    select: { leadCode: true },
  });

  let nextNumber = 1;
  if (lastLead?.leadCode) {
    const tail = lastLead.leadCode.slice(prefix.length);
    const parsed = Number.parseInt(tail, 10);
    if (!Number.isNaN(parsed)) {
      nextNumber = parsed + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

async function createLeadWithUniqueCode(
  data: Omit<Prisma.LeadCreateInput, 'leadCode'>
): Promise<Lead> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const leadCode = await generateNextLeadCode(tx);
        return tx.lead.create({
          data: {
            ...data,
            leadCode,
          },
        });
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        attempt < 4
      ) {
        continue;
      }
      throw err;
    }
  }
  throw new Error('Failed to generate unique leadCode after retries');
}

export async function createQuizLead(params: {
  sessionId: string;
  quizAnswers: QuizAnswers;
  contactInfo: ContactInfo;
  userMetadata: UserMetadata;
  temperature: LeadTemperature;
  result: QuizResult;
}): Promise<Lead> {
  try {
    const lead = await createLeadWithUniqueCode({
      sessionId: params.sessionId,
      source: 'AI_QUIZ',
      status: 'NEW',
      temperature: params.temperature,
      clientName: params.contactInfo.name,
      contact: params.contactInfo.contact,
      preferredChannel: params.contactInfo.preferredChannel,
      comment: params.contactInfo.comment || null,
      quizAnswers: params.quizAnswers as unknown as Prisma.InputJsonValue,
      aiAnalysis: params.result as unknown as Prisma.InputJsonValue,
      userMetadata: params.userMetadata as unknown as Prisma.InputJsonValue,
      telegramStatus: 'PENDING',
    });

    await notifyTelegramLead(lead);
    return (await prisma.lead.findUnique({ where: { id: lead.id } })) ?? lead;
  } catch (err) {
    if (!isDbFallbackAllowed(err)) throw err;
    const lead = await localCreateLead({
      sessionId: params.sessionId,
      source: 'AI_QUIZ',
      status: 'NEW',
      temperature: params.temperature,
      clientName: params.contactInfo.name,
      contact: params.contactInfo.contact,
      preferredChannel: params.contactInfo.preferredChannel,
      comment: params.contactInfo.comment || null,
      quizAnswers: params.quizAnswers as unknown as Prisma.JsonValue,
      aiAnalysis: params.result as unknown as Prisma.JsonValue,
      userMetadata: params.userMetadata as unknown as Prisma.JsonValue,
      telegramStatus: 'PENDING',
      telegramMessageId: null,
      telegramChatId: null,
      telegramError: null,
      assignedManager: null,
    });
    await notifyTelegramLead(lead);
    return lead;
  }
}

export function mapChatTemperature(temp: 'hot' | 'warm' | 'cold'): LeadTemperature {
  if (temp === 'hot') return 'HOT';
  if (temp === 'cold') return 'COLD';
  return 'WARM';
}

export async function createOrUpdateChatLead(params: {
  sessionId: string;
  userMetadata: UserMetadata;
  input: {
    client_name: string;
    contact: string;
    preferred_channel: 'Telegram' | 'WhatsApp' | 'Звонок' | 'Не указано';
    object_type?: string;
    area_sqm?: number;
    service_interest?: string;
    timeline?: string;
    budget_note?: string;
    lead_temperature: 'hot' | 'warm' | 'cold';
    ai_summary: string;
  };
}): Promise<{ lead: Lead; deduplicated: boolean }> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const aiAnalysis: ChatAiAnalysis = {
    lead_temperature: params.input.lead_temperature,
    object_type: params.input.object_type,
    area_sqm: params.input.area_sqm,
    service_interest: params.input.service_interest,
    timeline: params.input.timeline,
    budget_note: params.input.budget_note,
    ai_summary: params.input.ai_summary,
  };

  try {
    const existingLead = await prisma.lead.findFirst({
      where: {
        sessionId: params.sessionId,
        source: 'AI_CHAT',
        createdAt: { gte: tenMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingLead) {
      const updated = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          clientName: params.input.client_name,
          contact: params.input.contact,
          preferredChannel: params.input.preferred_channel,
          temperature: mapChatTemperature(params.input.lead_temperature),
          aiAnalysis: aiAnalysis as unknown as Prisma.InputJsonValue,
        },
      });

      await prisma.chatLog
        .updateMany({
          where: { sessionId: params.sessionId },
          data: { leadId: updated.id },
        })
        .catch(() => {});

      await notifyTelegramLeadUpdate(updated, params.input.ai_summary);
      return { lead: updated, deduplicated: true };
    }

    const lead = await createLeadWithUniqueCode({
      sessionId: params.sessionId,
      source: 'AI_CHAT',
      status: 'NEW',
      temperature: mapChatTemperature(params.input.lead_temperature),
      clientName: params.input.client_name,
      contact: params.input.contact,
      preferredChannel: params.input.preferred_channel,
      comment: params.input.budget_note || null,
      aiAnalysis: aiAnalysis as unknown as Prisma.InputJsonValue,
      userMetadata: params.userMetadata as unknown as Prisma.InputJsonValue,
      telegramStatus: 'PENDING',
    });

    await prisma.chatLog
      .updateMany({
        where: { sessionId: params.sessionId },
        data: { leadId: lead.id },
      })
      .catch(() => {});

    await notifyTelegramLead(lead);
    const refreshed = await prisma.lead.findUnique({ where: { id: lead.id } });
    return { lead: refreshed ?? lead, deduplicated: false };
  } catch (err) {
    if (!isDbFallbackAllowed(err)) throw err;

    const existingLocal = await localFindRecentChatLead(params.sessionId);
    if (existingLocal) {
      const updated =
        (await localUpdateLead(existingLocal.id, {
          clientName: params.input.client_name,
          contact: params.input.contact,
          preferredChannel: params.input.preferred_channel,
          temperature: mapChatTemperature(params.input.lead_temperature),
          aiAnalysis: aiAnalysis as unknown as Prisma.JsonValue,
        })) ?? existingLocal;
      await notifyTelegramLeadUpdate(updated, params.input.ai_summary);
      return { lead: updated, deduplicated: true };
    }

    const created = await localCreateLead({
      sessionId: params.sessionId,
      source: 'AI_CHAT',
      status: 'NEW',
      temperature: mapChatTemperature(params.input.lead_temperature),
      clientName: params.input.client_name,
      contact: params.input.contact,
      preferredChannel: params.input.preferred_channel,
      comment: params.input.budget_note || null,
      quizAnswers: null,
      aiAnalysis: aiAnalysis as unknown as Prisma.JsonValue,
      userMetadata: params.userMetadata as unknown as Prisma.JsonValue,
      telegramStatus: 'PENDING',
      telegramMessageId: null,
      telegramChatId: null,
      telegramError: null,
      assignedManager: null,
    });
    await notifyTelegramLead(created);
    return { lead: created, deduplicated: false };
  }
}

export async function saveChatLog(
  sessionId: string,
  messages: ChatMessageEntry[],
  leadId?: string
): Promise<void> {
  const trimmed = messages.slice(-40);
  try {
    await prisma.chatLog.upsert({
      where: { sessionId },
      update: {
        messages: trimmed as unknown as Prisma.InputJsonValue,
        ...(leadId ? { leadId } : {}),
      },
      create: {
        sessionId,
        messages: trimmed as unknown as Prisma.InputJsonValue,
        ...(leadId ? { leadId } : {}),
      },
    });
  } catch (err) {
    if (isDbFallbackAllowed(err)) {
      await localSaveChatLog(sessionId, trimmed, leadId);
      return;
    }
    throw err;
  }
}

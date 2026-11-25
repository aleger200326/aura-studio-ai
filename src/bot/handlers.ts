import type { Bot } from 'grammy';
import { prisma } from '@/lib/db';
import {
  isDbFallbackAllowed,
  localFindLeadById,
  localGetChatLog,
  localListLeads,
  localUpdateLead,
} from '@/lib/local-store';
import type { ChatMessageEntry } from '@/types/lead';
import { buildLeadKeyboard, escapeHtml, formatLeadMessage } from './formatter';

export function registerBotHandlers(bot: Bot): void {
  bot.command('start', async (ctx) => {
    const chatId = ctx.chat?.id ? String(ctx.chat.id) : 'не определён';
    let dbStatus = '🟢 Подключена (PostgreSQL)';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      dbStatus = isDbFallbackAllowed(err)
        ? '🟡 Локальный режим (.aura-local-db.json)'
        : '🔴 Ошибка подключения';
    }

    await ctx.reply(
      [
        '🏛 <b>AURA Studio AI — Бот уведомлений</b>',
        '',
        `• <b>Ваш Chat ID:</b> <code>${escapeHtml(chatId)}</code>`,
        `• <b>База данных:</b> ${dbStatus}`,
        '',
        'Доступные команды:',
        '/stats — статистика лидов за сегодня и за 7 дней',
        '/leads — последние 5 новых заявок',
      ].join('\n'),
      { parse_mode: 'HTML' }
    );
  });

  bot.command('stats', async (ctx) => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let todayTotal = 0;
    let weekLeads: Array<{ source: string; temperature: string; status: string }> = [];

    try {
      [todayTotal, weekLeads] = await Promise.all([
        prisma.lead.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.lead.findMany({
          where: { createdAt: { gte: sevenDaysAgo } },
          select: { source: true, temperature: true, status: true },
        }),
      ]);
    } catch (err) {
      if (!isDbFallbackAllowed(err)) throw err;
      const local = await localListLeads({});
      todayTotal = local.leads.filter((l) => l.createdAt >= startOfDay).length;
      weekLeads = local.leads.filter((l) => l.createdAt >= sevenDaysAgo);
    }

    const quizCount = weekLeads.filter((l) => l.source === 'AI_QUIZ').length;
    const chatCount = weekLeads.filter((l) => l.source === 'AI_CHAT').length;
    const hotCount = weekLeads.filter((l) => l.temperature === 'HOT').length;
    const warmCount = weekLeads.filter((l) => l.temperature === 'WARM').length;
    const coldCount = weekLeads.filter((l) => l.temperature === 'COLD').length;
    const newCount = weekLeads.filter((l) => l.status === 'NEW').length;

    await ctx.reply(
      [
        '📊 <b>Статистика заявок AURA Studio</b>',
        '',
        `• <b>За сегодня:</b> ${todayTotal}`,
        `• <b>За последние 7 дней:</b> ${weekLeads.length} (новых: ${newCount})`,
        '',
        '<b>По источникам (7 дней):</b>',
        `• AI-Квиз: ${quizCount}`,
        `• AI-Чат: ${chatCount}`,
        '',
        '<b>По температуре (7 дней):</b>',
        `• 🔴 Горячие: ${hotCount}`,
        `• 🟡 Теплые: ${warmCount}`,
        `• 🔵 Холодные: ${coldCount}`,
      ].join('\n'),
      { parse_mode: 'HTML' }
    );
  });

  bot.command('leads', async (ctx) => {
    let recentNew;
    try {
      recentNew = await prisma.lead.findMany({
        where: { status: 'NEW' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    } catch (err) {
      if (!isDbFallbackAllowed(err)) throw err;
      const local = await localListLeads({ status: 'NEW' });
      recentNew = local.leads.slice(0, 5);
    }

    if (recentNew.length === 0) {
      await ctx.reply('✅ Новых необработанных заявок сейчас нет.');
      return;
    }

    for (const lead of recentNew) {
      const text = formatLeadMessage(lead);
      const keyboard = buildLeadKeyboard(lead);
      await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
        link_preview_options: { is_disabled: true },
      });
    }
  });

  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const parts = data.split(':');
    if (parts[0] !== 'lead' || parts.length < 3) {
      await ctx.answerCallbackQuery();
      return;
    }

    const action = parts[1];
    const leadId = parts[2];

    let lead = null;
    let usingFallback = false;
    try {
      lead = await prisma.lead.findUnique({ where: { id: leadId } });
    } catch (err) {
      if (!isDbFallbackAllowed(err)) throw err;
      usingFallback = true;
      lead = await localFindLeadById(leadId);
    }

    if (!lead) {
      await ctx.answerCallbackQuery({
        text: 'Заявка не найдена в базе данных.',
        show_alert: true,
      });
      return;
    }

    const managerHandle = ctx.from?.username
      ? `@${ctx.from.username}`
      : ctx.from?.first_name || 'Менеджер';

    if (action === 'take') {
      const updated = usingFallback
        ? ((await localUpdateLead(lead.id, {
            status: 'IN_PROGRESS',
            assignedManager: managerHandle,
          })) ?? lead)
        : await prisma.lead.update({
            where: { id: lead.id },
            data: {
              status: 'IN_PROGRESS',
              assignedManager: managerHandle,
            },
          });

      const baseText = formatLeadMessage(updated);
      const nextText = `${baseText}\n\n🟢 <b>Статус:</b> В работе у ${escapeHtml(managerHandle)}`;
      await ctx.editMessageText(nextText, {
        parse_mode: 'HTML',
        reply_markup: buildLeadKeyboard(updated),
        link_preview_options: { is_disabled: true },
      });
      await ctx.answerCallbackQuery({ text: 'Лид закреплен за вами!' });
      return;
    }

    if (action === 'spam') {
      const updated = usingFallback
        ? ((await localUpdateLead(lead.id, { status: 'SPAM' })) ?? lead)
        : await prisma.lead.update({
            where: { id: lead.id },
            data: { status: 'SPAM' },
          });
      const baseText = formatLeadMessage(updated);
      const nextText = `${baseText}\n\n🗑 <b>Статус:</b> Помечено как спам (${escapeHtml(managerHandle)})`;
      await ctx.editMessageText(nextText, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
      await ctx.answerCallbackQuery({ text: 'Лид перенесен в спам.' });
      return;
    }

    if (action === 'done') {
      const updated = usingFallback
        ? ((await localUpdateLead(lead.id, { status: 'COMPLETED' })) ?? lead)
        : await prisma.lead.update({
            where: { id: lead.id },
            data: { status: 'COMPLETED' },
          });
      const baseText = formatLeadMessage(updated);
      const nextText = `${baseText}\n\n🏁 <b>Статус:</b> Обработано (${escapeHtml(updated.assignedManager || managerHandle)})`;
      await ctx.editMessageText(nextText, {
        parse_mode: 'HTML',
        reply_markup: buildLeadKeyboard(updated),
        link_preview_options: { is_disabled: true },
      });
      await ctx.answerCallbackQuery({ text: 'Заявка отмечена как завершенная!' });
      return;
    }

    if (action === 'chatlog') {
      let rawMessages: ChatMessageEntry[] = [];
      if (usingFallback) {
        rawMessages = await localGetChatLog(lead.sessionId);
      } else {
        const chatLog = await prisma.chatLog.findUnique({
          where: { sessionId: lead.sessionId },
        });
        rawMessages = Array.isArray(chatLog?.messages)
          ? (chatLog.messages as unknown as ChatMessageEntry[])
          : [];
      }

      const lastTen = rawMessages.slice(-10);

      if (lastTen.length === 0) {
        await ctx.answerCallbackQuery({ text: 'История переписки пуста.' });
        return;
      }

      const transcriptLines = lastTen.map((m) => {
        const speaker = m.role === 'user' ? '👤 Клиент' : '🏛 Алина';
        const snippet = m.content.length > 260 ? `${m.content.slice(0, 257)}...` : m.content;
        return `<b>${speaker}:</b> ${escapeHtml(snippet)}`;
      });

      const messageId = ctx.callbackQuery.message?.message_id;
      await ctx.reply(
        [
          `💬 <b>История диалога (#${escapeHtml(lead.leadCode)})</b>`,
          '',
          ...transcriptLines,
        ]
          .join('\n')
          .slice(0, 4000),
        {
          parse_mode: 'HTML',
          reply_parameters: messageId ? { message_id: messageId } : undefined,
        }
      );
      await ctx.answerCallbackQuery();
      return;
    }

    await ctx.answerCallbackQuery();
  });
}

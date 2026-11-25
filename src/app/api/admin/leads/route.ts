import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { isAdminAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isDbFallbackAllowed, localListLeads } from '@/lib/local-store';

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') || 'ALL';
  const status = searchParams.get('status') || 'ALL';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = 20;

  const where: Prisma.LeadWhereInput = {};
  if (source === 'AI_QUIZ' || source === 'AI_CHAT') {
    where.source = source;
  }
  if (status === 'NEW' || status === 'IN_PROGRESS' || status === 'COMPLETED' || status === 'SPAM') {
    where.status = status;
  }

  try {
    const [total, leads, allCount, hotCount, quizCount, sentCount] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lead.count(),
      prisma.lead.count({ where: { temperature: 'HOT' } }),
      prisma.lead.count({ where: { source: 'AI_QUIZ' } }),
      prisma.lead.count({ where: { telegramStatus: 'SENT' } }),
    ]);

    const sessionIds = Array.from(new Set(leads.map((l) => l.sessionId)));
    const chatLogs = await prisma.chatLog.findMany({
      where: { sessionId: { in: sessionIds } },
    });
    const chatLogMap = new Map(chatLogs.map((c) => [c.sessionId, c.messages]));

    const enrichedLeads = leads.map((lead) => ({
      ...lead,
      chatHistory: chatLogMap.get(lead.sessionId) ?? [],
    }));

    return NextResponse.json({
      leads: enrichedLeads,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      stats: {
        total: allCount,
        hot: hotCount,
        quiz: quizCount,
        telegramSent: sentCount,
      },
    });
  } catch (err) {
    if (isDbFallbackAllowed(err)) {
      const localData = await localListLeads({ source, status });
      return NextResponse.json({
        leads: localData.leads,
        pagination: {
          total: localData.leads.length,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        },
        stats: localData.stats,
      });
    }
    console.error('[GET /api/admin/leads] Error:', err);
    return NextResponse.json({ error: 'Ошибка загрузки лидов' }, { status: 500 });
  }
}

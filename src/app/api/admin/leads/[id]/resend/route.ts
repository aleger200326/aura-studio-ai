import { NextResponse } from 'next/server';
import { notifyTelegramLead } from '@/bot/notifier';
import { isAdminAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isDbFallbackAllowed, localFindLeadById } from '@/lib/local-store';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  let lead = null;
  let usingFallback = false;

  try {
    lead = await prisma.lead.findUnique({ where: { id } });
  } catch (err) {
    if (isDbFallbackAllowed(err)) {
      usingFallback = true;
      lead = await localFindLeadById(id);
    } else {
      console.error('[POST /api/admin/leads/[id]/resend] Error:', err);
      return NextResponse.json({ error: 'Ошибка чтения базы данных' }, { status: 500 });
    }
  }

  if (!lead) {
    return NextResponse.json({ error: 'Лид не найден' }, { status: 404 });
  }

  const delivery = await notifyTelegramLead(lead);
  const updated = usingFallback
    ? await localFindLeadById(id)
    : await prisma.lead.findUnique({ where: { id } });

  return NextResponse.json({
    success: delivery.delivered,
    error: delivery.delivered ? null : 'Не удалось доставить уведомление в Telegram.',
    lead: updated,
  });
}

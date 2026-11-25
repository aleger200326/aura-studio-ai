import { NextResponse } from 'next/server';
import { notifyTelegramLead } from '@/bot/notifier';
import { isAdminAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: 'Лид не найден' }, { status: 404 });
  }

  const delivery = await notifyTelegramLead(lead);
  const updated = await prisma.lead.findUnique({ where: { id } });

  return NextResponse.json({
    success: delivery.delivered,
    error: delivery.error ?? null,
    lead: updated,
  });
}

import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isDbFallbackAllowed, localUpdateLead } from '@/lib/local-store';
import { adminLeadPatchSchema } from '@/lib/validators';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const body = await request.json();
    const parsed = adminLeadPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректный статус' }, { status: 400 });
    }

    try {
      const updated = await prisma.lead.update({
        where: { id },
        data: { status: parsed.data.status },
      });
      return NextResponse.json({ lead: updated });
    } catch (dbErr) {
      if (isDbFallbackAllowed(dbErr)) {
        const updated = await localUpdateLead(id, { status: parsed.data.status });
        if (!updated) {
          return NextResponse.json({ error: 'Лид не найден' }, { status: 404 });
        }
        return NextResponse.json({ lead: updated });
      }
      throw dbErr;
    }
  } catch (err) {
    console.error('[PATCH /api/admin/leads/[id]] Error:', err);
    return NextResponse.json({ error: 'Лид не найден' }, { status: 404 });
  }
}

import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getKnowledgeBaseWithMeta, updateKnowledgeBase } from '@/lib/knowledge';
import { adminKnowledgeSchema } from '@/lib/validators';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getKnowledgeBaseWithMeta();
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = adminKnowledgeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      );
    }

    const updated = await updateKnowledgeBase(parsed.data.content);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PUT /api/admin/knowledge] Error:', err);
    return NextResponse.json({ error: 'Ошибка сохранения базы знаний' }, { status: 500 });
  }
}

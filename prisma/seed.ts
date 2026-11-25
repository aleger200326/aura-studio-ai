import fs from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const defaultPath = path.join(process.cwd(), 'data', 'knowledge_base.default.md');
  const knowledgeContent = await fs.readFile(defaultPath, 'utf-8');

  await prisma.systemSetting.upsert({
    where: { key: 'knowledge_base' },
    update: { value: knowledgeContent },
    create: { key: 'knowledge_base', value: knowledgeContent },
  });

  if (process.env.TELEGRAM_CHAT_ID) {
    await prisma.systemSetting.upsert({
      where: { key: 'telegram_chat_id' },
      update: {},
      create: { key: 'telegram_chat_id', value: process.env.TELEGRAM_CHAT_ID },
    });
  }

  console.log('✅ Seed completed: knowledge_base initialized in SystemSetting.');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

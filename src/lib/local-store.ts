import fs from 'node:fs/promises';
import path from 'node:path';
import type { Lead } from '@prisma/client';
import type { ChatMessageEntry } from '@/types/lead';

const STORE_PATH = path.join(process.cwd(), '.aura-local-db.json');

interface LocalStoreData {
  leads: Array<
    Omit<Lead, 'createdAt' | 'updatedAt'> & {
      createdAt: string;
      updatedAt: string;
    }
  >;
  chatLogs: Record<string, { sessionId: string; messages: ChatMessageEntry[]; leadId?: string }>;
  settings: Record<string, { value: string; updatedAt: string }>;
}

export function isDbFallbackAllowed(err: unknown): boolean {
  // Never persist leads or settings to ephemeral local disk in production
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  if (process.env.ALLOW_DB_FALLBACK === 'false') {
    return false;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Can't reach database server") ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('P1001') ||
    msg.includes('PrismaClientInitializationError')
  );
}

async function readStore(): Promise<LocalStoreData> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf-8');
    return JSON.parse(raw) as LocalStoreData;
  } catch {
    return { leads: [], chatLogs: {}, settings: {} };
  }
}

async function writeStore(data: LocalStoreData): Promise<void> {
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
}

function hydrateLead(
  raw: LocalStoreData['leads'][number]
): Lead {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  } as Lead;
}

export async function localCreateLead(
  input: Omit<Lead, 'id' | 'leadCode' | 'createdAt' | 'updatedAt'>
): Promise<Lead> {
  const store = await readStore();
  const year = new Date().getFullYear();
  const nextNum = store.leads.length + 1;
  const leadCode = `LD-${year}-${String(nextNum).padStart(4, '0')}`;
  const now = new Date().toISOString();

  const created = {
    ...input,
    id: `local-${Date.now()}-${nextNum}`,
    leadCode,
    createdAt: now,
    updatedAt: now,
  };
  store.leads.unshift(created);
  await writeStore(store);
  return hydrateLead(created);
}

export async function localFindRecentChatLead(sessionId: string): Promise<Lead | null> {
  const store = await readStore();
  const tenMinAgo = Date.now() - 10 * 60 * 1000;
  const match = store.leads.find(
    (l) =>
      l.sessionId === sessionId &&
      l.source === 'AI_CHAT' &&
      new Date(l.createdAt).getTime() >= tenMinAgo
  );
  return match ? hydrateLead(match) : null;
}

export async function localFindLeadById(id: string): Promise<Lead | null> {
  const store = await readStore();
  const found = store.leads.find((l) => l.id === id);
  return found ? hydrateLead(found) : null;
}

export async function localGetChatLog(sessionId: string): Promise<ChatMessageEntry[]> {
  const store = await readStore();
  return store.chatLogs[sessionId]?.messages ?? [];
}

export async function localUpdateLead(
  id: string,
  patch: Partial<Lead>
): Promise<Lead | null> {
  const store = await readStore();
  const idx = store.leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  store.leads[idx] = {
    ...store.leads[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  } as LocalStoreData['leads'][number];
  await writeStore(store);
  return hydrateLead(store.leads[idx]);
}

export async function localListLeads(filters: {
  source?: string;
  status?: string;
}) {
  const store = await readStore();
  const all = store.leads.map((l) => ({
    ...hydrateLead(l),
    chatHistory: store.chatLogs[l.sessionId]?.messages ?? [],
  }));

  const filtered = all.filter((l) => {
    if (filters.source && filters.source !== 'ALL' && l.source !== filters.source) return false;
    if (filters.status && filters.status !== 'ALL' && l.status !== filters.status) return false;
    return true;
  });

  return {
    leads: filtered,
    stats: {
      total: all.length,
      hot: all.filter((l) => l.temperature === 'HOT').length,
      quiz: all.filter((l) => l.source === 'AI_QUIZ').length,
      telegramSent: all.filter((l) => l.telegramStatus === 'SENT').length,
    },
  };
}

export async function localSaveChatLog(
  sessionId: string,
  messages: ChatMessageEntry[],
  leadId?: string
): Promise<void> {
  const store = await readStore();
  store.chatLogs[sessionId] = {
    sessionId,
    messages: messages.slice(-40),
    leadId: leadId ?? store.chatLogs[sessionId]?.leadId,
  };
  await writeStore(store);
}

export async function localGetSetting(key: string): Promise<{ value: string; updatedAt: string } | null> {
  const store = await readStore();
  return store.settings[key] ?? null;
}

export async function localSetSetting(key: string, value: string): Promise<{ value: string; updatedAt: string }> {
  const store = await readStore();
  const entry = { value, updatedAt: new Date().toISOString() };
  store.settings[key] = entry;
  await writeStore(store);
  return entry;
}

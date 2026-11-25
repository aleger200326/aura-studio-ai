import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from './db';
import { isDbFallbackAllowed, localGetSetting, localSetSetting } from './local-store';

const KNOWLEDGE_KEY = 'knowledge_base';
const CACHE_TTL_MS = 60_000;

interface KnowledgeCache {
  content: string;
  updatedAt: string;
  expiresAt: number;
}

let cache: KnowledgeCache | null = null;

async function readDefaultKnowledge(): Promise<string> {
  const defaultPath = path.join(process.cwd(), 'data', 'knowledge_base.default.md');
  try {
    return await fs.readFile(defaultPath, 'utf-8');
  } catch {
    const fallbackRootPath = path.join(process.cwd(), 'aura_studio.md');
    return await fs.readFile(fallbackRootPath, 'utf-8');
  }
}

export function invalidateKnowledgeCache(): void {
  cache = null;
}

export async function getKnowledgeBaseWithMeta(): Promise<{
  content: string;
  updatedAt: string;
}> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return { content: cache.content, updatedAt: cache.updatedAt };
  }

  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key: KNOWLEDGE_KEY },
    });

    if (record) {
      cache = {
        content: record.value,
        updatedAt: record.updatedAt.toISOString(),
        expiresAt: now + CACHE_TTL_MS,
      };
      return { content: record.value, updatedAt: cache.updatedAt };
    }

    const defaultContent = await readDefaultKnowledge();
    const created = await prisma.systemSetting.upsert({
      where: { key: KNOWLEDGE_KEY },
      update: {},
      create: { key: KNOWLEDGE_KEY, value: defaultContent },
    });

    cache = {
      content: created.value,
      updatedAt: created.updatedAt.toISOString(),
      expiresAt: now + CACHE_TTL_MS,
    };
    return { content: created.value, updatedAt: cache.updatedAt };
  } catch (err) {
    console.warn('[knowledge] Database unavailable, falling back to local store/default file:', err);
    if (isDbFallbackAllowed(err)) {
      const local = await localGetSetting(KNOWLEDGE_KEY);
      if (local) {
        cache = {
          content: local.value,
          updatedAt: local.updatedAt,
          expiresAt: now + CACHE_TTL_MS,
        };
        return { content: local.value, updatedAt: local.updatedAt };
      }
    }
    const defaultContent = await readDefaultKnowledge();
    const updatedAt = new Date().toISOString();
    cache = {
      content: defaultContent,
      updatedAt,
      expiresAt: now + 10_000,
    };
    return { content: defaultContent, updatedAt };
  }
}

export async function getKnowledgeBase(): Promise<string> {
  const { content } = await getKnowledgeBaseWithMeta();
  return content;
}

export async function updateKnowledgeBase(content: string): Promise<{
  content: string;
  updatedAt: string;
}> {
  try {
    const updated = await prisma.systemSetting.upsert({
      where: { key: KNOWLEDGE_KEY },
      update: { value: content },
      create: { key: KNOWLEDGE_KEY, value: content },
    });

    invalidateKnowledgeCache();
    cache = {
      content: updated.value,
      updatedAt: updated.updatedAt.toISOString(),
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    return {
      content: updated.value,
      updatedAt: updated.updatedAt.toISOString(),
    };
  } catch (err) {
    if (!isDbFallbackAllowed(err)) throw err;
    const saved = await localSetSetting(KNOWLEDGE_KEY, content);
    invalidateKnowledgeCache();
    cache = {
      content: saved.value,
      updatedAt: saved.updatedAt,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return { content: saved.value, updatedAt: saved.updatedAt };
  }
}

export interface ParsedTariffRates {
  sketchRate: number;
  fullRate: number;
  vipRate: number;
  renovationRate: number;
  minAreaSqm: number;
}

export function extractTariffRatesFromMarkdown(markdown: string): ParsedTariffRates {
  const sketchMatch = markdown.match(/Эскизный проект[^$]*\$(\d+)/i);
  const fullMatch = markdown.match(/Полный дизайн-проект[^$]*\$(\d+)/i);
  const vipMatch = markdown.match(/Под ключ\s*\(VIP\)[^$]*\$(\d+)/i);
  const renoMatch = markdown.match(/Стоимость работ[^$]*\$(\d+)/i);
  const minAreaMatch = markdown.match(/Минимальная площадь[^0-9]*(\d+)\s*м²/i);

  return {
    sketchRate: sketchMatch ? Number(sketchMatch[1]) : 35,
    fullRate: fullMatch ? Number(fullMatch[1]) : 55,
    vipRate: vipMatch ? Number(vipMatch[1]) : 85,
    renovationRate: renoMatch ? Number(renoMatch[1]) : 350,
    minAreaSqm: minAreaMatch ? Number(minAreaMatch[1]) : 35,
  };
}

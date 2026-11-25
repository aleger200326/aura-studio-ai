'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  ClipboardList,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import type { GeminiModelId, GeminiModelOption } from '@/lib/ai/models';
import type {
  ChatAiAnalysis,
  ChatMessageEntry,
  LeadRecord,
  LeadStatusType,
  QuizAnswers,
  QuizResult,
} from '@/types/lead';

type AdminTab = 'leads' | 'ai' | 'knowledge' | 'telegram';

interface EnrichedLead extends LeadRecord {
  chatHistory?: ChatMessageEntry[];
}

interface AdminStats {
  total: number;
  hot: number;
  quiz: number;
  telegramSent: number;
}

const STATUS_LABELS: Record<LeadStatusType, string> = {
  NEW: 'Новая',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершена',
  SPAM: 'Спам',
};

const TEMP_BADGE: Record<string, { label: string; className: string }> = {
  HOT: { label: 'Горячий', className: 'bg-[#C95B48]/12 text-[#C95B48]' },
  WARM: { label: 'Тёплый', className: 'bg-[#C48F45]/15 text-[#9C6C27]' },
  COLD: { label: 'Холодный', className: 'bg-[#1683BD]/15 text-[#1683BD]' },
};

function renderMarkdownPreview(md: string) {
  const lines = md.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('# ')) {
      return (
        <h2 key={i} className="mt-4 font-serif text-2xl font-semibold text-[var(--text-primary)]">
          {line.slice(2)}
        </h2>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h3 key={i} className="mt-4 font-serif text-xl font-semibold text-[var(--accent-ice)]">
          {line.slice(3)}
        </h3>
      );
    }
    if (line.startsWith('### ')) {
      return (
        <h4 key={i} className="mt-3 text-sm font-bold text-[var(--text-primary)]">
          {line.slice(4)}
        </h4>
      );
    }
    if (line.startsWith('* ') || line.startsWith('- ')) {
      return (
        <li key={i} className="ml-4 list-disc text-xs leading-relaxed text-[var(--text-secondary)]">
          {line.slice(2).replace(/\*\*/g, '')}
        </li>
      );
    }
    if (!line.trim() || line.trim() === '---') {
      return <div key={i} className="h-2" />;
    }
    return (
      <p key={i} className="text-xs leading-relaxed text-[var(--text-secondary)]">
        {line.replace(/\*\*/g, '')}
      </p>
    );
  });
}

export function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('leads');

  // Leads state
  const [leads, setLeads] = useState<EnrichedLead[]>([]);
  const [stats, setStats] = useState<AdminStats>({ total: 0, hot: 0, quiz: 0, telegramSent: 0 });
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [leadsLoading, setLeadsLoading] = useState<boolean>(true);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<EnrichedLead | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // AI / Gemini state
  const [aiModels, setAiModels] = useState<GeminiModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>('gemini-3.8-flash');
  const [googleApiKeyInput, setGoogleApiKeyInput] = useState<string>('');
  const [maskedGoogleKey, setMaskedGoogleKey] = useState<string>('');
  const [hasGoogleKey, setHasGoogleKey] = useState<boolean>(false);
  const [forceMockMode, setForceMockMode] = useState<boolean>(true);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [aiSaving, setAiSaving] = useState<boolean>(false);
  const [aiTesting, setAiTesting] = useState<boolean>(false);
  const [aiNotice, setAiNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Knowledge state
  const [knowledgeText, setKnowledgeText] = useState<string>('');
  const [knowledgeUpdatedAt, setKnowledgeUpdatedAt] = useState<string>('');
  const [knowledgeSaving, setKnowledgeSaving] = useState<boolean>(false);
  const [knowledgeNotice, setKnowledgeNotice] = useState<string | null>(null);

  // Telegram state
  const [tgChatId, setTgChatId] = useState<string>('');
  const [tgBotConfigured, setTgBotConfigured] = useState<boolean>(false);
  const [tgTesting, setTgTesting] = useState<boolean>(false);
  const [tgNotice, setTgNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    setLeadsError(null);
    try {
      const params = new URLSearchParams({
        source: sourceFilter,
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setLeadsError(data.error || 'Не удалось загрузить заявки');
        return;
      }
      setLeads(data.leads ?? []);
      setStats(data.stats ?? { total: 0, hot: 0, quiz: 0, telegramSent: 0 });
    } catch {
      setLeadsError('База данных недоступна. Проверьте подключение PostgreSQL.');
    } finally {
      setLeadsLoading(false);
    }
  }, [sourceFilter, statusFilter, router]);

  const loadAiSettings = useCallback(async () => {
    const res = await fetch('/api/admin/ai-settings');
    if (res.ok) {
      const data = await res.json();
      setHasGoogleKey(Boolean(data.hasKey));
      setMaskedGoogleKey(data.maskedKey || '');
      setSelectedModel(data.geminiModel || 'gemini-3.8-flash');
      setForceMockMode(Boolean(data.forceMockMode));
      setAiModels(data.models ?? []);
    }
  }, []);

  const loadKnowledge = useCallback(async () => {
    const res = await fetch('/api/admin/knowledge');
    if (res.ok) {
      const data = await res.json();
      setKnowledgeText(data.content || '');
      setKnowledgeUpdatedAt(data.updatedAt || '');
    }
  }, []);

  const loadTelegramSettings = useCallback(async () => {
    const res = await fetch('/api/admin/telegram-test');
    if (res.ok) {
      const data = await res.json();
      setTgChatId(data.chatId || '');
      setTgBotConfigured(Boolean(data.botConfigured));
    }
  }, []);

  useEffect(() => {
    loadLeads();
    loadAiSettings();
    loadKnowledge();
    loadTelegramSettings();
  }, [loadLeads, loadAiSettings, loadKnowledge, loadTelegramSettings]);

  async function handleSaveAiSettings(e: React.FormEvent) {
    e.preventDefault();
    setAiSaving(true);
    setAiNotice(null);
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleApiKey: googleApiKeyInput.trim() || undefined,
          geminiModel: selectedModel,
          forceMockMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiNotice({ ok: false, text: data.error || 'Не удалось сохранить настройки AI' });
        return;
      }
      setHasGoogleKey(Boolean(data.hasKey));
      setMaskedGoogleKey(data.maskedKey || '');
      setForceMockMode(Boolean(data.forceMockMode));
      setGoogleApiKeyInput('');
      setAiNotice({
        ok: true,
        text: `Настройки сохранены. Активная модель: ${data.geminiModel}${
          data.forceMockMode ? ' (включён тестовый Mock-режим)' : ' (боевой Google Gemini API)'
        }.`,
      });
    } finally {
      setAiSaving(false);
    }
  }

  async function handleTestAiConnection() {
    setAiTesting(true);
    setAiNotice(null);
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleApiKey: googleApiKeyInput.trim() || undefined,
          geminiModel: selectedModel,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAiNotice({
          ok: false,
          text: data.error || 'Проверка не пройдена. Проверьте ключ Google AI Studio.',
        });
        return;
      }
      setAiNotice({
        ok: true,
        text: `Подключение успешно (${data.modelId}): «${data.reply}»`,
      });
    } finally {
      setAiTesting(false);
    }
  }

  async function handleClearGoogleKey() {
    setAiSaving(true);
    setAiNotice(null);
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearKey: true, forceMockMode: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setHasGoogleKey(false);
        setMaskedGoogleKey('');
        setForceMockMode(Boolean(data.forceMockMode));
        setAiNotice({ ok: true, text: 'Ключ удалён. Агент переключён в локальный Mock-режим.' });
      }
    } finally {
      setAiSaving(false);
    }
  }

  async function handleStatusChange(leadId: string, nextStatus: LeadStatusType) {
    const res = await fetch(`/api/admin/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      setLeads((prev) =>
        prev.map((item) => (item.id === leadId ? { ...item, status: nextStatus } : item))
      );
      if (selectedLead?.id === leadId) {
        setSelectedLead((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    }
  }

  async function handleResendTelegram(leadId: string) {
    setResendingId(leadId);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/resend`, { method: 'POST' });
      const data = await res.json();
      if (data.lead) {
        setLeads((prev) =>
          prev.map((item) =>
            item.id === leadId
              ? { ...item, ...data.lead, chatHistory: item.chatHistory }
              : item
          )
        );
        if (selectedLead?.id === leadId) {
          setSelectedLead((prev) =>
            prev ? { ...prev, ...data.lead, chatHistory: prev.chatHistory } : null
          );
        }
      }
      await loadLeads();
    } finally {
      setResendingId(null);
    }
  }

  async function handleSaveKnowledge() {
    setKnowledgeSaving(true);
    setKnowledgeNotice(null);
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: knowledgeText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setKnowledgeNotice(data.error || 'Ошибка сохранения');
        return;
      }
      setKnowledgeUpdatedAt(data.updatedAt);
      setKnowledgeNotice('База знаний обновлена — AI-консультант уже использует новые данные.');
    } finally {
      setKnowledgeSaving(false);
    }
  }

  async function handleTestTelegram(e: React.FormEvent) {
    e.preventDefault();
    setTgTesting(true);
    setTgNotice(null);
    try {
      const res = await fetch('/api/admin/telegram-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: tgChatId }),
      });
      const data = await res.json();
      setTgNotice({
        ok: Boolean(data.ok),
        text: data.ok
          ? `Тестовое сообщение отправлено в чат ${data.chatId}`
          : data.error || 'Не удалось отправить сообщение',
      });
    } finally {
      setTgTesting(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] lg:flex">
      {/* Obsidian Carbon Sidebar */}
      <aside className="flex w-full flex-col justify-between bg-[var(--bg-dark-basalt)] p-5 text-[var(--text-on-dark)] lg:min-h-screen lg:w-72 lg:p-6">
        <div>
          <div className="flex items-center justify-between border-b border-[var(--border-slate)] pb-5">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl font-semibold tracking-[0.14em] text-white">
                AURA
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent-mist)]">
                ADMIN
              </span>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-slate)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-on-dark-muted)] hover:text-white"
            >
              <ArrowLeft size={12} strokeWidth={1.5} />
              <span>Сайт</span>
            </Link>
          </div>

          <nav className="mt-6 flex flex-row gap-2 overflow-x-auto lg:flex-col">
            <button
              type="button"
              onClick={() => setActiveTab('leads')}
              className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                activeTab === 'leads'
                  ? 'bg-white text-[#0A0C0F]'
                  : 'text-[var(--text-on-dark-muted)] hover:bg-[var(--bg-dark-slate)] hover:text-white'
              }`}
            >
              <ClipboardList size={17} strokeWidth={1.5} />
              <span>Заявки (Лиды)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                activeTab === 'ai'
                  ? 'bg-white text-[#0A0C0F]'
                  : 'text-[var(--text-on-dark-muted)] hover:bg-[var(--bg-dark-slate)] hover:text-white'
              }`}
            >
              <Cpu size={17} strokeWidth={1.5} />
              <span>AI-Агент (Gemini)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('knowledge')}
              className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                activeTab === 'knowledge'
                  ? 'bg-white text-[#0A0C0F]'
                  : 'text-[var(--text-on-dark-muted)] hover:bg-[var(--bg-dark-slate)] hover:text-white'
              }`}
            >
              <BookOpen size={17} strokeWidth={1.5} />
              <span>База знаний</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('telegram')}
              className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                activeTab === 'telegram'
                  ? 'bg-white text-[#0A0C0F]'
                  : 'text-[var(--text-on-dark-muted)] hover:bg-[var(--bg-dark-slate)] hover:text-white'
              }`}
            >
              <Bot size={17} strokeWidth={1.5} />
              <span>Telegram-бот</span>
            </button>
          </nav>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 hidden items-center gap-2 rounded-full border border-[var(--border-slate)] px-4 py-2.5 text-xs font-medium text-[var(--text-on-dark-muted)] transition-colors hover:text-white lg:inline-flex"
        >
          <LogOut size={14} strokeWidth={1.5} />
          <span>Выйти из панели</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-5 sm:p-8 lg:p-10">
        {/* Top Metrics Bar */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="card-stone-light stone-noise-light p-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
              Всего лидов
            </span>
            <p className="tabular-nums mt-2 text-3xl font-semibold text-[var(--text-primary)]">
              {stats.total}
            </p>
          </div>
          <div className="card-stone-light stone-noise-light p-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
              Горячие (Hot)
            </span>
            <p className="tabular-nums mt-2 text-3xl font-semibold text-[#C95B48]">
              {stats.hot}
            </p>
          </div>
          <div className="card-stone-light stone-noise-light p-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
              Из AI-Квиза
            </span>
            <p className="tabular-nums mt-2 text-3xl font-semibold text-[var(--accent-ice)]">
              {stats.quiz}
            </p>
          </div>
          <div className="card-stone-light stone-noise-light p-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
              Доставлено в TG
            </span>
            <p className="tabular-nums mt-2 text-3xl font-semibold text-[#2B7A69]">
              {stats.telegramSent}
            </p>
          </div>
        </div>

        {/* Tab 1: Leads */}
        {activeTab === 'leads' && (
          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="font-serif text-3xl font-semibold text-[var(--text-primary)]">
                Входящие заявки
              </h1>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="rounded-full border border-[var(--border-mineral)] bg-white px-4 py-2 text-xs font-medium text-[var(--text-primary)]"
                >
                  <option value="ALL">Все источники</option>
                  <option value="AI_QUIZ">Только AI-Квиз</option>
                  <option value="AI_CHAT">Только AI-Чат</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-full border border-[var(--border-mineral)] bg-white px-4 py-2 text-xs font-medium text-[var(--text-primary)]"
                >
                  <option value="ALL">Все статусы</option>
                  <option value="NEW">Новые</option>
                  <option value="IN_PROGRESS">В работе</option>
                  <option value="COMPLETED">Завершены</option>
                  <option value="SPAM">Спам</option>
                </select>

                <button
                  type="button"
                  onClick={loadLeads}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-mineral)] bg-white px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]"
                >
                  <RefreshCw size={13} strokeWidth={1.5} />
                  <span>Обновить</span>
                </button>
              </div>
            </div>

            {leadsError && (
              <div className="mt-4 rounded-2xl border border-[#C95B48]/30 bg-[#C95B48]/10 p-4 text-sm text-[#C95B48]">
                {leadsError}
              </div>
            )}

            <div className="card-stone-light mt-5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--border-mineral)] bg-[var(--bg-canvas)] font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-4 py-3.5">Код</th>
                      <th className="px-4 py-3.5">Клиент / Контакт</th>
                      <th className="px-4 py-3.5">Источник</th>
                      <th className="px-4 py-3.5">Темп.</th>
                      <th className="px-4 py-3.5">Статус</th>
                      <th className="px-4 py-3.5">Telegram</th>
                      <th className="px-4 py-3.5 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-mineral)]">
                    {leadsLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-xs text-[var(--text-secondary)]">
                          Загрузка заявок...
                        </td>
                      </tr>
                    ) : leads.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-xs text-[var(--text-secondary)]">
                          Заявок по выбранным фильтрам пока нет.
                        </td>
                      </tr>
                    ) : (
                      leads.map((lead) => {
                        const temp = TEMP_BADGE[lead.temperature] ?? TEMP_BADGE.WARM;
                        return (
                          <tr
                            key={lead.id}
                            onClick={() => setSelectedLead(lead)}
                            className="cursor-pointer transition-colors hover:bg-[var(--bg-canvas)]"
                          >
                            <td className="px-4 py-3.5 font-mono text-xs font-medium text-[var(--text-primary)]">
                              #{lead.leadCode}
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="font-semibold text-[var(--text-primary)]">
                                {lead.clientName}
                              </p>
                              <p className="font-mono text-xs text-[var(--text-secondary)]">
                                {lead.contact} · {lead.preferredChannel}
                              </p>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="rounded-full border border-[var(--border-mineral)] bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em]">
                                {lead.source === 'AI_QUIZ' ? 'AI-Квиз' : 'AI-Чат'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase ${temp.className}`}
                              >
                                {temp.label}
                              </span>
                            </td>
                            <td
                              className="px-4 py-3.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <select
                                value={lead.status}
                                onChange={(e) =>
                                  handleStatusChange(lead.id, e.target.value as LeadStatusType)
                                }
                                className="rounded-full border border-[var(--border-mineral)] bg-white px-3 py-1 text-xs font-medium text-[var(--text-primary)]"
                              >
                                {(Object.keys(STATUS_LABELS) as LeadStatusType[]).map((s) => (
                                  <option key={s} value={s}>
                                    {STATUS_LABELS[s]}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`font-mono text-xs ${
                                  lead.telegramStatus === 'SENT'
                                    ? 'text-[#2B7A69]'
                                    : lead.telegramStatus === 'FAILED'
                                      ? 'text-[#C95B48]'
                                      : 'text-[#C48F45]'
                                }`}
                              >
                                {lead.telegramStatus}
                              </span>
                            </td>
                            <td
                              className="px-4 py-3.5 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {lead.telegramStatus !== 'SENT' && (
                                <button
                                  type="button"
                                  disabled={resendingId === lead.id}
                                  onClick={() => handleResendTelegram(lead.id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-dark-basalt)] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--accent-teal-hover)] disabled:opacity-50"
                                >
                                  <Send size={11} strokeWidth={1.5} />
                                  <span>
                                    {resendingId === lead.id ? 'Отправка...' : 'В Telegram'}
                                  </span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Tab 2: AI Agent (Google Gemini 3.5 / 3.6 / 3.8 + Google AI Studio Guide) */}
        {activeTab === 'ai' && (
          <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <h1 className="font-serif text-3xl font-semibold text-[var(--text-primary)]">
                Подключение Google Gemini
              </h1>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                Ассистент «Алина» и генератор концепций квиза работают через API-ключ Google AI
                Studio. Изменения применяются мгновенно без перезапуска сервера.
              </p>

              <form onSubmit={handleSaveAiSettings} className="card-stone-light mt-6 space-y-6 p-6">
                {/* Google API Key */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                      API-ключ Google AI Studio
                    </label>
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase ${
                        hasGoogleKey
                          ? 'bg-[#2B7A69]/12 text-[#2B7A69]'
                          : 'bg-[#C48F45]/15 text-[#9C6C27]'
                      }`}
                    >
                      {hasGoogleKey ? `Задан: ${maskedGoogleKey}` : 'Не задан'}
                    </span>
                  </div>

                  <div className="relative flex items-center">
                    <KeyRound
                      size={16}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 text-[var(--text-secondary)]"
                    />
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={googleApiKeyInput}
                      onChange={(e) => setGoogleApiKeyInput(e.target.value)}
                      placeholder={
                        hasGoogleKey
                          ? 'Оставьте пустым, чтобы сохранить текущий ключ, или вставьте новый AIza...'
                          : 'Вставьте ключ из Google AI Studio (AIza...)'
                      }
                      className="w-full rounded-[14px] border border-[var(--border-mineral)] bg-white py-3 pl-10 pr-11 font-mono text-xs text-[var(--text-primary)] focus:border-[var(--accent-ice)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((prev) => !prev)}
                      aria-label={showKey ? 'Скрыть ключ' : 'Показать ключ'}
                      className="absolute right-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      {showKey ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                    </button>
                  </div>

                  {hasGoogleKey && (
                    <button
                      type="button"
                      onClick={handleClearGoogleKey}
                      className="mt-2 font-mono text-[11px] text-[#C95B48] hover:underline"
                    >
                      Удалить сохранённый ключ
                    </button>
                  )}
                </div>

                {/* Model Selector: Gemini 3.5 / 3.6 / 3.8 */}
                <div>
                  <span className="mb-2.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                    Модель Gemini для ассистента
                  </span>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {aiModels.map((model) => {
                      const active = selectedModel === model.id;
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => setSelectedModel(model.id)}
                          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                            active
                              ? 'border-[var(--bg-dark-basalt)] bg-[var(--bg-dark-basalt)] text-white shadow-md'
                              : 'border-[var(--border-mineral)] bg-white text-[var(--text-primary)] hover:border-[var(--accent-ice)]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-semibold">
                                Gemini {model.version}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                                  active
                                    ? 'bg-[#D6EFFA] text-[#0A0C0F]'
                                    : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]'
                                }`}
                              >
                                {model.badge}
                              </span>
                            </div>
                            <p
                              className={`mt-2 text-[11px] leading-snug ${
                                active ? 'text-white/75' : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              {model.description}
                            </p>
                          </div>
                          <span
                            className={`mt-3 block font-mono text-[10px] ${
                              active ? 'text-[#7AD0F2]' : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            {model.id}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mock Mode Toggle */}
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border-mineral)] bg-[var(--bg-canvas)] p-4">
                  <input
                    type="checkbox"
                    checked={forceMockMode}
                    onChange={(e) => setForceMockMode(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#111418]"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-[var(--text-primary)]">
                      Локальный тестовый режим (без расхода токенов Google API)
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[var(--text-secondary)]">
                      Снимите галочку и вставьте ключ Google AI Studio, чтобы включить живые
                      ответы через выбранную модель Gemini.
                    </span>
                  </div>
                </label>

                {aiNotice && (
                  <div
                    className={`rounded-xl px-4 py-3 text-xs font-medium ${
                      aiNotice.ok
                        ? 'bg-[#2B7A69]/12 text-[#1F5C4E]'
                        : 'bg-[#C95B48]/12 text-[#C95B48]'
                    }`}
                  >
                    {aiNotice.text}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={aiSaving}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-dark-basalt)] px-6 py-3 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-teal-hover)] disabled:opacity-50 sm:text-sm"
                  >
                    <CheckCircle2 size={15} strokeWidth={1.5} />
                    <span>{aiSaving ? 'Сохраняем...' : 'Сохранить настройки'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={aiTesting}
                    onClick={handleTestAiConnection}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border-mineral)] bg-white px-5 py-3 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface-muted)] disabled:opacity-50 sm:text-sm"
                  >
                    <Cpu size={15} strokeWidth={1.5} className="text-[var(--accent-ice)]" />
                    <span>{aiTesting ? 'Проверяем...' : 'Проверить подключение к Gemini'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Step-by-Step Google AI Studio Guide */}
            <aside className="xl:col-span-5">
              <div className="card-stone-dark stone-noise-dark p-6 text-[var(--text-on-dark)]">
                <span className="inline-flex items-center rounded-full border border-[var(--border-slate)] bg-white/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#D6EFFA]">
                  ИНСТРУКЦИЯ · 2 МИНУТЫ
                </span>
                <h2 className="mt-4 font-serif text-2xl font-semibold text-white">
                  Как получить API-ключ в Google AI Studio
                </h2>

                <ol className="mt-5 space-y-4 text-xs leading-relaxed text-[var(--text-on-dark-muted)]">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-mono font-semibold text-[#0A0C0F]">
                      01
                    </span>
                    <div>
                      <p className="font-semibold text-white">Откройте Google AI Studio</p>
                      <p className="mt-0.5">
                        Перейдите в раздел API Keys под вашим Google-аккаунтом.
                      </p>
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 font-mono text-[11px] text-[#7AD0F2] hover:underline"
                      >
                        <span>aistudio.google.com/apikey</span>
                        <ExternalLink size={11} strokeWidth={1.5} />
                      </a>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-mono font-semibold text-[#0A0C0F]">
                      02
                    </span>
                    <div>
                      <p className="font-semibold text-white">Создайте новый ключ</p>
                      <p className="mt-0.5">
                        Нажмите кнопку <strong>«Create API key»</strong> → выберите любой проект
                        Google Cloud (или нажмите «Create API key in new project»).
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-mono font-semibold text-[#0A0C0F]">
                      03
                    </span>
                    <div>
                      <p className="font-semibold text-white">Скопируйте ключ (AIza...)</p>
                      <p className="mt-0.5">
                        Скопируйте строку, вставьте её в поле слева и выберите модель{' '}
                        <strong>Gemini 3.5</strong>, <strong>3.6</strong> или{' '}
                        <strong>3.8</strong>.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-mono font-semibold text-[#0A0C0F]">
                      04
                    </span>
                    <div>
                      <p className="font-semibold text-white">Сохраните и протестируйте</p>
                      <p className="mt-0.5">
                        Снимите галочку тестового режима, нажмите{' '}
                        <strong>«Сохранить настройки»</strong> и{' '}
                        <strong>«Проверить подключение»</strong>.
                      </p>
                    </div>
                  </li>
                </ol>

                <div className="mt-6 rounded-2xl border border-[var(--border-slate)] bg-white/[0.04] p-4 text-[11px] leading-relaxed text-[var(--text-on-dark-muted)]">
                  <strong className="text-white">Совет по выбору модели:</strong> для базовых
                  ответов 24/7 подойдёт <span className="font-mono text-[#D6EFFA]">3.5</span>, для
                  наиболее точной квалификации лидов и концепций —{' '}
                  <span className="font-mono text-[#D6EFFA]">3.8</span>.
                </div>
              </div>
            </aside>
          </section>
        )}

        {/* Tab 3: Knowledge Base Editor */}
        {activeTab === 'knowledge' && (
          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl font-semibold text-[var(--text-primary)]">
                  База знаний AI-агента
                </h1>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Изменения применяются к чату «Алина» и калькулятору мгновенно без перезапуска
                  сервера.{' '}
                  {knowledgeUpdatedAt && (
                    <span className="font-mono">
                      Обновлено: {new Date(knowledgeUpdatedAt).toLocaleString('ru-RU')}
                    </span>
                  )}
                </p>
              </div>

              <button
                type="button"
                disabled={knowledgeSaving}
                onClick={handleSaveKnowledge}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-dark-basalt)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-teal-hover)] disabled:opacity-50"
              >
                <CheckCircle2 size={16} strokeWidth={1.5} />
                <span>{knowledgeSaving ? 'Сохраняем...' : 'Сохранить и обновить AI'}</span>
              </button>
            </div>

            {knowledgeNotice && (
              <div className="mt-4 rounded-2xl border border-[#2B7A69]/30 bg-[#2B7A69]/10 px-4 py-3 text-xs font-medium text-[#1F5C4E]">
                {knowledgeNotice}
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="card-stone-light p-4">
                <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  MARKDOWN РЕДАКТОР (SINGLE SOURCE OF TRUTH)
                </span>
                <textarea
                  value={knowledgeText}
                  onChange={(e) => setKnowledgeText(e.target.value)}
                  rows={24}
                  className="w-full rounded-2xl border border-[var(--border-mineral)] bg-[var(--bg-canvas)] p-4 font-mono text-xs leading-relaxed text-[var(--text-primary)] focus:border-[var(--accent-ice)] focus:outline-none"
                />
              </div>

              <div className="card-stone-light max-h-[620px] overflow-y-auto p-6">
                <span className="mb-3 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  ПРЕВЬЮ СТРУКТУРЫ
                </span>
                <div className="space-y-1">{renderMarkdownPreview(knowledgeText)}</div>
              </div>
            </div>
          </section>
        )}

        {/* Tab 4: Telegram Bot Settings */}
        {activeTab === 'telegram' && (
          <section className="mt-8 max-w-2xl">
            <h1 className="font-serif text-3xl font-semibold text-[var(--text-primary)]">
              Настройки Telegram-бота
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Статус токена в окружении:{' '}
              <strong className={tgBotConfigured ? 'text-[#2B7A69]' : 'text-[#C95B48]'}>
                {tgBotConfigured ? 'Настроен' : 'Не задан (укажите TELEGRAM_BOT_TOKEN в .env)'}
              </strong>
            </p>

            <form onSubmit={handleTestTelegram} className="card-stone-light mt-6 space-y-4 p-6">
              <div>
                <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  Chat ID получателя (личный или группа менеджеров)
                </label>
                <input
                  type="text"
                  value={tgChatId}
                  onChange={(e) => setTgChatId(e.target.value)}
                  placeholder="Например: -1001234567890 или 123456789"
                  className="w-full rounded-[14px] border border-[var(--border-mineral)] bg-white px-4 py-3 font-mono text-sm text-[var(--text-primary)] focus:border-[var(--accent-ice)] focus:outline-none"
                />
              </div>

              {tgNotice && (
                <div
                  className={`rounded-xl px-4 py-3 text-xs font-medium ${
                    tgNotice.ok
                      ? 'bg-[#2B7A69]/12 text-[#1F5C4E]'
                      : 'bg-[#C95B48]/12 text-[#C95B48]'
                  }`}
                >
                  {tgNotice.text}
                </div>
              )}

              <button
                type="submit"
                disabled={tgTesting}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-dark-basalt)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-teal-hover)] disabled:opacity-50"
              >
                <Send size={15} strokeWidth={1.5} />
                <span>
                  {tgTesting ? 'Отправляем тест...' : 'Сохранить Chat ID и отправить тест'}
                </span>
              </button>
            </form>
          </section>
        )}
      </main>

      {/* Slide-over Lead Details Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#0A0C0F]/45 backdrop-blur-[2px]">
          <div className="flex h-full w-full max-w-lg flex-col bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-mineral)] pb-4">
              <div>
                <span className="font-mono text-xs text-[var(--accent-ice)]">
                  #{selectedLead.leadCode} · {selectedLead.source === 'AI_QUIZ' ? 'AI-Квиз' : 'AI-Чат'}
                </span>
                <h2 className="mt-1 font-serif text-2xl font-semibold text-[var(--text-primary)]">
                  {selectedLead.clientName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-mineral)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1 text-sm">
              <div className="space-y-2 rounded-2xl border border-[var(--border-mineral)] bg-[var(--bg-canvas)] p-4">
                <p>
                  <strong>Контакт:</strong> <span className="font-mono">{selectedLead.contact}</span>
                </p>
                <p>
                  <strong>Предпочтительная связь:</strong> {selectedLead.preferredChannel}
                </p>
                {selectedLead.comment && (
                  <p>
                    <strong>Комментарий:</strong> {selectedLead.comment}
                  </p>
                )}
                {selectedLead.assignedManager && (
                  <p>
                    <strong>Менеджер:</strong> {selectedLead.assignedManager}
                  </p>
                )}
                <p>
                  <strong>Telegram статус:</strong> {selectedLead.telegramStatus}
                  {selectedLead.telegramError && (
                    <span className="block font-mono text-xs text-[#C95B48]">
                      Ошибка: {selectedLead.telegramError}
                    </span>
                  )}
                </p>
              </div>

              {selectedLead.quizAnswers && (
                <div className="rounded-2xl border border-[var(--border-mineral)] p-4">
                  <h3 className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--accent-ice)]">
                    Ответы на квиз
                  </h3>
                  <dl className="mt-3 space-y-1.5 text-xs">
                    {Object.entries(selectedLead.quizAnswers as QuizAnswers).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <dt className="text-[var(--text-secondary)]">{k}</dt>
                        <dd className="font-medium text-[var(--text-primary)]">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <div className="rounded-2xl border border-[var(--border-mineral)] p-4">
                <h3 className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--accent-ice)]">
                  AI-Анализ
                </h3>
                {selectedLead.source === 'AI_QUIZ' ? (
                  <div className="mt-2 space-y-2 text-xs">
                    <p>
                      <strong>Тариф:</strong>{' '}
                      {(selectedLead.aiAnalysis as QuizResult).recommended_tariff}
                    </p>
                    <p>
                      <strong>Дизайн:</strong>{' '}
                      {(selectedLead.aiAnalysis as QuizResult).estimated_design_cost_usd}
                    </p>
                    <p>
                      <strong>Ремонт:</strong>{' '}
                      {(selectedLead.aiAnalysis as QuizResult).estimated_renovation_cost_usd}
                    </p>
                    <p>
                      <strong>Концепция:</strong>{' '}
                      {(selectedLead.aiAnalysis as QuizResult).style_concept_title}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-relaxed text-[var(--text-primary)]">
                    {(selectedLead.aiAnalysis as ChatAiAnalysis).ai_summary}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-[var(--border-mineral)] p-4">
                <h3 className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  UTM и контекст
                </h3>
                <pre className="mt-2 overflow-x-auto font-mono text-[11px] text-[var(--text-secondary)]">
                  {JSON.stringify(selectedLead.userMetadata, null, 2)}
                </pre>
              </div>

              {selectedLead.chatHistory && selectedLead.chatHistory.length > 0 && (
                <div className="rounded-2xl border border-[var(--border-mineral)] p-4">
                  <h3 className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                    История диалога ({selectedLead.chatHistory.length})
                  </h3>
                  <div className="mt-3 space-y-2">
                    {selectedLead.chatHistory.map((msg, i) => (
                      <div key={i} className="rounded-xl bg-[var(--bg-canvas)] p-2.5 text-xs">
                        <span className="font-mono text-[10px] uppercase text-[var(--accent-ice)]">
                          {msg.role === 'user' ? 'Клиент' : 'Алина'}
                        </span>
                        <p className="mt-0.5 text-[var(--text-primary)]">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border-mineral)] pt-4">
              <button
                type="button"
                onClick={() => handleResendTelegram(selectedLead.id)}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-dark-basalt)] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[var(--accent-teal-hover)]"
              >
                <Send size={14} strokeWidth={1.5} />
                <span>Отправить в Telegram повторно</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="rounded-full border border-[var(--border-mineral)] px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)]"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

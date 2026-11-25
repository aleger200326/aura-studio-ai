'use client';

import { useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, CheckCircle2, RotateCcw, X } from 'lucide-react';
import type { UserMetadata } from '@/types/lead';

interface AlinaChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  userMetadata: UserMetadata;
  prefilledPrompt?: string | null;
  onPrefilledConsumed?: () => void;
}

const CHAT_STORAGE_KEY = 'aura_chat_history_v1';

const QUICK_REPLIES = [
  'Сколько стоит дизайн-проект?',
  'Делаете ли ремонт под ключ?',
  'Рассчитать сроки для моей квартиры',
];

const WELCOME_MESSAGE = {
  id: 'aura-welcome-1',
  role: 'assistant' as const,
  content:
    'Здравствуйте! Я Алина, старший консультант AURA Studio. Подскажу по тарифам, срокам разработки и рассчитаю предварительный бюджет под ваш объект.',
};

export function AlinaChatDrawer({
  open,
  onOpenChange,
  sessionId,
  userMetadata,
  prefilledPrompt,
  onPrefilledConsumed,
}: AlinaChatDrawerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, input, setInput, handleInputChange, handleSubmit, append, isLoading, setMessages } =
    useChat({
      api: '/api/chat',
      id: 'aura-alina-chat',
      body: {
        sessionId,
        userMetadata,
      },
      initialMessages: [WELCOME_MESSAGE],
    });

  // Load persisted history from localStorage once on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // Ignore invalid local storage
    }
  }, [setMessages]);

  // Persist history to localStorage
  useEffect(() => {
    try {
      if (messages.length > 0) {
        window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-30)));
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [messages]);

  // Handle prefilled context from Quiz Result Card
  useEffect(() => {
    if (open && prefilledPrompt) {
      append({ role: 'user', content: prefilledPrompt });
      onPrefilledConsumed?.();
    }
  }, [open, prefilledPrompt, append, onPrefilledConsumed]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, open]);

  const hasUserMessages = messages.some((m) => m.role === 'user');

  function handleResetChat() {
    window.localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([WELCOME_MESSAGE]);
    setInput('');
  }

  return (
    <>
      {/* Collapsed Dark Slate Capsule Trigger */}
      {!open && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => onOpenChange(true)}
          aria-label="Открыть чат с архитектором"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full border border-[rgba(207,229,232,0.22)] bg-[var(--bg-dark-basalt)] py-2.5 pl-3 pr-5 text-[var(--text-on-dark)] shadow-[0_20px_48px_-10px_rgba(11,23,30,0.55)] transition-transform hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-dark-slate)] font-serif text-lg font-semibold italic text-[var(--accent-mist)]">
            А
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-[var(--bg-dark-basalt)] bg-[var(--accent-teal-light)]" />
          </span>
          <span className="text-left">
            <span className="block text-xs font-semibold leading-tight text-white">
              Спросить архитектора
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--accent-mist)]">
              Онлайн · 24/7
            </span>
          </span>
        </motion.button>
      )}

      {/* Full-Height Architectural Slide-Over Drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => onOpenChange(false)}
              className="fixed inset-0 z-50 bg-[#0B171E]/40 backdrop-blur-[2px]"
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-[var(--bg-canvas)] shadow-2xl sm:inset-y-4 sm:right-4 sm:w-[440px] sm:rounded-[24px] sm:border sm:border-[var(--border-mineral)]"
            >
              {/* Drawer Header */}
              <div className="relative overflow-hidden border-b border-[var(--border-mineral)] bg-white px-5 py-4 sm:rounded-t-[24px]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-dark-basalt)] font-serif text-xl font-semibold italic text-[var(--accent-mist)]">
                      А
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-2xl font-semibold leading-none text-[var(--text-primary)]">
                          Алина
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-mist)]/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--accent-ice)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-ice)]" />
                          Онлайн
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                        Старший консультант AURA Studio
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleResetChat}
                      title="Начать заново"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-mineral)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]"
                    >
                      <RotateCcw size={14} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      aria-label="Закрыть чат"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-mineral)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]"
                    >
                      <X size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages Feed */}
              <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto px-4 py-5 sm:px-5">
                {messages.map((m, idx) => {
                  const isUser = m.role === 'user';
                  const isLastAssistant =
                    !isUser && idx === messages.length - 1 && isLoading;

                  // Extract submitted lead card if tool invocation succeeded
                  const toolInvocations = (
                    m as unknown as {
                      toolInvocations?: Array<{
                        toolName: string;
                        state: string;
                        result?: { leadCode?: string };
                      }>;
                    }
                  ).toolInvocations;

                  const submittedLeadInvocation = toolInvocations?.find(
                    (t) => t.toolName === 'submit_lead' && t.state === 'result' && t.result?.leadCode
                  );

                  return (
                    <div key={m.id} className="space-y-2.5">
                      {submittedLeadInvocation && (
                        <div className="flex items-center gap-2.5 rounded-2xl border border-[#2B7A69]/30 bg-[#2B7A69]/10 px-4 py-3 text-xs font-medium text-[#1F5C4E]">
                          <CheckCircle2 size={16} strokeWidth={1.75} className="shrink-0" />
                          <span>
                            Заявка{' '}
                            <strong className="font-mono">
                              #{submittedLeadInvocation.result?.leadCode}
                            </strong>{' '}
                            передана ведущему дизайнеру
                          </span>
                        </div>
                      )}

                      {m.content && (
                        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed ${
                              isUser
                                ? 'rounded-[20px] rounded-br-[6px] bg-[var(--bg-dark-basalt)] text-white shadow-sm'
                                : 'rounded-[20px] rounded-tl-[6px] border border-[var(--border-mineral)] bg-white text-[var(--text-primary)] shadow-[0_4px_12px_-4px_rgba(10,12,15,0.08)]'
                            }`}
                          >
                            {m.content}
                            {isLastAssistant && (
                              <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-[var(--accent-teal)] align-middle" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="rounded-[20px] rounded-tl-[6px] border border-[var(--border-mineral)] bg-white px-4 py-3 text-xs text-[var(--text-secondary)]">
                      Алина печатает<span className="ml-1 inline-block h-3.5 w-[2px] animate-pulse bg-[var(--accent-teal)] align-middle" />
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Replies + Input */}
              <div className="border-t border-[var(--border-mineral)] bg-white p-4 sm:rounded-b-[24px]">
                {!hasUserMessages && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {QUICK_REPLIES.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => append({ role: 'user', content: q })}
                        className="rounded-full border border-[var(--border-mineral)] bg-[var(--bg-canvas)] px-3 py-1.5 text-left text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent-teal)] hover:bg-white"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  className="flex items-center gap-2 rounded-full border border-[var(--border-mineral)] bg-[var(--bg-canvas)] p-1.5 pl-4 focus-within:border-[var(--accent-teal)]"
                >
                  <input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Задайте вопрос или оставьте контакт..."
                    className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    aria-label="Отправить сообщение"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-dark-basalt)] text-white transition-opacity hover:bg-[var(--accent-teal)] disabled:opacity-40"
                  >
                    <ArrowUp size={16} strokeWidth={1.75} />
                  </button>
                </form>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

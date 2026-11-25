'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Lock,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import { BlueprintLayer } from '@/components/shared/BlueprintLayer';
import {
  PREFERRED_CHANNELS,
  QUIZ_OBJECT_TYPES,
  QUIZ_SERVICES,
  QUIZ_STYLES,
  QUIZ_TIMELINES,
} from '@/lib/validators';
import type {
  PreferredChannel,
  QuizAnswers,
  QuizObjectType,
  QuizResult,
  QuizServiceNeeded,
  QuizStyle,
  QuizTimeline,
  UserMetadata,
} from '@/types/lead';

interface QuizWorkbenchProps {
  sessionId: string;
  userMetadata: UserMetadata;
  preselectedStyle?: QuizStyle | null;
  preselectedService?: QuizServiceNeeded | null;
  onDiscussResultInChat: (contextPrompt: string) => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const STEP_LABELS = ['Объект', 'Площадь', 'Стиль', 'Формат', 'Сроки', 'Контакт'];

const LOADING_MESSAGES = [
  'Проверяем нормы площади...',
  'Считаем бюджет реализации...',
  'Формируем концепцию...',
];

export function QuizWorkbench({
  sessionId,
  userMetadata,
  preselectedStyle,
  preselectedService,
  onDiscussResultInChat,
}: QuizWorkbenchProps) {
  const [step, setStep] = useState<number>(1);
  const [answers, setAnswers] = useState<QuizAnswers>({
    objectType: 'Новостройка',
    areaSqm: 78,
    style: 'Джапанди',
    serviceNeeded: 'Только дизайн-проект',
    timeline: 'Уже есть ключи',
  });

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [preferredChannel, setPreferredChannel] = useState<PreferredChannel>('Telegram');
  const [comment, setComment] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{
    leadCode: string;
    result: QuizResult;
  } | null>(null);

  useEffect(() => {
    if (preselectedStyle) {
      setAnswers((prev) => ({ ...prev, style: preselectedStyle }));
    }
  }, [preselectedStyle]);

  useEffect(() => {
    if (preselectedService) {
      setAnswers((prev) => ({ ...prev, serviceNeeded: preselectedService }));
      setStep(4);
    }
  }, [preselectedService]);

  useEffect(() => {
    if (!isSubmitting) return;
    setLoadingStage(0);
    const interval = setInterval(() => {
      setLoadingStage((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1100);
    return () => clearInterval(interval);
  }, [isSubmitting]);

  const sliderProgress = Math.min(100, Math.max(0, ((answers.areaSqm - 25) / (300 - 25)) * 100));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (name.trim().length < 2) {
      setErrorMsg('Пожалуйста, укажите ваше имя (минимум 2 символа).');
      return;
    }
    if (contact.trim().length < 5) {
      setErrorMsg('Укажите телефон или Telegram @username (минимум 5 символов).');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          quizAnswers: answers,
          contactInfo: {
            name: name.trim(),
            contact: contact.trim(),
            preferredChannel,
            comment: comment.trim() || undefined,
          },
          userMetadata,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || 'Не удалось выполнить расчёт. Проверьте данные.');
        return;
      }

      setSubmittedResult({
        leadCode: data.leadCode,
        result: data.result,
      });
    } catch {
      setErrorMsg('Ошибка соединения с сервером. Попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setSubmittedResult(null);
    setStep(1);
    setErrorMsg(null);
  }

  return (
    <section id="quiz" className="relative py-16 sm:py-28">
      <BlueprintLayer variant="quiz" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <span className="inline-flex items-center rounded-full border border-[var(--border-mineral)] bg-white px-3.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--accent-ice)]">
            04 / КОНФИГУРАТОР ПРОЕКТА
          </span>
          <h2 className="mt-4 font-serif text-[clamp(2.1rem,3.8vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.015em] text-[var(--text-primary)]">
            Персональная смета и{' '}
            <span className="italic text-[var(--accent-ice)]">концепция</span> за 5 шагов
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
            Укажите параметры объекта — система рассчитает точную стоимость по прайсу
            студии и подготовит 3 рекомендации архитектора.
          </p>
        </div>

        {/* Split-Screen Workbench */}
        <div className="card-stone-light stone-noise-light overflow-hidden !rounded-[28px] p-4 sm:p-6 lg:p-8">
          {submittedResult ? (
            /* Result Specification Card */
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
              className="grid grid-cols-1 gap-8 lg:grid-cols-12"
            >
              <div className="lg:col-span-7">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2B7A69]/12 px-3.5 py-1.5 font-mono text-xs font-medium text-[#2B7A69]">
                    <CheckCircle2 size={14} strokeWidth={1.75} />
                    РАСЧЁТ СФОРМИРОВАН
                  </span>
                  <span className="rounded-full border border-[var(--border-mineral)] bg-[var(--bg-surface-muted)] px-3.5 py-1.5 font-mono text-xs text-[var(--text-primary)]">
                    #{submittedResult.leadCode}
                  </span>
                </div>

                <h3 className="mt-5 font-serif text-3xl font-semibold italic leading-tight text-[var(--text-primary)] sm:text-4xl">
                  «{submittedResult.result.style_concept_title}»
                </h3>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border-mineral)] bg-[var(--bg-canvas)] p-5">
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                      ДИЗАЙН-ПРОЕКТ · {submittedResult.result.recommended_tariff}
                    </span>
                    <p className="tabular-nums mt-2 text-3xl font-semibold text-[var(--text-primary)]">
                      {submittedResult.result.estimated_design_cost_usd}
                    </p>
                    {submittedResult.result.min_area_applied && (
                      <p className="mt-1 font-mono text-[11px] text-[var(--accent-teal)]">
                        Применён мин. расчётный порог 35 м²
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-[var(--border-mineral)] bg-[var(--bg-canvas)] p-5">
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                      РЕМОНТНЫЕ РАБОТЫ (ОРИЕНТИР)
                    </span>
                    <p className="tabular-nums mt-2 text-3xl font-semibold text-[var(--accent-ice)]">
                      {submittedResult.result.estimated_renovation_cost_usd}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-[var(--text-secondary)]">
                      {submittedResult.result.estimated_timeline}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                    3 РЕКОМЕНДАЦИИ АРХИТЕКТОРА ПОД ВАШ ОБЪЕКТ
                  </h4>
                  <div className="mt-3 space-y-3">
                    {submittedResult.result.personal_recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3.5 rounded-2xl border border-[var(--border-mineral)] bg-white p-4"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-dark-basalt)] font-mono text-xs font-medium text-white">
                          0{index + 1}
                        </span>
                        <p className="text-sm leading-relaxed text-[var(--text-primary)]">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-[#0D1014]/20 p-6 text-[var(--text-on-dark)] lg:col-span-5">
                <img
                  src="/images/portfolio-commercial.jpg"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover grayscale contrast-125"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(165deg, rgba(10,12,16,0.82) 0%, rgba(10,13,18,0.88) 55%, rgba(0,115,175,0.75) 100%)',
                  }}
                />
                <div className="relative z-10">
                  <div className="flex items-center justify-between border-b border-white/15 pb-4">
                    <div className="flex items-center gap-2">
                      <FileText size={15} strokeWidth={1.5} className="text-[#8CE6FF]" />
                      <span className="font-mono text-xs uppercase tracking-[0.1em] text-[#8CE6FF]">
                        СПЕЦИФИКАЦИЯ ЛИДА
                      </span>
                    </div>
                    <span className="font-mono text-xs text-white/70">
                      #{submittedResult.leadCode}
                    </span>
                  </div>

                  <dl className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-white/65">Клиент:</dt>
                      <dd className="font-medium text-white">{name}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-white/65">Объект:</dt>
                      <dd className="font-medium text-white">
                        {answers.objectType}, {answers.areaSqm} м²
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-white/65">Стиль:</dt>
                      <dd className="font-medium text-white">{answers.style}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-white/65">Тариф:</dt>
                      <dd className="font-medium text-[#8CE6FF]">
                        {submittedResult.result.recommended_tariff}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs leading-relaxed text-white/90">
                      {submittedResult.result.manager_pitch}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-8 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onDiscussResultInChat(
                        `Я только что прошёл квиз (#${submittedResult.leadCode}): ${answers.objectType}, ${answers.areaSqm} м², стиль ${answers.style}, тариф «${submittedResult.result.recommended_tariff}» (${submittedResult.result.estimated_design_cost_usd}). Расскажите подробнее о следующих шагах.`
                      )
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-[#0A0C0F] transition-colors hover:bg-[#D6EFFA]"
                  >
                    <MessageSquare size={16} strokeWidth={1.5} />
                    <span>Уточнить детали у Алины в чате</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-xs font-medium text-white/80 transition-colors hover:text-white"
                  >
                    <RotateCcw size={14} strokeWidth={1.5} />
                    <span>Рассчитать другой объект</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* 12-Col Interactive Split Workbench */
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
              {/* Left 7 columns — Steps */}
              <div className="flex flex-col justify-between lg:col-span-7">
                <div>
                  {/* Architectural Blueprint Step Bar */}
                  <div className="mb-8">
                    <div className="mb-2.5 flex items-center justify-between font-mono text-xs uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                      <span>
                        ШАГ 0{step} ИЗ 06 · {STEP_LABELS[step - 1]}
                      </span>
                      <span className="tabular-nums text-[var(--accent-teal)]">
                        {Math.round((step / 6) * 100)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {STEP_LABELS.map((lbl, i) => {
                        const idx = i + 1;
                        const active = idx <= step;
                        return (
                          <div
                            key={lbl}
                            className={`h-1.5 rounded-full transition-colors duration-300 ${
                              active ? 'bg-[var(--accent-teal)]' : 'bg-[var(--bg-surface-muted)]'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Step Content */}
                  <AnimatePresence mode="wait">
                    {isSubmitting ? (
                      <motion.div
                        key="submitting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-[var(--border-mineral)] bg-[var(--bg-canvas)] p-8 text-center"
                      >
                        <svg
                          viewBox="0 0 120 80"
                          className="h-20 w-28 text-[var(--accent-teal)]"
                          fill="none"
                        >
                          <motion.rect
                            x="10"
                            y="10"
                            width="100"
                            height="60"
                            stroke="currentColor"
                            strokeWidth="2"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.4, repeat: Infinity }}
                          />
                          <motion.line
                            x1="55"
                            y1="10"
                            x2="55"
                            y2="70"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.4, delay: 0.2, repeat: Infinity }}
                          />
                        </svg>
                        <p className="mt-5 font-serif text-2xl font-semibold text-[var(--text-primary)]">
                          {LOADING_MESSAGES[loadingStage]}
                        </p>
                        <p className="mt-2 font-mono text-xs uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                          Сверяемся с прайс-листом AURA Studio
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={`step-${step}`}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.25, ease: EASE }}
                        className="min-h-[300px]"
                      >
                        {step === 1 && (
                          <div>
                            <h3 className="font-serif text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
                              Какой тип объекта планируем?
                            </h3>
                            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {QUIZ_OBJECT_TYPES.map((opt) => {
                                const selected = answers.objectType === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                      setAnswers((p) => ({
                                        ...p,
                                        objectType: opt as QuizObjectType,
                                      }));
                                      setStep(2);
                                    }}
                                    className={`flex items-center justify-between rounded-[16px] border px-5 py-4 text-left text-sm font-semibold transition-all ${
                                      selected
                                        ? 'border-[var(--bg-dark-basalt)] bg-[var(--bg-dark-basalt)] text-white shadow-md'
                                        : 'border-[var(--border-mineral)] bg-white text-[var(--text-primary)] hover:border-[var(--accent-teal)]'
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    <span
                                      className={`h-2.5 w-2.5 rounded-full ${
                                        selected ? 'bg-[var(--accent-teal-light)]' : 'bg-[#D2DDE1]'
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {step === 2 && (
                          <div>
                            <h3 className="font-serif text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
                              Укажите общую площадь объекта
                            </h3>

                            <div className="mt-6 rounded-[20px] border border-[var(--border-mineral)] bg-[var(--bg-canvas)] p-6">
                              <div className="flex flex-wrap items-end justify-between gap-4">
                                <div>
                                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                                    ПЛОЩАДЬ ПО ОБМЕРАМ
                                  </span>
                                  <div className="mt-1 flex items-baseline gap-2">
                                    <span className="tabular-nums text-5xl font-semibold tracking-tight text-[var(--text-primary)]">
                                      {answers.areaSqm}
                                    </span>
                                    <span className="font-mono text-sm text-[var(--accent-teal)]">
                                      м²
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <label
                                    htmlFor="area-input"
                                    className="font-mono text-xs text-[var(--text-secondary)]"
                                  >
                                    Точное значение:
                                  </label>
                                  <input
                                    id="area-input"
                                    type="number"
                                    min={15}
                                    max={1000}
                                    value={answers.areaSqm}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      if (!Number.isNaN(val)) {
                                        setAnswers((p) => ({
                                          ...p,
                                          areaSqm: Math.max(1, Math.min(2000, val)),
                                        }));
                                      }
                                    }}
                                    className="tabular-nums w-24 rounded-xl border border-[var(--border-mineral)] bg-white px-3 py-2 text-right font-mono text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-teal)] focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div className="mt-6">
                                <input
                                  type="range"
                                  min={25}
                                  max={300}
                                  value={Math.min(300, Math.max(25, answers.areaSqm))}
                                  onChange={(e) =>
                                    setAnswers((p) => ({ ...p, areaSqm: Number(e.target.value) }))
                                  }
                                  style={
                                    {
                                      '--progress': `${sliderProgress}%`,
                                    } as React.CSSProperties
                                  }
                                  className="aura-ruler-slider"
                                  aria-label="Площадь объекта в м²"
                                />
                                <div className="mt-2 flex justify-between font-mono text-[11px] text-[var(--text-secondary)]">
                                  <span>25 м²</span>
                                  <span>100 м²</span>
                                  <span>200 м²</span>
                                  <span>300+ м²</span>
                                </div>
                              </div>

                              {answers.areaSqm < 35 && (
                                <p className="mt-4 rounded-xl border border-[var(--accent-teal)]/25 bg-[var(--accent-mist)]/45 px-4 py-2.5 text-xs text-[var(--text-primary)]">
                                  Для объектов до 35 м² применяется минимальный расчётный тариф{' '}
                                  <strong>35 м²</strong> (согласно стандарту студии).
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {step === 3 && (
                          <div>
                            <h3 className="font-serif text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
                              Какая эстетика вам ближе?
                            </h3>
                            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {QUIZ_STYLES.map((opt) => {
                                const selected = answers.style === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                      setAnswers((p) => ({ ...p, style: opt as QuizStyle }));
                                      setStep(4);
                                    }}
                                    className={`flex items-center justify-between rounded-[16px] border px-5 py-4 text-left text-sm font-semibold transition-all ${
                                      selected
                                        ? 'border-[var(--bg-dark-basalt)] bg-[var(--bg-dark-basalt)] text-white shadow-md'
                                        : 'border-[var(--border-mineral)] bg-white text-[var(--text-primary)] hover:border-[var(--accent-teal)]'
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    <span
                                      className={`h-2.5 w-2.5 rounded-full ${
                                        selected ? 'bg-[var(--accent-teal-light)]' : 'bg-[#D2DDE1]'
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {step === 4 && (
                          <div>
                            <h3 className="font-serif text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
                              Какой объём работ требуется?
                            </h3>
                            <div className="mt-5 grid grid-cols-1 gap-3">
                              {QUIZ_SERVICES.map((opt) => {
                                const selected = answers.serviceNeeded === opt;
                                const priceHint =
                                  opt === 'Только эскиз и планировка'
                                    ? '$35 / м² · 3–4 недели'
                                    : opt === 'Только дизайн-проект'
                                      ? '$55 / м² · 6–8 недель'
                                      : '$85 / м² проект + ремонт от $350 / м²';
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                      setAnswers((p) => ({
                                        ...p,
                                        serviceNeeded: opt as QuizServiceNeeded,
                                      }));
                                      setStep(5);
                                    }}
                                    className={`flex items-center justify-between gap-4 rounded-[16px] border px-5 py-4 text-left transition-all ${
                                      selected
                                        ? 'border-[var(--bg-dark-basalt)] bg-[var(--bg-dark-basalt)] text-white shadow-md'
                                        : 'border-[var(--border-mineral)] bg-white text-[var(--text-primary)] hover:border-[var(--accent-teal)]'
                                    }`}
                                  >
                                    <div>
                                      <p className="text-sm font-semibold">{opt}</p>
                                      <p
                                        className={`mt-0.5 font-mono text-[11px] ${
                                          selected
                                            ? 'text-[var(--accent-mist)]'
                                            : 'text-[var(--text-secondary)]'
                                        }`}
                                      >
                                        {priceHint}
                                      </p>
                                    </div>
                                    <span
                                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                                        selected ? 'bg-[var(--accent-teal-light)]' : 'bg-[#D2DDE1]'
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {step === 5 && (
                          <div>
                            <h3 className="font-serif text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
                              Когда планируете старт проекта?
                            </h3>
                            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {QUIZ_TIMELINES.map((opt) => {
                                const selected = answers.timeline === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                      setAnswers((p) => ({
                                        ...p,
                                        timeline: opt as QuizTimeline,
                                      }));
                                      setStep(6);
                                    }}
                                    className={`flex items-center justify-between rounded-[16px] border px-5 py-4 text-left text-sm font-semibold transition-all ${
                                      selected
                                        ? 'border-[var(--bg-dark-basalt)] bg-[var(--bg-dark-basalt)] text-white shadow-md'
                                        : 'border-[var(--border-mineral)] bg-white text-[var(--text-primary)] hover:border-[var(--accent-teal)]'
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    <span
                                      className={`h-2.5 w-2.5 rounded-full ${
                                        selected ? 'bg-[var(--accent-teal-light)]' : 'bg-[#D2DDE1]'
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {step === 6 && (
                          <form id="quiz-lead-form" onSubmit={handleSubmit} className="space-y-4">
                            <div>
                              <h3 className="font-serif text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
                                Куда направить готовую смету и концепцию?
                              </h3>
                              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                Сразу после отправки на экране откроется детальная спецификация и 3
                                совета архитектора.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                                  Ваше имя *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={name}
                                  onChange={(e) => setName(e.target.value)}
                                  placeholder="Например: Александр"
                                  className="w-full rounded-[14px] border border-[var(--border-mineral)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent-teal)] focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                                  Телефон или Telegram @username *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={contact}
                                  onChange={(e) => setContact(e.target.value)}
                                  placeholder="@alex_design или +998 90 123-45-67"
                                  className="w-full rounded-[14px] border border-[var(--border-mineral)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent-teal)] focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                                Удобный канал связи
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {PREFERRED_CHANNELS.map((ch) => (
                                  <button
                                    key={ch}
                                    type="button"
                                    onClick={() => setPreferredChannel(ch)}
                                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                                      preferredChannel === ch
                                        ? 'border-[var(--bg-dark-basalt)] bg-[var(--bg-dark-basalt)] text-white'
                                        : 'border-[var(--border-mineral)] bg-white text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                  >
                                    {ch}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                                Пожелания (опционально)
                              </label>
                              <textarea
                                rows={2}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Например: нужна гардеробная, заезд планируем осенью..."
                                className="w-full rounded-[14px] border border-[var(--border-mineral)] bg-white px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-teal)] focus:outline-none"
                              />
                            </div>

                            {errorMsg && (
                              <p className="rounded-xl bg-[#C95B48]/10 px-4 py-2.5 text-xs font-medium text-[#C95B48]">
                                {errorMsg}
                              </p>
                            )}
                          </form>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Navigation Controls */}
                {!isSubmitting && (
                  <div className="mt-8 flex items-center justify-between border-t border-[var(--border-mineral)] pt-5">
                    <button
                      type="button"
                      disabled={step === 1}
                      onClick={() => setStep((s) => Math.max(1, s - 1))}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border-mineral)] bg-white px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition-opacity disabled:opacity-35"
                    >
                      <ArrowLeft size={14} strokeWidth={1.5} />
                      <span>Назад</span>
                    </button>

                    {step < 6 ? (
                      <button
                        type="button"
                        onClick={() => setStep((s) => Math.min(6, s + 1))}
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-teal)] px-6 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-teal-hover)]"
                      >
                        <span>Далее</span>
                        <ArrowRight size={14} strokeWidth={1.5} />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        form="quiz-lead-form"
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-teal)] px-6 py-3 text-xs font-semibold text-white shadow-md transition-colors hover:bg-[var(--accent-teal-hover)] sm:text-sm"
                      >
                        <span>Получить смету и концепцию</span>
                        <ArrowRight size={15} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right 5 columns — Live Object Dossier with Centrysk Monochrome Photo Backdrop */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-[#0D1014]/20 p-6 text-white shadow-[0_24px_56px_-16px_rgba(10,12,15,0.35)] lg:col-span-5">
                <img
                  src="/images/hero-interior.jpg"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover grayscale contrast-125"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(165deg, rgba(10,12,16,0.82) 0%, rgba(10,13,18,0.88) 55%, rgba(0,115,175,0.75) 100%)',
                  }}
                />

                <div className="relative z-10">
                  <div className="flex items-center justify-between border-b border-white/15 pb-4">
                    <div className="flex items-center gap-2">
                      <FileText size={15} strokeWidth={1.5} className="text-[#8CE6FF]" />
                      <span className="font-mono text-xs uppercase tracking-[0.1em] text-[#8CE6FF]">
                        ДОСЬЕ ОБЪЕКТА
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-white/65">
                      LIVE SPEC
                    </span>
                  </div>

                  <dl className="mt-5 space-y-3.5 text-sm">
                    <div className="flex items-center justify-between border-b border-white/12 pb-2.5">
                      <dt className="text-white/65">Объект</dt>
                      <dd className="font-semibold text-white">{answers.objectType}</dd>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/12 pb-2.5">
                      <dt className="text-white/65">Площадь</dt>
                      <dd className="tabular-nums font-mono font-medium text-[#8CE6FF]">
                        {answers.areaSqm} м²
                      </dd>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/12 pb-2.5">
                      <dt className="text-white/65">Стиль</dt>
                      <dd className="font-semibold text-white">{answers.style}</dd>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/12 pb-2.5">
                      <dt className="text-white/65">Формат</dt>
                      <dd className="text-right font-semibold text-white">
                        {answers.serviceNeeded}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between pb-1">
                      <dt className="text-white/65">Старт</dt>
                      <dd className="font-semibold text-white">{answers.timeline}</dd>
                    </div>
                  </dl>
                </div>

                <div className="relative z-10 mt-8 rounded-2xl border border-white/18 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-[#8CE6FF]">
                      <Lock size={14} strokeWidth={1.5} />
                    </span>
                    <p className="text-xs leading-relaxed text-white/85">
                      Смета и 3 рекомендации архитектора готовы — завершите шаги и укажите
                      контакт для моментального получения спецификации.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

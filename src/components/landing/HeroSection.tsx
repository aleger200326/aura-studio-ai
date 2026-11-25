'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, MessageSquare } from 'lucide-react';
import { BlueprintLayer } from '@/components/shared/BlueprintLayer';

interface HeroSectionProps {
  onOpenChat: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function HeroSection({ onOpenChat }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-14">
      <BlueprintLayer variant="hero" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left 7 columns */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="lg:col-span-7"
          >
            <div className="mb-6 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center rounded-full bg-[var(--bg-dark-basalt)] px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-white">
                Since 2019
              </span>
              <span className="inline-flex items-center rounded-full border border-[var(--border-mineral)] bg-white px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-secondary)] shadow-sm">
                140+ реализованных объектов
              </span>
            </div>

            <h1 className="font-serif text-[clamp(2.75rem,5.5vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.02em] text-[var(--text-primary)]">
              Архитектура{' '}
              <span className="italic text-[var(--accent-ice)]">спокойствия</span> — от
              планировки до ключей
            </h1>

            <p className="mt-6 max-w-xl text-base leading-[1.65] text-[var(--text-secondary)] sm:text-lg">
              Проектируем функциональные жилые и коммерческие пространства в эстетике
              чистой архитектуры, джапанди и тихой роскоши. Полный цикл: 3D-концепция,
              рабочие чертежи, комплектация и ремонт с гарантией 2 года.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <a
                href="#quiz"
                className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--bg-dark-basalt)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_30px_-10px_rgba(10,12,15,0.42)] transition-all hover:bg-[var(--accent-teal-hover)]"
              >
                <span>Пройти AI-расчёт</span>
                <span className="rounded-full bg-white/12 px-2 py-0.5 font-mono text-[11px] font-normal text-[#CBEAF5]">
                  2 мин
                </span>
                <ArrowUpRight
                  size={16}
                  strokeWidth={1.5}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </a>

              <button
                type="button"
                onClick={onOpenChat}
                className="inline-flex items-center gap-2.5 rounded-full border border-[var(--border-mineral)] bg-white px-6 py-3.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm transition-colors hover:bg-[var(--bg-surface-muted)]"
              >
                <MessageSquare size={16} strokeWidth={1.5} className="text-[var(--accent-ice)]" />
                <span>Задать вопрос консультанту</span>
              </button>
            </div>
          </motion.div>

          {/* Right 5 columns — Sculpted architectural arch photo */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.1, ease: EASE }}
            className="relative lg:col-span-5"
          >
            {/* Decorative mist semicircle behind the frame */}
            <div
              aria-hidden="true"
              className="absolute -right-6 -top-6 h-56 w-56 rounded-full bg-[var(--accent-mist)] opacity-70 sm:h-72 sm:w-72"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-5 -left-5 h-32 w-32 rounded-full border border-[var(--accent-teal)]/20"
            />

            <div className="relative overflow-hidden rounded-[28px] rounded-bl-[120px] border border-[var(--border-mineral)] bg-white p-2 shadow-[0_28px_60px_-16px_rgba(11,23,30,0.18)] sm:rounded-bl-[140px]">
              <div className="mineral-photo-wrap aspect-[4/5] w-full rounded-[22px] rounded-bl-[112px] sm:rounded-bl-[132px]">
                <img
                  src="/images/hero-interior.jpg"
                  alt="Минималистичный интерьер гостиной от AURA Studio в холодной минеральной палитре"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="absolute bottom-5 right-5 z-20 max-w-[250px]">
                <div className="card-stone-light stone-noise-light !rounded-2xl px-4 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--accent-ice)]">
                    PROJECT 01 · ALABASTER
                  </p>
                  <p className="mt-0.5 font-serif text-base font-semibold leading-snug text-[var(--text-primary)] sm:text-lg">
                    Травертин и тёмный сланец
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Architectural Blueprint KPI Ruler */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
          className="mt-14 border-t border-[var(--border-mineral)] pt-8 sm:mt-20"
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            <div className="flex items-baseline gap-4">
              <span className="tabular-nums text-[clamp(2.25rem,4vw,3.4rem)] font-semibold leading-none tracking-[-0.03em] text-[var(--text-primary)]">
                7 лет
              </span>
              <span className="text-sm leading-snug text-[var(--text-secondary)]">
                опыта в архитектуре
                <br />и комплексной реализации
              </span>
            </div>

            <div className="flex items-baseline gap-4 border-t border-[var(--border-mineral)] pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
              <span className="tabular-nums text-[clamp(2.25rem,4vw,3.4rem)] font-semibold leading-none tracking-[-0.03em] text-[var(--text-primary)]">
                140+
              </span>
              <span className="text-sm leading-snug text-[var(--text-secondary)]">
                завершённых квартир,
                <br />домов и коммерческих пространств
              </span>
            </div>

            <div className="flex items-baseline gap-4 border-t border-[var(--border-mineral)] pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
              <span className="tabular-nums text-[clamp(2.25rem,4vw,3.4rem)] font-semibold leading-none tracking-[-0.03em] text-[var(--accent-ice)]">
                2 года
              </span>
              <span className="text-sm leading-snug text-[var(--text-secondary)]">
                официальная гарантия
                <br />на ремонтно-отделочные работы
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

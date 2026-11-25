'use client';

import Link from 'next/link';
import { Clock, Lock, Mail, MapPin, MessageSquare } from 'lucide-react';

interface FooterSectionProps {
  onOpenChat: () => void;
}

const ARCH_GALLERY = [
  {
    src: '/images/hero-interior.jpg',
    caption: '01 · Гостиная в известняке',
  },
  {
    src: '/images/portfolio-minimal.jpg',
    caption: '02 · Базальт и светлый дуб',
  },
  {
    src: '/images/portfolio-neoclassic.jpg',
    caption: '03 · Тихая архитектура сна',
  },
];

export function FooterSection({ onOpenChat }: FooterSectionProps) {
  return (
    <footer className="relative pb-12 pt-16 sm:pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="card-stone-light stone-noise-light overflow-hidden p-6 sm:p-10 lg:p-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6">
              <span className="inline-flex items-center rounded-full border border-[var(--border-mineral)] bg-[var(--bg-surface-muted)] px-3.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--accent-ice)]">
                05 / КОНТАКТЫ СТУДИИ
              </span>
              <h2 className="mt-4 font-serif text-[clamp(2.2rem,4vw,3.5rem)] font-semibold leading-[1.06] tracking-[-0.015em] text-[var(--text-primary)]">
                Обсудим ваш{' '}
                <span className="italic text-[var(--accent-ice)]">будущий интерьер</span>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                Первая ознакомительная встреча онлайн — бесплатно. Выезд ведущего дизайнера
                на объект ($50) полностью вычитается из стоимости договора при старте работы.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#quiz"
                  className="inline-flex items-center rounded-full bg-[var(--accent-teal)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-teal-hover)]"
                >
                  Пройти расчёт сметы
                </a>
                <button
                  type="button"
                  onClick={onOpenChat}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border-mineral)] bg-white px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface-muted)]"
                >
                  <MessageSquare size={15} strokeWidth={1.5} className="text-[var(--accent-teal)]" />
                  <span>Написать Алине</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-6">
              <div className="rounded-2xl border border-[var(--border-mineral)] bg-[var(--bg-canvas)] p-4">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--accent-teal)]">
                    <Clock size={15} strokeWidth={1.5} />
                  </span>
                  <span>Режим работы</span>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  Менеджеры: Пн–Сб 10:00–20:00
                  <br />
                  Консьерж AURA AI: 24/7
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-mineral)] bg-[var(--bg-canvas)] p-4">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-[var(--text-primary)]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--accent-teal)]">
                    <MapPin size={15} strokeWidth={1.5} />
                  </span>
                  <span>География</span>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  Дизайн-проекты — по всему миру
                  <br />
                  Ремонт и надзор — город и пригород до 30 км
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-mineral)] bg-[var(--bg-canvas)] p-4 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--accent-teal)]">
                      <Mail size={15} strokeWidth={1.5} />
                    </span>
                    <span className="font-mono text-xs text-[var(--text-primary)]">
                      studio@aura-interiors.example
                    </span>
                  </div>
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-mineral)] bg-white px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-teal)] hover:text-[var(--text-primary)]"
                  >
                    <Lock size={12} strokeWidth={1.5} />
                    <span>Панель управления</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Arch Photo Gallery Homage */}
          <div className="mt-10 grid grid-cols-1 gap-4 border-t border-[var(--border-mineral)] pt-8 sm:grid-cols-3">
            {ARCH_GALLERY.map((item) => (
              <div key={item.caption} className="group flex flex-col gap-2.5">
                <div className="mineral-photo-wrap aspect-[4/3] w-full rounded-t-[110px] rounded-b-[16px] border border-[var(--border-mineral)]">
                  <img
                    src={item.src}
                    alt={item.caption}
                    className="h-full w-full object-cover group-hover:scale-[1.04]"
                  />
                </div>
                <span className="text-center font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  {item.caption}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-[var(--border-mineral)] pt-6 text-xs text-[var(--text-secondary)] sm:flex-row">
            <span>© {new Date().getFullYear()} AURA Studio. Все права защищены.</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.08em]">
              Mineral Architecture &amp; Living Blueprint
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

'use client';

import { Menu, X } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  onOpenChat: () => void;
}

const NAV_LINKS = [
  { href: '#portfolio', label: 'Проекты' },
  { href: '#process', label: 'Этапы' },
  { href: '#tariffs', label: 'Тарифы' },
  { href: '#quiz', label: 'AI-расчёт' },
];

export function Header({ onOpenChat }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-4 z-40 mx-auto max-w-7xl px-4 sm:px-6">
      <div className="flex items-center justify-between rounded-full border border-[var(--border-mineral)] bg-[rgba(244,247,248,0.88)] px-4 py-2.5 shadow-[0_8px_24px_-8px_rgba(11,23,30,0.10)] backdrop-blur-md sm:px-6">
        <a href="#" className="flex items-baseline gap-2.5">
          <span className="font-serif text-xl font-semibold tracking-[0.14em] text-[var(--text-primary)] sm:text-2xl">
            AURA
          </span>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--accent-ice)]">
            STUDIO
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenChat}
            className="hidden rounded-full border border-[var(--border-mineral)] bg-white/80 px-4 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-white lg:inline-flex"
          >
            Консультант
          </button>
          <a
            href="#quiz"
            className="inline-flex items-center rounded-full bg-[var(--accent-teal)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-teal-hover)] sm:px-5 sm:py-2.5 sm:text-sm"
          >
            <span className="sm:hidden">Смета</span>
            <span className="hidden sm:inline">Рассчитать смету</span>
          </a>
          <button
            type="button"
            aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-mineral)] bg-white/80 text-[var(--text-primary)] md:hidden"
          >
            {mobileOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mt-2 rounded-[24px] border border-[var(--border-mineral)] bg-white/95 p-4 shadow-xl backdrop-blur-md md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenChat();
              }}
              className="mt-2 rounded-full border border-[var(--border-mineral)] px-4 py-2.5 text-left text-sm font-semibold text-[var(--accent-teal)]"
            >
              Спросить архитектора онлайн
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}

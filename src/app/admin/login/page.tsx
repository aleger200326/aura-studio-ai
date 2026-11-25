'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Неверный пароль');
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-canvas)] px-4">
      <div className="card-stone-light stone-noise-light w-full max-w-md p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-semibold tracking-[0.14em] text-[var(--text-primary)]">
              AURA
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent-ice)]">
              ADMIN
            </span>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-surface-muted)] text-[var(--accent-ice)]">
            <Lock size={16} strokeWidth={1.5} />
          </span>
        </div>

        <h1 className="mt-6 font-serif text-3xl font-semibold text-[var(--text-primary)]">
          Вход в панель управления
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          Просмотр заявок из квиза и чата, редактирование базы знаний AI и проверка Telegram-бота.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="admin-password"
              className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]"
            >
              Пароль администратора
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите ADMIN_PASSWORD из .env"
              className="w-full rounded-[14px] border border-[var(--border-mineral)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent-teal)] focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-[#C95B48]/10 px-4 py-2.5 text-xs font-medium text-[#C95B48]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-teal)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-teal-hover)] disabled:opacity-50"
          >
            <span>{loading ? 'Проверяем...' : 'Войти в систему'}</span>
            <ArrowRight size={15} strokeWidth={1.5} />
          </button>
        </form>

        <div className="mt-6 border-t border-[var(--border-mineral)] pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            <span>Вернуться на сайт AURA Studio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

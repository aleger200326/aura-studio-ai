'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { BlueprintLayer } from '@/components/shared/BlueprintLayer';
import type { QuizStyle } from '@/types/lead';

interface PortfolioSectionProps {
  onSelectStyleForQuiz: (style: QuizStyle) => void;
}

interface PortfolioItem {
  id: string;
  title: string;
  subtitle: string;
  specs: string;
  style: QuizStyle;
  image: string;
  colSpan: string;
  aspect: string;
}

const PROJECTS: PortfolioItem[] = [
  {
    id: 'mineral-japandi',
    title: 'Резиденция «Минерал»',
    subtitle: 'Открытая планировка с тёплым белёным дубом и известняковой штукатуркой',
    specs: '78 м² · Джапанди · Под ключ',
    style: 'Джапанди',
    image: '/images/portfolio-japandi.jpg',
    colSpan: 'lg:col-span-7',
    aspect: 'aspect-[16/10]',
  },
  {
    id: 'monolith-minimal',
    title: 'Апартаменты «Монолит»',
    subtitle: 'Монолитный кухонный остров из базальта и скрытое линейное освещение',
    specs: '112 м² · Минимализм · Полный проект',
    style: 'Минимализм',
    image: '/images/portfolio-minimal.jpg',
    colSpan: 'lg:col-span-5',
    aspect: 'aspect-[4/5] lg:aspect-auto lg:h-full',
  },
  {
    id: 'alabaster-neoclassic',
    title: 'Пентхаус «Алебастр»',
    subtitle: 'Деликатные молдинги, натуральный лён и спокойная неоклассика',
    specs: '94 м² · Неоклассика · Под ключ',
    style: 'Неоклассика',
    image: '/images/portfolio-neoclassic.jpg',
    colSpan: 'lg:col-span-5',
    aspect: 'aspect-[4/5] lg:aspect-auto lg:h-full',
  },
  {
    id: 'stone-gallery',
    title: 'Пространство «Камень и Свет»',
    subtitle: 'Бутик-шоурум с радиусными перегородками из микроцемента',
    specs: '65 м² · Контемпорари · Коммерция',
    style: 'Контемпорари',
    image: '/images/portfolio-commercial.jpg',
    colSpan: 'lg:col-span-7',
    aspect: 'aspect-[16/10]',
  },
];

export function PortfolioSection({ onSelectStyleForQuiz }: PortfolioSectionProps) {
  return (
    <section id="portfolio" className="relative py-16 sm:py-28">
      <BlueprintLayer variant="portfolio" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="inline-flex items-center rounded-full border border-[var(--border-mineral)] bg-white px-3.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--accent-ice)]">
              01 / ПОРТФОЛИО
            </span>
            <h2 className="mt-4 font-serif text-[clamp(2.1rem,3.8vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.015em] text-[var(--text-primary)]">
              Пространства, выверенные <span className="italic text-[var(--accent-ice)]">до миллиметра</span>
            </h2>
          </div>

          <p className="max-w-md text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
            В каждом проекте мы соединяем тактильность камня, натуральное дерево и
            эргономику, адаптированную под сценарии вашей жизни.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {PROJECTS.map((project, idx) => (
            <motion.article
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.65, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className={`card-stone-light stone-noise-light group flex flex-col overflow-hidden p-3 ${project.colSpan}`}
            >
              <div className={`mineral-photo-wrap relative w-full rounded-[18px] ${project.aspect}`}>
                <img
                  src={project.image}
                  alt={project.title}
                  className="h-full w-full object-cover group-hover:scale-[1.03]"
                />
                <div className="absolute bottom-3 left-3 z-10 rounded-full border border-white/60 bg-[rgba(255,255,255,0.92)] px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-primary)] shadow-sm">
                  {project.specs}
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 px-2 pb-2 pt-4">
                <div>
                  <h3 className="font-serif text-[clamp(1.4rem,2vw,1.8rem)] font-semibold leading-tight text-[var(--text-primary)]">
                    {project.title}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{project.subtitle}</p>
                </div>

                <a
                  href="#quiz"
                  onClick={() => onSelectStyleForQuiz(project.style)}
                  title="Рассчитать в этом стиле"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-mineral)] bg-[var(--bg-surface-muted)] text-[var(--text-primary)] transition-all group-hover:border-[var(--accent-teal)] group-hover:bg-[var(--accent-teal)] group-hover:text-white"
                >
                  <ArrowUpRight size={17} strokeWidth={1.5} />
                </a>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

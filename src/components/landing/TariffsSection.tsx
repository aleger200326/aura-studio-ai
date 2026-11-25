'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Check, Compass, Crown, Hammer, Layers } from 'lucide-react';
import type { QuizServiceNeeded } from '@/types/lead';

interface TariffsSectionProps {
  onSelectTariffForQuiz: (service: QuizServiceNeeded) => void;
}

interface TariffCardData {
  id: string;
  name: string;
  price: string;
  unit: string;
  term: string;
  badge?: string;
  description: string;
  features: string[];
  quizService: QuizServiceNeeded;
  icon: typeof Compass;
  restRotate: number;
  restY: number;
  image: string;
}

const TARIFFS: TariffCardData[] = [
  {
    id: 'sketch',
    name: 'Эскизный проект',
    price: '$35',
    unit: '/ м²',
    term: '3–4 недели',
    description: 'Грамотная эргономика и визуальная концепция без детальных чертежей.',
    features: [
      'Обмерный план и анализ объекта',
      '3 варианта планировки с мебелью',
      'Коллажи и мудборды по комнатам',
      'Базовый план электрики и сантехники',
    ],
    quizService: 'Только эскиз и планировка',
    icon: Compass,
    restRotate: -2.5,
    restY: 14,
    image: '/images/portfolio-japandi.jpg',
  },
  {
    id: 'full',
    name: 'Полный дизайн-проект',
    price: '$55',
    unit: '/ м²',
    term: '6–8 недель',
    badge: 'Популярный',
    description: 'Полный комплект документации для точной реализации любой бригадой.',
    features: [
      'Всё из пакета «Эскизный»',
      'Фотореалистичная 3D-визуализация',
      'Полный альбом рабочих чертежей',
      'Ведомость материалов и артикулов',
    ],
    quizService: 'Только дизайн-проект',
    icon: Layers,
    restRotate: 1.5,
    restY: -8,
    image: '/images/hero-interior.jpg',
  },
  {
    id: 'vip',
    name: 'Под ключ (VIP)',
    price: '$85',
    unit: '/ м²',
    term: '6–8 нед. + стройка',
    description: 'Берем на себя проектирование, контроль стройки и закупку материалов.',
    features: [
      'Всё из пакета «Полный проект»',
      'Авторский надзор 1–2 раза в неделю',
      'Комплектация и партнерские скидки 10–15%',
      'Финальный стайлинг перед заселением',
    ],
    quizService: 'Дизайн + ремонт под ключ',
    icon: Crown,
    restRotate: -1.8,
    restY: 10,
    image: '/images/portfolio-minimal.jpg',
  },
  {
    id: 'renovation',
    name: 'Ремонтные работы',
    price: 'от $350',
    unit: '/ м²',
    term: 'Гарантия 2 года',
    description: 'Реализация по нашему проекту или готовым чертежам после бесплатного аудита.',
    features: [
      'Оплата этапами раз в 2 недели',
      'Черновые материалы от $150–$200/м²',
      'Срок от 4 мес. (квартиры до 70 м²)',
      'Официальный договор и гарантия',
    ],
    quizService: 'Дизайн + ремонт под ключ',
    icon: Hammer,
    restRotate: 2.2,
    restY: -4,
    image: '/images/portfolio-neoclassic.jpg',
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function TariffsSection({ onSelectTariffForQuiz }: TariffsSectionProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const prefersReduced = useReducedMotion();

  return (
    <section id="tariffs" className="mx-3 mt-6 sm:mx-6">
      {/* Centrysk Glacial Ice-White & Sky-Blue Canvas */}
      <div
        className="relative mx-auto max-w-[1360px] overflow-hidden rounded-[24px] border border-[#0D1014]/10 px-5 py-16 text-[var(--text-primary)] shadow-[0_32px_80px_-24px_rgba(10,12,15,0.12)] sm:rounded-[32px] sm:px-10 sm:py-24"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 45%, #FFFFFF 0%, #E4F4FC 52%, #A9DCF2 100%)',
        }}
      >
        <img
          src="/images/hero-interior.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.08] grayscale contrast-125 mix-blend-multiply"
        />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="inline-flex items-center rounded-full border border-[#0D1014]/12 bg-white/85 px-3.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#0088CC] backdrop-blur-sm">
                03 / ТАРИФЫ И УСЛУГИ
              </span>
              <h2 className="mt-4 font-serif text-[clamp(2.1rem,3.8vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.015em] text-[#0D1014]">
                Прозрачные форматы, чтобы{' '}
                <span className="italic text-[#0088CC]">выбирать</span> без сюрпризов
              </h2>
            </div>

            <p className="max-w-md text-sm leading-relaxed text-[#495460]">
              Наведите на карточку формата для фокусировки или нажмите на стрелку{' '}
              <span className="font-mono font-semibold text-[#0088CC]">↗</span>, чтобы сразу
              рассчитать бюджет в калькуляторе.
            </p>
          </div>

          {/* Tilted Monochrome Interior Photo Cards floating on Ice-Sky Backdrop */}
          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4 xl:gap-4 xl:py-6">
            {TARIFFS.map((tariff, idx) => {
              const Icon = tariff.icon;
              const isHovered = hoveredIdx === idx;
              const someoneElseHovered = hoveredIdx !== null && hoveredIdx !== idx;
              const pushDirection =
                hoveredIdx !== null ? (idx < hoveredIdx ? -4 : 4) : 0;

              return (
                <motion.div
                  key={tariff.id}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onFocus={() => setHoveredIdx(idx)}
                  onBlur={() => setHoveredIdx(null)}
                  animate={
                    prefersReduced
                      ? undefined
                      : {
                          rotate: isHovered ? 0 : tariff.restRotate,
                          y: isHovered ? -14 : tariff.restY,
                          x: someoneElseHovered ? pushDirection : 0,
                          scale: isHovered ? 1.03 : 1,
                          opacity: someoneElseHovered ? 0.82 : 1,
                        }
                  }
                  transition={{ duration: 0.45, ease: EASE }}
                  style={{ zIndex: isHovered ? 20 : idx === 1 ? 10 : 5 }}
                  className={`max-md:!transform-none group relative flex flex-col justify-between overflow-hidden rounded-[24px] border p-6 text-white transition-all duration-300 ${
                    isHovered
                      ? 'border-[#38BDF8] shadow-[0_32px_70px_-14px_rgba(0,136,204,0.45)]'
                      : tariff.badge
                        ? 'border-[#38BDF8]/50 shadow-[0_24px_56px_-14px_rgba(10,12,15,0.42)]'
                        : 'border-[#0D1014]/25 shadow-[0_22px_50px_-16px_rgba(10,12,15,0.38)]'
                  }`}
                >
                  {/* Real architectural photo inside each tariff card in Centrysk monochrome */}
                  <img
                    src={tariff.image}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover grayscale contrast-125 transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Deep atmospheric vignette + subtle sky-blue edge light (Centrysk aesthetic) */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: isHovered
                        ? 'linear-gradient(170deg, rgba(8,11,16,0.74) 0%, rgba(10,13,18,0.86) 55%, rgba(0,115,175,0.72) 100%)'
                        : 'linear-gradient(170deg, rgba(10,12,16,0.80) 0%, rgba(10,12,16,0.88) 65%, rgba(6,68,104,0.72) 100%)',
                    }}
                  />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-sm">
                        <Icon size={17} strokeWidth={1.5} />
                      </span>

                      <div className="flex items-center gap-2">
                        {tariff.badge && (
                          <span className="rounded-full bg-[#8CE6FF] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#080B10]">
                            {tariff.badge}
                          </span>
                        )}
                        <a
                          href="#quiz"
                          onClick={() => onSelectTariffForQuiz(tariff.quizService)}
                          aria-label={`Рассчитать ${tariff.name}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:border-white group-hover:bg-white group-hover:text-[#0A0C0F]"
                        >
                          <ArrowUpRight size={15} strokeWidth={1.5} />
                        </a>
                      </div>
                    </div>

                    <h3 className="mt-5 font-serif text-2xl font-semibold leading-tight text-white">
                      {tariff.name}
                    </h3>
                    <p className="mt-2 min-h-[42px] text-xs leading-relaxed text-white/75">
                      {tariff.description}
                    </p>

                    <div className="mt-5 flex items-baseline gap-1.5 border-y border-white/15 py-4">
                      <span className="tabular-nums text-3xl font-semibold tracking-tight text-white">
                        {tariff.price}
                      </span>
                      <span className="font-mono text-xs text-[#8CE6FF]">
                        {tariff.unit}
                      </span>
                      <span className="ml-auto font-mono text-[11px] text-white/65">
                        {tariff.term}
                      </span>
                    </div>

                    <ul className="mt-5 space-y-2.5">
                      {tariff.features.map((feat) => (
                        <li
                          key={feat}
                          className="flex items-start gap-2.5 text-xs leading-snug text-white/90"
                        >
                          <Check
                            size={14}
                            strokeWidth={1.75}
                            className="mt-0.5 shrink-0 text-[#8CE6FF]"
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href="#quiz"
                    onClick={() => onSelectTariffForQuiz(tariff.quizService)}
                    className="relative z-10 mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/12 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-white hover:text-[#0A0C0F]"
                  >
                    Выбрать формат
                  </a>
                </motion.div>
              );
            })}
          </div>

          <p className="mt-10 text-center font-mono text-xs uppercase tracking-[0.12em] text-[#495460]">
            МИНИМАЛЬНАЯ РАСЧЁТНАЯ ПЛОЩАДЬ ДЛЯ ДИЗАЙНА — 35 М²
          </p>
        </div>
      </div>
    </section>
  );
}
